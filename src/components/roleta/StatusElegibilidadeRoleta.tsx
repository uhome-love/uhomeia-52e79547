// =============================================================================
// Componente: StatusElegibilidadeRoleta
// Exibe o card de status de elegibilidade do corretor para as roletas do dia.
// Deve ser exibido na home do corretor antes dos horários de credenciamento.
//
// Roleta Manhã:  credenciamento até 09:30
// Roleta Tarde:  credenciamento até 13:30
// Roleta Noturna: 18:30–23:00 (exige visita no dia + pipeline em dia)
// =============================================================================

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, CheckCircle, XCircle, Moon, Clock, ChevronDown, ChevronUp } from "lucide-react";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface LeadDesatualizado {
  id: string;
  nome: string;
  stage: string;
  dias_sem_tarefa: number;
}

interface ElegibilidadeRoleta {
  pode_roleta_manha: boolean;
  pode_roleta_tarde: boolean;
  pode_roleta_noturna: boolean;
  leads_desatualizados: number;
  limite_bloqueio: number;
  faltam_para_bloquear: number;
  tem_visita_hoje: boolean;
  leads_para_atualizar: LeadDesatualizado[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getProximaRoleta(): { nome: string; horario: string; tipo: "manha" | "tarde" | "noturna" } {
  const agora = new Date();
  const hora = agora.getHours() * 60 + agora.getMinutes();

  if (hora < 9 * 60 + 30) return { nome: "Roleta Manhã", horario: "09:30", tipo: "manha" };
  if (hora < 13 * 60 + 30) return { nome: "Roleta Tarde", horario: "13:30", tipo: "tarde" };
  return { nome: "Roleta Noturna", horario: "18:30", tipo: "noturna" };
}

function getBarraProgresso(desatualizados: number, limite: number): number {
  return Math.min(100, (desatualizados / limite) * 100);
}

function getCorBarra(desatualizados: number, limite: number): string {
  const pct = desatualizados / limite;
  if (pct < 0.5) return "bg-green-500";
  if (pct < 0.8) return "bg-yellow-500";
  return "bg-red-500";
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function StatusElegibilidadeRoleta() {
  const { user } = useAuth();
  const [elegibilidade, setElegibilidade] = useState<ElegibilidadeRoleta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState(false);

  const proximaRoleta = getProximaRoleta();

  useEffect(() => {
    if (!user?.id) return;
    carregarElegibilidade();
  }, [user?.id]);

  async function carregarElegibilidade() {
    setCarregando(true);
    try {
      const { data, error } = await supabase.rpc("get_elegibilidade_roleta", {
        p_corretor_id: user!.id,
      });

      if (error) throw error;
      setElegibilidade(data as ElegibilidadeRoleta);
    } catch (err) {
      console.error("[StatusElegibilidade] Erro:", err);
    } finally {
      setCarregando(false);
    }
  }

  if (carregando) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
        <div className="h-3 w-32 bg-gray-100 rounded" />
      </div>
    );
  }

  if (!elegibilidade) return null;

  const elegívelProxima =
    proximaRoleta.tipo === "noturna"
      ? elegibilidade.pode_roleta_noturna
      : elegibilidade.pode_roleta_manha;

  const pctBarra = getBarraProgresso(elegibilidade.leads_desatualizados, elegibilidade.limite_bloqueio);
  const corBarra = getCorBarra(elegibilidade.leads_desatualizados, elegibilidade.limite_bloqueio);

  return (
    <div
      className={`rounded-xl border-2 bg-white shadow-sm transition-all ${
        elegívelProxima ? "border-green-200" : "border-red-200"
      }`}
    >
      {/* Cabeçalho */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Ícone de status */}
            {elegívelProxima ? (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            ) : (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                {proximaRoleta.tipo === "noturna" && (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
                <span className="font-semibold text-gray-900 text-sm">
                  {proximaRoleta.nome}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  até {proximaRoleta.horario}
                </span>
              </div>

              {elegívelProxima ? (
                <p className="text-sm text-green-700 mt-0.5">
                  ✅ Você está elegível para se credenciar
                </p>
              ) : (
                <p className="text-sm text-red-700 mt-0.5">
                  🔒 Você está bloqueado — veja o que fazer abaixo
                </p>
              )}
            </div>
          </div>

          {/* Botão expandir */}
          <button
            onClick={() => setExpandido(!expandido)}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-1"
          >
            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Barra de progresso de leads desatualizados */}
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">Leads desatualizados</span>
            <span
              className={`text-xs font-semibold ${
                elegibilidade.leads_desatualizados > 10 ? "text-red-600" : "text-gray-700"
              }`}
            >
              {elegibilidade.leads_desatualizados} / {elegibilidade.limite_bloqueio}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${corBarra}`}
              style={{ width: `${pctBarra}%` }}
            />
          </div>
          {!elegívelProxima && (
            <p className="text-xs text-red-600 mt-1">
              Você precisa atualizar pelo menos{" "}
              <strong>{elegibilidade.leads_desatualizados - 10} lead(s)</strong> para se desbloquear.
            </p>
          )}
          {elegívelProxima && elegibilidade.faltam_para_bloquear <= 3 && (
            <p className="text-xs text-yellow-600 mt-1">
              ⚠️ Atenção: faltam apenas {elegibilidade.faltam_para_bloquear} lead(s) para você ser bloqueado.
            </p>
          )}
        </div>

        {/* Regra extra da roleta noturna */}
        {proximaRoleta.tipo === "noturna" && (
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${
              elegibilidade.tem_visita_hoje
                ? "bg-indigo-50 text-indigo-700"
                : "bg-orange-50 text-orange-700"
            }`}
          >
            <Moon className="w-3.5 h-3.5 flex-shrink-0" />
            {elegibilidade.tem_visita_hoje ? (
              <span>Visita registrada hoje — acesso à roleta noturna liberado</span>
            ) : (
              <span>
                Roleta noturna exige visita agendada ou realizada hoje. Registre uma visita no pipeline para participar.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Seção expandida: lista de leads desatualizados */}
      {expandido && elegibilidade.leads_para_atualizar.length > 0 && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">
            Leads que precisam de atenção
          </p>
          <div className="space-y-2">
            {elegibilidade.leads_para_atualizar.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{lead.nome}</p>
                  <p className="text-xs text-gray-500">{lead.stage}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      lead.dias_sem_tarefa > 14
                        ? "bg-red-100 text-red-700"
                        : lead.dias_sem_tarefa > 7
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {lead.dias_sem_tarefa}d sem tarefa
                  </span>
                </div>
              </div>
            ))}
          </div>

          {elegibilidade.leads_desatualizados > 10 && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Mostrando 10 de {elegibilidade.leads_desatualizados} leads desatualizados
            </p>
          )}

          <button
            onClick={() => {
              // Navega para o pipeline filtrado por leads sem tarefa
              window.location.href = "/pipeline?filtro=sem_tarefa";
            }}
            className="mt-3 w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 transition-colors"
          >
            Ir para o pipeline e atualizar leads →
          </button>
        </div>
      )}

      {expandido && elegibilidade.leads_para_atualizar.length === 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-sm text-green-600 text-center">
            🎉 Todos os seus leads estão com tarefas em dia!
          </p>
        </div>
      )}
    </div>
  );
}
