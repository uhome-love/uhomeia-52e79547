-- Fix playbook trigger: ensure hora_vencimento receives proper TIME value
CREATE OR REPLACE FUNCTION public.trg_pipeline_playbook_on_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  pb RECORD;
  task RECORD;
  new_stage_tipo text;
BEGIN
  IF OLD.stage_id = NEW.stage_id THEN
    RETURN NEW;
  END IF;

  SELECT tipo INTO new_stage_tipo FROM public.pipeline_stages WHERE id = NEW.stage_id;
  IF new_stage_tipo IS NULL THEN
    RETURN NEW;
  END IF;

  FOR pb IN
    SELECT id FROM public.pipeline_playbooks
    WHERE stage_gatilho_tipo = new_stage_tipo AND ativo = true
  LOOP
    FOR task IN
      SELECT * FROM public.pipeline_playbook_tarefas WHERE playbook_id = pb.id ORDER BY ordem
    LOOP
      INSERT INTO public.pipeline_tarefas (
        pipeline_lead_id, titulo, tipo, prioridade, status,
        vence_em, hora_vencimento, created_by, responsavel_id
      ) VALUES (
        NEW.id,
        task.titulo,
        task.tipo,
        task.prioridade,
        'pendente',
        (CURRENT_DATE + task.dias_offset),
        CASE
          WHEN task.hora_sugerida IS NULL OR btrim(task.hora_sugerida) = '' THEN NULL
          WHEN btrim(task.hora_sugerida) ~ '^\d{1,2}:\d{2}(:\d{2})?$' THEN btrim(task.hora_sugerida)::time
          ELSE NULL
        END,
        COALESCE(NEW.corretor_id, NEW.created_by),
        NEW.corretor_id
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Tighten manager insert rule for visitas: only self or active team member
DROP POLICY IF EXISTS "Gestores can insert team visitas" ON public.visitas;
CREATE POLICY "Gestores can insert team visitas"
ON public.visitas
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'gestor'::app_role)
    AND gerente_id = auth.uid()
    AND (
      corretor_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        WHERE tm.gerente_id = auth.uid()
          AND tm.user_id = corretor_id
          AND tm.status = 'ativo'
      )
    )
  )
);