// BJWifi — main.js (vanilla, minimal)
// Fungsi: lightbox galeri promo, toggle nav mobile, registrasi service worker (offline-first).
// FAQ pakai <details> native (tidak perlu JS).

document.addEventListener('DOMContentLoaded', function () {

  // ---------- Mobile nav toggle ----------
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  var navBackdrop = document.getElementById('navBackdrop');
  var navClose = document.getElementById('navClose');

  function setNavOpen(isOpen) {
    mainNav.classList.toggle('is-open', isOpen);
    navToggle.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.classList.toggle('nav-open', isOpen);
  }

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      setNavOpen(!mainNav.classList.contains('is-open'));
    });

    // Tutup menu saat salah satu link diklik (kecuali tombol CTA WhatsApp, biar langsung buka WA)
    mainNav.querySelectorAll('a:not(.nav-cta)').forEach(function (link) {
      link.addEventListener('click', function () { setNavOpen(false); });
    });

    // Tutup menu saat backdrop (area luar) diklik
    if (navBackdrop) {
      navBackdrop.addEventListener('click', function () { setNavOpen(false); });
    }

    // Tutup menu lewat tombol ✕ di dalam panel
    if (navClose) {
      navClose.addEventListener('click', function () { setNavOpen(false); });
    }

    // Tutup menu dengan tombol Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mainNav.classList.contains('is-open')) setNavOpen(false);
    });

    // Tutup menu saat resize ke layar besar
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860 && mainNav.classList.contains('is-open')) setNavOpen(false);
    });
  }

  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var closeBtn = document.getElementById('lightboxClose');
  var items = document.querySelectorAll('.gallery-item');

  items.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var full = btn.getAttribute('data-full');
      var alt = btn.querySelector('img').getAttribute('alt');
      lightboxImg.src = full;
      lightboxImg.alt = alt;
      lightbox.classList.add('open');
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightboxImg.src = '';
  }

  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });
});

// ---------- Offline-first: registrasi Service Worker ----------
// Meng-cache aset penting agar situs tetap terbuka (versi terakhir) walau
// sinyal 3G ke bawah atau sedang tanpa koneksi sama sekali.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function () {
      // Diamkan kegagalan pendaftaran SW (mis. dibuka dari file:// atau browser lama)
      // agar tidak mengganggu pengalaman utama pengguna.
    });
  });
}
