
-- Referral configuration (admin settings)
CREATE TABLE public.referral_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_premiacao text NOT NULL DEFAULT 'cashback',
  valor_premiacao numeric NOT NULL DEFAULT 500,
  descricao_premiacao text DEFAULT 'R$500 em cashback',
  regra_conversao text NOT NULL DEFAULT 'apos_assinatura',
  ativo boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.referral_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage referral config" ON public.referral_config
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view active config" ON public.referral_config
  FOR SELECT TO authenticated USING (ativo = true);

-- Insert default config
INSERT INTO public.referral_config (tipo_premiacao, valor_premiacao, descricao_premiacao, regra_conversao)
VALUES ('cashback', 500, 'R$500 em cashback após a venda ser concluída', 'apos_assinatura');

-- Referrals table (each client who can refer)
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome text NOT NULL,
  cliente_telefone text,
  cliente_email text,
  pipeline_lead_id uuid,
  corretor_id uuid,
  codigo_unico text NOT NULL UNIQUE,
  total_indicacoes integer NOT NULL DEFAULT 0,
  indicacoes_convertidas integer NOT NULL DEFAULT 0,
  premiacao_acumulada numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores and admins can manage referrals" ON public.referrals
  FOR ALL TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR created_by = auth.uid()
  ) WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR created_by = auth.uid()
  );

-- Referral leads (leads generated from referrals)
CREATE TABLE public.referral_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  email text,
  interesse text,
  status text NOT NULL DEFAULT 'novo',
  pipeline_lead_id uuid,
  convertido boolean NOT NULL DEFAULT false,
  convertido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores and admins can view referral leads" ON public.referral_leads
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)
    OR EXISTS (SELECT 1 FROM referrals r WHERE r.id = referral_leads.referral_id AND r.created_by = auth.uid())
  );

CREATE POLICY "Anyone can insert referral leads" ON public.referral_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Referral rewards
CREATE TABLE public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  referral_lead_id uuid NOT NULL REFERENCES public.referral_leads(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'cashback',
  valor numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  processado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores and admins can manage rewards" ON public.referral_rewards
  FOR ALL TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)
    OR EXISTS (SELECT 1 FROM referrals r WHERE r.id = referral_rewards.referral_id AND r.created_by = auth.uid())
  ) WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)
  );
