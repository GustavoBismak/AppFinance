// js/views/cartoes.js — Gerenciamento de Cartões de Crédito (Open Finance + Manuais)

window.Views.cartoes = {
    render: async (container) => {
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 0;">
                <i class="ph ph-spinner ph-spin" style="font-size: 36px; color: var(--primary);"></i>
                <span style="margin-left: 12px; color: var(--text-muted);">Carregando cartões e faturas...</span>
            </div>
        `;

        const [cartoesManuais, bankAccounts, bankConnections] = await Promise.all([
            Store.get(KEYS.CARTOES) || [],
            Store.get(KEYS.BANK_ACCOUNTS) || [],
            Store.get(KEYS.BANK_CONNECTIONS) || []
        ]);

        // Helper para identificar contas de cartão de crédito no Open Finance
        const isCardAccount = (acc) => {
            if (!acc) return false;
            if (acc.type === 'CREDIT' || acc.subtype === 'CREDIT_CARD') return true;
            const name = (acc.name || '').toLowerCase();
            return name.includes('gold') || name.includes('ourocard') || name.includes('cartão') || name.includes('cartao') || name.includes('credit card');
        };

        const openFinanceCards = bankAccounts.filter(isCardAccount);

        // Estilos por banco/bandeira
        const bankStyles = {
            nubank:     { bg: 'linear-gradient(135deg, #820ad1, #4c0677)', color: '#fff', icon: 'N', brand: 'Mastercard' },
            bb:         { bg: 'linear-gradient(135deg, #003399, #001f5c)', color: '#fff', icon: 'BB', brand: 'Elo/Visa' },
            'banco do brasil': { bg: 'linear-gradient(135deg, #003399, #001f5c)', color: '#fff', icon: 'BB', brand: 'Elo/Visa' },
            ourocard:   { bg: 'linear-gradient(135deg, #003399, #001f5c)', color: '#fff', icon: 'BB', brand: 'Elo/Visa' },
            inter:      { bg: 'linear-gradient(135deg, #ff7a00, #c45500)', color: '#fff', icon: 'I', brand: 'Mastercard' },
            itau:       { bg: 'linear-gradient(135deg, #ec7000, #a84600)', color: '#fff', icon: 'I', brand: 'Visa' },
            bradesco:   { bg: 'linear-gradient(135deg, #cc092f, #8b001a)', color: '#fff', icon: 'B', brand: 'Elo/Visa' },
            santander:  { bg: 'linear-gradient(135deg, #ec0000, #9e0000)', color: '#fff', icon: 'S', brand: 'Mastercard' },
            caixa:      { bg: 'linear-gradient(135deg, #005ca9, #003866)', color: '#fff', icon: 'C', brand: 'Elo/Visa' },
            c6:         { bg: 'linear-gradient(135deg, #242424, #111111)', color: '#fff', icon: 'C6', brand: 'Mastercard' }
        };

        function getStyleForCard(nome = '') {
            const lower = nome.toLowerCase();
            for (const key in bankStyles) {
                if (lower.includes(key)) return bankStyles[key];
            }
            return { bg: 'linear-gradient(135deg, #0a9396, #005f73)', color: '#fff', icon: '💳', brand: 'Crédito' };
        }

        // Totais Consolidados de Cartões
        let totalFaturas = 0;
        let totalLimites = 0;
        let totalUtilizado = 0;

        // Processa dados dos cartões do Open Finance
        const processedOfCards = openFinanceCards.map(acc => {
            const conn = bankConnections.find(c => c.id === acc.bank_connection_id) || {};
            let meta = null;
            try {
                meta = JSON.parse(localStorage.getItem('of_card_meta_' + acc.id) || 'null');
            } catch (_) {}

            const fatura = parseFloat(acc.balance_available) || parseFloat(acc.balance_current) || 0;
            const customLimit = parseFloat(localStorage.getItem('of_card_custom_limit_' + acc.id) || '0');
            const customVenc = localStorage.getItem('of_card_custom_venc_' + acc.id) || null;

            const limiteTotal = customLimit > 0 ? customLimit : (parseFloat(meta?.creditLimit) || 0);
            const disponivel = meta?.availableLimit ? parseFloat(meta.availableLimit) : (limiteTotal > 0 ? Math.max(0, limiteTotal - fatura) : 0);
            const vencDia = customVenc || (meta?.balanceDueDate ? new Date(meta.balanceDueDate).getUTCDate() : null);

            totalFaturas += fatura;
            totalLimites += limiteTotal;
            totalUtilizado += fatura;

            return {
                acc,
                conn,
                meta,
                fatura,
                limiteTotal,
                disponivel,
                vencDia
            };
        });

        // Soma cartões manuais
        cartoesManuais.forEach(c => {
            const lim = parseFloat(c.limite) || 0;
            const uti = parseFloat(c.utilizado) || 0;
            const fat = parseFloat(c.fatura) || 0;
            totalLimites += lim;
            totalUtilizado += uti;
            totalFaturas += fat;
        });

        const totalDisponivel = Math.max(0, totalLimites - totalUtilizado);

        // -------------------------------------------------------------
        // Construtores de Cards HTML
        // -------------------------------------------------------------
        function buildOpenFinanceCardItem(item) {
            const { acc, conn, meta, fatura, limiteTotal, disponivel, vencDia } = item;
            const instName = conn.institution_name || 'Banco Conectado';
            const fullName = `${instName} - ${acc.name}`;
            const style = getStyleForCard(fullName);

            const pct = limiteTotal > 0 ? Math.min(((fatura / limiteTotal) * 100).toFixed(0), 100) : 0;
            let progressColor = '#2a9d8f';
            if (pct > 80) progressColor = '#e63946';
            else if (pct > 50) progressColor = '#e9c46a';

            const vencTexto = vencDia ? `Vence dia ${vencDia}` : 'Vencimento sincronizado via banco';
            const brandTexto = meta?.brand || style.brand || 'Crédito';

            return `
                <div class="card" style="padding: 0; overflow: hidden; border: 1px solid rgba(10, 147, 150, 0.3); box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                    <!-- Topo Visual do Cartão -->
                    <div style="${style.bg}; padding: 22px; position: relative; min-height: 140px; color: ${style.color};">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Cartão de Crédito</span>
                                    <span class="badge" style="background: rgba(255,255,255,0.22); color: #fff; font-size: 10px; padding: 2px 7px; border-radius: 4px;">
                                        <i class="ph ph-shield-check"></i> Open Finance
                                    </span>
                                </div>
                                <div style="font-size: 19px; font-weight: 700; margin-top: 6px;">${acc.name}</div>
                                <div style="font-size: 12px; opacity: 0.85;">${instName} ${acc.number ? `(••• ${acc.number.slice(-4)})` : ''}</div>
                            </div>
                            <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 800;">
                                ${conn.institution_logo ? `<img src="${conn.institution_logo}" style="width: 26px; height: 26px; object-fit: contain; border-radius: 4px;">` : style.icon}
                            </div>
                        </div>
                        <div style="margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; opacity: 0.9;">
                            <span><i class="ph ph-calendar"></i> ${vencTexto}</span>
                            <span style="font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">${brandTexto}</span>
                        </div>
                    </div>

                    <!-- Fatura Atual em Destaque -->
                    <div style="padding: 16px 20px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 3px; display: flex; align-items: center; gap: 5px;">
                                <i class="ph ph-receipt" style="color: #e63946;"></i> Fatura Atual do Cartão
                            </div>
                            <div style="font-weight: 800; font-size: 24px; color: #e63946;">${App.formatCurrency(fatura)}</div>
                        </div>
                        <span class="badge" style="background: rgba(230, 57, 70, 0.12); color: #e63946; font-size: 11px; padding: 5px 10px;">
                            ${fatura > 0 ? 'Fatura Aberta' : 'Fatura Zerada'}
                        </span>
                    </div>

                    <!-- Limites e Progresso -->
                    <div style="padding: 16px 20px 0 20px;">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
                            <span>Limite Utilizado: <strong style="color: var(--text-main)">${limiteTotal > 0 ? pct + '%' : 'Informar Limite'}</strong></span>
                            <span>${limiteTotal > 0 ? `${App.formatCurrency(fatura)} / ${App.formatCurrency(limiteTotal)}` : `${App.formatCurrency(fatura)} consumido`}</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${limiteTotal > 0 ? pct : 100}%; height: 100%; background: ${limiteTotal > 0 ? progressColor : 'var(--primary)'}; border-radius: 4px; transition: width 0.8s;"></div>
                        </div>
                    </div>

                    <!-- 3 Métricas -->
                    <div class="cartao-metrics-grid" style="padding: 14px 20px; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 3px;">Limite Total</div>
                            <div style="font-weight: 700; font-size: 14px; color: var(--text-main);">
                                ${limiteTotal > 0 ? App.formatCurrency(limiteTotal) : '<span style="font-size:12px; color:var(--text-muted);">Não inf.</span>'}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 3px;">Fatura / Uso</div>
                            <div style="font-weight: 700; font-size: 14px; color: #e9c46a;">${App.formatCurrency(fatura)}</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 3px;">Disponível</div>
                            <div style="font-weight: 700; font-size: 14px; color: #2a9d8f;">
                                ${limiteTotal > 0 ? App.formatCurrency(disponivel) : '<span style="font-size:12px; color:var(--text-muted);">—</span>'}
                            </div>
                        </div>
                    </div>

                    <!-- Ações Rápidas -->
                    <div style="padding: 12px 20px 16px 20px; display: flex; gap: 8px;">
                        <button class="btn btn-sync-card-of" data-item-id="${conn.external_item_id}" data-name="${acc.name}" title="Buscar fatura mais recente no banco"
                            style="flex: 1; background: rgba(10, 147, 150, 0.12); color: var(--primary); border: 1px solid var(--primary); font-size: 12px; padding: 7px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                            <i class="ph ph-arrows-clockwise"></i> Atualizar Fatura
                        </button>
                        <button class="btn btn-set-limit-of" data-acc-id="${acc.id}" data-current="${limiteTotal}" data-venc="${vencDia || ''}" data-name="${acc.name}" title="Definir limite ou dia de vencimento"
                            style="background: transparent; color: var(--text-muted); border: 1px solid var(--border); font-size: 12px; padding: 7px 10px;">
                            <i class="ph ph-sliders"></i> Ajustar Limite
                        </button>
                    </div>
                </div>
            `;
        }

        function buildManualCard(c) {
            const limite    = parseFloat(c.limite)    || 0;
            const utilizado = parseFloat(c.utilizado) || 0;
            const fatura    = parseFloat(c.fatura)    || 0;
            const disponivel = limite - utilizado;
            const pct = limite > 0 ? Math.min(((utilizado / limite) * 100).toFixed(0), 100) : 0;
            const style = getStyleForCard(c.nome);

            let progressColor = '#2a9d8f';
            if (pct > 80) progressColor = '#e63946';
            else if (pct > 50) progressColor = '#e9c46a';

            const venc = c.vencimento ? `Vence dia ${c.vencimento}` : 'Sem vencimento';

            return `
                <div class="card" style="padding:0; overflow:hidden; border:none;">
                    <div style="${style.bg}; padding:22px; position:relative; min-height:140px; color:white;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div>
                                <div style="font-size:11px; opacity:0.8; text-transform:uppercase; letter-spacing:1px; font-weight:600;">Cartão Manual</div>
                                <div style="font-size:19px; font-weight:700; margin-top:6px;">${c.nome}</div>
                            </div>
                            <div style="width:42px;height:42px;border-radius:10px;background:rgba(255,255,255,0.25);
                                        display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;">
                                ${style.icon}
                            </div>
                        </div>
                        <div style="margin-top:18px; font-size:12px; opacity:0.85;">${venc}</div>
                    </div>

                    <div style="padding:16px 20px 0 20px;">
                        <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); margin-bottom:6px;">
                            <span>Limite Utilizado: <strong style="color:var(--text-main)">${pct}%</strong></span>
                            <span>${App.formatCurrency(utilizado)} / ${App.formatCurrency(limite)}</span>
                        </div>
                        <div style="width:100%; height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                            <div style="width:${pct}%; height:100%; background:${progressColor}; border-radius:4px; transition:width 1s;"></div>
                        </div>
                    </div>

                    <div class="cartao-metrics-grid" style="padding:14px 20px; border-bottom:1px solid var(--border);">
                        <div>
                            <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">Limite Total</div>
                            <div style="font-weight:700; font-size:14px; color:var(--text-main);">${App.formatCurrency(limite)}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">Limite Utilizado</div>
                            <div style="font-weight:700; font-size:14px; color:#e9c46a;">${App.formatCurrency(utilizado)}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">Disponível</div>
                            <div style="font-weight:700; font-size:14px; color:#2a9d8f;">${App.formatCurrency(disponivel)}</div>
                        </div>
                    </div>

                    <div style="padding:14px 20px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-size:11px; color:var(--text-muted); margin-bottom:2px;">
                                <i class="ph ph-receipt"></i> Fatura do Mês Atual
                            </div>
                            <div style="font-weight:800; font-size:22px; color:#e63946;">${App.formatCurrency(fatura)}</div>
                        </div>
                    </div>

                    <div style="padding:0 20px 18px 20px; display:flex; gap:8px;">
                        <button class="btn btn-pagar-fatura" data-id="${c.id}" title="Marcar fatura como paga"
                            style="flex:1; background:rgba(42, 157, 143, 0.12); color:var(--success); border:1px solid var(--success); font-size:12px; padding:7px;">
                            <i class="ph ph-check-circle"></i> Pagar Fatura
                        </button>
                        <button class="btn btn-edit-cartao" data-id="${c.id}"
                            style="background:rgba(10,147,150,0.12); color:var(--primary); border:1px solid var(--primary); font-size:12px; padding:7px 10px;">
                            <i class="ph ph-pencil"></i>
                        </button>
                        <button class="btn btn-del-cartao" data-id="${c.id}"
                            style="background:transparent; color:var(--danger); border:1px solid var(--danger); padding:7px 10px; font-size:12px;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        // -------------------------------------------------------------
        // Renderização Principal do Container
        // -------------------------------------------------------------
        const temCardsOF = processedOfCards.length > 0;
        const temCardsManuais = cartoesManuais.length > 0;

        container.innerHTML = `
            <!-- Topo com KPIs Consolidados -->
            <div class="grid grid-4 mb-4">
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted" style="font-size: 13px;">Total em Faturas (Mês)</span>
                        <i class="ph ph-receipt text-danger" style="font-size: 22px;"></i>
                    </div>
                    <h2 class="text-danger" style="font-size: 26px; font-weight: 700;">
                        ${App.formatCurrency(totalFaturas)}
                    </h2>
                    <span class="text-muted" style="font-size: 11px;">Soma de faturas a vencer</span>
                </div>

                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted" style="font-size: 13px;">Limite Total Cadastrado</span>
                        <i class="ph ph-credit-card text-primary" style="font-size: 22px;"></i>
                    </div>
                    <h2 style="font-size: 26px; font-weight: 700; color: var(--text-main);">
                        ${App.formatCurrency(totalLimites)}
                    </h2>
                    <span class="text-muted" style="font-size: 11px;">Capacidade total de crédito</span>
                </div>

                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted" style="font-size: 13px;">Limite Disponível</span>
                        <i class="ph ph-shield-check text-success" style="font-size: 22px;"></i>
                    </div>
                    <h2 class="text-success" style="font-size: 26px; font-weight: 700;">
                        ${App.formatCurrency(totalDisponivel)}
                    </h2>
                    <span class="text-muted" style="font-size: 11px;">Livre para compras</span>
                </div>

                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-muted" style="font-size: 13px;">Cartões Ativos</span>
                        <i class="ph ph-cards" style="font-size: 22px; color: #e9c46a;"></i>
                    </div>
                    <h2 style="font-size: 26px; font-weight: 700; color: #e9c46a;">
                        ${openFinanceCards.length + cartoesManuais.length}
                    </h2>
                    <span class="text-muted" style="font-size: 11px;">${openFinanceCards.length} via banco • ${cartoesManuais.length} manuais</span>
                </div>
            </div>

            <!-- Cabeçalho de Ações -->
            <div class="view-header-action mb-4 flex justify-between items-center flex-wrap" style="gap: 12px;">
                <div>
                    <h3 style="font-size: 18px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-credit-card" style="color: var(--primary);"></i> Meus Cartões de Crédito
                    </h3>
                    <p class="text-muted" style="font-size: 13px; margin: 2px 0 0 0;">
                        Monitore limites, faturas e vencimentos automáticos do Open Finance e manuais
                    </p>
                </div>
                <div class="flex gap-2">
                    ${temCardsOF ? `
                        <button class="btn btn-outline" id="btn-sync-all-cards" style="display: flex; align-items: center; gap: 6px;">
                            <i class="ph ph-arrows-clockwise"></i> Atualizar Faturas
                        </button>
                    ` : `
                        <button class="btn btn-outline" onclick="App.loadView('conexoes')" style="display: flex; align-items: center; gap: 6px;">
                            <i class="ph ph-bank"></i> Conectar Banco
                        </button>
                    `}
                    <button class="btn btn-primary" id="btn-novo-cartao" style="display: flex; align-items: center; gap: 6px;">
                        <i class="ph ph-plus"></i> Novo Cartão Manual
                    </button>
                </div>
            </div>

            <!-- Formulário de Cartão Manual -->
            <div id="form-cartao-container" class="card mb-4" style="display:none;">
                <h3 class="mb-4" id="form-cartao-titulo">Novo Cartão Manual</h3>

                <div id="cartao-ajuda" style="background:rgba(10,147,150,0.08); border:1px solid rgba(10,147,150,0.3);
                     border-radius:10px; padding:14px 16px; margin-bottom:20px; font-size:13px; color:var(--text-muted); display:none;">
                    <i class="ph ph-info" style="color:var(--primary)"></i>
                    <strong style="color:var(--primary)">Diferença entre os campos:</strong><br>
                    <b>Limite Utilizado</b> = Total de crédito consumido (ex: parcelas futuras + fatura atual).<br>
                    <b>Fatura do Mês</b> = Somente o valor que fecha <u>neste mês</u> para pagamento na data de vencimento.
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
                            <span style="font-size:11px; color:var(--text-muted)"> — total consumido</span>
                        </label>
                        <input type="number" step="0.01" id="cartao-utilizado" class="input-control" placeholder="0,00">
                    </div>
                    <div class="form-group">
                        <label>
                            Fatura do Mês Atual (R$)
                            <span style="font-size:11px; color:var(--text-muted)"> — a pagar</span>
                        </label>
                        <input type="number" step="0.01" id="cartao-fatura" class="input-control" placeholder="0,00">
                    </div>
                    <div class="form-group" style="display:flex; align-items:flex-end;">
                        <div style="font-size:12px; color:var(--text-muted); padding-bottom:4px;">
                            <i class="ph ph-lightbulb" style="color:#e9c46a"></i>
                            Fatura ≤ Limite Utilizado
                        </div>
                    </div>

                    <div class="form-group form-actions" style="grid-column:span 3; display:flex; gap:12px; align-items:center;">
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

            <!-- SEÇÃO 1: Cartões Conectados via Open Finance -->
            ${temCardsOF ? `
                <div class="mb-4">
                    <div class="flex items-center gap-2 mb-3">
                        <i class="ph ph-shield-check" style="color: var(--primary); font-size: 18px;"></i>
                        <h4 style="font-size: 15px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-main);">
                            Cartões Sincronizados via Open Finance (${openFinanceCards.length})
                        </h4>
                    </div>
                    <div class="grid grid-3" style="gap: 16px;">
                        ${processedOfCards.map(buildOpenFinanceCardItem).join('')}
                    </div>
                </div>
            ` : `
                <div class="card mb-4" style="background: rgba(10,147,150,0.06); border: 1px dashed var(--primary); padding: 20px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(10,147,150,0.15); display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 22px;">
                            <i class="ph ph-credit-card"></i>
                        </div>
                        <div>
                            <strong style="font-size: 15px;">Deseja sincronizar seus cartões automaticamente?</strong>
                            <p class="text-muted" style="font-size: 13px; margin: 2px 0 0 0;">
                                Conecte seu banco (Nubank, BB, Inter, Itaú, etc.) no Open Finance para importar faturas e limites em tempo real.
                            </p>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="App.loadView('conexoes')" style="font-size: 13px; padding: 10px 18px; font-weight: 600;">
                        <i class="ph ph-plug"></i> Conectar Cartões
                    </button>
                </div>
            `}

            <!-- SEÇÃO 2: Cartões Manuais -->
            <div class="mb-4">
                <div class="flex items-center gap-2 mb-3">
                    <i class="ph ph-pencil-simple" style="color: var(--text-muted); font-size: 18px;"></i>
                    <h4 style="font-size: 15px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-main);">
                        Cartões Cadastrados Manualmente (${cartoesManuais.length})
                    </h4>
                </div>

                ${temCardsManuais ? `
                    <div class="grid grid-3" id="grid-cartoes" style="gap: 16px;">
                        ${cartoesManuais.map(buildManualCard).join('')}
                    </div>
                ` : `
                    <div class="card text-center" style="padding: 30px; border: 1px dashed var(--border); color: var(--text-muted);">
                        <i class="ph ph-credit-card" style="font-size: 36px; opacity: 0.3; margin-bottom: 8px;"></i>
                        <p style="margin: 0; font-size: 13px;">Nenhum cartão cadastrado manualmente. Você pode adicionar outros cartões clicando em <strong>+ Novo Cartão Manual</strong>.</p>
                    </div>
                `}
            </div>
        `;

        // -------------------------------------------------------------
        // Handlers e Binds dos Botões
        // -------------------------------------------------------------
        const formContainer = document.getElementById('form-cartao-container');
        const form          = document.getElementById('form-cartao');
        const btnNovo       = document.getElementById('btn-novo-cartao');
        const btnCancelar   = document.getElementById('btn-cancelar-cartao');
        const ajuda         = document.getElementById('cartao-ajuda');
        let editandoId      = null;

        btnNovo?.addEventListener('click', () => {
            editandoId = null;
            document.getElementById('form-cartao-titulo').textContent = 'Novo Cartão Manual';
            form.reset();
            ajuda.style.display = 'none';
            formContainer.style.display = 'block';
            formContainer.scrollIntoView({ behavior: 'smooth' });
        });

        btnCancelar?.addEventListener('click', () => {
            formContainer.style.display = 'none';
            form.reset();
            editandoId = null;
        });

        document.getElementById('btn-ver-ajuda')?.addEventListener('click', () => {
            ajuda.style.display = ajuda.style.display === 'none' ? 'block' : 'none';
        });

        // Salvar Cartão Manual
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-salvar-cartao');
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';

            const utilizado = parseFloat(document.getElementById('cartao-utilizado').value) || 0;
            const fatura    = parseFloat(document.getElementById('cartao-fatura').value) || 0;

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

        // Editar Cartão Manual
        document.querySelectorAll('.btn-edit-cartao').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const c  = cartoesManuais.find(x => x.id == id);
                if (!c) return;

                editandoId = id;
                document.getElementById('form-cartao-titulo').textContent = 'Atualizar Cartão Manual';
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

        // Excluir Cartão Manual
        document.querySelectorAll('.btn-del-cartao').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (!confirm('Deseja remover este cartão?')) return;
                await Store.delete(KEYS.CARTOES, id);
                Toast.success('Cartão removido.');
                App.loadView('cartoes');
            });
        });

        // Pagar Fatura Cartão Manual
        document.querySelectorAll('.btn-pagar-fatura').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const c  = cartoesManuais.find(x => x.id == id);
                if (!c) return;

                if (!confirm(`Deseja marcar a fatura do cartão ${c.nome} como paga? Isso zerará o limite utilizado e a fatura.`)) return;
                
                await Store.update(KEYS.CARTOES, id, { utilizado: 0, fatura: 0 });
                Toast.success('Fatura paga e limite restabelecido!');
                App.loadView('cartoes');
            });
        });

        // Sincronizar Fatura de Cartão do Open Finance
        document.querySelectorAll('.btn-sync-card-of').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const itemId = e.currentTarget.dataset.itemId;
                const cardName = e.currentTarget.dataset.name;
                const icon = e.currentTarget.querySelector('i');
                if (icon) icon.className = 'ph ph-spinner ph-spin';
                e.currentTarget.disabled = true;

                Swal.fire({
                    title: 'Atualizando Fatura',
                    text: `Conectando ao banco para buscar a fatura mais recente de ${cardName}...`,
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading(),
                    background: '#1a1d24',
                    color: '#f8f9fa'
                });

                try {
                    await OpenFinance.syncDirect(itemId, { forceRemote: true });
                    Swal.close();
                    Toast.success(`Fatura de ${cardName} atualizada com sucesso!`);
                    App.loadView('cartoes');
                } catch (err) {
                    Swal.close();
                    Toast.error('Erro ao atualizar: ' + err.message);
                    if (icon) icon.className = 'ph ph-arrows-clockwise';
                    e.currentTarget.disabled = false;
                }
            });
        });

        // Ajustar Limite ou Vencimento do Cartão Open Finance
        document.querySelectorAll('.btn-set-limit-of').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const accId = e.currentTarget.dataset.accId;
                const cardName = e.currentTarget.dataset.name;
                const currentLimit = e.currentTarget.dataset.current || '0';
                const currentVenc = e.currentTarget.dataset.venc || '';

                const { value: formValues } = await Swal.fire({
                    title: `Ajustar Cartão - ${cardName}`,
                    html: `
                        <div style="text-align: left; font-size: 13px; color: #adb5bd; margin-bottom: 12px;">
                            Configure o limite total contratado no seu banco e o dia do vencimento da fatura:
                        </div>
                        <div style="margin-bottom: 12px; text-align: left;">
                            <label style="font-size: 12px; color: #f8f9fa; display: block; margin-bottom: 4px;">Limite Total do Cartão (R$)</label>
                            <input id="swal-limit" type="number" step="0.01" class="swal2-input" placeholder="Ex: 5000" value="${currentLimit > 0 ? currentLimit : ''}" style="margin: 0; width: 100%; box-sizing: border-box;">
                        </div>
                        <div style="text-align: left;">
                            <label style="font-size: 12px; color: #f8f9fa; display: block; margin-bottom: 4px;">Dia de Vencimento da Fatura</label>
                            <input id="swal-venc" type="number" min="1" max="31" class="swal2-input" placeholder="Ex: 10 ou 25" value="${currentVenc}" style="margin: 0; width: 100%; box-sizing: border-box;">
                        </div>
                    `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: 'Salvar Configuração',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#0a9396',
                    cancelButtonColor: '#495057',
                    background: '#1a1d24',
                    color: '#f8f9fa',
                    preConfirm: () => {
                        return {
                            limite: parseFloat(document.getElementById('swal-limit').value) || 0,
                            vencimento: document.getElementById('swal-venc').value.trim()
                        };
                    }
                });

                if (formValues) {
                    if (formValues.limite > 0) {
                        localStorage.setItem('of_card_custom_limit_' + accId, formValues.limite.toString());
                    } else {
                        localStorage.removeItem('of_card_custom_limit_' + accId);
                    }
                    if (formValues.vencimento) {
                        localStorage.setItem('of_card_custom_venc_' + accId, formValues.vencimento);
                    } else {
                        localStorage.removeItem('of_card_custom_venc_' + accId);
                    }

                    Toast.success('Configurações do cartão salvas com sucesso!');
                    App.loadView('cartoes');
                }
            });
        });

        // Sincronizar todos os cartões OF
        document.getElementById('btn-sync-all-cards')?.addEventListener('click', async () => {
            Swal.fire({
                title: 'Atualizando Faturas',
                text: 'Consultando bancos para atualizar limites e faturas...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                background: '#1a1d24',
                color: '#f8f9fa'
            });

            try {
                await OpenFinance.syncDirect_all(true);
                Swal.close();
                Toast.success('Faturas atualizadas com sucesso via Open Finance!');
                App.loadView('cartoes');
            } catch (err) {
                Swal.close();
                Toast.error('Erro ao atualizar faturas: ' + err.message);
            }
        });
    }
};
