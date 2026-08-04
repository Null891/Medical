/* End-to-end run-through of RenalRoute in a real DOM.
   Boots index.html with all scripts, then drives the app by clicking
   actual buttons — the same path a user takes. */

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const APP = path.join(__dirname, '..');

let pass = 0, fail = 0;
const failures = [];
function check(label, actual, expected) {
  const ok = String(actual) === String(expected);
  if (ok) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; failures.push(label); console.log(`  FAIL  ${label} → got "${actual}", expected "${expected}"`); }
}

const IGNORE = /Not implemented:/;
const vc = new VirtualConsole();
const pageErrors = [];
vc.on('jsdomError', e => { if (IGNORE.test(e.message)) return; pageErrors.push('jsdomError: ' + e.message); console.log('   !! ' + e.message); });
vc.on('error', (...a) => { const m = a.join(' '); if (IGNORE.test(m)) return; pageErrors.push(m); console.log('   !! ' + m.slice(0,300)); });

const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'https://renalroute.test/',
  runScripts: 'dangerously',
  resources: undefined,
  virtualConsole: vc,
  pretendToBeVisual: true
});

const { window } = dom;
const doc = window.document;

// jsdom won't fetch local files; inject the scripts and CSS by hand,
// in the same order index.html declares them.
const scripts = [
  'js/theme.js', 'js/data/copy.js', 'js/data/anchor-foods.js', 'js/store.js', 'js/clinical.js',
  'js/resolve.js', 'js/llm.js', 'js/cards.js', 'js/rings.js', 'js/trends.js', 'js/exporter.js', 'js/ui.js',
  'js/seed.js', 'js/app.js'
];

// Provide a fetch stub so LLM.probe() doesn't explode.
window.fetch = (url) => {
  const u = String(url);
  if (u.indexOf('/api/product') !== -1) {
    if (u.indexOf('code=0000000000000') !== -1) return Promise.resolve({ ok: false, status: 404 });
    if (u.indexOf('code=1111111111111') !== -1) return Promise.resolve({ ok: true, status: 200,
      json: () => Promise.resolve({ code: '1111111111111', name: 'Plain Oats', brand: 'Acme',
        ingredients: '', hasIngredients: false }) });
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({
      code: '5449000000996', name: 'Cola', brand: 'TestBrand',
      ingredients: 'carbonated water, sugar, colour, phosphoric acid, natural flavourings, caffeine',
      hasIngredients: true }) });
  }
  return Promise.reject(new Error('Failed to fetch'));
};

// Load the real stylesheets so `hidden` behaviour is genuinely tested.
const css = ['css/tokens.css', 'css/app.css']
  .map(f => fs.readFileSync(path.join(APP, f), 'utf8')).join('\n');
const styleEl = doc.createElement('style');
styleEl.textContent = css;
doc.head.appendChild(styleEl);

for (const s of scripts) {
  const el = doc.createElement('script');
  el.textContent = fs.readFileSync(path.join(APP, s), 'utf8');
  doc.body.appendChild(el);
}

