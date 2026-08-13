-- Migração: adicionar colunas de vínculo de cartão na tabela lancamentos
-- Execute este script no SQL Editor do Supabase

ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS cartao_id UUID;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS cartao_nome TEXT;
