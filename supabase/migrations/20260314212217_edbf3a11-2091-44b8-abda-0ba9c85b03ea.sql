
-- Table: homi_alerts (proactive alert engine)
CREATE TABLE public.homi_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,             -- leads_sem_contato, lead_stuck_stage, visita_sem_confirmacao, corretor_inativo, tarefa_vencida
  prioridade text NOT NULL DEFAULT 'normal',  -- critical, normal, info
  mensagem text NOT NULL,
  contexto jsonb DEFAULT '{}'::jsonb,         -- lead_id, corretor_id, stage, etc.
  destinatario_id uuid NOT NULL,              -- who should see this alert (gerente or admin)
  lida boolean NOT NULL DEFAULT false,
  dispensada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  dedup_key text NOT NULL,                    -- prevents duplicate alerts within window
  UNIQUE(dedup_key)
);

-- Index for fast polling
CREATE INDEX idx_homi_alerts_dest_active ON public.homi_alerts (destinatario_id, dispensada, created_at DESC)
  WHERE dispensada = false;

CREATE INDEX idx_homi_alerts_dedup ON public.homi_alerts (dedup_key);

-- RLS
ALTER TABLE public.homi_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own alerts"
  ON public.homi_alerts FOR SELECT
  TO authenticated
  USING (destinatario_id = auth.uid());

CREATE POLICY "Users dismiss own alerts"
  ON public.homi_alerts FOR UPDATE
  TO authenticated
  USING (destinatario_id = auth.uid())
  WITH CHECK (destinatario_id = auth.uid());

-- Retention: cleanup alerts older than 7 days
CREATE OR REPLACE FUNCTION public.cleanup_homi_alerts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.homi_alerts
  WHERE created_at < NOW() - INTERVAL '7 days';
$$;
