
CREATE OR REPLACE FUNCTION public.get_ranking_pipeline_leads(p_periodo text DEFAULT 'dia')
RETURNS TABLE(
  corretor_id uuid,
  corretor_nome text,
  pontos_total bigint,
  novos bigint,
  contatos bigint,
  qualificados bigint,
  possiveis_visitas bigint,
  visitas_marcadas bigint,
  visitas_realizadas bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH periodo AS (
    SELECT 
      CASE 
        WHEN p_periodo = 'semana' THEN (now() AT TIME ZONE 'America/Sao_Paulo')::date - EXTRACT(DOW FROM (now() AT TIME ZONE 'America/Sao_Paulo')::date)::int
        WHEN p_periodo = 'mes' THEN date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date)::date
        ELSE (now() AT TIME ZONE 'America/Sao_Paulo')::date
      END AS data_inicio
  ),
  historico_agg AS (
    SELECT 
      pl.corretor_id,
      COUNT(*) FILTER (WHERE ps_novo.tipo = 'contato_inicial') AS contatos,
      COUNT(*) FILTER (WHERE ps_novo.tipo = 'qualificacao') AS qualificados,
      COUNT(*) FILTER (WHERE ps_novo.tipo = 'possibilidade_visita') AS possiveis_visitas,
      COUNT(*) FILTER (WHERE ps_novo.tipo = 'visita_marcada') AS visitas_marcadas,
      COUNT(*) FILTER (WHERE ps_novo.tipo = 'visita_realizada') AS visitas_realizadas
    FROM pipeline_historico ph
    JOIN pipeline_leads pl ON pl.id = ph.pipeline_lead_id
    JOIN pipeline_stages ps_novo ON ps_novo.id = ph.stage_novo_id
    CROSS JOIN periodo p
    WHERE ph.created_at >= (p.data_inicio || ' 00:00:00-03')::timestamptz
      AND ps_novo.pipeline_tipo = 'leads'
      AND pl.corretor_id IS NOT NULL
    GROUP BY pl.corretor_id
  ),
  novos_agg AS (
    SELECT 
      pl.corretor_id,
      COUNT(*) AS novos
    FROM pipeline_leads pl
    JOIN pipeline_stages ps ON ps.id = pl.stage_id
    CROSS JOIN periodo p
    WHERE pl.created_at >= (p.data_inicio || ' 00:00:00-03')::timestamptz
      AND ps.pipeline_tipo = 'leads'
      AND pl.corretor_id IS NOT NULL
    GROUP BY pl.corretor_id
  ),
  combined AS (
    SELECT 
      tm.user_id AS corretor_id,
      tm.nome AS corretor_nome,
      COALESCE(na.novos, 0) AS novos,
      COALESCE(ha.contatos, 0) AS contatos,
      COALESCE(ha.qualificados, 0) AS qualificados,
      COALESCE(ha.possiveis_visitas, 0) AS possiveis_visitas,
      COALESCE(ha.visitas_marcadas, 0) AS visitas_marcadas,
      COALESCE(ha.visitas_realizadas, 0) AS visitas_realizadas,
      (COALESCE(ha.contatos, 0) * 5 
       + COALESCE(ha.qualificados, 0) * 10
       + COALESCE(ha.possiveis_visitas, 0) * 15
       + COALESCE(ha.visitas_marcadas, 0) * 30
       + COALESCE(ha.visitas_realizadas, 0) * 50) AS pontos_total
    FROM team_members tm
    LEFT JOIN historico_agg ha ON ha.corretor_id = tm.user_id
    LEFT JOIN novos_agg na ON na.corretor_id = tm.user_id
    WHERE tm.status = 'ativo'
      AND tm.user_id IS NOT NULL
      AND (COALESCE(na.novos, 0) + COALESCE(ha.contatos, 0) + COALESCE(ha.qualificados, 0) + COALESCE(ha.possiveis_visitas, 0) + COALESCE(ha.visitas_marcadas, 0) + COALESCE(ha.visitas_realizadas, 0)) > 0
  )
  SELECT * FROM combined
  ORDER BY pontos_total DESC
  LIMIT 50;
$$;
