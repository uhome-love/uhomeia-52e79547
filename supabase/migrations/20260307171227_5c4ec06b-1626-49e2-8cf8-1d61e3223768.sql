
-- 1. Add SLA, horário roleta, and max leads config to pipeline_segmentos
ALTER TABLE public.pipeline_segmentos 
  ADD COLUMN IF NOT EXISTS sla_minutos integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS roleta_inicio time DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS roleta_fim time DEFAULT '18:30',
  ADD COLUMN IF NOT EXISTS max_leads_ativos integer NOT NULL DEFAULT 3;

-- 2. Add priority, first contact timestamp, and acceptance status to pipeline_leads
ALTER TABLE public.pipeline_leads
  ADD COLUMN IF NOT EXISTS prioridade_lead text NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS primeiro_contato_em timestamptz,
  ADD COLUMN IF NOT EXISTS aceite_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS motivo_rejeicao text;

-- 3. Add rejection reason and response time to distribuicao_historico
ALTER TABLE public.distribuicao_historico
  ADD COLUMN IF NOT EXISTS motivo_rejeicao text,
  ADD COLUMN IF NOT EXISTS tempo_resposta_seg integer;

-- 4. Create index for pending leads lookup
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_aceite_status ON public.pipeline_leads(aceite_status) WHERE aceite_status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_prioridade ON public.pipeline_leads(prioridade_lead);

