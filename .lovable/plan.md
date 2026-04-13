

# Reestruturação do Funil de Leads

## Resumo

Substituir as etapas "Qualificação", "Possível Visita", "Visita Marcada" e "Visita Realizada" por "Busca", "Aquecimento", "Visita" (unificada) e renomear "Em Evolução" para "Pós-Visita". Adicionar coluna `flag_status` para flags visuais nos cards. Migrar ~1.450 leads existentes.

## Dados atuais de migração

| Etapa atual | Leads ativos | Destino |
|---|---|---|
| Qualificação | 970 | → Busca |
| Possível Visita | 273 | → Aquecimento |
| Visita Marcada | 83 | → Visita (flag: marcada) |
| Visita Realizada | 127 | → Visita (flag: realizada) |
| Em Evolução | 17 | → Pós-Visita (renomear) |

## Novo funil

```text
Ordem | Etapa           | Tipo             | Flags no card
0     | Novo Lead       | novo_lead        | ⏱ "Entrou há X min/h"
1     | Sem Contato     | sem_contato      | ☎️ Tentativa X/7, 🕐 Última tentativa
2     | Contato Inicial | contato_inicial  | ❤️ Gostou? | 🎯 Intenção | ⏳ Timing
3     | Busca           | busca            | 🔍 Busca status | 📤 Enviados | ❤️ Interesse
4     | Aquecimento     | aquecimento      | ⏳ Prazo | 🔁 Último contato | 📩 Fluxo
5     | Visita          | visita           | 📅 Marcada | ✅ Realizada | ❌ No-show | 🔁 Reagendada
6     | Pós-Visita      | pos_visita       | 💬 Feedback | 💰 Simulação | 🤔 Objeções | 🔥 Interesse
7     | Negócio Criado  | convertido       | (sem mudança)
8     | Descarte        | descarte         | (sem mudança)
```

## Tarefa 1 — Migration SQL

1. Adicionar coluna `flag_status` (jsonb, nullable, default `{}`) em `pipeline_leads`
2. Criar stages "Busca" (tipo `busca`, ordem 3) e "Aquecimento" (tipo `aquecimento`, ordem 4)
3. Criar stage "Visita" (tipo `visita`, ordem 5) e "Pós-Visita" (tipo `pos_visita`, ordem 6)
4. Migrar leads:
   - Qualificação → Busca
   - Possível Visita → Aquecimento
   - Visita Marcada → Visita + `flag_status = '{"visita": "marcada"}'`
   - Visita Realizada → Visita + `flag_status = '{"visita": "realizada"}'`
5. Renomear "Em Evolução" para "Pós-Visita" (tipo `pos_visita`, ordem 6)
6. Atualizar ordem dos stages restantes (Negócio Criado = 7, Descarte = 8)
7. Desativar/deletar stages antigos (Qualificação, Possível Visita, Visita Marcada, Visita Realizada)
8. Atualizar trigger `create_nurturing_sequence` para os novos tipos

## Tarefa 2 — Cards com flags visuais

Atualizar `JourneyMissionCard.tsx` e `PipelineCard.tsx`:
- Ler `lead.flag_status` (jsonb) e exibir badges/flags contextuais por etapa
- Sem Contato: contador de tentativas (ler de `pipeline_atividades` tipo ligação)
- Contato Inicial: badges "Gostou" / "Não gostou" / "Timing"
- Busca: "Busca pendente" / "Imóveis enviados"
- Visita: "Marcada" / "Realizada" / "No-show" / "Reagendada"
- Pós-Visita: "Simulação enviada" / "Objeções"

## Tarefa 3 — Atualizar referências em ~25 arquivos

Todos os arquivos que referenciam `qualificacao`, `possibilidade_visita`, `visita_marcada`, `visita_realizada`:
- `PipelineBoard.tsx` — cores/temas das colunas
- `PipelineCard.tsx` — SLA limits
- `CallFocusOverlay.tsx` — scripts e próximas etapas
- `StageCoachBar.tsx` — dicas por etapa
- `ForecastPonderadoPanel.tsx` — pesos de forecast
- `SequenceBuilder.tsx` / `SequenceTemplates.tsx` — tipos de trigger
- `AttemptModal.tsx` — opções de resultado
- `RelatoriosTab.tsx` — contadores de funil
- `metricDefinitions.ts` — pontos de gestão
- `useLeadIntelligence.ts`, `useFocusLeads.ts`, `useVisitas.ts`, `useLeadProgression.ts`
- Edge functions que referenciam esses tipos
- CSS variables para cores dos novos stages

## Tarefa 4 — Interação de flag no modal do lead

Em `PipelineLeadDetail.tsx`, adicionar seção contextual por etapa para definir flags:
- Contato Inicial: select "Gostou do imóvel?" + "Intenção" + "Timing"
- Busca: toggle "Busca iniciada" / "Imóveis enviados" / "Interesse"
- Visita: select "Marcada/Realizada/No-show/Reagendada"
- Pós-Visita: toggles "Feedback coletado" / "Simulação enviada" / "Objeções mapeadas" + select "Interesse"

Ao alterar flag, atualiza `flag_status` (jsonb) via `supabase.update()`.

## Tarefa 5 — Regra 48h sem ação em Sem Contato

Implementar na função SQL `get_oportunidades_do_dia` ou como alerta no dashboard:
- Se lead em "Sem Contato" tem `ultima_acao_at` > 48h → flag de alerta
- Futuramente: lógica de redistribuição via roleta (não implementar agora, apenas alertar)

## Ordem de execução

1. Migration SQL (stages + coluna + migração de leads + trigger)
2. Atualizar referências em todos os arquivos do frontend
3. Cards com flags visuais
4. Modal do lead com interação de flags
5. Ajustes de cores CSS

## Impacto

- ~1.450 leads migrados automaticamente
- 4 stages removidos, 4 criados/renomeados
- ~25 arquivos frontend atualizados
- Nenhuma edge function existente alterada (apenas trigger SQL)
- Retrocompatível: leads existentes mantêm histórico

