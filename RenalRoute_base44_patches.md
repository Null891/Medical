# RenalRoute — Base44 transfer package

**v2 — regenerated Aug 4, 2026. Covers every commit through `9f00d78`.**

Everything that exists in the website build but not in Fable's original Layer 1 plan, written as prompts you can paste straight into Base44.

> **Why this file was rewritten.** v1 was written at commit `826c5fa` and never updated. Eighteen commits landed after it. Roughly two dozen features — the label checker, barcode lookup, trends, export, undo, dictation, the cooking-method toggle, the coverage panel, display controls, the desktop rail — existed in the website and in **neither** this file nor `RenalRoute_build_modules.md`. Anyone transferring from v1 would have shipped a Base44 app missing most of two days of work. If you already pasted from v1, nothing you pasted was wrong; patches 1–3 are unchanged below. Everything from patch 4 onward is new.

---

## Read this first — which path are you on?

**If you have NOT pasted M0–M8 into Base44 yet:** paste the hardened modules from `RenalRoute_build_modules.md` first. E1–E35 are already baked into them, so **skip patches 1 and 2** — they are already in M1 and M5. Then work down from **patch 3**.

**If you have ALREADY pasted some or all modules:** work down from **patch 1** in order.

**Either way:** patches 1 and 4 are schema changes. Both must land **before** you declare schema freeze. If you have already frozen, land them together as one paste and re-run the two-account RLS test.

---

## Budget — read this before you paste anything

The full set is **more than the leftover credit budget allows.** Being straight about that is more useful than a list that pretends otherwise.

| Patch | What it buys | Credits | Cut line |
|---|---|---|---|
| 1 · Schema round 1 | `swap_affinity` | 1.5 | **Essential** |
| 2 · Swap engine | The demo's headline swap actually fires | 1.5 | **Essential** |
| 3 · Rings, edge states, a11y | Ring readability without narration | 2.0 | **Essential** |
| 4 · Schema round 2 | `leachable` | 0.5 | **Essential** (blocks 5) |
| 5 · Cooking method | Boiling as a real lever | 1.5 | **High** |
| 6 · Label checker | Read the ingredient list, name what's in it | 2.0 | **High** |
| 7 · Faster logging | Search, repeat, dictation, draft, undo | 2.5 | **High** |
| 8 · The week | Trends + export | 2.0 | Medium |
| 9 · Honesty surfaces | Coverage, provenance, AKF badge | 1.5 | Medium |
| 10 · Display controls | Dark mode, text size, contrast, offline | 2.0 | Medium |
| 11 · Barcode lookup | Scan the packet | 1.5 | **Low — see the warning in the patch** |
| 12 · Desktop rail | The empty left third earns its width | 1.5 | Low |
| | | **20.0** | |

**Against the ledger:** M0–M8 plan for 32.5, leaving 17.5 of 50, of which 15 is the ArgosX fix reserve. **You have roughly 2.5 uncommitted credits, not 20.**

**Recommended: patches 1–7 (11.5 credits), and take them out of the fix reserve.** That leaves ~6 for scan fixes. It is a real trade — you are spending security-fix runway on features. If the Aug 5 scan comes back clean, the trade was free; if it comes back with three criticals, you will wish you had stopped at patch 4.

**If you want a hard floor:** patches 1, 2, 3, 4, 5 (7.0 credits). That is the demo intact plus the one feature judges have not seen in another app.

---

## Change inventory

### A · Found by the verification pass — already inside `RenalRoute_build_modules.md`

| # | Change | Where |
|---|---|---|
| D1 | `sodium_category` added to AnchorFood — the sodium card's trigger referenced a classification no field carried, so the app's only sodium coaching could never fire | M1, M5 |
| D2 | Two-tier alias matching — longest-wins silently resolved bare "spinach" to the cooked row (420 mg) instead of the honest 84–420 union | M3 |
| D3 | Five audit fixes that existed only as prose given owners and dates | P0 head, M8.7 |
| D4 | Seven plan sections that now contradict the modules, resolved by a Supersedes table; two plan acceptance tests are void | doc head |
| D5 | Zero-coverage swap categories omit the line instead of emitting false no-fit copy | M5 |
| D6 | Cap test rewritten to the data editor — the old one needed 20 live AI calls inside a 15-call budget | M3 |
| D7 | Video retimed to 2:50 — both earlier cuts summed to exactly 3:00.000 against a ≤3:00 limit | M8.4 |
| D8 | M4 test 5 deferred to M6, where a real lab value can actually trigger the state | M4 |
| D9 | AT-E3 given an executable method | M1 |
| D10–D12 | Stage enum mapping, counter clauses, canned-stub shape, cut-#4 consequence, seed-week colour check, demo-mode/persona note | various |

### B · Found by building and testing it — round 1 (patches 1–3)

| Change | Why it matters |
|---|---|
| **`swap_affinity` on AnchorFood** | The demo's headline swap could not fire. Sorting a category by milligrams answers a 926 mg baked potato with raw cabbage at 60 mg — true on the numbers, absurd on a plate — and pushed cooked cauliflower (88 mg, 4th) out of the three the engine offers. Caught by a unit test. |
| **Rings side by side, not concentric** | The inner sodium arc is illegible at phone width, and sodium is the least trustworthy number in the app. |
| **Ring label hierarchy** | Each ring says `left today` and shows the remaining range as its largest type, so a silent screen recording teaches the "unfilled arc = remaining" idea without a voiceover. |
| **Offline banner** | §4.4 listed it as a required edge state; nobody had written it. |
| **Skip link** | Standard keyboard affordance, absent. |
| **`role="alert"` on errors** | Errors appeared but did not announce. |
| **Focus return + Escape on the delete modal** | Dismissing dropped keyboard users at the top of the document. |
| **Save-failure states for Settings and Labs** | Both could fail silently. |

