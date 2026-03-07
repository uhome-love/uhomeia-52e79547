
-- ==============================================
-- ESCALA DIÁRIA & DISTRIBUIÇÃO
-- ==============================================

-- Escala diária: quais corretores estão presentes por segmento
CREATE TABLE public.distribuicao_escala (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  segmento_id uuid NOT NULL REFERENCES public.pipeline_segmentos(id) ON DELETE CASCADE,
  corretor_id uuid NOT NULL, -- user_id do corretor
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid NOT NULL, -- CEO/admin que preencheu
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data, segmento_id, corretor_id)
);

CREATE INDEX idx_escala_data ON public.distribuicao_escala(data);
CREATE INDEX idx_escala_segmento ON public.distribuicao_escala(segmento_id, data);

ALTER TABLE public.distribuicao_escala ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver a escala (corretores precisam saber se estão escalados)
CREATE POLICY "Authenticated can view escala"
  ON public.distribuicao_escala FOR SELECT
  TO authenticated
  USING (true);

-- Admins podem gerenciar escala
CREATE POLICY "Admins can manage escala"
  ON public.distribuicao_escala FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Gestores podem gerenciar escala
CREATE POLICY "Gestores can manage escala"
  ON public.distribuicao_escala FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestores can update escala"
  ON public.distribuicao_escala FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestores can delete escala"
  ON public.distribuicao_escala FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'gestor'));

-- Histórico de distribuição (log da roleta)
CREATE TABLE public.distribuicao_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_lead_id uuid NOT NULL REFERENCES public.pipeline_leads(id) ON DELETE CASCADE,
  corretor_id uuid NOT NULL,
  segmento_id uuid REFERENCES public.pipeline_segmentos(id),
  acao text NOT NULL DEFAULT 'distribuido', -- distribuido, aceito, recusado, expirado, redistribuido
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dist_hist_lead ON public.distribuicao_historico(pipeline_lead_id);
CREATE INDEX idx_dist_hist_corretor ON public.distribuicao_historico(corretor_id);

ALTER TABLE public.distribuicao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores can view distribuicao historico"
  ON public.distribuicao_historico FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Corretores can view own distribuicao historico"
  ON public.distribuicao_historico FOR SELECT
  TO authenticated
  USING (corretor_id = auth.uid());

CREATE POLICY "System can insert distribuicao historico"
  ON public.distribuicao_historico FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor') OR corretor_id = auth.uid());

-- Histórico de movimentação no pipeline (audit trail)
CREATE TABLE public.pipeline_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_lead_id uuid NOT NULL REFERENCES public.pipeline_leads(id) ON DELETE CASCADE,
  stage_anterior_id uuid REFERENCES public.pipeline_stages(id),
  stage_novo_id uuid NOT NULL REFERENCES public.pipeline_stages(id),
  movido_por uuid NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_hist_lead ON public.pipeline_historico(pipeline_lead_id);

ALTER TABLE public.pipeline_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pipeline historico"
  ON public.pipeline_historico FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'gestor')
    OR movido_por = auth.uid()
  );

CREATE POLICY "Authenticated can insert pipeline historico"
  ON public.pipeline_historico FOR INSERT
  TO authenticated
  WITH CHECK (movido_por = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Habilitar realtime para pipeline_leads (drag & drop em tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_leads;
