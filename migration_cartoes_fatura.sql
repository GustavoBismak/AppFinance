-- Migração: adicionar coluna fatura na tabela cartoes
-- Execute este script no SQL Editor do Supabase

ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS fatura NUMERIC(10,2) DEFAULT 0;
