window.Views.relatorios = {
    render: (container) => {
        let html = `
            <div class="flex justify-between items-center mb-4">
                <p class="text-muted">Visão completa das suas finanças através de gráficos dinâmicos.</p>
                <div class="flex gap-2">
                    <button class="btn" style="background: var(--bg-panel); border: 1px solid var(--border); color: var(--text-main)"><i class="ph ph-file-pdf"></i> Exportar PDF</button>
                    <button class="btn btn-primary"><i class="ph ph-funnel"></i> Filtrar Período</button>
                </div>
            </div>
            
            <div class="grid grid-2 mb-4">
                <div class="card">
                    <h3 class="mb-4">Fluxo de Caixa (Receitas x Despesas)</h3>
                    <canvas id="rel-fluxo"></canvas>
                </div>
                <div class="card">
                    <h3 class="mb-4">Gastos por Categoria</h3>
                    <canvas id="rel-categorias"></canvas>
                </div>
            </div>
            
            <div class="grid grid-2 mb-4">
                <div class="card">
                    <h3 class="mb-4">Evolução Patrimonial</h3>
                    <canvas id="rel-patrimonio"></canvas>
                </div>
                <div class="card">
                    <h3 class="mb-4">Gastos do Veículo vs Cartões</h3>
                    <canvas id="rel-veiculo-cartoes"></canvas>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Render charts
        setTimeout(() => {
            // Fluxo de caixa
            new Chart(document.getElementById('rel-fluxo'), {
                type: 'line',
                data: {
                    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                    datasets: [
                        { label: 'Receitas', data: [5000, 5200, 5100, 5500, 5400, 8500], borderColor: '#2a9d8f', tension: 0.4 },
                        { label: 'Despesas', data: [3000, 3100, 2800, 3500, 3200, 770], borderColor: '#e63946', tension: 0.4 }
                    ]
                },
                options: { responsive: true, plugins: { legend: { labels: { color: '#f8f9fa' } } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#adb5bd' } }, x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#adb5bd' } } } }
            });
            
            // Categorias
            new Chart(document.getElementById('rel-categorias'), {
                type: 'pie',
                data: {
                    labels: ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde'],
                    datasets: [{
                        data: [2500, 1200, 600, 400, 300],
                        backgroundColor: ['#0a9396', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#f8f9fa' } } } }
            });
            
            // Patrimônio
            new Chart(document.getElementById('rel-patrimonio'), {
                type: 'bar',
                data: {
                    labels: ['2023', '2024', '2025', '2026'],
                    datasets: [{
                        label: 'Patrimônio Líquido',
                        data: [15000, 35000, 60000, 85000],
                        backgroundColor: '#0a9396',
                        borderRadius: 4
                    }]
                },
                options: { responsive: true, plugins: { legend: { labels: { color: '#f8f9fa' } } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#adb5bd' } }, x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#adb5bd' } } } }
            });
            
            // Veiculo vs Cartoes
            new Chart(document.getElementById('rel-veiculo-cartoes'), {
                type: 'radar',
                data: {
                    labels: ['Nubank', 'Inter', 'XP', 'Combustível', 'Manutenção', 'Seguro'],
                    datasets: [{
                        label: 'Gastos',
                        data: [2450, 500, 0, 800, 300, 2500],
                        backgroundColor: 'rgba(10, 147, 150, 0.2)',
                        borderColor: '#0a9396',
                        pointBackgroundColor: '#0a9396'
                    }]
                },
                options: { responsive: true, plugins: { legend: { labels: { color: '#f8f9fa' } } }, scales: { r: { grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#adb5bd' }, ticks: { backdropColor: 'transparent', color: '#adb5bd' } } } }
            });
            
        }, 100);
    }
};
