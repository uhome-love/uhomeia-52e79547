CREATE OR REPLACE FUNCTION public.notify_lead_distribuido()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only fire when corretor_id changes from NULL to a value (distribution)
  IF OLD.corretor_id IS NULL AND NEW.corretor_id IS NOT NULL AND NEW.distribuido_em IS NOT NULL THEN
    PERFORM criar_notificacao(
      NEW.corretor_id,
      'leads',
      'novo_lead',
      '🎉 NOVO LEAD! Você tem 5 minutos para aceitar, abre aqui.',
      COALESCE(NEW.nome, 'Novo Lead') || ' — ' || COALESCE(NEW.empreendimento, 'Sem empreendimento') || '. Aceite agora!',
      jsonb_build_object('lead_id', NEW.id, 'nome', NEW.nome, 'empreendimento', NEW.empreendimento),
      'novo_lead'
    );
  END IF;

  -- Notify when lead is redistributed (corretor changes)
  IF OLD.corretor_id IS NOT NULL AND NEW.corretor_id IS NOT NULL 
     AND OLD.corretor_id != NEW.corretor_id AND NEW.distribuido_em IS NOT NULL THEN
    PERFORM criar_notificacao(
      OLD.corretor_id,
      'leads',
      'lead_redistribuido',
      'Lead redistribuído',
      'Lead ' || COALESCE(NEW.nome, '') || ' foi redistribuído por falta de atendimento.',
      jsonb_build_object('lead_id', NEW.id, 'nome', NEW.nome),
      NULL
    );
    PERFORM criar_notificacao(
      NEW.corretor_id,
      'leads',
      'novo_lead',
      '🎉 NOVO LEAD! Você tem 5 minutos para aceitar, abre aqui.',
      COALESCE(NEW.nome, 'Novo Lead') || ' — ' || COALESCE(NEW.empreendimento, 'Sem empreendimento') || '. Aceite agora!',
      jsonb_build_object('lead_id', NEW.id, 'nome', NEW.nome, 'empreendimento', NEW.empreendimento),
      'novo_lead'
    );
  END IF;

  -- Notify when lead moves to venda stage
  IF OLD.stage_id != NEW.stage_id THEN
    DECLARE
      v_stage_tipo text;
      v_corretor_nome text;
    BEGIN
      SELECT tipo INTO v_stage_tipo FROM pipeline_stages WHERE id = NEW.stage_id;
      SELECT nome INTO v_corretor_nome FROM profiles WHERE user_id = NEW.corretor_id;
      
      IF v_stage_tipo = 'venda' THEN
        INSERT INTO notifications (user_id, tipo, categoria, titulo, mensagem, dados, agrupamento_key)
        SELECT ur.user_id, 'vendas', 'venda_assinada',
          '🎉 Venda assinada!',
          COALESCE(v_corretor_nome, 'Corretor') || ' fechou venda: ' || COALESCE(NEW.empreendimento, 'Imóvel') || '. VGV: R$ ' || COALESCE(NEW.valor_estimado::text, '0'),
          jsonb_build_object('lead_id', NEW.id, 'nome', NEW.nome, 'corretor_nome', v_corretor_nome, 'empreendimento', NEW.empreendimento, 'vgv', NEW.valor_estimado),
          NULL
        FROM user_roles ur WHERE ur.role = 'admin';

        INSERT INTO notifications (user_id, tipo, categoria, titulo, mensagem, dados, agrupamento_key)
        SELECT ur.user_id, 'vendas', 'venda_assinada',
          '🎉 Venda assinada!',
          COALESCE(v_corretor_nome, 'Corretor') || ' fechou venda: ' || COALESCE(NEW.empreendimento, 'Imóvel'),
          jsonb_build_object('lead_id', NEW.id, 'nome', NEW.nome, 'corretor_nome', v_corretor_nome),
          NULL
        FROM user_roles ur WHERE ur.role = 'gestor';
      END IF;

      IF v_stage_tipo = 'proposta' THEN
        INSERT INTO notifications (user_id, tipo, categoria, titulo, mensagem, dados, agrupamento_key)
        SELECT ur.user_id, 'propostas', 'proposta_criada',
          'Nova proposta criada',
          COALESCE(v_corretor_nome, 'Corretor') || ' criou proposta para ' || COALESCE(NEW.nome, 'cliente'),
          jsonb_build_object('lead_id', NEW.id, 'nome', NEW.nome, 'corretor_nome', v_corretor_nome),
          'proposta_criada'
        FROM user_roles ur WHERE ur.role = 'gestor';
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$function$;