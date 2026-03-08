import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Trilha {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  nivel: string | null;
  ordem: number | null;
  publicada: boolean | null;
  thumbnail_url: string | null;
  xp_total: number | null;
  criado_por: string | null;
  created_at: string | null;
}

export interface Aula {
  id: string;
  trilha_id: string | null;
  titulo: string;
  descricao: string | null;
  tipo: string; // video, pdf, quiz, checklist
  ordem: number | null;
  duracao_minutos: number | null;
  xp_recompensa: number | null;
  conteudo_url: string | null;
  youtube_id: string | null;
  obrigatoria: boolean | null;
  created_at: string | null;
}

export interface Progresso {
  id: string;
  corretor_id: string | null;
  trilha_id: string | null;
  aula_id: string | null;
  status: string | null;
  quiz_score: number | null;
  xp_ganho: number | null;
  checklist_items: any;
  concluida_at: string | null;
  created_at: string | null;
}

export interface QuizQuestion {
  id: string;
  aula_id: string | null;
  pergunta: string;
  opcoes: any; // { options: [{text, correct}] }
  explicacao: string | null;
  ordem: number | null;
}

export interface ChecklistItem {
  id: string;
  aula_id: string | null;
  item: string;
  ordem: number | null;
}

export interface Certificado {
  id: string;
  trilha_id: string | null;
  corretor_id: string | null;
  codigo: string | null;
  emitido_at: string | null;
}

// XP Level system
export function getStudyLevel(totalXp: number) {
  if (totalXp >= 600) return { label: "Mestre", emoji: "🏆", level: 4, nextAt: null, progress: 100 };
  if (totalXp >= 300) return { label: "Especialista", emoji: "🎓", level: 3, nextAt: 600, progress: ((totalXp - 300) / 300) * 100 };
  if (totalXp >= 100) return { label: "Praticante", emoji: "📚", level: 2, nextAt: 300, progress: ((totalXp - 100) / 200) * 100 };
  return { label: "Aprendiz", emoji: "📖", level: 1, nextAt: 100, progress: (totalXp / 100) * 100 };
}

