
CREATE TABLE public.tarefas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  criado_por UUID REFERENCES public.profiles(id),
  responsavel_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'a_fazer' CHECK (status IN ('a_fazer','em_andamento','revisao','concluida')),
  prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta','urgente')),
  categoria TEXT CHECK (categoria IN ('marketing','financeiro','operacional','administrativo','outro')),
  prazo DATE,
  prazo_hora TIME,
  anexo_url TEXT,
  observacoes TEXT,
  concluida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_backoffice_full_access" ON public.tarefas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.cargo IN ('admin','backoffice')
    )
  );