-- 5. Updated distribuir_lead_roleta with SLA configurável, priority ordering, max 3 leads, business hours
CREATE OR REPLACE FUNCTION public.distribuir_lead_roleta(p_pipeline_lead_id uuid, p_segmento_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead pipeline_leads%ROWTYPE;
  v_segmento_id uuid;
  v_segmento pipeline_segmentos%ROWTYPE;
  v_corretor_id uuid;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_now_time time := (now() AT TIME ZONE 'America/Sao_Paulo')::time;
  v_active_count int;
  v_sla_minutos int;
  v_max_leads int;
BEGIN
  -- Get lead
  SELECT * INTO v_lead FROM pipeline_leads WHERE id = p_pipeline_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'lead_not_found');
  END IF;

  -- Already assigned and accepted?
  IF v_lead.corretor_id IS NOT NULL AND v_lead.aceite_status = 'aceito' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_assigned', 'corretor_id', v_lead.corretor_id);
  END IF;

  -- Determine segmento
  v_segmento_id := COALESCE(p_segmento_id, v_lead.segmento_id);
  
  -- If no segmento, try to map from empreendimento/campanha
  IF v_segmento_id IS NULL AND v_lead.empreendimento IS NOT NULL THEN
    SELECT sc.segmento_id INTO v_segmento_id
    FROM segmento_campanhas sc
    WHERE UPPER(sc.campanha_nome) = UPPER(v_lead.empreendimento)
    LIMIT 1;
  END IF;

  IF v_segmento_id IS NULL THEN
    -- Mark as pending (no segment)
    UPDATE pipeline_leads SET aceite_status = 'pendente_distribuicao' WHERE id = p_pipeline_lead_id;
    RETURN jsonb_build_object('success', false, 'reason', 'no_segmento_identified');
  END IF;

  -- Get segmento config
  SELECT * INTO v_segmento FROM pipeline_segmentos WHERE id = v_segmento_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'segmento_not_found');
  END IF;

  v_sla_minutos := COALESCE(v_segmento.sla_minutos, 5);
  v_max_leads := COALESCE(v_segmento.max_leads_ativos, 3);

  -- Check business hours
  IF v_segmento.roleta_inicio IS NOT NULL AND v_segmento.roleta_fim IS NOT NULL THEN
    IF v_now_time < v_segmento.roleta_inicio OR v_now_time > v_segmento.roleta_fim THEN
      -- Outside business hours → mark as pending
      UPDATE pipeline_leads 
      SET aceite_status = 'pendente_distribuicao',
          segmento_id = v_segmento_id,
          updated_at = now()
      WHERE id = p_pipeline_lead_id;
      RETURN jsonb_build_object('success', false, 'reason', 'fora_horario', 'horario_inicio', v_segmento.roleta_inicio, 'horario_fim', v_segmento.roleta_fim);
    END IF;
  END IF;

  -- Find best corretor: escalado today, approved, under max leads limit
  SELECT de.corretor_id INTO v_corretor_id
  FROM distribuicao_escala de
  WHERE de.data = v_today
    AND de.segmento_id = v_segmento_id
    AND de.ativo = true
    AND de.aprovacao_status = 'aprovado'
    -- Corretor must be available (na_empresa)
    AND EXISTS (
      SELECT 1 FROM corretor_disponibilidade cd
      WHERE cd.user_id = de.corretor_id
        AND cd.status = 'na_empresa'
        AND cd.na_roleta = true
    )
    -- Under max leads limit (only count non-terminal, non-accepted leads)
    AND (
      SELECT COUNT(*) FROM pipeline_leads pl
      JOIN pipeline_stages ps ON ps.id = pl.stage_id
      WHERE pl.corretor_id = de.corretor_id
        AND ps.tipo NOT IN ('venda', 'descarte')
        AND pl.aceite_status IN ('pendente', 'aceito')
    ) < v_max_leads
  ORDER BY
    -- Round-robin: fewest leads received today
    (SELECT COUNT(*) FROM distribuicao_historico dh
     WHERE dh.corretor_id = de.corretor_id
       AND dh.created_at >= (v_today::text || 'T00:00:00-03:00')::timestamptz) ASC,
    random()
  LIMIT 1;

  IF v_corretor_id IS NULL THEN
    -- No corretor available → mark as pending
    UPDATE pipeline_leads 
    SET aceite_status = 'pendente_distribuicao',
        segmento_id = v_segmento_id,
        updated_at = now()
    WHERE id = p_pipeline_lead_id;
    RETURN jsonb_build_object('success', false, 'reason', 'no_corretor_available', 'segmento_id', v_segmento_id);
  END IF;

  -- Assign lead with SLA timer
  UPDATE pipeline_leads
  SET corretor_id = v_corretor_id,
      segmento_id = v_segmento_id,
      distribuido_em = now(),
      aceite_expira_em = now() + (v_sla_minutos || ' minutes')::interval,
      aceite_status = 'pendente',
      updated_at = now()
  WHERE id = p_pipeline_lead_id;

  -- Record distribution history
  INSERT INTO distribuicao_historico (pipeline_lead_id, corretor_id, segmento_id, acao)
  VALUES (p_pipeline_lead_id, v_corretor_id, v_segmento_id, 'distribuido');

  -- Increment leads counter
  UPDATE corretor_disponibilidade
  SET leads_recebidos_turno = leads_recebidos_turno + 1
  WHERE user_id = v_corretor_id;

  RETURN jsonb_build_object(
    'success', true,
    'corretor_id', v_corretor_id,
    'segmento_id', v_segmento_id,
    'sla_minutos', v_sla_minutos,
    'expires_at', (now() + (v_sla_minutos || ' minutes')::interval)
  );
END;
$function$;

-- 6. Updated reciclar_leads_expirados to respect per-segmento SLA
CREATE OR REPLACE FUNCTION public.reciclar_leads_expirados()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_lead record;
BEGIN
  -- Process expired leads
  FOR v_lead IN
    SELECT pl.id, pl.corretor_id, pl.segmento_id, pl.distribuido_em
    FROM pipeline_leads pl
    WHERE pl.aceite_expira_em < now()
      AND pl.aceite_status = 'pendente'
      AND pl.corretor_id IS NOT NULL
  LOOP
    -- Log rejection
    INSERT INTO distribuicao_historico (pipeline_lead_id, corretor_id, segmento_id, acao, motivo_rejeicao, tempo_resposta_seg)
    VALUES (
      v_lead.id, 
      v_lead.corretor_id, 
      v_lead.segmento_id, 
      'timeout',
      'tempo_excedido',
      EXTRACT(EPOCH FROM (now() - v_lead.distribuido_em))::integer
    );

    -- Reset lead for redistribution
    UPDATE pipeline_leads
    SET corretor_id = NULL,
        distribuido_em = NULL,
        aceite_expira_em = NULL,
        aceite_status = 'pendente_distribuicao',
        updated_at = now()
    WHERE id = v_lead.id;
  END LOOP;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- 7. Function to accept a lead
