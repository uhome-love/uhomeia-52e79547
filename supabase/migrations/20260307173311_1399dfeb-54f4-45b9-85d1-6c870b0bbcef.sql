
-- Add new enum values to pipeline_stage_type
ALTER TYPE pipeline_stage_type ADD VALUE IF NOT EXISTS 'contato_inicial';
ALTER TYPE pipeline_stage_type ADD VALUE IF NOT EXISTS 'atendimento';
ALTER TYPE pipeline_stage_type ADD VALUE IF NOT EXISTS 'possibilidade_visita';
ALTER TYPE pipeline_stage_type ADD VALUE IF NOT EXISTS 'visita_marcada';
ALTER TYPE pipeline_stage_type ADD VALUE IF NOT EXISTS 'visita_realizada';
ALTER TYPE pipeline_stage_type ADD VALUE IF NOT EXISTS 'negociacao';
ALTER TYPE pipeline_stage_type ADD VALUE IF NOT EXISTS 'assinatura';
