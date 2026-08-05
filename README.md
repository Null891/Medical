# RenalRoute — Antigravity reference build

A working implementation of the RenalRoute spec, built to run alongside the Base44 version so the two can be compared, tested, and argued with.

**This is not the submission.** Only Base44-generated code ships. This exists to answer "does the spec actually work when built?" before and while the Base44 app is assembled.

---

## Run it

**Locally — no install, no build.** Double-click `index.html`. The app runs entirely in the browser with data in `localStorage` and stays in demo mode (canned meal parsing, zero API calls).

**Deploy to Vercel.**

```powershell
npm i -g vercel        # once
vercel                 # preview   (run from the repo root)
vercel --prod          # production
```

Or push to GitHub and import the repo. **`index.html` must sit at the repository root** — that is the whole configuration. There is no build step, no framework preset to choose, no output directory to set. Vercel serves the static files and picks up `api/invoke-llm.mjs` as a function automatically.

### If you get a 404

The cause is almost always that Vercel is looking at a folder with no `index.html` in it. Check **Settings → General → Root Directory** and make sure it points at the folder containing `index.html` — leave it blank if that's the repo root.

Deliberate non-fixes, so nobody "helpfully" adds them later:

- **Do not set an Output Directory.** There's no build, so there's no `dist` or `build` folder. Pointing at one guarantees a 404.
- **Do not add a catch-all rewrite to `/index.html`.** This app is a single page but it does *not* use client-side URL routing — every screen lives at `/` and is shown or hidden in place. A blanket `"/(.*)" → "/index.html"` rewrite buys nothing and puts the `/api/invoke-llm` route at risk for no reason.
- **Do not pick a Framework Preset.** "Other" is correct. Selecting Vite or CRA makes Vercel run a build that doesn't exist.

**To enable live meal parsing**, add one environment variable in Vercel → Project → Settings → Environment Variables:

```
ANTHROPIC_API_KEY = sk-ant-…
```

Then redeploy and turn off **Demo mode** in Settings.

Without the key the app is fully usable — it just parses meals from a canned table instead of a model. Nothing else changes.

---

## Why the key lives on the server

The first draft of this build put the API key in a browser field. That is acceptable on `file://` and unacceptable the moment the app has a public URL — anyone visiting could read it out of `localStorage`.

`api/invoke-llm.js` holds the key in a Vercel environment variable and proxies the two calls the app makes. This also makes the architecture mirror Base44's server-side `InvokeLLM` rather than diverging from it, which is the point of having both builds.

The endpoint refuses any request whose response schema isn't one of the two shapes this app actually uses, so it can't be repurposed as a general-purpose LLM relay by someone who finds the URL. `vercel.json` sets CSP, `frame-ancestors: none`, and `nosniff`.

---

## What the AI does and does not do

| | |
|---|---|
| **AI does** | Split typed text into food items and portions. Produce deliberately wide ranges for foods missing from the reference table. That's the entire list. |
| **AI does not** | Price any matched food, choose any swap, set any threshold, decide any guidance mode, or write a single word the user reads as clinical guidance. |

Nutrient numbers come from `js/data/anchor-foods.js`. Swap suggestions come from that table by rule. Every explanation is assembled from fixed templates in `js/data/copy.js`, so the same meal always produces byte-identical text.

The reason is measured, not stylistic: LLMs are about 60% accurate classifying **low**-potassium foods, and sodium is their worst-estimated nutrient at 34–64% median error. Letting a model nominate "safe" foods for a renal patient would put its weakest capability in the most consequential position.

---

## ⚠ Data status

**Every nutrient value in this build is unverified test data.** Values were transcribed from the plan's ground-truth pack for testing and have not been re-derived from USDA FoodData Central.

Each row carries a `verify` array naming the fields that still need checking. Two known problems are handled explicitly rather than papered over:

- **Whole-milk phosphorus.** The source lists 134 mg per cup, which is almost certainly a half-cup figure mislabeled — whole and 2% milk cannot differ ~2× in phosphorus. Stored as a re-derivation placeholder, flagged, and **not** shipped as a range spanning the error. A range that spans a transcription error launders the error into false "honest uncertainty," which is worse than false precision.
- **Deli-ham phosphorus.** The source lists 447 mg "per slice," implausible by 3–5× for a 28 g slice. Restated per ounce with a wide flagged range.

