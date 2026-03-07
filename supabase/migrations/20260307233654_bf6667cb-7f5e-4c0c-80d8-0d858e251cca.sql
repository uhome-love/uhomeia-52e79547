
-- Automations table
CREATE TABLE public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}',
  conditions jsonb NOT NULL DEFAULT '[]',
  actions jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  last_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores can manage own automations"
  ON public.automations FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can view all automations"
  ON public.automations FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Automation logs table
CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  lead_id text,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  actions_executed jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'success',
  error_message text
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs of own automations"
  ON public.automation_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.automations a
    WHERE a.id = automation_logs.automation_id
    AND (a.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "System can insert logs"
  ON public.automation_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
