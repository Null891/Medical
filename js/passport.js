/* ═══════════════════════════════════════════════════════════════
   HEALTH PASSPORT — the one screen that works when nothing else does.
   ───────────────────────────────────────────────────────────────
   Everything else in this app assumes somebody has time to read. This
   screen assumes they do not: it is for an ambulance bay, a locum who
   has never seen this patient, a pharmacy counter in another city.

   Design consequences, all of them unusual for this codebase:

     · It renders from local storage only. No network, no model, no
       lookup. If the app can open at all, this screen is complete.
     · It is the only screen with no ranges and no estimates on it.
       Everything here was TYPED BY THE PATIENT, and it says so, in
       those words, at the top. A clinician reading it must never
       wonder which numbers RenalRoute invented — the answer is none.
     · Nothing on it is derived. The app does not offer a stage it
       inferred, a target it suggested, or a trend it computed. Derived
       figures belong on screens where somebody can read the caveats.
     · It prints. That is not a nice-to-have: the most reliable
       emergency data transfer is still paper in a wallet.

   WHAT IT DELIBERATELY DOES NOT DO. No medication interaction
   checking, no dosing, no allergy logic. It is a place to write things
   down and hand them over. Any cleverness added here would be
   cleverness in the one place nobody can afford to audit it.
   ═══════════════════════════════════════════════════════════════ */

const Passport = (() => {

  const FIELDS = [
    { key: 'conditions',  label: 'Conditions',
      hint: 'Kidney diagnosis and anything else a stranger should know first.',
      placeholder: 'CKD stage G3b. Type 2 diabetes.' },
    /* Shares its storage key with js/meds.js, deliberately. The
       passport is where a medicine list is actually useful, and two
       separate lists would immediately disagree with each other. Meds
       reads this same field to recognise binders for the one timing
       note shown on a meal. */
    { key: 'medications', label: 'Medicines',
      hint: 'Names and doses as written on the packet. Include binders. One per line.',
      placeholder: 'Lisinopril 10mg daily\nSevelamer 800mg with meals' },
    { key: 'allergies',   label: 'Allergies and reactions',
      hint: 'What happened, not just the name.',
      placeholder: 'Penicillin — rash' },
    { key: 'clinic',      label: 'Kidney clinic',
      hint: 'Where your care team is, and their number.',
      placeholder: 'City Renal Unit — 555 0100' },
    { key: 'contact',     label: 'Emergency contact',
      hint: 'Name, relationship, phone.',
      placeholder: 'Ada Okafor, daughter — 555 0142' },
    { key: 'notes',       label: 'Anything else',
      hint: 'Whatever you would want said if you could not say it.',
      placeholder: 'No blood pressure cuff or needles in the left arm (fistula).' }
  ];

  const KEY = 'passport';
  const MAXLEN = 600;

  function data() {
    const raw = Store.settings()[KEY];
    return (raw && typeof raw === 'object') ? raw : {};
  }

  function set(key, value) {
    const next = Object.assign({}, data());
    next[key] = String(value || '').slice(0, MAXLEN);
    Store.setSetting(KEY, next);
    return next;
  }

  const filledCount = () => FIELDS.filter(f => (data()[f.key] || '').trim()).length;
  const isEmpty = () => filledCount() === 0;

  /* The lab block is the one place a stored value appears, and it is
     reproduced exactly as entered, with its date and the word
     "self-entered". A lab result on an emergency card that turns out to
     be three months old and paraphrased is worse than no lab result. */
  function labLine() {
    const labs = Store.labs();
    if (!labs.length) return null;
    const l = labs[0];
    const bits = [];
    if (l.serum_potassium_meq_l !== null && l.serum_potassium_meq_l !== undefined) {
      bits.push(`Potassium ${l.serum_potassium_meq_l} mEq/L`);
    }
    if (l.serum_phosphorus_mg_dl !== null && l.serum_phosphorus_mg_dl !== undefined) {
      bits.push(`Phosphorus ${l.serum_phosphorus_mg_dl} mg/dL`);
    }
    if (l.egfr_ml_min_1_73m2 !== null && l.egfr_ml_min_1_73m2 !== undefined) {
      bits.push(`eGFR ${l.egfr_ml_min_1_73m2}`);
    }
    if (!bits.length) return null;

    const age = Store.daysBetween(l.lab_date, Store.todayISO());
    return {
      text: bits.join(' · '),
      date: l.lab_date,
      stale: age > Clinical.STALE_DAYS,
      age
    };
  }

  /* Plain text, for the clipboard or an email. Same content, no markup,
     because the most portable format is the one that survives being
     pasted into anything. */
  function asText() {
    const p = Store.profile();
    const d = data();
    const out = ['HEALTH PASSPORT'];
    if (p.display_name) out.push(`Name: ${p.display_name}`);
    out.push('All of the following was entered by the patient, not measured or');
    out.push('calculated by RenalRoute.');
    out.push('');

    FIELDS.forEach(f => {
      const v = (d[f.key] || '').trim();
      if (!v) return;
      out.push(f.label.toUpperCase());
      v.split(/\n/).forEach(line => out.push('  ' + line));
      out.push('');
    });

    const lab = labLine();
    if (lab) {
      out.push('MOST RECENT LAB VALUES (self-entered)');
      out.push('  ' + lab.text);
      out.push(`  Dated ${lab.date}${lab.stale ? ' — over 3 months old' : ''}`);
      out.push('');
    }

    /* Weight, blood pressure and symptoms, exactly as recorded. No
       interpretation travels with them, because none was ever made. */
    if (typeof Vitals !== 'undefined') {
      const lines = Vitals.asLines(6);
      if (lines.length) {
        out.push('RECENT READINGS (self-recorded, not interpreted)');
        lines.forEach(l => out.push('  ' + l));
        out.push('');
      }
    }

    /* The next appointment's questions, on the card you carry into the
       room. This is the entire reason the appointment feature exists —
       a date is something every phone already stores. */
    if (typeof Vitals !== 'undefined') {
      const next = Vitals.nextAppointment();
      if (next && next.questions.trim()) {
        out.push(`QUESTIONS FOR ${next.date}${next.who ? ' — ' + next.who : ''}`);
        next.questions.split(/\r?\n/).forEach(q => { if (q.trim()) out.push('  ' + q.trim()); });
        out.push('');
      }
    }

    out.push(`Generated ${new Date().toLocaleDateString('en-US',
      { year: 'numeric', month: 'long', day: 'numeric' })} by RenalRoute,`);
    out.push('an educational wellness app. Not a medical record.');
    return out.join('\n');
  }

  return { FIELDS, KEY, MAXLEN, data, set, filledCount, isEmpty, labLine, asText };
})();
