

# Correção: Aba duplicada "Dashboard" + "Dashboard CEO"

## Causa raiz

1. `ROUTE_TO_TAB` em `pageRegistry.ts` tem entrada para `"/"` (key: `home`, label: `Dashboard`, closable: false)
2. Quando admin acessa `/`, o URL sync do `TabContext` cria a aba `home` **antes** do `useEffect` do `HomeDashboard` redirecionar para `/ceo`
3. O redirect cria uma segunda aba `ceo` ("Dashboard CEO") — resultado: duas abas

## Correção

### 1. `src/config/pageRegistry.ts` — Remover entrada "/" do ROUTE_TO_TAB

Remover a linha:
```
"/": { key: "home", label: "Dashboard", icon: "LayoutGrid", closable: false },
```

A rota `/` passa a não gerar aba — ela só existe para redirecionar.

### 2. `src/contexts/TabContext.tsx` — Ignorar "/" no URL sync

No `useEffect` de URL→Tab sync (linha ~149), adicionar guard:
```typescript
if (pathname === "/" || pathname === "/index.html") return;
```

Isso impede que a rota de redirect crie aba antes do redirect executar.

### 3. `src/config/pageRegistry.ts` — Manter componente no PAGE_COMPONENTS

Manter `home` no `PAGE_COMPONENTS` (caso algum código referencia), mas ele não será mais acessível como aba.

**Arquivos alterados**: `pageRegistry.ts`, `TabContext.tsx` (2 edições pequenas, ~3 linhas cada)

