CREATE POLICY "Public can view team_members for scoreboard"
ON public.team_members
FOR SELECT
TO anon
USING (true);