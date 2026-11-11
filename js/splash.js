// js/splash.js — Animação de Entrada e Carregamento Financeiro do FinApp
window.AppSplash = {
    startTime: 0,
    minDisplayMs: 1400,
    timer: null,
    statusPhrases: [
        'Acessando seu cofre financeiro...',
        'Sincronizando suas contas e saldos...',
        'Carregando inteligência financeira...',
        'Cofre liberado! Bem-vindo.'
    ],

    // Exibe o splash com animação financeira de dinheiro
    show: (customText = null) => {
        const splash = document.getElementById('app-splash-loader');
        if (!splash) return;

        AppSplash.startTime = Date.now();
        splash.style.display = 'flex';
        splash.style.opacity = '1';
        splash.style.transform = 'scale(1)';
        splash.classList.remove('splash-fade-out');

        const statusEl = document.getElementById('splash-status-text');
        if (statusEl) {
            statusEl.textContent = customText || AppSplash.statusPhrases[0];
            statusEl.style.color = 'var(--text-main)';
        }

        const bar = document.getElementById('splash-progress-bar');
        if (bar) {
            bar.style.width = '20%';
            setTimeout(() => { if (bar) bar.style.width = '60%'; }, 250);
            setTimeout(() => { if (bar) bar.style.width = '85%'; }, 650);
        }

        // Rotação suave de frases se a conexão demorar
        let idx = 0;
        clearInterval(AppSplash.timer);
        AppSplash.timer = setInterval(() => {
            idx = (idx + 1) % (AppSplash.statusPhrases.length - 1);
            if (statusEl && !splash.classList.contains('splash-fade-out')) {
                statusEl.style.opacity = '0.3';
                setTimeout(() => {
                    statusEl.textContent = AppSplash.statusPhrases[idx];
                    statusEl.style.opacity = '1';
                }, 180);
            }
        }, 1100);
    },

    // Define o texto da mensagem
    setText: (text) => {
        const statusEl = document.getElementById('splash-status-text');
        if (statusEl) statusEl.textContent = text;
    },

    // Define o progresso de 0 a 100
    setProgress: (percent) => {
        const bar = document.getElementById('splash-progress-bar');
        if (bar) bar.style.width = Math.min(100, Math.max(0, percent)) + '%';
    },

    // Esconde suavemente com fade-out após garantir o tempo mínimo de visualização
    hide: (onHidden = null) => {
        clearInterval(AppSplash.timer);
        const splash = document.getElementById('app-splash-loader');
        if (!splash) {
            if (onHidden) onHidden();
            return;
        }

        const elapsed = Date.now() - (AppSplash.startTime || 0);
        const remaining = Math.max(0, AppSplash.minDisplayMs - elapsed);

        setTimeout(() => {
            const bar = document.getElementById('splash-progress-bar');
            if (bar) bar.style.width = '100%';

            const statusEl = document.getElementById('splash-status-text');
            if (statusEl) {
                statusEl.textContent = 'Cofre liberado! Bem-vindo.';
                statusEl.style.color = '#2a9d8f';
            }

            // Pausa de 260ms no 100% para o usuário ver a barra completar
            setTimeout(() => {
                splash.classList.add('splash-fade-out');
                setTimeout(() => {
                    splash.style.display = 'none';
                    splash.classList.remove('splash-fade-out');
                    document.documentElement.classList.remove('has-active-session');
                    if (onHidden) onHidden();
                }, 460);
            }, 260);
        }, remaining);
    },

    // Esconde imediatamente (caso usuário não esteja logado)
    hideImmediate: () => {
        clearInterval(AppSplash.timer);
        const splash = document.getElementById('app-splash-loader');
        if (splash) {
            splash.style.display = 'none';
            splash.classList.remove('splash-fade-out');
            document.documentElement.classList.remove('has-active-session');
        }
    }
};

