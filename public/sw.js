// Service worker minimo: cacheia SOMENTE assets estaticos (css/js/icones/favicon/manifest),
// cache-first. Nunca intercepta HTML nem respostas de rota/API - dados por usuario/sessao nunca
// passam por aqui, pra nao arriscar servir uma pagina autenticada desatualizada offline.
// Registrado so em producao (ver public/js/register-sw.js + isProd nos layouts).

const CACHE_VERSION = 'sketch-static-v1';

const PRECACHE_URLS = [
  '/css/reset.css',
  '/css/tokens.css',
  '/css/components.css',
  '/css/styles.css',
  '/js/theme-toggle.js',
  '/js/locale-toggle.js',
  '/js/timezone.js',
  '/js/back-button.js',
  '/js/confirm-submit.js',
  '/js/activity-form.js',
  '/js/category-form.js',
  '/js/activity-detail-modal.js',
  '/js/in-progress-timer.js',
  '/js/scroll-reveal.js',
  '/js/marketing-slider.js',
  '/js/marketing-navbar.js',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

const CACHEABLE_PREFIXES = ['/css/', '/js/', '/icons/'];
const CACHEABLE_EXACT = ['/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // cache.add falha a promise inteira se UM recurso 404 - por isso cada item é isolado com
      // .catch(), pra um asset ausente (ex.: lista desatualizada) não derrubar o precache inteiro.
      Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

function isCacheableStaticAsset(url) {
  const pathname = new URL(url).pathname;
  return CACHEABLE_EXACT.includes(pathname) || CACHEABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !isCacheableStaticAsset(request.url)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, responseClone));
        }
        return response;
      });
    })
  );
});
