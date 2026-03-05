
-- 1. Drop the overly broad "Profiles viewable by authenticated users" policy
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;

-- The existing policies are already correct:
-- "Users can view own profile" USING (auth.uid() = user_id)
-- "Admins can view all profiles" USING (has_role(..., 'admin') OR has_role(..., 'gestor'))
-- So no new policies needed — just removing the broad one.
