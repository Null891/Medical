/* ═══════════════════════════════════════════════════════════════
   RESOLVE — deterministic food matching and portion scaling.
   ───────────────────────────────────────────────────────────────
   This is the half of the pipeline that must NEVER involve a language
   model. The model splits text into items; this file prices them.

   Matching order:
     Pass 1  exact alias match
     Pass 2  substring match, LONGEST alias wins
             ("baked potato with skin" beats "baked potato" beats "potato")
     Pass 3  variant disambiguation by preparation modifier

   Two ambiguity rules that matter:
     · Candidates spanning MORE THAN ONE base_food  → unmatched.
       Never coin-flip between different foods; hand it to the wide-range
       fallback and label it low confidence.
     · Candidates sharing ONE base_food             → union range,
       lowest low to highest high, so "spinach" with no preparation given
       reports 84–420 rather than silently picking one.
   ═══════════════════════════════════════════════════════════════ */

const Resolve = (() => {

  const SINGULAR_EXCEPTIONS = new Set([
    'hummus', 'couscous', 'asparagus', 'molasses', 'swiss', 'grapes'
  ]);

  const MODIFIER_TOKENS = [
    'with skin', 'no skin', 'boiled', 'raw', 'cooked', 'low-fat', 'low fat',
    'canned', 'baked', 'fried', 'grilled', 'roasted', 'steamed', 'frozen',
    'whole', 'plain', 'smooth'
  ];

  /* ── normalization ── */
  function normalize(text) {
    let s = String(text || '').toLowerCase().trim();
    s = s.replace(/[^\w\s-]/g, ' ');      // strip punctuation, keep hyphens
    s = s.replace(/\s+/g, ' ').trim();
    const words = s.split(' ');
    if (words.length) {
      const last = words[words.length - 1];
      if (!SINGULAR_EXCEPTIONS.has(last)) {
        if (/ies$/.test(last) && last.length > 4)      words[words.length - 1] = last.replace(/ies$/, 'y');
        else if (/oes$/.test(last) && last.length > 4) words[words.length - 1] = last.replace(/oes$/, 'o');
        else if (/[^s]s$/.test(last) && last.length > 3) words[words.length - 1] = last.replace(/s$/, '');
      }
    }
    return words.join(' ');
  }

  /* ── matching ── */
  function match(key) {
    const norm = normalize(key);
    if (!norm) return { rows: [], how: 'none' };

    // Pass 1 — exact alias
    const exact = ANCHOR_FOODS.filter(f =>
      (f.aliases || []).some(a => normalize(a) === norm)
    );
    if (exact.length) return { rows: exact, how: 'exact' };

    /* Pass 2 — substring matching, in two tiers.

       Tier A: aliases CONTAINED IN the query. This is the specificity
       signal — a query of "baked potato with skin" contains the long
       alias, so longest-wins correctly beats "baked potato" and "potato".

       Tier B: aliases that CONTAIN the query. This is a BROAD query, not
       a specific one: "spinach" hits both "cooked spinach" and "raw
       spinach". Ranking these by length would let whichever variant
       happens to carry a longer alias win arbitrarily — which is how a
       bare "spinach" was resolving to 420 mg (cooked) instead of the
       honest 84–420 union. So tier B does NOT rank by length; every
       match survives and the union range applies. */

    const inQuery = [];   // tier A
    const containsQuery = [];  // tier B
    ANCHOR_FOODS.forEach(f => {
      let bestIn = 0, hitContains = false;
      (f.aliases || []).forEach(a => {
        const na = normalize(a);
        if (na.length < 4) return;
        if (norm.includes(na)) bestIn = Math.max(bestIn, na.length);
        else if (na.includes(norm) && norm.length >= 3) hitContains = true;
      });
      if (bestIn > 0) inQuery.push({ row: f, len: bestIn });
      else if (hitContains) containsQuery.push(f);
    });

    let rows;
    if (inQuery.length) {
      const bestLen = Math.max(...inQuery.map(c => c.len));
      rows = inQuery.filter(c => c.len === bestLen).map(c => c.row);
    } else if (containsQuery.length) {
      rows = containsQuery;
    } else {
      return { rows: [], how: 'none' };
    }

    // Pass 3 — disambiguate variants of the SAME food by modifier
    const bases = [...new Set(rows.map(r => r.base_food))];
    if (bases.length === 1 && rows.length > 1) {
      const present = MODIFIER_TOKENS.filter(m => norm.includes(normalize(m)));
      if (present.length) {
        const scored = rows.filter(r =>
          (r.aliases || []).some(a => present.some(m => normalize(a).includes(normalize(m))))
        );
        if (scored.length) rows = scored;
      }
    }
    return { rows, how: 'substring' };
  }

  /* ═══════════ NEAR MISSES — spelling, and why this only suggests ═══════════
     Everything above is exact or substring. "potatoe", "brocoli",
     "chiken" and "yoghurt" all fall straight through it to nothing,
     which is most of what real typing looks like.

     THIS NEVER RESOLVES ANYTHING. It returns candidates for a human to
     confirm, and that restraint is the whole design. Edit distance
     measures keyboard accidents; it knows nothing about food. In this
     table alone, beet and beef are one edit apart and their potassium
     differs by a factor of four. Silently correcting a spelling into the
     wrong food would produce a confident, wrong number — the single
     failure mode this app is built to not have. A suggestion the person
     accepts is a different act entirely: they read the name.

     THREE GUARDS, each closing a specific way this goes wrong:

     1. BUDGET BY LENGTH, measured on the shorter word. Four letters or
        fewer get zero edits — at that length one substitution is usually
        a different word, not a typo (milk/silk, rice/ice, corn/cord).
        Five to seven get one. Eight or more get two, because long words
        are where people actually mistype and where a single edit is
        overwhelmingly likely to be an accident.

     2. THE FIRST LETTER MUST MATCH. Typos land in the middle and the end
        far more often than on the first keystroke, and this one cheap
        rule removes most cross-food collisions outright: beet/feet,
        corn/born, pear/bear, milk/silk.

     3. LENGTHS MUST BE CLOSE. Within two, so a short word cannot
        collapse into a long one.

     [NEEDS VERIFICATION — the thresholds are reasoned from the table's
     own contents, not from measured typing data. They were chosen to
     fail closed: a missed suggestion costs a person one more tap, a
     wrong one costs them a wrong number.] */

  /* Damerau-Levenshtein, bounded. Returns `max + 1` as soon as it knows
     the answer exceeds the budget, so the common case — a word that is
     nothing like this one — stops after a row or two rather than filling
     a whole matrix for an answer nobody wants. */
  function editDistance(a, b, max) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > max) return max + 1;
    if (!a.length || !b.length) return Math.max(a.length, b.length);

    let prev2 = null;
    let prev = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;

    for (let i = 1; i <= a.length; i++) {
      const cur = new Array(b.length + 1);
      cur[0] = i;
      let best = cur[0];
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        // the transposition case: "recieve" for "receive"
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          v = Math.min(v, prev2[j - 2] + 1);
        }
        cur[j] = v;
        if (v < best) best = v;
      }
      if (best > max) return max + 1;      // no cell can improve from here
      prev2 = prev; prev = cur;
    }
    return prev[b.length];
  }

  function budgetFor(len) {
    if (len <= 4) return 0;
    if (len <= 7) return 1;
    return 2;
  }

  /* One word against one word, with all three guards applied. */
  function nearWord(a, b) {
    if (!a || !b) return null;
    if (a[0] !== b[0]) return null;                       // guard 2
    if (Math.abs(a.length - b.length) > 2) return null;   // guard 3
    const budget = budgetFor(Math.min(a.length, b.length));
    if (budget === 0) return a === b ? 0 : null;          // guard 1
    const d = editDistance(a, b, budget);
    return d <= budget ? d : null;
  }

  /* Words that describe how a food was prepared or how much of it there
     is, rather than which food it is. They must never be the word a
     suggestion rests on.

     This is not tidiness. Scoring on the best single word pairing, the
     first version of this offered SALMON as a distance-0 suggestion for
     "grilled chiken breast" — because "grilled" is spelled correctly and
     appears in "grilled salmon". A perfect score, on the one word that
     carried no information about the food. Two of the table's aliases
     share a preparation and that is enough to look like certainty. */
  const NOT_INFORMATIVE = new Set(
    MODIFIER_TOKENS.join(' ').split(' ').concat([
      'with', 'without', 'and', 'the', 'some', 'skin', 'fat', 'free',
      'large', 'small', 'medium', 'cup', 'cups', 'glass', 'slice', 'slices',
      'piece', 'pieces', 'serving', 'servings', 'half', 'bowl', 'plate'
    ])
  );

  /* Candidates for a query that matched nothing, best first.

     Scored on the BEST single word pairing rather than on the whole
     string, because the informative word is rarely the only one: in
     "grilled chiken breast" two words are already spelled correctly and
     averaging across them would bury the misspelled food under its
     adjectives. The pairing has to be on a word that names a food. */
  function nearMisses(key, limit) {
    const norm = normalize(key);
    if (!norm || norm.length < 3) return [];
    const words = norm.split(' ')
      .filter(w => w.length >= 3 && !NOT_INFORMATIVE.has(w));
    if (!words.length) return [];

    const seen = {};
    const out = [];

    ANCHOR_FOODS.forEach(f => {
      let best = null;
      (f.aliases || []).forEach(alias => {
        const na = normalize(alias);
        if (!na) return;
        na.split(' ').forEach(aw => {
          if (aw.length < 3 || NOT_INFORMATIVE.has(aw)) return;
          words.forEach(qw => {
            const d = nearWord(qw, aw);
            if (d === null) return;
            /* Prefer the shorter edit; break ties toward the longer
               alias word, which is the more specific claim. */
            if (best === null || d < best.d || (d === best.d && aw.length > best.len)) {
              best = { d, len: aw.length, alias };
            }
          });
        });
      });
      if (best === null) return;
      // One row per base food — five spellings of potato is not a menu.
      const bucket = f.base_food || f.id;
      if (seen[bucket] !== undefined && out[seen[bucket]].distance <= best.d) return;
      const entry = { id: f.id, food_name: f.food_name, base_food: f.base_food,
                      distance: best.d, matched_alias: best.alias };
      if (seen[bucket] === undefined) { seen[bucket] = out.length; out.push(entry); }
      else out[seen[bucket]] = entry;
    });

    out.sort((a, b) => a.distance - b.distance ||
                       a.food_name.localeCompare(b.food_name));
    return out.slice(0, limit || 4);
  }

  /* ── portion conversion ──
     "glass = 1 cup" and "can = 12 fl oz" are household conventions, not
     clinical figures. Anything unrecognized returns null, which routes
     to the deliberately-widened unstated-portion path. */
  const UNIT_ALIASES = {
    'glass': { unit: 'cup', factor: 1 },
    'glasses': { unit: 'cup', factor: 1 },
    'can': { unit: 'fl oz', factor: 12 },
    'cans': { unit: 'fl oz', factor: 12 },
    'cup': { unit: 'cup', factor: 1 },
    'cups': { unit: 'cup', factor: 1 },
    'tbsp': { unit: 'tbsp', factor: 1 },
    'tablespoon': { unit: 'tbsp', factor: 1 },
    'tablespoons': { unit: 'tbsp', factor: 1 },
    'tsp': { unit: 'tsp', factor: 1 },
    'oz': { unit: 'oz', factor: 1 },
    'ounce': { unit: 'oz', factor: 1 },
    'ounces': { unit: 'oz', factor: 1 },
    'fl oz': { unit: 'fl oz', factor: 1 },
    'fluid ounce': { unit: 'fl oz', factor: 1 },
    'fluid ounces': { unit: 'fl oz', factor: 1 },
    'slice': { unit: 'slice', factor: 1 },
    'slices': { unit: 'slice', factor: 1 },
    'medium': { unit: 'medium', factor: 1 },
    'large': { unit: 'large', factor: 1 },
    'small': { unit: 'medium', factor: 0.7 },
    'fruit': { unit: 'fruit', factor: 1 },
    'grapes': { unit: 'grapes', factor: 1 },
    'piece': { unit: 'medium', factor: 1 },
    'pieces': { unit: 'medium', factor: 1 }
  };

  // Units that are interchangeable enough to convert between.
  const VOLUME = { 'cup': 1, 'fl oz': 1 / 8, 'tbsp': 1 / 16, 'tsp': 1 / 48 };

  function toAnchorUnits(qty, unit, row) {
    if (qty === null || qty === undefined || !Number.isFinite(Number(qty))) return null;
    const q = Number(qty);
    const raw = String(unit || '').toLowerCase().trim();
    const alias = UNIT_ALIASES[raw];
    if (!alias) return null;

    const fromUnit = alias.unit;
    const fromQty = q * alias.factor;
    const toUnit = String(row.serving_unit || '').toLowerCase();

    if (fromUnit === toUnit) return fromQty;
    if (VOLUME[fromUnit] && VOLUME[toUnit]) {
      return fromQty * (VOLUME[fromUnit] / VOLUME[toUnit]);
    }
    // Unit families that don't convert (e.g. "slice" vs "cup") — decline
    // rather than guess.
    return null;
  }

  const CLAMP_MIN = 0.25;
  const CLAMP_MAX = 4.0;

  function scale(item, rows) {
    const row = rows[0];

    // Union range across same-food variants.
    const pick = (lo, hi) => {
      const lows = rows.map(r => r[lo]).filter(v => v !== null && v !== undefined);
      const highs = rows.map(r => r[hi]).filter(v => v !== null && v !== undefined);
      if (!lows.length || !highs.length) return { low: null, high: null };
      return { low: Math.min(...lows), high: Math.max(...highs) };
    };

    const base = {
      k: pick('k_low', 'k_high'),
      p: pick('p_low', 'p_high'),
      na: pick('na_low', 'na_high')
    };

    let factorLow = 1, factorHigh = 1, note = null, fromPhoto = false;
    const qty = toAnchorUnits(item.portion_quantity, item.portion_unit, row);
    const band = (qty === null) ? Clinical.photoBand(item.portion_size) : null;

    if (band) {
      /* A photograph judged this portion small, average or large. That
         judgement becomes a BAND of multipliers rather than a number —
         wide enough to contain the documented 36–37% photo portion
         error and skewed upward because that error runs toward
         under-estimating, the direction that flatters a budget.

         An explicit quantity always wins over the photo's guess: if
         the user typed or confirmed a portion, qty is not null and we
         never get here. That is the whole design — the camera gets you
         a starting range, the person who ate it gets the last word. */
      factorLow = band.low;
      factorHigh = band.high;
      fromPhoto = true;
      note = null;
    } else if (qty === null) {
      // Portion unstated or unconvertible: widen UPWARD only. Measured
      // models systematically underestimate large portions, and that is
      // the error direction that flatters the user's budget.
      factorLow = 1.0;
      factorHigh = 1.5;
      note = 'portion assumed: ' + row.serving_text;
    } else {
      const f = qty / row.serving_qty;
      const clamped = Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, f));
      factorLow = factorHigh = clamped;
      if (Math.abs(f - clamped) > 0.001) {
        note = 'Portion looked unusual — counted as ' + clamped + 'x the standard serving.';
      }
    }

    const mul = (v, f) => (v === null || v === undefined) ? null : Math.round(v * f * 10) / 10;

    return {
      name: row.food_name,
      portion_text: item.portion_text || row.serving_text,
      quantity_multiplier: factorHigh,
      matched_anchor_id: row.id,
      source: 'anchor',
      potassium_low_mg:  mul(base.k.low,  factorLow),
      potassium_high_mg: mul(base.k.high, factorHigh),
      phosphorus_low_mg: mul(base.p.low,  factorLow),
      phosphorus_high_mg:mul(base.p.high, factorHigh),
      sodium_low_mg:     mul(base.na.low, factorLow),
      sodium_high_mg:    mul(base.na.high,factorHigh),
      additive_phosphate_flag: !!row.additive_risk,
      salt_substitute_flag: false,
      /* Persisted, not a display flag: the review screen has to say
         where this width came from, and a meal reopened next week has
         to still say it. */
      photo_portion: fromPhoto ? String(item.portion_size).toLowerCase() : null,
      _row: row,
      _note: note,
      _union: rows.length > 1
    };
  }

  /* ── main entry: split extracted items into resolved and unmatched ── */
  function resolveItems(items) {
    const resolved = [];
    const unmatched = [];

    (items || []).forEach(item => {
      if (item.resolvable === false) return;  // the clarify gate owns these

      const key = [item.name, ...(item.modifiers || [])].join(' ');
      const { rows } = match(key);

      /* An unmatched item leaves with its near misses attached, not
         resolved by them. The suggestion is a question the UI asks; only
         a tap answers it. See nearMisses() for why that separation is
         not negotiable. */
      if (!rows.length) {
        unmatched.push(Object.assign({}, item, { near: nearMisses(key) }));
        return;
      }

      const bases = [...new Set(rows.map(r => r.base_food))];
      if (bases.length > 1) { unmatched.push(item); return; }  // never guess across foods

      resolved.push(scale(item, rows));
    });

    return { resolved, unmatched };
  }

  /* Build an item record from a manual picker selection — the same shape
     as an anchor match, so everything downstream is identical. */
  function fromPicker(rowId, multiplier) {
    const row = ANCHOR_FOODS.find(f => f.id === rowId);
    if (!row) return null;
    return scale(
      { portion_quantity: row.serving_qty * (multiplier || 1), portion_unit: row.serving_unit,
        portion_text: (multiplier && multiplier !== 1 ? multiplier + '× ' : '') + row.serving_text },
      [row]
    );
  }

  /* Re-scale an already-resolved item when the user moves the stepper.
     Deterministic — fires ZERO model calls. */
  function rescale(item, multiplier) {
    const row = ANCHOR_FOODS.find(f => f.id === item.matched_anchor_id);
    if (!row) return item;
    const next = scale(
      { portion_quantity: row.serving_qty * multiplier, portion_unit: row.serving_unit,
        portion_text: (multiplier !== 1 ? multiplier + '× ' : '') + row.serving_text },
      [row]
    );
    next.salt_substitute_flag = item.salt_substitute_flag;
    return next;
  }

  /* ── meal totals & confidence ── */
  function totals(items) {
    /* ═══ A MISSING VALUE MUST NOT PASS AS A ZERO ═══
       These sums use `|| 0`, which is correct arithmetic — the app
       must not invent a figure for a food it cannot price — but for a
       long time only SODIUM recorded that it had done so. A food with
       no potassium value therefore contributed 0 mg and the ring
       reported more headroom than the person had, silently.

       That is the error direction that flatters the budget, which is
       the one this whole product exists to avoid. And the coverage
       panel already told the reader it did not happen: "the day is
       marked as partial rather than quietly summing as though nothing
       were absent."

       It is not rare. 13 of 55 rows have no potassium, 36 have no
       phosphorus, and Frank's first breakfast — egg on white toast —
       has no potassium figure for the egg.

       So every nutrient now carries the flag, and a COUNT rather than
       a boolean: "2 items have no potassium figure" is something a
       reader can act on, where "partial data" is a shrug. */
    const t = {
      total_potassium_low_mg: 0, total_potassium_high_mg: 0,
      total_phosphorus_low_mg: 0, total_phosphorus_high_mg: 0,
      total_sodium_low_mg: 0, total_sodium_high_mg: 0,
      incomplete: { k: false, p: false, na: false },
      unpriced: { k: 0, p: 0, na: 0 }
    };
    const absent = (v) => v === null || v === undefined;
    items.forEach(i => {
      if (i.source === 'uncounted') return;
      t.total_potassium_low_mg  += i.potassium_low_mg  || 0;
      t.total_potassium_high_mg += i.potassium_high_mg || 0;
      t.total_phosphorus_low_mg += i.phosphorus_low_mg || 0;
      t.total_phosphorus_high_mg+= i.phosphorus_high_mg|| 0;
      t.total_sodium_low_mg     += i.sodium_low_mg     || 0;
      t.total_sodium_high_mg    += i.sodium_high_mg    || 0;

      if (absent(i.potassium_low_mg))  { t.incomplete.k = true;  t.unpriced.k++; }
      if (absent(i.phosphorus_low_mg)) { t.incomplete.p = true;  t.unpriced.p++; }
      if (absent(i.sodium_low_mg))     { t.incomplete.na = true; t.unpriced.na++; }
    });
    /* Kept readable so stored meals written before this change, and any
       caller not yet updated, still answer the same question rather
       than reading undefined and quietly deciding everything is fine. */
    t.sodium_totals_incomplete = t.incomplete.na;
    Object.keys(t).forEach(k => {
      if (typeof t[k] === 'number') t[k] = Math.round(t[k] * 10) / 10;
    });
    return t;
  }

  function confidence(items) {
    const counted = items.filter(i => i.source !== 'uncounted');
    if (!counted.length) return 'low';
    const anchored = counted.filter(i => i.source === 'anchor').length;
    const share = anchored / counted.length;
    if (share === 1) return 'high';
    if (share >= 0.5) return 'moderate';
    return 'low';
  }

  /* Sodium is the worst-estimated nutrient, so its displayed confidence
     runs one tier BELOW the meal's tier whenever any sodium value was
     model-estimated or missing. */
  function sodiumConfidence(items, mealTier) {
    const shaky = items.some(i =>
      i.source === 'llm' ||
      (i.source === 'anchor' && (i.sodium_low_mg === null || i.sodium_low_mg === undefined))
    );
    if (!shaky) return mealTier;
    const order = ['high', 'moderate', 'low'];
    return order[Math.min(order.length - 1, order.indexOf(mealTier) + 1)];
  }

  return {
    normalize, match, nearMisses, editDistance, resolveItems, fromPicker, rescale,
    totals, confidence, sodiumConfidence, toAnchorUnits,
    CLAMP_MIN, CLAMP_MAX
  };
})();
