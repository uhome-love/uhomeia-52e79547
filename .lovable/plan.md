

## Ajustes Visuais — 4 Correções Cirúrgicas

### 1. CallFocusOverlay — z-index (CallFocusOverlay.tsx, linha 213)
- Trocar `z-50` por `z-[9999]` no container principal
- O overlay já está dentro do Sheet, o z-50 é insuficiente pois o SheetContent tem z-50 nativo do shadcn

### 2. StageCoachBar — 3 fixes visuais (StageCoachBar.tsx)
**Linha 320** — Adicionar `flex-nowrap overflow-hidden` ao container da linha 1
**Linha 322** — Texto diagnóstico: adicionar `truncate` ao `<p>`, garantir `min-w-0` já está
**Linha 321** — Bolinha: trocar `w-1.5 h-1.5` por `w-[6px] h-[6px]` para garantir 6px exatos
**Linha 341** — Botões de ação: já têm `shrink-0`, OK

### 3. HOMI Side Panel — largura (PipelineLeadDetail.tsx, linha 651)
Atualmente:
- Modo direto: `sm:w-[35%]`
- Modo exploratório: `sm:w-[45%]`

Trocar para:
- Modo direto: `sm:w-[42%] sm:min-w-[380px] sm:max-w-[520px]`
- Modo exploratório: `sm:w-[45%] sm:min-w-[420px] sm:max-w-[520px]`

Dentro do ScrollArea (linha 659, `<div className="p-3">`), adicionar `[&_p]:break-words [&_p]:text-[13px] [&_p]:leading-[1.65] [&_pre]:whitespace-pre-wrap` para legibilidade dos resultados.

### 4. LeadMatchesWidget — grid 2 colunas (LeadMatchesWidget.tsx)
**Linha 136**: Trocar `space-y-2` por `grid grid-cols-2 gap-2`
**Cada card** (linhas 144-207):
- Mudar layout para vertical (imagem em cima 100px height, conteúdo embaixo)
- `max-h-[200px] overflow-hidden`
- Nome: `text-xs font-medium` (já é xs, trocar semibold → medium)
- Preço: `text-xs font-medium text-[#4F46E5]`
- Detalhes: `text-[11px] text-muted-foreground`
- Badge score: `text-[10px] px-1.5 py-0.5`
- Botões: `text-[11px] px-2 py-1`
- Remover score breakdown chips para caber no card compacto

### Arquivos alterados
| Arquivo | Mudança |
|---|---|
| `CallFocusOverlay.tsx` | z-[9999] |
| `StageCoachBar.tsx` | flex-nowrap, truncate, bolinha 6px |
| `PipelineLeadDetail.tsx` | Largura HOMI + text styles |
| `LeadMatchesWidget.tsx` | Grid 2 colunas, cards compactos |

### O que NÃO muda
- Nenhuma lógica, callback, query, hook ou edge function
- Nenhuma prop ou estado
- Nenhum outro arquivo

