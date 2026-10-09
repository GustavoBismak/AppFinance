-- Cria a tabela de clientes do Asaas (vinculando usuário do Supabase com cliente no Asaas)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    asaas_customer_id VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Habilita RLS na tabela customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para a tabela customers
CREATE POLICY "Usuários podem ver o próprio customer_id" 
    ON public.customers FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Service Role pode fazer tudo em customers" 
    ON public.customers FOR ALL 
    USING (true) WITH CHECK (true);

-- Adiciona campos necessários na tabela subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS asaas_subscription_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'asaas',
ADD COLUMN IF NOT EXISTS next_due_date TIMESTAMP WITH TIME ZONE;
