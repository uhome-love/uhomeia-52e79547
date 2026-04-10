

## Plano: Substituir filtros SLA e Score por filtro de Status do Lead

### O que muda

1. **Remover "Status do SLA"** (ok/warning/breach) — não é usado no fluxo real.
2. **Remover "Score mínimo"** (slider 0-100) — não é utilizado.
3. **Adicionar "Status do lead"** com as opções reais do sistema:
   - ✅ Em dia
   - 🔴 Atrasado
   - 🟡 Desatualizado

### Alterações técnicas

**`src/components/pipeline/PipelineAdvancedFilters.tsx`**

- Na interface `PipelineFilters`: remover `scoreMin` e `slaStatus`, adicionar `statusLead: string` (valores: `""` | `"em_dia"` | `"tarefa_atrasada"` | `"desatualizado"`).
- Em `EMPTY_FILTERS`: remover `scoreMin: 0` e `slaStatus: ""`, adicionar `statusLead: ""`.
- No `applyFilters`: remover bloco do `scoreMin` e do `slaStatus`. Adicionar bloco que usa `getLeadStatusFilter()` (importado de `CardStatusLine.tsx`) para filtrar pelo status real do lead.
- Na UI: remover seção "Score mínimo" (slider) e "Status do SLA" (3 botões). Adicionar seção "Status do lead" com 3 botões toggle (Em dia / Atrasado / Desatualizado).
- Atualizar preset "🚨 SLA expirado" para usar `statusLead: "tarefa_atrasada"` com label "🔴 Leads atrasados".
- Atualizar `countActive` para contar `statusLead` em vez de `scoreMin` e `slaStatus`.

**Impacto**: o componente já recebe `proximaTarefas` (ou pode derivar o status) — vou verificar se `getLeadStatusFilter` precisa de `proximaTarefa` e garantir que os dados estejam disponíveis no contexto do filtro.

