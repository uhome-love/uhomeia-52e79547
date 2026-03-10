
-- Drop both auto-negocio triggers that auto-create negocios and move leads to Convertido
-- Business requirement: lead should stay in "Visita Realizada" until user manually clicks "Criar Negócio"

DROP TRIGGER IF EXISTS trg_auto_criar_negocio ON public.pipeline_leads;
DROP TRIGGER IF EXISTS lead_to_negocio_on_visita_realizada ON public.pipeline_leads;

-- Keep the functions in case we need them later, just disable the triggers
