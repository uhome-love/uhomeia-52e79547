import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autenticado" }, 401);
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr || !user) return json({ error: "Não autenticado" }, 401);

    const { telefone } = await req.json();
    if (!telefone) return json({ error: "telefone é obrigatório" }, 400);

    // Normalize phone
    let cleanPhone = telefone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
    if (!cleanPhone.startsWith("55")) cleanPhone = "55" + cleanPhone;

    // Get user's profile
    const { data: profile } = await sb
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.id) return json({ error: "Perfil não encontrado" }, 404);

    // Get connected Evolution instance
    const { data: instance } = await sb
      .from("whatsapp_instancias")
      .select("instance_name, status")
      .eq("corretor_id", profile.id)
      .eq("status", "conectado")
      .maybeSingle();

    if (!instance) return json({ picture_url: null });

    const evoUrl = Deno.env.get("EVOLUTION_API_URL");
    const evoKey = Deno.env.get("EVOLUTION_API_KEY");
    if (!evoUrl || !evoKey) return json({ picture_url: null });

    // Call Evolution API to fetch profile picture
    const response = await fetch(
      `${evoUrl}/chat/fetchProfilePictureUrl/${instance.instance_name}`,
      {
        method: "POST",
        headers: {
          apikey: evoKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ number: cleanPhone }),
      }
    );

    if (!response.ok) {
      console.error("Evolution profile picture error:", response.status);
      return json({ picture_url: null });
    }

    const result = await response.json();
    const pictureUrl = result?.profilePictureUrl || result?.picture || result?.url || null;

    return json({ picture_url: pictureUrl });
  } catch (err) {
    console.error("whatsapp-profile-picture error:", err);
    return json({ picture_url: null });
  }
});
