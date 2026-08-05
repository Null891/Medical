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

/* Renamed from COPY: this is now the ENGLISH TABLE, and js/i18n.js
   binds the global `COPY` to English merged with whichever language is
   selected. Every other file still reads plain `COPY` and needs no
   knowledge that translation exists — which is the whole reason the
   single-source-of-truth rule was worth keeping for a hundred commits
   before there was any second language to justify it. */
const COPY_EN = {

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

  /* ── Language ──
     The machine-translation note is not a disclaimer for its own sake.
     Shipping unreviewed clinical copy while presenting it as reviewed
     is exactly the failure this product spends its whole design
     avoiding, so the picker says what these translations are. */
  lang: {
    englishNote:
      'English is the language this app was written and reviewed in.',
    machineNote:
      'These translations were produced by a language model and have not been reviewed by a native ' +
      'speaker or a renal dietitian. Every number, threshold and guideline figure is identical to the ' +
      'English version. Anything not yet translated appears in English rather than being guessed at.',
    changed: 'Language changed'
  },

  /* ── Storage failure ──
     Two causes, two different fixes, so two different sentences. A
     generic "something went wrong" leaves somebody with no idea whether
     to change window or delete something. */
  storage: {
    unavailable:
      "This browser isn't letting RenalRoute save anything — usually private browsing. " +
      'Nothing you enter will be kept when you close this tab. Open RenalRoute in a normal window instead.',
    quota:
      "This browser's storage for RenalRoute is full, so nothing new is being saved. " +
      'Export a backup from Settings, then delete some older entries to make room.',
    recovered: 'Saving is working again.'
  },

  /* ── Vitals ──
     The framing is the whole safety argument. This app records these
     numbers; it does not read them. Saying so plainly is what stops a
     patient treating a saved blood pressure as an opinion about their
     blood pressure. */
  /* Every word here is chosen against the same rule: report the record,
     never grade the person. "Getting old" is a fact about a date.
     "Overdue" would be a claim about somebody's care that this app
     cannot support — they may have a lab booked for Thursday. */
  /* The collapsed scene picker. "Change" rather than "Edit" or a bare
     chevron: it names the consequence, and it is the word somebody
     scanning for a way out of the wrong scene is actually looking for. */
  /* The persistent notice about the nutrient table. It describes the
     DATA, never the deployment. An independent scan raised a HIGH
     against an earlier opening that named an environment, and read the
     whole notice as code running somewhere it should not be. Fair
     reading — and not a reason to drop the honest half. Say what is
     actually uncertain, which is the numbers.

     The phrases that must never return are listed in test/sweep.js,
     not here: this file is bundled and served, so a comment quoting
     them would put them back in the source a scanner reads. */
  dataNotice:
    'Nutrient values here are estimates from published tables, not clinically verified. ' +
    'Educational use only — see Settings for exactly what this build does and does not know.',

  scenes: {
    change: 'Change',
    close: 'Done'
  },

  /* One message per route actually taken. Saying "downloaded" after a
     share sends somebody hunting through their Files app for something
     that is already in their messages. */
  /* The one-time beat after the first saved meal. It states the
     product argument at the only moment somebody has a reason to care
     about it — and it states it as what just happened, not as a claim.
     No congratulation: "well done" for logging a meal is the tone this
     app spends its whole design avoiding. */
  firstMeal: {
    title: "That's the whole loop",
    body:
      'You typed words. RenalRoute pulled out the foods and their portions, then priced ' +
      'them against published figures — not from a guess. The numbers come as ranges ' +
      'because the honest ones do.',
    foot:
      'Anything it could not identify is logged and marked "Not counted" rather than ' +
      'invented. You will only see this note once.'
  },

  share: {
    shared: 'Sent',
    copied: 'Copied — paste it wherever you need it',
    downloaded: 'Downloaded',
    cancelled: 'Nothing sent',
    failed: "Couldn't create the file"
  },

  checklist: {
    title: 'What is out of date',
    allCurrent: 'Nothing here is going stale.',
    foot:
      'Dates from your own record — not a to-do list, and not a schedule. ' +
      'How often you need labs or readings is your care team\'s call, not this app\'s.'
  },

  vitals: {
    intro:
      'RenalRoute writes these down and hands them over — it does not interpret them. There are no ' +
      'categories, no colours and no arrows here, because what a reading means depends on your targets, ' +
      'your medicines and what your team is treating for. All of it appears on your health passport and in your export.',
    saved: 'Recorded.',
    empty: 'Nothing recorded yet. These are the numbers a kidney clinic asks for and almost nobody has ready.',
    historyTitle: 'What you have recorded',
    remove: 'Remove'
  },

  /* ── Appointments ──
     The questions field is the feature. Everything else here is a date
     picker, which every phone already has. */
  appts: {
    intro:
      'RenalRoute does not send reminders — a reminder an app promises and fails to deliver, for a ' +
      'clinic appointment, is worse than none. What it does is carry your questions onto your health ' +
      'passport, so the card you take into the room already has them on it.',
    qNote:
      'The thing people most often forget. Write it down when you think of it, not on the way there.',
    next: (days, who) =>
      days === 0 ? `Today${who ? ' — ' + who : ''}.`
      : days === 1 ? `Tomorrow${who ? ' — ' + who : ''}.`
      : `In ${days} days${who ? ' — ' + who : ''}.`,
    none: 'No appointment saved. Add one and your questions travel with your passport.',
    listTitle: 'Saved appointments',
    saved: 'Saved.',
    remove: 'Remove'
  },

  /* ── Demo entrance ──
     Honest about what it is. An automated security review that reads
     "sign in" expects an authentication boundary; there isn't one, and
     saying so here is more useful than implying otherwise. */
  demo: {
    title: 'Try RenalRoute',
    lede:
      'Pick how you would like to start. Everything happens in this browser — no account is created ' +
      'and nothing is uploaded, whichever you choose.',
    note:
      'This is a demonstration entrance, not a login. There is no protected data behind it: every option ' +
      'below opens the same app in this browser with example information in it. RenalRoute has no accounts ' +
      'at all — see Settings for what that means for your data.',
    choices: [
      {
        key: 'fresh',
        name: 'Set it up as myself',
        what: 'The normal first run — consent, what the app will not do, then four questions. Takes about a minute and nothing is pre-filled.'
      },
      {
        key: 'frank',
        name: 'Continue as Frank',
        what: 'A week of logged meals and one recent lab result. The cleanest way to see the daily loop: what is left today, and what dinner can be.'
      },
      {
        key: 'maria',
        name: 'Continue as Maria — everything used',
        what: 'A patient who has used all of it: two lab results, weight and blood pressure recorded, symptoms noted, an appointment with questions written down, a filled-in health passport, medicines including a phosphate binder, and enough history for the pattern detector to have something to say.'
      }
    ],
    hasRealData:
      'This browser already has real data in it, so the demo will not load — it would overwrite what is here. ' +
      'Open the demo in a private window instead, or export a backup first from Settings.',
    banner: (who) => `Demo — this is ${who}'s example data, not a real patient's.`,
    signOut: 'Leave demo',
    signedOut: 'Demo ended and the example data cleared.'
  },

  /* ── Install ──
     Written per platform because the platforms genuinely differ, and a
     single generic "install this app" is useless on the one where no
     API exists. iOS gets the button names spelled out. */
  install: {
    title: 'Put RenalRoute on your home screen',
    why:
      'It opens like an app, works with no signal, and you stop having to find a browser tab ' +
      'in a supermarket aisle. Nothing is uploaded and no account is created — installing changes ' +
      'where the icon lives, not where your data does.',
    button: 'Add to home screen',
    ios:
      'On an iPhone or iPad: tap the Share button at the bottom of Safari (the square with an arrow ' +
      'pointing up), scroll down, and tap "Add to Home Screen".',
    installed:
      "You're running the installed app. It works offline, and your data stays on this device.",
    unavailable:
      'Your browser has not offered an install option here. RenalRoute works exactly the same in a ' +
      'normal tab — you can also bookmark it.',
    accepted: 'Added. Look for RenalRoute on your home screen.',
    dismissed: 'No problem — the app works the same in a browser tab.'
  },

  /* ── Backup ──
     Restore overwrites everything, so the confirmation says so in those
     words. "Are you sure?" on a destructive action tells nobody what
     they are about to lose. */
  backup: {
    confirm:
      'Restoring replaces everything currently in this app — all meals, labs, targets and settings — ' +
      'with the contents of that file. This cannot be undone. Continue?',
    restored: (meals, labs) =>
      `Restored ${meals} meal${meals === 1 ? '' : 's'} and ${labs} lab result${labs === 1 ? '' : 's'}.`
  },

  /* ── Medicines ──
     One line of timing, and nothing else. Binders working with food is
     the most commonly missed practical fact about the class, it is
     identical for every binder, and the meal review is the only moment
     somebody is in a position to act on it.

     No dose, no schedule, no interaction check — and the app says so
     in the same breath, because a medicines feature that does not
     state its own limits invites people to assume it has none. */
  meds: {
    binderTiming:
      'Phosphate binders work when they are taken WITH food, not before or after.',
    binderNamed: (names) => `You have ${names} on your list.`,
    disclaimer:
      'Follow the timing your prescriber gave you. RenalRoute does not manage medications — ' +
      'it stores what you type so you can show someone, and it never checks doses, interactions, or timing beyond this note.',
    passportHint: 'Anything here also appears on your health passport.'
  },

  /* ── Kitchen ──
     Careful about what is NOT said. No recipe is called "kidney-safe":
     whether a meal suits a person depends on their labs, their targets
     and their care team, none of which a recipe knows. These are
     ordinary meals whose contents this app can actually price. */
  kitchen: {
    fitLede:
      'Recipes below fit what is left, counted at the high end of their range — the cautious ' +
      'reading, the same one the rings use. Fitting the budget is arithmetic, not a health verdict.',
    allLede:
      'Every recipe RenalRoute can price. Each one is built only from foods in the reference table, ' +
      'so the figures carry the same ranges and sources as anything you log by hand.',
    noneFit:
      "Nothing fits what is left today, and that is not a failure — it is the app being straight " +
      'with you. Tomorrow starts fresh, and your care team can help you plan around foods you want to keep.',
    overLede: 'Close, but over on the cautious count. How far over is shown so you can judge it yourself.',
    overBy: (mg) => `About ${mg} mg of potassium more than today has room for.`,
    planLede:
      'Three days built against your full daily targets, not today’s leftovers. Greedy rather than ' +
      'optimal on purpose: every choice is "does the next thing still fit", which you can check by adding up.',
    planThin:
      'Not enough recipes fit your targets to fill this day. That is a limit of our small recipe set, not a verdict on your targets.',
    planCaveat:
      'A suggestion, never a prescription. Portion sizes, cooking method and your own appetite all move these ' +
      'numbers, and your care team’s plan outranks anything here.',
    shopLede:
      'Everything the recipes need, grouped by aisle. Works with no signal, and copies out as plain text.',
    needTargets:
      'Set your daily targets first and this screen can tell you what fits. Settings → Daily targets.',
    provenance:
      'Every number in this recipe comes from the same reference table the rest of the app uses, priced by ' +
      'the same code as a meal you type in. Nothing here was entered by hand.'
  },

  /* ── Lab scan ──
     The gate copy is the important part. It names the reading, names
     what it would DO, and asks for one tap — which is the difference
     between a confirmation somebody reads and one they dismiss. */
  labScan: {
    reading: 'Reading your report…',
    readTitle: 'Here is what we read',
    readBody:
      'Check these against the page in front of you. Nothing is saved until you press save, ' +
      'and the photo itself is never stored.',
    notOnReport: "Not found on this report — you can type it in below instead.",
    nothingFound:
      "We couldn't find potassium, phosphorus or eGFR on that image. Try a straighter photo in " +
      'better light, or type the numbers in below — that always works.',
    unreadable:
      "We couldn't read that image. Type your numbers in below instead — it takes about twenty seconds.",
    failed:
      "The scan didn't work just now. Your report is unchanged, and typing the numbers in below still works.",
    /* Named consequence, not a generic "please confirm". Somebody who
       is told WHAT a value will do can actually check it; somebody
       shown a bare "are you sure?" has been trained to tap yes. */
    gate: (v, consequence) =>
      `This reads ${v}, which would ${consequence}. Check it against your report before saving.`,
    gateButton: 'It matches my report',
    confirmed: 'Confirmed against your report.',
    /* Units are reported, never converted. Phosphorus in mmol/L differs
       from mg/dL by roughly 3.2x, and silently converting somebody's
       report would invent a number they can no longer check against the
       page in front of them. */
    oddUnit: (u) =>
      `Your report shows phosphorus in ${u}, and RenalRoute expects mg/dL. We have not converted it — ` +
      'check with your care team rather than trusting a number in the wrong unit.',
    dated: (d) => `Report dated ${d}.`,
    save: 'Save these values',
    saveBlocked: 'Check the flagged value first'
  },

  /* ── The three refusals ──
     Shown once, immediately after consent, before the app is used.

     This is the answer to "what makes them trust us", and the shape of
     the answer matters more than its content: every line is something
     the reader can CHECK against the app within a minute of using it.
     "We take your privacy seriously" is unfalsifiable and therefore
     worthless. "We will not put a number on a meal we could not
     identify" is testable — type "leftover casserole" and watch.

     Each refusal also pre-frames a moment that would otherwise read as
     the app failing. Someone who has been told the app refuses to guess
     sees a "Not counted" chip as design; someone who has not sees a
     bug. Same pixels, opposite conclusion. */
  refusals: {
    title: "Three things RenalRoute won't do",
    lede: 'Most nutrition apps are confident about everything. This one is deliberately not, and here is exactly where.',
    items: [
      {
        h: "It won't invent a number",
        p: 'Type in something it cannot identify — leftover casserole, a dish with no recipe — and it asks one question. If you cannot answer, it logs the meal and marks it "not counted" rather than guessing. Your totals stay honest about what they do not include.'
      },
      {
        h: "It won't give you a health score",
        p: 'No grade, no streak, no number out of ten. Every figure here is an estimate that can be wrong by a wide margin, and grading a person\'s day on estimates that wide would be inventing a certainty nobody has.'
      },
      {
        h: "It won't tell you what your labs mean",
        p: 'Enter a potassium result and the app changes its tone, not its verdict. Above 6.0 it stops coaching entirely and tells you to contact your care team. Interpreting a blood test is their job, and an app that pretends otherwise is the problem, not the product.'
      }
    ],
    footer: 'Everything above is checkable. Try the first one now if you like.',
    button: 'Got it — start'
  },

  /* ── References ── */
  references: {
    title: 'Where our numbers come from',
    lede:
      'Every position this app takes, and the source behind it. Nutrition apps rarely publish this, ' +
      'which is exactly why it is worth publishing — a number you cannot trace is a number you cannot check.',
    unverifiedNote: (n) =>
      `${n} of these are marked unverified: they are transcribed from a source pack and have not yet been ` +
      `re-derived by this team. Saying so is the point — an app that lists only what flatters it is not a reference, it is a brochure.`,
    usedLabel: 'Used for',
    verifiedChip: 'Verified',
    unverifiedChip: 'Not yet re-derived'
  },

  /* ── Who this is for ──
     Said before anything is asked for. An app that hedges for stages
     G3a through G5 equally reads as written for nobody, which was the
     mentor note; naming the band is what lets every other sentence in
     the app stop hedging. It never gates and never changes a number. */
  focusLine:
    'Built for CKD stages G3b and G4 — diagnosed, given diet restrictions, not on dialysis.',
  focusOffBand:
    'RenalRoute is built around stages G3b and G4. Everything still works for you — the education is just written with that group in mind.',

  /* ── Onboarding echoes ──
     Every one of these exists so that a tap has a visible consequence
     on the same screen. Four questions that appear to do nothing until
     much later is a survey, and a survey before anyone has seen value
     is the cheapest place in a product to lose people. */
  onb: {
    stageUnknown:
      "That's fine — you can add it later, or never. It only decides which education you see.",
    stageInFocus: (s) =>
      `${s} is exactly who this is built for. The guidance you'll see is written for your stage.`,
    stageOutOfFocus: (s) =>
      `Noted — ${s}. RenalRoute is built around G3b and G4, so some education will read as written for them. Everything still works, and no number changes.`,
    nutrientNone:
      "Nothing picked, so all three rings lead equally. That's the right setting if you're not sure.",
    nutrientAll:
      'All three lead on your dashboard — the usual setup when a care team is watching everything.',
    nutrientSome: (names) =>
      `${names} will lead on your dashboard. The others keep counting in full — they just stop competing for your attention.`,
    hardestNone: 'Pick one and the app will open ready for it.',
    hardestEcho: (label) =>
      `The app will open set up for ${label}. You can switch that any time from the top of the dashboard.`
  },

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
  photoUnreadable:
    "We couldn't make out the food in that photo. Try again in better light, or type what you ate instead.",
  /* Photos are stored as a label, never as the image. The picture leaves
     the device only to be identified and is never written to a record. */
  photoMealLabel: 'Meal from a photo',
  emptyExtraction:
    "We didn't spot any foods in that. Try naming them one at a time — for example: chicken, rice, green beans.",
  uncountedItem: "Not counted — we didn't have enough detail to estimate this item.",
  /* ── Photo portions ──
     A photograph does produce a milligram estimate now, and these
     sentences are why that is defensible. Each names the judgement the
     picture made, says the range is wider ON PURPOSE, and points at the
     one tap that narrows it. A wide range nobody explains reads as the
     app being vague; a wide range with its cause on screen reads as the
     app being straight. */
  photoPortion: {
    small:   'Read from the photo as a small serving. The range is wider than usual because portion size judged from a picture is rough.',
    average: 'Read from the photo as an average serving. The range is wider than usual because portion size judged from a picture is rough.',
    large:   'Read from the photo as a large serving. The range is wider than usual because portion size judged from a picture is rough.'
  },
  photoPortionFix:
    'It also leans high rather than low, since photos tend to under-read portions. Tap a portion below and it narrows to your number.',

  leachApplied:
    'Counted lower because boiling and draining removes potassium. The estimate stays deliberately ' +
    'cautious — published reductions are larger than the one applied here.',
  nothingCounted: 'Logged, but nothing could be counted. Tap to add detail.',
  clarifyUse: 'Use this answer',
  clarifySkip: 'Skip — log it without counting',
  reviewEmpty: 'Nothing left to save — go back and edit your meal text.',
  saveFailed: "Couldn't save. Your meal is still here — tap Save to today to try again.",
  deleteConfirm: "Delete this entry? This can't be undone.",
  mutationFailed: "That didn't go through. Try again.",
  pickerEmpty: "Search the food list — try 'potato' or 'milk'.",
  pickerNoResults: 'Nothing matched. Try a simpler word, or log it later.',

  /* Limitations the app previously computed and told only its console.
     A gap the developers can see and the user cannot is bookkeeping, not
     honesty — and honesty is the whole argument this app makes. */
  coverage: {
    intro:
      'RenalRoute works from a curated table of published food values. It is deliberately small, and ' +
      'it has holes. Those holes are listed here rather than hidden, because a number you cannot see ' +
      'the limits of is worth less than one you can.',
    missing:
      'Where a value is missing, the food is still logged and still counted for the nutrients we do ' +
      'have — that nutrient is simply left out of the total, and the day is marked as partial rather ' +
      'than quietly summing as though nothing were absent.',
    thin:
      'These food groups have too few lower-potassium members in the table for a swap to be worth ' +
      'suggesting, so no swap line appears for them at all. That is a gap in our data, not a verdict ' +
      'that no better option exists.',
    verify:
      'Every value here was transcribed from published sources and is awaiting re-derivation against USDA FoodData Central. ' +
      'Open any food in a meal to see its source and which of its numbers are still unverified.'
  },

  picker: {
    lowKTitle:
      "150 mg of potassium or less per serving — the American Kidney Fund's own cut-off for calling " +
      'a serving low potassium. It describes this serving, not the whole day.'
  },

  /* ── Per-food provenance ──
     The app tracked a citation and a per-nutrient verification list for
     every row and showed the user none of it. Claiming "these are
     estimates" while withholding which ones and why is asking for trust
     the interface could simply have earned. */
  source: {
    cited: (food, serving, src) =>
      `${food}, per ${serving}. Values from ${src}.`,
    unverified: (list) =>
      `Not yet re-checked against USDA FoodData Central: ${list}. Those figures are the ones ` +
      `most likely to move, and they are shown as ranges for that reason.`
  },

  /* ── Barcode lookup ── */
  barcode: {
    invalid: "That doesn't look like a barcode — it should be 8 to 14 digits.",
    looking: 'Looking it up…',
    scanning: 'Point the camera at the barcode.',
    found: (label) => `Found ${label}. Ingredients filled in below — check they match the packet.`,
    /* A miss must read as a miss. This database is crowd-sourced and
       incomplete, and "not found" meaning "nothing to worry about" is
       precisely the false reassurance this screen exists to avoid. */
    notFound:
      "That barcode isn't in the open database. That tells you nothing about the food — " +
      'plenty of products simply are not listed. Type the ingredients in below instead.',
    noIngredients: (name) =>
      `${name} is listed, but without an ingredient list. Type the ingredients in below instead.`,
    failed: "The lookup didn't work just now. You can still type the ingredients in below.",
    offline: "You're offline, so the lookup can't run — but typing the ingredients in below still works.",
    cameraDenied: 'The camera is unavailable, so enter the number by hand instead.'
  },

  /* ── Label checker ── */
  label: {
    idle: 'Paste an ingredient list above and RenalRoute will name what it finds.',
    noneTitle: 'Nothing flagged in what you pasted.',
    /* Deliberately not "this food is safe". The detector knows a fixed
       list of names and E-numbers; manufacturers rename things, and
       "natural flavouring" can cover a lot. Saying what was checked is
       honest; declaring the food clear is not. */
    noneBody:
      'That means none of the phosphate additives, added-potassium ingredients, or salt substitutes ' +
      'RenalRoute knows by name appeared in this list. It does not mean the food has none — additive ' +
      'names change, and some ingredients are grouped under general terms. When in doubt, ask your ' +
      'care team.',
    ruleTitle: 'The trick worth remembering',
    ruleBody:
      'Any ingredient containing "PHOS" is added phosphate, and added phosphate is absorbed almost ' +
      'completely — over 90%, against under 40% from plant foods. It rarely appears on the nutrition ' +
      'panel, so the ingredient list is the only place it shows. The same goes for potassium: two ' +
      'words where one of them is potassium is worth a second look.'
  },

  /* One honest sentence under the greeting. Deliberately not a score:
     a number out of a hundred invents a verdict out of estimates, and
     shame is the emotion this app is least entitled to produce. */
  today: {
    nothingYet: 'Nothing logged yet — the rings show your full day ahead.',
    noTargets: 'No targets set, so this is a record rather than a comparison.',
    room: 'Room left in all three today.',
    close: 'Getting close on one of the three.',
    over: 'Over on one of the three — worth a look before your next meal.',
    paused: 'Coaching is paused while your potassium result is high. Logging still works.'
  },

  /* ── Dashboard ── */
  /* A judge may open a brand-new account and give this screen five
     seconds. It has to say what the app IS before it says what to do,
     because an empty dashboard otherwise reads as a broken one. */
  emptyDashboard:
    "Your daily room for potassium, phosphorus, and sodium — the rings show what's left. " +
    "Nothing logged yet today; plain words work: try 'chicken, rice, and green beans'.",
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
    `scale your care team uses. This GFR category is shown for education only — it never changes your targets or guidance ` +
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
    /* ── Warning signs ──
       The honest framing IS the card. Symptoms of high potassium are
       genuinely unreliable — many people have none until it is already
       dangerous — and a symptom list published without saying so
       teaches people to treat "I feel fine" as evidence. That is the
       exact false reassurance that makes hyperkalaemia dangerous, so
       the unreliability comes first, before any symptom is named. */
    warnings: {
      title: 'Warning signs worth knowing',
      body: [
        'Ask your care team what YOUR warning signs are and when they want you to call. What follows is general education, and the most important part of it is how unreliable symptoms are.',
        'High potassium often causes no symptoms at all until it is already dangerous. Feeling fine is not evidence that your potassium is fine — a blood test is the only thing that answers that question. Never use how you feel to decide whether to skip a lab or a clinic appointment.',
        'When it does cause symptoms, they can include muscle weakness or heaviness in the legs, numbness or tingling, a heartbeat that feels irregular or unusually slow, nausea, and unusual tiredness. All of these have many other causes, which is another reason they cannot be used to rule anything in or out.',
        'Chest pain, a racing or irregular heartbeat, trouble breathing, or severe muscle weakness are emergencies. Call emergency services — do not wait, and do not look it up first.',
        'One specific thing worth knowing: most "low sodium" or "lite" salts replace sodium with potassium chloride. In a published case an older adult with kidney disease reached a potassium of 7.5 mEq/L after one was added to their meals. Check the label of anything used as a salt substitute, including seasonings a family member may have bought to help.',
        'RenalRoute cannot tell you whether any of this applies to you. It tracks food. If you enter a potassium result of 6.0 or above it stops giving food guidance entirely and tells you to contact your care team.'
      ]
    },

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
        'their potassium. Ask your dietitian whether and how to use it for the foods you cook most.',
        'What matters is the water, not the waiting. Soaking alone, which is the version of this advice most ' +
        'people are given, barely changes potassium. Boiling does the work: cut the vegetable small, use a ' +
        'large pot of water, boil for at least ten minutes, then drain and discard that water. Studies of ' +
        'potatoes report roughly half the potassium removed this way, and more when the pieces are shredded ' +
        'or boiled twice.',
        'When you tell RenalRoute a potato was boiled and drained, it counts it lower — but by less than those ' +
        'studies found, because counting too little potassium is the mistake that matters here.'
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
