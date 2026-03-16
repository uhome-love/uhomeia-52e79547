import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ---------- GET: Meta webhook verification ----------
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");

    if (mode === "subscribe" && token === verifyToken) {
      console.log("✅ Webhook verified");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }

    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // ---------- POST: Status updates from Meta ----------
  if (req.method === "POST") {
    try {
      const body = await req.json();

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const entries = body?.entry || [];
      let updatedCount = 0;

      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          if (!value) continue;

          // Process message statuses
          const statuses = value?.statuses || [];
          for (const status of statuses) {
            const waMessageId = status?.id;
            const statusType = status?.status; // sent, delivered, read, failed
            const timestamp = status?.timestamp;

            if (!waMessageId) continue;

            const ts = timestamp
              ? new Date(parseInt(timestamp) * 1000).toISOString()
              : new Date().toISOString();

            const updateData: Record<string, string> = {};

            switch (statusType) {
              case "sent":
                // Already handled at dispatch time, but update if missing
                updateData.status_envio = "sent";
                break;
              case "delivered":
                updateData.status_envio = "delivered";
                updateData.delivered_at = ts;
                break;
              case "read":
                updateData.status_envio = "read";
                updateData.read_at = ts;
                break;
              case "failed":
                updateData.status_envio = "failed";
                updateData.error_message =
                  status?.errors?.[0]?.title || "Meta delivery failed";
                break;
              default:
                continue;
            }

            const { error } = await supabase
              .from("whatsapp_campaign_sends")
              .update(updateData)
              .eq("message_id", waMessageId);

            if (error) {
              console.error(
                `❌ Error updating ${waMessageId}:`,
                error.message
              );
            } else {
              updatedCount++;
            }
          }

          // Process incoming messages (replies)
          const messages = value?.messages || [];
          for (const msg of messages) {
            // A reply from a contact — try to match by phone
            const from = msg?.from; // e.g. "5551999990000"
            if (!from) continue;

            // Update the most recent send to this phone number as "replied"
            const { error } = await supabase
              .from("whatsapp_campaign_sends")
              .update({
                status_envio: "replied",
                replied_at: new Date().toISOString(),
              })
              .eq("telefone_normalizado", from)
              .in("status_envio", ["sent", "delivered", "read"])
              .order("sent_at", { ascending: false })
              .limit(1);

            if (!error) updatedCount++;
          }
        }
      }

      console.log(`✅ Webhook processed: ${updatedCount} updates`);
      return new Response(
        JSON.stringify({ ok: true, updated: updatedCount }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("❌ Webhook error:", err);
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
