// ==========================================================================
// FinApp Intelligence Expert — Motor de Inteligência Financeira e PLN
// 100% Nativo (Sem APIs externas de IA, Zero Custos, Seguro e Multiusuário)
// ==========================================================================

window.FinAppIntelligence = (() => {

    // ======================================================================
    // 1. MÓDULO: languageParser (Processamento de Linguagem e Normalização)
    // ======================================================================
    const languageParser = {
        normalize: (text) => {
            if (!text) return '';
            return text
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // remove acentos
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ') // pontuação vira espaço
                .replace(/\s+/g, ' ')
                .trim();
        },

        MESES: [
            'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ],

        MESES_NOMES: [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ],

        CATEGORIAS_SINONIMOS: {
            'Alimentação': ['alimentacao', 'comida', 'refeicao', 'almoco', 'jantar', 'lanche', 'ifood', 'mercado', 'supermercado', 'restaurante', 'padaria', 'acougue'],
            'Transporte': ['transporte', 'uber', '99', 'combustivel', 'gasolina', 'etanol', 'onibus', 'metro', 'estacionamento', 'pedagio', 'passagem', 'taxi'],
            'Moradia': ['moradia', 'aluguel', 'condominio', 'luz', 'energia', 'agua', 'gas', 'iptu', 'internet', 'casa'],
            'Lazer': ['lazer', 'cinema', 'viagem', 'passeio', 'festa', 'jogo', 'bar', 'praia', 'show', 'balada', 'streaming', 'netflix', 'spotify'],
            'Saúde': ['saude', 'farmacia', 'remedio', 'remedios', 'medico', 'consulta', 'exame', 'dentista', 'hospital', 'convenio', 'plano de saude'],
            'Educação': ['educacao', 'escola', 'faculdade', 'curso', 'livro', 'livros', 'mensalidade', 'estudo'],
            'Veículo': ['veiculo', 'carro', 'moto', 'ipva', 'seguro', 'mecanico', 'manutencao', 'troca de oleo', 'pneu']
        },

        extractPeriod: (normText, contextPeriod = null) => {
            const hoje = new Date();
            let mes = hoje.getMonth();
            let ano = hoje.getFullYear();
            let label = `${languageParser.MESES_NOMES[mes]} de ${ano}`;
            let isMesPassado = false;
            let isAnoTodo = false;
            let isUltimos3Meses = false;
            let isUltimos6Meses = false;

            if (normText.includes('ultimos 3 meses') || normText.includes('ultimos tres meses') || normText.includes('trimestre')) {
                isUltimos3Meses = true;
                label = 'Últimos 3 Meses';
            } else if (normText.includes('ultimos 6 meses') || normText.includes('ultimos seis meses') || normText.includes('semestre')) {
                isUltimos6Meses = true;
                label = 'Últimos 6 Meses';
            } else if (normText.includes('mes passado') || normText.includes('no anterior') || normText.includes('mes anterior') || normText.includes('e no passado')) {
                mes = mes === 0 ? 11 : mes - 1;
                if (mes === 11) ano -= 1;
                label = `${languageParser.MESES_NOMES[mes]} de ${ano}`;
                isMesPassado = true;
            } else if (normText.includes('ano passado')) {
                ano -= 1;
                isAnoTodo = true;
                label = `Ano de ${ano}`;
            } else if (normText.includes('ano todo') || normText.includes('este ano')) {
                isAnoTodo = true;
                label = `Ano de ${ano}`;
            } else {
                // Procura mês nominal
                let encontrouMes = false;
                for (let i = 0; i < languageParser.MESES.length; i++) {
                    if (normText.includes(languageParser.MESES[i])) {
                        mes = i;
                        label = `${languageParser.MESES_NOMES[mes]} de ${ano}`;
                        encontrouMes = true;
                        break;
                    }
                }

                // Se não citou período e há contexto anterior, herda o período do contexto
                if (!encontrouMes && contextPeriod && !normText.includes('este mes') && !normText.includes('atual')) {
                    mes = contextPeriod.mes;
                    ano = contextPeriod.ano;
                    label = contextPeriod.label;
                    isMesPassado = contextPeriod.isMesPassado || false;
                    isAnoTodo = contextPeriod.isAnoTodo || false;
                }
            }

            // Ano explícito (ex: 2024, 2025, 2026, 2027)
            const anoMatch = normText.match(/\b(202\d)\b/);
            if (anoMatch) {
                ano = parseInt(anoMatch[1], 10);
                if (!normText.includes('mes') && isAnoTodo) {
                    label = `Ano de ${ano}`;
                } else if (!isUltimos3Meses && !isUltimos6Meses) {
                    label = `${languageParser.MESES_NOMES[mes]} de ${ano}`;
                }
            }

            return { mes, ano, label, isMesPassado, isAnoTodo, isUltimos3Meses, isUltimos6Meses };
        },

        extractValue: (text) => {
            if (!text) return null;
            // Procura padrões como R$ 500, R$500, 500 reais, R$ 1.500,00, 350.50
            const match = text.match(/(?:r\$\s*|reais\s*)?(\d+(?:\.\d{3})*(?:[,\.]\d{1,2})?)(?:\s*reais)?/i);
            if (match && match[1]) {
                let raw = match[1].replace(/\./g, '').replace(',', '.');
                const val = parseFloat(raw);
                if (!isNaN(val) && val > 0) return val;
            }
            return null;
        },

        extractPercentage: (text) => {
            if (!text) return null;
            const match = text.match(/(\d+(?:[,\.]\d+)?)\s*(?:%|por cento)/i);
            if (match && match[1]) {
                const val = parseFloat(match[1].replace(',', '.'));
                if (!isNaN(val) && val > 0) return val;
            }
            return null;
        },

        extractCategory: (text, userCategories = []) => {
            const normText = languageParser.normalize(text || '');
            // 1. Testa categorias do usuário (suporta array de strings ou objetos)
            for (const cat of userCategories) {
                const catNome = (typeof cat === 'string') ? cat : (cat && (cat.nome || cat.name));
                if (!catNome) continue;
                const normCat = languageParser.normalize(catNome);
                if (normText.includes(normCat)) {
                    return catNome;
                }
            }
            // 2. Testa catálogo de sinônimos
            for (const [catOficial, sinonimos] of Object.entries(languageParser.CATEGORIAS_SINONIMOS)) {
                for (const sin of sinonimos) {
                    if (normText.includes(sin)) {
                        return catOficial;
                    }
                }
            }
            return null;
        },

        isFollowUp: (normText) => {
            return (
                normText.startsWith('e no ') ||
                normText.startsWith('e na ') ||
                normText.startsWith('e com ') ||
                normText.startsWith('e de ') ||
                normText.startsWith('e o ') ||
                normText.startsWith('e quanto ') ||
                normText.startsWith('qual foi ') ||
                normText.startsWith('quanto aumentou') ||
                normText.startsWith('quanto subiu') ||
                normText.startsWith('qual a diferenca') ||
                normText.startsWith('qual foi a diferenca') ||
                normText.startsWith('me mostra os detalhes') ||
                normText.startsWith('ver detalhes') ||
                normText.startsWith('e essa categoria') ||
                normText.startsWith('e esse mes') ||
                normText === 'e no mes passado' ||
                normText === 'e no anterior'
            );
        }
    };

    // ======================================================================
    // 2. MÓDULO: contextManager (Memória Conversacional e Resolução de Contexto)
    // ======================================================================
    const contextStore = {};

    const contextManager = {
        getContext: (userId) => {
            if (!contextStore[userId]) {
                contextStore[userId] = {
                    userId,
                    lastIntent: null,
                    lastCategory: null,
                    lastPeriod: null,
                    lastComparativePeriod: null,
                    lastResult: null,
                    lastEntities: {},
                    turnCount: 0,
                    history: []
                };
            }
            return contextStore[userId];
        },

        updateContext: (userId, patch) => {
            const ctx = contextManager.getContext(userId);
            Object.assign(ctx, patch);
            ctx.turnCount += 1;
            return ctx;
        },

        resetContext: (userId) => {
            delete contextStore[userId];
        },

        resolveEllipsis: (normText, context, userCategories) => {
            // Ex: "E no mês passado?", "E no anterior?"
            if (normText.includes('mes passado') || normText.includes('anterior')) {
                const mesAntPeriod = languageParser.extractPeriod('mes passado');
                return {
                    intent: context.lastIntent || 'GASTO_CATEGORIA',
                    category: context.lastCategory,
                    period: mesAntPeriod,
                    isComparativeFollowUp: false
                };
            }

            // Ex: "Qual foi o aumento?", "Quanto aumentou?", "Qual foi a diferença?"
            if (
                normText.includes('aumento') ||
                normText.includes('aumentou') ||
                normText.includes('diferenca') ||
                normText.includes('variacao') ||
                normText.includes('subiu')
            ) {
                return {
                    intent: 'VARIACAO_CATEGORIA',
                    category: context.lastCategory,
                    period: context.lastPeriod,
                    isComparativeFollowUp: true
                };
            }

            // Ex: "Me mostra os detalhes", "Quais foram esses gastos?", "Ver lançamentos"
            if (
                normText.includes('detalhes') ||
                normText.includes('quais foram') ||
                normText.includes('ver lista') ||
                normText.includes('listar')
            ) {
                return {
                    intent: 'DETALHAMENTO_LANCAMENTOS',
                    category: context.lastCategory,
                    period: context.lastPeriod,
                    isComparativeFollowUp: false
                };
            }

            // Ex: "E com transporte?", "E alimentação?"
            const cat = languageParser.extractCategory(normText, userCategories);
            if (cat && (normText.startsWith('e ') || normText.includes('quanto'))) {
                return {
                    intent: 'GASTO_CATEGORIA',
                    category: cat,
                    period: context.lastPeriod,
                    isComparativeFollowUp: false
                };
            }

            return null;
        },

        clearContext: (userId) => {
            delete contextStore[userId];
        }
    };

    // ======================================================================
    // 3. MÓDULO: intentDetector (Reconhecimento Avançado de Intenções)
    // ======================================================================
    const PERGUNTAS_FORA_DE_ESCOPO = [
        'copa', 'futebol', 'campeonato', 'flamengo', 'corinthians', 'palmeiras', 'neymar', 'messi',
        'capital', 'brasilia', 'presidente', 'politica', 'eleicao', 'governo',
        'piada', 'historia', 'poema', 'musica', 'filme', 'serie', 'cinema',
        'clima', 'tempo', 'previsao do tempo', 'vai chover', 'temperatura',
        'programacao', 'javascript', 'python', 'codigo', 'como programar', 'software',
        'receita de', 'bolo', 'cozinhar', 'alimento saudavel',
        'quem ganhou', 'quem descobriu', 'onde fica', 'quantos anos tem'
    ];

    const INTENCOES = {
        SAUDACAO: 'SAUDACAO',
        DIAGNOSTICO_GERAL: 'DIAGNOSTICO_GERAL',
        SALDO_DISPONIVEL: 'SALDO_DISPONIVEL',
        ORCAMENTO_COMPROMETIDO: 'ORCAMENTO_COMPROMETIDO',
        ONDE_MAIS_GASTEI: 'ONDE_MAIS_GASTEI',
        GASTO_CATEGORIA: 'GASTO_CATEGORIA',
        VARIACAO_CATEGORIA: 'VARIACAO_CATEGORIA',
        ANALISE_COMPARATIVA: 'ANALISE_COMPARATIVA',
        ECONOMIA_OPORTUNIDADES: 'ECONOMIA_OPORTUNIDADES',
        RECEITAS_CONSULTA: 'RECEITAS_CONSULTA',
        CONTAS_PENDENTES: 'CONTAS_PENDENTES',
        SIMULACAO_COMPRA: 'SIMULACAO_COMPRA',
        SIMULACAO_ECONOMIA: 'SIMULACAO_ECONOMIA',
        SIMULACAO_REDUCAO: 'SIMULACAO_REDUCAO',
        METAS_ACOMPANHAMENTO: 'METAS_ACOMPANHAMENTO',
        INVESTIMENTOS_RESUMO: 'INVESTIMENTOS_RESUMO',
        CARTAO_CREDITO: 'CARTAO_CREDITO',
        DETALHAMENTO_LANCAMENTOS: 'DETALHAMENTO_LANCAMENTOS',
        AMBIGUO: 'AMBIGUO',
        FORA_DO_ESCOPO: 'FORA_DO_ESCOPO'
    };

    const intentDetector = {
        detect: (text, normTextParam, context, userCategories = []) => {
            const normText = normTextParam || languageParser.normalize(text || '');
            // 1. Filtro estrito de fora de escopo
            for (const item of PERGUNTAS_FORA_DE_ESCOPO) {
                const reg = new RegExp(`\\b${item}\\b`, 'i');
                if (reg.test(normText)) {
                    // Proteção: não considera fora de escopo se for explicitamente financeiro
                    const isFinancialContext = normText.includes('gasto com cinema') || normText.includes('gastei com jogo');
                    if (!isFinancialContext) {
                        return INTENCOES.FORA_DO_ESCOPO;
                    }
                }
            }

            // 2. Resolução de Continuidade Contextual (Memória)
            if (context && context.lastIntent && languageParser.isFollowUp(normText)) {
                const resolved = contextManager.resolveEllipsis(normText, context, userCategories);
                if (resolved) {
                    return resolved.intent;
                }
            }

            // 3. Saudações e ajuda
            if (
                /^(oi|ola|hey|bom dia|boa tarde|boa noite|ola assistente|oi finapp|ajuda|menu|comecar|quem sou eu|qual meu nome|como me chamo|meu nome)$/i.test(normText) ||
                normText.includes('qual e o meu nome') ||
                normText.includes('qual meu nome') ||
                normText.includes('quem sou eu') ||
                normText.includes('como me chamo')
            ) {
                return INTENCOES.SAUDACAO;
            }

            // 4. Diagnóstico geral / Expressões coloquiais
            // "Cadê meu dinheiro?", "Para onde está indo meu salário?", "Por que não sobra nada?", "Como está minha vida financeira?"
            if (
                normText.includes('cade meu dinheiro') ||
                normText.includes('para onde esta indo') ||
                normText.includes('para onde vai meu salario') ||
                normText.includes('por que nao sobra nada') ||
                normText.includes('porque nao sobra') ||
                normText.includes('nao sobra nada') ||
                normText.includes('vida financeira') ||
                normText.includes('saude financeira') ||
                normText.includes('diagnostico financeiro') ||
                normText.includes('panorama') ||
                normText.includes('resumo geral') ||
                normText.includes('como estou financeiramente')
            ) {
                return INTENCOES.DIAGNOSTICO_GERAL;
            }

            // 5. Simulações de Compra ("Posso comprar algo de R$ 500?")
            if (
                normText.includes('posso comprar') ||
                normText.includes('da para comprar') ||
                normText.includes('consigo comprar') ||
                (normText.includes('posso gastar') && (normText.includes('reais') || normText.includes('r$') || /\d+/.test(normText))) ||
                (normText.includes('cabe no orcamento') && /\d+/.test(normText)) ||
                (normText.includes('se gastar') && /\d+/.test(normText))
            ) {
                return INTENCOES.SIMULACAO_COMPRA;
            }

            // 6. Simulação de Redução percentual ("Se reduzir meus gastos em 10%, quanto economizarei?")
            if (
                (normText.includes('reduzir') || normText.includes('reducao') || normText.includes('cortar') || normText.includes('corte') || normText.includes('diminuir')) &&
                (text.includes('%') || normText.includes('por cento') || normText.includes('economizarei') || normText.includes('quanto economizo') || normText.includes('quanto economizarei') || /\d+/.test(normText))
            ) {
                return INTENCOES.SIMULACAO_REDUCAO;
            }

            // 7. Simulações de Economia / Guardar para atingir objetivo
            if (
                normText.includes('quanto consigo economizar') ||
                normText.includes('quanto posso economizar') ||
                normText.includes('quanto preciso guardar') ||
                normText.includes('quanto sobra ate') ||
                normText.includes('para atingir') ||
                normText.includes('se continuar gastando')
            ) {
                return INTENCOES.SIMULACAO_ECONOMIA;
            }

            // 8. Análise Comparativa explícita ("Comparar este mês com o anterior", "Últimos 3 meses", "Evolução")
            if (
                normText.includes('comparar') ||
                normText.includes('comparativo') ||
                normText.includes('ultimos 3 meses') ||
                normText.includes('ultimos 6 meses') ||
                normText.includes('evolucao dos gastos') ||
                normText.includes('evolucao das despesas')
            ) {
                return INTENCOES.ANALISE_COMPARATIVA;
            }

            // 9. Onde economizar e oportunidades
            if (
                normText.includes('onde economizar') ||
                normText.includes('onde preciso economizar') ||
                normText.includes('como gastar menos') ||
                normText.includes('posso gastar menos') ||
                normText.includes('gastar menos') ||
                normText.includes('onde posso cortar') ||
                normText.includes('cortar gastos') ||
                normText.includes('o que posso melhorar') ||
                normText.includes('dicas para economizar') ||
                normText.includes('oportunidades de economia') ||
                normText.includes('estou gastando muito') ||
                normText.includes('despesas aumentaram')
            ) {
                return INTENCOES.ECONOMIA_OPORTUNIDADES;
            }

            // 10. Gasto com categoria específica ("Quanto gastei com alimentação?")
            if (
                (normText.includes('quanto gastei com') || normText.includes('quanto gastei em') || normText.includes('gasto com') || normText.includes('gastos com') || normText.includes('despesa com')) &&
                !normText.includes('onde mais')
            ) {
                return INTENCOES.GASTO_CATEGORIA;
            }

            // 11. Onde mais gastei / Maiores despesas
            if (
                normText.includes('onde mais gastei') ||
                normText.includes('onde mais gastei este mes') ||
                normText.includes('onde foi parar meu dinheiro') ||
                normText.includes('maior despesa') ||
                normText.includes('maior gasto') ||
                normText.includes('maiores gastos') ||
                normText.includes('quais categorias estao consumindo') ||
                normText.includes('quais categorias gastam mais') ||
                normText.includes('viloes do orcamento') ||
                normText.includes('vilao do orcamento') ||
                normText.includes('gastos por categoria') ||
                normText.includes('minhas despesas')
            ) {
                return INTENCOES.ONDE_MAIS_GASTEI;
            }

            // 12. Contas a pagar e pendências
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

            // 13. Orçamento e comprometimento
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

            // 14. Saldo disponível
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

            // 15. Receitas
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

            // 16. Metas
            if (normText.includes('meta') || normText.includes('metas') || normText.includes('objetivo financeiro')) {
                return INTENCOES.METAS_ACOMPANHAMENTO;
            }

            // 17. Investimentos
            if (normText.includes('investimento') || normText.includes('investimentos') || normText.includes('patrimonio') || normText.includes('rendeu') || normText.includes('carteira')) {
                return INTENCOES.INVESTIMENTOS_RESUMO;
            }

            // 18. Cartões
            if (normText.includes('cartao') || normText.includes('fatura') || normText.includes('limite do cartao')) {
                return INTENCOES.CARTAO_CREDITO;
            }

            // Termos financeiros genéricos caem em Diagnóstico Geral
            const termosFinanceiros = ['gasto', 'gastos', 'despesa', 'despesas', 'dinheiro', 'conta', 'pagamento', 'pagar', 'economia', 'economizar', 'sobra', 'lucro', 'guardar'];
            if (termosFinanceiros.some(t => normText.includes(t))) {
                return INTENCOES.DIAGNOSTICO_GERAL;
            }

            // Fora de escopo padrão
            return INTENCOES.FORA_DO_ESCOPO;
        }
    };

    // ======================================================================
    // 4. MÓDULO: financialEngine (Consultas Seguras ao Supabase e Cálculos)
    // ======================================================================
    const financialEngine = {
        fetchUserData: async () => {
            if (!window.Auth || !window.Auth.user) {
                return null;
            }

            const k = (typeof KEYS !== 'undefined' && KEYS) || (window.KEYS) || {
                LANCAMENTOS: 'lancamentos',
                CONTAS: 'contas',
                BANK_ACCOUNTS: 'bank_accounts',
                BANK_CONNECTIONS: 'bank_connections',
                METAS: 'metas',
                INVESTIMENTOS: 'investimentos',
                CARTOES: 'cartoes',
                CATEGORIAS: 'categorias'
            };

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
                Store.get(k.LANCAMENTOS) || [],
                Store.get(k.CONTAS) || [],
                Store.get(k.BANK_ACCOUNTS) || [],
                Store.get(k.BANK_CONNECTIONS) || [],
                Store.get(k.METAS) || [],
                Store.get(k.INVESTIMENTOS) || [],
                Store.get(k.CARTOES) || [],
                Store.get(k.CATEGORIAS) || []
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
        },

        computePeriodMetrics: (dados, periodo) => {
            const { lancamentos, contas, bankAccounts, user } = dados;

            // Filtro de Lançamentos
            const lancamentosPeriodo = lancamentos.filter(l => {
                if (!l.data) return false;
                if (l.categoria === 'Transferência Interna') return false; // neutraliza transferência entre contas
                const dt = new Date(l.data + 'T00:00:00');

                if (periodo.isUltimos3Meses) {
                    const hoje = new Date();
                    const limite = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
                    return dt >= limite && dt <= hoje;
                }
                if (periodo.isUltimos6Meses) {
                    const hoje = new Date();
                    const limite = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
                    return dt >= limite && dt <= hoje;
                }
                if (periodo.isAnoTodo) {
                    return dt.getFullYear() === periodo.ano;
                }
                return dt.getMonth() === periodo.mes && dt.getFullYear() === periodo.ano;
            });

            let receitas = 0;
            let despesas = 0;
            let despesasParaSaldo = 0;
            const despesasPorCat = {};
            const receitasPorCat = {};
            const lancamentosDespesa = [];

            lancamentosPeriodo.forEach(l => {
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

            // Contas a Pagar no período
            const contasPeriodo = contas.filter(c => {
                if (!c.vencimento) return false;
                const dt = new Date(c.vencimento + 'T00:00:00');
                if (periodo.isAnoTodo) return dt.getFullYear() === periodo.ano;
                return dt.getMonth() === periodo.mes && dt.getFullYear() === periodo.ano;
            });

            let contasPagas = 0;
            let contasPendentes = 0;
            const listaContasPendentes = [];

            contasPeriodo.forEach(c => {
                const val = parseFloat(c.valor) || 0;
                if (c.pago) {
                    contasPagas += val;
                } else {
                    contasPendentes += val;
                    listaContasPendentes.push(c);
                }
            });

            listaContasPendentes.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

            // Saldo Bancário Consolidado (Open Finance)
            const isCreditCard = (acc) => {
                if (!acc) return false;
                if (acc.type === 'CREDIT' || acc.subtype === 'CREDIT_CARD') return true;
                const name = (acc.name || '').toLowerCase();
                return name.includes('gold') || name.includes('cartão') || name.includes('credit card');
            };

            let saldoBancarioTotal = 0;
            let temBancosConectados = false;
            if (bankAccounts && bankAccounts.length > 0) {
                const contasCorrentes = bankAccounts.filter(a => !isCreditCard(a));
                temBancosConectados = contasCorrentes.length > 0;
                contasCorrentes.forEach(acc => {
                    saldoBancarioTotal += (parseFloat(acc.balance_available) || parseFloat(acc.balance_current) || 0);
                });
            }

            // Saldo operacional líquido
            const saldoCalculado = receitas - despesasParaSaldo;
            const saldoBase = temBancosConectados ? saldoBancarioTotal : saldoCalculado;
            const saldoLivreDisponivel = saldoBase - contasPendentes;

            // Renda informada ou estimada
            const rendaOnboarding = parseFloat(user?.user_metadata?.onboarding_data?.income) || 0;
            const orcamentoReferencia = rendaOnboarding > 0 ? rendaOnboarding : receitas;
            const taxaComprometimento = orcamentoReferencia > 0 ? ((despesas / orcamentoReferencia) * 100).toFixed(1) : 0;
            const taxaEconomia = receitas > 0 ? (((receitas - despesas) / receitas) * 100).toFixed(1) : 0;

            // Ranking de categorias
            const rankingCategorias = Object.entries(despesasPorCat)
                .map(([categoria, total]) => ({
                    categoria,
                    total,
                    percentual: despesas > 0 ? ((total / despesas) * 100).toFixed(1) : 0
                }))
                .sort((a, b) => b.total - a.total);

            // Maior despesa
            lancamentosDespesa.sort((a, b) => (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0));
            const maiorDespesaIndividual = lancamentosDespesa[0] || null;

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
                qtdLancamentos: lancamentosPeriodo.length,
                lancamentosFiltrados: lancamentosPeriodo
            };
        }
    };

    // ======================================================================
    // 5. MÓDULO: financialAnalyzer (Identificação de Padrões e Comparações)
    // ======================================================================
    const financialAnalyzer = {
        comparePeriods: (dados, periodoA, periodoB) => {
            const metricsA = financialEngine.computePeriodMetrics(dados, periodoA);
            const metricsB = financialEngine.computePeriodMetrics(dados, periodoB);

            const diffDespesas = metricsA.despesas - metricsB.despesas;
            const pctVarDespesas = metricsB.despesas > 0 ? ((diffDespesas / metricsB.despesas) * 100).toFixed(1) : 0;

            const diffReceitas = metricsA.receitas - metricsB.receitas;
            const pctVarReceitas = metricsB.receitas > 0 ? ((diffReceitas / metricsB.receitas) * 100).toFixed(1) : 0;

            return {
                periodoA,
                periodoB,
                metricsA,
                metricsB,
                diffDespesas,
                pctVarDespesas,
                diffReceitas,
                pctVarReceitas,
                isAumentoDespesas: diffDespesas > 0
            };
        },

        compareCategoryAcrossPeriods: (dados, categoria, periodoA, periodoB) => {
            const normCat = languageParser.normalize(categoria);

            const getCatTotal = (periodo) => {
                const metrics = financialEngine.computePeriodMetrics(dados, periodo);
                const item = metrics.rankingCategorias.find(c => languageParser.normalize(c.categoria) === normCat);
                return item ? item.total : 0;
            };

            const totalA = getCatTotal(periodoA);
            const totalB = getCatTotal(periodoB);
            const diff = totalA - totalB;
            const pctVar = totalB > 0 ? ((diff / totalB) * 100).toFixed(2) : (totalA > 0 ? 100 : 0);

            return {
                categoria,
                periodoA,
                periodoB,
                totalA,
                totalB,
                diff,
                pctVar,
                isAumento: diff > 0
            };
        },

        analyzeCategoryEvolution: (dados, categoria, qtdMeses = 3) => {
            const hoje = new Date();
            const historico = [];
            const normCat = languageParser.normalize(categoria);

            for (let i = qtdMeses - 1; i >= 0; i--) {
                let m = hoje.getMonth() - i;
                let a = hoje.getFullYear();
                if (m < 0) {
                    m += 12;
                    a -= 1;
                }
                const p = { mes: m, ano: a, label: `${languageParser.MESES_NOMES[m]} de ${a}` };
                const metrics = financialEngine.computePeriodMetrics(dados, p);
                const item = metrics.rankingCategorias.find(c => languageParser.normalize(c.categoria) === normCat);
                historico.push({
                    periodo: p,
                    total: item ? item.total : 0
                });
            }

            return historico;
        }
    };

    // ======================================================================
    // 6. MÓDULO: recommendationEngine (Geração de Recomendações Baseadas em Dados)
    // ======================================================================
    const recommendationEngine = {
        generate: (dados, metrics) => {
            const recomendacoes = [];

            // 1. Categoria com peso expressivo (> 30% dos gastos)
            if (metrics.rankingCategorias.length > 0) {
                const topCat = metrics.rankingCategorias[0];
                if (parseFloat(topCat.percentual) >= 30) {
                    recomendacoes.push({
                        tipo: 'concentracao',
                        titulo: `Atenção à categoria ${topCat.categoria}`,
                        descricao: `Ela concentra <strong>${topCat.percentual}%</strong> de todas as suas saídas (${financialEngine.formatCurrency(topCat.total)}). Pequenas reduções aqui trarão impacto imediato.`,
                        impacto: 'alto'
                    });
                }
            }

            // 2. Contas pendentes a pagar
            if (metrics.contasPendentes > 0) {
                recomendacoes.push({
                    tipo: 'contas',
                    titulo: 'Compromissos a vencer',
                    descricao: `Você possui <strong>${financialEngine.formatCurrency(metrics.contasPendentes)}</strong> em contas a pagar pendentes para ${metrics.periodo.label}. Reserve esse montante antes de efetuar novos gastos.`,
                    impacto: 'alto'
                });
            }

            // 3. Comparativo com mês anterior
            let mesAnt = metrics.periodo.mes === 0 ? 11 : metrics.periodo.mes - 1;
            let anoAnt = metrics.periodo.mes === 0 ? metrics.periodo.ano - 1 : metrics.periodo.ano;
            const periodoAnt = { mes: mesAnt, ano: anoAnt, label: `${languageParser.MESES_NOMES[mesAnt]} de ${anoAnt}` };
            const comp = financialAnalyzer.comparePeriods(dados, metrics.periodo, periodoAnt);

            if (comp.metricsB.despesas > 0 && comp.isAumentoDespesas && parseFloat(comp.pctVarDespesas) > 10) {
                recomendacoes.push({
                    tipo: 'aumento_gastos',
                    titulo: `Aumento de ${comp.pctVarDespesas}% nas despesas`,
                    descricao: `Seus gastos subiram <strong>${financialEngine.formatCurrency(comp.diffDespesas)}</strong> em relação a ${comp.periodoB.label}. Vale auditar seus lançamentos para conter o avanço.`,
                    impacto: 'medio'
                });
            }

            // 4. Margem de poupança (Regra 15%)
            if (metrics.receitas > 0) {
                const meta15 = metrics.receitas * 0.15;
                if (metrics.saldoLivreDisponivel >= meta15) {
                    recomendacoes.push({
                        tipo: 'meta_poupanca',
                        titulo: 'Capacidade de Poupança Positiva',
                        descricao: `Você consegue guardar até <strong>${financialEngine.formatCurrency(meta15)}</strong> (15% da sua renda) sem comprometer suas contas essenciais deste mês.`,
                        impacto: 'positivo'
                    });
                } else if (metrics.saldoLivreDisponivel < 0) {
                    recomendacoes.push({
                        tipo: 'deficit',
                        titulo: 'Alerta de Déficit no Período',
                        descricao: `Suas despesas e contas pendentes superam suas receitas em <strong>${financialEngine.formatCurrency(Math.abs(metrics.saldoLivreDisponivel))}</strong>. Recomendamos adiar despesas não essenciais.`,
                        impacto: 'critico'
                    });
                }
            }

            return recomendacoes;
        },

        getProactiveInsights: (dados) => {
            const hoje = new Date();
            const periodoAtual = { mes: hoje.getMonth(), ano: hoje.getFullYear(), label: `${languageParser.MESES_NOMES[hoje.getMonth()]} de ${hoje.getFullYear()}` };
            const metrics = financialEngine.computePeriodMetrics(dados, periodoAtual);
            return recommendationEngine.generate(dados, metrics);
        }
    };

    // Helper de moeda anexado ao financialEngine
    financialEngine.formatCurrency = (val) => {
        return window.App ? App.formatCurrency(val) : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    // ======================================================================
    // 7. MÓDULO: financialPlanner (Simulador de Compras, Metas e Economia)
    // ======================================================================
    const financialPlanner = {
        simulatePurchase: (metrics, valorCompra) => {
            const saldoLivreAtual = metrics.saldoLivreDisponivel;
            const saldoAposCompra = saldoLivreAtual - valorCompra;
            const viavel = saldoAposCompra >= 0;
            const comprometeReserva = viavel && (saldoAposCompra < metrics.receitas * 0.1);

            return {
                valorCompra,
                saldoLivreAtual,
                saldoAposCompra,
                viavel,
                comprometeReserva,
                premissas: `Considera receitas computadas (${financialEngine.formatCurrency(metrics.receitas)}), despesas pagas (${financialEngine.formatCurrency(metrics.despesas)}) e contas pendentes a vencer (${financialEngine.formatCurrency(metrics.contasPendentes)}).`
            };
        },

        simulateSavings: (metrics, qtdMeses = 6, taxaCortePercentual = 0) => {
            const sobraAtual = Math.max(0, metrics.receitas - metrics.despesas);
            const corteExtra = (metrics.despesas * (taxaCortePercentual / 100));
            const sobraOtimizada = sobraAtual + corteExtra;
            const acumuladoBase = sobraAtual * qtdMeses;
            const acumuladoOtimizado = sobraOtimizada * qtdMeses;

            return {
                qtdMeses,
                taxaCortePercentual,
                sobraAtual,
                corteExtra,
                acumuladoBase,
                acumuladoOtimizado,
                premissas: `Cálculo baseado no saldo médio operacional mensal sem criação de novas despesas atípicas.`
            };
        },

        simulateTargetGoal: (metas, valorAlvo, prazoMeses = 12) => {
            const parcelas = valorAlvo / Math.max(1, prazoMeses);
            return {
                valorAlvo,
                prazoMeses,
                parcelas,
                premissas: `Guardando ${financialEngine.formatCurrency(parcelas)} por mês durante ${prazoMeses} meses para atingir ${financialEngine.formatCurrency(valorAlvo)}.`
            };
        }
    };

    // ======================================================================
    // 8. MÓDULO: responseGenerator (Geração de Respostas Humanizadas e Visuais)
    // ======================================================================
    const responseGenerator = {
        saudacao: (userName) => {
            const cumprimentos = [
                `👋 Olá, <strong>${userName}</strong>! Sou o <strong>FinApp Intelligence Expert</strong>, seu consultor financeiro pessoal.`,
                `Olá, <strong>${userName}</strong>! Pronto para analisarmos suas finanças com profundidade hoje?`,
                `Que bom ter você aqui, <strong>${userName}</strong>! Seus números estão atualizados e prontos para consulta.`
            ];
            const msg = cumprimentos[Math.floor(Math.random() * cumprimentos.length)];

            return `
                <div class="ia-response-box">
                    <p>${msg}</p>
                    <p style="margin-top: 10px;">Como seu consultor, posso calcular seu <strong>saldo livre</strong>, <strong>comparar despesas entre meses</strong>, <strong>simular compras e economias</strong> ou auditar suas <strong>contas a pagar</strong>.</p>
                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto ainda posso gastar este mês?')">💰 Quanto posso gastar?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde mais gastei este mês?')">📊 Onde mais gastei?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Como está minha situação financeira?')">⚖️ Diagnóstico geral</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde preciso economizar?')">🎯 Onde economizar?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quais contas tenho para pagar?')">💳 Contas a pagar</button>
                    </div>
                </div>
            `;
        },

        foraDoEscopo: () => {
            return `
                <div class="ia-response-box">
                    <p>😅 <strong>Desculpe!</strong> Sou o <strong>FinApp Intelligence</strong> e fui desenvolvido para ajudar você a cuidar melhor do seu dinheiro.</p>
                    <p style="margin-top: 10px;">Posso ajudar com <strong>receitas</strong>, <strong>despesas</strong>, <strong>economia</strong>, <strong>orçamento</strong> e <strong>planejamento financeiro</strong>.</p>
                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto ainda posso gastar este mês?')">Quanto ainda posso gastar?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde mais gastei este mês?')">Onde mais gastei?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Como está minha situação financeira?')">Minha situação financeira</button>
                    </div>
                </div>
            `;
        },

        dadosInsuficientes: () => {
            return `
                <div class="ia-response-box">
                    <p>🔍 <strong>Ainda não tenho informações suficientes para realizar essa análise.</strong></p>
                    <p style="margin-top: 10px;">Registre mais movimentações ou conecte suas contas para que eu consiga identificar seu comportamento financeiro com exatidão.</p>
                    <div class="ia-quick-actions" style="margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-sm btn-primary" onclick="App.loadView('lancamentos')"><i class="ph ph-plus"></i> Novo Lançamento</button>
                        <button class="btn btn-sm btn-outline" onclick="App.loadView('contas')"><i class="ph ph-calendar-check"></i> Contas a Pagar</button>
                        <button class="btn btn-sm btn-outline" onclick="App.loadView('conexoes')"><i class="ph ph-bank"></i> Conectar Banco</button>
                    </div>
                </div>
            `;
        },

        diagnosticoGeral: (metrics, recommendations) => {
            const livre = metrics.saldoLivreDisponivel;
            const isPositivo = livre >= 0;

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph-fill ph-stethoscope"></i> Diagnóstico Financeiro Completo (${metrics.periodo.label})
                    </div>

                    <p>
                        ${isPositivo 
                            ? `Seu balanço em <strong>${metrics.periodo.label}</strong> é favorável. Suas receitas cobrem as despesas e você mantém uma margem de segurança de <strong>${financialEngine.formatCurrency(livre)}</strong>.`
                            : `Atenção ao fechamento de <strong>${metrics.periodo.label}</strong>: seus compromissos somados superam suas entradas em <strong>${financialEngine.formatCurrency(Math.abs(livre))}</strong>.`
                        }
                    </p>

                    <div class="grid grid-2" style="gap: 10px; margin: 16px 0;">
                        <div class="ia-mini-card">
                            <span class="text-muted" style="font-size: 11px;">Receitas Efetivas</span>
                            <strong class="text-success" style="font-size: 16px;">${financialEngine.formatCurrency(metrics.receitas)}</strong>
                        </div>
                        <div class="ia-mini-card">
                            <span class="text-muted" style="font-size: 11px;">Despesas Efetivas</span>
                            <strong class="text-danger" style="font-size: 16px;">${financialEngine.formatCurrency(metrics.despesas)}</strong>
                        </div>
                        <div class="ia-mini-card">
                            <span class="text-muted" style="font-size: 11px;">Boletos a Vencer</span>
                            <strong class="text-warning" style="font-size: 16px;">${financialEngine.formatCurrency(metrics.contasPendentes)}</strong>
                        </div>
                        <div class="ia-mini-card">
                            <span class="text-muted" style="font-size: 11px;">Saldo Livre Real</span>
                            <strong class="${isPositivo ? 'text-primary' : 'text-danger'}" style="font-size: 16px;">${financialEngine.formatCurrency(livre)}</strong>
                        </div>
                    </div>

                    ${recommendations.length > 0 ? `
                        <div class="ia-tip-card">
                            <i class="ph ph-lightbulb text-warning"></i>
                            <div>
                                <strong>Observação do Consultor:</strong> ${recommendations[0].descricao}
                            </div>
                        </div>
                    ` : ''}

                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde mais gastei este mês?')">Onde mais gastei?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde preciso economizar?')">Onde economizar?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quais contas tenho para pagar?')">Quais contas a vencer?</button>
                    </div>
                </div>
            `;
        },

        saldoDisponivel: (metrics) => {
            const livre = metrics.saldoLivreDisponivel;
            const isPositivo = livre >= 0;

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-wallet"></i> Saldo & Disponibilidade (${metrics.periodo.label})
                    </div>

                    <div class="ia-kpi-card ${isPositivo ? 'status-positive' : 'status-negative'}">
                        <span class="ia-kpi-title">Limite Seguro para Gastar</span>
                        <span class="ia-kpi-value">${financialEngine.formatCurrency(livre)}</span>
                        <span class="ia-kpi-sub">${isPositivo ? 'Disponível após descontar todas as contas pendentes do período' : 'Compromissos superam suas entradas deste mês'}</span>
                    </div>

                    <div class="ia-breakdown-list">
                        <div class="ia-breakdown-item">
                            <span><i class="ph ph-arrow-circle-down text-success"></i> Receitas recebidas:</span>
                            <strong>${financialEngine.formatCurrency(metrics.receitas)}</strong>
                        </div>
                        <div class="ia-breakdown-item">
                            <span><i class="ph ph-arrow-circle-up text-danger"></i> Despesas já pagas:</span>
                            <strong>${financialEngine.formatCurrency(metrics.despesas)}</strong>
                        </div>
                        <div class="ia-breakdown-item">
                            <span><i class="ph ph-receipt text-warning"></i> Contas pendentes a pagar:</span>
                            <strong class="text-warning">${financialEngine.formatCurrency(metrics.contasPendentes)}</strong>
                        </div>
                        ${metrics.temBancosConectados ? `
                        <div class="ia-breakdown-item" style="border-top: 1px dashed var(--border); padding-top: 8px;">
                            <span><i class="ph ph-bank text-primary"></i> Saldo em contas conectadas:</span>
                            <strong>${financialEngine.formatCurrency(metrics.saldoBancarioTotal)}</strong>
                        </div>
                        ` : ''}
                    </div>

                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quais contas tenho para pagar?')">Ver contas pendentes</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Posso comprar algo de R$ 500?')">Simular compra de R$ 500</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde mais gastei este mês?')">Onde mais gastei?</button>
                    </div>
                </div>
            `;
        },

        gastoCategoria: (categoria, total, pct, periodo, itens = []) => {
            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-tag"></i> Despesas em ${categoria} (${periodo.label})
                    </div>

                    <div class="ia-kpi-card">
                        <span class="ia-kpi-title">Total gasto com ${categoria}</span>
                        <span class="ia-kpi-value text-danger">${financialEngine.formatCurrency(total)}</span>
                        <span class="ia-kpi-sub">${pct > 0 ? `Representa ${pct}% das suas despesas totais no período` : 'Sem registros nesta categoria no período'}</span>
                    </div>

                    ${itens.length > 0 ? `
                        <div style="margin-top: 12px;">
                            <h4 style="font-size: 12px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">Principais Lançamentos:</h4>
                            <div class="ia-breakdown-list">
                                ${itens.slice(0, 4).map(it => `
                                    <div class="ia-breakdown-item">
                                        <span>${it.descricao} <small class="text-muted">(${new Date(it.data + 'T00:00:00').toLocaleDateString('pt-BR')})</small></span>
                                        <strong>${financialEngine.formatCurrency(it.valor)}</strong>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('E no mês passado?')">E no mês passado?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Qual foi o aumento?')">Qual foi a variação?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Me mostra os detalhes')">Ver todos os lançamentos</button>
                    </div>
                </div>
            `;
        },

        variacaoCategoria: (catComp) => {
            const { categoria, periodoA, periodoB, totalA, totalB, diff, pctVar, isAumento } = catComp;

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-trend-up"></i> Variação em ${categoria}
                    </div>

                    <p>
                        ${isAumento 
                            ? `Seus gastos com <strong>${categoria}</strong> aumentaram <strong>${financialEngine.formatCurrency(diff)}</strong> (aproximadamente <strong>${pctVar}%</strong>) em relação a ${periodoB.label}.`
                            : `Boa notícia! Seus gastos com <strong>${categoria}</strong> reduziram <strong>${financialEngine.formatCurrency(Math.abs(diff))}</strong> (${Math.abs(pctVar)}%) comparado a ${periodoB.label}.`
                        }
                    </p>

                    <div class="ia-breakdown-list" style="margin: 14px 0;">
                        <div class="ia-breakdown-item">
                            <span>${periodoA.label}:</span>
                            <strong class="${isAumento ? 'text-danger' : 'text-success'}">${financialEngine.formatCurrency(totalA)}</strong>
                        </div>
                        <div class="ia-breakdown-item">
                            <span>${periodoB.label}:</span>
                            <strong>${financialEngine.formatCurrency(totalB)}</strong>
                        </div>
                        <div class="ia-breakdown-item" style="border-top: 1px dashed var(--border); padding-top: 8px;">
                            <span>Diferença absoluta:</span>
                            <strong class="${isAumento ? 'text-danger' : 'text-success'}">${isAumento ? '+' : ''}${financialEngine.formatCurrency(diff)}</strong>
                        </div>
                    </div>

                    <div class="ia-suggestion-chips" style="margin-top: 12px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde mais gastei este mês?')">Onde mais gastei?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde preciso economizar?')">Onde preciso economizar?</button>
                    </div>
                </div>
            `;
        },

        comparativoMeses: (comp) => {
            const { periodoA, periodoB, metricsA, metricsB, diffDespesas, pctVarDespesas, isAumentoDespesas } = comp;

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-arrows-left-right"></i> Comparativo: ${periodoA.label} vs ${periodoB.label}
                    </div>

                    <p>
                        ${isAumentoDespesas
                            ? `Suas despesas totais subiram <strong>${financialEngine.formatCurrency(diffDespesas)}</strong> (<strong>${pctVarDespesas}%</strong>) na comparação entre os dois períodos.`
                            : `Suas despesas totais diminuíram <strong>${financialEngine.formatCurrency(Math.abs(diffDespesas))}</strong> (<strong>${Math.abs(pctVarDespesas)}%</strong>). Excelente evolução!`
                        }
                    </p>

                    <div class="grid grid-2" style="gap: 10px; margin: 16px 0;">
                        <div class="ia-mini-card">
                            <span class="text-muted" style="font-size: 11px;">Despesas em ${periodoA.label}</span>
                            <strong class="${isAumentoDespesas ? 'text-danger' : 'text-success'}" style="font-size: 16px;">${financialEngine.formatCurrency(metricsA.despesas)}</strong>
                        </div>
                        <div class="ia-mini-card">
                            <span class="text-muted" style="font-size: 11px;">Despesas em ${periodoB.label}</span>
                            <strong style="font-size: 16px;">${financialEngine.formatCurrency(metricsB.despesas)}</strong>
                        </div>
                    </div>

                    <div class="ia-tip-card">
                        <i class="ph ph-info text-primary"></i>
                        <small>
                            <strong>Observação metodológica:</strong> Comparação entre os lançamentos registrados de cada período. Caso um dos meses esteja em curso, a projeção reflete o volume acumulado até o momento.
                        </small>
                    </div>

                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde mais gastei este mês?')">Ver maiores gastos</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde preciso economizar?')">Onde economizar?</button>
                    </div>
                </div>
            `;
        },

        simulacaoCompra: (sim) => {
            const { valorCompra, saldoLivreAtual, saldoAposCompra, viavel, comprometeReserva, premissas } = sim;

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph-fill ph-calculator"></i> Simulação de Compra: ${financialEngine.formatCurrency(valorCompra)}
                    </div>

                    <p>
                        ${viavel
                            ? (comprometeReserva 
                                ? `⚠️ <strong>A compra é viável, mas exige cautela.</strong> Seu saldo livre cobre o valor, porém restará pouca folga de emergência.`
                                : `✅ <strong>Sim, você pode realizar essa compra tranquilamente!</strong> Seu limite seguro de gastos comporta este valor com folga.`)
                            : `🚨 <strong>Não é recomendável comprar agora.</strong> Essa despesa ultrapassa seu limite disponível e poderá gerar endividamento.`
                        }
                    </p>

                    <div class="ia-simulation-box" style="margin: 16px 0;">
                        <div class="ia-sim-row">
                            <span>Saldo livre atual (após contas pendentes):</span>
                            <strong>${financialEngine.formatCurrency(saldoLivreAtual)}</strong>
                        </div>
                        <div class="ia-sim-row">
                            <span>Valor da compra simulada:</span>
                            <strong class="text-danger">- ${financialEngine.formatCurrency(valorCompra)}</strong>
                        </div>
                        <div class="ia-sim-row total" style="border-top: 1px solid var(--border); padding-top: 8px; margin-top: 8px;">
                            <span>Sobra livre projetada:</span>
                            <strong class="${viavel ? 'text-success' : 'text-danger'}">${financialEngine.formatCurrency(saldoAposCompra)}</strong>
                        </div>
                    </div>

                    <div class="ia-tip-card">
                        <i class="ph ph-shield-check text-primary"></i>
                        <small><strong>Premissas:</strong> ${premissas}</small>
                    </div>

                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Se gastar R$ 300 hoje quanto sobrará?')">Simular R$ 300</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto consigo economizar até dezembro?')">Projeção até dezembro</button>
                    </div>
                </div>
            `;
        },

        simulacaoReducao: (sim, despesasTotais) => {
            const { taxaCortePercentual, corteExtra } = sim;
            const economiaAnual = corteExtra * 12;

            return `
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph-fill ph-scissors"></i> Simulação de Redução de ${taxaCortePercentual}%
                    </div>

                    <p>Se você reduzir seus gastos gerais em <strong>${taxaCortePercentual}%</strong>:</p>

                    <div class="ia-kpi-card status-positive" style="margin: 14px 0;">
                        <span class="ia-kpi-title">Economia Mensal Adicional</span>
                        <span class="ia-kpi-value text-success">${financialEngine.formatCurrency(corteExtra)}</span>
                        <span class="ia-kpi-sub">Impacto acumulado de <strong>${financialEngine.formatCurrency(economiaAnual)}</strong> em 12 meses</span>
                    </div>

                    <p style="font-size: 13.5px; color: var(--text-muted);">
                        Para atingir esse corte sem perda de qualidade de vida, o caminho mais rápido é ajustar pequenos supérfluos nas suas categorias mais pesadas.
                    </p>

                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde preciso economizar?')">Ver onde cortar</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto consigo economizar até dezembro?')">Projeção futura</button>
                    </div>
                </div>
            `;
        }
    };

    // ======================================================================
    // 9. MÓDULO: responseValidator (Validação de Consistência e Regras de Negócio)
    // ======================================================================
    const responseValidator = {
        sanitizeOutput: (html) => {
            if (!html || typeof html !== 'string') {
                return '<div class="ia-response-box"><p>Não foi possível gerar a resposta. Tente novamente.</p></div>';
            }
            // Garante que não há valores 'NaN' ou 'undefined' expostos ao usuário
            return html
                .replace(/R\$\s*NaN/g, 'R$ 0,00')
                .replace(/NaN%/g, '0%')
                .replace(/undefined/g, '');
        }
    };

    // Helper para recuperar nome do usuário com máxima fidelidade ao Perfil (sem usar e-mail)
    const getUserName = (user) => {
        if (typeof window !== 'undefined' && typeof window.getUserDisplayName === 'function') {
            const dName = window.getUserDisplayName();
            if (dName && dName !== 'Usuário') return dName;
        }
        if (typeof Auth !== 'undefined' && typeof Auth.getUserDisplayName === 'function') {
            const dName = Auth.getUserDisplayName();
            if (dName && dName !== 'Usuário') return dName;
        }
        const meta = user?.user_metadata;
        const metaName = meta?.full_name || meta?.name || meta?.nome || meta?.display_name;
        if (metaName && typeof metaName === 'string' && metaName.trim() && !metaName.includes('@')) {
            return metaName.trim();
        }
        try {
            if (typeof localStorage !== 'undefined') {
                const cached = localStorage.getItem('finapp_user_display_name') || localStorage.getItem('finapp_user_name');
                if (cached && cached.trim() && !cached.includes('@')) return cached.trim();
            }
        } catch (e) {}
        try {
            if (typeof document !== 'undefined') {
                const domInput = document.getElementById('nome-usuario');
                if (domInput && domInput.value && domInput.value.trim() && !domInput.value.includes('@')) {
                    return domInput.value.trim();
                }
            }
        } catch (e) {}
        return 'Usuário';
    };

    // ======================================================================
    // 10. ORQUESTRADOR CENTRAL: processarPergunta
    // ======================================================================
    const processarPergunta = async (perguntaOriginal) => {
        const norm = languageParser.normalize(perguntaOriginal);

        // Usuário atual
        const user = window.Auth?.user;
        const userId = user ? user.id : 'anon';
        const context = contextManager.getContext(userId);

        // Carrega dados do usuário autenticado no Supabase
        const dados = await financialEngine.fetchUserData();
        if (!dados) {
            return responseValidator.sanitizeOutput(
                `<div class="ia-response-box"><p>⚠️ Não foi possível identificar sua sessão de usuário. Por favor, faça login novamente no FinApp.</p></div>`
            );
        }

        // 1. Detecta Intenção (incluindo resolução de memória contextual)
        const intencao = intentDetector.detect(perguntaOriginal, norm, context, dados.categorias);

        // Fora do escopo
        if (intencao === INTENCOES.FORA_DO_ESCOPO) {
            return responseValidator.sanitizeOutput(responseGenerator.foraDoEscopo());
        }

        // Saudação
        if (intencao === INTENCOES.SAUDACAO) {
            const userName = getUserName(user);
            return responseValidator.sanitizeOutput(responseGenerator.saudacao(userName));
        }

        // Caso sem movimentações cadastradas
        if (dados.lancamentos.length === 0 && dados.contas.length === 0 && (!dados.bankAccounts || dados.bankAccounts.length === 0)) {
            return responseValidator.sanitizeOutput(responseGenerator.dadosInsuficientes());
        }

        // Extração de período considerando contexto prévio
        const periodo = languageParser.extractPeriod(norm, context.lastPeriod);
        const metrics = financialEngine.computePeriodMetrics(dados, periodo);

        // ------------------------------------------------------------------
        // EXECUÇÃO POR INTENÇÃO
        // ------------------------------------------------------------------

        // A. DIAGNÓSTICO GERAL ("Cadê meu dinheiro?", "Como está minha vida financeira?")
        if (intencao === INTENCOES.DIAGNOSTICO_GERAL) {
            const recs = recommendationEngine.generate(dados, metrics);
            contextManager.updateContext(userId, {
                lastIntent: INTENCOES.DIAGNOSTICO_GERAL,
                lastPeriod: periodo,
                lastResult: metrics
            });
            return responseValidator.sanitizeOutput(responseGenerator.diagnosticoGeral(metrics, recs));
        }

        // B. SALDO DISPONÍVEL ("Quanto ainda posso gastar?")
        if (intencao === INTENCOES.SALDO_DISPONIVEL) {
            contextManager.updateContext(userId, {
                lastIntent: INTENCOES.SALDO_DISPONIVEL,
                lastPeriod: periodo,
                lastResult: metrics
            });
            return responseValidator.sanitizeOutput(responseGenerator.saldoDisponivel(metrics));
        }

        // C. GASTO POR CATEGORIA ESPECÍFICA ("Quanto gastei com alimentação?")
        if (intencao === INTENCOES.GASTO_CATEGORIA) {
            // Tenta identificar categoria na pergunta ou aproveita do contexto
            let catNome = languageParser.extractCategory(norm, dados.categorias) || context.lastCategory;

            if (!catNome) {
                return responseValidator.sanitizeOutput(`
                    <div class="ia-response-box">
                        <p>❓ Não consegui identificar a categoria desejada. Qual categoria você gostaria de analisar?</p>
                        <div class="ia-suggestion-chips" style="margin-top: 10px;">
                            ${(dados.categorias.slice(0, 4)).map(c => `
                                <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto gastei com ${c.nome}?')">${c.nome}</button>
                            `).join('')}
                        </div>
                    </div>
                `);
            }

            const catEncontrada = metrics.rankingCategorias.find(c => languageParser.normalize(c.categoria) === languageParser.normalize(catNome));
            const totalCat = catEncontrada ? catEncontrada.total : 0;
            const pctCat = catEncontrada ? catEncontrada.percentual : 0;

            const itensCat = dados.lancamentos.filter(l => {
                if (!l.data || l.tipo !== 'despesa') return false;
                if (languageParser.normalize(l.categoria) !== languageParser.normalize(catNome)) return false;
                const dt = new Date(l.data + 'T00:00:00');
                if (periodo.isAnoTodo) return dt.getFullYear() === periodo.ano;
                return dt.getMonth() === periodo.mes && dt.getFullYear() === periodo.ano;
            });

            contextManager.updateContext(userId, {
                lastIntent: INTENCOES.GASTO_CATEGORIA,
                lastCategory: catNome,
                lastComparativePeriod: (context.lastPeriod && (context.lastPeriod.mes !== periodo.mes || context.lastPeriod.ano !== periodo.ano)) ? context.lastPeriod : context.lastComparativePeriod,
                lastPeriod: periodo,
                lastResult: { totalCat, pctCat }
            });

            return responseValidator.sanitizeOutput(responseGenerator.gastoCategoria(catNome, totalCat, pctCat, periodo, itensCat));
        }

        // D. VARIAÇÃO / AUMENTO DE CATEGORIA ("Qual foi o aumento?", "Quanto aumentou?")
        if (intencao === INTENCOES.VARIACAO_CATEGORIA) {
            const catNome = context.lastCategory || languageParser.extractCategory(norm, dados.categorias) || (metrics.rankingCategorias[0]?.categoria);

            let perA = periodo;
            let perB;

            if (context.lastComparativePeriod && context.lastPeriod) {
                // Se o usuário alternou períodos na conversa (ex: perguntou Novembro e depois "E no mês passado?")
                const dtA = new Date(context.lastComparativePeriod.ano, context.lastComparativePeriod.mes, 1);
                const dtB = new Date(context.lastPeriod.ano, context.lastPeriod.mes, 1);
                if (dtA > dtB) {
                    perA = context.lastComparativePeriod;
                    perB = context.lastPeriod;
                } else {
                    perA = context.lastPeriod;
                    perB = context.lastComparativePeriod;
                }
            } else {
                let mesAnt = periodo.mes === 0 ? 11 : periodo.mes - 1;
                let anoAnt = periodo.mes === 0 ? periodo.ano - 1 : periodo.ano;
                perB = { mes: mesAnt, ano: anoAnt, label: `${languageParser.MESES_NOMES[mesAnt]} de ${anoAnt}` };
            }

            const catComp = financialAnalyzer.compareCategoryAcrossPeriods(dados, catNome, perA, perB);

            contextManager.updateContext(userId, {
                lastIntent: INTENCOES.VARIACAO_CATEGORIA,
                lastCategory: catNome,
                lastPeriod: perA,
                lastComparativePeriod: perB
            });

            return responseValidator.sanitizeOutput(responseGenerator.variacaoCategoria(catComp));
        }

        // E. ANÁLISE COMPARATIVA ENTRE MESES
        if (intencao === INTENCOES.ANALISE_COMPARATIVA) {
            let mesAnt = periodo.mes === 0 ? 11 : periodo.mes - 1;
            let anoAnt = periodo.mes === 0 ? periodo.ano - 1 : periodo.ano;
            const periodoAnt = { mes: mesAnt, ano: anoAnt, label: `${languageParser.MESES_NOMES[mesAnt]} de ${anoAnt}` };

            const comp = financialAnalyzer.comparePeriods(dados, periodo, periodoAnt);

            contextManager.updateContext(userId, {
                lastIntent: INTENCOES.ANALISE_COMPARATIVA,
                lastPeriod: periodo,
                lastComparativePeriod: periodoAnt
            });

            return responseValidator.sanitizeOutput(responseGenerator.comparativoMeses(comp));
        }

        // F. DETALHAMENTO DE LANÇAMENTOS ("Me mostra os detalhes")
        if (intencao === INTENCOES.DETALHAMENTO_LANCAMENTOS) {
            const catNome = context.lastCategory;
            const itens = dados.lancamentos.filter(l => {
                if (!l.data) return false;
                if (catNome && languageParser.normalize(l.categoria) !== languageParser.normalize(catNome)) return false;
                const dt = new Date(l.data + 'T00:00:00');
                if (periodo.isAnoTodo) return dt.getFullYear() === periodo.ano;
                return dt.getMonth() === periodo.mes && dt.getFullYear() === periodo.ano;
            });

            return responseValidator.sanitizeOutput(`
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-list-magnifying-glass"></i> Detalhamento de Lançamentos ${catNome ? `(${catNome})` : ''} - ${periodo.label}
                    </div>

                    ${itens.length > 0 ? `
                        <div class="ia-breakdown-list" style="margin: 12px 0;">
                            ${itens.slice(0, 10).map(it => `
                                <div class="ia-breakdown-item">
                                    <div>
                                        <strong>${it.descricao}</strong>
                                        <div style="font-size: 11px; color: var(--text-muted);">${new Date(it.data + 'T00:00:00').toLocaleDateString('pt-BR')} • ${it.categoria} (${it.forma})</div>
                                    </div>
                                    <strong class="${it.tipo === 'receita' ? 'text-success' : 'text-danger'}">${it.tipo === 'receita' ? '+' : '-'}${financialEngine.formatCurrency(it.valor)}</strong>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>Nenhum lançamento específico encontrado para este período.</p>'}
                </div>
            `);
        }

        // G. SIMULAÇÃO DE COMPRA ("Posso comprar algo de R$ 500?")
        if (intencao === INTENCOES.SIMULACAO_COMPRA) {
            const valor = languageParser.extractValue(perguntaOriginal) || 500;
            const sim = financialPlanner.simulatePurchase(metrics, valor);

            contextManager.updateContext(userId, {
                lastIntent: INTENCOES.SIMULACAO_COMPRA,
                lastEntities: { valorCompra: valor }
            });

            return responseValidator.sanitizeOutput(responseGenerator.simulacaoCompra(sim));
        }

        // H. SIMULAÇÃO DE REDUÇÃO ("Se reduzir meus gastos em 10%?")
        if (intencao === INTENCOES.SIMULACAO_REDUCAO) {
            const pct = languageParser.extractPercentage(perguntaOriginal) || 10;
            const hoje = new Date();
            const metricsAtual = financialEngine.computePeriodMetrics(dados, { mes: hoje.getMonth(), ano: hoje.getFullYear(), label: `${languageParser.MESES_NOMES[hoje.getMonth()]} de ${hoje.getFullYear()}` });
            const baseMetrics = metricsAtual.despesas > 0 ? metricsAtual : metrics;
            const sim = financialPlanner.simulateSavings(baseMetrics, 12, pct);

            return responseValidator.sanitizeOutput(responseGenerator.simulacaoReducao(sim, baseMetrics.despesas));
        }

        // I. SIMULAÇÃO DE ECONOMIA FUTURA ("Quanto consigo economizar até dezembro?")
        if (intencao === INTENCOES.SIMULACAO_ECONOMIA) {
            const hoje = new Date();
            const mesAtual = hoje.getMonth();
            const mesAlvo = periodo.mes > mesAtual ? periodo.mes : 11;
            const mesesRestantes = Math.max(1, (mesAlvo - mesAtual) + 1);

            const metricsAtual = financialEngine.computePeriodMetrics(dados, { mes: hoje.getMonth(), ano: hoje.getFullYear(), label: `${languageParser.MESES_NOMES[hoje.getMonth()]} de ${hoje.getFullYear()}` });
            const baseMetrics = (metricsAtual.receitas > 0 || metricsAtual.despesas > 0) ? metricsAtual : metrics;
            const sim = financialPlanner.simulateSavings(baseMetrics, mesesRestantes);

            return responseValidator.sanitizeOutput(`
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-trend-up"></i> Projeção de Economia até ${languageParser.MESES_NOMES[mesAlvo]}
                    </div>

                    <p>Mantendo sua taxa média atual de retenção pelos próximos <strong>${mesesRestantes} mês(es)</strong>:</p>

                    <div class="ia-kpi-card status-positive" style="margin: 14px 0;">
                        <span class="ia-kpi-title">Economia Projetada</span>
                        <span class="ia-kpi-value text-success">${financialEngine.formatCurrency(sim.acumuladoBase)}</span>
                        <span class="ia-kpi-sub">Média estimada de ${financialEngine.formatCurrency(sim.sobraAtual)} poupados por mês</span>
                    </div>

                    <div class="ia-tip-card">
                        <i class="ph ph-lightbulb text-primary"></i>
                        <small><strong>Estratégia:</strong> Se você aplicar um corte de apenas 10% em gastos supérfluos, essa economia saltará para <strong>${financialEngine.formatCurrency(sim.acumuladoBase + (metrics.despesas * 0.1 * mesesRestantes))}</strong>.</small>
                    </div>

                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Se reduzir meus gastos em 10%, quanto economizarei?')">Simular corte de 10%</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde preciso economizar?')">Onde economizar?</button>
                    </div>
                </div>
            `);
        }

        // J. ONDE MAIS GASTEI
        if (intencao === INTENCOES.ONDE_MAIS_GASTEI) {
            if (metrics.rankingCategorias.length === 0) {
                return responseValidator.sanitizeOutput(`
                    <div class="ia-response-box">
                        <p>Não encontrei registros de despesas em <strong>${metrics.periodo.label}</strong>.</p>
                    </div>
                `);
            }

            const topCat = metrics.rankingCategorias[0];

            contextManager.updateContext(userId, {
                lastIntent: INTENCOES.ONDE_MAIS_GASTEI,
                lastCategory: topCat.categoria,
                lastPeriod: periodo
            });

            return responseValidator.sanitizeOutput(`
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-chart-pie"></i> Maiores Gastos (${metrics.periodo.label})
                    </div>

                    <p>Em <strong>${metrics.periodo.label}</strong>, você registrou um total de <strong>${financialEngine.formatCurrency(metrics.despesas)}</strong> em despesas.</p>
                    <p style="margin-top: 4px;">A categoria com maior impacto é <strong>${topCat.categoria}</strong>, respondendo por <strong>${topCat.percentual}%</strong> de todas as saídas.</p>

                    <div class="ia-categories-ranking" style="margin: 16px 0;">
                        ${metrics.rankingCategorias.slice(0, 5).map((c, i) => `
                            <div class="ia-rank-row">
                                <div class="ia-rank-info">
                                    <span class="ia-rank-num">#${i + 1}</span>
                                    <span class="ia-rank-name">${c.categoria}</span>
                                    <span class="ia-rank-pct">(${c.percentual}%)</span>
                                </div>
                                <strong class="ia-rank-val">${financialEngine.formatCurrency(c.total)}</strong>
                            </div>
                        `).join('')}
                    </div>

                    ${metrics.maiorDespesaIndividual ? `
                        <div class="ia-tip-card">
                            <i class="ph ph-receipt text-warning"></i>
                            <div>
                                <strong>Maior despesa individual:</strong> "${metrics.maiorDespesaIndividual.descricao}" no valor de <strong>${financialEngine.formatCurrency(metrics.maiorDespesaIndividual.valor)}</strong> em ${new Date(metrics.maiorDespesaIndividual.data + 'T00:00:00').toLocaleDateString('pt-BR')}.
                            </div>
                        </div>
                    ` : ''}

                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto gastei com ${topCat.categoria}?')">Detalhes de ${topCat.categoria}</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('E no mês passado?')">Comparar com mês passado</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde preciso economizar?')">Onde posso economizar?</button>
                    </div>
                </div>
            `);
        }

        // K. CONTAS A PAGAR PENDENTES
        if (intencao === INTENCOES.CONTAS_PENDENTES) {
            if (metrics.listaContasPendentes.length === 0) {
                return responseValidator.sanitizeOutput(`
                    <div class="ia-response-box">
                        <div class="ia-header-badge"><i class="ph ph-check-circle text-success"></i> Contas a Pagar</div>
                        <p>🎉 <strong>Excelente!</strong> Você não possui nenhuma conta pendente para <strong>${metrics.periodo.label}</strong>.</p>
                        <p style="margin-top: 6px; color: var(--text-muted);">Todas as contas cadastradas já constam como quitadas.</p>
                    </div>
                `);
            }

            return responseValidator.sanitizeOutput(`
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-calendar-check text-warning"></i> Contas a Pagar Pendentes (${metrics.periodo.label})
                    </div>

                    <div class="ia-kpi-card status-negative">
                        <span class="ia-kpi-title">Total Pendente</span>
                        <span class="ia-kpi-value text-warning">${financialEngine.formatCurrency(metrics.contasPendentes)}</span>
                        <span class="ia-kpi-sub">${metrics.listaContasPendentes.length} conta(s) a vencer</span>
                    </div>

                    <div class="ia-breakdown-list" style="margin-top: 14px;">
                        ${metrics.listaContasPendentes.map(c => `
                            <div class="ia-breakdown-item">
                                <div>
                                    <strong>${c.nome}</strong>
                                    <div style="font-size: 11px; color: var(--text-muted);">Vencimento: ${new Date(c.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                                </div>
                                <strong class="text-warning">${financialEngine.formatCurrency(c.valor)}</strong>
                            </div>
                        `).join('')}
                    </div>

                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto ainda posso gastar este mês?')">Quanto posso gastar?</button>
                        <button class="ia-chip" onclick="App.loadView('contas')">Gerenciar Contas</button>
                    </div>
                </div>
            `);
        }

        // L. ECONOMIA E OPORTUNIDADES
        if (intencao === INTENCOES.ECONOMIA_OPORTUNIDADES) {
            const recs = recommendationEngine.generate(dados, metrics);

            return responseValidator.sanitizeOutput(`
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-lightbulb"></i> Diagnóstico de Economia (${metrics.periodo.label})
                    </div>

                    <p>Identifiquei os seguintes pontos estratégicos baseados nos seus números reais:</p>

                    <ul class="ia-recommendations-list" style="margin: 16px 0;">
                        ${recs.map(r => `
                            <li>
                                <strong>${r.titulo}:</strong> ${r.descricao}
                            </li>
                        `).join('')}
                    </ul>

                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Se reduzir meus gastos em 10%, quanto economizarei?')">Simular corte de 10%</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto consigo economizar até dezembro?')">Projetar economia futura</button>
                    </div>
                </div>
            `);
        }

        // M. RECEITAS
        if (intencao === INTENCOES.RECEITAS_CONSULTA) {
            const principaisFontes = Object.entries(metrics.receitasPorCat).sort((a, b) => b[1] - a[1]);

            return responseValidator.sanitizeOutput(`
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-hand-coins"></i> Receitas Efetivas (${metrics.periodo.label})
                    </div>

                    <div class="ia-kpi-card status-positive">
                        <span class="ia-kpi-title">Total de Entradas Recebidas</span>
                        <span class="ia-kpi-value text-success">${financialEngine.formatCurrency(metrics.receitas)}</span>
                        <span class="ia-kpi-sub">Lançamentos confirmados no período</span>
                    </div>

                    ${principaisFontes.length > 0 ? `
                        <div class="ia-breakdown-list" style="margin-top: 14px;">
                            ${principaisFontes.map(([cat, val]) => `
                                <div class="ia-breakdown-item">
                                    <span>${cat}</span>
                                    <strong class="text-success">${financialEngine.formatCurrency(val)}</strong>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto ainda posso gastar este mês?')">Ver saldo livre</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Estou gastando mais do que ganho?')">Comprometimento da renda</button>
                    </div>
                </div>
            `);
        }

        // N. ORÇAMENTO COMPROMETIDO
        if (intencao === INTENCOES.ORCAMENTO_COMPROMETIDO) {
            const gastoTotal = metrics.despesas + metrics.contasPendentes;
            const gastaMaisQueGanha = gastoTotal > metrics.receitas;
            const taxa = metrics.receitas > 0 ? ((gastoTotal / metrics.receitas) * 100).toFixed(1) : 0;

            return responseValidator.sanitizeOutput(`
                <div class="ia-response-box">
                    <div class="ia-header-badge">
                        <i class="ph ph-scales"></i> Comprometimento de Renda (${metrics.periodo.label})
                    </div>

                    <p>
                        ${gastaMaisQueGanha 
                            ? `🚨 <strong>Atenção:</strong> Você já comprometeu <strong>${taxa}%</strong> da sua receita neste período, superando suas entradas.`
                            : `✅ <strong>Equilibrado:</strong> Você comprometeu <strong>${taxa}%</strong> da sua renda. Seus compromissos cabem no orçamento.`
                        }
                    </p>

                    <div class="ia-progress-container" style="margin: 16px 0;">
                        <div class="ia-progress-bar">
                            <div class="ia-progress-fill ${gastaMaisQueGanha ? 'bg-danger' : 'bg-primary'}" style="width: ${Math.min(taxa, 100)}%;"></div>
                        </div>
                    </div>

                    <div class="ia-breakdown-list">
                        <div class="ia-breakdown-item">
                            <span>Total de Receitas:</span>
                            <strong>${financialEngine.formatCurrency(metrics.receitas)}</strong>
                        </div>
                        <div class="ia-breakdown-item">
                            <span>Despesas Pagas + Boletos a Vencer:</span>
                            <strong>${financialEngine.formatCurrency(gastoTotal)}</strong>
                        </div>
                        <div class="ia-breakdown-item">
                            <span>Resultado Líquido Projetado:</span>
                            <strong class="${gastaMaisQueGanha ? 'text-danger' : 'text-success'}">${financialEngine.formatCurrency(metrics.receitas - gastoTotal)}</strong>
                        </div>
                    </div>

                    <div class="ia-suggestion-chips" style="margin-top: 14px;">
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde preciso economizar?')">Onde economizar?</button>
                        <button class="ia-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto ainda posso gastar este mês?')">Limite seguro</button>
                    </div>
                </div>
            `);
        }

        // Default: Diagnóstico
        const recsDefault = recommendationEngine.generate(dados, metrics);
        return responseValidator.sanitizeOutput(responseGenerator.diagnosticoGeral(metrics, recsDefault));
    };

    // Obter insights proativos ao carregar o módulo
    const obterInsightsProativos = async () => {
        const dados = await financialEngine.fetchUserData();
        if (!dados) return [];
        return recommendationEngine.getProactiveInsights(dados);
    };

    const resetContext = (userId) => {
        const uid = userId || (Auth.user ? Auth.user.id : 'anon');
        contextManager.resetContext(uid);
    };

    return {
        languageParser,
        contextManager,
        intentDetector,
        financialEngine,
        financialAnalyzer,
        recommendationEngine,
        financialPlanner,
        responseGenerator,
        responseValidator,
        processarPergunta,
        obterInsightsProativos,
        resetContext,
        INTENCOES
    };
})();
