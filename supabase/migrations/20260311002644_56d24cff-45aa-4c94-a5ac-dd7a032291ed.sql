ALTER TABLE public.pipeline_leads
  ADD COLUMN IF NOT EXISTS radar_quartos integer,
  ADD COLUMN IF NOT EXISTS radar_valor_max numeric,
  ADD COLUMN IF NOT EXISTS radar_tipologia text,
  ADD COLUMN IF NOT EXISTS radar_bairros text[],
  ADD COLUMN IF NOT EXISTS radar_status_imovel text,
  ADD COLUMN IF NOT EXISTS radar_atualizado_em timestamptz;