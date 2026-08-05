/* ═══════════════════════════════════════════════════════════════
   INSTALL — putting the app on a phone's home screen.
   ───────────────────────────────────────────────────────────────
   This matters more here than it does for most web apps. Somebody
   managing a kidney diet uses this several times a day, in a kitchen,
   in a supermarket aisle, in a waiting room. A browser tab they have
   to find again is friction paid at every single meal; an icon on the
   home screen is not.

   THREE PLATFORMS, THREE BEHAVIOURS, and pretending otherwise is how
   install prompts end up broken:

     Chrome / Edge / Android — fire `beforeinstallprompt`, which can be
       captured and replayed later. The prompt is shown when the user
       asks for it, never on arrival: an install banner in somebody's
       face before they know what the app is gets dismissed, and a
       dismissed prompt does not come back.

     iOS Safari — fires nothing and exposes no API at all. The only
       route is Share → Add to Home Screen, so iOS gets written
       instructions naming the actual buttons rather than a control
       that cannot work.

     Already installed — no prompt, no instructions, just an
       acknowledgement. Asking somebody to install an app they are
       standing inside is the kind of detail that makes software feel
       unattended.

   Nothing here is required for the app to work. If this file failed to
   load, RenalRoute is a website that happens not to mention that it
   can also be an icon.
   ═══════════════════════════════════════════════════════════════ */

const Install = (() => {

  let deferred = null;          // the captured beforeinstallprompt event

  const isIOS = () =>
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent || '');

  /* "Standalone" is how a home-screen launch identifies itself. iOS
     uses a non-standard navigator flag; everyone else uses the media
     query. Both are checked because neither covers both. */
  function isInstalled() {
    if (typeof window === 'undefined') return false;
    if (navigator.standalone === true) return true;                    // iOS
    return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  }

  const canPrompt = () => !!deferred;

  /* State, for the UI to render from. One function so the settings
     card and any future entry point cannot disagree about what is
     possible on this device. */
  function state() {
    if (isInstalled()) return 'installed';
    if (canPrompt()) return 'ready';
    if (isIOS()) return 'ios';
    return 'unavailable';
  }

  async function prompt() {
    if (!deferred) return 'unavailable';
    deferred.prompt();
    let outcome = 'dismissed';
    try {
      const res = await deferred.userChoice;
      outcome = res && res.outcome ? res.outcome : 'dismissed';
    } catch (e) { /* a dismissed prompt is not an error */ }
    // The event is single-use; a second prompt() on it does nothing.
    deferred = null;
    return outcome;
  }

  function listen(onChange) {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeinstallprompt', (e) => {
      /* Prevented so the browser's own banner does not appear
         unbidden. The app asks on the user's terms instead, from
         Settings, where somebody who has decided they want this goes
         looking for it. */
      e.preventDefault();
      deferred = e;
      if (onChange) onChange(state());
    });
    window.addEventListener('appinstalled', () => {
      deferred = null;
      if (onChange) onChange('installed');
    });
  }

  /* ═══════════ deep links ═══════════
     The manifest declares four shortcuts — long-press the icon on
     Android and you get Log, Kitchen, Label, Passport. Each opens
     ./?go=<screen>, which is read once at boot and then removed from
     the URL so a refresh does not keep re-navigating somebody who has
     since moved on.

     Allow-listed rather than passed through: `?go=` comes from outside
     the app, and handing an arbitrary string to the router is how a
     query parameter becomes a way to put the app in a state nobody
     designed. */
  const DEEP_LINKS = ['log', 'kitchen', 'label', 'passport', 'labs', 'home', 'more'];

  function requestedScreen() {
    if (typeof window === 'undefined') return null;
    let target = null;
    try {
      const params = new URLSearchParams(window.location.search || '');
      const go = params.get('go');
      if (go && DEEP_LINKS.indexOf(go) !== -1) target = go;
      if (go && window.history && window.history.replaceState) {
        params.delete('go');
        const q = params.toString();
        window.history.replaceState({}, '',
          window.location.pathname + (q ? '?' + q : '') + window.location.hash);
      }
    } catch (e) { /* a malformed URL must never stop the app booting */ }
    return target;
  }

  return { listen, prompt, state, isInstalled, isIOS, canPrompt, requestedScreen, DEEP_LINKS };
})();
