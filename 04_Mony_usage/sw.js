/* ============================================
   SW.JS — Service Worker (PWA 오프라인 캐싱)
   ============================================ */

const CACHE_NAME = 'mony-dashboard-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/index.css',
    './css/sidebar.css',
    './css/dashboard.css',
    './css/personal.css',
    './css/club.css',
    './css/exchange.css',
    './css/analytics.css',
    './css/settings.css',
    './css/modal.css',
    './css/mobile.css',
    './js/config.js',
    './js/store.js',
    './js/utils.js',
    './js/modal.js',
    './js/router.js',
    './js/app.js',
    './js/pages/dashboard.js',
    './js/pages/personal.js',
    './js/pages/club.js',
    './js/pages/exchange.js',
    './js/pages/analytics.js',
    './js/pages/settings.js',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// 설치: 정적 자산 캐싱
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// 활성화: 이전 캐시 정리
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// 요청 가로채기: Network First (Supabase API), Cache First (정적 자산)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Supabase API 요청 → 네트워크 우선
    if (url.hostname.includes('supabase.co')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // CDN 리소스 (Chart.js, Supabase JS, Google Fonts) → 네트워크 우선, 캐시 폴백
    if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
        event.respondWith(
            fetch(event.request).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            }).catch(() => caches.match(event.request))
        );
        return;
    }

    // 정적 자산 → 캐시 우선, 네트워크 폴백
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            });
        })
    );
});
