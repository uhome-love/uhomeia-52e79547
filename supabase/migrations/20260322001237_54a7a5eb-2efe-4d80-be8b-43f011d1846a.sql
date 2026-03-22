
-- 1. LEADS
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  origem text DEFAULT 'manual',
  origem_detalhe text,
  site_lead_id uuid,
  site_user_id uuid,
  imovel_interesse text,
  imovel_id_site text,
  bairro_interesse text,
  preco_interesse numeric,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status text DEFAULT 'novo',
  atribuido_para uuid REFERENCES auth.users(id),
  observacoes text,
  UNIQUE(site_lead_id)
);

CREATE INDEX IF NOT EXISTS idx_leads_telefone ON public.leads(telefone);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_site_user ON public.leads(site_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_atribuido ON public.leads(atribuido_para);