### C · Built after v1 was written — the eighteen commits this file exists to carry

| Change | Patch | Why it matters |
|---|---|---|
| **Cooking-method toggle (leaching)** | 5 | The plan taught leaching as a Learn card and then never let the number move. A patient who does the work should see the work. It is also the only lever in the app that changes a total without changing what someone ate. |
| **Label checker screen** | 6 | The additive detectors existed but only fired inside the log flow. Reading a packet in a shop is a different job from logging a meal, and it is the job the "PHOS" teaching point is actually for. |
| **Search that forgives word order** | 7 | The picker matched a normalized prefix. "potato baked" found nothing. Token matching plus a relevance score fixed it. |
| **One-tap repeat** | 7 | People eat the same breakfast. Replaying a past meal costs zero AI calls and is the cheapest possible answer to "logging is tedious", which is the documented reason diet apps get abandoned. |
| **Dictation** | 7 | Progressive enhancement on `SpeechRecognition`. Typing a meal on a phone is the friction; talking is not. Chrome/Android only, hidden where unsupported. |
| **Draft saving + resume where you left off** | 7 | A half-typed meal survived nothing. Now it survives a reload, and the app reopens on the screen you left. |
| **Undo on delete** | 7 | The confirm dialog stays, but a deletion is recoverable for a few seconds. |
| **Seven-day trends as bands** | 8 | "Bring your food diary" is advice almost nobody can act on. A week of honest bands is something you can hand to a dietitian. Bands, not a line — a line asserts that consecutive midpoints are comparable, which is false when range width varies with match quality. |
| **Export (summary + CSV)** | 8 | Data someone entered by hand should not be trapped in the app that collected it. The summary is for a clinic appointment; the CSV is for the person who wants their numbers back. |
| **Coverage panel — "What this build doesn't know"** | 9 | The table has holes. Listing them beats hiding them, and it is the single cheapest credibility move available in front of a dietitian. |
| **Per-food provenance** | 9 | Every row carried a citation and a per-nutrient verification list, and the app showed the user none of it. |
| **AKF low-potassium badge** | 9 | 150 mg per serving is a published threshold, used exactly as published — unlike most numbers in the app, it is not a product choice. |
| **Dark mode, text size, high contrast** | 10 | The target user is older. Text size scales tokens rather than zooming, so layout survives. |
| **Offline service worker + installable** | 10 | Network-first, never cache-first — a stale build during judging is the worse failure. |
| **Barcode lookup** | 11 | Real ingredient lists off a real packet. Carries a warning: see the patch. |
| **Desktop rail** | 12 | At 1440px the app was a phone in the middle of a monitor with an empty left third. |

### D · Does NOT transfer to Base44 — do not try

| Website change | Why it stays here |
|---|---|
| HSTS, COOP, CORP, CSP, Permissions-Policy in `vercel.json` | Base44 manages hosting headers. Not team-configurable. Document them as platform-managed in the security notes; do not spend credits fighting them. |
| `/api/invoke-llm` origin + content-type checks | Base44's `InvokeLLM` is server-side already; there is no custom endpoint to protect. |
| `/api/product` Open Food Facts proxy | Exists only because the browser may not call a foreign origin under our CSP. Base44 has no equivalent constraint and no place to put a proxy. See patch 11. |
| Service worker + web manifest | Base44 owns the page shell and the service-worker scope. Try patch 10's last part; if the platform refuses, drop it. |
| `<meta>` tags, `theme-color`, `viewport-fit` | Same reason. Polish, not correctness. |
| The five test suites (453 assertions) | They test this codebase. Base44 regenerates its own. The *acceptance tests* printed under each patch below are the transferable part. |

---

# PATCH 1 — schema round 1 (must land before schema freeze)

```
Add one property to the AnchorFood entity. Change nothing else about any entity.

Add to AnchorFood, between swap_pool and source:

  "swap_affinity": { "type": ["string", "null"], "maxLength": 24, "default": null }

What it is for: swap_affinity groups foods that can genuinely stand in for one another on a plate. Use "cooked_side" for potatoes, cooked cauliflower and green beans; "raw_salad" for cabbage, cucumber and raw spinach; "sauce" for tomato products. Leave it null on any row where the question of substitution does not arise.

It exists because food category alone is too coarse to make a suggestion a dietitian would stand behind. Sorting the vegetable category by potassium answers a 926 mg baked potato with raw cabbage at 60 mg — correct on the numbers and absurd on a plate. Milligrams per serving say nothing about whether one food can replace another. The reference table has to carry what the nutrient columns cannot.

Also add swap_affinity to the AnchorFood CSV import columns, after sodium_category.
```

**After pasting:** re-run the two-account RLS test from M1, then declare schema freeze — *unless you are also doing patch 4, in which case paste patch 4 first and freeze once.*

---

# PATCH 2 — swap engine correctness

