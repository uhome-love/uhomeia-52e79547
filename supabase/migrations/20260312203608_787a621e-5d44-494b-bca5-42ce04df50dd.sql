
CREATE TABLE public.rh_entrevistas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidato_id UUID NOT NULL REFERENCES public.rh_candidatos(id) ON DELETE CASCADE,
  data_entrevista TIMESTAMP WITH TIME ZONE NOT NULL,
  local TEXT DEFAULT 'Escritório',
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'agendada',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rh_entrevistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage interviews"
  ON public.rh_entrevistas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
