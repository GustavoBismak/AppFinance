window.Views.admin = {
    isAdmin: false,
    
    checkAdmin: async () => {
        try {
            const { data, error } = await supabaseClient
                .from('admin_users')
                .select('user_id')
                .eq('user_id', Auth.user.id)
                .single();
            window.Views.admin.isAdmin = !!data && !error;
            return window.Views.admin.isAdmin;
        } catch (e) {
            return false;
        }
    },

    render: async (container) => {
        const isAdmin = await window.Views.admin.checkAdmin();
        
        if (!isAdmin) {
            container.innerHTML = `
                <div class="card text-center" style="padding: 60px;">
                    <i class="ph ph-shield-warning text-danger" style="font-size: 64px; margin-bottom: 16px;"></i>
                    <h2 class="text-danger mb-2">Acesso Negado</h2>
                    <p class="text-muted">Você não possui credenciais administrativas para acessar esta página.</p>
                </div>
            `;
            return;
        }

        // Carregando dados
        container.innerHTML = `<div class="text-center" style="padding: 60px;"><i class="ph ph-spinner ph-spin" style="font-size: 32px; color: var(--primary);"></i></div>`;

        const { data: allSubs, error } = await supabaseClient
            .from('subscriptions')
            .select('*, plans(*)')
            .order('created_at', { ascending: false });
        
        if (error) {
            container.innerHTML = `<div class="card"><p class="text-danger">Erro ao carregar dados admin: ${error.message}</p></div>`;
            return;
        }

        const totalUsers = allSubs.length;
        const activeSubs = allSubs.filter(s => s.status === 'active' || s.status === 'trialing');
        const proSubs = activeSubs.filter(s => s.plans?.slug === 'pro');
        const freeSubs = activeSubs.filter(s => s.plans?.slug === 'free');
        
        const mrr = proSubs.reduce((acc, sub) => acc + (Number(sub.plans?.price) || 0), 0);

        let subsListHtml = allSubs.map(s => {
            const planBadgeColor = s.plans?.slug === 'pro' ? 'background: #f5cb5c; color: #111;' : 'background: rgba(255,255,255,0.1); color: #ccc;';
            const statusColor = s.status === 'active' ? 'var(--primary)' : (s.status === 'cancelled' ? 'var(--danger)' : 'var(--text-muted)');
            
            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 12px 8px; font-family: monospace;">${s.user_id.substring(0, 8)}...</td>
                    <td style="padding: 12px 8px;">
                        <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; ${planBadgeColor}">${s.plans?.name || 'N/A'}</span>
                    </td>
                    <td style="padding: 12px 8px; color: ${statusColor}; font-size: 13px;">● ${s.status.toUpperCase()}</td>
                    <td style="padding: 12px 8px; font-size: 13px;">R$ ${s.plans?.price?.toString().replace('.', ',') || '0,00'}</td>
                    <td style="padding: 12px 8px; font-size: 13px; color: var(--text-muted);">${new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
            `;
        }).join('');

        const html = `
            <div class="mb-4 flex justify-between items-center" style="display: flex; justify-content: space-between;">
                <h2>Visão Geral do SaaS</h2>
                <div class="text-muted" style="font-size: 12px; background: rgba(255,0,0,0.1); color: var(--danger); padding: 4px 12px; border-radius: 12px;"><i class="ph ph-shield-check"></i> Área Restrita</div>
            </div>

            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div class="card text-center" style="padding: 24px 16px;">
                    <h3 class="text-muted mb-2" style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Total de Usuários</h3>
                    <div style="font-size: 36px; font-weight: bold; color: var(--text-main);">${totalUsers}</div>
                </div>
                <div class="card text-center" style="padding: 24px 16px;">
                    <h3 class="text-muted mb-2" style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Usuários FREE</h3>
                    <div style="font-size: 36px; font-weight: bold; color: var(--primary);">${freeSubs.length}</div>
                </div>
                <div class="card text-center" style="padding: 24px 16px; border-color: rgba(245, 203, 92, 0.3);">
                    <h3 class="text-muted mb-2" style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #f5cb5c;">Usuários PRO</h3>
                    <div style="font-size: 36px; font-weight: bold; color: #f5cb5c;">${proSubs.length}</div>
                </div>
                <div class="card text-center" style="padding: 24px 16px; border-color: #f5cb5c; background: rgba(245, 203, 92, 0.05);">
                    <h3 class="text-muted mb-2" style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #f5cb5c;">Receita (MRR)</h3>
                    <div style="font-size: 32px; font-weight: bold; color: #f5cb5c;">R$ ${mrr.toFixed(2).replace('.', ',')}</div>
                </div>
            </div>

            <div class="card">
                <h3 class="mb-4">Registro de Assinaturas</h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; text-align: left; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--border); color: var(--text-muted); font-size: 12px; text-transform: uppercase;">
                                <th style="padding: 12px 8px;">User ID</th>
                                <th style="padding: 12px 8px;">Plano</th>
                                <th style="padding: 12px 8px;">Status</th>
                                <th style="padding: 12px 8px;">Valor</th>
                                <th style="padding: 12px 8px;">Cadastro</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subsListHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }
};
