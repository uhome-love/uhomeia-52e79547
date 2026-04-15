

# Correção do fluxo WhatsApp — instance_name hardcoded

## Diagnóstico

Os logs confirmam que o envio via Evolution API **já está funcionando** — a última mensagem "🙏🏻" foi entregue com sucesso (messageId: `3EB08EC1FF854A93316840`, status: PENDING).

Porém encontrei um problema no frontend (`ConversationThread.tsx`):

- **Linha 287**: O `instance_name` salvo no banco está hardcoded como `"meta"` — deveria ser o nome da instância Evolution do corretor (ex: `uhome-c7e64e1f`)
- **Linha 368**: Para mídia, está hardcoded como `"media"` — mesmo problema

Isso pode causar inconsistências na filtragem e no histórico de mensagens.

## Plano

### 1. Corrigir `ConversationThread.tsx` — usar instance_name real

- Na resposta do `whatsapp-send`, o backend já retorna `channel: "evolution"`. Preciso verificar se também retorna o `instance_name` — se não, adicionar.
- No frontend, usar o valor retornado em vez do hardcoded `"meta"` / `"media"`

### Mudanças:

**`supabase/functions/whatsapp-send/index.ts`** — adicionar `instance_name` no retorno:
```typescript
return json({
  success: true,
  message_id: messageId,
  phone: cleanPhone,
  channel: "evolution",
  instance_name: instanceName,  // NOVO
});
```

**`supabase/functions/whatsapp-send-media/index.ts`** — mesmo ajuste no retorno

**`src/components/whatsapp/ConversationThread.tsx`**:
- Linha 287: trocar `instance_name: "meta"` por `instance_name: sendResult?.instance_name || "evolution"`
- Linha 368: trocar `instance_name: "media"` por `instance_name: sendResult?.instance_name || "evolution"`

### 2. Testar o fluxo completo

Após o deploy, testaremos envio de texto e mídia para confirmar que:
- A mensagem chega no WhatsApp do cliente
- Aparece corretamente no Inbox do sistema
- O `instance_name` correto é salvo no banco

