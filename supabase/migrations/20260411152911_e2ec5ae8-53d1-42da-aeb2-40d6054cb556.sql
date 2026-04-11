
-- Drop the OLD overload (p_data before p_janela) that lacks the corretor_disponibilidade sync
DROP FUNCTION IF EXISTS public.upsert_roleta_fila(uuid, uuid, date, text, uuid);