```
Change how the food swap engine selects and reports suggestions. Nothing in this change calls an AI model — the swap engine is deterministic and must stay that way.

SELECTION — add one condition and one guard.

When a big-number card fires and you look for a swap:

  remaining = the daily target minus the day's HIGH-end total, or zero if that is negative
  If remaining is zero, there is no swap.

  Build the candidate pool from AnchorFood rows where ALL of these hold:
    - swap_pool is true
    - category matches the flagged item's category
    - base_food differs from the flagged item's base_food
    - AND, when the flagged item's row has a swap_affinity, the candidate carries the SAME swap_affinity
    - the row has a value for the nutrient in question

  From that pool, keep the rows whose HIGH value for the nutrient is at most remaining.
  Sort ascending by the high value and offer at most three.

The affinity condition is not optional polish. Without it the engine answers a 926 mg baked potato with raw cabbage at 60 mg, and pushes cooked cauliflower out of the top three entirely, so the scripted swap suggestion never appears at all.

REPORTING — two different empty results that must not be conflated.

If the flagged item's category (and affinity group, when it has one) contains NO qualifying rows at all, render NO swap line. No swap text of any kind. Say nothing.

Only when the pool HAS candidates but none of them fits today's remaining budget, render:

No swap fits today's remaining {NUTRIENT} budget. Tomorrow is a fresh start — and your care team can help you plan for favorite foods.

The distinction matters because "no swap fits today's remaining budget" blames the user's budget for what is actually a gap in our reference table. On a fresh day with a full budget that sentence is simply false, and a renal dietitian reading the screen would catch it.

The protein guardrail still applies: no swap line, and no other suggestion anywhere in the app, may recommend increasing a portion of meat, poultry, fish or eggs, or describe a protein-heavy meal as safe.
```

**Acceptance test — run all four:**

1. With ~700 mg potassium remaining and the baked potato flagged → the offer is **cooked cauliflower, 88 mg per ½ cup**. If raw cabbage, cucumber, or raw spinach is offered for a potato, affinity is not being enforced and the demo beat is broken.
2. Log *"chili with beans, one cup"* on a fresh day with a full budget → the big-number card renders with **no swap line and no no-fit copy**. mixed_dish has no candidates.
3. Set the day's total so remaining is under 60 mg, then flag the potato → now the no-fit sentence *is* correct and should appear.
4. The integration-credit meter does not move during any of the above.

---

# PATCH 3 — rings, edge states, accessibility

```
Change the dashboard rings, add two missing states, and close four accessibility gaps. Do not add features. Do not change any entity.

═══ PART 1 — RINGS SIDE BY SIDE ═══

Replace the three concentric rings with three EQUAL-SIZE rings SIDE BY SIDE on one card at the top of Home, ordered potassium, phosphorus, sodium, left to right.

Side by side is the decided layout, not a fallback. A concentric inner sodium arc is illegible at phone width; sodium is also the least certain number in the app and should not occupy the most cramped slot; and three separate rings put real visual distance between this and Apple's Activity rings, which may not be replicated.

Below 380px wide, give each nutrient its own horizontal row instead — small ring on the left, text on the right — rather than shrinking the type to keep three across. Shrinking would break the 16px minimum for exactly the users least able to absorb it.

All the existing ring meaning is unchanged: the UNFILLED arc is the budget remaining and renders in a visible muted tone; fill length is the MIDPOINT of the day's range divided by the target; fill colour comes from the HIGH end (green under 70% of target, amber 70 to 100 inclusive, red above 100); status always pairs colour with an icon AND a text label.

LABEL HIERARCHY — this is what makes the ring readable without narration.

Each ring's label reads: {NUTRIENT} — left today

Beneath each ring, in this order:
  - the remaining range, in the largest and boldest type in the column, for example: 900–1,100 mg left
  - beneath that, smaller and in secondary colour, the consumed readout: 1,150–1,400 mg of 2,500 mg
  - beneath that, the status icon and text label

The word "left" must be visible for every nutrient with no interaction. A first-time viewer watching a silent screen recording gets one pass to learn that the empty part of the arc is the subject, and the label — not a voiceover — is what teaches it. The remaining figure stays a RANGE; never collapse it to a single number.

═══ PART 2 — OFFLINE STATE ═══

Add a banner, shown whenever the browser reports it is offline, above everything else on the page:

You're offline. Logging still works — use the food list instead of typing a meal.

Only meal parsing needs the network. Everything else — the rings, totals, the food list, editing, labs — works offline. Say what still works rather than only reporting the failure.

═══ PART 3 — SAVE-FAILURE STATES ═══

On the Settings targets section, if the save fails, show inline:
Couldn't save. Your changes are still here — tap Save changes to try again.

On the Labs screen, if the save fails, show inline:
Couldn't save. Your entries are still here — try again.

Neither may clear what the user typed.

═══ PART 4 — ACCESSIBILITY ═══

1. Every inline error message is announced to screen readers when it appears, not merely displayed. Put each error in a live region.

2. When the delete-confirmation dialog opens, move focus into it. When it closes without deleting, return focus to the control that opened it. When it closes because the record was deleted, do not return focus — that control no longer exists. Pressing Escape closes the dialog the same way the cancel button does.

3. Add a skip link as the first focusable element on the page, reading "Skip to content", jumping to the main content area. It is hidden until focused and clearly visible once focused.

4. Keyboard order, concretely: on every screen the Tab sequence runs top to bottom as laid out, and from the meal input Tab reaches Analyze meal before it reaches the tab bar.

═══ PART 5 — PAGE METADATA (skip if the platform will not accept it) ═══

Page title: RenalRoute — what's left today
Meta description: RenalRoute — an educational potassium, phosphorus, and sodium tracker for people living with chronic kidney disease. Shows what you have left today, as honest ranges.
Never disable user zoom: no user-scalable=no and no maximum-scale anywhere.
```

**Acceptance test:**

