CREATE OR REPLACE FUNCTION public.fn_fix_aceite_on_corretor_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If corretor is being assigned and aceite_status is still pendente_distribuicao, fix it
  IF NEW.corretor_id IS NOT NULL 
     AND NEW.aceite_status = 'pendente_distribuicao'
     AND (OLD.corretor_id IS NULL OR OLD.corretor_id IS DISTINCT FROM NEW.corretor_id)
  THEN
    NEW.aceite_status := 'pendente';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fix_aceite_on_corretor_assign ON public.pipeline_leads;
CREATE TRIGGER trg_fix_aceite_on_corretor_assign
  BEFORE UPDATE ON public.pipeline_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_fix_aceite_on_corretor_assign();