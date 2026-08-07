window.Views.veiculo = {
    render: async (container) => {
        const [veiculos, cartoes] = await Promise.all([
            Store.get(KEYS.VEICULO)  || [],
            Store.get(KEYS.CARTOES)  || []
        ]);

        const mesAtual = new Date().getMonth();
        const anoAtual = new Date().getFullYear();

        let custoMensal = 0;
        let custoAnual  = 0;

        veiculos.forEach(v => {
            const data = new Date(v.data + 'T00:00:00');
            const val  = parseFloat(v.valor) || 0;
            if (data.getFullYear() === anoAtual) {
                custoAnual += val;
                if (data.getMonth() === mesAtual) custoMensal += val;
            }
        });

        const diasNoMes  = new Date(anoAtual, mesAtual + 1, 0).getDate();
        const mediaDiaria = custoMensal / diasNoMes;

        // Opções de cartão para o select
        const cartaoOptions = cartoes.length > 0
            ? cartoes.map(c => `<option value="${c.id}" data-nome="${c.nome}">${c.nome}</option>`).join('')
            : '<option value="">Nenhum cartão cadastrado</option>';

        container.innerHTML = `
            <!-- Cards de resumo -->
            <div class="grid grid-3 mb-4">
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted">Custo Mensal</span>
                        <i class="ph ph-calendar text-primary" style="font-size:24px"></i>
                    </div>
                    <h2 class="text-danger" style="font-size:28px">${App.formatCurrency(custoMensal)}</h2>
                </div>
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted">Custo Anual</span>
                        <i class="ph ph-calendar-blank text-primary" style="font-size:24px"></i>
                    </div>
                    <h2 class="text-danger" style="font-size:28px">${App.formatCurrency(custoAnual)}</h2>
                </div>
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted">Média Diária (Mês)</span>
                        <i class="ph ph-clock text-primary" style="font-size:24px"></i>
                    </div>
                    <h2 class="text-danger" style="font-size:28px">${App.formatCurrency(mediaDiaria)}</h2>
                </div>
            </div>

            <!-- Formulário -->
            <div class="card mb-4">
                <h3 class="mb-4">Nova Despesa de Veículo</h3>
                <form id="form-veiculo" class="grid grid-4">
                    <div class="form-group">
                        <label>Data</label>
                        <input type="date" id="veic-data" class="input-control" required>
                    </div>
                    <div class="form-group">
                        <label>Tipo de Despesa</label>
                        <select id="veic-tipo" class="input-control" required>
                            <option value="Combustível">Combustível</option>
                            <option value="Troca de Óleo">Troca de Óleo</option>
                            <option value="Pneu">Pneu</option>
                            <option value="Lavagem">Lavagem</option>
                            <option value="Seguro">Seguro</option>
                            <option value="IPVA">IPVA</option>
                            <option value="Manutenção">Manutenção</option>
                            <option value="Parcela">Parcela do Carro</option>
                            <option value="Uber">Uber / App</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Valor (R$)</label>
                        <input type="number" step="0.01" id="veic-valor" class="input-control" placeholder="0,00" required>
                    </div>
                    <div class="form-group">
                        <label>Forma de Pagamento</label>
                        <select id="veic-forma" class="input-control" required>
                            <option value="Pix">Pix</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Cartão de Débito">Cartão de Débito</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                        </select>
                    </div>

                    <!-- Seletor de cartão (aparece só quando "Cartão de Crédito") -->
                    <div class="form-group" id="grupo-cartao" style="display:none; grid-column: span 2;">
                        <label>Qual cartão? <span style="color:var(--primary); font-size:12px">(vai atualizar a fatura automaticamente)</span></label>
                        <select id="veic-cartao-id" class="input-control">
                            ${cartaoOptions}
                        </select>
                    </div>

                    <div class="form-group" id="grupo-obs" style="grid-column: span 2;">
                        <label>Observação</label>
                        <input type="text" id="veic-obs" class="input-control" placeholder="Ex: Posto Shell, km 45.200...">
                    </div>

                    <div class="form-group" style="grid-column: span 4; display:flex; align-items:center; gap:12px;">
                        <button type="submit" class="btn btn-primary">
                            <i class="ph ph-plus"></i> Registrar Despesa
                        </button>
                        <span id="veic-integracao-info" style="font-size:12px; color:var(--text-muted); display:none;">
                            <i class="ph ph-info"></i> O valor será adicionado à fatura do cartão e criará um lançamento automático no Dashboard.
                        </span>
                    </div>
                </form>
            </div>

            <!-- Histórico -->
            <div class="card">
                <h3 class="mb-4">Histórico do Veículo</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Forma de Pagamento</th>
                                <th>Observação</th>
                                <th>Valor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="veiculo-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;

        // Mostrar/ocultar seletor de cartão
        document.getElementById('veic-forma').addEventListener('change', (e) => {
            const isCartao = e.target.value === 'Cartão de Crédito';
            document.getElementById('grupo-cartao').style.display = isCartao ? 'block' : 'none';
            document.getElementById('veic-integracao-info').style.display = isCartao ? 'inline' : 'none';
            document.getElementById('grupo-obs').style.gridColumn = isCartao ? 'span 2' : 'span 2';
        });

        // Preencher tbody
        const tbody = document.getElementById('veiculo-tbody');
        if (veiculos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:30px">Nenhum registro encontrado.</td></tr>';
        }

        veiculos.forEach(v => {
            const icons = {
                'Combustível': 'ph-gas-pump', 'Troca de Óleo': 'ph-wrench',
                'Pneu': 'ph-tire', 'Lavagem': 'ph-drop', 'Seguro': 'ph-file-text',
                'IPVA': 'ph-file-text', 'Manutenção': 'ph-wrench',
                'Parcela': 'ph-money', 'Uber': 'ph-car-profile', 'Outros': 'ph-dots-three'
            };
            const icon = icons[v.tipo] || 'ph-car';
            const formaLabel = v.forma || '-';
            const cartaoNome = v.cartao_nome ? ` (${v.cartao_nome})` : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(v.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td><div class="flex items-center gap-2"><i class="ph ${icon} text-primary"></i> ${v.tipo}</div></td>
                <td><span style="font-size:12px">${formaLabel}${cartaoNome}</span></td>
                <td>${v.obs || '-'}</td>
                <td class="text-danger" style="font-weight:600">${App.formatCurrency(v.valor)}</td>
                <td>
                    <button class="btn btn-del" data-id="${v.id}"
                        style="padding:4px; background:transparent; color:var(--danger)">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Excluir
        document.querySelectorAll('.btn-del').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (!confirm('Deseja apagar este registro?')) return;
                const tr = e.currentTarget.closest('tr');
                if (tr) tr.style.opacity = '0.4';
                await Store.delete(KEYS.VEICULO, id);
                Toast.success('Registro apagado.');
                App.loadView('veiculo');
            });
        });

        // Salvar nova despesa
        document.getElementById('form-veiculo').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';

            const data    = document.getElementById('veic-data').value;
            const tipo    = document.getElementById('veic-tipo').value;
            const valor   = parseFloat(document.getElementById('veic-valor').value) || 0;
            const forma   = document.getElementById('veic-forma').value;
            const obs     = document.getElementById('veic-obs').value;
            const isCartao = forma === 'Cartão de Crédito';

            let cartaoId   = null;
            let cartaoNome = null;

            if (isCartao) {
                const sel = document.getElementById('veic-cartao-id');
                cartaoId   = sel.value;
                cartaoNome = sel.options[sel.selectedIndex]?.dataset.nome || '';
            }

            try {
                // 1. Salvar na tabela veiculo
                await Store.insert(KEYS.VEICULO, {
                    data, tipo, valor, obs, forma,
                    cartao_id: cartaoId,
                    cartao_nome: cartaoNome
                });

                // 2. Se pagou com cartão → atualizar fatura do cartão
                if (isCartao && cartaoId) {
                    const cartao = cartoes.find(c => c.id == cartaoId);
                    if (cartao) {
                        const novoUtilizado = (parseFloat(cartao.utilizado) || 0) + valor;
                        await Store.update(KEYS.CARTOES, cartaoId, { utilizado: novoUtilizado });
                    }
                }

                // 3. Criar lançamento automático no Dashboard
                await Store.insert(KEYS.LANCAMENTOS, {
                    data,
                    descricao: `${tipo} (Veículo${cartaoNome ? ' - ' + cartaoNome : ''})`,
                    categoria: 'Carro',
                    tipo: 'despesa',
                    valor,
                    forma
                });

                Toast.success('Despesa registrada! Lançamento e cartão atualizados automaticamente. 🚗');
                App.loadView('veiculo');

            } catch (err) {
                console.error(err);
                Toast.error('Erro ao salvar: ' + err.message);
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-plus"></i> Registrar Despesa';
            }
        });
    }
};
