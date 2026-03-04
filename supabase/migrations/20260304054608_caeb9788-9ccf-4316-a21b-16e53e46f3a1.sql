
-- Add situacao column to distinguish between the 3 modules
ALTER TABLE public.pdn_entries ADD COLUMN IF NOT EXISTS situacao text NOT NULL DEFAULT 'visita';

-- Add VGV column for Gerados and Assinados
ALTER TABLE public.pdn_entries ADD COLUMN IF NOT EXISTS vgv numeric DEFAULT NULL;

-- Add quando_assina text for Gerados
ALTER TABLE public.pdn_entries ADD COLUMN IF NOT EXISTS quando_assina text DEFAULT NULL;

-- Add status_pagamento for Assinados (pago, falta_pagar)
ALTER TABLE public.pdn_entries ADD COLUMN IF NOT EXISTS status_pagamento text DEFAULT NULL;