1. At 375px the three rings sit side by side; each shows its nutrient name, the words *left today*, and a remaining range as the largest text in its column. At 320px they stack, and no type is under 16px.
2. Silent check: a screen recording with the sound off makes it obvious that the empty arc is what's left. If a viewer has to infer it, Part 1 failed.
3. Turn off the network → the offline banner appears; the food list still logs a meal end to end.
4. Tab from a fresh page load → the first stop is *Skip to content*, and it is visible.
5. Open the delete dialog with the keyboard, press Escape → it closes and focus is back on the Delete control.
6. Trigger a validation error with a screen reader running → it is announced, not just drawn.
7. Reduced motion at OS level still kills every animation, including the ring sweep.

---

# PATCH 4 — schema round 2 (must land before schema freeze)

```
Add one property to the AnchorFood entity. Change nothing else about any entity.

Add to AnchorFood, beside swap_affinity:

  "leachable": { "type": "boolean", "default": false }

Set it true on rows where boiling and draining is a realistic thing to do to that food and the potassium reduction is documented: potatoes in every preparation, sweet potato, carrots, beets, winter squash, and other root and starchy vegetables. Leave it false everywhere else — a raw salad leaf, a glass of milk, or a cola cannot be leached, and offering the option there would teach the wrong thing.

Also add leachable to the AnchorFood CSV import columns, after swap_affinity.

Do NOT set leachable true on a row merely because it is high in potassium. The question the field answers is "can this food be boiled and drained", not "would we like it to be lower".
```

**After pasting:** re-run the two-account RLS test from M1, then declare schema freeze. This is the last schema change in this document.

---

# PATCH 5 — cooking method changes the count

```
Add a cooking-method control to the meal review screen. Nothing here calls an AI model.

═══ WHAT ═══

On the review-before-save screen, for every item whose matched AnchorFood row has leachable = true, show a toggle beneath that item's portion stepper:

  Boiled in plenty of water and drained

When it is ON, recount that item's POTASSIUM only — never phosphorus, never sodium — as:

  low  = the row's potassium low  x portion multiplier x 0.50
  high = the row's potassium high x portion multiplier x 0.75

both rounded to a whole milligram. When it is OFF, the item counts at the row's ordinary scaled value.

When the toggle is on, show beneath the item:

Counted lower because boiling and draining removes potassium. The estimate stays deliberately cautious — published reductions are larger than the one applied here.

═══ CRITICAL IMPLEMENTATION RULE ═══

Always recompute from the ANCHOR ROW, never from the item's current displayed value. Toggling the control off and on repeatedly, or changing the portion while the toggle is on, must land on exactly the same number every time.

Both of those were real bugs when this was first built: multiplying the current value compounds downward on every toggle, and rebuilding the item from the anchor row on a portion change silently discarded the cooking choice. Recomputing from the row with both the portion multiplier and the cooking factor applied together fixes both at once.

The toggle's state is saved with the meal, so editing the meal later reopens with the choice intact.

═══ WHY THESE NUMBERS ═══

Boiling a high-potassium vegetable in plenty of water and draining it removes a large share of its potassium — the literature reports roughly 50% for cubed pieces and up to 75% for shredded or double-boiled. Small pieces and a big pot of water do most of the work. Soaking alone, which is the version of this advice patients are most often given, barely moves it.

The factors above are what REMAINS after boiling, and they are deliberately more cautious than the evidence: published removal is 50-75%, and this claims removal of only 25-50%. Under-stating potassium is the one error direction that is genuinely unsafe here, because it tells someone they have room they do not have. The conservatism runs in the safe direction on purpose. Do not "correct" these factors toward the published figures.

Mark this in your notes as needing a dietitian's sign-off before it is presented as advice: the specific factors are a product choice made conservative against published ranges, not a figure from a guideline.

═══ THE LEARN CARD ═══

Replace the body of the existing "Cooking tip: lowering potassium" card in Settings with these three paragraphs, verbatim:

Boiling and draining high-potassium vegetables — sometimes called leaching — can substantially lower their potassium. Ask your dietitian whether and how to use it for the foods you cook most.

What matters is the water, not the waiting. Soaking alone, which is the version of this advice most people are given, barely changes potassium. Boiling does the work: cut the vegetable small, use a large pot of water, boil for at least ten minutes, then drain and discard that water. Studies of potatoes report roughly half the potassium removed this way, and more when the pieces are shredded or boiled twice.

When you tell RenalRoute a potato was boiled and drained, it counts it lower — but by less than those studies found, because counting too little potassium is the mistake that matters here.
```

**Acceptance test:**

1. Log a baked potato with skin (926 mg K). The toggle appears. Turn it on → potassium reads **463–695 mg**. Turn it off → back to 926. Toggle five more times → still exactly 463–695 and 926. Any drift means it is compounding.
2. With the toggle ON, change the portion from 1× to 2× → **926–1,390 mg**, and the toggle is still on. If the toggle resets or the number is 1,852, the portion change is discarding the cooking choice.
3. Log a glass of milk → **no toggle appears**. Log a cola → no toggle.
4. Save the meal, reopen it from the meal list, tap Edit → the toggle is still on and the number is unchanged.
5. Phosphorus and sodium are byte-identical with the toggle on and off.

---

# PATCH 6 — label checker

