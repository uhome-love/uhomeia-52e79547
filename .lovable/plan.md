

# Plano: 5 Prompts de Melhoria — Bugs, Dark Mode, Kanban, Performance

## Prompt 1 — Bugs Rapidos (7 fixes)

### Fix 1: GerenteDashboard — window.location.reload()
**Arquivo:** `src/pages/GerenteDashboard.tsx` linha 248
- Importar `useQueryClient` de `@tanstack/react-query`
- Criar `const queryClient = useQueryClient()` no componente
- Trocar `onRefresh={() => window.location.reload()}` por `onRefresh={() => queryClient.invalidateQueries()}`

### Fix 2: MeusNegocios — setTimeout sem cleanup
**Arquivo:** `src/pages/MeusNegocios.tsx` linhas 750-753
- Adicionar `const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)` no topo
- Envolver o setTimeout existente com cleanup: `if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current)`
- Adicionar useEffect de cleanup no unmount

### Fix 3: MinhasTarefas — query sem limit
**Arquivo:** `src/pages/MinhasTarefas.tsx` linha 129
- Adicionar `.limit(500)` na query principal de tarefas (ja usa useQuery, so adicionar o limit)

### Fix 4: CeoDashboard — MiniKpi sem forwardRef
**Arquivo:** `src/pages/CeoDashboard.tsx` linha 64
- Converter `function MiniKpi(...)` para `const MiniKpi = React.forwardRef(...)` com displayName
- MiniKpi nao usa ref internamente, so precisa aceitar e ignorar

### Fix 5: GerenteDashboard — codigo morto profileId
**Arquivo:** `src/pages/GerenteDashboard.tsx` linhas 168-171
- Remover `const profileId = useMemo(...)` — variavel nunca usada. O `sheetProfileId` (linha 172) e que e usado.

### Fix 6: CeoDashboard — metas sem React Query
**Arquivo:** `src/pages/CeoDashboard.tsx` linhas 145-161
- Migrar o useEffect + useState para useQuery com queryKey `["ceo-metas-mensais"]` e staleTime 5min
- Remover `const [ceoMetas, setCeoMetas] = useState`

### Fix 7: RoletaLeads — corretores sem React Query
**Arquivo:** `src/pages/RoletaLeads.tsx` linhas 50-54
- Migrar useEffect + useState para useQuery com queryKey `["roleta-all-corretores"]` e staleTime 5min

---

## Prompt 2 — MeusNegocios Dark Mode

**Arquivo:** `src/pages/MeusNegocios.tsx`
- Linha 920: filtros ja tem `dark:` parcial com classes inline hex. Verificar e completar variants faltantes
- Bulk action bar: adicionar `dark:` variants se usar cores hardcoded
- NegocioCard extraction: avaliar se viavel sem aumentar complexidade (opcional)

---

## Prompt 3 — PipelineKanban Dark Mode

**Arquivo:** `src/pages/PipelineKanban.tsx` (1181 linhas)
- Substituir sistematicamente todos os `style={{ color: "#...", background: "#...", border: "..." }}` por classes Tailwind com `dark:` variants
- Remover todos os `fontFamily: "'Plus Jakarta Sans'"` inline
- Mapeamento conforme tabela no prompt (ex: `#1E293B` → `text-slate-800 dark:text-slate-100`)
- Manter visual identico em light mode

---

## Prompt 4 — PipelineKanban Header Refactor

**Arquivo:** `src/pages/PipelineKanban.tsx` linhas 281-935
- Identificar os 3 blocos de header (mobile/tablet/desktop)
- Unificar em um unico componente responsivo `PipelineKanbanHeader.tsx`
- Usar classes Tailwind responsivas (`hidden md:flex`, `lg:hidden`, etc.)
- Extrair para `src/components/pipeline/PipelineKanbanHeader.tsx`

---

## Prompt 5 — Performance

### Fix 1: VendasRealizadas — waterfall
**Arquivo:** `src/pages/VendasRealizadas.tsx` linhas 109-258
- O waterfall e parcialmente necessario (queries dependem de resultados anteriores: profileId → query, dealIds → kpiRows, etc.)
- Paralelizar onde possivel: profileMap + authProfileMap podem ser paralelos (linhas 222-236), annualVgv + profileIdToAuthId podem ser paralelos (linhas 242-258)

### Fix 2: PipelineKanban — chunks sequenciais
**Arquivo:** `src/pages/PipelineKanban.tsx` linhas 126-144
- Trocar o loop `for` sequencial por `Promise.all` dos chunks paralelos
- Cada chunk e independente, resultado e mergeado no map

---

## Ordem de execucao
1. Prompt 1 (7 bugs rapidos) — menor risco, maior cobertura
2. Prompt 2 (MeusNegocios dark mode)
3. Prompt 5 (Performance) — independente do visual
4. Prompt 3 (Kanban dark mode) — mais extenso
5. Prompt 4 (Kanban header refactor) — mais complexo, por ultimo

## Arquivos modificados
| Arquivo | Prompts |
|---------|---------|
| GerenteDashboard.tsx | 1 |
| MeusNegocios.tsx | 1, 2 |
| MinhasTarefas.tsx | 1 |
| CeoDashboard.tsx | 1 |
| RoletaLeads.tsx | 1 |
| VendasRealizadas.tsx | 5 |
| PipelineKanban.tsx | 3, 4, 5 |
| PipelineKanbanHeader.tsx (novo) | 4 |

