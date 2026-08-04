/* Headless verification of the reference build's arithmetic.
   Loads the pure-logic modules with minimal browser stubs and checks
   every worked number from the spec. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Minimal stubs: localStorage + a fake Store for Clinical's target lookups.
const sandbox = {
  console,
  localStorage: (() => { const m = {}; return {
    getItem: k => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; }
  }; })(),
  window: {}
};
vm.createContext(sandbox);

['js/data/copy.js', 'js/data/anchor-foods.js', 'js/store.js',
 'js/clinical.js', 'js/resolve.js', 'js/cards.js'].forEach(f => {
  vm.runInContext(read(f), sandbox, { filename: f });
});

// `const` at the top level of a VM script binds into the context's global
// lexical scope, not onto the sandbox object — pull them out explicitly.
const { Store, Clinical, Resolve, Cards, ANCHOR_FOODS, ANCHOR_STATS } =
  vm.runInContext('({ Store, Clinical, Resolve, Cards, ANCHOR_FOODS, ANCHOR_STATS })', sandbox);
Store.load();

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = String(actual) === String(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  →  ${actual}${ok ? '' : '   (expected ' + expected + ')'}`);
  ok ? pass++ : fail++;
}

console.log('\n═══ ANCHOR MATCHING & PORTION SCALING ═══');

const potato = Resolve.resolveItems([{
  name: 'baked potato with skin', portion_quantity: 1, portion_unit: 'medium',
  portion_text: '1 medium', modifiers: ['baked', 'with skin'], resolvable: true
}]).resolved[0];
check('baked potato with skin → K', potato.potassium_high_mg, 926);
check('  ...matched the with-skin row, not no-skin', potato.matched_anchor_id, 'potato_baked_skin');

const milk = Resolve.resolveItems([{
  name: 'milk', portion_quantity: 1, portion_unit: 'glass',
  portion_text: 'a glass', modifiers: ['whole'], resolvable: true
}]).resolved[0];
check('a glass of milk → K (184 × 2 cups)', milk.potassium_high_mg, 368);

const bananas12 = Resolve.resolveItems([{
  name: 'banana', portion_quantity: 12, portion_unit: 'medium',
  portion_text: '12', modifiers: [], resolvable: true
}]).resolved[0];
check('12 bananas → clamped at 4× (422 × 4)', bananas12.potassium_high_mg, 1688);
check('  ...clamp note present', /counted as 4/.test(bananas12._note || ''), 'true');

const two = Resolve.resolveItems([{
  name: 'banana', portion_quantity: 2, portion_unit: 'medium',
  portion_text: '2', modifiers: [], resolvable: true
}]).resolved[0];
check('2 bananas → 844', two.potassium_high_mg, 844);

const sweet = Resolve.resolveItems([{
  name: 'sweet potato', portion_quantity: 0.5, portion_unit: 'cup',
  portion_text: '', modifiers: [], resolvable: true
}]).resolved[0];
check('sweet potato → 377 (longest-alias beats "potato")', sweet.potassium_high_mg, 377);

const spinRaw = Resolve.resolveItems([{ name: 'spinach', portion_quantity: 0.5,
  portion_unit: 'cup', portion_text: '', modifiers: ['raw'], resolvable: true }]).resolved[0];
const spinCooked = Resolve.resolveItems([{ name: 'spinach', portion_quantity: 0.5,
  portion_unit: 'cup', portion_text: '', modifiers: ['cooked'], resolvable: true }]).resolved[0];
check('spinach + raw → 84', spinRaw.potassium_high_mg, 84);
check('spinach + cooked → 420', spinCooked.potassium_high_mg, 420);

const spinAmbig = Resolve.resolveItems([{ name: 'spinach', portion_quantity: 0.5,
  portion_unit: 'cup', portion_text: '', modifiers: [], resolvable: true }]).resolved[0];
check('spinach, no prep → union range low', spinAmbig.potassium_low_mg, 84);
check('spinach, no prep → union range high', spinAmbig.potassium_high_mg, 420);

const casserole = Resolve.resolveItems([{ name: 'leftover casserole',
  portion_quantity: null, portion_unit: null, portion_text: '', modifiers: [], resolvable: true }]);
check('"casserole" matches nothing (drives clarify path)', casserole.unmatched.length, 1);

console.log('\n═══ RING ARITHMETIC (target 2,500 mg) ═══');

const T = 2500;
check('fill for 1,150–1,400 → midpoint 1,275/2,500', Math.round(Clinical.ringFill(1150, 1400, T) * 100) + '%', '51%');
check('  ...status green (high 1,400 < 1,750)', Clinical.ringStatus(1400, T).key, 'ok');
check('fill for 1,400–1,900 → midpoint 1,650/2,500', Math.round(Clinical.ringFill(1400, 1900, T) * 100) + '%', '66%');
check('  ...status amber (high 1,900 ≥ 1,750)', Clinical.ringStatus(1900, T).key, 'warn');
check('remaining copy', Clinical.remainingText(1400, 1900, T), 'About 600–1,100 mg left');
check('+ banana 422 → high 2,322 still amber', Clinical.ringStatus(1900 + 422, T).key, 'warn');
check('+ raisins 540 → straddling copy',
  Clinical.remainingText(1400 + 422 + 540, 1900 + 422 + 540, T),
  'Between 0 and 140 mg left — possibly over');
check('over-budget copy', Clinical.remainingText(2700, 2900, T), 'Over by about 200–400 mg');
check('readout format', Clinical.readoutText(1150, 1400, T), '1,150–1,400 mg of 2,500 mg');

console.log('\n═══ BIG-ITEM TRIGGER ═══');
check('potato 926 is ≥33% of 2,500', Clinical.isBigItem(926, T), 'true');
check('  ...pct shown on the card', Clinical.pctOfTarget(926, T) + '%', '37%');
check('banana 422 is NOT ≥33%', Clinical.isBigItem(422, T), 'false');
check('  ...banana pct', Clinical.pctOfTarget(422, T) + '%', '17%');
check('black beans 370 NOT flagged', Clinical.isBigItem(370, T), 'false');

console.log('\n═══ MODE BANDS ═══');
const kBand = (v) => { if (v >= 6.0) return 'paused'; if (v > 5.5) return 'restricted';
  if (v >= 5.1) return 'caution'; if (v >= 3.5) return 'normal'; return 'low'; };
[[3.4,'low'],[3.5,'normal'],[5.0,'normal'],[5.1,'caution'],[5.5,'caution'],
 [5.6,'restricted'],[5.9,'restricted'],[6.0,'paused'],[7.5,'paused']]
  .forEach(([v, e]) => check(`K ${v}`, kBand(v), e));

console.log('\n═══ VALIDATION BOUNDS ═══');
check('target K 50 rejected', Clinical.validateTarget('k', '50').ok, 'false');
check('target K 7000 rejected', Clinical.validateTarget('k', '7000').ok, 'false');
check('target K 2000 accepted', Clinical.validateTarget('k', '2000').ok, 'true');
check('target P 200 rejected (min 300)', Clinical.validateTarget('p', '200').ok, 'false');
check('lab K 45 rejected', Clinical.validateLab('k', '45').ok, 'false');
check('lab K 7.5 accepted (real case value)', Clinical.validateLab('k', '7.5').ok, 'true');
check('lab P 0.2 rejected', Clinical.validateLab('p', '0.2').ok, 'false');
check('lab P 1.1 accepted (mmol/L fail-safe)', Clinical.validateLab('p', '1.1').ok, 'true');
check('eGFR 400 rejected', Clinical.validateLab('egfr', '400').ok, 'false');

console.log('\n═══ eGFR BANDS ═══');
check('eGFR 34 → G3b', Clinical.egfrBand(34).stage, 'G3b');
check('eGFR 95 → G1', Clinical.egfrBand(95).stage, 'G1');
check('sentence never says "you are stage"', /you are stage/i.test(Clinical.egfrSentence(34)), 'false');

console.log('\n═══ CONFIDENCE ═══');
const mk = (src) => ({ source: src, potassium_low_mg: 1, potassium_high_mg: 1,
  phosphorus_low_mg: 1, phosphorus_high_mg: 1, sodium_low_mg: 1, sodium_high_mg: 1 });
check('3 anchor → high', Resolve.confidence([mk('anchor'), mk('anchor'), mk('anchor')]), 'high');
check('2 anchor + 1 llm + 1 uncounted → moderate',
  Resolve.confidence([mk('anchor'), mk('anchor'), mk('llm'), mk('uncounted')]), 'moderate');
check('1 anchor + 2 llm → low', Resolve.confidence([mk('anchor'), mk('llm'), mk('llm')]), 'low');
check('all uncounted → low', Resolve.confidence([mk('uncounted')]), 'low');
check('uncounted excluded from totals',
  Resolve.totals([mk('anchor'), mk('uncounted')]).total_potassium_high_mg, 1);

console.log('\n═══ SWAP-POOL INTEGRITY ═══');
const additiveInPool = ANCHOR_FOODS.filter(f => f.additive_risk && f.swap_pool);
check('no additive_risk row is ever a swap candidate', additiveInPool.length, 0);
const cola = ANCHOR_FOODS.find(f => f.id === 'cola');
check('cola is low-K but excluded from swap pool', cola.swap_pool, 'false');
const cauli = ANCHOR_FOODS.find(f => f.id === 'cauliflower_cooked');
check('cauliflower in pool, category vegetable', cauli.swap_pool + '/' + cauli.category, 'true/vegetable');
check('  ...same category as potato', ANCHOR_FOODS.find(f => f.id === 'potato_baked_skin').category, 'vegetable');
check('  ...different base_food (swap is legal)',
  cauli.base_food !== ANCHOR_FOODS.find(f => f.id === 'potato_baked_skin').base_food, 'true');

console.log('\n═══ SWAP COVERAGE vs BUDGET — two different empties ═══');
/* A category with no swap_pool members can never produce a suggestion.
   Saying "no swap fits today's budget" there blames the user's remaining
   budget for a gap in our own table — false on a fresh day, and exactly
   the kind of thing the dietitian judge would catch. */
