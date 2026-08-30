// BJWifi Service Worker — offline-first untuk jaringan lambat (3G ke bawah)
// STRATEGI UPDATE (biar tiap deploy langsung kelihatan, tanpa manual bump versi):
//  - Dokumen HTML + "app shell" (CSS/JS/manifest): network-first.
//      -> saat online selalu ambil versi terbaru dari server;
//         saat offline/putus pakai versi terakhir yang ada di cache.
//  - Media (gambar/font): cache-first + update di background (stale-while-revalidate).
//      -> render instan walau sinyal lemah, tanpa menahan update halaman.
//
// Kalau suatu saat gambar bin diganti dan mau wajib tampil langsung di semua
// pengunjung tanpa nunggu reload kedua: tambah query string di src HTML-nya,
// misal bjwifi-nav.png?v=2 — itu otomatis jadi entri cache baru.

const VERSION = 'v3';
const STATIC_CACHE = 'bjwifi-static-' + VERSION;
const PAGES_CACHE = 'bjwifi-pages-' + VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/js/main.js',
  './manifest.webmanifest',
  './assets/img/bjwifi-nav.png',
  './assets/img/icons/favicon.png',
  './assets/img/icons/apple-touch-icon.png',
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

// Network-first (fallback ke cache) — untuk HTML navigasi dan app shell.
async function networkFirst(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await caches.match('./index.html');
    if (fallback) return fallback;
    throw err;
  }
}

// Cache-first + revalidate di background — untuk media (gambar/font).
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

  const url = new URL(request.url);

  // Font Google: cache-first + revalidate (URL asset Google sudah hashed & stabil).
  if (url.origin !== self.location.origin) {
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }

  // App shell (CSS/JS/manifest): selalu segar saat online, fallback cache saat offline.
  if (/\.(css|js|webmanifest)$/.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Media (gambar): cache-first + update di background (cepat, tidak blokir update).
  if (/\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});