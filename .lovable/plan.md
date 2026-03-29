

## 3 Correções + Nova Página de Gamificação

### 1. Botão CALL não abre Oferta Ativa

**Causa raiz:** O botão "CALL / Oferta Ativa" navega para `/oferta-ativa`, mas `OfertaAtiva.tsx` (linha 31-32) redireciona corretores de volta para `/corretor` com `<Navigate to="/corretor" replace />`. Loop infinito.

**Correção:** Em `CorretorDashboard.tsx` linha 314, trocar `navigate("/oferta-ativa")` por `navigate("/corretor/call")` — que é a rota correta do corretor (já existe em `App.tsx` linha 220).

### 2. Botões duplicados no empty state das Oportunidades

**Causa:** `OportunidadesLista.tsx` linhas 201-219 mostra "Abrir Pipeline" e "Oferta Ativa" quando não há oportunidades pendentes. Esses botões duplicam os 2 botões de ação que já ficam logo acima na Home (linhas 310-327 do Dashboard).

**Correção:** Remover os 2 botões do empty state em `OportunidadesLista.tsx`, deixando apenas o texto "Você está em dia!" com o ícone de troféu e a mensagem motivacional.

### 3. Nova página `/progresso` — Centro de Gamificação

Criar uma página dedicada que une tudo que hoje fica espalhado na Home:

**Rota:** `/progresso` (nova rota em `App.tsx`)

**Conteúdo da página (ordem):**

```text
┌─────────────────────────────────────────┐
│  🎯 Progresso do Dia                    │
│  (header imersivo com gradiente)        │
├─────────────────────────────────────────┤
│  Level + XP Bar (LevelProgressBar)      │
├──────────────────┬──────────────────────┤
│  Missões do Dia  │  Meta do Dia         │
│  (MissoesDeHoje) │  (DailyProgressCard) │
├──────────────────┴──────────────────────┤
│  🏆 Ranking da Equipe                   │
│  (RankingGestaoLeads, com tabs de       │
│   período: dia/semana/mês)              │
├─────────────────────────────────────────┤
│  🎖️ Conquistas (grid de badges)         │
│  (reutiliza lógica de Conquistas.tsx)   │
└─────────────────────────────────────────┘
```

**Componentes reutilizados** (zero componente novo):
- `LevelProgressBar` — já existe
- `MissoesDeHoje` — já existe
- `DailyProgressCard` — já existe
- `RankingGestaoLeads` — já existe
- Conquistas grid — extraído de `Conquistas.tsx`

**Na Home do Corretor:**
- Remover as seções 8 (Missões), 9 (Ranking) e 14 (Gamificação) do Dashboard
- Substituir por um card compacto "🎯 Progresso do Dia" com: barra de XP resumida, % missão geral, e botão "Ver detalhes →" que navega para `/progresso`
- Isso reduz significativamente o scroll da Home

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/pages/CorretorDashboard.tsx` | Fix rota CALL → `/corretor/call`; substituir seções 8/9/14 por card compacto com link |
| `src/components/corretor/OportunidadesLista.tsx` | Remover botões duplicados do empty state |
| `src/pages/CorretorProgresso.tsx` | **NOVO** — Página de gamificação completa |
| `src/App.tsx` | Adicionar rota `/progresso` |

