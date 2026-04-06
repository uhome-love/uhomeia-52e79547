
-- Fix the lead: move to correct stage and set aceite_status
UPDATE pipeline_leads 
SET stage_id = '2fcba9be-1188-4a54-9452-394beefdc330',
    aceite_status = 'pendente'
WHERE id = '2ec4ac80-6b75-4086-90e3-ef1a10b277ce';

-- Insert notification for Rafaela
INSERT INTO notifications (user_id, tipo, categoria, titulo, mensagem, dados, agrupamento_key)
VALUES (
  '6b34d2ca-4b5f-48ca-a8f7-c1b0f4c4d11e',
  'lead',
  'lead_novo',
  '🚨 Novo Lead! Fátima Maria dos Santos',
  'Você recebeu o lead Fátima Maria dos Santos — via WhatsApp do site. Aceite em 10 minutos!',
  '{"pipeline_lead_id": "2ec4ac80-6b75-4086-90e3-ef1a10b277ce", "lead_nome": "Fátima Maria dos Santos", "telefone": "(51) 98603-0790"}'::jsonb,
  'lead_novo_2ec4ac80-6b75-4086-90e3-ef1a10b277ce'
);
