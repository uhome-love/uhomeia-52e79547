
CREATE OR REPLACE FUNCTION public.increment_comunicacao_usage(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE comunicacao_templates SET uso_count = uso_count + 1 WHERE id = p_template_id;
END;
$$;
