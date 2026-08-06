window.Views.veiculo = {
    render: (container) => {
        const veiculo = Store.get(KEYS.VEICULO) || [];
        
        // Mock data if empty for demo
        if (veiculo.length === 0) {
            veiculo.push({ id: 1, data: '2026-08-01', tipo: 'Combustível', valor: 250, obs: 'Tanque cheio' });
            veiculo.push({ id: 2, data: '2026-08-03', tipo: 'Lavagem', valor: 60, obs: 'Completa' });
            veiculo.push({ id: 3, data: '2026-07-15', tipo: 'Seguro', valor: 2500, obs: 'Anual' });
            Store.set(KEYS.VEICULO, veiculo);
        }
        
        let custoMensal = 0;
        let custoAnual = 0;
        
        const mesAtual = new Date().getMonth();
        const anoAtual = new Date().getFullYear();
        
        veiculo.forEach(v => {
            const data = new Date(v.data + 'T00:00:00');
            if(data.getFullYear() === anoAtual) {
                custoAnual += v.valor;
                if(data.getMonth() === mesAtual) {
                    custoMensal += v.valor;
                }
            }
        });
        
        const mediaDiaria = custoMensal / 30; // approx
        
        let html = `
            <div class="grid grid-3 mb-4">
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted">Custo Mensal</span>
                        <i class="ph ph-calendar text-primary" style="font-size: 24px"></i>
                    </div>
                    <h2 class="text-danger" style="font-size: 28px">${App.formatCurrency(custoMensal)}</h2>
                </div>
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted">Custo Anual</span>
                        <i class="ph ph-calendar-blank text-primary" style="font-size: 24px"></i>
                    </div>
                    <h2 class="text-danger" style="font-size: 28px">${App.formatCurrency(custoAnual)}</h2>
                </div>
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted">Média Diária (Mês)</span>
                        <i class="ph ph-clock text-primary" style="font-size: 24px"></i>
                    </div>
                    <h2 class="text-danger" style="font-size: 28px">${App.formatCurrency(mediaDiaria)}</h2>
                </div>
            </div>
            
            <div class="card mb-4">
                <h3 class="mb-4">Nova Despesa com Veículo</h3>
                <form id="form-veiculo" class="grid grid-4">
                    <div class="form-group">
                        <label>Data</label>
                        <input type="date" id="veic-data" class="input-control" required>
                    </div>
                    <div class="form-group">
                        <label>Tipo de Despesa</label>
                        <select id="veic-tipo" class="input-control" required>
                            <option value="Combustível">Combustível</option>
                            <option value="Troca de óleo">Troca de óleo</option>
                            <option value="Pneu">Pneu</option>
                            <option value="Lavagem">Lavagem</option>
                            <option value="Seguro">Seguro</option>
                            <option value="IPVA">IPVA</option>
                            <option value="Manutenção">Manutenção</option>
                            <option value="Parcela">Parcela</option>
                            <option value="Uber">Uber / App</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Valor (R$)</label>
                        <input type="number" step="0.01" id="veic-valor" class="input-control" required>
                    </div>
                    <div class="form-group">
                        <label>Observação</label>
                        <input type="text" id="veic-obs" class="input-control">
                    </div>
                    <div class="form-group" style="grid-column: span 4;">
                        <button type="submit" class="btn btn-primary"><i class="ph ph-plus"></i> Registrar Despesa</button>
                    </div>
                </form>
            </div>
            
            <div class="card">
                <h3 class="mb-4">Histórico do Veículo</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Observação</th>
                                <th>Valor</th>
                            </tr>
                        </thead>
                        <tbody id="veiculo-tbody">
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        const tbody = document.getElementById('veiculo-tbody');
        const sorted = [...veiculo].sort((a,b) => new Date(b.data) - new Date(a.data));
        
        sorted.forEach(v => {
            let icon = 'ph-gas-pump';
            if(v.tipo === 'Lavagem') icon = 'ph-drop';
            if(v.tipo === 'Manutenção' || v.tipo === 'Troca de óleo') icon = 'ph-wrench';
            if(v.tipo === 'Uber') icon = 'ph-car-profile';
            if(v.tipo === 'Seguro' || v.tipo === 'IPVA') icon = 'ph-file-text';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(v.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td><div class="flex items-center gap-2"><i class="ph ${icon} text-primary"></i> ${v.tipo}</div></td>
                <td>${v.obs || '-'}</td>
                <td class="text-danger" style="font-weight: 600">${App.formatCurrency(v.valor)}</td>
            `;
            tbody.appendChild(tr);
        });
        
        document.getElementById('form-veiculo').addEventListener('submit', (e) => {
            e.preventDefault();
            const novo = {
                id: Date.now(),
                data: document.getElementById('veic-data').value,
                tipo: document.getElementById('veic-tipo').value,
                valor: parseFloat(document.getElementById('veic-valor').value),
                obs: document.getElementById('veic-obs').value
            };
            veiculo.push(novo);
            Store.set(KEYS.VEICULO, veiculo);
            App.loadView('veiculo');
        });
    }
};
