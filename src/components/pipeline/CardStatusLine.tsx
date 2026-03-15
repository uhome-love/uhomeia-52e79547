import { useMemo } from "react";
import { differenceInHours, differenceInDays, isToday as isTodayFn, isTomorrow as isTomorrowFn, isYesterday as isYesterdayFn, startOfDay, format } from "date-fns";
import { cn } from "@/lib/utils";
import type { PipelineLead } from "@/hooks/usePipeline";

const TIPO_LABELS: Record<string, string> = {
  follow_up: "Follow-up", ligar: "Ligar", whatsapp: "WhatsApp",
  enviar_proposta: "Proposta", enviar_material: "Material",
  marcar_visita: "Visita", confirmar_visita: "Confirmar visita",
  retornar_cliente: "Retornar", outro: "Tarefa",
};

function toValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toValidDateFromYMD(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface CardStatusResult {
  indicator: string | null;
  indicatorCls: string;
  text: string;
  textCls: string;
  borderCls: string;
}

interface ProximaTarefa {
  tipo: string;
  vence_em: string | null;
  hora_vencimento: string | null;
}

export function getCardStatus(lead: PipelineLead, proximaTarefa: ProximaTarefa | null): CardStatusResult {
  const now = new Date();
  const todayStart = startOfDay(now);

  if (proximaTarefa?.vence_em) {
    const d = toValidDateFromYMD(proximaTarefa.vence_em);
    const hora = proximaTarefa.hora_vencimento?.slice(0, 5) || "";
    const label = TIPO_LABELS[proximaTarefa.tipo] || proximaTarefa.tipo;

    if (!d) {
      return { indicator: "🟡", indicatorCls: "text-amber-500", text: `🟡 Próximo: ${label} ${hora}`.trim(), textCls: "text-amber-600 dark:text-amber-400 font-semibold", borderCls: "border-l-amber-400" };
    }
    if (d < todayStart) {
      const dateLabel = isYesterdayFn(d) ? "ontem" : format(d, "dd/MM");
      return { indicator: "🔴", indicatorCls: "text-destructive", text: `🔴 Atrasado: ${label} ${dateLabel} ${hora}`, textCls: "text-destructive font-semibold", borderCls: "border-l-destructive" };
    }
    if (isTodayFn(d)) {
      return { indicator: "🟡", indicatorCls: "text-amber-500", text: `🟡 Hoje ${hora}: ${label}`, textCls: "text-amber-600 dark:text-amber-400 font-semibold", borderCls: "border-l-amber-400" };
    }
    const dateLabel = isTomorrowFn(d) ? "amanhã" : format(d, "dd/MM");
    return { indicator: "✅", indicatorCls: "text-green-500", text: `✅ Próximo: ${label} ${dateLabel} ${hora}`, textCls: "text-muted-foreground", borderCls: "border-l-green-400" };
  }

  const lastContactDate = toValidDate((lead as any).ultima_acao_at);
  if (!lastContactDate) {
    const stageDate = toValidDate(lead.stage_changed_at);
    const hoursInStage = stageDate ? differenceInHours(now, stageDate) : 999;
    if (Number.isFinite(hoursInStage) && hoursInStage < 2) {
      return { indicator: null, indicatorCls: "", text: "", textCls: "", borderCls: "border-l-blue-400" };
    }
    return { indicator: "🟡", indicatorCls: "text-amber-500", text: "🟡 Sem contato · Aguardando ação", textCls: "text-amber-600 dark:text-amber-400 font-semibold", borderCls: "border-l-amber-400" };
  }

  const hoursSinceContact = differenceInHours(now, lastContactDate);
  if (!Number.isFinite(hoursSinceContact)) {
    return { indicator: "🟡", indicatorCls: "text-amber-500", text: "🟡 Sem contato · Aguardando ação", textCls: "text-amber-600 dark:text-amber-400 font-semibold", borderCls: "border-l-amber-400" };
  }
  if (hoursSinceContact > 48) {
    return { indicator: "🔴", indicatorCls: "text-destructive", text: "🔴 Sem contato · Aguardando ação", textCls: "text-destructive font-semibold", borderCls: "border-l-destructive" };
  }
  if (hoursSinceContact > 24) {
    return { indicator: "🟡", indicatorCls: "text-amber-500", text: "🟡 Sem contato · Aguardando ação", textCls: "text-amber-600 dark:text-amber-400 font-semibold", borderCls: "border-l-amber-400" };
  }
  return { indicator: "⚠️", indicatorCls: "text-amber-500", text: `⚠️ Desatualizado · falta tarefa`, textCls: "text-amber-600 dark:text-amber-400 font-semibold", borderCls: "border-l-amber-400" };
}

interface CardStatusLineProps {
  status: CardStatusResult;
  stageChangedAt: string | null | undefined;
}

export default function CardStatusLine({ status, stageChangedAt }: CardStatusLineProps) {
  const daysInStage = useMemo(() => {
    const d = toValidDate(stageChangedAt);
    if (!d) return null;
    const days = differenceInDays(new Date(), d);
    if (!Number.isFinite(days) || days < 1) return null;
    return days;
  }, [stageChangedAt]);

  return (
    <div className="flex items-center justify-between gap-1 pt-0.5">
      <p className={cn("text-[11px] truncate font-medium", status.text ? status.textCls : "text-muted-foreground")}>
        {status.text || "✅ Em dia"}
      </p>
      {daysInStage !== null && (
        <span className={cn(
          "text-[9px] font-semibold shrink-0 px-1.5 py-0.5 rounded-md",
          daysInStage >= 7 ? "text-destructive bg-destructive/10" :
          daysInStage >= 3 ? "text-amber-600 dark:text-amber-400 bg-amber-500/10" :
          "text-muted-foreground bg-muted/50"
        )}>
          {daysInStage}d na etapa
        </span>
      )}
    </div>
  );
}

export { TIPO_LABELS, toValidDate, toValidDateFromYMD };
