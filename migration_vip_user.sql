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
    -- Se já tiver registro na tabela subscriptions, atualiza para PRO vitalício
    IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = v_user_id) THEN
      UPDATE public.subscriptions
      SET plan_id = v_pro_plan_id,
          status = 'active',
          expires_at = NULL
      WHERE user_id = v_user_id;
    ELSE
      -- Caso contrário, insere uma nova assinatura ativa
      INSERT INTO public.subscriptions (user_id, plan_id, status, expires_at)
      VALUES (v_user_id, v_pro_plan_id, 'active', NULL);
    END IF;

    -- Conceder permissão na tabela de administradores se ela existir
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users') THEN
      IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = v_user_id) THEN
        INSERT INTO public.admin_users (user_id) VALUES (v_user_id);
      END IF;
    END IF;

    RAISE NOTICE 'Sucesso! Usuário bismakgustavo3@gmail.com configurado como PRO Vitalício e Administrador.';
  ELSE
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Usuário bismakgustavo3@gmail.com não encontrado no auth.users. Certifique-se de que a conta foi criada.';
    END IF;
    IF v_pro_plan_id IS NULL THEN
      RAISE EXCEPTION 'Plano "pro" não encontrado na tabela public.plans.';
    END IF;
  END IF;
END $$;
