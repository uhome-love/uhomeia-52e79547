

# Plano: Edge Function `homi-copilot`

## Observação importante

Não existe `GEMINI_API_KEY` nos secrets do projeto. Porém o projeto já possui `LOVABLE_API_KEY` e o módulo `_shared/ai-helpers.ts` que acessa `google/gemini-2.5-flash` via Lovable AI Gateway. Vou usar essa infraestrutura existente em vez de chamada direta à API do Google — mesmo modelo Gemini, sem necessidade de nova secret.

## Arquivo novo

`supabase/functions/homi-copilot/index.ts`

### Fluxo

1. Validar JWT via `getClaims()` (verify_jwt = false no config, validação em código)
2. Receber `{ lead_id, ultima_mensagem }` do body
3. Query paralela:
   - `whatsapp_mensagens` WHERE lead_id, ORDER BY timestamp DESC LIMIT 15
   - `pipeline_leads` JOIN `pipeline_stages` para nome, etapa, empreendimento, orcamento
4. Formatar histórico como `[HH:mm] Corretor/Lead: msg`
5. Chamar `callAI()` de `_shared/ai-helpers.ts` com o prompt HOMI (model: `google/gemini-2.5-flash`)
6. `JSON.parse` da resposta → retornar ao frontend

### Prompt

Exatamente o prompt fornecido no requisito, com campos interpolados (nome, etapa, empreendimento, orcamento, historico, ultima_mensagem).

### Resposta

```json
{
  "sugestao_resposta": "...",
  "briefing": "...",
  "tom_detectado": "interessado|hesitante|frio|pronto",
  "sugestao_followup": "..." | null,
  "sugestao_etapa": "..." | null
}
```

## Config

Adicionar em `supabase/config.toml`:
```toml
[functions.homi-copilot]
verify_jwt = false
```

## O que NÃO será alterado

- Nenhuma edge function existente
- Nenhuma tabela
- `_shared/ai-helpers.ts` e `_shared/cors.ts` (apenas importados)

| Arquivo | Ação |
|---|---|
| `supabase/functions/homi-copilot/index.ts` | Criar |
| `supabase/config.toml` | Adicionar bloco |

