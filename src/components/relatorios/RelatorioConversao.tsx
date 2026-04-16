import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";
import { ReportFilters } from "./reportUtils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RelatorioConversaoProps {
  filters: ReportFilters;
  userRole: "admin" | "gestor" | "corretor";
}

interface FunilItem {
  etapa: string;
  label: string;
  count: number;
  pct: number;
  tempoMedio: number;
  color: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ETAPAS_LEAD = [
  "Novo Lead", "Sem Contato", "Contato Inicial", "Busca",
  "Aquecimento", "Visita", "Pós-Visita", "Negócio Criado", "Descarte",
];

const ETAPAS_NEGOCIO = [
  "novo negocio", "proposta", "em negociação",
  "contrato gerado", "venda realizada", "caiu",
];

const LABEL_NEGOCIO: Record<string, string> = {
  "novo negocio": "Novo Negócio",
  "proposta": "Proposta",
  "em negociação": "Em Negociação",
  "contrato gerado": "Contrato Gerado",
  "venda realizada": "Venda Realizada",
  "caiu": "Caiu",
};

const CORES_LEAD: Record<string, string> = {
  "Novo Lead": "#e0e7ff",
  "Sem Contato": "#c7d2fe",
  "Contato Inicial": "#a5b4fc",
  "Busca": "#818cf8",
  "Aquecimento": "#6366f1",
  "Visita": "#4F46E5",
  "Pós-Visita": "#4338ca",
  "Negócio Criado": "#10b981",
  "Descarte": "#fca5a5",
};

const CORES_NEGOCIO: Record<string, string> = {
  "novo negocio": "#fef3c7",
  "proposta": "#fde68a",
  "em negociação": "#fbbf24",
  "contrato gerado": "#f59e0b",
  "venda realizada": "#10b981",
  "caiu": "#fca5a5",
};

const DARK_TEXT_ETAPAS = new Set(["Aquecimento", "Visita", "Pós-Visita", "Negócio Criado", "Descarte"]);
const DARK_TEXT_NEG = new Set(["em negociação", "contrato gerado", "venda realizada", "caiu"]);

// ── Main ───────────────────────────────────────────────────────────────────────

export default function RelatorioConversao({ filters }: RelatorioConversaoProps) {
  const [loading, setLoading] = useState(true);
  const [funilLeads, setFunilLeads] = useState<FunilItem[]>([]);
  const [funilNegocios, setFunilNegocios] = useState<FunilItem[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalNegocios, setTotalNegocios] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // ── Fetch leads ──
      let leadQuery = supabase
        .from("pipeline_leads")
        .select("id, etapa, corretor_id, created_at");

      if (filters.corretor) leadQuery = leadQuery.eq("corretor_id", filters.corretor);

      const { data: leadRows } = await leadQuery;
      let filteredLeads = leadRows || [];

      // Equipe filter
      if (filters.equipe && !filters.corretor) {
        const { data: membros } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("gerente_id", filters.equipe);
        if (membros?.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id")
            .in("user_id", membros.map((m) => m.user_id));
          if (profiles?.length) {
            const ids = new Set(profiles.map((p) => p.id));
            filteredLeads = filteredLeads.filter((r) => r.corretor_id && ids.has(r.corretor_id));
          } else {
            filteredLeads = [];
          }
        } else {
          filteredLeads = [];
        }
      }

      // Segmento filter
      if (filters.segmento && filteredLeads.length) {
        const lids = filteredLeads.map((r) => r.id);
        const { data: segLeads } = await supabase
          .from("pipeline_leads")
          .select("id, segmento_id")
          .in("id", lids);
        if (segLeads?.length) {
          const segIds = [...new Set(segLeads.map((l) => l.segmento_id).filter(Boolean))] as string[];
          if (segIds.length) {
            const { data: segs } = await supabase
              .from("roleta_segmentos")
              .select("id, nome")
              .in("id", segIds);
            const segNameMap = new Map<string, string>((segs || []).map((s2) => [s2.id, s2.nome as string]));
            const matchIds = new Set(
              segLeads
                .filter((l) => {
                  const sid = l.segmento_id as string | null;
                  if (!sid) return false;
                  return (segNameMap.get(sid) || "").toLowerCase().includes(filters.segmento.toLowerCase());
                })
                .map((l) => l.id)
            );
            filteredLeads = filteredLeads.filter((r) => matchIds.has(r.id));
          }
        }
      }

      // Build funil leads
      const now = Date.now();
      const leadCounts = new Map<string, number>();
      const leadTempos = new Map<string, number[]>();
      ETAPAS_LEAD.forEach((e) => { leadCounts.set(e, 0); leadTempos.set(e, []); });

      filteredLeads.forEach((r) => {
        const etapa = r.etapa || "Novo Lead";
        if (leadCounts.has(etapa)) {
          leadCounts.set(etapa, (leadCounts.get(etapa) || 0) + 1);
          leadTempos.get(etapa)!.push(Math.floor((now - new Date(r.created_at).getTime()) / 86400000));
        }
      });

      const tLeads = filteredLeads.length;
      const maxLeadCount = Math.max(1, ...Array.from(leadCounts.values()));
      const fLeads: FunilItem[] = ETAPAS_LEAD.map((etapa) => {
        const count = leadCounts.get(etapa) || 0;
        const tempos = leadTempos.get(etapa) || [];
        const tempoMedio = tempos.length > 0 ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0;
        return {
          etapa,
          label: etapa,
          count,
          pct: tLeads > 0 ? Math.round((count / tLeads) * 1000) / 10 : 0,
          tempoMedio,
          color: CORES_LEAD[etapa] || "#e5e7eb",
        };
      });

      // ── Fetch negócios ──
      let negQuery = supabase
        .from("negocios")
        .select("id, fase, corretor_id, created_at, data_assinatura");

      if (filters.corretor) negQuery = negQuery.eq("corretor_id", filters.corretor);

      const { data: negRows } = await negQuery;
      let filteredNeg = negRows || [];

      if (filters.equipe && !filters.corretor) {
        const { data: membros } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("gerente_id", filters.equipe);
        if (membros?.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id")
            .in("user_id", membros.map((m) => m.user_id));
          if (profiles?.length) {
            const ids = new Set(profiles.map((p) => p.id));
            filteredNeg = filteredNeg.filter((r) => r.corretor_id && ids.has(r.corretor_id));
          } else {
            filteredNeg = [];
          }
        } else {
          filteredNeg = [];
        }
      }

      const negCounts = new Map<string, number>();
      const negTempos = new Map<string, number[]>();
      ETAPAS_NEGOCIO.forEach((e) => { negCounts.set(e, 0); negTempos.set(e, []); });

      filteredNeg.forEach((r) => {
        const fase = r.fase || "novo negocio";
        if (negCounts.has(fase)) {
          negCounts.set(fase, (negCounts.get(fase) || 0) + 1);
          negTempos.get(fase)!.push(Math.floor((now - new Date(r.created_at).getTime()) / 86400000));
        }
      });

      const tNeg = filteredNeg.length;
      const fNeg: FunilItem[] = ETAPAS_NEGOCIO.map((fase) => {
        const count = negCounts.get(fase) || 0;
        const tempos = negTempos.get(fase) || [];
        const tempoMedio = tempos.length > 0 ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0;
        return {
          etapa: fase,
          label: LABEL_NEGOCIO[fase] || fase,
          count,
          pct: tNeg > 0 ? Math.round((count / tNeg) * 1000) / 10 : 0,
          tempoMedio,
          color: CORES_NEGOCIO[fase] || "#e5e7eb",
        };
      });

      if (!cancelled) {
        setFunilLeads(fLeads);
        setFunilNegocios(fNeg);
        setTotalLeads(tLeads);
        setTotalNegocios(tNeg);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [filters.corretor, filters.equipe, filters.segmento]);

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const leadsVisitaPlus = funilLeads
    .filter((f) => ["Visita", "Pós-Visita", "Negócio Criado"].includes(f.etapa))
    .reduce((a, f) => a + f.count, 0);
  const taxaLeadVisita = totalLeads > 0 ? Math.round((leadsVisitaPlus / totalLeads) * 1000) / 10 : 0;

  const negVendas = funilNegocios.find((f) => f.etapa === "venda realizada")?.count || 0;
  const negNotNovo = funilNegocios.filter((f) => f.etapa !== "novo negocio").reduce((a, f) => a + f.count, 0);
  const taxaNegVenda = negNotNovo > 0 ? Math.round((negVendas / negNotNovo) * 1000) / 10 : 0;

  const leadsNegCriado = funilLeads.find((f) => f.etapa === "Negócio Criado")?.count || 0;
  const taxaGeralVenda = totalLeads > 0 ? Math.round((leadsNegCriado / totalLeads) * 1000) / 10 : 0;

  // ── Gargalos ───────────────────────────────────────────────────────────────

  const gargalos = [...funilLeads]
    .filter((f) => f.etapa !== "Descarte")
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[1, 2].map((i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #e5e7eb", padding: 20, minHeight: 180 }}>
            <div style={{ background: "#f3f4f6", borderRadius: 4, height: 14, width: "30%", marginBottom: 16 }} className="animate-pulse" />
            {[1, 2, 3, 4, 5].map((j) => (
              <div key={j} style={{ background: "#f3f4f6", borderRadius: 6, height: 32, width: `${90 - j * 10}%`, marginBottom: 8 }} className="animate-pulse" />
            ))}
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #e5e7eb", padding: "14px 16px", height: 88 }}>
              <div style={{ background: "#f3f4f6", borderRadius: 4, height: 10, width: "50%", marginBottom: 12 }} className="animate-pulse" />
              <div style={{ background: "#f3f4f6", borderRadius: 4, height: 22, width: "40%" }} className="animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (totalLeads === 0 && totalNegocios === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 8 }}>
        <TrendingUp size={40} strokeWidth={1} color="#C7D2FE" />
        <span style={{ fontSize: 14, color: "#6b7280" }}>Nenhum dado disponível</span>
      </div>
    );
  }

  const thStyle: React.CSSProperties = { fontSize: 11, color: "#9ca3af", fontWeight: 500, textAlign: "left", padding: "8px 16px", borderBottom: "0.5px solid #e5e7eb", background: "#fafafa" };
  const tdStyle: React.CSSProperties = { fontSize: 13, padding: "10px 16px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Funil de Leads */}
      <div style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #e5e7eb", padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Funil de Leads</div>
        <FunnelChart items={funilLeads} darkTextSet={DARK_TEXT_ETAPAS} />
      </div>

      {/* Funil de Negócios */}
      <div style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #e5e7eb", padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Funil de Negócios</div>
        <FunnelChart items={funilNegocios} darkTextSet={DARK_TEXT_NEG} />
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <KpiBox label="TAXA LEAD → VISITA" value={`${taxaLeadVisita}%`} />
        <KpiBox label="TAXA NEGÓCIO → VENDA" value={`${taxaNegVenda}%`} />
        <KpiBox label="TAXA GERAL LEAD → VENDA" value={`${taxaGeralVenda}%`} />
      </div>

      {/* Tabela de gargalos */}
      <div style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #e5e7eb", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #e5e7eb" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Onde os leads acumulam</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Etapa</th>
              <th style={thStyle}>Leads acumulados</th>
              <th style={thStyle}>% do total</th>
              <th style={thStyle}>Tempo médio na etapa</th>
            </tr>
          </thead>
          <tbody>
            {gargalos.map((g, i) => (
              <tr key={g.etapa} style={{ borderBottom: i === gargalos.length - 1 ? "none" : "0.5px solid #f3f4f6" }}>
                <td style={tdStyle}>{g.label}</td>
                <td style={{ ...tdStyle, fontWeight: 500 }}>{g.count}</td>
                <td style={tdStyle}>{g.pct}%</td>
                <td style={{ ...tdStyle, color: "#6b7280" }}>{g.tempoMedio} dias</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────────

function FunnelChart({ items, darkTextSet }: { items: FunilItem[]; darkTextSet: Set<string> }) {
  const maxCount = Math.max(1, ...items.map((i) => i.count));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item) => {
        const widthPct = Math.max(4, (item.count / maxCount) * 100);
        const isDark = darkTextSet.has(item.etapa);
        const showInside = item.pct >= 15;

        return (
          <div key={item.etapa} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 110, fontSize: 12, color: "#6b7280", textAlign: "right", flexShrink: 0 }}>
              {item.label}
            </div>
            <div style={{ flex: 1, position: "relative", height: 32 }}>
              <div
                style={{
                  width: `${widthPct}%`,
                  height: "100%",
                  background: item.color,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 8,
                  paddingRight: 8,
                  minWidth: 32,
                  transition: "width 0.3s ease",
                }}
              >
                {showInside && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#fff" : "#4338ca" }}>
                    {item.count}
                  </span>
                )}
              </div>
              {!showInside && (
                <span style={{ position: "absolute", left: `calc(${widthPct}% + 6px)`, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
                  {item.count}
                </span>
              )}
            </div>
            <div style={{ width: 60, fontSize: 11, color: "#9ca3af", textAlign: "right", flexShrink: 0 }}>
              {item.pct}%
            </div>
            <div style={{ width: 60, fontSize: 11, color: "#9ca3af", textAlign: "right", flexShrink: 0 }}>
              {item.tempoMedio}d
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KpiBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #e5e7eb", padding: "14px 16px" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "#9ca3af", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: "#111827" }}>{value}</div>
    </div>
  );
}
