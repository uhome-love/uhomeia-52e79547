
-- Adicionar pipeline_lead_id na tabela leads para cruzar com CRM
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pipeline_lead_id uuid REFERENCES public.pipeline_leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_lead ON public.leads(pipeline_lead_id);

-- Adicionar pipeline_lead_id na tabela oportunidades para cruzar direto
ALTER TABLE public.oportunidades ADD COLUMN IF NOT EXISTS pipeline_lead_id uuid REFERENCES public.pipeline_leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_oportunidades_pipeline_lead ON public.oportunidades(pipeline_lead_id);

-- Adicionar lead_site_id na tabela visitas (já tem pipeline_lead_id, falta link com leads do site)
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS lead_site_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_visitas_lead_site ON public.visitas(lead_site_id);

-- Adicionar pipeline_lead_id no perfil_interesse para acesso direto
ALTER TABLE public.perfil_interesse ADD COLUMN IF NOT EXISTS pipeline_lead_id uuid REFERENCES public.pipeline_leads(id) ON DELETE SET NULL;

-- Adicionar pipeline_lead_id no imoveis_interesse
ALTER TABLE public.imoveis_interesse ADD COLUMN IF NOT EXISTS pipeline_lead_id uuid REFERENCES public.pipeline_leads(id) ON DELETE SET NULL;
