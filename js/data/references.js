/* ═══════════════════════════════════════════════════════════════
   REFERENCES — everything this app claims, and where it came from.
   ───────────────────────────────────────────────────────────────
   Mentor feedback: "what makes them trust us", "more research and make
   them trust us", "how are we better than other apps and AI". This
   file is the answer, and the answer is a list somebody can check.

   The category standard is worth naming plainly, because it is the
   whole argument. A kidney recipe site checked while building this
   publishes per-serving figures as bare point values with no source —
   one page states a phosphorus figure in "u" and a salt figure in
   grams where milligrams were clearly meant. Not malice; just what
   happens when nutrient numbers are typed in rather than sourced. A
   reader has no way to tell a careful number from a careless one,
   because nothing on the page distinguishes them.

   So this app does three things that a hand-typed nutrition app
   structurally cannot: every value carries a source, every value is a
   range where sources disagree, and every value we have NOT verified
   is listed as unverified. This screen is where that becomes checkable
   rather than claimed.

   RULES FOR ADDING TO THIS FILE
   1. Cite only at the level of confidence actually held. Guideline
      name, year, and the position it supports is a real citation.
      Inventing a volume, page, or DOI to look rigorous is the exact
      failure this screen exists to disprove.
   2. `used` must name where in the app the source is load-bearing. A
      reference nothing depends on is decoration.
   3. Anything the team has not personally re-derived is marked
      unverified, including where that is unflattering.
   ═══════════════════════════════════════════════════════════════ */

