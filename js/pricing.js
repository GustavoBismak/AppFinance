window.Pricing = {
    plans: [],

    load: async () => {
        try {
            const { data, error } = await supabaseClient
                .from('plans')
                .select('*')
                .eq('active', true)
                .order('price', { ascending: true });

            if (error) throw error;
            Pricing.plans = data;
            Pricing.render();
        } catch (e) {
            console.error('Erro ao buscar planos:', e);
            document.getElementById('pricing-cards-container').innerHTML = `
                <p class="text-danger text-center" style="grid-column: 1 / -1;">Erro ao carregar planos. Tente novamente mais tarde.</p>
            `;
        }
    },

    render: () => {
        const container = document.getElementById('pricing-cards-container');
        container.innerHTML = '';

        Pricing.plans.forEach(plan => {
            const isPro = plan.slug === 'pro';
            const isCurrent = window.Subscription?.current?.plans?.slug === plan.slug;
            
            let featuresHtml = '';
            if (isPro) {
                featuresHtml = `
                    <li style="margin-bottom: 12px; display: flex; align-items: center;"><i class="ph ph-check" style="color: var(--primary); margin-right: 8px;"></i> Tudo do plano Free</li>
                    <li style="margin-bottom: 12px; display: flex; align-items: center;"><i class="ph ph-check" style="color: var(--primary); margin-right: 8px;"></i> Gestão de Contas a Pagar</li>
                    <li style="margin-bottom: 12px; display: flex; align-items: center;"><i class="ph ph-check" style="color: var(--primary); margin-right: 8px;"></i> Controle de Cartões</li>
                    <li style="margin-bottom: 12px; display: flex; align-items: center;"><i class="ph ph-check" style="color: var(--primary); margin-right: 8px;"></i> Gestão de Veículos</li>
                    <li style="margin-bottom: 12px; display: flex; align-items: center;"><i class="ph ph-check" style="color: var(--primary); margin-right: 8px;"></i> Carteira de Investimentos</li>
                    <li style="margin-bottom: 12px; display: flex; align-items: center;"><i class="ph ph-check" style="color: var(--primary); margin-right: 8px;"></i> Controle de Metas</li>
                    <li style="margin-bottom: 12px; display: flex; align-items: center;"><i class="ph ph-check" style="color: var(--primary); margin-right: 8px;"></i> Relatórios Avançados</li>
                `;
            } else {
                featuresHtml = `
                    <li style="margin-bottom: 12px; display: flex; align-items: center;"><i class="ph ph-check" style="color: var(--primary); margin-right: 8px;"></i> Dashboard Resumo</li>
                    <li style="margin-bottom: 12px; display: flex; align-items: center;"><i class="ph ph-check" style="color: var(--primary); margin-right: 8px;"></i> Receitas e Despesas</li>
                    <li style="margin-bottom: 12px; display: flex; align-items: center;"><i class="ph ph-check" style="color: var(--primary); margin-right: 8px;"></i> Categorização Básica</li>
                    <li style="margin-bottom: 12px; display: flex; align-items: center;"><i class="ph ph-check" style="color: var(--primary); margin-right: 8px;"></i> Visualização Mensal</li>
                `;
            }

            let btnHtml = '';
            if (isCurrent) {
                btnHtml = `<button class="btn btn-outline" style="width: 100%; cursor: default; opacity: 0.7;" disabled>Seu Plano Atual</button>`;
            } else if (!Auth.user) {
                btnHtml = `<button class="btn ${isPro ? 'btn-primary' : 'btn-outline'}" style="width: 100%; ${isPro ? 'background: #f5cb5c; color: #111; font-weight: 600; border: none;' : ''}" onclick="Pricing.redirectToLogin()">Criar Conta</button>`;
            } else {
                // Usando ID do plano em data-attr para evitar event implícito
                btnHtml = `<button class="btn ${isPro ? 'btn-primary' : 'btn-outline'}" data-plan-id="${plan.id}" style="width: 100%; ${isPro ? 'background: #f5cb5c; color: #111; font-weight: 600; border: none;' : ''}" onclick="Pricing.subscribe('${plan.id}', this)">${isPro ? 'Assinar PRO' : 'Mudar para Free'}</button>`;
            }

            const html = `
                <div class="login-glass-card" style="display: flex; flex-direction: column; position: relative; border: ${isPro ? '2px solid #f5cb5c' : '1px solid var(--border)'};">
                    ${isPro ? '<div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #f5cb5c; color: #111; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 12px;">MAIS POPULAR</div>' : ''}
                    <h3 style="font-size: 24px; margin-bottom: 8px;">${plan.name}</h3>
                    <p class="text-muted" style="margin-bottom: 24px;">${plan.description}</p>
                    
                    <div style="font-size: 40px; font-weight: 700; margin-bottom: 32px;">
                        <span style="font-size: 20px; font-weight: normal; vertical-align: super;">R$</span>${Number(plan.price).toFixed(2).replace('.', ',')}
                        <span style="font-size: 14px; font-weight: normal; color: var(--text-muted);">/mês</span>
                    </div>
                    
                    <ul style="list-style: none; padding: 0; margin-bottom: 32px; flex: 1;">
                        ${featuresHtml}
                    </ul>
                    
                    <div style="margin-top: auto;">
                        ${btnHtml}
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });
    },

    open: () => {
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('premium-modal').style.display = 'none';
        document.getElementById('pricing-screen').style.display = 'flex';
        Pricing.load();
    },

    close: () => {
        document.getElementById('pricing-screen').style.display = 'none';
        if (Auth.user) {
            document.getElementById('app-container').style.display = 'flex';
        } else {
            document.getElementById('login-screen').style.display = 'block';
        }
    },

    redirectToLogin: () => {
        Pricing.close();
        if(window.Auth && typeof window.Auth.showForm === 'function') {
            window.Auth.showForm('register');
        }
    },

    subscribe: async (planId, btn) => {
        if (!btn) btn = document.activeElement;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Redirecionando...';

        try {
            // ARQUITETURA CORRETA (SaaS Real):
            // 1. O frontend não sabe criar pagamentos, ele pede pro backend.
            // const { data, error } = await supabaseClient.functions.invoke('mp-checkout', { body: { planId } });
            // if (error) throw error;
            // window.location.href = data.checkoutUrl;

            // MOCK PARA FINS DE DESENVOLVIMENTO (Até o backend estar no ar):
            setTimeout(() => {
                const aprovado = confirm('[AMBIENTE DE TESTE] Simulando redirecionamento para o Mercado Pago.\n\nDeseja simular que o pagamento foi APROVADO agora?');
                if (aprovado) {
                    Pricing.simulateWebhookApproval(planId);
                } else {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }, 1000);

        } catch (error) {
            Toast.error('Erro ao iniciar checkout: ' + error.message);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },

    simulateWebhookApproval: async (planId) => {
        // NOTA DE ARQUITETURA: Isso será feito no backend (Webhook) usando Service Role
        // O frontend NUNCA deve confiar no callback de tela para confirmar um plano PRO.
        try {
            const { error } = await supabaseClient
                .from('subscriptions')
                .update({ 
                    plan_id: planId, 
                    payment_provider: 'mercadopago', 
                    payment_id: 'mock_tx_' + Date.now(),
                    status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', Auth.user.id);
            
            if (error) throw error;

            Toast.success('Pagamento aprovado! Você agora é PRO. Recarregando...');
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (e) {
            Toast.error('Erro ao simular webhook: ' + e.message);
        }
    }
};
