
ALTER TABLE public.lead_nurturing_sequences 
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS vitrine_url TEXT;
