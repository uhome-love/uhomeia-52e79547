
CREATE OR REPLACE FUNCTION public.distribute_lead_with_lock(
  p_lead_id UUID,
  p_janela TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_acquired BOOLEAN;
BEGIN
  -- Try to acquire advisory lock (key = hashtext of 'distribute_lead'))
  -- This serializes ALL concurrent distribution calls
  v_lock_acquired := pg_try_advisory_xact_lock(hashtext('distribute_lead_serial'));
  
  IF NOT v_lock_acquired THEN
    -- Another distribution is in progress, wait for it (blocking lock)
    PERFORM pg_advisory_xact_lock(hashtext('distribute_lead_serial'));
  END IF;

  -- The actual distribution logic runs in the edge function
  -- This lock just ensures the edge function calls are serialized
  -- Return success - the edge function will proceed with its logic
  RETURN jsonb_build_object('locked', true, 'lead_id', p_lead_id);
END;
$$;
