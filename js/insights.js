/* ═══════════════════════════════════════════════════════════════
   INSIGHTS — patterns in what has already been logged.
   ───────────────────────────────────────────────────────────────
   The app knows a fortnight of somebody's eating and has never once
   said anything about it. "Your sodium runs high on the days you eat
   out" is the kind of observation a dietitian makes in thirty seconds
   with a paper diary, and it is the reason people are asked to keep
   one.

   WHAT THIS IS ALLOWED TO SAY. Only arithmetic over logged data,
   stated as an observation about the record. Never a prediction, never
   a diagnosis, never advice, and never a claim about a serum value —
   dietary potassium correlates weakly with blood potassium, and an app
   that says "your Fridays are dangerous" from meal logs has left the
   lane the whole product is built to stay inside.

   The wording is load-bearing and deliberately flat: "on the days you
   logged X, your Y averaged Z". That sentence is checkable by the
   person reading it. "You should eat less X on Fridays" is not, and
   is also not ours to say.

   EVIDENCE FLOORS. Every pattern carries a minimum sample and a
   minimum effect size, and both are enforced before anything renders.
   The failure mode here is not being wrong once — it is being
   confidently wrong on three data points in front of a dietitian, and
   a floor is cheaper than an apology.
   ═══════════════════════════════════════════════════════════════ */