```
Add a Label screen. It reads an ingredient list and names what it finds. Nothing is logged, nothing is sent to an AI model, and nothing is stored.

═══ THE SCREEN ═══

Reachable from Home as a secondary action reading "Check a label", and from the tab bar if you have room; two taps maximum from Home either way.

A multiline text field, label: "Paste or type the ingredient list"
Helper: "Copy it off the packet — RenalRoute names the phosphate additives, added potassium, and salt substitutes it recognises."

Results update as the user types. Do not put a button on this; there is no cost to running it and no reason to make someone ask twice.

Empty state, before anything is typed:
Paste an ingredient list above and RenalRoute will name what it finds.

═══ WHAT IT RUNS ═══

Exactly the three detectors the log flow already uses — the same code, the same lists, no second implementation:

  - the phosphate-additive detector (the PHOS names and E-numbers from M5 Template 3)
  - the two-tier potassium-additive detector (M5 Templates 4 and 5)
  - the salt-substitute detector (M5 Template 2)

Render each finding as the same flag card the log flow renders, with the same wording and the same closing disclaimer line. The Tier-2 potassium note stays visually quiet — muted, no warning chip — exactly as it does elsewhere. Flagging a diet soda as a hyperkalaemia risk because it contains potassium sorbate is a quantitative error a renal dietitian spots instantly.

ONE FIX to carry across into the shared detector: when several phosphate names match, report the LONGEST match, not the first. "Sodium acid pyrophosphate" was being reported as "pyrophosphate", which names a different additive than the one on the packet.

═══ THE EMPTY RESULT — THE PART THAT MATTERS ═══

When nothing is found, do NOT say the food is safe. Render:

Nothing flagged in what you pasted.

That means none of the phosphate additives, added-potassium ingredients, or salt substitutes RenalRoute knows by name appeared in this list. It does not mean the food has none — additive names change, and some ingredients are grouped under general terms. When in doubt, ask your care team.

Finding nothing is not the same as there being nothing. The detector holds a finite list of names and E-numbers, manufacturers rename things, and "natural flavouring" can cover a lot. Saying what was checked is honest; declaring the food clear is not. This paragraph is the whole reason the screen is defensible in front of a clinician — do not shorten it.

═══ ALWAYS-ON TEACHING CARD ═══

Below the results, in every state including empty:

The trick worth remembering

Any ingredient containing "PHOS" is added phosphate, and added phosphate is absorbed almost completely — over 90%, against under 40% from plant foods. It rarely appears on the nutrition panel, so the ingredient list is the only place it shows. The same goes for potassium: two words where one of them is potassium is worth a second look.
```

**Acceptance test:**

1. Paste `flour, water, sodium acid pyrophosphate, salt` → the phosphate card names **sodium acid pyrophosphate**, not "pyrophosphate".
2. Paste `sugar, water, potassium sorbate` → the quiet Tier-2 note only. **No warning chip, no alarm styling.**
3. Paste `potassium chloride, maltodextrin` → the Tier-1 warning card **and** the salt-substitute card.
4. Paste `flour, water, yeast, salt` → the "Nothing flagged" card with the full paragraph. If the copy has been shortened to "no additives found", it failed.
5. The teaching card is present in all four cases.
6. The integration-credit meter does not move at any point.

---

# PATCH 7 — faster logging

```
Five changes to how a meal gets logged. None of them calls an AI model except where stated.

═══ PART 1 — SEARCH THAT FORGIVES WORD ORDER ═══

Replace the food-list search. It currently matches a normalized prefix, so "potato baked" finds nothing while "baked potato" works. That is a bug the user reads as an empty database.

New behaviour: split what the user typed into tokens of two or more characters. Keep every AnchorFood row whose name-plus-aliases contains ALL of the tokens, in any order. Then rank:

  exact match on the food name        + 1000
  exact match on an alias             +  800
  name starts with the whole query    +  600
  an alias starts with the whole query+  400
  name contains the whole query       +  120
  each token found in the name        +   40 each
  minus the length of the food name          (prefer the plainer name)

Show the top twelve. "potato baked", "baked potato", and "potato with skin" must all find the baked-potato rows.

═══ PART 2 — ONE-TAP REPEAT ═══

On Home, above the meal list, show up to three "Log again" buttons for the meals this user logs most often.

Building the list: take every past meal where every item matched an anchor row and no item is uncounted — those are the only meals that can be replayed exactly. Group them by the set of anchor rows and portions they contain, so the same breakfast logged on five days is one entry with a count of five. Sort by count, then by most recent. Take three.

Each button shows the item names and either "logged once" or "logged N times".

Tapping one logs that meal onto today immediately, with an undo toast. Re-resolve the anchor rows NOW rather than copying the old numbers forward — that way a corrected reference value flows into the copy instead of the stale figure being duplicated.

Show nothing at all when there is nothing worth repeating. An empty shelf is worse than no shelf.

Card heading: Log again
Card note: One tap. No AI, no waiting.

═══ PART 3 — DICTATION ═══

If the browser supports speech recognition, show a microphone button beside the meal text field. If it does not, do not show the button at all — do not show a disabled one, and do not explain the absence.

While listening: the button is visibly active and the field fills with what is being said, appended to whatever was already typed. Tapping again stops. Stop automatically after a pause.

If the browser reports the microphone was blocked, show inline beside the field:
Microphone access is off, so dictation can't run — typing still works.

This is progressive enhancement. It ships on Chrome and Android and not everywhere, and the app must be identical without it.

═══ PART 4 — DRAFT AND RESUME ═══

Save what the user has typed into the meal field as they type it, locally on the device. On returning to the log screen, restore it and show a quiet note above the field:

Picked up where you left off.

Clear the draft when the meal is saved or when the user clears the field.

Separately: remember which screen the user was on and reopen there on the next visit, EXCEPT that the consent gate always wins and a paused-coaching banner is always visible on arrival.

Use device-local storage for both. Do NOT add entity fields for this — the schema is frozen, and a half-typed meal is not something to sync across devices.

═══ PART 5 — UNDO ON DELETE ═══

Keep the delete confirmation dialog exactly as it is. After the deletion goes through, show a toast for about eight seconds:

Meal deleted.  [Undo]

Undo restores the meal with its original items, totals, and timestamp — not as a new entry logged now. The rings recompute both ways.

If the toast times out, the deletion stands. Do not add a trash screen; there is nothing to manage.
```

