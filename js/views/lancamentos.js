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

        const availableCategories = categoriasDB.length > 0
            ? categoriasDB.map(c => c.nome)
            : ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Renda', 'Carro', 'Outros'];

        let categoriasOptions = '<option value="">Selecione...</option>';
        categoriasOptions += availableCategories.map(c => `<option value="${c}">${c}</option>`).join('');

        let filterParts = [];
        if (App.globalFilters.mes) {
            const mesesNomes = {'01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun','07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez'};
            filterParts.push(mesesNomes[App.globalFilters.mes] || App.globalFilters.mes);
        }
        if (App.globalFilters.ano) filterParts.push(App.globalFilters.ano);
        if (App.globalFilters.busca) filterParts.push(`"${App.globalFilters.busca}"`);
        const filterLabel = filterParts.join(' • ');
        const hasFilterActive = filterParts.length > 0;

        let html = `
            ${App.getFilterHTML()}

            <!-- Inputs ocultos para Importar Extrato e Foto da Nota -->
            <input type="file" id="input-import-extrato" accept=".ofx,.qfx,.csv,.txt" style="display: none;">
            <input type="file" id="input-scan-nota" accept="image/*" capture="environment" style="display: none;">
            
            <div class="card mb-4 desktop-lancamentos-card">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(10,147,150,0.15); display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 20px;">
                            <i class="ph ph-plus-circle"></i>
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Novo Lançamento</h3>
                            <p class="text-muted" style="margin: 2px 0 0 0; font-size: 13px;">Preencha os campos abaixo ou importe um extrato</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button type="button" class="btn-import-action" onclick="document.getElementById('input-import-extrato').click()">
                            <i class="ph ph-file-arrow-up"></i> Importar Extrato (OFX/CSV)
                        </button>
                        <button type="button" class="btn-import-action btn-import-camera" onclick="document.getElementById('input-scan-nota').click()">
                            <i class="ph ph-camera"></i> Ler Nota (Foto)
                        </button>
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
                <div class="mobile-import-actions-bar mb-3">
                    <button type="button" class="btn-mobile-import" onclick="document.getElementById('input-import-extrato').click()">
                        <i class="ph ph-file-arrow-up"></i>
                        <span>Importar Extrato</span>
                    </button>
                    <button type="button" class="btn-mobile-import btn-mobile-camera" onclick="document.getElementById('input-scan-nota').click()">
                        <i class="ph ph-camera"></i>
                        <span>Foto da Nota</span>
                    </button>
                </div>

                <div class="mobile-lancamentos-header mb-3">
                    <div class="mobile-tx-type-filter">
                        <button type="button" class="btn-filter-pill active" data-type="todos" onclick="window._setMobileTxFilter('todos')">Todos</button>
                        <button type="button" class="btn-filter-pill" data-type="despesa" onclick="window._setMobileTxFilter('despesa')">Despesas</button>
                        <button type="button" class="btn-filter-pill" data-type="receita" onclick="window._setMobileTxFilter('receita')">Receitas</button>
                    </div>
                    <button type="button" class="btn-filter-action-mobile ${hasFilterActive ? 'active' : ''}" onclick="App.openMobileFilterModal()" title="Filtrar Período">
                        <i class="ph ${hasFilterActive ? 'ph-funnel-simple-fill' : 'ph-funnel-simple'}"></i>
                        <span>${hasFilterActive ? filterLabel : 'Filtro'}</span>
                    </button>
                </div>
                <div id="lancamentos-mobile-list" class="mobile-tx-list">
                    <!-- Renderizado dinamicamente via JS -->
                </div>

                <!-- Rodapé Mobile Informativo com Espaço Seguro -->
                <div class="mobile-app-footer">
                    <div class="mobile-footer-pill">
                        <i class="ph-fill ph-shield-check" style="color: var(--primary);"></i>
                        <span>FinApp • Histórico de lançamentos seguro</span>
                    </div>
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

        // === IMPORTADOR DE EXTRATO & FOTO DA NOTA ===
        const modalImport = document.getElementById('modal-import-lancamentos');
        const modalTitle = document.getElementById('import-modal-title');
        const modalBody = document.getElementById('import-modal-body');

        const openImportModal = (titleHtml) => {
            if (!modalImport) return;
            if (modalTitle) modalTitle.innerHTML = titleHtml;
            modalImport.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            setTimeout(() => modalImport.classList.add('is-open'), 10);
        };

        window._closeImportModal = () => {
            if (!modalImport) return;
            modalImport.classList.remove('is-open');
            document.body.style.overflow = '';
            setTimeout(() => { modalImport.style.display = 'none'; }, 250);
        };

        const catOptionsHtml = (selectedCat) => {
            return availableCategories.map(c =>
                `<option value="${c}" ${c === selectedCat ? 'selected' : ''}>${c}</option>`
            ).join('');
        };

        // Handler: Importar Extrato (OFX / CSV / TXT)
        window._processImportExtratoFile = async (file) => {
            if (!file) return;
            if (!window.ImportadorLancamentos) {
                Toast.error('Módulo importador não carregado.');
                return;
            }

            openImportModal('<i class="ph ph-file-arrow-up" style="color: var(--primary);"></i> Revisar Extrato');
            modalBody.innerHTML = `
                <div class="import-loading-box">
                    <i class="ph ph-spinner ph-spin" style="font-size: 32px; color: var(--primary);"></i>
                    <p>Analisando extrato e categorizando...</p>
                </div>
            `;

            try {
                const parsed = await window.ImportadorLancamentos.parseFile(file, availableCategories, lancamentos);
                if (!parsed || parsed.length === 0) {
                    modalBody.innerHTML = `
                        <div class="import-loading-box">
                            <i class="ph ph-warning-circle" style="font-size: 36px; color: var(--warning);"></i>
                            <p>Nenhuma movimentação encontrada neste arquivo.<br><span class="text-muted" style="font-size:12px;">Use arquivos .OFX ou .CSV com colunas de Data, Descrição e Valor.</span></p>
                            <button type="button" class="btn btn-primary mt-3" onclick="window._closeImportModal()">Fechar</button>
                        </div>
                    `;
                    return;
                }

                const totalRec = parsed.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
                const totalDesp = parsed.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);

                modalBody.innerHTML = `
                    <div class="import-summary-bar">
                        <div>
                            <strong>${parsed.length} lançamentos</strong> encontrados
                            <div class="import-summary-values">
                                <span class="text-success">+ ${App.formatCurrency(totalRec)}</span>
                                <span class="text-danger">- ${App.formatCurrency(totalDesp)}</span>
                            </div>
                        </div>
                        <button type="button" class="btn-toggle-all-import" id="btn-toggle-all-import">Desmarcar todos</button>
                    </div>

                    <div class="import-items-list" id="import-items-list">
                        ${parsed.map((tx, idx) => `
                            <div class="import-tx-row ${tx.isDuplicate ? 'is-duplicate' : ''}" data-idx="${idx}">
                                <label class="import-tx-check">
                                    <input type="checkbox" class="import-item-cb" data-idx="${idx}" ${tx.isDuplicate ? '' : 'checked'}>
                                </label>
                                <div class="import-tx-fields">
                                    <div class="import-tx-top">
                                        <input type="text" class="import-desc-input" data-idx="${idx}" value="${tx.descricao.replace(/"/g, '&quot;')}">
                                        <span class="import-tx-amount ${tx.tipo === 'receita' ? 'text-success' : 'text-danger'}">
                                            ${tx.tipo === 'receita' ? '+' : '-'} ${App.formatCurrency(tx.valor)}
                                        </span>
                                    </div>
                                    <div class="import-tx-bottom">
                                        <span class="import-tx-date">${new Date(tx.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                        <select class="import-cat-select" data-idx="${idx}">
                                            ${catOptionsHtml(tx.categoria)}
                                        </select>
                                        ${tx.isDuplicate ? '<span class="import-dup-badge">Possível duplicata</span>' : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="import-footer-actions">
                        <button type="button" class="btn btn-primary btn-block" id="btn-confirm-import-extrato">
                            <i class="ph ph-check-circle"></i> Importar Selecionados
                        </button>
                    </div>
                `;

                let allChecked = true;
                document.getElementById('btn-toggle-all-import')?.addEventListener('click', (ev) => {
                    allChecked = !allChecked;
                    document.querySelectorAll('.import-item-cb').forEach(cb => { cb.checked = allChecked; });
                    ev.currentTarget.textContent = allChecked ? 'Desmarcar todos' : 'Marcar todos';
                });

                document.getElementById('btn-confirm-import-extrato')?.addEventListener('click', async (ev) => {
                    const btnConfirm = ev.currentTarget;
                    const selected = [];
                    document.querySelectorAll('.import-item-cb:checked').forEach(cb => {
                        const idx = parseInt(cb.dataset.idx, 10);
                        const base = parsed[idx];
                        if (!base) return;
                        const descInput = modalBody.querySelector(`.import-desc-input[data-idx="${idx}"]`);
                        const catSelect = modalBody.querySelector(`.import-cat-select[data-idx="${idx}"]`);
                        selected.push({
                            user_id: Auth.user.id,
                            data: base.data,
                            descricao: (descInput?.value || base.descricao).trim(),
                            categoria: catSelect?.value || base.categoria,
                            tipo: base.tipo,
                            valor: base.valor,
                            forma: base.forma || 'Pix'
                        });
                    });

                    if (selected.length === 0) {
                        Toast.warning('Selecione pelo menos um lançamento para importar.');
                        return;
                    }

                    btnConfirm.disabled = true;
                    btnConfirm.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Importando ${selected.length}...`;

                    try {
                        const { error } = await supabaseClient.from(KEYS.LANCAMENTOS).insert(selected);
                        if (error) throw error;
                        Toast.success(`${selected.length} lançamento(s) importado(s) com sucesso!`);
                        window._closeImportModal();
                        App.loadView('lancamentos');
                    } catch (err) {
                        Toast.error('Erro ao importar: ' + err.message);
                        btnConfirm.disabled = false;
                        btnConfirm.innerHTML = '<i class="ph ph-check-circle"></i> Importar Selecionados';
                    }
                });
            } catch (err) {
                modalBody.innerHTML = `
                    <div class="import-loading-box">
                        <i class="ph ph-warning-circle" style="font-size: 36px; color: var(--danger);"></i>
                        <p>Erro ao ler arquivo: ${err.message}</p>
                        <button type="button" class="btn btn-primary mt-3" onclick="window._closeImportModal()">Fechar</button>
                    </div>
                `;
            }
        };

        const inputExtrato = document.getElementById('input-import-extrato');
        if (inputExtrato) {
            inputExtrato.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                inputExtrato.value = '';
                if (file) window._processImportExtratoFile(file);
            });
        }

        // Handler: Foto da Nota (Câmera / Galeria + OCR)
        window._processScanNotaFile = async (file) => {
            if (!file) return;
            if (!window.ImportadorLancamentos) {
                Toast.error('Módulo leitor de nota não carregado.');
                return;
            }

            openImportModal('<i class="ph ph-camera" style="color: var(--primary);"></i> Leitura da Nota');
            modalBody.innerHTML = `
                <div class="import-loading-box">
                    <i class="ph ph-scan" style="font-size: 36px; color: var(--primary);"></i>
                    <p id="ocr-status-text">Lendo dados da nota fiscal... 0%</p>
                    <div class="ocr-progress-bar"><div id="ocr-progress-fill" style="width: 5%;"></div></div>
                </div>
            `;

            try {
                const result = await window.ImportadorLancamentos.scanReceiptImage(file, availableCategories, (pct) => {
                    const statusEl = document.getElementById('ocr-status-text');
                    const fillEl = document.getElementById('ocr-progress-fill');
                    if (statusEl) statusEl.textContent = `Lendo dados da nota fiscal... ${pct}%`;
                    if (fillEl) fillEl.style.width = `${Math.max(8, pct)}%`;
                });

                modalBody.innerHTML = `
                    <form id="form-confirm-nota" class="import-nota-form">
                        ${result.ocrWarning ? `
                        <div class="alert alert-warning" style="padding: 10px 12px; font-size: 12.5px; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);">
                            <i class="ph ph-info"></i>
                            <span>${result.ocrWarning}</span>
                        </div>` : ''}
                        ${result.previewUrl ? `
                        <div class="nota-preview-wrap">
                            <img src="${result.previewUrl}" alt="Foto da Nota">
                        </div>` : ''}
                        <div class="form-group">
                            <label>Estabelecimento / Descrição</label>
                            <input type="text" id="nota-desc" class="input-control" value="${(result.descricao || '').replace(/"/g, '&quot;')}" required>
                        </div>
                        <div class="import-nota-grid">
                            <div class="form-group">
                                <label>Valor (R$)</label>
                                <input type="number" step="0.01" inputmode="decimal" id="nota-valor" class="input-control" value="${result.valor || ''}" placeholder="0.00" required>
                            </div>
                            <div class="form-group">
                                <label>Data</label>
                                <input type="date" id="nota-data" class="input-control" value="${result.data}" required>
                            </div>
                        </div>
                        <div class="import-nota-grid">
                            <div class="form-group">
                                <label>Categoria</label>
                                <select id="nota-cat" class="input-control" required>
                                    ${catOptionsHtml(result.categoria)}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Pagamento</label>
                                <select id="nota-forma" class="input-control">
                                    <option value="Pix" ${result.forma === 'Pix' ? 'selected' : ''}>Pix</option>
                                    <option value="Cartão de Crédito" ${result.forma === 'Cartão de Crédito' ? 'selected' : ''}>Cartão de Crédito</option>
                                    <option value="Cartão de Débito" ${result.forma === 'Cartão de Débito' ? 'selected' : ''}>Cartão de Débito</option>
                                    <option value="Dinheiro" ${result.forma === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block mt-2" id="btn-salvar-nota">
                            <i class="ph ph-check-circle"></i> Confirmar e Lançar
                        </button>
                    </form>
                `;

                document.getElementById('form-confirm-nota')?.addEventListener('submit', async (ev) => {
                    ev.preventDefault();
                    const btnSave = document.getElementById('btn-salvar-nota');
                    btnSave.disabled = true;
                    btnSave.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';

                    const payload = {
                        data: document.getElementById('nota-data').value,
                        descricao: document.getElementById('nota-desc').value.trim(),
                        categoria: document.getElementById('nota-cat').value,
                        tipo: 'despesa',
                        valor: parseFloat(document.getElementById('nota-valor').value),
                        forma: document.getElementById('nota-forma').value
                    };

                    try {
                        await Store.insert(KEYS.LANCAMENTOS, payload);
                        Toast.success('Nota lançada com sucesso!');
                        window._closeImportModal();
                        App.loadView('lancamentos');
                    } catch (err) {
                        Toast.error('Erro ao salvar nota: ' + err.message);
                        btnSave.disabled = false;
                        btnSave.innerHTML = '<i class="ph ph-check-circle"></i> Confirmar e Lançar';
                    }
                });
            } catch (err) {
                modalBody.innerHTML = `
                    <div class="import-loading-box">
                        <i class="ph ph-warning-circle" style="font-size: 36px; color: var(--danger);"></i>
                        <p>${err.message || 'Não foi possível ler a nota.'}</p>
                        <button type="button" class="btn btn-primary mt-3" onclick="window._closeImportModal()">Fechar</button>
                    </div>
                `;
            }
        };

        const inputNota = document.getElementById('input-scan-nota');
        if (inputNota) {
            inputNota.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                inputNota.value = '';
                if (file) window._processScanNotaFile(file);
            });
        }
    }
};
