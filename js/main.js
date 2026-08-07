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
    }
};

// Namespace global das views — deve estar aqui ANTES de carregar as views
window.Views = {};
