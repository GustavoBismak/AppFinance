# GUIA DE IMPLANTAÇÃO E CONFIGURAÇÃO DO OPEN FINANCE — FINAPP

Este guia contém as instruções passo a passo para colocar a integração do **Open Finance (Pluggy)** em funcionamento, seja em ambiente de **Testes (Sandbox)** ou em **Produção**.

---

## 1. EXECUTAR A MIGRAÇÃO NO SUPABASE

1. Acesse o painel do seu projeto no [Supabase](https://supabase.com/dashboard).
2. Abra o menu lateral **SQL Editor**.
3. Crie uma nova query, copie todo o conteúdo do arquivo [`migration_open_finance.sql`](./migration_open_finance.sql) e clique em **Run**.
4. Este script criará as tabelas com RLS e índices:
   - `bank_connections`
   - `bank_accounts`
   - `bank_transactions`
   - `bank_sync_logs`
   - `bank_webhook_events`
   - Vínculos na tabela existente `lancamentos`.

---

## 2. OBTER AS CREDENCIAIS NA PLUGGY

1. Acesse o portal oficial da [Pluggy Dashboard](https://dashboard.pluggy.ai) e crie uma conta gratuita de desenvolvedor.
2. No menu **API Keys / Credentials**, você encontrará:
   - **Client ID**
   - **Client Secret**
3. No menu **Webhooks**, cadastre a URL do seu webhook do Supabase:
   - `https://<seu-projeto>.supabase.co/functions/v1/open-finance-webhook`
   - Eventos recomendados: `item/created`, `item/updated`, `transactions/new`.
   - Defina um **Webhook Secret Token** (ex: uma chave aleatória segura).

---

## 3. CONFIGURAR VARIÁVEIS DE AMBIENTE NO SUPABASE

No Supabase Dashboard, vá em **Project Settings > Edge Functions** (ou via CLI `supabase secrets set`):

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `PLUGGY_CLIENT_ID` | Client ID obtido no dashboard da Pluggy | `12345678-abcd-...` |
| `PLUGGY_CLIENT_SECRET` | Client Secret obtido na Pluggy | `87654321-dcba-...` |
| `PLUGGY_WEBHOOK_SECRET` | Token secreto para validar a assinatura do webhook | `meu_token_secreto_webhook` |
| `PLUGGY_API_URL` | URL base da API da Pluggy (opcional, padrão: `https://api.pluggy.ai`) | `https://api.pluggy.ai` |
| `SVC_ROLE_KEY` | Chave de serviço `service_role` do Supabase (já existente) | `eyJhbGciOi...` |
| `SUPABASE_URL` | URL do projeto Supabase (já existente) | `https://jczdpsztfktxxjzvtdvg.supabase.co` |

---

## 4. DEPLOY DAS SUPABASE EDGE FUNCTIONS

No terminal do seu computador com a Supabase CLI instalada:

```bash
# Efetuar o deploy das 3 funções do Open Finance
supabase functions deploy open-finance-connect
supabase functions deploy open-finance-sync
supabase functions deploy open-finance-webhook
```

---

## 5. COMO TESTAR EM SANDBOX (SIMULAÇÃO REAL)

A implementação já possui o parâmetro `includeSandbox: true` ativado no widget oficial.

Ao clicar em **"Conectar Banco"** na aba **Contas Conectadas**:
1. O widget Pluggy Connect abrirá de forma segura.
2. Na lista de instituições, escolha **Pluggy Bank (Sandbox)** ou qualquer banco com o selo Sandbox.
3. Para simular login com sucesso imediato, use as credenciais padrão do Sandbox Pluggy:
   - **CPF / Usuário:** `user-ok`
   - **Senha:** `password-ok`
4. O Pluggy autenticará imediatamente o consentimento e gerará:
   - Contas correntes e cartões com saldo real simulado.
   - 90 dias de histórico de movimentações (PIX, TED, Salário, Alimentação, etc.).
5. Ao concluir, o FinApp aciona a sincronização automática e exibe suas contas e extrato importado na interface!

---

## 6. MUDANÇA PARA PRODUÇÃO

Para virar a chave de Sandbox para Produção:
1. No dashboard da Pluggy, ative o plano de produção e gere suas credenciais de produção.
2. Atualize `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` no Supabase Secrets com as chaves de produção.
3. Não é necessário alterar nenhum código no FinApp!

