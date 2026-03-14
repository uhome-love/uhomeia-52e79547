
-- ═══════════════════════════════════════════════════════════
-- CHECKPOINT COMPATIBILITY LAYER
-- Resolves identity: checkpoint_lines.corretor_id (team_members.id) → auth_user_id
-- Enriches checkpoint_diario with team context
-- ═══════════════════════════════════════════════════════════

-- 1. v_checkpoint_daily: checkpoint_diario already uses auth_user_id as corretor_id
--    This view adds gerente context and team_member_id for cross-reference
CREATE OR REPLACE VIEW public.v_checkpoint_daily AS
SELECT
  cd.id,
  cd.data,
  cd.corretor_id AS auth_user_id,        -- checkpoint_diario.corretor_id IS auth.users.id
  tm.id AS team_member_id,               -- team_members.id for checkpoint_lines cross-ref
  tm.gerente_id,                          -- auth.users.id of the manager
  p.id AS profile_id,                     -- profiles.id for negocios cross-ref
  COALESCE(tm.nome, p.nome, 'Desconhecido') AS corretor_nome,
  cd.presenca,
  cd.meta_ligacoes,
  cd.meta_aproveitados,
  cd.meta_visitas_marcar,
  cd.res_ligacoes,
  cd.res_aproveitados,
  cd.res_visitas_marcadas,
  cd.res_visitas_realizadas,
  cd.res_propostas,
  cd.res_vgv,
  cd.obs_gerente,
  cd.obs_dia,
  cd.publicado,
  cd.created_at,
  cd.updated_at
FROM public.checkpoint_diario cd
LEFT JOIN public.team_members tm
  ON tm.user_id = cd.corretor_id AND tm.status = 'ativo'
LEFT JOIN public.profiles p
  ON p.user_id = cd.corretor_id;

-- 2. v_checkpoint_lines_canonical: resolves checkpoint_lines identity
--    checkpoint_lines.corretor_id = team_members.id → resolves to auth_user_id
CREATE OR REPLACE VIEW public.v_checkpoint_lines_canonical AS
SELECT
  cl.id,
  cl.checkpoint_id,
  cl.corretor_id AS team_member_id,         -- original FK to team_members
  tm.user_id AS auth_user_id,               -- resolved canonical identity
  tm.gerente_id,                             -- manager's auth.users.id
  tm.nome AS corretor_nome,
  c.data AS checkpoint_date,
  c.status AS checkpoint_status,
  c.gerente_id AS checkpoint_gerente_id,
  cl.meta_ligacoes,
  cl.meta_leads,
  cl.meta_propostas,
  cl.meta_visitas_marcadas,
  cl.meta_visitas_realizadas,
  cl.meta_presenca,
  cl.meta_vgv_assinado,
  cl.meta_vgv_gerado,
  cl.real_ligacoes,
  cl.real_leads,
  cl.real_propostas,
  cl.real_visitas_marcadas,
  cl.real_visitas_realizadas,
  cl.real_presenca,
  cl.real_vgv_assinado,
  cl.real_vgv_gerado,
  cl.obs_gerente,
  cl.obs_dia,
  cl.status_dia,
  cl.created_at,
  cl.updated_at
FROM public.checkpoint_lines cl
JOIN public.team_members tm ON tm.id = cl.corretor_id
JOIN public.checkpoints c ON c.id = cl.checkpoint_id;

