// js/supabase.js
// Aqui você deve colocar a URL e a KEY do seu projeto Supabase
const SUPABASE_URL = 'COLE_AQUI_SUA_URL_DO_SUPABASE';
const SUPABASE_ANON_KEY = 'COLE_AQUI_SUA_ANON_KEY_DO_SUPABASE';

// Inicializar cliente do Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Objeto global de Auth
const Auth = {
    user: null,
    
    checkSession: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        Auth.user = session?.user || null;
        return Auth.user;
    },
    
    login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        Auth.user = data.user;
        return data;
    },
    
    register: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Auth.user = data.user;
        return data;
    },
    
    logout: async () => {
        await supabase.auth.signOut();
        Auth.user = null;
        window.location.reload();
    }
};
