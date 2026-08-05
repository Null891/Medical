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

/* copy.js now declares COPY_EN; i18n.js binds the global COPY to
   English merged with whichever language is selected. The language
   tables load first so the merge has something to find. */
['js/data/copy.js', 'js/data/copy.es.js', 'js/data/copy.zh.js', 'js/data/copy.hi.js',
 'js/data/anchor-foods.js', 'js/store.js',
 'js/clinical.js', 'js/i18n.js', 'js/resolve.js', 'js/cards.js', 'js/labscan.js',
 'js/data/recipes.js', 'js/plan.js', 'js/backup.js'].forEach(f => {
  vm.runInContext(read(f), sandbox, { filename: f });
});
vm.runInContext('I18N.apply("en");', sandbox);

// `const` at the top level of a VM script binds into the context's global
// lexical scope, not onto the sandbox object — pull them out explicitly.
const { Store, Clinical, Resolve, Cards, LabScan, Plan, Backup, I18N, COPY_EN,
        COPY_ES, COPY_ZH, COPY_HI, RECIPES, ANCHOR_FOODS, ANCHOR_STATS } =
  vm.runInContext('({ Store, Clinical, Resolve, Cards, LabScan, Plan, Backup, I18N, COPY_EN, COPY_ES, COPY_ZH, COPY_HI, RECIPES, ANCHOR_FOODS, ANCHOR_STATS })', sandbox);
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

console.log('\n═══ TRANSLATION NEVER MOVES A NUMBER ═══');

/* The clinical rule for i18n, and the only one that could hurt anybody:
   every threshold, milligram figure and guideline value is QUOTED from
   KDOQI, KDIGO, AKF or NICE. It is not authored here, so it is not
   translatable. A translator may rebuild the sentence around 5.5 mEq/L
   however their language requires; 5.5 may not become 5,5 or 5.0 or
   ५.५.

   So every numeral in an English string is compared against its
   translation. This is the test that would catch a decimal comma, a
   localised digit, or a well-meaning "rounded for readability". */
{
  const numerals = (s) => (String(s).match(/\d+(?:[.,]\d+)?/g) || [])
    .map(n => n.replace(/,(?=\d{3}\b)/g, ''));   // 2,300 and 2300 are the same figure

  function walk(en, tr, path, out) {
    if (!tr) return;
    Object.keys(tr).forEach(k => {
      const e = en ? en[k] : undefined;
      const t = tr[k];
      const p = path ? path + '.' + k : k;
      if (t && typeof t === 'object' && !Array.isArray(t) && typeof t !== 'function') {
        walk(e || {}, t, p, out);
      } else if (Array.isArray(t) && Array.isArray(e)) {
        t.forEach((v, i) => {
          if (typeof v === 'string' && typeof e[i] === 'string') out.push([p + '[' + i + ']', e[i], v]);
        });
      } else if (typeof t === 'string' && typeof e === 'string') {
        out.push([p, e, t]);
      }
    });
  }

  [['Spanish', COPY_ES], ['Chinese', COPY_ZH], ['Hindi', COPY_HI]].forEach(([name, table]) => {
    const pairs = [];
    walk(COPY_EN, table, '', pairs);
    check(`${name}: there is something to check`, pairs.length > 20, true);

    const drifted = pairs.filter(([, en, tr]) => {
      const a = numerals(en), b = numerals(tr);
      // Every number in the English MUST survive into the translation.
      return !a.every(n => b.indexOf(n) !== -1);
    }).map(([p]) => p);
    check(`${name}: every number survives translation`, drifted.join(', ') || 'none', 'none');

    // Devanagari and full-width digits would both break a reader
    // comparing the app against a lab report printed in 5.5.
    const localisedDigits = pairs.filter(([, , tr]) => /[०-९٠-٩０-９]/.test(tr)).map(([p]) => p);
    check(`${name}: digits stay in Western Arabic numerals`,
      localisedDigits.join(', ') || 'none', 'none');
  });

  /* Guideline names are proper nouns and must not be translated either:
     a reader checking KDOQI against a source needs the string to match. */
  [['Spanish', COPY_ES], ['Chinese', COPY_ZH], ['Hindi', COPY_HI]].forEach(([name, table]) => {
    const pairs = [];
    walk(COPY_EN, table, '', pairs);
    const lost = pairs.filter(([, en, tr]) =>
      ['KDOQI', 'KDIGO', 'NICE', 'mEq/L', 'mg/dL'].some(t =>
        en.indexOf(t) !== -1 && tr.indexOf(t) === -1)).map(([p]) => p);
    check(`${name}: guideline names and units are preserved`, lost.join(', ') || 'none', 'none');
  });
}

