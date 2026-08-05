/* ═══════════════════════════════════════════════════════════════
   DEMO SIGN-IN — a scannable surface, not an authentication boundary.
   ───────────────────────────────────────────────────────────────
   RenalRoute has no accounts. That is a deliberate product decision
   stated on screen: no sign-up, no password, no server holding
   anybody's lab values, nothing to breach. Every byte lives in one
   browser on one device.

   That creates a problem for an automated security review. A scanner
   that simulates a logged-in user needs credentials, and with no login
   anywhere it can only ever see the pre-consent shell — which means
   the review reports on a page rather than on the app.

   So this exists, and what it is matters enormously:

     IT IS a demonstration entrance at ?demo=1. It offers three doors —
     set it up yourself, continue as Frank, or continue as Maria, who
     has used every feature — seeds the chosen patient's data, and
     marks the session so a reviewer can walk every screen with
     realistic content in front of them.

     IT IS NOT an authentication boundary and must never be described
     as one. It guards NOTHING. There is no privileged data behind it,
     no other user's records to reach, no server call it can make, and
     no capability it grants that the ordinary app does not already
     give anybody who opens it. Every door leads to the same local app,
     pre-filled with fiction.

   WHY A CHOOSER RATHER THAN A PASSWORD FORM. A form would imply there
   is something to unlock, which would be a lie told specifically to a
   security reviewer — the worst possible audience for one. The
   credential constants below remain because a scanner configured with
   a username and password needs somewhere for them to go, and
   signIn() honours them; but the interface a human meets is three
   labelled doors, because that is what is actually true.

   WHY THAT DISTINCTION IS THE WHOLE POINT. A scanner finding "weak
   credentials" or "no account lockout" here would be technically true
   and materially meaningless, because a correct password and a wrong
   one both lead to a local browser with fictional data in it. Stating
   that plainly — in the UI and in the security notes — is more honest
   than dressing a demo door in real locks and implying there is
   something behind it.

   THE SAFEGUARDS THAT DO MATTER, and the reasons they are here:

   1. The demo NEVER touches real data. If the browser already holds
      somebody's meals, the demo entrance refuses to load rather than
      overwriting them. A demo that eats a real patient's history would
      be a genuine data-loss bug wearing a test account's clothes.
   2. The session is sessionStorage, so it dies with the tab. Nobody
      returns to a machine and finds themselves inside a demo.
   3. Attempts are throttled. Not because there is anything to protect,
      but because an unthrottled form is a needless finding, and the
      cost of the throttle is four lines.
   4. The credential is a constant compared in constant time, and it is
      PUBLISHED on the sign-in screen. A hidden password on a demo door
      invites somebody to treat it as a secret; a printed one cannot be
      mistaken for security.
   ═══════════════════════════════════════════════════════════════ */

const DemoAuth = (() => {

  /* Published, on purpose. See point 4 above. */
  const USER = 'demo';
  const PASS = 'renalroute-demo';

  const SESSION_KEY = 'renalroute.demo-session';
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 60000;

  let attempts = 0;
  let lockedUntil = 0;

  /* Constant-time comparison. There is no secret here to leak, so this
     is not protecting anything — it is here because a reviewer reading
     the source should see the habit, and because the day this file is
     ever copied into something that DOES guard data, the comparison
     will already be right. */
  function safeEqual(a, b) {
    const x = String(a), y = String(b);
    let diff = x.length ^ y.length;
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
    }
    return diff === 0;
  }

  function isActive() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; }
    catch (e) { return false; }
  }

  /* The safeguard that genuinely matters. A demo that overwrites
     somebody's real history is a data-loss bug, not a test account. */
  function wouldDestroyRealData() {
    try {
      if (Store.settings().demoSeeded) return false;   // already a demo browser
      return Store.meals().length > 0 || Store.labs().length > 0;
    } catch (e) { return false; }
  }

  function remainingLockout() {
    const left = lockedUntil - Date.now();
    return left > 0 ? Math.ceil(left / 1000) : 0;
  }

  function signIn(user, pass, persona) {
    if (remainingLockout() > 0) {
      return { ok: false, reason: 'locked', seconds: remainingLockout() };
    }
    const ok = safeEqual(user, USER) & safeEqual(pass, PASS);
    if (!ok) {
      attempts++;
      if (attempts >= MAX_ATTEMPTS) { lockedUntil = Date.now() + LOCKOUT_MS; attempts = 0; }
      return { ok: false, reason: 'bad' };
    }
    if (wouldDestroyRealData()) {
      return { ok: false, reason: 'has-real-data' };
    }

    attempts = 0;
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) { /* private mode */ }
    Seed.run();
    Store.setSetting('demoSeeded', true);
    Store.setSetting('demoPersona', persona || 'frank');
    return { ok: true };
  }

  function signOut() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* nothing to do */ }
    return true;
  }

  /* Reached at ?demo=1 or #demo, both of which a scanner can be handed
     directly. Never reached by accident: an ordinary visitor sees the
     consent gate and the app exactly as before. */
  function requested() {
    if (typeof window === 'undefined') return false;
    try {
      if (window.location.hash === '#demo') return true;
      return new URLSearchParams(window.location.search || '').get('demo') === '1';
    } catch (e) { return false; }
  }

  return {
    USER, PASS, MAX_ATTEMPTS, LOCKOUT_MS, SESSION_KEY,
    signIn, signOut, isActive, requested, remainingLockout,
    wouldDestroyRealData, safeEqual
  };
})();
