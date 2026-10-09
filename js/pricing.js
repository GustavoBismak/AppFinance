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
        
        let cpfCnpj = Auth.user?.user_metadata?.cpfCnpj;
        
        // 1. Se não tem CPF, pede usando SweetAlert
        if (!cpfCnpj) {
            const { value: cpfInput } = await Swal.fire({
                title: 'Quase lá!',
                text: 'Precisamos do seu CPF para gerar a assinatura.',
                input: 'text',
                inputPlaceholder: 'Apenas números',
                showCancelButton: true,
                confirmButtonText: 'Continuar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: 'var(--primary)',
                background: '#1a1f2b',
                color: '#fff',
                inputValidator: (value) => {
                    if (!value || value.length < 11) return 'Digite um CPF válido.'
                }
            });
            if (!cpfInput) return;
            cpfCnpj = cpfInput;
        }

        // 2. Escolher a forma de pagamento
        const { value: paymentMethod } = await Swal.fire({
            title: 'Forma de Pagamento',
            text: 'Como deseja assinar o FinApp PRO?',
            icon: 'question',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="ph ph-credit-card"></i> Cartão de Crédito',
            denyButtonText: '<i class="ph ph-qr-code"></i> PIX',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#f5cb5c',
            denyButtonColor: '#0a9396',
            background: '#1a1f2b',
            color: '#fff',
            customClass: {
                confirmButton: 'text-dark font-bold'
            }
        });

        if (!paymentMethod && paymentMethod !== false) return; // Cancelou
        
        const billingType = paymentMethod ? 'CREDIT_CARD' : 'PIX';

        // 3. Processar
        Swal.fire({
            title: 'Gerando assinatura...',
            text: 'Conectando com o Asaas',
            allowOutsideClick: false,
            background: '#1a1f2b',
            color: '#fff',
            didOpen: () => Swal.showLoading()
        });

        try {
            const { data, error } = await supabaseClient.functions.invoke('asaas-checkout', { 
                body: { planId, cpfCnpj, billingType } 
            });

            if (error) throw new Error(error.message);
            if (!data.success) throw new Error(data.error || 'Erro desconhecido.');

            if (billingType === 'CREDIT_CARD') {
                Swal.fire({
                    icon: 'success',
                    title: 'Redirecionando...',
                    text: 'Você será levado ao Asaas para inserir seu cartão com segurança.',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#1a1f2b', color: '#fff'
                }).then(() => {
                    window.location.href = data.checkoutUrl;
                });
            } else if (billingType === 'PIX' && data.pix) {
                // Exibe o QR Code
                Swal.fire({
                    title: 'Pague via PIX',
                    html: `
                        <p class="text-muted" style="margin-bottom: 16px;">Escaneie o QR Code ou copie o código abaixo.</p>
                        <img src="data:image/png;base64,${data.pix.encodedImage}" style="width: 200px; border-radius: 8px; margin-bottom: 16px;">
                        <br>
                        <input type="text" readonly value="${data.pix.payload}" class="input-control" style="width: 100%; text-align: center; font-size: 12px; margin-bottom: 8px;" id="pix-copy">
                        <button onclick="navigator.clipboard.writeText(document.getElementById('pix-copy').value); Toast.success('Copiado!')" class="btn btn-outline" style="width: 100%;">Copiar Copia e Cola</button>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Já paguei',
                    cancelButtonText: 'Fechar',
                    confirmButtonColor: 'var(--primary)',
                    background: '#1a1f2b', color: '#fff'
                }).then((res) => {
                    if (res.isConfirmed) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Pagamento em Processamento',
                            text: 'Assim que o Asaas confirmar o PIX, seu plano será ativado automaticamente!',
                            confirmButtonColor: 'var(--primary)',
                            background: '#1a1f2b', color: '#fff'
                        }).then(() => { Pricing.close(); });
                    }
                });
            }

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: error.message,
                background: '#1a1f2b', color: '#fff',
                confirmButtonColor: 'var(--primary)'
            });
        }
    },

    simulateWebhookApproval: async (planId) => {
        // ESSA FUNÇÃO NÃO É MAIS NECESSÁRIA, O WEBHOOK DO ASAAS FARÁ ISSO.
        // Fica aqui apenas por registro.
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
