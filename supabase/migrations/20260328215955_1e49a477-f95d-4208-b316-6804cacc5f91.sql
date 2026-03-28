
ALTER TABLE public.typesense_sync_state
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_indexed int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_errors int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- Enable RLS if not already
ALTER TABLE public.typesense_sync_state ENABLE ROW LEVEL SECURITY;

-- Allow authenticated to read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'typesense_sync_state' AND policyname = 'Authenticated can read sync state') THEN
    CREATE POLICY "Authenticated can read sync state"
      ON public.typesense_sync_state FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Enable realtime for progress polling
ALTER PUBLICATION supabase_realtime ADD TABLE public.typesense_sync_state;
