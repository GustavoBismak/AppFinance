/**
 * FinApp - Custom Select & Mobile Bottom Sheet Picker
 * Transforma selects padrão em seletores modernos, elegantes e organizados,
 * com suporte a busca em tempo real, ícones automáticos e visual mobile premium.
 */
(function() {
    'use strict';

    // Mapeamento automático de ícones por palavra-chave
    function getOptionIcon(text, value) {
        const str = ((text || '') + ' ' + (value || '')).toLowerCase().trim();
        
        // Vazio ou selecione
        if (!str || str.includes('selecione')) return { icon: 'ph-list-bullets', color: 'var(--text-muted)' };

        // Tipos de transação
        if (str === 'despesa') return { icon: 'ph-arrow-down-right', color: 'var(--danger)' };
        if (str === 'receita') return { icon: 'ph-arrow-up-right', color: 'var(--success)' };

        // Formas de pagamento
        if (str.includes('pix')) return { icon: 'ph-lightning', color: '#00d2d3' };
        if (str.includes('crédito') || str.includes('credito')) return { icon: 'ph-credit-card', color: '#f5cb5c' };
        if (str.includes('débito') || str.includes('debito')) return { icon: 'ph-cardholder', color: '#48dbfb' };
        if (str.includes('dinheiro') || str.includes('espécie')) return { icon: 'ph-money', color: '#1dd1a1' };

        // Categorias populares
        if (str.includes('aliment') || str.includes('comida') || str.includes('restaurante') || str.includes('mercado') || str.includes('lanche')) {
            return { icon: 'ph-fork-knife', color: '#ff9f43' };
        }
        if (str.includes('transp') || str.includes('uber') || str.includes('combust') || str.includes('gasolina') || str.includes('carro') || str.includes('veículo') || str.includes('veiculo') || str.includes('moto')) {
            return { icon: 'ph-car', color: '#54a0ff' };
        }
        if (str.includes('moradia') || str.includes('aluguel') || str.includes('casa') || str.includes('condom') || str.includes('iptu')) {
            return { icon: 'ph-house', color: '#5f27cd' };
        }
        if (str.includes('saúde') || str.includes('saude') || str.includes('farm') || str.includes('médic') || str.includes('medic') || str.includes('hospital') || str.includes('remédio')) {
            return { icon: 'ph-first-aid', color: '#ff6b6b' };
        }
        if (str.includes('lazer') || str.includes('viagem') || str.includes('festa') || str.includes('cinema') || str.includes('passeio') || str.includes('jogo')) {
            return { icon: 'ph-game-controller', color: '#f368e0' };
        }
        if (str.includes('celular') || str.includes('telefon') || str.includes('smartphone')) {
            return { icon: 'ph-device-mobile', color: '#00d2d3' };
        }
        if (str.includes('fatura') || str.includes('boleto') || str.includes('conta de') || str.includes('luz') || str.includes('água') || str.includes('energia')) {
            return { icon: 'ph-receipt', color: '#ee5253' };
        }
        if (str.includes('roupa') || str.includes('vest') || str.includes('calçado') || str.includes('moda')) {
            return { icon: 'ph-t-shirt', color: '#10ac84' };
        }
        if (str.includes('utenc') || str.includes('utens') || str.includes('ferramenta') || str.includes('reforma')) {
            return { icon: 'ph-wrench', color: '#ff9f43' };
        }
        if (str.includes('filho') || str.includes('filha') || str.includes('criança') || str.includes('vicente') || str.includes('escola') || str.includes('bebe') || str.includes('bebê')) {
            return { icon: 'ph-baby', color: '#ff9ff3' };
        }
        if (str.includes('emprést') || str.includes('emprest') || str.includes('dívida') || str.includes('divida') || str.includes('financiamento')) {
            return { icon: 'ph-hand-coins', color: '#ff793f' };
        }
        if (str.includes('capital') || str.includes('invest') || str.includes('patrimônio') || str.includes('banco') || str.includes('poupança')) {
            return { icon: 'ph-bank', color: '#2ed573' };
        }
        if (str.includes('funcionár') || str.includes('funcionar') || str.includes('equipe') || str.includes('colaborador')) {
            return { icon: 'ph-users', color: '#70a1ff' };
        }
        if (str.includes('ajuda') || str.includes('social') || str.includes('doação') || str.includes('caridade')) {
            return { icon: 'ph-hand-heart', color: '#ff4757' };
        }
        if (str.includes('educa') || str.includes('curso') || str.includes('faculdade') || str.includes('livro')) {
            return { icon: 'ph-graduation-cap', color: '#3742fa' };
        }
        if (str.includes('renda') || str.includes('salário') || str.includes('salario') || str.includes('pró-labore')) {
            return { icon: 'ph-trend-up', color: '#2ed573' };
        }

        // Cartões
        if (str.includes('cartão') || str.includes('cartao') || str.includes('card')) {
            return { icon: 'ph-credit-card', color: 'var(--primary)' };
        }

        // Meses / Calendário
        if (str.includes('janeiro') || str.includes('fevereiro') || str.includes('março') || str.includes('abril') || 
            str.includes('maio') || str.includes('junho') || str.includes('julho') || str.includes('agosto') || 
            str.includes('setembro') || str.includes('outubro') || str.includes('novembro') || str.includes('dezembro')) {
            return { icon: 'ph-calendar-blank', color: 'var(--primary)' };
        }

        return { icon: 'ph-tag', color: 'var(--primary-light)' };
    }

    const CustomSelect = {
        activeSelect: null,
        activeTrigger: null,
        activeDropdown: null,
        activeSheet: null,
        activeBackdrop: null,

        init: function() {
            document.querySelectorAll('select.input-control:not(.custom-select-attached):not([data-no-custom])').forEach(select => {
                // Não customizar selects internos do flatpickr
                if (select.closest('.flatpickr-calendar')) return;
                CustomSelect.attach(select);
            });
        },

        attach: function(select) {
            if (!select || select.classList.contains('custom-select-attached')) return;
            select.classList.add('custom-select-attached', 'custom-select-native');

            // Cria o wrapper externo
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-select-wrapper';
            if (select.id) wrapper.setAttribute('data-select-id', select.id);

            // Cria o botão de acionamento (Trigger)
            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'custom-select-trigger';
            trigger.setAttribute('aria-haspopup', 'listbox');
            trigger.setAttribute('aria-expanded', 'false');

            const contentDiv = document.createElement('div');
            contentDiv.className = 'custom-select-trigger-content';

            const iconSpan = document.createElement('span');
            iconSpan.className = 'custom-select-trigger-icon';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'custom-select-label';

            contentDiv.appendChild(iconSpan);
            contentDiv.appendChild(labelSpan);

            const caret = document.createElement('i');
            caret.className = 'ph ph-caret-down custom-select-caret';

            trigger.appendChild(contentDiv);
            trigger.appendChild(caret);

            // Insere o wrapper no DOM
            select.parentNode.insertBefore(wrapper, select);
            wrapper.appendChild(select);
            wrapper.appendChild(trigger);

            // Atualiza o texto e ícone do trigger conforme o valor do select nativo
            const updateTrigger = () => {
                const selectedOpt = select.options[select.selectedIndex] || select.options[0];
                if (selectedOpt && selectedOpt.value !== '') {
                    const text = selectedOpt.textContent.trim();
                    labelSpan.textContent = text;
                    labelSpan.classList.remove('is-placeholder');
                    const info = getOptionIcon(text, selectedOpt.value);
                    iconSpan.innerHTML = `<i class="ph ${info.icon}" style="color:${info.color}; font-size:17px;"></i>`;
                    iconSpan.style.display = 'inline-flex';
                } else if (selectedOpt) {
                    labelSpan.textContent = selectedOpt.textContent.trim() || 'Selecione...';
                    labelSpan.classList.add('is-placeholder');
                    iconSpan.style.display = 'none';
                } else {
                    labelSpan.textContent = 'Selecione...';
                    labelSpan.classList.add('is-placeholder');
                    iconSpan.style.display = 'none';
                }
            };

            updateTrigger();

            // Eventos do select nativo
            select.addEventListener('change', () => {
                updateTrigger();
                trigger.classList.remove('custom-select-invalid');
            });

            select.addEventListener('invalid', () => {
                trigger.classList.add('custom-select-invalid');
                trigger.focus();
            });

            select.closest('form')?.addEventListener('reset', () => {
                setTimeout(updateTrigger, 30);
                trigger.classList.remove('custom-select-invalid');
            });

            // Clique no trigger
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (select.disabled) return;
                CustomSelect.toggle(select, trigger, wrapper);
            });

            // Observador de opções dinâmicas
            const optObserver = new MutationObserver(() => {
                updateTrigger();
            });
            optObserver.observe(select, { childList: true, subtree: true, characterData: true });
        },

        toggle: function(select, trigger, wrapper) {
            if (CustomSelect.activeTrigger === trigger) {
                CustomSelect.closeAll();
            } else {
                CustomSelect.open(select, trigger, wrapper);
            }
        },

        open: function(select, trigger, wrapper) {
            CustomSelect.closeAll();

            CustomSelect.activeSelect = select;
            CustomSelect.activeTrigger = trigger;
            trigger.classList.add('is-active');
            trigger.setAttribute('aria-expanded', 'true');

            // Determinar título a partir da label mais próxima
            let fieldTitle = 'Selecione uma opção';
            const formGroup = select.closest('.form-group');
            if (formGroup) {
                const label = formGroup.querySelector('label');
                if (label) {
                    fieldTitle = label.innerText.replace(/\(.*?\)/g, '').trim();
                }
            }

            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                CustomSelect.renderBottomSheet(select, trigger, fieldTitle);
            } else {
                CustomSelect.renderDropdown(select, trigger, fieldTitle);
            }
        },

        renderBottomSheet: function(select, trigger, title) {
            // Backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'custom-select-backdrop';
            document.body.appendChild(backdrop);
            CustomSelect.activeBackdrop = backdrop;

            // Sheet container
            const sheet = document.createElement('div');
            sheet.className = 'custom-select-sheet';

            const options = Array.from(select.options);
            const showSearch = options.length > 5;

            sheet.innerHTML = `
                <div class="custom-select-sheet-drag"></div>
                <div class="custom-select-sheet-header">
                    <div class="custom-select-sheet-title">
                        <i class="ph ph-list" style="color:var(--primary); font-size:18px;"></i>
                        <span>${title}</span>
                    </div>
                    <button type="button" class="custom-select-sheet-close" aria-label="Fechar">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
                ${showSearch ? `
                <div class="custom-select-search-box">
                    <i class="ph ph-magnifying-glass custom-select-search-icon"></i>
                    <input type="text" class="custom-select-search-input" placeholder="Pesquisar..." autocomplete="off">
                </div>
                ` : ''}
                <div class="custom-select-options-list">
                    ${CustomSelect.buildOptionsHTML(options, select.value)}
                </div>
            `;

            document.body.appendChild(sheet);
            CustomSelect.activeSheet = sheet;

            // Animar entrada
            requestAnimationFrame(() => {
                backdrop.classList.add('is-visible');
                sheet.classList.add('is-visible');
            });

            // Handlers
            sheet.querySelector('.custom-select-sheet-close').addEventListener('click', CustomSelect.closeAll);
            backdrop.addEventListener('click', CustomSelect.closeAll);

            // Handler de busca
            if (showSearch) {
                const searchInput = sheet.querySelector('.custom-select-search-input');
                searchInput.addEventListener('input', (e) => {
                    CustomSelect.filterOptions(sheet, e.target.value);
                });
            }

            // Seleção de itens
            sheet.querySelectorAll('.custom-select-option-item').forEach(item => {
                item.addEventListener('click', () => {
                    const val = item.getAttribute('data-value');
                    CustomSelect.selectValue(select, val);
                });
            });

            // Travar scroll do body
            document.body.classList.add('custom-select-open');
        },

        renderDropdown: function(select, trigger, title) {
            const dropdown = document.createElement('div');
            dropdown.className = 'custom-select-dropdown';

            const options = Array.from(select.options);
            const showSearch = options.length > 5;

            dropdown.innerHTML = `
                ${showSearch ? `
                <div class="custom-select-search-box">
                    <i class="ph ph-magnifying-glass custom-select-search-icon"></i>
                    <input type="text" class="custom-select-search-input" placeholder="Buscar..." autocomplete="off">
                </div>
                ` : ''}
                <div class="custom-select-options-list">
                    ${CustomSelect.buildOptionsHTML(options, select.value)}
                </div>
            `;

            document.body.appendChild(dropdown);
            CustomSelect.activeDropdown = dropdown;

            // Posicionar o dropdown relativo ao trigger
            CustomSelect.positionDropdown(trigger, dropdown);

            // Animar abertura
            requestAnimationFrame(() => {
                dropdown.classList.add('is-visible');
            });

            // Handler de busca
            if (showSearch) {
                const searchInput = dropdown.querySelector('.custom-select-search-input');
                searchInput.focus();
                searchInput.addEventListener('input', (e) => {
                    CustomSelect.filterOptions(dropdown, e.target.value);
                });
            }

            // Seleção de itens
            dropdown.querySelectorAll('.custom-select-option-item').forEach(item => {
                item.addEventListener('click', () => {
                    const val = item.getAttribute('data-value');
                    CustomSelect.selectValue(select, val);
                });
            });
        },

        positionDropdown: function(trigger, dropdown) {
            const rect = trigger.getBoundingClientRect();
            const dropdownWidth = Math.max(rect.width, 240);
            const scrollY = window.scrollY || window.pageYOffset;
            const scrollX = window.scrollX || window.pageXOffset;

            let top = rect.bottom + scrollY + 6;
            let left = rect.left + scrollX;

            // Se passar da borda direita da tela, ajusta
            if (left + dropdownWidth > window.innerWidth - 16) {
                left = window.innerWidth - dropdownWidth - 16;
            }

            // Se passar da borda inferior da tela, abre para cima
            const dropdownHeight = 300;
            if (rect.bottom + dropdownHeight > window.innerHeight && rect.top > dropdownHeight) {
                top = rect.top + scrollY - dropdownHeight - 6;
            }

            dropdown.style.top = `${top}px`;
            dropdown.style.left = `${left}px`;
            dropdown.style.width = `${dropdownWidth}px`;
        },

        buildOptionsHTML: function(options, currentValue) {
            return options.map(opt => {
                const val = opt.value;
                const text = opt.textContent.trim();
                const isSelected = String(val) === String(currentValue);
                const info = getOptionIcon(text, val);

                return `
                    <div class="custom-select-option-item ${isSelected ? 'is-selected' : ''}" data-value="${val}" data-text="${text.toLowerCase()}">
                        <div class="custom-select-option-left">
                            <span class="custom-select-option-badge">
                                <i class="ph ${info.icon}" style="color:${info.color}; font-size:18px;"></i>
                            </span>
                            <span class="custom-select-option-name">${text}</span>
                        </div>
                        <div class="custom-select-option-check">
                            ${isSelected ? '<i class="ph ph-check-bold" style="color:var(--primary); font-size:18px;"></i>' : ''}
                        </div>
                    </div>
                `;
            }).join('');
        },

        filterOptions: function(container, query) {
            const q = query.toLowerCase().trim();
            const items = container.querySelectorAll('.custom-select-option-item');
            let found = 0;

            items.forEach(item => {
                const text = item.getAttribute('data-text') || '';
                if (!q || text.includes(q)) {
                    item.style.display = 'flex';
                    found++;
                } else {
                    item.style.display = 'none';
                }
            });

            // Mensagem se nada encontrado
            let noResults = container.querySelector('.custom-select-no-results');
            if (found === 0) {
                if (!noResults) {
                    noResults = document.createElement('div');
                    noResults.className = 'custom-select-no-results';
                    noResults.innerHTML = '<i class="ph ph-magnifying-glass"></i> Nenhuma opção encontrada';
                    container.querySelector('.custom-select-options-list').appendChild(noResults);
                }
                noResults.style.display = 'block';
            } else if (noResults) {
                noResults.style.display = 'none';
            }
        },

        selectValue: function(select, value) {
            select.value = value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));
            CustomSelect.closeAll();
        },

        closeAll: function() {
            if (CustomSelect.activeTrigger) {
                CustomSelect.activeTrigger.classList.remove('is-active');
                CustomSelect.activeTrigger.setAttribute('aria-expanded', 'false');
                CustomSelect.activeTrigger = null;
            }
            CustomSelect.activeSelect = null;

            if (CustomSelect.activeDropdown) {
                const el = CustomSelect.activeDropdown;
                el.classList.remove('is-visible');
                setTimeout(() => el.remove(), 150);
                CustomSelect.activeDropdown = null;
            }

            if (CustomSelect.activeSheet) {
                const sheet = CustomSelect.activeSheet;
                const backdrop = CustomSelect.activeBackdrop;
                sheet.classList.remove('is-visible');
                if (backdrop) backdrop.classList.remove('is-visible');

                setTimeout(() => {
                    sheet.remove();
                    if (backdrop) backdrop.remove();
                }, 250);

                CustomSelect.activeSheet = null;
                CustomSelect.activeBackdrop = null;
            }

            document.body.classList.remove('custom-select-open');
        }
    };

    // Fechar ao clicar fora (Desktop)
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-wrapper') && 
            !e.target.closest('.custom-select-dropdown') && 
            !e.target.closest('.custom-select-sheet')) {
            CustomSelect.closeAll();
        }
    });

    // Fechar com tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') CustomSelect.closeAll();
    });

    // Redimensionamento ou rolagem de tela fecha dropdown flutuante
    window.addEventListener('resize', () => {
        if (CustomSelect.activeDropdown) CustomSelect.closeAll();
    });

    // Auto-inicializar no DOMContentLoaded e com MutationObserver
    document.addEventListener('DOMContentLoaded', () => {
        CustomSelect.init();

        const observer = new MutationObserver(() => {
            CustomSelect.init();
        });

        const target = document.getElementById('view-container') || document.body;
        observer.observe(target, { childList: true, subtree: true });
    });

    // Expor globalmente
    window.CustomSelect = CustomSelect;
})();
