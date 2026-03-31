

# Central de Nutrição — Fluxo Completo com Regra de 24h, Reativação via Roleta e Correção de Bugs

## Problemas Identificados

### 1. Regra de 24h do WhatsApp não é respeitada
O sistema envia templates mas **não rastreia a janela de 24h** quando o lead responde. Após resposta, o Meta permite mensagens livres por 24h, mas o sistema nunca aproveita isso — continua tentando templates sempre.

### 2. Lead da Oferta Ativa que responde NÃO entra na roleta
O `whatsapp-webhook` só processa leads que têm `pipeline_lead_id` via `whatsapp_campaign_sends`. Quando um lead da oferta ativa (que não tem `pipeline_lead_id`) responde ao WhatsApp de nutrição, ele é salvo em `whatsapp_respostas` mas **ninguém é notificado e ele não volta pela roleta**.

### 3. Automações não disparam WhatsApp real
O `execute-automations` tem `case "whatsapp"` que apenas faz `push("whatsapp")` — **nunca envia nada**. É um placeholder.

### 4. Templates Meta podem não existir
Os templates `reativacao_vitrine`, `ultima_chance`, `condicoes_especiais` são referenciados no código mas podem não existir na Meta. Falhas silenciosas.

### 5. Dashboard não mostra dados de resposta/leitura do WhatsApp
`channelPerf.whatsapp` sempre mostra `lidos: 0, respondidos: 0` — nunca consulta `whatsapp_campaign_sends` para esses dados.

### 6. Leads do pipeline que respondem não registram janela de 24h
Quando um lead do pipeline responde, o corretor é notificado mas **não há indicação visual de que pode enviar mensagem livre** agora.

---

## Plano de Implementação

### Bloco 1 — Janela de 24h: Rastrear e Usar

**Migration**: Adicionar campo `conversation_window_until` (timestamp) na tabela `pipeline_leads` — marca até quando mensagens livres são permitidas.

**Atualizar `whatsapp-webhook`**:
- Quando lead responde → setar `conversation_window_until = NOW() + 24h` no `pipeline_leads`
- Incluir flag na notificação ao corretor: "✅ Janela 24h aberta — pode enviar mensagem livre"

**Atualizar `cron-nurturing-sequencer`**:
- Antes de enviar template WA, checar se `conversation_window_until > NOW()`
- Se sim → enviar mensagem de texto livre (personalizada) em vez de template
- Se não → enviar template normalmente

**Atualizar `nurturing-orchestrator`**:
- Quando `whatsapp_respondeu` → setar `conversation_window_until` no lead
- Gerar via IA uma mensagem de follow-up personalizada para o corretor enviar

### Bloco 2 — Lead da Oferta Ativa Responde → Roleta

**Atualizar `whatsapp-webhook`**:
- Quando uma resposta chega e NÃO encontra `pipeline_lead_id` via `whatsapp_campaign_sends`:
  1. Buscar pelo telefone em `pipeline_leads` (normalizado)
  2. Se encontrar → notificar corretor + atualizar timeline + abrir janela 24h
  3. Se NÃO encontrar em `pipeline_leads`, buscar em `oferta_ativa_leads`
  4. Se encontrar em oferta ativa → criar `pipeline_lead` novo + chamar `distribute-lead` (roleta)
  5. Marcar no lead: `origem = "reativacao_nutricao"`, registrar na timeline
  6. Se não encontrar em nenhum lugar → criar lead novo e enviar para roleta

### Bloco 3 — Automações Disparam WhatsApp Real

**Atualizar `execute-automations`**:
- No `case "whatsapp"`: chamar `whatsapp-send` via fetch interno
- Checar `conversation_window_until` do lead:
  - Se janela aberta → enviar mensagem de texto livre (action.message com placeholders)
  - Se janela fechada → enviar via template (usar template padrão ou o especificado na action)
- Registrar envio na timeline do lead

### Bloco 4 — Dashboard: Dados Reais + Métricas de Resposta

**Atualizar `NurturingDashboard.tsx`**:
- Consultar `whatsapp_campaign_sends` para contar `status_envio = 'read'` e `status_envio = 'replied'` nos últimos 30d
- Consultar `whatsapp_respostas` para total de respostas recebidas
- Mostrar taxa de leitura e taxa de resposta por canal
- Adicionar card "Leads com janela 24h aberta" (conversation_window_until > NOW)

### Bloco 5 — Validação de Templates + Gestão

**Criar componente `WhatsAppTemplatesManager`** na Central de Nutrição:
- Lista os template_names usados pelo sistema (reativacao_vitrine, ultima_chance, etc.)
- Botão "Testar template" que chama `teste-whatsapp-template` para validar se existe na Meta
- Status visual: ✅ Aprovado, ⏳ Pendente, ❌ Não encontrado
- Instruções claras de quais templates criar na Meta Business Manager com os parâmetros corretos

**Atualizar `cron-nurturing-sequencer`**:
- Antes de enviar WA, se template falha com erro 132012 (template not found) → logar erro claro em `ops_events` com nome do template + ação necessária

### Bloco 6 — Bug Fixes Gerais

1. **`channelPerf` mostra zeros**: Corrigir query para consultar dados reais de leitura/resposta
2. **Orchestrator event `whatsapp_entregue` enviado para email**: No sequencer, linha 219 envia `whatsapp_entregue` quando é email — corrigir para `email_enviado`
3. **Score 0-4 bloqueia WA mas não tenta email fallback**: Quando score baixo bloqueia WA, criar step de email automático se lead tem email
4. **`loadLogs` query problemática**: O filtro `.or()` com datas pode trazer resultados inesperados — simplificar
5. **Pause/Resume destrutivo**: O botão "Pausar tudo" cancela permanentemente em vez de pausar — implementar status `pausado` reversível

---

## Resumo de Arquivos

| Ação | Arquivo |
|------|---------|
| Migration | `conversation_window_until` em pipeline_leads |
| Editar | `supabase/functions/whatsapp-webhook/index.ts` (janela 24h + oferta ativa → roleta) |
| Editar | `supabase/functions/cron-nurturing-sequencer/index.ts` (usar janela 24h + fix event type) |
| Editar | `supabase/functions/execute-automations/index.ts` (WA real via whatsapp-send) |
| Editar | `supabase/functions/nurturing-orchestrator/index.ts` (setar janela 24h) |
| Editar | `src/components/automations/NurturingDashboard.tsx` (dados reais + bug fixes) |
| Criar | `src/components/central-nutricao/WhatsAppTemplatesManager.tsx` |
| Editar | `src/pages/CentralNutricaoPage.tsx` (adicionar aba ou seção de templates) |

## Ordem de Execução

Bloco 1 (migration + janela 24h) → Bloco 2 (oferta ativa → roleta) → Bloco 3 (automações WA real) → Bloco 4 (dashboard) → Bloco 5 (templates) → Bloco 6 (bug fixes)

