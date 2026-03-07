import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Escalate pending lead notifications (Motor 3)
    const { data: escalationCount, error: escError } = await supabase.rpc(
      "escalonar_notificacoes_leads"
    );
    if (escError) console.error("Escalation error:", escError);

    // 2. Detect stale leads (Motor 4)
    const { data: staleCount, error: staleError } = await supabase.rpc(
      "detectar_leads_parados"
    );
    if (staleError) console.error("Stale detection error:", staleError);

    // 3. Recycle expired acceptance leads
    const { data: recycledCount, error: recycleError } = await supabase.rpc(
      "reciclar_leads_expirados"
    );
    if (recycleError) console.error("Recycle error:", recycleError);

    // 4. Clean expired OA locks
    const { data: cleanedCount, error: cleanError } = await supabase.rpc(
      "cleanup_expired_locks"
    );
    if (cleanError) console.error("Cleanup error:", cleanError);

    const result = {
      escalated: escalationCount || 0,
      stale_alerts: staleCount || 0,
      recycled: recycledCount || 0,
      locks_cleaned: cleanedCount || 0,
      timestamp: new Date().toISOString(),
    };

    console.log("Lead escalation run:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Escalation error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
