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
            const limite    = parseFloat(c.limite) || 0;
            const utilizado = parseFloat(c.utilizado) || 0;
            const disponivel = limite - utilizado;
            const pct = limite > 0 ? Math.min(((utilizado / limite) * 100).toFixed(0), 100) : 0;
            const style = getBankStyle(c.nome);

            let progressColor = '#2a9d8f';
            if (pct > 80) progressColor = '#e63946';
            else if (pct > 50) progressColor = '#e9c46a';

            // Formata data de vencimento
            const venc = c.vencimento ? `Vence dia ${c.vencimento}` : '';

            return `
                <div class="card" style="padding: 0; overflow: hidden; border: none;">
                    <!-- Frente visual do cartão -->
                    <div style="${style.bg}; padding: 24px; position: relative; min-height: 140px; color: white;">
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

                    <!-- Corpo com dados -->
                    <div style="padding: 20px;">
                        <div style="margin-bottom: 12px;">
                            <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); margin-bottom:6px;">
                                <span>Utilizado: <strong style="color:var(--text-main)">${pct}%</strong></span>
                                <span>${App.formatCurrency(utilizado)} / ${App.formatCurrency(limite)}</span>
                            </div>
                            <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden;">
                                <div style="width:${pct}%; height:100%; background:${progressColor}; border-radius:4px; transition:width 1s;"></div>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:14px; border-top:1px solid var(--border);">
                            <div>
                                <div style="font-size:11px; color:var(--text-muted)">Disponível</div>
                                <div style="font-weight:700; color:#2a9d8f; font-size:17px">${App.formatCurrency(disponivel)}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:11px; color:var(--text-muted)">Fatura</div>
                                <div style="font-weight:700; color:#e63946; font-size:17px">${App.formatCurrency(utilizado)}</div>
                            </div>
                        </div>

                        <div style="margin-top:14px; display:flex; gap:8px;">
                            <button class="btn btn-edit-cartao" data-id="${c.id}"
                                style="flex:1; background:rgba(10,147,150,0.12); color:var(--primary); border:1px solid var(--primary); font-size:13px; padding:7px;">
                                <i class="ph ph-pencil"></i> Atualizar Fatura
                            </button>
                            <button class="btn btn-del-cartao" data-id="${c.id}"
                                style="background:transparent; color:var(--danger); border:1px solid var(--danger); padding:7px 12px; font-size:13px;">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
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

            <!-- Formulário (oculto por padrão) -->
            <div id="form-cartao-container" class="card mb-4" style="display:none;">
                <h3 class="mb-4" id="form-cartao-titulo">Novo Cartão</h3>
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
                        <label>Fatura Atual (R$)</label>
                        <input type="number" step="0.01" id="cartao-utilizado" class="input-control" placeholder="0,00">
                    </div>
                    <div class="form-group">
                        <label>Dia de Vencimento</label>
                        <input type="number" id="cartao-vencimento" class="input-control" min="1" max="31" placeholder="Ex: 10">
                    </div>
                    <div class="form-group" style="grid-column: span 2; display:flex; gap:12px; align-items:flex-end;">
                        <button type="submit" class="btn btn-primary" id="btn-salvar-cartao">
                            <i class="ph ph-floppy-disk"></i> Salvar Cartão
                        </button>
                        <button type="button" class="btn" id="btn-cancelar-cartao"
                            style="background:transparent; border:1px solid var(--border); color:var(--text-main)">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>

            <div class="grid grid-3" id="grid-cartoes">
                ${gridHtml}
            </div>
        `;

        const formContainer  = document.getElementById('form-cartao-container');
        const form           = document.getElementById('form-cartao');
        const btnNovo        = document.getElementById('btn-novo-cartao');
        const btnCancelar    = document.getElementById('btn-cancelar-cartao');
        let editandoId       = null;

        // Abrir formulário de novo cartão
        btnNovo.addEventListener('click', () => {
            editandoId = null;
            document.getElementById('form-cartao-titulo').textContent = 'Novo Cartão';
            form.reset();
            formContainer.style.display = 'block';
            formContainer.scrollIntoView({ behavior: 'smooth' });
        });

        btnCancelar.addEventListener('click', () => {
            formContainer.style.display = 'none';
            form.reset();
            editandoId = null;
        });

        // Salvar cartão (novo ou edição)
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-salvar-cartao');
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';

            const payload = {
                nome:       document.getElementById('cartao-nome').value.trim(),
                limite:     parseFloat(document.getElementById('cartao-limite').value) || 0,
                utilizado:  parseFloat(document.getElementById('cartao-utilizado').value) || 0,
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

        // Botão Atualizar Fatura (edição)
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
                document.getElementById('cartao-vencimento').value = c.vencimento || '';
                formContainer.style.display = 'block';
                formContainer.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Excluir cartão
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
