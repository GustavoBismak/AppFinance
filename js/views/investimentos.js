window.Views.investimentos = {
    render: async (container) => {
        const investimentos = await Store.get(KEYS.INVESTIMENTOS) || [];
        
        let totalAporte = 0;
        let totalAtual = 0;
        const carteiraData = {};
        
        investimentos.forEach(i => {
            const aporte = parseFloat(i.aporte) || 0;
            const atual = parseFloat(i.atual) || 0;
            const tipo = i.tipo || 'Outros';

            totalAporte += aporte;
            totalAtual += atual;

            // Agrupa por tipo para o gráfico de pizza (usando o valor atual)
            carteiraData[tipo] = (carteiraData[tipo] || 0) + atual;
        });
        
        const lucro = totalAtual - totalAporte;
        const rentabilidade = totalAporte > 0 ? ((lucro / totalAporte) * 100).toFixed(2) : 0;
        
        const chartLabels = Object.keys(carteiraData);
        const chartValues = Object.values(carteiraData);
        const chartColors = ['#0a9396', '#e9c46a', '#e63946', '#2a9d8f', '#f4a261', '#457b9d', '#1d3557'];

        // Montar a tabela de ativos
        let trs = '';
        if (investimentos.length === 0) {
            trs = '<tr><td colspan="5" class="text-center text-muted" style="padding: 40px">Nenhum investimento registrado.</td></tr>';
        } else {
            trs = investimentos.map(i => {
                const aporte = parseFloat(i.aporte) || 0;
                const atual = parseFloat(i.atual) || 0;
                const rend = atual - aporte;
                const rendPct = aporte > 0 ? ((rend / aporte) * 100).toFixed(2) : 0;
                const color = rend >= 0 ? 'text-success' : 'text-danger';
                
                return `
                    <tr>
                        <td>
                            <div style="font-weight: 500; font-size: 15px;">${i.ativo}</div>
                            <div class="text-muted" style="font-size: 12px">${i.tipo}</div>
                        </td>
                        <td>${App.formatCurrency(aporte)}</td>
                        <td style="font-weight: 600">${App.formatCurrency(atual)}</td>
                        <td class="${color}">
                            ${rend >= 0 ? '+' : ''}${rendPct}% 
                            <span style="font-size: 11px; font-weight: normal; margin-left: 4px;">(${App.formatCurrency(rend)})</span>
                        </td>
                        <td>
                            <button class="btn btn-edit-inv" data-id="${i.id}" style="padding: 4px 8px; background: rgba(10,147,150,0.1); color: var(--primary); border-radius: 6px; margin-right: 4px;" title="Atualizar Valor">
                                <i class="ph ph-pencil"></i>
                            </button>
                            <button class="btn btn-del-inv" data-id="${i.id}" style="padding: 4px 8px; background: transparent; color: var(--danger);" title="Excluir/Resgatar">
                                <i class="ph ph-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        let html = `
            <div class="flex justify-between items-center mb-4">
                <p class="text-muted">Acompanhe a rentabilidade e distribuição da sua carteira.</p>
                <button class="btn btn-primary" id="btn-novo-inv"><i class="ph ph-plus"></i> Novo Investimento</button>
            </div>

            <!-- Formulário (oculto) -->
            <div id="form-inv-container" class="card mb-4" style="display: none;">
                <h3 class="mb-4" id="form-inv-titulo">Novo Investimento</h3>
                <form id="form-inv" class="grid grid-3">
                    <div class="form-group">
                        <label>Nome do Ativo</label>
                        <input type="text" id="inv-ativo" class="input-control" placeholder="Ex: CDB Banco Inter, Bitcoin..." required>
                    </div>
                    <div class="form-group">
                        <label>Categoria</label>
                        <select id="inv-tipo" class="input-control" required>
                            <option value="Renda Fixa">Renda Fixa (CDB, Tesouro, LCI)</option>
                            <option value="Ações">Ações (Bolsa de Valores)</option>
                            <option value="FIIs">Fundos Imobiliários (FIIs)</option>
                            <option value="Criptomoedas">Criptomoedas (Bitcoin, etc)</option>
                            <option value="Fundos">Fundos de Investimento</option>
                            <option value="Previdência">Previdência Privada</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            Total Investido (Aporte) 
                            <i class="ph ph-info" title="Dinheiro que saiu do seu bolso" style="color: var(--primary)"></i>
                        </label>
                        <input type="number" step="0.01" id="inv-aporte" class="input-control" placeholder="0,00" required>
                    </div>
                    <div class="form-group">
                        <label>
                            Valor Atual
                            <i class="ph ph-info" title="Quanto vale hoje (já com lucros ou perdas)" style="color: var(--primary)"></i>
                        </label>
                        <input type="number" step="0.01" id="inv-atual" class="input-control" placeholder="0,00" required>
                    </div>
                    <div class="form-group" style="grid-column: span 2; display: flex; align-items: flex-end; gap: 12px;">
                        <button type="submit" class="btn btn-primary" id="btn-salvar-inv"><i class="ph ph-floppy-disk"></i> Salvar</button>
                        <button type="button" class="btn" id="btn-cancelar-inv" style="background: transparent; border: 1px solid var(--border); color: var(--text-main)">Cancelar</button>
                    </div>
                </form>
            </div>

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
                    <h2 class="${lucro >= 0 ? 'text-success' : 'text-danger'}" style="font-size: 28px">
                        ${lucro >= 0 ? '+' : ''}${rentabilidade}% 
                        <span style="font-size: 14px; font-weight: normal; opacity: 0.8;">(${App.formatCurrency(lucro)})</span>
                    </h2>
                </div>
            </div>
            
            <div class="grid grid-2">
                <div class="card">
                    <h3 class="mb-4">Distribuição da Carteira</h3>
                    ${chartLabels.length === 0 
                        ? `<div style="height: 300px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.02); border-radius: 8px;">
                             <span class="text-muted"><i class="ph ph-chart-pie-slice"></i> Adicione ativos para ver o gráfico</span>
                           </div>`
                        : `<div style="position: relative; height: 300px; width: 100%; display: flex; justify-content: center;">
                             <canvas id="chartCarteira"></canvas>
                           </div>`
                    }
                </div>
                
                <div class="card">
                    <h3 class="mb-4">Meus Ativos</h3>
                    <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ativo</th>
                                    <th>Aporte</th>
                                    <th>Valor Atual</th>
                                    <th>Rendimento</th>
                                    <th style="width: 80px">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${trs}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;

        // Renderizar Gráfico
        setTimeout(() => {
            const ctx = document.getElementById('chartCarteira');
            if (ctx && chartLabels.length > 0) {
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            data: chartValues,
                            backgroundColor: chartColors.slice(0, chartLabels.length),
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { color: '#f8f9fa', padding: 20, font: { size: 12 } } },
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        const val = context.raw;
                                        const total = context.chart._metasets[context.datasetIndex].total;
                                        const pct = ((val / total) * 100).toFixed(1);
                                        return ` ${App.formatCurrency(val)} (${pct}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }, 100);

        // Interações do Formulário
        const formContainer = document.getElementById('form-inv-container');
        const form = document.getElementById('form-inv');
        let editandoId = null;

        document.getElementById('btn-novo-inv').addEventListener('click', () => {
            editandoId = null;
            document.getElementById('form-inv-titulo').textContent = 'Novo Investimento';
            form.reset();
            formContainer.style.display = 'block';
            formContainer.scrollIntoView({ behavior: 'smooth' });
        });

        document.getElementById('btn-cancelar-inv').addEventListener('click', () => {
            formContainer.style.display = 'none';
            form.reset();
            editandoId = null;
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-salvar-inv');
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';

            const payload = {
                ativo: document.getElementById('inv-ativo').value.trim(),
                tipo: document.getElementById('inv-tipo').value,
                aporte: parseFloat(document.getElementById('inv-aporte').value) || 0,
                atual: parseFloat(document.getElementById('inv-atual').value) || 0
            };

            if (editandoId) {
                await Store.update(KEYS.INVESTIMENTOS, editandoId, payload);
                Toast.success('Ativo atualizado!');
            } else {
                await Store.insert(KEYS.INVESTIMENTOS, payload);
                Toast.success('Novo investimento adicionado!');
            }

            App.loadView('investimentos');
        });

        // Botões Editar
        document.querySelectorAll('.btn-edit-inv').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const i = investimentos.find(x => x.id == id);
                if (!i) return;

                editandoId = id;
                document.getElementById('form-inv-titulo').textContent = 'Atualizar Ativo';
                document.getElementById('inv-ativo').value = i.ativo;
                document.getElementById('inv-tipo').value = i.tipo;
                document.getElementById('inv-aporte').value = i.aporte;
                document.getElementById('inv-atual').value = i.atual;
                
                formContainer.style.display = 'block';
                formContainer.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Botões Excluir
        document.querySelectorAll('.btn-del-inv').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (!confirm('Deseja realmente remover este investimento da carteira?')) return;
                
                e.currentTarget.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
                await Store.delete(KEYS.INVESTIMENTOS, id);
                Toast.success('Investimento removido.');
                App.loadView('investimentos');
            });
        });
    }
};
