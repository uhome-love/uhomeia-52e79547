ALTER TABLE public.roleta_campanhas ADD COLUMN ignorar_segmento boolean NOT NULL DEFAULT false;

UPDATE public.roleta_campanhas SET ignorar_segmento = true WHERE id = '79d7a7a1-d185-41b1-b25c-eabdfa0f3212';