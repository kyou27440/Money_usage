/* ============================================
   SW.JS — PWA 모바일 앱 지원 Service Worker
   ============================================ */

const CACHE_NAME = 'mony-club-v5.4.0';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(k => caches.delete(k)));
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    // Network-First strategy to ensure latest data & code
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
