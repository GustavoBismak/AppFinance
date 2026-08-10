window.Views.dashboard = {
    render: async (container) => {
        const todosLancamentos = await Store.get(KEYS.LANCAMENTOS) || [];
        
        container.innerHTML = `
            ${App.getFilterHTML()}
            <div id="dashboard-content"></div>
        `;
        
        const renderDashboard = () => {
            const lancamentos = App.applyFilters(todosLancamentos, 'data', ['descricao', 'categoria', 'forma']);
            const content = document.getElementById('dashboard-content');
            
            let receitas = 0;
            let despesas = 0;

            lancamentos.forEach(l => {
                if (l.tipo === 'receita') receitas += parseFloat(l.valor) || 0;
                if (l.tipo === 'despesa') despesas += parseFloat(l.valor) || 0;
            });

            const saldo   = receitas - despesas;
            const economia = receitas > 0 ? ((saldo / receitas) * 100).toFixed(1) : 0;

            // Agrupar por mês para o gráfico de evolução
            const mesesMap = {};
            lancamentos.forEach(l => {
                if (!l.data) return;
                const mes = l.data.substring(0, 7); // "YYYY-MM"
                if (!mesesMap[mes]) mesesMap[mes] = { receita: 0, despesa: 0 };
                if (l.tipo === 'receita') mesesMap[mes].receita += parseFloat(l.valor) || 0;
                if (l.tipo === 'despesa') mesesMap[mes].despesa += parseFloat(l.valor) || 0;
            });

            const meses    = Object.keys(mesesMap).sort();
            const labelsEv = meses.map(m => {
                const [ano, mes] = m.split('-');
                return new Date(ano, parseInt(mes) - 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
            });
            const dataReceitas = meses.map(m => mesesMap[m].receita);
            const dataDespesas = meses.map(m => mesesMap[m].despesa);

            // Agrupar despesas por categoria para o gráfico de pizza
            const catMap = {};
            lancamentos.filter(l => l.tipo === 'despesa').forEach(l => {
                const cat = l.categoria || 'Outros';
                catMap[cat] = (catMap[cat] || 0) + (parseFloat(l.valor) || 0);
            });
            const catLabels = Object.keys(catMap);
            const catData   = Object.values(catMap);
            const catColors = ['#0a9396', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#e63946', '#457b9d', '#a8dadc'];

            const semDados = lancamentos.length === 0;

            content.innerHTML = `
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
                            <span class="text-muted">Total de Receitas</span>
                            <i class="ph ph-arrow-circle-up text-success" style="font-size: 24px"></i>
                        </div>
                        <h2 style="font-size: 28px">${App.formatCurrency(receitas)}</h2>
                    </div>
                    <div class="card">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-muted">Total de Despesas</span>
                            <i class="ph ph-arrow-circle-down text-danger" style="font-size: 24px"></i>
                        </div>
                        <h2 style="font-size: 28px">${App.formatCurrency(despesas)}</h2>
                    </div>
                    <div class="card">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-muted">Taxa de Economia</span>
                            <i class="ph ph-chart-line-up text-primary" style="font-size: 24px"></i>
                        </div>
                        <h2 style="font-size: 28px">${economia}%</h2>
                    </div>
                </div>

                <div class="grid grid-2">
                    <div class="card">
                        <h3 class="mb-4">Evolução Mensal</h3>
                        ${semDados
                            ? `<div style="text-align:center; padding: 40px 0; color: var(--text-muted)">
                                   <i class="ph ph-chart-bar" style="font-size: 48px; opacity: 0.3"></i>
                                   <p style="margin-top: 12px">Nenhum lançamento encontrado para os filtros atuais.</p>
                               </div>`
                            : `<canvas id="chartEvolucao"></canvas>`
                        }
                    </div>
                    <div class="card">
                        <h3 class="mb-4">Despesas por Categoria</h3>
                        ${catLabels.length === 0
                            ? `<div style="text-align:center; padding: 40px 0; color: var(--text-muted)">
                                   <i class="ph ph-chart-pie" style="font-size: 48px; opacity: 0.3"></i>
                                   <p style="margin-top: 12px">Nenhuma despesa encontrada para os filtros atuais.</p>
                               </div>`
                            : `<canvas id="chartDespesas"></canvas>`
                        }
                    </div>
                </div>
            `;

            // Renderizar gráficos apenas com dados reais
            setTimeout(() => {
                if (!semDados && document.getElementById('chartEvolucao')) {
                    new Chart(document.getElementById('chartEvolucao'), {
                        type: 'bar',
                        data: {
                            labels: labelsEv,
                            datasets: [
                                { label: 'Receitas', data: dataReceitas, backgroundColor: '#2a9d8f', borderRadius: 4 },
                                { label: 'Despesas', data: dataDespesas, backgroundColor: '#e63946', borderRadius: 4 }
                            ]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#adb5bd' } },
                                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#adb5bd' } }
                            },
                            plugins: { legend: { labels: { color: '#f8f9fa' } } },
                            animation: { duration: 300 } // Animação mais rápida ao filtrar
                        }
                    });
                }

                if (catLabels.length > 0 && document.getElementById('chartDespesas')) {
                    new Chart(document.getElementById('chartDespesas'), {
                        type: 'doughnut',
                        data: {
                            labels: catLabels,
                            datasets: [{
                                data: catData,
                                backgroundColor: catColors.slice(0, catLabels.length),
                                borderWidth: 0
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: { legend: { position: 'right', labels: { color: '#f8f9fa' } } },
                            animation: { duration: 300 }
                        }
                    });
                }
            }, 50);
        };

        App.bindFilters(renderDashboard);
        renderDashboard();
    }
};
