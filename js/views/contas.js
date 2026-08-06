window.Views.contas = {
    render: async (container) => {
        const contas = await Store.get(KEYS.CONTAS) || [];
        
        let html = `
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
                    <div class="form-group flex items-center" style="flex-direction: row; gap: 8px; margin-top: 24px;">
                        <input type="checkbox" id="conta-pago" style="width: 20px; height: 20px;">
                        <label>Já está paga?</label>
                    </div>
                    <div class="form-group" style="grid-column: span 3;">
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
        
        const tbody = document.getElementById('contas-tbody');
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        
        contas.forEach(c => {
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
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${statusBadge}</td>
                <td>
                    <div style="font-weight: 500">${c.nome}</div>
                    <div class="text-muted" style="font-size: 12px">${c.obs || ''}</div>
                </td>
                <td style="font-weight: 600">${App.formatCurrency(c.valor)}</td>
                <td>${vencimento.toLocaleDateString('pt-BR')}</td>
                <td>${c.pago && c.dataPagamento ? new Date(c.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                <td>
                    ${!c.pago ? `<button class="btn btn-marcar-pago" data-id="${c.id}" style="padding: 6px 12px; background: rgba(42, 157, 143, 0.15); color: var(--success);"><i class="ph ph-check"></i> Pagar</button>` : ''}
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
                App.loadView('contas');
            });
        });
        
        // Delete action
        document.querySelectorAll('.btn-del').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('Deseja realmente apagar esta conta?')) {
                    const id = e.currentTarget.dataset.id;
                    await Store.delete(KEYS.CONTAS, id);
                    App.loadView('contas');
                }
            });
        });
        
        // Form submit
        document.getElementById('form-conta').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Aguarde...';
            
            const isPago = document.getElementById('conta-pago').checked;
            
            const nova = {
                nome: document.getElementById('conta-nome').value,
                valor: parseFloat(document.getElementById('conta-valor').value),
                vencimento: document.getElementById('conta-venc').value,
                obs: document.getElementById('conta-obs').value,
                pago: isPago,
                data_pagamento: isPago ? new Date().toISOString().split('T')[0] : null
            };
            
            await Store.insert(KEYS.CONTAS, nova);
            App.loadView('contas');
        });
    }
};
