import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Activity, Users, Phone, ThumbsUp, Clock, AlertTriangle, TrendingUp, Zap } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { useEffect, useState } from "react";

interface CorretorLive {
  corretor_id: string;
  nome: string;
  tentativas: number;
  aproveitados: number;
  ultima_tentativa: string | null;
  status: "discando" | "ativo" | "parado";
  minutos_parado: number;
  ligacoes: number;
  whatsapps: number;
}

interface ListaProgress {
  lista_id: string;
  nome: string;
  empreendimento: string;
  total: number;
  na_fila: number;
  aproveitados: number;
  descartados: number;
  em_cooldown: number;
  percent_complete: number;
}

export default function PerformanceLivePanel() {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const todayStart = new Date();
  todayStart.setHours(3, 0, 0, 0); // UTC-3 adjustment
  if (todayStart > now) todayStart.setDate(todayStart.getDate() - 1);

  // Fetch today's attempts with corretor info
  const { data: liveData, isLoading } = useQuery({
    queryKey: ["oa-performance-live", todayStart.toISOString(), now.getTime()],
    queryFn: async () => {
      // Get all today's attempts
      const { data: tentativas } = await supabase
        .from("oferta_ativa_tentativas")
        .select("corretor_id, canal, resultado, created_at")
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false });

      // Get active locks (who is currently dialing)
      const { data: activeLocks } = await supabase
        .from("oferta_ativa_leads")
        .select("em_atendimento_por, em_atendimento_ate")
        .not("em_atendimento_por", "is", null)
        .gt("em_atendimento_ate", now.toISOString());

      const activeCorretorIds = new Set((activeLocks || []).map(l => l.em_atendimento_por));

      // Group by corretor
      const byCorretor: Record<string, {
        corretor_id: string;
        tentativas: number;
        aproveitados: number;
        ultima_tentativa: string | null;
        ligacoes: number;
        whatsapps: number;
      }> = {};

      for (const t of tentativas || []) {
        if (!byCorretor[t.corretor_id]) {
          byCorretor[t.corretor_id] = {
            corretor_id: t.corretor_id,
            tentativas: 0,
            aproveitados: 0,
            ultima_tentativa: null,
            ligacoes: 0,
            whatsapps: 0,
          };
        }
        const c = byCorretor[t.corretor_id];
        c.tentativas++;
        if (t.resultado === "com_interesse") c.aproveitados++;
        if (t.canal === "ligacao") c.ligacoes++;
        if (t.canal === "whatsapp") c.whatsapps++;
        if (!c.ultima_tentativa || t.created_at > c.ultima_tentativa) {
          c.ultima_tentativa = t.created_at;
        }
      }

      // Get profiles
      const corretorIds = Object.keys(byCorretor);
      const profileMap: Record<string, string> = {};
      if (corretorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nome")
          .in("user_id", corretorIds);
        for (const p of profiles || []) profileMap[p.user_id] = p.nome;
      }

      // Also check for corretors that are locked but have no attempts
      for (const cid of activeCorretorIds) {
        if (cid && !byCorretor[cid]) {
          byCorretor[cid] = {
            corretor_id: cid,
            tentativas: 0,
            aproveitados: 0,
            ultima_tentativa: null,
            ligacoes: 0,
            whatsapps: 0,
          };
          // Fetch their profile too
          if (!profileMap[cid]) {
            const { data: p } = await supabase.from("profiles").select("nome").eq("user_id", cid).single();
            if (p) profileMap[cid] = p.nome;
          }
        }
      }

      const corretores: CorretorLive[] = Object.values(byCorretor).map(c => {
        const minutosParado = c.ultima_tentativa
          ? differenceInMinutes(now, new Date(c.ultima_tentativa))
          : 999;
        
        let status: CorretorLive["status"] = "parado";
        if (activeCorretorIds.has(c.corretor_id)) status = "discando";
        else if (minutosParado <= 15) status = "ativo";

        return {
          ...c,
          nome: profileMap[c.corretor_id] || "Corretor",
          status,
          minutos_parado: minutosParado,
        };
      });

      // Sort: discando first, then ativo, then parado
      const statusOrder = { discando: 0, ativo: 1, parado: 2 };
      corretores.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || b.tentativas - a.tentativas);

      // Get lista progress for active lists
      const { data: listas } = await supabase
        .from("oferta_ativa_listas")
        .select("id, nome, empreendimento, total_leads, status")
        .eq("status", "liberada");

      const listaProgress: ListaProgress[] = [];
      for (const lista of listas || []) {
        const { data: leads } = await supabase
          .from("oferta_ativa_leads")
          .select("status")
          .eq("lista_id", lista.id);
        
        const all = leads || [];
        const na_fila = all.filter(l => l.status === "na_fila").length;
        const aproveitados = all.filter(l => l.status === "aproveitado" || l.status === "concluido").length;
        const descartados = all.filter(l => l.status === "descartado").length;
        const em_cooldown = all.filter(l => l.status === "em_cooldown").length;
        const total = all.length;
        const worked = aproveitados + descartados;
        
        listaProgress.push({
          lista_id: lista.id,
          nome: lista.nome,
          empreendimento: lista.empreendimento,
          total,
          na_fila,
          aproveitados,
          descartados,
          em_cooldown,
          percent_complete: total > 0 ? Math.round((worked / total) * 100) : 0,
        });
      }

      // Totals
      const totalTentativas = tentativas?.length || 0;
      const totalAproveitados = (tentativas || []).filter(t => t.resultado === "com_interesse").length;
      const taxaConversao = totalTentativas > 0 ? Math.round((totalAproveitados / totalTentativas) * 100) : 0;
      const corretoresAtivos = corretores.filter(c => c.status !== "parado").length;
      const corretoresParados = corretores.filter(c => c.status === "parado" && c.minutos_parado > 20).length;

      return {
        corretores,
        listaProgress,
        totalTentativas,
        totalAproveitados,
        taxaConversao,
        corretoresAtivos,
        corretoresParados,
        totalCorretores: corretores.length,
      };
    },
    enabled: !!user,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!liveData || liveData.totalCorretores === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Sem atividade hoje</p>
          <p className="text-sm mt-1">Nenhum corretor começou a discar ainda.</p>
        </CardContent>
      </Card>
    );
  }

  const STATUS_INDICATOR: Record<string, { label: string; color: string; pulse: boolean }> = {
    discando: { label: "Discando", color: "bg-emerald-500", pulse: true },
    ativo: { label: "Ativo", color: "bg-blue-500", pulse: false },
    parado: { label: "Parado", color: "bg-red-500", pulse: false },
  };

  return (
    <div className="space-y-4">
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          Atualização a cada 30s · {format(now, "HH:mm:ss")}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Tentativas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{liveData.totalTentativas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <ThumbsUp className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Aproveitados</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{liveData.totalAproveitados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Taxa Conversão</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{liveData.taxaConversao}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Corretores</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {liveData.corretoresAtivos}
              <span className="text-sm font-normal text-muted-foreground">/{liveData.totalCorretores}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {liveData.corretoresParados > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              {liveData.corretoresParados} corretor(es) parado(s) há mais de 20 minutos
            </p>
          </CardContent>
        </Card>
      )}

      {/* Corretores Live */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Corretores — Visão Live
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 px-3 text-left">Status</th>
                <th className="py-2 px-3 text-left">Corretor</th>
                <th className="py-2 px-3 text-center">📞</th>
                <th className="py-2 px-3 text-center">✅</th>
                <th className="py-2 px-3 text-center">Taxa</th>
                <th className="py-2 px-3 text-center">Última</th>
              </tr>
            </thead>
            <tbody>
              {liveData.corretores.map(c => {
                const ind = STATUS_INDICATOR[c.status];
                const taxa = c.tentativas > 0 ? Math.round((c.aproveitados / c.tentativas) * 100) : 0;
                return (
                  <tr key={c.corretor_id} className={`border-b border-border ${c.status === "parado" && c.minutos_parado > 20 ? "bg-amber-500/5" : ""}`}>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          {ind.pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${ind.color} opacity-75`} />}
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${ind.color}`} />
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">{ind.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-medium">{c.nome}</td>
                    <td className="py-2.5 px-3 text-center font-semibold">{c.tentativas}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-emerald-600">{c.aproveitados}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className={`text-[10px] h-5 ${taxa >= 15 ? "text-emerald-600 border-emerald-500/30" : taxa >= 8 ? "text-blue-600 border-blue-500/30" : "text-muted-foreground"}`}>
                        {taxa}%
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">
                      {c.ultima_tentativa ? (
                        c.minutos_parado <= 1 ? "agora" :
                        c.minutos_parado < 60 ? `${c.minutos_parado}min` :
                        format(new Date(c.ultima_tentativa), "HH:mm")
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Lista Progress */}
      {liveData.listaProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Progresso das Listas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {liveData.listaProgress.map(lp => (
              <div key={lp.lista_id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{lp.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{lp.empreendimento}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {lp.percent_complete}%
                  </Badge>
                </div>
                <Progress value={lp.percent_complete} className="h-2" />
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span>📞 {lp.na_fila} na fila</span>
                  <span>⏳ {lp.em_cooldown} cooldown</span>
                  <span className="text-emerald-600">✅ {lp.aproveitados} aprov.</span>
                  <span>❌ {lp.descartados} desc.</span>
                  <span className="ml-auto font-medium">{lp.total} total</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
