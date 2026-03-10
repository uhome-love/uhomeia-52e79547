
CREATE OR REPLACE FUNCTION oa_aproveitado_to_pipeline()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_stage_id uuid;
  v_stage_tipo text;
BEGIN
  IF NEW.status <> 'aproveitado' THEN RETURN NEW; END IF;
  IF OLD.status = 'aproveitado' THEN RETURN NEW; END IF;

  v_stage_tipo := CASE COALESCE(NEW.interesse_tipo, 'com_interesse')
    WHEN 'pediu_informacoes' THEN 'contato_inicial'
    WHEN 'demonstrou_interesse' THEN 'atendimento'
    WHEN 'quer_visitar' THEN 'possibilidade_visita'
    WHEN 'visita_marcada' THEN 'visita_marcada'
    ELSE 'contato_inicial'
  END;

  SELECT id INTO v_stage_id
  FROM pipeline_stages
  WHERE tipo = v_stage_tipo AND ativo = true
  LIMIT 1;

  IF v_stage_id IS NULL THEN
    SELECT id INTO v_stage_id
    FROM pipeline_stages
    WHERE tipo = 'novo_lead' AND ativo = true
    LIMIT 1;
  END IF;

  IF v_stage_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.telefone_normalizado IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pipeline_leads
      WHERE (telefone = NEW.telefone OR telefone = NEW.telefone_normalizado)
      LIMIT 1
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO pipeline_leads (
    nome, telefone, telefone2, email, empreendimento,
    stage_id, corretor_id, origem, origem_detalhe,
    observacoes, created_by, aceite_status, aceito_em
  ) VALUES (
    NEW.nome, NEW.telefone, NEW.telefone2, NEW.email, NEW.empreendimento,
    v_stage_id, NEW.corretor_id, 'Oferta Ativa',
    COALESCE(NEW.campanha, NEW.origem, 'Reativação'),
    'Lead reativado via Oferta Ativa (' || COALESCE(NEW.interesse_tipo, 'com_interesse') || '). Lista: ' || COALESCE(
      (SELECT nome FROM oferta_ativa_listas WHERE id = NEW.lista_id), 'N/A'
    ) || '. Tentativas: ' || NEW.tentativas_count::text,
    NEW.corretor_id,
    'aceito',
    now()
  );

  RETURN NEW;
END;
$$;
