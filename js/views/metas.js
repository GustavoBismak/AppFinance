window.Views.metas = {
    render: (container) => {
        const metas = Store.get(KEYS.METAS) || [];
        
        if (metas.length === 0) {
            metas.push({ id: 1, nome: 'Comprar Terreno', objetivo: 80000, guardado: 15000, prazo: '2027-12-31' });
            metas.push({ id: 2, nome: 'Reserva de Emergência', objetivo: 30000, guardado: 25000, prazo: '2026-12-31' });
            Store.set(KEYS.METAS, metas);
        }
        
        let metasHtml = '';
        
        metas.forEach(m => {
            const pct = Math.min(((m.guardado / m.objetivo) * 100).toFixed(1), 100);
            
            let color = 'var(--primary)';
            if (pct >= 100) color = 'var(--success)';
            
            metasHtml += `
                <div class="card mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center gap-2">
                            <div style="width: 40px; height: 40px; background: rgba(10, 147, 150, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--primary)">
                                <i class="ph ph-target" style="font-size: 24px"></i>
                            </div>
                            <div>
                                <h3 style="font-size: 18px; margin: 0">${m.nome}</h3>
                                <div class="text-muted" style="font-size: 13px">Prazo: ${new Date(m.prazo + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                            </div>
                        </div>
                        <div style="text-align: right">
                            <div style="font-size: 20px; font-weight: 600; color: ${color}">${pct}%</div>
                        </div>
                    </div>
                    
                    <div class="flex justify-between text-muted mb-2" style="font-size: 13px">
                        <span>Guardado: <strong>${App.formatCurrency(m.guardado)}</strong></span>
                        <span>Objetivo: <strong>${App.formatCurrency(m.objetivo)}</strong></span>
                    </div>
                    
                    <div style="width: 100%; height: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);">
                        <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 6px; transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1); background-image: linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent); background-size: 1rem 1rem;"></div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <p class="text-muted">Acompanhe suas metas de vida e simule prazos.</p>
                <button class="btn btn-primary" onclick="alert('Função em desenvolvimento')"><i class="ph ph-plus"></i> Nova Meta</button>
            </div>
            
            <div class="grid grid-2">
                ${metasHtml}
                
                <div class="card flex items-center justify-center" style="border: 1px dashed var(--border); background: transparent; cursor: pointer; min-height: 150px">
                    <div class="text-center text-muted">
                        <i class="ph ph-plus-circle" style="font-size: 32px; margin-bottom: 8px"></i>
                        <div>Adicionar Nova Meta</div>
                    </div>
                </div>
            </div>
        `;
    }
};
