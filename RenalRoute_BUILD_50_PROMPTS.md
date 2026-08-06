# RenalRoute — THE COMPLETE BUILD, IN 50 PROMPTS

**What this is.** The whole application, from an empty project to a shippable
build, as fifty prompts you paste **one at a time, in order**. Every one is
self-contained: a fenced instruction you copy wholesale, then acceptance checks you
run before moving on.

**Which document do you want?**

| | Use |
|---|---|
| `RenalRoute_base44_MEGAPROMPT.md` | You already have a partial app and want to patch it. 25 blocks, each fixing or adding one thing, with a credit budget. |
| **This file** | You are starting from nothing, handing the build to someone else, or want the complete specification in one place. |

The two overlap on purpose. Where they disagree, this one is newer.

Everything here is built, deployed and tested at `https://chroniccal.vercel.app` —
**1,498 assertions across ten suites, zero axe-core violations across sixteen
screens.** Nothing below is speculative.

---

## The five rules that govern every prompt

These are not style preferences. Almost every hard decision in this app is one of
these five applied to a specific case, and a build that breaks them is a different,
worse product wearing the same name.

1. **NEVER INVENT A CLINICAL OR NUTRIENT VALUE.** A gap stays a gap. A missing
   number is never zero, never an average, never "about". The app says it does not
   know.
2. **THE MODEL READS; THE TABLE PRICES.** A language model turns typed text into
   foods and portions. It never produces a milligram figure. Every number comes
   from a curated table, and every explanation is a fixed template.
3. **REPORT THE RECORD, NEVER GRADE THE PERSON.** No scores. No streaks. No
   fractions with a denominator that implies a duty. "Your last lab is 94 days old"
   is a fact; "overdue" is a claim about somebody's care this app cannot support.
4. **ERR TOWARD SAYING LESS.** Where the app is unsure, it says so and stops. A
   wide range is more honest than a precise wrong number, and silence is better
   than confident nonsense.
5. **IF IT CANNOT BE CHECKED, DO NOT CLAIM IT.** Every nutrient value carries its
   source. Every capability claim on screen must be one somebody can verify.

## How to paste

- **One prompt per message.** A 4,000-word message produces worse output than four
  1,000-word ones.
- **Run the acceptance checks before the next prompt.** A prompt that half-landed
  is far cheaper to catch now.
- **If one fails twice, revert and move on.** Do not enter a fix-prompt spiral.
- **Prompts 1–16 are the product.** Everything after 16 is addition. If you stop at
  16 you have a coherent, honest app.

---
---

# PART ONE — FOUNDATION (1–6)

---

## PROMPT 1 — what this is, and what it refuses to be

> Sets the frame for everything after it. Paste it first even if you change nothing.

```
Build a chronic kidney disease dietary companion called RenalRoute. It helps someone with CKD stages 3–5 (not on dialysis) understand the potassium, phosphorus and sodium in what they eat.

WHAT IT IS: an educational wellness tool.
WHAT IT IS NOT: a medical device. It does not diagnose, treat, cure or prevent any disease, and it never tells anyone to change their diet, medication or dialysis care.

FIVE RULES THAT GOVERN EVERY DECISION IN THIS APP:

1. NEVER INVENT A CLINICAL OR NUTRIENT VALUE. A gap stays a gap. A missing number is never zero and never an average.
2. THE MODEL READS; THE TABLE PRICES. AI turns typed text into foods and portions. It never produces a milligram figure. Numbers come from a curated table; explanations come from fixed templates.
3. REPORT THE RECORD, NEVER GRADE THE PERSON. No scores, no streaks, no fractions implying a duty.
4. ERR TOWARD SAYING LESS. A wide range beats a precise wrong number.
5. IF IT CANNOT BE CHECKED, DO NOT CLAIM IT. Every value carries its source.

THINGS THIS APP DELIBERATELY WILL NOT DO, and each refusal has a reason:

· No protein or fluid tracking. Kidney guidelines (KDOQI 2020) prescribe protein individually — around 0.55–0.60 g per kg body weight per day for many people with CKD 3–5 not on dialysis and without diabetes — and restricting it safely needs a dietitian. A generic number would be wrong for most people.
· No risk score, no disease-progression prediction, no eGFR forecasting.
· No medication advice beyond one fixed sentence about binder timing.
· No claim that a good day means good labs.

AUDIENCE: adults, often older, often newly diagnosed, frequently reading on a phone in a supermarket. Write every sentence for someone who is worried and not a clinician. Plain words. No jargon without an explanation attached.

TONE: calm, specific, and never congratulatory. This app is a reference someone consults, not a coach who cheers.
```

**Check:** the project description names it an educational wellness tool, lists the
three nutrients, and states at least two things it refuses to do.

---

## PROMPT 2 — the visual system, and a contrast floor that is measured

> Everything later inherits this. Getting it wrong here means re-doing every screen.

```
Set up the design system.

PALETTE — warm, not clinical. This is read by people who did not choose their phone for its screen, often anxious, often older.

  canvas          #FBF7F2   warm off-white
  surface         #FFFFFF
  surface warm    #FEFBF7
  text primary    #2B2B2B   (about 13:1 on canvas)
  text secondary  #4A463F   (about 8:1 — this carries most of the explanation)
  accent          #1F7A6B   teal-green
  primary action  #C0492E   coral, primary buttons only
  status ok       #2A7150
  status warn     #9A5A0C
  status danger   #C0392B
  hairline        #E7DED2

THE TWO STATUS COLOURS ABOVE ARE DARKER THAN THEY LOOK LIKE THEY SHOULD BE, and that is deliberate. The original amber measured 4.23:1 on white and 3.78:1 on its own tint — both below the 4.5:1 the design claimed — and nobody caught it because nobody ever measured. Measure every foreground/background pair you actually use, including text on tinted chips, and hold 4.5:1 as a floor. Do not trust a palette's own comments.

SPACING: an 8pt grid with a 4pt fine step. Every margin and padding is a multiple.

TYPE: one modular scale, few sizes. Body text never below 16px on mobile. Line height 1.5–1.75. Cap line length at 65–75 characters — this app has a lot of prose and an uncapped measure is unreadable.

TOUCH TARGETS: 44×44px minimum, no exceptions, including chips that happen to be buttons.

THREE MODES, all first-class: light, dark, and a high-contrast mode the user can switch on. Define the tokens once and remap them per mode; do not hard-code a colour anywhere outside the token file.

NO INLINE STYLE ATTRIBUTES ANYWHERE. A strict Content-Security-Policy will drop them silently in production, so a layout that depends on one will look correct locally and collapse live.

Respect prefers-reduced-motion everywhere: it must switch off both animation and transition, not just animation.
```

**Check:** measure three real text/background pairs — body on canvas, secondary on
a warn tint, and a chip label. All ≥4.5:1. Switch to dark and re-check. No `style=`
attribute anywhere in the markup.

---

## PROMPT 3 — the shell: five tabs, a hub, and a back button that works

> Do this before any screen that needs somewhere to live.

```
Build the app shell.

A BOTTOM TAB BAR with five destinations: Home, Log, Labs, Kitchen, More. On wide screens it becomes a left rail. Five is the ceiling — a sixth tab is how navigation rots.

"MORE" IS A HUB, NOT A MENU. It is a screen of large cards, each naming a destination and saying in one sentence what it is for. Everything that is not one of the four main tabs lives here: the food list, the label checker, the health passport, the references, the gaps screen, settings.

EVERY SCREEN IS REACHABLE IN TWO TAPS FROM THE TAB BAR. Write that down as a rule and check it every time you add a screen.

THE BACK BUTTON MUST WORK. This is the failure people notice within ten seconds. Changing screens must push browser history, and the device back button must return to the previous screen rather than leaving the app. Depth-2 screens — the food list, the label checker, references, a learn card, a meal's detail — are places you VISIT, so returning from one goes back to where you came from, not to Home.

Each screen shows exactly one h1. The active tab is indicated with more than colour alone.

A skip link to main content, and a persistent landmark region at the top for site-wide notices. Notices that describe something HAPPENING pin themselves to the top: storage failing, offline, viewing example data. A standing note about where numbers come from is prose, not an alert — it sits at the top of the document and scrolls away.

NAME NOTHING AFTER A DEVELOPMENT ARTEFACT. No id, class or storage key containing "dev", "debug", "staging" or "test" for anything that is a permanent part of the product. An automated reviewer reads the DOM, and an id is often more candid than the sentence next to it.
```

**Check:** every screen is two taps from the tab bar. Navigate three deep, press
device back three times, and land where you started without leaving the app. No
`dev`-prefixed identifier anywhere.

---

## PROMPT 4 — storage that admits when it failed

> **Do this before anything writes data.** It is the difference between a visible
> failure and a silent one.

```
All data stays on the device. No account, no sign-up, no server. Nothing is uploaded.

Build a local persistence layer for: the profile, targets, lab results, meals, vitals, appointments, the health passport, and settings.

THE PART THAT MATTERS: WRITES CAN FAIL, AND THE APP MUST NOT REPORT A SUCCESS IT DID NOT HAVE.

In private browsing, or once the origin's storage quota is full, every write silently fails while the interface cheerfully says "Recorded." An app reporting success it did not have is worse than one that crashes, because a crash is visible.

So: the save function returns whether the write actually landed. Every caller checks it. A failed save shows the meal still on screen with "Couldn't save — tap Save to try again", never a confirmation.

Tell the two causes apart, because the fix differs:

  · unavailable (private browsing): "This browser isn't letting RenalRoute save anything — usually private browsing. Nothing you enter will be kept when you close this tab. Open RenalRoute in a normal window instead."
  · quota full: "This browser's storage for RenalRoute is full, so nothing new is being saved. Export a backup from Settings, then delete some older entries to make room."

Probe storage at startup, BEFORE somebody types a meal into a browser that will not keep it. Show a banner that CANNOT be dismissed while the condition holds — dismissing it would restore exactly the silence it exists to break. Say so when it recovers.

Cap the number of stored meals at a sane number and fail loudly rather than silently dropping the oldest.

When you rename a stored key later, migrate it: read the old key once, honour it, delete it. A user who dismissed something must not have it reappear because a variable was renamed.
```

**Check:** open in a private window. Log a meal. You get the banner and an honest
failure, not "Recorded." Close and reopen a normal window: data is still there.

---

## PROMPT 5 — consent, and the three places the disclaimer appears

> Legally and ethically load-bearing. Do not compress it.

