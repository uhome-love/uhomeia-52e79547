
CREATE OR REPLACE FUNCTION public.increment_referral_count(p_referral_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE referrals
  SET total_indicacoes = total_indicacoes + 1,
      updated_at = now()
  WHERE id = p_referral_id;
END;
$$;
