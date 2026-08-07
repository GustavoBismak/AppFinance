window.Views.relatorios = {
    render: async (container) => {
        const lancamentos   = await Store.get(KEYS.LANCAMENTOS)   || [];
        const cartoes       = await Store.get(KEYS.CARTOES)        || [];
        const veiculo       = await Store.get(KEYS.VEICULO)        || [];
        const investimentos = await Store.get(KEYS.INVESTIMENTOS)  || [];

        const semDados = lancamentos.length === 0;

        // ── Calcular totais por mês ──────────────────────────
        const mesesMap = {};
        lancamentos.forEach(l => {
            if (!l.data) return;
            const mes = l.data.substring(0, 7);
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

        // ── Despesas por categoria ───────────────────────────
        const catMap = {};
        lancamentos.filter(l => l.tipo === 'despesa').forEach(l => {
            const cat = l.categoria || 'Outros';
            catMap[cat] = (catMap[cat] || 0) + (parseFloat(l.valor) || 0);
        });
        const catLabels = Object.keys(catMap);
        const catData   = Object.values(catMap);
        const catColors = ['#0a9396', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#e63946', '#457b9d', '#a8dadc'];

        // ── Gastos cartões ───────────────────────────────────
        const cartaoMap = {};
        cartoes.forEach(c => {
            const nome = c.nome || c.banco || 'Cartão';
            cartaoMap[nome] = (cartaoMap[nome] || 0) + (parseFloat(c.fatura_atual || c.valor || 0));
        });
        const cartaoLabels = Object.keys(cartaoMap);
        const cartaoData   = Object.values(cartaoMap);

        // ── Total veículo ────────────────────────────────────
        const totalVeiculo = veiculo.reduce((acc, v) => acc + (parseFloat(v.valor) || 0), 0);

        // ── Investimentos ────────────────────────────────────
        const invMap = {};
        investimentos.forEach(i => {
            const tipo = i.tipo || 'Outros';
            invMap[tipo] = (invMap[tipo] || 0) + (parseFloat(i.valor_atual || i.valor || 0));
        });
        const invLabels = Object.keys(invMap);
        const invData   = Object.values(invMap);

        const empty = (icon, msg) => `
            <div style="text-align:center; padding: 40px 0; color: var(--text-muted)">
                <i class="ph ${icon}" style="font-size: 48px; opacity: 0.3"></i>
                <p style="margin-top: 12px">${msg}</p>
            </div>`;

        container.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <p class="text-muted">Visão completa das suas finanças — somente dados reais.</p>
            </div>

            <div class="grid grid-2 mb-4">
                <div class="card">
                    <h3 class="mb-4">Fluxo de Caixa (Receitas × Despesas)</h3>
                    ${semDados
                        ? empty('ph-chart-line', 'Nenhum lançamento ainda.<br>Adicione em <strong>Lançamentos</strong>.')
                        : '<canvas id="rel-fluxo"></canvas>'
                    }
                </div>
                <div class="card">
                    <h3 class="mb-4">Gastos por Categoria</h3>
                    ${catLabels.length === 0
                        ? empty('ph-chart-pie', 'Nenhuma despesa registrada ainda.')
                        : '<canvas id="rel-categorias"></canvas>'
                    }
                </div>
            </div>

            <div class="grid grid-2 mb-4">
                <div class="card">
                    <h3 class="mb-4">Gastos nos Cartões</h3>
                    ${cartaoLabels.length === 0
                        ? empty('ph-credit-card', 'Nenhum cartão cadastrado ainda.<br>Adicione em <strong>Cartões</strong>.')
                        : '<canvas id="rel-cartoes"></canvas>'
                    }
                </div>
                <div class="card">
                    <h3 class="mb-4">Investimentos por Tipo</h3>
                    ${invLabels.length === 0
                        ? empty('ph-chart-bar', 'Nenhum investimento cadastrado ainda.<br>Adicione em <strong>Investimentos</strong>.')
                        : '<canvas id="rel-investimentos"></canvas>'
                    }
                </div>
            </div>
        `;

        setTimeout(() => {
            const chartDefaults = {
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#adb5bd' } },
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#adb5bd' } }
                },
                plugins: { legend: { labels: { color: '#f8f9fa' } } }
            };

            if (!semDados && document.getElementById('rel-fluxo')) {
                new Chart(document.getElementById('rel-fluxo'), {
                    type: 'line',
                    data: {
                        labels: labelsEv,
                        datasets: [
                            { label: 'Receitas', data: dataReceitas, borderColor: '#2a9d8f', backgroundColor: 'rgba(42,157,143,0.1)', fill: true, tension: 0.4 },
                            { label: 'Despesas', data: dataDespesas, borderColor: '#e63946', backgroundColor: 'rgba(230,57,70,0.1)', fill: true, tension: 0.4 }
                        ]
                    },
                    options: { responsive: true, ...chartDefaults }
                });
            }

            if (catLabels.length > 0 && document.getElementById('rel-categorias')) {
                new Chart(document.getElementById('rel-categorias'), {
                    type: 'pie',
                    data: {
                        labels: catLabels,
                        datasets: [{ data: catData, backgroundColor: catColors.slice(0, catLabels.length), borderWidth: 0 }]
                    },
                    options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#f8f9fa' } } } }
                });
            }

            if (cartaoLabels.length > 0 && document.getElementById('rel-cartoes')) {
                new Chart(document.getElementById('rel-cartoes'), {
                    type: 'bar',
                    data: {
                        labels: cartaoLabels,
                        datasets: [{ label: 'Fatura', data: cartaoData, backgroundColor: '#457b9d', borderRadius: 4 }]
                    },
                    options: { responsive: true, ...chartDefaults }
                });
            }

            if (invLabels.length > 0 && document.getElementById('rel-investimentos')) {
                new Chart(document.getElementById('rel-investimentos'), {
                    type: 'doughnut',
                    data: {
                        labels: invLabels,
                        datasets: [{ data: invData, backgroundColor: catColors.slice(0, invLabels.length), borderWidth: 0 }]
                    },
                    options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#f8f9fa' } } } }
                });
            }
        }, 100);
    }
};