```
Before the app is usable at all, show a consent gate. It is a modal, it cannot be dismissed by tapping outside, and continuing requires an explicit button press.

TITLE: Before you start

BODY, four paragraphs:

  RenalRoute is an educational wellness tool, not a medical device. It does not diagnose, treat, cure, or prevent any disease.

  Nutrient figures here are estimates, shown as ranges because they can be wrong. Any starting targets are common educational defaults, not prescriptions.

  Always follow the targets and advice of your nephrologist and renal dietitian. Do not change your diet, medications, or dialysis care based on this app.

  RenalRoute needs this acknowledgment to continue — it's how we keep the app in the education lane rather than the medical-advice lane.

BUTTON: I understand — continue

Record that consent was given. Do not ask again.

THE DISCLAIMER APPEARS IN THREE PLACES, and all three are required:

1. This gate, once.
2. A persistent footer line on the main screens: "Estimates for education only — not medical advice. Follow your care team's targets."
3. On every generated coaching card: "Educational estimate — confirm with your care team."

A full disclaimer is readable in Settings at any time.

THE CONSENT TEXT MUST TRANSLATE. A consent gate somebody cannot read is not consent. When you add languages later, this is the first string to translate and the one to flag for human review.
```

**Check:** a fresh install cannot reach any screen without accepting. Reload — it
does not ask again. The footer line is on Home. A coaching card carries the short
disclaimer.

---

## PROMPT 6 — onboarding that earns each question

> Four questions, and each one changes what the app does.

```
After consent, a short staged onboarding. Never ask for anything you will not use.

STAGE 1 — WHO. Optional first name only, so the app can greet them. Say it is optional and say it stays on the device. Never ask for a surname, date of birth, address, or anything else.

STAGE 2 — STAGE. Their CKD stage, if they know it, with "I'm not sure" as a first-class answer that is not penalised. Explain in one line what the stage numbers mean.

STAGE 3 — TARGETS. This is the important one, and it has THREE outcomes, not two:

  a) "My care team gave me targets" → enter potassium, phosphorus and sodium in mg. Caption: "Your care team's targets. KDOQI 2020 sets no fixed mg potassium or phosphorus target — these numbers are yours and your team's."

  b) "Use general education ranges" → 2,500 mg potassium, 900 mg phosphorus, 2,000 mg sodium. Caption: "General patient-education starting ranges — not a prescription. Replace them when your care team gives you numbers."

  c) "Skip for now" → no targets. The app then RECORDS rather than compares: rings show what was eaten with no budget, and every screen that would compare says "No targets set, so this is a record rather than a comparison."

Option (c) must be genuinely usable. An app that is useless without a number the person does not have is an app they close.

STAGE 4 — A RECENT LAB, optional. Potassium in mEq/L, phosphorus in mg/dL, eGFR. Say plainly that it is optional and that the app works without it.

VALIDATE TARGETS AGAINST SANE BOUNDS, and when one is outside them say: "That looks outside the range this app supports. Double-check the number. If your care team really set this target, follow their instruction — this app's limits are technical, not medical."

Every stage is skippable. A progress indicator shows how short it is. The whole thing takes about a minute.
```

**Check:** complete onboarding choosing "skip targets". The app is fully usable and
Home says it is recording rather than comparing. Re-run choosing education ranges:
the caption appears and says it is not a prescription.

---
---

# PART TWO — THE CORE LOOP (7–16)

---

## PROMPT 7 — the food table, and why every row carries its source

> This table is the product's credibility. Build the schema before any data.

```
Create a curated reference table of foods. Each row:

  id, food_name, base_food (what it is regardless of preparation),
  category, aliases (every way somebody might type it),
  serving_text, serving_qty, serving_unit, serving_grams,
  k_low, k_high, p_low, p_high, na_low, na_high   (milligrams per serving),
  additive_risk (contains added phosphate), phos_bio (bioavailability class),
  leachable (boiling meaningfully lowers its potassium),
  swap_pool (may be offered as a lower-nutrient alternative),
  source (the published citation this row's numbers came from),
  verify (which of its nutrients have not yet been re-derived from source)

FOUR NON-NEGOTIABLES:

1. EVERY ROW CARRIES A SOURCE CITATION. A row without one is not imported. This app's entire argument is that its numbers are traceable.

2. VALUES ARE RANGES, NOT POINTS. Low and high, because the honest figures are ranges. Where a published source gives one number, low equals high and that is fine.

3. A MISSING VALUE IS NULL, NOT ZERO. If no published figure exists for a nutrient, that field is null and stays null. Do not fill it with an average, a category default, or a guess.

4. NEVER ACCEPT A GENERATED TABLE. If someone offers you a large food table, check it before importing: are the values irregular the way real data is, or a repeating ladder? Does every row say "1 serving"? Are there gram weights? A fabricated 187-row table was once offered to this project citing "USDA FoodData Central (estimated per serving)" — and FoodData Central publishes MEASURED values, so the word "estimated" beside its name is the contradiction that gives it away.

Start with 50–60 foods covering what people actually eat and the ones that matter clinically: potatoes prepared several ways, spinach raw and cooked, bananas, oranges, tomato products, beans, dairy, cola, processed and cured meats, bread, rice.

Publish the coverage: how many rows lack each nutrient. That count is a feature, not an embarrassment.
```

**Check:** pick any row. It has a source. Pick a nutrient the table does not know:
it is null, not 0. The coverage count is visible somewhere in the app.

---

## PROMPT 8 — matching text to food, deterministically

> No AI in this step. Same input must always produce the same output.

```
Match a food name to table rows. This runs AFTER the AI has split text into items and it must be entirely deterministic.

NORMALISE: lowercase, strip punctuation, collapse whitespace, singularise the last word (with an exception list — "hummus" and "asparagus" are not plurals).

PASS 1 — EXACT ALIAS MATCH.

PASS 2 — SUBSTRING, IN TWO TIERS.
  Tier A: aliases CONTAINED IN the query. This is a specificity signal — "baked potato with skin" contains the long alias, so longest-alias-wins correctly beats "baked potato" and "potato".
  Tier B: aliases that CONTAIN the query. This is a BROAD query: "spinach" hits both cooked and raw. Do NOT rank these by length — whichever variant happens to carry a longer alias would win arbitrarily. Every match survives.

PASS 3 — DISAMBIGUATE BY PREPARATION. If the surviving rows are all the same base food and the query names a preparation ("boiled", "with skin", "canned"), keep the matching variants.

TWO AMBIGUITY RULES:

  · Candidates spanning MORE THAN ONE BASE FOOD → unmatched. Never coin-flip between different foods. Hand it to the wide fallback and label it low confidence.
  · Candidates sharing ONE base food → UNION RANGE, lowest low to highest high. Bare "spinach" reports 84–420 mg rather than silently picking cooked. That width is the honest answer to an underspecified question.
```

**Check:** "spinach" gives a wide union range, not one variant. "baked potato with
skin" beats "potato". A word matching two unrelated foods returns unmatched rather
than guessing.

---

## PROMPT 9 — portions, and the ones nobody stated

> Where most of the real uncertainty lives.

```
Scale a matched row's nutrient range by the portion the person gave.

Convert household units into the row's serving unit. "Glass" is a cup. "Can" is 12 fl oz. These are household conventions, not clinical figures — say so in a comment and keep them in one place.

WHEN NO PORTION WAS STATED, DO NOT ASSUME ONE SERVING. Widen the range instead: the low stays the low of one serving, the high goes to roughly double. An unstated portion is genuinely uncertain and the range should show it. Mark the item so the interface can offer a one-tap portion chooser.

PORTION STEPPERS: every matched item offers 0.5×, 1×, 1.5×, 2×. Tapping one rescales deterministically from the anchor row's own numbers — never from whatever is currently on the item, or repeated taps compound and drift the value.

COOKING METHOD, WHERE IT ACTUALLY MATTERS. For rows marked leachable, offer "Baked or roasted" / "Boiled & drained". Boiling and draining genuinely removes potassium, and this is the rare case where something the person ALREADY DID changes what gets counted.

Apply a reduction that is SMALLER than the published one. Studies of potatoes report roughly half the potassium removed; count less than that. Counting too little potassium is the mistake that matters here, so the estimate stays deliberately cautious and says so: "Counted lower because boiling and draining removes potassium. The estimate stays deliberately cautious — published reductions are larger than the one applied here."

Potassium only. Boiling leaches minerals broadly, but the figures this is built on are potassium figures, and extending them to phosphorus and sodium would be inventing evidence.
```

**Check:** log a food with no portion — the range is visibly wider and a chooser
appears. Tap 2× then 1× then 2× — the value returns to exactly the same number.
Mark a potato boiled: potassium falls, phosphorus and sodium do not.

---

## PROMPT 10 — what the AI is allowed to do, and what it is not

> The central architectural decision. Everything else depends on holding this line.

```
AI has exactly ONE job in this app: turn typed text into a list of foods with portions and preparation modifiers.

IT NEVER PRODUCES A NUTRIENT NUMBER. Not as a fallback, not for an unknown food, not "approximately". Numbers come from the table.

WHY, CONCRETELY: measured accuracy for language models classifying LOW-POTASSIUM foods is around 60%. Sodium estimates run 34–64% mean absolute percentage error. Portion size judged from a photo is 36–37% off and skews toward UNDER-estimating — the direction that quietly flatters the budget. Putting the weakest capability in the most consequential position is the failure this architecture exists to prevent.

THE EXTRACTION CALL returns strictly: a list of items, each with name, portion quantity, portion unit, portion text, modifiers, and whether it is resolvable at all; plus whether clarification is needed and one clarification question.

VALIDATE THE SHAPE BEFORE USING IT. A malformed response is retried once, then falls back. Never render an unvalidated field.

THE API KEY LIVES SERVER-SIDE. Never in the browser, never in client code. The endpoint accepts only the known schema shapes.

WHEN A DISH IS TOO VAGUE TO SPLIT — "leftover casserole", "my usual" — do not guess. Ask ONE question: "What's in the casserole, roughly? List the main ingredients, separated by commas." Offer "Skip — log it without counting" as an equal option, because someone who does not remember should not be stuck.

WHEN THE MODEL IS UNAVAILABLE — offline, no key, rate limited — the app still works. Split the text on ordinary separators, match what you can against the table, and mark the rest uncounted. Never block logging on a network call.

EVERY EXPLANATION THE USER READS IS A FIXED TEMPLATE, filled with numbers from the table. The same meal always produces the same words. No generated prose reaches the screen.
```

**Check:** log a meal with the network disabled. It still logs, prices what it can,
and marks the rest uncounted. No API key appears in any client-side file. The same
meal typed twice produces identical wording.

---

## PROMPT 11 — a missing value must never pass as a zero

> **The most consequential prompt in this document.** The error runs in the
> direction that flatters the budget, which is the worse of the two.

