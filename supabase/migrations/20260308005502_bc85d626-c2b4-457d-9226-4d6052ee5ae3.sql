
-- Add empreendimentos column to pipeline_segmentos
ALTER TABLE public.pipeline_segmentos ADD COLUMN IF NOT EXISTS empreendimentos text[] NOT NULL DEFAULT '{}';

-- Clear existing segments and insert the 4 official Uhome segments
DELETE FROM public.segmento_campanhas;
DELETE FROM public.distribuicao_escala;
DELETE FROM public.pipeline_segmentos;

INSERT INTO public.pipeline_segmentos (nome, cor, ordem, descricao, empreendimentos, ativo, sla_minutos)
VALUES
  ('MCMV / até R$500k', '#16A34A', 1, 'Segmento econômico — Minha Casa Minha Vida', ARRAY['Open Bosque'], true, 5),
  ('Médio-Alto Padrão', '#2563EB', 2, 'Segmento médio-alto padrão', ARRAY['Orygem', 'Las Casas', 'Casa Tua'], true, 5),
  ('Altíssimo Padrão', '#7C3AED', 3, 'Segmento alto padrão e luxo', ARRAY['Lake Eyre'], true, 5),
  ('Investimento', '#B45309', 4, 'Segmento investimento', ARRAY['Casa Bastian', 'Shift'], true, 5);
