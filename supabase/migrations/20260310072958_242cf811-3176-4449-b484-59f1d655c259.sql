
-- Drop the broken RLS policy
DROP POLICY IF EXISTS "User ve proprio progresso" ON public.academia_progresso;

-- Create correct policies for academia_progresso
CREATE POLICY "Users can view own progress"
ON public.academia_progresso
FOR SELECT
TO authenticated
USING (corretor_id = auth.uid());

CREATE POLICY "Users can insert own progress"
ON public.academia_progresso
FOR INSERT
TO authenticated
WITH CHECK (corretor_id = auth.uid());

CREATE POLICY "Users can update own progress"
ON public.academia_progresso
FOR UPDATE
TO authenticated
USING (corretor_id = auth.uid())
WITH CHECK (corretor_id = auth.uid());
