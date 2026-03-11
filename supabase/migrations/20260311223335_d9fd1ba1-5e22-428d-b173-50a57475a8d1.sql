
CREATE TABLE public.jetimob_processed (
  jetimob_lead_id TEXT PRIMARY KEY,
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jetimob_processed_telefone ON public.jetimob_processed(telefone);

ALTER TABLE public.jetimob_processed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.jetimob_processed
  FOR ALL USING (true) WITH CHECK (true);
