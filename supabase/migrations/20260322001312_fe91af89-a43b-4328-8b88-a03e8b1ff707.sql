
-- OPORTUNIDADES
CREATE TABLE IF NOT EXISTS public.oportunidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  responsavel_id uuid,
  origem text,
  status text DEFAULT 'aberta',
  etapa text DEFAULT 'contato_inicial',
  valor_estimado numeric,
  imovel_titulo text,
  observacoes text,
  motivo_perda text
);

CREATE INDEX IF NOT EXISTS idx_oportunidades_lead ON public.oportunidades(lead_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_status ON public.oportunidades(status);
CREATE INDEX IF NOT EXISTS idx_oportunidades_etapa ON public.oportunidades(etapa);
CREATE INDEX IF NOT EXISTS idx_oportunidades_responsavel ON public.oportunidades(responsavel_id);
