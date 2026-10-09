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
    const { planId, cpfCnpj, billingType = 'UNDEFINED' } = body
    console.log('[checkout] planId:', planId, '| user:', user.id, '| cpf:', cpfCnpj, '| type:', billingType)

    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
    const ASAAS_URL = Deno.env.get('ASAAS_URL') || 'https://api.asaas.com/v3'

    if (!ASAAS_API_KEY) return respond({ success: false, error: 'Chave da API do Asaas não configurada.' })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SVC_ROLE_KEY') ?? ''
    )

    // 1. Buscar o plano
    const { data: planData, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !planData) return respond({ success: false, error: 'Plano não encontrado.' })

    // 2. Verificar/Criar cliente
    let asaasCustomerId = null
    const { data: customerData } = await supabaseAdmin.from('customers').select('asaas_customer_id').eq('user_id', user.id).maybeSingle()

    if (customerData?.asaas_customer_id) {
      asaasCustomerId = customerData.asaas_customer_id
      if (cpfCnpj) {
        await fetch(`${ASAAS_URL}/customers/${asaasCustomerId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
          body: JSON.stringify({ cpfCnpj: cpfCnpj.replace(/\D/g, '') })
        })
      }
    } else {
      const customerPayload: any = {
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente',
        email: user.email,
      }
      // Se não veio cpfCnpj na req, tenta pegar do metadata
      const finalCpf = cpfCnpj || user.user_metadata?.cpfCnpj;
      if (finalCpf) {
          customerPayload.cpfCnpj = finalCpf.replace(/\D/g, '');
      }

      const asaasCustomerRes = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify(customerPayload)
      })

      const asaasCustomer = await asaasCustomerRes.json()
      if (!asaasCustomerRes.ok) return respond({ success: false, error: `Asaas (cliente): ${asaasCustomer.errors?.[0]?.description}` })
      
      asaasCustomerId = asaasCustomer.id
      await supabaseAdmin.from('customers').insert({ user_id: user.id, asaas_customer_id: asaasCustomerId })
    }

    // 3. Criar assinatura
    const today = new Date().toISOString().split('T')[0]
    const subscriptionPayload = {
      customer: asaasCustomerId,
      billingType: billingType,
      value: planData.price,
      nextDueDate: today,
      cycle: 'MONTHLY',
      description: `Assinatura ${planData.name} - FinApp`
    }

    const asaasSubRes = await fetch(`${ASAAS_URL}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify(subscriptionPayload)
    })

    const asaasSub = await asaasSubRes.json()
    if (!asaasSubRes.ok) return respond({ success: false, error: `Asaas (assinatura): ${asaasSub.errors?.[0]?.description}` })

    // 4. Salvar no banco
    await supabaseAdmin.from('subscriptions').upsert({
      user_id: user.id,
      plan_id: planId,
      asaas_subscription_id: asaasSub.id,
      status: 'pending',
      payment_provider: 'asaas'
    }, { onConflict: 'user_id' })

    // 5. Buscar cobrança gerada
    let checkoutUrl = ''
    let paymentId = ''
    const asaasPaymentsRes = await fetch(`${ASAAS_URL}/payments?subscription=${asaasSub.id}`, {
      headers: { 'access_token': ASAAS_API_KEY }
    })
    const asaasPayments = await asaasPaymentsRes.json()

    if (asaasPayments.data && asaasPayments.data.length > 0) {
      checkoutUrl = asaasPayments.data[0].invoiceUrl
      paymentId = asaasPayments.data[0].id
    }

    // Se for PIX, buscar o QR Code payload
    let pixData = null;
    if (billingType === 'PIX' && paymentId) {
        const pixRes = await fetch(`${ASAAS_URL}/payments/${paymentId}/pixQrCode`, {
            headers: { 'access_token': ASAAS_API_KEY }
        })
        if (pixRes.ok) {
            pixData = await pixRes.json()
        }
    }

    return respond({ success: true, checkoutUrl, asaasSubscriptionId: asaasSub.id, pix: pixData, paymentId })

  } catch (error) {
    return respond({ success: false, error: error.message })
  }
})
