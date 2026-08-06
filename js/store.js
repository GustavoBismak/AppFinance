const KEYS = {
    LANCAMENTOS: 'lancamentos',
    CONTAS: 'contas',
    CARTOES: 'cartoes',
    VEICULO: 'veiculo',
    INVESTIMENTOS: 'investimentos',
    METAS: 'metas'
};

const Store = {
    get: async (table) => {
        if(!Auth.user) return [];
        const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
        if(error) {
            console.error(`Erro ao buscar ${table}:`, error);
            return [];
        }
        return data;
    },
    
    insert: async (table, payload) => {
        if(!Auth.user) return null;
        payload.user_id = Auth.user.id;
        
        // Remove 'id' se existir para deixar o Postgres gerar
        if(payload.id) delete payload.id;
        
        const { data, error } = await supabase.from(table).insert(payload).select().single();
        if(error) {
            console.error(`Erro ao inserir em ${table}:`, error);
            return null;
        }
        return data;
    },
    
    update: async (table, id, payload) => {
        if(!Auth.user) return false;
        
        // Remove campos que não devem ser atualizados
        if(payload.id) delete payload.id;
        if(payload.user_id) delete payload.user_id;
        if(payload.created_at) delete payload.created_at;

        const { error } = await supabase.from(table).update(payload).eq('id', id).eq('user_id', Auth.user.id);
        if(error) {
            console.error(`Erro ao atualizar em ${table}:`, error);
            return false;
        }
        return true;
    },
    
    delete: async (table, id) => {
        if(!Auth.user) return false;
        const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', Auth.user.id);
        if(error) {
            console.error(`Erro ao apagar de ${table}:`, error);
            return false;
        }
        return true;
    },
    
    init: () => {
        // Init was used for mock data in LocalStorage.
        // We no longer inject mock data into Supabase automatically to avoid duplicates.
    }
};

Store.init();
