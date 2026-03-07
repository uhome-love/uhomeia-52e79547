
-- Fix overly permissive RLS policies
DROP POLICY IF EXISTS "Authenticated can manage lead sequences" ON public.pipeline_lead_sequencias;
DROP POLICY IF EXISTS "Authenticated can update lead sequences" ON public.pipeline_lead_sequencias;
DROP POLICY IF EXISTS "Authenticated can create partnerships" ON public.pipeline_parcerias;

CREATE POLICY "Users can create partnerships" ON public.pipeline_parcerias
  FOR INSERT TO authenticated
  WITH CHECK (corretor_principal_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Users can insert lead sequences" ON public.pipeline_lead_sequencias
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Users can update lead sequences" ON public.pipeline_lead_sequencias
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
