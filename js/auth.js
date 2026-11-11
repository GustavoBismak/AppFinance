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
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) loginScreen.style.display = 'none';

        // Onboarding — envolvido em try/catch para não travar
        try {
            if (window.Onboarding) {
                const isShowingOnboarding = await Onboarding.check();
                if (isShowingOnboarding) {
                    if (window.AppSplash) AppSplash.hideImmediate();
                    return;
                }
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
        const appContainer = document.getElementById('app-container');
        if (appContainer) appContainer.style.display = 'flex';

        // Atualiza avatar do header com a inicial do e-mail do usuário logado
        try {
            const user = Auth.user;
            if (user) {
                const avatarEl = document.getElementById('header-avatar');
                if (avatarEl) {
                    const name = user.user_metadata?.full_name || user.email || 'U';
                    avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.charAt(0).toUpperCase())}&background=0a9396&color=fff&size=64`;
                }
            }
        } catch (e) {
            console.warn('[Auth] Avatar update ignorado:', e.message);
        }

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

        try {
            if (window.App && typeof window.App.init === 'function') {
                await window.App.init();
            }
        } catch (appErr) {
            console.error('[Auth] Erro ao inicializar App:', appErr);
        } finally {
            // Garante que o splash NUNCA fique travado, mesmo se App.init der erro
            if (window.AppSplash) {
                AppSplash.hide();
            }
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
            localStorage.setItem('finapp_has_session', 'true');
            if (window.AppSplash) {
                AppSplash.show('Bem-vindo! Acessando seu cofre financeiro...');
            } else {
                Toast.success('Bem-vindo! Carregando seus dados...');
            }
            setTimeout(Auth.mostrarApp, 400);
        } catch (error) {
            let msg = error.message;
            if (msg.includes('Invalid login credentials')) msg = 'E-mail ou senha incorretos.';
            if (msg.includes('Email not confirmed')) msg = 'Por favor, confirme seu e-mail antes de entrar.';
            Toast.error('Erro ao entrar: ' + msg);
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
                localStorage.setItem('finapp_has_session', 'true');
                if (window.AppSplash) {
                    AppSplash.show('Conta criada! Preparando seu império financeiro...');
                } else {
                    Toast.success('Conta criada com sucesso! Entrando...');
                }
                setTimeout(Auth.mostrarApp, 500);
            }
        } catch (error) {
            let msg = error.message;
            if (msg.includes('User already registered')) msg = 'Este e-mail já está cadastrado.';
            if (msg.includes('Password should be')) msg = 'A senha informada é muito fraca.';
            Toast.error('Erro ao criar conta: ' + msg);
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
                redirectTo: window.location.origin + window.location.pathname + '?reset=true'
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
        if (window.location.hash.includes('type=recovery') || window.location.search.includes('reset=true')) {
            Auth.showForm('reset');
        }
    },

    checkSession: async () => {
        try {
            const hasSavedSession = localStorage.getItem('finapp_has_session') === 'true' || 
                                    Object.keys(localStorage).some(k => k.includes('auth-token'));
            if (hasSavedSession && window.AppSplash) {
                AppSplash.show('Acessando seu cofre financeiro...');
            }

            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                Auth.user = session.user;
                localStorage.setItem('finapp_has_session', 'true');
                if (window.AppSplash) {
                    AppSplash.setProgress(55);
                }
                await Auth.mostrarApp();
            } else {
                localStorage.removeItem('finapp_has_session');
                if (window.AppSplash) {
                    AppSplash.hideImmediate();
                }
                const loginScreen = document.getElementById('login-screen');
                if (loginScreen) loginScreen.style.display = 'flex';

                supabaseClient.auth.onAuthStateChange(async (event, session) => {
                    if (event === 'PASSWORD_RECOVERY') {
                        Auth.showForm('reset');
                    } else if (event === 'SIGNED_IN' && session) {
                        Auth.user = session.user;
                        localStorage.setItem('finapp_has_session', 'true');
                        if (window.AppSplash) {
                            AppSplash.show('Sessão restaurada! Abrindo cofre...');
                        }
                        await Auth.mostrarApp();
                    }
                });
            }
        } catch (e) {
            console.error('Erro ao verificar sessão:', e);
            localStorage.removeItem('finapp_has_session');
            if (window.AppSplash) AppSplash.hideImmediate();
            const loginScreen = document.getElementById('login-screen');
            if (loginScreen) loginScreen.style.display = 'flex';
        }
    },

    confirmLogout: async () => {
        if (confirm('Tem certeza que deseja sair da conta?')) {
            try {
                localStorage.removeItem('finapp_has_session');
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
