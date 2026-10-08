-- Criar tabelas para o Sistema Financeiro
-- Execute este script no SQL Editor do seu projeto Supabase

-- Tabela de Lançamentos
CREATE TABLE lancamentos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    data DATE NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL,
    tipo TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    forma TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Contas
CREATE TABLE contas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    nome TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    vencimento DATE NOT NULL,
    pago BOOLEAN DEFAULT FALSE,
    data_pagamento DATE,
    obs TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Cartões
CREATE TABLE cartoes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    nome TEXT NOT NULL,
    limite NUMERIC(10,2) NOT NULL,
    utilizado NUMERIC(10,2) DEFAULT 0,
    vencimento INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Veículos
CREATE TABLE veiculo (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    data DATE NOT NULL,
    tipo TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    obs TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Investimentos
CREATE TABLE investimentos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    ativo TEXT NOT NULL,
    aporte NUMERIC(10,2) NOT NULL,
    atual NUMERIC(10,2) NOT NULL,
    tipo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Metas
CREATE TABLE metas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    nome TEXT NOT NULL,
    objetivo NUMERIC(10,2) NOT NULL,
    guardado NUMERIC(10,2) DEFAULT 0,
    prazo DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Configurar RLS (Row Level Security) para proteger os dados de cada usuário
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso: o usuário só pode ver/modificar seus próprios dados
CREATE POLICY "Usuários veem seus próprios lancamentos" ON lancamentos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuários veem suas próprias contas" ON contas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuários veem seus próprios cartoes" ON cartoes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuários veem seus próprios veiculos" ON veiculo FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuários veem seus próprios investimentos" ON investimentos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuários veem suas próprias metas" ON metas FOR ALL USING (auth.uid() = user_id);

-- Tabela de Categorias
CREATE TABLE categorias (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários veem suas próprias categorias" ON categorias FOR ALL USING (auth.uid() = user_id);

-- SAAS: Tabela de Planos
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
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Planos são visíveis para todos" ON plans FOR SELECT USING (active = TRUE);

INSERT INTO plans (name, slug, description, price, billing_cycle) VALUES
('FREE', 'free', 'O básico essencial para organizar suas finanças.', 0.00, 'monthly'),
('PRO', 'pro', 'Controle total com recursos premium.', 14.90, 'monthly');

-- SAAS: Tabela de Assinaturas
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
CREATE POLICY "Usuários inserem a própria assinatura inicial" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários alteram própria assinatura" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- SAAS: Tabela de Administradores
CREATE TABLE admin_users (
    user_id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins podem se ver" ON admin_users FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Admins veem todas as assinaturas" ON subscriptions FOR SELECT USING (is_admin());
