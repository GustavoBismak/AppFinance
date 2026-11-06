import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Obter token de API autenticado da Pluggy
async function getPluggyApiKey(clientId: string, clientSecret: string, baseUrl = 'https://api.pluggy.ai'): Promise<string> {
  const res = await fetch(`${baseUrl}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret })
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Falha na autenticação com Pluggy: ${res.status} ${errText}`)
  }

  const data = await res.json()
  return data.apiKey
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

    const directApiKey = Deno.env.get('PLUGGY_API_KEY')
    const clientId = Deno.env.get('PLUGGY_CLIENT_ID')
    const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET')
    const pluggyBaseUrl = Deno.env.get('PLUGGY_API_URL') || 'https://api.pluggy.ai'

    let apiKey = directApiKey
    if (!apiKey) {
      if (!clientId || !clientSecret) {
        return respond({
          success: false,
          error: 'Credenciais da Pluggy (PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET ou PLUGGY_API_KEY) não configuradas no Supabase.'
        }, 500)
      }
      apiKey = await getPluggyApiKey(clientId, clientSecret, pluggyBaseUrl)
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch (_) {
      // Body opcional
    }

    const { itemId } = body

    // 2. Gerar Connect Token para o Widget
    const connectPayload: any = {
      options: {
        clientUserId: user.id
      }
    }

    if (itemId) {
      connectPayload.itemId = itemId
    }

    const tokenRes = await fetch(`${pluggyBaseUrl}/connect_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify(connectPayload)
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      return respond({ success: false, error: `Erro ao gerar Connect Token: ${tokenRes.status} ${errText}` }, 400)
    }

    const tokenData = await tokenRes.json()

    return respond({
      success: true,
      connectToken: tokenData.accessToken,
      userId: user.id
    })

  } catch (error: any) {
    console.error('[open-finance-connect] Erro:', error)
    return respond({ success: false, error: error.message || 'Erro interno do servidor.' }, 500)
  }
})