const REFERENCES = [

  /* ── The positions the whole product rests on ── */
  {
    group: 'Clinical guidelines',
    title: 'KDOQI Clinical Practice Guideline for Nutrition in CKD, 2020 update',
    body: 'Sets NO fixed milligram target for dietary potassium or phosphorus. Its position is that intake should be adjusted to keep serum values in range, individualised by the care team — graded as opinion. Also recommends under 2.3 g/day sodium for CKD stages 3–5 (grade 1B), and individualised protein prescription of 0.55–0.60 g/kg/day for metabolically stable CKD 3–5 without diabetes (grade 1A).',
    used: 'The reason this app never prescribes a number. Drives the three-path target provenance, the "why no protein tracking" card, and the sodium default.',
    verified: true
  },
  {
    group: 'Clinical guidelines',
    title: 'KDIGO 2024 Clinical Practice Guideline for CKD',
    body: 'Suggests a stricter sodium target of under 2.0 g/day, and endorses individualised, plant-forward eating patterns rather than blanket restriction of whole plant foods.',
    used: 'The 2,000 mg education default satisfies both KDOQI and KDIGO. Also the basis for not flagging bananas, beans, or tomatoes by default in normal mode.',
    verified: true
  },
  {
    group: 'Clinical guidelines',
    title: 'KDIGO GFR categories',
    body: 'G1 ≥90, G2 60–89, G3a 45–59, G3b 30–44, G4 15–29, G5 under 15 mL/min/1.73m².',
    used: 'The eGFR education line, which echoes the category and explicitly never says "you are stage X". Also defines this app\'s G3b–G4 focus band.',
    verified: true
  },
  {
    group: 'Clinical guidelines',
    title: 'Serum reference ranges',
    body: 'Potassium 3.5–5.0 mEq/L, with some laboratories using 3.5–5.5; above 6.0 is dangerous. Phosphorus 2.5–4.5 mg/dL. The patient\'s own laboratory report always governs.',
    used: 'Every guidance-mode boundary: low, normal, caution, restricted, and paused. The app defers to the reader\'s own report in its copy.',
    verified: true
  },

  /* ── Food and nutrient data ── */
  {
    group: 'Food values',
    title: 'USDA FoodData Central',
    body: 'The reference database for food nutrient composition.',
    used: 'The intended source of every anchor value. IMPORTANT: this table was transcribed from published sources and is awaiting re-derivation against FoodData Central. That is why the coverage panel exists and why unverified nutrients are named per food.',
    verified: false
  },
  {
    group: 'Food values',
    title: 'American Kidney Fund — Potassium Food Guide',
    body: 'Uses 150 mg or less per serving as its threshold for calling a serving "low potassium".',
    used: 'The low-potassium badge in the food picker, used exactly as published. It labels a serving and never alters a total.',
    verified: true
  },

  /* ── The mechanisms the app teaches ── */
  {
    group: 'Mechanisms',
    title: 'Phosphate bioavailability by source',
    body: 'Inorganic phosphate additives are absorbed at over 90%. Phosphorus bound in plant foods is absorbed at under 40%; animal sources fall roughly between. This is why a packaged food listing 200 mg of additive phosphorus can deliver more absorbed phosphate than a bean dish listing 350 mg.',
    used: 'Every additive-phosphate flag card, the PHOS label heuristic, and the phosphorus caution-mode copy.',
    verified: true
  },
  {
    group: 'Mechanisms',
    title: 'Potassium leaching by boiling',
    body: 'Boiling high-potassium vegetables in plenty of water and draining removes a large share of their potassium — roughly 50% for cubed pieces, up to 75% shredded or double-boiled. Soaking alone, the advice most often given, changes it very little.',
    used: 'The cooking-method toggle on the meal review. RenalRoute deliberately claims only 25–50% removal — less than published — because under-counting potassium is the unsafe direction.',
    verified: false
  },
  {
    group: 'Mechanisms',
    title: 'Cooked versus raw volume',
    body: 'A half-cup of cooked spinach contains about five times the potassium of a half-cup raw (roughly 420 mg against 84 mg). The mechanism is volume: cooking shrinks the leaves, so the same cup holds far more spinach. Cooking does not concentrate potassium — boiling actually removes it per gram.',
    used: 'The pinned teaching note, worded so regeneration cannot flip the mechanism into the common and false "cooking increases potassium".',
    verified: true
  },
  {
    group: 'Mechanisms',
    title: 'Salt substitutes and potassium chloride',
    body: 'Most salt substitutes replace sodium with potassium chloride. NICE advises people with kidney disease not to use them. A published case describes an older adult with kidney disease reaching a serum potassium of 7.5 mEq/L after a potassium-based substitute was added to their meals. Population modelling separately estimates large cardiovascular benefit from substitution at a population level alongside a smaller number of hyperkalaemia deaths among people with CKD.',
    used: 'The salt-substitute warning card, which fires in every guidance mode including paused. Worded as beneficial for most people and specifically hazardous in kidney disease, rather than as a blanket villain.',
    verified: true
  },

  /* ── Why the architecture is shaped the way it is ── */
  {
    group: 'Why the AI is limited on purpose',
    title: 'Language-model accuracy on kidney-relevant food classification',
    body: 'Measured accuracy classifying LOW-potassium foods is around 60%, against near-ceiling accuracy on high-potassium foods. The dominant failure is therefore over-restriction: roughly two in five genuinely safe foods are called high.',
    used: 'The reason the swap engine contains zero AI. Suggestions come only from curated table rows via deterministic rules.',
    verified: false
  },
  {
    group: 'Why the AI is limited on purpose',
    title: 'Language-model error on sodium estimation',
    body: 'Sodium is the worst-estimated nutrient, with median absolute percentage error reported between 34% and 64%.',
    used: 'Why sodium is coached at category level only, never at milligram precision, and why displayed sodium confidence runs one tier below the meal\'s.',
    verified: false
  },
  {
    group: 'Why the AI is limited on purpose',
    title: 'Portion-weight error from food photographs',
    body: 'Mean absolute percentage error on portion weight judged from photographs runs around 36–37%, and skews toward UNDER-estimation.',
    used: 'Why a photo selects a wide band of multipliers rather than a weight, and why that band is skewed upward — under-estimating is the direction that tells someone they have room they do not have.',
    verified: false
  },

  /* ── Impact ── */
  {
    group: 'Why this matters',
    title: 'CKD prevalence and dietary non-adherence',
    body: 'More than 35 million American adults — over one in seven — live with chronic kidney disease. Reported dietary non-adherence in CKD stages 3–4 ranges from 12% to 53%, and in one CKD 3–5 cohort 71% exceeded sodium targets.',
    used: 'The problem statement. The app is built for the diagnosed, engaged patient doing daily arithmetic — not for the undiagnosed majority, who it cannot help.',
    verified: false
  },
  {
    group: 'Why this matters',
    title: 'Awareness of phosphate in cola',
    body: 'In a survey of dialysis patients, 93% knew cola contains sugar; only 25% knew it contains phosphate.',
    used: 'The additive-phosphate teaching card and the empty-dashboard fact rotation.',
    verified: false
  }
];

/* Grouped, in declaration order, so the screen renders without needing
   a second ordering decision anywhere else. */
const REFERENCE_GROUPS = REFERENCES.reduce((acc, r) => {
  (acc[r.group] = acc[r.group] || []).push(r);
  return acc;
}, {});

const REFERENCE_STATS = {
  total: REFERENCES.length,
  verified: REFERENCES.filter(r => r.verified).length,
  unverified: REFERENCES.filter(r => !r.verified).length
};
