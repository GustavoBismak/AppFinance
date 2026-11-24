window.Views.conta = {
    render: async (container) => {
        const user = Auth.user;
        if (!user) return;
        
        const dataCadastro = new Date(user.created_at).toLocaleDateString('pt-BR');

        // Nome de exibição: prioriza full_name do metadata, sem nunca usar e-mail
        const displayName = (typeof window.getUserDisplayName === 'function')
            ? window.getUserDisplayName()
            : (user.user_metadata?.full_name || user.user_metadata?.nome || 'Usuário FinApp');
        const avatarUrl = (typeof window.getUserAvatarUrl === 'function')
            ? window.getUserAvatarUrl()
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName.charAt(0).toUpperCase())}&background=0a9396&color=fff&size=128`;
        const hasCustomAvatar = Boolean(
            user.user_metadata?.avatar_url ||
            (user.id && localStorage.getItem(`finapp_user_avatar_${user.id}`))
        );
        
        // Carregando dados reais do plano e assinatura
        const plano = window.Subscription?.getPlanName ? window.Subscription.getPlanName() : (window.Subscription?.current?.plans?.name || 'FINAPP FREE');
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
                        <label for="input-avatar-file" class="profile-avatar-wrapper" title="Alterar foto de perfil">
                            <img id="conta-avatar-preview" src="${avatarUrl}" alt="Perfil" style="width: 100%; height: 100%; object-fit: cover;">
                            <span class="profile-avatar-edit-badge">
                                <i class="ph ph-camera"></i>
                            </span>
                        </label>
                        <input type="file" id="input-avatar-file" accept="image/*" style="display: none;">
                        <div style="min-width: 0; flex: 1;">
                            <h3 style="margin: 0; word-break: break-word;">${displayName}</h3>
                            <p class="text-muted" style="margin: 4px 0 8px 0; font-size: 13px; overflow: hidden; text-overflow: ellipsis;">${user.email}</p>
                            <div class="profile-avatar-actions">
                                <label for="input-avatar-file" class="btn-avatar-action" id="btn-escolher-avatar">
                                    <i class="ph ph-camera"></i> Alterar foto
                                </label>
                                ${hasCustomAvatar ? `
                                <button type="button" class="btn-avatar-action btn-avatar-remove" id="btn-remover-avatar">
                                    <i class="ph ph-trash"></i> Remover
                                </button>
                                ` : ''}
                            </div>
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
                            <input type="text" id="nome-usuario" class="input-control" value="${displayName !== 'Usuário FinApp' ? displayName : (user.user_metadata?.full_name || '')}" placeholder="Seu nome" required>
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
                // Cache do nome para uso imediato em todos os módulos (dashboard, intelligence, etc.)
                try { localStorage.setItem('finapp_user_display_name', newName); } catch (e) {}
                if (typeof window.updateHeaderAvatar === 'function') window.updateHeaderAvatar();
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

        const inputAvatar = document.getElementById('input-avatar-file');
        if (inputAvatar) {
            inputAvatar.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                    Toast.warning('Selecione um arquivo de imagem válido.');
                    return;
                }
                if (file.size > 10 * 1024 * 1024) {
                    Toast.warning('A imagem deve ter no máximo 10 MB.');
                    return;
                }

                const btnLabel = document.getElementById('btn-escolher-avatar');
                const originalLabelHtml = btnLabel ? btnLabel.innerHTML : '';
                if (btnLabel) {
                    btnLabel.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
                }

                try {
                    const dataUrl = await window.Views.conta.compressAvatarImage(file);
                    const { data, error } = await supabaseClient.auth.updateUser({
                        data: { avatar_url: dataUrl }
                    });
                    if (error) throw error;

                    Auth.user = data.user;
                    if (user.id) {
                        try { localStorage.setItem(`finapp_user_avatar_${user.id}`, dataUrl); } catch (err) {}
                    }
                    if (typeof window.updateHeaderAvatar === 'function') window.updateHeaderAvatar();
                    Toast.success('Foto de perfil atualizada!');
                    App.loadView('conta');
                } catch (err) {
                    Toast.error('Erro ao salvar foto: ' + (err.message || 'tente outra imagem'));
                    if (btnLabel) btnLabel.innerHTML = originalLabelHtml;
                } finally {
                    inputAvatar.value = '';
                }
            });
        }

        const btnRemoverAvatar = document.getElementById('btn-remover-avatar');
        if (btnRemoverAvatar) {
            btnRemoverAvatar.addEventListener('click', async () => {
                btnRemoverAvatar.disabled = true;
                btnRemoverAvatar.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
                try {
                    const { data, error } = await supabaseClient.auth.updateUser({
                        data: { avatar_url: null }
                    });
                    if (error) throw error;

                    Auth.user = data.user;
                    if (user.id) {
                        try { localStorage.removeItem(`finapp_user_avatar_${user.id}`); } catch (err) {}
                    }
                    if (typeof window.updateHeaderAvatar === 'function') window.updateHeaderAvatar();
                    Toast.success('Foto de perfil removida.');
                    App.loadView('conta');
                } catch (err) {
                    Toast.error('Erro ao remover foto: ' + err.message);
                    btnRemoverAvatar.disabled = false;
                    btnRemoverAvatar.innerHTML = '<i class="ph ph-trash"></i> Remover';
                }
            });
        }
    },

    compressAvatarImage: (file) => {
        return new Promise((resolve, reject) => {
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const side = Math.min(img.width, img.height);
                const sx = (img.width - side) / 2;
                const sy = (img.height - side) / 2;

                const attempts = [
                    { size: 128, mime: 'image/webp', quality: 0.72 },
                    { size: 112, mime: 'image/webp', quality: 0.60 },
                    { size: 96, mime: 'image/webp', quality: 0.50 },
                    { size: 112, mime: 'image/jpeg', quality: 0.62 },
                    { size: 96, mime: 'image/jpeg', quality: 0.50 }
                ];

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Navegador não suporta processamento de imagem.'));
                    return;
                }

                let bestDataUrl = '';
                for (const opt of attempts) {
                    canvas.width = opt.size;
                    canvas.height = opt.size;
                    ctx.clearRect(0, 0, opt.size, opt.size);
                    ctx.drawImage(img, sx, sy, side, side, 0, 0, opt.size, opt.size);
                    const dataUrl = canvas.toDataURL(opt.mime, opt.quality);
                    bestDataUrl = dataUrl;
                    if (dataUrl.length <= 4500) {
                        resolve(dataUrl);
                        return;
                    }
                }
                resolve(bestDataUrl);
            };
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Não foi possível ler a imagem selecionada.'));
            };
            img.src = objectUrl;
        });
    }
};
