window.Views.contas = {
    isContaFixa: (conta) => {
        return typeof conta?.obs === 'string' && conta.obs.includes('[FIXA]');
    },

    cleanObs: (obs) => {
        if (!obs || typeof obs !== 'string') return '';
        return obs.replace(/\[FIXA\]\s*/g, '').trim();
    },

    buildObs: (obs, isFixa) => {
        const clean = window.Views.contas.cleanObs(obs);
        if (!isFixa) return clean;
        return clean ? `[FIXA] ${clean}` : '[FIXA]';
    },

    getNextMonthDueDate: (dateStr) => {
        const [yearStr, monthStr, dayStr] = String(dateStr).split('-');
        let year = parseInt(yearStr, 10);
        let month = parseInt(monthStr, 10); // 1-12
        const day = parseInt(dayStr, 10);

        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }

        // Último dia do mês destino (evita pular fevereiro/meses de 30 dias)
        const lastDayOfTargetMonth = new Date(year, month, 0).getDate();
        const safeDay = Math.min(day, lastDayOfTargetMonth);
        return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
    },

    ensureNextFixedBill: async (conta, allContas) => {
        if (!window.Views.contas.isContaFixa(conta)) return null;
        const nextVenc = window.Views.contas.getNextMonthDueDate(conta.vencimento);
        const targetMonthPrefix = nextVenc.slice(0, 7); // YYYY-MM
        const normalizedName = (conta.nome || '').trim().toLowerCase();

        const alreadyExists = allContas.some(c =>
            (c.nome || '').trim().toLowerCase() === normalizedName &&
            String(c.vencimento || '').startsWith(targetMonthPrefix)
        );
        if (alreadyExists) return null;

        const nextConta = {
            nome: conta.nome,
            valor: parseFloat(conta.valor),
            vencimento: nextVenc,
            obs: window.Views.contas.buildObs(conta.obs, true),
            pago: false,
            data_pagamento: null
        };
        const inserted = await Store.insert(KEYS.CONTAS, nextConta);
        if (inserted) {
            allContas.push(inserted);
        }
        return inserted;
    },

    syncContasFixas: async (contas) => {
        const fixas = contas.filter(c => window.Views.contas.isContaFixa(c));
        if (fixas.length === 0) return false;

        const now = new Date();
        const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Agrupa pelo nome para pegar a última ocorrência de cada conta fixa
        const latestByName = new Map();
        fixas.forEach(c => {
            const key = (c.nome || '').trim().toLowerCase();
            const existing = latestByName.get(key);
            if (!existing || String(c.vencimento) > String(existing.vencimento)) {
                latestByName.set(key, c);
            }
        });

        let createdAny = false;
        for (const latest of latestByName.values()) {
            const latestMonthPrefix = String(latest.vencimento || '').slice(0, 7);
            // Se a última conta fixa é de um mês anterior ao atual ou já foi paga, garante o próximo mês
            if (latestMonthPrefix < currentMonthPrefix || latest.pago) {
                const nextVenc = window.Views.contas.getNextMonthDueDate(latest.vencimento);
                const nextMonthPrefix = nextVenc.slice(0, 7);
                if (nextMonthPrefix <= currentMonthPrefix || latest.pago) {
                    const created = await window.Views.contas.ensureNextFixedBill(latest, contas);
                    if (created) createdAny = true;
                }
            }
        }
        return createdAny;
    },

    render: async (container) => {
        let contas = await Store.get(KEYS.CONTAS) || [];
        const createdFixed = await window.Views.contas.syncContasFixas(contas);
        if (createdFixed) {
            contas = await Store.get(KEYS.CONTAS) || [];
        }
        
        let html = `
            ${App.getFilterHTML()}
            
            <div class="card mb-4">
                <h3 class="mb-4">Nova Conta</h3>
                <form id="form-conta" class="grid grid-3">
                    <div class="form-group">
                        <label>Nome da Conta</label>
                        <input type="text" id="conta-nome" class="input-control" required>
                    </div>
                    <div class="form-group">
                        <label>Valor (R$)</label>
                        <input type="number" step="0.01" id="conta-valor" class="input-control" required>
                    </div>
                    <div class="form-group">
                        <label>Vencimento</label>
                        <input type="date" id="conta-venc" class="input-control" required>
                    </div>
                    <div class="form-group">
                        <label>Observações</label>
                        <input type="text" id="conta-obs" class="input-control">
                    </div>
                    <div class="form-group form-checkbox-group">
                        <input type="checkbox" id="conta-pago">
                        <label for="conta-pago">Já está paga?</label>
                    </div>
                    <div class="form-group form-checkbox-group">
                        <input type="checkbox" id="conta-fixa" style="display: none;">
                        <button type="button" id="btn-conta-fixa" class="btn-boolean-toggle" role="switch" aria-checked="false" data-active="false">
                            <span class="boolean-switch-track"><span class="boolean-switch-thumb"></span></span>
                            <span class="boolean-label"><i class="ph ph-repeat"></i> Conta Fixa</span>
                        </button>
                    </div>
                    <div class="form-group form-actions" style="grid-column: span 3;">
                        <button type="submit" class="btn btn-primary"><i class="ph ph-plus"></i> Adicionar Conta</button>
                    </div>
                </form>
            </div>
            
            <div class="card">
                <h3 class="mb-4">Minhas Contas</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Nome da Conta</th>
                                <th>Valor</th>
                                <th>Vencimento</th>
                                <th>Pagamento</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="contas-tbody">
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        container.innerHTML = html;
        
        const renderTable = () => {
            const filtered = App.applyFilters(contas, 'vencimento', ['nome', 'obs']);
            const tbody = document.getElementById('contas-tbody');
            tbody.innerHTML = '';
            
            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center" class="text-muted">Nenhuma conta encontrada para estes filtros.</td></tr>';
                return;
            }
            
            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            
            filtered.forEach(c => {
                const vencimento = new Date(c.vencimento + 'T00:00:00');
                const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
                
                let statusBadge = '';
                
                if (c.pago) {
                    statusBadge = '<span class="badge badge-success"><i class="ph ph-check-circle"></i> Paga</span>';
                } else if (diffDias < 0) {
                    statusBadge = '<span class="badge badge-danger"><i class="ph ph-warning-circle"></i> Atrasada</span>';
                } else if (diffDias <= 5) {
                    statusBadge = '<span class="badge badge-warning"><i class="ph ph-clock"></i> Vence em breve</span>';
                } else {
                    statusBadge = '<span class="badge" style="background: var(--border); color: var(--text-main);">Pendente</span>';
                }
                
                const isFixa = window.Views.contas.isContaFixa(c);
                const cleanObsText = window.Views.contas.cleanObs(c.obs);
                const dataPgto = c.data_pagamento || c.dataPagamento;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${statusBadge}</td>
                    <td>
                        <div style="font-weight: 500; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span>${c.nome}</span>
                            ${isFixa ? '<span class="badge badge-fixa"><i class="ph ph-repeat"></i> Fixa</span>' : ''}
                        </div>
                        ${cleanObsText ? `<div class="text-muted" style="font-size: 12px">${cleanObsText}</div>` : ''}
                    </td>
                    <td style="font-weight: 600">${App.formatCurrency(c.valor)}</td>
                    <td>${vencimento.toLocaleDateString('pt-BR')}</td>
                    <td>${c.pago && dataPgto ? new Date(dataPgto + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                    <td style="white-space: nowrap;">
                        ${!c.pago ? `<button class="btn btn-marcar-pago" data-id="${c.id}" style="padding: 6px 12px; background: rgba(42, 157, 143, 0.15); color: var(--success);"><i class="ph ph-check"></i> Pagar</button>` : ''}
                        <button class="btn btn-toggle-fixa" data-id="${c.id}" title="${isFixa ? 'Desativar conta fixa' : 'Tornar conta fixa'}" style="padding: 6px 8px; background: ${isFixa ? 'rgba(10, 147, 150, 0.15)' : 'transparent'}; color: ${isFixa ? 'var(--primary)' : 'var(--text-muted)'};"><i class="ph ph-repeat"></i></button>
                        <button class="btn btn-del" data-id="${c.id}" style="padding: 6px; background: transparent; color: var(--danger)"><i class="ph ph-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Pagar action
            document.querySelectorAll('.btn-marcar-pago').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    const btnRef = e.currentTarget;
                    btnRef.disabled = true;
                    btnRef.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
                    
                    await Store.update(KEYS.CONTAS, id, {
                        pago: true,
                        data_pagamento: new Date().toISOString().split('T')[0]
                    });

                    const contaPaga = contas.find(c => String(c.id) === String(id));
                    if (contaPaga && window.Views.contas.isContaFixa(contaPaga)) {
                        const created = await window.Views.contas.ensureNextFixedBill(contaPaga, contas);
                        if (created) {
                            Toast.success('Conta paga! Próximo vencimento fixo criado.');
                        }
                    }

                    App.loadView('contas');
                });
            });

            // Toggle conta fixa action
            document.querySelectorAll('.btn-toggle-fixa').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    const conta = contas.find(c => String(c.id) === String(id));
                    if (!conta) return;
                    const willBeFixa = !window.Views.contas.isContaFixa(conta);
                    const updatedObs = window.Views.contas.buildObs(conta.obs, willBeFixa);

                    await Store.update(KEYS.CONTAS, id, { obs: updatedObs });
                    Toast.success(willBeFixa ? 'Conta marcada como fixa mensal.' : 'Recorrência fixa desativada.');
                    App.loadView('contas');
                });
            });
            
            // Delete action
            document.querySelectorAll('.btn-del').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    const tr = e.currentTarget.closest('tr');
                    if (tr) tr.style.opacity = '0.4';
                    await Store.delete(KEYS.CONTAS, id);
                    Toast.success('Conta apagada com sucesso.');
                    App.loadView('contas');
                });
            });
        };

        // Attach filter logic
        App.bindFilters(renderTable);
        // Initial render
        renderTable();
        
        // Toggle button booleano "Conta Fixa"
        const btnFixa = document.getElementById('btn-conta-fixa');
        const checkFixa = document.getElementById('conta-fixa');
        if (btnFixa && checkFixa) {
            btnFixa.addEventListener('click', () => {
                const nextState = !checkFixa.checked;
                checkFixa.checked = nextState;
                btnFixa.setAttribute('aria-checked', String(nextState));
                btnFixa.setAttribute('data-active', String(nextState));
                btnFixa.classList.toggle('is-active', nextState);
            });
        }

        // Form submit
        document.getElementById('form-conta').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Aguarde...';
            
            const isPago = document.getElementById('conta-pago').checked;
            const isFixa = document.getElementById('conta-fixa')?.checked || false;
            const obsRaw = document.getElementById('conta-obs').value;
            
            const nova = {
                nome: document.getElementById('conta-nome').value,
                valor: parseFloat(document.getElementById('conta-valor').value),
                vencimento: document.getElementById('conta-venc').value,
                obs: window.Views.contas.buildObs(obsRaw, isFixa),
                pago: isPago,
                data_pagamento: isPago ? new Date().toISOString().split('T')[0] : null
            };
            
            const inserted = await Store.insert(KEYS.CONTAS, nova);
            if (inserted && isFixa && isPago) {
                await window.Views.contas.ensureNextFixedBill(inserted, contas);
            }
            Toast.success(isFixa ? 'Conta fixa adicionada com sucesso!' : 'Conta adicionada com sucesso!');
            App.loadView('contas');
        });
    }
};
