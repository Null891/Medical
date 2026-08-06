/* ═══════════════════════════════════════════════════════════════
   LAB SCAN — fast where it's boring, careful where it counts.
   ───────────────────────────────────────────────────────────────
   Typing three numbers off a lab report is twenty seconds of work that
   most people simply never do, which means the app's single strongest
   feature — individualising to somebody's own serum values instead of
   to their demographics — sits behind a wall of friction.

   The obvious safe design is to make the user confirm every extracted
   value. It is also the wrong one. Confirming three correct numbers,
   every time, punishes the ninety-five percent case to guard the five,
   and an app that is tedious in the exact place it is trying to remove
   tedium will not be used. "It gets boring" is a real objection, not a
   soft one.

   So the gate is on the BOUNDARY, not on the field.

     · Every value autofills immediately. No taps for the ordinary case.
     · A value that would leave the normal band — the ones that change
       what the app DOES — requires one explicit confirmation, and the
       prompt states what it would trigger.
     · Plausibility bounds still reject impossible readings outright,
       before any of this.

   The reasoning is that a misread decimal point is the entire risk
   surface here, and a misread decimal is only dangerous when it moves
   somebody across a band: 4.6 read as 4.8 changes nothing, 4.6 read as
   6.1 pauses all coaching. Guard the crossings and the ordinary case
   stays free.

   Nothing in this file decides a mode. It reports which mode a value
   WOULD produce so the interface can ask about it. Clinical.js remains
   the only place a threshold lives.
   ═══════════════════════════════════════════════════════════════ */

const LabScan = (() => {

  const FIELDS = [
    { key: 'k',    store: 'serum_potassium_meq_l',  label: 'Serum potassium',  unit: 'mEq/L' },
    { key: 'p',    store: 'serum_phosphorus_mg_dl', label: 'Serum phosphorus', unit: 'mg/dL' },
    { key: 'egfr', store: 'egfr_ml_min_1_73m2',     label: 'eGFR',             unit: 'mL/min/1.73m²' }
  ];

  /* Which mode a value would produce, computed from the SAME bands
     Clinical uses — deliberately re-expressed here as a pure function
     of a value, because Clinical's own versions read the stored latest
     lab and we need to ask about a number nobody has stored yet.

     If these two ever disagree, the tests fail: a test walks every band
     boundary through both paths and asserts they agree. */
  function wouldBeMode(key, value) {
    const v = Number(value);
    if (!isFinite(v)) return null;
    if (key === 'k') {
      if (v >= 6.0) return 'paused';
      if (v > 5.5)  return 'restricted';
      if (v >= 5.1) return 'caution';
      if (v >= 3.5) return 'normal';
      return 'low';
    }
    if (key === 'p') {
      if (v > 4.5) return 'caution';
      if (v < 2.5) return 'below_range';
      return 'normal';
    }
    return null;                      // eGFR changes no mode, ever
  }

  /* A value needs explicit confirmation when it would put the app into
     any state other than normal. Those are exactly the readings where a
     misread decimal changes what the app does rather than only what it
     displays. */
  /* The SENTENCES used to live here, in English, hard-coded — and being
     outside COPY they never translated. A Spanish reader got either an
     English clause inside a Spanish sentence, or (what the translator
     actually did) no clause at all: "This reads 6.2" with the half that
     says what 6.2 would DO silently removed. That is the informative
     half. Somebody told what a value will do can check it; somebody
     shown a bare "are you sure?" has been trained to tap yes.

     So this returns the MODE and the view looks up the wording. Logic
     names the state, copy says it, and it says it in whatever language
     the reader chose. Found by the numeral guard in test/verify.js once
     it was extended to call generated sentences rather than only
     comparing plain strings. */
  function needsConfirm(key, value) {
    const mode = wouldBeMode(key, value);
    if (!mode || mode === 'normal') return null;
    return { mode };
  }

  /* Rows for the UI: what was read, whether it is plausible at all, and
     whether it crosses a boundary. Nothing here is stored. */
  function review(extracted) {
    return FIELDS.map(f => {
      const raw = extracted ? extracted[f.key] : null;
      if (raw === null || raw === undefined || raw === '') {
        return { field: f, value: null, found: false, valid: true, confirm: null };
      }
      const check = Clinical.validateLab(f.key, String(raw));
      return {
        field: f,
        value: raw,
        found: true,
        valid: check.ok,
        error: check.ok ? null : check.message,
        // A value the bounds already rejected is never offered for
        // confirmation — it is not going to be stored either way.
        confirm: check.ok ? needsConfirm(f.key, raw) : null
      };
    });
  }

  /* True when every row that needs a confirmation has one. The save
     control reads this; it never inspects individual rows itself. */
  function ready(rows, confirmed) {
    return rows.every(r =>
      !r.found || !r.valid || !r.confirm || confirmed.indexOf(r.field.key) !== -1);
  }

  return { FIELDS, wouldBeMode, needsConfirm, review, ready };
})();
