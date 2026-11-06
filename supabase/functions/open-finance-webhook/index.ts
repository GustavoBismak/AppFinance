import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const webhookSecret = Deno.env.get('PLUGGY_WEBHOOK_SECRET')
    const incomingSignature = req.headers.get('x-pluggy-webhook-token') || req.headers.get('x-webhook-token')

    // Se um segredo estiver configurado, valida
    if (webhookSecret && incomingSignature !== webhookSecret) {
      console.error('[open-finance-webhook] Assinatura do webhook inválida ou ausente.')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const svcRoleKey = Deno.env.get('SVC_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, svcRoleKey)

    const payload = await req.json()
    const { event, itemId, id: eventId } = payload

    console.log(`[open-finance-webhook] Evento recebido: ${event} para item: ${itemId}`)

    // 1. Gravar evento para idempotência e auditoria
    const uniqueEventId = eventId || `${event}-${itemId}-${Date.now()}`
    const { error: eventErr } = await supabaseAdmin
      .from('bank_webhook_events')
      .insert([{
        provider: 'pluggy',
        event_id: uniqueEventId,
        event_type: event || 'unknown',
        payload: payload,
        processed: false
      }])

    if (eventErr) {
      console.warn('[open-finance-webhook] Evento já processado ou erro de log:', eventErr.message)
    }

    // 2. Se for evento de atualização ou novas transações, aciona sync automático
    if (itemId && (event === 'item/updated' || event === 'transactions/new' || event === 'item/created')) {
      // Localiza a conexão e o usuário vinculado
      const { data: conn } = await supabaseAdmin
        .from('bank_connections')
        .select('user_id')
        .eq('external_item_id', itemId)
        .maybeSingle()

      if (conn?.user_id) {
        // Dispara a sincronização
        try {
          const syncUrl = `${supabaseUrl}/functions/v1/open-finance-sync`
          // Disparo assíncrono para não travar a resposta do webhook
          fetch(syncUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${svcRoleKey}`
            },
            body: JSON.stringify({ itemId })
          }).catch(err => console.error('[open-finance-webhook] Erro ao disparar sync background:', err))
        } catch (syncErr) {
          console.error('[open-finance-webhook] Falha no disparo de sincronização:', syncErr)
        }
      }
    }

    // 3. Marca evento como processado
    await supabaseAdmin
      .from('bank_webhook_events')
      .update({ processed: true })
      .eq('event_id', uniqueEventId)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error('[open-finance-webhook] Erro fatal:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

