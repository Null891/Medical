/* ═══════════════════════════════════════════════════════════════
   CHECKLIST — what is out of date.
   ───────────────────────────────────────────────────────────────
   The app can already answer "what did I eat" and "how much room is
   left". It could not answer the question somebody actually carries
   into a clinic appointment: WHAT HAVE I LET SLIDE?

   Not a to-do list, and the difference matters. A to-do list is a set
   of instructions from an app to a patient about their own care, which
   is exactly the authority this app does not have. This is a set of
   FACTS about the record — how old the newest lab is, whether there is
   a weight this week — and facts are something a food diary is entitled
   to report.

   THE FOUR RULES. Each is here because breaking it would turn a useful
   readout into something this app has no right to be:

     1. NO STREAKS, NO SCORE, NO PERCENTAGE COMPLETE. A streak turns a
        health tool into a slot machine, and breaking one during a bad
        week — a hospital admission, a bereavement, a flare — is a
        punishment an app cannot be trusted to hand out fairly. There is
        no number here that can go up or down.

     2. STALENESS, NEVER FAILURE. "Your last lab is four months old" is
        a fact about this record. "You missed your lab" is a judgement
        about somebody's care, made by software that cannot see their
        calendar, their clinic's backlog, or their team's actual plan.
        They may have one booked for Thursday.

     3. NOTHING IS EVER RED. Amber at most, and only for staleness the
        reader can personally act on. Red is reserved in this app for
        one thing — a potassium result that needs a phone call — and
        spending it on a missing weight would devalue it there.

     4. NO INTERPRETATION IS ADDED ANYWHERE. This module counts and
        subtracts dates. It does not decide whether a four-month-old lab
        is a problem, because that depends on the person's stage, their
        team, and a dozen things it cannot see.

   Everything below is computed from data already in the store. There is
   no new state, no new setting, and nothing here is persisted — a
   stored checklist would go stale the moment a meal was deleted.
   ═══════════════════════════════════════════════════════════════ */

