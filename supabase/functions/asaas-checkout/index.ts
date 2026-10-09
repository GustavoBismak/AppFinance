import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) return respond({ success: false, error: 'Não autorizado. Faça login novamente.' })

    const body = await req.json()
    const { planId, cpfCnpj } = body
    console.log('[checkout] planId recebido:', planId, '| user:', user.id, '| cpf:', cpfCnpj)

    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
    const ASAAS_URL = Deno.env.get('ASAAS_URL') || 'https://api.asaas.com/v3'

    if (!ASAAS_API_KEY) return respond({ success: false, error: 'Chave da API do Asaas não configurada.' })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SVC_ROLE_KEY') ?? ''
    )

    // 1. Buscar o plano no banco
    const { data: planData, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()

    console.log('[checkout] planData:', JSON.stringify(planData), '| planError:', JSON.stringify(planError))
    if (planError || !planData) return respond({ success: false, error: `Plano não encontrado (id: ${planId}). Execute migration_planos.sql no Supabase.` })

    // 2. Verificar se o usuário já tem customer_id no Asaas
    let asaasCustomerId = null
    const { data: customerData } = await supabaseAdmin
      .from('customers')
      .select('asaas_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (customerData?.asaas_customer_id) {
      asaasCustomerId = customerData.asaas_customer_id
      console.log('[checkout] Cliente Asaas já existe:', asaasCustomerId)
      
      // Se recebemos um CPF, vamos atualizar o cliente no Asaas por garantia
      if (cpfCnpj) {
        await fetch(`${ASAAS_URL}/customers/${asaasCustomerId}`, {
          method: 'POST', // Asaas usa POST para update no customer route
          headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
          body: JSON.stringify({ cpfCnpj: cpfCnpj.replace(/\D/g, '') })
        })
      }
    } else {
      // 3. Criar cliente no Asaas
      const customerPayload: any = {
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente',
        email: user.email,
      }
      if (cpfCnpj) {
          customerPayload.cpfCnpj = cpfCnpj.replace(/\D/g, '');
      }
      console.log('[checkout] Criando cliente no Asaas:', JSON.stringify(customerPayload))

      const asaasCustomerRes = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify(customerPayload)
      })

      const asaasCustomer = await asaasCustomerRes.json()
      console.log('[checkout] Resposta cliente Asaas:', JSON.stringify(asaasCustomer))

      if (!asaasCustomerRes.ok) {
        const msg = asaasCustomer.errors?.[0]?.description || asaasCustomer.message || 'Erro ao criar cliente no Asaas'
        return respond({ success: false, error: `Asaas (cliente): ${msg}` })
      }

      asaasCustomerId = asaasCustomer.id
      await supabaseAdmin.from('customers').insert({ user_id: user.id, asaas_customer_id: asaasCustomerId })
    }

    // 4. Criar assinatura no Asaas
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const nextDueDate = tomorrow.toISOString().split('T')[0]

    const subscriptionPayload = {
      customer: asaasCustomerId,
      billingType: 'UNDEFINED',
      value: planData.price,
      nextDueDate,
      cycle: 'MONTHLY',
      description: `Assinatura ${planData.name} - FinApp`
    }
    console.log('[checkout] Criando assinatura:', JSON.stringify(subscriptionPayload))

    const asaasSubRes = await fetch(`${ASAAS_URL}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify(subscriptionPayload)
    })

    const asaasSub = await asaasSubRes.json()
    console.log('[checkout] Resposta assinatura:', JSON.stringify(asaasSub))

    if (!asaasSubRes.ok) {
      const msg = asaasSub.errors?.[0]?.description || asaasSub.message || 'Erro ao criar assinatura'
      return respond({ success: false, error: `Asaas (assinatura): ${msg}` })
    }

    // 5. Salvar assinatura no banco
    await supabaseAdmin.from('subscriptions').upsert({
      user_id: user.id,
      plan_id: planId,
      asaas_subscription_id: asaasSub.id,
      status: 'pending',
      payment_provider: 'asaas'
    }, { onConflict: 'user_id' })

    // 6. Buscar link de pagamento da fatura
    let checkoutUrl = ''
    const asaasPaymentsRes = await fetch(`${ASAAS_URL}/payments?subscription=${asaasSub.id}`, {
      headers: { 'access_token': ASAAS_API_KEY }
    })
    const asaasPayments = await asaasPaymentsRes.json()

    if (asaasPayments.data && asaasPayments.data.length > 0) {
      checkoutUrl = asaasPayments.data[0].invoiceUrl
    }

    console.log('[checkout] checkoutUrl:', checkoutUrl)
    return respond({ success: true, checkoutUrl, asaasSubscriptionId: asaasSub.id })

  } catch (error) {
    console.error('[checkout] Erro inesperado:', error.message)
    return respond({ success: false, error: error.message })
  }
})
