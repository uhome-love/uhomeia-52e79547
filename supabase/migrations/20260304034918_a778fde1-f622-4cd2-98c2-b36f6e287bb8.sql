
-- Table to store integration settings (API keys, configs)
CREATE TABLE public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  label text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage integration settings
CREATE POLICY "Admins can view settings"
ON public.integration_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
ON public.integration_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
ON public.integration_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings"
ON public.integration_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
