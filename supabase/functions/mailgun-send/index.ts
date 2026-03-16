import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY")!;

interface SendRequest {
  campaign_id?: string;
  to: string;
  to_name?: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  reply_to?: string;
  lead_id?: string;
  recipient_id?: string;
  tags?: string[];
  variables?: Record<string, string>;
}

function replacePlaceholders(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value || "");
  }
  return result;
}

async function getSettings(adminClient: any): Promise<Record<string, string>> {
  const { data } = await adminClient.from("email_settings").select("key, value");
  const settings: Record<string, string> = {};
  (data || []).forEach((row: any) => { settings[row.key] = row.value || ""; });
  return settings;
}

async function sendViaMailgun(
  settings: Record<string, string>,
  req: SendRequest
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const domain = settings.mailgun_domain || "";
  const baseUrl = settings.mailgun_base_url || "https://api.mailgun.net";
  const from = req.from || settings.mailgun_from || `UhomeSales <noreply@${domain}>`;

  const formData = new FormData();
  formData.append("from", from);
  formData.append("to", req.to_name ? `${req.to_name} <${req.to}>` : req.to);
  formData.append("subject", req.subject);
  formData.append("html", req.html);
  if (req.text) formData.append("text", req.text);
  if (req.reply_to || settings.mailgun_reply_to) {
    formData.append("h:Reply-To", req.reply_to || settings.mailgun_reply_to);
  }

  // Tracking options
  formData.append("o:tracking", "yes");
  formData.append("o:tracking-opens", settings.tracking_opens === "true" ? "yes" : "no");
  formData.append("o:tracking-clicks", settings.tracking_clicks === "true" ? "yes" : "no");

  // Tags
  if (req.tags) {
    req.tags.forEach(t => formData.append("o:tag", t));
  }

  // Custom variables for webhook correlation
  if (req.campaign_id) formData.append("v:campaign_id", req.campaign_id);
  if (req.lead_id) formData.append("v:lead_id", req.lead_id);
  if (req.recipient_id) formData.append("v:recipient_id", req.recipient_id);

  const url = `${baseUrl}/v3/${domain}/messages`;
  const auth = btoa(`api:${MAILGUN_API_KEY}`);

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: formData,
  });

  const data = await resp.json();
  if (!resp.ok) {
    return { success: false, error: data.message || `Mailgun error ${resp.status}` };
  }
  return { success: true, messageId: data.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors();

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return errorResponse("Unauthorized", 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) return errorResponse("Unauthorized", 401);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const settings = await getSettings(adminClient);

    const body = await req.json();
    const { mode } = body; // "single" | "campaign"

    if (mode === "single") {
      // Single email send
      const { to, to_name, subject, html, text, lead_id, template_id, variables } = body;
      if (!to || !subject) return errorResponse("to e subject são obrigatórios", 400);

      let finalHtml = html || "";
      let finalSubject = subject;

      // If template_id provided, load template
      if (template_id) {
        const { data: tpl } = await adminClient
          .from("email_templates").select("*").eq("id", template_id).single();
        if (tpl) {
          finalHtml = tpl.html_content;
          finalSubject = tpl.assunto;
        }
      }

      // Replace placeholders
      if (variables) {
        finalHtml = replacePlaceholders(finalHtml, variables);
        finalSubject = replacePlaceholders(finalSubject, variables);
      }

      // Check suppression
      const { data: suppressed } = await adminClient
        .from("email_suppression_list").select("id").eq("email", to).limit(1);
      if (suppressed && suppressed.length > 0) {
        return jsonResponse({ success: false, error: "Email na lista de supressão" });
      }

      const result = await sendViaMailgun(settings, {
        to, to_name, subject: finalSubject, html: finalHtml, text,
        lead_id, tags: ["individual"],
      });

      // Log event
      if (result.success && lead_id) {
        await adminClient.from("email_events").insert({
          lead_id,
          mailgun_message_id: result.messageId,
          event_type: "sent",
          event_data: { subject: finalSubject, to },
        });
      }

      return jsonResponse(result);
    }

    if (mode === "campaign") {
      // Campaign batch send
      const { campaign_id } = body;
      if (!campaign_id) return errorResponse("campaign_id obrigatório", 400);

      // Load campaign
      const { data: campaign, error: campErr } = await adminClient
        .from("email_campaigns").select("*").eq("id", campaign_id).single();
      if (campErr || !campaign) return errorResponse("Campanha não encontrada", 404);

      // Update status
      await adminClient.from("email_campaigns")
        .update({ status: "enviando", updated_at: new Date().toISOString() })
        .eq("id", campaign_id);

      // Load recipients
      const { data: recipients } = await adminClient
        .from("email_campaign_recipients")
        .select("*")
        .eq("campaign_id", campaign_id)
        .eq("status", "pendente")
        .limit(500); // Process in batches

      let enviados = 0;
      let erros = 0;

      for (const r of (recipients || [])) {
        // Check suppression
        const { data: suppressed } = await adminClient
          .from("email_suppression_list").select("id").eq("email", r.email).limit(1);
        if (suppressed && suppressed.length > 0) {
          await adminClient.from("email_campaign_recipients")
            .update({ status: "suprimido", erro: "Email na lista de supressão" })
            .eq("id", r.id);
          continue;
        }

        // Replace placeholders in campaign content
        let html = campaign.html_content || "";
        let subject = campaign.assunto || "";
        const vars = (r.variaveis || {}) as Record<string, string>;
        vars.nome = r.nome || "";
        vars.email = r.email || "";
        html = replacePlaceholders(html, vars);
        subject = replacePlaceholders(subject, vars);

        const result = await sendViaMailgun(settings, {
          campaign_id,
          to: r.email,
          to_name: r.nome || undefined,
          subject,
          html,
          lead_id: r.lead_id || undefined,
          recipient_id: r.id,
          tags: ["campaign", campaign.nome],
        });

        if (result.success) {
          await adminClient.from("email_campaign_recipients")
            .update({
              status: "enviado",
              mailgun_message_id: result.messageId,
              enviado_at: new Date().toISOString(),
            })
            .eq("id", r.id);
          enviados++;
        } else {
          await adminClient.from("email_campaign_recipients")
            .update({ status: "erro", erro: result.error })
            .eq("id", r.id);
          erros++;
        }

        // Small delay between sends (anti-rate-limit)
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Update campaign metrics
      await adminClient.from("email_campaigns")
        .update({
          status: "enviada",
          total_enviados: enviados,
          total_erros: erros,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign_id);

      return jsonResponse({ success: true, enviados, erros });
    }

    return errorResponse("mode deve ser 'single' ou 'campaign'", 400);
  } catch (err: any) {
    console.error("mailgun-send error:", err);
    return errorResponse(err.message || "Erro interno", 500);
  }
});
