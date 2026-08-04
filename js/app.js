/* ═══════════════════════════════════════════════════════════════
   APP — bootstrap.
   Consent is the ONLY gate. Lab entry never gates anything, ever.
   ═══════════════════════════════════════════════════════════════ */

(function boot() {

  Store.load();

  if (Store.settings().devBannerHidden) {
    document.getElementById('devBanner').hidden = true;
  }

  UI.wire();

  /* Signature behaviours: the cursor spotlight, the condensing rail,
     and the drifting background highlight. All three are decoration in
     the strict sense — if motion.js failed to load, nothing a user
     needs and nothing a screen reader announces would be missing. */
  if (typeof Motion !== 'undefined') Motion.init();

  /* Connectivity. Only meal parsing needs the network, so losing it
     degrades one path rather than breaking the app — the banner says so
     instead of leaving someone to discover it by failing to log. */
  const offlineBanner = document.getElementById('offlineBanner');
  const syncOnline = () => { offlineBanner.hidden = navigator.onLine !== false; };
  window.addEventListener('online', syncOnline);
  window.addEventListener('offline', syncOnline);
  syncOnline();

  if (!Store.hasConsented()) {
    // Nothing behind the modal is reachable until it is acknowledged.
    UI.renderConsent();
  } else {
    document.getElementById('app').hidden = false;
    const p = Store.profile();
    // A user who consented but never finished choosing targets resumes
    // onboarding rather than landing on an app that can't draw rings.
    if (p.budget_source === 'none' && !Store.meals().length) {
      UI.go('onboarding');
      UI.renderOnboarding();
    } else {
      // Resume where they were, but only somewhere it is safe to land.
      const resumable = ['home', 'labs', 'settings'];
      const last = Store.settings().lastScreen;
      UI.go(resumable.includes(last) ? last : 'home');
    }
  }

  /* Offline support. Registered only over http(s) — a service worker
     cannot install from file://, and attempting it throws noise into the
     console of anyone who opens index.html by double-clicking it, which
     is a supported way to run this build. */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        /* No offline cache is a degraded experience, never a broken one. */
      });
    });
  }

  // Expose a small surface for console testing against the Base44 build.
  window.RenalRoute = {
    Store, Clinical, Resolve, LLM, Cards, Rings, Trends, Exporter, Seed, UI,
    /* Guarded, unlike its neighbours. Object shorthand would be a BARE
       reference, and a bare reference to a module that failed to load
       is a ReferenceError that takes the whole boot down — which is
       precisely the dependency motion.js is contractually not allowed
       to be. Every other module here is required; this one is not. */
    Motion: (typeof Motion !== 'undefined') ? Motion : null,
    anchors: ANCHOR_FOODS,
    stats: ANCHOR_STATS,
    version: '1.0.0-reference'
  };

  console.info(
    '%cRenalRoute reference build',
    'font-weight:600',
    '\nAnchor rows:', ANCHOR_STATS.total,
    '| missing K:', ANCHOR_STATS.missingK,
    '| missing P:', ANCHOR_STATS.missingP,
    '| missing Na:', ANCHOR_STATS.missingNa,
    '\nThin swap categories:', ANCHOR_STATS.thinCategories.join(', ') || 'none',
    '\nAll values are unverified test data. Not for clinical use.'
  );
})();
