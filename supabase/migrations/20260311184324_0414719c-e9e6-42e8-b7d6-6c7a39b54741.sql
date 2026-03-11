-- Table for CEO to customize empreendimento cards (overrides Jetimob data)
CREATE TABLE public.empreendimento_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text,
  bairro text,
  area_privativa numeric,
  dormitorios integer,
  suites integer,
  vagas integer,
  valor_venda numeric,
  status_obra text,
  previsao_entrega text,
  descricao text,
  fotos text[] DEFAULT '{}',
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.empreendimento_overrides ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated can read overrides"
  ON public.empreendimento_overrides FOR SELECT
  TO authenticated USING (true);

-- Only admins/gestores can write (controlled at app level)
CREATE POLICY "Authenticated can insert overrides"
  ON public.empreendimento_overrides FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update overrides"
  ON public.empreendimento_overrides FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete overrides"
  ON public.empreendimento_overrides FOR DELETE
  TO authenticated USING (true);