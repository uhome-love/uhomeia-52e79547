
Objetivo: corrigir o fluxo de timeout de leads novos para que, ao expirar o aceite, o lead seja redistribuído automaticamente ao próximo corretor elegível da roleta, respeitando segmento quando houver e usando a fila geral quando for lead geral.

1. Diagnóstico do que está acontecendo hoje
- A edge function `supabase/functions/lead-escalation/index.ts` hoje chama `reciclar_leads_expirados()`, mas depois apenas notifica gestão e deixa o lead em `pendente_distribuicao` na Fila do CEO.
- Isso está explícito no código atual: “NO auto-redistribute — CEO dispatches manually”.
- O RPC atual `distribuir_lead_atomico` já aceita `p_exclude_auth_user_id`, mas a versão vigente não exclui corretores que já deram `timeout` nesse lead. Então, mesmo religando a redistribuição, há risco de voltar para quem já expirou.

2. Correção principal do backend
- Atualizar `reciclar_leads_expirados()` para retornar os leads expirados com contexto suficiente para redistribuição e auditoria, em vez de só retornar um contador.
- Para cada lead expirado:
  - registrar `timeout` em `distribuicao_historico`
  - limpar `corretor_id`, `distribuido_em`, `aceite_expira_em`
  - manter o lead apto para redistribuição imediata
- Em seguida, no `lead-escalation`, para cada lead expirado, chamar novamente a distribuição automática.

3. Regra de redistribuição correta
- Lead com segmento:
  - redistribuir para o próximo corretor disponível daquele segmento na roleta
- Lead geral:
  - redistribuir para o próximo corretor disponível da fila geral/roleta ativa
- Nunca redistribuir para o mesmo corretor que acabou de expirar
- Também bloquear corretores que já tiveram `timeout` ou `rejeitado` naquele mesmo lead, evitando loop

4. Ajuste no motor atômico da roleta
- Revisar `public.distribuir_lead_atomico` para restaurar a proteção que existia em versões anteriores:
  - excluir `p_exclude_auth_user_id`
  - excluir corretores com histórico `timeout` ou `rejeitado` para o mesmo `pipeline_lead_id`
- Preservar a lógica atual de round-robin via `roleta_fila.ultima_distribuicao_at`
- Preservar a regra de leads gerais:
  - origens gerais, empreendimento vazio ou campanha marcada para ignorar segmento devem distribuir para todos os elegíveis

5. Ajuste na edge function `lead-escalation`
- Trocar o fluxo atual “manda para CEO” por:
  - recicla lead expirado
  - tenta redistribuir automaticamente via `distribute-lead`
  - só cai para `pendente_distribuicao`/Fila do CEO se realmente não houver próximo corretor elegível
- Manter notificações, mas mudar a mensagem:
  - se redistribuído com sucesso, notificar corretor novo
  - se ninguém elegível, aí sim notificar CEO/gerência que foi para fila manual

6. Observabilidade e segurança operacional
- Melhorar o log do erro atual `Sem Contato recycle RPC failed` para gravar `error.message`, payload e lead afetado, evitando `[object Object]`
- Registrar em `ops_events`:
  - quantidade expirada
  - quantidade redistribuída
  - quantidade sem broker elegível
- Isso facilita ver se a rotação automática voltou a funcionar

7. Validação esperada após implementação
- Caso de timeout de lead novo:
  - corretor A não aceita
  - lead vai para corretor B automaticamente
  - se B também não aceitar, vai para C
  - se acabar a fila elegível, então entra em `pendente_distribuicao`
- Caso de lead geral:
  - segue o próximo da roleta ativa, sem travar em segmento
- Caso de lead segmentado:
  - respeita apenas corretores aptos daquele segmento

Se aprovado, eu implementaria principalmente nestes pontos:
- `supabase/functions/lead-escalation/index.ts`
- nova migration para `reciclar_leads_expirados()`
- nova migration para `distribuir_lead_atomico`

Detalhes técnicos
```text
Fluxo desejado

Lead distribuído
  -> aguardando_aceite (10 min)
  -> expirou?
      -> registrar timeout
      -> limpar vínculo atual
      -> distribuir novamente
          -> achou próximo corretor elegível? entrega automática
          -> não achou? CEO queue
```

Critérios de aceite
- Timeout não pode mais jogar direto para CEO quando ainda existir corretor elegível
- O corretor que deixou expirar não pode receber o mesmo lead de novo nessa rodada
- Leads gerais devem ignorar segmento
- Todos os cálculos de janela continuam em `America/Sao_Paulo`
