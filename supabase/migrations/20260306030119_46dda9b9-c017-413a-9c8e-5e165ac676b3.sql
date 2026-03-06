
CREATE OR REPLACE FUNCTION public.get_team_oa_ranking(p_period text DEFAULT 'semana')
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since timestamptz;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_result jsonb;
BEGIN
  IF p_period = 'hoje' THEN
    v_since := (v_today::text || 'T00:00:00-03:00')::timestamptz;
  ELSIF p_period = 'semana' THEN
    v_since := ((v_today - EXTRACT(DOW FROM v_today)::int + 1)::text || 'T00:00:00-03:00')::timestamptz;
  ELSIF p_period = 'mes' THEN
    v_since := (date_trunc('month', v_today)::date::text || 'T00:00:00-03:00')::timestamptz;
  ELSE
    v_since := (v_today::text || 'T00:00:00-03:00')::timestamptz;
  END IF;

  SELECT jsonb_build_object(
    'teams', COALESCE((
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.pontos DESC)
      FROM (
        SELECT
          COALESCE(tm.equipe, 'Sem equipe') AS equipe,
          tm.gerente_id,
          COUNT(ot.id)::int AS tentativas,
          COUNT(ot.id) FILTER (WHERE ot.resultado = 'com_interesse')::int AS aproveitados,
          SUM(ot.pontos)::int AS pontos,
          COUNT(ot.id) FILTER (WHERE ot.canal = 'ligacao')::int AS ligacoes,
          COUNT(ot.id) FILTER (WHERE ot.canal = 'whatsapp')::int AS whatsapps,
          CASE WHEN COUNT(ot.id) > 0
            THEN ROUND((COUNT(ot.id) FILTER (WHERE ot.resultado = 'com_interesse')::numeric / COUNT(ot.id)) * 100)::int
            ELSE 0
          END AS taxa,
          COUNT(DISTINCT ot.corretor_id)::int AS corretores_ativos,
          array_agg(DISTINCT tm.user_id) AS member_user_ids
        FROM oferta_ativa_tentativas ot
        JOIN team_members tm ON tm.user_id = ot.corretor_id AND tm.status = 'ativo'
        WHERE ot.created_at >= v_since
        GROUP BY tm.equipe, tm.gerente_id
        ORDER BY pontos DESC
      ) t
    ), '[]'::jsonb),
    'totals', (
      SELECT jsonb_build_object(
        'tentativas', COALESCE(COUNT(*)::int, 0),
        'aproveitados', COALESCE(COUNT(*) FILTER (WHERE resultado = 'com_interesse')::int, 0),
        'pontos', COALESCE(SUM(pontos)::int, 0),
        'corretores_ativos', COALESCE(COUNT(DISTINCT corretor_id)::int, 0)
      )
      FROM oferta_ativa_tentativas
      WHERE created_at >= v_since
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
