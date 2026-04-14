

# Plano: Configurar webhook automaticamente no action="create"

## Alteração

Arquivo: `supabase/functions/whatsapp-connect/index.ts`

Dentro do bloco `if (!existing)`, **após** o insert em `whatsapp_instancias` (linha 96), adicionar chamada para configurar o webhook da Evolution API:

```typescript
// Configure webhook (non-blocking)
try {
  const webhookRes = await fetch(`${EVOLUTION_URL}/webhook/set/${instanceName}`, {
    method: "POST",
    headers: evoHeaders,
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: `${supabaseUrl}/functions/v1/evolution-webhook`,
        webhookByEvents: false,
        byEvents: false,
        base64: false,
        events: ["MESSAGES_UPSERT"],
      },
    }),
  });
  if (!webhookRes.ok) {
    console.error("Evolution webhook set error:", await webhookRes.text());
  }
} catch (whErr) {
  console.error("Evolution webhook set exception:", whErr);
}
```

## Regras respeitadas

- Executa **somente** quando a instância é recém-criada (`!existing`)
- Erro no webhook é logado mas **não bloqueia** o fluxo
- `supabaseUrl` já está disponível na variável declarada na linha 15
- Nenhuma outra action, função ou tabela é alterada

## Entrega

| Arquivo | Ação |
|---|---|
| `supabase/functions/whatsapp-connect/index.ts` | Editar (adicionar ~15 linhas no bloco create) |

