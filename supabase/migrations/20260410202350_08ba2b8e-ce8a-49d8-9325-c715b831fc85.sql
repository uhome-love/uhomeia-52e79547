
-- 1. Create whatsapp_ai_log table
CREATE TABLE public.whatsapp_ai_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  telefone text,
  nome_contato text,
  mensagem_recebida text,
  tipo_mensagem text,
  filtro_resultado text,
  filtro_motivo text,
  resposta_ia text,
  lead_id uuid REFERENCES public.pipeline_leads(id),
  corretor_nome text,
  status text,
  erro_detalhe text
);

-- 2. Enable RLS
ALTER TABLE public.whatsapp_ai_log ENABLE ROW LEVEL SECURITY;

-- 3. Read policy for authenticated users
CREATE POLICY "Authenticated users can read whatsapp_ai_log"
  ON public.whatsapp_ai_log
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_ai_log;

-- 5. Add ai_replied column to pipeline_leads
ALTER TABLE public.pipeline_leads
  ADD COLUMN IF NOT EXISTS ai_replied boolean DEFAULT false;