```
Totals sum each item's value. Any sane implementation adds with a zero fallback, because the app must not invent a figure. The bug is that nothing RECORDS having done it.

If a food has no potassium figure, it contributes 0 mg, and the ring reports MORE headroom than the person actually has — with nothing on screen saying so.

This is not an edge case. Real tables have real holes: in this build 13 of 55 rows have no potassium figure, 36 no phosphorus, 35 no sodium, and 22 of the 23 foods the example patients eat have at least one gap. The very first seeded breakfast is egg on white toast, and the egg has no potassium value.

PART 1 — EVERY NUTRIENT CARRIES A FLAG AND A COUNT.

For each of the three nutrients, per meal and rolled up per day, record whether any counted item was missing that nutrient's value, and HOW MANY items were.

Recount from the items rather than trusting a stored flag. A meal saved before this existed must not be able to report itself complete.

PART 2 — THE RING SAYS SO.

A total that is incomplete cannot show a normal green "on track". Add a fourth state — partial — shown when the total is missing something AND is not already over or near the target.

GREEN IS THE ONLY VERDICT WITHHELD, and the asymmetry is the whole point: a missing value can only ADD to a total, never subtract. So "over budget" and "getting close" stay exactly as they are — they are already true and the real number is worse. Only reassurance is withheld.

PART 3 — THE INTERFACE SAYS WHICH, AND WHICH WAY.

A chip: "2 items not priced". A tooltip: "Some foods in today's meals have no published figure for this nutrient in our table, so they are logged but left out of this total. The real number is higher than shown — never lower."

Where a figure is shown at all, phrase it as a floor: "at least 1,240 mg", not "1,240 mg".
```

**Check:** log egg on white toast where egg has no potassium value. The potassium
ring is **not** plain green, a chip says one item is unpriced, and the number reads
as a floor. Now log a meal that is genuinely over target with a missing value — it
still says over budget.

---

## PROMPT 12 — rings that mean something

> The main visual, and the place a false reassurance would do the most damage.

```
Three rings on Home — potassium, phosphorus, sodium — each showing the day's total against that target.

STATES: on track, getting close (from about 80% of target), over budget, and partial (see the previous prompt). Never colour alone: each state has an icon and a word.

A RING WITHOUT A TARGET IS NOT A RING. If no target is set for a nutrient, do not draw a progress arc against an imaginary budget. Show the amount eaten as a plain figure and say the app is recording rather than comparing.

THE ARC IS THE REMAINING BUDGET, not the amount consumed. What people want to know standing in a kitchen is what is left.

Show a range, because the underlying values are ranges. "1,240–1,610 mg of 2,500."

SUPPRESS A RING ENTIRELY WHEN THE CLINICAL PICTURE SAYS TO. If the latest potassium lab is BELOW the typical range, the care team is managing it and this app must not push restriction: replace the potassium ring with "Your care team is managing your potassium. RenalRoute isn't tracking it against a limit right now."

Announce ring changes to screen readers as text, not as a colour change. The ring is decorative; the sentence beside it is the content.

Under reduced motion, rings appear at their value rather than animating to it.
```

**Check:** with no targets set, no progress arcs are drawn and Home says it is
recording. With a low potassium lab entered, the potassium ring is replaced by the
sentence. A screen reader announces the numbers.

---

## PROMPT 13 — the review screen, where the person is still in charge

> Between "analyse" and "save". Nothing is committed until they say so.

```
After analysis, show every item found before anything is saved.

EACH ROW SHOWS:
  · the food name as the person typed it
  · a provenance chip — Matched / Estimated / Not counted
  · the portion
  · the three nutrient ranges, or "Not counted" with a reason
  · a portion stepper if it matched the table
  · the cooking-method choice if the food is leachable
  · its source citation, INLINE and not hidden behind a disclosure

PROVENANCE IS NOT DECORATION. "Matched" means the number came from the table. "Estimated" means a wide fallback range. "Not counted" means the app has nothing and is saying so. Those three are different epistemic claims and the interface must not blur them.

Every row can be removed. Nothing is saved until Save is pressed.

BINDER TIMING appears here, if and only if the person has a phosphate binder on their medicines list: "Phosphate binders work when they are taken WITH food, not before or after." Shown at the only moment somebody can act on it. The same sentence every time — which is precisely why it is safe to show.

If nothing could be identified at all, say so and offer a way forward rather than an empty screen.

THE PRIMARY ACTION FOLLOWS THE CONTENT IT ACTS ON. Save sits directly under the item list. Alternatives and fine print go below it, never between.
```

**Check:** log three foods where one is unknown. Three rows, three different chips,
and the unknown one says why. Remove one and save: two are stored. A user with a
binder sees the timing note; one without does not.

---

## PROMPT 14 — saving, the day, and one moment of explanation

> The loop closes here.

```
Saving writes the meal against today and returns to Home with the rings updated.

Confirm the save only if it actually happened (see prompt 4).

THE DAY: Home shows today's meals in order, each with its totals and its provenance, and each opening to a detail view.

THE FIRST SAVE GETS ONE EXTRA BEAT, ONCE, AND NEVER AGAIN.

It is the only moment somebody learns what this app actually does. A ripple shows that something happened; it does not say what. So after the first meal only, show a card:

  That's the whole loop
  You typed words. RenalRoute pulled out the foods and their portions, then priced them against published figures — not from a guess. The numbers come as ranges because the honest ones do.
  [the real remaining figure from the meal they just logged, not an example]
  Anything it could not identify is logged and marked "Not counted" rather than invented. You will only see this note once.

A CARD, NOT A MODAL. Interrupting somebody in the second after their first success is the wrong instinct, and this is something to read rather than acknowledge. Congratulate nobody. Store the flag so a reinstall is the only way back to it.

EMPTY STATES DO WORK. Before anything is logged, Home shows the rings as a full day ahead and one true, specific fact from a fixed set — for example: "A half-cup of cooked spinach packs about five times the leaves — and five times the potassium — of a half-cup raw (420 vs 84 mg)." Never a shrug, never an illustration with no information in it.
```

**Check:** log the first meal ever. The card appears with the real remaining number.
Log a second: it does not. Reload Home: it does not come back.

---

## PROMPT 15 — a meal you can open, fix, delete and undo

> People mistype. The app must not punish it.

```
Tapping a logged meal opens its detail: the original text, every item with its provenance and source, the meal totals with any partial flags, and the coaching cards it generated.

EDIT re-opens the meal in the review flow with its items intact. Changing a portion or removing an item recalculates deterministically — no new AI call. Re-analysing the text is a separate, explicit action.

DELETE ASKS FIRST, naming what will go: "Delete this meal? Three items, 620–840 mg potassium." Then OFFER AN UNDO for a few seconds. Somebody who deleted the wrong meal should not have to retype it.

Restoring must put back the exact record, not a re-analysis of it.

"LOG THIS AGAIN" copies a previous meal to today. Common, and it costs no AI call.

Every one of these paths checks that the write landed before confirming it.
```

**Check:** open a meal, change a portion, save — the day's totals change correctly.
Delete a meal and undo it — it returns identical, including its provenance chips.

---

## PROMPT 16 — the manual picker, for when typing is the wrong tool

> The offline path, the low-literacy path, and the fastest path for a repeat meal.

```
Offer a way to log a meal by choosing from the table instead of typing.

Search the same aliases the matcher uses. Results show the food, its serving, its three ranges, and a low-potassium badge where it applies.

THE LOW-POTASSIUM BADGE MEANS ONE SPECIFIC THING: 150 mg of potassium or less per serving, which is the American Kidney Fund's own cut-off for calling a serving low potassium. Say so on the badge's explanation, and say that it describes THAT SERVING, not the whole day.

A FOOD WITH NO POTASSIUM VALUE GETS NO BADGE. Absence of data must never render as reassurance. This rule matters more than it looks: without it, the foods the app knows least about would be the ones it appears to recommend.

Selected foods accumulate into a meal with a quantity multiplier each, then go to the same review screen. Everything downstream is identical to the typed path.

This path uses NO AI at all, so it works offline and it is the fallback whenever the model is unavailable.

Empty search shows the most-logged foods rather than nothing.
```

**Check:** with the network off, build and save a three-food meal entirely through
the picker. A food with a null potassium value shows no badge.

---

---
---

# PART THREE — CLINICAL LOGIC (17–24)

Every threshold in this part is quoted from a published guideline, not authored
here. If you change a number, you are no longer building this app.

---

## PROMPT 17 — potassium bands, and the one that stops the app talking

> Clinical logic. Every threshold here is quoted, not invented.

```
When a potassium lab result is entered, it sets a guidance mode. The bands, in mEq/L:

  below 3.5   low
  3.5–5.0     normal
  5.1–5.5     caution
  5.6–5.9     restricted
  6.0 and up  paused

WHAT EACH MODE CHANGES:

LOW — the care team is managing it. Suppress the potassium ring entirely and show no restriction-toned guidance at all: "Your latest potassium result is below the typical range (3.5–5.0). A low result is not something this app can advise on — please don't restrict further on your own, and discuss it with your care team."

NORMAL — fruits, vegetables, beans and whole grains are NOT restricted by default. The app speaks up only when the daily budget arithmetic says so. Say that the range on their own lab report is the one that counts.

CAUTION — earlier heads-up on higher-potassium meals. State it is educational guidance, not a diagnosis, and suggest mentioning the result to their care team.

RESTRICTED — proactive potassium education, and NO SWAP SUGGESTIONS. At this level the care team's plan should lead, not an app's workaround.

PAUSED — this is the important one. At 6.0 and above, STOP. All coaching off. Show an urgent banner: "A potassium level of 6.0 mEq/L can be dangerous. RenalRoute cannot give food guidance at this level and has paused all coaching. Please contact your kidney care team or seek medical care now."

Logging still works in paused mode. Taking away someone's ability to record what they ate helps nobody; taking away the app's opinions is the whole point.

A visible chip on the labs screen always states the current mode.

Reject implausible values rather than storing them: "That value looks unlikely for potassium (mEq/L). Please double-check your lab report — this entry wasn't saved. If the value really is on your report, contact your care team rather than this app."
```

**Check:** enter 6.1. All coaching stops, the banner appears, and logging still
works. Enter 3.2: the ring is suppressed and no restriction language appears
anywhere. Enter 99: it is refused and not saved.

---

## PROMPT 18 — phosphorus, and the distinction that actually matters

> The teaching point most patients are never told.

