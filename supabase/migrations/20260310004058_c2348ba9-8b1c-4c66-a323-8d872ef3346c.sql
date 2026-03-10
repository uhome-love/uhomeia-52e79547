-- Fix existing leads: map roleta_segmentos → pipeline_segmentos by name, then set segmento_id
-- Mapping: roleta → pipeline (matched by nome)
-- MCMV: 9948f523 → 21180d72
-- Médio-Alto: d364f084 → c8b24415
-- Altíssimo: 93ca556c → 5e930c09
-- Investimento: 409aeddf → dd96ad01

-- Create a temp mapping CTE and update
WITH seg_map AS (
  SELECT rs.id as roleta_id, ps.id as pipeline_id
  FROM roleta_segmentos rs
  JOIN pipeline_segmentos ps ON LOWER(TRIM(rs.nome)) = LOWER(TRIM(ps.nome))
),
emp_seg AS (
  SELECT rc.empreendimento, sm.pipeline_id as segmento_id
  FROM roleta_campanhas rc
  JOIN seg_map sm ON rc.segmento_id = sm.roleta_id
  WHERE rc.ativo = true
)
-- Exact match
UPDATE pipeline_leads pl
SET segmento_id = es.segmento_id
FROM emp_seg es
WHERE pl.segmento_id IS NULL
  AND LOWER(TRIM(pl.empreendimento)) = LOWER(TRIM(es.empreendimento));

-- Fuzzy: lead empreendimento contains campaign empreendimento
WITH seg_map AS (
  SELECT rs.id as roleta_id, ps.id as pipeline_id
  FROM roleta_segmentos rs
  JOIN pipeline_segmentos ps ON LOWER(TRIM(rs.nome)) = LOWER(TRIM(ps.nome))
),
emp_seg AS (
  SELECT rc.empreendimento, sm.pipeline_id as segmento_id
  FROM roleta_campanhas rc
  JOIN seg_map sm ON rc.segmento_id = sm.roleta_id
  WHERE rc.ativo = true
)
UPDATE pipeline_leads pl
SET segmento_id = es.segmento_id
FROM emp_seg es
WHERE pl.segmento_id IS NULL
  AND pl.empreendimento IS NOT NULL
  AND LOWER(pl.empreendimento) LIKE '%' || LOWER(TRIM(es.empreendimento)) || '%';