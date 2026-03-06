import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trophy, Users, Phone, CheckCircle, Zap, TrendingUp, Building2 } from "lucide-react";
import { motion } from "framer-motion";

interface TeamData {
  equipe: string;
  gerente_id: string;
  tentativas: number;
  aproveitados: number;
  pontos: number;
  ligacoes: number;
  whatsapps: number;
  taxa: number;
  corretores_ativos: number;
  member_user_ids: string[];
}

interface RankingResult {
  teams: TeamData[];
  totals: {
    tentativas: number;
    aproveitados: number;
    pontos: number;
    corretores_ativos: number;
  };
}

const PERIOD_OPTIONS = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

export default function RankingEquipeOA() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("semana");

  const { data, isLoading } = useQuery({
    queryKey: ["team-oa-ranking", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_team_oa_ranking", {
        p_period: period,
      });
      if (error) throw error;
      return data as unknown as RankingResult;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const myTeamIndex = data?.teams?.findIndex(
    (t) => t.member_user_ids?.includes(user?.id || "")
  ) ?? -1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const teams = data?.teams || [];
  const totals = data?.totals || { tentativas: 0, aproveitados: 0, pontos: 0, corretores_ativos: 0 };

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" /> Ranking entre Equipes
        </h3>
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={period === opt.value ? "default" : "outline"}
              className="text-xs h-7 px-3"
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* UhomeSales Total Card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  Uhome<span className="text-primary">Sales</span> — Total Geral
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {totals.corretores_ativos} corretores ativos · {teams.length} equipes
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-background/60">
                <p className="text-2xl font-bold text-foreground">{totals.tentativas}</p>
                <p className="text-[10px] text-muted-foreground">tentativas</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/60">
                <p className="text-2xl font-bold text-emerald-600">{totals.aproveitados}</p>
                <p className="text-[10px] text-muted-foreground">aproveitados</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/60">
                <p className="text-2xl font-bold text-primary">{totals.pontos}</p>
                <p className="text-[10px] text-muted-foreground">pontos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Teams List */}
      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhuma equipe com atividade neste período</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {teams.map((team, idx) => {
            const isMyTeam = idx === myTeamIndex;
            const medal = MEDALS[idx] || `#${idx + 1}`;
            const pctOfTotal = totals.pontos > 0 ? Math.round((team.pontos / totals.pontos) * 100) : 0;

            return (
              <motion.div
                key={`${team.equipe}-${team.gerente_id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card
                  className={`transition-all ${
                    isMyTeam
                      ? "border-primary/40 bg-primary/5 shadow-md ring-1 ring-primary/20"
                      : "hover:border-muted-foreground/20"
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl leading-none">{medal}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-foreground text-sm">{team.equipe}</h4>
                            {isMyTeam && (
                              <Badge className="text-[9px] h-4 bg-primary/15 text-primary border-primary/30">
                                Sua equipe
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {team.corretores_ativos} corretor{team.corretores_ativos !== 1 ? "es" : ""} ativo{team.corretores_ativos !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{team.pontos}</p>
                        <p className="text-[10px] text-muted-foreground">pontos</p>
                      </div>
                    </div>

                    {/* Progress bar — share of total */}
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Contribuição para o total</span>
                        <span className="font-semibold">{pctOfTotal}%</span>
                      </div>
                      <Progress value={pctOfTotal} className="h-1.5" />
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-1.5 rounded-md bg-muted/50">
                        <div className="flex items-center justify-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <p className="text-sm font-bold text-foreground">{team.tentativas}</p>
                        </div>
                        <p className="text-[9px] text-muted-foreground">tentativas</p>
                      </div>
                      <div className="p-1.5 rounded-md bg-muted/50">
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle className="h-3 w-3 text-emerald-500" />
                          <p className="text-sm font-bold text-emerald-600">{team.aproveitados}</p>
                        </div>
                        <p className="text-[9px] text-muted-foreground">aproveitados</p>
                      </div>
                      <div className="p-1.5 rounded-md bg-muted/50">
                        <div className="flex items-center justify-center gap-1">
                          <TrendingUp className="h-3 w-3 text-primary" />
                          <p className="text-sm font-bold text-primary">{team.taxa}%</p>
                        </div>
                        <p className="text-[9px] text-muted-foreground">taxa</p>
                      </div>
                      <div className="p-1.5 rounded-md bg-muted/50">
                        <div className="flex items-center justify-center gap-1">
                          <Zap className="h-3 w-3 text-amber-500" />
                          <p className="text-sm font-bold text-foreground">{team.ligacoes + team.whatsapps}</p>
                        </div>
                        <p className="text-[9px] text-muted-foreground">contatos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
