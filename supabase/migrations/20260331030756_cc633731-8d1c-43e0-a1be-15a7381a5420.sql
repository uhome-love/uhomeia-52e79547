
-- Tables were partially created. Drop and recreate cleanly.
DROP TABLE IF EXISTS public.voice_call_logs CASCADE;
DROP TABLE IF EXISTS public.voice_campaigns CASCADE;
DROP TABLE IF EXISTS public.lead_nurturing_state CASCADE;

-- 1. Lead Nurturing State
CREATE TABLE public.lead_nurturing_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_lead_id uuid REFERENCES public.pipeline_leads(id) ON DELETE CASCADE NOT NULL,
  sequencia_ativa text NOT NULL DEFAULT 'sem_contato',
  step_atual integer DEFAULT 0,
  canal_ultimo text,
  status text DEFAULT 'ativo',
  lead_score integer DEFAULT 0,
  ultimo_evento text,
  ultimo_evento_at timestamptz,
  proximo_step_at timestamptz,
  tentativas_contato integer DEFAULT 0,
  tentativas_voz integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pipeline_lead_id)
);

CREATE INDEX idx_lns_proximo ON public.lead_nurturing_state(proximo_step_at) WHERE status = 'ativo';
CREATE INDEX idx_lns_lead ON public.lead_nurturing_state(pipeline_lead_id);
CREATE INDEX idx_lns_status ON public.lead_nurturing_state(status);

ALTER TABLE public.lead_nurturing_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on lead_nurturing_state"
  ON public.lead_nurturing_state FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read lead_nurturing_state"
  ON public.lead_nurturing_state FOR SELECT TO authenticated USING (true);

-- 2. Voice Campaigns
CREATE TABLE public.voice_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  template text NOT NULL,
  lead_ids uuid[] NOT NULL DEFAULT '{}',
  status text DEFAULT 'agendada',
  total integer DEFAULT 0,
  atendidas integer DEFAULT 0,
  nao_atendidas integer DEFAULT 0,
  interessados integer DEFAULT 0,
  sem_interesse integer DEFAULT 0,
  pediu_remocao integer DEFAULT 0,
  criado_por uuid NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.voice_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc_voice_campaigns" ON public.voice_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "read_voice_campaigns" ON public.voice_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_voice_campaigns" ON public.voice_campaigns FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Voice Call Logs
CREATE TABLE public.voice_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.voice_campaigns(id) ON DELETE SET NULL,
  pipeline_lead_id uuid REFERENCES public.pipeline_leads(id) ON DELETE SET NULL,
  twilio_call_sid text,
  telefone text NOT NULL,
  status text DEFAULT 'iniciada',
  duracao_segundos integer,
  resultado text,
  transcricao text,
  resumo_ia text,
  sentimento text,
  proximo_passo text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_vcl_campaign ON public.voice_call_logs(campaign_id);
CREATE INDEX idx_vcl_lead ON public.voice_call_logs(pipeline_lead_id);

ALTER TABLE public.voice_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc_voice_call_logs" ON public.voice_call_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "read_voice_call_logs" ON public.voice_call_logs FOR SELECT TO authenticated USING (true);
