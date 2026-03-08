import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePagadorias, useConteudosMarketing, useBackofficeTasks } from "@/hooks/useBackofficeData";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Palette, CheckCircle, Clock, AlertTriangle, Sparkles, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function BackofficeDashboard() {
  const { user } = useAuth();
  const { pagadorias } = usePagadorias();
  const { conteudos } = useConteudosMarketing();
  const { tasks, completedCount, titulo, pontosHoje } = useBackofficeTasks();
  const [nome, setNome] = useState("Ana");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("nome").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.nome) setNome(data.nome.split(" ")[0]);
    });
  }, [user]);

  const pendentesFinanceiro = pagadorias.filter((p: any) => p.status === "pendente" || p.status === "rascunho").length;
  const aguardandoAssinatura = pagadorias.filter((p: any) => p.status === "aguardando_assinatura").length;

  const today = new Date().toISOString().slice(0, 10);
  const conteudosHoje = conteudos.filter((c: any) => c.data_publicacao?.slice(0, 10) === today);
  const atrasados = conteudos.filter((c: any) => 
    c.data_publicacao && c.data_publicacao < new Date().toISOString() && 
    !["publicado", "agendado"].includes(c.status)
  );

  const totalTasks = tasks.length || 1;
  const progressPct = Math.round((completedCount / totalTasks) * 100);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {greeting}, {nome}! {titulo.emoji}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {titulo.label} · <strong>{pontosHoje}pts</strong> hoje
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Progresso do dia</p>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progressPct} className="w-32 h-2" />
            <span className="text-sm font-semibold text-foreground">{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-medium text-muted-foreground">Financeiro</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{pendentesFinanceiro}</p>
            <p className="text-xs text-muted-foreground">pagadorias pendentes</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Assinaturas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{aguardandoAssinatura}</p>
            <p className="text-xs text-muted-foreground">aguardando DocuSign</p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground">Marketing</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{conteudosHoje.length}</p>
            <p className="text-xs text-muted-foreground">posts para hoje</p>
          </CardContent>
        </Card>

        <Card className={`${atrasados.length > 0 ? "border-red-500/20 bg-red-500/5" : "border-green-500/20 bg-green-500/5"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {atrasados.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className="text-xs font-medium text-muted-foreground">Atrasados</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{atrasados.length}</p>
            <p className="text-xs text-muted-foreground">{atrasados.length === 0 ? "tudo em dia! 🎉" : "conteúdos atrasados"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Two columns */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* HOMI Alert */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" /> Alerta do HOMI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-sm text-foreground">
              {pendentesFinanceiro > 0 ? (
                <p>🤖 Tem <strong>{pendentesFinanceiro}</strong> pagadoria{pendentesFinanceiro > 1 ? "s" : ""} pendente{pendentesFinanceiro > 1 ? "s" : ""}. {atrasados.length > 0 ? `E ${atrasados.length} conteúdo${atrasados.length > 1 ? "s" : ""} atrasado${atrasados.length > 1 ? "s" : ""}!` : "Marketing em dia! 🎉"}</p>
              ) : (
                <p>🤖 Tudo em ordem hoje! Foca na produção de conteúdo e nas comissões. Bora! 💪</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tasks of the day */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Tarefas do dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma tarefa para hoje. Crie tarefas pelo HOMI! 🤖</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tasks.map((task: any) => (
                  <div key={task.id} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${task.status === "concluida" ? "bg-green-500/5 line-through text-muted-foreground" : "bg-muted/50"}`}>
                    {task.status === "concluida" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{task.titulo}</span>
                    <span className="text-[10px] text-muted-foreground">{task.pontos}pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