CREATE OR REPLACE FUNCTION public.aceitar_lead(p_lead_id uuid, p_corretor_id uuid, p_status_inicial text DEFAULT 'ligando_agora')
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead pipeline_leads%ROWTYPE;
  v_tempo_seg integer;
BEGIN
  SELECT * INTO v_lead FROM pipeline_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'lead_not_found');
  END IF;

  IF v_lead.corretor_id != p_corretor_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_assigned_to_you');
  END IF;

  IF v_lead.aceite_status = 'aceito' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_accepted');
  END IF;

  -- Check if SLA expired
  IF v_lead.aceite_expira_em IS NOT NULL AND v_lead.aceite_expira_em < now() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'sla_expired');
  END IF;

  v_tempo_seg := EXTRACT(EPOCH FROM (now() - v_lead.distribuido_em))::integer;

  UPDATE pipeline_leads
  SET aceite_status = 'aceito',
      aceito_em = now(),
      primeiro_contato_em = CASE WHEN p_status_inicial = 'ligando_agora' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_lead_id;

  -- Log acceptance
  INSERT INTO distribuicao_historico (pipeline_lead_id, corretor_id, segmento_id, acao, tempo_resposta_seg)
  VALUES (p_lead_id, p_corretor_id, v_lead.segmento_id, 'aceito', v_tempo_seg);

  -- Log in pipeline history
  INSERT INTO pipeline_historico (pipeline_lead_id, stage_anterior_id, stage_novo_id, movido_por, observacao)
  VALUES (p_lead_id, v_lead.stage_id, v_lead.stage_id, p_corretor_id, 'Lead aceito. Status: ' || p_status_inicial);

  RETURN jsonb_build_object('success', true, 'tempo_resposta_seg', v_tempo_seg, 'status_inicial', p_status_inicial);
END;
$function$;

-- 8. Function to reject a lead with reason
CREATE OR REPLACE FUNCTION public.rejeitar_lead(p_lead_id uuid, p_corretor_id uuid, p_motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead pipeline_leads%ROWTYPE;
  v_tempo_seg integer;
BEGIN
  SELECT * INTO v_lead FROM pipeline_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'lead_not_found');
  END IF;

  IF v_lead.corretor_id != p_corretor_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_assigned_to_you');
  END IF;

  IF v_lead.aceite_status != 'pendente' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_pending');
  END IF;

  v_tempo_seg := EXTRACT(EPOCH FROM (now() - v_lead.distribuido_em))::integer;

  -- Log rejection
  INSERT INTO distribuicao_historico (pipeline_lead_id, corretor_id, segmento_id, acao, motivo_rejeicao, tempo_resposta_seg)
  VALUES (p_lead_id, p_corretor_id, v_lead.segmento_id, 'rejeitado', p_motivo, v_tempo_seg);

  -- Reset lead for redistribution
  UPDATE pipeline_leads
  SET corretor_id = NULL,
      distribuido_em = NULL,
      aceite_expira_em = NULL,
      aceite_status = 'pendente_distribuicao',
      motivo_rejeicao = p_motivo,
      updated_at = now()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object('success', true, 'motivo', p_motivo);
END;
$function$;

