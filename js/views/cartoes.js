window.Views.cartoes = {
    render: async (container) => {
        const cartoes = await Store.get(KEYS.CARTOES) || [];

        // Cores por bandeira/banco
        const bankColors = {
            nubank:     { bg: 'linear-gradient(135deg, #8a05be, #6003aa)', icon: 'N' },
            inter:      { bg: 'linear-gradient(135deg, #ff7a00, #e06000)', icon: 'I' },
            itau:       { bg: 'linear-gradient(135deg, #f07700, #d05e00)', icon: 'I' },
            bradesco:   { bg: 'linear-gradient(135deg, #cc0000, #990000)', icon: 'B' },
            santander:  { bg: 'linear-gradient(135deg, #cc0000, #990000)', icon: 'S' },
            caixa:      { bg: 'linear-gradient(135deg, #005ca9, #003d72)', icon: 'C' },
            xp:         { bg: 'linear-gradient(135deg, #1a1a1a, #444)', icon: 'X' },
            c6:         { bg: 'linear-gradient(135deg, #222, #555)', icon: 'C' },
            bb:         { bg: 'linear-gradient(135deg, #f7b900, #e0a200)', icon: 'B' },
            sicoob:     { bg: 'linear-gradient(135deg, #007a4d, #004d30)', icon: 'S' },
        };

        function getBankStyle(nome = '') {
            const lower = nome.toLowerCase();
            for (const key in bankColors) {
                if (lower.includes(key)) return bankColors[key];
            }
            return { bg: 'linear-gradient(135deg, #0a9396, #2a9d8f)', icon: '💳' };
        }

        function buildCard(c) {
            const limite    = parseFloat(c.limite)    || 0;
            const utilizado = parseFloat(c.utilizado) || 0;  // total crédito consumido
            const fatura    = parseFloat(c.fatura)    || 0;  // valor da fatura deste mês
            const disponivel = limite - utilizado;
            const pct = limite > 0 ? Math.min(((utilizado / limite) * 100).toFixed(0), 100) : 0;
            const style = getBankStyle(c.nome);

            let progressColor = '#2a9d8f';
            if (pct > 80) progressColor = '#e63946';
            else if (pct > 50) progressColor = '#e9c46a';

            const venc = c.vencimento ? `Vence dia ${c.vencimento}` : '';

            return `
                <div class="card" style="padding:0; overflow:hidden; border:none;">
                    <!-- Visual do cartão -->
                    <div style="${style.bg}; padding:24px; position:relative; min-height:140px; color:white;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div>
                                <div style="font-size:12px; opacity:0.8; text-transform:uppercase; letter-spacing:1px">Cartão de Crédito</div>
                                <div style="font-size:20px; font-weight:700; margin-top:6px">${c.nome}</div>
                            </div>
                            <div style="width:42px;height:42px;border-radius:10px;background:rgba(255,255,255,0.25);
                                        display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;">
                                ${style.icon}
                            </div>
                        </div>
                        <div style="margin-top:20px; font-size:13px; opacity:0.85">${venc}</div>
                    </div>

                    <!-- Barra de limite utilizado -->
                    <div style="padding:20px 20px 0 20px;">
                        <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); margin-bottom:6px;">
                            <span>Limite Utilizado: <strong style="color:var(--text-main)">${pct}%</strong></span>
                            <span>${App.formatCurrency(utilizado)} / ${App.formatCurrency(limite)}</span>
                        </div>
                        <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden;">
                            <div style="width:${pct}%; height:100%; background:${progressColor}; border-radius:4px; transition:width 1s;"></div>
                        </div>
                    </div>

                    <!-- 3 métricas -->
                    <div style="padding:16px 20px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; border-bottom:1px solid var(--border);">
                        <div>
                            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px">Limite Total</div>
                            <div style="font-weight:700; font-size:15px; color:var(--text-main)">${App.formatCurrency(limite)}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px">Limite Utilizado</div>
                            <div style="font-weight:700; font-size:15px; color:#e9c46a">${App.formatCurrency(utilizado)}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px">Disponível</div>
                            <div style="font-weight:700; font-size:15px; color:#2a9d8f">${App.formatCurrency(disponivel)}</div>
                        </div>
                    </div>

                    <!-- Fatura em destaque -->
                    <div style="padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-size:11px; color:var(--text-muted); margin-bottom:2px">
                                <i class="ph ph-receipt"></i> Fatura do Mês Atual
                            </div>
                            <div style="font-weight:800; font-size:22px; color:#e63946">${App.formatCurrency(fatura)}</div>
                            <div style="font-size:11px; color:var(--text-muted); margin-top:2px">
                                ${fatura < utilizado ? `Outras compras (${App.formatCurrency(utilizado - fatura)}) fecham na próxima fatura` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Botões -->
                    <div style="padding:0 20px 20px 20px; display:flex; gap:8px;">
                        <button class="btn btn-edit-cartao" data-id="${c.id}"
                            style="flex:1; background:rgba(10,147,150,0.12); color:var(--primary); border:1px solid var(--primary); font-size:13px; padding:7px;">
                            <i class="ph ph-pencil"></i> Atualizar
                        </button>
                        <button class="btn btn-del-cartao" data-id="${c.id}"
                            style="background:transparent; color:var(--danger); border:1px solid var(--danger); padding:7px 12px; font-size:13px;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        let gridHtml = cartoes.length === 0
            ? `<div style="grid-column:span 3; text-align:center; padding:60px 0; color:var(--text-muted);">
                   <i class="ph ph-credit-card" style="font-size:56px; opacity:0.3;"></i>
                   <p style="margin-top:16px;">Nenhum cartão cadastrado ainda.<br>Clique em <strong>+ Novo Cartão</strong> para começar.</p>
               </div>`
            : cartoes.map(buildCard).join('');

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <p class="text-muted">Gerencie limites e faturas dos seus cartões de crédito.</p>
                <button class="btn btn-primary" id="btn-novo-cartao">
                    <i class="ph ph-plus"></i> Novo Cartão
                </button>
            </div>

            <!-- Formulário -->
            <div id="form-cartao-container" class="card mb-4" style="display:none;">
                <h3 class="mb-4" id="form-cartao-titulo">Novo Cartão</h3>

                <!-- Ajuda visual -->
                <div id="cartao-ajuda" style="background:rgba(10,147,150,0.08); border:1px solid rgba(10,147,150,0.3);
                     border-radius:10px; padding:14px 16px; margin-bottom:20px; font-size:13px; color:var(--text-muted); display:none;">
                    <i class="ph ph-info" style="color:var(--primary)"></i>
                    <strong style="color:var(--primary)">Diferença entre os campos:</strong><br>
                    <b>Limite Utilizado</b> = Total de crédito consumido (ex: compras parceladas em andamento + fatura atual).<br>
                    <b>Fatura do Mês</b> = Somente o valor que fecha <u>neste mês</u> e você vai pagar na data de vencimento.
                </div>

                <form id="form-cartao" class="grid grid-3">
                    <div class="form-group">
                        <label>Nome do Cartão / Banco</label>
                        <input type="text" id="cartao-nome" class="input-control" placeholder="Ex: Nubank, Inter, Itaú" required>
                    </div>
                    <div class="form-group">
                        <label>Limite Total (R$)</label>
                        <input type="number" step="0.01" id="cartao-limite" class="input-control" placeholder="0,00" required>
                    </div>
                    <div class="form-group">
                        <label>Dia de Vencimento</label>
                        <input type="number" id="cartao-vencimento" class="input-control" min="1" max="31" placeholder="Ex: 10">
                    </div>

                    <div class="form-group">
                        <label>
                            Limite Utilizado (R$)
                            <span style="font-size:11px; color:var(--text-muted)"> — total de crédito consumido</span>
                        </label>
                        <input type="number" step="0.01" id="cartao-utilizado" class="input-control" placeholder="0,00">
                    </div>
                    <div class="form-group">
                        <label>
                            Fatura do Mês Atual (R$)
                            <span style="font-size:11px; color:var(--text-muted)"> — o que pagar neste vencimento</span>
                        </label>
                        <input type="number" step="0.01" id="cartao-fatura" class="input-control" placeholder="0,00">
                    </div>
                    <div class="form-group" style="display:flex; align-items:flex-end;">
                        <div style="font-size:12px; color:var(--text-muted); padding-bottom:4px;">
                            <i class="ph ph-lightbulb" style="color:#e9c46a"></i>
                            Fatura ≤ Limite Utilizado
                        </div>
                    </div>

                    <div class="form-group" style="grid-column:span 3; display:flex; gap:12px; align-items:center;">
                        <button type="submit" class="btn btn-primary" id="btn-salvar-cartao">
                            <i class="ph ph-floppy-disk"></i> Salvar Cartão
                        </button>
                        <button type="button" class="btn" id="btn-cancelar-cartao"
                            style="background:transparent; border:1px solid var(--border); color:var(--text-main)">
                            Cancelar
                        </button>
                        <button type="button" id="btn-ver-ajuda"
                            style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:13px;">
                            <i class="ph ph-question"></i> Qual a diferença?
                        </button>
                    </div>
                </form>
            </div>

            <div class="grid grid-3" id="grid-cartoes">
                ${gridHtml}
            </div>
        `;

        const formContainer = document.getElementById('form-cartao-container');
        const form          = document.getElementById('form-cartao');
        const btnNovo       = document.getElementById('btn-novo-cartao');
        const btnCancelar   = document.getElementById('btn-cancelar-cartao');
        const ajuda         = document.getElementById('cartao-ajuda');
        let editandoId      = null;

        btnNovo.addEventListener('click', () => {
            editandoId = null;
            document.getElementById('form-cartao-titulo').textContent = 'Novo Cartão';
            form.reset();
            ajuda.style.display = 'none';
            formContainer.style.display = 'block';
            formContainer.scrollIntoView({ behavior: 'smooth' });
        });

        btnCancelar.addEventListener('click', () => {
            formContainer.style.display = 'none';
            form.reset();
            editandoId = null;
        });

        document.getElementById('btn-ver-ajuda').addEventListener('click', () => {
            ajuda.style.display = ajuda.style.display === 'none' ? 'block' : 'none';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-salvar-cartao');
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';

            const utilizado = parseFloat(document.getElementById('cartao-utilizado').value) || 0;
            const fatura    = parseFloat(document.getElementById('cartao-fatura').value) || 0;

            // Validação: fatura não pode ser maior que limite utilizado
            if (fatura > utilizado && utilizado > 0) {
                Toast.warning('A fatura do mês não pode ser maior que o limite utilizado.');
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Cartão';
                return;
            }

            const payload = {
                nome:       document.getElementById('cartao-nome').value.trim(),
                limite:     parseFloat(document.getElementById('cartao-limite').value) || 0,
                utilizado,
                fatura,
                vencimento: document.getElementById('cartao-vencimento').value || null,
            };

            if (editandoId) {
                await Store.update(KEYS.CARTOES, editandoId, payload);
                Toast.success('Cartão atualizado com sucesso!');
            } else {
                await Store.insert(KEYS.CARTOES, payload);
                Toast.success('Cartão adicionado com sucesso!');
            }

            App.loadView('cartoes');
        });

        // Botão Editar
        document.querySelectorAll('.btn-edit-cartao').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const c  = cartoes.find(x => x.id == id);
                if (!c) return;

                editandoId = id;
                document.getElementById('form-cartao-titulo').textContent = 'Atualizar Cartão';
                document.getElementById('cartao-nome').value       = c.nome || '';
                document.getElementById('cartao-limite').value     = c.limite || '';
                document.getElementById('cartao-utilizado').value  = c.utilizado || '';
                document.getElementById('cartao-fatura').value     = c.fatura || '';
                document.getElementById('cartao-vencimento').value = c.vencimento || '';
                ajuda.style.display = 'none';
                formContainer.style.display = 'block';
                formContainer.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Excluir
        document.querySelectorAll('.btn-del-cartao').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (!confirm('Deseja remover este cartão?')) return;
                await Store.delete(KEYS.CARTOES, id);
                Toast.success('Cartão removido.');
                App.loadView('cartoes');
            });
        });
    }
};
