

# Correção: Aba "Dashboard" fantasma persistindo no sessionStorage

## Causa raiz

A entrada `"/"` foi removida do `ROUTE_TO_TAB` e o URL sync já ignora `"/"`, mas o **sessionStorage** (`uhome_tabs_v1`) ainda contém a aba antiga `{ id: "home", path: "/" }` de sessões anteriores. Ao restaurar do storage, essa aba fantasma reaparece.

## Correção (1 arquivo)

### `src/contexts/TabContext.tsx` — Sanitizar abas ao carregar do storage

Na função `loadFromStorage()` (linha 42-50), filtrar abas com `path === "/"` antes de retornar:

```typescript
function loadFromStorage(): { tabs: Tab[]; activeTabId: string } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Array.isArray(data.tabs) && typeof data.activeTabId === "string") {
      // Remove ghost tabs from legacy "/" route
      const cleaned = data.tabs.filter((t: any) => t.path !== "/" && t.path !== "/index.html" && t.path !== "/index");
      const activeStillExists = cleaned.some((t: any) => t.id === data.activeTabId);
      return { 
        tabs: cleaned, 
        activeTabId: activeStillExists ? data.activeTabId : (cleaned[0]?.id ?? "") 
      };
    }
  } catch {}
  return null;
}
```

Isso garante que mesmo com dados antigos no sessionStorage, a aba `"/"` nunca será restaurada. Nenhuma outra aba é afetada.

