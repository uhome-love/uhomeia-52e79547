
-- Marketplace items table
CREATE TABLE public.marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  conteudo text NOT NULL,
  categoria text NOT NULL DEFAULT 'script_ligacao',
  tags text[] DEFAULT '{}',
  autor_id uuid NOT NULL,
  autor_nome text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente',
  aprovado_por uuid,
  aprovado_em timestamptz,
  origem text DEFAULT 'manual',
  total_usos integer DEFAULT 0,
  media_avaliacao numeric(2,1) DEFAULT 0,
  total_avaliacoes integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read approved items
CREATE POLICY "Anyone can read approved items"
  ON public.marketplace_items FOR SELECT TO authenticated
  USING (status = 'aprovado' OR autor_id = auth.uid());

-- Authors can insert
CREATE POLICY "Users can submit items"
  ON public.marketplace_items FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid());

-- Gestors/admins can update (approve/reject)
CREATE POLICY "Gestors can manage items"
  ON public.marketplace_items FOR UPDATE TO authenticated
  USING (autor_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- Marketplace usage tracking
CREATE TABLE public.marketplace_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can track own usage"
  ON public.marketplace_usage FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own usage"
  ON public.marketplace_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- Marketplace ratings
CREATE TABLE public.marketplace_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, user_id)
);

ALTER TABLE public.marketplace_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can rate items"
  ON public.marketplace_ratings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ratings"
  ON public.marketplace_ratings FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can read ratings"
  ON public.marketplace_ratings FOR SELECT TO authenticated
  USING (true);

-- Function to increment usage and update counter
CREATE OR REPLACE FUNCTION public.increment_marketplace_usage(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO marketplace_usage (item_id, user_id) VALUES (p_item_id, auth.uid());
  UPDATE marketplace_items SET total_usos = total_usos + 1, updated_at = now() WHERE id = p_item_id;
END;
$$;

-- Function to rate and update average
CREATE OR REPLACE FUNCTION public.rate_marketplace_item(p_item_id uuid, p_nota integer, p_comentario text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO marketplace_ratings (item_id, user_id, nota, comentario)
  VALUES (p_item_id, auth.uid(), p_nota, p_comentario)
  ON CONFLICT (item_id, user_id) DO UPDATE SET nota = p_nota, comentario = COALESCE(p_comentario, marketplace_ratings.comentario);

  UPDATE marketplace_items SET
    media_avaliacao = (SELECT ROUND(AVG(nota)::numeric, 1) FROM marketplace_ratings WHERE item_id = p_item_id),
    total_avaliacoes = (SELECT COUNT(*) FROM marketplace_ratings WHERE item_id = p_item_id),
    updated_at = now()
  WHERE id = p_item_id;
END;
$$;
