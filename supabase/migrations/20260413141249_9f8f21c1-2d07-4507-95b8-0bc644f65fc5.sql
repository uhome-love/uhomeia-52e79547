UPDATE public.pipeline_leads
SET stage_id = '2fcba9be-1188-4a54-9452-394beefdc330',
    stage_changed_at = now(),
    arquivado = false,
    motivo_descarte = null
WHERE id = '43e619a9-6780-4dac-85f6-6599279169b5';