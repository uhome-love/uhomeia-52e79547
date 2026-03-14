
-- Remove 4 redundant indexes (write-overhead cleanup)
-- Each is fully covered by an equivalent or stronger existing index.

-- 1. Covered by idx_oa_tentativas_corretor_date (identical)
DROP INDEX IF EXISTS public.idx_oferta_ativa_tentativas_corretor;

-- 2. Covered by idx_oa_tentativas_lead (identical)
DROP INDEX IF EXISTS public.idx_oferta_ativa_tentativas_lead;

-- 3. Covered by idx_oa_leads_lista (identical)
DROP INDEX IF EXISTS public.idx_oferta_ativa_leads_lista;

-- 4. Covered by checkpoint_lines_checkpoint_corretor_unique (UNIQUE, same cols)
DROP INDEX IF EXISTS public.idx_checkpoint_lines_composite;
