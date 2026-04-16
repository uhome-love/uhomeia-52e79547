import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, ArrowUp, ArrowDown, ChevronUp, ChevronDown, Search } from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ReportFilters, getDateRange, getPeriodoAnterior, fmtDate } from "./reportUtils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RelatorioLeadsProps {
  filters: ReportFilters;
  userRole: "admin" | "gestor" | "corretor";
}

interface LeadRow {
  id: string;
  nome: string | null;
  telefone: string | null;
  origem: string | null;
  etapa: string | null;
  corretor_id: string | null;
  created_at: string;
  updated_at: string | null;
}

interface LeadProcessado {
  id: string;
  nome: string;
  telefone: string;
  origem: string;
  etapa: string;
  corretor: string;
  equipe: string;
  diasNoFunil: number;
  ultimaAtividade: string;
  createdAt: string;
}

type SortCol = "nome" | "origem" | "etapa" | "corretor" | "equipe" | "diasNoFunil" | "ultimaAtividade";
type SortDir = "asc" | "desc";

// ── Badge ──────────────────────────────────────────────────────────────────────

const ETAPA_BADGE: Record<string, { bg: string; color: string }> = {
  "Novo Lead": { bg: "#f3f4f6", color: "#6b7280" },
  "Sem Contato": { bg: "#f3f4f6", color: "#6b7280" },
  "Contato Inicial": { bg: "#EEF2FF", color: "#4F46E5" },
  "Busca": { bg: "#EEF2FF", color: "#4F46E5" },
  "Aquecimento": { bg: "#fef3c7", color: "#92400e" },
  "Visita": { bg: "#ede9fe", color: "#5b21b6" },
  "Pós-Visita": { bg: "#ede9fe", color: "#5b21b6" },
  "Negócio Criado": { bg: "#d1fae5", color: "#065f46" },
  "Descarte": { bg: "#fee2e2", color: "#991b1b" },
};

