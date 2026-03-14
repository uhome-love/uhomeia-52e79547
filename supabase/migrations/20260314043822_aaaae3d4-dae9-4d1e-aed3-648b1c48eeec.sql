
CREATE OR REPLACE VIEW public.v_user_partner_leads
WITH (security_invoker = true)
AS
SELECT
  pp.id AS parceria_id,
  pp.pipeline_lead_id,
  CASE
    WHEN pp.corretor_principal_id = auth.uid() THEN 'principal'
    ELSE 'parceiro'
  END AS papel_usuario,
  CASE
    WHEN pp.corretor_principal_id = auth.uid() THEN pp.corretor_parceiro_id
    ELSE pp.corretor_principal_id
  END AS outro_corretor_id
FROM public.pipeline_parcerias pp
WHERE pp.status = 'ativa'
  AND (pp.corretor_principal_id = auth.uid() OR pp.corretor_parceiro_id = auth.uid());
