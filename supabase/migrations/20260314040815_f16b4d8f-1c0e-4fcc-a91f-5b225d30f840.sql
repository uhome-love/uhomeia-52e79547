
-- Operational events table for edge function observability
CREATE TABLE public.ops_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  fn text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  category text DEFAULT 'system',
  message text NOT NULL,
  trace_id text,
  ctx jsonb DEFAULT '{}',
  error_detail text
);

-- Indexes for /auditoria queries
CREATE INDEX idx_ops_events_created_at ON public.ops_events (created_at DESC);
CREATE INDEX idx_ops_events_fn ON public.ops_events (fn);
CREATE INDEX idx_ops_events_level ON public.ops_events (level);
CREATE INDEX idx_ops_events_trace_id ON public.ops_events (trace_id) WHERE trace_id IS NOT NULL;

-- RLS: read-only for admins
ALTER TABLE public.ops_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ops_events"
  ON public.ops_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert (edge functions use service role)
-- No insert policy needed since service role bypasses RLS

-- Auto-cleanup: retain 30 days
-- (Recommendation: set up a pg_cron job or periodic edge function)
COMMENT ON TABLE public.ops_events IS 'Lightweight operational event log for edge functions. Retain 30 days. Only high-value events persisted.';
