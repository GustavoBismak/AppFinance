window.getUserDisplayName = () => {
    try {
        const cached = localStorage.getItem('finapp_user_display_name') || localStorage.getItem('finapp_user_name');
        if (cached && cached.trim() && !cached.includes('@')) {
            return cached.trim();
        }
    } catch (e) {}

    const user = window.Auth?.user;
    const meta = user?.user_metadata;
    const metaName = meta?.full_name || meta?.name || meta?.nome || meta?.display_name;
    if (metaName && typeof metaName === 'string' && metaName.trim() && !metaName.includes('@')) {
        return metaName.trim();
    }

    try {
        const domInput = document.getElementById('nome-usuario');
        if (domInput && domInput.value && domInput.value.trim() && !domInput.value.includes('@')) {
            return domInput.value.trim();
        }
    } catch (e) {}

    return 'Usuário';
};

const App = {
    currentView: 'dashboard',

    titulos: {
        dashboard: 'Dashboard',
        intelligence: 'FinApp Intelligence',
        lancamentos: 'Lançamentos',
        conexoes: 'Contas Conectadas',
        contas: 'Contas a Pagar',
        cartoes: 'Cartões',
        veiculo: 'Veículo',
        investimentos: 'Investimentos',
        metas: 'Metas',
        relatorios: 'Relatórios',
        conta: 'Minha Conta',
        configuracoes: 'Configurações',
        admin: 'Administração SaaS'
    },

    init: async () => {
        App.bindNavigation();
        await App.loadView(App.currentView);
    },

    openMobileMenu: () => {
        document.getElementById('sidebar')?.classList.add('open');
        document.getElementById('sidebar-backdrop')?.classList.add('active');
    },

    closeMobileMenu: () => {
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebar-backdrop')?.classList.remove('active');
    },

    toggleMobileMenu: () => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            App.closeMobileMenu();
        } else {
            App.openMobileMenu();
        }
    },

    bindNavigation: () => {
        // Navegação via Sidebar e Bottom Nav
        document.querySelectorAll('.nav-item, .bottom-nav-item[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                if (!view) return;
                App.loadView(view);
                App.closeMobileMenu();
            });
        });

        // Controles de abertura e fechamento do menu no celular
        document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
            App.toggleMobileMenu();
        });

        document.getElementById('btn-close-sidebar')?.addEventListener('click', () => {
            App.closeMobileMenu();
        });

        document.getElementById('sidebar-backdrop')?.addEventListener('click', () => {
            App.closeMobileMenu();
        });

        document.getElementById('btn-bottom-menu')?.addEventListener('click', () => {
            App.toggleMobileMenu();
        });
    },

    loadView: async (viewName) => {
        // SaaS: Verificação de acesso Premium
        const proViews = ['conexoes', 'contas', 'cartoes', 'veiculo', 'investimentos', 'metas', 'relatorios'];
        if (proViews.includes(viewName)) {
            const isVipUser = Auth.user?.email?.toLowerCase().trim() === 'bismakgustavo3@gmail.com';
            const isAdmin = window.Views?.admin?.isAdmin === true;
            const isPro = window.Subscription?.isPro ? window.Subscription.isPro() : (window.Subscription?.current?.plans?.slug === 'pro');
            // Bloquear acesso se não for PRO, não for admin e não for VIP
            if (!isPro && !isAdmin && !isVipUser) {
                document.getElementById('premium-modal').style.display = 'flex';
                
                // Reverter a seleção visual para a aba atual
                document.querySelectorAll('.nav-item').forEach(b => {
                    b.classList.toggle('active', b.dataset.view === App.currentView);
                });
                document.querySelectorAll('.bottom-nav-item').forEach(b => {
                    b.classList.toggle('active', b.dataset.view === App.currentView);
                });
                
                return;
            }
        }

        App.currentView = viewName;
        const container = document.getElementById('view-container');
        const title     = document.getElementById('page-title');

        // Sincronizar classes ativas tanto no sidebar quanto no bottom nav
        document.querySelectorAll('.nav-item').forEach(b => {
            b.classList.toggle('active', b.dataset.view === viewName);
        });
        document.querySelectorAll('.bottom-nav-item').forEach(b => {
            b.classList.toggle('active', b.dataset.view === viewName);
        });

        // Atualiza título da página
        if (title) title.textContent = App.titulos[viewName] || viewName;
        App.closeMobileMenu();

        // Rola conteúdo para o topo
        if (container) container.scrollTop = 0;

        // Estado de carregamento — centralizado na tela
        container.innerHTML = `
            <div style="
                position: fixed;
                inset: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 999;
                pointer-events: none;
            ">
                <i class="ph ph-spinner ph-spin" style="font-size: 36px; color: var(--primary);"></i>
                <p style="margin-top: 14px; color: var(--text-muted); font-size: 14px; font-weight: 500;">Carregando dados</p>
            </div>`;

        // Chama a view se ela existir
        if (window.Views && window.Views[viewName]) {
            try {
                await window.Views[viewName].render(container);
                if (window.CustomSelect) {
                    window.CustomSelect.init();
                }
            } catch (err) {
                console.error('Erro ao renderizar view:', viewName, err);
                container.innerHTML = `
                    <div class="card">
                        <p class="text-danger">
                            <i class="ph ph-warning-circle"></i>
                            Erro ao carregar os dados: ${err.message}
                        </p>
                    </div>`;
                Toast.error('Erro ao carregar aba: ' + (err.message || viewName));
            }
        } else {
            container.innerHTML = `
                <div class="card" style="text-align:center; padding: 60px">
                    <i class="ph ph-hammer" style="font-size: 48px; color: var(--text-muted)"></i>
                    <h3 style="color: var(--text-muted); margin-top: 16px">Aba em desenvolvimento</h3>
                    <p class="text-muted">${viewName}</p>
                </div>`;
        }
    },

    isValuesMasked: () => {
        return localStorage.getItem('finapp_mask_values') === 'true';
    },

    toggleMaskValues: () => {
        const current = App.isValuesMasked();
        localStorage.setItem('finapp_mask_values', current ? 'false' : 'true');
        App.loadView(App.currentView);
    },

    formatCurrency: (value, allowMask = false) => {
        if (allowMask && App.isValuesMasked()) {
            return '••••••';
        }
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    },

    getCategoryIcon: (catName) => {
        const cat = (catName || '').toLowerCase().trim();
        if (cat.includes('aliment') || cat.includes('comida') || cat.includes('mercado') || cat.includes('restaurante') || cat.includes('lanche')) {
            return { icon: 'ph-fork-knife', bg: 'rgba(255, 159, 67, 0.15)', color: '#ff9f43' };
        }
        if (cat.includes('transp') || cat.includes('uber') || cat.includes('combust') || cat.includes('gasolina') || cat.includes('carro') || cat.includes('moto')) {
            return { icon: 'ph-car', bg: 'rgba(84, 160, 255, 0.15)', color: '#54a0ff' };
        }
        if (cat.includes('moradia') || cat.includes('aluguel') || cat.includes('casa') || cat.includes('luz') || cat.includes('agua') || cat.includes('água') || cat.includes('energia')) {
            return { icon: 'ph-house', bg: 'rgba(95, 39, 205, 0.15)', color: '#a29bfe' };
        }
        if (cat.includes('lazer') || cat.includes('viagem') || cat.includes('festa') || cat.includes('cinema') || cat.includes('passeio') || cat.includes('jogo')) {
            return { icon: 'ph-game-controller', bg: 'rgba(243, 104, 224, 0.15)', color: '#f368e0' };
        }
        if (cat.includes('saude') || cat.includes('saúde') || cat.includes('farm') || cat.includes('medic') || cat.includes('médic') || cat.includes('hospital')) {
            return { icon: 'ph-first-aid', bg: 'rgba(238, 82, 83, 0.15)', color: '#ee5253' };
        }
        if (cat.includes('salario') || cat.includes('salário') || cat.includes('renda') || cat.includes('receita') || cat.includes('pagamento')) {
            return { icon: 'ph-wallet', bg: 'rgba(42, 157, 143, 0.15)', color: '#2a9d8f' };
        }
        if (cat.includes('invest') || cat.includes('poupanca') || cat.includes('poupança') || cat.includes('aplicacao') || cat.includes('rendimento')) {
            return { icon: 'ph-trend-up', bg: 'rgba(10, 147, 150, 0.15)', color: '#0a9396' };
        }
        if (cat.includes('cartao') || cat.includes('cartão') || cat.includes('fatura') || cat.includes('credito') || cat.includes('crédito')) {
            return { icon: 'ph-credit-card', bg: 'rgba(245, 203, 92, 0.15)', color: '#f5cb5c' };
        }
        if (cat.includes('transferencia') || cat.includes('transferência') || cat.includes('ted') || cat.includes('doc')) {
            return { icon: 'ph-arrows-left-right', bg: 'rgba(10, 147, 150, 0.15)', color: '#0a9396' };
        }
        return { icon: 'ph-tag', bg: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' };
    },

    currentQuickAddType: 'despesa',

    setQuickAddType: (type) => {
        App.currentQuickAddType = type;
        const btnDesp = document.getElementById('btn-type-despesa');
        const btnRec = document.getElementById('btn-type-receita');
        const title = document.getElementById('quick-add-title');
        if (type === 'despesa') {
            btnDesp?.classList.add('active-despesa');
            btnRec?.classList.remove('active-receita');
            if (title) title.textContent = 'Nova Despesa';
        } else {
            btnRec?.classList.add('active-receita');
            btnDesp?.classList.remove('active-despesa');
            if (title) title.textContent = 'Nova Receita';
        }
    },

    openQuickAddModal: async (type = 'despesa') => {
        const modal = document.getElementById('modal-quick-add-mobile');
        if (!modal) return;

        App.setQuickAddType(type);

        // Preenche data com a data atual (YYYY-MM-DD)
        const dateInput = document.getElementById('quick-add-data');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // Limpa campos
        const valInput = document.getElementById('quick-add-valor');
        if (valInput) valInput.value = '';
        const descInput = document.getElementById('quick-add-desc');
        if (descInput) descInput.value = '';

        // Carrega categorias do Store
        const catSelect = document.getElementById('quick-add-cat');
        if (catSelect) {
            const cats = await Store.get(KEYS.CATEGORIAS) || [];
            const defaults = ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Salário', 'Investimentos', 'Outros'];
            const list = cats.length > 0 ? cats.map(c => c.nome) : defaults;
            catSelect.innerHTML = list.map(c => `<option value="${c}">${c}</option>`).join('');
        }

        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('is-open');
            valInput?.focus();
        }, 10);
    },

    closeQuickAddModal: () => {
        const modal = document.getElementById('modal-quick-add-mobile');
        if (!modal) return;
        modal.classList.remove('is-open');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 250);
    },

    handleQuickAddSubmit: async () => {
        const btn = document.getElementById('btn-quick-add-submit');
        const valor = parseFloat(document.getElementById('quick-add-valor').value);
        const desc = document.getElementById('quick-add-desc').value.trim();
        const cat = document.getElementById('quick-add-cat').value;
        const forma = document.getElementById('quick-add-forma').value;
        const data = document.getElementById('quick-add-data').value;
        const tipo = App.currentQuickAddType;

        if (!valor || valor <= 0) {
            Toast.warning('Informe um valor válido.');
            return;
        }
        if (!desc) {
            Toast.warning('Informe uma descrição.');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
        }

        try {
            const novo = {
                data: data || new Date().toISOString().split('T')[0],
                descricao: desc,
                categoria: cat,
                tipo: tipo,
                valor: valor,
                forma: forma
            };

            await Store.insert(KEYS.LANCAMENTOS, novo);
            Toast.success(tipo === 'receita' ? 'Receita cadastrada com sucesso!' : 'Despesa cadastrada com sucesso!');
            App.closeQuickAddModal();
            App.loadView(App.currentView);
        } catch (err) {
            console.error('Erro ao salvar lançamento:', err);
            Toast.error('Erro ao salvar: ' + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-check-bold"></i> Salvar Lançamento';
            }
        }
    },

    openTxDetailModal: async (txId) => {
        const modal = document.getElementById('modal-tx-detail-mobile');
        const body = document.getElementById('tx-detail-body');
        if (!modal || !body) return;

        const lancamentos = await Store.get(KEYS.LANCAMENTOS) || [];
        const tx = lancamentos.find(x => x.id == txId);
        if (!tx) {
            Toast.error('Lançamento não encontrado.');
            return;
        }

        const isRec = tx.tipo === 'receita';
        const isTransfer = tx.categoria === 'Transferência Interna';
        const color = isTransfer ? 'var(--primary)' : (isRec ? 'var(--success)' : 'var(--danger)');
        const sign = isTransfer ? '' : (isRec ? '+' : '-');
        const dtFormatted = tx.data ? new Date(tx.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        const catStyle = App.getCategoryIcon(tx.categoria);

        body.innerHTML = `
            <div class="tx-detail-hero">
                <div class="tx-detail-badge" style="background: ${catStyle.bg}; color: ${catStyle.color};">
                    <i class="ph ${catStyle.icon}"></i>
                </div>
                <h2 style="color: ${color}; font-size: 28px; margin: 10px 0 4px 0;">${sign} ${App.formatCurrency(tx.valor)}</h2>
                <span class="badge ${isRec ? 'badge-success' : 'badge-danger'}">${isRec ? 'Receita' : 'Despesa'}</span>
            </div>

            <div class="tx-detail-fields">
                <div class="tx-detail-row">
                    <span class="text-muted"><i class="ph ph-text-t"></i> Descrição</span>
                    <strong>${tx.descricao}</strong>
                </div>
                <div class="tx-detail-row">
                    <span class="text-muted"><i class="ph ph-tag"></i> Categoria</span>
                    <strong>${tx.categoria || 'Geral'}</strong>
                </div>
                <div class="tx-detail-row">
                    <span class="text-muted"><i class="ph ph-calendar"></i> Data</span>
                    <strong>${dtFormatted}</strong>
                </div>
                <div class="tx-detail-row">
                    <span class="text-muted"><i class="ph ph-credit-card"></i> Pagamento</span>
                    <strong>${tx.forma || 'Pix'}${tx.cartao_nome ? ` (${tx.cartao_nome})` : ''}</strong>
                </div>
                ${(tx.is_open_finance || tx.bank_transaction_id) ? `
                <div class="tx-detail-row">
                    <span class="text-muted"><i class="ph ph-bank"></i> Origem</span>
                    <span class="badge" style="background: rgba(10,147,150,0.15); color: var(--primary);">Open Finance</span>
                </div>
                ` : ''}
            </div>

            <div class="tx-detail-actions mt-4">
                <button type="button" class="btn btn-outline btn-block text-danger" onclick="App.deleteLancamento('${tx.id}')">
                    <i class="ph ph-trash"></i> Excluir Lançamento
                </button>
            </div>
        `;

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('is-open'), 10);
    },

    closeTxDetailModal: () => {
        const modal = document.getElementById('modal-tx-detail-mobile');
        if (!modal) return;
        modal.classList.remove('is-open');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 250);
    },

    deleteLancamento: async (id) => {
        if (!confirm('Deseja realmente excluir este lançamento?')) return;
        try {
            await Store.delete(KEYS.LANCAMENTOS, id);
            Toast.success('Lançamento excluído com sucesso.');
            App.closeTxDetailModal();
            App.loadView(App.currentView);
        } catch (err) {
            console.error('Erro ao deletar lançamento:', err);
            Toast.error('Erro ao excluir: ' + err.message);
        }
    },

    globalFilters: {
        mes: '',
        ano: '',
        busca: ''
    },

    getFilterHTML: () => {
        const anos = [2024, 2025, 2026, 2027, 2028];
        const meses = [
            {v: '01', l: 'Janeiro'}, {v: '02', l: 'Fevereiro'}, {v: '03', l: 'Março'},
            {v: '04', l: 'Abril'}, {v: '05', l: 'Maio'}, {v: '06', l: 'Junho'},
            {v: '07', l: 'Julho'}, {v: '08', l: 'Agosto'}, {v: '09', l: 'Setembro'},
            {v: '10', l: 'Outubro'}, {v: '11', l: 'Novembro'}, {v: '12', l: 'Dezembro'}
        ];
        
        return `
            <div class="card mb-4 filter-card">
                <div class="filter-grid">
                    <div class="form-group filter-item">
                        <label>Mês</label>
                        <select id="filter-mes" class="input-control">
                            <option value="">Todos os Meses</option>
                            ${meses.map(m => `<option value="${m.v}" ${App.globalFilters.mes === m.v ? 'selected' : ''}>${m.l}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group filter-item">
                        <label>Ano</label>
                        <select id="filter-ano" class="input-control">
                            <option value="">Todos os Anos</option>
                            ${anos.map(a => `<option value="${a}" ${App.globalFilters.ano == a ? 'selected' : ''}>${a}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group filter-item filter-search">
                        <label>Buscar</label>
                        <input type="text" id="filter-busca" class="input-control" placeholder="Palavra-chave..." value="${App.globalFilters.busca}">
                    </div>
                    <div class="form-group filter-actions">
                        <div class="filter-buttons-wrapper">
                            <button id="btn-apply-filter" class="btn btn-primary"><i class="ph ph-funnel"></i> Filtrar</button>
                            <button id="btn-clear-filter" class="btn btn-outline" title="Limpar Filtros"><i class="ph ph-eraser"></i> Limpar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    bindFilters: (callback) => {
        document.getElementById('btn-apply-filter')?.addEventListener('click', () => {
            App.globalFilters.mes = document.getElementById('filter-mes').value;
            App.globalFilters.ano = document.getElementById('filter-ano').value;
            App.globalFilters.busca = document.getElementById('filter-busca').value.toLowerCase().trim();
            callback();
        });
        
        document.getElementById('btn-clear-filter')?.addEventListener('click', () => {
            App.globalFilters.mes = '';
            App.globalFilters.ano = '';
            App.globalFilters.busca = '';
            document.getElementById('filter-mes').value = '';
            document.getElementById('filter-ano').value = '';
            document.getElementById('filter-busca').value = '';
            callback();
        });
    },
    
    applyFilters: (items, dateField = 'data', textFields = ['descricao', 'categoria']) => {
        return items.filter(item => {
            if (App.globalFilters.mes || App.globalFilters.ano) {
                const itemDate = item[dateField];
                if (!itemDate) return false;
                const [y, m, d] = itemDate.split('-');
                if (App.globalFilters.ano && y !== App.globalFilters.ano) return false;
                if (App.globalFilters.mes && m !== App.globalFilters.mes) return false;
            }
            
            if (App.globalFilters.busca) {
                const query = App.globalFilters.busca;
                const matchText = textFields.some(field => {
                    const val = item[field];
                    return val && String(val).toLowerCase().includes(query);
                });
                if (!matchText) return false;
            }
            
            return true;
        });
    }
};

// Namespace global das views
window.Views = {};

// Expõe App no objeto window para compatibilidade com outros scripts
window.App = App;
