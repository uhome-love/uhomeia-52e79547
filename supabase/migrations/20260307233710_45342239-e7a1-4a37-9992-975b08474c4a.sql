
DROP POLICY "System can insert logs" ON public.automation_logs;

CREATE POLICY "Gestores can insert own automation logs"
  ON public.automation_logs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.automations a
    WHERE a.id = automation_logs.automation_id
    AND (a.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  ));
