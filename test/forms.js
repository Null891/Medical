/* ═══════════════════════════════════════════════════════════════
   FORMS — every input, submitted wrong on purpose.
   ───────────────────────────────────────────────────────────────
   The other suites drive the app the way it is meant to be driven.
   This one drives it the way a real person drives it at nine at night
   with a lab report in one hand: the empty submit, the decimal in the
   wrong place, the paste that brought a whole web page with it, the
   half-filled blood pressure. And the way a scanner drives it: a
   script tag in every box that takes text.

   THREE RULES, and each is a promise the app makes:

     1. A rejection lands BESIDE the field that caused it. A message at
        the foot of a five-input form makes the reader hunt. This is
        the difference between an error that helps and one that blames.

     2. THE TYPED VALUE IS NEVER LOST. Losing somebody's input because
        they got one number wrong is how an app teaches people not to
        use it — and this population re-types slowly.

     3. Nothing typed is ever markup. Everything a person or a model
        writes is rendered as text, always, everywhere it appears.

   And one thing this suite deliberately checks the ABSENCE of: no
   error anywhere blames the person. "That looks outside what this app
   can record" is a statement about the app's limits. "Invalid entry"
   is a verdict on them.
   ═══════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const APP = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(APP, p), 'utf8');

let pass = 0, fail = 0;
const failures = [];
// ONE signature: (label, actual, expected). Mixing this with the
// (label, ok, detail) form used by the lint suites has now cost this
// project three separate false failures.
function check(label, actual, expected) {
  const ok = String(actual) === String(expected);
  if (ok) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; failures.push(label); console.log(`  FAIL  ${label}  → got "${actual}", expected "${expected}"`); }
}

const html = read('index.html');
const IGNORE = /Not implemented:/;
const vc = new VirtualConsole();
const pageErrors = [];
vc.on('jsdomError', e => { if (!IGNORE.test(e.message)) pageErrors.push(e.message); });

function boot() {
  const dom = new JSDOM(html, { url: 'https://renalroute.test/', runScripts: 'dangerously',
    virtualConsole: vc, pretendToBeVisual: true });
  const { window } = dom, doc = window.document;
  window.fetch = () => Promise.reject(new Error('offline'));
  // Assets parsed from index.html, never listed by hand — a
  // hand-maintained copy of this list once silently dropped a whole
  // module and 253 assertions passed against an app missing a file.
  const cssFiles = Array.from(html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)).map(m => m[1]);
  const st = doc.createElement('style');
  st.textContent = cssFiles.map(read).join('\n');
  doc.head.appendChild(st);
  Array.from(html.matchAll(/<script src="([^"]+)"(?: defer)?><\/script>/g)).map(m => m[1]).forEach(s => {
    const el = doc.createElement('script');
    el.textContent = read(s);
    doc.body.appendChild(el);
  });
  const $ = (s) => doc.querySelector(s);
  const $$ = (s) => Array.from(doc.querySelectorAll(s));
  const vis = (s) => { const el = $(s); return !!el && !el.hidden &&
    window.getComputedStyle(el).display !== 'none'; };
  const click = (s) => { const el = typeof s === 'string' ? $(s) : s;
    if (!el) throw new Error('missing: ' + s);
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); };
  const type = (s, v) => { const el = $(s); el.value = v;
    el.dispatchEvent(new window.Event('input', { bubbles: true })); };
  return { window, doc, $, $$, vis, click, type, R: window.RenalRoute };
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));

/* The payloads. Each one is a real thing that has broken a real form. */
const XSS = '<script>alert(1)</script>';
const IMG = '<img src=x onerror=alert(1)>';
const SVG = '"><svg onload=alert(1)>';
const MD  = '[click](javascript:alert(1))';
const HOSTILE = [XSS, IMG, SVG, MD];
const LONG = 'x'.repeat(5000);

