import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Get the user from the request
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const { planId } = body // Ex: 'pro'
    
    // Configurações do Asaas
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
    const ASAAS_URL = Deno.env.get('ASAAS_URL') || 'https://sandbox.asaas.com/api/v3' // Use sandbox para testes

    if (!ASAAS_API_KEY) throw new Error('Asaas API key missing')

    // 1. Verificar se o usuário já tem customer_id
    // Usaremos o Service Role para contornar o RLS se necessário, 
    // mas como a query é pro próprio user_id, a anon key com auth header já funciona.
    let asaasCustomerId = null;
    const { data: customerData } = await supabaseClient
      .from('customers')
      .select('asaas_customer_id')
      .eq('user_id', user.id)
      .single()

    if (customerData?.asaas_customer_id) {
      asaasCustomerId = customerData.asaas_customer_id;
    } else {
      // 2. Criar cliente no Asaas
      const customerBody = {
        name: user.user_metadata?.full_name || user.email,
        email: user.email,
      }
      
      const asaasCustomerRes = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY
        },
        body: JSON.stringify(customerBody)
      })
      
      const asaasCustomer = await asaasCustomerRes.json()
      if (!asaasCustomerRes.ok) throw new Error(asaasCustomer.errors?.[0]?.description || 'Erro ao criar cliente no Asaas')
      
      asaasCustomerId = asaasCustomer.id
      
      // Salvar no banco (aqui precisamos do service_role para garantir a gravação segura caso o RLS limite)
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SVC_ROLE_KEY') ?? ''
      )
      
      await supabaseAdmin.from('customers').insert({
        user_id: user.id,
        asaas_customer_id: asaasCustomerId
      })
    }

    // 3. Criar a assinatura no Asaas
    // O valor do plano deve vir do banco para não depender do frontend
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SVC_ROLE_KEY') ?? ''
    )
    
    const { data: planData } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()
      
    if (!planData) throw new Error('Plano não encontrado')

    const subscriptionBody = {
      customer: asaasCustomerId,
      billingType: 'PIX', // Pode ser BOLETO, CREDIT_CARD, PIX, UNDEFINED
      value: planData.price,
      nextDueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0], // Amanhã
      cycle: 'MONTHLY',
      description: `Assinatura ${planData.name}`
    }

    const asaasSubRes = await fetch(`${ASAAS_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY
      },
      body: JSON.stringify(subscriptionBody)
    })

    const asaasSub = await asaasSubRes.json()
    if (!asaasSubRes.ok) throw new Error(asaasSub.errors?.[0]?.description || 'Erro ao criar assinatura no Asaas')

    // 4. Salvar a assinatura com status 'pending' no banco
    await supabaseAdmin.from('subscriptions').upsert({
      user_id: user.id,
      plan_id: planId,
      asaas_subscription_id: asaasSub.id,
      status: 'pending',
      payment_provider: 'asaas'
    }, { onConflict: 'user_id' }) // Atualiza se já existir

    // Retorna o link de pagamento da primeira cobrança (se houver fatura vinculada)
    // Se quiser pegar o link do PIX:
    let checkoutUrl = '';
    // Pegar as faturas da assinatura para redirecionar o cliente para pagamento
    const asaasPaymentsRes = await fetch(`${ASAAS_URL}/payments?subscription=${asaasSub.id}`, {
        headers: { 'access_token': ASAAS_API_KEY }
    })
    const asaasPayments = await asaasPaymentsRes.json()
    
    if (asaasPayments.data && asaasPayments.data.length > 0) {
        checkoutUrl = asaasPayments.data[0].invoiceUrl;
    }

    return new Response(
      JSON.stringify({ checkoutUrl, asaasSubscriptionId: asaasSub.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
