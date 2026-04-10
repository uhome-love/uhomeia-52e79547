

# Auto-distribuição de leads do site via crm-webhook

## O que muda

Adicionar ~10 linhas após o INSERT bem-sucedido de lead novo (linha 292) no `crm-webhook/index.ts`. A chamada ao `distribute-lead` com `action: distribute_single` segue o mesmo padrão de `receive-meta-lead`.

Para leads **existentes** (dedup), não há chamada — o lead já tem corretor ou foi reativado na Fila CEO.

## Mudança exata

**Arquivo**: `supabase/functions/crm-webhook/index.ts`

Após a linha 292 (`console.log` do new lead), inserir:

```typescript
// ── Auto-distribute new lead ──
try {
  const distResp = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/distribute-lead`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ action: 'distribute_single', lead_id: newLead.id }),
    }
  )
  const distResult = await distResp.json()
  console.log(`[crm-webhook] distribute-lead response:`, distResult)
  if (distResult?.corretor_id) {
    existingCorretorId = distResult.corretor_id
  }
} catch (distErr) {
  console.error('[crm-webhook] distribute-lead failed (lead stays in fila_ceo):', distErr)
}
```

## Comportamento

- **Sucesso**: lead entra na roleta geral, corretor recebe notificação
- **Falha**: lead permanece com `pendente_distribuicao` → aparece na Fila CEO como fallback natural
- **Lead existente (dedup)**: sem mudança, fluxo atual mantido
- **Sem segmento**: distribuição geral (todos os corretores ativos na roleta)

## O que NÃO muda

- Zero alteração na lógica de dedup, resolução de imóvel, notificações, sync para `leads`
- Nenhum outro arquivo modificado
- Deploy automático da edge function

