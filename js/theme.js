/* ═══════════════════════════════════════════════════════════════
   THEME — applied before first paint.

   This is a separate file loaded in <head> rather than an inline
   <script> because the Content-Security-Policy sets script-src 'self',
   which blocks inline script outright. Running here, ahead of the
   stylesheet's first paint, is what stops a user who chose dark from
   seeing a white flash on every page load.

   Three states, and "system" is the default: the device already knows
   whether it is night, and most people never touch a theme control. The
   explicit choices exist because "follow the device" is wrong for the
   people whose device setting does not match their eyes — someone using
   dark mode system-wide for battery who still needs the higher-contrast
   light palette to read a milligram figure.
   ═══════════════════════════════════════════════════════════════ */

(function applyThemeEarly() {
  var STORE_KEY = 'renalroute.v1';
  var pref = 'system';

  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      var t = parsed && parsed.settings && parsed.settings.theme;
      if (t === 'light' || t === 'dark') pref = t;
    }
  } catch (e) {
    /* Corrupt or unavailable storage must never stop the app booting —
       the device preference is a perfectly good answer. */
  }

  // "system" leaves the attribute off entirely, so the media query in
  // tokens.css governs and there is nothing to keep in sync.
  if (pref === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', pref);
  }

  // Text size and contrast ride along here for the same reason: applying
  // them after first paint would reflow the page under the reader.
  var settings = {};
  try {
    var r2 = localStorage.getItem(STORE_KEY);
    if (r2) settings = (JSON.parse(r2) || {}).settings || {};
  } catch (e) { /* defaults are fine */ }

  var size = settings.textSize;
  if (size === 'large' || size === 'xlarge') {
    document.documentElement.setAttribute('data-textsize', size);
  } else {
    document.documentElement.removeAttribute('data-textsize');
  }

  if (settings.highContrast) {
    document.documentElement.setAttribute('data-contrast', 'high');
  } else {
    document.documentElement.removeAttribute('data-contrast');
  }
})();