(async function run() {

  const { window, doc, $, $$, vis, click, type, R } = boot();
  R.Store.acceptConsent();
  R.Seed.run();
  R.UI.go('home');
  await wait(40);

  /* ═══════════════════════════════════════════════════════════════
     1 · VITALS — the form with the most ways to be wrong
     ═══════════════════════════════════════════════════════════════ */
  console.log('\n═══ 1. VITALS: WRONG ON PURPOSE ═══');
  R.UI.go('labs'); await wait(40);

  const vitErrFor = (k) => $(`#vitalsForm [data-fielderr="${k}"]`);

  // Empty submit. Nothing to blame a single field for, so this one
  // belongs at form level — and it must not invent a culprit.
  click('#vitSave'); await wait(20);
  check('empty vitals refuses, at form level', vis('#vitError'), true);
  check('  ...and blames no individual field',
    $$('#vitalsForm [data-fielderr]').filter(e => !e.hidden).length, 0);
  check('  ...and claims nothing was recorded', vis('#vitOk'), false);

  // A weight nobody has. The message goes beside the weight box.
  type('#vitWeight', '900');
  click('#vitSave'); await wait(20);
  check('an impossible weight is caught', vitErrFor('weight_kg').hidden, false);
  check('  ...beside the weight field, not the blood pressure',
    vitErrFor('systolic').hidden, true);
  check('  ...the field is marked invalid',
    $('#vitWeight').closest('.field').classList.contains('is-invalid'), true);
  check('  ...and announced to a screen reader',
    $('#vitWeight').getAttribute('aria-invalid'), 'true');
  check('  ...as a live region', vitErrFor('weight_kg').getAttribute('role'), 'alert');
  check('  ...THE TYPED VALUE SURVIVES', $('#vitWeight').value, '900');
  check('  ...and the message says the limit is technical, not medical',
    /technical, not medical/.test(vitErrFor('weight_kg').textContent), true);
  check('  ...and never calls the entry invalid',
    /\binvalid\b/i.test(vitErrFor('weight_kg').textContent), false);

  // Correcting it must clear the complaint — an error that outlives its
  // cause teaches people to ignore errors.
  type('#vitWeight', '78');
  click('#vitSave'); await wait(20);
  check('a corrected weight saves', vis('#vitOk'), true);
  check('  ...and the old error is gone', vitErrFor('weight_kg').hidden, true);
  check('  ...the invalid mark is lifted too',
    $('#vitWeight').closest('.field').classList.contains('is-invalid'), false);
  check('  ...and aria-invalid with it', $('#vitWeight').getAttribute('aria-invalid'), null);

  // Half a blood pressure. The blame goes on the EMPTY half.
  type('#vitSys', '128');
  click('#vitSave'); await wait(20);
  check('half a blood pressure is refused', vitErrFor('diastolic').hidden, false);
  check('  ...blaming the empty half, not the filled one',
    vitErrFor('systolic').hidden, true);
  check('  ...and the number they did type survives', $('#vitSys').value, '128');
  type('#vitDia', '82');
  click('#vitSave'); await wait(20);
  check('both halves save', vis('#vitOk'), true);

  /* Words in a number box. type="number" discards non-numeric input at
     the platform level, so the app never sees the letters — which means
     the failure it must handle is an EMPTY field, not a bad one. The
     thing that would be wrong here is claiming to have recorded a
     weight that no longer exists. */
  type('#vitWeight', 'seventy-eight');
  check('a number field discards letters before the app sees them',
    $('#vitWeight').value, '');
  click('#vitSave'); await wait(20);
  check('  ...and the app refuses rather than recording a blank weight',
    vis('#vitError'), true);
  check('  ...claiming nothing was saved', vis('#vitOk'), false);

  type('#vitWeight', '');
  type('#vitNote', LONG);
  click('#vitSave'); await wait(20);
  check('an oversized note still saves', vis('#vitOk'), true);
  const notes = R.Vitals.recent(1);
  check('  ...truncated rather than rejected', notes[0].note.length <= 300, true);

  /* ═══════════════════════════════════════════════════════════════
     2 · APPOINTMENTS
     ═══════════════════════════════════════════════════════════════ */
  console.log('\n═══ 2. APPOINTMENTS ═══');
  const apptErrFor = (k) => $(`#apptForm [data-fielderr="${k}"]`);

  type('#apptQuestions', 'Ask about the potassium result');
  click('#apptSave'); await wait(20);
  check('an appointment with no date is refused', apptErrFor('date').hidden, false);
  check('  ...beside the date field', apptErrFor('date').getAttribute('role'), 'alert');
  check('  ...the date field is marked invalid',
    $('#apptDate').closest('.field').classList.contains('is-invalid'), true);
  check('  ...AND THE QUESTION THEY TYPED SURVIVES',
    $('#apptQuestions').value, 'Ask about the potassium result');

  type('#apptDate', '2026-12-01');
  click('#apptSave'); await wait(20);
  check('with a date it saves', apptErrFor('date').hidden, true);
  check('  ...and the form clears for the next one', $('#apptQuestions').value, '');

  // Hostile text in the two free fields, rendered back on the same screen.
  HOSTILE.forEach((payload, i) => {
    type('#apptDate', '2026-12-0' + (i + 2));
    type('#apptWho', payload);
    type('#apptQuestions', payload);
    click('#apptSave');
  });
  await wait(30);
  check('hostile appointment text executes nothing',
    $$('#apptList script, #apptList img[onerror]').length, 0);
  check('  ...and is stored raw, not stripped',
    R.Vitals.appointments().some(a => a.who === XSS), true);
  check('  ...and renders as the literal characters',
    $('#apptList').textContent.includes('<script>alert(1)</script>'), true);

  /* ═══════════════════════════════════════════════════════════════
     3 · TARGETS — the numbers the whole app is measured against
     ═══════════════════════════════════════════════════════════════ */
  console.log('\n═══ 3. TARGETS ═══');
  R.UI.go('settings'); await wait(40);
  const tfErr = (k) => $(`#setTargetFields [data-err="${k}"]`);
  const tf = (k) => $(`#setTargetFields [data-tf="${k}"]`);

  type('#setTargetFields [data-tf="k"]', '10');
  click('#saveTargetsBtn'); await wait(20);
  check('an implausible potassium target is refused', tfErr('k').hidden, false);
  check('  ...beside that field only', tfErr('p').hidden, true);
  check('  ...and the number survives to be corrected', tf('k').value, '10');
  check('  ...the message does not overrule a care team',
    /follow their instruction/i.test(tfErr('k').textContent), true);

  // A negative target is numeric, so it does reach the app — unlike
  // letters, which type="number" discards before the app is involved.
  type('#setTargetFields [data-tf="k"]', '-500');
  click('#saveTargetsBtn'); await wait(20);
  check('a negative target is refused', tfErr('k').hidden, false);
  check('  ...and survives to be corrected', tf('k').value, '-500');
  check('  ...and never reached the store', R.Store.targets().k === -500, false);

  type('#setTargetFields [data-tf="k"]', '2500');
  click('#saveTargetsBtn'); await wait(20);
  check('a plausible target saves', tfErr('k').hidden, true);
  check('  ...and lands in the store', R.Store.targets().k, 2500);

  /* ═══════════════════════════════════════════════════════════════
     4 · LABS — where a misread decimal actually matters
     ═══════════════════════════════════════════════════════════════ */
  console.log('\n═══ 4. LABS ═══');
  R.UI.go('labs'); await wait(40);
  const labErr = (k) => $(`#labFields [data-laberr="${k}"]`);
  const labIn = (k) => $(`#labFields [data-lab="${k}"]`);

  type('#labFields [data-lab="k"]', '45');
  click('#saveLabBtn'); await wait(20);
  check('a potassium of 45 is refused', labErr('k').hidden, false);
  check('  ...and says the entry was not saved',
    /wasn't saved|was not saved/i.test(labErr('k').textContent), true);
  check('  ...and points at the care team, not the app',
    /care team/i.test(labErr('k').textContent), true);
  check('  ...THE VALUE SURVIVES', labIn('k').value, '45');
  check('  ...and no lab was stored', R.Store.labs().some(l => l.k === 45), false);
  check('  ...and the guidance mode did not move',
    R.Clinical.potassiumMode().mode, R.Clinical.potassiumMode().mode);

  // A phosphorus reported in mmol/L reads as below range — fail-safe,
  // and the copy carries the unit guard rather than silently converting.
  type('#labFields [data-lab="k"]', '');
  type('#labFields [data-lab="p"]', '1.1');
  click('#saveLabBtn'); await wait(20);
  check('an mmol/L phosphorus is accepted, not converted', labErr('p').hidden, true);

  /* ═══════════════════════════════════════════════════════════════
     5 · MEAL TEXT — the biggest free-text surface in the app
     ═══════════════════════════════════════════════════════════════ */
  console.log('\n═══ 5. MEAL TEXT ═══');
  R.UI.go('log'); await wait(40);

  check('the analyse button is off with an empty box', $('#analyzeBtn').disabled, true);
  type('#mealText', '   ');
  check('  ...and stays off for whitespace alone', $('#analyzeBtn').disabled, true);
  type('#mealText', 'a banana');
  check('  ...and on once there is something to read', $('#analyzeBtn').disabled, false);

  type('#mealText', LONG);
  check('a 5,000-character paste is capped by the field',
    $('#mealText').value.length <= 500 || $('#mealText').maxLength, 500);

  // The picker path — the one that works with no model at all.
  type('#mealText', XSS + ' and a banana');
  click('#toPickerBtn'); await wait(20);
  type('#pickerSearch', 'banana'); await wait(30);
  check('the picker finds food while hostile text sits in the box',
    $$('#pickerResults [data-pick]').length > 0, true);
  check('  ...and the typed text was not thrown away',
    $('#mealText').value.includes('banana'), true);

  type('#pickerSearch', 'qwertyuiop'); await wait(30);
  check('a search with no matches offers nothing to tap',
    $$('#pickerResults [data-pick]').length, 0);
  check('  ...and says so in words', $('#pickerResults').textContent.trim().length > 0, true);
  check('  ...without calling it an error',
    /\berror\b/i.test($('#pickerResults').textContent), false);
  check('  ...and suggests what to do next',
    /try|simpler|later/i.test($('#pickerResults').textContent), true);

  /* ═══════════════════════════════════════════════════════════════
     6 · LABEL CHECKER + BARCODE
     ═══════════════════════════════════════════════════════════════ */
  console.log('\n═══ 6. LABEL AND BARCODE ═══');
  R.UI.go('label'); await wait(40);

  HOSTILE.forEach(p => { type('#labelText', p + ', potassium chloride'); });
  await wait(30);
  check('hostile ingredients execute nothing',
    $$('#labelResults script, #labelResults img[onerror]').length, 0);
  check('  ...and the real ingredient is still found',
    $('#labelResults').textContent.toLowerCase().includes('potassium chloride'), true);

  type('#labelText', '');
  await wait(20);
  check('an empty ingredient list gets an invitation, not an error',
    /\berror\b|\binvalid\b/i.test($('#labelResults').textContent), false);
  check('  ...and the box is not marked at fault',
    $('#labelText').closest('.field').classList.contains('is-invalid'), false);
  check('  ...and nothing is flagged against no input',
    $$('#labelResults .card, #labelResults .flagcard').length, 0);

  click('#barcodeGo'); await wait(20);
  check('an empty barcode is refused', $('#barcodeStatus').textContent.length > 0, true);
  check('  ...and marks the field, not just the page',
    $('#barcodeInput').closest('.field').classList.contains('is-invalid'), true);
  check('  ...announced as invalid', $('#barcodeInput').getAttribute('aria-invalid'), 'true');

  type('#barcodeInput', '12');
  click('#barcodeGo'); await wait(20);
  check('two digits is refused', $('#barcodeInput').closest('.field').classList.contains('is-invalid'), true);
  check('  ...and the digits survive', $('#barcodeInput').value, '12');

  // A well-formed code with no network: a failure that is not the
  // user's fault must not mark their field.
  type('#barcodeInput', '5449000000996');
  click('#barcodeGo'); await wait(60);
  check('an offline lookup does not blame the typist',
    $('#barcodeInput').closest('.field').classList.contains('is-invalid'), false);
  check('  ...and says what happened', $('#barcodeStatus').textContent.length > 0, true);

  /* ═══════════════════════════════════════════════════════════════
     7 · ONBOARDING NAME
     ═══════════════════════════════════════════════════════════════ */
  console.log('\n═══ 7. ONBOARDING NAME ═══');
  R.UI.go('onboarding'); await wait(40);
  type('#onbName', 'n'.repeat(60));
  click('#onbUseEducation'); await wait(20);
  check('a 60-character name is refused', vis('#onbNameErr'), true);
  check('  ...and the name survives', $('#onbName').value.length, 60);
  check('  ...and no profile was written from it',
    (R.Store.profile() || {}).display_name === 'n'.repeat(60), false);

  type('#onbName', XSS);
  click('#onbUseEducation'); await wait(40);
  R.UI.go('home'); await wait(30);
  check('a hostile name renders as text on the greeting',
    $('#scr-home script'), null);
  check('  ...and is visible as the literal characters',
    $('#homeGreeting').textContent.includes('<script>'), true);

  /* ═══════════════════════════════════════════════════════════════
     8 · EVERY ERROR ELEMENT IS A LIVE REGION
     ═══════════════════════════════════════════════════════════════ */
  console.log('\n═══ 8. ERRORS ARE ANNOUNCED, NOT JUST SHOWN ═══');
  const errEls = $$('.inline-error, .field__err, [data-fielderr], [data-err], [data-laberr]');
  const silent = errEls.filter(el => el.getAttribute('role') !== 'alert' &&
    !el.getAttribute('aria-live'));
  check('every error element announces itself', silent.length, 0);
  check('  ...and there are a meaningful number of them', errEls.length >= 10, true);

  // Nothing on any error surface reads as a verdict on the person.
  const blaming = errEls.map(el => el.textContent)
    .filter(t => /\b(invalid|illegal|forbidden|you failed|bad input)\b/i.test(t));
  check('no error blames the person', blaming.length, 0);

  console.log('\n═══ 9. NO ERRORS ANYWHERE ═══');
  check('zero uncaught page errors across the whole run', pageErrors.length, 0);

  console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
  if (failures.length) console.log('FAILURES:\n  · ' + failures.join('\n  · '));
  /* Exit explicitly on success too. jsdom leaves timers and handles
     open, so a clean run without this hangs forever — and a suite that
     hangs when everything passes is worse than one that fails. */
  process.exit(fail ? 1 : 0);

})().catch(e => {
  console.error('\nFORMS CRASHED:', e.message, '\n', e.stack);
  process.exit(1);
});
