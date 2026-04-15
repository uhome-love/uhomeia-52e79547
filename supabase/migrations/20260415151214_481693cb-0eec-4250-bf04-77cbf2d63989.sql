
-- Drop existing CHECK constraint on direction
ALTER TABLE public.whatsapp_mensagens DROP CONSTRAINT IF EXISTS whatsapp_mensagens_direction_check;

-- Add new CHECK constraint that includes 'note'
ALTER TABLE public.whatsapp_mensagens ADD CONSTRAINT whatsapp_mensagens_direction_check 
  CHECK (direction = ANY (ARRAY['sent'::text, 'received'::text, 'note'::text]));

-- Make instance_name nullable
ALTER TABLE public.whatsapp_mensagens ALTER COLUMN instance_name DROP NOT NULL;

-- Make whatsapp_message_id nullable  
ALTER TABLE public.whatsapp_mensagens ALTER COLUMN whatsapp_message_id DROP NOT NULL;
