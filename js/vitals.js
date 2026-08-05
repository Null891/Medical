/* ═══════════════════════════════════════════════════════════════
   VITALS — recorded, never interpreted.
   ───────────────────────────────────────────────────────────────
   Weight, blood pressure and how somebody is feeling are the three
   things a renal clinic asks about that this app was not capturing.
   All three are routinely tracked in CKD, all three are things people
   are told to write down, and almost nobody does, because writing them
   down means finding a notebook.

   THE LINE THIS MODULE DOES NOT CROSS, and it is the same line the
   medicines module holds: it RECORDS. It does not interpret.

     · No blood-pressure categories. Not "normal", not "stage 1", not
       a colour. Those categories are a clinical judgement that depends
       on somebody's targets, their medication, and what their team is
       treating for — and a green badge on a reading a nephrologist
       would act on is the worst thing this app could produce.
     · No weight targets and no trend verdicts. Weight change in CKD
       can be fluid, muscle, or diet, and telling those apart is the
       entire skill. An arrow pointing up means nothing here.
     · No symptom scoring and no advice. A symptom list becomes a
       triage tool the moment it has a threshold on it.

   What it DOES do is make the numbers easy to write down and easy to
   hand over: they appear on the health passport, they go into the
   export, and they carry their date. That is the whole feature, and it
   is genuinely the thing people are asked for at appointments.

   Plausibility bounds exist for the same reason they exist on labs:
   an implausible value is far more likely a typo than a real reading,
   and a typo that lands in a document somebody shows a clinician is
   worse than a rejected entry. The bounds are engineering guards and
   the copy says so — they are deliberately wide enough to accept
   readings a clinician would find alarming, because refusing to record
   an alarming true value would be the worst possible failure.
   ═══════════════════════════════════════════════════════════════ */

