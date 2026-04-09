

# Plano: Cards Compactos com Hover Reveal — Estilo Pipedrive

## Resumo

Transformar os cards do Kanban de "ficha completa" (~140px) para "preview compacto" (~80-96px) com barra de ações que aparece apenas no hover, reduzindo drasticamente a poluição visual.

## O que muda

### PipelineCard.tsx — Reestruturação do card body

**Estado default (sem hover) — 4 linhas máximo:**

1. **Linha 1:** Nome (13px, semibold, truncate) + badges à direita (NOVO/OA pill + dias "Xd")
2. **Linha 2:** Avatar 20px do corretor + nome (12px, text-secondary, truncate)
3. **Linha 3:** Dot colorido + empreendimento (12px, text-secondary, truncate) — sem telefone visível, sem imovel_codigo
4. **Linha 4 (condicional):** Status da tarefa com badges coloridos compactos:
   - Hoje: badge verde `bg-emerald-50 text-emerald-700`
   - Próximo: badge azul `bg-blue-50 text-blue-600`
   - Atrasado: badge vermelho `bg-red-50 text-red-700`
   - Desatualizado: badge amarelo `bg-amber-50 text-amber-700`
   - Sem tarefa + em dia: não mostrar (economiza espaço)

**Remover do estado default:**
- Telefone formatado (ROW 3 atual)
- Badges de parceiro/negócio (mover para drawer)
- Campaign tags (Melnick Day etc.)
- Temperatura icon (manter apenas se quente)

**Estado hover:**
- Card: `translateY(-1px)` + `box-shadow: 0 4px 12px rgba(0,0,0,0.08)` (já existe)
- CardActionBar: muda de sempre visível → `opacity: 0` por padrão, `group-hover:opacity-100` com `transition 150ms`
- Transição suave com `translateY(4px→0)`

### CardActionBar.tsx — Hover-only overlay

- Adicionar classes `opacity-0 group-hover:opacity-100 transition-all duration-150`
- Adicionar `translate-y-1 group-hover:translate-y-0` para efeito de slide-up
- Manter estrutura interna (Ligar | Tarefa | WhatsApp | ···) idêntica
- Sem mudança nos handlers ou props

### CardStatusLine.tsx — Compactar para badge inline

- Em vez de texto longo em uma linha separada, renderizar como badge compacto (pill)
- Usar cores de fundo sutis (emerald/blue/amber/red) em vez de texto colorido
- Manter a lógica de `getCardStatus` 100% intacta

## O que NÃO muda

- Lógica de drag & drop (handlers no div raiz)
- onClick que abre o drawer
- Props recebidas pelo card
- Todos os hooks, queries e estados
- Menu "···" (mesmo conteúdo, mesma posição)
- NegocioCriadoSection (mantém para stage convertido)
- Todos os dialogs (Schedule, Partner, Transfer, etc.)

## Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `PipelineCard.tsx` | Simplificar body: remover telefone, parceiro badge, campaign tags do default. Compactar layout para ~80px |
| `CardActionBar.tsx` | Adicionar classes de transição hover-only (opacity + translateY) |
| `CardStatusLine.tsx` | Renderizar como badge/pill compacto em vez de texto em linha separada |

## Risco
Zero funcional. Apenas redução visual — informações removidas do card ainda acessíveis no drawer. Drag & drop, dialogs e queries intactos.

