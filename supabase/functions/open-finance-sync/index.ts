import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// -------------------------------------------------------------
// Helper: Autenticação Pluggy
// -------------------------------------------------------------
async function getPluggyApiKey(clientId: string, clientSecret: string, baseUrl = 'https://api.pluggy.ai'): Promise<string> {
  const res = await fetch(`${baseUrl}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret })
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Falha na autenticação Pluggy: ${res.status} ${errText}`)
  }

  const data = await res.json()
  return data.apiKey
}

// -------------------------------------------------------------
// Helper: Mapeamento de Categorias Pluggy -> FinApp
// -------------------------------------------------------------
function mapCategory(pluggyCat: string | null | undefined, desc: string): string {
  const text = ((pluggyCat || '') + ' ' + (desc || '')).toLowerCase()

  if (text.includes('food') || text.includes('restaurante') || text.includes('mercado') || text.includes('supermercado') || text.includes('padaria') || text.includes('ifood') || text.includes('groceries')) {
    return 'Alimentação'
  }
  if (text.includes('transport') || text.includes('uber') || text.includes('99') || text.includes('combustivel') || text.includes('posto') || text.includes('gasolina') || text.includes('estacionamento') || text.includes('pedágio')) {
    return 'Transporte'
  }
  if (text.includes('housing') || text.includes('aluguel') || text.includes('condominio') || text.includes('energia') || text.includes('luz') || text.includes('agua') || text.includes('internet') || text.includes('iptu')) {
    return 'Moradia'
  }
  if (text.includes('health') || text.includes('farmacia') || text.includes('drogaria') || text.includes('hospital') || text.includes('medico') || text.includes('consulta') || text.includes('laboratorio')) {
    return 'Saúde'
  }
  if (text.includes('leisure') || text.includes('cinema') || text.includes('netflix') || text.includes('spotify') || text.includes('viagem') || text.includes('hotel') || text.includes('lazer') || text.includes('show')) {
    return 'Lazer'
  }
  if (text.includes('salary') || text.includes('salario') || text.includes('pro-labore') || text.includes('rendimento') || text.includes('dividend') || text.includes('pagamento recebido')) {
    return 'Renda'
  }
  if (text.includes('tarifa') || text.includes('taxa') || text.includes('iof') || text.includes('anuidade') || text.includes('juros')) {
    return 'Tarifas Bancárias'
  }
  if (text.includes('transfer') || text.includes('ted') || text.includes('doc') || text.includes('transferencia')) {
    return 'Transferência'
  }

  return 'Outros'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const svcRoleKey = Deno.env.get('SVC_ROLE_KEY') ?? ''

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return respond({ success: false, error: 'Token de autenticação não fornecido.' }, 401)
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return respond({ success: false, error: 'Usuário não autenticado.' }, 401)
    }

    // Cliente admin com Service Role para gravação segura
    const supabaseAdmin = createClient(supabaseUrl, svcRoleKey)

    const directApiKey = Deno.env.get('PLUGGY_API_KEY')
    const clientId = Deno.env.get('PLUGGY_CLIENT_ID')
    const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET')
    const pluggyBaseUrl = Deno.env.get('PLUGGY_API_URL') || 'https://api.pluggy.ai'

    let apiKey = directApiKey
    if (!apiKey) {
      if (!clientId || !clientSecret) {
        return respond({ success: false, error: 'Credenciais da Pluggy não configuradas no servidor.' }, 500)
      }
      apiKey = await getPluggyApiKey(clientId, clientSecret, pluggyBaseUrl)
    }

    const body = await req.json().catch(() => ({}))
    const { action = 'sync', itemId, connectionId } = body

    const pluggyHeaders = {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    }

    // -------------------------------------------------------------
    // AÇÃO: DESCONECTAR CONEXÃO BANCÁRIA
    // -------------------------------------------------------------
    if (action === 'disconnect') {
      const targetItemId = itemId
      if (!targetItemId) {
        return respond({ success: false, error: 'Item ID é obrigatório para desconexão.' }, 400)
      }

      // 1. Excluir no Pluggy (revoga consentimento)
      try {
        await fetch(`${pluggyBaseUrl}/items/${targetItemId}`, {
          method: 'DELETE',
          headers: pluggyHeaders
        })
      } catch (delErr) {
        console.warn(`[open-finance-sync] Aviso ao excluir item ${targetItemId} na Pluggy:`, delErr)
      }

      // 2. Remover do banco Supabase do usuário (cascata remove contas e transações associadas)
      await supabaseAdmin
        .from('bank_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('external_item_id', targetItemId)

      return respond({ success: true, message: 'Conexão bancária removida com sucesso.' })
    }

    // -------------------------------------------------------------
    // AÇÃO: SINCRONIZAR (SYNC)
    // -------------------------------------------------------------
    let itemsToSync: string[] = []

    if (itemId) {
      itemsToSync = [itemId]
    } else {
      // Sincronizar todas as conexões ativas do usuário
      const { data: userConns } = await supabaseAdmin
        .from('bank_connections')
        .select('external_item_id')
        .eq('user_id', user.id)

      if (userConns && userConns.length > 0) {
        itemsToSync = userConns.map((c: any) => c.external_item_id)
      }
    }

    if (itemsToSync.length === 0) {
      return respond({ success: false, error: 'Nenhuma conexão informada para sincronização.' }, 400)
    }

    let totalAccountsSynced = 0
    let totalTransactionsSynced = 0
    let lastError: string | null = null

    for (const curItemId of itemsToSync) {
      try {
        // 1. Obter dados do Item na Pluggy
        const itemRes = await fetch(`${pluggyBaseUrl}/items/${curItemId}`, { headers: pluggyHeaders })
        if (!itemRes.ok) {
          const errBody = await itemRes.text()
          throw new Error(`Erro ao buscar Item ${curItemId}: ${itemRes.status} ${errBody}`)
        }
        const itemData = await itemRes.json()

        const connector = itemData.connector || {}
        const institutionName = connector.name || 'Instituição Financeira'
        const institutionLogo = connector.imageUrl || null
        const institutionColor = connector.primaryColor || null
        const itemStatus = itemData.status || 'UPDATED'
        const consentExpiresAt = itemData.consentExpiresAt || null

        // Upsert na tabela bank_connections
        const { data: savedConnection, error: connError } = await supabaseAdmin
          .from('bank_connections')
          .upsert({
            user_id: user.id,
            external_item_id: curItemId,
            connector_id: connector.id || null,
            institution_name: institutionName,
            institution_logo: institutionLogo,
            institution_color: institutionColor,
            status: itemStatus,
            error_code: itemData.error?.code || null,
            error_message: itemData.error?.message || null,
            consent_expires_at: consentExpiresAt,
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, external_item_id' })
          .select()
          .single()

        if (connError) throw connError

        // 2. Buscar Contas associadas ao Item
        const accRes = await fetch(`${pluggyBaseUrl}/accounts?itemId=${curItemId}`, { headers: pluggyHeaders })
        if (!accRes.ok) throw new Error(`Erro ao buscar contas: ${accRes.status}`)
        const accData = await accRes.json()
        const accountsList = accData.results || []

        for (const acc of accountsList) {
          totalAccountsSynced++

          const availableBalance = typeof acc.balance === 'number' ? acc.balance : 0
          const currentBalance = typeof acc.currentBalance === 'number' ? acc.currentBalance : availableBalance

          // Upsert na tabela bank_accounts
          const { data: savedAccount, error: accErr } = await supabaseAdmin
            .from('bank_accounts')
            .upsert({
              user_id: user.id,
              bank_connection_id: savedConnection.id,
              external_account_id: acc.id,
              type: acc.type || 'BANK',
              subtype: acc.subtype || null,
              name: acc.name || 'Conta Corrente',
              number: acc.number || null,
              balance_available: availableBalance,
              balance_current: currentBalance,
              currency_code: acc.currencyCode || 'BRL',
              updated_at: new Date().toISOString()
            }, { onConflict: 'bank_connection_id, external_account_id' })
            .select()
            .single()

          if (accErr) {
            console.error('[open-finance-sync] Erro ao salvar conta:', accErr)
            continue
          }

          // 3. Buscar Transações dos últimos 90 dias
          const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          const toDate = new Date().toISOString().split('T')[0]

          const txRes = await fetch(
            `${pluggyBaseUrl}/transactions?accountId=${acc.id}&from=${fromDate}&to=${toDate}&pageSize=500`,
            { headers: pluggyHeaders }
          )

          if (!txRes.ok) {
            console.warn(`[open-finance-sync] Aviso ao buscar transações da conta ${acc.id}: ${txRes.status}`)
            continue
          }

          const txData = await txRes.json()
          const transactions = txData.results || []

          for (const tx of transactions) {
            totalTransactionsSynced++

            // O Pluggy reporta type: 'DEBIT' (negativo) ou 'CREDIT' (positivo)
            const txType = tx.type === 'CREDIT' ? 'receita' : 'despesa'
            const rawAmount = Math.abs(tx.amount || 0)
            const txDate = tx.date ? tx.date.split('T')[0] : toDate
            const mappedCat = mapCategory(tx.category, tx.description)

            // Salvar na tabela bank_transactions
            const { data: savedTx, error: txErr } = await supabaseAdmin
              .from('bank_transactions')
              .upsert({
                user_id: user.id,
                bank_account_id: savedAccount.id,
                external_id: tx.id,
                description: tx.description || 'Movimentação Bancária',
                amount: rawAmount,
                date: txDate,
                type: tx.type || (txType === 'receita' ? 'CREDIT' : 'DEBIT'),
                category_raw: tx.category || null,
                category_normalized: mappedCat,
                status: tx.status || 'POSTED',
                raw_data: tx
              }, { onConflict: 'bank_account_id, external_id' })
              .select()
              .single()

            if (txErr || !savedTx) continue

            // 4. Inteligência Financeira: Ingestão na tabela lancamentos
            // Verifica se este bank_transaction_id já foi inserido em lancamentos
            const { data: existingLanc } = await supabaseAdmin
              .from('lancamentos')
              .select('id')
              .eq('bank_transaction_id', savedTx.id)
              .maybeSingle()

            if (!existingLanc) {
              // Determina a forma de pagamento compatível com o FinApp
              let formaPagto = 'Pix'
              const descUpper = (tx.description || '').toUpperCase()
              if (acc.subtype === 'CREDIT_CARD' || acc.type === 'CREDIT') {
                formaPagto = 'Cartão de Crédito'
              } else if (descUpper.includes('CARTAO') || descUpper.includes('COMPRA NO DEBITO')) {
                formaPagto = 'Cartão de Débito'
              } else if (descUpper.includes('TED') || descUpper.includes('DOC') || descUpper.includes('TRANSF')) {
                formaPagto = 'Transferência'
              }

              const { data: newLanc, error: lancErr } = await supabaseAdmin
                .from('lancamentos')
                .insert([{
                  user_id: user.id,
                  data: txDate,
                  descricao: tx.description || 'Movimentação Bancária',
                  categoria: mappedCat,
                  tipo: txType,
                  valor: rawAmount,
                  forma: formaPagto,
                  bank_transaction_id: savedTx.id,
                  is_open_finance: true
                }])
                .select('id')
                .single()

              if (!lancErr && newLanc) {
                // Atualiza flag de importado na bank_transactions
                await supabaseAdmin
                  .from('bank_transactions')
                  .update({ is_imported_to_lancamentos: true, lancamento_id: newLanc.id })
                  .eq('id', savedTx.id)
              }
            }
          }
        }

        // Registrar log de sincronização com sucesso
        await supabaseAdmin.from('bank_sync_logs').insert([{
          user_id: user.id,
          bank_connection_id: savedConnection.id,
          trigger_type: 'MANUAL',
          status: 'SUCCESS',
          accounts_synced: totalAccountsSynced,
          transactions_synced: totalTransactionsSynced
        }])

      } catch (err: any) {
        console.error(`[open-finance-sync] Erro ao sincronizar item ${curItemId}:`, err)
        lastError = err.message
      }
    }

    // -------------------------------------------------------------
    // INTELIGÊNCIA FINANCEIRA: DETECÇÃO DE TRANSFERÊNCIAS INTERNAS
    // -------------------------------------------------------------
    try {
      const { data: recentTxs } = await supabaseAdmin
        .from('bank_transactions')
        .select('id, amount, date, type, bank_account_id, description')
        .eq('user_id', user.id)
        .eq('is_internal_transfer', false)
        .order('date', { ascending: false })
        .limit(300)

      if (recentTxs && recentTxs.length > 0) {
        const debits = recentTxs.filter((t: any) => t.type === 'DEBIT')
        const credits = recentTxs.filter((t: any) => t.type === 'CREDIT')

        for (const deb of debits) {
          const matchIndex = credits.findIndex((cre: any) =>
            cre.bank_account_id !== deb.bank_account_id &&
            Math.abs(Number(cre.amount) - Number(deb.amount)) < 0.01 &&
            cre.date === deb.date &&
            !cre._matched
          )

          if (matchIndex !== -1) {
            const matchedCredit = credits[matchIndex]
            matchedCredit._matched = true

            // Marca ambas as transações brutas como transferência interna
            await supabaseAdmin
              .from('bank_transactions')
              .update({ is_internal_transfer: true, category_normalized: 'Transferência Interna' })
              .in('id', [deb.id, matchedCredit.id])

            // Atualiza os lançamentos sincronizados correspondentes
            await supabaseAdmin
              .from('lancamentos')
              .update({ categoria: 'Transferência Interna' })
              .in('bank_transaction_id', [deb.id, matchedCredit.id])
          }
        }
      }
    } catch (detectErr) {
      console.warn('[open-finance-sync] Aviso na detecção de transferências internas:', detectErr)
    }

    return respond({
      success: !lastError,
      accountsSynced: totalAccountsSynced,
      transactionsSynced: totalTransactionsSynced,
      error: lastError
    })

  } catch (error: any) {
    console.error('[open-finance-sync] Erro crítico:', error)
    return respond({ success: false, error: error.message || 'Erro interno.' }, 500)
  }
})

