

# Correção: Envio WhatsApp via Evolution API (número do corretor)

## Problema
A Edge Function `whatsapp-send` envia **exclusivamente pela Meta Business API** (número da UHome). As mensagens do corretor devem sair pelo **número pessoal dele**, conectado via **Evolution API**. A função precisa ser reescrita para usar Evolution como canal principal.

## Plano

### 1. Reescrever `supabase/functions/whatsapp-send/index.ts`

Lógica nova:
1. Autenticar o usuário (JWT)
2. Buscar `profiles.id` via `profiles.user_id = auth_user.id`
3. Buscar instância Evolution em `whatsapp_instancias` onde `corretor_id = profiles.id` e `status = 'conectado'`
4. **Enviar via Evolution API**: `POST ${EVOLUTION_API_URL}/message/sendText/${instanceName}` com body `{ number, text }`
5. Se não tiver instância conectada, retornar erro claro ("Conecte seu WhatsApp primeiro")
6. Remover toda a lógica Meta Business API (Graph API) desta função

**Importante**: A tabela correta é `whatsapp_instancias` (com "i", não "instances"). O `corretor_id` é o `profiles.id`.

### 2. Corrigir `whatsapp-send-media` (bug silencioso)

A função `whatsapp-send-media` consulta `whatsapp_instances` (tabela que não existe). Corrigir para `whatsapp_instancias` e usar `corretor_id` em vez de `profile_id`. Também remover o fallback Meta API daqui.

### 3. Deploy e validação

- Deploy das duas functions
- Teste de envio de texto via Inbox
- Verificar nos logs se a Evolution API foi chamada

### Detalhes técnicos

```text
whatsapp-send (ANTES):
  Auth → Meta Graph API → envio pelo número UHome

whatsapp-send (DEPOIS):
  Auth → profiles.id → whatsapp_instancias (conectado)
       → Evolution API sendText/{instance} → envio pelo número do corretor
       → Sem instância? → erro 422 "Conecte seu WhatsApp"
```

Secrets necessários (já existentes): `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`

