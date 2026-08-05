/* ═══════════════════════════════════════════════════════════════
   I18N — one language table swapped for another.
   ───────────────────────────────────────────────────────────────
   This is tractable only because of a decision made on the first day:
   js/data/copy.js holds every user-facing string in the app and
   nothing else hard-codes prose. Translating is therefore swapping one
   object for another, not hunting strings through twenty files.

   THREE RULES, and the second is the one that matters clinically.

   1. FALLBACK IS PER KEY, NOT PER LANGUAGE. A missing translation
      falls back to the English string for that key alone. A partly
      translated app is then a mix of two languages — which is
      awkward — rather than a screen with "undefined" on it, which is
      broken. Awkward and readable beats broken every time.

   2. NUMBERS AND THRESHOLDS ARE NEVER LOCALISED. Every band, cutoff,
      milligram figure and guideline value is identical in every
      language, because they are quoted from KDOQI, KDIGO, AKF and
      NICE — not authored here. A translator may render the sentence
      around 5.5 mEq/L however their language requires; 5.5 stays 5.5.
      A test asserts every numeral present in an English string is
      present in its translation.

   3. THE DISCLAIMERS TRANSLATE, AND MUST. A consent gate somebody
      cannot read is not consent. These are the strings where a rough
      translation is worse than none, and they are flagged for human
      review in each language file.

   WHAT IS NOT CLAIMED. These translations were produced by a language
   model and have not been reviewed by a clinician or a native-speaker
   translator. The app says so, in the target language, on the language
   picker. Shipping unreviewed clinical copy while claiming it is
   reviewed would be the exact failure this product spends its whole
   design avoiding.
   ═══════════════════════════════════════════════════════════════ */

const I18N = (() => {

  const DEFAULT = 'en';

  /* Registry. Each entry names the table global and the script
     direction; adding a language means adding a file and a row. */
  const LANGUAGES = [
    { code: 'en', label: 'English',  native: 'English',  table: null,        dir: 'ltr' },
    { code: 'es', label: 'Spanish',  native: 'Español',  table: 'COPY_ES',   dir: 'ltr' },
    { code: 'zh', label: 'Chinese',  native: '简体中文',  table: 'COPY_ZH',   dir: 'ltr' },
    { code: 'hi', label: 'Hindi',    native: 'हिन्दी',     table: 'COPY_HI',   dir: 'ltr' }
  ];

  const byCode = (c) => LANGUAGES.find(l => l.code === c) || LANGUAGES[0];

  function current() {
    let code;
    try { code = Store.settings().lang; } catch (e) { code = null; }
    return byCode(code || DEFAULT).code;
  }

  function tableFor(code) {
    const lang = byCode(code);
    if (!lang.table) return null;
    /* Read from the registry the language files populate themselves,
       NOT by looking up the table's name on the global object.

       A top-level `const` in a classic script lives in the global
       lexical environment and never becomes a property of window or
       globalThis. Looking up globalThis['COPY_ES'] therefore always
       returned undefined — in the browser as well as in the tests — and
       every language silently fell back to English while the picker
       reported a coverage percentage. The feature would have shipped
       completely inert. */
    const g = (typeof globalThis !== 'undefined') ? globalThis : window;
    const tables = g.COPY_TABLES || {};
    return tables[lang.code] || null;
  }

  /* ── The merge ──
     Deep, key by key, English underneath. Functions are taken whole
     from whichever side provides them, because a translated function is
     a different sentence template and cannot be partially merged.

     Arrays are taken whole too: a half-translated list would interleave
     languages inside one bullet list, which reads as a bug rather than
     as a fallback. */
  function merge(base, over) {
    if (!over) return base;
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(over).forEach(k => {
      const b = base ? base[k] : undefined;
      const o = over[k];
      if (o === null || o === undefined || o === '') return;      // absent = fall back
      if (typeof o === 'object' && !Array.isArray(o) && typeof o !== 'function' &&
          b && typeof b === 'object' && !Array.isArray(b)) {
        out[k] = merge(b, o);
      } else {
        out[k] = o;
      }
    });
    return out;
  }

  /* Applied once at boot and again on every change. COPY is rebound
     rather than mutated in place so nothing can hold a stale table. */
  function apply(code) {
    const lang = byCode(code);
    const table = tableFor(lang.code);
    const merged = table ? merge(COPY_EN, table) : COPY_EN;

    globalThis.COPY = merged;
    if (typeof window !== 'undefined' && window !== globalThis) window.COPY = merged;

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang.code);
      document.documentElement.setAttribute('dir', lang.dir);
      // Non-Latin scripts need more vertical room at the same size;
      // the stylesheet keys off this rather than off the language.
      document.documentElement.setAttribute('data-script',
        lang.code === 'zh' ? 'cjk' : lang.code === 'hi' ? 'devanagari' : 'latin');
    }
    return merged;
  }

  function set(code) {
    const lang = byCode(code);
    try { Store.setSetting('lang', lang.code); } catch (e) { /* pre-boot */ }
    return apply(lang.code);
  }

  /* Speech recognition needs a BCP-47 tag, not our two-letter code.
     Regional variants are a real choice: es-US rather than es-ES
     because the largest Spanish-speaking CKD population this app is
     likely to reach is in the United States. [NEEDS VERIFICATION —
     recognition quality per tag has not been tested on a device.] */
  const SPEECH_TAG = { en: 'en-US', es: 'es-US', zh: 'zh-CN', hi: 'hi-IN' };
  const speechTag = (code) => SPEECH_TAG[code || current()] || 'en-US';

  /* Coverage, for the language picker and for the tests. Reported
     honestly: a language that is 60% translated says so rather than
     presenting itself as finished. */
  function coverage(code) {
    const table = tableFor(code);
    if (!table) return { code, keys: 0, total: countKeys(COPY_EN), pct: code === 'en' ? 100 : 0 };
    const total = countKeys(COPY_EN);
    const keys = countKeys(table);
    return { code, keys, total, pct: Math.round((keys / total) * 100) };
  }

  function countKeys(obj) {
    let n = 0;
    Object.keys(obj || {}).forEach(k => {
      const v = obj[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) n += countKeys(v);
      else n += 1;
    });
    return n;
  }

  return { DEFAULT, LANGUAGES, byCode, current, set, apply, merge, coverage, countKeys, speechTag, tableFor };
})();
