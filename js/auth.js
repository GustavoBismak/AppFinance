// js/auth.js
(async () => {
    const loginScreen   = document.getElementById('login-screen');
    const appContainer  = document.getElementById('app-container');
    const loginForm     = document.getElementById('login-form');
    const emailInput    = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const btnEntrar     = document.getElementById('btn-entrar');
    const btnRegistrar  = document.getElementById('btn-registrar');

    // Verifica se o Supabase foi inicializado
    if (!supabase) {
        alert('CRÍTICO: O Supabase não carregou. Verifique sua conexão.');
        Toast.error('Falha ao conectar ao banco de dados. Verifique as chaves do Supabase.');
        return;
    }

    // ── LOGIN ────────────────────────────────────────────────
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = emailInput.value.trim();
        const password = passwordInput.value;

        btnEntrar.disabled    = true;
        btnEntrar.textContent = 'Entrando...';

        try {
            await Auth.login(email, password);
            Toast.success('Bem-vindo de volta! Carregando seus dados...');

            setTimeout(() => {
                loginScreen.style.display = 'none';
                appContainer.style.display = 'flex';
                if(window.App) App.init();
            }, 800);
        } catch (error) {
            console.error('Login error:', error);
            const msg = error.message || 'Credenciais incorretas.';
            Toast.error('Erro ao entrar: ' + msg);
        } finally {
            btnEntrar.disabled    = false;
            btnEntrar.textContent = 'Entrar';
        }
    });

    // ── CADASTRO ─────────────────────────────────────────────
    btnRegistrar.addEventListener('click', async () => {
        const email    = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            Toast.warning('Preencha o e-mail e a senha antes de criar conta.');
            return;
        }
        if (password.length < 6) {
            Toast.warning('A senha precisa ter pelo menos 6 caracteres.');
            return;
        }

        btnRegistrar.disabled    = true;
        btnRegistrar.textContent = 'Criando conta...';

        try {
            const result = await Auth.register(email, password);

            // Supabase retorna user sem session quando confirmação de e-mail está ativa
            if (result && result.user && !result.session) {
                Toast.info('Conta criada! Confirme o e-mail antes de entrar. Verifique sua caixa de entrada.');
            } else if (result && result.user) {
                Toast.success('Conta criada com sucesso! Entrando...');
                setTimeout(() => {
                    loginScreen.style.display = 'none';
                    appContainer.style.display = 'flex';
                    if(window.App) App.init();
                }, 1200);
            }
        } catch (error) {
            console.error('Register error:', error);
            const msg = error.message || 'Erro desconhecido.';
            Toast.error('Erro ao criar conta: ' + msg);
        } finally {
            btnRegistrar.disabled    = false;
            btnRegistrar.textContent = 'Criar Conta';
        }
    });

    // Tenta restaurar sessão existente
    try {
        const user = await Auth.checkSession();
        if (user) {
            loginScreen.style.display = 'none';
            appContainer.style.display = 'flex';
            
            // App.init pode não estar carregado ainda se o checkSession resolver muito rápido (improvável, mas seguro checar)
            if(window.App) {
                App.init();
            } else {
                setTimeout(() => window.App && App.init(), 100);
            }
            return;
        }
    } catch (e) {
        console.error('Erro na sessão:', e);
    }
})();
