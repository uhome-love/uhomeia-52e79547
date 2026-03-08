import { useState, useMemo } from "react";
import { useAcademia, getStudyLevel, type Trilha } from "@/hooks/useAcademia";
import { useNavigate } from "react-router-dom";
import { Loader2, Award, BookOpen, ChevronRight, Play, CheckCircle2, Clock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";

const CATEGORY_SECTIONS = [
  { key: "destaque", label: "🔥 Em Destaque", filter: () => true },
  { key: "venda", label: "💼 Técnicas de Venda", filter: (t: Trilha) => t.categoria === "vendas" },
  { key: "produto", label: "🏠 Conhecimento de Produto", filter: (t: Trilha) => t.categoria === "produto" },
  { key: "mindset", label: "🧠 Mindset e Performance", filter: (t: Trilha) => t.categoria === "mindset" },
];

const NIVEL_COLORS: Record<string, string> = {
  iniciante: "bg-emerald-500/20 text-emerald-400",
  intermediario: "bg-amber-500/20 text-amber-400",
  avancado: "bg-red-500/20 text-red-400",
};

function TrilhaCard({ trilha, progress, onClick }: {
  trilha: Trilha;
  progress: { total: number; completed: number; percent: number; started: boolean };
  onClick: () => void;
}) {
  const isNew = trilha.created_at && differenceInDays(new Date(), new Date(trilha.created_at)) < 7;

  return (
    <button
      onClick={onClick}
      className="group relative shrink-0 w-[260px] sm:w-[300px] rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20 focus:outline-none text-left"
      style={{ aspectRatio: "16/9" }}
    >
      {/* Thumbnail */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
        {trilha.thumbnail_url && (
          <img src={trilha.thumbnail_url} alt={trilha.titulo} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end p-4">
        {/* Badges */}
        <div className="flex items-center gap-1.5 mb-2">
          {isNew && <Badge className="bg-blue-500 text-white text-[9px] px-1.5 py-0 h-4 border-0">NOVO</Badge>}
          {progress.percent === 100 && <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0 h-4 border-0">✅ Concluída</Badge>}
          {trilha.nivel && (
            <Badge className={`text-[9px] px-1.5 py-0 h-4 border-0 ${NIVEL_COLORS[trilha.nivel] || "bg-slate-500/20 text-slate-400"}`}>
              {trilha.nivel}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="text-white font-bold text-sm leading-tight mb-1 line-clamp-2">{trilha.titulo}</h3>

        {/* Meta */}
        <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2">
          {trilha.xp_total && <span className="flex items-center gap-0.5"><Star className="h-2.5 w-2.5" />{trilha.xp_total} XP</span>}
          <span>{progress.total} aulas</span>
        </div>

        {/* Progress bar */}
        {progress.started && progress.percent < 100 && (
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
        )}
      </div>

      {/* Hover play icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="h-12 w-12 rounded-full bg-primary/90 flex items-center justify-center shadow-xl">
          <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
        </div>
      </div>
    </button>
  );
}

export default function AcademiaPage() {
  const navigate = useNavigate();
  const { trilhas, totalXp, studyLevel, getTrilhaProgress, inProgressTrilhas, certificados, loading } = useAcademia();

  // Continue watching - first in-progress trilha
  const continueTrilha = inProgressTrilhas[0];
  const continueProgress = continueTrilha ? getTrilhaProgress(continueTrilha.id) : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ background: "#0A0F1E", minHeight: "100vh" }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-gray-400">Carregando Academia...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen -m-4 sm:-m-6" style={{ background: "#0A0F1E" }}>
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-8">

        {/* HERO — Continue watching */}
        {continueTrilha && continueProgress && (
          <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: 200 }}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-slate-900">
              {continueTrilha.thumbnail_url && (
                <img src={continueTrilha.thumbnail_url} alt="" className="w-full h-full object-cover opacity-30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            </div>
            <div className="relative z-10 p-6 sm:p-8 flex flex-col gap-3">
              <span className="text-xs text-gray-400 font-medium">▶ Continuar assistindo</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">{continueTrilha.titulo}</h2>
              {continueTrilha.descricao && (
                <p className="text-sm text-gray-300 max-w-lg line-clamp-2">{continueTrilha.descricao}</p>
              )}
              <div className="flex items-center gap-4 mt-1">
                <div className="flex-1 max-w-xs">
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${continueProgress.percent}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">{continueProgress.completed}/{continueProgress.total} aulas · {continueProgress.percent}%</span>
                </div>
                <Button
                  onClick={() => navigate(`/academia/trilha/${continueTrilha.id}`)}
                  className="gap-1.5"
                >
                  <Play className="h-4 w-4" /> Continuar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* XP Card */}
        <div className="rounded-xl p-5 sm:p-6" style={{ background: "linear-gradient(135deg, #1a1f35, #0f1525)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-2xl">
              {studyLevel.emoji}
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-bold text-lg">{totalXp} XP</span>
                <Badge className="bg-primary/20 text-primary border-0 text-xs">{studyLevel.label}</Badge>
              </div>
              {studyLevel.nextAt && (
                <div className="space-y-1">
                  <Progress value={studyLevel.progress} className="h-1.5 bg-white/10" />
                  <span className="text-[10px] text-gray-500">{Math.round(studyLevel.progress)}% para {getStudyLevel(studyLevel.nextAt).emoji} {getStudyLevel(studyLevel.nextAt).label}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-center px-3">
                <span className="text-white font-bold text-lg">{certificados.length}</span>
                <p className="text-[10px] text-gray-500">Certificados</p>
              </div>
            </div>
          </div>
        </div>

        {/* In Progress section */}
        {inProgressTrilhas.length > 0 && (
          <Section title="📚 Continuar Assistindo">
            {inProgressTrilhas.map(t => (
              <TrilhaCard
                key={t.id}
                trilha={t}
                progress={getTrilhaProgress(t.id)}
                onClick={() => navigate(`/academia/trilha/${t.id}`)}
              />
            ))}
          </Section>
        )}

        {/* All trilhas */}
        {trilhas.length > 0 && (
          <Section title="🔥 Todas as Trilhas">
            {trilhas.map(t => (
              <TrilhaCard
                key={t.id}
                trilha={t}
                progress={getTrilhaProgress(t.id)}
                onClick={() => navigate(`/academia/trilha/${t.id}`)}
              />
            ))}
          </Section>
        )}

        {/* By category */}
        {CATEGORY_SECTIONS.slice(1).map(section => {
          const filtered = trilhas.filter(section.filter);
          if (filtered.length === 0) return null;
          return (
            <Section key={section.key} title={section.label}>
              {filtered.map(t => (
                <TrilhaCard
                  key={t.id}
                  trilha={t}
                  progress={getTrilhaProgress(t.id)}
                  onClick={() => navigate(`/academia/trilha/${t.id}`)}
                />
              ))}
            </Section>
          );
        })}

        {/* Empty state */}
        {trilhas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">Nenhuma trilha disponível</h3>
            <p className="text-gray-400 text-sm max-w-md">
              Em breve, novas trilhas de treinamento estarão disponíveis aqui.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-white font-bold text-sm mb-3 px-1">{title}</h3>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
        {children}
      </div>
    </div>
  );
}
