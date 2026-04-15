

## Plano: Remover badge e notificações WhatsApp para gestor/admin

### Problema
O CEO/gestor vê um badge laranja "⚠️ 2" no sidebar do WhatsApp Inbox que não é útil — não indica ação clara e confunde. Notificações de mensagem também não fazem sentido para esses perfis.

### Solução
Remover completamente o badge e notificações WhatsApp para perfis gestor e admin. Apenas corretores terão badge e notificações.

### Alterações

**1. `src/components/layout/Sidebar.tsx`**
- Remover toda lógica de `whatsappSLA` (estado, listener, referências)
- Badge WhatsApp só aparece para corretor (usando `whatsappUnread`)
- Para admin/gestor: sem badge no item WhatsApp Inbox

**2. `src/hooks/useWhatsAppSLABadge.ts`**
- Deletar o arquivo inteiro (não será mais usado)

**3. `src/components/AppLayout.tsx`**
- Remover import e chamada de `useWhatsAppSLABadge`

**4. `src/hooks/useWhatsAppNotifications.ts`**
- Já foi corrigido anteriormente para retornar early para gestor/admin (manter como está)

### Resultado
- CEO/gestor: nenhum badge, nenhuma notificação de mensagem no WhatsApp
- Corretor: badge vermelho de mensagens não lidas (comportamento atual mantido)

