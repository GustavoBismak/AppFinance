window.Views.dashboard = {
    render: async (container) => {
        const lancamentos = await Store.get(KEYS.LANCAMENTOS);
        
        let receitas = 0;
        let despesas = 0;
        
        lancamentos.forEach(l => {
            if (l.tipo === 'receita') receitas += l.valor;
            if (l.tipo === 'despesa') despesas += l.valor;
        });
        
        const saldo = receitas - despesas;
        const economia = receitas > 0 ? ((saldo / receitas) * 100).toFixed(1) : 0;
        
        container.innerHTML = `
            <div class="grid grid-4 mb-4">
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted">Saldo Atual</span>
                        <i class="ph ph-wallet text-primary" style="font-size: 24px"></i>
                    </div>
                    <h2 class="${saldo >= 0 ? 'text-success' : 'text-danger'}" style="font-size: 28px">${App.formatCurrency(saldo)}</h2>
                </div>
                
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted">Receitas do Mês</span>
                        <i class="ph ph-arrow-circle-up text-success" style="font-size: 24px"></i>
                    </div>
                    <h2 style="font-size: 28px">${App.formatCurrency(receitas)}</h2>
                </div>
                
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted">Despesas do Mês</span>
                        <i class="ph ph-arrow-circle-down text-danger" style="font-size: 24px"></i>
                    </div>
                    <h2 style="font-size: 28px">${App.formatCurrency(despesas)}</h2>
                </div>
                
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted">Economia</span>
                        <i class="ph ph-chart-line-up text-primary" style="font-size: 24px"></i>
                    </div>
                    <h2 style="font-size: 28px">${economia}%</h2>
                </div>
            </div>
            
            <div class="grid grid-2">
                <div class="card">
                    <h3 class="mb-4">Evolução Mensal</h3>
                    <canvas id="chartEvolucao"></canvas>
                </div>
                <div class="card">
                    <h3 class="mb-4">Despesas por Categoria</h3>
                    <canvas id="chartDespesas"></canvas>
                </div>
            </div>
        `;
        
        // Render Charts after DOM insertion
        setTimeout(() => {
            window.Views.dashboard.renderCharts();
        }, 100);
    },
    
    renderCharts: () => {
        // Mock data for charts
        const ctxEvolucao = document.getElementById('chartEvolucao');
        if (ctxEvolucao) {
            new Chart(ctxEvolucao, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'],
                    datasets: [
                        {
                            label: 'Receitas',
                            data: [5000, 5200, 5100, 5500, 5400, 6000, 6200, 8500],
                            backgroundColor: '#2a9d8f'
                        },
                        {
                            label: 'Despesas',
                            data: [3000, 3100, 2800, 3500, 3200, 4000, 3800, 770],
                            backgroundColor: '#e63946'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#adb5bd' } },
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#adb5bd' } }
                    },
                    plugins: {
                        legend: { labels: { color: '#f8f9fa' } }
                    }
                }
            });
        }
        
        const ctxDespesas = document.getElementById('chartDespesas');
        if (ctxDespesas) {
            new Chart(ctxDespesas, {
                type: 'doughnut',
                data: {
                    labels: ['Alimentação', 'Moradia', 'Transporte', 'Lazer'],
                    datasets: [{
                        data: [650.50, 120, 0, 0],
                        backgroundColor: ['#0a9396', '#e9c46a', '#e63946', '#2a9d8f'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#f8f9fa' } }
                    }
                }
            });
        }
    }
};
