-- =========================================================================
-- migration_vip_user.sql
-- Atribuir plano PRO Vitalício (sem cobrança) para bismakgustavo3@gmail.com
-- =========================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_pro_plan_id UUID;
BEGIN
  -- 1. Obter o ID do usuário cadastrado no Supabase Auth
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE lower(trim(email)) = 'bismakgustavo3@gmail.com';

  -- 2. Obter o ID do plano PRO na tabela plans
  SELECT id INTO v_pro_plan_id 
  FROM public.plans 
  WHERE slug = 'pro';

  IF v_user_id IS NOT NULL AND v_pro_plan_id IS NOT NULL THEN
    -- Inserir ou atualizar a assinatura para PRO permanente (status = 'active', sem expires_at)
    INSERT INTO public.subscriptions (user_id, plan_id, status, expires_at)
    VALUES (v_user_id, v_pro_plan_id, 'active', NULL)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      plan_id = v_pro_plan_id,
      status = 'active',
      expires_at = NULL;

    -- Opcional: Adicionar usuário também na tabela de administradores
    INSERT INTO public.admin_users (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Usuário bismakgustavo3@gmail.com configurado como PRO Vitalício com sucesso!';
  ELSE
    IF v_user_id IS NULL THEN
      RAISE NOTICE 'Atenção: Usuário bismakgustavo3@gmail.com ainda não foi encontrado no auth.users.';
    END IF;
    IF v_pro_plan_id IS NULL THEN
      RAISE NOTICE 'Atenção: Plano PRO não encontrado na tabela public.plans.';
    END IF;
  END IF;
END $$;