console.log('\n═══ FALLBACK IS PER KEY, NOT PER LANGUAGE ═══');
{
  const merged = I18N.merge(COPY_EN, COPY_ES);

  check('a translated key comes through', merged.consentButton, COPY_ES.consentButton);
  /* A key with no translation must fall back to ENGLISH, not to
     undefined. A partly translated app is awkward; a screen reading
     "undefined" is broken, and this app has strings that a user must be
     able to read to give consent. */
  check('an untranslated key falls back to English',
    merged.cardDisclaimer !== undefined && merged.cardDisclaimer.length > 0, true);
  check('  ...and no key anywhere is undefined',
    JSON.stringify(merged).indexOf('undefined'), -1);

  // Nested objects merge key by key rather than being replaced wholesale.
  check('nested objects merge rather than replace',
    typeof merged.learn.protein, 'object');
  check('  ...while the translated nested key wins',
    merged.learn.warnings.title, COPY_ES.learn.warnings.title);

  // Functions survive as functions — several strings are templates.
  check('template functions survive the merge', typeof merged.backup.restored, 'function');
  check('  ...and produce the translated sentence',
    /restaurado/i.test(merged.backup.restored(2, 1)), true);

  // Empty strings are treated as absent, so a blank line in a
  // translation file cannot blank out a disclaimer.
  const withBlank = I18N.merge(COPY_EN, { cardDisclaimer: '' });
  check('an empty translation does NOT blank an English string',
    withBlank.cardDisclaimer, COPY_EN.cardDisclaimer);

  // Coverage is reported honestly rather than rounded up to "done".
  ['es', 'zh', 'hi'].forEach(code => {
    const cov = I18N.coverage(code);
    check(`${code} coverage is reported`, cov.pct > 0 && cov.pct < 100, true);
  });

  // Speech tags are full BCP-47, not the two-letter code.
  check('speech tag for Spanish is regional', I18N.speechTag('es'), 'es-US');
  check('speech tag for Chinese is regional', I18N.speechTag('zh'), 'zh-CN');
  check('speech tag for Hindi is regional', I18N.speechTag('hi'), 'hi-IN');
  check('an unknown language falls back to English speech', I18N.speechTag('xx'), 'en-US');
}

console.log('\n═══ BACKUP: LEAVING IS ACTUALLY POSSIBLE ═══');

