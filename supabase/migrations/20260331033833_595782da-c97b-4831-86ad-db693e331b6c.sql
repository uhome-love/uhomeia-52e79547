
-- Bloco 1: Add conversation_window_until to pipeline_leads
ALTER TABLE public.pipeline_leads 
ADD COLUMN IF NOT EXISTS conversation_window_until timestamptz DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.pipeline_leads.conversation_window_until IS 'Timestamp until which free-text WhatsApp messages can be sent (24h window from last lead reply)';
