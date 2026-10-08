// js/onboarding.js
window.Onboarding = {
    data: {
        objective: '',
        income: 0,
        source: ''
    },

    check: async () => {
        const user = Auth.user;
        if (!user) return false;

        // Se já completou, segue pro app
        if (user.user_metadata?.onboarding_completed) {
            return false; 
        }

        // Regra de compatibilidade: se a conta foi criada há mais de 1 hora, assume que é usuário antigo e ignora o onboarding
        const createdDate = new Date(user.created_at);
        const now = new Date();
        const diffHours = (now - createdDate) / (1000 * 60 * 60);

        if (diffHours > 1) {
            // Marca silenciosamente para não avaliar de novo no futuro
            try {
                await supabaseClient.auth.updateUser({
                    data: { onboarding_completed: true }
                });
            } catch (e) {}
            return false;
        }

        // Exibir onboarding
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('onboarding-screen').style.display = 'flex';
        Onboarding.next(1);
        return true;
    },

    next: (step) => {
        for(let i=1; i<=5; i++) {
            const el = document.getElementById(`onboarding-step-${i}`);
            if (el) el.style.display = 'none';
        }
        document.getElementById(`onboarding-step-${step}`).style.display = 'block';
    },

    selectObjective: (btn, value) => {
        document.querySelectorAll('.onboarding-option').forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-outline');
        });
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary');
        
        Onboarding.data.objective = value;
        document.getElementById('btn-onb-2').disabled = false;
    },

    selectSource: (btn, value) => {
        document.querySelectorAll('.onboarding-option-source').forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-outline');
        });
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary');
        
        Onboarding.data.source = value;
        document.getElementById('btn-onb-4').disabled = false;
    },

    finish: async () => {
        const btn = document.getElementById('btn-onb-finish');
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
        
        Onboarding.data.income = document.getElementById('onboarding-income').value || 0;

        try {
            const { data, error } = await supabaseClient.auth.updateUser({
                data: {
                    onboarding_completed: true,
                    onboarding_data: Onboarding.data
                }
            });
            if (error) throw error;
            
            // Atualiza usuário logado e exibe o app
            Auth.user = data.user;
            document.getElementById('onboarding-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            Toast.success('Configuração concluída!');
            if (window.App) window.App.init();
        } catch (error) {
            Toast.error('Erro ao salvar: ' + error.message);
            btn.disabled = false;
            btn.textContent = 'Ir para meu Dashboard';
        }
    }
};