Sodium is `null` on most rows because the source pack never had it. That is deliberate: it drives the app's "Partial data" chip and confidence downgrade rather than inventing numbers. `ANCHOR_STATS` reports the gaps; the Settings panel and the browser console print them at startup.

---

## Architecture

```
index.html              shell, all screens, tab bar
css/tokens.css          design tokens — the only file with raw hex
css/app.css             components, responsive, reduced-motion
api/invoke-llm.js       Vercel function — server-side model calls
js/data/copy.js         every user-facing string, one canonical version each
js/data/anchor-foods.js the reference table + data-quality stats
js/store.js             four entities, localStorage, ownership mirror
js/clinical.js          bands, bounds, staleness, ring thresholds
js/resolve.js           normalize → match → portion scaling
js/llm.js               both prompts, demo stub, retry/timeout
js/cards.js             flag-card templates + rules-only swap engine
js/rings.js             SVG concentric rings
js/ui.js                screens, router, interactions
js/seed.js              demo persona
js/app.js               bootstrap
```

**The ownership model is a mirror, not a control.** Base44 enforces `created_by == {{user.email}}` server-side. A browser app cannot enforce anything server-side. `store.js` stamps and filters faithfully so behavior matches and the cross-account case is testable — but here the boundary is a convention where Base44's is a rule. **Never put real patient data in this build.**

---

## Test checklist — run against both builds

Behavior should be identical. Where it isn't, one of the two is wrong.

**Provenance**
- [ ] Fresh account shows **empty** target fields. Nothing is pre-filled.
- [ ] Tapping "use general education ranges" fills 2500/900/2000 and the provenance chip appears on the dashboard.
- [ ] Typing care-team numbers instead → no chip anywhere.
- [ ] Edit a target while on education ranges → provenance **stays** education. Only the explicit "these are my care team's numbers" button promotes it.
- [ ] Potassium target 50 → blocked. 7000 → blocked. 2000 → accepted.

**Pipeline**
- [ ] `grilled chicken, baked potato with skin, and a glass of milk` → three items, potato exactly **926 mg** potassium.
- [ ] `a 12 oz cola` → phosphorus shows a **range** (33.5–41), never one number.
- [ ] `leftover casserole` → exactly one question; Skip → "?" chip, totals unchanged.
- [ ] `12 bananas` → clamped at 4× (1,688 mg), with the portion note.
- [ ] `a glass of milk` → scaled to 1 cup = 368 mg potassium.
- [ ] `just water` → no crash; empty-extraction message.
- [ ] Portion stepper 1× → 2× fires **zero** model calls.
- [ ] With the endpoint unavailable, a meal can still be logged end to end via the food picker.

**Rings**
- [ ] Day at 1,150–1,400 mg K against 2,500 → fill ≈ 51%, **green**, "On track".
- [ ] Add the 926 mg potato → high end crosses 70% → **amber**, "Getting close", while fill stays near two-thirds. The divergence is intended.
- [ ] Grayscale screenshot still communicates all three statuses.
- [ ] OS reduced-motion → no ring sweep.

**Clinical modes** — enter each and screenshot
- [ ] 3.4 → low · 3.5 → normal · 5.0 → normal · 5.1 → caution · 5.5 → caution · 5.6 → restricted · 5.9 → restricted · 6.0 → paused
- [ ] P: 2.4 → below range · 2.5 and 4.5 → normal · 4.6 → caution
- [ ] **K 5.3 → all three target values are byte-identical before and after.** Labs change tone, never numbers.
- [ ] **K 3.2 → the potassium ring becomes a plain intake readout** with no colour and no fill; the other two rings are untouched; nothing suggests eating more potassium.
- [ ] **K 6.2 → coaching suppressed app-wide**, but a salt-substitute meal still fires its warning and a 926 mg item still shows the single factual reference line.
- [ ] A 4-month-old **K 4.6** → decays to no-lab framing. A 4-month-old **K 5.7** → **restricted persists**. This asymmetry is the test most likely to be built wrong.
- [ ] K 45 → rejected inline, nothing saved.
- [ ] eGFR 34 → the pinned sentence; the phrase "you are stage" appears nowhere.

