// js/views/conexoes.js — View de Contas Conectadas (Open Finance)

window.Views.conexoes = {
    render: async (container) => {
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 0;">
                <i class="ph ph-spinner ph-spin" style="font-size: 36px; color: var(--primary);"></i>
                <span style="margin-left: 12px; color: var(--text-muted);">Carregando conexões bancárias...</span>
            </div>
        `;

        const [connections, accounts, transactions] = await Promise.all([
            Store.get(KEYS.BANK_CONNECTIONS) || [],
            Store.get(KEYS.BANK_ACCOUNTS) || [],
            Store.get(KEYS.BANK_TRANSACTIONS) || []
        ]);

        // Cálculo dos indicadores consolidados
        let totalSaldoConsolidado = 0;
        accounts.forEach(acc => {
            const bal = parseFloat(acc.balance_available) || parseFloat(acc.balance_current) || 0;
            totalSaldoConsolidado += bal;
        });

        let totalReceitasImportadas = 0;
        let totalDespesasImportadas = 0;
        transactions.forEach(tx => {
            if (tx.is_internal_transfer) return;
            const val = parseFloat(tx.amount) || 0;
            if (tx.type === 'CREDIT') totalReceitasImportadas += val;
            else totalDespesasImportadas += val;
        });

        const temConexoes = connections.length > 0;

        // Cabeçalho e Ações
        let html = `
            <div class="flex justify-between items-center mb-4 flex-wrap" style="gap: 16px;">
                <div>
                    <h2 style="font-size: 22px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-bank" style="color: var(--primary);"></i> Contas Conectadas (Open Finance)
                    </h2>
                    <p class="text-muted" style="font-size: 13px; margin-top: 4px;">
                        Gerencie suas integrações bancárias seguras regulamentadas pelo Banco Central
                    </p>
                </div>
                <div class="flex gap-2">
                    ${temConexoes ? `
                        <button class="btn btn-outline" id="btn-sync-all-banks" style="display: flex; align-items: center; gap: 8px;">
                            <i class="ph ph-arrows-clockwise"></i> Sincronizar Tudo
                        </button>
                    ` : ''}
                    <button class="btn btn-primary" id="btn-open-finance-connect" style="display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-plus-circle-bold"></i> Conectar Banco
                    </button>
                </div>
            </div>
        `;

        if (!temConexoes) {
            // ESTADO: Nenhuma conta conectada (Empty State)
            html += `
                <div class="card text-center" style="padding: 60px 24px; margin-top: 24px; border: 1px dashed var(--border);">
                    <div style="width: 72px; height: 72px; border-radius: 20px; background: rgba(10, 147, 150, 0.12); color: var(--primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                        <i class="ph ph-shield-check" style="font-size: 40px;"></i>
                    </div>
                    <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Nenhuma conta bancária conectada</h3>
                    <p class="text-muted" style="max-width: 520px; margin: 0 auto 24px auto; line-height: 1.5; font-size: 14px;">
                        Conecte suas contas (Itaú, Bradesco, Santander, Nubank, Inter, Caixa, BB e mais) para sincronizar saldos e importar movimentações automaticamente com total segurança via Open Finance.
                    </p>
                    <div class="flex justify-center gap-3">
                        <button class="btn btn-primary" onclick="OpenFinance.connectBank({ onSuccess: () => App.loadView('conexoes') })" style="padding: 12px 28px; font-weight: 600;">
                            <i class="ph ph-plug"></i> Conectar Minha Primeira Conta
                        </button>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 40px; color: var(--text-muted); font-size: 12px;">
                        <span><i class="ph ph-lock-key" style="color: var(--primary);"></i> Criptografia Ponta a Ponta</span>
                        <span><i class="ph ph-shield-check" style="color: var(--primary);"></i> Padrão Banco Central</span>
                        <span><i class="ph ph-eye-slash" style="color: var(--primary);"></i> Sem Acesso a Senhas</span>
                    </div>
                </div>
            `;
        } else {
            // Cards de KPIs Consolidados
            html += `
                <div class="grid grid-4 mb-4">
                    <div class="card">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-muted" style="font-size: 13px;">Saldo Bancário Consolidado</span>
                            <i class="ph ph-vault text-primary" style="font-size: 22px;"></i>
                        </div>
                        <h2 class="${totalSaldoConsolidado >= 0 ? 'text-success' : 'text-danger'}" style="font-size: 26px; font-weight: 700;">
                            ${App.formatCurrency(totalSaldoConsolidado)}
                        </h2>
                    </div>

                    <div class="card">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-muted" style="font-size: 13px;">Instituições Ativas</span>
                            <i class="ph ph-bank text-primary" style="font-size: 22px;"></i>
                        </div>
                        <h2 style="font-size: 26px; font-weight: 700;">
                            ${connections.length} <span style="font-size: 14px; font-weight: normal; color: var(--text-muted);">(${accounts.length} contas)</span>
                        </h2>
                    </div>

                    <div class="card">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-muted" style="font-size: 13px;">Receitas Importadas</span>
                            <i class="ph ph-arrow-circle-up text-success" style="font-size: 22px;"></i>
                        </div>
                        <h2 class="text-success" style="font-size: 26px; font-weight: 700;">
                            ${App.formatCurrency(totalReceitasImportadas)}
                        </h2>
                    </div>

                    <div class="card">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-muted" style="font-size: 13px;">Despesas Importadas</span>
                            <i class="ph ph-arrow-circle-down text-danger" style="font-size: 22px;"></i>
                        </div>
                        <h2 class="text-danger" style="font-size: 26px; font-weight: 700;">
                            ${App.formatCurrency(totalDespesasImportadas)}
                        </h2>
                    </div>
                </div>

                <!-- Lista de Instituições Conectadas -->
                <h3 style="font-size: 17px; font-weight: 600; margin: 24px 0 16px 0;">Instituições Conectadas</h3>
                <div class="grid grid-2 mb-4" style="gap: 16px;">
            `;

            connections.forEach(conn => {
                const connAccounts = accounts.filter(a => a.bank_connection_id === conn.id);
                let connBalance = 0;
                connAccounts.forEach(a => {
                    connBalance += (parseFloat(a.balance_available) || parseFloat(a.balance_current) || 0);
                });

                const isOk = conn.status === 'UPDATED';
                const isSyncing = conn.status === 'UPDATING';
                const needsReauth = conn.status === 'WAITING_USER_INPUT' || conn.status === 'LOGIN_ERROR' || conn.status === 'OUTDATED';

                const statusBadge = isOk 
                    ? `<span class="badge badge-success" style="display: inline-flex; align-items: center; gap: 4px;"><i class="ph-fill ph-check-circle"></i> Conectado</span>`
                    : isSyncing 
                    ? `<span class="badge" style="background: rgba(233,196,106,0.2); color: #e9c46a;"><i class="ph ph-spinner ph-spin"></i> Sincronizando</span>`
                    : `<span class="badge badge-danger"><i class="ph-fill ph-warning-circle"></i> ${conn.status}</span>`;

                const lastSyncStr = conn.last_sync_at 
                    ? new Date(conn.last_sync_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    : 'Pendente';

                const logoEl = conn.institution_logo 
                    ? `<img src="${conn.institution_logo}" alt="${conn.institution_name}" style="width: 44px; height: 44px; border-radius: 10px; object-fit: contain; background: #fff; padding: 4px;">`
                    : `<div style="width: 44px; height: 44px; border-radius: 10px; background: var(--bg-panel-hover); display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--primary);"><i class="ph ph-bank"></i></div>`;

                html += `
                    <div class="card" style="border: 1px solid var(--border); display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div class="flex justify-between items-center mb-3">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    ${logoEl}
                                    <div>
                                        <h4 style="font-size: 16px; font-weight: 700; margin: 0;">${conn.institution_name}</h4>
                                        <span class="text-muted" style="font-size: 12px;">Última sincronização: ${lastSyncStr}</span>
                                    </div>
                                </div>
                                <div>${statusBadge}</div>
                            </div>

                            <div style="background: rgba(255,255,255,0.02); padding: 12px 14px; border-radius: 8px; margin-bottom: 12px;">
                                <div class="flex justify-between items-center">
                                    <span class="text-muted" style="font-size: 13px;">Saldo nesta instituição:</span>
                                    <strong style="font-size: 16px;" class="${connBalance >= 0 ? 'text-success' : 'text-danger'}">${App.formatCurrency(connBalance)}</strong>
                                </div>
                                <div class="mt-2" style="font-size: 12px; color: var(--text-muted);">
                                    ${connAccounts.map(a => `<div style="display:flex; justify-content:space-between; margin-top:4px;"><span>${a.name} ${a.number ? `(••• ${a.number.slice(-4)})` : ''}</span><span>${App.formatCurrency(a.balance_available || a.balance_current || 0)}</span></div>`).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-between items-center mt-2 pt-2" style="border-top: 1px solid var(--border);">
                            <div class="flex gap-2">
                                ${needsReauth ? `
                                    <button class="btn btn-sm btn-reconnect" data-item-id="${conn.external_item_id}" style="background: rgba(233,196,106,0.2); color: #e9c46a; border: 1px solid #e9c46a; cursor: pointer;">
                                        <i class="ph ph-key"></i> Reconectar
                                    </button>
                                ` : `
                                    <button class="btn btn-sm btn-outline btn-sync-single" data-item-id="${conn.external_item_id}">
                                        <i class="ph ph-arrows-clockwise"></i> Atualizar
                                    </button>
                                `}
                            </div>
                            <button class="btn btn-sm btn-del-connection" data-item-id="${conn.external_item_id}" data-name="${conn.institution_name}" style="background: transparent; color: var(--danger); border: none; cursor: pointer;">
                                <i class="ph ph-trash"></i> Desconectar
                            </button>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;

            // Tabela de Movimentações Recentes Importadas via Open Finance com Filtros
            html += `
                <div class="card mt-4">
                    <div class="flex justify-between items-center mb-4 flex-wrap" style="gap: 12px;">
                        <div>
                            <h3 style="font-size: 17px; font-weight: 600; margin: 0;">Movimentações Importadas</h3>
                            <p class="text-muted" style="font-size: 12px; margin: 2px 0 0 0;">Histórico de créditos e débitos recebidos dos bancos via Open Finance</p>
                        </div>
                        <div class="flex gap-2">
                            <span class="badge" style="background: rgba(10,147,150,0.15); color: var(--primary);">
                                <i class="ph ph-check"></i> <span id="tx-counter">${transactions.length}</span> transações
                            </span>
                        </div>
                    </div>

                    <!-- Filtros Rápidos -->
                    <div class="grid grid-3 mb-4" style="gap: 12px;">
                        <div>
                            <input type="text" id="filter-tx-search" class="input-control" placeholder="Buscar descrição..." style="font-size: 13px;">
                        </div>
                        <div>
                            <select id="filter-tx-account" class="input-control" style="font-size: 13px;">
                                <option value="">Todas as Contas</option>
                                ${accounts.map(a => `<option value="${a.id}">${a.name} ${a.number ? `(••• ${a.number.slice(-4)})` : ''}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <select id="filter-tx-type" class="input-control" style="font-size: 13px;">
                                <option value="">Todos os Tipos</option>
                                <option value="CREDIT">Apenas Receitas (Créditos)</option>
                                <option value="DEBIT">Apenas Despesas (Débitos)</option>
                                <option value="TRANSFER">Transferências Internas</option>
                            </select>
                        </div>
                    </div>

                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Descrição</th>
                                    <th>Categoria Automática</th>
                                    <th>Tipo</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="open-finance-tx-tbody">
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        // Renderizador da Tabela com Filtros
        const renderTxTable = () => {
            const tbody = document.getElementById('open-finance-tx-tbody');
            if (!tbody) return;

            const search = (document.getElementById('filter-tx-search')?.value || '').toLowerCase().trim();
            const selectedAcc = document.getElementById('filter-tx-account')?.value || '';
            const selectedType = document.getElementById('filter-tx-type')?.value || '';

            let filtered = [...transactions];

            if (search) {
                filtered = filtered.filter(t => (t.description || '').toLowerCase().includes(search) || (t.category_normalized || '').toLowerCase().includes(search));
            }
            if (selectedAcc) {
                filtered = filtered.filter(t => t.bank_account_id === selectedAcc);
            }
            if (selectedType === 'TRANSFER') {
                filtered = filtered.filter(t => t.is_internal_transfer);
            } else if (selectedType) {
                filtered = filtered.filter(t => t.type === selectedType && !t.is_internal_transfer);
            }

            const counterEl = document.getElementById('tx-counter');
            if (counterEl) counterEl.textContent = filtered.length;

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;" class="text-muted">Nenhuma transação encontrada com os filtros selecionados.</td></tr>`;
                return;
            }

            const sortedTx = filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 100);
            tbody.innerHTML = sortedTx.map(tx => {
                const dataFormatada = new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR');
                const isInternalTransfer = tx.is_internal_transfer;
                const isCredit = tx.type === 'CREDIT';
                const tipoLabel = isInternalTransfer ? 'Transferência' : (isCredit ? 'Receita' : 'Despesa');
                const badgeClass = isInternalTransfer ? 'badge' : (isCredit ? 'badge-success' : 'badge-danger');
                const colorClass = isInternalTransfer ? 'text-primary' : (isCredit ? 'text-success' : 'text-danger');
                const styleBadge = isInternalTransfer ? 'style="background: rgba(10,147,150,0.2); color: var(--primary);"' : '';

                return `
                    <tr>
                        <td>${dataFormatada}</td>
                        <td>
                            <strong>${tx.description}</strong>
                            <span class="badge" style="margin-left: 6px; font-size: 10px; background: rgba(255,255,255,0.06); color: var(--text-muted);">Open Finance</span>
                        </td>
                        <td><span class="badge" style="background: rgba(10,147,150,0.1); color: var(--primary);">${tx.category_normalized || 'Outros'}</span></td>
                        <td><span class="badge ${badgeClass}" ${styleBadge}>${tipoLabel}</span></td>
                        <td class="${colorClass}">${App.formatCurrency(tx.amount)}</td>
                        <td><span class="text-muted" style="font-size: 12px;">${tx.status === 'POSTED' ? 'Concluída' : 'Pendente'}</span></td>
                    </tr>
                `;
            }).join('');
        };

        if (temConexoes) {
            renderTxTable();

            document.getElementById('filter-tx-search')?.addEventListener('input', renderTxTable);
            document.getElementById('filter-tx-account')?.addEventListener('change', renderTxTable);
            document.getElementById('filter-tx-type')?.addEventListener('change', renderTxTable);
        }

        // -------------------------------------------------------------
        // Binds de Eventos
        // -------------------------------------------------------------
        document.getElementById('btn-open-finance-connect')?.addEventListener('click', () => {
            OpenFinance.connectBank({
                onSuccess: () => App.loadView('conexoes')
            });
        });

        document.getElementById('btn-sync-all-banks')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Sincronizando...';
            try {
                const res = await OpenFinance.sync();
                Toast.success(`Sincronização concluída! ${res.transactionsSynced || 0} movimentações atualizadas.`);
                App.loadView('conexoes');
            } catch (err) {
                Toast.error('Erro na sincronização: ' + err.message);
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Sincronizar Tudo';
            }
        });

        document.querySelectorAll('.btn-sync-single').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const itemId = e.currentTarget.dataset.itemId;
                const icon = e.currentTarget.querySelector('i');
                if (icon) icon.className = 'ph ph-spinner ph-spin';
                e.currentTarget.disabled = true;

                try {
                    const res = await OpenFinance.sync(itemId);
                    Toast.success(`Banco sincronizado com sucesso! ${res.transactionsSynced || 0} novas movimentações.`);
                    App.loadView('conexoes');
                } catch (err) {
                    Toast.error('Erro ao atualizar: ' + err.message);
                    if (icon) icon.className = 'ph ph-arrows-clockwise';
                    e.currentTarget.disabled = false;
                }
            });
        });

        document.querySelectorAll('.btn-reconnect').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.currentTarget.dataset.itemId;
                OpenFinance.connectBank({
                    itemId: itemId,
                    onSuccess: () => App.loadView('conexoes')
                });
            });
        });

        document.querySelectorAll('.btn-del-connection').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const itemId = e.currentTarget.dataset.itemId;
                const name = e.currentTarget.dataset.name;
                await OpenFinance.disconnect(itemId, name);
            });
        });
    }
};