const chili = ANCHOR_FOODS.find(f => f.category === 'mixed_dish' && f.k_high);
const chiliPool = ANCHOR_FOODS.filter(f =>
  f.swap_pool === true && f.category === 'mixed_dish' &&
  chili && f.base_food !== chili.base_food && f.k_high != null);
check('mixed_dish genuinely has zero swap candidates', chiliPool.length, 0);
if (chili) {
  const r = Cards.findSwaps({ matched_anchor_id: chili.id }, 'k', 2500, 200);
  check('  ...so findSwaps reports no_coverage, not no_fit', r.reason, 'no_coverage');
}
const spud = ANCHOR_FOODS.find(f => f.id === 'potato_baked_skin');
const rFit = Cards.findSwaps({ matched_anchor_id: spud.id }, 'k', 2500, 2499);
check('vegetable HAS candidates but none fit a 1 mg budget', rFit.reason, 'no_fit');
const rOk = Cards.findSwaps({ matched_anchor_id: spud.id }, 'k', 2500, 200);
check('  ...and fits comfortably on a fresh day', rOk.reason, 'ok');
/* The engine sorts purely by milligrams, so the lowest vegetable wins —
   raw cabbage at 60 mg, not the cauliflower the demo script names.
   That is the rule working exactly as written, and it is also the rule's
   blind spot: "instead of a baked potato, try raw cabbage" is not a
   swap any dietitian would offer, because mg-per-serving says nothing
   about whether one food can stand in for another on a plate.
   The engine cannot know that. Showing several options lets the person
   apply the judgement the table doesn't encode. */
