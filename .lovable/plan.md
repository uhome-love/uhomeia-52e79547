

## Diagnóstico: Push Notifications Não Chegando

### Causa Raiz Identificada

Os logs mostram que **TODAS as chamadas ao `send-push` estão retornando 401 (Unauthorized)**.

O problema: a função `send-push` valida o token via `auth.getClaims()`, mas as funções internas (`distribute-lead`, `lead-escalation`, etc.) chamam `send-push` usando o **service role key** como Bearer token. O service role key NÃO é um JWT de usuário — então `getClaims()` falha e retorna 401. Resultado: nenhuma push notification é enviada.

### Plano de Correção

**1. Corrigir autenticação do `send-push`** (arquivo principal)

Substituir a validação por `getClaims()` por uma lógica dupla:
- Se o Bearer token for o **service role key** → aceitar (chamada server-to-server confiável)
- Se for um JWT de usuário → validar via `auth.getUser()` normalmente

Isso é seguro porque o service role key é um segredo do servidor, nunca exposto ao cliente.

**2. Verificar `vapid-public-key`** — garantir que está retornando a chave corretamente para o frontend se inscrever.

**3. Após a correção** — fornecer o passo a passo de ativação de push para Android e iOS para enviar aos corretores.

### Detalhes Técnicos

```typescript
// Nova lógica de auth no send-push/index.ts
const token = authHeader.replace("Bearer ", "");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Server-to-server calls use the service role key directly
if (token === SERVICE_ROLE_KEY) {
  // Trusted internal call — proceed
} else {
  // User JWT — validate normally
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) return 401;
}
```

Nenhuma tabela ou migração necessária. Apenas correção na Edge Function `send-push`.

