

# Reestruturação Completa UHomeSales — 10 Fases

Todas as verificações foram feitas. Imports, dependências e arquivos confirmados. Nenhum risco de build quebrado.

---

## FASE 1 — Deletar 6 páginas mortas
Sem import ativo em nenhum outro arquivo:
- `GestorDashboard.tsx`, `ImoveisPage.tsx` (antigo), `CorretorResumo.tsx`, `RankingComercial.tsx`, `MelnickMetas.tsx`, `TarefasPage.tsx`

## FASE 2 — Renomear 4 páginas + atualizar App.tsx
- `ImoveisPageNew.tsx` → `ImoveisPage.tsx`
- `CampanhasVozPage.tsx` → `CampanhasVoz.tsx`
- `CentralNutricaoPage.tsx` → `CentralNutricao.tsx`
- `WhatsAppCampaignDispatcherPage.tsx` → `WhatsAppCampaignDispatcher.tsx`
- Atualizar 4 `lazyRetry` imports no App.tsx

## FASE 3 — Corrigir links mortos (5 arquivos)
- `AppSidebar.tsx`: `/corretor/resumo` → `/corretor`, `/corretor/ranking-equipes` → `/ranking`
- `QuickLinksGrid.tsx`: `/corretor/resumo` → `/corretor`
- `DashboardRankingsPreview.tsx`: `/corretor/ranking-equipes` → `/ranking`
- `NotificationList.tsx`: `/corretor/resumo` → `/corretor`
- `App.tsx`: remover 2 redirects obsoletos (linhas 228-229)

## FASE 4 — Deletar 4 wrappers Supabase
Confirmado 0 imports: `supabase-auth-helpers.ts`, `supabase-client-wrapper.ts`, `supabase-typed.ts`, `supabase-types-helpers.ts`

## FASE 5 — Deletar `services/imoveis.ts`
Só importado por hooks que serão deletados na fase seguinte.

## FASE 6 — Deletar 4 hooks + 1 store órfãos
- `useImoveisQuery.ts`, `useImoveisSearch.ts`, `useImoveisFilters.ts`, `usePostgRESTFacets.ts`
- `stores/searchStore.ts`

## FASE 7 — Documentar hooks CEO
Adicionar comentários de responsabilidade em `useCeoDashboard.ts` e `useCeoData.ts`.

## FASE 8 — Ícones duplicados no Sidebar
- `Placar do Dia`: Trophy → BarChart2
- `Integração`: Zap → PlugZap
- `Diagnóstico Site`: Zap → Activity
- `Sala de Reunião`: CalendarDays → DoorOpen
- Renomear "Tarefas & Marketing (Ana)" → "Operacional (Backoffice)"

## FASE 9 — PageHeader em 5 páginas
Adicionar `PageHeader` padronizado em: `Conquistas.tsx`, `CorretorProgresso.tsx`, `DisponibilidadePage.tsx`, `MarketingDashboard.tsx`, `NutricaoPage.tsx`

## FASE 10 — Limpeza final App.tsx
Remover 3 comentários mortos (linhas 39, 49, 53) e verificar imports residuais.

---

## Resumo

| Ação | Qtd |
|------|-----|
| Páginas deletadas | 6 |
| Páginas renomeadas | 4 |
| Hooks/stores deletados | 5 |
| Serviço deletado | 1 |
| Wrappers deletados | 4 |
| Arquivos editados | ~12 |

**Zero lógica de negócio alterada.** Todas as dependências verificadas — chain limpa.

