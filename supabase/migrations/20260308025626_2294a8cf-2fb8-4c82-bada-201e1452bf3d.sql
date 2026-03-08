ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_preview_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_updated_at timestamptz;