-- 9. Function to redistribute pending leads (for managers)
CREATE OR REPLACE FUNCTION public.redistribuir_leads_pendentes(p_segmento_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead record;
  v_count int := 0;
  v_errors int := 0;
  v_result jsonb;
BEGIN
  FOR v_lead IN
    SELECT id FROM pipeline_leads
    WHERE aceite_status = 'pendente_distribuicao'
      AND (p_segmento_id IS NULL OR segmento_id = p_segmento_id)
    ORDER BY 
      CASE prioridade_lead WHEN 'alta' THEN 1 WHEN 'media' THEN 2 WHEN 'baixa' THEN 3 ELSE 4 END,
      created_at ASC
  LOOP
    v_result := distribuir_lead_roleta(v_lead.id);
    IF (v_result->>'success')::boolean THEN
      v_count := v_count + 1;
    ELSE
      v_errors := v_errors + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('redistributed', v_count, 'errors', v_errors);
END;
$function$;

-- 10. Function to get distribution performance metrics
CREATE OR REPLACE FUNCTION public.get_distribuicao_performance(p_periodo text DEFAULT 'hoje')
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_since timestamptz;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_result jsonb;
BEGIN
  IF p_periodo = 'hoje' THEN
    v_since := (v_today::text || 'T00:00:00-03:00')::timestamptz;
  ELSIF p_periodo = 'semana' THEN
    v_since := ((v_today - EXTRACT(DOW FROM v_today)::int + 1)::text || 'T00:00:00-03:00')::timestamptz;
  ELSIF p_periodo = 'mes' THEN
    v_since := (date_trunc('month', v_today)::date::text || 'T00:00:00-03:00')::timestamptz;
  ELSE
    v_since := (v_today::text || 'T00:00:00-03:00')::timestamptz;
  END IF;

  SELECT jsonb_build_object(
    'totais', (
      SELECT jsonb_build_object(
        'distribuidos', COUNT(*) FILTER (WHERE acao = 'distribuido'),
        'aceitos', COUNT(*) FILTER (WHERE acao = 'aceito'),
        'rejeitados', COUNT(*) FILTER (WHERE acao = 'rejeitado'),
        'timeout', COUNT(*) FILTER (WHERE acao = 'timeout'),
        'tempo_medio_resposta_seg', ROUND(AVG(tempo_resposta_seg) FILTER (WHERE acao = 'aceito'))
      )
      FROM distribuicao_historico
      WHERE created_at >= v_since
    ),
    'por_corretor', COALESCE((
      SELECT jsonb_agg(row_to_json(r) ORDER BY r.tempo_medio ASC NULLS LAST)
      FROM (
        SELECT
          dh.corretor_id,
          COALESCE(p.nome, tm.nome, 'Corretor') AS nome,
          COUNT(*) FILTER (WHERE dh.acao = 'distribuido')::int AS recebidos,
          COUNT(*) FILTER (WHERE dh.acao = 'aceito')::int AS aceitos,
          COUNT(*) FILTER (WHERE dh.acao = 'rejeitado')::int AS rejeitados,
          COUNT(*) FILTER (WHERE dh.acao = 'timeout')::int AS timeouts,
          ROUND(AVG(dh.tempo_resposta_seg) FILTER (WHERE dh.acao = 'aceito'))::int AS tempo_medio
        FROM distribuicao_historico dh
        LEFT JOIN profiles p ON p.user_id = dh.corretor_id
        LEFT JOIN team_members tm ON tm.user_id = dh.corretor_id AND tm.status = 'ativo'
        WHERE dh.created_at >= v_since
        GROUP BY dh.corretor_id, p.nome, tm.nome
      ) r
    ), '[]'::jsonb),
    'por_segmento', COALESCE((
      SELECT jsonb_agg(row_to_json(s))
      FROM (
        SELECT
          dh.segmento_id,
          COALESCE(ps.nome, 'Sem segmento') AS nome,
          COUNT(*) FILTER (WHERE dh.acao = 'distribuido')::int AS distribuidos,
          COUNT(*) FILTER (WHERE dh.acao = 'aceito')::int AS aceitos,
          ROUND(AVG(dh.tempo_resposta_seg) FILTER (WHERE dh.acao = 'aceito'))::int AS tempo_medio
        FROM distribuicao_historico dh
        LEFT JOIN pipeline_segmentos ps ON ps.id = dh.segmento_id
        WHERE dh.created_at >= v_since
          AND dh.segmento_id IS NOT NULL
        GROUP BY dh.segmento_id, ps.nome
      ) s
    ), '[]'::jsonb),
    'leads_pendentes', (
      SELECT COUNT(*) FROM pipeline_leads WHERE aceite_status = 'pendente_distribuicao'
    )::int
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