-- 3. RPC: Get checkpoint daily summary for a date, for given user_ids or all
--    Returns aggregated checkpoint data with live OA + visitas overlay
CREATE OR REPLACE FUNCTION public.get_checkpoint_summary(
  p_date DATE,
  p_user_ids UUID[] DEFAULT NULL
)
RETURNS TABLE(
  auth_user_id UUID,
  team_member_id UUID,
  gerente_id UUID,
  corretor_nome TEXT,
  presenca TEXT,
  meta_ligacoes INT,
  meta_aproveitados INT,
  meta_visitas_marcar INT,
  live_ligacoes BIGINT,
  live_aproveitados BIGINT,
  live_visitas_marcadas BIGINT,
  live_visitas_realizadas BIGINT,
  saved_res_ligacoes INT,
  saved_res_aproveitados INT,
  saved_res_visitas_marcadas INT,
  saved_res_visitas_realizadas INT,
  saved_res_propostas INT,
  obs_gerente TEXT,
  obs_dia TEXT,
  publicado BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH team AS (
    SELECT tm.id AS team_member_id, tm.user_id AS auth_user_id, tm.gerente_id, tm.nome
    FROM public.team_members tm
    WHERE tm.status = 'ativo'
      AND (p_user_ids IS NULL OR tm.user_id = ANY(p_user_ids))
      AND tm.user_id IS NOT NULL
  ),
  saved AS (
    SELECT cd.corretor_id, cd.presenca, cd.meta_ligacoes, cd.meta_aproveitados,
           cd.meta_visitas_marcar, cd.res_ligacoes, cd.res_aproveitados,
           cd.res_visitas_marcadas, cd.res_visitas_realizadas, cd.res_propostas,
           cd.obs_gerente, cd.obs_dia, cd.publicado
    FROM public.checkpoint_diario cd
    WHERE cd.data = p_date
  ),
  oa AS (
    SELECT t.corretor_id,
           COUNT(*) AS ligacoes,
           COUNT(*) FILTER (WHERE t.resultado = 'com_interesse') AS aproveitados
    FROM public.oferta_ativa_tentativas t
    WHERE t.created_at >= p_date::timestamp
      AND t.created_at < (p_date + 1)::timestamp
      AND (p_user_ids IS NULL OR t.corretor_id = ANY(p_user_ids))
    GROUP BY t.corretor_id
  ),
  vis_marcadas AS (
    SELECT v.corretor_id, COUNT(*) AS total
    FROM public.visitas v
    WHERE v.data_visita = p_date
      AND (p_user_ids IS NULL OR v.corretor_id = ANY(p_user_ids))
    GROUP BY v.corretor_id
  ),
  vis_realizadas AS (
    SELECT v.corretor_id, COUNT(*) AS total
    FROM public.visitas v
    WHERE v.data_visita = p_date AND v.status = 'realizada'
      AND (p_user_ids IS NULL OR v.corretor_id = ANY(p_user_ids))
    GROUP BY v.corretor_id
  )
  SELECT
    t.auth_user_id,
    t.team_member_id,
    t.gerente_id,
    t.nome::TEXT AS corretor_nome,
    COALESCE(s.presenca, 'nao_informado')::TEXT AS presenca,
    COALESCE(s.meta_ligacoes, 0) AS meta_ligacoes,
    COALESCE(s.meta_aproveitados, 0) AS meta_aproveitados,
    COALESCE(s.meta_visitas_marcar, 0) AS meta_visitas_marcar,
    COALESCE(o.ligacoes, 0) AS live_ligacoes,
    COALESCE(o.aproveitados, 0) AS live_aproveitados,
    COALESCE(vm.total, 0) AS live_visitas_marcadas,
    COALESCE(vr.total, 0) AS live_visitas_realizadas,
    COALESCE(s.res_ligacoes, 0) AS saved_res_ligacoes,
    COALESCE(s.res_aproveitados, 0) AS saved_res_aproveitados,
    COALESCE(s.res_visitas_marcadas, 0) AS saved_res_visitas_marcadas,
    COALESCE(s.res_visitas_realizadas, 0) AS saved_res_visitas_realizadas,
    COALESCE(s.res_propostas, 0) AS saved_res_propostas,
    COALESCE(s.obs_gerente, '')::TEXT AS obs_gerente,
    COALESCE(s.obs_dia, '')::TEXT AS obs_dia,
    COALESCE(s.publicado, false) AS publicado
  FROM team t
  LEFT JOIN saved s ON s.corretor_id = t.auth_user_id
  LEFT JOIN oa o ON o.corretor_id = t.auth_user_id
  LEFT JOIN vis_marcadas vm ON vm.corretor_id = t.auth_user_id
  LEFT JOIN vis_realizadas vr ON vr.corretor_id = t.auth_user_id;
$$;
