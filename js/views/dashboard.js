window.Views.dashboard = {
    render: async (container) => {
        const [todosLancamentos, bankAccounts] = await Promise.all([
            Store.get(KEYS.LANCAMENTOS) || [],
            Store.get(KEYS.BANK_ACCOUNTS) || []
        ]);

        let totalBancario = 0;
        if (bankAccounts && bankAccounts.length > 0) {
            bankAccounts.forEach(acc => {
                totalBancario += (parseFloat(acc.balance_available) || parseFloat(acc.balance_current) || 0);
            });
        }
        
        container.innerHTML = `
            ${App.getFilterHTML()}
            <div id="dashboard-content"></div>
        `;
        
        const renderDashboard = () => {
            const lancamentos = App.applyFilters(todosLancamentos, 'data', ['descricao', 'categoria', 'forma']);
            const content = document.getElementById('dashboard-content');
            
            let receitas = 0;
            let despesas = 0;
            let despesasParaSaldo = 0;

            lancamentos.forEach(l => {
                if (l.categoria === 'Transferência Interna') return; // Neutraliza transferência interna entre contas próprias
                const val = parseFloat(l.valor) || 0;
                if (l.tipo === 'receita') receitas += val;
                if (l.tipo === 'despesa') {
                    despesas += val;
                    if (l.forma !== 'Cartão de Crédito') {
                        despesasParaSaldo += val;
                    }
                }
            });

            // O saldo não desconta compras feitas no cartão de crédito
            const saldo = receitas - despesasParaSaldo;
            const economia = receitas > 0 ? ((saldo / receitas) * 100).toFixed(1) : 0;

            // Banner Open Finance se houver contas conectadas
            const openFinanceBanner = bankAccounts.length > 0 ? `
                <div class="mb-4" style="background: linear-gradient(90deg, rgba(10,147,150,0.15) 0%, rgba(26,29,36,0.7) 100%); border: 1px solid rgba(10,147,150,0.3); border-radius: 12px; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(10,147,150,0.25); display: flex; align-items: center; justify-content: center; color: var(--primary);">
                            <i class="ph ph-bank" style="font-size: 22px;"></i>
                        </div>
                        <div>
                            <span style="font-size: 12px; color: var(--text-muted); font-weight: 500;">Saldo Bancário Consolidado (Open Finance)</span>
                            <div style="font-size: 18px; font-weight: 700; color: #fff;">${App.formatCurrency(totalBancario)} <span style="font-size: 12px; font-weight: normal; color: var(--text-muted);">(${bankAccounts.length} ${bankAccounts.length === 1 ? 'conta' : 'contas'})</span></div>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="App.loadView('conexoes')" style="font-size: 12px; display: flex; align-items: center; gap: 6px;">
                        <i class="ph ph-bank"></i> Contas Conectadas
                    </button>
                </div>
            ` : '';

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
                ${openFinanceBanner}
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

                <!-- Tabela de Movimentações na Dashboard Principal -->
                <div class="card mt-4">
                    <div class="flex justify-between items-center mb-4 flex-wrap" style="gap: 12px;">
                        <div>
                            <h3 style="font-size: 18px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px;">
                                <i class="ph ph-receipt text-primary"></i> Movimentações Recentes & Valores
                            </h3>
                            <p class="text-muted" style="font-size: 13px; margin: 2px 0 0 0;">
                                Extrato consolidado de receitas, despesas e lançamentos do Open Finance
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="badge" style="background: rgba(10,147,150,0.15); color: var(--primary);">
                                ${lancamentos.length} movimentações no período
                            </span>
                            <button class="btn btn-sm btn-outline" onclick="App.loadView('lancamentos')" style="font-size: 12px; display: flex; align-items: center; gap: 6px;">
                                <span>Ver Todos</span> <i class="ph ph-arrow-right"></i>
                            </button>
                        </div>
                    </div>

                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Descrição</th>
                                    <th>Categoria</th>
                                    <th>Forma de Pagamento</th>
                                    <th>Tipo</th>
                                    <th style="text-align: right;">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(() => {
                                    if (lancamentos.length === 0) {
                                        return `<tr><td colspan="6" style="text-align: center; padding: 32px 0;" class="text-muted">Nenhuma movimentação encontrada para os filtros atuais.</td></tr>`;
                                    }
                                    const ordenados = [...lancamentos].sort((a, b) => new Date(b.data + 'T00:00:00') - new Date(a.data + 'T00:00:00')).slice(0, 25);
                                    return ordenados.map(l => {
                                        const dataFormatada = new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR');
                                        const isCredit = l.tipo === 'receita';
                                        const isTransfer = l.categoria === 'Transferência Interna';
                                        const badgeClass = isTransfer ? 'badge' : (isCredit ? 'badge-success' : 'badge-danger');
                                        const colorClass = isTransfer ? 'text-primary' : (isCredit ? 'text-success' : 'text-danger');
                                        const tipoLabel = isTransfer ? 'Transferência' : (isCredit ? 'Receita' : 'Despesa');
                                        const styleBadge = isTransfer ? 'style="background: rgba(10,147,150,0.2); color: var(--primary);"' : '';
                                        const ofBadge = (l.is_open_finance || l.bank_transaction_id) 
                                            ? `<span class="badge" style="background: rgba(10,147,150,0.15); color: var(--primary); font-size: 10px; margin-left: 6px;" title="Importado via Open Finance"><i class="ph ph-bank"></i> Open Finance</span>` 
                                            : '';
                                        const cartaoNome = l.cartao_nome ? ` (${l.cartao_nome})` : '';

                                        return `
                                            <tr>
                                                <td style="white-space: nowrap;">${dataFormatada}</td>
                                                <td><strong>${l.descricao}</strong> ${ofBadge}</td>
                                                <td><span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-main);">${l.categoria || 'Geral'}</span></td>
                                                <td>${l.forma || 'Outro'}${cartaoNome}</td>
                                                <td><span class="badge ${badgeClass}" ${styleBadge}>${tipoLabel}</span></td>
                                                <td style="text-align: right;" class="${colorClass}"><strong>${App.formatCurrency(l.valor)}</strong></td>
                                            </tr>
                                        `;
                                    }).join('');
                                })()}
                            </tbody>
                        </table>
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
