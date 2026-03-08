import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAcademia, type QuizQuestion, type ChecklistItem } from "@/hooks/useAcademia";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function AcademiaAulaPage() {
  const { aulaId } = useParams<{ aulaId: string }>();
  const navigate = useNavigate();
  const { aulas, trilhas, getAulaStatus, completeAula, startAula, loading } = useAcademia();

  const aula = aulas.find(a => a.id === aulaId);
  const trilha = aula ? trilhas.find(t => t.id === aula.trilha_id) : null;
  const trilhaAulas = useMemo(() =>
    aulas.filter(a => a.trilha_id === aula?.trilha_id).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)),
    [aulas, aula]
  );
  const currentIdx = trilhaAulas.findIndex(a => a.id === aulaId);
  const prevAula = currentIdx > 0 ? trilhaAulas[currentIdx - 1] : null;
  const nextAula = currentIdx < trilhaAulas.length - 1 ? trilhaAulas[currentIdx + 1] : null;
  const status = aulaId ? getAulaStatus(aulaId) : "nao_iniciada";

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Mark as started
  useEffect(() => {
    if (aula && aula.trilha_id && status === "nao_iniciada") {
      startAula(aula.id, aula.trilha_id);
    }
  }, [aula, status, startAula]);

  // Load quiz questions
  useEffect(() => {
    if (aula?.tipo === "quiz") {
      supabase.from("academia_quiz").select("*").eq("aula_id", aula.id).order("ordem").then(({ data }) => {
        setQuizQuestions((data || []) as QuizQuestion[]);
      });
    }
  }, [aula]);

  // Load checklist items
  useEffect(() => {
    if (aula?.tipo === "checklist") {
      supabase.from("academia_checklist").select("*").eq("aula_id", aula.id).order("ordem").then(({ data }) => {
        setChecklistItems((data || []) as ChecklistItem[]);
      });
    }
  }, [aula]);

  const handleComplete = async () => {
    if (!aula || !aula.trilha_id) return;
    await completeAula(aula.id, aula.trilha_id);
  };

  const handleQuizAnswer = (optionIdx: number) => {
    setAnswers(prev => ({ ...prev, [currentQ]: optionIdx }));
  };

  const handleQuizNext = () => {
    if (currentQ < quizQuestions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setShowResult(true);
      // Calculate score
      let correct = 0;
      quizQuestions.forEach((q, i) => {
        const opts = (q.opcoes as any)?.options || [];
        const selectedIdx = answers[i];
        if (selectedIdx !== undefined && opts[selectedIdx]?.correct) correct++;
      });
      const score = Math.round((correct / quizQuestions.length) * 100);
      if (score >= 70 && aula?.trilha_id) {
        completeAula(aula.id, aula.trilha_id, score);
      } else {
        toast.error(`Você acertou ${correct}/${quizQuestions.length}. Mínimo de 70% para concluir.`);
      }
    }
  };

  const handleChecklistToggle = (itemId: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const allChecked = checklistItems.length > 0 && checkedItems.size >= checklistItems.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" style={{ background: "#0A0F1E", minHeight: "100vh" }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!aula) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ background: "#0A0F1E", minHeight: "100vh" }}>
        <p className="text-gray-400">Aula não encontrada</p>
        <Button variant="outline" onClick={() => navigate("/academia")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen -m-4 sm:-m-6" style={{ background: "#0A0F1E" }}>
      <div className="max-w-[900px] mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <button onClick={() => navigate("/academia")} className="hover:text-white transition-colors">Academia</button>
          <span>›</span>
          {trilha && <button onClick={() => navigate(`/academia/trilha/${trilha.id}`)} className="hover:text-white transition-colors">{trilha.titulo}</button>}
          <span>›</span>
          <span className="text-gray-300">{aula.titulo}</span>
        </div>

        {/* Content based on type */}
        {aula.tipo === "video" && (
          <div>
            {aula.youtube_id ? (
              <div className="relative w-full rounded-xl overflow-hidden mb-4" style={{ aspectRatio: "16/9" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${aula.youtube_id}`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : aula.conteudo_url ? (
              <div className="relative w-full rounded-xl overflow-hidden mb-4" style={{ aspectRatio: "16/9" }}>
                <video src={aula.conteudo_url} controls className="w-full h-full" />
              </div>
            ) : (
              <div className="rounded-xl bg-white/5 p-8 text-center mb-4">
                <p className="text-gray-400">Vídeo não disponível</p>
              </div>
            )}
          </div>
        )}

        {aula.tipo === "pdf" && aula.conteudo_url && (
          <div className="rounded-xl overflow-hidden mb-4" style={{ height: "70vh" }}>
            <iframe src={aula.conteudo_url} className="w-full h-full bg-white" />
          </div>
        )}

        {aula.tipo === "quiz" && (
          <div className="rounded-xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {!showResult ? (
              quizQuestions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-500">Pergunta {currentQ + 1} de {quizQuestions.length}</span>
                    <Badge className="bg-primary/20 text-primary border-0">🧠 Quiz</Badge>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-6">{quizQuestions[currentQ].pergunta}</h3>
                  <div className="space-y-3">
                    {((quizQuestions[currentQ].opcoes as any)?.options || []).map((opt: any, i: number) => {
                      const selected = answers[currentQ] === i;
                      return (
                        <button
                          key={i}
                          onClick={() => handleQuizAnswer(i)}
                          className={`w-full text-left p-4 rounded-xl transition-all ${
                            selected
                              ? "bg-primary/20 border-primary text-white"
                              : "bg-white/5 border-transparent text-gray-300 hover:bg-white/10"
                          } border`}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button onClick={handleQuizNext} disabled={answers[currentQ] === undefined}>
                      {currentQ < quizQuestions.length - 1 ? "Próxima →" : "Finalizar Quiz"}
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                {(() => {
                  let correct = 0;
                  quizQuestions.forEach((q, i) => {
                    const opts = (q.opcoes as any)?.options || [];
                    if (answers[i] !== undefined && opts[answers[i]]?.correct) correct++;
                  });
                  const pct = Math.round((correct / quizQuestions.length) * 100);
                  return (
                    <>
                      <div className="text-4xl mb-2">{pct >= 70 ? "🎉" : "😔"}</div>
                      <h3 className="text-white font-bold text-xl mb-2">Você acertou {correct} de {quizQuestions.length}!</h3>
                      <p className="text-gray-400 mb-4">{pct}% — {pct >= 70 ? "Parabéns, quiz aprovado!" : "Mínimo 70% necessário. Tente novamente!"}</p>
                      {pct < 70 && (
                        <Button onClick={() => { setShowResult(false); setCurrentQ(0); setAnswers({}); }}>
                          Tentar novamente
                        </Button>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {aula.tipo === "checklist" && (
          <div className="rounded-xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="text-white font-bold text-lg mb-4">✅ Checklist</h3>
            <div className="space-y-3">
              {checklistItems.map(item => (
                <label key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <Checkbox
                    checked={checkedItems.has(item.id)}
                    onCheckedChange={() => handleChecklistToggle(item.id)}
                  />
                  <span className={`text-sm ${checkedItems.has(item.id) ? "text-gray-500 line-through" : "text-white"}`}>
                    {item.item}
                  </span>
                </label>
              ))}
            </div>
            {allChecked && status !== "concluida" && (
              <Button onClick={handleComplete} className="mt-4 w-full gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Concluir Checklist
              </Button>
            )}
          </div>
        )}

        {/* Title + description */}
        <div className="mt-6 mb-6">
          <h2 className="text-white font-bold text-xl mb-2">{aula.titulo}</h2>
          {aula.descricao && <p className="text-sm text-gray-400">{aula.descricao}</p>}
          {aula.xp_recompensa && (
            <Badge className="bg-amber-500/20 text-amber-400 border-0 mt-2">+{aula.xp_recompensa} XP</Badge>
          )}
        </div>

        {/* Complete button (for video/pdf) */}
        {(aula.tipo === "video" || aula.tipo === "pdf") && status !== "concluida" && (
          <Button onClick={handleComplete} className="w-full gap-1.5 mb-6" size="lg">
            <CheckCircle2 className="h-4 w-4" />
            {aula.tipo === "pdf" ? "✅ Li e entendi" : "✅ Marcar como concluída"}
          </Button>
        )}

        {status === "concluida" && (
          <div className="rounded-xl p-4 mb-6 bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-emerald-400 font-medium text-sm">✅ Aula concluída!</span>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          {prevAula ? (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/academia/aula/${prevAula.id}`)} className="text-gray-400 hover:text-white gap-1">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
          ) : <div />}
          {nextAula ? (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/academia/aula/${nextAula.id}`)} className="text-gray-400 hover:text-white gap-1">
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => trilha && navigate(`/academia/trilha/${trilha.id}`)} className="text-gray-400 hover:text-white">
              Voltar à Trilha
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
