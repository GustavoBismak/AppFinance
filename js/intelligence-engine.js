// ==========================================================================
// FinApp Intelligence — Motor Financeiro e Processamento de Linguagem Natural
// 100% Nativo (Sem APIs externas, Zero custos, Multi-usuário seguro com RLS)
// ==========================================================================

window.FinAppIntelligence = (() => {
    // ----------------------------------------------------------------------
    // 1. UTILITÁRIOS DE LINGUAGEM E NORMALIZAÇÃO
    // ----------------------------------------------------------------------
    const normalize = (text) => {
        if (!text) return '';
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // remove acentos
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ') // pontuação vira espaço
            .replace(/\s+/g, ' ')
            .trim();
    };

    const MESES = [
        'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];

    const MESES_NOMES = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Extrai período mencionado na frase (padrão: mês atual)
    const extrairPeriodo = (normText) => {
        const hoje = new Date();
        let mes = hoje.getMonth(); // 0 a 11
        let ano = hoje.getFullYear();
        let label = `${MESES_NOMES[mes]} de ${ano}`;
        let isMesPassado = false;
        let isAnoTodo = false;

        if (normText.includes('mes passado') || normText.includes('anterior')) {
            mes = mes === 0 ? 11 : mes - 1;
            if (mes === 11) ano -= 1;
            label = `${MESES_NOMES[mes]} de ${ano}`;
            isMesPassado = true;
        } else if (normText.includes('ano passado')) {
            ano -= 1;
            isAnoTodo = true;
            label = `Ano de ${ano}`;
        } else if (normText.includes('ano todo') || normText.includes('este ano')) {
            isAnoTodo = true;
            label = `Ano de ${ano}`;
        } else {
            // Verifica se citou o nome de um mês específico
            for (let i = 0; i < MESES.length; i++) {
                if (normText.includes(MESES[i])) {
                    mes = i;
                    // Se o mês for maior que o atual e não citou ano, pode ser do ano passado ou do atual
                    if (mes > hoje.getMonth() && !normText.includes(String(ano))) {
                        // mantém ano atual para metas ou histórico
                    }
                    label = `${MESES_NOMES[mes]} de ${ano}`;
                    break;
                }
            }
        }

        // Verifica menção a ano explícito (ex: 2025, 2026, 2027)
        const anoMatch = normText.match(/\b(202\d)\b/);
        if (anoMatch) {
            ano = parseInt(anoMatch[1], 10);
            if (!normText.includes('mes') && isAnoTodo) {
                label = `Ano de ${ano}`;
            } else {
                label = `${MESES_NOMES[mes]} de ${ano}`;
            }
        }

        return { mes, ano, label, isMesPassado, isAnoTodo };
    };

    // Extrai valores monetários da frase (ex: "R$ 500", "500 reais", "350,50")
    const extrairValor = (text) => {
        if (!text) return null;
        // Padrão: R$ 500, R$500, 500 reais, 500,00, 500
        const match = text.match(/(?:r\$\s*|reais\s*)?(\d+(?:[.,]\d{1,2})?)(?:\s*reais)?/i);
        if (match && match[1]) {
            const raw = match[1].replace(',', '.');
            const val = parseFloat(raw);
            if (!isNaN(val) && val > 0) return val;
        }
        return null;
    };

    // Categorias financeiras padrão e sinônimos comuns
    const CATEGORIAS_PADRAO = {
        'alimentacao': ['alimentacao', 'comida', 'refeicao', 'almoco', 'jantar', 'lanche', 'ifood', 'mercado', 'supermercado', 'restaurante', 'padaria'],
        'transporte': ['transporte', 'uber', '99', 'combustivel', 'gasolina', 'etanol', 'onibus', 'metro', 'estacionamento', 'pedagio'],
        'moradia': ['moradia', 'aluguel', 'condominio', 'luz', 'energia', 'agua', 'gas', 'iptu', 'internet'],
        'lazer': ['lazer', 'cinema', 'viagem', 'passeio', 'festa', 'jogo', 'bar', 'praia', 'show'],
        'saude': ['saude', 'farmacia', 'remedio', 'medico', 'consulta', 'exame', 'dentista', 'hospital', 'convenio'],
        'educacao': ['educacao', 'escola', 'faculdade', 'curso', 'livro', 'livros', 'mensalidade'],
        'veiculo': ['veiculo', 'carro', 'moto', 'ipva', 'seguro', 'mecanico', 'manutencao']
    };

    // Identifica categoria mencionada
    const identificarCategoria = (normText, categoriasCadastradas = []) => {
        // Primeiro testa nas categorias cadastradas do próprio usuário
        for (const cat of categoriasCadastradas) {
            const normCat = normalize(cat.nome);
            if (normText.includes(normCat)) {
                return cat.nome;
            }
        }
        // Testa no catálogo de sinônimos
        for (const [catOficial, sinonimos] of Object.entries(CATEGORIAS_PADRAO)) {
            for (const sin of sinonimos) {
                if (normText.includes(sin)) {
                    // Retorna capitalizado
                    return catOficial.charAt(0).toUpperCase() + catOficial.slice(1);
                }
            }
        }
        return null;
    };

    // ----------------------------------------------------------------------
    // 2. DETECTOR DE ESCOPO E CATÁLOGO DE INTENÇÕES
    // ----------------------------------------------------------------------
    const PERGUNTAS_FORA_DE_ESCOPO = [
        'copa', 'futebol', 'campeonato', 'jogo de futebol', 'time', 'flamengo', 'corinthians',
        'capital', 'brasilia', 'presidente', 'politica', 'eleicao',
        'piada', 'historia', 'poema', 'musica', 'filme', 'serie',
        'clima', 'tempo', 'previsao', 'vai chover',
        'programacao', 'javascript', 'python', 'codigo', 'como programar',
        'receita de', 'bolo', 'cozinhar',
        'quem ganhou', 'quem descobriu', 'onde fica'
    ];

    const INTENCOES = {
        SAUDACAO: 'SAUDACAO',
        SALDO_DISPONIVEL: 'SALDO_DISPONIVEL',
        ORCAMENTO_COMPROMETIDO: 'ORCAMENTO_COMPROMETIDO',
        ONDE_MAIS_GASTEI: 'ONDE_MAIS_GASTEI',
        GASTO_CATEGORIA: 'GASTO_CATEGORIA',
        ECONOMIA_RECOMENDACOES: 'ECONOMIA_RECOMENDACOES',
        RECEITAS_CONSULTA: 'RECEITAS_CONSULTA',
        CONTAS_PENDENTES: 'CONTAS_PENDENTES',
        SIMULACAO_COMPRA: 'SIMULACAO_COMPRA',
        SIMULACAO_ECONOMIA: 'SIMULACAO_ECONOMIA',
        METAS: 'METAS',
        INVESTIMENTOS: 'INVESTIMENTOS',
        CARTAO_CREDITO: 'CARTAO_CREDITO',
        SITUACAO_GERAL: 'SITUACAO_GERAL',
        FORA_DO_ESCOPO: 'FORA_DO_ESCOPO'
    };

    const classificarIntencao = (text, normText) => {
        // 1. Filtro estrito de fora de escopo (conhecimentos gerais, piadas, futebol, etc.)
        for (const palavraProibida of PERGUNTAS_FORA_DE_ESCOPO) {
            // Verifica palavra isolada ou expressão
            const regex = new RegExp(`\\b${palavraProibida}\\b`, 'i');
            if (regex.test(normText)) {
                return INTENCOES.FORA_DO_ESCOPO;
            }
        }

        // 2. Saudações e apresentações simples
        if (/^(oi|ola|hey|bom dia|boa tarde|boa noite|ola assistente|oi finapp|ajuda|socorro|menu)$/i.test(normText)) {
            return INTENCOES.SAUDACAO;
        }

        // 3. Simulações de compra ("posso comprar algo de R$ 500", "posso gastar 300")
        if (
            normText.includes('posso comprar') ||
            normText.includes('da para comprar') ||
            normText.includes('consigo comprar') ||
            (normText.includes('posso gastar') && (normText.includes('reais') || normText.includes('r$') || /\d+/.test(normText))) ||
            (normText.includes('cabe no orcamento') && /\d+/.test(normText))
        ) {
            return INTENCOES.SIMULACAO_COMPRA;
        }

        // 4. Simulações de economia futura ("quanto consigo economizar até dezembro", "quanto preciso guardar por mês")
        if (
            normText.includes('quanto consigo economizar') ||
            normText.includes('quanto posso economizar') ||
            normText.includes('quanto preciso guardar') ||
            normText.includes('quanto sobra ate') ||
            normText.includes('se continuar gastando') ||
            normText.includes('projecao')
        ) {
            return INTENCOES.SIMULACAO_ECONOMIA;
        }

        // 5. Onde economizar e recomendações ("onde preciso economizar", "como posso gastar menos", "o que posso melhorar")
        if (
            normText.includes('onde economizar') ||
            normText.includes('onde preciso economizar') ||
            normText.includes('gastar menos') ||
            normText.includes('economizar') ||
            normText.includes('onde posso cortar') ||
            normText.includes('cortar gastos') ||
            normText.includes('o que posso melhorar') ||
            normText.includes('dicas para economizar') ||
            normText.includes('recomenda') ||
            normText.includes('estou gastando muito') ||
            normText.includes('despesas aumentaram')
        ) {
            return INTENCOES.ECONOMIA_RECOMENDACOES;
        }

        // 6. Gasto com categoria específica ("quanto gastei com alimentação", "gasto com uber")
        if (
            (normText.includes('quanto gastei com') || normText.includes('quanto gastei em') || normText.includes('gasto com') || normText.includes('gastos com')) &&
            !normText.includes('onde mais')
        ) {
            return INTENCOES.GASTO_CATEGORIA;
        }

        // 7. Onde mais gastei ("onde mais gastei", "onde foi parar meu dinheiro", "maior despesa", "maior gasto")
        if (
            normText.includes('onde mais gastei') ||
            normText.includes('onde mais gastei este mes') ||
            normText.includes('onde foi parar meu dinheiro') ||
            normText.includes('onde foi parar o dinheiro') ||
            normText.includes('maior despesa') ||
            normText.includes('maior gasto') ||
            normText.includes('maiores gastos') ||
            normText.includes('quais categorias estao consumindo') ||
            normText.includes('quais categorias gastam mais') ||
            normText.includes('vilao do orcamento') ||
            normText.includes('viloes do orcamento') ||
            normText.includes('gastos por categoria') ||
            normText.includes('minhas despesas')
        ) {
            return INTENCOES.ONDE_MAIS_GASTEI;
        }

        // 8. Contas a pagar e pendências ("quais contas tenho para pagar", "tenho conta vencendo")
        if (
            normText.includes('contas a pagar') ||
            normText.includes('contas para pagar') ||
            normText.includes('contas tenho para pagar') ||
            normText.includes('tenho para pagar') ||
            (normText.includes('contas') && normText.includes('pagar')) ||
            (normText.includes('conta') && normText.includes('pagar')) ||
            normText.includes('contas pendentes') ||
            normText.includes('conta vencendo') ||
            normText.includes('contas vencidas') ||
            normText.includes('tenho que pagar') ||
            normText.includes('boleto') ||
            normText.includes('boletos')
        ) {
            return INTENCOES.CONTAS_PENDENTES;
        }

        // 9. Orçamento e comprometimento ("quanto já comprometi do meu orçamento", "estou gastando mais do que ganho")
        if (
            normText.includes('comprometi') ||
            normText.includes('comprometido') ||
            normText.includes('orcamento') ||
            normText.includes('gastando mais do que ganho') ||
            normText.includes('gasto mais do que ganho') ||
            normText.includes('estou no vermelho')
        ) {
            return INTENCOES.ORCAMENTO_COMPROMETIDO;
        }

        // 10. Saldo e disponível ("quanto ainda posso gastar este mês?", "quanto tenho disponível?", "qual meu saldo atual?")
        if (
            normText.includes('posso gastar') ||
            normText.includes('tenho disponivel') ||
            normText.includes('saldo atual') ||
            normText.includes('meu saldo') ||
            normText.includes('saldo disponivel') ||
            normText.includes('quanto sobrou') ||
            normText.includes('quanto resta') ||
            normText.includes('limite disponivel')
        ) {
            return INTENCOES.SALDO_DISPONIVEL;
        }

        // 11. Receitas ("quanto recebi este mês", "minha renda", "quanto ganhei", "quanto tenho para receber")
        if (
            normText.includes('recebi') ||
            normText.includes('ganhei') ||
            normText.includes('receitas') ||
            normText.includes('minha renda') ||
            normText.includes('fonte de renda') ||
            normText.includes('salario') ||
            normText.includes('tenho para receber') ||
            normText.includes('entradas')
        ) {
            return INTENCOES.RECEITAS_CONSULTA;
        }

        // 12. Metas ("como estão minhas metas", "minha meta")
        if (normText.includes('meta') || normText.includes('metas') || normText.includes('objetivo financeiro')) {
            return INTENCOES.METAS;
        }

        // 13. Investimentos ("como estão meus investimentos", "meu patrimonio", "investido")
        if (normText.includes('investimento') || normText.includes('investimentos') || normText.includes('patrimonio') || normText.includes('rendeu') || normText.includes('acoes') || normText.includes('renda fixa')) {
            return INTENCOES.INVESTIMENTOS;
        }

        // 14. Cartões ("quanto gastei no cartão", "fatura do cartão")
        if (normText.includes('cartao') || normText.includes('fatura') || normText.includes('limite do cartao')) {
            return INTENCOES.CARTAO_CREDITO;
        }

        // 15. Situação geral / Resumo do mês ("como está minha situação financeira", "resumo do mês", "visao geral")
        if (
            normText.includes('situacao financeira') ||
            normText.includes('minha vida financeira') ||
            normText.includes('resumo') ||
            normText.includes('panorama') ||
            normText.includes('como estou') ||
            normText.includes('saude financeira')
        ) {
            return INTENCOES.SITUACAO_GERAL;
        }

        // 16. Verificação final de palavras-chave financeiras genéricas
        const termosFinanceiros = ['gasto', 'gastos', 'despesa', 'despesas', 'dinheiro', 'conta', 'pagamento', 'pagar', 'economia', 'economizar', 'sobra', 'lucro', 'guardar'];
        const temTermoFinanceiro = termosFinanceiros.some(t => normText.includes(t));

        if (temTermoFinanceiro) {
            return INTENCOES.SITUACAO_GERAL;
        }

        // Se não identificou nada financeiro, cai em FORA_DO_ESCOPO
        return INTENCOES.FORA_DO_ESCOPO;
    };

    // ----------------------------------------------------------------------
    // 3. CONSULTAS SQL E CÁLCULOS FINANCEIROS EM TEMPO REAL
    // ----------------------------------------------------------------------
    const carregarDadosFinanceiros = async () => {
        if (!window.Auth || !window.Auth.user) {
            return null;
        }

        const [
            todosLancamentos,
            todasContas,
            bankAccounts,
            bankConnections,
            metas,
            investimentos,
            cartoes,
            categorias
        ] = await Promise.all([
            Store.get(KEYS.LANCAMENTOS) || [],
            Store.get(KEYS.CONTAS) || [],
            Store.get(KEYS.BANK_ACCOUNTS) || [],
            Store.get(KEYS.BANK_CONNECTIONS) || [],
            Store.get(KEYS.METAS) || [],
            Store.get(KEYS.INVESTIMENTOS) || [],
            Store.get(KEYS.CARTOES) || [],
            Store.get(KEYS.CATEGORIAS) || []
        ]);

        return {
            lancamentos: todosLancamentos,
            contas: todasContas,
            bankAccounts,
            bankConnections,
            metas,
            investimentos,
            cartoes,
            categorias,
            user: Auth.user
        };
    };

    // Calcula indicadores filtrados por período
    const analisarDadosPeriodo = (dados, periodo) => {
        const { lancamentos, contas, bankAccounts, bankConnections, user } = dados;

        // Filtra lançamentos do período
        const lancamentosFiltrados = lancamentos.filter(l => {
            if (!l.data) return false;
            if (l.categoria === 'Transferência Interna') return false; // neutraliza transferência interna
            const dt = new Date(l.data + 'T00:00:00');
            if (periodo.isAnoTodo) {
                return dt.getFullYear() === periodo.ano;
            }
            return dt.getMonth() === periodo.mes && dt.getFullYear() === periodo.ano;
        });

        // Totais de receitas e despesas
        let receitas = 0;
        let despesas = 0;
        let despesasParaSaldo = 0;
        const despesasPorCat = {};
        const receitasPorCat = {};
        const lancamentosDespesa = [];

        lancamentosFiltrados.forEach(l => {
            const val = parseFloat(l.valor) || 0;
            const cat = l.categoria || 'Outros';

            if (l.tipo === 'receita') {
                receitas += val;
                receitasPorCat[cat] = (receitasPorCat[cat] || 0) + val;
            } else if (l.tipo === 'despesa') {
                despesas += val;
                despesasPorCat[cat] = (despesasPorCat[cat] || 0) + val;
                lancamentosDespesa.push(l);

                if (l.forma !== 'Cartão de Crédito') {
                    despesasParaSaldo += val;
                }
            }
        });

        // Contas a pagar no período
        const contasDoPeriodo = contas.filter(c => {
            if (!c.vencimento) return false;
            const dt = new Date(c.vencimento + 'T00:00:00');
            if (periodo.isAnoTodo) {
                return dt.getFullYear() === periodo.ano;
            }
            return dt.getMonth() === periodo.mes && dt.getFullYear() === periodo.ano;
        });

        let contasPagas = 0;
        let contasPendentes = 0;
        const listaContasPendentes = [];

        contasDoPeriodo.forEach(c => {
            const val = parseFloat(c.valor) || 0;
            if (c.pago) {
                contasPagas += val;
            } else {
                contasPendentes += val;
                listaContasPendentes.push(c);
            }
        });

        // Ordena contas pendentes por data de vencimento
        listaContasPendentes.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

        // Ordena despesas por categoria
        const rankingCategorias = Object.entries(despesasPorCat)
            .map(([cat, total]) => ({
                categoria: cat,
                total,
                percentual: despesas > 0 ? ((total / despesas) * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.total - a.total);

        // Maior despesa individual
        lancamentosDespesa.sort((a, b) => (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0));
        const maiorDespesaIndividual = lancamentosDespesa[0] || null;

        // Saldo bancário real consolidado (Open Finance)
        const isCreditCardAccount = (acc) => {
            if (!acc) return false;
            if (acc.type === 'CREDIT' || acc.subtype === 'CREDIT_CARD') return true;
            const name = (acc.name || '').toLowerCase();
            return name.includes('gold') || name.includes('ourocard') || name.includes('cartão') || name.includes('cartao') || name.includes('credit card');
        };

        let saldoBancarioTotal = 0;
        let totalFaturasOpenFinance = 0;
        let temBancosConectados = false;

        if (bankAccounts && bankAccounts.length > 0) {
            const contasCorrentes = bankAccounts.filter(a => !isCreditCardAccount(a));
            temBancosConectados = contasCorrentes.length > 0;
            bankAccounts.forEach(acc => {
                const bal = parseFloat(acc.balance_available) || parseFloat(acc.balance_current) || 0;
                if (isCreditCardAccount(acc)) {
                    totalFaturasOpenFinance += bal;
                } else {
                    saldoBancarioTotal += bal;
                }
            });
        }

        // Saldo calculado operacional
        const saldoCalculado = receitas - despesasParaSaldo;
        // Saldo base para análise
        const saldoBase = temBancosConectados ? saldoBancarioTotal : saldoCalculado;
        // Saldo realmente livre = saldo base menos contas pendentes que ainda vencerão no período
        const saldoLivreDisponivel = saldoBase - contasPendentes;

        // Renda informada no onboarding ou receitas médias
        const rendaOnboarding = parseFloat(user?.user_metadata?.onboarding_data?.income) || 0;
        const orcamentoReferencia = rendaOnboarding > 0 ? rendaOnboarding : receitas;
        const taxaComprometimento = orcamentoReferencia > 0 ? ((despesas / orcamentoReferencia) * 100).toFixed(1) : 0;
        const taxaEconomia = receitas > 0 ? (((receitas - despesas) / receitas) * 100).toFixed(1) : 0;

        // Análise do Mês Anterior para comparação
        let mesAnt = periodo.mes === 0 ? 11 : periodo.mes - 1;
        let anoAnt = periodo.mes === 0 ? periodo.ano - 1 : periodo.ano;
        const lancamentosMesAnt = lancamentos.filter(l => {
            if (!l.data || l.categoria === 'Transferência Interna') return false;
            const dt = new Date(l.data + 'T00:00:00');
            return dt.getMonth() === mesAnt && dt.getFullYear() === anoAnt;
        });

        let receitasMesAnt = 0;
        let despesasMesAnt = 0;
        lancamentosMesAnt.forEach(l => {
            const v = parseFloat(l.valor) || 0;
            if (l.tipo === 'receita') receitasMesAnt += v;
            if (l.tipo === 'despesa') despesasMesAnt += v;
        });

        return {
            periodo,
            receitas,
            despesas,
            saldoCalculado,
            saldoBancarioTotal,
            temBancosConectados,
            saldoBase,
            contasPagas,
            contasPendentes,
            listaContasPendentes,
            saldoLivreDisponivel,
            rankingCategorias,
            maiorDespesaIndividual,
            receitasPorCat,
            orcamentoReferencia,
            taxaComprometimento,
            taxaEconomia,
            historicoMesAnterior: {
                mes: MESES_NOMES[mesAnt],
                receitas: receitasMesAnt,
                despesas: despesasMesAnt,
                variacaoDespesas: despesasMesAnt > 0 ? (((despesas - despesasMesAnt) / despesasMesAnt) * 100).toFixed(1) : 0
            },
            qtdLancamentos: lancamentosFiltrados.length
        };
    };

    // ----------------------------------------------------------------------
    // 4. GERADOR DE RESPOSTAS EM LINGUAGEM NATURAL E FORMATAÇÃO VISUAL
    // ----------------------------------------------------------------------
    const formatarMoeda = (val) => {
        return window.App ? App.formatCurrency(val) : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    const processarPergunta = async (perguntaOriginal) => {
        const norm = normalize(perguntaOriginal);

        // 1. Classifica a intenção
        const intencao = classificarIntencao(perguntaOriginal, norm);

        // Mensagem padrão estrita para perguntas fora do escopo
        if (intencao === INTENCOES.FORA_DO_ESCOPO) {
            return `
                <div class="ia-response-box">
                    <p>😅 <strong>Desculpe!</strong> Sou o <strong>FinApp Intelligence</strong> e fui desenvolvido exclusivamente para ajudar você a cuidar melhor do seu dinheiro.</p>
                    <p style="margin-top: 10px;">Consigo responder perguntas sobre suas <strong>receitas</strong>, <strong>despesas</strong>, <strong>saldo disponível</strong>, <strong>orçamento</strong>, <strong>contas a pagar</strong>, <strong>metas</strong> e <strong>planejamento financeiro</strong>.</p>
                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto ainda posso gastar este mês?')">Quanto ainda posso gastar?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde mais gastei este mês?')">Onde mais gastei?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Como está minha situação financeira?')">Minha situação financeira</button>
                    </div>
                </div>
            `;
        }

        // Saudação
        if (intencao === INTENCOES.SAUDACAO) {
            return `
                <div class="ia-response-box">
                    <p>👋 <strong>Olá! Sou o FinApp Intelligence</strong>, seu copiloto de inteligência financeira.</p>
                    <p style="margin-top: 10px;">Estou conectado em tempo real aos seus dados aqui no FinApp. O que você gostaria de analisar agora?</p>
                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto ainda posso gastar este mês?')">💰 Quanto ainda posso gastar?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde mais gastei este mês?')">📊 Onde mais gastei?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Como está minha situação financeira?')">⚖️ Situação geral</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quais contas tenho para pagar?')">💳 Contas a pagar</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde preciso economizar?')">🎯 Onde economizar?</button>
                    </div>
                </div>
            `;
        }

        // Carrega dados do usuário autenticado no Supabase
        const dados = await carregarDadosFinanceiros();
        if (!dados) {
            return `<div class="ia-response-box"><p>⚠️ Não foi possível identificar sua sessão de usuário. Por favor, faça login novamente no FinApp.</p></div>`;
        }

        // Extrai período e analisa
        const periodo = extrairPeriodo(norm);
        const analise = analisarDadosPeriodo(dados, periodo);

        // Caso o usuário não possua nenhum lançamento cadastrado
        if (dados.lancamentos.length === 0 && dados.contas.length === 0 && (!dados.bankAccounts || dados.bankAccounts.length === 0)) {
            return `
                <div class="ia-response-box">
                    <p>🔍 Analisei sua conta e percebi que você <strong>ainda não possui lançamentos ou contas registradas</strong>.</p>
                    <p style="margin-top: 10px;">Para que eu possa gerar relatórios precisos, calcular seu saldo livre e indicar onde economizar, adicione suas primeiras movimentações:</p>
                    <div class="ia-quick-actions" style="margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-sm btn-primary" onclick="App.loadView('lancamentos')"><i class="ph ph-plus"></i> Novo Lançamento</button>
                        <button class="btn btn-sm btn-outline" onclick="App.loadView('contas')"><i class="ph ph-calendar-check"></i> Contas a Pagar</button>
                        <button class="btn btn-sm btn-outline" onclick="App.loadView('conexoes')"><i class="ph ph-bank"></i> Conectar Banco</button>
                    </div>
                </div>
            `;
        }

        // ------------------------------------------------------------------
        // ROTEAMENTO DE INTENÇÕES FINANCEIRAS
        // ------------------------------------------------------------------

        // A. SALDO E ORÇAMENTO ("Quanto ainda posso gastar?")
        if (intencao === INTENCOES.SALDO_DISPONIVEL) {
            const livre = analise.saldoLivreDisponivel;
            const isPositivo = livre > 0;
            const classeStatus = isPositivo ? 'status-positive' : 'status-negative';

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-wallet"></i> Saldo & Disponibilidade (${analise.periodo.label})
                    </div>

                    <div class="ia-kpi-card ${classeStatus}">
                        <span class="ia-kpi-title">Limite Seguro para Gastar</span>
                        <span class="ia-kpi-value">${formatarMoeda(livre)}</span>
                        <span class="ia-kpi-sub">${isPositivo ? 'Disponível após reservar o dinheiro das contas pendentes' : 'Atenção: seus compromissos superam suas receitas deste mês'}</span>
                    </div>

                    <div class="ia-breakdown-list">
                        <div class="ia-breakdown-item">
                            <span><i class="ph ph-arrow-circle-down text-success"></i> Receitas recebidas:</span>
                            <strong>${formatarMoeda(analise.receitas)}</strong>
                        </div>
                        <div class="ia-breakdown-item">
                            <span><i class="ph ph-arrow-circle-up text-danger"></i> Despesas já pagas:</span>
                            <strong>${formatarMoeda(analise.despesas)}</strong>
                        </div>
                        <div class="ia-breakdown-item">
                            <span><i class="ph ph-receipt text-warning"></i> Contas pendentes a vencer:</span>
                            <strong class="text-warning">${formatarMoeda(analise.contasPendentes)}</strong>
                        </div>
                        ${analise.temBancosConectados ? `
                        <div class="ia-breakdown-item" style="border-top: 1px dashed var(--border); padding-top: 8px;">
                            <span><i class="ph ph-bank text-primary"></i> Saldo real em bancos conectados:</span>
                            <strong>${formatarMoeda(analise.saldoBancarioTotal)}</strong>
                        </div>
                        ` : ''}
                    </div>

                    <p class="ia-insight-text" style="margin-top: 14px;">
                        ${isPositivo 
                            ? `💡 <strong>Dica do FinApp:</strong> Você tem <strong>${formatarMoeda(livre)}</strong> livres sem comprometer seus boletos já cadastrados.`
                            : `⚠️ <strong>Alerta financeiro:</strong> Você já comprometeu <strong>${formatarMoeda(Math.abs(livre))}</strong> a mais do que arrecadou no período.`
                        }
                    </p>
                </div>
            `;
        }

        // B. ORÇAMENTO COMPROMETIDO ("Estou gastando mais do que ganho?")
        if (intencao === INTENCOES.ORCAMENTO_COMPROMETIDO) {
            const gastoTotal = analise.despesas + analise.contasPendentes;
            const ganhoTotal = analise.receitas;
            const gastaMaisQueGanha = gastoTotal > ganhoTotal;
            const taxa = analise.receitas > 0 ? ((gastoTotal / analise.receitas) * 100).toFixed(1) : 0;

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-scales"></i> Análise de Orçamento (${analise.periodo.label})
                    </div>

                    <p>
                        ${gastaMaisQueGanha 
                            ? `🚨 <strong>Sim, você está gastando mais do que ganha neste período.</strong>`
                            : `✅ <strong>Sua situação está sob controle! Você está gastando menos do que ganha.</strong>`
                        }
                    </p>

                    <div class="ia-progress-container" style="margin: 16px 0;">
                        <div class="flex justify-between" style="font-size: 13px; margin-bottom: 6px;">
                            <span>Comprometimento da Renda:</span>
                            <strong class="${gastaMaisQueGanha ? 'text-danger' : 'text-success'}">${taxa}%</strong>
                        </div>
                        <div class="ia-progress-bar">
                            <div class="ia-progress-fill ${gastaMaisQueGanha ? 'bg-danger' : 'bg-primary'}" style="width: ${Math.min(taxa, 100)}%;"></div>
                        </div>
                    </div>

                    <div class="ia-breakdown-list">
                        <div class="ia-breakdown-item">
                            <span>Receitas computadas:</span>
                            <strong>${formatarMoeda(ganhoTotal)}</strong>
                        </div>
                        <div class="ia-breakdown-item">
                            <span>Despesas + Contas pendentes:</span>
                            <strong>${formatarMoeda(gastoTotal)}</strong>
                        </div>
                        <div class="ia-breakdown-item">
                            <span>Resultado líquido projetado:</span>
                            <strong class="${gastaMaisQueGanha ? 'text-danger' : 'text-success'}">${formatarMoeda(ganhoTotal - gastoTotal)}</strong>
                        </div>
                    </div>
                </div>
            `;
        }

        // C. ANÁLISE DE DESPESAS ("Onde mais gastei?")
        if (intencao === INTENCOES.ONDE_MAIS_GASTEI) {
            if (analise.rankingCategorias.length === 0) {
                return `
                    <div class="ia-response-box">
                        <p>📊 Não encontrei despesas registradas em <strong>${analise.periodo.label}</strong>.</p>
                        <p style="margin-top: 8px;">Caso deseje consultar outro mês, tente perguntar por exemplo: <em>"Onde mais gastei no mês passado?"</em>.</p>
                    </div>
                `;
            }

            const topCat = analise.rankingCategorias[0];

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-chart-pie"></i> Maiores Gastos (${analise.periodo.label})
                    </div>

                    <p>Em <strong>${analise.periodo.label}</strong>, você registrou um total de <strong>${formatarMoeda(analise.despesas)}</strong> em despesas.</p>
                    <p style="margin-top: 6px;">A categoria com maior consumo foi <strong>${topCat.categoria}</strong>, representando <strong>${topCat.percentual}%</strong> de tudo o que você gastou.</p>

                    <div class="ia-categories-ranking" style="margin: 16px 0;">
                        <h4 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 10px;">Distribuição por Categoria:</h4>
                        ${analise.rankingCategorias.slice(0, 5).map((c, i) => `
                            <div class="ia-rank-row">
                                <div class="ia-rank-info">
                                    <span class="ia-rank-num">#${i + 1}</span>
                                    <span class="ia-rank-name">${c.categoria}</span>
                                    <span class="ia-rank-pct">(${c.percentual}%)</span>
                                </div>
                                <strong class="ia-rank-val">${formatarMoeda(c.total)}</strong>
                            </div>
                        `).join('')}
                    </div>

                    ${analise.maiorDespesaIndividual ? `
                        <div class="ia-tip-card">
                            <i class="ph ph-receipt text-warning"></i>
                            <div>
                                <strong>Maior despesa individual:</strong> "${analise.maiorDespesaIndividual.descricao}" no valor de <strong>${formatarMoeda(analise.maiorDespesaIndividual.valor)}</strong> em ${new Date(analise.maiorDespesaIndividual.data + 'T00:00:00').toLocaleDateString('pt-BR')}.
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // D. GASTO POR CATEGORIA ESPECÍFICA ("Quanto gastei com alimentação?")
        if (intencao === INTENCOES.GASTO_CATEGORIA) {
            const catNome = identificarCategoria(norm, dados.categorias);
            if (!catNome) {
                return `
                    <div class="ia-response-box">
                        <p>❓ Não consegui identificar qual categoria você gostaria de consultar.</p>
                        <p style="margin-top: 8px;">Você pode perguntar por exemplo: <em>"Quanto gastei com Alimentação este mês?"</em> ou <em>"Quanto gastei com Transporte?"</em>.</p>
                    </div>
                `;
            }

            // Procura nos dados da categoria
            const catEncontrada = analise.rankingCategorias.find(c => normalize(c.categoria) === normalize(catNome));
            const totalCat = catEncontrada ? catEncontrada.total : 0;
            const pctCat = catEncontrada ? catEncontrada.percentual : 0;

            // Filtra os lançamentos específicos dessa categoria
            const itensCat = dados.lancamentos.filter(l => {
                if (!l.data || l.tipo !== 'despesa') return false;
                if (normalize(l.categoria) !== normalize(catNome)) return false;
                const dt = new Date(l.data + 'T00:00:00');
                if (analise.periodo.isAnoTodo) return dt.getFullYear() === analise.periodo.ano;
                return dt.getMonth() === analise.periodo.mes && dt.getFullYear() === analise.periodo.ano;
            });

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-tag"></i> Categoria: ${catNome} (${analise.periodo.label})
                    </div>

                    <div class="ia-kpi-card">
                        <span class="ia-kpi-title">Total Gasto em ${catNome}</span>
                        <span class="ia-kpi-value text-danger">${formatarMoeda(totalCat)}</span>
                        <span class="ia-kpi-sub">${pctCat > 0 ? `Representa ${pctCat}% das suas despesas totais` : 'Nenhum gasto nesta categoria no período'}</span>
                    </div>

                    ${itensCat.length > 0 ? `
                        <div style="margin-top: 14px;">
                            <h4 style="font-size: 13px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">Lançamentos de ${catNome}:</h4>
                            <div class="ia-breakdown-list">
                                ${itensCat.slice(0, 4).map(it => `
                                    <div class="ia-breakdown-item">
                                        <span>${it.descricao} <small class="text-muted">(${new Date(it.data + 'T00:00:00').toLocaleDateString('pt-BR')})</small></span>
                                        <strong>${formatarMoeda(it.valor)}</strong>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // E. ECONOMIA E RECOMENDAÇÕES ("Onde preciso economizar?")
        if (intencao === INTENCOES.ECONOMIA_RECOMENDACOES) {
            const recomendacoes = [];

            // 1. Categoria predominante (> 30% dos gastos)
            if (analise.rankingCategorias.length > 0) {
                const top1 = analise.rankingCategorias[0];
                if (parseFloat(top1.percentual) >= 30) {
                    recomendacoes.push(`
                        <li>
                            <strong>Atenção com ${top1.categoria}:</strong> Ela está consumindo <strong>${top1.percentual}%</strong> de todas as suas despesas (${formatarMoeda(top1.total)}). Reduzir pequenos excessos aqui é o caminho mais rápido para equilibrar seu orçamento.
                        </li>
                    `);
                }
            }

            // 2. Contas pendentes prestes a vencer
            if (analise.contasPendentes > 0) {
                recomendacoes.push(`
                    <li>
                        <strong>Evite juros e multas:</strong> Você possui <strong>${formatarMoeda(analise.contasPendentes)}</strong> em contas a pagar pendentes para este período. Priorize quitá-las antes de realizar novas compras no cartão.
                    </li>
                `);
            }

            // 3. Comparação com o mês anterior
            if (analise.historicoMesAnterior.despesas > 0 && parseFloat(analise.historicoMesAnterior.variacaoDespesas) > 10) {
                recomendacoes.push(`
                    <li>
                        <strong>Aumento de gastos:</strong> Seus gastos subiram <strong>${analise.historicoMesAnterior.variacaoDespesas}%</strong> em relação a ${analise.historicoMesAnterior.mes}. Vale revisar os lançamentos recentes para conter a curva.
                    </li>
                `);
            }

            // 4. Meta de economia (pelo menos 10% a 20% da receita)
            if (analise.receitas > 0) {
                const idealPoupar = analise.receitas * 0.15;
                recomendacoes.push(`
                    <li>
                        <strong>Regra de Reserva Financeira:</strong> Pela sua receita de ${formatarMoeda(analise.receitas)}, sua meta ideal de poupança seria guardar cerca de <strong>${formatarMoeda(idealPoupar)}</strong> (15%) para emergências ou investimentos.
                    </li>
                `);
            }

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-lightbulb"></i> Diagnóstico & Recomendações (${analise.periodo.label})
                    </div>

                    <p>Com base nos números reais da sua conta, aqui estão as recomendações prioritárias para você economizar:</p>

                    <ul class="ia-recommendations-list" style="margin: 16px 0;">
                        ${recomendacoes.length > 0 ? recomendacoes.join('') : `
                            <li>
                                <strong>Ótimo trabalho!</strong> Suas despesas estão equilibradas e dentro das receitas deste mês. Mantenha os lançamentos atualizados para continuar no controle.
                            </li>
                        `}
                    </ul>
                </div>
            `;
        }

        // F. RECEITAS ("Quanto recebi este mês?", "Quanto tenho para receber?")
        if (intencao === INTENCOES.RECEITAS_CONSULTA) {
            const principaisFontes = Object.entries(analise.receitasPorCat)
                .sort((a, b) => b[1] - a[1]);

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-hand-coins"></i> Receitas & Entradas (${analise.periodo.label})
                    </div>

                    <div class="ia-kpi-card status-positive">
                        <span class="ia-kpi-title">Total de Receitas Recebidas</span>
                        <span class="ia-kpi-value text-success">${formatarMoeda(analise.receitas)}</span>
                        <span class="ia-kpi-sub">${analise.historicoMesAnterior.receitas > 0 ? `No mês anterior (${analise.historicoMesAnterior.mes}), você recebeu ${formatarMoeda(analise.historicoMesAnterior.receitas)}` : 'Lançamentos efetivados no período'}</span>
                    </div>

                    ${principaisFontes.length > 0 ? `
                        <div style="margin-top: 14px;">
                            <h4 style="font-size: 13px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">Fontes de Entrada:</h4>
                            <div class="ia-breakdown-list">
                                ${principaisFontes.map(([cat, val]) => `
                                    <div class="ia-breakdown-item">
                                        <span>${cat}</span>
                                        <strong class="text-success">${formatarMoeda(val)}</strong>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // G. CONTAS PENDENTES ("Quais contas tenho para pagar?")
        if (intencao === INTENCOES.CONTAS_PENDENTES) {
            if (analise.listaContasPendentes.length === 0) {
                return `
                    <div class="ia-response-box">
                        <div class="ia-header-badge"><i class="ph ph-check-circle text-success"></i> Contas a Pagar</div>
                        <p>🎉 <strong>Parabéns!</strong> Você não possui nenhuma conta pendente para <strong>${analise.periodo.label}</strong>.</p>
                        <p style="margin-top: 8px; color: var(--text-muted);">Todas as contas cadastradas para este mês já estão marcadas como pagas.</p>
                    </div>
                `;
            }

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-calendar-check text-warning"></i> Contas a Pagar Pendentes (${analise.periodo.label})
                    </div>

                    <div class="ia-kpi-card status-negative">
                        <span class="ia-kpi-title">Total Pendente</span>
                        <span class="ia-kpi-value text-warning">${formatarMoeda(analise.contasPendentes)}</span>
                        <span class="ia-kpi-sub">${analise.listaContasPendentes.length} conta(s) a vencer</span>
                    </div>

                    <div class="ia-breakdown-list" style="margin-top: 14px;">
                        ${analise.listaContasPendentes.map(c => `
                            <div class="ia-breakdown-item">
                                <div>
                                    <strong>${c.nome}</strong>
                                    <div style="font-size: 11px; color: var(--text-muted);">Vencimento: ${new Date(c.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                                </div>
                                <strong class="text-warning">${formatarMoeda(c.valor)}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // H. SIMULAÇÃO DE COMPRA ("Posso comprar algo de R$ 500?")
        if (intencao === INTENCOES.SIMULACAO_COMPRA) {
            const valorDesejado = extrairValor(perguntaOriginal) || 500;
            const saldoLivre = analise.saldoLivreDisponivel;
            const sobraAposCompra = saldoLivre - valorDesejado;
            const ehViavel = sobraAposCompra >= 0;

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-calculator"></i> Simulação de Compra de ${formatarMoeda(valorDesejado)}
                    </div>

                    <p>
                        ${ehViavel
                            ? `✅ <strong>Sim, você pode realizar essa compra!</strong> Seu saldo livre comporta este valor.`
                            : `⚠️ <strong>Não é recomendável comprar agora.</strong> Essa compra ultrapassa seu limite disponível no momento.`
                        }
                    </p>

                    <div class="ia-simulation-box" style="margin: 16px 0;">
                        <div class="ia-sim-row">
                            <span>Saldo livre atual (após contas pendentes):</span>
                            <strong>${formatarMoeda(saldoLivre)}</strong>
                        </div>
                        <div class="ia-sim-row">
                            <span>Valor da compra simulada:</span>
                            <strong class="text-danger">- ${formatarMoeda(valorDesejado)}</strong>
                        </div>
                        <div class="ia-sim-row total" style="border-top: 1px solid var(--border); padding-top: 8px; margin-top: 8px;">
                            <span>Sobra final estimada:</span>
                            <strong class="${ehViavel ? 'text-success' : 'text-danger'}">${formatarMoeda(sobraAposCompra)}</strong>
                        </div>
                    </div>

                    <div class="ia-tip-card">
                        <i class="ph ph-info text-primary"></i>
                        <small>
                            <strong>Hipótese da simulação:</strong> Consideramos suas receitas recebidas no mês, subtraindo suas despesas pagas e todas as contas a pagar pendentes cadastradas (${formatarMoeda(analise.contasPendentes)}).
                        </small>
                    </div>
                </div>
            `;
        }

        // I. SIMULAÇÃO DE ECONOMIA FUTURA ("Quanto consigo economizar até dezembro?")
        if (intencao === INTENCOES.SIMULACAO_ECONOMIA) {
            const hoje = new Date();
            const mesAtual = hoje.getMonth();
            const mesAlvo = periodo.mes > mesAtual ? periodo.mes : 11; // padrão: dezembro (mês 11)
            const mesesRestantes = Math.max(1, (mesAlvo - mesAtual) + 1);

            // Média mensal de economia histórica
            const sobraMesAtual = analise.receitas - analise.despesas;
            const sobraEstimadaMensal = sobraMesAtual > 0 ? sobraMesAtual : Math.max(0, analise.orcamentoReferencia * 0.15);
            const projecaoTotal = sobraEstimadaMensal * mesesRestantes;

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-trend-up"></i> Projeção de Economia até ${MESES_NOMES[mesAlvo]}
                    </div>

                    <p>Projetando seus resultados pelos próximos <strong>${mesesRestantes} mês(es)</strong>:</p>

                    <div class="ia-kpi-card status-positive" style="margin: 14px 0;">
                        <span class="ia-kpi-title">Economia Projetada Total</span>
                        <span class="ia-kpi-value text-success">${formatarMoeda(projecaoTotal)}</span>
                        <span class="ia-kpi-sub">Mantendo a média de ${formatarMoeda(sobraEstimadaMensal)} poupados por mês</span>
                    </div>

                    <div class="ia-tip-card">
                        <i class="ph ph-check text-primary"></i>
                        <small>
                            <strong>Premissas:</strong> Cálculo baseado na sua taxa atual de economia mensal (${analise.taxaEconomia}%) e no saldo entre entradas e saídas. Se você cortar despesas supérfluas, essa projeção pode crescer ainda mais.
                        </small>
                    </div>
                </div>
            `;
        }

        // J. METAS ("Como estão minhas metas?")
        if (intencao === INTENCOES.METAS) {
            const metas = dados.metas || [];
            if (metas.length === 0) {
                return `
                    <div class="ia-response-box">
                        <div class="ia-header-badge"><i class="ph ph-target"></i> Metas Financeiras</div>
                        <p>Você ainda não cadastrou nenhuma meta financeira no FinApp.</p>
                        <p style="margin-top: 8px;">Definir metas (como reserva de emergência, viagem ou compra de um bem) ajuda a manter o foco na economia!</p>
                        <button class="btn btn-sm btn-primary mt-3" onclick="App.loadView('metas')"><i class="ph ph-plus"></i> Criar Primeira Meta</button>
                    </div>
                `;
            }

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-target"></i> Suas Metas Financeiras
                    </div>

                    <div class="ia-metas-list" style="margin: 14px 0;">
                        ${metas.map(m => {
                            const obj = parseFloat(m.objetivo) || 0;
                            const guard = parseFloat(m.guardado) || 0;
                            const pct = Math.min(obj > 0 ? ((guard / obj) * 100).toFixed(1) : 0, 100);
                            return `
                                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; margin-bottom: 8px;">
                                    <div class="flex justify-between items-center mb-1">
                                        <strong>${m.nome}</strong>
                                        <span class="badge ${pct >= 100 ? 'badge-success' : 'badge-primary'}">${pct}%</span>
                                    </div>
                                    <div class="flex justify-between text-muted" style="font-size: 12px; margin-bottom: 6px;">
                                        <span>Guardado: ${formatarMoeda(guard)}</span>
                                        <span>Objetivo: ${formatarMoeda(obj)}</span>
                                    </div>
                                    <div class="ia-progress-bar" style="height: 6px;">
                                        <div class="ia-progress-fill" style="width: ${pct}%;"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // K. INVESTIMENTOS ("Como estão meus investimentos?")
        if (intencao === INTENCOES.INVESTIMENTOS) {
            const invs = dados.investimentos || [];
            let totalAporte = 0;
            let totalAtual = 0;
            invs.forEach(i => {
                totalAporte += parseFloat(i.aporte) || 0;
                totalAtual += parseFloat(i.atual) || 0;
            });
            const lucro = totalAtual - totalAporte;
            const rentPct = totalAporte > 0 ? ((lucro / totalAporte) * 100).toFixed(2) : 0;

            if (invs.length === 0) {
                return `
                    <div class="ia-response-box">
                        <div class="ia-header-badge"><i class="ph ph-chart-line-up"></i> Investimentos</div>
                        <p>Você ainda não possui investimentos registrados no FinApp.</p>
                        <button class="btn btn-sm btn-primary mt-3" onclick="App.loadView('investimentos')"><i class="ph ph-plus"></i> Registrar Investimento</button>
                    </div>
                `;
            }

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-chart-line-up"></i> Carteira de Investimentos
                    </div>

                    <div class="ia-kpi-card ${lucro >= 0 ? 'status-positive' : 'status-negative'}">
                        <span class="ia-kpi-title">Patrimônio Investido Atual</span>
                        <span class="ia-kpi-value">${formatarMoeda(totalAtual)}</span>
                        <span class="ia-kpi-sub">Rentabilidade total: ${lucro >= 0 ? '+' : ''}${rentPct}% (${formatarMoeda(lucro)})</span>
                    </div>

                    <div class="ia-breakdown-list" style="margin-top: 14px;">
                        <div class="ia-breakdown-item">
                            <span>Total Aportado:</span>
                            <strong>${formatarMoeda(totalAporte)}</strong>
                        </div>
                        <div class="ia-breakdown-item">
                            <span>Quantidade de Ativos:</span>
                            <strong>${invs.length} ativo(s)</strong>
                        </div>
                    </div>
                </div>
            `;
        }

        // L. CARTÕES DE CRÉDITO ("Quanto gastei no cartão?")
        if (intencao === INTENCOES.CARTAO_CREDITO) {
            const cartoes = dados.cartoes || [];
            let totalLimite = 0;
            let totalUtilizado = 0;
            cartoes.forEach(c => {
                totalLimite += parseFloat(c.limite) || 0;
                totalUtilizado += parseFloat(c.utilizado) || 0;
            });
            const disponivel = totalLimite - totalUtilizado;

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-credit-card"></i> Cartões de Crédito
                    </div>

                    <div class="ia-kpi-card">
                        <span class="ia-kpi-title">Faturas / Limite Utilizado</span>
                        <span class="ia-kpi-value text-warning">${formatarMoeda(totalUtilizado)}</span>
                        <span class="ia-kpi-sub">Limite livre para compras: ${formatarMoeda(disponivel)}</span>
                    </div>

                    <div class="ia-breakdown-list" style="margin-top: 14px;">
                        ${cartoes.map(c => `
                            <div class="ia-breakdown-item">
                                <span>${c.nome}</span>
                                <strong>${formatarMoeda(c.utilizado)} / <small class="text-muted">${formatarMoeda(c.limite)}</small></strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // M. SITUAÇÃO GERAL (PANORAMA GERAL)
        const taxaEco = parseFloat(analise.taxaEconomia);
        const situacaoBoa = taxaEco >= 10;

        return `
            <div class="ia-response-box">
                <div class="ia-header-badge">
                    <i class="ph ph-sparkle"></i> Diagnóstico Financeiro Completo (${analise.periodo.label})
                </div>

                <p>
                    ${situacaoBoa 
                        ? `🌟 <strong>Sua vida financeira está no caminho certo!</strong> Você poupou <strong>${analise.taxaEconomia}%</strong> do que ganhou em ${analise.periodo.label}.`
                        : `⚠️ <strong>Momento de atenção nas finanças:</strong> Suas despesas e compromissos estão consumindo quase todo o seu orçamento.`
                    }
                </p>

                <div class="grid grid-2" style="gap: 12px; margin: 16px 0;">
                    <div class="ia-mini-card">
                        <span class="text-muted" style="font-size: 11px;">Entradas</span>
                        <strong class="text-success" style="font-size: 16px;">${formatarMoeda(analise.receitas)}</strong>
                    </div>
                    <div class="ia-mini-card">
                        <span class="text-muted" style="font-size: 11px;">Saídas</span>
                        <strong class="text-danger" style="font-size: 16px;">${formatarMoeda(analise.despesas)}</strong>
                    </div>
                    <div class="ia-mini-card">
                        <span class="text-muted" style="font-size: 11px;">Contas a Vencer</span>
                        <strong class="text-warning" style="font-size: 16px;">${formatarMoeda(analise.contasPendentes)}</strong>
                    </div>
                    <div class="ia-mini-card">
                        <span class="text-muted" style="font-size: 11px;">Saldo Livre Real</span>
                        <strong class="${analise.saldoLivreDisponivel >= 0 ? 'text-primary' : 'text-danger'}" style="font-size: 16px;">${formatarMoeda(analise.saldoLivreDisponivel)}</strong>
                    </div>
                </div>

                <div class="ia-suggestion-chips" style="margin-top: 12px;">
                    <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde mais gastei este mês?')">Onde mais gastei?</button>
                    <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde preciso economizar?')">Onde economizar?</button>
                    <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto ainda posso gastar este mês?')">Quanto ainda posso gastar?</button>
                </div>
            </div>
        `;
    };

    return {
        normalize,
        classificarIntencao,
        processarPergunta,
        INTENCOES
    };
})();