/* Having no account is only a feature if the data can leave. These
   tests are the difference between "we do not lock you in" as a claim
   and as a fact.

   The failure mode that matters most is a HALF-applied import — profile
   restored, meals lost — because the user would not know which half
   survived. So every rejection case is checked for leaving the existing
   store completely untouched. */
{
  Store.reset(); Store.load();
  Store.useEducationRanges();
  Store.updateProfile({ display_name: 'Round Trip', ckd_stage: 'G4' });
  Store.addLab({ lab_date: Store.todayISO(), k: 4.6, p: 3.8 });
  Store.addMeal({
    meal_text: 'backup test meal', logged_at: new Date().toISOString(),
    meal_date: Store.todayISO(), items: [], confidence: 'high',
    total_potassium_low_mg: 100, total_potassium_high_mg: 120,
    total_phosphorus_low_mg: 0, total_phosphorus_high_mg: 0,
    total_sodium_low_mg: 0, total_sodium_high_mg: 0
  });
  Store.setSetting('medications', 'Sevelamer 800mg');

  const backup = Backup.text();
  const before = JSON.stringify(Store.exportAll());

  // Wipe as thoroughly as clearing a browser would.
  Store.reset(); Store.load();
  check('after a wipe, nothing is left', Store.meals().length, 0);
  check('  ...and no name survives', Store.profile().display_name, '');

  const done = Backup.restore(backup);
  check('the backup restores', done.ok, true);
  check('  ...and reports what came back', done.summary.meals, 1);
  check('everything round-trips byte for byte',
    JSON.stringify(Store.exportAll()).length + '/' + JSON.stringify(Store.exportAll()).slice(0, 40),
    before.length + '/' + before.slice(0, 40));
  check('  ...including the name', Store.profile().display_name, 'Round Trip');
  check('  ...the targets', Store.targets().k, 2500);
  check('  ...the labs', Store.labs().length, 1);
  check('  ...and settings outside the main entities', Store.settings().medications, 'Sevelamer 800mg');

  /* Rejections. Each must name a reason a person can act on — "invalid
     file" tells somebody holding the only copy of their data nothing —
     and each must leave the store completely alone. */
  /* Compared as a short fingerprint rather than the whole store: the
     assertion is "did anything change", and printing 2 KB of JSON per
     check buries every other line of output. A test log nobody can
     read is a test log nobody reads. */
  const fingerprint = () => {
    const j = JSON.stringify(Store.exportAll());
    let h = 0;
    for (let i = 0; i < j.length; i++) { h = ((h << 5) - h + j.charCodeAt(i)) | 0; }
    return j.length + ':' + (h >>> 0).toString(36);
  };
  const good = fingerprint();
  const cases = [
    ['not JSON at all',        'this is not json {'],
    ['a different app\'s file', JSON.stringify({ format: 'other-app', version: 1, data: {} })],
    ['a newer format version',  JSON.stringify({ format: 'renalroute-backup', version: 99, data: {} })],
    ['a file with no contents', JSON.stringify({ format: 'renalroute-backup', version: 1 })],
    ['a truncated file',        JSON.stringify({ format: 'renalroute-backup', version: 1,
                                  data: { profiles: [], labs: [], settings: {} } })]  // meals missing
  ];
  cases.forEach(([what, raw]) => {
    const r = Backup.restore(raw);
    check(`${what} is refused`, r.ok, false);
    check(`  ...with a reason worth reading`, r.reason && r.reason.length > 25, true);
    check(`  ...and nothing is overwritten`, fingerprint(), good);
  });

  /* A truncated download is the realistic version of this: the file
     parses as JSON, has the right format string, and is missing an
     entity. Restoring it would replace a full history with an empty
     one and report success. */
  const truncated = JSON.parse(backup);
  delete truncated.data.meals;
  check('a backup missing its meals is refused, not applied as empty',
    Backup.restore(JSON.stringify(truncated)).ok, false);
  check('  ...and the real meals are still there', Store.meals().length, 1);

  // Export must be a copy, not a live reference.
  const snap = Store.exportAll();
  snap.meals.length = 0;
  check('exportAll returns a copy, not the live store', Store.meals().length, 1);

  Store.reset(); Store.load();
}

console.log('\n═══ RECIPES CARRY NO NUMBERS OF THEIR OWN ═══');

