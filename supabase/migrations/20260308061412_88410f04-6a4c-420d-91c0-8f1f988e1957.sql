
CREATE OR REPLACE FUNCTION public.get_batch_lista_stats(p_lista_ids uuid[], p_corretor_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_today_start timestamptz;
BEGIN
  v_today_start := (((now() AT TIME ZONE 'America/Sao_Paulo')::date)::text || 'T00:00:00-03:00')::timestamptz;

  SELECT jsonb_object_agg(
    lid::text,
    jsonb_build_object(
      'total', COALESCE(s.total, 0),
      'naFila', COALESCE(s.na_fila, 0),
      'aproveitados', COALESCE(s.aproveitados, 0),
      'pct', CASE WHEN COALESCE(s.total, 0) > 0
        THEN ROUND(((COALESCE(s.total, 0) - COALESCE(s.na_fila, 0))::numeric / s.total) * 100)::int
        ELSE 0 END,
      'meusTentativas', COALESCE(t.cnt, 0)
    )
  )
  INTO v_result
  FROM unnest(p_lista_ids) AS lid
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('na_fila', 'em_cooldown') AND (proxima_tentativa_apos IS NULL OR proxima_tentativa_apos <= now()))::int AS na_fila,
      COUNT(*) FILTER (WHERE status = 'aproveitado')::int AS aproveitados
    FROM oferta_ativa_leads
    WHERE lista_id = lid
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS cnt
    FROM oferta_ativa_tentativas
    WHERE lista_id = lid
      AND corretor_id = p_corretor_id
      AND created_at >= v_today_start
  ) t ON true;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;
