import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);

  // GET: Fetch referral info by code
  if (req.method === "GET") {
    const codigo = url.searchParams.get("codigo");
    if (!codigo) {
      return new Response(JSON.stringify({ error: "Código não informado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: referral, error } = await supabase
      .from("referrals")
      .select("id, cliente_nome, ativo")
      .eq("codigo_unico", codigo)
      .eq("ativo", true)
      .maybeSingle();

    if (error || !referral) {
      return new Response(JSON.stringify({ error: "Código de indicação inválido ou expirado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ cliente_nome: referral.cliente_nome, referral_id: referral.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST: Submit referral lead
  if (req.method === "POST") {
    const body = await req.json();
    const { referral_id, nome, telefone, email, interesse } = body;

    if (!referral_id || !nome || (!telefone && !email)) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios: nome e telefone ou email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate referral exists
    const { data: referral } = await supabase
      .from("referrals")
      .select("id, corretor_id, created_by")
      .eq("id", referral_id)
      .eq("ativo", true)
      .maybeSingle();

    if (!referral) {
      return new Response(JSON.stringify({ error: "Indicação inválida" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert referral lead
    const { error: insertError } = await supabase
      .from("referral_leads")
      .insert({
        referral_id: referral.id,
        nome: nome.trim().slice(0, 100),
        telefone: telefone?.trim().slice(0, 20) || null,
        email: email?.trim().slice(0, 255) || null,
        interesse: interesse?.trim().slice(0, 500) || null,
      });

    if (insertError) {
      return new Response(JSON.stringify({ error: "Erro ao registrar indicação" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment total_indicacoes
    await supabase.rpc("increment_referral_count", { p_referral_id: referral.id });

    // Notify the corretor
    if (referral.corretor_id) {
      await supabase.from("notifications").insert({
        user_id: referral.corretor_id,
        categoria: "indicacoes",
        tipo: "nova_indicacao",
        titulo: "📨 Nova indicação recebida!",
        mensagem: `${nome} foi indicado e entrou como lead. Faça contato!`,
        dados: { referral_id: referral.id, nome, telefone },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