**Acceptance test:**

1. Search `potato baked` → the baked-potato rows appear. Search `skin potato` → same.
2. Log the same anchor-only meal three times → a "Log again" button appears reading "logged 3 times". Tap it → the meal lands on today and the rings move. **The integration-credit meter does not move.**
3. Log a meal containing an uncounted item three times → it never appears in "Log again".
4. On Chrome/Android the microphone button appears; on Safari it is absent, not disabled.
5. Type half a meal, reload the page → the text is back with the "Picked up where you left off" note.
6. Delete a meal, tap Undo → it returns with its original timestamp, not as a fresh entry.
7. Delete a meal, wait ten seconds → it is gone for good.

---

# PATCH 8 — the week

```
Add a seven-day view and two export formats. Neither calls an AI model.

═══ PART 1 — SEVEN DAYS, AS BANDS ═══

On Home, below the meal list, show the last seven days for each nutrient — oldest on the left, today on the right.

Draw each day as a BAND, not a point on a line: a vertical bar from that day's low total to its high total. Draw the daily target as a dashed horizontal line across the chart.

Do not draw a trend line. A line asserts that consecutive points are comparable and that the slope between them means something, and neither holds here: every daily figure is a range that can span several hundred milligrams, and the width of that range varies day to day with how much of the meal matched the reference table. A line through the midpoints would render a change in data quality as if it were a change in what somebody ate — the same false-precision failure the rings were designed to avoid, stretched across a week.

Days with nothing logged are drawn BLANK. Never as zero. Zero is a real value and means someone ate nothing.

Give each chart a full text alternative for screen readers, naming each logged day and its range, the target, and how many of the seven days were logged.

Heading: Your last 7 days
Note: Each bar is that day's range, not a single number — taller means less certain. The dashed line is your target.
Footer note: Useful to show your care team. Days with nothing logged are left blank rather than counted as zero.

═══ PART 2 — EXPORT ═══

Two buttons in Settings, under a heading "Your data".

BUTTON ONE — "Copy a summary for my care team" — produces plain text covering the last seven days and puts it on the clipboard (and offers it as a download where that is possible):

  a title line
  the display name, if there is one
  the date generated
  the daily targets, WITH their provenance spelled out — "set with care team", or "general education ranges, NOT prescribed", or "no targets set"
  the most recent lab values, marked as self-entered
  each of the last seven days: the date, the meals, and the day's low-high totals per nutrient
  a closing paragraph stating that every figure is an estimated range from an educational reference table, not a measurement, and that the app is not a medical device

"Bring your food diary" is advice patients get constantly and almost nobody can act on, because what they have is an app they would have to hand over and scroll through in front of someone whose time is measured in minutes. A page of plain text is something you can print, paste into an email, or read aloud.

The provenance line is not optional. A target means something completely different depending on who set it, and that is the first thing a dietitian will want to know.

BUTTON TWO — "Download my data (CSV)" — one row per logged item, with columns for date, time, meal text, item name, portion, source (matched / estimated / not counted), and the low and high milligrams for each of the three nutrients. Include the same closing statement as a comment row at the top.

CSV SAFETY — do this or the file is a security finding: any cell whose text begins with =, +, -, @, tab, or carriage return must be prefixed with a single quote before it is written. Meal text is free text typed by the user, and a spreadsheet will execute a leading = as a formula.

Both exports state, inside the file itself, that the figures are ranges from an educational reference table rather than measurements. A number that leaves the app loses the interface that framed it, so the framing has to travel with it.
```

**Acceptance test:**

1. Log meals on three of the last seven days → three bands render; the other four days are blank, not zero-height bars sitting on the axis.
2. A day whose meal was mostly estimated shows a visibly taller band than a day that was fully matched.
3. With a screen reader, the chart reads out each logged day and its range.
4. Export a summary while on education-default targets → the text says **"general education ranges, NOT prescribed"**.
5. Log a meal named `=1+1` and export the CSV → the cell reads `'=1+1`. Open it in a spreadsheet; nothing evaluates.
6. Both exports contain the not-a-measurement statement.

---

# PATCH 9 — honesty surfaces