export function useAcademia() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Load trilhas
  const { data: trilhas = [], isLoading: trilhasLoading } = useQuery({
    queryKey: ["academia-trilhas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academia_trilhas")
        .select("*")
        .eq("publicada", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data || []) as Trilha[];
    },
    enabled: !!user,
    staleTime: 60000,
  });

  // Load all aulas
  const { data: aulas = [], isLoading: aulasLoading } = useQuery({
    queryKey: ["academia-aulas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academia_aulas")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data || []) as Aula[];
    },
    enabled: !!user,
    staleTime: 60000,
  });

  // Load user progress
  const { data: progresso = [], isLoading: progressoLoading } = useQuery({
    queryKey: ["academia-progresso", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("academia_progresso")
        .select("*")
        .eq("corretor_id", user.id);
      if (error) throw error;
      return (data || []) as Progresso[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Load certificates
  const { data: certificados = [] } = useQuery({
    queryKey: ["academia-certificados", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("academia_certificados")
        .select("*")
        .eq("corretor_id", user.id);
      if (error) throw error;
      return (data || []) as Certificado[];
    },
    enabled: !!user,
    staleTime: 60000,
  });

  // Computed: total XP
  const totalXp = useMemo(() => {
    return progresso.reduce((sum, p) => sum + (p.xp_ganho || 0), 0);
  }, [progresso]);

  const studyLevel = useMemo(() => getStudyLevel(totalXp), [totalXp]);

  // Computed: trilha progress
  const getTrilhaProgress = useCallback((trilhaId: string) => {
    const trilhaAulas = aulas.filter(a => a.trilha_id === trilhaId);
    if (trilhaAulas.length === 0) return { total: 0, completed: 0, percent: 0, started: false };
    const completed = trilhaAulas.filter(a =>
      progresso.some(p => p.aula_id === a.id && p.status === "concluida")
    ).length;
    return {
      total: trilhaAulas.length,
      completed,
      percent: Math.round((completed / trilhaAulas.length) * 100),
      started: completed > 0,
    };
  }, [aulas, progresso]);

  // Computed: aula status
  const getAulaStatus = useCallback((aulaId: string): "nao_iniciada" | "em_andamento" | "concluida" => {
    const p = progresso.find(pr => pr.aula_id === aulaId);
    if (!p) return "nao_iniciada";
    if (p.status === "concluida") return "concluida";
    return "em_andamento";
  }, [progresso]);

  // Complete an aula
  const completeAula = useCallback(async (aulaId: string, trilhaId: string, quizScore?: number) => {
    if (!user) return;

    const aula = aulas.find(a => a.id === aulaId);
    const xp = aula?.xp_recompensa || 10;

    // Upsert progresso
    const existing = progresso.find(p => p.aula_id === aulaId);
    if (existing) {
      await supabase
        .from("academia_progresso")
        .update({
          status: "concluida",
          xp_ganho: xp,
          quiz_score: quizScore ?? existing.quiz_score,
          concluida_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("academia_progresso").insert({
        corretor_id: user.id,
        trilha_id: trilhaId,
        aula_id: aulaId,
        status: "concluida",
        xp_ganho: xp,
        quiz_score: quizScore ?? null,
        concluida_at: new Date().toISOString(),
      });
    }

    toast(`🎯 +${xp} XP! Aula concluída!`, { duration: 3000 });

    // Check if trilha is 100% complete
    const trilhaAulas = aulas.filter(a => a.trilha_id === trilhaId);
    const completedCount = trilhaAulas.filter(a =>
      a.id === aulaId || progresso.some(p => p.aula_id === a.id && p.status === "concluida")
    ).length;

    if (completedCount >= trilhaAulas.length) {
      const trilha = trilhas.find(t => t.id === trilhaId);
      // Auto-emit certificate
      const codigo = `UHOME-${Date.now().toString(36).toUpperCase()}`;
      await supabase.from("academia_certificados").insert({
        trilha_id: trilhaId,
        corretor_id: user.id,
        codigo,
      });

      toast(`🏆 TRILHA CONCLUÍDA! ${trilha?.titulo || ""}`, {
        description: `+${trilha?.xp_total || 0} XP · Certificado emitido!`,
        duration: 6000,
      });
    }

    queryClient.invalidateQueries({ queryKey: ["academia-progresso"] });
    queryClient.invalidateQueries({ queryKey: ["academia-certificados"] });
  }, [user, aulas, progresso, trilhas, queryClient]);

  // Start an aula (mark as in progress)
  const startAula = useCallback(async (aulaId: string, trilhaId: string) => {
    if (!user) return;
    const existing = progresso.find(p => p.aula_id === aulaId);
    if (existing) return;

    await supabase.from("academia_progresso").insert({
      corretor_id: user.id,
      trilha_id: trilhaId,
      aula_id: aulaId,
      status: "em_andamento",
      xp_ganho: 0,
    });

    queryClient.invalidateQueries({ queryKey: ["academia-progresso"] });
  }, [user, progresso, queryClient]);

  // Trilhas grouped by category
  const trilhasByCategory = useMemo(() => {
    const cats = new Map<string, Trilha[]>();
    for (const t of trilhas) {
      const cat = t.categoria || "Geral";
      if (!cats.has(cat)) cats.set(cat, []);
      cats.get(cat)!.push(t);
    }
    return cats;
  }, [trilhas]);

  // In-progress trilhas
  const inProgressTrilhas = useMemo(() => {
    return trilhas.filter(t => {
      const progress = getTrilhaProgress(t.id);
      return progress.started && progress.percent < 100;
    });
  }, [trilhas, getTrilhaProgress]);

  return {
    trilhas,
    aulas,
    progresso,
    certificados,
    totalXp,
    studyLevel,
    getTrilhaProgress,
    getAulaStatus,
    completeAula,
    startAula,
    trilhasByCategory,
    inProgressTrilhas,
    loading: trilhasLoading || aulasLoading || progressoLoading,
  };
}
