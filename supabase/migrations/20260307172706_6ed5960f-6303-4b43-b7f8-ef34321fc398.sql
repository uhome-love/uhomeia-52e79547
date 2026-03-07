
-- =============================================
-- 1. PIPELINE PARCERIAS (Partnership System)
-- =============================================
CREATE TABLE public.pipeline_parcerias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_lead_id uuid NOT NULL REFERENCES public.pipeline_leads(id) ON DELETE CASCADE,
  corretor_principal_id uuid NOT NULL,
  corretor_parceiro_id uuid NOT NULL,
  divisao_principal integer NOT NULL DEFAULT 50,
  divisao_parceiro integer NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'ativa',
  motivo text,
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pipeline_lead_id, corretor_parceiro_id)
);

ALTER TABLE public.pipeline_parcerias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own partnerships" ON public.pipeline_parcerias
  FOR SELECT TO authenticated
  USING (corretor_principal_id = auth.uid() OR corretor_parceiro_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Authenticated can create partnerships" ON public.pipeline_parcerias
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Managers can update partnerships" ON public.pipeline_parcerias
  FOR UPDATE TO authenticated
  USING (criado_por = auth.uid() OR corretor_principal_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- =============================================
-- 2. PIPELINE MATERIAIS (Materials Library)
-- =============================================
CREATE TABLE public.pipeline_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'pdf',
  empreendimento text,
  url text NOT NULL,
  arquivo_nome text,
  tamanho_bytes bigint,
  categoria text NOT NULL DEFAULT 'geral',
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_materiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active materials" ON public.pipeline_materiais
  FOR SELECT TO authenticated USING (ativo = true);

CREATE POLICY "Managers can manage materials" ON public.pipeline_materiais
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- =============================================
-- 3. SEQUÊNCIAS DE FOLLOW-UP
-- =============================================
CREATE TABLE public.pipeline_sequencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  empreendimento text,
  segmento_id uuid REFERENCES public.pipeline_segmentos(id),
  stage_gatilho text NOT NULL DEFAULT 'novo_lead',
  ativa boolean NOT NULL DEFAULT true,
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_sequencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sequences" ON public.pipeline_sequencias
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can manage sequences" ON public.pipeline_sequencias
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE TABLE public.pipeline_sequencia_passos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequencia_id uuid NOT NULL REFERENCES public.pipeline_sequencias(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  dias_apos_inicio integer NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'mensagem',
  titulo text NOT NULL,
  conteudo text,
  material_id uuid REFERENCES public.pipeline_materiais(id),
  canal text NOT NULL DEFAULT 'whatsapp',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_sequencia_passos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view steps" ON public.pipeline_sequencia_passos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can manage steps" ON public.pipeline_sequencia_passos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- Track which leads are in which sequences
CREATE TABLE public.pipeline_lead_sequencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_lead_id uuid NOT NULL REFERENCES public.pipeline_leads(id) ON DELETE CASCADE,
  sequencia_id uuid NOT NULL REFERENCES public.pipeline_sequencias(id) ON DELETE CASCADE,
  passo_atual integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativa',
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  pausada_em timestamptz,
  concluida_em timestamptz,
  proximo_envio_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pipeline_lead_id, sequencia_id)
);

ALTER TABLE public.pipeline_lead_sequencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lead sequences" ON public.pipeline_lead_sequencias
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can manage lead sequences" ON public.pipeline_lead_sequencias
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update lead sequences" ON public.pipeline_lead_sequencias
  FOR UPDATE TO authenticated USING (true);

-- =============================================
-- 4. COMISSÃO REGISTRO
-- =============================================
CREATE TABLE public.pipeline_comissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_lead_id uuid NOT NULL REFERENCES public.pipeline_leads(id) ON DELETE CASCADE,
  corretor_id uuid NOT NULL,
  papel text NOT NULL DEFAULT 'captador',
  percentual integer NOT NULL DEFAULT 100,
  valor_comissao numeric(12,2),
  registrado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_comissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commissions" ON public.pipeline_comissoes
  FOR SELECT TO authenticated
  USING (corretor_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Managers can manage commissions" ON public.pipeline_comissoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- =============================================
-- 5. STORAGE BUCKET FOR MATERIALS
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('materiais', 'materiais', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view materials" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'materiais');

CREATE POLICY "Managers can upload materials" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materiais' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')));

CREATE POLICY "Managers can delete materials" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materiais' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')));

-- =============================================
-- 6. TRIGGER: Auto-notify manager on visita_realizada
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_visita_realizada_gerente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stage_tipo text;
  v_old_stage_tipo text;
  v_gerente_ids uuid[];
  v_corretor_nome text;
  v_gid uuid;
BEGIN
  IF OLD.stage_id = NEW.stage_id THEN RETURN NEW; END IF;

  SELECT tipo INTO v_stage_tipo FROM pipeline_stages WHERE id = NEW.stage_id;
  SELECT tipo INTO v_old_stage_tipo FROM pipeline_stages WHERE id = OLD.stage_id;

  IF v_stage_tipo = 'visita_realizada' AND v_old_stage_tipo != 'visita_realizada' THEN
    SELECT nome INTO v_corretor_nome FROM profiles WHERE user_id = NEW.corretor_id;

    SELECT array_agg(DISTINCT ur.user_id) INTO v_gerente_ids
    FROM user_roles ur WHERE ur.role IN ('gestor', 'admin');

    IF v_gerente_ids IS NOT NULL THEN
      FOREACH v_gid IN ARRAY v_gerente_ids LOOP
        PERFORM criar_notificacao(
          v_gid, 'pipeline', 'visita_realizada',
          '🏠 Visita realizada — Negociação disponível',
          COALESCE(v_corretor_nome, 'Corretor') || ' realizou visita com ' || COALESCE(NEW.nome, 'cliente') || ' (' || COALESCE(NEW.empreendimento, 'N/A') || '). Lead pronto para negociação.',
          jsonb_build_object('lead_id', NEW.id, 'nome', NEW.nome, 'corretor', v_corretor_nome, 'empreendimento', NEW.empreendimento, 'valor', NEW.valor_estimado),
          NULL
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_visita_realizada ON public.pipeline_leads;
CREATE TRIGGER trg_notify_visita_realizada
  AFTER UPDATE ON public.pipeline_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_visita_realizada_gerente();

-- Enable realtime for partnerships
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_parcerias;
