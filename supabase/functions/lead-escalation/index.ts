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

    // 4b. If leads were recycled, notify CEO/gerentes via WhatsApp
    if (recycledCount && recycledCount > 0) {
      try {
        // Get recently expired leads (recycled in last 2 minutes)
        const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: expiredLeads } = await supabase
          .from("distribuicao_historico")
          .select("pipeline_lead_id, corretor_id")
          .eq("acao", "timeout")
          .gte("created_at", twoMinAgo);

        if (expiredLeads && expiredLeads.length > 0) {
          // Get CEO/gerente profiles with phone numbers
          const { data: ceoGerentes } = await supabase
            .from("profiles")
            .select("telefone, nome, cargo")
            .in("cargo", ["ceo", "gerente"]);

          for (const expired of expiredLeads) {
            // Get corretor name
            const { data: corretorProfile } = await supabase
              .from("profiles")
              .select("nome")
              .eq("user_id", expired.corretor_id)
              .maybeSingle();

            // Get lead data
            const { data: leadData } = await supabase
              .from("pipeline_leads")
              .select("nome, empreendimento")
              .eq("id", expired.pipeline_lead_id)
              .maybeSingle();

            if (leadData && ceoGerentes) {
              for (const gestor of ceoGerentes) {
                if (!gestor.telefone) continue;
                try {
                  await fetch(`${supabaseUrl}/functions/v1/whatsapp-notificacao`, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${serviceKey}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      telefone: gestor.telefone,
                      tipo: "lead_expirado_ceo",
                      dados: {
                        corretor: corretorProfile?.nome || "Desconhecido",
                        nome: leadData.nome || "Lead",
                        empreendimento: leadData.empreendimento || "Não identificado",
                        motivo: "Tempo de aceite expirado (5 min)",
                      },
                    }),
                  });
                } catch (whErr) {
                  console.error("WhatsApp CEO notify error:", whErr);
                }
              }
            }
          }
        }
      } catch (notifyErr) {
        console.error("CEO notification error (non-blocking):", notifyErr);
      }
    }

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
