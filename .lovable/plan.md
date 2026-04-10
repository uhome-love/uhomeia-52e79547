

## Plano: Corrigir Central de Tarefas — mostrar todas tarefas dos leads do corretor

### Problema
Tarefas criadas por gestores para leads de um corretor não aparecem na Central de Tarefas desse corretor. A query atual filtra por `responsavel_id = user.id OR created_by = user.id`, excluindo tarefas criadas por gestores.

### Correções

**1. Migração SQL — Nova RLS policy**

Permitir ao corretor ver qualquer tarefa dos seus próprios leads:
```sql
CREATE POLICY "Corretores can view tasks on their leads"
ON public.pipeline_tarefas FOR SELECT TO authenticated
USING (
  pipeline_lead_id IN (
    SELECT id FROM public.pipeline_leads WHERE corretor_id = auth.uid()
  )
);
```
Isolamento garantido: só vê tarefas de leads onde `corretor_id = auth.uid()`.

**2. Frontend — `src/pages/MinhasTarefas.tsx`**

Alterar a query de tarefas:
- Buscar IDs dos leads do corretor (`pipeline_leads.select("id").eq("corretor_id", user.id)`)
- Buscar tarefas com `pipeline_lead_id.in.(leadIds)` em vez de filtrar por `responsavel_id/created_by`

**3. Frontend — Criação de tarefa seta `responsavel_id` para o dono do lead**

- `CardQuickTaskPopover.tsx`: receber `corretorId` como prop, usar como `responsavel_id`
- `QuickActionMenu.tsx`: receber `corretorId` como prop para callback task
- `usePipelineLeadData.ts`: receber `corretorId` e usar como default no `responsavel_id`

### Segurança
- Corretor só vê tarefas de leads onde ele é o `corretor_id` — nunca vê tarefas de outros corretores
- Gestor/admin continua vendo tudo pelas policies existentes

