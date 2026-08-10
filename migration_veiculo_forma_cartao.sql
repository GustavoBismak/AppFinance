-- Migração: adicionar colunas de forma de pagamento e vínculo de cartão na tabela veiculo
-- Execute este script no SQL Editor do Supabase

ALTER TABLE veiculo ADD COLUMN IF NOT EXISTS forma TEXT;
ALTER TABLE veiculo ADD COLUMN IF NOT EXISTS cartao_id UUID;
ALTER TABLE veiculo ADD COLUMN IF NOT EXISTS cartao_nome TEXT;
