window.Views.lancamentos = {
    render: async (container) => {
        const lancamentos = await Store.get(KEYS.LANCAMENTOS) || [];
        
        let html = `
            <div class="card mb-4">
                <h3 class="mb-4">Novo Lançamento</h3>
                <form id="form-lancamento" class="grid grid-3">
                    <div class="form-group">
                        <label>Data</label>
                        <input type="date" id="lanc-data" class="input-control" required>
                    </div>
                    <div class="form-group">
                        <label>Descrição</label>
                        <input type="text" id="lanc-desc" class="input-control" placeholder="Ex: Conta de Luz" required>
                    </div>
                    <div class="form-group">
                        <label>Categoria</label>
                        <select id="lanc-cat" class="input-control" required>
                            <option value="Alimentação">Alimentação</option>
                            <option value="Moradia">Moradia</option>
                            <option value="Transporte">Transporte</option>
                            <option value="Lazer">Lazer</option>
                            <option value="Renda">Renda</option>
                            <option value="Carro">Carro</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Tipo</label>
                        <select id="lanc-tipo" class="input-control" required>
                            <option value="despesa">Despesa</option>
                            <option value="receita">Receita</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Valor (R$)</label>
                        <input type="number" step="0.01" id="lanc-valor" class="input-control" placeholder="0,00" required>
                    </div>
                    <div class="form-group">
                        <label>Forma de Pagamento</label>
                        <select id="lanc-forma" class="input-control" required>
                            <option value="Pix">Pix</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                            <option value="Cartão de Débito">Cartão de Débito</option>
                            <option value="Dinheiro">Dinheiro</option>
                        </select>
                    </div>
                    <div class="form-group" style="grid-column: span 3;">
                        <button type="submit" class="btn btn-primary"><i class="ph ph-plus"></i> Adicionar Lançamento</button>
                    </div>
                </form>
            </div>
            
            <div class="card">
                <h3 class="mb-4">Histórico de Lançamentos</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Descrição</th>
                                <th>Categoria</th>
                                <th>Forma de Pagto</th>
                                <th>Valor</th>
                                <th>Tipo</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="lancamentos-tbody">
                            ${lancamentos.length === 0 ? `<tr><td colspan="7" style="text-align: center" class="text-muted">Nenhum lançamento encontrado.</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        const tbody = document.getElementById('lancamentos-tbody');
        
        // Supabase returns results sorted by created_at desc as requested in Store.get
        lancamentos.forEach(l => {
            const dataFormatada = new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR');
            const valorFormatado = App.formatCurrency(l.valor);
            const badgeClass = l.tipo === 'receita' ? 'badge-success' : 'badge-danger';
            const tipoLabel = l.tipo === 'receita' ? 'Receita' : 'Despesa';
            const colorClass = l.tipo === 'receita' ? 'text-success' : 'text-danger';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dataFormatada}</td>
                <td>${l.descricao}</td>
                <td>${l.categoria}</td>
                <td>${l.forma}</td>
                <td class="${colorClass}">${valorFormatado}</td>
                <td><span class="badge ${badgeClass}">${tipoLabel}</span></td>
                <td><button class="btn btn-del" data-id="${l.id}" style="padding: 4px; background: transparent; color: var(--danger)"><i class="ph ph-trash"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
        
        // Excluir Lançamento
        document.querySelectorAll('.btn-del').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const tr = e.currentTarget.closest('tr');
                if (tr) tr.style.opacity = '0.4';
                await Store.delete(KEYS.LANCAMENTOS, id);
                Toast.success('Lançamento apagado com sucesso.');
                App.loadView('lancamentos');
            });
        });
        
        // Form submit logic
        document.getElementById('form-lancamento').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
            
            const novo = {
                data: document.getElementById('lanc-data').value,
                descricao: document.getElementById('lanc-desc').value,
                categoria: document.getElementById('lanc-cat').value,
                tipo: document.getElementById('lanc-tipo').value,
                valor: parseFloat(document.getElementById('lanc-valor').value),
                forma: document.getElementById('lanc-forma').value
            };
            
            await Store.insert(KEYS.LANCAMENTOS, novo);
            Toast.success('Lançamento adicionado com sucesso!');
            // Reload view
            App.loadView('lancamentos');
        });
    }
};
