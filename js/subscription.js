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

            const isVipUser = user.email?.toLowerCase().trim() === 'bismakgustavo3@gmail.com';

            // Tratamento especial para usuário VIP/Admin (bismakgustavo3@gmail.com): PRO vitalício sem cobrança
            if (isVipUser) {
                const { data: proPlan } = await supabaseClient.from('plans').select('*').eq('slug', 'pro').maybeSingle();
                if (proPlan) {
                    if (subs && subs.length > 0) {
                        const currentSub = subs[0];
                        if (currentSub.plan_id !== proPlan.id || currentSub.expires_at !== null || currentSub.status !== 'active') {
                            await supabaseClient.from('subscriptions').update({
                                plan_id: proPlan.id,
                                status: 'active',
                                expires_at: null
                            }).eq('id', currentSub.id);
                            currentSub.plan_id = proPlan.id;
                            currentSub.plans = proPlan;
                            currentSub.status = 'active';
                            currentSub.expires_at = null;
                        }
                        Subscription.current = currentSub;
                    } else {
                        const { data: newSub } = await supabaseClient.from('subscriptions').insert([{
                            user_id: user.id,
                            plan_id: proPlan.id,
                            status: 'active',
                            expires_at: null
                        }]).select('*, plans(*)').single();
                        Subscription.current = newSub || { plan_id: proPlan.id, plans: proPlan, status: 'active', expires_at: null };
                    }
                    return;
                } else {
                    Subscription.current = {
                        plan_id: 'pro-vip',
                        plans: { slug: 'pro', name: 'FINAPP PRO' },
                        status: 'active',
                        expires_at: null
                    };
                    return;
                }
            }

            if (subs && subs.length > 0) {
                Subscription.current = subs[0];
                
                // Verificar se é um trial que expirou
                if (Subscription.current.expires_at && new Date(Subscription.current.expires_at) < new Date()) {
                    const { data: freePlan } = await supabaseClient.from('plans').select('id, name, slug').eq('slug', 'free').maybeSingle();
                    if (freePlan && Subscription.current.plans.slug !== 'free') {
                        await supabaseClient.from('subscriptions').update({
                            plan_id: freePlan.id,
                            expires_at: null
                        }).eq('id', Subscription.current.id);
                        
                        Subscription.current.plan_id = freePlan.id;
                        Subscription.current.plans = freePlan;
                        Subscription.current.expires_at = null;
                        Toast.warning('Seu período de teste PRO acabou. Você voltou para o plano Grátis.');
                    }
                }
                return;
            }

            // 2. Não tem assinatura: buscar os planos
            const { data: plansData, error: planError } = await supabaseClient
                .from('plans')
                .select('*');

            if (planError || !plansData || plansData.length === 0) {
                console.warn('[Subscription] Planos não encontrados.');
                return;
            }
            
            const freePlan = plansData.find(p => p.slug === 'free');
            const proPlan = plansData.find(p => p.slug === 'pro');
            
            // Verificar contagem de usuários
            const { data: userCount } = await supabaseClient.rpc('get_total_users_count');
            
            let planToAssign = freePlan.id;
            let expiresAt = null;
            
            if (userCount !== null && userCount <= 15 && proPlan) {
                planToAssign = proPlan.id;
                const d = new Date();
                d.setDate(d.getDate() + 7);
                expiresAt = d.toISOString();
            }

            // 3. Inserir a assinatura
            const { data: newSub, error: insertError } = await supabaseClient
                .from('subscriptions')
                .insert([{
                    user_id: user.id,
                    plan_id: planToAssign,
                    status: 'active',
                    expires_at: expiresAt
                }])
                .select('*, plans(*)')
                .single();

            if (insertError) {
                if (insertError.code === '23505') {
                    const { data: existing } = await supabaseClient
                        .from('subscriptions')
                        .select('*, plans(*)')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();
                    Subscription.current = existing;
                }
            } else {
                Subscription.current = newSub;
                if (expiresAt) {
                    // Espera 1 segundo para o carregamento do app terminar antes de avisar
                    setTimeout(() => {
                        Toast.info('🎉 Parabéns! Como um dos nossos 15 primeiros usuários, você ganhou 7 dias de PRO grátis!', 8000);
                    }, 1000);
                }
            }
        } finally {
            Subscription._loading = false;
        }
    },

    isPro: () => {
        if (Auth.user?.email?.toLowerCase().trim() === 'bismakgustavo3@gmail.com') return true;
        return Subscription.current?.plans?.slug === 'pro';
    },

    isFree: () => {
        return !Subscription.isPro();
    },

    getPlanName: () => {
        if (Auth.user?.email?.toLowerCase().trim() === 'bismakgustavo3@gmail.com') {
            return Subscription.current?.plans?.name || 'FINAPP PRO (Vitalício)';
        }
        return Subscription.current?.plans?.name || 'FREE';
    }
};
