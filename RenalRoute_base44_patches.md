# RenalRoute — Base44 transfer package

Everything that changed after Fable's original Layer 1 plan, and the paste-ready prompts to put it into Base44.

---

## Read this first — which path are you on?

**If you have NOT pasted M0–M8 into Base44 yet:** paste the hardened modules from `RenalRoute_build_modules.md` as normal. E1–E35 are already baked into them. Then paste **PATCH 3 only** (the five UI items below that were built on the website but never mirrored into the modules doc). Skip patches 1 and 2 — they are already in M1 and M5.

**If you have ALREADY pasted some or all modules:** paste patches 1 → 2 → 3 in order. Patch 1 is a schema change, so it must land before you declare schema freeze.

**Budget:** three pastes, roughly 1.5 + 1.5 + 2.0 = **5 credits**. If you are tight, Patch 2 is the one that must not be skipped — it fixes a demo-breaking defect.

---

## Change inventory — what differs from the original plan

### A · Found by the verification pass (already in `RenalRoute_build_modules.md`)

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

### B · Found by building and testing it (new since the plan)

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

### C · Does NOT transfer to Base44 — do not try

| Website change | Why it stays here |
|---|---|
| HSTS, COOP, CORP, CSP, Permissions-Policy in `vercel.json` | Base44 manages hosting headers. Not team-configurable. Document them as platform-managed in the security notes; do not spend credits fighting them. |
| `/api/invoke-llm` origin + content-type checks | Base44's `InvokeLLM` is server-side already; there is no custom endpoint to protect. |
| `<meta>` tags, `theme-color`, `viewport-fit` | Base44 owns the page shell. Try Patch 3's last paragraph; if the platform will not take it, drop it — it is polish, not correctness. |

---

# PATCH 1 — schema (must land before schema freeze)

```
Add one property to the AnchorFood entity. Change nothing else about any entity.

Add to AnchorFood, between swap_pool and source:

  "swap_affinity": { "type": ["string", "null"], "maxLength": 24, "default": null }

What it is for: swap_affinity groups foods that can genuinely stand in for one another on a plate. Use "cooked_side" for potatoes, cooked cauliflower and green beans; "raw_salad" for cabbage, cucumber and raw spinach; "sauce" for tomato products. Leave it null on any row where the question of substitution does not arise.

It exists because food category alone is too coarse to make a suggestion a dietitian would stand behind. Sorting the vegetable category by potassium answers a 926 mg baked potato with raw cabbage at 60 mg — correct on the numbers and absurd on a plate. Milligrams per serving say nothing about whether one food can replace another. The reference table has to carry what the nutrient columns cannot.

Also add swap_affinity to the AnchorFood CSV import columns, after sodium_category.
```

**After pasting:** re-run the two-account RLS test from M1, then declare schema freeze.

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

## Not yet mirrored into `RenalRoute_build_modules.md`

Patch 3's five items (side-by-side ring detail, offline banner, skip link, Escape-to-close, page metadata) exist in the website and in this file, but the modules document does not yet carry them. If you want that document to stay the single source of truth for the Base44 build, say so and I will fold them in.
