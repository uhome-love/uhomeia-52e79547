import { useMemo, useState } from "react";
import { format, startOfDay, startOfWeek, startOfMonth, endOfWeek, endOfMonth, isWithinInterval, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, CheckCircle2, XCircle, RotateCcw, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { type Visita } from "@/hooks/useVisitas";

type Periodo = "hoje" | "semana" | "mes" | "custom";

interface Props {
  visitas: Visita[];
  showCorretor?: boolean;
}

export default function VisitasPerformance({ visitas, showCorretor }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const today = startOfDay(new Date());

  const filteredVisitas = useMemo(() => {
    if (periodo === "custom") {
      if (!customFrom) return visitas;
      const from = format(customFrom, "yyyy-MM-dd");
      const to = customTo ? format(customTo, "yyyy-MM-dd") : "9999-12-31";
      return visitas.filter(v => v.data_visita >= from && v.data_visita <= to);
    }

    const start = periodo === "hoje"
      ? today
      : periodo === "semana"
        ? startOfWeek(today, { weekStartsOn: 1 })
        : startOfMonth(today);
    const end = periodo === "hoje"
      ? today
      : periodo === "semana"
        ? endOfWeek(today, { weekStartsOn: 1 })
        : endOfMonth(today);

    return visitas.filter(v => {
      const d = new Date(v.data_visita + "T12:00:00");
      return isWithinInterval(d, { start, end });
    });
  }, [visitas, periodo, today, customFrom, customTo]);

  const stats = useMemo(() => {
    const marcadas = filteredVisitas.length;
    const realizadas = filteredVisitas.filter(v => v.status === "realizada").length;
    const noShow = filteredVisitas.filter(v => v.status === "no_show").length;
    const reagendadas = filteredVisitas.filter(v => v.status === "reagendada").length;
    const canceladas = filteredVisitas.filter(v => v.status === "cancelada").length;
    const pendentes = filteredVisitas.filter(v => v.status === "marcada" || v.status === "confirmada").length;
    const taxaRealizacao = marcadas > 0 ? Math.round((realizadas / marcadas) * 100) : 0;
    return { marcadas, realizadas, noShow, reagendadas, canceladas, pendentes, taxaRealizacao };
  }, [filteredVisitas]);

  // Per-corretor breakdown
  const corretorStats = useMemo(() => {
    if (!showCorretor) return [];
    const map = new Map<string, { nome: string; marcadas: number; realizadas: number; noShow: number }>();
    for (const v of filteredVisitas) {
      const id = v.corretor_id || "sem-corretor";
      if (!map.has(id)) map.set(id, { nome: v.corretor_nome || "Sem corretor", marcadas: 0, realizadas: 0, noShow: 0 });
      const s = map.get(id)!;
      s.marcadas++;
      if (v.status === "realizada") s.realizadas++;
      if (v.status === "no_show") s.noShow++;
    }
    return Array.from(map.values()).sort((a, b) => b.realizadas - a.realizadas);
  }, [filteredVisitas, showCorretor]);

  const kpis = [
    { label: "Marcadas", value: stats.marcadas, emoji: "📅", color: "text-primary" },
    { label: "Realizadas", value: stats.realizadas, emoji: "✅", color: "text-emerald-600" },
    { label: "No Show", value: stats.noShow, emoji: "❌", color: "text-destructive" },
    { label: "Reagendadas", value: stats.reagendadas, emoji: "🔄", color: "text-purple-600" },
    { label: "Canceladas", value: stats.canceladas, emoji: "⚫", color: "text-muted-foreground" },
    { label: "Pendentes", value: stats.pendentes, emoji: "⏳", color: "text-amber-600" },
  ];

  return (
    <div className="space-y-4">
      {/* Period buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["hoje", "semana", "mes"] as Periodo[]).map(p => (
          <Button
            key={p}
            variant={periodo === p ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setPeriodo(p)}
          >
            {p === "hoje" ? "Hoje" : p === "semana" ? "Semana" : "Mês"}
          </Button>
        ))}
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={periodo === "custom" ? "default" : "outline"}
                size="sm"
                className={cn("text-xs gap-1", periodo === "custom" && customFrom && "border-primary")}
                onClick={() => setPeriodo("custom")}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {periodo === "custom" && customFrom ? format(customFrom, "dd/MM") : "De"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customFrom} onSelect={(d) => { setCustomFrom(d); setPeriodo("custom"); }} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={periodo === "custom" ? "default" : "outline"}
                size="sm"
                className={cn("text-xs gap-1", periodo === "custom" && customTo && "border-primary")}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {periodo === "custom" && customTo ? format(customTo, "dd/MM") : "Até"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customTo} onSelect={(d) => { setCustomTo(d); setPeriodo("custom"); }} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-medium">{kpi.emoji} {kpi.label}</p>
              <p className={cn("text-2xl font-black", kpi.color)}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Taxa de Realização */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Taxa de Realização</span>
            </div>
            <span className={cn(
              "text-xl font-black tabular-nums",
              stats.taxaRealizacao >= 70 ? "text-emerald-600" : stats.taxaRealizacao >= 40 ? "text-amber-600" : "text-destructive"
            )}>
              {stats.taxaRealizacao}%
            </span>
          </div>
          <Progress value={stats.taxaRealizacao} className="h-2.5" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {stats.realizadas} realizadas de {stats.marcadas} marcadas
          </p>
        </CardContent>
      </Card>

      {/* Per-Corretor Table */}
      {showCorretor && corretorStats.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">Performance por Corretor</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2 px-4 text-left">Corretor</th>
                    <th className="py-2 px-3 text-center">Marcadas</th>
                    <th className="py-2 px-3 text-center">Realizadas</th>
                    <th className="py-2 px-3 text-center">No Show</th>
                    <th className="py-2 px-3 text-center">Taxa</th>
                  </tr>
                </thead>
                <tbody>
                  {corretorStats.map((c, i) => {
                    const taxa = c.marcadas > 0 ? Math.round((c.realizadas / c.marcadas) * 100) : 0;
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-medium">{c.nome}</td>
                        <td className="py-2.5 px-3 text-center">{c.marcadas}</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">{c.realizadas}</td>
                        <td className="py-2.5 px-3 text-center text-destructive font-bold">{c.noShow}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-full",
                            taxa >= 70 ? "bg-emerald-100 text-emerald-700" : taxa >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                          )}>
                            {taxa}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
