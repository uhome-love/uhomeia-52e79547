

## Plano: Corrigir filtro de campanhas cortado + adicionar botão "+ Filtros" visível

### Problema identificado

1. **Texto "Todas as campanhas" cortado**: O `SelectTrigger` do filtro de campanhas tem `w-[160px]` — insuficiente para o texto completo.
2. **Botão "+ Filtros" já existe** (`PipelineAdvancedFilters`) mas usa `h-9` em vez de `h-[32px]`, ficando inconsistente com o header. O componente já é renderizado tanto no desktop (linha 309) quanto no mobile (linha 457).

### Alterações

**Arquivo: `src/pages/PipelineKanban.tsx`**
- Linha 598: Aumentar `w-[160px]` para `w-[190px]` no SelectTrigger do filtro de campanhas, garantindo que "Todas as campanhas" apareça completo.

**Arquivo: `src/components/pipeline/PipelineAdvancedFilters.tsx`**
- Linha 292: Ajustar o botão trigger de `h-9` para `h-[32px]` e estilizar para combinar com os outros filtros do header (mesma paleta de cores, `text-[12px]`, `rounded-lg`).
- Alterar o label de "Filtros" para "+ Filtros" para deixar mais claro que é expansível.

### Detalhes técnicos

- O `PipelineAdvancedFilters` já contém filtros detalhados (temperatura, score, etapa, corretor, origem, segmento, empreendimento, dias sem ação, período, visita, SLA, gerente) — tudo funcional.
- Apenas ajustes visuais de sizing e label são necessários, sem lógica nova.

