// BJWifi Service Worker — offline-first untuk jaringan lambat (3G ke bawah)
// Strategi:
//  - HTML (navigasi)   : network-first, fallback ke cache -> tetap bisa dibuka saat offline/putus,
//                         dan selalu dapat versi terbaru saat online.
//  - CSS/JS/gambar/font: cache-first + update di background (stale-while-revalidate)
//                         -> render instan walau sinyal lemah.

const VERSION = 'v1';
const STATIC_CACHE = 'bjwifi-static-' + VERSION;
const PAGES_CACHE = 'bjwifi-pages-' + VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/js/main.js',
  './manifest.webmanifest',
  './assets/img/icons/icon-192.png',
  './assets/img/icons/icon-512.png',
  './assets/img/produk/wifi-rumah-tanpa-kabel-400w.webp',
  './assets/img/produk/fwa-5g-400w.webp',
  './assets/img/produk/paket-internet-only-400w.webp',
  './assets/img/produk/paket-bulanan-bonus-speed-400w.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== PAGES_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.origin === self.location.origin &&
    /\.(css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname)
  ) || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

// Network-first (fallback ke cache) — dipakai untuk dokumen HTML.
async function networkFirst(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const fresh = await fetch(request);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await caches.match('./index.html');
    if (fallback) return fallback;
    throw err;
  }
}

// Cache-first + revalidate di background — dipakai untuk aset statis.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached || networkPromise || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