```
Phosphorus bands, in mg/dL: below 2.5 is below range, 2.5–4.5 is typical, above 4.5 is caution.

BELOW RANGE — worth mentioning to the care team. Add the unit warning: "If your report shows phosphorus in mmol/L — common outside the US — convert it or check with your care team; RenalRoute expects mg/dL."

NEVER CONVERT UNITS SILENTLY. Phosphorus in mmol/L differs from mg/dL by roughly 3.2×, and converting somebody's report invents a number they can no longer check against the page in their hand. Report the unit, refuse the value, say why.

TYPICAL — focus phosphorus guidance on ADDITIVE sources, not whole foods.

CAUTION — extra attention to phosphate additives in colas, deli and cured meats, processed cheese and packaged baked goods.

THE DISTINCTION THIS APP EXISTS TO TEACH:

  Additive phosphate is absorbed almost completely — over 90%.
  Phosphorus naturally bound in PLANT foods is absorbed at under 40%.
  In animal foods, roughly 40–60%.

So a packaged food listing 200 mg of additive phosphorus can deliver more real phosphate than a bean dish listing 350 mg. A phosphorus figure without its source is close to meaningless, which is why the table carries a bioavailability class per row.

One more reason it is easy to miss: in a survey of dialysis patients, 93% knew cola contains sugar — only 25% knew it contains phosphate.

A visible chip states the current phosphorus mode, same as potassium.
```

**Check:** enter phosphorus in mmol/L. It is refused with the unit explanation, not
converted. Log a cola: the coaching mentions additive phosphate and absorption, not
just a milligram figure.

---

## PROMPT 19 — eGFR, shown and never acted on

> A hard boundary. Getting this wrong turns the app into something it says it is not.

```
Accept an eGFR value and show which KDIGO category it falls in — G1 ≥90, G2 60–89, G3a 45–59, G3b 30–44, G4 15–29, G5 below 15.

IT CHANGES NOTHING. Not the targets, not the guidance mode, not what gets flagged. State that plainly on screen:

"The eGFR you entered (32) falls in the range labeled G3b (30–44 mL/min/1.73 m²) on the KDIGO scale your care team uses. This GFR category is shown for education only — it never changes your targets or guidance mode, and it isn't a diagnosis. Your targets come from your care team."

DO NOT BUILD ANY OF THESE, and each refusal has a reason:

· A KIDNEY FAILURE RISK EQUATION. It outputs a probability of needing dialysis. That is the most consequential score in nephrology, it needs a urine albumin-to-creatinine ratio this app does not collect, and shipping it contradicts the promise on the refusals screen that this app will not give you a health score. It would move the product from educational wellness into clinical risk prediction — a medical-device function.
· eGFR TRAJECTORY OR PROGRESSION FORECASTING.
· ANY GUIDANCE THAT VARIES BY CKD STAGE beyond what the targets already do.
· ANY EXPLANATION OF WHY AN eGFR MIGHT HAVE FALLEN. Whether a drop is expected from a medicine or is something urgent is exactly the call that needs a nephrologist, and being wrong in the reassuring direction means somebody does not phone when they should.
```

**Check:** enter an eGFR of 22. The category is shown, the targets are unchanged,
the guidance mode is unchanged, and nowhere does a risk percentage or a trend
projection appear.

---

## PROMPT 20 — labs go stale, and not symmetrically

> A subtle rule that gets the direction right.

```
A lab result older than 90 days is stale. What "stale" does depends on WHICH result, and the asymmetry is deliberate.

A NORMAL RESULT DECAYS. If the last potassium was in range but is four months old, stop treating it as current evidence that things are fine. Fall back to general guidance and say why.

AN ABNORMAL RESULT DOES NOT DECAY THE SAME WAY. A caution or restricted reading does not become reassuring because time passed. Keep the caution and ask for a newer number.

Rule of thumb: staleness may REMOVE reassurance. It may never CREATE it.

The nudge is a fact about a date, never a judgement about somebody's care: "Your last potassium result is more than 90 days old. Lab values change — if you've had newer labs, add the result so guidance stays in step with you."

Never say "overdue". They may have a draw booked for Thursday.

Show the age in plain words, and be vague past a month: "today", "a day", "11 days", "6 weeks", "4 months", "over a year". "127 days" is precision this app has no use for and it reads like a reprimand.
```

**Check:** back-date a normal potassium result 120 days. Guidance falls back to
general and says why. Back-date a caution result the same amount: it stays caution.

---

## PROMPT 21 — coaching cards: templates, thresholds, and nothing else

> Where the app finally says something. It must be the same sentence every time.

```
After a meal is analysed, generate coaching cards from FIXED TEMPLATES filled with numbers from the table. No generated prose. The same meal always produces the same words.

CARD TYPES, each with its own trigger:

BIG NUMBER — a single food is a large share of the day's potassium budget. Say the milligrams, the percentage, and what is left. In normal mode, frame it as planning information and note it is natural potassium from a whole food, absorbed less completely than additive potassium — "so this is planning info, not a warning." In caution mode, say the last result was slightly above range and it is worth planning around. In paused mode, say only that this is a potassium-dense food and to follow the care team.

ADDITIVE PHOSPHATE — the food carries added phosphate. Lead with the counter-intuitive part: "Small number, almost fully absorbed." Then the absorption figures from prompt 18.

"PHOS" ON A LABEL — an ingredient list contains a phosphate additive. Give the rule of thumb a dietitian would recognise: any ingredient containing "PHOS" is added phosphate.

ADDED POTASSIUM — an ingredient list contains a potassium additive. Two tiers: a meaningful amount that never appears on the nutrition label's potassium line, versus a preservative where the amount is usually small. Do not alarm about the second.

SALT SUBSTITUTE — see prompt 22. This one is a documented hazard.

SODIUM RANGE — sodium is high and hard to pin down in this food category. Say the range is wide ON PURPOSE and that the pattern (canned, cured, restaurant) matters more than the digits.

EVERY CARD CARRIES: "Educational estimate — confirm with your care team."

CARDS ARE CAPPED. Two or three at most per meal. A screen of warnings is a screen nobody reads, and the most important one gets buried.
```

**Check:** log a baked potato with skin on a 2,000 mg potassium target — one big
number card with a real percentage. Log the same meal twice: identical wording. No
meal produces more than three cards.

---

## PROMPT 22 — salt substitutes, and the swap engine

> The first half is a documented hazard. Do not soften it.

```
PART 1 — SALT SUBSTITUTES.

Detect mentions of salt substitute, "lo-salt", "no-salt", "lite salt" or potassium chloride in the meal text or an ingredient list. When the potassium result is above range, show:

"A note on salt substitutes. Many 'low sodium' salts replace sodium with potassium chloride. With a potassium result above range, this matters: UK guidance (NICE) advises people with kidney disease not to use salt substitutes at all. In one published case, an older adult with kidney disease reached a dangerous potassium level of 7.5 mEq/L after a potassium-based salt substitute was added to their meals. Check labels for 'potassium chloride' — and ask your care team."

Do not soften it and do not bury it. It is one of the few places where an ordinary supermarket product is genuinely dangerous for this specific group.

PART 2 — SWAPS, BY RULE AND NEVER BY AI.

When a food is flagged for a nutrient, offer a lower alternative FROM THE TABLE, chosen by rule:

  · same category as the flagged food, so the suggestion is plausible food
  · marked as eligible for the swap pool
  · genuinely lower in the flagged nutrient
  · and it must FIT what is actually left in today's budget

Show both numbers so the comparison is checkable: "Instead of a baked potato with skin, try white rice — about 55 mg potassium per 1/2 cup, versus 926 mg."

WHEN NOTHING FITS, SAY SO RATHER THAN SUGGESTING SOMETHING WORSE: "No swap fits today's remaining potassium budget. Tomorrow is a fresh start — and your care team can help you plan for favorite foods."

NO SWAPS AT ALL IN RESTRICTED OR PAUSED MODE. At those levels the care team's plan leads.

WHERE THE TABLE HAS TOO FEW LOW-POTASSIUM MEMBERS IN A CATEGORY, show no swap line for it at all — and say in the coverage panel that this is a gap in our data, not a verdict that no better option exists.
```

**Check:** log "chicken with lo-salt" against a high potassium result — the warning
appears with the 7.5 figure intact. Log a high-potassium food when almost nothing
is left: it says no swap fits rather than offering one.

---

## PROMPT 23 — medicines, and the single sentence about them

> A deliberately tiny feature with a hard boundary around it.

```
Let someone list their medicines: a name and an optional note, nothing more. No doses, no schedules, no reminders.

Flag phosphate binders so the review screen can show the binder-timing note (prompt 13).

THE ONLY MEDICATION GUIDANCE THIS APP EVER GIVES IS ONE SENTENCE: "Phosphate binders work when they are taken WITH food, not before or after." The same sentence for every binder, which is precisely why it is safe.

BESIDE IT, THE BOUNDARY, STATED: "Follow the timing your prescriber gave you. RenalRoute does not manage medications — it stores what you type so you can show someone, and it never checks doses, interactions, or timing beyond this note."

DO NOT BUILD: dose tracking, adherence tracking, reminders, interaction checking, or any guidance about a specific drug. In particular, do not explain what any blood-pressure or diabetes medicine does to eGFR or potassium. Whether a change is expected or urgent is a nephrologist's call.

ONE EDUCATION CARD IS ALLOWED, and it is general: "Your blood potassium depends on more than food. Several common blood-pressure medicines, along with hydration, other medicines, and other health factors, can raise it — which is part of why targets are personal, and why green rings here don't guarantee normal labs. If you take phosphate or potassium binders, follow your prescriber's instructions. RenalRoute does not manage medications."

Medicines appear on the health passport, because that is the thing somebody hands to a clinician.
```

**Check:** add a binder. It appears on the review screen with the timing note and
the boundary sentence. No screen anywhere shows a dose, a reminder or a drug-specific
claim.

---

## PROMPT 24 — the three refusals, on their own page

> The most unusual page in the app, and the one that earns the rest.

```
A page titled around "What RenalRoute won't do", reachable from the hub and shown once during onboarding.

Three refusals, each with its reason. The reason is the point — a list of limitations with no explanation reads as an apology, and this is not an apology.

1. IT WON'T GIVE YOU A HEALTH SCORE.
   A single number implies the app can weigh your kidney health. It cannot. It sees what you type about food and nothing about your body, your medicines, or how you feel.

2. IT WON'T TELL YOU WHAT TO EAT.
   It prices what you tell it and shows what is left. Which foods are right for you depends on your labs, your medicines, your appetite and your life — which is what your dietitian is for.

3. IT WON'T PRETEND TO BE CERTAIN.
   Every number is a range. Where the table has no figure, the app says so instead of estimating. A day marked partial is a day it could not fully add up.

Then, plainly: what it DOES do. It reads meals, prices them against published values, shows what is left against targets you or your team set, and produces something you can print and take to a clinic.

This page is not decoration. Several later decisions depend on it being true — no risk equation, no eGFR forecast, no medication advice — so anything that contradicts it is a bug in the product, not a missing feature.
```

**Check:** the page names three refusals with reasons and appears in onboarding.
Nothing anywhere else in the app contradicts any of them.

