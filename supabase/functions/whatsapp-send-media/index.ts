import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
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
    if (userErr || !user) {
      return json({ error: "Não autenticado" }, 401);
    }

    const { telefone, media_base64, media_type, filename, caption } = await req.json();

    if (!telefone || !media_base64 || !media_type) {
      return json({ error: "telefone, media_base64 e media_type são obrigatórios" }, 400);
    }

    // Normalize phone
    let cleanPhone = telefone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
    if (!cleanPhone.startsWith("55")) cleanPhone = "55" + cleanPhone;

    // Get profile id
    const { data: profile } = await sb
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.id) {
      return json({ error: "Perfil não encontrado" }, 404);
    }

    // Get Evolution instance
    const { data: instance } = await sb
      .from("whatsapp_instancias")
      .select("instance_name, status")
      .eq("corretor_id", profile.id)
      .eq("status", "conectado")
      .maybeSingle();

    if (!instance) {
      return json({
        error: "WhatsApp não conectado. Conecte seu WhatsApp em Configurações primeiro.",
        requires_connection: true,
      }, 422);
    }

    const evoUrl = Deno.env.get("EVOLUTION_API_URL");
    const evoKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evoUrl || !evoKey) {
      return json({ error: "Evolution API não configurada" }, 500);
    }

    const instanceName = instance.instance_name;

    // Determine Evolution endpoint based on media type
    const isAudio = media_type.startsWith("audio/");
    const endpoint = isAudio ? "sendWhatsAppAudio" : "sendMedia";

    const evoBody: Record<string, unknown> = {
      number: cleanPhone,
      mediatype: getEvoMediaType(media_type),
      media: media_base64,
      fileName: filename || "file",
    };

    if (caption && !isAudio) {
      evoBody.caption = caption;
    }

    console.log(`Sending media via Evolution to: ${cleanPhone} instance: ${instanceName} type: ${media_type}`);

    const evoResponse = await fetch(
      `${evoUrl}/message/${endpoint}/${instanceName}`,
      {
        method: "POST",
        headers: {
          apikey: evoKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(evoBody),
      }
    );

    const evoResult = await evoResponse.json();
    console.log("Evolution sendMedia response:", JSON.stringify(evoResult));

    if (!evoResponse.ok) {
      return json({
        error: "Erro ao enviar mídia via Evolution: " + (evoResult?.message || JSON.stringify(evoResult)),
      }, evoResponse.status);
    }

    const messageId = evoResult?.key?.id || evoResult?.messageId || crypto.randomUUID();
    const mediaUrl = evoResult?.message?.mediaUrl || null;

    return json({
      success: true,
      message_id: messageId,
      media_url: mediaUrl,
      phone: cleanPhone,
      channel: "evolution",
    });
  } catch (e) {
    console.error("whatsapp-send-media error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function getEvoMediaType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}
