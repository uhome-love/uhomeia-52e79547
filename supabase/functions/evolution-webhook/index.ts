import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(raw: string): string {
  return raw.replace(/[+\s\-()]/g, "");
}

function getSearchVariants(phone: string): string[] {
  const clean = normalizePhone(phone);
  // Get last 8 digits for broad match
  const last8 = clean.slice(-8);
  return [last8];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();

    const instanceName = payload.instance;
    const data = payload.data;

    if (!data?.key?.remoteJid || !instanceName) {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const remoteJid = data.key.remoteJid as string;

    // Filter: ignore groups and status broadcast
    if (remoteJid.includes("@g.us") || remoteJid === "status@broadcast") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // Extract body
    const body =
      data.message?.conversation ||
      data.message?.extendedTextMessage?.text ||
      null;

    if (!body) {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // Extract phone from remoteJid
    const phoneRaw = remoteJid.replace("@s.whatsapp.net", "");
    const variants = getSearchVariants(phoneRaw);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Search lead by last 8 digits
    const searchPattern = `%${variants[0]}%`;
    const { data: leads, error: leadErr } = await supabase
      .from("pipeline_leads")
      .select("id")
      .ilike("telefone", searchPattern)
      .limit(1);

    if (leadErr || !leads || leads.length === 0) {
      // No lead found — ignore
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const leadId = leads[0].id;

    // Get corretor_id from whatsapp_instancias
    const { data: instancia } = await supabase
      .from("whatsapp_instancias")
      .select("corretor_id")
      .eq("instance_name", instanceName)
      .maybeSingle();

    const corretorId = instancia?.corretor_id || null;

    // Build direction
    const direction = data.key.fromMe ? "sent" : "received";

    // Convert unix timestamp to ISO
    const timestamp = data.messageTimestamp
      ? new Date(Number(data.messageTimestamp) * 1000).toISOString()
      : new Date().toISOString();

    // Insert message
    const { error: insertErr } = await supabase
      .from("whatsapp_mensagens")
      .insert({
        lead_id: leadId,
        corretor_id: corretorId,
        instance_name: instanceName,
        direction,
        body,
        whatsapp_message_id: data.key.id || null,
        timestamp,
      });

    if (insertErr) {
      console.error("Insert error:", insertErr);
    }

    // Update lead updated_at
    await supabase
      .from("pipeline_leads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", leadId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("evolution-webhook error:", err);
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
});