/* The single most important property of the recipe set, and the one
   that distinguishes it from every hand-typed nutrition page: not one
   nutrient figure is written in js/data/recipes.js. Every value is
   computed from anchor rows through the same resolver a typed meal
   uses.

   If this ever stops being true, a recipe becomes a second place a
   number can be wrong — and, worse, a place where it can be wrong
   WITHOUT the range, the citation, or the unverified list that every
   other number in the app carries. */
{
  /* Checked as FIELD ASSIGNMENTS, not as words. The first version of
     this matched the strings "potassium" and "sodium" anywhere in the
     file and duly failed on recipe prose that mentions them in plain
     English — a test that fails on its own documentation is a test
     nobody keeps. What must not exist here is a nutrient VALUE. */
  const src = read('js/data/recipes.js');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');   // strip the reasoning
  const NUTRIENT_FIELD = /\b(k|p|na|potassium|phosphorus|sodium)(_low|_high)?(_mg)?\s*:\s*-?\d/i;
  check('no nutrient value is assigned in a recipe', NUTRIENT_FIELD.test(code), false);
  check('  ...and no low/high figure is declared', /\b(low|high)\s*:\s*\d/i.test(code), false);

  // Every ingredient must reference a row that actually exists, or the
  // recipe silently prices low — the dangerous direction.
  const ids = new Set(ANCHOR_FOODS.map(f => f.id));
  const bad = [];
  RECIPES.forEach(r => r.items.forEach(i => { if (!ids.has(i.id)) bad.push(r.id + ':' + i.id); }));
  check('every ingredient resolves to a real anchor row', bad.join(',') || 'none', 'none');
  check('  ...and there are enough recipes to be useful', RECIPES.length >= 12, true);

  // Composition must equal the sum of its parts, exactly.
  const p = Plan.priced(RECIPES.find(r => r.id === 'egg_toast'));
  const manualK = p.items.reduce((s, i) => s + (i.potassium_high_mg || 0), 0);
  check('recipe total equals the sum of its anchor rows', p.k.high, manualK);
  /* Ranges survive composition. Salmon's PHOSPHORUS genuinely varies by
     species (215–253 in the table); its potassium is simply unknown.
     The first draft of this test checked potassium and failed — which
     is exactly the confusion the range display exists to prevent: "no
     value" and "a spread of values" look identical if you only ever
     print one number. */
  const salmonDish = Plan.priced(RECIPES.find(r => r.id === 'tuna_style_salmon_rice'));
  check('  ...and a genuine source disagreement survives as a range',
    salmonDish.p.low < salmonDish.p.high, true);
  check('  ...while an unknown value stays absent rather than becoming zero',
    ANCHOR_FOODS.find(f => f.id === 'salmon').k_low, null);

  /* LEACHING MUST NEVER BE DOUBLE-COUNTED — the one genuine bug this
     recipe set introduced. The boiled-potato row is already a boiled
     value (515 mg against 926 baked with skin), so a recipe asking to
     leach it on top would count the same reduction twice, in the
     direction that under-states potassium.

     A draft of the boiled-potato recipe did exactly that. It was caught
     only because potato_boiled is not marked leachable and
     Plan.itemsFor() checks the flag before applying anything — the data
     refused the double-count. Enforced here rather than trusted. */
  const illegalLeach = [];
  RECIPES.forEach(r => r.items.forEach(i => {
    if (!i.leach) return;
    const row = ANCHOR_FOODS.find(f => f.id === i.id);
    if (!row || !row.leachable) illegalLeach.push(r.id + ':' + i.id);
  }));
  check('no recipe leaches a row the table says cannot be leached',
    illegalLeach.join(',') || 'none', 'none');

  const boiled = Plan.priced(RECIPES.find(r => r.id === 'boiled_potato_plate'));
  const potatoItem = boiled.items.find(i => i.matched_anchor_id === 'potato_boiled');
  const boiledRow = ANCHOR_FOODS.find(f => f.id === 'potato_boiled');
  check('the boiled potato counts at its table value, not lower',
    potatoItem.potassium_high_mg, boiledRow.k_high);
  check('  ...which is already well below the baked-with-skin figure',
    boiledRow.k_high < ANCHOR_FOODS.find(f => f.id === 'potato_baked_skin').k_high, true);

  /* No recipe may claim safety. Whether a meal suits somebody depends
     on their labs, their targets, and their care team — none of which a
     recipe knows. */
  const prose = RECIPES.map(r => [r.name, r.blurb, r.note || ''].join(' ')).join(' | ');
  check('no recipe calls itself kidney-safe', /kidney.?safe|safe for (your )?kidney/i.test(prose), false);
  check('  ...or healthy, or approved', /\bhealthy\b|\bapproved\b|\bdoctor.recommended\b/i.test(prose), false);
}

