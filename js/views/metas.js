window.Views.metas = {
    render: async (container) => {
        const metas = await Store.get(KEYS.METAS) || [];
        
        let metasHtml = '';
        
        if (metas.length === 0) {
            metasHtml = `
                <div style="grid-column: span 2; text-align: center; padding: 60px 0; color: var(--text-muted);">
                    <i class="ph ph-target" style="font-size: 56px; opacity: 0.3;"></i>
                    <p style="margin-top: 16px;">Nenhuma meta registrada ainda.<br>Clique em <strong>Nova Meta</strong> para começar.</p>
                </div>
            `;
        }
        
        metas.forEach(m => {
            const objetivo = parseFloat(m.objetivo) || 0;
            const guardado = parseFloat(m.guardado) || 0;
            const pct = Math.min(objetivo > 0 ? ((guardado / objetivo) * 100).toFixed(1) : 0, 100);
            
            let color = 'var(--primary)';
            if (pct >= 100) color = 'var(--success)';
            else if (pct > 50) color = 'var(--warning)';
            else if (pct > 0) color = 'var(--info)';
            
            const prazoFormatado = m.prazo ? new Date(m.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem prazo';

            metasHtml += `
                <div class="card mb-4" style="position: relative; overflow: hidden;">
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center gap-2">
                            <div style="width: 40px; height: 40px; background: rgba(10, 147, 150, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: ${color}">
                                <i class="ph ph-target" style="font-size: 24px"></i>
                            </div>
                            <div>
                                <h3 style="font-size: 18px; margin: 0">${m.nome}</h3>
                                <div class="text-muted" style="font-size: 13px">Prazo: ${prazoFormatado}</div>
                            </div>
                        </div>
                        <div style="text-align: right">
                            <div style="font-size: 20px; font-weight: 600; color: ${color}">${pct}%</div>
                        </div>
                    </div>
                    
                    <div class="flex justify-between text-muted mb-2" style="font-size: 13px; margin-top: 12px;">
                        <span>Guardado: <strong>${App.formatCurrency(guardado)}</strong></span>
                        <span>Objetivo: <strong>${App.formatCurrency(objetivo)}</strong></span>
                    </div>
                    
                    <div style="width: 100%; height: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.2); margin-bottom: 16px;">
                        <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 6px; transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1); background-image: linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent); background-size: 1rem 1rem;"></div>
                    </div>

                    <div style="display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 12px;">
                        <button class="btn btn-edit-meta" data-id="${m.id}" style="flex: 1; background: rgba(10,147,150,0.12); color: var(--primary); border: 1px solid var(--primary); font-size: 13px; padding: 7px;">
                            <i class="ph ph-piggy-bank"></i> Atualizar Valor
                        </button>
                        <button class="btn btn-del-meta" data-id="${m.id}" style="background: transparent; color: var(--danger); border: 1px solid var(--danger); padding: 7px 12px; font-size: 13px;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <p class="text-muted">Acompanhe suas metas de vida e simule prazos.</p>
                <button class="btn btn-primary" id="btn-nova-meta"><i class="ph ph-plus"></i> Nova Meta</button>
            </div>
            
            <!-- Formulário de Meta -->
            <div id="form-meta-container" class="card mb-4" style="display: none;">
                <h3 class="mb-4" id="form-meta-titulo">Nova Meta</h3>
                <form id="form-meta" class="grid grid-3">
                    <div class="form-group">
                        <label>Nome da Meta</label>
                        <input type="text" id="meta-nome" class="input-control" placeholder="Ex: Viagem para Europa, Carro Novo" required>
                    </div>
                    <div class="form-group">
                        <label>Objetivo Total (R$)</label>
                        <input type="number" step="0.01" id="meta-objetivo" class="input-control" placeholder="0,00" required>
                    </div>
                    <div class="form-group">
                        <label>Valor já guardado (R$)</label>
                        <input type="number" step="0.01" id="meta-guardado" class="input-control" placeholder="0,00">
                    </div>
                    <div class="form-group">
                        <label>Prazo</label>
                        <input type="date" id="meta-prazo" class="input-control" required>
                    </div>
                    <div class="form-group" style="grid-column: span 2; display: flex; align-items: flex-end; gap: 12px;">
                        <button type="submit" class="btn btn-primary" id="btn-salvar-meta"><i class="ph ph-floppy-disk"></i> Salvar Meta</button>
                        <button type="button" class="btn" id="btn-cancelar-meta" style="background: transparent; border: 1px solid var(--border); color: var(--text-main)">Cancelar</button>
                    </div>
                </form>
            </div>

            <div class="grid grid-2">
                ${metasHtml}
                
                <div class="card flex items-center justify-center" id="card-add-meta" style="border: 1px dashed var(--border); background: transparent; cursor: pointer; min-height: 200px; ${metas.length > 0 ? '' : 'display: none;'}">
                    <div class="text-center text-muted">
                        <i class="ph ph-plus-circle" style="font-size: 32px; margin-bottom: 8px"></i>
                        <div>Adicionar Nova Meta</div>
                    </div>
                </div>
            </div>
        `;

        const formContainer = document.getElementById('form-meta-container');
        const form = document.getElementById('form-meta');
        const btnNova = document.getElementById('btn-nova-meta');
        const cardAdd = document.getElementById('card-add-meta');
        const btnCancelar = document.getElementById('btn-cancelar-meta');
        
        let editandoId = null;

        function abrirFormulario() {
            editandoId = null;
            document.getElementById('form-meta-titulo').textContent = 'Nova Meta';
            form.reset();
            formContainer.style.display = 'block';
            formContainer.scrollIntoView({ behavior: 'smooth' });
        }

        btnNova.addEventListener('click', abrirFormulario);
        if (cardAdd) cardAdd.addEventListener('click', abrirFormulario);

        btnCancelar.addEventListener('click', () => {
            formContainer.style.display = 'none';
            form.reset();
            editandoId = null;
        });

        // Salvar Meta
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-salvar-meta');
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';

            const payload = {
                nome: document.getElementById('meta-nome').value.trim(),
                objetivo: parseFloat(document.getElementById('meta-objetivo').value) || 0,
                guardado: parseFloat(document.getElementById('meta-guardado').value) || 0,
                prazo: document.getElementById('meta-prazo').value
            };

            if (payload.guardado > payload.objetivo) {
                Toast.warning('O valor guardado não pode ser maior que o objetivo.');
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Meta';
                return;
            }

            let sucesso = false;
            if (editandoId) {
                sucesso = await Store.update(KEYS.METAS, editandoId, payload);
                if (sucesso) Toast.success('Meta atualizada com sucesso!');
            } else {
                sucesso = await Store.insert(KEYS.METAS, payload);
                if (sucesso) Toast.success('Nova meta adicionada!');
            }

            if (!sucesso) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Meta';
                return;
            }

            App.loadView('metas');
        });

        // Atualizar Valor da Meta
        document.querySelectorAll('.btn-edit-meta').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const m = metas.find(x => x.id == id);
                if (!m) return;

                editandoId = id;
                document.getElementById('form-meta-titulo').textContent = 'Atualizar Progresso da Meta';
                document.getElementById('meta-nome').value = m.nome;
                document.getElementById('meta-objetivo').value = m.objetivo;
                document.getElementById('meta-guardado').value = m.guardado;
                document.getElementById('meta-prazo').value = m.prazo;
                
                formContainer.style.display = 'block';
                formContainer.scrollIntoView({ behavior: 'smooth' });
                document.getElementById('meta-guardado').focus();
            });
        });

        // Excluir Meta
        document.querySelectorAll('.btn-del-meta').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (!confirm('Deseja realmente apagar esta meta?')) return;
                
                const btnClicked = e.currentTarget;
                btnClicked.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
                
                await Store.delete(KEYS.METAS, id);
                Toast.success('Meta apagada com sucesso.');
                App.loadView('metas');
            });
        });
    }
};
