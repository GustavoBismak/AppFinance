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