const Checklist = (() => {

  /* Windows, stated once. These are REPORTING conventions — how long
     before this app stops calling something recent — and not clinical
     re-test intervals, which belong to a care team. The lab window
     reuses Clinical.STALE_DAYS so the checklist and the guidance modes
     can never disagree about what "old" means. */
  const VITALS_DAYS = 7;        // a week: the span the trends card shows
  const PASSPORT_DAYS = 90;     // a quarter: roughly a clinic cycle

  const labWindow = () =>
    (typeof Clinical !== 'undefined' && Clinical.STALE_DAYS) || 90;

  /* Every row is the same shape so the renderer needs no special cases,
     and so a new row cannot quietly introduce a fifth tone.

       key      — stable id, for tests and for the nav target
       label    — what it is, in the reader's words
       state    — 'current' | 'stale' | 'none'
       detail   — the FACT, never a verdict
       nav      — where tapping it goes, or null if there is nowhere
                  useful to send somebody

     Three states rather than two, because "no lab on file" and "a lab
     from March" are different situations and collapsing them would make
     a brand-new user look like a neglectful one. */
  const row = (key, label, state, detail, nav) =>
    ({ key, label, state, detail, nav: nav || null });

  function daysSince(iso) {
    if (!iso) return null;
    return Store.daysBetween(iso, Store.todayISO());
  }

  /* ── meals today ──
     The only row about today rather than about a span. It reports a
     count and stops: no target number of meals exists, because there
     isn't one, and inventing "3 meals logged" as a goal would be a
     score by another name. */
  function mealsRow() {
    const n = Store.dayTotals().mealCount;
    if (!n) return row('meals', 'Meals today', 'none', 'Nothing logged yet today.', 'log');
    return row('meals', 'Meals today', 'current',
      `${n} logged today.`, 'home');
  }

  /* ── the newest lab ──
     Deliberately the age of the newest result of EITHER analyte. A
     potassium from last week and a phosphorus from last year is not a
     stale record, and reporting two rows would imply the app has an
     opinion about which one is due. */
  function labRow() {
    const k = Store.latestLab('serum_potassium_meq_l');
    const p = Store.latestLab('serum_phosphorus_mg_dl');
    const dates = [k && k.lab_date, p && p.lab_date].filter(Boolean).sort();
    const newest = dates[dates.length - 1];

    if (!newest) {
      return row('labs', 'Lab results', 'none',
        'None on file. The app works without them — adding one tunes the guidance.', 'labs');
    }
    const age = daysSince(newest);
    if (age > labWindow()) {
      return row('labs', 'Lab results', 'stale',
        `Your newest result is ${describeAge(age)} old. Lab values change.`, 'labs');
    }
    return row('labs', 'Lab results', 'current',
      `Newest result is ${describeAge(age)} old.`, 'labs');
  }

  /* ── weight or blood pressure ──
     One row for both, because either one recorded this week means the
     record is being kept. Asking for both would be a care instruction. */
  function vitalsRow() {
    const w = Vitals.latest('weight_kg');
    const bp = Vitals.latest('systolic');
    const dates = [w && w.date, bp && bp.date].filter(Boolean).sort();
    const newest = dates[dates.length - 1];

    if (!newest) {
      return row('vitals', 'Weight or blood pressure', 'none',
        'Nothing recorded yet.', 'labs');
    }
    const age = daysSince(newest);
    if (age > VITALS_DAYS) {
      return row('vitals', 'Weight or blood pressure', 'stale',
        `Last recorded ${describeAge(age)} ago.`, 'labs');
    }
    return row('vitals', 'Weight or blood pressure', 'current',
      age === 0 ? 'Recorded today.' : `Recorded ${describeAge(age)} ago.`, 'labs');
  }

  /* ── the passport ──
     Reports how much of it is filled, never how much is missing. Every
     field on it is optional by design, so "3 of 9" framed as a shortfall
     would invent an obligation the passport does not impose. */
  function passportRow() {
    const filled = Passport.filledCount();
    if (!filled) {
      return row('passport', 'Health passport', 'none',
        'Empty. It is the page you hand over at an appointment.', 'passport');
    }
    const touched = Store.settings().passportTouchedAt;
    const age = daysSince(touched);
    if (age !== null && age > PASSPORT_DAYS) {
      return row('passport', 'Health passport', 'stale',
        `${filled} ${filled === 1 ? 'entry' : 'entries'}, last changed ${describeAge(age)} ago.`,
        'passport');
    }
    return row('passport', 'Health passport', 'current',
      `${filled} ${filled === 1 ? 'entry' : 'entries'} on it.`, 'passport');
  }

  /* ── the next appointment ──
     Never stale. An appointment you have not booked is not an
     out-of-date record, it is a fact about your life, and this row
     reports it without suggesting you do anything about it. */
  function appointmentRow() {
    const next = Vitals.nextAppointment();
    if (!next) {
      return row('appointment', 'Next appointment', 'none',
        'None on file.', 'labs');
    }
    const days = Vitals.daysUntil(next.date);
    const when = days === 0 ? 'Today.' : days === 1 ? 'Tomorrow.' : `In ${days} days.`;
    const qs = next.questions ? ' Your questions are saved.' : '';
    return row('appointment', 'Next appointment', 'current', when + qs, 'labs');
  }

  /* Plain English, and deliberately vague past a month. "127 days" is
     precision this app has no use for and reads like a reprimand. */
  function describeAge(days) {
    if (days === null || days === undefined) return 'some time';
    if (days === 0) return 'today';
    if (days === 1) return 'a day';
    if (days < 14) return `${days} days`;
    if (days < 60) return `${Math.round(days / 7)} weeks`;
    const months = Math.round(days / 30);
    return months >= 12 ? 'over a year' : `${months} months`;
  }

  function rows() {
    return [mealsRow(), labRow(), vitalsRow(), passportRow(), appointmentRow()];
  }

  /* The one summary line, and it is a COUNT OF FACTS, not a grade.
     Deliberately no "3 of 5" — a fraction is a score wearing a
     different hat, and the denominator would imply five things somebody
     is supposed to have done. */
  function summary() {
    const stale = rows().filter(r => r.state === 'stale');
    if (!stale.length) return null;
    if (stale.length === 1) return `One thing here is getting old: ${stale[0].label.toLowerCase()}.`;
    return `${stale.length} things here are getting old.`;
  }

  return { rows, summary, describeAge, VITALS_DAYS, PASSPORT_DAYS, labWindow };
})();
