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
      UI.go('home');
    }
  }

  // Expose a small surface for console testing against the Base44 build.
  window.RenalRoute = {
    Store, Clinical, Resolve, LLM, Cards, Rings, Seed, UI,
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
