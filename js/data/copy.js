/* ═══════════════════════════════════════════════════════════════
   COPY — every user-facing string in one place.
   ───────────────────────────────────────────────────────────────
   Audit finding F11: the plan specified several strings in more than
   one section with different wording. This file is the single source
   of truth; nothing else in the app hard-codes user-facing prose.

   Canonicality applied here (per the audit's resolution):
     · consent modal .......... Plan G.7 Placement 1 (NOT the C.1 variant)
     · footer disclaimer ...... "education only" wording
     · uncounted item ......... F.9 template T6
     · clarify buttons ........ C.4 wording
     · protein card ........... G.8 (contains "1A")
     · all mode banners ....... G.2
   ═══════════════════════════════════════════════════════════════ */

const COPY = {

  /* ── Disclaimers: the three mandated placements ── */
  consentTitle: 'Before you start',
  consentBody: [
    'RenalRoute is an educational wellness tool, not a medical device. It does not diagnose, treat, cure, or prevent any disease.',
    'Nutrient figures here are estimates, shown as ranges because they can be wrong. Any starting targets are common educational defaults, not prescriptions.',
    'Always follow the targets and advice of your nephrologist and renal dietitian. Do not change your diet, medications, or dialysis care based on this app.',
    "RenalRoute needs this acknowledgment to continue — it's how we keep the app in the education lane rather than the medical-advice lane."
  ],
  consentButton: 'I understand — continue',
  footerDisclaimer: "Estimates for education only — not medical advice. Follow your care team's targets.",
  cardDisclaimer: 'Educational estimate — confirm with your care team.',

  /* ── Targets & provenance (G.1) ── */
  targetsKPNote:
    'These are common starting points, not prescriptions — set yours with your care team. ' +
    'Kidney nutrition guidelines (KDOQI 2020) set no fixed milligram limit for potassium or phosphorus; ' +
    'they recommend adjusting intake to keep your blood levels in range, individualized by your care team.',
  targetsNaNote:
    'Sodium: KDOQI 2020 recommends under 2.3 g (2,300 mg) per day for CKD stages 3–5 ' +
    '(their grade 1B recommendation). KDIGO 2024 suggests a stricter 2.0 g (2,000 mg). ' +
    'The general education range of 2,000 mg fits both.',
  provenanceChip: 'Using general education ranges — set yours with your care team',
  captionEducation:
    'General patient-education starting ranges — not a prescription. Replace them when your care team gives you numbers.',
  captionEducationSettings:
    'Using general education ranges (2,500 K / 900 P / 2,000 Na) — not a prescription. Replace them when your care team gives you numbers.',
  captionCareTeam:
    "Your care team's targets. KDOQI 2020 sets no fixed mg potassium or phosphorus target — these numbers are yours and your team's.",
  captionNone: 'No targets set — ask your care team about yours.',
  targetOutOfBounds:
    "That looks outside the range this app supports. Double-check the number. " +
    "If your care team really set this target, follow their instruction — this app's limits are technical, not medical.",

  /* ── Log flow ── */
  analyzeError:
    "We couldn't analyze that right now. Your text is saved — try again, or pick your foods from the list instead.",
  capReached: "You've hit today's analysis limit — the food list still works.",
  emptyExtraction:
    "We didn't spot any foods in that. Try naming them one at a time — for example: chicken, rice, green beans.",
  uncountedItem: "Not counted — we didn't have enough detail to estimate this item.",
  nothingCounted: 'Logged, but nothing could be counted. Tap to add detail.',
  clarifyUse: 'Use this answer',
  clarifySkip: 'Skip — log it without counting',
  reviewEmpty: 'Nothing left to save — go back and edit your meal text.',
  saveFailed: "Couldn't save. Your meal is still here — tap Save to today to try again.",
  deleteConfirm: "Delete this entry? This can't be undone.",
  mutationFailed: "That didn't go through. Try again.",
  pickerEmpty: "Search the food list — try 'potato' or 'milk'.",
  pickerNoResults: 'Nothing matched. Try a simpler word, or log it later.',

  /* ── Dashboard ── */
  emptyDashboard:
    "Nothing logged yet today. Plain words work — try something like 'chicken, rice, and green beans'.",
  emptyFacts: [
    'A half-cup of cooked spinach packs about five times the leaves — and five times the potassium — of a half-cup raw (420 vs 84 mg).',
    'Low-fat potato chips actually carry more potassium than regular (494 vs 339 mg per oz).',
    'In one survey of dialysis patients, 93% knew cola contains sugar — only 25% knew it contains phosphate.'
  ],
  loadError: "Couldn't load today's meals. Pull to refresh.",
  sodiumPartial: 'Sodium ranges are wide on purpose — packaged and restaurant foods vary a lot.',
  noLabsCard:
    "No lab results on file — and that's okay. RenalRoute works with general guidance: your targets are common " +
    "starting points, and whole foods aren't flagged by default. Adding a recent potassium or phosphorus result " +
    "tunes the guidance to you. It's optional, never required.",

  /* ── Ring status labels — status is NEVER color alone ── */
  statusOk: 'On track',
  statusWarn: 'Getting close',
  statusDanger: 'Over budget',

  /* ── Lab validation (G.3) ── */
  labImplausible: (analyte, unit) =>
    `That value looks unlikely for ${analyte} (${unit}). Please double-check your lab report — ` +
    `this entry wasn't saved. If the value really is on your report, contact your care team rather than this app.`,
  staleNudge: (analyte) =>
    `Your last ${analyte} result is more than 90 days old. Lab values change — if you've had newer labs, ` +
    `add the result so guidance stays in step with you.`,

  /* ── Potassium mode banners (G.2) ── */
  kMode: {
    low: (v) =>
      `Your latest potassium result (${v} mEq/L) is below the typical range (3.5–5.0). A low result is not ` +
      `something this app can advise on — please don't restrict further on your own, and discuss it with your ` +
      `care team. RenalRoute will not apply potassium restriction messaging while this is your latest result.`,
    normal: (v, d) =>
      `Your latest potassium result (${v} mEq/L, entered ${d}) is in the typical range (3.5–5.0 — your own lab ` +
      `report's range is the one that counts). Fruits, vegetables, beans, and whole grains are not restricted by ` +
      `default. RenalRoute will speak up only when your daily budget math calls for it, or when a food contains ` +
      `potassium additives.`,
    caution: (v) =>
      `Your latest potassium result (${v} mEq/L) is slightly above the typical range (3.5–5.0). RenalRoute has ` +
      `switched to caution mode: you'll see earlier heads-ups on higher-potassium meals. This is educational ` +
      `guidance, not a diagnosis. If you haven't already, mention this result to your care team.`,
    restricted: (v) =>
      `Your latest potassium result (${v} mEq/L) is above 5.5 — worth discussing with your care team soon. ` +
      `RenalRoute is now in restricted mode: proactive potassium education, and no swap suggestions — at this ` +
      `level your care team's plan, not an app's workaround, should lead. If they've given you a personal daily ` +
      `potassium limit, enter it now so your budget matches their plan. This app cannot judge how serious a lab ` +
      `value is.`,
    paused: (v) =>
      `A potassium level of ${v} mEq/L can be dangerous. RenalRoute cannot give food guidance at this level and ` +
      `has paused all coaching. Please contact your kidney care team or seek medical care now. You can still log ` +
      `meals, and coaching will resume when a newer result below 6.0 is entered.`
  },
  kChip: {
    low: 'Potassium: below typical range',
    normal: 'Potassium: typical-range guidance',
    caution: 'Potassium: caution',
    restricted: 'Potassium: restricted',
    paused: 'Potassium: guidance paused',
    no_lab: 'Potassium: no lab on file'
  },

  /* ── Phosphorus mode banners (G.2) ── */
  pMode: {
    below_range: (v) =>
      `Your latest phosphorus result (${v} mg/dL) is below the typical range (2.5–4.5) — worth mentioning to ` +
      `your care team. (If your report shows phosphorus in mmol/L — common outside the US — convert it or check ` +
      `with your care team; RenalRoute expects mg/dL.)`,
    normal: (v, d) =>
      `Your latest phosphorus result (${v} mg/dL, entered ${d}) is in the typical range (2.5–4.5). RenalRoute ` +
      `will focus phosphorus guidance on additive sources ('PHOS' ingredients), which are absorbed almost ` +
      `completely, rather than on whole foods.`,
    caution: (v) =>
      `Your latest phosphorus result (${v} mg/dL) is above the typical range (2.5–4.5). Extra attention to ` +
      `phosphate additives in colas, deli and cured meats, processed cheese, and packaged baked goods — additive ` +
      `phosphate is absorbed almost completely, unlike the phosphorus bound in whole foods. Mention this result ` +
      `to your care team, and if they've set a personal phosphorus target, enter it.`
  },
  pChip: {
    below_range: 'Phosphorus: below typical range',
    normal: 'Phosphorus: typical-range guidance',
    caution: 'Phosphorus: caution',
    no_lab: 'Phosphorus: no lab on file'
  },

  /* ── Audit fix F5: low-potassium ring replacement ── */
  lowModeRing:
    "Your care team is managing your potassium. RenalRoute isn't tracking it against a limit right now.",

  /* ── eGFR — wording is PINNED. Never say "you are stage X". ── */
  egfrEducation: (n, stage, range) =>
    `The eGFR you entered (${n}) falls in the range labeled ${stage} (${range} mL/min/1.73 m²) on the KDIGO ` +
    `scale your care team uses. Stage is shown for education only — it never changes your targets or guidance ` +
    `mode, and it isn't a diagnosis. Your targets come from your care team.`,

  /* ── Flag-card templates (G.4, G.5, G.6) ── */
  cards: {
    bigNumberNormal: (item, mg, pct, target, low, high) =>
      `Heads-up on the math: ${item} runs about ${mg} mg potassium — roughly ${pct}% of your ${target} mg day. ` +
      `You have ${low}–${high} mg left for the rest of today. This is natural potassium from a whole food, which ` +
      `is absorbed less completely than potassium from additives — so this is planning info, not a warning.`,
    bigNumberCaution: (item, mg, pct, target, low, high) =>
      `Caution mode heads-up: ${item} runs about ${mg} mg potassium — roughly ${pct}% of your ${target} mg day, ` +
      `leaving ${low}–${high} mg. Because your last potassium result was slightly above range, it's worth ` +
      `planning the rest of today around this.`,
    /* Audit fix F16 — the only potassium statement that survives paused mode.
       Stated as a fact about a food, never as a plan. */
    bigNumberPaused: (mg) =>
      `For reference, this is one of the most potassium-dense everyday foods (~${mg} mg). Please follow your ` +
      `care team's instructions.`,

    additiveTitle: 'Small number, almost fully absorbed.',
    additive: (food, low, high) =>
      `Phosphate additive in ${food}. The number looks small (${low}–${high} mg), but additive phosphate — like ` +
      `the phosphoric acid in cola — is absorbed almost completely (over 90%). Phosphorus naturally bound in ` +
      `plant foods is absorbed at under 40%, and in animal foods roughly 40–60%. That's why a packaged food with ` +
      `200 mg of additive phosphorus can deliver more real phosphate than a bean dish with 350 mg. One more ` +
      `reason it's easy to miss: in a survey of dialysis patients, 93% knew cola contains sugar — only 25% knew ` +
      `it contains phosphate.`,

    phosTitle: "'PHOS' on a label means additive phosphate.",
    phos: (ing) =>
      `"PHOS" spotted: this ingredient list includes ${ing}, a phosphate additive. Rule of thumb your dietitian ` +
      `will recognize: any ingredient containing "PHOS" is added phosphate, and added phosphate is absorbed ` +
      `almost completely (over 90%) — versus under 40% from plant foods and roughly 40–60% from animal foods. ` +
      `Additives usually don't appear on the nutrition label's phosphorus line.`,
    bakingPowder: 'Baking powder alone carries over 450 mg of phosphorus per teaspoon.',

    kAdditiveTier1Title: 'Added potassium inside.',
    kAdditiveTier1: (ing, e) =>
      `Added potassium inside: this ingredient list includes ${ing}${e ? ' (' + e + ')' : ''}. Potassium added to ` +
      `processed foods can be a meaningful amount that never appears on the nutrition label's potassium line — ` +
      `and it's taken up more readily than potassium held inside whole plant foods.`,
    kAdditiveTier2: (ing) =>
      `Contains a potassium-based preservative (${ing}) — the amount is usually small.`,

    saltSubTitle: 'Salt substitutes are a potassium hazard.',
    saltSub:
      'Salt-substitute warning. This meal mentions a salt substitute. Products like Lo-Salt and No-Salt replace ' +
      'sodium with potassium chloride. That\'s a healthy trade for many people — but with reduced kidney function ' +
      'it can raise blood potassium quickly, and UK guidance (NICE) advises people with kidney disease not to use ' +
      'salt substitutes. Please check with your care team before using one.',
    saltSubProactive:
      'A note on salt substitutes. Many "low sodium" salts replace sodium with potassium chloride. With a ' +
      'potassium result above range, this matters: UK guidance (NICE) advises people with kidney disease not to ' +
      'use salt substitutes at all. In one published case, an older adult with kidney disease reached a dangerous ' +
      'potassium level of 7.5 mEq/L after a potassium-based salt substitute was added to their meals. Check ' +
      'labels for "potassium chloride" — and ask your care team.',

    sodiumTitle: 'Sodium range is wide on purpose.',
    sodium: (cat, low, high) =>
      `Sodium runs high — and hard to pin down — in ${cat} foods. We've counted a wide range (${low}–${high} mg). ` +
      `Treat the number as rough: with sodium, the pattern (canned, cured, and restaurant food) matters more ` +
      `than the digits.`,

    swap: (flagged, swapFood, sLow, sHigh, nutrient, serving, fLow, fHigh) => {
      const s = sLow === sHigh ? `about ${sLow} mg` : `about ${sLow}–${sHigh} mg`;
      const f = fLow === fHigh ? `${fLow} mg` : `${fLow}–${fHigh} mg`;
      return `Instead of ${flagged}, try ${swapFood} — ${s} ${nutrient} per ${serving}, versus ${f}.`;
    },
    swapNoFit: (nutrient) =>
      `No swap fits today's remaining ${nutrient} budget. Tomorrow is a fresh start — and your care team can ` +
      `help you plan for favorite foods.`
  },

  /* ── Learn cards (G.8) ── */
  learn: {
    protein: {
      title: "Why doesn't RenalRoute track protein or fluid?",
      body: [
        'Because there\'s no single right number to give you. Kidney nutrition guidelines (KDOQI 2020) call for ' +
        'protein to be prescribed individually — for example 0.55–0.60 g per kg of body weight per day for many ' +
        'people with CKD stages 3–5 who are not on dialysis and don\'t have diabetes (their strongest evidence ' +
        'grade, 1A), with different targets for diabetes or dialysis. Restricting protein safely also needs a ' +
        'dietitian\'s supervision, because too little protein carries its own risks. So we leave protein to your ' +
        'care team.',
        "Routine fluid restriction also isn't standard for most people with CKD who are not on dialysis — it's an " +
        'individual decision for your care team.',
        'RenalRoute focuses on potassium, phosphorus, and sodium: the three minerals where hidden sources — ' +
        'phosphate additives, potassium salt substitutes, packaged-food sodium — can cause real harm between ' +
        'clinic visits.'
      ]
    },
    medicines: {
      title: 'Medicines and potassium',
      body: [
        'Your blood potassium depends on more than food. Several common blood-pressure medicines, along with ' +
        'hydration, other medicines, and other health factors, can raise it — which is part of why targets are ' +
        "personal, and why green rings here don't guarantee normal labs. If you take phosphate or potassium " +
        "binders, follow your prescriber's instructions. RenalRoute does not manage medications."
      ]
    },
    leaching: {
      title: 'Cooking tip: lowering potassium',
      body: [
        'Boiling and draining high-potassium vegetables — sometimes called leaching — can substantially lower ' +
        'their potassium. Ask your dietitian whether and how to use it for the foods you cook most.'
      ]
    },
    ai: {
      title: 'How RenalRoute uses AI',
      body: [
        'RenalRoute uses AI to read your typed meal and split it into foods and portions. The nutrient numbers ' +
        'come from a curated reference table built from published USDA and American Kidney Fund values, not from ' +
        'the AI.',
        'Food swap suggestions come from that same table by rule, not from the AI. Every explanation you see is ' +
        'assembled from fixed templates, so the same meal always produces the same words.',
        'The AI never sees your lab values, your targets, or your name.'
      ]
    }
  },

  /* ── Teaching note surfaced on matching anchor rows ── */
  spinachTeaching:
    'Did you know? A half-cup of cooked spinach packs about five times the leaves — and five times the potassium ' +
    '— of a half-cup raw (420 vs 84 mg).'
};