---

---
---

# PART FOUR — HONESTY MADE VISIBLE (25–29)

The app already refuses to guess. This part is where those refusals become
something a user can actually see and check.

---

## PROMPT 25 — where every number came from

> Nutrition apps almost never publish this. That is exactly why it is worth publishing.

```
A references screen listing every position this app takes and the source behind it: KDOQI 2020, KDIGO, the American Kidney Fund's low-potassium threshold, NICE guidance on salt substitutes, the absorption figures, the boiling studies, the dialysis-patient survey.

Each entry: what it is used for in this app, and whether this team has re-derived it from source or transcribed it from a pack.

MARK THE UNVERIFIED ONES AND SAY HOW MANY: "14 of these are marked unverified: they are transcribed from a source pack and have not yet been re-derived by this team. Saying so is the point — an app that lists only what flatters it is not a reference, it is a brochure."

PER-FOOD PROVENANCE TOO. Opening any food in a logged meal shows its citation and which of ITS nutrients are still unverified: "Not yet re-checked against USDA FoodData Central: phosphorus, sodium. Those figures are the ones most likely to move, and they are shown as ranges for that reason."

A number you cannot trace is a number you cannot check.
```

**Check:** the references screen states how many entries are unverified. Open any
food in a meal: it names its source and its unverified nutrients.

---

## PROMPT 26 — the coverage panel: publishing the holes

> The companion to prompt 11. One records the gaps; this one owns them.

```
A panel in Settings that publishes what the food table does NOT know.

  · how many rows lack a potassium, phosphorus or sodium figure
  · which food categories are too thin for swaps to be offered
  · that every value is awaiting re-derivation against USDA FoodData Central

The framing:

"RenalRoute works from a curated table of published food values. It is deliberately small, and it has holes. Those holes are listed here rather than hidden, because a number you cannot see the limits of is worth less than one you can."

"Where a value is missing, the food is still logged and still counted for the nutrients we do have — that nutrient is simply left out of the total, and the day is marked as partial rather than quietly summing as though nothing were absent."

These counts must be COMPUTED FROM THE TABLE, never typed by hand. A hand-maintained count goes stale the first time somebody adds a row, and then the app is lying about its own honesty. Anything derived is safe; anything transcribed rots.
```

**Check:** the counts match the table. Add a row with a missing phosphorus value —
the count goes up without anyone editing the panel.

---

## PROMPT 27 — the food list, browsable

> So "is cabbage low in potassium?" does not require starting a meal you are not eating.

```
A screen listing every food in the table, reached from the hub. Each row: the food, its serving, the three ranges, the low-potassium badge where it applies, and its source.

Searchable, and sortable by name or by any of the three nutrients.

TWO HONESTY RULES, and they are why this screen is harder than it looks:

RULE 1 — SORTING BY A NUTRIENT MUST NEVER RANK AN UNPRICED FOOD.
A food with no potassium figure is not "0 mg". Sorting with a zero fallback puts every unknown food at the TOP of the low-potassium list — the most dangerous possible ordering, because it recommends by position exactly the foods the app knows least about. Sorted views put unpriced rows in a named group at the END: "14 foods we cannot rank for potassium", with a line saying they are not zero, we simply do not know.

RULE 2 — NO BADGE WITHOUT DATA. Same rule as the picker, carried over verbatim.

Add a filter for "only foods we can price for the sorted nutrient", so somebody hunting low-potassium options is not shown rows the table cannot answer for.
```

**Check:** sort by potassium. The first row is a genuinely low-potassium food, not a
blank one. The unpriced group is at the bottom, named, with its explanation.

---

## PROMPT 28 — the label checker, and the PHOS rule

> The single most useful thing this app teaches, and it needs no numbers at all.

```
A screen where somebody pastes an ingredient list. The app names what it recognises.

DETECT AND EXPLAIN:
  · phosphate additives — anything containing "PHOS"
  · added potassium — potassium chloride, potassium lactate, potassium sorbate
  · salt substitutes

THE RULE, stated on the screen because it works without the app:

"Any ingredient containing 'PHOS' is added phosphate, and added phosphate is absorbed almost completely — over 90%, against under 40% from plant foods. It rarely appears on the nutrition panel, so the ingredient list is the only place it shows. The same goes for potassium: two words where one of them is potassium is worth a second look."

WHEN NOTHING IS FOUND, THE WORDING MATTERS ENORMOUSLY:

"Nothing flagged in what you pasted. That means none of the phosphate additives, added-potassium ingredients, or salt substitutes RenalRoute knows by name appeared in this list. It does not mean the food has none — additive names change, and some ingredients are grouped under general terms. When in doubt, ask your care team."

The difference between "no additives found" and "we found none of the ones we know" is the difference between a false reassurance and an honest one.

Also mention that baking powder alone carries over 450 mg of phosphorus per teaspoon — a genuine surprise to most people.
```

**Check:** paste a cola ingredient list — phosphoric acid is named and explained.
Paste plain flour and water — the "none of the ones we know" wording appears, not
"no additives".

---

## PROMPT 29 — barcode lookup, and what a miss means

> Optional. Only build it if you have somewhere to put a proxy.

```
Let someone enter or scan a barcode and pull the ingredient list into the label checker.

Use an open food database. THE REQUEST MUST GO THROUGH YOUR OWN BACKEND, not from the browser to a foreign origin.

VALIDATE THE INPUT: 8 to 14 digits. "That doesn't look like a barcode — it should be 8 to 14 digits." A typing mistake marks the FIELD invalid so the fault attaches to the box that holds it. A lookup that simply found nothing is not the user's mistake and must never mark the field.

WHEN THE BARCODE IS NOT IN THE DATABASE: "That barcode isn't in the open database. That tells you nothing about the food — plenty of products simply are not listed. Type the ingredients in below instead."

That sentence is the whole feature working correctly. A miss is a fact about the database, not about the food, and implying otherwise would be the same false reassurance as prompt 28.

WHEN IT IS LISTED BUT HAS NO INGREDIENTS: say exactly that and fall back to typing.
WHEN OFFLINE: "You're offline, so the lookup can't run — but typing the ingredients in below still works."

If camera scanning is available, use it; if not, hide the control rather than showing one that does nothing. Release the camera when leaving the screen — a camera light that stays on after you navigate away is alarming in a health app.
```

**Check:** enter 12345 — the field is marked invalid. Enter a valid but unlisted
barcode — the field is NOT marked invalid and the message says it tells you nothing
about the food. Navigate away mid-scan: the camera light goes out.

---

---
---

# PART FIVE — BEYOND THE MEAL (30–36)

The clinic-visit half of the product: what you carry into the room, and what the
record shows over time.

---

## PROMPT 30 — vitals, recorded and never interpreted

> The framing is the entire safety argument.

```
Let someone record weight, blood pressure and symptoms.

THE APP WRITES THESE DOWN AND HANDS THEM OVER. IT DOES NOT INTERPRET THEM.

No categories, no colours, no arrows, no "high"/"normal", no trend judgement. State why:

"RenalRoute writes these down and hands them over — it does not interpret them. There are no categories, no colours and no arrows here, because what a reading means depends on your targets, your medicines and what your team is treating for. All of it appears on your health passport and in your export."

SYMPTOMS as a fixed set of taps rather than free text: swelling in legs, ankles or feet; more tired than usual; short of breath; muscle cramps; itching; poor appetite; nausea; sleeping badly. Plus an optional note.

These are the things a kidney clinic asks about and almost nobody has ready. Recording them is the value; scoring them would be the overreach.

Show history as a simple list with dates. Each entry removable.
```

**Check:** record a blood pressure of 180/110. The app stores it and says nothing
about it. It appears on the passport.

---

## PROMPT 31 — appointments, and the questions people forget

> A small feature that does one genuinely useful thing.

```
Let someone save an upcoming appointment: a date, who it is with, and — the actual point — the questions they want to ask.

BE HONEST ABOUT WHAT THIS IS NOT: "RenalRoute does not send reminders — a reminder an app promises and fails to deliver, for a clinic appointment, is worse than none. What it does is carry your questions onto your health passport, so the card you take into the room already has them on it."

Prompt for the questions specifically: "The thing people most often forget. Write it down when you think of it, not on the way there."

Show the next appointment as plain words — "Today", "Tomorrow", "In 12 days" — with who it is with.

An appointment you have not booked is not an out-of-date record. It is a fact about somebody's life. Report "None on file" and suggest nothing.
```

**Check:** save an appointment with two questions. Both appear on the passport. With
none saved, the app says "None on file" and does not nag.

---

## PROMPT 32 — the health passport

> The artefact somebody physically carries into a room.

```
A single page that gathers everything a clinician would ask for: name if given, CKD stage, current targets and where they came from, the most recent labs with dates, recent weight and blood pressure, symptoms noted, current medicines, and the questions saved for the next appointment.

DESIGNED FOR PAPER FIRST. A print stylesheet that produces something clean on A4 or Letter: no navigation, no buttons, no dark backgrounds burning through a printer.

THE PRINTED HEADER CARRIES THREE THINGS, and without them a page of milligrams is something a clinician has to interrogate rather than read: whose record it is, the date it was produced, and which targets the figures were measured against.

The disclaimer goes on the printed page too: "Estimates for education only — not medical advice. Ranges, not exact figures. Follow your care team's targets."

Also offer it as a share or a download, using whatever the platform provides, with a plain-text fallback that works everywhere.
```

**Check:** print to PDF. One clean page, no navigation, with the name, the date, the
targets and the disclaimer. Nothing is cut off.

---

## PROMPT 33 — the Kitchen: what dinner can actually be

> Turns the app from a ledger into something that helps before the meal.

```
A Kitchen tab with a small set of recipes, each priced against the SAME reference table the rest of the app uses, by the same code that prices a typed meal.

"Every number in this recipe comes from the same reference table the rest of the app uses, priced by the same code as a meal you type in. Nothing here was entered by hand."

WHAT FITS TODAY: given what is left in the day's budget, show which recipes still fit. Not "recommended" — fits, arithmetically, and the person can check it.

A THREE-DAY PLAN built against FULL daily targets, not today's leftovers. Greedy rather than optimal on purpose: each choice is "does the next thing still fit", which is a rule somebody can verify by adding up. An optimiser produces a better plan that nobody can check.

WHEN NOT ENOUGH RECIPES FIT: "Not enough recipes fit your targets to fill this day. That is a limit of our small recipe set, not a verdict on your targets."

THE CAVEAT, always: "A suggestion, never a prescription. Portion sizes, cooking method and your own appetite all move these numbers, and your care team's plan outranks anything here."
```

**Check:** with most of the day's potassium used, the "fits today" list is shorter
than the full list. A recipe's potassium figure matches what you get by logging its
ingredients individually.

