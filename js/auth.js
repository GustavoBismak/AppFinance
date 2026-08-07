// js/auth.js — carregado ÚLTIMO, após todos os outros scripts
document.addEventListener('DOMContentLoaded', () => {
    const loginScreen   = document.getElementById('login-screen');
    const appContainer  = document.getElementById('app-container');
    const loginForm     = document.getElementById('login-form');
    const emailInput    = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const btnEntrar     = document.getElementById('btn-entrar');
    const btnRegistrar  = document.getElementById('btn-registrar');

    function mostrarApp() {
        loginScreen.style.display = 'none';
        appContainer.style.display = 'flex';
        App.init();
    }

    // ── LOGIN ────────────────────────────────────────────────
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            Toast.warning('Preencha o e-mail e a senha.');
            return;
        }

        btnEntrar.disabled    = true;
        btnEntrar.textContent = 'Entrando...';

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            Auth.user = data.user;
            Toast.success('Bem-vindo! Carregando seus dados...');
            setTimeout(mostrarApp, 800);
        } catch (error) {
            Toast.error('Erro ao entrar: ' + (error.message || 'Credenciais incorretas.'));
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
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
            Auth.user = data.user;

            if (data.user && !data.session) {
                Toast.info('Conta criada! Verifique seu e-mail para confirmar antes de entrar.');
            } else if (data.user) {
                Toast.success('Conta criada com sucesso! Entrando...');
                setTimeout(mostrarApp, 1200);
            }
        } catch (error) {
            Toast.error('Erro ao criar conta: ' + (error.message || 'Erro desconhecido.'));
        } finally {
            btnRegistrar.disabled    = false;
            btnRegistrar.textContent = 'Criar Conta';
        }
    });

    // ── RESTAURAR SESSÃO EXISTENTE ────────────────────────────
    (async () => {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                Auth.user = session.user;
                mostrarApp();
            }
        } catch (e) {
            console.error('Erro ao verificar sessão:', e);
        }
    })();
});
