/* ═══════════════════════════════════════════════════════════════
   GAPS — the three different things "we don't know" can mean.
   ───────────────────────────────────────────────────────────────
   The app already refuses to guess in three separate places, and each
   refusal was invisible from anywhere else:

     · a food the table cannot price contributes nothing to a total, and
       the ring turns amber with no explanation of which food or why;
     · a week that runs over on sodium every Sunday is visible only if
       you go looking day by day;
     · a lab from four months ago stops being used and says so on the
       labs screen, where somebody who has not opened it will not read it.

   This puts all three in one place, because they are the same question
   asked by the same person: WHAT DOESN'T THIS APP KNOW ABOUT ME, AND
   DOES IT MATTER?

   THE ORDER IS DELIBERATE. Data gaps first, because they are the ones
   the app is responsible for and the ones that change how every other
   number should be read. Intake next, which is about the food. Care
   last, because it is the one that belongs to the person's life rather
   than to this software, and leading with it would read as nagging.

   WHAT THIS FILE MAY NOT DO. It computes nothing new about the body.
   Every threshold it uses is one already defined and justified in
   js/clinical.js or js/checklist.js, and every sentence is a template.
   There is no model in this path and there is no scoring: a gap is a
   fact about the record, never a grade on the person keeping it.
   ═══════════════════════════════════════════════════════════════ */

const Gaps = (() => {

  /* Same window as the pattern detector, for one reason: two surfaces
     that summarise "recently" over different periods will eventually
     disagree in front of somebody, and the one that is wrong will be
     whichever they read second. */
  const WINDOW_DAYS = (typeof Insights !== 'undefined' && Insights.WINDOW_DAYS) || 14;

  const NUTRIENTS = [
    { key: 'k', label: 'Potassium', short: 'K' },
    { key: 'p', label: 'Phosphorus', short: 'P' },
    { key: 'na', label: 'Sodium', short: 'Na' }
  ];

  const FIELD = {
    k: 'potassium_low_mg',
    p: 'phosphorus_low_mg',
    na: 'sodium_low_mg'
  };

  function windowDays() {
    const out = [];
    for (let i = 0; i < WINDOW_DAYS; i++) out.push(Store.daysAgoISO(i));
    return out;
  }

  /* ═══════════ 1 · DATA GAPS ═══════════
     Which foods THIS PERSON eats that the table cannot fully price, and
     what that does to their totals.

     Weighted by how often they actually eat it, which is the whole
     point. The table has 84 missing values and a list of all of them is
     a chore nobody reads; the four that appear in someone's breakfast
     every day are worth knowing about. This is the same ordering
     tools/data-gaps.js applies for the maintainer, turned around to
     face the person instead. */
  function dataGaps() {
    const meals = Store.meals();
    const counts = {};       // anchor id -> { row, times, missing[] }
    let uncounted = 0;       // items with no anchor row at all
    const uncountedNames = {};

    meals.forEach(m => {
      (m.items || []).forEach(it => {
        if (!it.matched_anchor_id) {
          if (it.source === 'uncounted') {
            uncounted++;
            const n = String(it.name || '').slice(0, 40);
            uncountedNames[n] = (uncountedNames[n] || 0) + 1;
          }
          return;
        }
        const row = ANCHOR_FOODS.find(f => f.id === it.matched_anchor_id);
        if (!row) return;
        const missing = NUTRIENTS
          .filter(n => it[FIELD[n.key]] === null || it[FIELD[n.key]] === undefined)
          .map(n => n.key);
        if (!missing.length) return;
        const e = counts[row.id] || (counts[row.id] = { row, times: 0, missing: [] });
        e.times++;
        missing.forEach(k => { if (e.missing.indexOf(k) === -1) e.missing.push(k); });
      });
    });

    const foods = Object.keys(counts).map(id => counts[id])
      .sort((a, b) => b.times - a.times || a.row.food_name.localeCompare(b.row.food_name));

    /* How many DAYS are affected per nutrient. A count of foods is
       abstract; "eleven of your last fourteen days are missing a
       phosphorus figure somewhere" is the sentence that explains why
       the ring keeps saying partial. */
    const days = windowDays();
    const affected = { k: 0, p: 0, na: 0 };
    days.forEach(d => {
      const t = Store.dayTotals(d);
      if (!t.mealCount) return;
      NUTRIENTS.forEach(n => { if (t.incomplete[n.key]) affected[n.key]++; });
    });

    const loggedDays = days.filter(d => Store.dayTotals(d).mealCount > 0).length;

    return {
      foods,
      affected,
      loggedDays,
      uncounted,
      uncountedNames: Object.keys(uncountedNames)
        .map(n => ({ name: n, times: uncountedNames[n] }))
        .sort((a, b) => b.times - a.times)
        .slice(0, 5),
      worst: NUTRIENTS
        .map(n => ({ key: n.key, label: n.label, days: affected[n.key] }))
        .sort((a, b) => b.days - a.days)[0]
    };
  }

  /* ═══════════ 2 · INTAKE GAPS ═══════════
     Where the days sit against the targets, per nutrient.

     Reported ONLY where a target exists. Somebody who skipped targets,
     or whose care team has not set one, gets told that rather than
     measured against an education default they never agreed to — the
     same rule the rings already follow.

     A day that is PARTIAL is counted separately and never as "under".
     It is the whole argument of this app: a total missing a food's
     potassium is not a low potassium day, and rolling it in with the
     genuinely low ones would turn a data gap into a false reassurance
     at exactly the point somebody is looking for a pattern. */
  function intakeGaps() {
    const targets = Store.targets();
    const days = windowDays();

    const out = NUTRIENTS.map(n => {
      const target = targets[n.key];
      const bucket = { key: n.key, label: n.label, target: target || null,
                       over: 0, under: 0, partial: 0, logged: 0, worstDay: null };
      if (!target) return bucket;

      days.forEach(d => {
        const t = Store.dayTotals(d);
        if (!t.mealCount) return;
        bucket.logged++;
        if (t.incomplete[n.key]) { bucket.partial++; return; }
        const high = t[n.key].high;
        if (high > target) {
          bucket.over++;
          if (!bucket.worstDay || high > bucket.worstDay.high) {
            bucket.worstDay = { date: d, high };
          }
        } else {
          bucket.under++;
        }
      });
      return bucket;
    });

    return { nutrients: out, hasTargets: Store.hasTargets(), windowDays: WINDOW_DAYS };
  }

  /* ═══════════ 3 · CARE GAPS ═══════════
     Delegated wholesale to js/checklist.js, which already decides what
     counts as stale and — more importantly — already phrases it as a
     fact about a record rather than as a failing. Recomputing any of
     that here would create a second opinion about the same thing, and
     two surfaces that disagree about whether a lab is current is worse
     than not having the second surface. */
  function careGaps() {
    if (typeof Checklist === 'undefined') return { rows: [], summary: null };
    return { rows: Checklist.rows().filter(r => r.state !== 'current'),
             all: Checklist.rows(),
             summary: Checklist.summary() };
  }

  /* One number for the hub card. Counts FACTS, not faults, and there is
     deliberately no denominator: "4 of 12" implies twelve things
     somebody was supposed to have done. */
  function count() {
    const d = dataGaps();
    const c = careGaps();
    return d.foods.length + (d.uncounted ? 1 : 0) + c.rows.length;
  }

  return { dataGaps, intakeGaps, careGaps, count, WINDOW_DAYS, NUTRIENTS };
})();

if (typeof window !== 'undefined') window.Gaps = Gaps;