---

## PROMPT 34 — trends, and the patterns worth mentioning

> Only where there is enough data to say anything.

```
PART 1 — TRENDS. Simple charts of daily totals per nutrient over the last two to four weeks, with the target as a line. No prediction, no fitted trend, no projection.

Days with incomplete totals are MARKED as incomplete on the chart. An unmarked partial day makes a downward trend look like progress.

PART 2 — PATTERNS. After enough days are logged, surface up to three observations.

REFUSE TO REPORT ANYTHING UNDER A MINIMUM. Set a floor for days logged, a floor for group size, and a floor for the difference before it is worth mentioning. Below those, say: "Not enough logged yet to see a pattern — keep going and this fills in."

An app that finds a pattern in four days of data is making things up, and it will be believed.

Patterns worth reporting: a weekday that runs consistently higher, a meal slot that carries most of the sodium, a share of days marked partial that is high enough to undermine the other numbers.

EVERY PATTERN IS A DETERMINISTIC TEMPLATE. No AI in this path.

Phrase each as an observation, never an instruction. "Sundays run about 40% higher on sodium than your other days" — not "try to eat less sodium on Sundays."
```

**Check:** with three days logged, the app says there is not enough yet. With
fourteen, at most three patterns appear, each phrased as an observation.

---

## PROMPT 35 — what is getting old, without nagging

> Report the record, never grade the person. This prompt is that rule's hardest case.

```
A checklist showing the age of what the app holds: meals logged recently, the most recent lab, weight and blood pressure, the passport, the next appointment.

EVERY WORD IS CHOSEN AGAINST ONE RULE: report the record, never grade the person.

"Getting old" is a fact about a date. "Overdue" would be a claim about somebody's care that this app cannot support — they may have a lab booked for Thursday.

An appointment not yet booked is NEVER stale. It is a fact about their life, reported without suggesting anything.

THE SUMMARY LINE IS A COUNT OF FACTS, NOT A GRADE. "Two things here are getting old." Deliberately not "3 of 5" — a fraction is a score wearing a different hat, and the denominator implies five things somebody was supposed to have done.

WHEN NOTHING IS STALE, SAY SO AND STOP: "Nothing here is going stale." Do not invent something to suggest.

The footer: "Dates from your own record — not a to-do list, and not a schedule. How often you need labs or readings is your care team's call, not this app's."
```

**Check:** with everything current, the screen says nothing is going stale and
suggests nothing. Nowhere does a fraction or a percentage appear.

---

## PROMPT 36 — the Gaps screen: three kinds of "we don't know"

> Makes three separate refusals legible from one place.

```
The app refuses to guess in three places, and every one is invisible from anywhere else: a food it cannot price turns a ring amber with no explanation of which food; a week that runs over every Sunday is visible only day by day; a four-month-old lab stops being used and says so on a screen nobody opened.

Same question, same person: WHAT DOESN'T THIS APP KNOW ABOUT ME, AND DOES IT MATTER?

THE ORDER IS AN ARGUMENT, NOT A LAYOUT CHOICE.

1. NUMBERS WE DON'T HAVE — what WE are missing.
2. DAYS AGAINST YOUR TARGETS — what the food shows.
3. RECORDS GETTING OLD — what the record is missing.

Leading with somebody's overdue lab while sitting on dozens of blank nutrient values of our own would be the wrong way round, and they would be right to notice.

SECTION 1 weights foods by HOW OFTEN THIS PERSON EATS THEM. A list of every blank in the table is a chore nobody reads; the four in their breakfast every day are worth knowing. Open with the sentence that explains the amber ring: "7 of your last 7 logged days are missing a phosphorus figure somewhere." Close by owning it: the table is small, and we would rather leave a blank than print a number nobody measured.

SECTION 2 reports ONLY where a target exists, over the same window the pattern detector uses — two surfaces summarising "recently" over different periods will eventually disagree in front of somebody.

A PARTIAL DAY IS COUNTED SEPARATELY AND NEVER AS "UNDER". Three counts, not two: N over, N within, N we could not total. Folding partial days into "under" turns a data gap into false reassurance at the exact moment somebody is looking for a pattern.

SECTION 3 reuses whatever already decides staleness. Do not write a second opinion.

NOTHING ON THIS SCREEN IS RED, and there is no score anywhere on it.
```

**Check:** foods are ordered by how often they were eaten. A day with a missing
figure appears in "could not total", not "within". Nothing is red.

---

---
---

# PART SIX — SURVIVING REAL PEOPLE (37–42)

Everything up to here assumes the input is reasonable. It is not. This part is
what happens when somebody types the way people actually type.

---

## PROMPT 37 — spelling: suggest, never correct

> What most real typing looks like.

```
Matching is exact-then-substring, so "chiken", "potatoe", "spinnach", "avacado", "yoghurt" and "cabage" all match NOTHING. The person sees "not counted" with no idea a one-letter fix would have worked.

Add a near-miss pass that runs ONLY after exact and substring both fail.

IT NEVER RESOLVES ANYTHING. It returns candidates a human confirms, and that restraint is the whole design. Edit distance measures keyboard accidents; it knows nothing about food. BEET and BEEF are one edit apart and four times apart in potassium. Silently correcting a spelling into the wrong food produces a confident, wrong number — the exact failure this app exists to prevent.

FOUR GUARDS:

1. BUDGET BY LENGTH, on the shorter word. Four letters or fewer get ZERO edits (milk/silk, rice/ice, corn/cord). Five to seven get one. Eight or more get two.
2. THE FIRST LETTER MUST MATCH. Typos land in the middle and the end far more often than on the first keystroke, and this removes most cross-food collisions outright.
3. LENGTHS WITHIN TWO.
4. A PREPARATION WORD MUST NEVER CARRY A SUGGESTION. Score on the best matching WORD, but exclude cooking and quantity words from being that word. The first version of this offered SALMON at a perfect score for "grilled chiken breast", because "grilled" is spelled correctly and appears in "grilled salmon" — a distance of zero, resting on the one word carrying no information about which food it was.

At most four suggestions, one per base food.

IN THE INTERFACE: only on a row that could not be priced, phrased as a question — "Did you mean one of these?" — each candidate a real button naming the food. Tapping one replaces the row and keeps the portion the person typed. Never show suggestions beside a row that matched; offering alternatives next to a confident number implies the number is in doubt.
```

**Check:** "chiken" suggests chicken. "beet" suggests no beef. "asdfghjkl" suggests
nothing. "grilled chiken breast" suggests chicken, not salmon.

---

## PROMPT 38 — more than one food, and no dead ends

> The other half of surviving real input.

```
PART 1 — THE BOX HOLDS 500 CHARACTERS AND ONLY THE FIRST FOOD SURVIVES.

The fallback path takes the whole string, truncates it and treats it as ONE food. Everything after the first comma is discarded invisibly.

Split on commas, semicolons, newlines, bullets, "+", "&", and the word "and". DO NOT split on "with" — it almost always attaches a preparation to the food before it.

Keep a written quantity where there is one and NEVER invent one. Strip the container: "a glass of milk" is milk.

Cap at 20 foods, and SAY SO when you do: "That was a long list — we took the first 20 foods and left 6 out. Log the rest as a second meal so nothing goes missing." Silently dropping food from a total is the same class of failure as counting a missing nutrient as zero.

PART 2 — WHERE THE APP CANNOT HELP, IT OFFERS SOMEWHERE TO GO.

A row that matched nothing and has no near misses:

  Sorry — we don't recognise "brocoli", and we'd rather say so than guess at it.
  It may be spelled differently here, or it may not be in our food list yet.
  You can still keep it in the meal — it will show as not counted, and the day is marked partial so nothing is quietly under-reported.

Plus two working buttons: "Browse the food list" and "Check its label instead".

Apologise; never blame the typing. Never use the words invalid, wrong or error. Admit the real limit — the table is small — rather than implying they spelled it badly. A dead end is where somebody puts the phone down.
```

**Check:** "grilled chicken, baked potato with skin, and a glass of milk" → three
rows, the third named `milk`. Paste 40 foods → 20 rows and a message naming how
many were left out.

---

## PROMPT 39 — the photo path, and why it widens the range

> Optional. Defensible only because of how it reports its own uncertainty.

```
Let someone photograph a meal. The camera NAMES the foods; the table PRICES them.

THE MODEL NEVER ESTIMATES A NUTRIENT FROM A PICTURE. Measured portion-weight error from food photos runs 36–37% and skews toward UNDER-estimating — the direction that quietly flatters the budget.

So the photo produces foods and a coarse portion judgement — small, average, large — and the resulting range is DELIBERATELY WIDER than a typed portion would produce, and LEANS HIGH rather than low.

SAY ALL OF THAT ON THE ROW: "Read from the photo as an average serving. The range is wider than usual because portion size judged from a picture is rough. It also leans high rather than low, since photos tend to under-read portions. Tap a portion below and it narrows to your number."

That sentence is the entire reason estimating from a picture is defensible: the width is visible, its cause is named, and the fix is one tap away.

CONFIRMING A PORTION RETIRES THE PHOTO'S GUESS. The band existed only because nobody had said how much; the person who ate it just did, and their answer is better evidence than a picture. No stepper option shows as selected while the band is live — showing one would assert a precision the photo does not have.

STORE A LABEL, NEVER THE IMAGE. The picture leaves the device to be identified and is never written to a record.

WHEN IT CANNOT READ THE PHOTO: "We couldn't make out the food in that photo. Try again in better light, or type what you ate instead."
```

**Check:** photograph a meal. The range is visibly wider than typing the same food,
the explanation names why, and no stepper is pre-selected. Tap a portion: the range
narrows and the note disappears. No image is stored.

---

## PROMPT 40 — three defects that only appear when you misuse the app

> Two crashes and a race. Found by a test pass that deliberately types the wrong things.

```
DEFECT 1 — A HANDLER THAT FIRES BEFORE ITS FIELDS EXIST CRASHES THE SCREEN.

Onboarding is staged, and its save button is bound when the app wires up — but the target fields only exist once the reader reaches that step. Fire it early and the code reads a property off null, throws, and takes the screen down. A keyboard user can do this; an assistive technology can do this.

Any function reading a group of fields must CHECK THEY EXIST and decline if they do not. "Not ok" is already the result every caller checks.

DEFECT 2 — EDITING TEXT MID-REQUEST STARTS A SECOND REQUEST.

The analyse button disables itself while a request is in flight, but typing re-enables it from the text length alone. Someone editing their meal while waiting starts a second analysis, and whichever response lands LAST wins — not necessarily the one for the text on screen.

Hold one "in progress" flag, have the input handler respect it, and release it in a finally block so no early return can leave the screen permanently stuck.

DEFECT 3 — AN ATTRIBUTE ON THE ROOT ELEMENT MAKES EVERY CLICK MATCH IT.

If clicks are handled by delegation — one listener resolving the target with closest('[data-thing], [data-other], ...') — then every name in that selector is a NAMESPACE. closest() walks UPWARD, so writing any of those names onto the root element makes every click anywhere match it.

This happened: a decorative background wrote data-scene onto the document root to tint itself by location, and data-scene was in the delegation list. Every click became a scene change, the dashboard re-rendered twice per click, and a "shown once" card was drawn and instantly cleared. Four passing tests went red and not one of them mentioned the feature that broke them.

RULE: no attribute on the root element may share a name with a delegated click target. Prefix it.
```

