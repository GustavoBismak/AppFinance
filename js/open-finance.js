// js/open-finance.js — Módulo de Integração Open Finance do FinApp

window.OpenFinance = {
    pluggyScriptLoaded: false,

    // Garante o carregamento sob demanda do SDK oficial do Pluggy Connect
    loadSdk: () => {
        return new Promise((resolve, reject) => {
            if (window.PluggyConnect) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.latest.js';
            script.async = true;
            script.onload = () => {
                window.OpenFinance.pluggyScriptLoaded = true;
                resolve();
            };
            script.onerror = () => reject(new Error('Falha ao carregar o SDK Pluggy Connect. Verifique sua conexão.'));
            document.head.appendChild(script);
        });
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

            // 3. Obter token de conexão seguro da Edge Function
            const session = await supabaseClient.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            const response = await fetch(`${SUPABASE_URL}/functions/v1/open-finance-connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ itemId })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Erro ao gerar token de conexão.');
            }

            Swal.close();

            // 4. Instanciar e abrir o widget Pluggy Connect
            const pluggyConnect = new window.PluggyConnect({
                connectToken: data.connectToken,
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

                    // 5. Acionar sincronização imediata
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
                            text: 'Sua conta foi conectada, mas algumas movimentações ainda estão sendo processadas pelo banco.',
                            confirmButtonColor: '#0a9396',
                            background: '#1a1d24',
                            color: '#f8f9fa'
                        });
                        if (onSuccess) onSuccess(itemData);
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

    // Sincroniza uma conexão específica ou todas as ativas
    sync: async (itemId = null) => {
        const session = await supabaseClient.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) throw new Error('Não autenticado');

        const response = await fetch(`${SUPABASE_URL}/functions/v1/open-finance-sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action: 'sync', itemId })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Falha ao sincronizar');
        }
        return data;
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

            const session = await supabaseClient.auth.getSession();
            const token = session.data.session?.access_token;

            const response = await fetch(`${SUPABASE_URL}/functions/v1/open-finance-sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'disconnect', itemId })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Falha ao desconectar.');
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

