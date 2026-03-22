CREATE TABLE public.site_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  tipo text NOT NULL,
  dados jsonb DEFAULT '{}'::jsonb,
  session_id text,
  email text,
  telefone text,
  user_id text,
  pagina text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  lead_id uuid REFERENCES public.leads(id),
  pipeline_lead_id uuid REFERENCES public.pipeline_leads(id)
);

CREATE INDEX idx_site_events_session ON public.site_events(session_id);
CREATE INDEX idx_site_events_email ON public.site_events(email);
CREATE INDEX idx_site_events_telefone ON public.site_events(telefone);
CREATE INDEX idx_site_events_tipo ON public.site_events(tipo);
CREATE INDEX idx_site_events_created ON public.site_events(created_at DESC);
CREATE INDEX idx_site_events_pipeline_lead ON public.site_events(pipeline_lead_id);

ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read site_events"
  ON public.site_events FOR SELECT TO authenticated
  USING (true);