**Check:** jump to the onboarding targets step by keyboard and press save before
filling anything — nothing throws. Type while an analysis runs — exactly one review
appears. No screen re-renders twice per click.

---

## PROMPT 41 — everything a hostile person types

> Not a fuzzer. A chosen list of things that actually happen.

```
Drive every text entry point in the app — meal, label, appointment questions, vitals note, name, barcode, clarification — with each of these, and fix whatever breaks:

  empty · whitespace only · one character · 500 identical characters
  keyboard mash · a real long pasted meal · 200 commas · a 40-item shopping list
  common misspellings · things that are not food at all · digits only
  a barcode typed into the meal box
  <script> tags · img onerror · svg onload · attribute break-out · template literals
  SQL-looking strings · a JSON blob claiming to set __proto__
  emoji only · Chinese · Arabic (right-to-left) · RTL override marks
  zero-width joiners · stacked combining marks · newlines everywhere · a URL

FOUR THINGS MUST HOLD FOR ALL OF THEM:

1. NO CRASH. No thrown error reaches the page, at any entry point.
2. NO INTERNALS ON SCREEN. Never "undefined", "NaN", "[object Object]" or a bare "null" where a person can read it. These are the tells of an app that met something it did not plan for, and they destroy trust faster than a blank screen.
3. NOTHING TYPED IN IS EVER EXECUTED OR RENDERED AS MARKUP. Every user- and model-originated string is escaped as text. A meal note containing a script tag is a meal note containing a script tag — visible as literal characters, not silently dropped.
4. NO DEAD ENDS. Where the app cannot help, it says so and offers a route.

ALSO TEST THE STATES, not just the strings: pressing the primary button ten times in a row; submitting while offline; submitting while storage is refusing writes; navigating every screen forwards, backwards and interleaved.

WHEN YOUR TEST FAILS, CHECK THE TEST FIRST. Three of this suite's own first failures were the suite's fault — it named screens that did not exist, it stubbed storage in a way the environment silently ignored, and it counted the app's own honest "save failed" log as a crash. A test that blames the app for its own wrong assumption is worse than no test.
```

**Check:** run the whole list. No crash, no `undefined` anywhere on screen, a script
payload renders as visible text, and pressing analyse ten times produces one meal.

---

## PROMPT 42 — accessibility, to the standard and not to the badge

> Do this continuously, not at the end.

```
WCAG 2.1 AA, held as a floor rather than aimed at.

  · One h1 per screen, headings in order, no levels skipped.
  · Every interactive element has an accessible name. An icon-only button needs a label; an empty button is invisible to a screen reader.
  · Focus is always visible, and the ring must be visible against every background it can land on.
  · Tab order matches visual order. Nothing focusable is hidden off-screen and still reachable.
  · Every form field has a real label bound to it. Placeholders are not labels.
  · Errors are announced, and they point at the field. Mark the input invalid so the fault attaches to the box that holds it.
  · Colour is never the only signal. Every status has an icon and a word.
  · Live regions are polite, not assertive — an assertive one interrupts a screen reader mid-sentence on every lookup.
  · Touch targets 44×44px minimum, including chips that are buttons.
  · No duplicate ids anywhere in the document.
  · Every image has an alt attribute; decorative ones are empty and aria-hidden.
  · prefers-reduced-motion switches off animation AND transition.
  · The viewport allows zoom. Never user-scalable=no, never a maximum-scale.
  · Text size is adjustable by scaling the TYPE TOKENS, not by zooming the page — so layout survives it.

RUN AXE-CORE AGAINST EVERY SCREEN, with data in it. An empty screen is the easy case; the violations live in rendered lists, generated buttons and dynamic chips.

TWO THINGS AXE CANNOT CHECK WITHOUT A LAID-OUT BROWSER — colour contrast and rendered tap-target size. Measure those separately: contrast arithmetically from the colour tokens, tap targets from their declared sizes. State which is covered by what, so nobody reads a green run as covering everything.

IF A PUBLIC SCANNER CANNOT REACH YOUR APP — because screens sit behind a consent gate, or a strict CSP blocks its injector — DO NOT WEAKEN THE POLICY TO LET IT IN. Weakening a real defence to satisfy a tool that measures defences is backwards. Run the scanner yourself and publish the result instead.
```

**Check:** axe reports zero critical or serious violations on every screen with data
loaded. Tab through the app with the mouse untouched: everything is reachable and
the focus ring is always visible. Zoom to 200%: nothing is cut off.

---

---
---

# PART SEVEN — REACH AND POLISH (43–48)

Who else can use it, and the small things that make it feel considered rather
than merely correct.

---

## PROMPT 43 — three more languages, and the rule that does not bend

> Widest surface in the app. Do it after the copy has settled.

```
Add Spanish, Simplified Chinese and Hindi.

THIS IS ONLY TRACTABLE IF EVERY USER-FACING STRING ALREADY LIVES IN ONE PLACE. If prose is scattered through the code, fix that first — translating then means swapping one object for another rather than hunting strings through twenty files.

THREE RULES:

1. FALLBACK IS PER KEY, NOT PER LANGUAGE. A missing translation falls back to English for THAT KEY ALONE. A partly translated app is a mix of two languages, which is awkward but readable. A screen showing "undefined" is broken.

2. NUMBERS AND THRESHOLDS ARE NEVER LOCALISED. Every band, cutoff, milligram figure and guideline value is quoted from KDOQI, KDIGO, AKF or NICE — not authored here, therefore not translatable. A translator may rebuild the sentence around 5.5 mEq/L however their language requires; 5.5 may not become 5,5 or 5.0. In Hindi the digits stay Western Arabic: 5.5, never ५.५, because a reader is holding this next to a lab report printed 5.5 and a script change makes that comparison impossible. Guideline names and units — KDOQI, NICE, mEq/L, mg/dL — stay in Latin script so they can be looked up.

3. THE DISCLAIMERS TRANSLATE, AND MUST. A consent gate somebody cannot read is not consent. These are the strings where a rough translation is worse than none, so flag them for human review first.

SAY WHAT THESE TRANSLATIONS ARE, in the target language, on the picker: produced by a language model, not reviewed by a native speaker or a renal dietitian, with every number identical to the English.

REPORT COVERAGE HONESTLY. A language that is 60% translated says so. When it says 100% it must BE 100%. And "not loaded yet" is not the same as 0% — do not let a language advertise itself as untranslated because its file has not arrived.

TWO THINGS TO GET RIGHT IN THE CHECKING, both of which were wrong here for weeks:

  · Whatever compares translations must read the object the APP SERVES, not the object the source file declares. A check reading the wrong one silently covered a fifth of the translation and stayed green.
  · Comparing plain strings is not enough. Any sentence built by a FUNCTION — anything with a value interpolated — must be checked too, and that is exactly where 3.5–5.0, 5.5, 6.0 and 2.5–4.5 live. Do not compare the function's source (a plural like "1 day / 2 days" contributes digits that are not medicine): CALL it on both sides with non-numeric placeholders and compare the numerals in the output.

AND AUDIT FOR ENGLISH HIDING IN LOGIC FILES. A sentence hard-coded inside a logic module can never be translated. Here, the lab-scan confirmation's consequence clauses lived outside the copy table, so the Spanish translator dropped the clause entirely — leaving "This reads 6.2" with the half saying what 6.2 would DO removed. That is the informative half.
```

**Check:** switch to Spanish and visit every screen — no English sentences remain.
In Hindi, a potassium message reads `5.5`. Delete one key: it falls back to English
and nothing reads `undefined`.

---

## PROMPT 44 — an entrance, and two people to be

> Build this if anyone will ever demo the app.

```
On first open, before onboarding, ask how they want to start. Three choices.

DO NOT CALL THIS SCREEN A DEMONSTRATION. On the front door, that word tells a patient the whole product is a showcase. Title it as the question it asks: "How would you like to start?"

Say two things plainly: there is no account and no sign-up, and the example patients are made up.

  1. SET IT UP AS MYSELF — the normal first run.
  2. CONTINUE AS FRANK — a week of logged meals and one recent lab. The cleanest way to see the daily loop.
  3. CONTINUE AS MARIA — a patient who has used everything: two labs, weight and blood pressure, symptoms, an appointment with questions written down, a filled passport, medicines INCLUDING A PHOSPHATE BINDER, and enough history for the pattern detector to have something to say.

THE TWO PERSONAS MUST EAT DIFFERENT WEEKS. If both seeders call the same generator, the "everything used" persona is just the simple one with extra rows, and the difference the chooser promises does not exist. Maria's week should exercise what her card claims — boiled potatoes so the cooking toggle has a case, lentils, a cola so the additive card fires, and the binder so the timing note appears.

A STRIP STAYS UP FOR THE WHOLE SESSION, not just at the entrance. After the chooser closes, nothing on screen would otherwise say the data is fictional, and somebody handed the phone mid-walkthrough would be looking at Frank's week believing it was a real patient's.

WORD IT AS A FACT ABOUT A PERSON, NOT ABOUT DATA: "Viewing Frank — an example patient, not a real person's record." Phrased as "example data" and stacked against a notice saying values are not clinically verified, the pair reads as one claim about the software's readiness, and an independent scan raised exactly that as a HIGH finding.

Colour it calmly. Being in a demo is a fact, not a fault.

IT CARRIES ITS OWN EXIT. "Leave demo" clears the session AND the sample data it created, returning to the ordinary first-run state. A demo that leaves its data behind is not a demo you left. And sign-out must REFUSE to run if there is no sample-data flag, or it would delete a real user's records.

IF THE BROWSER ALREADY HAS REAL DATA, refuse to load the demo rather than overwriting it, and say so: open it in a private window, or export a backup first.
```

**Check:** choose Frank, walk three screens — the strip is still there. Press Leave
demo: the data is gone and you are at first-run. Enter real data, then try the demo:
it refuses.

---

## PROMPT 45 — export, backup, and getting your data out

> Nobody's data should be trapped in an app they might stop using.

