-- Index for efficient retention cleanup by date
CREATE INDEX IF NOT EXISTS idx_ops_events_created_at ON public.ops_events (created_at);

-- Add a comment documenting the retention policy
COMMENT ON TABLE public.ops_events IS 'Operational event log for edge functions. Retention: info/warn kept 30d, error/critical kept 90d. Cleanup runs daily at 04:00 UTC via pg_cron job ops-events-cleanup-daily.';