```
Three places where the app shows the user what it does and does not know. None of them calls an AI model.

═══ PART 1 — COVERAGE PANEL ═══

Add a card in Settings, under the Learn section:

What this build doesn't know

RenalRoute works from a curated table of published food values. It is deliberately small, and it has holes. Those holes are listed here rather than hidden, because a number you cannot see the limits of is worth less than one you can.

Then, computed from the actual reference table at render time — not typed in as a fixed sentence:

  Missing values: sodium on N of M foods, phosphorus on N, potassium on N.
  Where a value is missing, the food is still logged and still counted for the nutrients we do have — that nutrient is simply left out of the total, and the day is marked as partial rather than quietly summing as though nothing were absent.

  No swap suggestions for: [the categories with fewer than two swap_pool rows].
  These food groups have too few lower-potassium members in the table for a swap to be worth suggesting, so no swap line appears for them at all. That is a gap in our data, not a verdict that no better option exists.

  Every value here is transcribed test data awaiting a re-check against USDA FoodData Central. Open any food in a meal to see its source and which of its numbers are still unverified.

Compute the counts live. A hard-coded number goes stale the moment the CSV is corrected, and a stale honesty panel is worse than none.

═══ PART 2 — PER-FOOD PROVENANCE ═══

Every AnchorFood row already carries a source citation and a list of which of its nutrients are still unverified. The app has been tracking both and showing the user neither.

On the meal detail screen, under each matched item, show:

  {Food name}, per {serving}. Values from {source}.

and, when that row has unverified nutrients:

  Not yet re-checked against USDA FoodData Central: {list}. Those figures are the ones most likely to move, and they are shown as ranges for that reason.

Claiming "these are estimates" while withholding which ones and why is asking for trust the interface could simply have earned.

═══ PART 3 — LOW-POTASSIUM BADGE ═══

In the food picker, show a small badge on any row whose HIGH potassium value is 150 mg or less per serving, reading: Low potassium

Tapping or hovering the badge explains:

150 mg of potassium or less per serving — the American Kidney Fund's own cut-off for calling a serving low potassium. It describes this serving, not the whole day.

Unlike almost every other threshold in this app, 150 mg is not a product choice — it is a published threshold from a patient-education source, used exactly as published. State the source in the explanation, because that is what makes it worth showing.

The badge labels a serving. It never adds, subtracts, or reweights a milligram anywhere in the app, so a mislabelled row costs a reader a second look rather than a wrong total. Do not let it influence sorting, swaps, or totals.
```

**Acceptance test:**

1. The coverage panel's counts match the actual table. Correct one missing sodium value in the CSV, reload → the count drops by one. If it does not, it is hard-coded.
2. Open a meal containing the baked potato → its source line reads "AKF/USDA" and its unverified list names phosphorus and sodium.
3. In the picker, cucumber carries the badge; the baked potato does not. The badge explanation names the American Kidney Fund.
4. Turning the badge on or off changes no total, no ring, and no swap suggestion.

---

# PATCH 10 — display controls

```
Give the user control over how the app looks. None of this calls an AI model or touches an entity.

═══ PART 1 — DARK MODE ═══

Follow the operating system by default. Add a three-way control in Settings: Auto / Light / Dark.

Auto is the default because a phone in a hospital waiting room at 4pm and the same phone in bed at 11pm are different problems, the OS already knows which one it is, and most people never touch a theme control.

Apply the saved preference BEFORE the first paint. A flash of the wrong theme on every load is a bug people can see.

Define the dark palette ONCE and map it, rather than restating colours in two places. Every status colour must be re-checked for contrast against the dark surface — the amber in particular fails on dark if it is simply carried over.

═══ PART 2 — TEXT SIZE ═══

A three-way control in Settings: Normal / Large / Larger.

Scale the app's type SCALE, not the page zoom. Zoom breaks layout and reintroduces horizontal scrolling, which is a hard-fail. Scaling the type tokens keeps the grid intact and keeps every tap target at 44px or more.

At the largest setting, nothing may overflow horizontally at 320px width.

The explicit control exists because the OS setting is not always available in a browser, and the target user is older than the median app user.

═══ PART 3 — HIGHER CONTRAST ═══

A toggle in Settings: Higher contrast.

When on, darken the text tones, strengthen borders, and increase the ring track's contrast against the card. Do not change any status colour's MEANING — green stays green — only its legibility.

═══ PART 4 — DELETE ALL DATA ═══

In Settings, a destructive action: Delete all my data.

Behind a confirmation naming what goes: meals, labs, targets, and settings. On confirmation, everything for this user is removed and the app returns to first run, consent gate included.

Someone who tries a health app and decides against it should be able to leave cleanly. It is also the honest counterpart to the consent gate.

═══ PART 5 — OFFLINE AND INSTALLABLE (skip if the platform will not accept it) ═══

Register a service worker that serves the app shell offline, and add a web manifest so the app can be installed to a home screen.

The service worker must be NETWORK-FIRST with a cache fallback — never cache-first. A cache-first worker will serve a stale build to a judge who visited the day before, and there is no way to tell them to hard-refresh. Freshness beats speed here.

Never cache any API or model call. Only the shell, styles, scripts, and manifest.
```

**Acceptance test:**

1. Set the OS to dark, load the app → it opens dark with no flash of light. Set the control to Light → it stays light across a reload.
2. In dark mode, measure the amber status colour against the card background with a contrast tool. If it was carried over from light mode unchanged, it fails.
3. Set text size to Larger at 320px width → no horizontal scrollbar anywhere, every tap target still 44px or more.
4. Delete all data → the consent gate reappears.
5. With the service worker registered, deploy a change and reload → **the new version loads.** If the old one appears, it is cache-first and must be fixed before judging.

---

# PATCH 11 — barcode lookup

> **Read this before pasting.** In the website build this calls a same-origin proxy that forwards to Open Food Facts, because the page's own security policy forbids the browser from reaching a foreign origin directly. Base44 has no equivalent constraint *and no obvious place to put a proxy*. Before spending credits here, ask in Discuss mode (≈0.3) whether a generated page may call a public third-party HTTP endpoint at runtime, and what the platform's stance is on it. **If the answer is unclear, skip this patch.** It is the lowest-value item in this document and the only one that introduces an outbound network dependency the security scan will look at.

