window.Views.lancamentos = {
    render: (container) => {
        const lancamentos = Store.get(KEYS.LANCAMENTOS) || [];
        
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
                            </tr>
                        </thead>
                        <tbody id="lancamentos-tbody">
                            ${lancamentos.length === 0 ? `<tr><td colspan="6" style="text-align: center" class="text-muted">Nenhum lançamento encontrado.</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        const tbody = document.getElementById('lancamentos-tbody');
        
        // Sort by id descending
        const sorted = [...lancamentos].sort((a,b) => b.id - a.id);
        
        sorted.forEach(l => {
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
            `;
            tbody.appendChild(tr);
        });
        
        // Form submit logic
        document.getElementById('form-lancamento').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const novo = {
                id: Date.now(),
                data: document.getElementById('lanc-data').value,
                descricao: document.getElementById('lanc-desc').value,
                categoria: document.getElementById('lanc-cat').value,
                tipo: document.getElementById('lanc-tipo').value,
                valor: parseFloat(document.getElementById('lanc-valor').value),
                forma: document.getElementById('lanc-forma').value
            };
            
            lancamentos.push(novo);
            Store.set(KEYS.LANCAMENTOS, lancamentos);
            
            // Reload view
            App.loadView('lancamentos');
        });
    }
};
