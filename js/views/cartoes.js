window.Views.cartoes = {
    render: (container) => {
        const cartoes = Store.get(KEYS.CARTOES) || [];
        
        let gridHtml = '';
        
        cartoes.forEach(c => {
            const disponivel = c.limite - c.utilizado;
            const pct = ((c.utilizado / c.limite) * 100).toFixed(0);
            
            // Cores baseadas no % utilizado
            let progressColor = 'var(--success)';
            if(pct > 80) progressColor = 'var(--danger)';
            else if(pct > 50) progressColor = 'var(--warning)';
            
            // Logomarcas baseadas no nome
            let logo = '<i class="ph ph-credit-card text-muted" style="font-size: 24px"></i>';
            if(c.nome.toLowerCase().includes('nubank')) {
                logo = '<div style="width: 32px; height: 32px; background: #8a05be; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white"><i class="ph ph-bank"></i></div>';
            } else if(c.nome.toLowerCase().includes('inter')) {
                logo = '<div style="width: 32px; height: 32px; background: #ff7a00; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white"><i class="ph ph-bank"></i></div>';
            }
            
            gridHtml += `
                <div class="card">
                    <div class="flex justify-between items-center mb-4">
                        <h3 style="font-size: 18px">${c.nome}</h3>
                        ${logo}
                    </div>
                    
                    <div class="mb-4">
                        <div class="flex justify-between text-muted" style="font-size: 13px; margin-bottom: 8px;">
                            <span>Limite Usado: <strong>${pct}%</strong></span>
                            <span>${App.formatCurrency(c.utilizado)} / ${App.formatCurrency(c.limite)}</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${pct}%; height: 100%; background: ${progressColor}; border-radius: 4px; transition: width 1s;"></div>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center pt-4" style="border-top: 1px solid var(--border)">
                        <div>
                            <div class="text-muted" style="font-size: 12px">Limite Disponível</div>
                            <div style="font-weight: 600; color: var(--success); font-size: 16px">${App.formatCurrency(disponivel)}</div>
                        </div>
                        <div>
                            <div class="text-muted" style="font-size: 12px; text-align: right">Fatura Atual</div>
                            <div style="font-weight: 600; color: var(--danger); font-size: 16px">${App.formatCurrency(c.utilizado)}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <p class="text-muted">Gerencie o limite e faturas dos seus cartões de crédito.</p>
                <button class="btn btn-primary" onclick="alert('Função de adicionar em desenvolvimento!')"><i class="ph ph-plus"></i> Novo Cartão</button>
            </div>
            
            <div class="grid grid-3">
                ${gridHtml}
            </div>
        `;
    }
};