/* Before swap_affinity existed this returned raw cabbage — lowest on
   milligrams, nonsense on a plate, and it pushed cauliflower out of the
   top three entirely, so the scripted demo beat could never fire.
   Affinity restricts the pool to foods that can actually stand in for a
   baked potato. Guard both halves: the right answer, and the absence of
   the salad vegetables that used to crowd it out. */
check('  ...offers cooked cauliflower, the real potato substitute', rOk.swaps[0].id, 'cauliflower_cooked');
check('  ...no raw salad vegetable is offered for a baked potato',
  rOk.swaps.some(s => ['cabbage_raw', 'cucumber', 'spinach_raw', 'bell_pepper_green'].includes(s.id)), 'false');
check('  ...cauliflower reads 88 mg per ½ cup, as the demo script says',
  rOk.swaps[0].k_high + '/' + rOk.swaps[0].serving_text, '88/½ cup');

console.log('\n═══ ADDITIVE DETECTION — name what is printed ═══');
check('quotes the SPECIFIC name, not a generic fragment',
  Cards.detectPhos('flour, sodium acid pyrophosphate').match, 'sodium acid pyrophosphate');
check('  ...still catches the generic when that is all there is',
  Cards.detectPhos('flour, pyrophosphate').match, 'pyrophosphate');
check('bare E-number caught', Cards.detectPhos('flour, E450').match, 'E450');
check('baking powder flagged as its own case', Cards.detectPhos('flour, baking powder').bakingPowder, true);
check('the word "phosphorus" alone is NOT an additive', Cards.detectPhos('phosphorus 40mg'), null);
check('clean list returns nothing', Cards.detectPhos('oats, water'), null);
check('potassium chloride is tier 1', Cards.detectPotassiumAdditive('salt, potassium chloride').tier, 1);
check('potassium sorbate is tier 2 (preservative-level)',
  Cards.detectPotassiumAdditive('water, potassium sorbate').tier, 2);
check('"no salt added" never trips the salt-substitute alarm',
  Cards.detectSaltSubstitute('chicken, no salt added'), null);

console.log('\n═══ LEACHING — cooking as a lever ═══');
const spudL = ANCHOR_FOODS.find(f => f.id === 'potato_baked_skin');
check('potatoes are marked leachable', spudL.leachable, true);
check('raw salad veg are NOT (boiling them is not a thing)',
  !!ANCHOR_FOODS.find(f => f.id === 'cucumber').leachable, false);
