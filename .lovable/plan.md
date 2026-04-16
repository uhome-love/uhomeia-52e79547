

Entendido. A etapa única é **Visita** (id `a857139f-c419-4e37-ae17-5f5e70b21172`, ordem 5) e o status "marcada/agendada" é uma flag dentro de `flag_status`.

Plano revisado abaixo.

## Diagnóstico

Ao agendar visita pela **Agenda de Visitas**, o `useVisitas.createVisita` insere a linha em `visitas` e atualiza apenas `pipeline_leads.modulo_atual = 'agenda'`. Não move o lead para a etapa **Visita** nem grava `flag_status.status_visita = "marcada"`.

Resultado: lead Júlia Braga continua em Aquecimento mesmo com visita agendada para 20/04/2026, e ao arrastar manualmente para Visita o popup pede para agendar de novo.

## Correção

### 1. `src/hooks/useVisitas.ts` — auto-mover + flag

Dentro do bloco `if (data?.pipeline_lead_id) { ... }` (após insert bem-sucedido):

- Buscar o lead atual (`stage_id`, `flag_status`) e o stage atual via join leve com `pipeline_stages` (ordem).
- Definir o `stage_id` da etapa **Visita** = `a857139f-c419-4e37-ae17-5f5e70b21172` (ou buscar dinamicamente por `tipo='visita'` para resiliência).
- **Só mover** se a ordem do stage atual for `< 5` (não regredir Pós-Visita / Negócio Criado / Descarte).
- Atualizar `pipeline_leads`:
  - `stage_id` = etapa Visita (apenas se ordem atual < 5)
  - `flag_status` = `{ ...flag_status, status_visita: "marcada", visita_id: data.id, visita_data: data.data_visita, visita_hora: data.hora_visita }`
  - `modulo_atual: "agenda"` (já existe)
- Inserir registro em `pipeline_atividades` (tipo `mudanca_etapa`, descrição "Visita agendada para DD/MM/YYYY HH:MM") quando houver mudança real de etapa.
- Manter `lead_progressao` como já é hoje.
- `queryClient.invalidateQueries({ queryKey: ["pipeline"] })` (já existe).

### 2. `src/components/pipeline/PipelineStageTransitionPopup.tsx` — não pedir 2x

Quando o destino for a etapa **Visita** (`tipo='visita'`):
- Se `lead.flag_status?.status_visita === "marcada"` **ou** existir visita futura em `visitas` para o `pipeline_lead_id` (`data_visita >= hoje` e `status IN ('marcada','confirmada','reagendada')`) → pular popup, apenas atualizar `stage_id` + manter flag.
- Caso contrário → comportamento atual (abrir `VisitaMarcadaForm`).

### 3. `src/components/pipeline/PipelineBoard.tsx`

Garantir que `lead` completo (com `flag_status`) seja passado para a função de check de skip antes de abrir o popup.

### 4. Verificação visual (3 cenários)

1. Agendar visita pela **Agenda de Visitas** → lead aparece automaticamente na coluna **Visita** com badge `Visita Marcada`.
2. Arrastar lead que já tem visita agendada para Visita → move direto, sem popup.
3. Arrastar lead sem visita para Visita → popup atual continua funcionando.

## Arquivos alterados

- `src/hooks/useVisitas.ts`
- `src/components/pipeline/PipelineStageTransitionPopup.tsx`
- `src/components/pipeline/PipelineBoard.tsx`

Sem migração de banco. Nenhum outro arquivo afetado.

