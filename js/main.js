const App = {
    currentView: 'dashboard',

    titulos: {
        dashboard: 'Dashboard',
        lancamentos: 'Lançamentos',
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

    init: () => {
        App.bindNavigation();
        App.loadView(App.currentView);
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
        const proViews = ['contas', 'cartoes', 'veiculo', 'investimentos', 'metas', 'relatorios'];
        if (proViews.includes(viewName)) {
            const planSlug = window.Subscription?.current?.plans?.slug;
            const isAdmin = window.Views?.admin?.isAdmin === true;
            // Bloquear acesso se não for PRO e não for admin
            if (planSlug !== 'pro' && !isAdmin) {
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

        // Estado de carregamento
        container.innerHTML = `
            <div class="text-center text-muted" style="padding: 60px">
                <i class="ph ph-spinner ph-spin" style="font-size: 40px"></i>
                <p style="margin-top: 16px">Carregando dados da nuvem...</p>
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

    formatCurrency: (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
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
