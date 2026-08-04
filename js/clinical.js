/* ═══════════════════════════════════════════════════════════════
   CLINICAL — every threshold, band, and validation rule.
   ───────────────────────────────────────────────────────────────
   Nothing in this file calls a language model. Guidance modes are
   deterministic threshold logic over numbers the user typed.

   Source positions this encodes:
   · KDOQI 2020 sets NO fixed milligram target for dietary potassium or
     phosphorus — the guidance is to adjust intake to keep serum values
     in range, individualized by the care team. So the app never
     prescribes a number; the user's numbers drive the rings.
   · Sodium: KDOQI 2020 grade 1B, under 2.3 g/day for CKD 3–5;
     KDIGO 2024 stricter at 2.0 g/day.
   · Serum reference: potassium 3.5–5.0 mEq/L; above 6.0 dangerous.
     Phosphorus 2.5–4.5 mg/dL.
   · KDIGO GFR categories: G1 ≥90, G2 60–89, G3a 45–59, G3b 30–44,
     G4 15–29, G5 <15.

   Two deliberate asymmetries live here and must not be "simplified":
   1. STALENESS (G.9-E2). Past 90 days only a NORMAL result decays to
      no_lab framing. Abnormal states never relax on a timer, because
      downgrading someone out of an abnormal state without new evidence
      is the unsafe direction.
   2. PHOSPHORUS has three tiers, not five. Published guidance gives no
      graded severity thresholds for high phosphorus, so this app
      invents none and has no phosphorus equivalent of `paused`.
   ═══════════════════════════════════════════════════════════════ */

