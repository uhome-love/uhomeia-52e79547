import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, RefreshCw } from "lucide-react";
import { type CheckpointRow, type MetasMes, fmtR, fmt } from "@/pages/CheckpointGerente";
import { format, subDays } from "date-fns";
import ReactMarkdown from "react-markdown";

interface Props {
  rows: CheckpointRow[];
  metasMes: MetasMes;
  dateFmt: string;
  teamUserIds: string[];
  teamNameMap: Record<string, string>;
}

export default function CoachIATab({ rows, metasMes, dateFmt, teamUserIds, teamNameMap }: Props) {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);

  const buildContext = useCallback(async () => {
    if (!user || teamUserIds.length === 0) return "";

    // Fetch last 7 days of checkpoint data
    const hoje = new Date();
    const inicioStr = format(subDays(hoje, 7), "yyyy-MM-dd");
    const fimStr = format(hoje, "yyyy-MM-dd");

    const [{ data: checkpoints }, { data: tentativas }] = await Promise.all([
      supabase.from("checkpoint_diario").select("*").in("corretor_id", teamUserIds).gte("data", inicioStr).lte("data", fimStr).order("data"),
      supabase.from("oferta_ativa_tentativas").select("corretor_id, resultado, created_at").in("corretor_id", teamUserIds).gte("created_at", `${inicioStr}T00:00:00`),
    ]);

    // Build per-corretor summary for the week
    const corretorSummary = teamUserIds.map(uid => {
      const nome = teamNameMap[uid] || "Corretor";
      const cps = (checkpoints || []).filter((c: any) => c.corretor_id === uid);
      const tents = (tentativas || []).filter((t: any) => t.corretor_id === uid);
      const totalLig = tents.length;
      const totalAprov = tents.filter((t: any) => t.resultado === "com_interesse").length;
      const diasPresente = cps.filter((c: any) => c.presenca === "presente").length;
      const totalVgv = cps.reduce((s: number, c: any) => s + (Number(c.res_vgv) || 0), 0);
      return `- ${nome}: ${totalLig} ligações, ${totalAprov} aproveitados (${totalLig > 0 ? Math.round((totalAprov / totalLig) * 100) : 0}%), ${diasPresente} dias presente, VGV: R$${totalVgv}`;
    }).join("\n");

    return `Análise semanal do time (${format(subDays(hoje, 7), "dd/MM")} a ${format(hoje, "dd/MM/yyyy")}).

DADOS POR CORRETOR (últimos 7 dias):
${corretorSummary}

DADOS DE HOJE (${dateFmt}):
${rows.map(r => `- ${r.nome}: presença=${r.presenca}, ${r.res_ligacoes}/${r.meta_ligacoes} lig, ${r.res_aproveitados}/${r.meta_aproveitados} aprov, ${r.res_visitas_marcadas} visitas, VGV=${r.res_vgv}, status: ${r.status}`).join("\n")}

METAS DO MÊS:
- Ligações: ${fmt(metasMes.ligacoes_realizado)}/${fmt(metasMes.ligacoes_meta)} (${Math.round((metasMes.ligacoes_realizado / metasMes.ligacoes_meta) * 100)}%)
- VGV: ${fmtR(metasMes.vgv_realizado)}/${fmtR(metasMes.vgv_meta)} (${Math.round((metasMes.vgv_realizado / metasMes.vgv_meta) * 100)}%)
- Visitas Marcadas: ${metasMes.visitas_marcadas_realizado}/${metasMes.visitas_marcadas_meta}
- Visitas Realizadas: ${metasMes.visitas_realizadas_realizado}/${metasMes.visitas_realizadas_meta}

Responda EXATAMENTE neste formato markdown:

## 🏆 Destaque da Semana
[Nome do corretor destaque + motivo específico com números]

## ⚠️ Atenção
[Nome do corretor que precisa de atenção + problema específico]

## 🎯 Foco para Amanhã
[Uma recomendação prática e específica baseada nos dados]

## 💡 Dica para o Gerente
[Sugestão personalizada de gestão baseada nos padrões observados]

Seja direto, use dados reais, sem enrolação.`;
  }, [user, teamUserIds, teamNameMap, rows, metasMes, dateFmt]);

  const run = useCallback(async () => {
    setLoading(true);
    setAnalysis("");
    try {
      const context = await buildContext();
      if (!context) { setAnalysis("Sem dados para analisar."); setLoading(false); return; }

      const { data: { session } } = await (supabase.auth as any).getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/checkpoint-coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ message: context, context: "checkpoint_coach" }),
      });

      if (!res.ok) {
        // Fallback to homi-chat if checkpoint-coach doesn't exist
        const res2 = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/homi-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
          body: JSON.stringify({ message: context, context: "checkpoint_gerente" }),
        });
        const json2 = await res2.json();
        setAnalysis(json2.response ?? json2.message ?? "Sem resposta.");
      } else {
        const json = await res.json();
        setAnalysis(json.response ?? json.message ?? "Sem resposta.");
      }
    } catch {
      setAnalysis("Erro ao conectar com o HOMI. Tente novamente.");
    }
    setLoading(false);
  }, [buildContext]);

  // Auto-load on first mount
  useEffect(() => {
    if (!autoLoaded && rows.length > 0 && teamUserIds.length > 0) {
      setAutoLoaded(true);
      run();
    }
  }, [autoLoaded, rows.length, teamUserIds.length, run]);

  return (
    <div className="bg-white border border-gray-200 rounded-b-xl rounded-tr-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Sparkles size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">HOMI — Coach de Performance</h2>
            <p className="text-xs text-gray-400">IA que analisa o desempenho do time e sugere ações práticas</p>
          </div>
        </div>
        <button onClick={run} disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-70">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Analisando..." : "🔄 Atualizar análise"}
        </button>
      </div>

      {!analysis && !loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Sparkles size={24} className="text-gray-300" />
          </div>
          <p className="font-medium">Preparando análise...</p>
          <p className="text-xs mt-1">O HOMI irá analisar metas vs resultados dos últimos 7 dias.</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Sparkles size={24} className="text-blue-400" />
          </div>
          <p className="text-sm">🤖 HOMI está analisando os dados do time...</p>
          <p className="text-xs text-gray-300 mt-1">Buscando checkpoints dos últimos 7 dias e cruzando com metas</p>
        </div>
      )}

      {analysis && !loading && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-blue-500" />
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Análise do HOMI</span>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
