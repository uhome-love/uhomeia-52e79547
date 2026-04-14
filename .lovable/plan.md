

# Plano: Reformular ConversationList com 3 grupos

## Visão geral

Transformar a lista lateral de conversas em uma lista inteligente com 3 seções: conversas ativas (com SLA), follow-up sugerido e novos leads. A lógica de dados será movida para `WhatsAppInbox.tsx` (que já carrega conversas) e passada via props.

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/pages/WhatsAppInbox.tsx` | Adicionar queries para follow-up e novos leads; passar dados ao ConversationList |
| `src/components/whatsapp/ConversationList.tsx` | Reformular UI com 3 grupos, tabs de filtro, SLA badges, cards de follow-up/novos |

**ConversationThread.tsx NÃO será alterado** conforme solicitado.

## Dados e queries

### Grupo 1: Conversas ativas (já existe)
- Dados atuais de `whatsapp_mensagens` agrupados por lead
- **Novo**: adicionar campo `lastReceivedTs` (timestamp da última msg `received` sem resposta posterior) para calcular SLA
- SLA: `> 2h` = badge amarelo, `> 24h` = badge vermelho

### Grupo 2: Follow-up sugerido (nova query em WhatsAppInbox)
```sql
-- pipeline_leads do corretor, sem mensagens WhatsApp, 
-- updated_at > 3 dias, excluindo sem_contato/convertido/descarte
SELECT id, nome, empreendimento, stage_id, updated_at
FROM pipeline_leads
WHERE corretor_id = {userId}  -- auth.uid (pipeline_leads usa auth.uid)
  AND updated_at < now() - interval '3 days'
  AND stage_id NOT IN (
    '2fcba9be-...',  -- Sem Contato
    'a8a1a867-...',  -- Convertido
    '1dd66c25-...'   -- Descarte
  )
  AND id NOT IN (SELECT DISTINCT lead_id FROM whatsapp_mensagens WHERE lead_id IS NOT NULL)
LIMIT 10
```

**Nota importante**: `pipeline_leads.corretor_id` usa `auth.uid()`, diferente de `whatsapp_mensagens` que usa `profiles.id`. As queries respeitarão isso.

### Grupo 3: Novos leads (nova query em WhatsAppInbox)
```sql
SELECT id, nome, empreendimento, created_at
FROM pipeline_leads
WHERE corretor_id = {userId}
  AND stage_id = '2fcba9be-...'  -- Sem Contato
  AND id NOT IN (SELECT DISTINCT lead_id FROM whatsapp_mensagens WHERE lead_id IS NOT NULL)
ORDER BY created_at DESC
LIMIT 5
```

## Estrutura da UI (ConversationList)

### Header atualizado
- Contadores: "3 ativas · 8 follow-up · 5 novos"
- Tabs: Todas | Ativas | Follow-up | Novos (substituem os filtros atuais)
- Campo de busca (filtra dentro de todos os grupos)

### Grupo 1 — Conversas ativas
- Layout atual mantido (avatar, nome, última msg, tempo)
- **Novo badge SLA**: dot amarelo (>2h) ou vermelho (>24h) ao lado do timestamp quando há msg recebida sem resposta

### Grupo 2 — Follow-up sugerido
- Separador: "Follow-up sugerido" com ícone
- Card compacto: avatar, nome, empreendimento, "há X dias sem contato"
- Botão inline "Iniciar conversa →" que chama `onSelect(lead.id)`

### Grupo 3 — Novos leads
- Separador: "Novos leads" com ícone
- Card compacto: avatar, nome, empreendimento, "chegou há X tempo"
- Botão inline "Iniciar conversa →" que chama `onSelect(lead.id)`

### Nova conversa (popover)
- Mantido como está no footer

## Props atualizadas

```typescript
interface ConversationListProps {
  conversations: ConversationItem[];  // com lastReceivedTs adicionado
  followUpLeads: FollowUpLead[];      // novo
  newLeads: NewLead[];                // novo
  selectedLeadId: string | null;
  onSelect: (leadId: string) => void;
  loading: boolean;
  userId?: string | null;
}
```

## SLA — cálculo no ConversationItem

Adicionar campo `lastReceivedTs` ao `ConversationItem`. Em `WhatsAppInbox`, ao agrupar mensagens, verificar se a última msg `received` tem alguma msg `sent` posterior. Se não, guardar o timestamp da `received` como `lastReceivedTs`. A UI calcula a diferença em horas para exibir o badge.

## Limitação conhecida

O HOMI Copilot em threads vazias (primeira abordagem) requer mudança no `ConversationThread.tsx` que está fora do escopo. Ao clicar "Iniciar conversa", a thread abrirá vazia com o campo de texto focado, mas sem sugestão automática do HOMI. Isso pode ser implementado em uma próxima iteração.

