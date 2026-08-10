-- Migração: criar tabela de categorias personalizadas
-- Execute este script no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS categorias (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem suas próprias categorias" 
ON categorias FOR ALL USING (auth.uid() = user_id);