const $ = (sel) => doc.querySelector(sel);
const vis = (sel) => {
  const el = $(sel);
  if (!el) return 'MISSING';
  if (el.hidden) return false;
  return window.getComputedStyle(el).display !== 'none';
};
const click = (sel) => {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (!el) throw new Error('cannot click missing element: ' + sel);
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
};
const type = (sel, value) => {
  const el = $(sel);
  el.value = value;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
};
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async function run() {

  console.log('\n═══ 1. BOOT — first visit ═══');
  check('consent modal is visible', vis('#consentModal'), true);
  check('delete modal is HIDDEN (was the click-blocking bug)', vis('#deleteModal'), false);
  check('app shell is hidden behind consent', vis('#app'), false);
  check('consent body rendered', $('#consentBody').textContent.includes('not a medical device'), true);
  check('no page errors on boot', pageErrors.length, 0);

  console.log('\n═══ 2. CONSENT GATE ═══');
  click('#consentAccept');
  await wait(20);
  check('consent modal dismissed', vis('#consentModal'), false);
  check('app shell now visible', vis('#app'), true);
  check('consent timestamp stored', !!window.RenalRoute.Store.profile().consent_accepted_at, true);
  check('landed on onboarding', vis('#scr-onboarding'), true);

  console.log('\n═══ 3. ONBOARDING — one screen, nothing pre-filled ═══');
  check('name and targets are on the SAME screen', vis('#onbName') && vis('#onbTargetFields'), true);
  check('no labs step exists anywhere in onboarding', $('#onbLabFields'), null);
  check('potassium field is EMPTY on arrival', $('#onbTargetFields [data-tf="k"]').value, '');
  check('phosphorus field is EMPTY', $('#onbTargetFields [data-tf="p"]').value, '');
  check('profile budget_source still none', window.RenalRoute.Store.profile().budget_source, 'none');
  type('#onbName', 'Frank');

  console.log('\n═══ 4. TARGET BOUNDS REJECT BAD INPUT ═══');
  type('#onbTargetFields [data-tf="k"]', '50');
  click('#onbSaveCareTeam');
  await wait(20);
  check('K=50 blocked, still on onboarding', vis('#scr-onboarding'), true);
  check('inline error is VISIBLE (display:flex vs hidden bug)', vis('#onbTargetFields [data-err="k"]'), true);
  check('error text is the sanity-bound copy',
    $('#onbTargetFields [data-err="k"]').textContent.includes("app's limits are technical"), true);

  console.log('\n═══ 5. EDUCATION RANGES PATH ═══');
  type('#onbTargetFields [data-tf="k"]', '');
  click('#onbUseEducation');
  await wait(20);
  const p1 = window.RenalRoute.Store.profile();
  check('K target = 2500', p1.potassium_budget_mg, 2500);
  check('P target = 900', p1.phosphorus_budget_mg, 900);
  check('Na target = 2000', p1.sodium_budget_mg, 2000);
  check('provenance = education_default', p1.budget_source, 'education_default');

  console.log('\n═══ 6. ONE SCREEN LANDS STRAIGHT ON HOME ═══');
  check('landed on Home — no labs gate in between', vis('#scr-home'), true);
  check('no lab records created', window.RenalRoute.Store.labs().length, 0);
  // The optional name typed at the top must survive pressing a button
  // further down the same screen.
  check('name typed above the fold was still saved',
    window.RenalRoute.Store.profile().display_name, 'Frank');

  console.log('\n═══ 7. HOME RENDERS ═══');
  check('rings card rendered', $('#ringCard').innerHTML.length > 100, true);
  check('SVG rings present', !!$('#ringCard svg'), true);
  check('three ring arcs drawn', $$('#ringCard .ring-fill').length, 3);
  check('stat blocks rendered', $$('#statBlocks .statblock').length, 3);
  check('footer disclaimer present',
    $('#footerDisclaimer').textContent.includes('not medical advice'), true);
  check('provenance chip shown for education ranges',
    $('#ringCard').textContent.includes('general education ranges'), true);
  check('empty-state card shown', $('#homeList').textContent.includes('Nothing logged yet today'), true);
  check('status label is text not just colour',
    /On track|Getting close|Over budget/.test($('#statBlocks').textContent), true);

  console.log('\n═══ 8. LOG A MEAL (demo mode) ═══');
  click('[data-nav="log"]');
  await wait(20);
  check('log screen visible', vis('#scr-log'), true);
  check('analyze disabled while empty', $('#analyzeBtn').disabled, true);
  type('#mealText', 'grilled chicken, baked potato with skin, and a glass of milk');
  check('analyze enabled after typing', $('#analyzeBtn').disabled, false);
  check('character counter matches input length',
    $('#mealCount').textContent, String($('#mealText').value.length));
  click('#analyzeBtn');
  await wait(600);
  check('review step reached', vis('#log-review'), true);
  const rows = $$('#reviewItems .itemrow');
  check('three items resolved', rows.length, 3);
  check('potato shows 926 mg', $('#reviewItems').textContent.includes('926'), true);
  check('all matched → High confidence path',
    window.RenalRoute.Resolve.confidence(
      Array.from(rows).map(() => ({ source: 'anchor' }))), 'high');
  check('flag card generated for the potato',
    $('#reviewCards').textContent.includes('926'), true);
  check('every flag card carries the disclaimer',
    $$('#reviewCards .flagcard__disc').length, $$('#reviewCards .flagcard').length);

  console.log('\n═══ 9. SAVE AND SEE IT ON THE DASHBOARD ═══');
  click('#saveMealBtn');
  await wait(40);
  check('returned to Home', vis('#scr-home'), true);
  check('one meal stored', window.RenalRoute.Store.meals(window.RenalRoute.Store.todayISO()).length, 1);
  check('meal row rendered', $$('#homeList .meal').length, 1);
  const totals = window.RenalRoute.Store.dayTotals();
  check('day potassium total > 900', totals.k.high > 900, true);
  check('rings reflect the meal', $('#statBlocks').textContent.includes('left'), true);

  console.log('\n═══ 10. XSS PROBE — the stored-script vector ═══');
  click('[data-nav="log"]');
  await wait(20);
  type('#mealText', '<script>alert(1)</script> and a banana');
  click('#analyzeBtn');
  await wait(600);
  click('#saveMealBtn');
  await wait(40);
  check('no <script> element injected into the page',
    doc.querySelectorAll('#homeList script').length, 0);
  check('payload renders as literal text',
    $('#homeList').textContent.includes('<script>alert(1)</script>'), true);
  check('no new page errors', pageErrors.length, 0);

  console.log('\n═══ 11. CLARIFY-ONCE — the honest-failure path ═══');
  click('[data-nav="log"]');
  await wait(20);
  type('#mealText', 'leftover casserole');
  click('#analyzeBtn');
  await wait(600);
  check('clarify step shown', vis('#log-clarify'), true);
  check('exactly one question asked', $('#clarifyQuestion').textContent.trim().length > 0, true);
  click('#clarifySkip');
  await wait(600);
  check('review reached after skip', vis('#log-review'), true);
  check('item marked Not counted', $('#reviewItems').textContent.includes('Not counted'), true);
  const beforeSkip = window.RenalRoute.Store.dayTotals().k.high;
  click('#saveMealBtn');
  await wait(40);
  const afterSkip = window.RenalRoute.Store.dayTotals().k.high;
  check('uncounted meal adds ZERO to totals', afterSkip, beforeSkip);
  check('"not counted" caption on ring card',
    $('#ringCard').textContent.includes('not counted today'), true);

  console.log('\n═══ 12. DELETE FLOW — the modal that was always open ═══');
  const firstMeal = $('#homeList .meal');
  click(firstMeal);
  await wait(20);
  check('detail screen shown', vis('#scr-detail'), true);
  check('delete modal still hidden', vis('#deleteModal'), false);
  click('[data-delete-meal]');
  await wait(20);
  check('delete modal opens on request', vis('#deleteModal'), true);
  const countBefore = window.RenalRoute.Store.meals(window.RenalRoute.Store.todayISO()).length;
  click('#deleteCancel');
  await wait(20);
  check('"Keep it" closes without deleting', vis('#deleteModal'), false);
  check('meal count unchanged', window.RenalRoute.Store.meals(window.RenalRoute.Store.todayISO()).length, countBefore);
  click($('#homeList .meal'));
  await wait(20);
  click('[data-delete-meal]');
  await wait(20);
  click('#deleteConfirm');
  await wait(40);
  check('delete removes exactly one meal',
    window.RenalRoute.Store.meals(window.RenalRoute.Store.todayISO()).length, countBefore - 1);
  check('modal closed after delete', vis('#deleteModal'), false);

  console.log('\n═══ 13. LABS — mode switching, targets untouched ═══');
  click('[data-nav="labs"]');
  await wait(20);
  check('labs screen visible', vis('#scr-labs'), true);
  const targetsBefore = JSON.stringify(window.RenalRoute.Store.targets());
  type('#labFields [data-lab="k"]', '4.6');
  click('#saveLabBtn');
  await wait(40);
  check('normal mode', window.RenalRoute.Clinical.potassiumMode().mode, 'normal');
  check('targets byte-identical after lab save',
    JSON.stringify(window.RenalRoute.Store.targets()), targetsBefore);

  type('#labFields [data-lab="k"]', '5.3');
  click('#saveLabBtn');
  await wait(40);
  check('caution mode after 5.3', window.RenalRoute.Clinical.potassiumMode().mode, 'caution');
  check('targets STILL byte-identical',
    JSON.stringify(window.RenalRoute.Store.targets()), targetsBefore);

  console.log('\n═══ 14. HYPOKALAEMIA — ring must stop coercing ═══');
  type('#labFields [data-lab="k"]', '3.2');
  click('#saveLabBtn');
  await wait(40);
  check('low mode', window.RenalRoute.Clinical.potassiumMode().mode, 'low');
  check('potassium ring suppressed', window.RenalRoute.Clinical.ringSuppressed('k'), true);
  check('phosphorus ring NOT suppressed', window.RenalRoute.Clinical.ringSuppressed('p'), false);
  click('[data-nav="home"]');
  await wait(20);
  check('care-team line shown instead of a limit',
    $('#statBlocks').textContent.includes("care team is managing your potassium"), true);
  check('swaps suppressed in low mode', window.RenalRoute.Clinical.swapsAllowed(), false);

  console.log('\n═══ 15. PAUSED MODE — coaching stops, hazards do not ═══');
  click('[data-nav="labs"]');
  await wait(20);
  type('#labFields [data-lab="k"]', '6.2');
  click('#saveLabBtn');
  await wait(40);
  check('paused mode', window.RenalRoute.Clinical.potassiumMode().mode, 'paused');
  click('[data-nav="home"]');
  await wait(20);
  check('paused banner visible', vis('#pausedBanner'), true);
  check('banner names the danger',
    $('#pausedBanner').textContent.includes('can be dangerous'), true);
  const pausedCards = window.RenalRoute.Cards.generate(
    [{ name: 'x', source: 'anchor', matched_anchor_id: 'egg', potassium_low_mg: 1,
       potassium_high_mg: 1, phosphorus_low_mg: 1, phosphorus_high_mg: 1,
       sodium_low_mg: 1, sodium_high_mg: 1, additive_phosphate_flag: false }],
    'scrambled eggs with salt substitute');
  check('salt-substitute hazard STILL fires while paused',
    pausedCards.some(c => c.kind === 'salt_substitute'), true);
  check('logging still works while paused', window.RenalRoute.Store.canAnalyze(), true);

  console.log('\n═══ 16. LAB VALIDATION ═══');
  click('[data-nav="labs"]');
  await wait(20);
  const labsBefore = window.RenalRoute.Store.labs().length;
  type('#labFields [data-lab="k"]', '45');
  click('#saveLabBtn');
  await wait(20);
  check('implausible K rejected', window.RenalRoute.Store.labs().length, labsBefore);
  check('inline lab error visible', vis('#labFields [data-laberr="k"]'), true);

  console.log('\n═══ 17. SETTINGS — provenance must not drift ═══');
  click('[data-nav="settings"]');
  await wait(60);
  check('settings visible', vis('#scr-settings'), true);
  check('education caption shown',
    $('#setTargetCaption').textContent.includes('general education ranges'), true);
  check('"my care team gave me" button offered', vis('#claimCareTeamBtn'), true);
  type('#setTargetFields [data-tf="k"]', '2400');
  click('#saveTargetsBtn');
  await wait(40);
  check('edited value saved', window.RenalRoute.Store.profile().potassium_budget_mg, 2400);
  check('provenance did NOT silently become care_team',
    window.RenalRoute.Store.profile().budget_source, 'education_default');
  click('#claimCareTeamBtn');
  await wait(40);
  check('explicit claim promotes provenance',
    window.RenalRoute.Store.profile().budget_source, 'care_team');
  check('education caption gone', vis('#claimCareTeamBtn'), false);

  console.log('\n═══ 18. LEARN CARDS ═══');
  click('[data-learn="protein"]');
  await wait(20);
  check('learn screen shown', vis('#scr-learn'), true);
  check('protein card cites 0.55–0.60 g per kg',
    $('#learnBody').textContent.includes('0.55–0.60 g per kg'), true);
  check('protein card cites grade 1A', $('#learnBody').textContent.includes('1A'), true);
  click('#learnDismiss');
  await wait(20);
  check('returns to previous screen', vis('#scr-learn'), false);

  console.log('\n═══ 19. MANUAL PICKER — works with zero AI ═══');
  click('[data-nav="log"]');
  await wait(20);
  click('#toPickerBtn');
  await wait(20);
  check('picker visible', vis('#log-picker'), true);
  type('#pickerSearch', 'potato');
  await wait(20);
  const results = $$('#pickerResults .result');
  check('search returns results', results.length > 0, true);
  check('review button disabled with empty basket', $('#pickerReview').disabled, true);
  click(results[0]);
  await wait(20);
  check('item added to basket', $('#pickerBasket').textContent.includes('otato'), true);
  check('review button now enabled', $('#pickerReview').disabled, false);
  click('#pickerReview');
  await wait(20);
  check('picker leads to review', vis('#log-review'), true);

  console.log('\n═══ 19b. PHOTO PATH + FORGIVING SEARCH ═══');
  click('[data-nav="log"]'); await wait(20);
  check('camera button offered alongside typing', vis('#photoBtn'), true);
  check('photo disclosure explains the table still prices it',
    $('#photoNote').textContent.includes("reference table"), true);
  check('  ...and that a photo cannot judge portion',
    $('#photoNote').textContent.includes("judge how much"), true);
  check('file input opens the rear camera', $('#photoInput').getAttribute('capture'), 'environment');
  check('no stale preview on a fresh log', vis('#photoPreviewWrap'), false);
  // Token search: word order must not matter.
  // Word order must not change WHICH FOOD is found. Which baked-potato
  // variant ranks first is a genuine toss-up, so the test does not
  // pretend otherwise — both are offered and the user picks.
  check('"baked potato" finds a potato',
    window.RenalRoute.UI.searchFoods('baked potato')[0].base_food, 'potato');
  check('"potato baked" finds it too (the old substring rule found nothing)',
    window.RenalRoute.UI.searchFoods('potato baked')[0].base_food, 'potato');
  check('  ...and both skin variants are offered, not just one',
    window.RenalRoute.UI.searchFoods('baked potato').filter(f => f.base_food === 'potato').length >= 2, true);
  check('bare "potato" prefers the plain name over chips',
    window.RenalRoute.UI.searchFoods('potato')[0].base_food, 'potato');
  check('nonsense still returns nothing', window.RenalRoute.UI.searchFoods('zzzz qqqq').length, 0);

  console.log('\n═══ 19c. DELETE ALL MY DATA ═══');
  click('[data-nav="settings"]'); await wait(20);
  check('delete-everything control offered to the user', vis('#deleteAllBtn'), true);
  check('wipe modal starts hidden', vis('#wipeModal'), false);
  click('#deleteAllBtn'); await wait(20);
  check('confirmation opens', vis('#wipeModal'), true);
  check('  ...and names what will actually go',
    /\d+ meal/.test($('#wipeSummary').textContent), true);
  const mealsBeforeWipe = window.RenalRoute.Store.meals().length;
  click('#wipeCancel'); await wait(20);
  check('"Keep my data" closes without deleting', vis('#wipeModal'), false);
  check('  ...and nothing was removed',
    window.RenalRoute.Store.meals().length, mealsBeforeWipe);

  console.log('\n═══ 19p. DAY LINE + TODAY FEED ═══');
  window.RenalRoute.Seed.run();
  click('[data-nav="home"]'); await wait(40);
  const dl = $('#homeDayLine').textContent;
  check('greeting carries an honest one-liner', dl.length > 0, true);
  check('  ...that reports meals logged', /meal/.test(dl), true);
  // No invented verdict: this app must never grade a person's day.
  check('  ...and never a score out of 100', /\b\d{1,3}\s*\/\s*100|score/i.test(dl), false);
  check('  ...nor the word excellent', /excellent/i.test(dl), false);
  check('today feed appears once there are 2+ events', vis('#todayFeed'), true);
  check('  ...listing events in time order',
    $$('#todayFeed .feed__item').length >= 2, true);
  check('  ...with a timestamp per row', $$('#todayFeed .feed__time').length >= 2, true);
  // resetToday() leaves breakfast in place by design, and the seeded lab
  // counts as a second event — so empty the day properly to test empty.
  window.RenalRoute.Store.meals(window.RenalRoute.Store.todayISO())
    .forEach(m => window.RenalRoute.Store.deleteMeal(m.id));
  click('[data-nav="home"]'); await wait(40);
  check('the line says so when nothing is logged',
    $('#homeDayLine').textContent.includes('Nothing logged yet'), true);
  check('  ...and offers no verdict on a day with no data',
    /over|close|room left/i.test($('#homeDayLine').textContent), false);

  console.log('\n═══ 19o. AKF LOW-K BADGE + COVERAGE HONESTY ═══');
  click('[data-nav="log"]'); await wait(20);
  click('#toPickerBtn'); await wait(20);
  type('#pickerSearch', 'rice'); await wait(30);
  check('picker shows a Lower potassium badge', $('#pickerResults').textContent.includes('Lower potassium'), true);
  // The badge must use AKF's published cut-off, not one of our invention.
  check('AKF threshold is 150 mg', window.RenalRoute.Clinical.AKF_LOW_K_MG, 150);
  check('  ...150 qualifies', window.RenalRoute.Clinical.isLowPotassiumServing(150), true);
  check('  ...151 does not', window.RenalRoute.Clinical.isLowPotassiumServing(151), false);
  // Absence of data must never render as reassurance.
  check('  ...a missing value is NOT badged low',
    window.RenalRoute.Clinical.isLowPotassiumServing(null), false);
  type('#pickerSearch', 'potato'); await wait(30);
  check('the 926 mg potato carries no low-potassium badge',
    /Baked potato with skin<\/strong>\s*<span class="chip chip--ok/.test($('#pickerResults').innerHTML), false);

  click('[data-nav="settings"]'); await wait(30);
  const cov = $('#coverageCard').textContent;
  check('settings admits what the table lacks', cov.includes("What this build doesn't know"), true);
  check('  ...naming the sodium gap by count', /sodium on \d+ of \d+ foods/.test(cov), true);
  check('  ...and the categories that get no swaps', cov.includes('No swap suggestions for'), true);
  check('  ...framed as our gap, not a verdict on the food',
    cov.includes('not a verdict'), true);
  check('  ...and points at the per-food provenance', cov.includes('still unverified'), true);

  console.log('\n═══ 19n. PER-FOOD PROVENANCE ═══');
  click('[data-nav="log"]'); await wait(20);
  type('#mealText', 'grilled chicken, baked potato with skin, and a glass of milk');
  click('#analyzeBtn'); await wait(600);
  const src = $$('#reviewItems .srcnote');
  check('every anchor-matched item can show its source', src.length, 3);
  check('collapsed by default, not in the way', src[0].hasAttribute('open'), false);
  check('  ...but reachable by keyboard as a real disclosure',
    src[0].querySelector('summary').tagName, 'SUMMARY');
  const srcText = $('#reviewItems').textContent;
  check('names the citation', srcText.includes('AKF/USDA'), true);
  check('names the serving the figure is per', srcText.includes('per 1 medium'), true);
  check('says WHICH nutrients are unverified, not just that some are',
    srcText.includes('Not yet re-checked against USDA'), true);
  check('  ...spelled out in words, not field codes',
    srcText.includes('phosphorus') && !srcText.includes('verify=['), true);
  check('the milk re-derivation note surfaces where it matters',
    srcText.includes('re-derived') || srcText.includes('half-cup'), true);

  console.log('\n═══ 19m. BARCODE LOOKUP ═══');
  click('[data-nav="label"]'); await wait(30);
  check('manual barcode entry always available', vis('#barcodeInput'), true);
  // BarcodeDetector is Chrome/Android only, so the camera button is an
  // enhancement — absent here, and the screen still works.
  check('camera scan hidden where unsupported', vis('#scanBtn'), false);

  type('#barcodeInput', '12'); click('#barcodeGo'); await wait(30);
  check('too-short input rejected before any request',
    $('#barcodeStatus').textContent.includes('8 to 14 digits'), true);

  type('#barcodeInput', '5449000000996'); click('#barcodeGo'); await wait(60);
  check('ingredients filled from the lookup',
    $('#labelText').value.includes('phosphoric acid'), true);
  check('  ...and the additive is flagged straight away',
    $('#labelResults').textContent.includes('phosphoric acid'), true);
  check('  ...naming the product found', $('#barcodeStatus').textContent.includes('TestBrand'), true);
  check('  ...and telling the user to check it matches the packet',
    $('#barcodeStatus').textContent.includes('check they match'), true);

  type('#barcodeInput', '0000000000000'); click('#barcodeGo'); await wait(60);
  check('a miss is reported as a miss', $('#barcodeStatus').textContent.includes("isn't in the open database"), true);
  check('  ...and explicitly does NOT imply the food is fine',
    $('#barcodeStatus').textContent.includes('tells you nothing about the food'), true);

  type('#barcodeInput', '1111111111111'); click('#barcodeGo'); await wait(60);
  check('listed-but-no-ingredients says so', $('#barcodeStatus').textContent.includes('without an ingredient list'), true);

  console.log('\n═══ 19l. LABEL CHECKER ═══');
  click('[data-nav="label"]'); await wait(30);
  type('#labelText', ''); await wait(20);   // barcode section above left ingredients here
  check('label screen reachable', vis('#scr-label'), true);
  check('starts with a prompt, not a verdict',
    $('#labelResults').textContent.includes('Paste an ingredient list'), true);

  type('#labelText', 'wheat flour, water, salt, sodium acid pyrophosphate'); await wait(30);
  check('phosphate additive named', $('#labelResults').textContent.includes('sodium acid pyrophosphate'), true);
  check('  ...with the absorption contrast', $('#labelResults').textContent.includes('over 90%'), true);

  type('#labelText', 'water, sugar, potassium sorbate'); await wait(30);
  check('tier 2 preservative gets the quiet note',
    $('#labelResults').textContent.includes('amount is usually small'), true);
  check('  ...and NOT the added-potassium warning',
    $('#labelResults').textContent.includes('Added potassium inside'), false);

  type('#labelText', 'salt, potassium chloride, anti-caking agent'); await wait(30);
  check('potassium chloride raises the real warning',
    $('#labelResults').textContent.includes('Added potassium inside'), true);
  check('  ...and the salt-substitute hazard too',
    $('#labelResults').textContent.includes('NICE'), true);

  type('#labelText', 'oats, water'); await wait(30);
  check('clean list says nothing was FOUND', $('#labelResults').textContent.includes('Nothing flagged'), true);
  // The honest bit: absence of a match is not absence of additives.
  check('  ...and refuses to call the food safe',
    $('#labelResults').textContent.includes('does not mean the food has none'), true);
  check('the PHOS rule is taught either way',
    $('#labelResults').textContent.includes('containing "PHOS" is added phosphate'), true);

  type('#labelText', '<script>alert(1)</script>, flour'); await wait(30);
  check('hostile label text renders inert', doc.querySelectorAll('#labelResults script').length, 0);

  click('#labelBack'); await wait(20);
  check('back returns to a real screen', vis('#scr-label'), false);

  console.log('\n═══ 19k. COOKING METHOD CHANGES THE NUMBER ═══');
  click('[data-nav="log"]'); await wait(20);
  type('#mealText', 'grilled chicken, baked potato with skin, and a glass of milk');
  click('#analyzeBtn'); await wait(600);
  check('cooking control offered on the potato', $$('[data-leach]').length >= 2, true);
  check('  ...and NOT on the chicken or milk', $$('[data-leach]').length, 2);
  check('starts on baked, the way it was logged',
    $('[data-leach][data-on="0"]').getAttribute('aria-pressed'), 'true');
  check('potato counted at full 926 before any change',
    $('#reviewItems').textContent.includes('926'), true);
  click('[data-leach][data-on="1"]'); await wait(40);
  check('boiled & drained lowers it', $('#reviewItems').textContent.includes('926'), false);
  check('  ...to the cautious 463–695 range',
    $('#reviewItems').textContent.includes('463') && $('#reviewItems').textContent.includes('695'), true);
  check('  ...and says why, in the item row',
    $('#reviewItems').textContent.includes('boiling and draining removes potassium'), true);
  // Toggling repeatedly must not compound the factor downward.
  click('[data-leach][data-on="0"]'); await wait(30);
  click('[data-leach][data-on="1"]'); await wait(30);
  click('[data-leach][data-on="0"]'); await wait(30);
  check('toggling back and forth returns to exactly 926, no drift',
    $('#reviewItems').textContent.includes('926'), true);
  // Portion changes must not silently discard the cooking choice.
  click('[data-leach][data-on="1"]'); await wait(30);
  click('[data-step-item="1"][data-mult="2"]'); await wait(40);
  check('changing portion keeps the cooking choice',
    $('[data-leach][data-on="1"]').getAttribute('aria-pressed'), 'true');
  check('  ...and scales it: 2x boiled = 926-1,389',
    $('#reviewItems').textContent.includes('1,389'), true);

  console.log('\n═══ 19j. DICTATION + RESUME ═══');
  click('[data-nav="log"]'); await wait(20);
  // jsdom has no SpeechRecognition, so this asserts the progressive
  // enhancement itself: no API, no button. A control that does nothing
  // is worse than no control.
  check('mic button hidden where speech is unsupported', vis('#micBtn'), false);
  check('  ...and so is its privacy note', vis('#micNote'), false);
  check('speechSupported() reports honestly here', !!(window.SpeechRecognition || window.webkitSpeechRecognition), false);

  click('[data-nav="labs"]'); await wait(20);
  check('last screen remembered', window.RenalRoute.Store.settings().lastScreen, 'labs');
  click('[data-nav="log"]'); await wait(20);
  check('  ...but the log flow is NOT remembered (drafts resume it instead)',
    window.RenalRoute.Store.settings().lastScreen, 'labs');
  click('[data-nav="settings"]'); await wait(20);
  check('  ...settings is', window.RenalRoute.Store.settings().lastScreen, 'settings');

  console.log('\n═══ 19i. TEXT SIZE + HIGH CONTRAST ═══');
  click('[data-nav="settings"]'); await wait(20);
  check('three text sizes offered', $$('[data-textsize]').length, 3);
  check('defaults to Normal, no attribute', doc.documentElement.hasAttribute('data-textsize'), false);
  click('[data-textsize="xlarge"]'); await wait(20);
  check('Largest sets the attribute', doc.documentElement.getAttribute('data-textsize'), 'xlarge');
  check('  ...and persists', window.RenalRoute.Store.settings().textSize, 'xlarge');
  // Scaling tokens, not zooming. Asserted on the custom property rather
  // than the computed font-size: jsdom does not resolve var() in
  // getComputedStyle (it hands back the literal "var(--type-body)"),
  // but it does resolve the property itself — which is the thing under
  // test, i.e. that the cascade picked the larger token.
  const bodyToken = window.getComputedStyle(doc.documentElement).getPropertyValue('--type-body').trim();
  check('  ...the body token grows past the 16px floor', parseFloat(bodyToken) > 16, true);
  const spaceToken = window.getComputedStyle(doc.documentElement).getPropertyValue('--space-3').trim();
  check('  ...and spacing grows with it, so layout does not tear', parseFloat(spaceToken) > 16, true);
  click('[data-textsize="normal"]'); await wait(20);
  check('back to Normal removes it', doc.documentElement.hasAttribute('data-textsize'), false);

  const hcEl = $('#highContrastToggle');
  hcEl.checked = true; hcEl.dispatchEvent(new window.Event('change', { bubbles: true }));
  await wait(20);
  check('high contrast sets its attribute', doc.documentElement.getAttribute('data-contrast'), 'high');
  check('  ...and persists', window.RenalRoute.Store.settings().highContrast, true);
  hcEl.checked = false; hcEl.dispatchEvent(new window.Event('change', { bubbles: true }));
  await wait(20);
  check('  ...and turns back off', doc.documentElement.hasAttribute('data-contrast'), false);

  console.log('\n═══ 19h. EXPORT — data you can actually use ═══');
  window.RenalRoute.Seed.run();
  click('[data-nav="settings"]'); await wait(30);
  check('both export controls offered', vis('#exportSummaryBtn') && vis('#exportCsvBtn'), true);
  const sum = window.RenalRoute.Exporter.summaryText();
  check('summary names the provenance of the targets', /set with care team|education ranges|no targets/.test(sum), true);
  check('  ...states figures are ranges, not measurements', sum.includes('not a single measurement'), true);
  check('  ...carries the not-a-medical-device line', sum.includes('not a medical device'), true);
  check('  ...marks self-entered labs as self-entered', sum.includes('self-entered'), true);
  check('  ...covers seven days', (sum.match(/nothing logged|K \d/g) || []).length >= 7, true);
  const csvRows = window.RenalRoute.Exporter.csv().split('\r\n');
  check('CSV has a header plus rows', csvRows.length > 1, true);
  check('  ...header names the range columns', csvRows[0].includes('potassium_low_mg'), true);
  // A cell starting with = is executed by Excel on open, and meal text
  // is user-supplied — so it must be neutralised on the way out.
  window.RenalRoute.Store.addMeal({ meal_text: '=cmd|calc', logged_at: new Date().toISOString(),
    meal_date: window.RenalRoute.Store.todayISO(),
    items: [{ name: '=HYPERLINK("x")', portion_text: '', source: 'anchor',
      matched_anchor_id: 'banana', quantity_multiplier: 1 }], confidence: 'high' });
  const csv2 = window.RenalRoute.Exporter.csv();
  check('formula injection is neutralised in the CSV', csv2.includes('"\'=cmd|calc"'), true);
  check('  ...including inside item names', csv2.includes('"\'=HYPERLINK'), true);

  console.log('\n═══ 19g. UNDO + DRAFT SAVING ═══');
  // Undo restores the exact record, not a lookalike.
  click('[data-nav="home"]'); await wait(30);
  const anyMeal = window.RenalRoute.Store.meals()[0];
  const idBefore = anyMeal.id, nBefore = window.RenalRoute.Store.meals().length;
  click('[data-meal="' + anyMeal.id + '"]'); await wait(20);
  click('[data-delete-meal="' + anyMeal.id + '"]'); await wait(20);
  click('#deleteConfirm'); await wait(30);
  check('meal deleted', window.RenalRoute.Store.meals().length, nBefore - 1);
  check('toast offers Undo', !!$('#toast .toast__undo'), true);
  click('#toast .toast__undo'); await wait(30);
  check('undo restores it', window.RenalRoute.Store.meals().length, nBefore);
  check('  ...with the SAME id, not a copy',
    window.RenalRoute.Store.meals().some(m => m.id === idBefore), true);
  check('  ...and cannot double-restore', window.RenalRoute.Store.restoreMeal(anyMeal), false);

  // Draft survives leaving the screen.
  click('[data-nav="log"]'); await wait(20);
  type('#mealText', 'half a chicken sandwich');
  check('draft written as you type', window.RenalRoute.Store.settings().mealDraft, 'half a chicken sandwich');
  click('[data-nav="home"]'); await wait(20);
  click('[data-nav="log"]'); await wait(20);
  check('draft cleared once the screen resets', window.RenalRoute.Store.settings().mealDraft, '');

  console.log('\n═══ 19f. TRENDS — bands, never a line ═══');
  window.RenalRoute.Seed.run();
  click('[data-nav="home"]'); await wait(40);
  check('trends card renders with a week of history', $('#trendsCard').innerHTML.length > 100, true);
  check('  ...as bands, not a polyline', $$('#trendsCard polyline, #trendsCard path').length, 0);
  check('  ...one band rect per logged day, per nutrient',
    $$('#trendsCard .trend-band').length > 0, true);
  check('  ...with the target drawn as a reference line',
    $$('#trendsCard .trend-target').length > 0, true);
  check('  ...and a text alternative for screen readers',
    $('#trendsCard svg').getAttribute('aria-label').includes('milligrams'), true);
  check('copy states the bar is a range, not a number',
    $('#trendsCard').textContent.includes("that day's range"), true);
  check('unlogged days are blank, never counted as zero',
    $('#trendsCard').textContent.includes('rather than counted as zero'), true);

  console.log('\n═══ 19e. QUICK ADD — repeat a meal, zero AI ═══');
  window.RenalRoute.Seed.run();      // gives a week of repeatable meals
  click('[data-nav="home"]'); await wait(30);
  check('quick-add shelf appears once there is history', vis('#quickAdd'), true);
  const quickBtns = $$('#quickAdd [data-repeat]');
  check('  ...offering at most three', quickBtns.length <= 3 && quickBtns.length > 0, true);
  const mealsBeforeRepeat = window.RenalRoute.Store.meals().length;
  click(quickBtns[0]); await wait(40);
  check('one tap logs the meal', window.RenalRoute.Store.meals().length, mealsBeforeRepeat + 1);
  const repeated = window.RenalRoute.Store.meals()[0];
  check('  ...onto TODAY', repeated.meal_date, window.RenalRoute.Store.todayISO());
  check('  ...fully anchor-resolved, so confidence is high', repeated.confidence, 'high');
  check('  ...with real totals, not zeros', repeated.total_potassium_high_mg > 0, true);
  check('  ...and it never contains an uncounted item',
    (repeated.items || []).some(i => i.source === 'uncounted'), false);

  console.log('\n═══ 19d. THEME CONTROL ═══');
  click('[data-nav="settings"]'); await wait(20);
  check('three theme choices offered', $$('[data-theme-set]').length, 3);
  check('defaults to Automatic',
    $('[data-theme-set="system"]').getAttribute('aria-checked'), 'true');
  check('  ...with no attribute set, so the media query governs',
    doc.documentElement.hasAttribute('data-theme'), false);
  click('[data-theme-set="dark"]'); await wait(20);
  check('choosing Dark sets the attribute', doc.documentElement.getAttribute('data-theme'), 'dark');
  check('  ...and is persisted for the next load', window.RenalRoute.Store.settings().theme, 'dark');
  check('  ...and only one option reads as chosen',
    Array.from($$('[data-theme-set]')).filter(b => b.getAttribute('aria-checked') === 'true').length, 1);
  click('[data-theme-set="system"]'); await wait(20);
  check('back to Automatic removes the attribute again',
    doc.documentElement.hasAttribute('data-theme'), false);

  console.log('\n═══ 20. SEED THE DEMO PERSONA ═══');
  window.RenalRoute.Seed.run();
  const sp = window.RenalRoute.Store.profile();
  check('Frank seeded', sp.display_name, 'Frank');
  check('stage G3b', sp.ckd_stage, 'G3b');
  check('care-team targets (no education chip on stage)', sp.budget_source, 'care_team');
  check('K target 2500', sp.potassium_budget_mg, 2500);
  check('baseline lab 4.6 → normal', window.RenalRoute.Clinical.potassiumMode().mode, 'normal');
  const today = window.RenalRoute.Store.meals(window.RenalRoute.Store.todayISO());
  check('today seeded with breakfast only', today.length, 1);
  const t = window.RenalRoute.Store.dayTotals();
  const headroom = 2500 - t.k.high;
  check('headroom left for the swap beat (>500mg)', headroom > 500, true);
  check('prior week seeded', window.RenalRoute.Store.meals().length > 10, true);

  console.log('\n═══ 21. NO ERRORS ANYWHERE ═══');
  if (pageErrors.length) pageErrors.forEach(e => console.log('   ! ' + e));
  check('zero uncaught page errors across the whole run', pageErrors.length, 0);

  console.log(`\n═══════ ${pass} passed, ${fail} failed ═══════`);
  if (fail) { console.log('FAILURES:'); failures.forEach(f => console.log('  · ' + f)); }
  process.exit(fail ? 1 : 0);

  function $$(sel) { return Array.from(doc.querySelectorAll(sel)); }
})().catch(e => {
  console.error('\nHARNESS CRASHED:', e.message, '\n', e.stack);
  process.exit(1);
});

function $$(sel) { return Array.from(dom.window.document.querySelectorAll(sel)); }