**Cards**
- [ ] `scrambled eggs with salt substitute` → warning fires. `grilled chicken, no salt added` → no warning.
- [ ] An ingredient list with only `potassium sorbate` → low-key note, **no** warning chip. With `potassium phosphates` → Tier 1 warning **and** the PHOS card.
- [ ] Normal mode, `black beans and a banana` → **zero** warning-toned cards.
- [ ] Same meal logged twice → byte-identical card text.
- [ ] Restricted mode → no swap line renders anywhere.

**Security posture**
- [ ] `<script>alert(1)</script> and a banana` renders as literal characters everywhere and executes nothing; the banana still resolves.
- [ ] A 501-character meal is rejected inline.
- [ ] Every tap target ≥44px at 320px width; no horizontal scroll on any screen.
- [ ] Keyboard-only pass of consent → log → rings → lab edit → target edit, with visible focus throughout.

---

## Automated checks

```powershell
cd test
npm install     # once — pulls jsdom and axe-core
npm test        # all nine suites, 1,344 assertions
```

| Suite | Assertions | What it is for |
|---|---:|---|
| `verify.js`  | 275 | Unit: clinical bands, resolution, ranges, translation tables |
| `e2e.js`     | 513 | The app driven in a real DOM, by real clicks, end to end |
| `probe.js`   |  12 | Edge cases: empty, no-target, hostile input |
| `headers.js` |  34 | Deployment headers, CSP hashes, caching policy |
| `wiring.js`  | 174 | Dead controls: a button that exists and does nothing |
| `sweep.js`   | 126 | The manual QA list, automated — bundle integrity, plus lints on the harness itself |
| `journey.js` | 113 | Four journeys a real person walks, in order |
| `forms.js`   |  80 | Every form submitted empty, oversized, and hostile |
| `a11y.js`    |  17 | axe-core across 14 screens, WCAG 2.1 A + AA |

`package.json` lives in `test/` on purpose. A `package.json` at the repo root would make Vercel treat this static site as a Node project and try to build it.

### What is genuinely NOT covered, and why

These need a real browser with layout, which jsdom is not. They are listed
here rather than quietly dropped, because a checklist that claims coverage
it does not have is worse than a short honest one — and this project has
already shipped four bugs that were invisible locally.

- [ ] **Rendered contrast.** `sweep.js` computes ratios arithmetically from
      the tokens, which caught an amber that had never met AA despite a
      comment claiming 6.5:1. It cannot see what a real compositor draws.
- [ ] **Tap-target geometry.** Declared sizes are checked; rendered ones are
      not. 320 / 375 / 768 / 1024 / 1440.
- [ ] **Tab order against visual order.** Presence of focus is checked;
      whether the sequence matches what the eye follows is not.
- [ ] **200% browser zoom** on every screen — no clipping, no overlap.
- [ ] **Devanagari and CJK at the two larger text sizes.** Line-height was
      set per script but never seen rendered.
- [ ] **Camera, dictation and barcode on a real device.** jsdom has no
      `getUserMedia`, no `SpeechRecognition`, no `BarcodeDetector`.
- [ ] **Whether the rings read correctly to somebody seeing them cold.**
      The one thing on this list no test of any kind can answer.

`package.json` lives in `test/` on purpose. A `package.json` at the repo root would make Vercel treat this static site as a Node project and try to build it.

### `e2e.js` — the full run-through

Boots `index.html` with every script and both stylesheets in jsdom, then drives the app by dispatching real clicks on real buttons: consent → onboarding → log a meal → save → XSS probe → clarify-once → delete → labs → every guidance mode → settings → learn cards → manual picker → seed. It asserts on computed styles, so it catches "the element is in the DOM but the CSS is showing it anyway" — which is exactly the class of bug that shipped the first time.

