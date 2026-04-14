

# Plano: Edge Function `evolution-webhook`

## Arquivo

`supabase/functions/evolution-webhook/index.ts`

## Configuração

Adicionar em `supabase/config.toml`:
```toml
[functions.evolution-webhook]
verify_jwt = false
```

## Lógica

```text
POST payload (Evolution API v2)
  │
  ├─ Filtrar: ignorar @g.us, status@broadcast, body vazio
  │
  ├─ Extrair número de data.key.remoteJid (remover @s.whatsapp.net)
  │
  ├─ Normalizar: remover +, espaços, traços → formato 55DDNNNNNNNNN
  │   Gerar variantes: com/sem 9 do celular
  │
  ├─ Buscar pipeline_leads WHERE telefone ILIKE '%{variante}%'
  │   └─ Não encontrou → return 200 OK (ignorar)
  │
  ├─ Buscar corretor_id em whatsapp_instancias WHERE instance_name = payload.instance
  │
  ├─ Inserir em whatsapp_mensagens:
  │   - lead_id, corretor_id, instance_name
  │   - direction: fromMe ? 'sent' : 'received'
  │   - body: conversation || extendedTextMessage.text
  │   - whatsapp_message_id: data.key.id
  │   - timestamp: unix → ISO
  │
  └─ Atualizar pipeline_leads.updated_at = now()
```

## Campos extraídos do payload

| Campo Evolution | Destino |
|---|---|
| `instance` | `instance_name` |
| `data.key.id` | `whatsapp_message_id` |
| `data.key.fromMe` | `direction` (true→sent, false→received) |
| `data.message.conversation` OU `data.message.extendedTextMessage.text` | `body` |
| `data.messageTimestamp` | `timestamp` (unix→ISO) |
| `data.key.remoteJid` | número do contato (após limpeza) |

## Normalização de telefone

```text
remoteJid: "5511999887766@s.whatsapp.net"
  → strip @s.whatsapp.net → "5511999887766"
  → remover +, espaços, traços
  → variantes: ["5511999887766", "551199887766"] (com/sem 9)
  → buscar: telefone ILIKE '%99887766%' (últimos 8 dígitos)
```

## Supabase client

Service role key para bypass RLS em todas as operações.

## O que NÃO será alterado

- Nenhuma tabela existente
- Nenhuma edge function existente (whatsapp-webhook permanece intacta)

## Entrega

1. Criar `supabase/functions/evolution-webhook/index.ts`
2. Adicionar config no `config.toml`
3. Deploy automático

