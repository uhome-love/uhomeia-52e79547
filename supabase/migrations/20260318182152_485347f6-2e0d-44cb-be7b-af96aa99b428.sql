
UPDATE pipeline_leads 
SET segmento_id = '21180d72-f202-4d29-96cb-6ab88d37d5e1',
    empreendimento = 'Open Bosque',
    updated_at = now()
WHERE empreendimento ILIKE '%open bosque%' 
  AND segmento_id IS NULL;
