-- migration_assinaturas.sql
-- Execute este script no SQL Editor do seu projeto Supabase

CREATE TABLE subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    plan_id UUID REFERENCES plans NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE,
    payment_provider TEXT,
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários veem suas próprias assinaturas" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Política temporária para auto-atribuição do plano FREE
CREATE POLICY "Usuários inserem a própria assinatura inicial" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Política para o Webhook/Admin atualizar futuramente (aqui mockada para o usuário para simplificar testes)
CREATE POLICY "Usuários alteram própria assinatura" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
