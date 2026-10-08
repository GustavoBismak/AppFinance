# Arquitetura de Pagamentos SaaS (Mercado Pago)

Esta é a documentação técnica da arquitetura preparada na Etapa 8 para processar pagamentos do FinApp Premium de forma totalmente segura.

## Fluxo de Compra Seguro
1. **Frontend (`js/pricing.js`)**: O usuário clica em "Assinar PRO". O frontend faz um POST (ou Supabase Edge Function `invoke`) para o Backend, informando apenas `planId`. Nenhum valor (preço) é enviado pelo Frontend.
2. **Backend (Edge Function / Checkout)**:
   - Lê o plano e o preço real do banco de dados (confiável).
   - Cria uma *Preference* na API do Mercado Pago.
   - Retorna a `init_point` (URL de Checkout) para o Frontend.
3. **Redirecionamento**: O Frontend leva o usuário ao ambiente seguro do Mercado Pago.
4. **Pagamento Realizado**: O usuário paga (Cartão, PIX, etc.).

## O Webhook (Fonte da Verdade)
O Frontend pode até mostrar uma tela de "Obrigado", mas a liberação do recurso PRO só ocorre quando o Webhook abaixo for disparado.

### Esqueleto da Edge Function (`supabase/functions/webhook-mp/index.ts`)
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
    // 1. Validar Assinatura do MP (HMAC)
    // 2. Extrair data.id (ID do Pagamento)
    
    // 3. Consultar MP para ver status real do pagamento
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}` }
    });
    const payment = await mpResponse.json();
    
    if (payment.status === 'approved') {
        // 4. Instanciar Supabase Client em modo ADMIN (Bypassa RLS)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL'), 
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // IMPORTANTE: Chave secreta!
        );
        
        // 5. Atualizar tabela subscriptions
        await supabaseAdmin
            .from('subscriptions')
            .update({
                status: 'active',
                payment_provider: 'mercadopago',
                payment_id: payment.id,
                plan_id: payment.metadata.plan_id // Injetado na criação da preference
            })
            .eq('user_id', payment.metadata.user_id);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

## Resumo de Segurança (Cumprimento da Regra 11)
- **Token no Frontend?** Não. Access Tokens e chaves Service Role ficam exclusivamente no servidor/Edge Function.
- **Frontend mente?** Se um usuário mal intencionado tentar disparar a função `simulateWebhookApproval` (agora deixada para fins de teste), no código final ela sequer existirá, pois o RLS bloqueará UPDATE de status/plan_id originado do cliente (`auth.uid()`), forçando que apenas o Webhook consiga alterar para o plano PRO.
