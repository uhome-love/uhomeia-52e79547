import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAcademia } from "@/hooks/useAcademia";
import { Loader2, ArrowLeft, Play, CheckCircle2, FileText, Brain, ListChecks, Clock, Star, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const TIPO_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  video: { icon: <Play className="h-3.5 w-3.5" />, label: "🎬 Vídeo" },
  pdf: { icon: <FileText className="h-3.5 w-3.5" />, label: "📄 PDF" },
  quiz: { icon: <Brain className="h-3.5 w-3.5" />, label: "🧠 Quiz" },
  checklist: { icon: <ListChecks className="h-3.5 w-3.5" />, label: "✅ Checklist" },
};

export default function AcademiaTrilhaPage() {
  const { trilhaId } = useParams<{ trilhaId: string }>();
  const navigate = useNavigate();
  const { trilhas, aulas, getTrilhaProgress, getAulaStatus, certificados, loading } = useAcademia();

  const trilha = trilhas.find(t => t.id === trilhaId);
  const trilhaAulas = useMemo(() =>
    aulas.filter(a => a.trilha_id === trilhaId).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)),
    [aulas, trilhaId]
  );
  const progress = trilhaId ? getTrilhaProgress(trilhaId) : null;
  const hasCertificate = certificados.some(c => c.trilha_id === trilhaId);

  // Find first incomplete aula
  const nextAula = trilhaAulas.find(a => getAulaStatus(a.id) !== "concluida");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" style={{ background: "#0A0F1E", minHeight: "100vh" }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trilha) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ background: "#0A0F1E", minHeight: "100vh" }}>
        <p className="text-gray-400">Trilha não encontrada</p>
        <Button variant="outline" onClick={() => navigate("/academia")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen -m-4 sm:-m-6" style={{ background: "#0A0F1E" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-slate-900">
          {trilha.thumbnail_url && (
            <img src={trilha.thumbnail_url} alt="" className="w-full h-full object-cover opacity-25" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1E] via-black/50 to-transparent" />
        </div>
        <div className="relative z-10 max-w-[900px] mx-auto px-4 pt-6 pb-8">
          <button onClick={() => navigate("/academia")} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Academia
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{trilha.titulo}</h1>
          {trilha.descricao && <p className="text-sm text-gray-300 mb-4 max-w-2xl">{trilha.descricao}</p>}
          <div className="flex items-center gap-3 flex-wrap">
            {trilha.nivel && (
              <Badge className="bg-white/10 text-gray-300 border-0">{trilha.nivel}</Badge>
            )}
            <span className="text-xs text-gray-400 flex items-center gap-1"><Star className="h-3 w-3" />{trilha.xp_total || 0} XP</span>
            <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="h-3 w-3" />{trilhaAulas.length} aulas</span>
            {hasCertificate && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 gap-1"><Award className="h-3 w-3" /> Certificado emitido</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Progress + CTA */}
      <div className="max-w-[900px] mx-auto px-4 pb-8">
        {progress && (
          <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300 font-medium">Progresso</span>
              <span className="text-sm text-white font-bold">{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} className="h-2 bg-white/10" />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-500">{progress.completed}/{progress.total} aulas concluídas</span>
              {progress.percent < 100 && nextAula && (
                <Button size="sm" onClick={() => navigate(`/academia/aula/${nextAula.id}`)} className="gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  {progress.started ? "Continuar" : "Iniciar"}
                </Button>
              )}
              {progress.percent === 100 && !hasCertificate && (
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <Award className="h-3.5 w-3.5" /> Emitir Certificado
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Aulas list */}
        <div className="space-y-2">
          {trilhaAulas.map((aula, idx) => {
            const status = getAulaStatus(aula.id);
            const tipo = TIPO_ICONS[aula.tipo] || TIPO_ICONS.video;

            return (
              <button
                key={aula.id}
                onClick={() => navigate(`/academia/aula/${aula.id}`)}
                className="w-full flex items-center gap-4 rounded-xl p-4 text-left transition-all duration-200 hover:bg-white/5 group"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
              >
                {/* Number / Status */}
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                  status === "concluida"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : status === "em_andamento"
                    ? "bg-primary/20 text-primary animate-pulse"
                    : "bg-white/5 text-gray-500"
                }`}>
                  {status === "concluida" ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-gray-500">{tipo.label}</span>
                    {aula.xp_recompensa && <span className="text-[10px] text-gray-600">+{aula.xp_recompensa} XP</span>}
                  </div>
                  <h4 className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">{aula.titulo}</h4>
                  {aula.descricao && <p className="text-xs text-gray-500 truncate mt-0.5">{aula.descricao}</p>}
                </div>

                {/* Duration */}
                {aula.duracao_minutos && (
                  <span className="text-xs text-gray-500 shrink-0 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {aula.duracao_minutos}min
                  </span>
                )}

                <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-primary transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChevronRight(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6"/></svg>
  );
}
