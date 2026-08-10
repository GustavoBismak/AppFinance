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
        configuracoes: 'Configurações'
    },

    init: () => {
        App.bindNavigation();
        App.loadView(App.currentView);
    },

    bindNavigation: () => {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                App.loadView(view);
            });
        });
    },

    loadView: async (viewName) => {
        App.currentView = viewName;
        const container = document.getElementById('view-container');
        const title     = document.getElementById('page-title');

        // Atualiza título da página
        title.textContent = App.titulos[viewName] || viewName;

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
            <div class="card mb-4" style="padding: 16px 24px; background: rgba(10, 147, 150, 0.05); border-color: rgba(10, 147, 150, 0.2);">
                <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; align-items: end;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Mês</label>
                        <select id="filter-mes" class="input-control">
                            <option value="">Todos os Meses</option>
                            ${meses.map(m => `<option value="${m.v}" ${App.globalFilters.mes === m.v ? 'selected' : ''}>${m.l}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Ano</label>
                        <select id="filter-ano" class="input-control">
                            <option value="">Todos os Anos</option>
                            ${anos.map(a => `<option value="${a}" ${App.globalFilters.ano == a ? 'selected' : ''}>${a}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0; min-width: 200px;">
                        <label>Buscar</label>
                        <input type="text" id="filter-busca" class="input-control" placeholder="Palavra-chave..." value="${App.globalFilters.busca}">
                    </div>
                    <div class="form-group flex gap-2" style="margin-bottom: 0; flex-direction: row;">
                        <button id="btn-apply-filter" class="btn btn-primary" style="flex: 1;"><i class="ph ph-funnel"></i> Filtrar</button>
                        <button id="btn-clear-filter" class="btn btn-outline" style="background: transparent; border: 1px solid var(--border); color: var(--text-main); padding: 12px;"><i class="ph ph-eraser"></i></button>
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
