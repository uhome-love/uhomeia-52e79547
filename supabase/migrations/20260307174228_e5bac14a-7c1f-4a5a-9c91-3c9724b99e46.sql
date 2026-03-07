
-- Add new enum values for pipeline_stage_type
ALTER TYPE public.pipeline_stage_type ADD VALUE IF NOT EXISTS 'sem_contato';
ALTER TYPE public.pipeline_stage_type ADD VALUE IF NOT EXISTS 'qualificacao';
