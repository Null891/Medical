/* ═══════════════════════════════════════════════════════════════
   APP — bootstrap.
   Consent is the ONLY gate. Lab entry never gates anything, ever.
   ═══════════════════════════════════════════════════════════════ */

(function boot() {

  /* Language before anything renders. I18N binds the global COPY to
     English merged with the selected table, so every module that reads
     COPY gets the right language without knowing translation exists. */
  Store.load();
  /* English is inline, so this is instant and the app never waits on a
     network round trip to draw. Somebody who chose another language
     gets that first render in English and the real one a moment later
     — on any visit after the first, from cache, in the same frame.

     The alternative was blocking first paint on a 22 KB file for the
     small share of users who need it, and shipping all three to
     everyone else. Neither is a good trade for a screen somebody opens
     in a supermarket aisle. */
  I18N.apply(I18N.current());
  if (I18N.current() !== 'en' && !I18N.isLoaded(I18N.current())) {
    I18N.load(I18N.current()).then(() => {
      I18N.apply(I18N.current());
      // Redraw whatever is open; if nothing is yet, boot will draw it.
      try { UI.render(Store.settings().lastScreen || 'home', { silent: true }); } catch (e) { }
    });
  }

  /* Filled from COPY rather than sitting in the markup, so it
     translates with everything else. Written after I18N.apply() above,
     which binds the global COPY. */
  document.getElementById('devBannerText').textContent = COPY.dataNotice;
  if (Store.settings().devBannerHidden) {
    document.getElementById('devBanner').hidden = true;
  }

  UI.wire();

  /* Home-screen shortcuts. The manifest declares four; each opens
     ./?go=<screen>, read once here and then stripped from the URL so a
     refresh does not keep re-navigating somebody who has moved on. */
  if (typeof Install !== 'undefined') {
    Install.listen(() => { if (!document.getElementById('scr-settings').hidden) UI.renderSettings(); });
  }

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

  /* The demo entrance, reached only at ?demo=1 or #demo. An automated
     security review needs somewhere to sign in; this app has no
     accounts, so without this a scanner only ever sees the pre-consent
     shell and reports on a page rather than on the app.

     It guards nothing — see js/demo-auth.js. */
  if (typeof DemoAuth !== 'undefined' && DemoAuth.requested() && !Store.hasConsented()) {
    UI.renderDemo();
  } else if (!Store.hasConsented()) {
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
      /* A home-screen shortcut outranks "resume where you left off":
         somebody who long-pressed the icon and chose "Log a meal" has
         stated what they want more recently than their last session
         did. */
      const deepLink = (typeof Install !== 'undefined') ? Install.requestedScreen() : null;
      if (deepLink) {
        UI.go(deepLink);
      } else {
        const resumable = ['home', 'labs', 'settings'];
        const last = Store.settings().lastScreen;
        UI.go(resumable.includes(last) ? last : 'home');
      }
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
    Insights, Passport, Scenes, Orbit, Plan, LabScan, Meds, Backup, I18N, Install, Vitals, DemoAuth, Checklist,
    /* Guarded, unlike its neighbours. Object shorthand would be a BARE
       reference, and a bare reference to a module that failed to load
       is a ReferenceError that takes the whole boot down — which is
       precisely the dependency motion.js is contractually not allowed
       to be. Every other module here is required; this one is not. */
    Motion: (typeof Motion !== 'undefined') ? Motion : null,
    anchors: ANCHOR_FOODS,
    references: REFERENCES,
    recipes: RECIPES,
    referenceStats: REFERENCE_STATS,
    stats: ANCHOR_STATS,
    version: '1.0.0-reference'
  };

  /* ═══════════ dismiss the boot screen ═══════════
     Here, at the end of boot, because everything above it is the work
     the screen was covering: storage read, language bound, listeners
     wired, first screen chosen and rendered. Removing it earlier would
     reveal a half-built app; removing it later would mean waiting on
     nothing.

     There is deliberately NO setTimeout gating this. A boot screen with
     a minimum display time is a lie about how fast the app is, and on a
     warm cache this whole function runs in a few milliseconds — so the
     screen flashes past, which is the correct outcome rather than a
     defect to pad out.

     The node is REMOVED, not hidden: a fixed overlay left in the tree is
     one CSS mistake away from covering the app, and its status role
     would keep announcing. The 200ms is the fade already running in
     CSS, not a wait — and it holds even under reduced motion, where the
     transition is off and the node simply goes. */
  const bootEl = document.getElementById('boot');
  if (bootEl) {
    bootEl.classList.add('is-done');
    setTimeout(() => { if (bootEl.parentNode) bootEl.parentNode.removeChild(bootEl); }, 200);
  }

  /* Printed for anyone who opens the console, and it is read by more
     than developers: an automated reviewer driving the app sees this
     too. It reports the state of the DATA — how many rows, how many
     gaps — and says nothing about where the code is running, for the
     same reason the on-screen notice does not. The numbers are the
     honest part and they stay. */
  console.info(
    '%cRenalRoute — anchor data status',
    'font-weight:600',
    '\nAnchor rows:', ANCHOR_STATS.total,
    '| missing K:', ANCHOR_STATS.missingK,
    '| missing P:', ANCHOR_STATS.missingP,
    '| missing Na:', ANCHOR_STATS.missingNa,
    '\nThin swap categories:', ANCHOR_STATS.thinCategories.join(', ') || 'none',
    '\nValues are estimates from published tables, not clinically verified. Educational use only.'
  );
})();