const Clinical = (() => {

  /* ── Target bounds. Audit finding F7: ONE definition, referenced
     everywhere. These are typo guards, not clinical limits, and the
     error copy says so. ── */
  const TARGET_BOUNDS = {
    k:  { min: 500, max: 6000, label: 'Potassium', unit: 'mg/day' },
    p:  { min: 300, max: 3000, label: 'Phosphorus', unit: 'mg/day' },
    na: { min: 500, max: 6000, label: 'Sodium', unit: 'mg/day' }
  };

  const EDUCATION_DEFAULTS = { k: 2500, p: 900, na: 2000 };

  /* ── Lab plausibility bounds (G.3). Upper potassium bound must exceed
     7.5, because a real published case reached that value; refusing it
     would reject a true reading. ── */
  const LAB_BOUNDS = {
    k:    { min: 1.5, max: 10.0, label: 'serum potassium', unit: 'mEq/L', dp: 1 },
    p:    { min: 0.5, max: 15.0, label: 'serum phosphorus', unit: 'mg/dL', dp: 1 },
    egfr: { min: 1,   max: 150,  label: 'eGFR', unit: 'mL/min/1.73m²', dp: 0 }
  };

  const STALE_DAYS = 90;

  /* ═══════════ leaching — cooking as a lever, not a hope ═══════════
     Boiling a high-potassium vegetable in plenty of water and draining
     it removes a large share of its potassium: the literature reports
     roughly 50% for cubed pieces and up to 75% for shredded or
     double-boiled, with small pieces and a big pot of water doing most
     of the work. Soaking alone — the advice patients are most often
     given — barely moves it, which is worth correcting rather than
     repeating.

     The factors below are what REMAINS after boiling and draining, and
     they are deliberately more cautious than the evidence. Published
     removal is 50-75%; this claims removal of only 25-50%. Under-stating
     potassium is the one error direction that is genuinely unsafe here,
     because it tells someone they have room they do not have, so the
     conservatism runs in the safe direction.

     [NEEDS VERIFICATION — the specific factors are a product choice made
     conservative against published ranges, not a figure from a guideline.
     A dietitian should confirm before this is presented as advice.] */
  const LEACH_RETAIN_LOW = 0.50;
  const LEACH_RETAIN_HIGH = 0.75;

  function leach(kLow, kHigh) {
    if (kLow === null || kLow === undefined) return { low: kLow, high: kHigh };
    return {
      low: Math.round(kLow * LEACH_RETAIN_LOW),
      high: Math.round(kHigh * LEACH_RETAIN_HIGH)
    };
  }

  /* Ring colour thresholds — display-engineering choices, not clinical. */
  const RING_AMBER_AT = 0.70;   // high end ≥70% of target
  const BIG_ITEM_AT   = 0.33;   // single item ≥33% of target

  /* ═══════════ target validation ═══════════ */

  function validateTarget(which, raw) {
    const b = TARGET_BOUNDS[which];
    if (raw === '' || raw === null || raw === undefined) return { ok: true, value: null };
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return { ok: false, value: null, message: COPY.targetOutOfBounds };
    }
    if (n < b.min || n > b.max) {
      return { ok: false, value: null, message: COPY.targetOutOfBounds };
    }
    return { ok: true, value: n };
  }

  /* ═══════════ lab validation ═══════════ */

  function validateLab(which, raw) {
    const b = LAB_BOUNDS[which];
    if (raw === '' || raw === null || raw === undefined) return { ok: true, value: null };
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      return { ok: false, value: null, message: COPY.labImplausible(b.label, b.unit) };
    }
    if (n < b.min || n > b.max) {
      return { ok: false, value: null, message: COPY.labImplausible(b.label, b.unit) };
    }
    // One decimal place maximum on potassium and phosphorus.
    if (b.dp === 1 && Math.round(n * 10) / 10 !== n) {
      return { ok: false, value: null, message: COPY.labImplausible(b.label, b.unit) };
    }
    return { ok: true, value: n };
  }

  /* ═══════════ potassium mode ═══════════ */

  function potassiumMode() {
    const rec = Store.latestLab('serum_potassium_meq_l');
    if (!rec) return { mode: 'no_lab', value: null, date: null, stale: false };

    const v = rec.serum_potassium_meq_l;
    const age = Store.daysBetween(rec.lab_date, Store.todayISO());
    const stale = age > STALE_DAYS;

    let mode;
    if (v >= 6.0)      mode = 'paused';
    else if (v > 5.5)  mode = 'restricted';
    else if (v >= 5.1) mode = 'caution';
    else if (v >= 3.5) mode = 'normal';
    else               mode = 'low';

    // Asymmetric decay: ONLY the affirmative "your labs are normal"
    // assurance expires. Abnormal states persist with a nudge.
    if (stale && mode === 'normal') {
      return { mode: 'no_lab', value: v, date: rec.lab_date, stale: true, decayed: true };
    }
    return { mode, value: v, date: rec.lab_date, stale };
  }

  /* ═══════════ phosphorus mode ═══════════ */

  function phosphorusMode() {
    const rec = Store.latestLab('serum_phosphorus_mg_dl');
    if (!rec) return { mode: 'no_lab', value: null, date: null, stale: false };

    const v = rec.serum_phosphorus_mg_dl;
    const age = Store.daysBetween(rec.lab_date, Store.todayISO());
    const stale = age > STALE_DAYS;

    let mode;
    if (v > 4.5)       mode = 'caution';
    else if (v >= 2.5) mode = 'normal';
    else               mode = 'below_range';

    if (stale && mode === 'normal') {
      return { mode: 'no_lab', value: v, date: rec.lab_date, stale: true, decayed: true };
    }
    return { mode, value: v, date: rec.lab_date, stale };
  }

  /* ═══════════ what each mode permits ═══════════ */

  const isPaused = () => potassiumMode().mode === 'paused';

  /* Swap lines render only in normal and caution.
     Suppressed in low (do not push restriction on a hypokalaemic user),
     restricted (defer to the care team's plan), and paused. */
  function swapsAllowed() {
    const m = potassiumMode().mode;
    return m === 'normal' || m === 'caution' || m === 'no_lab';
  }

  /* Restriction-toned output is suppressed in low mode entirely. */
  function restrictionToneAllowed() {
    const m = potassiumMode().mode;
    return m !== 'low' && m !== 'paused';
  }

  /* Audit finding F5: in low mode the potassium ring itself is the
     loudest restriction signal in the app, so it is replaced by a plain
     intake readout. Suppressing the cards while leaving the ring would
     be suppressing the footnote and keeping the headline. */
  function ringSuppressed(nutrient) {
    return nutrient === 'k' && potassiumMode().mode === 'low';
  }

  /* ═══════════ eGFR — education only, never a diagnosis ═══════════ */

  const GFR_BANDS = [
    { stage: 'G1',  min: 90,  max: Infinity, range: '90 and above' },
    { stage: 'G2',  min: 60,  max: 89.999,   range: '60–89' },
    { stage: 'G3a', min: 45,  max: 59.999,   range: '45–59' },
    { stage: 'G3b', min: 30,  max: 44.999,   range: '30–44' },
    { stage: 'G4',  min: 15,  max: 29.999,   range: '15–29' },
    { stage: 'G5',  min: -Infinity, max: 14.999, range: 'below 15' }
  ];

  function egfrBand(n) {
    return GFR_BANDS.find(b => n >= b.min && n <= b.max) || null;
  }

  function egfrSentence(n) {
    const b = egfrBand(n);
    if (!b) return null;
    return COPY.egfrEducation(n, b.stage, b.range);
  }

  /* ═══════════ ring status & remaining copy ═══════════ */

  const round10 = (n) => Math.round(n / 10) * 10;

  function ringStatus(high, target) {
    if (!target) return null;
    const ratio = high / target;
    if (ratio > 1)              return { key: 'danger', label: COPY.statusDanger, icon: '⬣' };
    if (ratio >= RING_AMBER_AT) return { key: 'warn',   label: COPY.statusWarn,   icon: '▲' };
    return { key: 'ok', label: COPY.statusOk, icon: '✓' };
  }

  /* Fill is the MIDPOINT of the range; colour comes from the HIGH end.
     Position shows the estimate, colour shows the risk. A half-filled
     amber ring is the design working, not a bug. */
  function ringFill(low, high, target) {
    if (!target) return 0;
    const mid = (low + high) / 2;
    return Math.max(0, Math.min(1, mid / target));
  }

  function remainingText(low, high, target) {
    if (!target) return null;
    if (high <= target) {
      return `About ${fmt(round10(target - high))}–${fmt(round10(target - low))} mg left`;
    }
    if (low <= target) {
      return `Between 0 and ${fmt(round10(target - low))} mg left — possibly over`;
    }
    return `Over by about ${fmt(round10(low - target))}–${fmt(round10(high - target))} mg`;
  }

  function readoutText(low, high, target) {
    if (!target) return `≈ ${fmt(Math.round(low))}–${fmt(Math.round(high))} mg`;
    return `${fmt(Math.round(low))}–${fmt(Math.round(high))} mg of ${fmt(target)} mg`;
  }

  function fmt(n) {
    if (n === null || n === undefined) return '—';
    return Math.round(n).toLocaleString('en-US');
  }

  /* A single item is "budget heavy" when its HIGH end reaches 33% of the
     day's target for that nutrient. */
  function isBigItem(itemHigh, target) {
    if (!target || itemHigh === null || itemHigh === undefined) return false;
    return itemHigh >= target * BIG_ITEM_AT;
  }

  const pctOfTarget = (mg, target) => target ? Math.round((mg / target) * 100) : null;

  return {
    TARGET_BOUNDS, EDUCATION_DEFAULTS, LAB_BOUNDS, STALE_DAYS,
    RING_AMBER_AT, BIG_ITEM_AT,
    leach, LEACH_RETAIN_LOW, LEACH_RETAIN_HIGH,
    validateTarget, validateLab,
    potassiumMode, phosphorusMode,
    isPaused, swapsAllowed, restrictionToneAllowed, ringSuppressed,
    egfrBand, egfrSentence,
    ringStatus, ringFill, remainingText, readoutText, isBigItem, pctOfTarget,
    round10, fmt
  };
})();
