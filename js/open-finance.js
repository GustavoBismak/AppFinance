// js/open-finance.js — Módulo de Integração Open Finance do FinApp

const PLUGGY_STATIC_KEY = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjoiNjljOTgzN2I0OWY2N2RjZTRmMGI3Mjg3YTExYjMwMGI6M2Q4ZDNiYThkNTZlZTE3YmQ3N2QzMGJjY2M4NzJhYjBkN2YyYTg5ZTBmOTViZDQzNTE5ZjBmNzIwYzJiYzE4ZTRjNTcxYmQxNTU4MWMyYTBiYWMwYjVkNTA2ZWVlN2I2ZjAwOTI4M2U2YjZkMmI1ZGIzNjkwNTBjNTllYWU1MDM4MGYyZjFkMTgxNDk0MjhjOTA5OGVjOWIxYWY4ZGYxNyIsImlhdCI6MTc5Mzk4NTI4OSwiZXhwIjoxNzkzOTkyNDg5fQ.hSgy19Tp98KEJyMDxeJU8o0oxFHHM9HXzIcsAx86P7eEssgIWHtOoNn3bXhh6Se27yBBFoS8JTNXA9Y6ji-uaCs2wkpr9vd_5EfssJWyr0V95P1k2K1lgQRInYspuFIET55I1ownZp_vFIxKgUzmQYDiIjXIt1-DScmJBn2xcL0jgk4iuleoJM3ncwy73Bd6fqFzSQBjFZ5HdlGoBaFl2HY8ux4d6glKvik2kkfOTxbOQjT3yqlmVpXTZkdRkmFDKyV5mB75peXdUM918o-ZmthYSYe68YM_GCOCyYh4d2QhiFLn81IS3yYfdruo8vSREL44uo8vKO8xuVMnKJHGTA';

window.OpenFinance = {
    pluggyScriptLoaded: false,

    // Obtém a API Key ativa (seja customizada, do localStorage ou a padrão)
    getApiKey: () => {
        return window.PLUGGY_API_KEY || localStorage.getItem('pluggy_api_key') || PLUGGY_STATIC_KEY;
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
                const apiKey = OpenFinance.getApiKey();
                const pluggyRes = await fetch('https://api.pluggy.ai/connect_token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-KEY': apiKey
                    },
                    body: JSON.stringify(itemId ? { itemId } : { options: { clientUserId: Auth.user.id } })
                });

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

    // Sincronização direta no cliente (fallback quando Edge Function não está implantada)
    syncDirect: async (itemId) => {
        const apiKey = OpenFinance.getApiKey();
        const headers = {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey
        };

        const user = Auth.user;
        if (!user) throw new Error('Usuário não autenticado');

        // 1. Buscar Item
        const itemRes = await fetch(`https://api.pluggy.ai/items/${itemId}`, { headers });
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
        const connectionId = savedConnection?.id;

        // 2. Buscar Contas
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
            }

            // 3. Buscar Transações dos últimos 90 dias
            const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const toDate = new Date().toISOString().split('T')[0];

            const txRes = await fetch(`https://api.pluggy.ai/transactions?accountId=${acc.id}&from=${fromDate}&to=${toDate}&pageSize=500`, { headers });
            if (!txRes.ok) continue;

            const txData = await txRes.json();
            const txList = txData.results || [];

            for (const tx of txList) {
                totalTx++;
                const isCredit = tx.type === 'CREDIT';
                const txType = isCredit ? 'receita' : 'despesa';
                const rawAmount = Math.abs(tx.amount || 0);
                const txDate = tx.date ? tx.date.split('T')[0] : toDate;
                const mappedCat = OpenFinance.mapCategory(tx.category, tx.description);

                let savedTxId = null;
                if (accountRecordId) {
                    const { data: savedTx } = await supabaseClient
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
                            status: tx.status || 'POSTED'
                        }, { onConflict: 'bank_account_id, external_id' })
                        .select()
                        .single();

                    savedTxId = savedTx?.id;
                }

                // Inserir na tabela lancamentos se não existir
                const { data: existingLanc } = await supabaseClient
                    .from('lancamentos')
                    .select('id')
                    .eq('bank_transaction_id', savedTxId || tx.id)
                    .maybeSingle();

                if (!existingLanc) {
                    let formaPagto = 'Pix';
                    const descUpper = (tx.description || '').toUpperCase();
                    if (acc.subtype === 'CREDIT_CARD' || acc.type === 'CREDIT') {
                        formaPagto = 'Cartão de Crédito';
                    } else if (descUpper.includes('CARTAO') || descUpper.includes('DEBITO')) {
                        formaPagto = 'Cartão de Débito';
                    } else if (descUpper.includes('TED') || descUpper.includes('DOC') || descUpper.includes('TRANSF')) {
                        formaPagto = 'Transferência';
                    }

                    await supabaseClient.from('lancamentos').insert([{
                        user_id: user.id,
                        data: txDate,
                        descricao: tx.description || 'Movimentação Bancária',
                        categoria: mappedCat,
                        tipo: txType,
                        valor: rawAmount,
                        forma: formaPagto,
                        bank_transaction_id: savedTxId || null,
                        is_open_finance: true
                    }]);
                }
            }
        }

        return {
            success: true,
            accountsSynced: totalAcc,
            transactionsSynced: totalTx
        };
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
                }
            }
        } catch (_) {
            console.warn('[OpenFinance] Edge function sync indisponível, usando sync direto...');
        }

        // Fallback: Sincronização direta
        if (itemId) {
            return await OpenFinance.syncDirect(itemId);
        } else {
            // Se sincronizar todos, busca todos os items do banco
            const { data: conns } = await supabaseClient.from('bank_connections').select('external_item_id');
            let totalT = 0;
            let totalA = 0;
            if (conns && conns.length > 0) {
                for (const c of conns) {
                    const res = await OpenFinance.syncDirect(c.external_item_id);
                    totalA += res.accountsSynced || 0;
                    totalT += res.transactionsSynced || 0;
                }
            }
            return { success: true, accountsSynced: totalA, transactionsSynced: totalT };
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
            const apiKey = OpenFinance.getApiKey();
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
