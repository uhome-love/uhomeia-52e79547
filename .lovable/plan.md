

# Plano: Corrigir acesso do Corretor à Oferta Ativa

## Problema
Redirect circular: corretor clica "Oferta Ativa" → vai para `/oferta-ativa` → `OfertaAtiva.tsx` linha 31-32 detecta que é corretor e redireciona de volta para `/corretor`. O mesmo acontece pelo sidebar (`/corretor/call` → redirect para `/oferta-ativa` → redirect para `/corretor`).

## Solução
Restaurar a rota `/corretor/call` para renderizar diretamente o componente `CorretorCall` (a Arena de discagem), e apontar todos os links do corretor para essa rota.

### Alterações

**1. `src/App.tsx` — linha 225**
Trocar o redirect por renderização direta do `CorretorCall`:
```tsx
// De:
<Route path="/corretor/call" element={<Navigate to="/oferta-ativa" replace />} />
// Para:
<Route path="/corretor/call" element={<ProtectedPage><ErrorBoundary module="corretor-call"><CorretorCall /></ErrorBoundary></ProtectedPage>} />
```
Adicionar o lazy import de `CorretorCall` no topo.

**2. `src/pages/CorretorDashboard.tsx` — linha 171**
Trocar o `navigate("/oferta-ativa")` por `navigate("/corretor/call")` no botão "CALL / Oferta Ativa".

**3. Sidebar** — manter `/corretor/call` no sidebar do corretor (já está correto na linha 529 do `AppSidebar.tsx`). Verificar no `Sidebar.tsx` se o corretor aponta para `/oferta-ativa` e corrigir para `/corretor/call`.

## Risco
Zero. A rota `/oferta-ativa` continua existindo para gestores e admins. O corretor passa a usar `/corretor/call` que já tem o componente Arena completo.

