
-- Fix: notify_visita_realizada_gerente should only notify the gerente of the corretor's team, not all gestores
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

    -- Only notify the gerente(s) of this corretor's team + admins
    SELECT array_agg(DISTINCT g_id) INTO v_gerente_ids
    FROM (
      -- The corretor's direct gerente
      SELECT tm.gerente_id AS g_id
      FROM team_members tm
      WHERE tm.user_id = NEW.corretor_id AND tm.status = 'ativo' AND tm.gerente_id IS NOT NULL
      UNION
      -- Admins (CEO) always get notified
      SELECT ur.user_id AS g_id
      FROM user_roles ur WHERE ur.role = 'admin'
    ) sub;

    IF v_gerente_ids IS NOT NULL THEN
      FOREACH v_gid IN ARRAY v_gerente_ids LOOP
        PERFORM criar_notificacao(
          v_gid, 'pipeline', 'visita_realizada',
          '🏠 Visita realizada — Sugestão de acompanhamento',
          COALESCE(v_corretor_nome, 'Corretor') || ' realizou visita com ' || COALESCE(NEW.nome, 'cliente') || CASE WHEN NEW.valor_estimado IS NOT NULL AND NEW.valor_estimado > 0 THEN ' (valor alto: R$ ' || to_char(NEW.valor_estimado, 'FM999G999G999') || ')' ELSE '' END || '. Considere entrar no negócio.',
          jsonb_build_object('lead_id', NEW.id, 'nome', NEW.nome, 'corretor', v_corretor_nome, 'empreendimento', NEW.empreendimento, 'valor', NEW.valor_estimado),
          NULL
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix: notify_escala_solicitada should only notify the gerente of the corretor's team + admins
CREATE OR REPLACE FUNCTION public.notify_escala_solicitada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_corretor_nome text;
  v_segmento_nome text;
  v_gestor_user_id uuid;
BEGIN
  IF NEW.aprovacao_status = 'pendente' THEN
    SELECT nome INTO v_corretor_nome FROM profiles WHERE user_id = NEW.corretor_id;
    SELECT nome INTO v_segmento_nome FROM pipeline_segmentos WHERE id = NEW.segmento_id;

    -- Notify only the corretor's gerente + admins (not all gestores)
    FOR v_gestor_user_id IN
      SELECT DISTINCT g_id FROM (
        SELECT tm.gerente_id AS g_id
        FROM team_members tm
        WHERE tm.user_id = NEW.corretor_id AND tm.status = 'ativo' AND tm.gerente_id IS NOT NULL
        UNION
        SELECT ur.user_id AS g_id
        FROM user_roles ur WHERE ur.role = 'admin'
      ) sub
    LOOP
      PERFORM criar_notificacao(
        v_gestor_user_id,
        'alertas',
        'escala_solicitada',
        'Solicitação de escala',
        COALESCE(v_corretor_nome, 'Corretor') || ' solicitou escala no segmento ' || COALESCE(v_segmento_nome, 'N/A'),
        jsonb_build_object('escala_id', NEW.id, 'corretor_nome', v_corretor_nome, 'segmento', v_segmento_nome),
        'escala_solicitada'
      );
    END LOOP;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.aprovacao_status = 'pendente' AND NEW.aprovacao_status IN ('aprovado', 'rejeitado') THEN
    SELECT nome INTO v_segmento_nome FROM pipeline_segmentos WHERE id = NEW.segmento_id;
    PERFORM criar_notificacao(
      NEW.corretor_id,
      'alertas',
      'escala_' || NEW.aprovacao_status,
      CASE WHEN NEW.aprovacao_status = 'aprovado' THEN '✅ Escala aprovada' ELSE '❌ Escala rejeitada' END,
      'Sua solicitação de escala no segmento ' || COALESCE(v_segmento_nome, 'N/A') || ' foi ' || NEW.aprovacao_status,
      jsonb_build_object('escala_id', NEW.id, 'segmento', v_segmento_nome, 'status', NEW.aprovacao_status),
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;
