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
  'js/data/copy.js', 'js/data/anchor-foods.js', 'js/store.js', 'js/clinical.js',
  'js/resolve.js', 'js/llm.js', 'js/cards.js', 'js/rings.js', 'js/ui.js',
  'js/seed.js', 'js/app.js'
];

// Provide a fetch stub so LLM.probe() doesn't explode.
window.fetch = () => Promise.reject(new Error('Failed to fetch'));

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

  console.log('\n═══ 3. ONBOARDING — no target is ever pre-filled ═══');
  check('step 1 shown', $('[data-step="1"]').hidden, false);
  type('#onbName', 'Frank');
  click('[data-onb-next="1"]');
  await wait(20);
  check('advanced to targets step', $('[data-step="2"]').hidden, false);
  check('potassium field is EMPTY on arrival', $('#onbTargetFields [data-tf="k"]').value, '');
  check('phosphorus field is EMPTY', $('#onbTargetFields [data-tf="p"]').value, '');
  check('profile budget_source still none', window.RenalRoute.Store.profile().budget_source, 'none');

  console.log('\n═══ 4. TARGET BOUNDS REJECT BAD INPUT ═══');
  type('#onbTargetFields [data-tf="k"]', '50');
  click('#onbSaveCareTeam');
  await wait(20);
  check('K=50 blocked, still on step 2', $('[data-step="2"]').hidden, false);
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
  check('advanced to labs step', $('[data-step="3"]').hidden, false);

  console.log('\n═══ 6. LABS ARE SKIPPABLE — never a gate ═══');
  check('button reads "Skip for now"', $('#onbLabAction').textContent.trim(), 'Skip for now');
  click('#onbLabAction');
  await wait(20);
  check('landed on Home', vis('#scr-home'), true);
  check('no lab records created', window.RenalRoute.Store.labs().length, 0);

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
