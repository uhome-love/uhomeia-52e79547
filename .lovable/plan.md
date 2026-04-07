

## Adicionar busca livre no Pipeline de Leads mobile

### Situação atual
O header mobile (`md:hidden`) do PipelineKanban tem: título, filtro de corretor, filtros avançados e botão "+ Novo". **Não tem campo de busca** — ele só existe no tablet e desktop.

### Solução
Adicionar um ícone de lupa (Search) no header mobile que, ao ser tocado, expande um campo de busca inline na **linha 2** (acima dos status chips), sem poluir o layout.

### Implementação

**Arquivo:** `src/pages/PipelineKanban.tsx`

1. **Novo state** `mobileSearchOpen` (boolean, default false)

2. **Linha 1 mobile** (L280-333): Adicionar um botão de lupa entre os filtros avançados e o botão "+ Novo":
   - Ícone Search (12px), mesmo estilo dos outros botões (24x24, borda, fundo branco)
   - Ao clicar, ativa `mobileSearchOpen` e foca o input

3. **Entre linha 1 e linha 2** (L333-336): Renderizar condicionalmente um campo de busca quando `mobileSearchOpen` é true:
   - Input com ícone Search à esquerda, botão X à direita para limpar e fechar
   - Altura compacta (32px), padding horizontal 12px, `animate-fade-in`
   - Usa `filters.search` (mesmo state já existente no desktop)
   - Auto-focus ao abrir

4. **Quando `filters.search` tem valor**, manter a barra visível mesmo se o usuário "fechar" — o X limpa o texto e fecha. A lupa mostra um dot indicador azul quando há busca ativa.

### Resultado visual (mobile)
```text
┌─────────────────────────────────┐
│ 🟪 Pipeline  42  [Corretor▼] 🔍 +Novo │  ← lupa adicionada
├─────────────────────────────────┤
│ 🔍 Buscar lead...            ✕  │  ← expande ao tocar lupa
├─────────────────────────────────┤
│ 🟢12  🟡5  🔴3          🔄    │  ← status chips existentes
└─────────────────────────────────┘
```

Sem alteração no tablet ou desktop. Sem novos componentes — apenas lógica condicional inline no header mobile existente.