```
EXPORT EVERYTHING as a structured file: profile, targets, labs, meals with all their items and provenance, vitals, appointments, passport, medicines, settings. Include a schema version.

IMPORT IT BACK. Validate the shape before writing anything, and write all-or-nothing — build the whole object, then assign it, so there is no window where half the store is new and half is old.

A CSV of meals and daily totals for anyone who wants a spreadsheet.

DELETE EVERYTHING, from Settings, with a confirmation that COUNTS WHAT WILL ACTUALLY GO before asking: "Delete 47 meals, 3 lab results and your profile? This cannot be undone."

Say where the data lives, plainly, in Settings: on this device, in this browser, nowhere else. Clearing browser data removes it. Nobody else can see it. There is no account to delete because there was never an account.

BACKUP IS THE HONEST ANSWER TO LOCAL-ONLY STORAGE. If everything is on the device, then a lost phone is lost data, and an app that does not say so and offer an export has not thought it through.
```

**Check:** export, delete everything, import the file. Everything returns, including
the provenance chips on old meals. Import a truncated file: it refuses and changes
nothing.

---

## PROMPT 46 — offline, installable, and fast

> A supermarket aisle is where this app is most useful and connectivity is worst.

```
INSTALLABLE. A manifest with a name, a start URL, a scope, standalone display, and real icons — 192px, 512px, and a maskable one. Without those a browser will not offer to install, and iOS falls back to a blurry screenshot of the page. Add the iOS-specific touch icon and standalone meta tags too; iOS reads none of the manifest for those.

Home-screen shortcuts to the two or three most common actions, and CHECK THEY POINT AT SCREENS THAT EXIST — a long-press menu of dead links is worse than no menu.

OFFLINE. Cache the app shell so a second visit works with no signal. Everything except meal parsing already works offline: logging via the picker, the food list, the label checker, the passport, every education card.

Say what still works rather than just announcing failure: "You're offline. Logging still works — use the food list instead of typing a meal."

NEVER CACHE THE API.

THE CACHE LIST MUST NOT DRIFT. Derive it from what the page actually loads rather than maintaining it by hand — a hand-typed list falls behind the first time a file is added, and the cost is invisible until somebody's first offline visit.

FAST. Measure before optimising: fetch each asset and look at where the time actually goes. On this build the network was never the problem — the four files arrived in about 0.2 s — and the load event was slow because of half a megabyte of JavaScript to parse. Compression does not help with that: the browser decompresses first and parses the full text.

Reduce what has to be PARSED, not just what has to be sent. Keep the readable sources deployed alongside so nothing becomes unverifiable.
```

**Check:** install to the home screen; the icon is sharp. Turn off the network and
reload — the app opens, the picker works, and the banner says what still works.

---

## PROMPT 47 — scenes, and a background that changes with the hour

> Optional. Emphasis only — a scene may never change a number.

```
Offer a few scenes — at home, at the store, eating out, at the clinic — that change EMPHASIS AND ORDER only: which action leads, which cards surface, where the app opens.

A SCENE NEVER CHANGES A NUMBER, A THRESHOLD, A TARGET, OR WHAT GETS FLAGGED. Sodium guidance in a restaurant is the same guidance as at home; the restaurant scene simply puts it first. If a scene could change what counts, it would be a second clinical model with no evidence behind it.

Underneath, the dashboard may reorder itself through the day — an empty morning wants the day ahead, an evening wants what is left for dinner. Same cards, same numbers, different lead. NOTHING IS EVER HIDDEN by a reorder; a card that would be dropped moves to the end.

OPTIONALLY, an ambient backdrop that shifts with the time of day: warm low light in the morning, clearest at midday, amber in the evening, cool at night.

BUILD IT FROM GRADIENTS, NOT IMAGES. Nothing to download, nothing to cache, nothing that can fail to load.

IT MAY ONLY TINT THE CANVAS, NEVER DARKEN IT. It sits behind text people with failing eyesight need to read. Every value is a low-alpha wash over the existing background colour, so the measured contrast ratios do not change. Off entirely in high contrast, halved in dark mode, no cross-fade under reduced motion. aria-hidden, no pointer events, and deleting the whole thing changes nothing that matters.

WATCH THE ATTRIBUTE NAME — see prompt 40, defect 3. This is exactly the feature that caused it.
```

**Check:** switch scenes: the lead action changes and no number does. Turn on high
contrast: the backdrop disappears. Re-measure text contrast: unchanged.

---

## PROMPT 48 — the small kindnesses

> Cheap, and they are what "considered" actually consists of.

```
THE PRIMARY ACTION FOLLOWS THE FIELD IT ACTS ON. On every screen. Alternatives come after it, fine print after those. Nothing that qualifies an action stands between that action and its input. On the log screen "Analyze meal" sat below "Or check a food label instead" — the thing somebody came to do was the third control, under an alternative to doing it, and on a phone that alternative is nearest the thumb.

A SENTENCE FOR SOMEBODY WHO GOT INTERRUPTED. After a long pause with something in the text box: "Take your time — what you have typed is saved, and it will still be here if you step away." Only when there is something to lose, never a countdown, never a modal, once per session. And only if the draft really is saved on every keystroke — build that first or do not show the line.

DICTATION, where the browser supports it, filling the same text field. Hide the button where it does not work; a button that does nothing is worse than no button. Say who is doing the listening: "Speech is handled by your browser or phone, not by us."

TEXT SIZE CONTROL that scales the type tokens rather than zooming the page.

A LOADING STATE THAT TEACHES. The wait for meal analysis is the only moment somebody is looking at the screen with nothing to do. Show one true fact from the fixed education set rather than a spinner. Keep the screen-reader status as plain text — a rotating fact is not something to announce.

A MISTYPED URL IS NOT A DEAD END. A branded 404 with a route back into the app, saying nothing logged is affected, and never calling the request invalid or forbidden.

CONFIRM DESTRUCTIVE THINGS BY NAMING WHAT GOES, and offer undo where you can.
```

**Check:** on every screen with a form, the primary button is directly under the
field. Leave a half-typed meal 45 seconds, then reload — the line told the truth.
Visit a nonsense URL: a branded page with a way back.

---

---
---

# PART EIGHT — SHIPPING IT (49–50)

The two that keep the other forty-eight true.

---

## PROMPT 49 — security, and the boundaries that hold it up

> Most of this is invisible until it is not.

```
NO ACCOUNTS, NO SERVER, NO UPLOAD. Everything on the device. That is a security posture as much as a privacy one: there is no database to breach.

API KEYS LIVE SERVER-SIDE ONLY. Any AI or lookup call goes through your own backend function with the key in platform secrets. Never in client code, never in a build artefact.

THE AI ENDPOINT ACCEPTS ONLY KNOWN SCHEMA SHAPES. It is not a general-purpose proxy.

EVERY USER- AND MODEL-ORIGINATED STRING IS RENDERED AS TEXT, NEVER AS MARKUP. Escape at the point of rendering. This is the layer that actually stops a script in a meal note; the content policy is the second line, not the first.

SET A STRICT CONTENT-SECURITY-POLICY if your host allows it: no inline scripts, no eval, no foreign origins, no framing. And then DO NOT WEAKEN IT to make a scanner happy. If an accessibility scanner cannot inject itself because of your policy, that policy is working. Run the scanner yourself and publish the result.

NEVER PUT REAL PATIENT DATA IN A DEMO OR A TEST FIXTURE.

DO NOT NAME DEVELOPMENT ARTEFACTS IN SHIPPED CODE. No id, class or key containing "dev", "debug", "staging" or "test" for a permanent part of the product, and no comment quoting those words either. Comments ship. Console output ships. An automated reviewer reads both, and this exact thing cost a HIGH severity finding on an independent scan — twice, because the first fix changed the sentence and left the id alone.
```

**Check:** search the entire shipped output — markup, scripts, styles, console
output at startup — for any API key and for the words `dev-banner`, `reference
build`, `test data`. Zero hits. Paste a script tag into a meal note: it renders as
text.

---

## PROMPT 50 — the acceptance suite, and what it must never let pass

> The last prompt, and the one that keeps the other forty-nine true.

```
Build a test suite. Not for coverage — for the specific failures this app can have.

THE ASSERTIONS THAT MATTER MOST, because each one corresponds to the app telling somebody something untrue:

1. A missing nutrient value never sums as zero, and the day is marked partial.
2. A partial total never shows a plain green "on track" — and still shows over-budget when it is over.
3. A save that failed is never reported as a success.
4. A food with no potassium value never carries a low-potassium badge.
5. Sorting the food list by a nutrient never ranks an unpriced food among the priced.
6. The same meal produces identical wording every time.
7. No number differs between a translation and its English original.
8. Nothing user-typed is ever rendered as markup.
9. Every screen is two taps from the tab bar, and the back button works.
10. Zero critical or serious axe violations on every screen, with data loaded.

DERIVE LISTS, NEVER TYPE THEM. Every hand-maintained list in this project eventually went stale: the service-worker cache list fell seventeen assets behind, the test harness loaded a stale asset list and passed 253 assertions against an app missing a file, and the accessibility sweep silently stopped covering a screen the day it shipped. If a test needs to know every screen, ask the router. If it needs every asset, ask the page.

CHECK YOUR CHECKS. Six assertions in this project were inert — written with the arguments in the wrong order, so they could not fail. One sat green while the thing it guarded drifted by two modules. Add a lint that finds an assertion that cannot fail, and when a test goes red, consider first that the test is wrong.

A CHECK THAT CANNOT FAIL IS WORSE THAN NO CHECK, because it reports confidence it has not earned.

AND WRITE DOWN WHAT IS NOT COVERED rather than letting a green run imply everything is. Colour contrast, rendered layout, real-device performance and anything needing human judgement belong on a short honest list, not in an implied claim.
```

**Check:** deliberately break each of the ten assertions above, one at a time. Every
one goes red. Then revert and confirm the suite is green.

---
---

## Where to stop, if you have to

| If you build only… | You have |
|---|---|
| **1–6** | An honest shell that cannot mislead anyone. Not yet useful. |
| **1–16** | **The product.** Log a meal, see what it costs, know what the app does not know. Everything after this is addition. |
| **1–24** | The clinically careful version: lab-driven modes, real coaching, and the refusals that make the rest credible. |
| **1–34** | The full companion — labels, kitchen, passport, trends. |
| **1–42** | Survives real people: bad spelling, long lists, hostile input, screen readers. |
| **1–50** | What is deployed at `chroniccal.vercel.app`. |

**The three that are not optional, whatever else you skip:** prompt 4 (a save that
failed is never reported as success), prompt 11 (a missing value never sums as
zero), and prompt 5 (consent and the disclaimers). The first two are the app
telling somebody something untrue in the direction that looks fine. The third is
the line between a wellness tool and a medical device.
