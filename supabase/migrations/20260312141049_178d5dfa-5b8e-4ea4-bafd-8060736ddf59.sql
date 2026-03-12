
-- Delete all bad "Avulso - Meta Ads" leads from Make.com test burst (no phone, today)
-- Also clean related distribution history and notifications

-- 1. Delete distribution history for these leads
DELETE FROM distribuicao_historico
WHERE pipeline_lead_id IN (
  SELECT id FROM pipeline_leads
  WHERE origem = 'meta_ads'
    AND empreendimento = 'Avulso - Meta Ads'
    AND telefone IS NULL
    AND created_at::date = CURRENT_DATE
);

-- 2. Delete the bad leads themselves
DELETE FROM pipeline_leads
WHERE origem = 'meta_ads'
  AND empreendimento = 'Avulso - Meta Ads'
  AND telefone IS NULL
  AND created_at::date = CURRENT_DATE;
