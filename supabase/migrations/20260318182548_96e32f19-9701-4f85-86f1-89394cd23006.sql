
-- Add High Garden Iguatemi to Médio-Alto Padrão segment
UPDATE pipeline_segmentos 
SET empreendimentos = array_append(empreendimentos, 'High Garden Iguatemi'),
    updated_at = now()
WHERE id = 'c8b24415-3dc1-4f65-aae1-f308ef02cb7a';

-- Add to roleta_campanhas
INSERT INTO roleta_campanhas (empreendimento, segmento_id, ativo)
VALUES ('High Garden Iguatemi', 'd364f084-a63b-4be3-892e-15d66e367b43', true)
ON CONFLICT DO NOTHING;

-- Fix existing leads
UPDATE pipeline_leads 
SET segmento_id = 'c8b24415-3dc1-4f65-aae1-f308ef02cb7a',
    empreendimento = 'High Garden Iguatemi',
    updated_at = now()
WHERE empreendimento ILIKE '%high garden%' 
  AND segmento_id IS NULL;
