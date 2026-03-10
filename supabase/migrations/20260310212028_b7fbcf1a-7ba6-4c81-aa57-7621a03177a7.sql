
-- Create a security definer function to check gerente/admin/ceo cargo
-- This avoids potential RLS recursion issues when querying profiles from within a policy
CREATE OR REPLACE FUNCTION public.is_gerente_or_above()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND cargo IN ('gerente', 'admin', 'ceo')
  )
$$;

-- Drop existing policies on checkpoint_diario
DROP POLICY IF EXISTS "gerente_full_access" ON public.checkpoint_diario;
DROP POLICY IF EXISTS "corretor_own_access" ON public.checkpoint_diario;
DROP POLICY IF EXISTS "corretor_own_update" ON public.checkpoint_diario;

-- Recreate policies using the security definer function
CREATE POLICY "gerente_full_access" ON public.checkpoint_diario
  FOR ALL
  TO authenticated
  USING (public.is_gerente_or_above())
  WITH CHECK (public.is_gerente_or_above());

CREATE POLICY "corretor_own_access" ON public.checkpoint_diario
  FOR SELECT
  TO authenticated
  USING (corretor_id = auth.uid());

CREATE POLICY "corretor_own_update" ON public.checkpoint_diario
  FOR UPDATE
  TO authenticated
  USING (corretor_id = auth.uid());
