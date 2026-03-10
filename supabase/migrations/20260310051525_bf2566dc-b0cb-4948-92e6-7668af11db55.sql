
-- Remove the auto-create negócio trigger on visita realizada
DROP TRIGGER IF EXISTS trg_auto_criar_negocio_visita ON public.visitas;
DROP FUNCTION IF EXISTS public.auto_criar_negocio_visita();