const Insights = (() => {

  const WINDOW_DAYS = 21;      // how far back we look
  const MIN_DAYS_LOGGED = 6;   // below this, say nothing at all
  const MIN_GROUP = 3;         // a weekday needs 3 instances to count
  const MIN_LIFT = 0.25;       // 25% above the other days, or it is noise

  const NUTRIENTS = [
    { key: 'k',  word: 'potassium'  },
    { key: 'p',  word: 'phosphorus' },
    { key: 'na', word: 'sodium'     }
  ];

  /* Every logged day in the window, with its totals. Unlogged days are
     omitted entirely rather than counted as zero — a day nobody
     recorded is missing data, and averaging it in as a zero would drag
     every mean toward a number nobody ate. */
  function loggedDays() {
    const out = [];
    for (let i = 0; i < WINDOW_DAYS; i++) {
      const iso = Store.daysAgoISO(i);
      const t = Store.dayTotals(iso);
      if (!t.mealCount) continue;
      out.push({
        iso,
        weekday: new Date(iso + 'T00:00:00').getDay(),
        k: t.k, p: t.p, na: t.na,
        meals: Store.meals(iso)
      });
    }
    return out;
  }

  const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  // Midpoints throughout: a day's total is a range, and comparing the
  // high ends across groups would compare data quality as much as food.
  const mid = (band) => (band.low + band.high) / 2;

  /* ── Pattern 1: a weekday that runs high ──
     The classic paper-diary finding. Needs the weekday to appear at
     least MIN_GROUP times AND to sit MIN_LIFT above the other days. */
  function weekdayPattern(days) {
    const found = [];
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const n of NUTRIENTS) {
      let best = null;
      for (let wd = 0; wd < 7; wd++) {
        const on = days.filter(d => d.weekday === wd);
        const off = days.filter(d => d.weekday !== wd);
        if (on.length < MIN_GROUP || off.length < MIN_GROUP) continue;

        const a = mean(on.map(d => mid(d[n.key])));
        const b = mean(off.map(d => mid(d[n.key])));
        if (b <= 0) continue;
        const lift = (a - b) / b;
        if (lift < MIN_LIFT) continue;
        if (!best || lift > best.lift) best = { wd, a, b, lift, n: on.length };
      }
      if (best) {
        found.push({
          id: `weekday-${n.key}-${best.wd}`,
          strength: best.lift,
          text: `On the ${names[best.wd]}s you logged, your ${n.word} averaged about ` +
                `${Clinical.fmt(Math.round(best.a))} mg — around ` +
                `${Math.round(best.lift * 100)}% higher than your other days ` +
                `(about ${Clinical.fmt(Math.round(best.b))} mg).`,
          basis: `Based on ${best.n} ${names[best.wd]}s out of ${days.length} logged days.`
        });
      }
    }
    return found;
  }

  /* ── Pattern 2: one food is doing most of the work ──
     Names the single anchor row contributing the largest share of a
     nutrient across the window. Only reported when that share is big
     enough to be actionable — under a fifth, naming it would imply an
     importance the arithmetic does not support. */
  const MIN_SHARE = 0.20;

  function contributorPattern(days) {
    const found = [];
    for (const n of NUTRIENTS) {
      const totals = new Map();
      let all = 0;
      for (const d of days) {
        for (const m of d.meals) {
          for (const it of (m.items || [])) {
            if (!it.matched_anchor_id) continue;
            const lo = it[`${n.key === 'k' ? 'potassium' : n.key === 'p' ? 'phosphorus' : 'sodium'}_low_mg`];
            const hi = it[`${n.key === 'k' ? 'potassium' : n.key === 'p' ? 'phosphorus' : 'sodium'}_high_mg`];
            if (lo === null || lo === undefined) continue;
            const v = (lo + hi) / 2;
            all += v;
            const prev = totals.get(it.matched_anchor_id) || { v: 0, name: it.name, times: 0 };
            prev.v += v; prev.times++;
            totals.set(it.matched_anchor_id, prev);
          }
        }
      }
      if (all <= 0) continue;
      let top = null;
      totals.forEach(t => { if (!top || t.v > top.v) top = t; });
      if (!top) continue;
      const share = top.v / all;
      if (share < MIN_SHARE || top.times < MIN_GROUP) continue;

      found.push({
        id: `contrib-${n.key}`,
        strength: share,
        text: `${top.name} accounted for about ${Math.round(share * 100)}% of the ${n.word} ` +
              `you logged over the last ${days.length} days.`,
        basis: `You logged it ${top.times} times.`
      });
    }
    return found;
  }

  /* ── Pattern 3: how much of the record is guesswork ──
     Not about food at all — about the data. If a large share of the
     window came from wide estimates rather than matched foods, that is
     the most important thing anybody could know before reading any of
     the other patterns, so it outranks them. */
  const MIN_ESTIMATED_SHARE = 0.34;

  function qualityPattern(days) {
    let counted = 0, estimated = 0;
    for (const d of days) {
      for (const m of d.meals) {
        for (const it of (m.items || [])) {
          if (it.source === 'uncounted') continue;
          counted++;
          if (it.source === 'llm') estimated++;
        }
      }
    }
    if (counted < 8) return [];
    const share = estimated / counted;
    if (share < MIN_ESTIMATED_SHARE) return [];
    return [{
      id: 'quality',
      strength: 1 + share,          // always sorts above the food patterns
      text: `About ${Math.round(share * 100)}% of the foods you logged weren't in ` +
            `RenalRoute's reference table, so their numbers are wide estimates.`,
      basis: 'Totals that lean on estimates are less certain than the rings suggest. ' +
             'Picking from the food list where you can makes the week more reliable.'
    }];
  }

  /* ── The public read ──
     Returns at most `limit` patterns, strongest first, or an empty
     array — which is the correct answer far more often than not and
     must never be padded. An app that always has something to say
     about your week is an app that is making things up. */
  function read(limit) {
    const days = loggedDays();
    if (days.length < MIN_DAYS_LOGGED) {
      return { ready: false, days: days.length, need: MIN_DAYS_LOGGED, patterns: [] };
    }
    const patterns = []
      .concat(qualityPattern(days))
      .concat(weekdayPattern(days))
      .concat(contributorPattern(days))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, limit || 2);

    return { ready: true, days: days.length, need: MIN_DAYS_LOGGED, patterns };
  }

  return {
    read, loggedDays,
    WINDOW_DAYS, MIN_DAYS_LOGGED, MIN_GROUP, MIN_LIFT, MIN_SHARE, MIN_ESTIMATED_SHARE
  };
})();
