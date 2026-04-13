

# Conclusao da Reestruturacao: Residuais + Flags Visuais

## Resumo

Atualizar ~15 arquivos com referencias residuais aos stages antigos (qualificacao, possivel_visita, visita_marcada, visita_realizada, em_evolucao) e implementar badges visuais de `flag_status` nos cards do pipeline + controles no modal do lead.

## Tarefa 1 — Atualizar referencias residuais (~12 arquivos)

**Arquivos e mudancas:**

| Arquivo | Mudanca |
|---|---|
| `WhatsAppTemplatesDialog.tsx` | templatesPorEtapa: `qualificacao` → `busca`, `possivel_visita` → `aquecimento`, `visita_marcada` → `visita`, `visita_realizada` → `pos_visita` |
| `useLeadIntelligence.ts` | `isVisita`: `["visita_marcada","visita_realizada"]` → `["visita","pos_visita"]` |
| `LeadSequenceSuggestion.tsx` | stages arrays: `possibilidade_visita` → `aquecimento`, `visita_realizada` → `pos_visita` |
| `RelatoriosTab.tsx` | Funnel: substituir `qualificacao`, `possivel_visita`, `visita_marcada`, `visita_realizada`, `em_evolucao` → `busca`, `aquecimento`, `visita`, `pos_visita` |
| `SaudeOperacao.tsx` | `.in("etapa", ...)`: `visita_marcada/realizada` → `visita`, `pos_visita` |
| `ForecastPonderadoPanel.tsx` | STAGE_PROBABILITY: remover antigos, adicionar `busca: 20`, `aquecimento: 30`, `visita: 50`, `pos_visita: 65` |
| `JourneyMapBoard.tsx` | PHASE_THEMES: adicionar `busca`, `aquecimento`, `pos_visita`; atualizar `getThemeForStage` fallbacks |
| `CampanhasVozContent.tsx` | SelectItem: `qualificacao` → `busca` |
| `SequenceTemplates.tsx` | trigger_config `stage_tipo: "qualificacao"` → `"busca"` |
| `useLeadProgression.ts` | `fase_destino: "visita_realizada"` → `"pos_visita"` |
| `site-events/index.ts` | `reativarLead`: `.eq('tipo', 'qualificacao')` → `.eq('tipo', 'busca')` |
| `NotificationPreferences.tsx` | Label cosmético apenas (manter `visita_marcada` como key de notificacao — nao e stage type) |

## Tarefa 2 — Adicionar `flag_status` ao tipo PipelineLead

No `usePipeline.ts`, adicionar `flag_status?: Record<string, string> | null` ao interface `PipelineLead` e incluir na query de select.

## Tarefa 3 — Flags visuais no PipelineCard

Adicionar um bloco de badges entre ROW 3 e ROW 4 no `PipelineCard.tsx` que le `(lead as any).flag_status` e exibe:

- **Visita**: badges coloridos "Marcada" / "Realizada" / "No-show" / "Reagendada"
- **Sem Contato**: badge "Tentativa X/7" (lido do flag_status)
- **Contato Inicial**: badges "Gostou" / "Nao gostou" / Timing
- **Busca**: "Busca pendente" / "Imoveis enviados"
- **Aquecimento**: prazo de recontato
- **Pos-Visita**: "Simulacao enviada" / "Objecoes"

Cada badge: pequeno pill colorido (9-10px font, estilo dos tags existentes).

## Tarefa 4 — Flags visuais no JourneyMissionCard

Mesmo conceito simplificado: 1 badge contextual abaixo do nome do lead, lendo `flag_status`.

## Tarefa 5 — Controles de flag no modal do lead

Em `PipelineLeadDetail.tsx`, adicionar secao contextual (abaixo do stage coach bar) com controles por etapa:

- **Visita**: Select com opcoes Marcada/Realizada/No-show/Reagendada
- **Sem Contato**: Input numerico "Tentativas" (1-7)
- **Contato Inicial**: Toggle "Gostou do imovel?" + Select "Intencao" (Morar/Investir) + Select "Timing"
- **Busca**: Toggles "Busca iniciada" / "Imoveis enviados" / "Interesse"
- **Aquecimento**: Select prazo (30/60/90 dias)
- **Pos-Visita**: Toggles "Feedback coletado" / "Simulacao enviada" / "Objecoes mapeadas" + Select "Interesse"

Ao alterar, faz `supabase.update({ flag_status: {...} })` no lead.

## Tarefa 6 — Migration SQL: remover stages antigos vazios

Deletar stages com 0 leads: Qualificacao, Possivel Visita, Visita Marcada, Visita Realizada (IDs confirmados vazios no DB).

## Ordem de execucao

1. Migration SQL (remover stages vazios)
2. Tipo PipelineLead + query
3. Atualizar 12 arquivos com referencias residuais
4. Flags visuais nos cards
5. Controles de flag no modal

## Detalhes tecnicos

- `flag_status` ja existe como coluna jsonb no banco (confirmado)
- Stages antigos tem 0 leads (migracao anterior funcionou)
- ~633 linhas no PipelineCard.tsx — flags inseridos na linha ~395
- ~895 linhas no PipelineLeadDetail.tsx — controles inseridos apos o StageCoachBar

