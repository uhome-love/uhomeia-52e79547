

# Plano: Regra de Aproveitamento 48h — "Sem Contato" → Redistribuição Automática

## Problema

538 leads parados na etapa "Sem Contato" (ID: `2fcba9be-1188-4a54-9452-394beefdc330`). Corretores mandam uma mensagem e abandonam o lead. Sem mecanismo de cobrança ou redistribuição automática.

## Solução

Adicionar um motor de varredura que, a cada execução do cron `lead-escalation`, identifica leads na etapa "Sem Contato" há mais de 48h sem atualização (`ultima_acao_at` ou `updated_at`) e os redistribui automaticamente pela roleta.

## Como vai funcionar

1. Lead entra na etapa "Sem Contato"
2. Corretor tem 48h para registrar uma ação (tarefa, ligação, WhatsApp, anotação)
3. Qualquer interação reseta o relógio (`ultima_acao_at` é atualizado)
4. Se 48h passam sem nenhuma ação → lead é desvinculado do corretor e redistribuído pela roleta automaticamente
5. Notificação é enviada ao corretor original ("Lead X foi redistribuído por inatividade") e ao gerente/CEO
6. Histórico é registrado em `pipeline_historico` e `distribuicao_historico`

## Implementação Técnica

### 1. Migração SQL — Nova RPC `reciclar_leads_sem_contato`

Função PL/pgSQL que:
- Busca leads com `stage_id = '2fcba9be-...'` onde `GREATEST(ultima_acao_at, stage_changed_at, updated_at) < NOW() - INTERVAL '48 hours'`
- Para cada lead: limpa `corretor_id`, seta `aceite_status = 'pendente_distribuicao'`, registra em `pipeline_historico` (observação: "Redistribuído por inatividade 48h")
- Registra em `distribuicao_historico` com `acao = 'reciclagem_sem_contato'`
- Retorna quantidade de leads reciclados

### 2. Edge Function `lead-escalation` — Novo bloco

Adicionar entre o bloco 4 (reciclar expirados) e bloco 5 (cleanup locks):
- Chama a RPC `reciclar_leads_sem_contato`
- Para cada lead reciclado, tenta redistribuir via `distribute-lead`
- Envia notificação push + in-app ao corretor original e gerente
- Registra no resultado do cron

### 3. Visibilidade no Frontend

Na página do Pipeline, leads "Sem Contato" com mais de 24h sem ação exibem um badge de alerta visual (amarelo 24h, vermelho 48h) para que o corretor saiba que está prestes a perder o lead.

## Arquivos modificados

| Arquivo | Ação |
|---------|------|
| Migração SQL | **Nova** — RPC `reciclar_leads_sem_contato` |
| `supabase/functions/lead-escalation/index.ts` | Adicionar chamada da RPC + redistribuição + notificações |
| `src/components/pipeline/PipelineLeadCard.tsx` | Badge visual de alerta 24h/48h para etapa "Sem Contato" |