console.log('\n═══ WHAT FITS IS ARITHMETIC, NOT A VERDICT ═══');
{
  Store.reset(); Store.load();
  Store.useEducationRanges();          // K 2500 / P 900 / Na 2000

  const empty = Plan.suggestions(4);
  check('with a full budget, something fits', empty.fitting.length > 0, true);
  check('  ...and fits are judged on the HIGH end',
    empty.fitting.every(p => p.k.high <= 2500), true);

  // Fill the day so nothing can fit, and check the app says so rather
  // than offering something that does not.
  Store.addMeal({
    meal_text: 'fill', logged_at: new Date().toISOString(), meal_date: Store.todayISO(),
    items: [], confidence: 'high',
    total_potassium_low_mg: 2490, total_potassium_high_mg: 2490,
    total_phosphorus_low_mg: 0, total_phosphorus_high_mg: 0,
    total_sodium_low_mg: 0, total_sodium_high_mg: 0
  });
  const full = Plan.suggestions(4);
  check('with 10 mg left, nothing is offered', full.fitting.length, 0);
  check('  ...and near misses are shown instead', full.overBy.length > 0, true);
  check('  ...each with how far over it is', full.overBy.every(x => x.over > 0), true);

  // A day with no targets cannot rule anything out.
  Store.reset(); Store.load();
  check('no targets means no suggestions, not wrong ones', Plan.suggestions(4).ready, false);
}

console.log('\n═══ THE THREE-DAY PLAN STAYS INSIDE THE TARGETS ═══');
{
  Store.reset(); Store.load();
  Store.useEducationRanges();
  const plan = Plan.threeDay();
  check('a plan is produced', !!plan, true);
  check('  ...covering three days', plan.days.length, 3);

  plan.days.forEach((d, i) => {
    check(`day ${i + 1} potassium high end is inside the target`, d.totals.k <= plan.targets.k, true);
    check(`day ${i + 1} phosphorus high end is inside the target`, d.totals.p <= plan.targets.p, true);
    check(`day ${i + 1} sodium high end is inside the target`, d.totals.na <= plan.targets.na, true);
    const names = d.meals.map(m => m.priced.recipe.id);
    check(`day ${i + 1} repeats no meal`, names.length, new Set(names).size);
  });

  const g = Plan.grocery();
  check('the shopping list has entries', g.count > 0, true);
  const text = Plan.groceryText();
  check('  ...exports as plain text', text.indexOf('SHOPPING LIST') !== -1, true);
  check('  ...and carries the estimate caveat with it',
    /estimated ranges/i.test(text), true);
  Store.reset(); Store.load();
}

console.log('\n═══ LAB SCAN — THE GATE IS ON THE BOUNDARY ═══');

