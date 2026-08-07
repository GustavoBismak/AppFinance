window.Views.configuracoes = {
    render: async (container) => {
        const categoriasDB = await Store.get(KEYS.CATEGORIAS) || [];

        // Seed inicial de categorias caso esteja vazio
        if (categoriasDB.length === 0) {
            const defaults = ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde'];
            for (const cat of defaults) {
                const res = await Store.insert(KEYS.CATEGORIAS, { nome: cat });
                if (res) categoriasDB.push(res);
            }
        }

        let categoriasHtml = categoriasDB.map(c => `
            <li class="flex justify-between items-center mb-2" style="padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px;">
                <span>${c.nome}</span>
                <button class="btn-del-cat" data-id="${c.id}" style="background: transparent; border: none; color: var(--danger); cursor: pointer;">
                    <i class="ph ph-trash"></i>
                </button>
            </li>
        `).join('');

        let html = `
            <div class="grid grid-2">
                <div class="card">
                    <h3 class="mb-4">Categorias de Despesas</h3>
                    <form id="form-nova-categoria" class="flex gap-2 mb-4">
                        <input type="text" id="nova-cat-nome" class="input-control flex-1" placeholder="Nova Categoria" required>
                        <button type="submit" class="btn btn-primary" id="btn-salvar-cat">Adicionar</button>
                    </form>
                    <ul id="lista-categorias" style="list-style: none; padding: 0;">
                        ${categoriasHtml}
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
                        <p class="text-muted mb-4" style="font-size: 13px">Esta ação apagará permanentemente todos os dados da sua conta, incluindo lançamentos, cartões, e configurações.</p>
                        
                        <div class="flex gap-2">
                            <button class="btn" style="background: rgba(230, 57, 70, 0.1); color: var(--danger)" id="btn-apagar-conta"><i class="ph ph-trash"></i> Apagar Minha Conta e Dados</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;

        // Formulário de Nova Categoria
        document.getElementById('form-nova-categoria').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-salvar-cat');
            const input = document.getElementById('nova-cat-nome');
            const nome = input.value.trim();
            
            if (!nome) return;

            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';

            await Store.insert(KEYS.CATEGORIAS, { nome });
            Toast.success('Categoria adicionada!');
            App.loadView('configuracoes'); // Recarrega a view
        });

        // Deletar Categoria
        document.querySelectorAll('.btn-del-cat').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const li = e.currentTarget.closest('li');
                if (confirm('Apagar esta categoria?')) {
                    li.style.opacity = '0.4';
                    await Store.delete(KEYS.CATEGORIAS, id);
                    Toast.success('Categoria removida.');
                    App.loadView('configuracoes'); // Recarrega a view
                }
            });
        });

        // Apagar Conta
        document.getElementById('btn-apagar-conta').addEventListener('click', () => {
            if(confirm('Tem certeza? Isso apagará a sua conta do sistema, todos os dados no banco serão perdidos de forma irreversível!')) { 
                alert('Função em desenvolvimento. Para apagar, acesse o painel do Supabase diretamente.');
            }
        });
    }
};
