

# Plano: Sistema de Abas estilo Chrome

## Aviso de Complexidade

Este é o maior refactor arquitetural do projeto. Envolve mudar como **todas** as páginas são montadas e navegadas. Riscos reais:

- **Memória**: Cada aba mantém queries, subscriptions, event listeners ativos
- **Side effects**: `useEffect` de páginas ocultas continuam rodando
- **React Query**: Polling e refetch em abas invisíveis desperdiçam recursos

**Mitigação**: Limite de 8 abas simultâneas. Ao abrir a 9ª, a aba mais antiga (não fixada) é removida. Páginas ocultas usam `display: none` (preserva DOM/estado, mas continua montada).

## Arquitetura

```text
App.tsx
├── BrowserRouter (mantido — URL sempre reflete aba ativa)
├── TabProvider (novo contexto)
│   └── AppLayout.tsx
│       ├── TabBar (nova barra de abas, entre header e main)
│       └── <main> renderiza TODAS as abas abertas
│           ├── <div style={display: activeTab === 'tab1' ? 'block' : 'none'}>
│           │   <PageComponent1 />
│           ├── <div style={display: activeTab === 'tab2' ? 'block' : 'none'}>
│           │   <PageComponent2 />
│           └── ...
```

## Arquivos

| Arquivo | Tipo | Descrição |
|---|---|---|
| `src/contexts/TabContext.tsx` | Criar | Estado de abas, ações (open/close/activate) |
| `src/components/layout/TabBar.tsx` | Criar | Barra visual de abas |
| `src/components/AppLayout.tsx` | Editar | Integrar TabBar + renderizar abas com display toggle |
| `src/App.tsx` | Editar | Envolver com TabProvider, rota catch-all redireciona para aba |
| `src/components/layout/Sidebar.tsx` | Editar | Cliques abrem aba em vez de navegar |
| `src/hooks/useTabNavigation.ts` | Criar | Hook para abrir aba de qualquer lugar |

## Detalhes Técnicos

### 1. TabContext.tsx

```typescript
interface Tab {
  id: string;           // ex: 'pipeline', 'whatsapp', 'home-1713200000'
  label: string;        // "Pipeline"
  icon: string;         // nome do ícone lucide (kebab-case)
  path: string;         // '/pipeline-leads'
  closable: boolean;    // "Minha Rotina" = false (sempre aberta)
  componentKey: string; // chave para mapear ao componente lazy
}

// Estado
tabs: Tab[]
activeTabId: string

// Ações
openTab(tab): se já existe com mesmo path, ativa. Se não, adiciona e ativa. Se > 8, remove a mais antiga closable.
closeTab(id): remove. Se era ativa, ativa a anterior.
activateTab(id): muda activeTabId + navigate(tab.path)
```

Persiste `tabs` e `activeTabId` em `sessionStorage` para sobreviver a reload.

### 2. TabBar.tsx

- Altura fixa 36px, entre header (h-14) e main
- Cada aba: label truncado (max 120px), ícone 14px, botão X (se closable)
- Aba ativa: fundo branco/dark, borda inferior colorida (#4969FF)
- Abas inativas: fundo transparente, texto muted
- Drag to reorder (opcional, fase 2)
- Clique direito: menu "Fechar", "Fechar outras", "Fechar à direita"
- Scroll horizontal quando muitas abas

### 3. AppLayout.tsx — Renderização

Em vez de `{children}` no main, renderizar todas as abas abertas:

```tsx
<main className="flex-1 overflow-hidden min-h-0 relative">
  {tabs.map(tab => (
    <div
      key={tab.id}
      className="absolute inset-0 overflow-y-auto"
      style={{
        display: tab.id === activeTabId ? 'block' : 'none',
        padding: tab.path === '/whatsapp' ? 0 : '16px' // sem padding para whatsapp
      }}
    >
      <ErrorBoundary module={tab.componentKey}>
        <Suspense fallback={<PageLoader />}>
          <TabPageRenderer componentKey={tab.componentKey} />
        </Suspense>
      </ErrorBoundary>
    </div>
  ))}
</main>
```

`TabPageRenderer` mapeia `componentKey` para o componente lazy correspondente usando um registry.

### 4. App.tsx — Routing

As rotas continuam existindo para validação de acesso (ProtectedRoute/RoleProtectedRoute), mas o rendering real é feito pelo TabContext. A rota catch-all redireciona para a aba correspondente se já estiver aberta.

### 5. Sidebar.tsx — Integração

Cliques na sidebar chamam `openTab()` em vez de `navigate()`. O `openTab` internamente faz `navigate()` para manter a URL sincronizada.

### 6. Registry de Componentes

Mapa estático `componentKey → lazy(() => import(...))`:

```typescript
const PAGE_REGISTRY: Record<string, React.LazyExoticComponent<any>> = {
  'home': HomeDashboard,
  'pipeline': PipelineKanban,
  'whatsapp': WhatsAppInbox,
  'tarefas': MinhasTarefas,
  // ... todas as ~60 páginas
};
```

### 7. Aba padrão

Ao fazer login, abre automaticamente a aba "Minha Rotina" (não closable). Corretor abre com `/corretor`, Admin com `/`.

## Limitações e Riscos

1. **Memória**: Páginas com Realtime (WhatsApp, Pipeline) mantêm subscriptions ativas mesmo ocultas — considerar pausar subscriptions em abas inativas (fase 2)
2. **React Query**: Queries em abas ocultas continuam com staleTime/gcTime normais — aceitável com o cache de 2min atual
3. **URL**: Apenas uma URL pode existir no browser — sempre reflete a aba ativa. Refresh recarrega apenas a aba ativa; outras são restauradas do sessionStorage mas precisam re-montar
4. **Deep links**: `/whatsapp?lead=123` abre aba WhatsApp com o param preservado
5. **Páginas com params dinâmicos** (`/academia/trilha/:id`): cada combinação gera uma aba diferente

## Fases

**Fase 1 (este plano)**: TabContext, TabBar, rendering por display:none, sidebar integrada, max 8 abas, sessionStorage persistence.

**Fase 2 (futuro)**: Drag reorder, pause/resume de subscriptions em abas ocultas, atalhos de teclado (Ctrl+W fecha, Ctrl+Tab troca).

