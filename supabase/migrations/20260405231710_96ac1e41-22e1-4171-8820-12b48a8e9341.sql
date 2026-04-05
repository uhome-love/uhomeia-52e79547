
-- Function that calls distribute-lead edge function via pg_net on new lead insert
CREATE OR REPLACE FUNCTION public.trg_auto_distribute_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Only trigger for leads without a corretor (new unassigned leads)
  IF NEW.corretor_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get Supabase URL and service key
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);

  -- Fallback: try to get from vault secrets
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    SELECT decrypted_secret INTO v_supabase_url 
    FROM vault.decrypted_secrets 
    WHERE name = 'supabase_url' LIMIT 1;
  END IF;

  IF v_service_key IS NULL OR v_service_key = '' THEN
    SELECT decrypted_secret INTO v_service_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'service_role_key' LIMIT 1;
  END IF;

  -- If we can't get credentials, skip auto-distribution silently
  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Call distribute-lead edge function via pg_net (async, non-blocking)
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/distribute-lead',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'action', 'distribute_single',
      'pipeline_lead_id', NEW.id::text
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger (AFTER INSERT so the row is committed and visible to the edge function)
DROP TRIGGER IF EXISTS trg_auto_distribute_new_lead ON public.pipeline_leads;
CREATE TRIGGER trg_auto_distribute_new_lead
  AFTER INSERT ON public.pipeline_leads
  FOR EACH ROW
  WHEN (NEW.corretor_id IS NULL)
  EXECUTE FUNCTION public.trg_auto_distribute_lead();
