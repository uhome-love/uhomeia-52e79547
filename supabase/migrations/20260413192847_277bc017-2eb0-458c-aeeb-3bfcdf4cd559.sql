-- Deactivate legacy stages instead of deleting (FK constraints from pipeline_historico)
UPDATE pipeline_stages 
SET ativo = false 
WHERE id IN (
  '1ea43190-44c8-43ec-91b4-409b055b0e58',  -- Qualificação
  '2096921e-f8c9-4212-91c8-dae055bc5710',  -- Possível Visita
  'c9fcf0ad-dcab-4575-b91f-3f76610e4d44',  -- Visita Marcada
  '5ad4f4aa-b66f-4dc2-ac90-97c55e846a14'   -- Visita Realizada
);