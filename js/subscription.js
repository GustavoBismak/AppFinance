// js/subscription.js
window.Subscription = {
    current: null,
    _loading: false,

    ensureFreePlan: async () => {
        const user = Auth.user;
        if (!user || Subscription._loading) return;
        Subscription._loading = true;

        try {
            // 1. Buscar assinatura mais recente do usuário
            const { data: subs, error } = await supabaseClient
                .from('subscriptions')
                .select('*, plans(*)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            // Tabela ainda não existe no banco — ignorar silenciosamente
            if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
                console.warn('[Subscription] Tabela subscriptions não encontrada. Execute as migrations no Supabase.');
                return;
            }
            if (error) {
                console.error('[Subscription] Erro ao buscar assinatura:', error.message);
                return;
            }

            if (subs && subs.length > 0) {
                Subscription.current = subs[0];
                return;
            }

            // 2. Não tem assinatura: buscar o plano FREE e atribuir
            const { data: freePlan, error: planError } = await supabaseClient
                .from('plans')
                .select('id, slug, name, price')
                .eq('slug', 'free')
                .maybeSingle();

            if (planError || !freePlan) {
                console.warn('[Subscription] Plano FREE não encontrado. Execute as migrations no Supabase.');
                return;
            }

            // 3. Inserir com proteção contra duplicidade (UNIQUE user_id seria ideal no banco)
            const { data: newSub, error: insertError } = await supabaseClient
                .from('subscriptions')
                .insert([{
                    user_id: user.id,
                    plan_id: freePlan.id,
                    status: 'active'
                }])
                .select('*, plans(*)')
                .single();

            if (insertError) {
                // Se for violação de duplicidade, tentar buscar a existente
                if (insertError.code === '23505') {
                    const { data: existing } = await supabaseClient
                        .from('subscriptions')
                        .select('*, plans(*)')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();
                    Subscription.current = existing;
                } else {
                    console.error('[Subscription] Erro ao criar assinatura FREE:', insertError.message);
                }
            } else {
                Subscription.current = newSub;
            }
        } finally {
            Subscription._loading = false;
        }
    },

    isPro: () => {
        return Subscription.current?.plans?.slug === 'pro';
    },

    isFree: () => {
        return !Subscription.isPro();
    },

    getPlanName: () => {
        return Subscription.current?.plans?.name || 'FREE';
    }
};
