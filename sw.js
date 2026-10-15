// FinApp - Service Worker PWA
const CACHE_NAME = 'finapp-pwa-v2.2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './assets/app-icon.png',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './assets/apple-touch-icon.png',
    './assets/favicon-32x32.png',
    './assets/login_bg.png',
    './js/supabase-lib.js',
    './js/supabase.js',
    './js/store.js',
    './js/main.js',
    './js/auth.js',
    './js/subscription.js',
    './js/pricing.js',
    './js/onboarding.js',
    './js/views/dashboard.js',
    './js/views/lancamentos.js',
    './js/views/contas.js',
    './js/views/cartoes.js',
    './js/views/veiculo.js',
    './js/views/investimentos.js',
    './js/views/metas.js',
    './js/views/relatorios.js',
    './js/views/conta.js',
    './js/views/configuracoes.js',
    './js/views/admin.js'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('Alguns assets falharam no pre-cache inicial:', err);
            });
        })
    );
    self.skipWaiting();
});

// Activate Event - Limpa caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Estratégia Network-First para manter dados atualizados
self.addEventListener('fetch', (event) => {
    // Apenas requisições GET locais/estáticas
    if (event.request.method !== 'GET') return;
    
    // Ignorar requisições externas do Supabase e APIs
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
