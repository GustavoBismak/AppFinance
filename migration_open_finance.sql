-- ====================================================================
-- MIGRAÇÃO OPEN FINANCE — FINAPP
-- ====================================================================
-- Tabelas seguras com RLS para conexões bancárias, contas,
-- transações brutas, logs de sincronização e webhooks.

-- 1. Tabela de Conexões Bancárias (Items do Open Finance)
CREATE TABLE IF NOT EXISTS public.bank_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL DEFAULT 'pluggy',
    external_item_id TEXT NOT NULL,
    connector_id INTEGER,
    institution_name TEXT NOT NULL,
    institution_logo TEXT,
    institution_color TEXT,
    status TEXT NOT NULL DEFAULT 'CONNECTING', -- UPDATED, UPDATING, WAITING_USER_INPUT, LOGIN_ERROR, OUTDATED
    error_code TEXT,
    error_message TEXT,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    consent_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, external_item_id)
);

-- 2. Tabela de Contas Bancárias vinculadas
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bank_connection_id UUID REFERENCES public.bank_connections(id) ON DELETE CASCADE NOT NULL,
    external_account_id TEXT NOT NULL,
    type TEXT NOT NULL, -- BANK, CREDIT, SAVINGS
    subtype TEXT,       -- CHECKING_ACCOUNT, SAVINGS_ACCOUNT, CREDIT_CARD
    name TEXT NOT NULL,
    number TEXT,
    balance_available NUMERIC(14,2) DEFAULT 0,
    balance_current NUMERIC(14,2) DEFAULT 0,
    currency_code TEXT DEFAULT 'BRL',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(bank_connection_id, external_account_id)
);

-- 3. Tabela de Transações brutas do Open Finance
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE NOT NULL,
    external_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL, -- CREDIT (receita) ou DEBIT (despesa)
    category_raw TEXT,
    category_normalized TEXT,
    status TEXT DEFAULT 'POSTED', -- POSTED, PENDING
    is_imported_to_lancamentos BOOLEAN DEFAULT FALSE,
    lancamento_id UUID,
    is_internal_transfer BOOLEAN DEFAULT FALSE,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(bank_account_id, external_id)
);

-- 4. Logs de Sincronização
CREATE TABLE IF NOT EXISTS public.bank_sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bank_connection_id UUID REFERENCES public.bank_connections(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL, -- INITIAL, MANUAL, WEBHOOK, SCHEDULED
    status TEXT NOT NULL,       -- SUCCESS, PARTIAL, ERROR
    accounts_synced INTEGER DEFAULT 0,
    transactions_synced INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Eventos de Webhook (Auditoria e Idempotência)
CREATE TABLE IF NOT EXISTS public.bank_webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'pluggy',
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Adicionar vínculo na tabela existente lancamentos
ALTER TABLE public.lancamentos 
    ADD COLUMN IF NOT EXISTS bank_transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_open_finance BOOLEAN DEFAULT FALSE;

-- ====================================================================
-- ÍNDICES DE PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_bank_conn_user ON public.bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_conn_item ON public.bank_connections(external_item_id);
CREATE INDEX IF NOT EXISTS idx_bank_acc_user ON public.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_acc_conn ON public.bank_accounts(bank_connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_user ON public.bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_acc ON public.bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_date ON public.bank_transactions(date);
CREATE INDEX IF NOT EXISTS idx_bank_tx_ext ON public.bank_transactions(external_id);
CREATE INDEX IF NOT EXISTS idx_lanc_bank_tx ON public.lancamentos(bank_transaction_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================================
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_webhook_events ENABLE ROW LEVEL SECURITY;

-- Políticas bank_connections
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias conexões" ON public.bank_connections;
CREATE POLICY "Usuários gerenciam suas próprias conexões" 
    ON public.bank_connections 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role gerencia todas as conexoes" ON public.bank_connections;
CREATE POLICY "Service role gerencia todas as conexoes" 
    ON public.bank_connections 
    FOR ALL 
    USING (auth.role() = 'service_role') 
    WITH CHECK (auth.role() = 'service_role');

-- Políticas bank_accounts
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias contas bancárias" ON public.bank_accounts;
CREATE POLICY "Usuários gerenciam suas próprias contas bancárias" 
    ON public.bank_accounts 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role gerencia contas bancárias" ON public.bank_accounts;
CREATE POLICY "Service role gerencia contas bancárias" 
    ON public.bank_accounts 
    FOR ALL 
    USING (auth.role() = 'service_role') 
    WITH CHECK (auth.role() = 'service_role');

-- Políticas bank_transactions
DROP POLICY IF EXISTS "Usuários gerenciam suas transações bancárias" ON public.bank_transactions;
CREATE POLICY "Usuários gerenciam suas transações bancárias" 
    ON public.bank_transactions 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role gerencia transações bancárias" ON public.bank_transactions;
CREATE POLICY "Service role gerencia transações bancárias" 
    ON public.bank_transactions 
    FOR ALL 
    USING (auth.role() = 'service_role') 
    WITH CHECK (auth.role() = 'service_role');

-- Políticas bank_sync_logs
DROP POLICY IF EXISTS "Usuários veem seus próprios logs de sync" ON public.bank_sync_logs;
CREATE POLICY "Usuários veem seus próprios logs de sync" 
    ON public.bank_sync_logs 
    FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role gerencia logs de sync" ON public.bank_sync_logs;
CREATE POLICY "Service role gerencia logs de sync" 
    ON public.bank_sync_logs 
    FOR ALL 
    USING (auth.role() = 'service_role') 
    WITH CHECK (auth.role() = 'service_role');

-- Políticas bank_webhook_events (acessível exclusivamente por service_role)
DROP POLICY IF EXISTS "Apenas service_role gerencia webhooks" ON public.bank_webhook_events;
CREATE POLICY "Apenas service_role gerencia webhooks" 
    ON public.bank_webhook_events 
    FOR ALL 
    USING (auth.role() = 'service_role') 
    WITH CHECK (auth.role() = 'service_role');

