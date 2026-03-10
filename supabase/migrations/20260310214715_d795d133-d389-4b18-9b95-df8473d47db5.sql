
ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS data_assinatura date;

-- Backfill: for existing assinado/vendido records, use fase_changed_at or created_at
UPDATE public.negocios 
SET data_assinatura = COALESCE(fase_changed_at::date, created_at::date)
WHERE fase IN ('assinado', 'vendido') AND data_assinatura IS NULL;
