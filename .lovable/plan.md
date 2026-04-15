

# Plano: 4 Melhorias — Sidebar, Modal Lead, Kanban Badge, Toast Global

## 1. Sidebar — Mover "WhatsApp Inbox" + Badge dinâmico

**Arquivo**: `src/components/layout/Sidebar.tsx`

**Alterações**:
- **Admin** (linha 107): Remover "WhatsApp Inbox" da seção "Ferramentas" e adicionar na seção "Principal" (após "Relatório semanal")
- **Corretor** (linha 202): Remover "WhatsApp Inbox" da seção "Ferramentas" e adicionar na seção "Principal" (após "Aceite de leads", linha 164)
- O badge dinâmico já existe (linhas 284-308, lê `localStorage` e escuta `storage` event, renderiza badge vermelho). Apenas garantir que o `> 9` → `"9+"` está implementado no render (linha 433-438). Atualmente mostra o número direto — adicionar `whatsappUnread > 9 ? "9+" : whatsappUnread` na injeção do badge (linha 306).

## 2. "Ver ficha completa" — Modal overlay no Inbox

**Arquivos**: `src/pages/WhatsAppInbox.tsx`, `src/components/whatsapp/LeadPanel.tsx`

O `PipelineLeadDetail` é um Sheet (drawer) que recebe `lead` (objeto completo `PipelineLead`), `stages`, `segmentos`, etc. Para reutilizá-lo no WhatsApp Inbox:

**WhatsAppInbox.tsx**:
- Adicionar state `modalLeadId: string | null`
- Quando `modalLeadId` está definido, buscar o lead completo + stages + segmentos via queries rápidas
- Renderizar `PipelineLeadDetail` com `open={!!modalLeadId}` e `onOpenChange` para fechar
- Passar `onOpenFullModal={(id) => setModalLeadId(id)}` ao `LeadPanel` (substituindo o `navigate`)

**LeadPanel.tsx**: Nenhuma alteração necessária — já chama `onOpenFullModal(localLead.id)`.

## 3. Kanban — Badge WhatsApp não respondido

**Arquivos**: `src/components/pipeline/PipelineBoard.tsx`, `src/components/pipeline/PipelineCard.tsx`

**PipelineBoard.tsx** — Adicionar query batch (padrão igual `tarefasMap`):
- `useQuery` que busca todos os `lead_id` com última mensagem `direction='received'` em `whatsapp_mensagens` para os `leadIds` visíveis
- Retorna `Set<string>` de leads com mensagem não respondida
- Passa `hasUnreadWhatsApp={whatsappUnreadSet.has(lead.id)}` ao `PipelineCard`

**PipelineCard.tsx**:
- Adicionar prop `hasUnreadWhatsApp?: boolean`
- Quando `true`: renderizar ícone `MessageSquare` (12px, cor `#25D366`) no canto superior direito do card
- Tooltip "Mensagem não respondida"
- Click no ícone: `navigate('/whatsapp?lead=' + lead.id)` com `e.stopPropagation()`

## 4. Toast global de mensagem recebida

**Arquivos**: `src/hooks/useWhatsAppNotifications.ts` (novo), `src/components/AppLayout.tsx`

**useWhatsAppNotifications.ts**:
- Busca `profileId` do usuário logado (query `profiles` por `user_id`)
- Subscribe em `whatsapp_mensagens` via Supabase Realtime (canal separado do Inbox)
- Filtra: `direction === 'received'` + `corretor_id === profileId`
- Verifica `document.visibilityState === 'visible'` (se não visível, o browser notification já cobre)
- Verifica que não estamos na rota `/whatsapp` (para não duplicar com o Inbox)
- Busca nome do lead em `pipeline_leads`
- Exibe toast via `sonner`:
  ```ts
  toast(leadName, {
    description: preview.slice(0, 50),
    duration: 5000,
    action: { label: "Responder", onClick: () => navigate('/whatsapp?lead=' + leadId) }
  })
  ```

**AppLayout.tsx**:
- Importar e chamar `useWhatsAppNotifications()` dentro do componente (linha ~86)

## Resumo de arquivos

| Arquivo | Tipo |
|---|---|
| `src/components/layout/Sidebar.tsx` | Editar |
| `src/pages/WhatsAppInbox.tsx` | Editar |
| `src/components/pipeline/PipelineBoard.tsx` | Editar |
| `src/components/pipeline/PipelineCard.tsx` | Editar |
| `src/hooks/useWhatsAppNotifications.ts` | Criar |
| `src/components/AppLayout.tsx` | Editar |

Nenhuma alteração em Edge Functions, tabelas ou migrações SQL.

