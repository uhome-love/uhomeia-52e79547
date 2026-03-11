import { useMemo, useState } from "react";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronDown, ChevronRight, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type Visita, type VisitaStatus } from "@/hooks/useVisitas";
import VisitaRow, { VisitaRowHeader } from "./VisitaRow";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  visitas: Visita[];
  onUpdateStatus: (id: string, status: VisitaStatus) => void;
  onEdit?: (visita: Visita) => void;
  onDelete?: (id: string) => void;
  showCorretor?: boolean;
  showTeam?: boolean;
  mode?: "upcoming" | "past" | "all";
}

interface DateGroup {
  dateStr: string;
  label: string;
  dayOfWeek: string;
  isToday: boolean;
  isPast: boolean;
  visitas: Visita[];
  realizadas: number;
  total: number;
}

function buildGroups(visitas: Visita[]): DateGroup[] {
  const today = startOfDay(new Date());
  const map = new Map<string, Visita[]>();

  for (const v of visitas) {
    const key = v.data_visita;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }

  const result: DateGroup[] = [];
  for (const [dateStr, vs] of map) {
    const d = new Date(dateStr + "T12:00:00");
    const realizadas = vs.filter(v => v.status === "realizada").length;
    vs.sort((a, b) => (a.hora_visita || "99:99").localeCompare(b.hora_visita || "99:99"));

    result.push({
      dateStr,
      label: format(d, "dd 'de' MMMM", { locale: ptBR }),
      dayOfWeek: format(d, "EEEE", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()),
      isToday: isToday(d),
      isPast: isBefore(d, today) && !isToday(d),
      visitas: vs,
      realizadas,
      total: vs.length,
    });
  }

  return result;
}

function DateGroupCard({
  g,
  isOpen,
  onToggle,
  showCorretor,
  showTeam,
  onUpdateStatus,
  onEdit,
  onDelete,
}: {
  g: DateGroup;
  isOpen: boolean;
  onToggle: () => void;
  showCorretor?: boolean;
  showTeam?: boolean;
  onUpdateStatus: (id: string, status: VisitaStatus) => void;
  onEdit?: (visita: Visita) => void;
  onDelete?: (id: string) => void;
}) {
  const taxa = g.total > 0 ? Math.round((g.realizadas / g.total) * 100) : 0;

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-5 py-3 text-left transition-all",
          g.isToday
            ? "bg-gradient-to-r from-[hsl(221,83%,53%)] to-[hsl(221,83%,60%)] text-white"
            : g.isPast
              ? "bg-muted/40 text-muted-foreground"
              : "bg-gradient-to-r from-[hsl(222,47%,11%)] to-[hsl(222,47%,18%)] text-white"
        )}
      >
        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 opacity-70" /> : <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />}
        <CalendarDays className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-black tracking-tight">{g.dayOfWeek}</span>
          <span className={cn("text-sm ml-2 font-medium", g.isToday ? "text-white/80" : g.isPast ? "text-muted-foreground" : "text-white/60")}>
            {g.label}
          </span>
        </div>
        {g.isToday && (
          <Badge className="bg-white/95 text-[hsl(221,83%,53%)] text-[10px] font-black px-2.5 py-0.5 border-0 shrink-0 shadow-sm">
            HOJE
          </Badge>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-xs font-bold tabular-nums", g.isToday ? "text-white/90" : g.isPast ? "text-muted-foreground" : "text-white/80")}>
            {g.total} visita{g.total !== 1 ? "s" : ""}
          </span>
          {g.realizadas > 0 && (
            <span className="text-xs text-green-400 font-bold tabular-nums">
              {g.realizadas} ✅
            </span>
          )}
          {g.isPast && g.total > 0 && (
            <Badge className={cn(
              "text-[10px] px-2 py-0.5 border font-black tabular-nums shadow-sm",
              taxa >= 80 ? "bg-green-100 text-green-700 border-green-300"
                : taxa >= 50 ? "bg-amber-100 text-amber-700 border-amber-300"
                  : "bg-red-100 text-red-700 border-red-300"
            )}>
              {taxa}%
            </Badge>
          )}
        </div>
      </button>

      {isOpen && (
        <div>
          <VisitaRowHeader showCorretor={showCorretor} showTeam={showTeam} />
          <div className="divide-y divide-border/30">
            {g.visitas.map(v => {
              const isPastPending = g.isPast && (v.status === "marcada" || v.status === "confirmada");
              return (
                <VisitaRow
                  key={v.id}
                  visita={v}
                  onUpdateStatus={onUpdateStatus}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  showCorretor={showCorretor}
                  showTeam={showTeam}
                  isPastPending={isPastPending}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function VisitasList({ visitas, onUpdateStatus, onEdit, onDelete, showCorretor, showTeam, mode = "upcoming" }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const displayGroups = useMemo(() => {
    const groups = buildGroups(visitas);
    if (mode === "past") {
      return groups.filter(g => g.isPast).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    }
    if (mode === "all") {
      return groups.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    }
    // upcoming (default)
    return groups.filter(g => !g.isPast).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [visitas, mode]);

  const toggle = (dateStr: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr);
      return next;
    });
  };

  if (displayGroups.length === 0) {
    return (
      <div className="text-center py-6 rounded-xl border border-dashed border-border/50 bg-muted/20">
        <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">
          {mode === "past" ? "Nenhuma visita anterior encontrada" : mode === "all" ? "Nenhuma visita encontrada" : "Nenhuma visita futura agendada"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayGroups.map(g => (
        <DateGroupCard
          key={g.dateStr}
          g={g}
          isOpen={!collapsed.has(g.dateStr)}
          onToggle={() => toggle(g.dateStr)}
          showCorretor={showCorretor}
          showTeam={showTeam}
          onUpdateStatus={onUpdateStatus}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
