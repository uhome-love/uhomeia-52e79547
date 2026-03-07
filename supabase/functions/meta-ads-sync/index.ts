import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API_VERSION = "v21.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
}

interface MetaInsight {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  actions?: Array<{ action_type: string; value: string }>;
  date_start: string;
  date_stop: string;
}

async function fetchMetaCampaigns(accessToken: string, accountId: string): Promise<MetaCampaign[]> {
  const url = `${META_BASE}/${accountId}/campaigns?fields=id,name,status,objective&access_token=${accessToken}&limit=100`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Meta API error: ${JSON.stringify(err.error || err)}`);
  }
  const data = await res.json();
  return data.data || [];
}

async function fetchCampaignInsights(
  accessToken: string,
  accountId: string,
  since: string,
  until: string
): Promise<MetaInsight[]> {
  const fields = "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions";
  const url = `${META_BASE}/${accountId}/insights?fields=${fields}&time_range={"since":"${since}","until":"${until}"}&level=campaign&access_token=${accessToken}&limit=500`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Meta Insights API error: ${JSON.stringify(err.error || err)}`);
  }
  const data = await res.json();
  return data.data || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "sync"; // "sync" | "test"

    // Fetch Meta Ads credentials from integration_settings
    const { data: settings } = await supabase
      .from("integration_settings")
      .select("key, value")
      .in("key", ["meta_ads_access_token", "meta_ads_account_id", "meta_ads_cpl_limit", "meta_ads_auto_sync"]);

    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value; });

    const accessToken = settingsMap.meta_ads_access_token;
    const accountId = settingsMap.meta_ads_account_id;

    if (!accessToken || !accountId) {
      return new Response(JSON.stringify({ error: "Meta Ads não configurado. Adicione o Access Token e Account ID nas configurações." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TEST MODE: just validate credentials
    if (mode === "test") {
      try {
        const campaigns = await fetchMetaCampaigns(accessToken, accountId);
        return new Response(JSON.stringify({
          success: true,
          message: `Conexão OK! ${campaigns.length} campanhas encontradas.`,
          campaigns_count: campaigns.length,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({
          success: false,
          error: e.message,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // SYNC MODE: fetch insights and upsert
    const now = new Date();
    const since = body.since || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const until = body.until || now.toISOString().split("T")[0];

    // Fetch campaigns and insights
    const [campaigns, insights] = await Promise.all([
      fetchMetaCampaigns(accessToken, accountId),
      fetchCampaignInsights(accessToken, accountId, since, until),
    ]);

    const campaignMap = new Map<string, MetaCampaign>();
    campaigns.forEach(c => campaignMap.set(c.id, c));

    // Get existing entries to avoid duplicates (incremental sync)
    const { data: existingEntries } = await supabase
      .from("marketing_entries")
      .select("campanha, periodo")
      .eq("canal", "meta_ads")
      .eq("user_id", userId);

    const existingKeys = new Set(
      (existingEntries || []).map((e: any) => `${e.campanha}|${e.periodo}`)
    );

    const cplLimit = parseFloat(settingsMap.meta_ads_cpl_limit || "80");
    const alertCampaigns: string[] = [];

    const newEntries: any[] = [];
    for (const insight of insights) {
      const periodo = `${insight.date_start} a ${insight.date_stop}`;
      const key = `${insight.campaign_name}|${periodo}`;

      if (existingKeys.has(key)) continue; // Skip existing

      const spend = parseFloat(insight.spend) || 0;
      const impressions = parseInt(insight.impressions) || 0;
      const clicks = parseInt(insight.clicks) || 0;
      const ctr = parseFloat(insight.ctr) || 0;
      const cpc = parseFloat(insight.cpc) || 0;

      // Extract leads from actions
      let leadsGenerated = 0;
      if (insight.actions) {
        const leadAction = insight.actions.find(
          a => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped"
        );
        if (leadAction) leadsGenerated = parseInt(leadAction.value) || 0;
      }

      const cpl = leadsGenerated > 0 ? spend / leadsGenerated : null;

      // Check CPL alert
      if (cpl !== null && cpl > cplLimit) {
        alertCampaigns.push(insight.campaign_name);
      }

      const campaign = campaignMap.get(insight.campaign_id);

      newEntries.push({
        user_id: userId,
        canal: "meta_ads",
        campanha: insight.campaign_name,
        empreendimento: null,
        periodo,
        investimento: spend,
        impressoes: impressions,
        cliques: clicks,
        leads_gerados: leadsGenerated,
        conversoes: 0,
        cpl,
        cpc,
        ctr,
        visitas: 0,
        propostas: 0,
        vendas: 0,
      });
    }

    let inserted = 0;
    if (newEntries.length > 0) {
      // Insert in batches of 50
      for (let i = 0; i < newEntries.length; i += 50) {
        const batch = newEntries.slice(i, i + 50);
        const { error: insertError } = await supabase.from("marketing_entries").insert(batch);
        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          inserted += batch.length;
        }
      }
    }

    // Send CPL alerts
    if (alertCampaigns.length > 0) {
      // Find admin/CEO users to notify
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: adminRoles } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map((r: any) => ({
          user_id: r.user_id,
          titulo: "⚠️ CPL acima do limite",
          mensagem: `Campanhas com CPL acima de R$ ${cplLimit}: ${alertCampaigns.join(", ")}`,
          tipo: "marketing_alert",
          categoria: "marketing",
        }));

        await adminClient.from("notifications").insert(notifications);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      campaigns_found: campaigns.length,
      insights_fetched: insights.length,
      new_entries_inserted: inserted,
      skipped_existing: insights.length - newEntries.length,
      alerts_sent: alertCampaigns.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("meta-ads-sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
