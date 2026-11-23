// ==========================================================================
// FinApp Theme Manager (Dark Mode Principal / Light Mode Opcional)
// ==========================================================================

const AppTheme = {
    STORAGE_KEY: 'finapp_theme',

    init: () => {
        // Dark Mode é o tema principal e padrão do FinApp
        const saved = localStorage.getItem(AppTheme.STORAGE_KEY) || 'dark';
        AppTheme.apply(saved);
    },

    apply: (theme) => {
        const isLight = theme === 'light';
        const icon = document.getElementById('theme-icon');
        const select = document.getElementById('select-tema-config');

        if (isLight) {
            document.documentElement.classList.add('light-mode');
            document.body.classList.add('light-mode');
            if (icon) {
                icon.className = 'ph ph-sun';
            }
            if (select) {
                select.value = 'light';
            }
        } else {
            document.documentElement.classList.remove('light-mode');
            document.body.classList.remove('light-mode');
            if (icon) {
                icon.className = 'ph ph-moon';
            }
            if (select) {
                select.value = 'dark';
            }
        }
        localStorage.setItem(AppTheme.STORAGE_KEY, theme);

        // Atualiza meta theme-color do navegador/PWA
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', isLight ? '#f0f2f5' : '#0f1115');
        }

        // Se estiver em view com gráficos (Dashboard ou Relatórios), re-renderiza para atualizar cores dos gráficos
        if (window.App && App.currentView && (App.currentView === 'dashboard' || App.currentView === 'relatorios')) {
            App.loadView(App.currentView);
        }
    },

    toggle: () => {
        const isCurrentlyLight = document.body.classList.contains('light-mode');
        const nextTheme = isCurrentlyLight ? 'dark' : 'light';
        AppTheme.apply(nextTheme);
        if (window.Toast) {
            Toast.info(nextTheme === 'light' ? 'Modo Claro ativado' : 'Modo Escuro (Padrão) ativado');
        }
    },

    current: () => {
        return document.body.classList.contains('light-mode') ? 'light' : 'dark';
    }
};

// Inicialização imediata
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', AppTheme.init);
} else {
    AppTheme.init();
}

window.AppTheme = AppTheme;
