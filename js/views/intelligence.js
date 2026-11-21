// ==========================================================================
// FinApp Intelligence — Interface do Assistente Financeiro Interativo
// ==========================================================================

window.Views.intelligence = {
    render: async (container) => {
        const user = Auth.user;
        const userId = user ? user.id : 'anon';
        const storageKey = `finapp_intelligence_history_${userId}`;

        // Carrega histórico salvo na sessão
        let historico = [];
        try {
            const salvo = localStorage.getItem(storageKey);
            if (salvo) historico = JSON.parse(salvo);
        } catch (_) {}

        container.innerHTML = `
            <div class="intelligence-wrapper">
                <!-- Top Header da Conversa -->
                <div class="intelligence-header">
                    <div class="intelligence-brand">
                        <div class="intelligence-avatar">
                            <i class="ph-fill ph-sparkle"></i>
                        </div>
                        <div>
                            <div class="intelligence-title-row">
                                <h2>FinApp Intelligence</h2>
                                <span class="badge-online"><span class="dot-online"></span> Dados em Tempo Real</span>
                            </div>
                            <p class="intelligence-subtitle">Assistente financeiro nativo baseado em regras e nos seus dados reais</p>
                        </div>
                    </div>
                    <div class="intelligence-actions">
                        <button class="btn btn-sm btn-outline" id="btn-clear-chat" title="Iniciar nova conversa">
                            <i class="ph ph-arrows-counter-clockwise"></i> <span>Nova Conversa</span>
                        </button>
                    </div>
                </div>

                <!-- Janela de Mensagens -->
                <div class="intelligence-chat-body" id="intelligence-chat-body">
                    <div id="intelligence-messages" class="intelligence-messages">
                        <!-- Mensagens renderizadas via JS -->
                    </div>
                    
                    <!-- Indicador de Digitação -->
                    <div id="intelligence-typing" class="intelligence-typing" style="display: none;">
                        <div class="typing-bubble">
                            <span class="typing-dot"></span>
                            <span class="typing-dot"></span>
                            <span class="typing-dot"></span>
                        </div>
                        <span class="typing-text">FinApp Intelligence analisando seus dados...</span>
                    </div>
                </div>

                <!-- Barra Inferior de Entrada -->
                <div class="intelligence-footer">
                    <form id="intelligence-form" class="intelligence-input-form" onsubmit="event.preventDefault();">
                        <div class="intelligence-input-wrapper">
                            <input 
                                type="text" 
                                id="intelligence-input" 
                                class="intelligence-input" 
                                placeholder="Pergunte sobre seus gastos, saldo livre, contas a pagar, economia..." 
                                autocomplete="off"
                                maxlength="300"
                            />
                            <button type="submit" id="intelligence-btn-send" class="intelligence-send-btn" aria-label="Enviar Pergunta">
                                <i class="ph-fill ph-paper-plane-right"></i>
                            </button>
                        </div>
                    </form>
                    <div class="intelligence-disclaimer">
                        <span><i class="ph ph-shield-check"></i> 100% seguro: seus dados financeiros não são enviados a nenhuma inteligência artificial externa.</span>
                    </div>
                </div>
            </div>
        `;

        const messagesContainer = document.getElementById('intelligence-messages');
        const chatBody = document.getElementById('intelligence-chat-body');
        const input = document.getElementById('intelligence-input');
        const btnSend = document.getElementById('intelligence-btn-send');
        const typingIndicator = document.getElementById('intelligence-typing');
        const btnClear = document.getElementById('btn-clear-chat');

        // Scroll suave para o fim da conversa
        const scrollToBottom = () => {
            chatBody.scrollTop = chatBody.scrollHeight;
        };

        // Renderiza mensagem de boas-vindas se não houver histórico
        const renderWelcomeScreen = () => {
            const userName = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário';
            messagesContainer.innerHTML = `
                <div class="intelligence-welcome-card">
                    <div class="welcome-icon-box">
                        <i class="ph-fill ph-sparkle"></i>
                    </div>
                    <h3>Olá, ${userName}! Como posso ajudar suas finanças hoje?</h3>
                    <p>Eu sou o <strong>FinApp Intelligence</strong>. Analiso suas receitas, despesas, contas pendentes e metas em tempo real para responder suas dúvidas com precisão.</p>
                    
                    <div class="welcome-chips-section">
                        <span class="welcome-chips-title">Sugestões de perguntas rápidas:</span>
                        <div class="welcome-chips-grid">
                            <button class="welcome-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto ainda posso gastar este mês?')">
                                <i class="ph ph-wallet"></i> Quanto ainda posso gastar este mês?
                            </button>
                            <button class="welcome-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde mais gastei este mês?')">
                                <i class="ph ph-chart-pie"></i> Onde mais gastei este mês?
                            </button>
                            <button class="welcome-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Como está minha situação financeira?')">
                                <i class="ph ph-scales"></i> Como está minha situação financeira?
                            </button>
                            <button class="welcome-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Onde preciso economizar?')">
                                <i class="ph ph-lightbulb"></i> Onde preciso economizar?
                            </button>
                            <button class="welcome-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quais contas tenho para pagar?')">
                                <i class="ph ph-calendar-check"></i> Quais contas tenho para pagar?
                            </button>
                            <button class="welcome-chip" onclick="FinAppIntelligenceUI.enviarSugestao('Quanto ganhei e gastei no mês passado?')">
                                <i class="ph ph-clock-counter-clockwise"></i> Como foi meu mês passado?
                            </button>
                        </div>
                    </div>
                </div>
            `;
        };

        // Renderiza todo o histórico salvo
        const renderMessages = () => {
            if (historico.length === 0) {
                renderWelcomeScreen();
                return;
            }

            messagesContainer.innerHTML = '';
            historico.forEach(msg => {
                appendMessageToDOM(msg.role, msg.content, false);
            });
            scrollToBottom();
        };

        // Adiciona um balão no DOM
        const appendMessageToDOM = (role, content, shouldScroll = true) => {
            const isUser = role === 'user';
            const msgEl = document.createElement('div');
            msgEl.className = `chat-message-row ${isUser ? 'user-message-row' : 'bot-message-row'}`;

            if (isUser) {
                msgEl.innerHTML = `
                    <div class="chat-bubble user-bubble">
                        <div class="bubble-content">${escapeHTML(content)}</div>
                    </div>
                `;
            } else {
                msgEl.innerHTML = `
                    <div class="bot-avatar">
                        <i class="ph-fill ph-sparkle"></i>
                    </div>
                    <div class="chat-bubble bot-bubble">
                        <div class="bubble-content">${content}</div>
                    </div>
                `;
            }

            messagesContainer.appendChild(msgEl);
            if (shouldScroll) scrollToBottom();
        };

        const escapeHTML = (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };

        // Salva histórico localmente
        const salvarHistorico = () => {
            try {
                localStorage.setItem(storageKey, JSON.stringify(historico.slice(-40))); // mantém últimas 40 mensagens
            } catch (_) {}
        };

        // Envia pergunta e processa
        const handleSendMessage = async (perguntaTexto) => {
            const texto = (perguntaTexto || input.value || '').trim();
            if (!texto) return;

            // Limpa o welcome se for a primeira mensagem
            if (historico.length === 0) {
                messagesContainer.innerHTML = '';
            }

            // Adiciona mensagem do usuário
            historico.push({ role: 'user', content: texto });
            appendMessageToDOM('user', texto);
            salvarHistorico();

            input.value = '';
            btnSend.disabled = true;

            // Mostra indicador de processamento
            typingIndicator.style.display = 'flex';
            scrollToBottom();

            // Simula delay natural de processamento local (400ms a 700ms)
            const delay = Math.floor(Math.random() * 250) + 400;

            try {
                const respostaHTML = await FinAppIntelligence.processarPergunta(texto);

                setTimeout(() => {
                    typingIndicator.style.display = 'none';
                    historico.push({ role: 'assistant', content: respostaHTML });
                    appendMessageToDOM('assistant', respostaHTML);
                    salvarHistorico();
                    btnSend.disabled = false;
                    input.focus();
                }, delay);
            } catch (err) {
                console.error('Erro no FinApp Intelligence:', err);
                setTimeout(() => {
                    typingIndicator.style.display = 'none';
                    const erroMsg = `<div class="ia-response-box"><p>⚠️ Ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.</p></div>`;
                    historico.push({ role: 'assistant', content: erroMsg });
                    appendMessageToDOM('assistant', erroMsg);
                    salvarHistorico();
                    btnSend.disabled = false;
                }, delay);
            }
        };

        // Eventos do formulário
        document.getElementById('intelligence-form').addEventListener('submit', () => {
            handleSendMessage();
        });

        // Limpar conversa
        btnClear.addEventListener('click', () => {
            historico = [];
            try {
                localStorage.removeItem(storageKey);
            } catch (_) {}
            renderWelcomeScreen();
            input.focus();
        });

        // Expõe helper para os chips de sugestão clicáveis
        window.FinAppIntelligenceUI = {
            enviarSugestao: (texto) => {
                handleSendMessage(texto);
            }
        };

        // Inicialização
        renderMessages();
        setTimeout(() => input.focus(), 200);
    }
};
