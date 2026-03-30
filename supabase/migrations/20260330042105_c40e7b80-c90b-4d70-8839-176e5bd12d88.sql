
CREATE OR REPLACE FUNCTION check_descartes_excessivos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_mes_label TEXT;
  v_agrupamento TEXT;
BEGIN
  v_mes_label := to_char(CURRENT_DATE, 'MM/YYYY');
  
  SELECT array_agg(user_id) INTO v_admin_ids
  FROM user_roles WHERE role = 'admin';

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
        ARRAY['gestor']
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
          ARRAY['admin']
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$$;
