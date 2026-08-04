/* ═══════════════════════════════════════════════════════════════
   SERVICE WORKER — offline, without the staleness trap.

   NETWORK FIRST, cache as fallback. Not the other way round.

   The usual cache-first service worker is faster and is the wrong
   choice here. It serves whatever it stored last, which means a browser
   that visited this app once can keep showing that build long after it
   has been replaced — and the failure is silent, survives a refresh,
   and is miserable to diagnose. During a judged demo that is not a
   performance trade-off, it is a live grenade.

   So: always try the network, fall back to the cache only when the
   network genuinely fails. The app then works with no connection, and
   a connected visitor always gets current code. The cost is a few
   milliseconds per request, which nobody will feel on a page this size.

   Everything here is same-origin by construction; the CSP declares
   worker-src 'self' and there is nothing external to cache.
   ═══════════════════════════════════════════════════════════════ */

const VERSION = 'renalroute-v1';

const SHELL = [
  './',
  'index.html',
  'css/tokens.css',
  'css/app.css',
  'js/theme.js',
  'js/data/copy.js',
  'js/data/anchor-foods.js',
  'js/store.js',
  'js/clinical.js',
  'js/resolve.js',
  'js/llm.js',
  'js/cards.js',
  'js/rings.js',
  'js/trends.js',
  'js/exporter.js',
  'js/ui.js',
  'js/seed.js',
  'js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      // A single missing file must not abort the whole install and
      // leave the app with no offline copy at all.
      .then(cache => Promise.allSettled(SHELL.map(u => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only GETs are cacheable, and only our own origin is ours to serve.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Never cache meal parsing. A stale meal analysis is a wrong nutrient
  // figure presented as a fresh one, which is the failure this whole
  // app is built to avoid.
  if (req.url.includes('/api/')) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
  );
});
