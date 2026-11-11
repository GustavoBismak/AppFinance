// js/open-finance.js — Módulo de Integração Open Finance do FinApp

window.OpenFinance = {
    pluggyScriptLoaded: false,
    clientId: '2bf8fd0b-20ea-4fb0-91bf-637836604d76',
    clientSecret: 'J5zNwFZ3M18npY-XKvHZIf1DDtY0xb1yOGJx0qjfwVs',
    cachedApiKey: null,
    apiKeyExpiresAt: 0,

    // Obtém ou renova automaticamente a API Key válida usando o Client ID e Client Secret
    getValidApiKey: async (forceRefresh = false) => {
        const now = Date.now();

        // 1. Usa chave em memória se ainda válida por pelo menos mais 3 minutos
        if (!forceRefresh && OpenFinance.cachedApiKey && OpenFinance.apiKeyExpiresAt > (now + 180000)) {
            return OpenFinance.cachedApiKey;
        }

        // 2. Tenta pegar chave válida salva no localStorage
        if (!forceRefresh) {
            const storedKey = localStorage.getItem('pluggy_api_key');
            const storedExp = parseInt(localStorage.getItem('pluggy_api_key_exp') || '0', 10);
            if (storedKey && storedExp > (now + 180000)) {
                OpenFinance.cachedApiKey = storedKey;
                OpenFinance.apiKeyExpiresAt = storedExp;
                return storedKey;
            }
        }

        // 3. Renova automaticamente na Pluggy usando as credenciais permanentes (Client ID + Secret)
        try {
            console.log('[OpenFinance] Renovando token de acesso Pluggy com Client Secret...');
            const res = await fetch('https://api.pluggy.ai/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: OpenFinance.clientId,
                    clientSecret: OpenFinance.clientSecret
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Falha na autenticação da Pluggy: ${res.status} ${errText}`);
            }

            const data = await res.json();
            const newKey = data.apiKey;
            // Validade padrão: 2 horas (armazenamos com margem segura de 1h50m)
            const expiresAt = now + (110 * 60 * 1000);

            OpenFinance.cachedApiKey = newKey;
            OpenFinance.apiKeyExpiresAt = expiresAt;
            localStorage.setItem('pluggy_api_key', newKey);
            localStorage.setItem('pluggy_api_key_exp', expiresAt.toString());

            return newKey;
        } catch (err) {
            console.error('[OpenFinance] Erro ao renovar API Key:', err);
            if (OpenFinance.cachedApiKey) return OpenFinance.cachedApiKey;
            throw err;
        }
    },

    // Obtém a API Key ativa
    getApiKey: async () => {
        return await OpenFinance.getValidApiKey();
    },

    // Obtém a classe construtora do SDK Pluggy Connect
    getConstructor: () => {
        return window.PluggyConnect?.default || window.PluggyConnect || window.pluggyConnect;
    },

    // Injeta script com promessa
    loadScript: (url) => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject();
            document.head.appendChild(script);
        });
    },

    // Garante o carregamento do SDK oficial do Pluggy Connect com fallback automático
    loadSdk: async () => {
        if (OpenFinance.getConstructor()) {
            window.OpenFinance.pluggyScriptLoaded = true;
            return;
        }

        const cdnUrls = [
            'https://cdn.jsdelivr.net/npm/pluggy-connect-sdk@latest/dist/main.js',
            'https://cdn.pluggy.ai/pluggy-connect/v2.7.0/pluggy-connect.js',
            'https://unpkg.com/pluggy-connect-sdk@latest/dist/main.js'
        ];

        for (const url of cdnUrls) {
            try {
                await OpenFinance.loadScript(url);
                if (OpenFinance.getConstructor()) {
                    window.OpenFinance.pluggyScriptLoaded = true;
                    return;
                }
            } catch (_) {
                // Tenta próximo CDN
            }
        }

        if (!OpenFinance.getConstructor()) {
            throw new Error('Falha ao carregar o SDK Pluggy Connect. Verifique sua conexão com a internet.');
        }
    },

    // Helper: Mapeamento de Categorias
    mapCategory: (pluggyCat, desc) => {
        const text = ((pluggyCat || '') + ' ' + (desc || '')).toLowerCase();
        if (text.includes('food') || text.includes('restaurante') || text.includes('mercado') || text.includes('supermercado') || text.includes('padaria') || text.includes('ifood') || text.includes('groceries')) {
            return 'Alimentação';
        }
        if (text.includes('transport') || text.includes('uber') || text.includes('99') || text.includes('combustivel') || text.includes('posto') || text.includes('gasolina') || text.includes('estacionamento') || text.includes('pedágio')) {
            return 'Transporte';
        }
        if (text.includes('housing') || text.includes('aluguel') || text.includes('condominio') || text.includes('energia') || text.includes('luz') || text.includes('agua') || text.includes('internet') || text.includes('iptu')) {
            return 'Moradia';
        }
        if (text.includes('health') || text.includes('farmacia') || text.includes('drogaria') || text.includes('hospital') || text.includes('medico') || text.includes('consulta') || text.includes('laboratorio')) {
            return 'Saúde';
        }
        if (text.includes('leisure') || text.includes('cinema') || text.includes('netflix') || text.includes('spotify') || text.includes('viagem') || text.includes('hotel') || text.includes('lazer') || text.includes('show')) {
            return 'Lazer';
        }
        if (text.includes('salary') || text.includes('salario') || text.includes('pro-labore') || text.includes('rendimento') || text.includes('dividend') || text.includes('pagamento recebido')) {
            return 'Renda';
        }
        if (text.includes('tarifa') || text.includes('taxa') || text.includes('iof') || text.includes('anuidade') || text.includes('juros')) {
            return 'Tarifas Bancárias';
        }
        if (text.includes('transfer') || text.includes('ted') || text.includes('doc') || text.includes('transferencia')) {
            return 'Transferência';
        }
        return 'Outros';
    },

    // Inicia o fluxo seguro de conexão bancária
    connectBank: async (options = {}) => {
        const { itemId = null, onSuccess = null, onError = null } = options;

        if (!Auth.user) {
            Toast.error('Você precisa estar logado para conectar uma conta.');
            return;
        }

        try {
            // 1. Mostrar feedback inicial
            Swal.fire({
                title: 'Iniciando Open Finance',
                text: 'Preparando ambiente seguro de conexão bancária...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                background: '#1a1d24',
                color: '#f8f9fa'
            });

            // 2. Carregar SDK se necessário
            await OpenFinance.loadSdk();

            const PluggyConstructor = OpenFinance.getConstructor();
            if (!PluggyConstructor) {
                throw new Error('SDK do Pluggy Connect não inicializou corretamente.');
            }

            let connectToken = null;

            // 3. Tenta obter o token via Edge Function primeiro
            try {
                const session = await supabaseClient.auth.getSession();
                const token = session.data.session?.access_token;

                if (token) {
                    const response = await fetch(`${SUPABASE_URL}/functions/v1/open-finance-connect`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ itemId })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.connectToken) {
                            connectToken = data.connectToken;
                        }
                    }
                }
            } catch (edgeErr) {
                console.warn('[OpenFinance] Edge function indisponível, usando conexão direta...', edgeErr);
            }

            // 4. Fallback imediato se a Edge Function ainda não foi deployada
            if (!connectToken) {
                let apiKey = await OpenFinance.getValidApiKey();
                let pluggyRes = await fetch('https://api.pluggy.ai/connect_token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-KEY': apiKey
                    },
                    body: JSON.stringify(itemId ? { itemId } : { options: { clientUserId: Auth.user.id } })
                });

                // Se a chave expirou, renova forçado com o Client Secret e tenta novamente
                if (pluggyRes.status === 401 || pluggyRes.status === 403) {
                    console.log('[OpenFinance] Token expirado detectado. Renovando com Client Secret...');
                    apiKey = await OpenFinance.getValidApiKey(true);
                    pluggyRes = await fetch('https://api.pluggy.ai/connect_token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-KEY': apiKey
                        },
                        body: JSON.stringify(itemId ? { itemId } : { options: { clientUserId: Auth.user.id } })
                    });
                }

                if (pluggyRes.ok) {
                    const pluggyData = await pluggyRes.json();
                    connectToken = pluggyData.accessToken;
                } else {
                    const errBody = await pluggyRes.text();
                    throw new Error(`Falha ao gerar token na Pluggy: ${pluggyRes.status} ${errBody}`);
                }
            }

            Swal.close();

            // 5. Instanciar e abrir o widget Pluggy Connect
            const pluggyConnect = new PluggyConstructor({
                connectToken: connectToken,
                includeSandbox: true, // Habilita bancos de teste e reais
                onSuccess: async (itemData) => {
                    console.log('[OpenFinance] Conexão concluída com sucesso:', itemData);

                    Swal.fire({
                        title: 'Sincronizando dados...',
                        text: 'Estamos importando suas contas, saldos e movimentações...',
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading(),
                        background: '#1a1d24',
                        color: '#f8f9fa'
                    });

                    // 6. Acionar sincronização (via Edge Function ou Fallback Direto)
                    try {
                        const syncResult = await OpenFinance.sync(itemData.item.id);
                        Swal.fire({
                            icon: 'success',
                            title: 'Conta Conectada!',
                            text: `Sincronização concluída com sucesso. ${syncResult.transactionsSynced || 0} movimentações importadas.`,
                            confirmButtonColor: '#0a9396',
                            background: '#1a1d24',
                            color: '#f8f9fa'
                        });

                        if (onSuccess) onSuccess(itemData);
                        if (App.currentView === 'conexoes') {
                            App.loadView('conexoes');
                        }
                    } catch (syncErr) {
                        console.error('[OpenFinance] Erro pós-conexão:', syncErr);
                        Swal.fire({
                            icon: 'warning',
                            title: 'Conectado com avisos',
                            text: 'Sua conta foi conectada. Os dados já estão salvos no seu painel.',
                            confirmButtonColor: '#0a9396',
                            background: '#1a1d24',
                            color: '#f8f9fa'
                        });
                        if (onSuccess) onSuccess(itemData);
                        if (App.currentView === 'conexoes') {
                            App.loadView('conexoes');
                        }
                    }
                },
                onError: (err) => {
                    console.error('[OpenFinance] Erro no widget:', err);
                    Swal.fire({
                        icon: 'error',
                        title: 'Falha na conexão',
                        text: err.message || 'Ocorreu um problema ao conectar com a instituição financeira.',
                        confirmButtonColor: '#0a9396',
                        background: '#1a1d24',
                        color: '#f8f9fa'
                    });
                    if (onError) onError(err);
                },
                onClose: () => {
                    console.log('[OpenFinance] Widget fechado pelo usuário.');
                }
            });

            pluggyConnect.init();

        } catch (err) {
            console.error('[OpenFinance] Erro connectBank:', err);
            Swal.fire({
                icon: 'error',
                title: 'Não foi possível conectar',
                text: err.message,
                confirmButtonColor: '#0a9396',
                background: '#1a1d24',
                color: '#f8f9fa'
            });
            if (onError) onError(err);
        }
    },

    // Dispara a sincronização real na instituição financeira via Pluggy (PATCH /items/{id})
    triggerItemSync: async (itemId) => {
        let apiKey = await OpenFinance.getValidApiKey();
        let headers = {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey
        };
        try {
            console.log(`[OpenFinance] Disparando PATCH /items/${itemId} na Pluggy para consultar o banco ao vivo...`);
            let res = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({})
            });

            if (res.status === 401 || res.status === 403) {
                apiKey = await OpenFinance.getValidApiKey(true);
                headers['X-API-KEY'] = apiKey;
                res = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({})
                });
            }

            if (!res.ok) {
                const errTxt = await res.text();
                console.warn(`[OpenFinance] Retorno do PATCH item (${res.status}):`, errTxt);
                return false;
            }

            const data = await res.json();
            console.log(`[OpenFinance] Sincronização bancária aceita pela Pluggy! Status atual: ${data.status}`);
            return true;
        } catch (err) {
            console.error('[OpenFinance] Erro no PATCH triggerItemSync:', err);
            return false;
        }
    },

    // Sincronização direta no cliente com conexão bancária em tempo real
    syncDirect: async (itemId, options = {}) => {
        const { forceRemote = true } = options;
        let apiKey = await OpenFinance.getValidApiKey();
        let headers = {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey
        };

        const user = Auth.user;
        if (!user) throw new Error('Usuário não autenticado');

        // 1. Força a Pluggy a se conectar com a instituição financeira (Nubank, BB, etc.) para buscar saldos e extratos frescos
        if (forceRemote) {
            console.log(`[OpenFinance] Solicitando atualização remota com a instituição para o item ${itemId}...`);
            await OpenFinance.triggerItemSync(itemId);

            // Aguarda a sincronização do banco (polling suave de até 8s)
            let attempts = 0;
            const maxAttempts = 4;
            while (attempts < maxAttempts) {
                attempts++;
                await new Promise(r => setTimeout(r, 2000));
                try {
                    const checkRes = await fetch(`https://api.pluggy.ai/items/${itemId}`, { headers });
                    if (checkRes.ok) {
                        const checkData = await checkRes.json();
                        console.log(`[OpenFinance] Polling item ${itemId} (${attempts}/${maxAttempts}): status = ${checkData.status}`);
                        if (checkData.status === 'UPDATED') {
                            console.log(`[OpenFinance] Banco finalizou a sincronização com sucesso!`);
                            break;
                        }
                        if (checkData.status === 'WAITING_USER_INPUT' || checkData.status === 'LOGIN_ERROR') {
                            console.warn(`[OpenFinance] Banco requer ação do usuário: ${checkData.status}`);
                            break;
                        }
                    }
                } catch (_) {}
            }
        }

        // 2. Buscar Item atualizado
        let itemRes = await fetch(`https://api.pluggy.ai/items/${itemId}`, { headers });
        if (itemRes.status === 401 || itemRes.status === 403) {
            apiKey = await OpenFinance.getValidApiKey(true);
            headers['X-API-KEY'] = apiKey;
            itemRes = await fetch(`https://api.pluggy.ai/items/${itemId}`, { headers });
        }
        if (!itemRes.ok) throw new Error(`Erro ao buscar banco: ${itemRes.status}`);
        const itemData = await itemRes.json();

        const connector = itemData.connector || {};
        const institutionName = connector.name || 'Instituição Financeira';
        const institutionLogo = connector.imageUrl || null;
        const institutionColor = connector.primaryColor || null;
        const itemStatus = itemData.status || 'UPDATED';

        // Salvar conexão no banco
        const { data: savedConnection, error: connErr } = await supabaseClient
            .from('bank_connections')
            .upsert({
                user_id: user.id,
                external_item_id: itemId,
                connector_id: connector.id || null,
                institution_name: institutionName,
                institution_logo: institutionLogo,
                institution_color: institutionColor,
                status: itemStatus,
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, external_item_id' })
            .select()
            .single();

        if (connErr) console.warn('[OpenFinance] Erro ao salvar conexão:', connErr);
        let connectionId = savedConnection?.id;
        if (!connectionId) {
            const { data: existingConn } = await supabaseClient
                .from('bank_connections')
                .select('id')
                .eq('user_id', user.id)
                .eq('external_item_id', itemId)
                .maybeSingle();
            connectionId = existingConn?.id;
        }

        // 3. Buscar Contas com saldos frescos em tempo real
        const accRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, { headers });
        if (!accRes.ok) throw new Error(`Erro ao buscar contas: ${accRes.status}`);
        const accData = await accRes.json();
        const accountsList = accData.results || [];

        let totalAcc = 0;
        let totalTx = 0;

        for (const acc of accountsList) {
            totalAcc++;
            const availableBalance = typeof acc.balance === 'number' ? acc.balance : 0;
            const currentBalance = typeof acc.currentBalance === 'number' ? acc.currentBalance : availableBalance;

            let accountRecordId = null;
            if (connectionId) {
                const { data: savedAcc } = await supabaseClient
                    .from('bank_accounts')
                    .upsert({
                        user_id: user.id,
                        bank_connection_id: connectionId,
                        external_account_id: acc.id,
                        type: acc.type || 'BANK',
                        subtype: acc.subtype || null,
                        name: acc.name || 'Conta Corrente',
                        number: acc.number || null,
                        balance_available: availableBalance,
                        balance_current: currentBalance,
                        currency_code: acc.currencyCode || 'BRL',
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'bank_connection_id, external_account_id' })
                    .select()
                    .single();

                accountRecordId = savedAcc?.id;
                if (!accountRecordId) {
                    const { data: existingAcc } = await supabaseClient
                        .from('bank_accounts')
                        .select('id')
                        .eq('bank_connection_id', connectionId)
                        .eq('external_account_id', acc.id)
                        .maybeSingle();
                    accountRecordId = existingAcc?.id;
                }
            }

            // 4. Buscar Transações usando a API v2 da Pluggy com paginação por cursor
            console.log(`[OpenFinance] Buscando transações v2 para conta ${acc.name || acc.id} (ID: ${acc.id})...`);
            let txUrl = `https://api.pluggy.ai/v2/transactions?accountId=${acc.id}&pageSize=50`;
            let txList = [];
            let maxPages = 10;
            let pageNum = 0;

            while (txUrl && pageNum < maxPages) {
                pageNum++;
                try {
                    const txRes = await fetch(txUrl, { headers });
                    if (!txRes.ok) {
                        const errTxt = await txRes.text();
                        console.warn(`[OpenFinance] Falha ao buscar transações v2 (${txRes.status}):`, errTxt);
                        // Tenta fallback para v1 se v2 falhar
                        if (txRes.status === 404 || txRes.status === 410) {
                            console.log(`[OpenFinance] Tentando fallback para API v1 da conta ${acc.id}...`);
                            const v1Res = await fetch(`https://api.pluggy.ai/transactions?accountId=${acc.id}&pageSize=100`, { headers });
                            if (v1Res.ok) {
                                const v1Data = await v1Res.json();
                                const v1List = v1Data.results || v1Data.transactions || [];
                                console.log(`[OpenFinance] API v1 retornou ${v1List.length} transações para conta ${acc.name || acc.id}`);
                                txList.push(...v1List);
                            }
                        }
                        break;
                    }
                    const txData = await txRes.json();
                    console.log(`[OpenFinance] Página ${pageNum} da conta ${acc.name || acc.id}: ${(txData.results || []).length} transações. next: ${txData.next || 'null'}`);
                    if (Array.isArray(txData.results) && txData.results.length > 0) {
                        txList.push(...txData.results);
                    }
                    if (txData.next) {
                        if (txData.next.startsWith('http')) {
                            txUrl = txData.next;
                        } else if (txData.next.startsWith('?')) {
                            txUrl = `https://api.pluggy.ai/v2/transactions${txData.next}`;
                        } else {
                            txUrl = `https://api.pluggy.ai/v2/transactions?${txData.next}`;
                        }
                    } else {
                        txUrl = null;
                    }
                } catch (fetchErr) {
                    console.error('[OpenFinance] Erro de rede ao buscar transações:', fetchErr);
                    break;
                }
            }

            console.log(`[OpenFinance] Total de ${txList.length} transações obtidas para conta ${acc.name || acc.id}`);

            const isCard = acc.subtype === 'CREDIT_CARD' || 
                           acc.type === 'CREDIT' || 
                           (acc.name || '').toLowerCase().includes('gold') || 
                           (acc.name || '').toLowerCase().includes('ourocard') || 
                           (acc.name || '').toLowerCase().includes('cartão') || 
                           (acc.name || '').toLowerCase().includes('cartao');

            // Se for cartão de crédito, salva metadados de limite e vencimento para a aba Cartões
            if (isCard) {
                try {
                    const cardMeta = {
                        accountId: acc.id,
                        name: acc.name,
                        number: acc.number,
                        creditLimit: acc.creditData?.creditLimit || null,
                        availableLimit: acc.creditData?.availableCreditLimit || null,
                        balanceDueDate: acc.creditData?.balanceDueDate || null,
                        balanceCloseDate: acc.creditData?.balanceCloseDate || null,
                        brand: acc.creditData?.brand || null,
                        balance: availableBalance,
                        institutionName: institutionName,
                        institutionLogo: institutionLogo,
                        institutionColor: institutionColor,
                        updatedAt: new Date().toISOString()
                    };
                    localStorage.setItem('of_card_meta_' + acc.id, JSON.stringify(cardMeta));
                    console.log(`[OpenFinance] Metadados de cartão salvos para ${acc.name}:`, cardMeta);
                } catch (metaErr) {
                    console.warn('[OpenFinance] Erro ao salvar cardMeta:', metaErr);
                }
            }

            for (const tx of txList) {
                totalTx++;
                const isCredit = tx.type ? (tx.type === 'CREDIT') : (typeof tx.amount === 'number' && tx.amount > 0);
                const txType = isCredit ? 'receita' : 'despesa';
                const rawAmount = Math.abs(typeof tx.amount === 'number' ? tx.amount : (parseFloat(tx.amount) || 0));
                const txDate = tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0];
                const mappedCat = OpenFinance.mapCategory(tx.category, tx.description);

                const descUpper = (tx.description || '').toUpperCase();
                const isInternalTransfer = descUpper.includes('TRANSF') || 
                                           descUpper.includes('TRANSFERENCIA') || 
                                           descUpper.includes('TED') || 
                                           descUpper.includes('DOC') || 
                                           descUpper.includes('ENTRE CONTAS');

                let savedTxId = null;
                if (accountRecordId) {
                    try {
                        const { data: savedTx, error: txErr } = await supabaseClient
                            .from('bank_transactions')
                            .upsert({
                                user_id: user.id,
                                bank_account_id: accountRecordId,
                                external_id: tx.id,
                                description: tx.description || 'Movimentação Bancária',
                                amount: rawAmount,
                                date: txDate,
                                type: tx.type || (isCredit ? 'CREDIT' : 'DEBIT'),
                                category_raw: tx.category || null,
                                category_normalized: mappedCat,
                                status: tx.status || 'POSTED',
                                is_internal_transfer: isInternalTransfer
                            }, { onConflict: 'bank_account_id, external_id' })
                            .select('id')
                            .maybeSingle();

                        if (txErr) {
                            console.warn('[OpenFinance] Aviso no upsert bank_transaction, aplicando fallback:', txErr.message);
                            const { data: existingTx } = await supabaseClient
                                .from('bank_transactions')
                                .select('id')
                                .eq('bank_account_id', accountRecordId)
                                .eq('external_id', tx.id)
                                .maybeSingle();

                            if (existingTx) {
                                savedTxId = existingTx.id;
                            } else {
                                const { data: newTx } = await supabaseClient.from('bank_transactions').insert([{
                                    user_id: user.id,
                                    bank_account_id: accountRecordId,
                                    external_id: tx.id,
                                    description: tx.description || 'Movimentação Bancária',
                                    amount: rawAmount,
                                    date: txDate,
                                    type: tx.type || (isCredit ? 'CREDIT' : 'DEBIT'),
                                    category_raw: tx.category || null,
                                    category_normalized: mappedCat,
                                    status: tx.status || 'POSTED',
                                    is_internal_transfer: isInternalTransfer
                                }]).select('id').maybeSingle();
                                if (newTx) savedTxId = newTx.id;
                            }
                        } else if (savedTx?.id) {
                            savedTxId = savedTx.id;
                        }
                    } catch (e) {
                        console.error('[OpenFinance] Erro ao salvar bank_transaction:', e);
                    }
                }

                // Inserir na tabela de lançamentos gerais com fallback seguro
                let existingLanc = null;
                if (savedTxId) {
                    const { data } = await supabaseClient
                        .from('lancamentos')
                        .select('id')
                        .eq('bank_transaction_id', savedTxId)
                        .maybeSingle();
                    existingLanc = data;
                } else {
                    const { data } = await supabaseClient
                        .from('lancamentos')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('data', txDate)
                        .eq('valor', rawAmount)
                        .eq('descricao', tx.description || 'Movimentação Bancária')
                        .maybeSingle();
                    existingLanc = data;
                }

                if (!existingLanc) {
                    let formaPagto = 'Pix';
                    if (isCard) {
                        formaPagto = 'Cartão de Crédito';
                    } else if (descUpper.includes('CARTAO') || descUpper.includes('DEBITO')) {
                        formaPagto = 'Cartão de Débito';
                    } else if (descUpper.includes('TED') || descUpper.includes('DOC') || isInternalTransfer) {
                        formaPagto = 'Transferência';
                    }

                    const lancPayload = {
                        user_id: user.id,
                        data: txDate,
                        descricao: tx.description || 'Movimentação Bancária',
                        categoria: mappedCat,
                        tipo: txType,
                        valor: rawAmount,
                        forma: formaPagto
                    };

                    if (savedTxId) lancPayload.bank_transaction_id = savedTxId;
                    lancPayload.is_open_finance = true;

                    const { error: lancErr } = await supabaseClient.from('lancamentos').insert([lancPayload]);
                    if (lancErr) {
                        delete lancPayload.bank_transaction_id;
                        delete lancPayload.is_open_finance;
                        await supabaseClient.from('lancamentos').insert([lancPayload]);
                    }
                }
            }
        }

        return {
            success: true,
            accountsSynced: totalAcc,
            transactionsSynced: totalTx
        };
    },

    // Sincroniza TODAS as conexões ativas forçando atualização remota com as instituições
    syncDirect_all: async (forceRemote = true) => {
        const { data: conns } = await supabaseClient.from('bank_connections').select('external_item_id');
        let totalT = 0;
        let totalA = 0;
        if (conns && conns.length > 0) {
            console.log(`[OpenFinance] Sincronizando ${conns.length} conexão(ões) bancárias (remoto=${forceRemote})...`);
            for (const c of conns) {
                try {
                    const res = await OpenFinance.syncDirect(c.external_item_id, { forceRemote });
                    totalA += res.accountsSynced || 0;
                    totalT += res.transactionsSynced || 0;
                } catch (err) {
                    console.error(`[OpenFinance] Erro ao sincronizar item ${c.external_item_id}:`, err);
                }
            }
        }
        return { success: true, accountsSynced: totalA, transactionsSynced: totalT };
    },

    // Sincroniza uma conexão específica ou todas as ativas
    sync: async (itemId = null) => {
        // Tenta Edge function primeiro
        try {
            const session = await supabaseClient.auth.getSession();
            const token = session.data.session?.access_token;
            if (token) {
                const response = await fetch(`${SUPABASE_URL}/functions/v1/open-finance-sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ action: 'sync', itemId })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) return data;
                    // Edge function retornou erro, usa fallback direto
                    console.warn('[OpenFinance] Edge function retornou erro, usando sync direto:', data.error);
                } else {
                    const errTxt = await response.text().catch(() => '');
                    console.warn(`[OpenFinance] Edge function retornou ${response.status}, usando sync direto:`, errTxt);
                }
            }
        } catch (edgErr) {
            console.warn('[OpenFinance] Edge function sync indisponível, usando sync direto...', edgErr.message);
        }

        // Fallback: Sincronização direta
        if (itemId) {
            return await OpenFinance.syncDirect(itemId);
        } else {
            return await OpenFinance.syncDirect_all();
        }
    },

    // Desconecta e revoga o consentimento de uma conexão
    disconnect: async (itemId, institutionName) => {
        const confirm = await Swal.fire({
            title: 'Desconectar Instituição?',
            text: `Tem certeza que deseja desconectar o ${institutionName || 'banco'}? O compartilhamento de dados via Open Finance será cancelado.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e63946',
            cancelButtonColor: '#2a9d8f',
            confirmButtonText: 'Sim, desconectar',
            cancelButtonText: 'Cancelar',
            background: '#1a1d24',
            color: '#f8f9fa'
        });

        if (!confirm.isConfirmed) return false;

        try {
            Swal.fire({
                title: 'Desconectando...',
                text: 'Revogando consentimento e removendo vínculos...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                background: '#1a1d24',
                color: '#f8f9fa'
            });

            // Tenta revogar na Pluggy
            const apiKey = await OpenFinance.getValidApiKey();
            try {
                await fetch(`https://api.pluggy.ai/items/${itemId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey }
                });
            } catch (_) {}

            // Remove do banco Supabase
            if (Auth.user) {
                await supabaseClient.from('bank_connections').delete().eq('external_item_id', itemId).eq('user_id', Auth.user.id);
            }

            Swal.fire({
                icon: 'success',
                title: 'Desconectado',
                text: 'Vínculo bancário removido com sucesso.',
                confirmButtonColor: '#0a9396',
                background: '#1a1d24',
                color: '#f8f9fa'
            });

            if (App.currentView === 'conexoes') {
                App.loadView('conexoes');
            }
            return true;

        } catch (err) {
            console.error('[OpenFinance] Erro disconnect:', err);
            Toast.error('Erro ao desconectar: ' + err.message);
            return false;
        }
    }
};
