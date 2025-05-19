// Nome do cache
const CACHE_NAME = 'habitacional-simulador-cache-v1';
// Lista de arquivos para cache
const urlsToCache = [
    '/', // Cache a página inicial
    'index.html',
    'style.css',
    'script.js',
    'manifest.json',
    // Adicione aqui os caminhos para seus arquivos de ícone
    'icon-192x192.png',
    'icon-512x512.png'
];

// Instalação do Service Worker e caching dos arquivos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Intercepta requisições e serve do cache, se disponível
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Retorna do cache se encontrado
                if (response) {
                    return response;
                }
                // Caso contrário, busca da rede
                return fetch(event.request);
            })
    );
});

// Ativação do Service Worker e limpeza de caches antigos
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Deleta caches que não estão na whitelist
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
