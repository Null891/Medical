/* ═══════════════════════════════════════════════════════════════
   MEDICINES — a list you can hand over, and one piece of timing.
   ───────────────────────────────────────────────────────────────
   Mentor feedback said "ask for their medicine". The useful version of
   that is a list somebody can show a clinician, on the Health Passport
   where it belongs. The dangerous version is an app that starts having
   opinions about drugs.

   THE HARD BOUNDARY, and it is enforced by a source-level test:

     NO dose arithmetic. NO interaction checking. NO contraindication
     logic. NO schedules, NO reminders, NO "you missed one".

   Every one of those is a real medical-device function, and every one
   of them is a thing this app would do badly. RenalRoute's existing
   medicines card already says "RenalRoute does not manage medications"
   — this module exists to keep that sentence true while still being
   useful.

   WHAT IT DOES DO. Two things, both defensible:

   1. Stores the list, locally, as free text. Names and doses as written
      on the packet, because that is what a clinician wants to read and
      what a patient can actually copy.

   2. Recognises phosphate binders by name and shows ONE line of
      timing: binders work when they are taken with food. That is not
      an interaction check and not a dose — it is the single most
      commonly missed piece of practical guidance about this drug
      class, it is the same for every binder, and it is exactly the
      moment somebody is looking at a meal.

   Nothing here reads a lab value, changes a mode, or alters a number.
   The recognised-name list is for surfacing education, never for
   deciding anything.
   ═══════════════════════════════════════════════════════════════ */

const Meds = (() => {

  /* Phosphate binders. Generic names plus the most common brand names,
     lowercased for matching. This list decides which piece of EDUCATION
     appears — never a dose, never a warning about combining anything. */
  const PHOSPHATE_BINDERS = [
    'sevelamer', 'renvela', 'renagel',
    'calcium acetate', 'phoslo', 'phoslyra', 'calphron',
    'lanthanum', 'fosrenol',
    'sucroferric', 'velphoro',
    'ferric citrate', 'auryxia',
    'calcium carbonate', 'tums'
  ];

  /* Potassium binders are a different class taken differently, and
     conflating them would be exactly the kind of sloppiness this file
     is trying to avoid. Recognised so the app can stay quiet about
     them rather than showing binder-with-food advice that does not
     apply. */
  const POTASSIUM_BINDERS = [
    'patiromer', 'veltassa',
    'sodium zirconium', 'lokelma',
    'sodium polystyrene', 'kayexalate'
  ];

  const KEY = 'medications';
  const MAXLEN = 800;

  const raw = () => String(Store.settings()[KEY] || '');
  function set(text) {
    Store.setSetting(KEY, String(text || '').slice(0, MAXLEN));
    return raw();
  }

  /* One medicine per line. No parsing of dose, frequency, or route —
     the text is stored and shown exactly as typed, because the moment
     this app starts interpreting a prescription it has become
     something it is not allowed to be. */
  const lines = () => raw().split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const count = () => lines().length;

  function matches(list) {
    const hay = raw().toLowerCase();
    return list.filter(name => hay.indexOf(name) !== -1);
  }

  const phosphateBinders = () => matches(PHOSPHATE_BINDERS);
  const potassiumBinders = () => matches(POTASSIUM_BINDERS);
  const hasPhosphateBinder = () => phosphateBinders().length > 0;

  return {
    KEY, MAXLEN, PHOSPHATE_BINDERS, POTASSIUM_BINDERS,
    raw, set, lines, count,
    phosphateBinders, potassiumBinders, hasPhosphateBinder
  };
})();
