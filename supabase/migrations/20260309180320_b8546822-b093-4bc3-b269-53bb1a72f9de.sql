-- Add tipo and hora_vencimento columns to pipeline_tarefas
ALTER TABLE public.pipeline_tarefas ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'follow_up';
ALTER TABLE public.pipeline_tarefas ADD COLUMN IF NOT EXISTS hora_vencimento TIME DEFAULT NULL;

-- Add DELETE policy for corretores
CREATE POLICY "Corretores can delete own tarefas" ON public.pipeline_tarefas FOR DELETE TO authenticated USING (created_by = auth.uid() OR responsavel_id = auth.uid());