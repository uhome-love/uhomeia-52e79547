import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DiaPerformance } from "@/hooks/useCorretorHomeData";

interface Props {
  evolucao: DiaPerformance[];
  loading: boolean;
}

export default function EvolucaoSemanal({ evolucao, loading }: Props) {
  if (loading || evolucao.length === 0) return null;

  const maxTentativas = Math.max(...evolucao.map(d => d.tentativas), 1);
  const totalSemana = evolucao.reduce((s, d) => s + d.tentativas, 0);
  const totalAprov = evolucao.reduce((s, d) => s + d.aproveitados, 0);
  const totalPontos = evolucao.reduce((s, d) => s + d.pontos, 0);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Últimos 7 dias</h3>
              <p className="text-[10px] text-muted-foreground">
                {totalSemana} tentativas · {totalAprov} aproveitados · {totalPontos} pts
              </p>
            </div>
          </div>
        </div>

        {/* Sparkline bars */}
        <div className="flex items-end gap-1.5 h-16">
          {evolucao.map((dia) => {
            const heightPct = Math.max(6, Math.round((dia.tentativas / maxTentativas) * 100));
            const isToday = dia.data === today;
            return (
              <div key={dia.data} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center justify-end" style={{ height: "48px" }}>
                  {dia.tentativas > 0 && (
                    <span className="text-[8px] font-bold text-foreground mb-0.5">{dia.tentativas}</span>
                  )}
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isToday ? "bg-primary" : "bg-primary/30"
                    }`}
                    style={{ height: `${heightPct}%`, minHeight: "3px" }}
                  />
                </div>
                <span className={`text-[8px] ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>
                  {format(parseISO(dia.data), "EEE", { locale: ptBR }).substring(0, 3)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40">
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{totalSemana}</p>
            <p className="text-[9px] text-muted-foreground">Tentativas</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-emerald-600">{totalAprov}</p>
            <p className="text-[9px] text-muted-foreground">Aproveitados</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-primary">{totalPontos}</p>
            <p className="text-[9px] text-muted-foreground">Pontos</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
