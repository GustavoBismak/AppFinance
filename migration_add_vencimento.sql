-- Migração: adicionar coluna vencimento na tabela cartoes
-- Execute este script no SQL Editor do Supabase

ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS vencimento INTEGER;
