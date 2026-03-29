

## Prompt 1 — WhatsAppFocusFlow + Prompt 2 — Tarefa registra atividade

### Resumo

Criar modal de WhatsApp em 2 fases (enviar mensagem → confirmar + tarefa) e adicionar registro de atividade ao salvar tarefa rápida.

### Arquivos

**1. Novo: `src/components/pipeline/WhatsAppFocusFlow.tsx`**

Modal compacto (mesmo padrão do CallFocusOverlay — fixed backdrop + container branco centralizado, max-width 480px, border-radius 16px).

- **Fase 1**: Header com iniciais/nome/telefone/badge da etapa. Lista de mensagens filtradas por `stageTipo` (reutiliza o mesmo mapeamento do StageCoachBar — copia as `messages` por tipo de etapa). Cada mensagem mostra título + preview 2 linhas + botões "Copiar" e "Abrir WhatsApp" (`wa.me/{phone}?text=...`). Ao clicar em qualquer um dos dois:
  - Insere em `pipeline_atividades` `{ pipeline_lead_id, tipo: 'whatsapp', titulo: 'WhatsApp enviado', created_by }`
  - Atualiza `pipeline_leads.ultima_acao_at = now()`
  - Avança para Fase 2
- **Fase 2**: Chip verde "WhatsApp enviado ✓". Textarea observação (opcional). Seção "Próxima tarefa" com chips tipo (WhatsApp default / Ligar / Follow-up), input date (default amanhã), input time (default 10:00). Footer: "Salvar e fechar" (insere `pipeline_tarefas` + `onRefresh()` + fecha) e "Fechar sem tarefa" (fecha direto).

Props: `isOpen, onClose, lead: { id, nome, telefone, empreendimento, stage_id }, stageTipo, onRefresh`

**2. Editar: `src/components/pipeline/PipelineCard.tsx`**
- Adicionar `useState` para `isWhatsAppFlowOpen`
- `handleWhatsApp` → `setIsWhatsAppFlowOpen(true)` (remove abertura do `WhatsAppTemplatesDialog`)
- Renderizar `<WhatsAppFocusFlow>` no bloco de dialogs, passando lead/stage/onRefresh

**3. Editar: `src/components/pipeline/CardQuickTaskPopover.tsx`**
- Após o insert em `pipeline_tarefas` (linha 59-70), adicionar:
  ```ts
  await supabase.from("pipeline_atividades").insert({
    pipeline_lead_id: leadId,
    tipo: "tarefa",
    titulo: `Tarefa criada: ${TIPO_LABELS[type]} — ${obs}`,
    created_by: user.id,
  });
  ```
- Adicionar update de `ultima_acao_at` no mesmo trecho (já atualiza `updated_at` mas não `ultima_acao_at`)

### O que NÃO muda
- CallFocusOverlay, StageCoachBar, QuickActionMenu, hooks, migrations
- Visual do popup de tarefa rápida (apenas adiciona operações no banco)

