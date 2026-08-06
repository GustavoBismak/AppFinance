// LocalStorage keys
const KEYS = {
    LANCAMENTOS: 'fin_lancamentos',
    CONTAS: 'fin_contas',
    CARTOES: 'fin_cartoes',
    VEICULO: 'fin_veiculo',
    INVESTIMENTOS: 'fin_investimentos',
    METAS: 'fin_metas'
};

const Store = {
    get: (key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },
    set: (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    },
    init: () => {
        // Initialize mock data if empty
        if (!Store.get(KEYS.LANCAMENTOS)) {
            Store.set(KEYS.LANCAMENTOS, [
                { id: 1, data: '2026-08-01', descricao: 'Salário', categoria: 'Renda', tipo: 'receita', valor: 8500, forma: 'Pix' },
                { id: 2, data: '2026-08-03', descricao: 'Mercado', categoria: 'Alimentação', tipo: 'despesa', valor: 650.50, forma: 'Cartão de Crédito' },
                { id: 3, data: '2026-08-05', descricao: 'Energia', categoria: 'Moradia', tipo: 'despesa', valor: 120.00, forma: 'Pix' }
            ]);
        }
        
        if (!Store.get(KEYS.CONTAS)) {
            Store.set(KEYS.CONTAS, [
                { id: 1, nome: 'Aluguel', valor: 2500, vencimento: '2026-08-10', pago: false, dataPagamento: '', obs: 'Direto com proprietário' },
                { id: 2, nome: 'Internet', valor: 110, vencimento: '2026-08-05', pago: true, dataPagamento: '2026-08-05', obs: 'Fibra' },
                { id: 3, nome: 'Condomínio', valor: 450, vencimento: '2026-08-01', pago: false, dataPagamento: '', obs: 'Atrasado' }
            ]);
        }
        
        if (!Store.get(KEYS.CARTOES)) {
            Store.set(KEYS.CARTOES, [
                { id: 1, nome: 'Nubank', limite: 10000, utilizado: 2450 },
                { id: 2, nome: 'Banco Inter', limite: 5000, utilizado: 500 },
                { id: 3, nome: 'XP Investimentos', limite: 15000, utilizado: 0 }
            ]);
        }
    }
};

// Initialize store on load
Store.init();
