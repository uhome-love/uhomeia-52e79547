
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS status_imovel text,
  ADD COLUMN IF NOT EXISTS condominio_nome text,
  ADD COLUMN IF NOT EXISTS financiavel boolean,
  ADD COLUMN IF NOT EXISTS mobiliado boolean,
  ADD COLUMN IF NOT EXISTS entrega_ano integer,
  ADD COLUMN IF NOT EXISTS entrega_mes integer;

CREATE INDEX IF NOT EXISTS idx_properties_status_imovel ON properties(status_imovel);
CREATE INDEX IF NOT EXISTS idx_properties_condominio_nome ON properties(condominio_nome);
