const App = {
    currentView: 'dashboard',
    
    init: () => {
        App.bindNavigation();
        App.loadView(App.currentView);
    },
    
    bindNavigation: () => {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                
                // Update active state
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Load view
                App.loadView(view);
            });
        });
    },
    
    loadView: async (viewName) => {
        App.currentView = viewName;
        const container = document.getElementById('view-container');
        const title = document.getElementById('page-title');
        
        // Update Title (capitalize first letter)
        title.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
        
        // Loading state
        container.innerHTML = '<div class="text-center text-muted" style="padding: 40px"><i class="ph ph-spinner ph-spin" style="font-size: 32px"></i><p style="margin-top: 16px">Carregando dados da nuvem...</p></div>';
        
        // Call the view renderer if it exists
        if (window.Views && window.Views[viewName]) {
            try {
                await window.Views[viewName].render(container);
            } catch (err) {
                console.error(err);
                container.innerHTML = '<div class="card text-danger">Erro ao carregar dados.</div>';
            }
        } else {
            container.innerHTML = `
                <div class="card">
                    <h2 style="color: var(--text-muted)">Aba em desenvolvimento: ${viewName}</h2>
                </div>
            `;
        }
    },
    
    formatCurrency: (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
};

// Global namespace for views
window.Views = {};

// Start App will now be triggered by auth.js
