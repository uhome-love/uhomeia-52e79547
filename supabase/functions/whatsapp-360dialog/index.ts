import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DIALOG_API_URL = "https://waba-v2.360dialog.io/messages";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check — validate JWT properly
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for reading integration_settings
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get 360dialog API key from integration_settings
    const { data: setting, error: settingError } = await supabase
      .from("integration_settings")
      .select("value")
      .eq("key", "360dialog_api_key")
      .single();

    if (settingError || !setting?.value) {
      return new Response(
        JSON.stringify({ error: "API key do 360dialog não configurada. Configure no painel de Administração." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = setting.value;
    const { action, phone, message, leads } = await req.json();

    if (action === "test") {
      // Test connection by checking account info
      const testResp = await fetch("https://waba-v2.360dialog.io/v1/configs/webhook", {
        headers: { "D360-API-KEY": apiKey, "Content-Type": "application/json" },
      });
      if (!testResp.ok) {
        const errText = await testResp.text();
        return new Response(
          JSON.stringify({ error: `Falha na conexão: ${testResp.status} - ${errText}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, message: "Conexão com 360dialog OK!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send_single") {
      if (!phone || !message) {
        return new Response(
          JSON.stringify({ error: "Telefone e mensagem são obrigatórios." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Format phone: ensure country code
      let formattedPhone = phone.replace(/\D/g, "");
      if (formattedPhone.length <= 11 && !formattedPhone.startsWith("55")) {
        formattedPhone = "55" + formattedPhone;
      }

      const resp = await fetch(DIALOG_API_URL, {
        method: "POST",
        headers: {
          "D360-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: { body: message },
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.error("360dialog error:", resp.status, JSON.stringify(data));
        return new Response(
          JSON.stringify({
            error: data?.error?.message || `Erro ao enviar: ${resp.status}`,
            details: data,
          }),
          { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message_id: data?.messages?.[0]?.id, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send_bulk") {
      if (!leads || !Array.isArray(leads) || leads.length === 0) {
        return new Response(
          JSON.stringify({ error: "Lista de leads é obrigatória." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results: Array<{ lead_id: string; success: boolean; error?: string }> = [];

      for (const lead of leads) {
        if (!lead.phone || !lead.message) {
          results.push({ lead_id: lead.id, success: false, error: "Sem telefone ou mensagem" });
          continue;
        }

        let formattedPhone = lead.phone.replace(/\D/g, "");
        if (formattedPhone.length <= 11 && !formattedPhone.startsWith("55")) {
          formattedPhone = "55" + formattedPhone;
        }

        try {
          const resp = await fetch(DIALOG_API_URL, {
            method: "POST",
            headers: {
              "D360-API-KEY": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: formattedPhone,
              type: "text",
              text: { body: lead.message },
            }),
          });

          const data = await resp.json();

          if (!resp.ok) {
            results.push({
              lead_id: lead.id,
              success: false,
              error: data?.error?.message || `Status ${resp.status}`,
            });
          } else {
            results.push({ lead_id: lead.id, success: true });
          }
        } catch (err) {
          results.push({ lead_id: lead.id, success: false, error: String(err) });
        }

        // Rate limit: 300ms between messages
        await new Promise((r) => setTimeout(r, 300));
      }

      const sent = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return new Response(
        JSON.stringify({ success: true, sent, failed, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("whatsapp-360dialog error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
