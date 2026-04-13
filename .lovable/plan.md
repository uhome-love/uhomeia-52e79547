

# Deletar 16 Edge Functions Obsoletas

## Funções a deletar

| # | Função | Motivo |
|---|--------|--------|
| 1 | `jetimob-sync` | Desativado desde 12/03 |
| 2 | `sync-jetimob-properties` | Sem referências |
| 3 | `teste-nurturing-real` | Teste |
| 4 | `teste-whatsapp-template` | Teste |
| 5 | `dev-ai-chat` | Desenvolvimento |
| 6 | `import-brevo-csv` | One-time, já executado |
| 7 | `import-brevo-contacts` | One-time, já executado |
| 8 | `extract-doc-data` | Sem referências |
| 9 | `cron-nurturing-sequencer` | Desativado |
| 10 | `cron-smart-nurturing` | Desativado |
| 11 | `reactivate-cold-leads` | Desativado |
| 12 | `webhook-360dialog` | Duplicado |
| 13 | `busca-ia` | Substituído |
| 14 | `execute-automations` | Não utilizado |
| 15 | `execute-sequences` | Não utilizado |
| 16 | `homi-alerts-engine` | Não utilizado |

## Ações

1. **Deletar os 16 diretórios** em `supabase/functions/`
2. **Remover os deploys** via ferramenta de deleção de edge functions
3. **Limpar referência no frontend**: remover o botão `handleAutoResolve` em `BulkEmpreendimentoAssign.tsx` que chama `jetimob-sync`

Nenhuma funcionalidade ativa será afetada. O `jetimob-proxy` permanece intacto.

