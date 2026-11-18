-- migration_update_pro_price.sql
-- Execute este script no SQL Editor do seu projeto Supabase para atualizar o preço do Plano PRO para R$ 39,90

UPDATE public.plans 
SET price = 39.90,
    description = 'Controle total com recursos premium e Open Finance.'
WHERE slug = 'pro';

