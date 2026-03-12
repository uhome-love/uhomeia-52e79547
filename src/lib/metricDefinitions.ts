/**
 * metricDefinitions.ts — Single Source of Truth for all metric definitions
 * 
 * Every dashboard, ranking, report, and table MUST reference these definitions
 * to ensure consistency across the entire UhomeSales system.
 * 
 * === METRIC DEFINITIONS ===
 * 
 * LIGAÇÃO (Call):
 *   Source: oferta_ativa_tentativas
 *   Filter: created_at within period
 *   Note: Each row = 1 tentativa. canal='ligacao' for phone calls specifically.
 *   ID field: corretor_id = auth.user_id
 * 
 * APROVEITADO (Interested Lead):
 *   Source: oferta_ativa_tentativas
 *   Filter: resultado = 'com_interesse' AND created_at within period
 *   ID field: corretor_id = auth.user_id
 * 
 * TAXA DE CONVERSÃO OA:
 *   Formula: (aproveitados / tentativas) * 100
 * 
 * VISITA MARCADA:
 *   Source: visitas table
 *   Definition: A visit CREATED (created_at) within the period
 *   Statuses that count: marcada, confirmada, realizada, reagendada
 *   Does NOT count: cancelada
 *   ID field: corretor_id = auth.user_id
 * 
 * VISITA REALIZADA:
 *   Source: visitas table
 *   Definition: Visit where data_visita is within period AND status = 'realizada'
 *   ID field: corretor_id = auth.user_id
 * 
 * VISITA NO SHOW:
 *   Source: visitas table
 *   Definition: Visit where data_visita is within period AND status = 'no_show'
 * 
 * PROPOSTA:
 *   Source: negocios table
 *   Definition: Negócio with fase IN ('proposta', 'negociacao', 'documentacao')
 *   Period filter: created_at within period
 *   ID field: corretor_id = profiles.id (NOT auth.user_id)
 * 
 * VGV GERADO:
 *   Source: negocios table
 *   Definition: SUM(vgv_estimado) for negocios created in period
 * 
 * VGV ASSINADO:
 *   Source: negocios table
 *   Definition: SUM(vgv_final || vgv_estimado) where fase IN ('assinado','vendido')
 *   Period filter: data_assinatura within period (NOT created_at)
 *   ID field: corretor_id = profiles.id
 * 
 * PRESENÇA:
 *   Source: checkpoint_lines (primary) + corretor_disponibilidade (realtime)
 *   Definition: 
 *     - checkpoint_lines.real_presenca IN ('presente','home_office','externo') 
 *     - OR corretor_disponibilidade.status IN ('online','na_empresa','disponivel','em_pausa','em_visita')
 *   Conta como presença: presente, home_office, externo
 *   NÃO conta: ausente, null, folga
 * 
 * GESTÃO DE LEADS (Pipeline progression):
 *   Source: pipeline_historico + pipeline_stages
 *   Points: Contato Iniciado (5), Qualificação (10), V.Marcada (30), V.Realizada (50)
 *   Period filter: pipeline_historico.created_at within period
 *   ID field: pipeline_leads.corretor_id = auth.user_id
 * 
 * === ID MAPPING ===
 * 
 * CRITICAL: The system has TWO types of IDs for corretores:
 * 1. auth.user_id (UUID from auth.users) — used in:
 *    - pipeline_leads.corretor_id
 *    - oferta_ativa_tentativas.corretor_id
 *    - visitas.corretor_id
 *    - team_members.user_id
 *    - corretor_disponibilidade.user_id
 * 
 * 2. profiles.id (separate UUID) — used in:
 *    - negocios.corretor_id
 *    - checkpoint_lines.corretor_id → team_members.id
 * 
 * When combining data across these sources, ALWAYS resolve to auth.user_id
 * as the canonical corretor identifier.
 */

export const METRIC_WEIGHTS = {
  RANKING_PROSPECCAO: 20,
  RANKING_GESTAO: 30,
  RANKING_VENDAS: 40,
  RANKING_EFICIENCIA: 10,
} as const;

export const GESTAO_POINTS = {
  CONTATO_INICIADO: 5,
  QUALIFICACAO: 10,
  VISITA_MARCADA: 30,
  VISITA_REALIZADA: 50,
} as const;

export const VISITA_STATUS_COUNTS_AS_MARCADA = ['marcada', 'confirmada', 'realizada', 'reagendada'] as const;
export const VISITA_STATUS_REALIZADA = 'realizada' as const;
export const VISITA_STATUS_NO_SHOW = 'no_show' as const;

export const PRESENCA_VALID = ['presente', 'home_office', 'externo'] as const;
export const DISPONIBILIDADE_ONLINE = ['online', 'na_empresa', 'disponivel', 'em_pausa', 'em_visita'] as const;

export const NEGOCIO_FASES_PROPOSTA = ['proposta', 'negociacao', 'documentacao'] as const;
export const NEGOCIO_FASES_ASSINADO = ['assinado', 'vendido'] as const;
export const NEGOCIO_FASES_PERDIDO = ['perdido', 'cancelado', 'distrato'] as const;

/**
 * Standard period range calculation for BRT timezone
 */
export function getMetricPeriodRange(period: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  const todayBRT = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  
  if (period === "custom" && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }
  
  if (period === "hoje" || period === "dia") {
    return { start: todayBRT, end: todayBRT };
  }
  
  if (period === "semana") {
    const d = new Date(todayBRT + "T12:00:00");
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
    };
  }
  
  // mes
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    start: firstDay.toISOString().split("T")[0],
    end: lastDay.toISOString().split("T")[0],
  };
}

export function periodToTimestamps(range: { start: string; end: string }) {
  return {
    startTs: `${range.start}T00:00:00-03:00`,
    endTs: `${range.end}T23:59:59.999-03:00`,
  };
}
