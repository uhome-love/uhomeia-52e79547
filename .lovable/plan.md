
Diagnóstico confirmado

- O problema não é “falta de corretor na roleta”.
- Hoje existem corretores aprovados e ativos na roleta da manhã em todos os segmentos usados pelos leads pendentes, inclusive:
  - Médio-Alto Padrão: 13 entradas ativas
  - MCMV: 4
  - Altíssimo Padrão: 4
  - Investimento: 7
- O erro recorrente acontece porque o motor atual trata vários cenários diferentes como o mesmo retorno genérico `no_broker_available`.
- Além disso, alguns leads da Fila CEO já passaram por timeout/rejeição, e a RPC bloqueia redistribuição para qualquer corretor que já tenha tido aquele lead. Quando o pool elegível se esgota, o lead fica preso na fila mesmo com corretores ativos.
- Há também risco estrutural porque a lógica de elegibilidade está duplicada entre trigger automático e RPC manual.

Plano de correção definitiva

1. Centralizar a seleção de corretor em uma única função do banco
- Criar uma função interna única para montar a lista de elegíveis da roleta.
- Essa função será usada tanto por:
  - `trg_auto_distribute_lead`
  - `distribuir_lead_atomico`
- Assim eliminamos divergência futura entre distribuição automática e disparo manual do CEO.

2. Separar corretamente os motivos de falha
- A RPC deixará de retornar apenas `no_broker_available`.
- Ela passará a distinguir, por exemplo:
  - sem fila ativa na janela
  - sem segmento compatível
  - todos os corretores do segmento já bloquearam esse lead por timeout/rejeição
  - sem corretor online/disponível
  - lead geral sem nenhum corretor ativo na janela
- Isso corrige o diagnóstico falso de “não há corretores na manhã”.

3. Criar fallback real para disparo forçado da Fila CEO
- Quando `p_force = true`, o fluxo será:
  1. tentar distribuição normal respeitando segmento e bloqueios
  2. se o lead for geral (`origens_gerais`, `ignorar_segmento`, ou sem empreendimento válido), distribuir para qualquer corretor ativo da janela
  3. se ainda falhar porque todos já tiveram timeout/rejeição, permitir redistribuição forçada controlada para leads presos na Fila CEO, evitando apenas o corretor mais recente/imediato
- Isso evita que o lead fique eternamente travado por histórico antigo.

4. Preservar a regra de proteção sem deixar lead morrer na fila
- O bloqueio por timeout/rejeição continuará existindo como primeira regra.
- A diferença é que, no disparo manual do CEO, haverá uma “última camada de recuperação” para leads encalhados.
- Essa camada será auditada separadamente para rastrear quando o sistema precisou reaproveitar um lead.

5. Melhorar a edge function de batch
- Atualizar `supabase/functions/distribute-lead/index.ts` para:
  - agrupar falhas por motivo real
  - gravar contexto detalhado em auditoria/ops
  - retornar resumo útil para a UI
- Exemplo de retorno:
  - `dispatched`
  - `failed`
  - `failed_by_reason`
  - `force_recovered`

6. Corrigir a mensagem da interface do CEO
- Atualizar `src/components/pipeline/FilaCeoDispatchModal.tsx` para não mostrar mais:
  - “Verifique se há corretores ativos no modo manhã”
  quando isso não for verdade.
- Mostrar mensagem precisa, por exemplo:
  - “8 distribuídos, 4 ficaram sem elegíveis porque já passaram por todos os corretores do segmento”
  - “2 leads sem mapeamento válido de segmento”
- Isso evita novo falso alarme operacional.

7. Reprocessar a fila atual após a correção
- Depois da lógica nova entrar, reexecutar o dispatch da Fila CEO para destravar os leads já presos.
- Se algum lead continuar falhando, ele já aparecerá com motivo exato, sem ambiguidade.

Arquivos/áreas a ajustar

- `supabase/migrations/...`
  - nova função compartilhada de elegibilidade/seleção
  - refactor de `distribuir_lead_atomico`
  - refactor de `trg_auto_distribute_lead`
- `supabase/functions/distribute-lead/index.ts`
  - agregação de motivos e resposta detalhada
- `src/components/pipeline/FilaCeoDispatchModal.tsx`
  - mensagens corretas de sucesso/falha
- Opcionalmente a tela da roleta/observabilidade
  - para exibir por que leads ficaram retidos

Detalhes técnicos

- Manter uso de `profiles.user_id` como ID final do corretor no `pipeline_leads.corretor_id`.
- Manter round-robin com `roleta_fila.ultima_distribuicao_at`.
- Não remover a exclusão por timeout/rejeição; apenas criar fallback controlado no fluxo forçado do CEO.
- Tratar como “lead geral” os casos já previstos:
  - origem em `origens_gerais`
  - campanha com `ignorar_segmento = true`
  - empreendimento vazio/indefinido

Resultado esperado

- Leads da Fila CEO não ficarão mais presos com mensagem falsa de “sem corretor”.
- Distribuição automática e manual passarão a usar a mesma regra.
- Leads antigos com timeout/rejeição deixarão de ficar eternamente encalhados.
- O CEO verá o motivo real de cada falha quando houver exceção operacional de verdade.
