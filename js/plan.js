/* ═══════════════════════════════════════════════════════════════
   PLAN — "what can dinner be?", answered.
   ───────────────────────────────────────────────────────────────
   The product thesis has been on the dashboard since the first commit:
   the unfilled arc is what is LEFT, and the question that matters is
   what the rest of the day can be. Until now the app answered it with
   a number and left the actual thinking to the user.

   This module does the thinking, deterministically:

     · Every recipe is PRICED by running its anchor rows through the
       same resolver a typed meal goes through. Identical code path,
       identical ranges, identical provenance. No second nutrition
       engine exists, so there is no second place for numbers to drift.

     · A recipe FITS when its HIGH end fits the remaining budget — the
       conservative end, matching the swap engine. Suggesting a meal on
       its midpoint would mean recommending things that go over roughly
       half the time.

     · Zero model calls. Same reasoning as the swap engine: measured
       accuracy classifying low-potassium foods is around 60%, so a
       model choosing what someone should eat would over-restrict two
       times in five and occasionally do worse.

   WHAT THIS DELIBERATELY DOES NOT DO. It does not call anything
   "kidney-safe", does not rank by a health score, and does not
   optimise. It filters by what fits and orders by what leaves the most
   room — both of which are arithmetic the user can check.
   ═══════════════════════════════════════════════════════════════ */