```
Add barcode lookup to the Label screen. This is the ONLY feature in the app that contacts anything outside the platform, and it never sends user data — only a barcode number.

═══ TWO WAYS IN, AND TYPING IS THE BASELINE ═══

A number field: "Barcode number", accepting 8 to 14 digits, with a "Look up" button.
Beside it, ONLY IF the browser supports barcode detection, a "Scan with camera" button.

Manual entry is the baseline, not the fallback. Camera barcode detection ships on Chrome and Android and not everywhere, and a feature that only exists on some phones cannot be the only way to use a screen.

Validate before calling anything:
That doesn't look like a barcode — it should be 8 to 14 digits.

═══ THE LOOKUP ═══

Query the Open Food Facts public database by barcode. Send the barcode and nothing else — never a lab value, never a target, never a name, never a meal.

Take only four things from the response: the product name, the brand, the ingredient text, and the barcode you asked for. Ignore everything else and never render the raw response.

On success, fill the ingredient field below with the returned ingredient text and run the existing label detectors on it:
Found {product}. Ingredients filled in below — check they match the packet.

═══ A MISS MUST READ AS A MISS ═══

That barcode isn't in the open database. That tells you nothing about the food — plenty of products simply are not listed. Type the ingredients in below instead.

Open Food Facts is crowd-sourced and incomplete. "Not found" reading as "nothing to worry about" is exactly the false reassurance this whole screen exists to avoid.

Listed but with no ingredient list:
{product} is listed, but without an ingredient list. Type the ingredients in below instead.

Lookup failed:
The lookup didn't work just now. You can still type the ingredients in below.

Offline:
You're offline, so the lookup can't run — but typing the ingredients in below still works.

═══ CAMERA ═══

If the camera is refused or unavailable:
The camera is unavailable, so enter the number by hand instead.

While scanning, show a live preview and: Point the camera at the barcode.
Stop the camera and release the stream when a code is found, when the user cancels, or when the screen is left. A camera left running is a battery and privacy problem.
```

**Acceptance test:**

1. Enter `abc` → the validation message, and no network request is made.
2. Enter a real barcode for a product that exists → the ingredient field fills and the detectors run on it.
3. Enter `00000000` → the "isn't in the open database" copy. If it reads as reassurance, it failed.
4. Go offline and look up → the offline message; typing ingredients still works.
5. Refuse camera permission → the fallback message; manual entry still works.
6. Leave the screen mid-scan → the camera indicator turns off.

---

# PATCH 12 — the desktop rail

```
Give the desktop layout a left rail. Nothing here calls an AI model or touches an entity.

At 900px wide and above, replace the bottom tab bar with a fixed left rail about 260px wide. Below 900px nothing changes — the bottom tab bar stays exactly as it is.

At 1440px the app currently renders as a phone-width column in the middle of a monitor with an empty left third. The rail is what that space is for.

THE RAIL CARRIES, TOP TO BOTTOM:

  1. The app name and mark.
  2. The four navigation items — Home, Log, Labs, Settings — each with its icon AND its text label, active state shown by fill and tint, never tint alone. Every target 44px or more.
  3. A glance block: today's remaining range for each nutrient, as a short horizontal bar with the nutrient name and the remaining figure. Same numbers as the rings, same colour rules, updated whenever the rings update.
  4. Two direct actions: "Log a meal" and "Check a label".
  5. One rotating educational fact from the existing static set.
  6. A footer line: Educational estimates. Not medical advice.

The glance block is the point. A desktop user reading the rail should be able to answer "how much room do I have left?" without their eyes leaving the left column.

At 1180px and above, also give Home a two-column content layout: rings and today's meals in the main column, trends and the quick-add shelf beside them, rather than one long scroll down the middle of a wide screen.

If the platform's generated layout will not take a rail, keep the bottom tab bar at all widths and cap content at 960px. A working phone layout on a desktop is acceptable; a broken rail is not.
```

**Acceptance test:**

1. At 1440px the rail is present, the bottom tab bar is gone, and the glance figures match the rings exactly.
2. At 899px the bottom tab bar is back and the rail is gone.
3. Log a meal → the rail's glance figures move with the rings.
4. Every rail item has a visible text label and a 44px target.
5. Tab order runs down the rail and then into the content, not the other way around.

---

## Ordering and dependencies

```
PATCH 1 ─┐
PATCH 4 ─┴─► schema freeze ──► everything else
                │
                ├─► PATCH 2  (needs 1)
                ├─► PATCH 5  (needs 4)
                ├─► PATCH 6 ─► PATCH 11  (11 needs 6's screen to exist)
                ├─► PATCH 3
                ├─► PATCH 7
                ├─► PATCH 8
                ├─► PATCH 9
                ├─► PATCH 10
                └─► PATCH 12
```

Patches 1 and 4 are the only ordering constraint that costs anything to get wrong — both are schema, and reopening a frozen schema means re-running the two-account RLS test and a re-scan. **Paste them together, freeze once.**

Patch 11 needs patch 6's screen to exist first. Everything else is independent; paste in whatever order your remaining credits allow, following the cut line in the budget table.

---

## What is still true from v1

The three things v1 said were not transferable are still not transferable, and one thing v1 flagged as outstanding is now resolved:

- v1 ended with *"Patch 3's five items exist in the website and in this file, but the modules document does not yet carry them."* That is still true, and it now applies to patches 4–12 as well. **`RenalRoute_build_modules.md` is the frozen build spec for M0–M8; this file is the delta on top of it.** If you want one document, the merge is mechanical but not free — say so and it can be done.
- The website's five test suites (453 assertions) do not transfer. The acceptance tests printed under each patch above are the part that does.
