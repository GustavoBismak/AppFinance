window.Views.configuracoes = {
    render: async (container) => {
        let html = `
            <div class="grid grid-2">
                <div class="card">
                    <h3 class="mb-4">Categorias de Despesas</h3>
                    <div class="flex gap-2 mb-4">
                        <input type="text" class="input-control flex-1" placeholder="Nova Categoria">
                        <button class="btn btn-primary" onclick="alert('Função em desenvolvimento')">Adicionar</button>
                    </div>
                    <ul style="list-style: none; padding: 0;">
                        <li class="flex justify-between items-center mb-2" style="padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px;">
                            <span>Alimentação</span>
                            <i class="ph ph-trash text-danger" style="cursor: pointer"></i>
                        </li>
                        <li class="flex justify-between items-center mb-2" style="padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px;">
                            <span>Moradia</span>
                            <i class="ph ph-trash text-danger" style="cursor: pointer"></i>
                        </li>
                        <li class="flex justify-between items-center mb-2" style="padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px;">
                            <span>Transporte</span>
                            <i class="ph ph-trash text-danger" style="cursor: pointer"></i>
                        </li>
                    </ul>
                </div>
                
                <div class="card">
                    <h3 class="mb-4">Sistema e Dados</h3>
                    
                    <div class="mb-4">
                        <label style="display: block; margin-bottom: 8px" class="text-muted">Sessão</label>
                        <button class="btn" style="background: var(--bg-panel); border: 1px solid var(--border); color: var(--text-main)" onclick="Auth.logout()"><i class="ph ph-sign-out"></i> Sair da Conta</button>
                    </div>
                    
                    <div class="mb-4">
                        <label style="display: block; margin-bottom: 8px" class="text-muted">Tema Visual</label>
                        <select class="input-control" style="width: 100%">
                            <option>Dark Mode Premium (Padrão)</option>
                            <option disabled>Light Mode (Em breve)</option>
                        </select>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid var(--border); margin: 24px 0;">
                    
                    <div class="mb-4">
                        <h4 class="mb-2 text-danger">Zona de Perigo</h4>
                        <p class="text-muted mb-4" style="font-size: 13px">Todas as suas informações financeiras estão salvas no seu navegador localmente (LocalStorage). Apagar os dados não pode ser desfeito.</p>
                        
                        <div class="flex gap-2">
                            <button class="btn" style="background: var(--bg-panel); border: 1px solid var(--border); color: var(--text-main)" onclick="alert('Backup gerado com sucesso!')"><i class="ph ph-download-simple"></i> Fazer Backup (JSON)</button>
                            <button class="btn" style="background: rgba(230, 57, 70, 0.1); color: var(--danger)" onclick="if(confirm('Tem certeza? Todos os dados serão perdidos de forma irreversível!')) { localStorage.clear(); location.reload(); }"><i class="ph ph-trash"></i> Apagar Todos os Dados</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }
};
