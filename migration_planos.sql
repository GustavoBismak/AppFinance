-- migration_planos.sql
-- Execute este script no SQL Editor do seu projeto Supabase para criar a estrutura de Planos (SaaS)

CREATE TABLE plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS para segurança
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Política de leitura: qualquer usuário (até anônimo) pode ver os planos (necessário para página de preços pública)
CREATE POLICY "Planos são visíveis para todos" ON plans FOR SELECT USING (active = TRUE);

-- Inserir os planos iniciais do SaaS
INSERT INTO plans (name, slug, description, price, billing_cycle) VALUES
('FREE', 'free', 'O básico essencial para organizar suas finanças.', 0.00, 'monthly'),
('PRO', 'pro', 'Controle total com recursos premium.', 14.90, 'monthly');
