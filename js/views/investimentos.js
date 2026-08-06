window.Views.investimentos = {
    render: async (container) => {
        const investimentos = await Store.get(KEYS.INVESTIMENTOS) || [];
        
        let totalAporte = 0;
        let totalAtual = 0;
        
        investimentos.forEach(i => {
            totalAporte += i.aporte;
            totalAtual += i.atual;
        });
        
        const rentabilidade = totalAporte > 0 ? (((totalAtual - totalAporte) / totalAporte) * 100).toFixed(2) : 0;
        const lucro = totalAtual - totalAporte;
        
        let html = `
            <div class="grid grid-3 mb-4">
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted">Total Investido (Aporte)</span>
                        <i class="ph ph-piggy-bank text-primary" style="font-size: 24px"></i>
                    </div>
                    <h2 style="font-size: 28px">${App.formatCurrency(totalAporte)}</h2>
                </div>
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted">Patrimônio Atual</span>
                        <i class="ph ph-bank text-success" style="font-size: 24px"></i>
                    </div>
                    <h2 class="text-success" style="font-size: 28px">${App.formatCurrency(totalAtual)}</h2>
                </div>
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted">Rentabilidade</span>
                        <i class="ph ph-trend-up ${lucro >= 0 ? 'text-success' : 'text-danger'}" style="font-size: 24px"></i>
                    </div>
                    <h2 class="${lucro >= 0 ? 'text-success' : 'text-danger'}" style="font-size: 28px">${rentabilidade}% <span style="font-size: 14px; font-weight: normal">(${App.formatCurrency(lucro)})</span></h2>
                </div>
            </div>
            
            <div class="grid grid-2">
                <div class="card">
                    <h3 class="mb-4">Evolução do Patrimônio</h3>
                    <div style="height: 300px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.02); border-radius: 8px;">
                        <span class="text-muted"><i class="ph ph-chart-line-up"></i> Gráfico em desenvolvimento</span>
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="mb-4">Meus Ativos</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ativo</th>
                                    <th>Aporte</th>
                                    <th>Valor Atual</th>
                                    <th>Rendimento</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${investimentos.length === 0 ? '<tr><td colspan="4" class="text-center text-muted">Nenhum investimento registrado.</td></tr>' : 
                                investimentos.map(i => {
                                    const rend = i.atual - i.aporte;
                                    const rendPct = ((rend / i.aporte) * 100).toFixed(2);
                                    const color = rend >= 0 ? 'text-success' : 'text-danger';
                                    return `
                                        <tr>
                                            <td>
                                                <div style="font-weight: 500">${i.ativo}</div>
                                                <div class="text-muted" style="font-size: 12px">${i.tipo}</div>
                                            </td>
                                            <td>${App.formatCurrency(i.aporte)}</td>
                                            <td style="font-weight: 600">${App.formatCurrency(i.atual)}</td>
                                            <td class="${color}">${rend >= 0 ? '+' : ''}${rendPct}%</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    }
};
