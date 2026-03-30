
-- 1. Update get_elegibilidade_roleta to include discard blocking
CREATE OR REPLACE FUNCTION get_elegibilidade_roleta(p_corretor_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leads_desatualizados  INTEGER;
  v_pode_roleta_geral     BOOLEAN;
  v_tem_visita_hoje       BOOLEAN;
  v_pode_roleta_noturna   BOOLEAN;
  v_leads_detalhes        JSON;
  v_descartes_mes         INTEGER;
  v_bloqueado_descarte    BOOLEAN;
BEGIN
  v_leads_desatualizados := contar_leads_desatualizados(p_corretor_id);

  -- Count discards in the current month
  SELECT COUNT(*)::INTEGER INTO v_descartes_mes
  FROM pipeline_leads pl
  WHERE pl.corretor_id = p_corretor_id
    AND pl.stage_id = '1dd66c25-3848-4053-9f66-82e902989b4d'
    AND pl.stage_changed_at >= date_trunc('month', CURRENT_DATE)
    AND pl.stage_changed_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';

  v_bloqueado_descarte := v_descartes_mes >= 50;
  v_pode_roleta_geral  := v_leads_desatualizados <= 10 AND NOT v_bloqueado_descarte;

  SELECT EXISTS (
    SELECT 1
    FROM pipeline_atividades pa
    WHERE pa.corretor_id = p_corretor_id
      AND pa.tipo IN ('visita_agendada', 'visita_realizada')
      AND pa.created_at::date = CURRENT_DATE
  ) INTO v_tem_visita_hoje;

  v_pode_roleta_noturna := v_pode_roleta_geral AND v_tem_visita_hoje;

  SELECT json_agg(sub)
  INTO v_leads_detalhes
  FROM (
    SELECT
      json_build_object(
        'id',    pl.id,
        'nome',  pl.nome,
        'stage', ps.nome,
        'dias_sem_tarefa', EXTRACT(DAY FROM NOW() - pl.updated_at)::INTEGER
      ) AS sub
    FROM pipeline_leads pl
    JOIN pipeline_stages ps ON ps.id = pl.stage_id
    WHERE pl.corretor_id = p_corretor_id
      AND (pl.arquivado IS NULL OR pl.arquivado = false)
      AND pl.stage_id != '1dd66c25-3848-4053-9f66-82e902989b4d'
      AND NOT EXISTS (
        SELECT 1
        FROM pipeline_tarefas pt
        WHERE pt.pipeline_lead_id = pl.id
          AND pt.status = 'pendente'
          AND pt.vence_em >= NOW()
      )
    ORDER BY pl.updated_at ASC
    LIMIT 10
  ) t;

  RETURN json_build_object(
    'pode_roleta_manha',    v_pode_roleta_geral,
    'pode_roleta_tarde',    v_pode_roleta_geral,
    'pode_roleta_noturna',  v_pode_roleta_noturna,
    'leads_desatualizados', v_leads_desatualizados,
    'limite_bloqueio',      10,
    'faltam_para_bloquear', GREATEST(0, 10 - v_leads_desatualizados),
    'tem_visita_hoje',      v_tem_visita_hoje,
    'leads_para_atualizar', COALESCE(v_leads_detalhes, '[]'::json),
    'descartes_mes',        v_descartes_mes,
    'bloqueado_descarte',   v_bloqueado_descarte,
    'limite_descartes',     50
  );
END;
$$;

-- 2. Create function to check all brokers and send notifications for excessive discards
CREATE OR REPLACE FUNCTION check_descartes_excessivos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_gerente_auth_id UUID;
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_mes_label TEXT;
  v_agrupamento TEXT;
BEGIN
  v_mes_label := to_char(CURRENT_DATE, 'MM/YYYY');
  
  -- Get all admin auth user IDs
  SELECT array_agg(user_id) INTO v_admin_ids
  FROM user_roles WHERE role = 'admin';

  -- Find brokers with 50+ discards this month
  FOR r IN
    SELECT 
      pl.corretor_id,
      tm.nome as corretor_nome,
      tm.gerente_id as gerente_auth_id,
      COUNT(*)::INTEGER as total_descartes
    FROM pipeline_leads pl
    JOIN team_members tm ON tm.user_id = pl.corretor_id
    WHERE pl.stage_id = '1dd66c25-3848-4053-9f66-82e902989b4d'
      AND pl.stage_changed_at >= date_trunc('month', CURRENT_DATE)
      AND pl.stage_changed_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
    GROUP BY pl.corretor_id, tm.nome, tm.gerente_id
    HAVING COUNT(*) >= 50
  LOOP
    v_agrupamento := 'descarte_excessivo_' || r.corretor_id || '_' || to_char(CURRENT_DATE, 'YYYY-MM');
    
    -- Check if we already notified this month for this broker
    IF EXISTS (
      SELECT 1 FROM notifications 
      WHERE agrupamento_key = v_agrupamento
      LIMIT 1
    ) THEN
      CONTINUE;
    END IF;

    -- Notify the broker
    INSERT INTO notifications (user_id, tipo, categoria, titulo, mensagem, dados, agrupamento_key)
    VALUES (
      r.corretor_id,
      'alerta',
      'pipeline',
      '⚠️ Excesso de descartes detectado',
      'Você descartou ' || r.total_descartes || ' leads em ' || v_mes_label || '. Sua participação na roleta foi bloqueada temporariamente até análise da gestão.',
      json_build_object('total_descartes', r.total_descartes, 'mes', v_mes_label, 'corretor_id', r.corretor_id),
      v_agrupamento
    );

    -- Notify the manager
    IF r.gerente_auth_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, tipo, categoria, titulo, mensagem, dados, agrupamento_key, cargo_destino)
      VALUES (
        r.gerente_auth_id,
        'alerta',
        'pipeline',
        '🚨 Corretor com excesso de descartes',
        r.corretor_nome || ' descartou ' || r.total_descartes || ' leads em ' || v_mes_label || '. Participação na roleta bloqueada. Verifique a situação.',
        json_build_object('total_descartes', r.total_descartes, 'mes', v_mes_label, 'corretor_id', r.corretor_id, 'corretor_nome', r.corretor_nome),
        v_agrupamento || '_gerente',
        'gestor'
      );
    END IF;

    -- Notify all admins/CEO
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids
      LOOP
        INSERT INTO notifications (user_id, tipo, categoria, titulo, mensagem, dados, agrupamento_key, cargo_destino)
        VALUES (
          v_admin_id,
          'alerta',
          'pipeline',
          '🚨 Corretor com excesso de descartes',
          r.corretor_nome || ' descartou ' || r.total_descartes || ' leads em ' || v_mes_label || '. Participação na roleta bloqueada automaticamente.',
          json_build_object('total_descartes', r.total_descartes, 'mes', v_mes_label, 'corretor_id', r.corretor_id, 'corretor_nome', r.corretor_nome),
          v_agrupamento || '_admin_' || v_admin_id,
          'admin'
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$$;