const Plan = (() => {

  /* Price a recipe through the real resolver. fromPicker() is the same
     entry point the manual food picker uses, which is what guarantees a
     recipe and a hand-logged meal of the same foods produce byte-identical
     numbers. */
  function itemsFor(recipe) {
    const out = [];
    for (const ing of recipe.items) {
      const item = Resolve.fromPicker(ing.id, ing.mult);
      if (!item) continue;                      // a missing row is skipped, never faked
      if (ing.leach) {
        const row = ANCHOR_FOODS.find(f => f.id === ing.id);
        if (row && row.leachable && item.potassium_low_mg !== null) {
          const l = Clinical.leach(item.potassium_low_mg, item.potassium_high_mg);
          item.potassium_low_mg = l.low;
          item.potassium_high_mg = l.high;
          item._leached = true;
        }
      }
      out.push(item);
    }
    return out;
  }

  function priced(recipe) {
    const items = itemsFor(recipe);
    const totals = Resolve.totals(items);
    return {
      recipe,
      items,
      complete: items.length === recipe.items.length,
      k:  { low: totals.total_potassium_low_mg,  high: totals.total_potassium_high_mg },
      p:  { low: totals.total_phosphorus_low_mg, high: totals.total_phosphorus_high_mg },
      na: { low: totals.total_sodium_low_mg,     high: totals.total_sodium_high_mg },
      sodiumIncomplete: !!totals.sodium_totals_incomplete
    };
  }

  const all = () => RECIPES.map(priced);

  /* What is left today, per nutrient, using the HIGH end of what has
     already been logged — the same conservative reading the rings
     colour themselves by. */
  function remaining() {
    const t = Store.targets();
    const totals = Store.dayTotals();
    const out = {};
    ['k', 'p', 'na'].forEach(key => {
      out[key] = t[key] ? Math.max(0, t[key] - totals[key].high) : null;
    });
    return out;
  }

  /* A recipe fits when every nutrient with a target has room for the
     recipe's HIGH end. A nutrient with no target cannot rule anything
     out — there is nothing to exceed. */
  function fits(p, room) {
    return ['k', 'p', 'na'].every(key => {
      if (room[key] === null || room[key] === undefined) return true;
      const high = p[key].high;
      if (high === null || high === undefined) return true;   // unknown ≠ over
      return high <= room[key];
    });
  }

  /* Ordered by how much potassium room a meal LEAVES, most first.
     Deliberately not "healthiest" and deliberately not a score: this is
     one column of arithmetic, and a reader can verify the ordering by
     looking at the numbers printed beside each card. */
  function suggestions(limit) {
    if (!Store.hasTargets()) return { ready: false, room: null, fitting: [], overBy: [] };
    const room = remaining();
    const priced = all();

    const fitting = priced.filter(p => fits(p, room))
      .sort((a, b) => a.k.high - b.k.high)
      .slice(0, limit || 4);

    /* The near misses matter as much as the fits. "Nothing fits" with
       no explanation reads as the app being broken; showing what is
       just out of reach, and by how much, is information a person can
       act on tomorrow. */
    const overBy = priced.filter(p => !fits(p, room))
      .map(p => ({
        p,
        over: Math.max(0, (p.k.high || 0) - (room.k === null ? Infinity : room.k))
      }))
      .filter(x => isFinite(x.over))
      .sort((a, b) => a.over - b.over)
      .slice(0, 2);

    return { ready: true, room, fitting, overBy };
  }

  /* ═══════════ three-day plan ═══════════
     Built against the FULL daily target rather than today's leftovers,
     because a plan is for days that have not started yet. Meals are
     picked so a day's combined high end stays inside every target, and
     no recipe repeats within a day.

     Greedy, not optimal. An optimiser would produce a slightly better
     plan nobody could check; this one is a sequence of "does the next
     thing still fit" decisions, which is explainable in a sentence and
     verifiable by adding up the numbers on screen. */
  function threeDay() {
    if (!Store.hasTargets()) return null;
    const t = Store.targets();
    const pool = all().filter(p => p.complete);
    const byTag = (tag) => pool.filter(p => (p.recipe.tags || []).includes(tag));

    const days = [];
    for (let d = 0; d < 3; d++) {
      const used = new Set();
      const running = { k: 0, p: 0, na: 0 };
      const meals = [];

      [['breakfast', byTag('breakfast')], ['lunch', byTag('lunch').concat(byTag('snack'))],
       ['dinner', byTag('dinner')]].forEach(([slot, options]) => {
        // Rotate the starting point per day so three days are not three
        // copies of the same menu.
        const rotated = options.slice(d % Math.max(1, options.length))
          .concat(options.slice(0, d % Math.max(1, options.length)));
        const pick = rotated.find(p => {
          if (used.has(p.recipe.id)) return false;
          return ['k', 'p', 'na'].every(key => {
            if (!t[key]) return true;
            const high = p[key].high;
            return high === null || (running[key] + high) <= t[key];
          });
        });
        if (!pick) return;
        used.add(pick.recipe.id);
        ['k', 'p', 'na'].forEach(key => { running[key] += pick[key].high || 0; });
        meals.push({ slot, priced: pick });
      });

      days.push({ day: d, meals, totals: running });
    }
    return { days, targets: t };
  }

  /* ═══════════ grocery list ═══════════
     Every distinct anchor row across a set of recipes, grouped by
     supermarket aisle, with how many servings are needed. */
  function grocery(recipeIds) {
    const wanted = recipeIds && recipeIds.length
      ? RECIPES.filter(r => recipeIds.includes(r.id))
      : RECIPES;

    const need = new Map();
    wanted.forEach(r => r.items.forEach(ing => {
      const row = ANCHOR_FOODS.find(f => f.id === ing.id);
      if (!row) return;
      const prev = need.get(ing.id) || { row, servings: 0 };
      prev.servings += ing.mult;
      need.set(ing.id, prev);
    }));

    const aisleFor = (row) => {
      const key = Object.keys(AISLES).find(k => AISLES[k].match.includes(row.category));
      return key || 'other';
    };

    const grouped = {};
    need.forEach(v => {
      const a = aisleFor(v.row);
      (grouped[a] = grouped[a] || []).push(v);
    });
    Object.keys(grouped).forEach(a =>
      grouped[a].sort((x, y) => x.row.food_name.localeCompare(y.row.food_name)));

    return { grouped, aisles: AISLES, count: need.size };
  }

  /* Plain text for the shopping trip. The whole point of a list is that
     it works on a phone with no signal in a supermarket, so it also
     works as text somebody can paste anywhere. */
  function groceryText(recipeIds) {
    const g = grocery(recipeIds);
    const out = ['RENALROUTE — SHOPPING LIST', ''];
    Object.keys(g.grouped).forEach(a => {
      out.push(AISLES[a].label.toUpperCase());
      g.grouped[a].forEach(v => {
        const n = v.servings === 1 ? '' : ` (${v.servings} servings)`;
        out.push(`  [ ] ${v.row.food_name}${n}`);
      });
      out.push('');
    });
    out.push('Nutrient values in RenalRoute are estimated ranges from a curated');
    out.push('reference table, not measurements. Check labels for phosphate');
    out.push('additives and added potassium — neither appears on the nutrition panel.');
    return out.join('\n');
  }

  return { priced, all, remaining, fits, suggestions, threeDay, grocery, groceryText, itemsFor };
})();