const Vitals = (() => {

  const KEY = 'vitals';

  /* Wide on purpose. A systolic of 210 is a real reading somebody may
     genuinely have; refusing it because it looks wrong would delete
     the single most important number in the log. These reject
     impossibilities, not abnormalities. */
  const BOUNDS = {
    weight_kg:  { min: 20,  max: 400, label: 'Weight',   unit: 'kg', dp: 1 },
    systolic:   { min: 50,  max: 260, label: 'Systolic', unit: 'mmHg', dp: 0 },
    diastolic:  { min: 30,  max: 180, label: 'Diastolic', unit: 'mmHg', dp: 0 }
  };

  /* A fixed vocabulary rather than free text, so the export reads
     consistently — but "something else" is always available, because a
     fixed list that cannot describe what somebody is feeling teaches
     them the app is not listening. */
  const SYMPTOMS = [
    { key: 'swelling',  label: 'Swelling in legs, ankles or feet' },
    { key: 'tired',     label: 'More tired than usual' },
    { key: 'breath',    label: 'Short of breath' },
    { key: 'cramps',    label: 'Muscle cramps' },
    { key: 'itching',   label: 'Itching' },
    { key: 'appetite',  label: 'Poor appetite' },
    { key: 'nausea',    label: 'Nausea' },
    { key: 'sleep',     label: 'Sleeping badly' }
  ];

  const all = () => {
    const raw = Store.settings()[KEY];
    return Array.isArray(raw) ? raw : [];
  };

  function validate(field, value) {
    const b = BOUNDS[field];
    if (!b) return { ok: false, message: 'Unknown measurement.' };
    if (value === '' || value === null || value === undefined) return { ok: true, value: null };
    const n = Number(value);
    if (!isFinite(n)) return { ok: false, message: `Enter ${b.label.toLowerCase()} as a number.` };
    if (n < b.min || n > b.max) {
      return {
        ok: false,
        message: `That looks outside what this app can record for ${b.label.toLowerCase()} ` +
                 `(${b.min}–${b.max} ${b.unit}). Check the reading — this limit is technical, not medical.`
      };
    }
    return { ok: true, value: Math.round(n * Math.pow(10, b.dp)) / Math.pow(10, b.dp) };
  }

  /* Blood pressure is stored as a pair or not at all. Half a reading is
     not a reading, and a lone systolic in an export is a number a
     clinician cannot use. */
  function add(entry) {
    const rec = {
      id: 'vit_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      at: new Date().toISOString(),
      date: Store.todayISO(),
      weight_kg: null, systolic: null, diastolic: null,
      symptoms: [], note: ''
    };

    /* Every rejection names the field it came from. Without that the UI
       can only print one message at the bottom of a five-input form and
       leave the reader hunting for which number it meant — which is the
       difference between an error that helps and an error that blames. */
    for (const field of ['weight_kg', 'systolic', 'diastolic']) {
      const v = validate(field, entry[field]);
      if (!v.ok) return { ok: false, field, message: v.message };
      rec[field] = v.value;
    }
    if ((rec.systolic === null) !== (rec.diastolic === null)) {
      // Blame the empty half, not the half they filled in correctly.
      return {
        ok: false,
        field: rec.systolic === null ? 'systolic' : 'diastolic',
        message: 'Blood pressure needs both numbers — the top one and the bottom one.'
      };
    }

    rec.symptoms = Array.isArray(entry.symptoms)
      ? entry.symptoms.filter(k => SYMPTOMS.some(s => s.key === k)).slice(0, SYMPTOMS.length)
      : [];
    rec.note = String(entry.note || '').slice(0, 300);

    const hasSomething = rec.weight_kg !== null || rec.systolic !== null ||
      rec.symptoms.length || rec.note.trim();
    // A wholly empty form has no one field to blame, so this one stays
    // at form level — which is the honest place for it.
    if (!hasSomething) return { ok: false, message: 'Nothing to record yet — add a number or pick how you are feeling.' };

    const next = all().concat(rec).slice(-400);   // a year of daily entries
    Store.setSetting(KEY, next);
    return { ok: true, record: rec };
  }

  function remove(id) {
    const next = all().filter(r => r.id !== id);
    Store.setSetting(KEY, next);
    return true;
  }

  // Newest first, which is the order somebody scanning a list wants.
  const recent = (n) => all().slice().reverse().slice(0, n || 10);
  const latest = (field) => all().slice().reverse().find(r => r[field] !== null && r[field] !== undefined) || null;

  const symptomLabel = (k) => (SYMPTOMS.find(s => s.key === k) || {}).label || k;

  /* Plain lines for the passport and the export. Deliberately flat: a
     date, a number, a unit. No arrows, no comparisons, no colour. */
  function asLines(limit) {
    return recent(limit || 8).map(r => {
      const bits = [];
      if (r.weight_kg !== null) bits.push(`weight ${r.weight_kg} kg`);
      if (r.systolic !== null) bits.push(`BP ${r.systolic}/${r.diastolic} mmHg`);
      if (r.symptoms.length) bits.push(r.symptoms.map(symptomLabel).join('; ').toLowerCase());
      if (r.note.trim()) bits.push(`"${r.note.trim()}"`);
      return `${r.date} — ${bits.join(' · ')}`;
    });
  }

  /* ═══════════ appointments ═══════════
     A date, who it is with, and what you want to ask. That last field
     is the one that matters and the one no calendar app has: people
     arrive at a fifteen-minute nephrology appointment having forgotten
     the question they have been carrying for six weeks.

     Deliberately NOT a calendar. No reminders, no notifications, no
     recurrence — those need permissions this app does not ask for and
     a reliability it cannot promise from a service worker that may not
     be running. Promising a reminder and not delivering it, for a
     clinic appointment, would be worse than never offering one.

     What it does instead is put the questions on the health passport,
     so the thing you carry into the room already has them on it. */
  const APPT_KEY = 'appointments';

  const appointments = () => {
    const raw = Store.settings()[APPT_KEY];
    return Array.isArray(raw) ? raw : [];
  };

  function addAppointment(entry) {
    const date = String(entry.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { ok: false, field: 'date', message: 'Pick a date for the appointment.' };
    }
    const rec = {
      id: 'apt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date,
      who: String(entry.who || '').slice(0, 120),
      questions: String(entry.questions || '').slice(0, 600)
    };
    const next = appointments().concat(rec)
      .sort((a, b) => a.date < b.date ? -1 : 1)
      .slice(-60);
    Store.setSetting(APPT_KEY, next);
    return { ok: true, record: rec };
  }

  function removeAppointment(id) {
    Store.setSetting(APPT_KEY, appointments().filter(a => a.id !== id));
    return true;
  }

  /* The next one that has not happened yet. Past appointments are kept
     — the questions asked last time are often the reason for this
     time — but they never present themselves as upcoming. */
  function nextAppointment() {
    const today = Store.todayISO();
    return appointments().find(a => a.date >= today) || null;
  }

  const daysUntil = (iso) => Store.daysBetween(Store.todayISO(), iso);

  return { KEY, BOUNDS, SYMPTOMS, all, add, remove, recent, latest, validate, asLines, symptomLabel,
           APPT_KEY, appointments, addAppointment, removeAppointment, nextAppointment, daysUntil };
})();
