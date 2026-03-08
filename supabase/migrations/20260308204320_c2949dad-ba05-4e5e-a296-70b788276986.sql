
CREATE OR REPLACE FUNCTION public.detectar_leads_parados()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_count integer := 0;
  v_stage_tipo text;
  v_mins integer;
  v_threshold integer;
  v_target_ids uuid[];
  v_gid uuid;
  v_corretor_nome text;
BEGIN
  FOR v_lead IN
    SELECT pl.id, pl.nome, pl.corretor_id, pl.stage_id, pl.stage_changed_at, 
           pl.empreendimento, pl.valor_estimado, pl.gerente_id,
           ps.tipo, ps.nome as stage_nome,
           EXTRACT(EPOCH FROM (now() - pl.stage_changed_at)) / 60 as minutos_parado
    FROM pipeline_leads pl
    JOIN pipeline_stages ps ON ps.id = pl.stage_id
    WHERE ps.tipo NOT IN ('venda', 'descarte')
      AND pl.stage_changed_at < now() - interval '15 minutes'
      AND (pl.last_escalation_at IS NULL OR pl.last_escalation_at < now() - interval '30 minutes')
  LOOP
    v_threshold := CASE v_lead.tipo
      WHEN 'novo_lead' THEN 15
      WHEN 'sem_contato' THEN 30
      WHEN 'contato_inicial' THEN 60
      WHEN 'atendimento' THEN 120
      WHEN 'qualificacao' THEN 120
      ELSE 240
    END;

    IF v_lead.minutos_parado >= v_threshold THEN
      SELECT nome INTO v_corretor_nome FROM profiles WHERE user_id = v_lead.corretor_id;

      -- Determine who to notify based on lead ownership
      IF v_lead.corretor_id IS NULL AND v_lead.gerente_id IS NULL THEN
        -- No corretor, no gerente = Fila CEO → only admins
        SELECT array_agg(DISTINCT ur.user_id) INTO v_target_ids
        FROM user_roles ur WHERE ur.role = 'admin';
      ELSIF v_lead.gerente_id IS NOT NULL THEN
        -- Has gerente → notify that gerente + admins
        SELECT array_agg(DISTINCT uid) INTO v_target_ids
        FROM (
          SELECT v_lead.gerente_id AS uid
          UNION
          SELECT ur.user_id AS uid FROM user_roles ur WHERE ur.role = 'admin'
        ) sub;
      ELSE
        -- Has corretor but no gerente → find gerente via team_members, + admins
        SELECT array_agg(DISTINCT uid) INTO v_target_ids
        FROM (
          SELECT tm.gerente_id AS uid
          FROM team_members tm
          WHERE tm.user_id = v_lead.corretor_id AND tm.status = 'ativo'
          UNION
          SELECT ur.user_id AS uid FROM user_roles ur WHERE ur.role = 'admin'
        ) sub;
      END IF;

      IF v_target_ids IS NOT NULL THEN
        FOREACH v_gid IN ARRAY v_target_ids LOOP
          PERFORM criar_notificacao(
            v_gid, 'alertas', 'lead_parado',
            '⏰ Lead parado: ' || COALESCE(v_lead.nome, 'N/A'),
            COALESCE(v_corretor_nome, 'Sem corretor') || ' — ' || v_lead.stage_nome || ' há ' || 
            CASE 
              WHEN v_lead.minutos_parado >= 1440 THEN round(v_lead.minutos_parado / 1440) || ' dias'
              WHEN v_lead.minutos_parado >= 60 THEN round(v_lead.minutos_parado / 60) || 'h'
              ELSE round(v_lead.minutos_parado) || 'min'
            END,
            jsonb_build_object('lead_id', v_lead.id, 'nome', v_lead.nome, 'stage', v_lead.stage_nome, 'minutos', round(v_lead.minutos_parado)),
            'lead_parado_' || v_lead.id::text
          );
        END LOOP;
      END IF;

      -- Also notify the corretor
      IF v_lead.corretor_id IS NOT NULL THEN
        PERFORM criar_notificacao(
          v_lead.corretor_id, 'alertas', 'lead_parado',
          '⏰ Seu lead precisa de atenção',
          v_lead.nome || ' está na etapa "' || v_lead.stage_nome || '" há ' ||
          CASE 
            WHEN v_lead.minutos_parado >= 60 THEN round(v_lead.minutos_parado / 60) || 'h'
            ELSE round(v_lead.minutos_parado) || 'min'
          END || '. Atualize o status!',
          jsonb_build_object('lead_id', v_lead.id),
          'lead_parado_corretor_' || v_lead.id::text
        );
      END IF;

      UPDATE pipeline_leads SET last_escalation_at = now(), escalation_level = escalation_level + 1
      WHERE id = v_lead.id;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;
