window.Views.lancamentos = {
    render: async (container) => {
        const [lancamentos, categoriasDB, cartoes] = await Promise.all([
            Store.get(KEYS.LANCAMENTOS) || [],
            Store.get(KEYS.CATEGORIAS) || [],
            Store.get(KEYS.CARTOES) || []
        ]);
        
        // Opções de cartão para o select
        const cartaoOptions = cartoes.length > 0
            ? cartoes.map(c => `<option value="${c.id}" data-nome="${c.nome}">${c.nome}</option>`).join('')
            : '<option value="">Nenhum cartão cadastrado</option>';
        
        let categoriasOptions = '<option value="">Selecione...</option>';
        if (categoriasDB.length > 0) {
            categoriasOptions += categoriasDB.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
        } else {
            const defaults = ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Renda', 'Carro', 'Outros'];
            categoriasOptions += defaults.map(c => `<option value="${c}">${c}</option>`).join('');
        }
        
        let html = `
            ${App.getFilterHTML()}
            
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
                            ${categoriasOptions}
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

                    <!-- Seletor de cartão (aparece só quando "Cartão de Crédito") -->
                    <div class="form-group" id="grupo-cartao" style="display:none; grid-column: span 3;">
                        <label>Qual cartão? <span style="color:var(--primary); font-size:12px">(vai atualizar a fatura automaticamente)</span></label>
                        <select id="lanc-cartao-id" class="input-control">
                            ${cartaoOptions}
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
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;

        // Mostrar/ocultar seletor de cartão
        document.getElementById('lanc-forma').addEventListener('change', (e) => {
            const isCartao = e.target.value === 'Cartão de Crédito';
            document.getElementById('grupo-cartao').style.display = isCartao ? 'block' : 'none';
        });
        
        const renderTable = () => {
            const filtered = App.applyFilters(lancamentos, 'data', ['descricao', 'categoria', 'forma']);
            const tbody = document.getElementById('lancamentos-tbody');
            tbody.innerHTML = '';
            
            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center" class="text-muted">Nenhum lançamento encontrado para estes filtros.</td></tr>';
                return;
            }
            
            filtered.forEach(l => {
                const dataFormatada = new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR');
                const valorFormatado = App.formatCurrency(l.valor);
                const badgeClass = l.tipo === 'receita' ? 'badge-success' : 'badge-danger';
                const tipoLabel = l.tipo === 'receita' ? 'Receita' : 'Despesa';
                const colorClass = l.tipo === 'receita' ? 'text-success' : 'text-danger';
                const cartaoNome = l.cartao_nome ? ` (${l.cartao_nome})` : '';
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${dataFormatada}</td>
                    <td>${l.descricao}</td>
                    <td>${l.categoria}</td>
                    <td>${l.forma}${cartaoNome}</td>
                    <td class="${colorClass}">${valorFormatado}</td>
                    <td><span class="badge ${badgeClass}">${tipoLabel}</span></td>
                    <td><button class="btn btn-del" data-id="${l.id}" style="padding: 4px; background: transparent; color: var(--danger)"><i class="ph ph-trash"></i></button></td>
                `;
                tbody.appendChild(tr);
            });
            
            // Re-bind delete actions
            document.querySelectorAll('.btn-del').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (!confirm('Deseja realmente apagar este lançamento?')) return;
                    
                    const id = e.currentTarget.dataset.id;
                    const tr = e.currentTarget.closest('tr');
                    if (tr) tr.style.opacity = '0.4';
                    
                    // Restaurar limite do cartão, se aplicável
                    const l = lancamentos.find(x => x.id == id);
                    if (l && l.forma === 'Cartão de Crédito' && l.cartao_id && l.tipo === 'despesa') {
                        const cartao = cartoes.find(c => c.id == l.cartao_id);
                        if (cartao) {
                            const novoUtilizado = Math.max(0, (parseFloat(cartao.utilizado) || 0) - (parseFloat(l.valor) || 0));
                            await Store.update(KEYS.CARTOES, cartao.id, { utilizado: novoUtilizado });
                        }
                    }

                    await Store.delete(KEYS.LANCAMENTOS, id);
                    Toast.success('Lançamento apagado com sucesso.');
                    App.loadView('lancamentos'); // Reload from server to reflect delete
                });
            });
        };

        // Attach filter logic
        App.bindFilters(renderTable);
        // Initial render
        renderTable();
        
        // Form submit logic
        document.getElementById('form-lancamento').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
            
            const forma = document.getElementById('lanc-forma').value;
            const isCartao = forma === 'Cartão de Crédito';
            const tipo = document.getElementById('lanc-tipo').value;
            const valor = parseFloat(document.getElementById('lanc-valor').value);

            let cartaoId = null;
            let cartaoNome = null;

            if (isCartao) {
                const sel = document.getElementById('lanc-cartao-id');
                cartaoId = sel.value;
                cartaoNome = sel.options[sel.selectedIndex]?.dataset.nome || '';
            }

            const novo = {
                data: document.getElementById('lanc-data').value,
                descricao: document.getElementById('lanc-desc').value,
                categoria: document.getElementById('lanc-cat').value,
                tipo: tipo,
                valor: valor,
                forma: forma,
                cartao_id: cartaoId,
                cartao_nome: cartaoNome
            };
            
            try {
                await Store.insert(KEYS.LANCAMENTOS, novo);

                // Se pagou com cartão e for despesa → atualizar fatura do cartão
                if (isCartao && cartaoId && tipo === 'despesa') {
                    const cartao = cartoes.find(c => c.id == cartaoId);
                    if (cartao) {
                        const novoUtilizado = (parseFloat(cartao.utilizado) || 0) + valor;
                        await Store.update(KEYS.CARTOES, cartaoId, { utilizado: novoUtilizado });
                    }
                }

                Toast.success('Lançamento adicionado com sucesso!');
                App.loadView('lancamentos');
            } catch (err) {
                console.error(err);
                Toast.error('Erro ao salvar: ' + err.message);
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-plus"></i> Adicionar Lançamento';
            }
        });
    }
};