It caught the click-blocking bug on its very first run and would have caught it before deploy.

### `headers.js` — the layer the other suites cannot see

This one exists because of a bug that shipped. `Permissions-Policy` denied `camera` and `microphone` to the page as a hardening measure; dictation and barcode scanning were added later. On the deployed site both were silently blocked by a header written weeks earlier — and nearly three hundred passing assertions could not see it, because **jsdom enforces neither CSP nor Permissions-Policy**.

So it does not hardcode an expected policy. It **derives the requirements from the source**: greps for `getUserMedia`, `SpeechRecognition`, `srcObject`, `createObjectURL`, `serviceWorker.register`, `fetch('/api/…')`, then asserts the headers permit exactly those and nothing more. Add a capability and forget the header, and this fails.

It also asserts the page never fetches a foreign origin directly — that invariant is the entire reason `/api/product` exists rather than calling Open Food Facts from the browser.

### `verify.js` — the arithmetic

64 assertions covering anchor matching and portion scaling, ring fill and colour thresholds, remaining-budget copy, every mode boundary, both sets of validation bounds, confidence tiers, and swap-pool integrity: anchor matching and portion scaling, ring fill and colour thresholds, the remaining-budget copy strings, every mode boundary, both sets of validation bounds, confidence tiers, and swap-pool integrity. It runs headless in a few hundred milliseconds and needs no dependencies.

It has already earned its keep. It caught a real matching bug: a bare query of `spinach` was resolving to 420 mg — the cooked row — because the longest-alias rule was ranking `cooked spinach` (14 characters) above `spinach salad` (13) and silently picking a preparation the user never specified. The rule is now two-tiered: aliases *contained in* the query rank by length, because that is a genuine specificity signal; aliases that *contain* the query do not rank at all, because that is a broad query and every variant deserves to survive into the union range. Bare `spinach` now correctly reports **84–420 mg**.

Run this after any change to `resolve.js`, `clinical.js`, or the anchor table.

### Known gap it reports

`legume, dairy, meat_fish_egg, snack_sweet, mixed_dish` each have fewer than two `swap_pool` candidates. A flagged bean dish or cheese has nothing to offer. That case is now handled honestly rather than misleadingly: **a category with zero candidates renders no swap line at all**, because "no swap fits today's remaining budget" blames the user's budget for a gap in our table — and is flatly false on a fresh day with a full budget. The no-fit sentence is reserved for the case it actually describes: candidates exist, none fits today. Filling the thin categories is data-prep work in `anchor-foods.js`, not a code change.

### Why swaps carry a `swap_affinity`

Sorting a category by milligrams is not enough to make a suggestion a dietitian would stand behind. `vegetable` sorted by potassium answers a 926 mg baked potato with **raw cabbage at 60 mg** — true on the numbers, absurd on a plate — and it pushed cooked cauliflower (88 mg, 4th) out of the three the engine offers, so the scripted swap beat could never fire at all.

`swap_affinity` carries what the nutrient columns cannot: whether one food can actually stand in for another. `cooked_side` holds potatoes, cauliflower, and green beans; `raw_salad` holds cabbage, cucumber, and raw spinach; `sauce` holds the tomato products. When a flagged row declares an affinity, candidates must match it — and where an affinity group is empty, the engine offers nothing rather than something silly.

The unit suite guards both halves: cauliflower is offered, and no raw salad vegetable is.

---

## Console helpers

```js
RenalRoute.Seed.run()          // seed Frank + a prior week + today's breakfast
RenalRoute.Seed.resetToday()   // reset today only, after a rehearsal
RenalRoute.stats               // anchor-table gaps and thin swap categories
RenalRoute.Store.reset()       // wipe everything
RenalRoute.Clinical.potassiumMode()
```

`Seed.run()` sets Frank's targets explicitly to **2,500 / 900 / 2,000 as care-team values**, because every worked number in the spec assumes 2,500 mg potassium. It seeds six prior days plus **today's breakfast only** — enough that the opening screen looks lived-in, and not so much that the remaining budget drops below the point where the swap engine can still return a suggestion.
