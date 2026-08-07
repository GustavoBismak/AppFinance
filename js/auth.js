document.addEventListener('DOMContentLoaded', async () => {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const btnEntrar = document.getElementById('btn-entrar');
    const btnRegistrar = document.getElementById('btn-registrar');
    const errorMsg = document.getElementById('login-error');

    // Show error helper
    const showError = (msg) => {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
        setTimeout(() => errorMsg.style.display = 'none', 5000);
    };

    // Check if user is already logged in
    // Note: Since Supabase CDN doesn't block, we need to wait for it.
    // If keys are not set, we will bypass login for demo purposes.
    if(SUPABASE_URL.includes('COLE_AQUI')) {
        loginScreen.style.display = 'none';
        appContainer.style.display = 'flex';
        console.warn('Rodando em modo local (LocalStorage). Configuração do Supabase não encontrada.');
        return;
    }

    try {
        const user = await Auth.checkSession();
        if (user) {
            loginScreen.style.display = 'none';
            appContainer.style.display = 'flex';
            App.init(); // Start the app
        }
    } catch (e) {
        console.error('Erro na sessão', e);
    }

    // Login Event
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        
        btnEntrar.disabled = true;
        btnEntrar.textContent = 'Carregando...';
        
        try {
            await Auth.login(email, password);
            loginScreen.style.display = 'none';
            appContainer.style.display = 'flex';
            App.init();
        } catch (error) {
            console.error('Login error:', error);
            showError('Erro ao entrar: ' + (error.message || 'Credenciais incorretas.'));
        } finally {
            btnEntrar.disabled = false;
            btnEntrar.textContent = 'Entrar';
        }
    });

    // Register Event
    btnRegistrar.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        
        if(!email || !password) {
            showError('Preencha e-mail e senha para criar conta.');
            return;
        }
        
        if(password.length < 6) {
            showError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        
        btnRegistrar.disabled = true;
        btnRegistrar.textContent = 'Aguarde...';
        
        try {
            const result = await Auth.register(email, password);
            // Supabase returns a user but no session if email confirmation is required
            if (result && result.user && !result.session) {
                alert('Conta criada! Mas é necessário confirmar o e-mail. Verifique sua caixa de entrada.');
            } else {
                alert('Conta criada com sucesso! Você já pode entrar.');
            }
        } catch (error) {
            console.error('Register error:', error);
            showError('Erro ao criar conta: ' + error.message);
        } finally {
            btnRegistrar.disabled = false;
            btnRegistrar.textContent = 'Criar Conta';
        }
    });
});
