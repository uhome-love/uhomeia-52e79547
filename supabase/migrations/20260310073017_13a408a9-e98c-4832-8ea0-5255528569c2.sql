
-- Fix academia_certificados RLS
CREATE POLICY "Users can view own certificates"
ON public.academia_certificados
FOR SELECT
TO authenticated
USING (corretor_id = auth.uid());

CREATE POLICY "Users can insert own certificates"
ON public.academia_certificados
FOR INSERT
TO authenticated
WITH CHECK (corretor_id = auth.uid());
