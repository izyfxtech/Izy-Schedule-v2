const CACHE_NAME = 'izy-schedule-v2';
const FONTS_CACHE = 'izy-fonts-v1';
const BASE = '/Izy-Schedule-v2';

const PRECACHE_ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
];

const FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

// ── Install ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== FONTS_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Fonts — cache on first use
  if (FONT_ORIGINS.some(o => url.origin === o || url.href.startsWith(o))) {
    event.respondWith(
      caches.open(FONTS_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // App shell — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (
          response.ok &&
          event.request.method === 'GET' &&
          url.origin === self.location.origin
        ) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(`${BASE}/index.html`);
        }
      });
    })
  );
});

// ── Push notifications ──
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'IZY', body: 'Schedule reminder' };
  self.registration.showNotification(data.title || 'IZY', {
    body: data.body || '',
    icon: `${BASE}/icons/icon-192.png`,
    badge: `${BASE}/icons/icon-192.png`,
    vibrate: [200, 100, 200],
    tag: 'izy-reminder',
  });
});
