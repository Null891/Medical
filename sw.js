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

/* ── The shell ──
   Kept in step with index.html by a test, not by memory. This list had
   drifted seventeen assets behind the page — every module added after
   the first week was missing from it. The app still worked offline
   because the fetch handler below runtime-caches anything it
   successfully fetches, so a second visit was fine; what the stale list
   broke was the FIRST offline visit, and the icons were never cached at
   all, so an installed app could show a blank home-screen tile.

   test/sweep.js now compares this array against the assets index.html
   actually loads and fails on any difference. Regenerate with
   tools/make-icons.js's sibling logic if the page ever changes. */
const SHELL = [
  './',
  'index.html',
  '404.html',
  'manifest.webmanifest',

  /* Two joined files rather than thirty-four. See tools/build-assets.js:
     concatenation only, nothing removed or minified. Shortening this
     list is a side effect of the load-time work, not its point. */
  'css/bundle.css',
  'js/theme.js',
  'js/bundle.js',

  /* NOT in the bundle, on purpose: I18N.load() fetches whichever of
     these the reader picked, at runtime. They stay cached so somebody
     who chose Spanish still has Spanish offline. */
  'js/data/copy.es.js',
  'js/data/copy.zh.js',
  'js/data/copy.hi.js',

  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/icon.svg'
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
