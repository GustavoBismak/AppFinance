window.Views.conta = {
    render: async (container) => {
        const user = Auth.user;
        if (!user) return;
        
        const dataCadastro = new Date(user.created_at).toLocaleDateString('pt-BR');
        
        // Carregando dados reais do plano e assinatura
        const plano = window.Subscription?.current?.plans?.name || 'FINAPP FREE';
        const rawStatus = window.Subscription?.current?.status || 'active';
        
        const statusMap = {
            'active': 'Ativo',
            'pending': 'Pendente',
            'expired': 'Expirado',
            'cancelled': 'Cancelado',
            'trialing': 'Em Teste'
        };
        const status = statusMap[rawStatus] || 'Ativo';
        const isStatusActive = rawStatus === 'active' || rawStatus === 'trialing';
        
        const html = `
            <div class="grid grid-2">
                <div class="card" style="display: flex; flex-direction: column; gap: 24px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div class="user-profile" style="width: 64px; height: 64px; font-size: 24px; display: flex; justify-content: center; align-items: center; border-radius: 50%; overflow: hidden;">
                            <img src="https://ui-avatars.com/api/?name=${user.email.charAt(0)}&background=0a9396&color=fff&size=64" alt="Perfil" style="width: 100%; height: 100%;">
                        </div>
                        <div>
                            <h3 style="margin: 0;">${user.user_metadata?.full_name || 'Usuário FinApp'}</h3>
                            <p class="text-muted" style="margin: 4px 0 0 0;">${user.email}</p>
                        </div>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
                        <div style="margin-bottom: 16px;">
                            <span class="text-muted" style="font-size: 13px; display: block;">Plano atual</span>
                            <strong>${plano}</strong>
                        </div>
                        <div style="margin-bottom: 16px;">
                            <span class="text-muted" style="font-size: 13px; display: block;">Status</span>
                            <span style="color: ${isStatusActive ? 'var(--primary)' : 'var(--danger)'};">● ${status}</span>
                        </div>
                        <div>
                            <span class="text-muted" style="font-size: 13px; display: block;">Desde</span>
                            <span>${dataCadastro}</span>
                        </div>
                    </div>
                    
                    <div class="flex gap-2" style="flex-wrap: wrap;">
                        <button class="btn btn-primary" id="btn-gerenciar-assinatura" style="flex: 1; min-width: 200px;">
                            <i class="ph ph-star"></i> Gerenciar Assinatura
                        </button>
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="mb-4">Perfil</h3>
                    
                    <form id="form-alterar-nome" class="mb-4">
                        <div class="form-group mb-4">
                            <label>Nome de Exibição</label>
                            <input type="text" id="nome-usuario" class="input-control" value="${user.user_metadata?.full_name || ''}" placeholder="Seu nome" required>
                        </div>
                        <button type="submit" class="btn btn-primary" id="btn-salvar-nome">
                            Salvar Nome
                        </button>
                    </form>

                    <hr style="border: none; border-top: 1px solid var(--border); margin: 24px 0;">

                    <h3 class="mb-4">Segurança</h3>
                    
                    <form id="form-alterar-senha" class="mb-4">
                        <p class="text-muted mb-4" style="font-size: 13px;">Deseja alterar sua senha de acesso?</p>
                        
                        <div class="form-group">
                            <label>Nova Senha</label>
                            <input type="password" id="nova-senha-app" class="input-control" placeholder="Mínimo 6 caracteres" required>
                        </div>
                        <div class="form-group mb-4">
                            <label>Confirmar Nova Senha</label>
                            <input type="password" id="nova-senha-app-confirm" class="input-control" placeholder="Repita a senha" required>
                        </div>
                        
                        <button type="submit" class="btn" style="background: var(--bg-panel); border: 1px solid var(--border); color: var(--text-main);" id="btn-salvar-senha">
                            Alterar Senha
                        </button>
                    </form>
                    
                    <hr style="border: none; border-top: 1px solid var(--border); margin: 24px 0;">
                    
                    <div>
                        <h4 class="mb-2 text-danger">Sessão</h4>
                        <p class="text-muted mb-4" style="font-size: 13px;">Encerrar a sessão de forma segura neste dispositivo.</p>
                        <button class="btn" style="background: rgba(230, 57, 70, 0.1); color: var(--danger)" onclick="Auth.confirmLogout()">
                            <i class="ph ph-sign-out"></i> Sair da Conta
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;

        document.getElementById('form-alterar-nome').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-salvar-nome');
            const newName = document.getElementById('nome-usuario').value.trim();

            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';

            try {
                const { data, error } = await supabaseClient.auth.updateUser({
                    data: { full_name: newName }
                });
                if (error) throw error;
                
                Auth.user = data.user;
                Toast.success('Nome atualizado com sucesso!');
                App.loadView('conta'); // Recarrega a view para mostrar o novo nome no perfil
            } catch (error) {
                Toast.error('Erro ao atualizar nome: ' + error.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Salvar Nome';
            }
        });

        document.getElementById('form-alterar-senha').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-salvar-senha');
            const password = document.getElementById('nova-senha-app').value;
            const confirm = document.getElementById('nova-senha-app-confirm').value;

            if (password.length < 6) {
                Toast.warning('A senha precisa ter no mínimo 6 caracteres.');
                return;
            }
            if (password !== confirm) {
                Toast.warning('As senhas não coincidem.');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';

            try {
                const { error } = await supabaseClient.auth.updateUser({ password: password });
                if (error) throw error;
                Toast.success('Senha atualizada com sucesso!');
                document.getElementById('form-alterar-senha').reset();
            } catch (error) {
                Toast.error('Erro ao atualizar senha: ' + error.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Alterar Senha';
            }
        });

        document.getElementById('btn-gerenciar-assinatura').addEventListener('click', () => {
            Pricing.open();
        });
    }
};
