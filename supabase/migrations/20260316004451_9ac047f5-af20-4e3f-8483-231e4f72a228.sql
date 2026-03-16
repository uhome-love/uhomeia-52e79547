
-- Campaign batches (parent record for each campaign dispatch)
CREATE TABLE public.whatsapp_campaign_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  nome text NOT NULL,
  oferta_id text,
  oferta_nome text,
  campanha text,
  template_name text NOT NULL,
  template_language text NOT NULL DEFAULT 'pt_BR',
  template_params jsonb DEFAULT '{}',
  redirect_url text,
  filtros jsonb DEFAULT '{}',
  total_leads int NOT NULL DEFAULT 0,
  total_sent int NOT NULL DEFAULT 0,
  total_delivered int NOT NULL DEFAULT 0,
  total_read int NOT NULL DEFAULT 0,
  total_replied int NOT NULL DEFAULT 0,
  total_clicked int NOT NULL DEFAULT 0,
  total_aproveitado int NOT NULL DEFAULT 0,
  total_failed int NOT NULL DEFAULT 0,
  batch_size int NOT NULL DEFAULT 500,
  interval_seconds int NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'draft',
  dispatched_by uuid NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  paused_at timestamptz
);

ALTER TABLE public.whatsapp_campaign_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage campaign batches"
  ON public.whatsapp_campaign_batches
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Individual send records
CREATE TABLE public.whatsapp_campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  batch_id uuid REFERENCES public.whatsapp_campaign_batches(id) ON DELETE CASCADE NOT NULL,
  pipeline_lead_id uuid REFERENCES public.pipeline_leads(id),
  telefone text,
  telefone_normalizado text,
  nome text,
  email text,
  template_name text,
  origem text,
  campanha text,
  bloco text,
  status_envio text NOT NULL DEFAULT 'pending',
  message_id text,
  response_payload jsonb,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  replied_at timestamptz,
  clicked_at timestamptz,
  aproveitado_em timestamptz,
  enviado_para_roleta_em timestamptz,
  corretor_distribuido_id uuid
);

ALTER TABLE public.whatsapp_campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage campaign sends"
  ON public.whatsapp_campaign_sends
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_wcs_batch_id ON public.whatsapp_campaign_sends(batch_id);
CREATE INDEX idx_wcs_status ON public.whatsapp_campaign_sends(status_envio);
CREATE INDEX idx_wcs_tel_norm ON public.whatsapp_campaign_sends(telefone_normalizado);
CREATE INDEX idx_wcb_status ON public.whatsapp_campaign_batches(status);
