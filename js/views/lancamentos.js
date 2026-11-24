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
            
            <div class="card mb-4 desktop-lancamentos-card">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(10,147,150,0.15); display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 20px;">
                        <i class="ph ph-plus-circle"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Novo Lançamento</h3>
                        <p class="text-muted" style="margin: 2px 0 0 0; font-size: 13px;">Preencha os campos abaixo</p>
                    </div>
                </div>

                <form id="form-lancamento" class="form-lancamento">
                    <div class="form-group">
                        <label for="lanc-data"><i class="ph ph-calendar"></i> Data</label>
                        <input type="date" id="lanc-data" class="input-control" required>
                    </div>

                    <div class="form-group">
                        <label for="lanc-desc"><i class="ph ph-text-t"></i> Descrição</label>
                        <input type="text" id="lanc-desc" class="input-control" placeholder="Ex: Supermercado, Aluguel, Salário..." required>
                    </div>

                    <div class="form-group">
                        <label for="lanc-valor"><i class="ph ph-currency-dollar"></i> Valor (R$)</label>
                        <input type="number" step="0.01" inputmode="decimal" id="lanc-valor" class="input-control" placeholder="0,00" required>
                    </div>

                    <div class="form-group">
                        <label for="lanc-tipo"><i class="ph ph-arrows-down-up"></i> Tipo</label>
                        <select id="lanc-tipo" class="input-control" required>
                            <option value="despesa">Despesa</option>
                            <option value="receita">Receita</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="lanc-cat"><i class="ph ph-tag"></i> Categoria</label>
                        <select id="lanc-cat" class="input-control" required>
                            ${categoriasOptions}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="lanc-forma"><i class="ph ph-credit-card"></i> Forma de Pagamento</label>
                        <select id="lanc-forma" class="input-control" required>
                            <option value="Pix">Pix</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                            <option value="Cartão de Débito">Cartão de Débito</option>
                            <option value="Dinheiro">Dinheiro</option>
                        </select>
                    </div>

                    <!-- Seletor de cartão (aparece só quando "Cartão de Crédito") -->
                    <div class="form-group" id="grupo-cartao" style="display:none;">
                        <label for="lanc-cartao-id"><i class="ph ph-credit-card"></i> Qual cartão? <span style="color:var(--primary); font-size:12px; font-weight:normal;">(vai atualizar a fatura automaticamente)</span></label>
                        <select id="lanc-cartao-id" class="input-control">
                            ${cartaoOptions}
                        </select>
                    </div>

                    <div class="form-group form-actions" style="margin-top: 6px;">
                        <button type="submit" class="btn btn-primary btn-submit-form" id="btn-adicionar-lancamento">
                            <i class="ph ph-plus-bold"></i> Adicionar Lançamento
                        </button>
                    </div>
                </form>
            </div>
            
            <!-- Versão Desktop: Tabela de Lançamentos -->
            <div class="card desktop-lancamentos-table">
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

            <!-- Versão Mobile First: Cartões de Movimentação -->
            <div class="mobile-lancamentos-container">
                <div class="mobile-lancamentos-header mb-3">
                    <div class="mobile-tx-type-filter">
                        <button type="button" class="btn-filter-pill active" data-type="todos" onclick="window._setMobileTxFilter('todos')">Todos</button>
                        <button type="button" class="btn-filter-pill" data-type="despesa" onclick="window._setMobileTxFilter('despesa')">Despesas</button>
                        <button type="button" class="btn-filter-pill" data-type="receita" onclick="window._setMobileTxFilter('receita')">Receitas</button>
                    </div>
                </div>
                <div id="lancamentos-mobile-list" class="mobile-tx-list">
                    <!-- Renderizado dinamicamente via JS -->
                </div>
            </div>
        `;
        
        container.innerHTML = html;

        // Mostrar/ocultar seletor de cartão
        document.getElementById('lanc-forma').addEventListener('change', (e) => {
            const v = e.target.value;
            const isCartao = v === 'Cartão de Crédito' || v === 'Cartão de Débito';
            document.getElementById('grupo-cartao').style.display = isCartao ? 'block' : 'none';
        });

        let currentMobileType = 'todos';
        window._setMobileTxFilter = (type) => {
            currentMobileType = type;
            document.querySelectorAll('.btn-filter-pill').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === type);
            });
            renderTable();
        };
        
        const renderTable = () => {
            const filtered = App.applyFilters(lancamentos, 'data', ['descricao', 'categoria', 'forma']);
            const tbody = document.getElementById('lancamentos-tbody');
            const mobileList = document.getElementById('lancamentos-mobile-list');

            if (tbody) {
                tbody.innerHTML = '';
                if (filtered.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center" class="text-muted">Nenhum lançamento encontrado para estes filtros.</td></tr>';
                } else {
                    filtered.forEach(l => {
                        const dataFormatada = new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR');
                        const valorFormatado = App.formatCurrency(l.valor);
                        const badgeClass = l.tipo === 'receita' ? 'badge-success' : 'badge-danger';
                        const tipoLabel = l.tipo === 'receita' ? 'Receita' : 'Despesa';
                        const colorClass = l.tipo === 'receita' ? 'text-success' : 'text-danger';
                        const cartaoNome = l.cartao_nome ? ` (${l.cartao_nome})` : '';
                        const openFinanceBadge = (l.is_open_finance || l.bank_transaction_id) 
                            ? `<span class="badge" style="background: rgba(10,147,150,0.15); color: var(--primary); font-size: 10px; margin-left: 6px;" title="Importado via Open Finance"><i class="ph ph-bank"></i> Open Finance</span>` 
                            : '';
                        
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${dataFormatada}</td>
                            <td>${l.descricao} ${openFinanceBadge}</td>
                            <td>${l.categoria}</td>
                            <td>${l.forma}${cartaoNome}</td>
                            <td class="${colorClass}">${valorFormatado}</td>
                            <td><span class="badge ${badgeClass}">${tipoLabel}</span></td>
                            <td><button class="btn btn-del" data-id="${l.id}" style="padding: 4px; background: transparent; color: var(--danger)"><i class="ph ph-trash"></i></button></td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            }

            if (mobileList) {
                let mobileFiltered = filtered;
                if (currentMobileType === 'despesa') {
                    mobileFiltered = filtered.filter(x => x.tipo === 'despesa');
                } else if (currentMobileType === 'receita') {
                    mobileFiltered = filtered.filter(x => x.tipo === 'receita');
                }

                if (mobileFiltered.length === 0) {
                    mobileList.innerHTML = `<div class="card text-center" style="padding: 32px 16px; color: var(--text-muted); font-size: 13.5px;"><i class="ph ph-magnifying-glass" style="font-size: 32px; opacity: 0.4; display: block; margin-bottom: 8px;"></i>Nenhum lançamento encontrado para estes filtros.</div>`;
                } else {
                    mobileList.innerHTML = mobileFiltered.map(l => {
                        const dataFormatada = l.data ? new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
                        const isRec = l.tipo === 'receita';
                        const isTransfer = l.categoria === 'Transferência Interna';
                        const sign = isTransfer ? '' : (isRec ? '+' : '-');
                        const colorClass = isTransfer ? 'text-primary' : (isRec ? 'text-success' : 'text-danger');
                        const catStyle = App.getCategoryIcon(l.categoria);
                        const ofBadge = (l.is_open_finance || l.bank_transaction_id) ? `<span class="badge-of-mini"><i class="ph ph-bank"></i></span>` : '';

                        return `
                            <div class="mobile-tx-item" onclick="App.openTxDetailModal('${l.id}')">
                                <div class="tx-item-icon" style="background: ${catStyle.bg}; color: ${catStyle.color};">
                                    <i class="ph ${catStyle.icon}"></i>
                                </div>
                                <div class="tx-item-content">
                                    <div class="tx-item-title-row">
                                        <span class="tx-item-title">${l.descricao} ${ofBadge}</span>
                                        <span class="tx-item-val ${colorClass}">
                                            ${sign} ${App.formatCurrency(l.valor, true)}
                                        </span>
                                    </div>
                                    <div class="tx-item-meta-row">
                                        <span class="tx-item-meta">${dataFormatada} • ${l.categoria || 'Geral'}</span>
                                        <span class="tx-item-forma">${l.forma || 'Pix'}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            }
            
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
            const isCartao = forma === 'Cartão de Crédito' || forma === 'Cartão de Débito';
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