function Badge({ label }: { label: string }) {
  const s = ETAPA_BADGE[label] || { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{ display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 10, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

// ── Chart helpers ──────────────────────────────────────────────────────────────

function groupLeads(leads: LeadProcessado[], periodo: string, startDate: Date, endDate: Date) {
  const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);

  if (periodo === "hoje") {
    const buckets = Array.from({ length: 24 }, (_, i) => ({ label: `${i}h`, count: 0 }));
    leads.forEach((l) => {
      const h = new Date(l.createdAt).getHours();
      buckets[h].count += 1;
    });
    return buckets.filter((b) => b.count > 0);
  }
  if (periodo === "semana") {
    const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const buckets = days.map((d) => ({ label: d, count: 0 }));
    leads.forEach((l) => {
      const dt = new Date(l.createdAt);
      const day = dt.getDay();
      const idx = day === 0 ? 6 : day - 1;
      buckets[idx].count += 1;
    });
    return buckets;
  }
  if (periodo === "mes") {
    const buckets = [{ label: "S1", count: 0 }, { label: "S2", count: 0 }, { label: "S3", count: 0 }, { label: "S4", count: 0 }, { label: "S5", count: 0 }];
    leads.forEach((l) => {
      const day = new Date(l.createdAt).getDate();
      const idx = Math.min(Math.floor((day - 1) / 7), 4);
      buckets[idx].count += 1;
    });
    return buckets.filter((b, i) => b.count > 0 || i < 4);
  }
  // custom
  if (diffDays <= 14) {
    const map = new Map<string, number>();
    leads.forEach((l) => {
      const d = l.createdAt.slice(0, 10);
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([d, count]) => ({ label: fmtDate(d), count }));
  }
  if (diffDays <= 90) {
    const map = new Map<string, number>();
    leads.forEach((l) => {
      const dt = new Date(l.createdAt);
      const ws = new Date(dt); ws.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
      const key = fmtDate(ws.toISOString().slice(0, 10));
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
  }
  const map = new Map<string, number>();
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  leads.forEach((l) => {
    const dt = new Date(l.createdAt);
    const key = `${months[dt.getMonth()]}/${dt.getFullYear() % 100}`;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
}

function ChartTooltipCustom({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
      <div style={{ color: "#6b7280" }}>{label}</div>
      <div style={{ fontWeight: 500, color: "#111827" }}>{payload[0].value} leads</div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function RelatorioLeads({ filters }: RelatorioLeadsProps) {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadProcessado[]>([]);
  const [leadsAnterior, setLeadsAnterior] = useState<LeadProcessado[]>([]);
  const [tempoMedio1Contato, setTempoMedio1Contato] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const { startDate, endDate } = useMemo(() => getDateRange(filters), [filters]);
  const prev = useMemo(() => getPeriodoAnterior(startDate, endDate), [startDate, endDate]);

  useEffect(() => { setPage(0); }, [filters, search, sortCol, sortDir]);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeads(s: Date, e: Date): Promise<LeadProcessado[]> {
      let query = supabase
        .from("pipeline_leads")
        .select("id, nome, telefone, origem, etapa, corretor_id, created_at, updated_at")
        .gte("created_at", s.toISOString())
        .lte("created_at", e.toISOString());

      if (filters.corretor) {
        query = query.eq("corretor_id", filters.corretor);
      }

      const { data: rows, error } = await query;
      if (error || !rows?.length) return [];

      const leadRows = rows as LeadRow[];

      // Filter by equipe
      let filteredRows = leadRows;
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
            filteredRows = leadRows.filter((r) => r.corretor_id && ids.has(r.corretor_id));
          } else {
            filteredRows = [];
          }
        } else {
          filteredRows = [];
        }
      }

      // Segmento filter
      if (filters.segmento) {
        const leadIds = filteredRows.map((r) => r.id);
        if (leadIds.length) {
          const { data: segLeads } = await supabase
            .from("pipeline_leads")
            .select("id, segmento_id")
            .in("id", leadIds);
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
                    const segId = l.segmento_id as string | null;
                    if (!segId) return false;
                    const name = segNameMap.get(segId) || "";
                    return name.toLowerCase().includes(filters.segmento.toLowerCase());
                  })
                  .map((l) => l.id)
              );
              filteredRows = filteredRows.filter((r) => matchIds.has(r.id));
            } else {
              filteredRows = [];
            }
          }
        }
      }

      // Corretor names + equipe
      const corretorIds = [...new Set(filteredRows.map((r) => r.corretor_id).filter(Boolean))] as string[];
      const corretorNameMap = new Map<string, string>();
      const corretorUserMap = new Map<string, string>();

      if (corretorIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nome, user_id")
          .in("id", corretorIds);
        (profs || []).forEach((p) => {
          corretorNameMap.set(p.id, p.nome || "—");
          if (p.user_id) corretorUserMap.set(p.id, p.user_id);
        });
      }

      const userIds = [...corretorUserMap.values()];
      const equipeMap = new Map<string, string>();
      if (userIds.length) {
        const { data: members } = await supabase
          .from("team_members")
          .select("user_id, gerente_id")
          .in("user_id", userIds);
        if (members?.length) {
          const gerenteIds = [...new Set(members.map((m) => m.gerente_id).filter(Boolean))] as string[];
          if (gerenteIds.length) {
            const { data: gerentes } = await supabase
              .from("profiles")
              .select("id, nome, user_id")
              .in("user_id", gerenteIds);
            const gMap = new Map<string, string>((gerentes || []).map((g) => [g.user_id as string, g.nome || "—"]));
            members.forEach((m) => {
              equipeMap.set(m.user_id, gMap.get(m.gerente_id as string) || "—");
            });
          }
        }
      }

      // Última atividade
      const leadIds = filteredRows.map((r) => r.id);
      const ultimaAtividadeMap = new Map<string, string>();
      if (leadIds.length) {
        const { data: atividades } = await supabase
          .from("pipeline_atividades")
          .select("lead_id, created_at")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false });
        if (atividades?.length) {
          atividades.forEach((a) => {
            const lid = a.lead_id as string;
            if (!ultimaAtividadeMap.has(lid)) {
              ultimaAtividadeMap.set(lid, (a.created_at as string).slice(0, 10));
            }
          });
        }
      }

      return filteredRows.map((r): LeadProcessado => {
        const userId = r.corretor_id ? corretorUserMap.get(r.corretor_id) : undefined;
        return {
          id: r.id,
          nome: r.nome || "—",
          telefone: r.telefone || "—",
          origem: r.origem || "—",
          etapa: r.etapa || "—",
          corretor: r.corretor_id ? corretorNameMap.get(r.corretor_id) || "—" : "—",
          equipe: userId ? equipeMap.get(userId) || "—" : "—",
          diasNoFunil: Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000),
          ultimaAtividade: ultimaAtividadeMap.get(r.id) ? fmtDate(ultimaAtividadeMap.get(r.id)!) : "—",
          createdAt: r.created_at,
        };
      });
    }

    async function load() {
      setLoading(true);
      const [current, anterior] = await Promise.all([
        fetchLeads(startDate, endDate),
        fetchLeads(prev.startDate, prev.endDate),
      ]);

      // Tempo médio 1º contato
      if (current.length > 0) {
        const leadIds = current.map((l) => l.id);
        const { data: atividades } = await supabase
          .from("pipeline_atividades")
          .select("lead_id, created_at, tipo")
          .in("lead_id", leadIds)
          .in("tipo", ["ligacao", "whatsapp"])
          .order("created_at", { ascending: true });

        if (atividades?.length) {
          const firstContact = new Map<string, string>();
          atividades.forEach((a) => {
            const lid = a.lead_id as string;
            if (!firstContact.has(lid)) firstContact.set(lid, a.created_at as string);
          });
          let totalDias = 0;
          let count = 0;
          current.forEach((l) => {
            const fc = firstContact.get(l.id);
            if (fc) {
              const dias = (new Date(fc).getTime() - new Date(l.createdAt).getTime()) / 86400000;
              totalDias += dias;
              count++;
            }
          });
          if (!cancelled) setTempoMedio1Contato(count > 0 ? totalDias / count : null);
        } else {
          if (!cancelled) setTempoMedio1Contato(null);
        }
      } else {
        if (!cancelled) setTempoMedio1Contato(null);
      }

      if (!cancelled) {
        setLeads(current);
        setLeadsAnterior(anterior);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [startDate, endDate, prev.startDate, prev.endDate, filters.corretor, filters.equipe, filters.segmento]);

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const totalLeads = leads.length;
  const totalLeadsAnt = leadsAnterior.length;
  const leadsAtivos = leads.filter((l) => l.etapa !== "Negócio Criado" && l.etapa !== "Descarte").length;
  const leadsSemContato = leads.filter((l) => l.etapa === "Novo Lead" || l.etapa === "Sem Contato").length;
  const leadsSemContatoAnt = leadsAnterior.filter((l) => l.etapa === "Novo Lead" || l.etapa === "Sem Contato").length;

  function pctVar(curr: number, prev2: number): { label: string; positive: boolean } | null {
    if (prev2 === 0 && curr === 0) return null;
    if (prev2 === 0) return { label: "+100%", positive: true };
    const pct = Math.round(((curr - prev2) / prev2) * 100);
    return { label: `${pct >= 0 ? "+" : ""}${pct}%`, positive: pct >= 0 };
  }

  // ── Chart ──────────────────────────────────────────────────────────────────

  const chartData = useMemo(() => groupLeads(leads, filters.periodo, startDate, endDate), [leads, filters.periodo, startDate, endDate]);
  const chartTitleText = useMemo(() => {
    const map: Record<string, string> = { hoje: "hora", semana: "dia", mes: "semana" };
    return `Leads recebidos por ${map[filters.periodo] || "período"}`;
  }, [filters.periodo]);

  // ── Table ──────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter((l) => l.nome.toLowerCase().includes(q) || l.telefone.toLowerCase().includes(q));
  }, [leads, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va: string | number = a[sortCol];
      let vb: string | number = b[sortCol];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #e5e7eb", padding: "14px 16px", height: 88 }}>
              <div style={{ background: "#f3f4f6", borderRadius: 4, height: 10, width: "50%", marginBottom: 12 }} className="animate-pulse" />
              <div style={{ background: "#f3f4f6", borderRadius: 4, height: 22, width: "70%" }} className="animate-pulse" />
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #e5e7eb", padding: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "10px 0", borderBottom: "0.5px solid #f3f4f6" }}>
              {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                <div key={j} style={{ background: "#f3f4f6", borderRadius: 4, height: 14, flex: 1 }} className="animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const totalVar = pctVar(totalLeads, totalLeadsAnt);
  const semContatoDiff = leadsSemContato - leadsSemContatoAnt;

  const kpis = [
    { label: "TOTAL DE LEADS", value: String(totalLeads), variation: totalVar },
    { label: "LEADS ATIVOS", value: String(leadsAtivos), subtitle: "Excl. negócio criado e descarte" },
    { label: "LEADS SEM CONTATO", value: String(leadsSemContato), variation: semContatoDiff !== 0 ? { label: `${semContatoDiff > 0 ? "+" : ""}${semContatoDiff} vs anterior`, positive: semContatoDiff < 0 } : null },
    { label: "TEMPO MÉDIO 1º CONTATO", value: tempoMedio1Contato != null ? `${tempoMedio1Contato.toFixed(1).replace(".", ",")} dias` : "—" },
  ];

  const thStyle: React.CSSProperties = { fontSize: 11, color: "#9ca3af", fontWeight: 500, textAlign: "left", padding: "8px 16px", borderBottom: "0.5px solid #e5e7eb", background: "#fafafa", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" };
  const tdStyle: React.CSSProperties = { fontSize: 13, padding: "10px 16px" };

  const cols: { key: SortCol; label: string }[] = [
    { key: "nome", label: "Lead" },
    { key: "origem", label: "Origem" },
    { key: "etapa", label: "Etapa" },
    { key: "corretor", label: "Corretor" },
    { key: "equipe", label: "Equipe" },
    { key: "diasNoFunil", label: "Dias no funil" },
    { key: "ultimaAtividade", label: "Última atividade" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #e5e7eb", padding: "14px 16px" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "#9ca3af", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: "#111827" }}>{k.value}</div>
            {"variation" in k && k.variation && (
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 3, fontSize: 11, color: k.variation.positive ? "#10b981" : "#ef4444" }}>
                {k.variation.positive ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                {k.variation.label}
              </div>
            )}
            {"subtitle" in k && k.subtitle && (
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{k.subtitle}</div>
            )}
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #e5e7eb", padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 12 }}>{chartTitleText}</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltipCustom />} cursor={false} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="#6366f1" fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #e5e7eb", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid #e5e7eb" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Leads — detalhamento</span>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 8, top: 7, color: "#9ca3af" }} />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 12, padding: "5px 8px 5px 28px", border: "0.5px solid #e5e7eb", borderRadius: 8, outline: "none", width: 180 }}
            />
          </div>
        </div>

        {sorted.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 8 }}>
            <Users size={40} strokeWidth={1} color="#C7D2FE" />
            <span style={{ fontSize: 14, color: "#6b7280" }}>Nenhum lead no período selecionado</span>
          </div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c.key} style={thStyle} onClick={() => toggleSort(c.key)}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                        {c.label}
                        {sortCol === c.key && (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((l, i) => (
                  <tr key={l.id} style={{ borderBottom: i === paged.length - 1 ? "none" : "0.5px solid #f3f4f6" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500 }}>{l.nome}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{l.telefone}</div>
                    </td>
                    <td style={tdStyle}>{l.origem}</td>
                    <td style={tdStyle}><Badge label={l.etapa} /></td>
                    <td style={tdStyle}>{l.corretor}</td>
                    <td style={{ ...tdStyle, color: "#6b7280" }}>{l.equipe}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{l.diasNoFunil}</td>
                    <td style={{ ...tdStyle, color: "#6b7280" }}>{l.ultimaAtividade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "10px 16px", borderTop: "0.5px solid #e5e7eb" }}>
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} style={{ border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "4px 12px", fontSize: 12, background: "#fff", cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.4 : 1 }}>Anterior</button>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Página {page + 1} de {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "4px 12px", fontSize: 12, background: "#fff", cursor: page >= totalPages - 1 ? "default" : "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Próximo</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
