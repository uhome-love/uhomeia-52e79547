

# Plano: Auditoria e Redesenho Visual do Módulo Oferta Ativa (Corretor)

## Diagnóstico Completo

### Bugs Críticos Encontrados

**1. Classes CSS fantasma — NENHUMA definida**
As classes `arena-btn-call`, `arena-card`, `arena-bg`, `arena-scoreboard`, `arena-floor`, `arena-vignette`, `arena-particle`, `arena-sparkle-pulse`, `arena-title-gradient`, `arena-bar-glow-*`, `live-dot` são usadas em ~40 referências mas **não existem em nenhum arquivo CSS**. Isso explica:
- Botão "Iniciar Campanha" invisível/escuro (sem background)
- Cards de lista sem background/border definido
- Scoreboard sem estilo visual
- Partículas não animam

**2. Scoreboard ocupa espaço excessivo**
A barra superior (Arena de Ligação + KPIs + Level) usa ~180px fixos de altura, comprimindo a área útil (listas/campanha) para o pouco espaço que sobra em `h-[calc(100vh-3.5rem)]`.

**3. Tabs com estilo inconsistente**
A tab bar Arena/Aproveitados/Ranking tem `background: rgba(255,255,255,0.05)` inline que cria uma barra escura separada do scoreboard, gerando dois blocos visuais distintos no topo.

**4. Listas individuais não são selecionáveis independentemente**
O corretor só vê campanhas agrupadas. Listas fora de campanha ficam na seção "Listas individuais", mas não há separação visual clara entre "Campanhas" e "Listas avulsas" como opção primária de navegação.

---

## Solução Proposta

### Parte 1 — Criar CSS global para todas as classes arena (Bug fix)
**Arquivo:** `src/index.css`

Adicionar bloco completo com definições para:
- `.arena-bg` — background gradiente escuro (#0A0F1E → #111827)
- `.arena-scoreboard` — background semitransparente com border-bottom sutil
- `.arena-card` — card escuro (#161B22) com border rgba, hover com glow
- `.arena-btn-call` — **botão verde** com gradient (#16A34A → #15803D), text white, hover brightness
- `.arena-floor`, `.arena-vignette`, `.arena-particle` — efeitos visuais ambientais
- `.arena-title-gradient` — text gradient para título
- `.arena-sparkle-pulse` — animação pulse para ícone sparkle
- `.arena-bar-glow-*` — glow sutil nas barras de progresso
- `.live-dot` — pulsação verde para indicador "AO VIVO"

### Parte 2 — Compactar Scoreboard
**Arquivo:** `src/pages/CorretorCall.tsx`

- Condensar o scoreboard para **uma única linha**: título + KPIs + botões de ação
- Remover a seção de level progression do scoreboard (mover para tooltip ou footer)
- Reduzir padding de `py-3` para `py-2`
- Resultado: scoreboard passa de ~180px para ~60px, liberando mais espaço para conteúdo

### Parte 3 — Unificar tabs com scoreboard
**Arquivo:** `src/pages/CorretorCall.tsx`

- Mover o TabsList para dentro do scoreboard como parte da mesma barra visual
- Eliminar a separação visual entre scoreboard e tabs
- Tabs ficam compactas no canto direito ou como sub-nav inline

### Parte 4 — Separar Campanhas vs Listas
**Arquivo:** `src/components/oferta-ativa/CorretorListSelection.tsx`

- Adicionar dois filtros visuais no topo: **"📂 Campanhas"** | **"📋 Listas"** | **"✨ Personalizadas"**
- Permitir escolher uma lista individual diretamente (já funciona no onClick, só falta visibilidade)
- O filtro "Listas" mostra todas as listas avulsas, não agrupadas por campanha
- O filtro "Campanhas" mostra a visão agrupada atual

### Parte 5 — Botão verde clicável
**Via CSS da Parte 1** — o `arena-btn-call` ganha o gradient verde, font-weight bold, e hover effect. O botão desabilitado mantém `opacity-50` e fundo neutro.

---

## Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `src/index.css` | Adicionar ~80 linhas de CSS para classes arena |
| `src/pages/CorretorCall.tsx` | Compactar scoreboard + unificar tabs |
| `src/components/oferta-ativa/CorretorListSelection.tsx` | Adicionar filtro Campanhas/Listas/Personalizadas |

## Risco
Baixo. As classes CSS são adicionadas (não substituídas). O layout do scoreboard é reorganizado mas mantém os mesmos dados. O filtro de listas é visual — nenhuma lógica de negócio muda.

## Teste
- Verificar que botões "Iniciar Campanha" e "Iniciar o Call" aparecem verdes e clicáveis
- Verificar que cards de lista têm background/border visível
- Verificar que scoreboard é compacto e não comprime o conteúdo principal
- Verificar que é possível selecionar uma lista individual (não só campanha)
- Verificar que partículas e efeitos visuais funcionam
- Verificar que o módulo funciona end-to-end: escolher lista → entrar na arena → registrar tentativa

