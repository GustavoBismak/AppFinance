import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SVC_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    // O Asaas manda o payload de Webhook. 
    // Exemplo: { event: 'PAYMENT_RECEIVED', payment: { subscription: 'sub_xyz', ... } }
    
    const event = payload.event;
    const subscriptionId = payload.payment?.subscription;

    if (!subscriptionId) {
       return new Response(JSON.stringify({ message: "Not a subscription payment, ignored." }), { status: 200 })
    }

    let status = 'pending';
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
        status = 'active';
    } else if (event === 'PAYMENT_OVERDUE') {
        status = 'expired';
    }

    // Atualiza a assinatura no Supabase
    if (status === 'active' || status === 'expired') {
        await supabaseAdmin
            .from('subscriptions')
            .update({ status: status })
            .eq('asaas_subscription_id', subscriptionId)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Webhook error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
