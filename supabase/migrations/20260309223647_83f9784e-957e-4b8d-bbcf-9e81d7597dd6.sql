
CREATE OR REPLACE FUNCTION public.reset_roleta_turno()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_hour int := extract(hour from (now() AT TIME ZONE 'America/Sao_Paulo'));
  v_min int := extract(minute from (now() AT TIME ZONE 'America/Sao_Paulo'));
  v_prev_janela text;
BEGIN
  -- Determine which shift just ended based on current time
  -- 12:00 BRT = morning ended, 18:30 BRT = afternoon ended, 23:30 BRT = night ended
  IF v_hour = 12 AND v_min < 30 THEN
    v_prev_janela := 'manha';
  ELSIF (v_hour = 18 AND v_min >= 30) OR (v_hour = 19 AND v_min < 30) THEN
    v_prev_janela := 'tarde';
  ELSIF v_hour = 23 AND v_min >= 30 THEN
    v_prev_janela := 'noturna';
  ELSE
    v_prev_janela := NULL;
  END IF;

  -- Deactivate fila entries from the previous shift
  IF v_prev_janela IS NOT NULL THEN
    UPDATE roleta_fila
    SET ativo = false
    WHERE data = v_today
      AND ativo = true
      AND janela = v_prev_janela;
  END IF;

  -- Reset lead counters for remaining active entries
  UPDATE roleta_fila
  SET leads_recebidos = 0
  WHERE data = v_today
    AND ativo = true;

  -- Reset turno counter on disponibilidade
  UPDATE corretor_disponibilidade
  SET leads_recebidos_turno = 0
  WHERE na_roleta = true;
END;
$$;
