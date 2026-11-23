// Test Suite para o FinApp Intelligence Expert
const fs = require('fs');
const vm = require('vm');

// Mock browser environment
const mockWindow = {
    Auth: {
        user: { id: 'test-user-123', email: 'test@finapp.com', user_metadata: { nome: 'Gustavo' } }
    },
    Store: {
        get: async (table) => {
            if (table === 'lancamentos') return mockWindow.Store.lancamentos;
            if (table === 'contas') return mockWindow.Store.contas;
            if (table === 'bank_accounts') return mockWindow.Store.bankAccounts;
            if (table === 'bank_connections') return [];
            if (table === 'metas') return mockWindow.Store.metas;
            if (table === 'investimentos') return mockWindow.Store.investimentos;
            if (table === 'cartoes') return mockWindow.Store.cartoes;
            if (table === 'categorias') return mockWindow.Store.categorias;
            return [];
        },
        lancamentos: [
            { id: '1', user_id: 'test-user-123', tipo: 'receita', valor: 8500, categoria: 'Salário', data: '2026-11-05', forma: 'Pix' },
            { id: '2', user_id: 'test-user-123', tipo: 'despesa', valor: 2100, categoria: 'Alimentação', data: '2026-11-08', forma: 'Cartão de Débito' },
            { id: '3', user_id: 'test-user-123', tipo: 'despesa', valor: 1400, categoria: 'Alimentação', data: '2026-10-15', forma: 'Pix' },
            { id: '4', user_id: 'test-user-123', tipo: 'despesa', valor: 950, categoria: 'Transporte', data: '2026-11-10', forma: 'Pix' },
            { id: '5', user_id: 'test-user-123', tipo: 'despesa', valor: 800, categoria: 'Transporte', data: '2026-10-12', forma: 'Pix' },
            { id: '6', user_id: 'test-user-123', tipo: 'despesa', valor: 500, categoria: 'Lazer', data: '2026-11-18', forma: 'Pix' },
            { id: '7', user_id: 'test-user-123', tipo: 'despesa', valor: 300, categoria: 'Transferência Interna', data: '2026-11-02', forma: 'Pix' }
        ],
        contas: [
            { id: 'c1', user_id: 'test-user-123', nome: 'Aluguel', valor: 1500, vencimento: '2026-11-28', pago: false },
            { id: 'c2', user_id: 'test-user-123', nome: 'Internet Fibra', valor: 150, vencimento: '2026-11-25', pago: false },
            { id: 'c3', user_id: 'test-user-123', nome: 'Energia Elétrica', valor: 280, vencimento: '2026-11-10', pago: true }
        ],
        bankAccounts: [
            { id: 'b1', user_id: 'test-user-123', name: 'Nubank', balance: 1500, available_balance: 1500, type: 'CHECKING', status: 'ACTIVE' },
            { id: 'b2', user_id: 'test-user-123', name: 'Banco do Brasil', balance: 648.15, available_balance: 648.15, type: 'CHECKING', status: 'ACTIVE' }
        ],
        metas: [
            { id: 'm1', user_id: 'test-user-123', nome: 'Reserva de Emergência', valor_alvo: 10000, valor_atual: 4500, prazo: '2027-06-30' }
        ],
        investimentos: [
            { id: 'i1', user_id: 'test-user-123', nome: 'Tesouro Selic', valor_investido: 2000, valor_atual: 2150 }
        ],
        cartoes: [],
        categorias: ['Salário', 'Alimentação', 'Transporte', 'Lazer', 'Moradia', 'Saúde', 'Outros']
    },
    App: {
        formatCurrency: (val) => `R$ ${Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        loadView: () => {}
    }
};

mockWindow.window = mockWindow;
mockWindow.Auth = mockWindow.Auth;
mockWindow.Store = mockWindow.Store;
mockWindow.App = mockWindow.App;

// Read intelligence-engine code
const code = fs.readFileSync('js/intelligence-engine.js', 'utf8');
const context = vm.createContext(mockWindow);
vm.runInContext(code, context);

const FinAppIntelligence = context.FinAppIntelligence;

async function runTests() {
    let passed = 0;
    let failed = 0;

    function assert(cond, name, details = '') {
        if (cond) {
            console.log(`✅ PASS: ${name}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${name} -> ${details}`);
            failed++;
        }
    }

    console.log('--- TEST 1: Intent Detection & Normalization ---');
    const t1 = FinAppIntelligence.intentDetector.detect('Quanto ainda posso gastar este mês?');
    assert(t1 === 'SALDO_DISPONIVEL', 'Detecta SALDO_DISPONIVEL', `Recebido: ${t1}`);

    const t2 = FinAppIntelligence.intentDetector.detect('Onde mais gastei este mês?');
    assert(t2 === 'ONDE_MAIS_GASTEI', 'Detecta ONDE_MAIS_GASTEI', `Recebido: ${t2}`);

    const t3 = FinAppIntelligence.intentDetector.detect('Quanto gastei com alimentação?');
    const cat = FinAppIntelligence.languageParser.extractCategory('Quanto gastei com alimentação?', ['Alimentação']);
    assert(t3 === 'GASTO_CATEGORIA' && cat === 'Alimentação', 'Detecta GASTO_CATEGORIA com categoria Alimentação', `Intent: ${t3}, Cat: ${cat}`);

    console.log('\n--- TEST 2: Contextual Memory & Ellipsis Chain ---');
    // Step 1: User asks "Quanto gastei com alimentação?"
    const resp1 = await FinAppIntelligence.processarPergunta('Quanto gastei com alimentação?');
    assert(resp1.includes('Alimentação') && resp1.includes('2.100,00'), 'Step 1: Gasto com alimentação no mês atual computado corretamente');

    // Step 2: Follow-up ellipsis: "E no mês passado?"
    const resp2 = await FinAppIntelligence.processarPergunta('E no mês passado?');
    assert(resp2.includes('Alimentação') && resp2.includes('1.400,00'), 'Step 2: Ellipsis "E no mês passado?" herda Alimentação e busca mês passado');

    // Step 3: Comparative Follow-up: "Qual foi o aumento?"
    const resp3 = await FinAppIntelligence.processarPergunta('Qual foi o aumento?');
    assert(resp3.includes('Variação em Alimentação') && resp3.includes('700,00') && resp3.includes('50'), 'Step 3: "Qual foi o aumento?" calcula delta (R$ 700 / +50%) com precisão');

    console.log('\n--- TEST 3: Financial Simulator ---');
    // "Posso comprar algo de R$ 500?"
    const sim1 = await FinAppIntelligence.processarPergunta('Posso comprar algo de R$ 500?');
    assert(sim1.includes('Simulação de Compra') && sim1.includes('500,00'), 'Simulador de compra de R$ 500 responde com dados e análise');

    // "Se reduzir meus gastos em 10%, quanto economizarei?"
    const sim2 = await FinAppIntelligence.processarPergunta('Se reduzir meus gastos em 10%, quanto economizarei?');
    assert(sim2.includes('Simulação de Redução') && sim2.includes('10%'), 'Simulador de corte de gastos de 10% responde com projeção');

    // "Quanto consigo economizar até dezembro?"
    const sim3 = await FinAppIntelligence.processarPergunta('Quanto consigo economizar até dezembro?');
    assert(sim3.includes('Projeção de Economia') || sim3.includes('acumular'), 'Simulador de poupança até dezembro responde adequadamente');

    console.log('\n--- TEST 4: Security & Out-of-Scope Restriction ---');
    const out1 = await FinAppIntelligence.processarPergunta('Quem ganhou a Copa do Mundo de 1970?');
    assert(out1.includes('fui desenvolvido para ajudar você a cuidar melhor do seu dinheiro'), 'Bloqueia pergunta fora de finanças com mensagem oficial padronizada');

    console.log('\n--- TEST 5: Proactive Insights Generation ---');
    const insights = await FinAppIntelligence.obterInsightsProativos();
    assert(Array.isArray(insights) && insights.length > 0, `Gera insights proativos (${insights.length} encontrados)`);
    console.log('Insights gerados:', insights.map(i => i.titulo));

    console.log('\n--- TEST 6: Edge Cases & Neutralization of Internal Transfers ---');
    // Ensure "Transferência Interna" does not count towards real expenses
    const metricsAtual = FinAppIntelligence.financialEngine.computePeriodMetrics({
        lancamentos: mockWindow.Store.lancamentos,
        contas: mockWindow.Store.contas,
        bankAccounts: mockWindow.Store.bankAccounts,
        user: mockWindow.Auth.user
    }, { mes: 10, ano: 2026, label: 'Novembro de 2026' });
    // Total expenses should be 2100 (Alimentação) + 950 (Transporte) + 500 (Lazer) = 3550.
    // 300 of Transferência Interna must NOT be counted!
    assert(metricsAtual.despesas === 3550, `Despesas reais neutralizam Transferência Interna (Esperado: 3550, Obtido: ${metricsAtual.despesas})`);

    // Edge Case: Empty user / 0 data
    mockWindow.Store.lancamentos = [];
    mockWindow.Store.contas = [];
    mockWindow.Store.bankAccounts = [];
    const respEmpty = await FinAppIntelligence.processarPergunta('Quanto posso gastar?');
    assert(respEmpty.includes('Ainda não tenho informações suficientes') || respEmpty.includes('R$ 0,00'), 'Usuário sem lançamentos recebe resposta tratada sem quebrar');

    console.log(`\n========================================`);
    console.log(`TOTAL: ${passed} PASSOU / ${failed} FALHOU`);
    console.log(`========================================`);

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
