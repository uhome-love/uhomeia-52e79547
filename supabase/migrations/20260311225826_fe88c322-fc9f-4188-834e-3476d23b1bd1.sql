
CREATE TABLE public.jetimob_campaign_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL UNIQUE,
  empreendimento TEXT NOT NULL,
  segmento TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jetimob_campaign_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read campaign map"
  ON public.jetimob_campaign_map FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage campaign map"
  ON public.jetimob_campaign_map FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND cargo IN ('admin', 'ceo', 'gerente')
    )
  );
