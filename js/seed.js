/* ═══════════════════════════════════════════════════════════════
   SEED — the demo persona.
   ───────────────────────────────────────────────────────────────
   Frank, 67, CKD stage G3b. Targets are CARE-TEAM provided, so the
   education-ranges chip never appears on screen and nobody can ask
   "who set these numbers?" during a walkthrough.

   Two deliberate choices, both from the audit:

   F10 — Frank's targets are stated explicitly as 2,500 / 900 / 2,000.
   Every worked example in the spec (the 926 mg potato at 37% of the day,
   the ring fill fractions, the swap-fit arithmetic) assumes 2,500 mg
   potassium. Leaving the persona's targets unstated would have made
   every one of those numbers unverifiable.

   F9 — TODAY is seeded with BREAKFAST ONLY. Two things had to be true at
   once: the opening screen must not look blank, and there must still be
   enough remaining budget after logging a dinner for the swap engine to
   return a suggestion. Seeding the day heavier drives remaining to zero,
   `findSwaps` returns no_fit, and the swap beat silently dies. Breakfast
   alone leaves roughly 2,300 mg of headroom.

   All meals are built through the same resolution path the app uses, so
   seeded data is indistinguishable from data a user logged.
   ═══════════════════════════════════════════════════════════════ */

const Seed = (() => {

  const FRANK = {
    display_name: 'Frank',
    ckd_stage: 'G3b',
    budget_source: 'care_team',
    potassium_budget_mg: 2500,
    phosphorus_budget_mg: 900,
    sodium_budget_mg: 2000
  };

  /* Meals are specified as anchor ids plus a multiplier, so they resolve
     through Resolve.fromPicker — the real code path, zero model calls. */
  const DAYS = [
    { ago: 6, meals: [
      { text: 'scrambled egg and white toast', items: [['egg', 1], ['white_bread', 1]] },
      { text: 'chicken breast, white rice, green beans', items: [['chicken_breast', 1], ['white_rice', 1], ['green_beans_frozen', 1]] },
      { text: 'apple, no skin', items: [['apple_noskin', 1]] }
    ]},
    { ago: 5, meals: [
      { text: 'peanut butter on white bread', items: [['peanut_butter', 1], ['white_bread', 2]] },
      { text: 'salmon with cooked cauliflower', items: [['salmon', 1], ['cauliflower_cooked', 1]] },
      { text: '10 grapes', items: [['grapes', 1]] }
    ]},
    { ago: 4, meals: [
      // Additive-heavy phosphorus day: deli ham + processed cheese.
      { text: 'deli ham and American cheese sandwich on white bread', items: [['deli_ham', 2], ['american_cheese', 1], ['white_bread', 2]] },
      { text: 'grilled chicken and white rice', items: [['chicken_breast', 1], ['white_rice', 1]] }
    ]},
    { ago: 3, meals: [
      { text: 'plain low-fat yogurt with blueberries', items: [['yogurt_lowfat', 1], ['blueberries', 1]] },
      // This one is edited after seeding, so the edit affordance is
      // honestly demonstrable if someone asks.
      { text: 'grilled chicken and strawberries', items: [['chicken_breast', 1], ['strawberries', 2]], edited: true }
    ]},
    { ago: 2, meals: [
      // Amber potassium day: chili with beans is 934 mg on its own.
      { text: 'chili with beans, one cup', items: [['chili_beans', 1]] },
      { text: 'white toast with peanut butter', items: [['white_bread', 1], ['peanut_butter', 1]] }
    ]},
    { ago: 1, meals: [
      { text: 'cucumber and green bell pepper salad', items: [['cucumber', 1], ['bell_pepper_green', 1]] },
      { text: 'salmon and white rice', items: [['salmon', 1], ['white_rice', 1]] },
      { text: 'lemon-lime soda', items: [['lemon_lime_soda', 1]] }
    ]},
    /* TODAY — breakfast only. See F9 above. */
    { ago: 0, meals: [
      { text: 'scrambled egg and white toast', items: [['egg', 1], ['white_bread', 1]], hour: 8 }
    ]}
  ];

  function buildMeal(spec, dateISO, hour) {
    const items = spec.items
      .map(([id, mult]) => Resolve.fromPicker(id, mult))
      .filter(Boolean);
    if (!items.length) return null;

    const t = Resolve.totals(items);
    const at = new Date(dateISO + 'T00:00:00');
    at.setHours(hour, Math.floor(Math.random() * 50), 0, 0);

    return Object.assign({
      meal_text: spec.text,
      logged_at: at.toISOString(),
      meal_date: dateISO,
      items,
      confidence: Resolve.confidence(items),
      needs_clarification: false,
      clarification_question: null,
      clarification_status: 'none',
      explanation_text: ''
    }, t);
  }

  function run() {
    Store.reset();
    Store.load();

    Store.updateProfile(Object.assign({
      consent_accepted_at: new Date().toISOString(),
      consent_version: 'v1'
    }, FRANK));

    // Baseline lab: normal mode, dated recently so it is not stale.
    Store.addLab({
      k: 4.6, p: 3.8, egfr: 38,
      lab_date: Store.daysAgoISO(12)
    });

    DAYS.forEach(day => {
      const dateISO = Store.daysAgoISO(day.ago);
      day.meals.forEach((spec, i) => {
        const hour = spec.hour !== undefined ? spec.hour : [8, 13, 19][i] || 20;
        const rec = buildMeal(spec, dateISO, hour);
        if (!rec) return;
        const saved = Store.addMeal(rec);
        // Demonstrate the edit path on one historical meal: log it, then
        // correct a portion, exactly as a user would.
        if (saved && spec.edited) {
          const corrected = saved.items.map((it, idx) =>
            idx === 1 ? Resolve.rescale(it, 1) : it);
          Store.updateMeal(saved.id, Object.assign(
            { items: corrected }, Resolve.totals(corrected)
          ));
        }
      });
    });

    Store.setSetting('demoMode', true);
    return true;
  }

  /* Reset today's meals back to breakfast-only and the lab back to 4.6
     after a rehearsal, without wiping the prior week. */
  function resetToday() {
    Store.meals(Store.todayISO()).forEach(m => Store.deleteMeal(m.id));
    const rec = buildMeal(DAYS[DAYS.length - 1].meals[0], Store.todayISO(), 8);
    if (rec) Store.addMeal(rec);
    return true;
  }

  /* ═══════════ MARIA — every feature, used ═══════════
     Frank exists for the demo script: a clean week and today's
     breakfast, tuned so the swap beat has headroom. He deliberately
     does NOT touch most of the app, because a walkthrough needs a
     stage, not a museum.

     Maria is the opposite, and she exists for a different job: showing
     somebody the full extent of what this is. Every surface is
     populated — labs across two dates so the trend is real, weight and
     blood pressure recorded, symptoms noted, an appointment with the
     questions already written, a passport filled in, medicines
     including a binder so the timing note fires, and enough logged days
     for the pattern detector to clear its evidence floor and actually
     say something.

     Built entirely through the app's own paths. Nothing here is a
     fixture that could drift from what the code produces. */
  const MARIA = {
    display_name: 'Maria',
    ckd_stage: 'G4',
    budget_source: 'care_team',
    potassium_budget_mg: 2200,
    phosphorus_budget_mg: 800,
    sodium_budget_mg: 2000
  };

  function runFull() {
    run();                                    // the week of meals first
    Store.updateProfile(MARIA);

    /* run() seeds Frank's baseline lab, and Maria has her own history —
       leaving both gives her three results from two different people.
       Caught by the demo journey test asserting exactly two, which is
       the kind of thing that would otherwise have sat in the demo
       looking almost right. */
    Store.labs().forEach(l => Store.deleteLab(l.id));

    /* Two labs, four weeks apart, so the Labs screen has real history
       and the mode is derived rather than asserted. The later one is
       5.2 — caution mode, which is where this app has the most to say
       and therefore the most to show somebody seeing it for the first
       time. */
    Store.addLab({ k: 4.4, p: 3.9, egfr: 26, lab_date: Store.daysAgoISO(38) });
    Store.addLab({ k: 5.2, p: 4.7, egfr: 24, lab_date: Store.daysAgoISO(9) });

    // What her care team asked her to watch. Drives ring emphasis.
    Store.setSetting('watched', ['k', 'p']);
    Store.setSetting('hardest', 'restaurant');
    Store.setSetting('scene', 'home');
    Store.setSetting('refusalsSeen', true);

    /* A passport somebody could actually hand to a stranger. The
       fistula line is the kind of detail that makes the feature obvious
       the moment a clinician reads it. */
    /* Multi-line content as an array joined at use, rather than escaped
       newlines inside a literal. Same output, and it cannot be broken
       by anything that rewrites this file. */
    const MEDS = [
      'Lisinopril 10mg every morning',
      'Sevelamer 800mg with each meal',      // a binder: fires the timing note
      'Metformin 500mg twice daily'
    ].join('\n');

    Store.setSetting('passport', {
      conditions: 'CKD stage G4. Type 2 diabetes since 2016.',
      medications: MEDS,
      allergies: 'Penicillin — rash and swelling',
      clinic: 'City Renal Unit, Tuesdays — 555 0100',
      contact: 'Ana Reyes, daughter — 555 0142',
      notes: 'No blood pressure cuff and no needles in the left arm (fistula).'
    });
    Store.setSetting('medications', MEDS);

    /* Vitals across several days, recorded and never interpreted. The
       values drift slightly because a flat line looks like test data. */
    if (typeof Vitals !== 'undefined') {
      const readings = [
        { d: 12, w: 71.2, s: 138, dia: 84, sym: [] },
        { d: 9,  w: 71.8, s: 142, dia: 86, sym: ['tired'] },
        { d: 6,  w: 72.6, s: 145, dia: 88, sym: ['swelling', 'tired'] },
        { d: 3,  w: 72.1, s: 136, dia: 82, sym: ['cramps'] },
        { d: 1,  w: 71.9, s: 134, dia: 81, sym: [] }
      ];
      const rows = readings.map((r, i) => ({
        id: 'vit_seed' + i,
        at: new Date().toISOString(),
        date: Store.daysAgoISO(r.d),
        weight_kg: r.w, systolic: r.s, diastolic: r.dia,
        symptoms: r.sym,
        note: r.d === 6 ? 'Ankles puffy by the evening.' : ''
      }));
      Store.setSetting(Vitals.KEY, rows);

      Store.setSetting(Vitals.APPT_KEY, [{
        id: 'apt_seed1',
        date: Store.daysAgoISO(-11),          // eleven days from now
        who: 'Dr Osei, nephrology',
        /* The questions are the point of the feature. These are the
           ones people actually carry for six weeks and then forget in
           the room — a symptom they are not sure is relevant, a target
           they are not sure still applies, and a food they have been
           told to give up and would rather not. */
        questions: [
          'Ankles have been swelling in the evenings — is that the amlodipine or the kidneys?',
          'Is 2,200 mg still the right potassium target now the last result was 5.2?',
          'Can I keep having potatoes if I boil and drain them?'
        ].join('\n')
      }]);
    }

    Store.setSetting('demoSeeded', true);
    Store.setSetting('demoPersona', 'maria');
    return true;
  }

  return { run, runFull, resetToday, FRANK, MARIA };
})();
