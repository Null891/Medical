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

    let factorLow = 1, factorHigh = 1, note = null;
    const qty = toAnchorUnits(item.portion_quantity, item.portion_unit, row);

    if (qty === null) {
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

      if (!rows.length) { unmatched.push(item); return; }

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
    const t = {
      total_potassium_low_mg: 0, total_potassium_high_mg: 0,
      total_phosphorus_low_mg: 0, total_phosphorus_high_mg: 0,
      total_sodium_low_mg: 0, total_sodium_high_mg: 0,
      sodium_totals_incomplete: false
    };
    items.forEach(i => {
      if (i.source === 'uncounted') return;
      t.total_potassium_low_mg  += i.potassium_low_mg  || 0;
      t.total_potassium_high_mg += i.potassium_high_mg || 0;
      t.total_phosphorus_low_mg += i.phosphorus_low_mg || 0;
      t.total_phosphorus_high_mg+= i.phosphorus_high_mg|| 0;
      t.total_sodium_low_mg     += i.sodium_low_mg     || 0;
      t.total_sodium_high_mg    += i.sodium_high_mg    || 0;
      if (i.sodium_low_mg === null || i.sodium_low_mg === undefined) {
        t.sodium_totals_incomplete = true;
      }
    });
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
    normalize, match, resolveItems, fromPicker, rescale,
    totals, confidence, sodiumConfidence, toAnchorUnits,
    CLAMP_MIN, CLAMP_MAX
  };
})();
