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
    
    loadView: (viewName) => {
        App.currentView = viewName;
        const container = document.getElementById('view-container');
        const title = document.getElementById('page-title');
        
        // Update Title (capitalize first letter)
        title.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
        
        // Clear container
        container.innerHTML = '';
        
        // Call the view renderer if it exists
        if (window.Views && window.Views[viewName]) {
            window.Views[viewName].render(container);
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
