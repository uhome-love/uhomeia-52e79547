import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Copy, RotateCcw, Save, Lock, ChevronLeft,
  ChevronRight, Calendar, CheckCircle2, AlertCircle,
  Phone, MapPin, Users, Target, BarChart2,
  Sparkles, ClipboardList, Award, UserCheck, Loader2,
} from "lucide-react";
import { format, subDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── TYPES ───
interface CheckpointRow {
  corretor_id: string;
  nome: string;
  presenca: "presente" | "ausente" | "home_office";
  meta_ligacoes: number;
  meta_aproveitados: number;
  meta_visitas_marcar: number;
  obs_gerente: string;
  res_ligacoes: number;
  res_aproveitados: number;
  res_visitas_marcadas: number;
  res_visitas_realizadas: number;
  res_propostas: number;
  res_vgv: number;
  obs_dia: string;
  status: "ok" | "atencao" | "critico" | "pendente";
}

interface MetasMes {
  vgv_meta: number;
  vgv_realizado: number;
  visitas_marcadas_meta: number;
  visitas_marcadas_realizado: number;
  visitas_realizadas_meta: number;
  visitas_realizadas_realizado: number;
  ligacoes_meta: number;
  ligacoes_realizado: number;
}

interface RelatorioData {
  periodo: string;
  total_ligacoes: number;
  total_aproveitados: number;
  taxa_aproveitamento: number;
  total_visitas_marcadas: number;
  total_visitas_realizadas: number;
  total_propostas: number;
  vgv_gerado: number;
  vgv_assinado: number;
  por_corretor: { nome: string; ligacoes: number; aproveitados: number; visitas: number; propostas: number }[];
}

// ─── HELPERS ───
const calcStatus = (row: CheckpointRow): "ok" | "atencao" | "critico" | "pendente" => {
  if (row.presenca === "ausente") return "critico";
  const ligOk = row.meta_ligacoes === 0 || row.res_ligacoes >= row.meta_ligacoes * 0.8;
  const aprovOk = row.meta_aproveitados === 0 || row.res_aproveitados >= row.meta_aproveitados * 0.8;
  if (row.res_ligacoes === 0 && row.meta_ligacoes > 0) return "pendente";
  if (ligOk && aprovOk) return "ok";
  return "atencao";
};

const statusConfig = {
  ok: { label: "✅ OK", bg: "bg-green-50", text: "text-green-700" },
  atencao: { label: "⚠️ Atenção", bg: "bg-amber-50", text: "text-amber-700" },
  critico: { label: "🔴 Crítico", bg: "bg-red-50", text: "text-red-700" },
  pendente: { label: "⏳ Pendente", bg: "bg-slate-50", text: "text-slate-500" },
};

const presencaConfig = {
  presente: { label: "✅ Presente", bg: "bg-green-100 text-green-700" },
  ausente: { label: "❌ Ausente", bg: "bg-red-100 text-red-700" },
  home_office: { label: "🏠 Home Office", bg: "bg-blue-100 text-blue-700" },
};

const fmt = (n: number) => n.toLocaleString("pt-BR");
const fmtR = (n: number) => `R$ ${n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(0) + "k" : n}`;
const pct = (a: number, b: number) => b === 0 ? 0 : Math.round((a / b) * 100);

// ─── MAIN ───
export default function CheckpointGerente() {
  const { user } = useAuth();
  const { isGestor, isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"checkpoint" | "aproveitados" | "relatorios" | "coach">("checkpoint");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [checkpointStatus, setCheckpointStatus] = useState<"aberto" | "publicado">("aberto");
  const [rows, setRows] = useState<CheckpointRow[]>([]);
  const [metasMes, setMetasMes] = useState<MetasMes>({
    vgv_meta: 3_000_000, vgv_realizado: 0,
    visitas_marcadas_meta: 200, visitas_marcadas_realizado: 0,
    visitas_realizadas_meta: 100, visitas_realizadas_realizado: 0,
    ligacoes_meta: 680, ligacoes_realizado: 0,
  });
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);
  const [relPeriodo, setRelPeriodo] = useState<"hoje" | "semana" | "mes">("semana");
  const [coachAnalysis, setCoachAnalysis] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendentes, setPendentes] = useState<string[]>([]);
  const [aproveitados, setAproveitados] = useState<any[]>([]);
  const [aprovSearch, setAprovSearch] = useState("");
  const [aprovFilter, setAprovFilter] = useState("todos");
  const [teamUserIds, setTeamUserIds] = useState<string[]>([]);
  const [teamNameMap, setTeamNameMap] = useState<Record<string, string>>({});

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dateFmt = format(selectedDate, "dd/MM/yyyy");

  useEffect(() => {
    if (roleLoading) return;
    if (isAdmin) { navigate("/ceo?tab=checkpoints", { replace: true }); return; }
    if (!isGestor) navigate("/corretor", { replace: true });
  }, [isGestor, isAdmin, roleLoading, navigate]);

  // Load team members scoped to this manager
  useEffect(() => {
    if (!user) return;
    supabase.from("team_members").select("id, user_id, nome").eq("gerente_id", user.id).eq("status", "ativo").then(({ data }) => {
      const members = data || [];
      const ids = members.map(m => m.user_id).filter(Boolean) as string[];
      const nameMap: Record<string, string> = {};
      members.forEach(m => { if (m.user_id) nameMap[m.user_id] = m.nome; });
      setTeamUserIds(ids);
      setTeamNameMap(nameMap);
    });
  }, [user]);

  // ─── LOAD CHECKPOINT DATA ───
  const loadCorretores = useCallback(async () => {
    if (teamUserIds.length === 0) { setRows([]); return; }

    // Saved checkpoint data
    const { data: saved } = await supabase
      .from("checkpoint_diario")
      .select("*")
      .eq("data", dateStr)
      .in("corretor_id", teamUserIds);

    const savedMap: Record<string, any> = {};
    saved?.forEach((s: any) => { savedMap[s.corretor_id] = s; });

    // OA attempts
    const { data: tentativas } = await supabase
      .from("oferta_ativa_tentativas")
      .select("corretor_id, resultado")
      .in("corretor_id", teamUserIds)
      .gte("created_at", `${dateStr}T00:00:00`)
      .lte("created_at", `${dateStr}T23:59:59`);

    const oaLig: Record<string, number> = {};
    const oaAprov: Record<string, number> = {};
    tentativas?.forEach((t: any) => {
      oaLig[t.corretor_id] = (oaLig[t.corretor_id] || 0) + 1;
      if (t.resultado === "com_interesse") oaAprov[t.corretor_id] = (oaAprov[t.corretor_id] || 0) + 1;
    });

    // Visitas
    const { data: visitasMarcadas } = await supabase
      .from("visitas")
      .select("corretor_id")
      .in("corretor_id", teamUserIds)
      .eq("data_visita", dateStr);

    const vmCount: Record<string, number> = {};
    visitasMarcadas?.forEach((v: any) => { vmCount[v.corretor_id] = (vmCount[v.corretor_id] || 0) + 1; });

    const { data: visitasRealizadas } = await supabase
      .from("visitas")
      .select("corretor_id")
      .in("corretor_id", teamUserIds)
      .eq("data_visita", dateStr)
      .eq("status", "realizada");

    const vrCount: Record<string, number> = {};
    visitasRealizadas?.forEach((v: any) => { vrCount[v.corretor_id] = (vrCount[v.corretor_id] || 0) + 1; });

    const newRows: CheckpointRow[] = teamUserIds.map(uid => {
      const s = savedMap[uid];
      const row: CheckpointRow = {
        corretor_id: uid,
        nome: teamNameMap[uid] || "Corretor",
        presenca: s?.presenca ?? "presente",
        meta_ligacoes: s?.meta_ligacoes ?? 0,
        meta_aproveitados: s?.meta_aproveitados ?? 0,
        meta_visitas_marcar: s?.meta_visitas_marcar ?? 0,
        obs_gerente: s?.obs_gerente ?? "",
        res_ligacoes: oaLig[uid] ?? s?.res_ligacoes ?? 0,
        res_aproveitados: oaAprov[uid] ?? s?.res_aproveitados ?? 0,
        res_visitas_marcadas: vmCount[uid] ?? s?.res_visitas_marcadas ?? 0,
        res_visitas_realizadas: vrCount[uid] ?? s?.res_visitas_realizadas ?? 0,
        res_propostas: s?.res_propostas ?? 0,
        res_vgv: s?.res_vgv ?? 0,
        obs_dia: s?.obs_dia ?? "",
        status: "pendente",
      };
      row.status = calcStatus(row);
      return row;
    });

    setRows(newRows);
    setPendentes(newRows.filter(r => r.res_ligacoes === 0 && r.meta_ligacoes > 0 && r.presenca === "presente").map(r => r.nome));
  }, [dateStr, teamUserIds, teamNameMap]);

  // Load monthly KPIs
  const loadMetasMes = useCallback(async () => {
    if (!user || teamUserIds.length === 0) return;
    const mesAtual = format(new Date(), "yyyy-MM");
    const mesInicio = `${mesAtual}-01`;
    const mesFim = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd");

    const { count: ligRealizadas } = await supabase.from("oferta_ativa_tentativas").select("id", { count: "exact", head: true }).in("corretor_id", teamUserIds).gte("created_at", `${mesInicio}T00:00:00`).lte("created_at", `${mesFim}T23:59:59`);
    const { count: vmRealizadas } = await supabase.from("visitas").select("id", { count: "exact", head: true }).in("corretor_id", teamUserIds).gte("data_visita", mesInicio).lte("data_visita", mesFim);
    const { count: vrRealizadas } = await supabase.from("visitas").select("id", { count: "exact", head: true }).in("corretor_id", teamUserIds).gte("data_visita", mesInicio).lte("data_visita", mesFim).eq("status", "realizada");
    const { data: negocios } = await supabase.from("negocios").select("vgv_estimado, fase").eq("gerente_id", user!.id).gte("created_at", `${mesInicio}T00:00:00`);
    const vgvReal = (negocios || []).filter(n => n.fase === "assinado").reduce((s, n) => s + Number(n.vgv_estimado || 0), 0);

    setMetasMes(prev => ({
      ...prev,
      ligacoes_realizado: ligRealizadas || 0,
      visitas_marcadas_realizado: vmRealizadas || 0,
      visitas_realizadas_realizado: vrRealizadas || 0,
      vgv_realizado: vgvReal,
    }));
  }, [user, teamUserIds]);

  // ─── LOAD APROVEITADOS ───
  const loadAproveitados = useCallback(async () => {
    if (teamUserIds.length === 0) return;
    const { data } = await supabase
      .from("oferta_ativa_tentativas")
      .select("id, lead_nome, lead_telefone, corretor_id, created_at")
      .in("corretor_id", teamUserIds)
      .eq("resultado", "com_interesse")
      .order("created_at", { ascending: false })
      .limit(100);
    setAproveitados((data || []).map(d => ({ ...d, corretor_nome: teamNameMap[d.corretor_id] || "Corretor" })));
  }, [teamUserIds, teamNameMap]);

  // ─── LOAD RELATORIO ───
  const loadRelatorio = useCallback(async () => {
    if (!user || teamUserIds.length === 0) return;
    const hoje = new Date();
    let inicio: Date;
    const fim = hoje;
    if (relPeriodo === "hoje") { inicio = hoje; }
    else if (relPeriodo === "semana") { inicio = subDays(hoje, 7); }
    else { inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1); }

    const inicioStr = format(inicio, "yyyy-MM-dd");
    const fimStr = format(fim, "yyyy-MM-dd");

    const { data: tent } = await supabase.from("oferta_ativa_tentativas").select("corretor_id, resultado").in("corretor_id", teamUserIds).gte("created_at", `${inicioStr}T00:00:00`).lte("created_at", `${fimStr}T23:59:59`);
    const { data: vis } = await supabase.from("visitas").select("corretor_id, status").in("corretor_id", teamUserIds).gte("data_visita", inicioStr).lte("data_visita", fimStr);
    const { data: neg } = await supabase.from("negocios").select("corretor_id, vgv_estimado, vgv_final, fase").eq("gerente_id", user!.id).gte("created_at", `${inicioStr}T00:00:00`).lte("created_at", `${fimStr}T23:59:59`);

    const ligMap: Record<string, number> = {};
    const aprovMap: Record<string, number> = {};
    tent?.forEach(t => { ligMap[t.corretor_id] = (ligMap[t.corretor_id] || 0) + 1; if (t.resultado === "com_interesse") aprovMap[t.corretor_id] = (aprovMap[t.corretor_id] || 0) + 1; });

    const vmMap: Record<string, number> = {};
    const vrMap: Record<string, number> = {};
    vis?.forEach(v => { if (v.corretor_id) { vmMap[v.corretor_id] = (vmMap[v.corretor_id] || 0) + 1; if (v.status === "realizada") vrMap[v.corretor_id] = (vrMap[v.corretor_id] || 0) + 1; } });

    const propMap: Record<string, number> = {};
    let vgvGerado = 0, vgvAssinado = 0;
    neg?.forEach(n => { if (n.corretor_id) propMap[n.corretor_id] = (propMap[n.corretor_id] || 0) + 1; vgvGerado += Number(n.vgv_estimado ?? 0); if (n.fase === "assinado") vgvAssinado += Number(n.vgv_final ?? 0); });

    const totalLig = Object.values(ligMap).reduce((a, b) => a + b, 0);
    const totalAprov = Object.values(aprovMap).reduce((a, b) => a + b, 0);
    const totalVm = Object.values(vmMap).reduce((a, b) => a + b, 0);
    const totalVr = Object.values(vrMap).reduce((a, b) => a + b, 0);
    const totalProp = Object.values(propMap).reduce((a, b) => a + b, 0);

    const porCorretor = teamUserIds.map(id => ({
      nome: teamNameMap[id] || "Corretor",
      ligacoes: ligMap[id] ?? 0,
      aproveitados: aprovMap[id] ?? 0,
      visitas: vrMap[id] ?? 0,
      propostas: propMap[id] ?? 0,
    })).sort((a, b) => b.ligacoes - a.ligacoes);

    setRelatorio({
      periodo: `${format(inicio, "dd/MM")} a ${format(fim, "dd/MM/yyyy")}`,
      total_ligacoes: totalLig,
      total_aproveitados: totalAprov,
      taxa_aproveitamento: pct(totalAprov, totalLig),
      total_visitas_marcadas: totalVm,
      total_visitas_realizadas: totalVr,
      total_propostas: totalProp,
      vgv_gerado: vgvGerado,
      vgv_assinado: vgvAssinado,
      por_corretor: porCorretor,
    });
  }, [user, relPeriodo, teamUserIds, teamNameMap]);

  // ─── ACTIONS ───
  const syncOA = async () => { setSyncing(true); await loadCorretores(); setSyncing(false); toast({ title: "✅ Sincronizado!", description: "Dados da Oferta Ativa e Visitas atualizados." }); };

  const saveCheckpoint = async () => {
    setSaving(true);
    const upserts = rows.map(r => ({
      corretor_id: r.corretor_id, data: dateStr, presenca: r.presenca,
      meta_ligacoes: r.meta_ligacoes, meta_aproveitados: r.meta_aproveitados, meta_visitas_marcar: r.meta_visitas_marcar, obs_gerente: r.obs_gerente,
      res_ligacoes: r.res_ligacoes, res_aproveitados: r.res_aproveitados, res_visitas_marcadas: r.res_visitas_marcadas,
      res_visitas_realizadas: r.res_visitas_realizadas, res_propostas: r.res_propostas, res_vgv: r.res_vgv, obs_dia: r.obs_dia,
    }));
    const { error } = await supabase.from("checkpoint_diario").upsert(upserts, { onConflict: "corretor_id,data" });
    setSaving(false);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else toast({ title: "✅ Checkpoint salvo!" });
  };

  const copyFromYesterday = async () => {
    const yesterday = format(subDays(selectedDate, 1), "yyyy-MM-dd");
    const { data } = await supabase.from("checkpoint_diario").select("*").eq("data", yesterday).in("corretor_id", teamUserIds);
    if (!data || data.length === 0) { toast({ title: "Nenhum dado ontem para copiar.", variant: "destructive" }); return; }
    const map: Record<string, any> = {};
    data.forEach((d: any) => { map[d.corretor_id] = d; });
    setRows(prev => prev.map(r => { const y = map[r.corretor_id]; if (!y) return r; return { ...r, meta_ligacoes: y.meta_ligacoes, meta_aproveitados: y.meta_aproveitados, meta_visitas_marcar: y.meta_visitas_marcar, presenca: y.presenca }; }));
    toast({ title: "📋 Metas copiadas de ontem!" });
  };

  const zeroResults = () => { setRows(prev => prev.map(r => ({ ...r, res_ligacoes: 0, res_aproveitados: 0, res_visitas_marcadas: 0, res_visitas_realizadas: 0, res_propostas: 0, res_vgv: 0 }))); };

  const publish = async () => { await saveCheckpoint(); setCheckpointStatus("publicado"); toast({ title: "🔒 Checkpoint publicado!", description: "Time notificado." }); };

  const runCoach = async () => {
    setCoachLoading(true); setCoachAnalysis("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/homi-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          message: `Analise o checkpoint do time de hoje (${dateFmt}).\nDados:\n${rows.map(r => `- ${r.nome}: ${r.presenca}, ${r.res_ligacoes}/${r.meta_ligacoes} lig, ${r.res_aproveitados}/${r.meta_aproveitados} aprov, ${r.res_visitas_marcadas} visitas, status: ${r.status}`).join("\n")}\nMetas mês: VGV ${fmtR(metasMes.vgv_realizado)}/${fmtR(metasMes.vgv_meta)}, Visitas ${metasMes.visitas_realizadas_realizado}/${metasMes.visitas_realizadas_meta}, Ligações ${metasMes.ligacoes_realizado}/${metasMes.ligacoes_meta}.\nIdentifique gargalos e sugira ações práticas.`,
          context: "checkpoint_gerente",
        }),
      });
      const json = await res.json();
      setCoachAnalysis(json.response ?? json.message ?? "Sem resposta.");
    } catch { setCoachAnalysis("Erro ao conectar com o HOMI. Tente novamente."); }
    setCoachLoading(false);
  };

  // ─── EFFECTS ───
  useEffect(() => { if (teamUserIds.length > 0) loadCorretores(); }, [loadCorretores, teamUserIds]);
  useEffect(() => { if (teamUserIds.length > 0) loadMetasMes(); }, [loadMetasMes, teamUserIds]);
  useEffect(() => { if (activeTab === "aproveitados") loadAproveitados(); }, [activeTab, loadAproveitados]);
  useEffect(() => { if (activeTab === "relatorios") loadRelatorio(); }, [activeTab, relPeriodo, loadRelatorio]);

  const updateRow = (id: string, field: keyof CheckpointRow, value: any) => {
    setRows(prev => prev.map(r => { if (r.corretor_id !== id) return r; const updated = { ...r, [field]: value }; updated.status = calcStatus(updated); return updated; }));
  };

  const filteredAprov = aproveitados.filter(a => {
    const matchSearch = !aprovSearch || a.lead_nome?.toLowerCase().includes(aprovSearch.toLowerCase()) || a.lead_telefone?.includes(aprovSearch);
    const matchFilter = aprovFilter === "todos" || a.corretor_id === aprovFilter;
    return matchSearch && matchFilter;
  });

  const totalLig = rows.reduce((a, r) => a + r.res_ligacoes, 0);
  const totalAprov = rows.reduce((a, r) => a + r.res_aproveitados, 0);
  const totalVm = rows.reduce((a, r) => a + r.res_visitas_marcadas, 0);
  const presentes = rows.filter(r => r.presenca !== "ausente").length;

  if (roleLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <h1 className="text-2xl font-bold text-gray-900">Checkpoint do <span className="text-blue-600">Gerente</span></h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestão diária do time comercial com metas, resultados e IA</p>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 mt-5 space-y-4">
        {/* ALERTA PENDENTES */}
        {pendentes.length > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-sm font-semibold text-amber-800">📋 {rows.filter(r => r.res_ligacoes > 0).length}/{rows.length} corretores com resultados preenchidos</p>
              <p className="text-xs text-amber-700 mt-0.5"><span className="font-medium">Pendentes:</span> {pendentes.join(", ")}</p>
            </div>
          </div>
        )}

        {/* METAS DO MÊS */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-blue-500" />
              <span className="font-semibold text-gray-800">Metas do Mês —</span>
              <span className="text-blue-600 font-semibold">{format(new Date(), "MMMM/yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Ligações", atual: metasMes.ligacoes_realizado, meta: metasMes.ligacoes_meta, cor: "blue" },
              { label: "VGV Assinado", atual: metasMes.vgv_realizado, meta: metasMes.vgv_meta, cor: "green", money: true },
              { label: "Visitas Marcadas", atual: metasMes.visitas_marcadas_realizado, meta: metasMes.visitas_marcadas_meta, cor: "amber" },
              { label: "Visitas Realizadas", atual: metasMes.visitas_realizadas_realizado, meta: metasMes.visitas_realizadas_meta, cor: "purple" },
            ].map(({ label, atual, meta, cor, money }) => {
              const p = pct(atual, meta);
              const colorMap: Record<string, string> = { blue: "bg-blue-500", green: "bg-green-500", amber: "bg-amber-500", purple: "bg-purple-500" };
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className={`text-xs font-bold ${p < 50 ? "text-red-500" : p < 80 ? "text-amber-500" : "text-green-500"}`}>↗ {p}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${colorMap[cor]} rounded-full transition-all`} style={{ width: `${Math.min(p, 100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{money ? `${fmtR(atual)} / ${fmtR(meta)}` : `${fmt(atual)} / ${fmt(meta)}`}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden">
          {([
            { key: "checkpoint" as const, icon: <ClipboardList size={15} />, label: "Checkpoint" },
            { key: "aproveitados" as const, icon: <CheckCircle2 size={15} />, label: "Aproveitados" },
            { key: "relatorios" as const, icon: <BarChart2 size={15} />, label: "Relatórios" },
            { key: "coach" as const, icon: <Sparkles size={15} />, label: "Coach IA" },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all ${activeTab === tab.key ? "border-blue-500 text-blue-600 bg-blue-50" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB: CHECKPOINT ═══ */}
        {activeTab === "checkpoint" && (
          <div className="bg-white border border-gray-200 rounded-b-xl rounded-tr-xl overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                <button onClick={() => setSelectedDate(d => subDays(d, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={14} /></button>
                <Calendar size={14} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-700 mx-1">{dateFmt}</span>
                <button onClick={() => setSelectedDate(d => addDays(d, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={14} /></button>
              </div>
              <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${checkpointStatus === "publicado" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {checkpointStatus === "publicado" ? "Publicado" : "Aberto"}
              </span>
              <div className="hidden md:flex items-center gap-3 ml-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Phone size={11} className="text-blue-400" /><b className="text-gray-700">{totalLig}</b> lig.</span>
                <span className="flex items-center gap-1"><Award size={11} className="text-green-400" /><b className="text-gray-700">{totalAprov}</b> aprov.</span>
                <span className="flex items-center gap-1"><MapPin size={11} className="text-amber-400" /><b className="text-gray-700">{totalVm}</b> visitas</span>
                <span className="flex items-center gap-1"><UserCheck size={11} className="text-purple-400" /><b className="text-gray-700">{presentes}</b> presentes</span>
              </div>
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <button onClick={syncOA} disabled={syncing} className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                  <RefreshCw size={13} className={syncing ? "animate-spin" : ""} /> Sincronizar OA
                </button>
                <button onClick={copyFromYesterday} className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-all">
                  <Copy size={13} /> Copiar ontem
                </button>
                <button onClick={zeroResults} className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 hover:border-red-200 hover:text-red-500 px-3 py-1.5 rounded-lg transition-all">
                  <RotateCcw size={13} /> Zerar
                </button>
                <button onClick={saveCheckpoint} disabled={saving} className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                  <Save size={13} /> {saving ? "Salvando..." : "Salvar"}
                </button>
                <button onClick={publish} className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-all font-semibold">
                  <Lock size={13} /> Publicar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 bg-gray-50 sticky left-0 z-10 w-36">Corretor</th>
                    <th className="px-2 py-2.5 text-xs font-semibold text-gray-400 w-28">Presença</th>
                    <th colSpan={3} className="text-center py-2.5 text-xs font-bold text-blue-600 bg-blue-50/50 border-l border-r border-blue-100">METAS DO DIA</th>
                    <th className="px-2 py-2.5 text-xs font-semibold text-gray-400 bg-blue-50/50 border-r border-blue-100 w-40">Obs Gerente</th>
                    <th colSpan={6} className="text-center py-2.5 text-xs font-bold text-green-600 bg-green-50/50 border-r border-green-100">RESULTADO DO DIA</th>
                    <th className="px-2 py-2.5 text-xs font-semibold text-gray-400 bg-green-50/50 border-r border-green-100 w-32">Obs Dia</th>
                    <th className="px-2 py-2.5 text-xs font-semibold text-gray-400 w-20 text-center">Status</th>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-xs text-gray-400 font-medium">
                    <th className="px-4 py-2 sticky left-0 bg-gray-50/80 z-10" />
                    <th className="px-2 py-2" />
                    <th className="px-2 py-2 text-center bg-blue-50/30">Ligações</th>
                    <th className="px-2 py-2 text-center bg-blue-50/30">Aprov.</th>
                    <th className="px-2 py-2 text-center bg-blue-50/30">V.Marcar</th>
                    <th className="px-2 py-2 bg-blue-50/30" />
                    <th className="px-2 py-2 text-center bg-green-50/30">Ligações</th>
                    <th className="px-2 py-2 text-center bg-green-50/30">Aprov.</th>
                    <th className="px-2 py-2 text-center bg-green-50/30">V.Marc.</th>
                    <th className="px-2 py-2 text-center bg-green-50/30">V.Real.</th>
                    <th className="px-2 py-2 text-center bg-green-50/30">Prop.</th>
                    <th className="px-2 py-2 text-center bg-green-50/30">VGV</th>
                    <th className="px-2 py-2 bg-green-50/30" />
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const sc = statusConfig[row.status];
                    const pc = presencaConfig[row.presenca];
                    const ligPctVal = row.meta_ligacoes > 0 ? pct(row.res_ligacoes, row.meta_ligacoes) : null;
                    return (
                      <tr key={row.corretor_id} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${row.presenca === "ausente" ? "opacity-60" : ""}`}>
                        <td className="px-4 py-2 sticky left-0 bg-white z-10 font-medium text-gray-800 text-sm">{row.nome}</td>
                        <td className="px-2 py-2">
                          <select value={row.presenca} onChange={e => updateRow(row.corretor_id, "presenca", e.target.value)} className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${pc.bg}`}>
                            <option value="presente">✅ Presente</option>
                            <option value="ausente">❌ Ausente</option>
                            <option value="home_office">🏠 Home Office</option>
                          </select>
                        </td>
                        <td className="px-2 py-2 bg-blue-50/20 text-center">
                          <input type="number" min={0} value={row.meta_ligacoes || ""} onChange={e => updateRow(row.corretor_id, "meta_ligacoes", parseInt(e.target.value) || 0)} placeholder="0" className="w-14 text-center text-sm border border-gray-200 rounded-md py-1 focus:outline-none focus:border-blue-400" />
                        </td>
                        <td className="px-2 py-2 bg-blue-50/20 text-center">
                          <input type="number" min={0} value={row.meta_aproveitados || ""} onChange={e => updateRow(row.corretor_id, "meta_aproveitados", parseInt(e.target.value) || 0)} placeholder="0" className="w-14 text-center text-sm border border-gray-200 rounded-md py-1 focus:outline-none focus:border-blue-400" />
                        </td>
                        <td className="px-2 py-2 bg-blue-50/20 text-center">
                          <input type="number" min={0} value={row.meta_visitas_marcar || ""} onChange={e => updateRow(row.corretor_id, "meta_visitas_marcar", parseInt(e.target.value) || 0)} placeholder="0" className="w-14 text-center text-sm border border-gray-200 rounded-md py-1 focus:outline-none focus:border-blue-400" />
                        </td>
                        <td className="px-2 py-2 bg-blue-50/20">
                          <input type="text" value={row.obs_gerente} onChange={e => updateRow(row.corretor_id, "obs_gerente", e.target.value)} placeholder="..." className="w-full text-xs border border-gray-200 rounded-md py-1 px-2 focus:outline-none focus:border-blue-400" />
                        </td>
                        <td className="px-2 py-2 bg-green-50/20 text-center">
                          <div className="flex flex-col items-center">
                            <input type="number" min={0} value={row.res_ligacoes || ""} onChange={e => updateRow(row.corretor_id, "res_ligacoes", parseInt(e.target.value) || 0)} placeholder="0" className="w-14 text-center text-sm border border-gray-200 rounded-md py-1 focus:outline-none focus:border-green-400" />
                            {ligPctVal !== null && <span className={`text-[10px] font-bold mt-0.5 ${ligPctVal >= 100 ? "text-green-500" : ligPctVal >= 70 ? "text-amber-500" : "text-red-400"}`}>{ligPctVal}%</span>}
                          </div>
                        </td>
                        <td className="px-2 py-2 bg-green-50/20 text-center text-sm"><span className="font-semibold text-green-700">{row.res_aproveitados}</span></td>
                        <td className="px-2 py-2 bg-green-50/20 text-center text-sm text-gray-600">{row.res_visitas_marcadas}</td>
                        <td className="px-2 py-2 bg-green-50/20 text-center text-sm text-gray-600">{row.res_visitas_realizadas}</td>
                        <td className="px-2 py-2 bg-green-50/20 text-center">
                          <input type="number" min={0} value={row.res_propostas || ""} onChange={e => updateRow(row.corretor_id, "res_propostas", parseInt(e.target.value) || 0)} placeholder="0" className="w-12 text-center text-sm border border-gray-200 rounded-md py-1 focus:outline-none focus:border-green-400" />
                        </td>
                        <td className="px-2 py-2 bg-green-50/20 text-center">
                          <input type="number" min={0} value={row.res_vgv || ""} onChange={e => updateRow(row.corretor_id, "res_vgv", parseFloat(e.target.value) || 0)} placeholder="0" className="w-20 text-center text-xs border border-gray-200 rounded-md py-1 focus:outline-none focus:border-green-400" />
                        </td>
                        <td className="px-2 py-2 bg-green-50/20">
                          <input type="text" value={row.obs_dia} onChange={e => updateRow(row.corretor_id, "obs_dia", e.target.value)} placeholder="..." className="w-full text-xs border border-gray-200 rounded-md py-1 px-2 focus:outline-none focus:border-green-400" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={14} className="py-12 text-center text-gray-400 text-sm">Nenhum corretor no time. Adicione membros em "Meu Time".</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-sm">
                    <td className="px-4 py-3 sticky left-0 bg-gray-50 text-gray-600">Totais</td>
                    <td className="px-2 py-3 text-center text-xs text-gray-500">{presentes} presentes</td>
                    <td className="px-2 py-3 text-center bg-blue-50/30 text-blue-700">{rows.reduce((a, r) => a + r.meta_ligacoes, 0)}</td>
                    <td className="px-2 py-3 text-center bg-blue-50/30 text-blue-700">{rows.reduce((a, r) => a + r.meta_aproveitados, 0)}</td>
                    <td className="px-2 py-3 text-center bg-blue-50/30 text-blue-700">{rows.reduce((a, r) => a + r.meta_visitas_marcar, 0)}</td>
                    <td className="bg-blue-50/30" />
                    <td className="px-2 py-3 text-center bg-green-50/30 text-green-700">{totalLig}</td>
                    <td className="px-2 py-3 text-center bg-green-50/30 text-green-700 font-bold">{totalAprov}</td>
                    <td className="px-2 py-3 text-center bg-green-50/30 text-green-700">{totalVm}</td>
                    <td className="px-2 py-3 text-center bg-green-50/30 text-green-700">{rows.reduce((a, r) => a + r.res_visitas_realizadas, 0)}</td>
                    <td className="px-2 py-3 text-center bg-green-50/30 text-green-700">{rows.reduce((a, r) => a + r.res_propostas, 0)}</td>
                    <td className="px-2 py-3 text-center bg-green-50/30 text-green-700 text-xs">{fmtR(rows.reduce((a, r) => a + r.res_vgv, 0))}</td>
                    <td className="bg-green-50/30" />
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ═══ TAB: APROVEITADOS ═══ */}
        {activeTab === "aproveitados" && (
          <div className="bg-white border border-gray-200 rounded-b-xl rounded-tr-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" /> Leads Aproveitados do Time ({filteredAprov.length})
              </h2>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <input type="text" placeholder="Buscar por nome ou telefone..." value={aprovSearch} onChange={e => setAprovSearch(e.target.value)} className="flex-1 min-w-52 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
              <select value={aprovFilter} onChange={e => setAprovFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400">
                <option value="todos">Todos corretores</option>
                {teamUserIds.map(id => <option key={id} value={id}>{teamNameMap[id] || id}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              {filteredAprov.length === 0 ? (
                <p className="text-center text-gray-400 py-10">Nenhum lead aproveitado encontrado.</p>
              ) : filteredAprov.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 text-sm">{a.lead_nome || "Sem nome"}</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Aproveitado</span>
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{a.corretor_nome}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{a.lead_telefone || ""}</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(`${a.lead_nome || ""}\n${a.lead_telefone ?? ""}`); toast({ title: "Copiado!" }); }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-white transition-all">
                    <Copy size={12} /> Copiar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TAB: RELATÓRIOS ═══ */}
        {activeTab === "relatorios" && (
          <div className="bg-white border border-gray-200 rounded-b-xl rounded-tr-xl p-5">
            <div className="flex items-center gap-3 mb-5">
              <select value={relPeriodo} onChange={e => setRelPeriodo(e.target.value as any)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400">
                <option value="hoje">Hoje</option>
                <option value="semana">Última Semana</option>
                <option value="mes">Este Mês</option>
              </select>
              {relatorio && <span className="text-xs text-gray-400">Período: {relatorio.periodo}</span>}
            </div>
            {!relatorio ? (
              <p className="text-center text-gray-400 py-10">Carregando...</p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "Ligações", value: fmt(relatorio.total_ligacoes), sub: `${relatorio.taxa_aproveitamento}% aproveitamento`, icon: <Phone size={16} className="text-blue-500" /> },
                    { label: "Aproveitados", value: fmt(relatorio.total_aproveitados), sub: `de ${fmt(relatorio.total_ligacoes)} tentativas`, icon: <Award size={16} className="text-green-500" /> },
                    { label: "Visitas", value: `${relatorio.total_visitas_realizadas}/${relatorio.total_visitas_marcadas}`, sub: "realizadas/marcadas", icon: <MapPin size={16} className="text-amber-500" /> },
                    { label: "VGV", value: fmtR(relatorio.vgv_assinado), sub: `Gerado: ${fmtR(relatorio.vgv_gerado)}`, icon: <Target size={16} className="text-purple-500" /> },
                  ].map(card => (
                    <div key={card.label} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">{card.icon}<span className="text-xs text-gray-500">{card.label}</span></div>
                      <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Desempenho por Corretor</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-400">
                        <th className="text-left py-2 font-medium">Corretor</th>
                        <th className="text-center py-2 font-medium">Ligações</th>
                        <th className="text-center py-2 font-medium">Aproveitados</th>
                        <th className="text-center py-2 font-medium">Taxa %</th>
                        <th className="text-center py-2 font-medium">Visitas</th>
                        <th className="text-center py-2 font-medium">Propostas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorio.por_corretor.map((c, i) => (
                        <tr key={c.nome} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2.5 font-medium text-gray-700"><span className="text-gray-400 text-xs mr-2">#{i + 1}</span>{c.nome}</td>
                          <td className="text-center py-2.5 font-semibold text-blue-600">{c.ligacoes}</td>
                          <td className="text-center py-2.5 font-semibold text-green-600">{c.aproveitados}</td>
                          <td className="text-center py-2.5"><span className={`text-xs font-bold ${pct(c.aproveitados, c.ligacoes) >= 10 ? "text-green-500" : "text-amber-500"}`}>{pct(c.aproveitados, c.ligacoes)}%</span></td>
                          <td className="text-center py-2.5 text-amber-600">{c.visitas}</td>
                          <td className="text-center py-2.5 text-purple-600">{c.propostas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ TAB: COACH IA ═══ */}
        {activeTab === "coach" && (
          <div className="bg-white border border-gray-200 rounded-b-xl rounded-tr-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><Sparkles size={18} className="text-blue-600" /></div>
                <div>
                  <h2 className="font-semibold text-gray-800">HOMI — Coach de Performance</h2>
                  <p className="text-xs text-gray-400">IA que analisa o desempenho do time e sugere ações práticas</p>
                </div>
              </div>
              <button onClick={runCoach} disabled={coachLoading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-70">
                <RefreshCw size={14} className={coachLoading ? "animate-spin" : ""} />
                {coachLoading ? "Analisando..." : "Analisar Semana"}
              </button>
            </div>
            {!coachAnalysis && !coachLoading && (
              <div className="text-center py-16 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><Sparkles size={24} className="text-gray-300" /></div>
                <p className="font-medium">Clique em "Analisar Semana"</p>
                <p className="text-xs mt-1">O HOMI irá analisar metas vs resultados, identificar gargalos e sugerir ações.</p>
              </div>
            )}
            {coachLoading && (
              <div className="text-center py-16 text-gray-400">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse"><Sparkles size={24} className="text-blue-400" /></div>
                <p className="text-sm">Analisando dados do time...</p>
              </div>
            )}
            {coachAnalysis && !coachLoading && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3"><Sparkles size={14} className="text-blue-500" /><span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Análise do HOMI</span></div>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{coachAnalysis}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
