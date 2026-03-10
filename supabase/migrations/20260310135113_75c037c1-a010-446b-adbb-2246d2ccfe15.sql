-- Update Ana Paula's cargo to backoffice
UPDATE public.profiles SET cargo = 'backoffice' WHERE user_id = '8b99a583-67fa-4d80-9e9b-20e779d5e3a4';

-- Also update RLS to let any authenticated user manage their own tarefas
DROP POLICY IF EXISTS "admin_backoffice_full_access" ON public.tarefas;

CREATE POLICY "users_manage_own_tarefas" ON public.tarefas
  FOR ALL TO authenticated
  USING (
    criado_por IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR responsavel_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND cargo IN ('admin', 'backoffice'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid())
  );