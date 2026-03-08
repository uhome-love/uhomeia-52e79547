
-- Drop old permissive gestor SELECT policy
DROP POLICY IF EXISTS "Gestores can view all pipeline leads" ON public.pipeline_leads;

-- Create function to check if a lead belongs to the gestor's team
CREATE OR REPLACE FUNCTION public.is_lead_in_my_team(p_corretor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = p_corretor_id
      AND gerente_id = auth.uid()
      AND status = 'ativo'
  )
$$;

-- Admin sees ALL leads (including unassigned)
CREATE POLICY "Admins can view all pipeline leads"
ON public.pipeline_leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Gestor sees only leads assigned to their team members
CREATE POLICY "Gestores can view team pipeline leads"
ON public.pipeline_leads
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor')
  AND corretor_id IS NOT NULL
  AND public.is_lead_in_my_team(corretor_id)
);

-- Also update the UPDATE policy for gestores to match team-only scope
DROP POLICY IF EXISTS "Gestores can update all pipeline leads" ON public.pipeline_leads;

CREATE POLICY "Gestores can update team pipeline leads"
ON public.pipeline_leads
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'gestor')
    AND corretor_id IS NOT NULL
    AND public.is_lead_in_my_team(corretor_id)
  )
);