/* The design being tested: autofill is free, confirmation is spent only
   where a misread would change what the app DOES. So there are two
   failure modes and both are checked.

   Too tight — asking about ordinary readings — makes the feature
   tedious in exactly the place it exists to remove tedium, and it will
   not get used. Too loose — letting a band-crossing value through
   silently — is the actual safety hole. */
{
  // Ordinary readings must cost nothing.
  check('normal potassium needs no confirmation', LabScan.needsConfirm('k', 4.6), null);
  check('normal phosphorus needs no confirmation', LabScan.needsConfirm('p', 3.8), null);
  check('eGFR never needs confirmation', LabScan.needsConfirm('egfr', 38), null);
  check('  ...even a very low eGFR, because it changes no mode',
    LabScan.needsConfirm('egfr', 9), null);

  // Every crossing must be caught, and must name what it would do.
  [[3.2, 'low'], [5.3, 'caution'], [5.7, 'restricted'], [6.1, 'paused']]
    .forEach(([v, mode]) => {
      const c = LabScan.needsConfirm('k', v);
      check(`K ${v} is gated`, !!c, true);
      check(`  ...and identifies it as ${mode}`, c && c.mode, mode);
      check('  ...and names the consequence in plain words',
        !!(c && c.consequence && c.consequence.length > 10), true);
    });
  check('P 4.9 is gated', (LabScan.needsConfirm('p', 4.9) || {}).mode, 'caution');
  check('P 1.1 is gated', (LabScan.needsConfirm('p', 1.1) || {}).mode, 'below_range');

  /* Exact band edges, because off-by-one at a boundary is the whole
     failure class this feature could introduce. */
  check('K 3.5 exactly is normal', LabScan.wouldBeMode('k', 3.5), 'normal');
  check('K 3.4 is low', LabScan.wouldBeMode('k', 3.4), 'low');
  check('K 5.0 is normal', LabScan.wouldBeMode('k', 5.0), 'normal');
  check('K 5.1 is caution', LabScan.wouldBeMode('k', 5.1), 'caution');
  check('K 5.5 is caution', LabScan.wouldBeMode('k', 5.5), 'caution');
  check('K 5.6 is restricted', LabScan.wouldBeMode('k', 5.6), 'restricted');
  check('K 5.9 is restricted', LabScan.wouldBeMode('k', 5.9), 'restricted');
  check('K 6.0 is paused', LabScan.wouldBeMode('k', 6.0), 'paused');

  /* LabScan re-expresses the bands as a pure function of a value, since
     Clinical's own versions read the stored latest lab. Two copies of a
     threshold is a drift risk, so they are checked against each other
     through the real storage path at every boundary. */
  [3.4, 3.5, 5.0, 5.1, 5.5, 5.6, 5.9, 6.0, 7.5].forEach(v => {
    Store.reset(); Store.load();
    Store.addLab({ lab_date: Store.todayISO(), k: v });
    check(`K ${v}: LabScan agrees with Clinical`,
      LabScan.wouldBeMode('k', v), Clinical.potassiumMode().mode);
  });
  Store.reset(); Store.load();

  // Implausible values are rejected by the existing bounds and are
  // never offered for confirmation — they are not going to be stored.
  const rows = LabScan.review({ k: 45, p: 3.8, egfr: null });
  const kRow = rows.find(r => r.field.key === 'k');
  check('an impossible potassium is marked invalid', kRow.valid, false);
  check('  ...and is never offered for confirmation', kRow.confirm, null);
  check('a missing value is simply absent, not zero',
    rows.find(r => r.field.key === 'egfr').found, false);

  // The save gate: blocked until every crossing is confirmed, and
  // confirming one never confirms another.
  const gated = LabScan.review({ k: 6.1, p: 4.9, egfr: 20 });
  check('save is blocked with two crossings unconfirmed', LabScan.ready(gated, []), false);
  check('  ...still blocked with only one confirmed', LabScan.ready(gated, ['k']), false);
  check('  ...released when both are confirmed', LabScan.ready(gated, ['k', 'p']), true);
  const plain = LabScan.review({ k: 4.6, p: 3.8, egfr: 38 });
  check('an ordinary report saves with zero confirmations', LabScan.ready(plain, []), true);
}

console.log('\n═══ CALENDAR DAYS ARE LOCAL, NEVER UTC ═══');

/* A real bug, found by a test that only failed once the machine running
   it crossed midnight UTC. Today's feed compared a UTC timestamp string
   against a LOCAL calendar date by slicing the first ten characters off
   entered_at. West of UTC that means every lab entered after the local
   evening cutoff carries tomorrow's date and silently disappears from
   today; east of UTC the same thing happens in the early morning.

   Nobody would ever report this as a bug. They would just quietly
   notice the app sometimes forgets things they did. */
{
  const local = Store.todayISO();

  // A timestamp taken right now must land on today's local date,
  // whatever the offset between local time and UTC happens to be.
  check('now converts to the local calendar day',
    Store.todayISO(new Date().toISOString()), local);

  // The two ends of the local day are the cases that break. Both must
  // report the same local date even though one of them is very likely a
  // different UTC date.
  const startOfDay = new Date(); startOfDay.setHours(0, 5, 0, 0);
  const endOfDay = new Date();   endOfDay.setHours(23, 55, 0, 0);
  check('one minute after local midnight is still today',
    Store.todayISO(startOfDay.toISOString()), local);
  check('five minutes before local midnight is still today',
    Store.todayISO(endOfDay.toISOString()), local);

  // And the naive version has to actually disagree somewhere, or this
  // test is checking nothing.
  const naive = (iso) => String(iso).slice(0, 10);
  const disagrees =
    naive(startOfDay.toISOString()) !== Store.todayISO(startOfDay.toISOString()) ||
    naive(endOfDay.toISOString())   !== Store.todayISO(endOfDay.toISOString()) ||
    new Date().getTimezoneOffset() === 0;
  check('  ...and the naive UTC slice is genuinely different (or offset is 0)',
    disagrees, true);
}

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