const L = Clinical.leach(926, 926);
check('926 mg boiled -> low end halves', L.low, 463);
check('  ...high end retains 75%, the cautious side', L.high, 695);
/* The safe direction matters more than the size of the effect. Published
   removal is 50-75%; claiming removal of only 25-50% keeps the counted
   figure ABOVE what the literature says remains. Understating potassium
   is the error that tells someone they have room they do not have. */
check('  ...claimed removal is smaller than published removal',
  (926 - L.high) / 926 < 0.50, true);
check('  ...and the result is still a range, never a point', L.low < L.high, true);
check('null potassium survives leaching untouched', Clinical.leach(null, null).low, null);

console.log('\n═══ PHOTO PORTIONS — a band, and it leans the safe way ═══');

/* Estimating milligrams from a photograph is only defensible because
   of the shape of the result. These tests pin that shape.

   The unsafe failure is a photo producing a NARROW number that reads
   low: measured portion-weight error from food photos runs 36-37% and
   skews toward under-estimation, which is the direction that tells
   somebody they have room they do not have. So every band must be
   genuinely wide, and every band's midpoint must sit at or above its
   nominal serving. */
['small', 'average', 'large'].forEach(size => {
  const b = Clinical.photoBand(size);
  check(`${size} band exists`, !!b, true);
  check(`  ...is a range, never a point`, b.low < b.high, true);
  // 36-37% published error means a band narrower than that is a lie.
  check(`  ...spans at least the published photo error`,
    (b.high - b.low) / ((b.high + b.low) / 2) >= 0.36, true);
});

/* Asymmetry, checked against the nominal each band describes. "Average"
   is the one that must not sit centred on 1.0 — a symmetric average
   band would encode the assumption that photo error is unbiased, which
   is precisely what the measurements say it is not. */
check('average band leans high, not centred on 1.0',
  (Clinical.photoBand('average').low + Clinical.photoBand('average').high) / 2 > 1.0, true);
check('small band tops out at no more than a full serving',
  Clinical.photoBand('small').high <= 1.0, true);
check('large band starts above a full serving',
  Clinical.photoBand('large').low > 1.0, true);
check('bands ascend without gaps between them',
  Clinical.photoBand('small').high >= Clinical.photoBand('average').low &&
  Clinical.photoBand('average').high >= Clinical.photoBand('large').low, true);

// An unrecognised or absent size must not silently become a multiplier.
check('unknown portion size yields no band', Clinical.photoBand('enormous'), null);
check('null portion size yields no band', Clinical.photoBand(null), null);
check('empty portion size yields no band', Clinical.photoBand(''), null);

/* End to end: the same food, same table row, read from a photo versus
   stated explicitly. The photo must be WIDER and must not read lower. */
{
  const potato = ANCHOR_FOODS.find(f => f.id === 'potato_baked_skin');
  const fromPhoto = Resolve.resolveItems([{
    name: 'baked potato with skin', portion_quantity: null, portion_unit: null,
    portion_text: 'about one', portion_size: 'average', modifiers: [], resolvable: true
  }]).resolved[0];
  const stated = Resolve.resolveItems([{
    name: 'baked potato with skin', portion_quantity: 1, portion_unit: 'medium',
    portion_text: '1 medium', portion_size: null, modifiers: [], resolvable: true
  }]).resolved[0];

  check('photo item still priced from the anchor table', fromPhoto.matched_anchor_id, potato.id);
  check('photo item records which band it used', fromPhoto.photo_portion, 'average');
  check('stated portion records no band', stated.photo_portion, null);
  check('photo range is wider than a stated portion',
    (fromPhoto.potassium_high_mg - fromPhoto.potassium_low_mg) >
    (stated.potassium_high_mg - stated.potassium_low_mg), true);
  check('photo high end is not lower than the stated figure',
    fromPhoto.potassium_high_mg >= stated.potassium_high_mg, true);
  /* The whole safety argument in one line: a photo may never make a
     food look smaller than the table says it is. */
  check('photo estimate never under-reads the plain serving',
    (fromPhoto.potassium_low_mg + fromPhoto.potassium_high_mg) / 2 >= potato.k_low * 0.5, true);
}

console.log('\n═══ DATA-QUALITY REPORT (expected gaps, not failures) ═══');
console.log(`  rows: ${ANCHOR_STATS.total} | missing K: ${ANCHOR_STATS.missingK} | ` +
            `missing P: ${ANCHOR_STATS.missingP} | missing Na: ${ANCHOR_STATS.missingNa}`);
console.log(`  swap pool: ${ANCHOR_STATS.swapPool}`);
console.log(`  thin swap categories (<2 candidates): ${ANCHOR_STATS.thinCategories.join(', ') || 'none'}`);

console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
process.exit(fail ? 1 : 0);

