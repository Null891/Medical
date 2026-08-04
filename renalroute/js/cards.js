/* ═══════════════════════════════════════════════════════════════
   CARDS — flag cards and the swap engine. ZERO model calls.
   ───────────────────────────────────────────────────────────────
   Why the swap engine is deterministic: measured LLM accuracy when
   classifying LOW-potassium foods is about 60%. The dominant failure is
   over-restriction — roughly 40% of genuinely safe foods get called
   high and suppressed, which is a live re-enactment of the reflexive
   restriction model the field has moved away from. The rarer failure,
   a high-potassium food offered as safe, is unsurvivable in front of a
   renal dietitian. Both point the same way: suggestions come from a
   curated table by rule, never from a model.

   Consequence: the same meal always produces byte-identical card text.
   ═══════════════════════════════════════════════════════════════ */

const Cards = (() => {

  /* ═══════════ keyword scanners ═══════════ */

  function normalizeText(t) {
    return String(t || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* Salt substitutes. The exclusions matter: "no salt added" and
     "unsalted" describe the ABSENCE of sodium, not its replacement with
     potassium, and flagging them would be a false alarm a dietitian
     spots instantly. */
  const SALT_SUB_TRIGGERS = ['salt substitute', 'lo salt', 'losalt', 'no salt', 'nosalt', 'lite salt', 'potassium chloride'];
  const SALT_SUB_EXCLUSIONS = ['no salt added', 'unsalted'];

  function detectSaltSubstitute(text) {
    const t = normalizeText(text);
    if (!t) return null;
    for (const ex of SALT_SUB_EXCLUSIONS) {
      if (t.includes(ex)) {
        // Remove the excluded phrase, then keep scanning the remainder.
        return detectSaltSubstitute(t.split(ex).join(' '));
      }
    }
    // "no salt" as two bare words never triggers — only joined/hyphenated
    // product-name forms, which normalizeText has collapsed to "no salt".
    // Distinguish by requiring the original text to have had no space.
    const raw = String(text || '').toLowerCase();
    for (const trig of SALT_SUB_TRIGGERS) {
      if (trig === 'no salt') {
        if (/no-?salt\b/.test(raw.replace(/\s/g, '')) && /nosalt|no-salt/.test(raw.replace(/\s+/g, ''))) {
          return 'No-Salt';
        }
        continue;
      }
      if (t.includes(trig)) return trig;
    }
    return null;
  }

  /* Phosphate additives. Teaching heuristic: any ingredient containing
     the letters PHOS is added phosphate, and added phosphate is absorbed
     almost completely. */
  const PHOS_NAMES = [
    'phosphoric acid', 'sodium phosphate', 'monosodium phosphate', 'disodium phosphate',
    'trisodium phosphate', 'potassium phosphate', 'calcium phosphate', 'monocalcium phosphate',
    'dicalcium phosphate', 'tricalcium phosphate', 'ammonium phosphate', 'magnesium phosphate',
    'pyrophosphate', 'tetrasodium pyrophosphate', 'sodium acid pyrophosphate', 'diphosphate',
    'triphosphate', 'sodium tripolyphosphate', 'polyphosphate', 'sodium hexametaphosphate',
    'sodium aluminum phosphate'
  ];
  const PHOS_ENUMBERS = ['e338', 'e339', 'e340', 'e341', 'e342', 'e343', 'e450', 'e451', 'e452', 'e541'];

  function detectPhos(text) {
    const t = normalizeText(text);
    if (!t) return null;
    if (t.includes('baking powder')) return { match: 'baking powder', bakingPowder: true };
    const name = PHOS_NAMES.find(n => t.includes(n));
    if (name) return { match: name };
    const enumber = PHOS_ENUMBERS.find(e => new RegExp('\\b' + e + '\\b').test(t.replace(/\s/g, '')));
    if (enumber) return { match: enumber.toUpperCase() };
    if (/\bphos\w*/.test(t) && !/phosphorus\b/.test(t)) {
      const m = t.match(/\b\w*phos\w*/);
      if (m) return { match: m[0] };
    }
    return null;
  }

  /* Potassium additives, TWO TIERS.
     Tier 1 contributes meaningful potassium. Tier 2 are preservatives at
     roughly 0.1–0.3% w/w — single-digit to low-tens of mg per serving.
     Flagging a diet soda as a hyperkalaemia risk over potassium sorbate
     is a quantitative error, and it re-enacts the binary-verdict model
     this app exists to avoid. */
  const K_TIER1 = [
    { name: 'potassium chloride', e: 'E508' },
    { name: 'potassium lactate', e: 'E326' },
    { name: 'potassium phosphate', e: 'E340' },
    { name: 'potassium citrate', e: 'E332' }
  ];
  const K_TIER2 = [
    { name: 'potassium sorbate', e: 'E202' },
    { name: 'potassium benzoate', e: 'E212' },
    { name: 'potassium bicarbonate', e: 'E501' },
    { name: 'potassium metabisulphite', e: 'E224' },
    { name: 'potassium metabisulfite', e: 'E224' }
  ];

  function detectPotassiumAdditive(text) {
    const t = normalizeText(text);
    if (!t) return null;
    const t1 = K_TIER1.find(a => t.includes(a.name));
    if (t1) return { tier: 1, name: t1.name, e: t1.e };
    const t2 = K_TIER2.find(a => t.includes(a.name));
    if (t2) return { tier: 2, name: t2.name, e: t2.e };
    return null;
  }

  /* ═══════════ swap engine ═══════════ */

  function findSwaps(flaggedItem, nutrient, target, dayHigh) {
    if (!target) return { swaps: [], reason: 'no_target' };

    const remaining = Math.max(0, target - dayHigh);
    if (remaining === 0) return { swaps: [], reason: 'no_fit' };

    const row = ANCHOR_FOODS.find(f => f.id === flaggedItem.matched_anchor_id);
    if (!row) return { swaps: [], reason: 'no_row' };

    const highField = nutrient === 'k' ? 'k_high' : nutrient === 'p' ? 'p_high' : 'na_high';

    const cands = ANCHOR_FOODS.filter(f =>
      f.swap_pool === true &&
      f.category === row.category &&
      f.base_food !== row.base_food &&
      f[highField] !== null && f[highField] !== undefined &&
      f[highField] <= remaining
    ).sort((a, b) => a[highField] - b[highField]).slice(0, 3);

    return { swaps: cands, reason: cands.length ? 'ok' : 'no_fit', remaining, row };
  }

  function swapLine(flaggedItem, nutrient) {
    // Swaps render only in normal and caution modes.
    if (!Clinical.swapsAllowed()) return null;

    const t = Store.targets();
    const target = nutrient === 'k' ? t.k : nutrient === 'p' ? t.p : t.na;
    if (!target) return null;

    const totals = Store.dayTotals();
    const dayHigh = nutrient === 'k' ? totals.k.high : nutrient === 'p' ? totals.p.high : totals.na.high;

    const { swaps, reason, row } = findSwaps(flaggedItem, nutrient, target, dayHigh);
    const label = nutrient === 'k' ? 'potassium' : nutrient === 'p' ? 'phosphorus' : 'sodium';

    if (reason === 'no_fit') return COPY.cards.swapNoFit(label);
    if (!swaps.length || !row) return null;

    const s = swaps[0];
    const hi = nutrient === 'k' ? 'k_high' : nutrient === 'p' ? 'p_high' : 'na_high';
    const lo = nutrient === 'k' ? 'k_low' : nutrient === 'p' ? 'p_low' : 'na_low';
    const fLo = nutrient === 'k' ? 'k_low' : nutrient === 'p' ? 'p_low' : 'na_low';
    const fHi = nutrient === 'k' ? 'k_high' : nutrient === 'p' ? 'p_high' : 'na_high';

    return COPY.cards.swap(
      row.food_name.toLowerCase(), s.food_name.toLowerCase(),
      s[lo], s[hi], label, s.serving_text, row[fLo], row[fHi]
    );
  }

  /* ═══════════ card generation ═══════════ */

  const card = (o) => Object.assign({ tone: 'info', swap: null }, o);

  function generate(items, mealText) {
    const out = [];
    const kMode = Clinical.potassiumMode().mode;
    const pMode = Clinical.phosphorusMode().mode;
    const paused = kMode === 'paused';
    const t = Store.targets();
    const totals = Store.dayTotals();

    /* ── 1. Salt substitute. Fires in EVERY mode, including paused.
       A hazard warning is a fact about a food, not a coaching plan, and
       suppressing it at the exact moment potassium is dangerous would be
       the wrong call. ── */
    const saltSub = detectSaltSubstitute(mealText);
    if (saltSub) {
      out.push(card({
        kind: 'salt_substitute', tone: 'danger', chip: 'Salt substitute',
        title: COPY.cards.saltSubTitle, body: COPY.cards.saltSub
      }));
    }

    /* ── 2. Potassium additives, two tiers ── */
    const kAdd = detectPotassiumAdditive(mealText);
    if (kAdd) {
      if (kAdd.tier === 1) {
        out.push(card({
          kind: 'k_additive_1', tone: 'warn', chip: 'Potassium additive',
          title: COPY.cards.kAdditiveTier1Title,
          body: COPY.cards.kAdditiveTier1(kAdd.name, kAdd.e)
        }));
      } else {
        out.push(card({
          kind: 'k_additive_2', tone: 'muted', chip: 'Potassium additive', quiet: true,
          title: null, body: COPY.cards.kAdditiveTier2(kAdd.name)
        }));
      }
    }

    /* ── 3. PHOS ingredient scan (typed ingredient lists) ── */
    const phos = detectPhos(mealText);
    if (phos) {
      let body = COPY.cards.phos(phos.match);
      if (phos.bakingPowder) body += ' ' + COPY.cards.bakingPowder;
      out.push(card({
        kind: 'phos_heuristic', tone: 'warn', chip: 'Additive phosphate',
        title: COPY.cards.phosTitle, body
      }));
    }

    /* ── 4. Per-item cards ── */
    items.forEach(item => {
      if (item.source === 'uncounted') return;
      const row = ANCHOR_FOODS.find(f => f.id === item.matched_anchor_id);

      // 4a. Additive phosphate from the anchor table. Fires in every mode.
      if (item.additive_phosphate_flag && item.phosphorus_low_mg !== null) {
        out.push(card({
          kind: 'additive', tone: 'warn', chip: 'Additive phosphate',
          title: COPY.cards.additiveTitle,
          body: COPY.cards.additive(item.name, item.phosphorus_low_mg, item.phosphorus_high_mg)
        }));
      }

      // 4b. Budget-heavy potassium item.
      if (t.k && Clinical.isBigItem(item.potassium_high_mg, t.k)) {
        const mg = Clinical.fmt(item.potassium_high_mg);
        const pct = Clinical.pctOfTarget(item.potassium_high_mg, t.k);
        const leftLow = Math.max(0, Clinical.round10(t.k - totals.k.high));
        const leftHigh = Math.max(0, Clinical.round10(t.k - totals.k.low));

        if (paused) {
          /* Audit F16 — the one potassium statement that survives paused
             mode. Stated as a fact about the food, with no plan attached
             and no swap. Saying nothing here while still accepting the
             log would be worse than saying this. */
          out.push(card({
            kind: 'big_paused', tone: 'muted', chip: 'Big number, in context',
            title: null, body: COPY.cards.bigNumberPaused(mg)
          }));
        } else if (Clinical.restrictionToneAllowed()) {
          const caution = (kMode === 'caution' || kMode === 'restricted');
          const body = caution
            ? COPY.cards.bigNumberCaution(item.name, mg, pct, Clinical.fmt(t.k), Clinical.fmt(leftLow), Clinical.fmt(leftHigh))
            : COPY.cards.bigNumberNormal(item.name, mg, pct, Clinical.fmt(t.k), Clinical.fmt(leftLow), Clinical.fmt(leftHigh));
          out.push(card({
            kind: 'big_number', tone: caution ? 'warn' : 'info', chip: 'Big number, in context',
            title: caution ? 'Worth planning around.' : 'Big number, in context.',
            body,
            swap: swapLine(item, 'k')
          }));
        }
        // In `low` mode: nothing. Restriction-toned output is suppressed
        // entirely and the ring is replaced elsewhere.
      }

      // 4c. Sodium is category-level only, never mg-precision.
      if (row && row.sodium_category && !paused) {
        out.push(card({
          kind: 'sodium_category', tone: 'muted', chip: 'Sodium category',
          title: COPY.cards.sodiumTitle,
          body: COPY.cards.sodium(
            row.sodium_category,
            item.sodium_low_mg === null ? '—' : Clinical.fmt(item.sodium_low_mg),
            item.sodium_high_mg === null ? '—' : Clinical.fmt(item.sodium_high_mg)
          )
        }));
      }

      // 4d. Teaching note attached to the row.
      if (row && row.teaching_note === 'spinach') {
        out.push(card({
          kind: 'teaching', tone: 'info', chip: 'Did you know',
          title: null, body: COPY.spinachTeaching
        }));
      }
    });

    // Phosphorus caution mode raises the salience of additive cards but
    // never invents a new one — the mode changes tone, not facts.
    if (pMode === 'caution') {
      out.forEach(c => { if (c.kind === 'additive') c.tone = 'warn'; });
    }

    // De-duplicate identical bodies (same food logged twice in one meal).
    const seen = new Set();
    return out.filter(c => {
      const k = c.kind + '|' + c.body;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  /* Proactive card pinned to the dashboard in restricted mode. */
  function proactiveSaltCard() {
    if (Clinical.potassiumMode().mode !== 'restricted') return null;
    return card({
      kind: 'salt_proactive', tone: 'warn', chip: 'Salt substitute',
      title: 'A note on salt substitutes.', body: COPY.cards.saltSubProactive
    });
  }

  return {
    generate, proactiveSaltCard, findSwaps, swapLine,
    detectSaltSubstitute, detectPhos, detectPotassiumAdditive
  };
})();
