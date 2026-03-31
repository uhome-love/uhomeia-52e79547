

# Central de Nutrição — Fazer Funcionar 100%

## Diagnóstico: O Que Está Quebrado/Faltando

Após análise completa do código, identifiquei **6 gaps críticos** que impedem o sistema de funcionar:

### Gap 1: Nenhum cron job agenda os motores de nutrição
As Edge Functions `cron-nurturing-sequencer` e `reactivate-cold-leads` existem mas **nenhum cron job as invoca**. Elas nunca executam automaticamente.

### Gap 2: Webhooks não alimentam o orquestrador
O `nurturing-orchestrator` existe mas **nenhum webhook o chama**. O `whatsapp-webhook`, `mailgun-webhook` e `site-events` não enviam eventos para o orquestrador. O scoring de leads nunca é atualizado.

### Gap 3: O `elevenlabs-webhook` não atualiza `voice_call_logs`
Quando uma ligação termina, o webhook processa e registra em `ai_calls`, mas não atualiza `voice_call_logs` nem `voice_campaigns` com resultados (atendidas, interessados, etc).

### Gap 4: Templates WhatsApp podem não existir na Meta
Os templates referenciados (`reativacao_vitrine`, `ultima_chance`, `condicoes_especiais`) precisam existir na Meta Business Manager. Se não existirem, os disparos falham silenciosamente.

### Gap 5: E-mail pode não estar configurado
O sequencer usa Mailgun mas não há validação visual de que Mailgun está configurado. Emails falham sem feedback ao CEO.

### Gap 6: Dashboard mostra dados mas não tem ações operacionais
Falta: botão para executar manualmente o sequencer, botão para rodar reativação agora, status dos crons, e indicadores de saúde (secrets configurados, templates válidos).

---

## Plano de Implementação (5 Blocos)

### Bloco 1 — Agendar Cron Jobs (Fundação)

Criar migration SQL com `cron.schedule` para:
- `cron-nurturing-sequencer`: a cada 15 minutos (processa steps pendentes)
- `reactivate-cold-leads`: domingo 01:00 UTC (22:00 BRT) semanalmente

### Bloco 2 — Conectar Webhooks ao Orquestrador

Editar 3 Edge Functions para chamar `nurturing-orchestrator` quando eventos relevantes ocorrem:

- **`whatsapp-webhook`**: Quando msg é lida (`status: read`) → enviar `whatsapp_lido`. Quando lead responde → enviar `whatsapp_respondeu`.
- **`elevenlabs-webhook`**: Quando ligação termina → enviar `voz_atendida` ou `voz_nao_atendeu` + atualizar `voice_call_logs` e `voice_campaigns` com contadores.
- **`site-events`**: Quando vitrine é visualizada → enviar `vitrine_visualizada`. Quando imóvel é clicado → enviar `imovel_clicado`.

### Bloco 3 — Dashboard Operacional com Saúde do Sistema

Expandir a aba "Visão Geral" do `NurturingDashboard` com:
- **Health Check**: Indicadores visuais de secrets configurados (WhatsApp token, Mailgun key, ElevenLabs key)
- **Botão "Executar Agora"**: Chama `cron-nurturing-sequencer` manualmente
- **Botão "Reativar Base Agora"**: Chama `reactivate-cold-leads` manualmente
- **Último cron run**: Mostra timestamp da última execução (via `ops_events`)
- **Score Leaderboard**: Top 10 leads por score com ação "Ver Lead"

### Bloco 4 — IA no Orquestrador: Decisão Inteligente

Atualizar `nurturing-orchestrator` para usar Lovable AI quando o score muda:
- Quando lead atinge score 30+ → chamar AI para gerar mensagem personalizada de follow-up baseada no histórico
- Quando lead descartado interagiu → AI analisa contexto e sugere melhor abordagem (WA, email, voz)
- Registrar sugestão da IA na timeline do lead

### Bloco 5 — Fallback Entre Canais + Validação de Templates

Atualizar `cron-nurturing-sequencer`:
- Se WhatsApp falha (template inválido/não aprovado) → criar step de email como fallback automático
- Se email falha (sem email válido) → criar notificação ao corretor
- Adicionar validação prévia: verificar se `WHATSAPP_ACCESS_TOKEN` e `MAILGUN_API_KEY` existem antes de tentar, com log claro

---

## Resumo de Arquivos

| Ação | Arquivo |
|------|---------|
| Migration (cron jobs) | Nova migration SQL |
| Editar | `supabase/functions/whatsapp-webhook/index.ts` (add orchestrator call) |
| Editar | `supabase/functions/elevenlabs-webhook/index.ts` (add orchestrator + voice_call_logs) |
| Editar | `supabase/functions/site-events/index.ts` (add orchestrator call) |
| Editar | `supabase/functions/nurturing-orchestrator/index.ts` (add AI decision) |
| Editar | `supabase/functions/cron-nurturing-sequencer/index.ts` (add fall