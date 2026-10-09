// js/auth.js — carregado ÚLTIMO, após todos os outros scripts

window.Auth = {
    user: null,

    init: () => {
        Auth.bindEvents();
        Auth.checkSession();
        Auth.checkHashForReset();
    },

    bindEvents: () => {
        // UI Navigation
        document.getElementById('link-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.showForm('register');
        });
        document.getElementById('link-forgot')?.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.showForm('forgot');
        });
        document.getElementById('link-back-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.showForm('login');
        });
        document.getElementById('link-back-login-2')?.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.showForm('login');
        });

        // Form Submissions
        document.getElementById('login-form')?.addEventListener('submit', Auth.handleLogin);
        document.getElementById('register-form')?.addEventListener('submit', Auth.handleRegister);
        document.getElementById('forgot-form')?.addEventListener('submit', Auth.handleForgot);
        document.getElementById('reset-form')?.addEventListener('submit', Auth.handleReset);
    },

    showForm: (type) => {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('forgot-form').style.display = 'none';
        document.getElementById('reset-form').style.display = 'none';
        
        const subtitle = document.getElementById('login-subtitle');

        if (type === 'login') {
            document.getElementById('login-form').style.display = 'block';
            subtitle.textContent = 'Acesse seu império financeiro';
        } else if (type === 'register') {
            document.getElementById('register-form').style.display = 'block';
            subtitle.textContent = 'Crie sua conta no FinApp Premium';
        } else if (type === 'forgot') {
            document.getElementById('forgot-form').style.display = 'block';
            subtitle.textContent = 'Recuperar sua senha';
        } else if (type === 'reset') {
            document.getElementById('reset-form').style.display = 'block';
            subtitle.textContent = 'Defina sua nova senha';
        }
    },

    isValidEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    mostrarApp: async () => {
        // Esconde a tela de login imediatamente
        document.getElementById('login-screen').style.display = 'none';

        // Onboarding — envolvido em try/catch para não travar
        try {
            if (window.Onboarding) {
                const isShowingOnboarding = await Onboarding.check();
                if (isShowingOnboarding) return;
            }
        } catch (e) {
            console.warn('[Auth] Onboarding ignorado por erro:', e.message);
        }

        // Assinatura — envolvido em try/catch para não travar
        try {
            if (window.Subscription) {
                await Subscription.ensureFreePlan();
            }
        } catch (e) {
            console.warn('[Auth] Subscription ignorado por erro:', e.message);
        }

        // Exibe o app garantidamente
        document.getElementById('app-container').style.display = 'flex';

        // Verifica admin — envolvido em try/catch para não travar
        try {
            if (window.Views && window.Views.admin) {
                const isAdmin = await window.Views.admin.checkAdmin();
                if (isAdmin) {
                    const navAdmin = document.getElementById('nav-admin');
                    if (navAdmin) navAdmin.style.display = 'flex';
                }
            }
        } catch (e) {
            console.warn('[Auth] Admin check ignorado por erro:', e.message);
        }

        if (window.App && typeof window.App.init === 'function') {
            window.App.init();
        }
    },

    handleLogin: async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('btn-entrar');

        if (!Auth.isValidEmail(email)) {
            Toast.warning('Por favor, informe um e-mail válido.');
            return;
        }
        if (!password) {
            Toast.warning('Por favor, informe a senha.');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Entrando...';

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            Auth.user = data.user;
            Toast.success('Bem-vindo! Carregando seus dados...');
            setTimeout(Auth.mostrarApp, 800);
        } catch (error) {
            Toast.error('Erro ao entrar: ' + (error.message || 'Credenciais incorretas.'));
        } finally {
            btn.disabled = false;
            btn.textContent = 'Entrar';
        }
    },

    handleRegister: async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value.trim();
        const cpf = document.getElementById('register-cpf').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-password-confirm').value;
        const btn = document.getElementById('btn-create-account');

        if (!Auth.isValidEmail(email)) {
            Toast.warning('Por favor, informe um e-mail válido.');
            return;
        }
        if (!cpf || cpf.length < 11) {
            Toast.warning('Por favor, informe um CPF válido (11 números).');
            return;
        }
        if (password.length < 6) {
            Toast.warning('A senha precisa ter pelo menos 6 caracteres.');
            return;
        }
        if (password !== confirm) {
            Toast.warning('As senhas não coincidem.');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Criando conta...';

        try {
            const { data, error } = await supabaseClient.auth.signUp({ 
                email, 
                password,
                options: {
                    data: { cpfCnpj: cpf }
                }
            });
            if (error) throw error;
            Auth.user = data.user;

            if (data.user && !data.session) {
                Toast.info('Conta criada! Verifique seu e-mail para confirmar.');
                Auth.showForm('login');
            } else if (data.user) {
                Toast.success('Conta criada com sucesso! Entrando...');
                setTimeout(Auth.mostrarApp, 1200);
            }
        } catch (error) {
            Toast.error('Erro ao criar conta: ' + (error.message || 'Erro desconhecido.'));
        } finally {
            btn.disabled = false;
            btn.textContent = 'Criar Conta';
        }
    },

    handleForgot: async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value.trim();
        const btn = document.getElementById('btn-send-reset');

        if (!Auth.isValidEmail(email)) {
            Toast.warning('Por favor, informe um e-mail válido.');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';

        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname + '#reset'
            });
            if (error) throw error;
            Toast.success('Um link de recuperação foi enviado para seu e-mail.');
            Auth.showForm('login');
        } catch (error) {
            Toast.error('Erro ao solicitar recuperação: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Enviar Link';
        }
    },

    handleReset: async (e) => {
        e.preventDefault();
        const password = document.getElementById('reset-password').value;
        const confirm = document.getElementById('reset-password-confirm').value;
        const btn = document.getElementById('btn-update-password');

        if (password.length < 6) {
            Toast.warning('A nova senha precisa ter pelo menos 6 caracteres.');
            return;
        }
        if (password !== confirm) {
            Toast.warning('As senhas não coincidem.');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Atualizando...';

        try {
            const { error } = await supabaseClient.auth.updateUser({ password: password });
            if (error) throw error;
            Toast.success('Senha atualizada com sucesso! Você já pode entrar.');
            Auth.showForm('login');
            // Limpar o hash da URL
            history.replaceState(null, null, ' ');
        } catch (error) {
            Toast.error('Erro ao atualizar senha: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Atualizar Senha';
        }
    },

    checkHashForReset: () => {
        if (window.location.hash.includes('type=recovery') || window.location.hash.includes('#reset')) {
            Auth.showForm('reset');
        }
    },

    checkSession: async () => {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                Auth.user = session.user;
                Auth.mostrarApp();
            } else {
                supabaseClient.auth.onAuthStateChange((event, session) => {
                    if (event === 'PASSWORD_RECOVERY') {
                        Auth.showForm('reset');
                    } else if (event === 'SIGNED_IN' && session) {
                        Auth.user = session.user;
                        Auth.mostrarApp();
                    }
                });
            }
        } catch (e) {
            console.error('Erro ao verificar sessão:', e);
        }
    },

    confirmLogout: async () => {
        if (confirm('Tem certeza que deseja sair da conta?')) {
            try {
                await supabaseClient.auth.signOut();
                Auth.user = null;
                // Recarregar a página para limpar todo o estado em memória e voltar ao login
                window.location.reload();
            } catch (error) {
                Toast.error('Erro ao tentar sair: ' + error.message);
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', Auth.init);
