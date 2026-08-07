// js/supabase.js
const SUPABASE_URL = 'https://jczdpsztfktxxjzvtdvg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjemRwc3p0Zmt0eHhqenZ0ZHZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDM4MjUsImV4cCI6MjEwMTYxOTgyNX0.B_uMA3riDBdKtsj6bzdJomyGWED2yF4tQoSIQb2mIcM';

// O CDN do Supabase v2 expõe o cliente via window.supabase.createClient
// Tentamos as duas formas para compatibilidade
let supabase;
try {
    if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else if (window.supabaseJs && window.supabaseJs.createClient) {
        supabase = window.supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error('Supabase CDN não carregou corretamente.');
    }
} catch(e) {
    console.error('Erro ao inicializar Supabase:', e);
}

// Sistema de Notificações (Toast)
const Toast = {
    show: (msg, type = 'info') => {
        // Remove toast anterior se existir
        const old = document.getElementById('app-toast');
        if (old) old.remove();

        const colors = {
            success: '#2a9d8f',
            error: '#e63946',
            info: '#0a9396',
            warning: '#e9c46a'
        };
        const icons = {
            success: 'ph-check-circle',
            error: 'ph-x-circle',
            info: 'ph-info',
            warning: 'ph-warning'
        };

        const toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.innerHTML = `<i class="ph-fill ${icons[type]}" style="font-size: 20px; flex-shrink: 0;"></i> ${msg}`;
        toast.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 99999;
            background: ${colors[type]};
            color: white;
            padding: 14px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            max-width: 380px;
            animation: slideInRight 0.3s ease;
        `;

        // Injetar keyframes se ainda não existirem
        if (!document.getElementById('toast-style')) {
            const style = document.createElement('style');
            style.id = 'toast-style';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(120%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0);    opacity: 1; }
                    to   { transform: translateX(120%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        // Auto-remove após 4 segundos
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    success: (msg) => Toast.show(msg, 'success'),
    error:   (msg) => Toast.show(msg, 'error'),
    info:    (msg) => Toast.show(msg, 'info'),
    warning: (msg) => Toast.show(msg, 'warning'),
};

// Objeto global de Auth
const Auth = {
    user: null,

    checkSession: async () => {
        if (!supabase) return null;
        const { data: { session } } = await supabase.auth.getSession();
        Auth.user = session?.user || null;
        return Auth.user;
    },

    login: async (email, password) => {
        if (!supabase) throw new Error('Banco de dados não está conectado.');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        Auth.user = data.user;
        return data;
    },

    register: async (email, password) => {
        if (!supabase) throw new Error('Banco de dados não está conectado.');
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Auth.user = data.user;
        return data;
    },

    logout: async () => {
        if (supabase) await supabase.auth.signOut();
        Auth.user = null;
        window.location.reload();
    }
};
