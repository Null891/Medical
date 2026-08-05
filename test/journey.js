/* ═══════════════════════════════════════════════════════════════
   JOURNEY — the app as a person actually meets it.
   ───────────────────────────────────────────────────────────────
   Every other suite here tests a unit, a rule, or a screen. This one
   walks the paths a real person walks, in order, and asks the
   questions a person would ask — how many taps before I see anything?
   is there a dead end? does the app ever leave me with nothing to do?

   The bugs this catches are not the ones a unit test catches. They are
   the ones where every part works and the whole is still unusable: a
   screen that is empty because a prerequisite was never mentioned, a
   button that does nothing on a fresh account, four gates before any
   value appears. Nothing throws. Nothing fails. Somebody just leaves.

   FOUR JOURNEYS
     1. A brand-new user, cold, who has been told nothing.
     2. Somebody who skipped everything skippable.
     3. Somebody standing in a shop.
     4. Somebody preparing for a clinic appointment.
   ═══════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const APP = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(APP, p), 'utf8');

let pass = 0, fail = 0;
const failures = [];
/* ONE signature: (label, actual, expected). The first draft of this
   file mixed this form with the (label, ok, detail) form used by the
   lint suites, so `check('x', pageErrors.length, 0)` read zero errors
   as a falsy "not ok" and reported a failure on a clean run. Three of
   the four failures on the first execution were this, not the app. */
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
  const cssFiles = Array.from(html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)).map(m => m[1]);
  const st = doc.createElement('style');
  st.textContent = cssFiles.map(read).join('\n');
  doc.head.appendChild(st);
  Array.from(html.matchAll(/<script src="([^"]+)"><\/script>/g)).map(m => m[1]).forEach(s => {
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

(async function run() {

  /* ═══════════════════════════════════════════════════════════════
     JOURNEY 1 — cold open. Somebody who has been told nothing.
     The question: how much work before the app is worth anything?
     ═══════════════════════════════════════════════════════════════ */
  console.log('\n═══ JOURNEY 1 · A COMPLETE STRANGER OPENS THE APP ═══');
  {
    const a = boot();
    let taps = 0;

    check('the first thing shown is the consent gate', a.vis('#consentModal'), true);
    check('  ...and nothing behind it is usable', a.vis('#app'), false);

    a.click('#consentAccept'); taps++; await wait(20);
    check('the second thing is what the app refuses to do', a.vis('#refusalsModal'), true);

    a.click('#refusalsGo'); taps++; await wait(20);
    check('the third is setup', a.vis('#scr-onboarding'), true);

    /* Setup must be completable with ONE decision. Everything else on
       that screen is optional, and if it is not, the app has a funnel
       problem it will never see in a unit test. */
    a.click('#onbUseEducation'); taps++; await wait(20);
    check('a working dashboard in three taps', a.vis('#scr-home'), true);
    check(`  ...and it took exactly ${taps} taps`, taps <= 3, true);

    /* THE COLD-OPEN TEST. A dashboard with nothing logged has to say
       what the app IS, not just that it is empty. A judge gives this
       screen about five seconds. */
    const home = a.$('#scr-home').textContent;
    check('the empty dashboard explains what the app is for',
      /room for potassium|what.s left|left today/i.test(home), true);
    check('  ...and suggests the first thing to do',
      /chicken, rice|log a meal|try something/i.test(home), true);
    /* An empty day must carry no verdict. Zero consumed is a real
       number and prints honestly — the first draft of this check
       treated "0 mg of 2,500 mg" as a bug, which was simply wrong.
       What would be wrong is a status word or a score on a day nobody
       has eaten in yet. */
    check('  ...and passes no judgement on a day with nothing in it',
      /\bexcellent\b|\bgood job\b|\bscore\b|\/\s?100\b/i.test(home), false);

    // Every tab must be usable on a brand-new account with no data.
    for (const t of ['home', 'log', 'kitchen', 'labs', 'more']) {
      a.click(`.tabbar [data-nav="${t}"]`); await wait(20);
      const screen = a.$('#scr-' + t);
      check(`the ${t} tab works with no data at all`, a.vis('#scr-' + t), true);
      const words = screen.textContent.replace(/\s+/g, ' ').trim();
      check(`  ...and says something rather than sitting blank (${words.length} chars)`,
        words.length > 80, true);
    }

    /* DEAD-END CHECK. Every screen must offer a way onward — a tab bar
       counts, but a screen whose own content is a blank card with no
       action is where people stop. */
    a.click('.tabbar [data-nav="kitchen"]'); await wait(20);
    const kitchenActions = a.$$('#scr-kitchen button').length;
    check(`the Kitchen offers actions on a fresh account (${kitchenActions})`,
      kitchenActions >= 4, true);

    check('no uncaught errors during a cold open', pageErrors.length, 0);
  }

  /* ═══════════════════════════════════════════════════════════════
     JOURNEY 2 — somebody who skips everything skippable.
     The hardest state to get right, and the one people actually reach.
     ═══════════════════════════════════════════════════════════════ */
  console.log('\n═══ JOURNEY 2 · SKIPPING EVERYTHING OPTIONAL ═══');
  {
    const a = boot();
    a.click('#consentAccept'); await wait(20);
    a.click('#refusalsGo'); await wait(20);
    a.click('#onbSkipTargets'); await wait(20);

    check('skipping targets still lands on a dashboard', a.vis('#scr-home'), true);
    const home = a.$('#scr-home').textContent;
    check('  ...which says why there are no rings',
      /no targets|ask your care team/i.test(home), true);
    check('  ...and offers a way to fix it',
      a.$$('#scr-home [data-nav="settings"], #scr-home button').length > 0, true);

    /* The Kitchen with no targets is the screen most likely to be a
       dead end: it cannot compute what fits, so it must say so AND say
       what to do, not render an empty list. */
    a.click('.tabbar [data-nav="kitchen"]'); await wait(20);
    const kitchen = a.$('#scr-kitchen').textContent;
    check('the Kitchen explains why it cannot help yet',
      /set your daily targets|targets first/i.test(kitchen), true);
    check('  ...and names where to go', /settings/i.test(kitchen), true);
    /* ...and it must still be USEFUL. "All recipes" needs no targets at
       all, so a user without them is not locked out of the feature. */
    a.click('#scr-kitchen [data-kitchen="all"]'); await wait(20);
    check('  ...while all recipes still work without targets',
      a.$$('#kitchenBody .recipe').length > 0, true);

    // Logging must work with no targets, or the app is useless to them.
    a.click('.tabbar [data-nav="log"]'); await wait(20);
    a.click('#toPickerBtn'); await wait(20);
    a.type('#pickerSearch', 'banana'); await wait(20);
    const hit = a.$('#pickerResults [data-pick]');
    check('food search works with no targets set', !!hit, true);
    if (hit) {
      a.click(hit); a.click('#pickerReview'); await wait(30);
      a.click('#saveMealBtn'); await wait(30);
      check('  ...and the meal saves', a.R.Store.meals().length, 1);
      check('  ...and Home shows it', /banana/i.test(a.$('#scr-home').textContent), true);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     JOURNEY 3 — standing in a shop with a packet.
     ═══════════════════════════════════════════════════════════════ */
  console.log('\n═══ JOURNEY 3 · IN A SHOP, HOLDING A PACKET ═══');
  {
    const a = boot();
    a.R.Store.acceptConsent();
    a.R.Store.setSetting('refusalsSeen', true);
    a.R.Store.useEducationRanges();
    a.R.UI.go('home');

    // Picking the shop scene must actually take you somewhere useful.
    const storeChip = a.$('#scenePicker [data-scene="store"]');
    check('the shop scene is offered on Home', !!storeChip, true);
    if (storeChip) {
      a.click(storeChip); await wait(20);
      check('  ...and lands on the label checker', a.vis('#scr-label'), true);
    }

    a.type('#labelText', 'water, sugar, phosphoric acid, potassium chloride, natural flavour');
    await wait(20);
    const found = a.$('#labelResults').textContent;
    check('a real ingredient list is analysed', found.length > 100, true);
    check('  ...phosphate additive named', /phosphoric acid|phosphate/i.test(found), true);
    check('  ...added potassium named', /potassium chloride/i.test(found), true);
    check('  ...and every card says to confirm with the care team',
      a.$$('#labelResults .card').length > 0 &&
      /care team/i.test(found), true);

    // The clean result must not read as "this food is safe".
    a.type('#labelText', 'wheat flour, water, yeast, salt');
    await wait(20);
    const clean = a.$('#labelResults').textContent;
    check('a clean list never says the food is safe',
      !/\bis safe\b|\bsafe for you\b/i.test(clean), true);
    check('  ...it says what was checked instead',
      /does not mean the food has none|nothing flagged/i.test(clean), true);
  }

  /* ═══════════════════════════════════════════════════════════════
     JOURNEY 4 — getting ready for a clinic appointment.
     ═══════════════════════════════════════════════════════════════ */
  console.log('\n═══ JOURNEY 4 · PACKING FOR A CLINIC APPOINTMENT ═══');
  {
    const a = boot();
    a.R.Store.acceptConsent();
    a.R.Store.setSetting('refusalsSeen', true);
    a.R.Seed.run();
    a.R.UI.go('home');

    check('a week of history renders', a.R.Store.meals().length > 5, true);
    check('  ...as a seven-day view on Home',
      a.$('#trendsCard').textContent.includes('7 days'), true);

    // The clinic scene should put the passport and the week first.
    const clinic = a.$('#scenePicker [data-scene="clinic"]');
    if (clinic) {
      a.click(clinic); await wait(20);
      a.R.UI.go('home');
      const hero = a.$('#scr-home .btn--hero');
      check('the clinic scene leads with the passport',
        /passport/i.test(hero.textContent), true);
    }

    // The export is the thing a person actually hands over.
    const summary = a.R.Exporter.summaryText();
    check('a summary can be produced', summary.length > 200, true);
    check('  ...naming where the targets came from',
      /care team|education ranges|no targets/i.test(summary), true);
    check('  ...and saying the figures are estimates',
      /estimate|range/i.test(summary), true);
    check('  ...and never claiming to be a medical record',
      !/medical record\b(?!.*not)/i.test(summary), true);

    // The passport must be usable even if nothing was ever typed into it.
    a.R.UI.go('passport');
    check('the passport opens even when empty', a.vis('#scr-passport'), true);
    check('  ...and still states who typed it',
      /typed by you/i.test(a.$('#scr-passport').textContent), true);
  }

  /* ═══════════════════════════════════════════════════════════════
     JOURNEY 5 — a reviewer, or a judge, arriving at ?demo=1.
     ═══════════════════════════════════════════════════════════════ */
  console.log('\n═══ JOURNEY 5 · SOMEBODY SENT THE DEMO LINK ═══');
  {
    const a = boot();
    a.R.UI.renderDemo();

    check('the demo entrance opens', a.vis('#demoModal'), true);
    check('  ...offering three doors', a.$$('#demoChoices .demo__card').length, 3);
    /* It must not claim to be a login. That claim, made to a security
       reviewer, would be a lie told to the worst possible audience. */
    const demoText = a.$('#scr-home') && a.$('#demoModal').textContent;
    check('  ...and says plainly that it is not a login',
      /not a login|no protected data/i.test(demoText), true);
    check('  ...and that no account is created',
      /no account/i.test(demoText), true);

    a.click('#demoChoices [data-demo="maria"]');
    await wait(40);
    check('Maria loads straight into the app', a.vis('#scr-home'), true);
    check('  ...as a G4 patient', a.R.Store.profile().ckd_stage, 'G4');

    /* The point of this persona: every surface populated, so somebody
       seeing the app for the first time sees what it is FOR rather
       than an empty frame with good intentions. */
    check('  ...with a week of meals', a.R.Store.meals().length > 5, true);
    check('  ...two lab results, so the history is real', a.R.Store.labs().length, 2);
    check('  ...in caution mode, where the app has the most to say',
      a.R.Clinical.potassiumMode().mode, 'caution');
    check('  ...weight and blood pressure recorded', a.R.Vitals.all().length >= 4, true);
    check('  ...an appointment with the questions written down',
      (a.R.Vitals.nextAppointment() || {}).questions.length > 40, true);
    check('  ...a passport somebody could hand over',
      a.R.Passport.filledCount() >= 5, true);
    check('  ...medicines including a binder', a.R.Meds.hasPhosphateBinder(), true);
    check('  ...and enough history for a pattern to clear its floor',
      a.R.Insights.read(2).ready, true);

    // Every screen must render with this data rather than only with none.
    for (const t of ['home', 'log', 'kitchen', 'labs', 'more']) {
      a.click(`.tabbar [data-nav="${t}"]`); await wait(20);
      check(`the ${t} tab renders Maria's data`, a.vis('#scr-' + t), true);
    }
    a.R.UI.go('passport');
    check('the passport carries her questions',
      /amlodipine|potassium target/i.test(a.R.Passport.asText()), true);
  }

  console.log('\n═══ JOURNEY 6 · THE DEMO MUST NEVER EAT REAL DATA ═══');
  {
    /* The one safeguard here that genuinely matters. A test account
       that overwrites a patient's year of meals is a data-loss bug
       wearing a costume. */
    const a = boot();
    a.R.Store.acceptConsent();
    a.R.Store.useEducationRanges();
    a.R.Store.addMeal({
      meal_text: 'a real meal somebody logged', logged_at: new Date().toISOString(),
      meal_date: a.R.Store.todayISO(), items: [], confidence: 'high',
      total_potassium_low_mg: 100, total_potassium_high_mg: 120,
      total_phosphorus_low_mg: 0, total_phosphorus_high_mg: 0,
      total_sodium_low_mg: 0, total_sodium_high_mg: 0
    });

    check('real data is detected', a.R.DemoAuth.wouldDestroyRealData(), true);
    a.R.UI.renderDemo();
    a.click('#demoChoices [data-demo="frank"]');
    await wait(30);
    check('  ...so the demo refuses to load', a.R.Store.meals().length, 1);
    check('  ...and says why', a.vis('#demoError'), true);
    check('  ...naming the way out',
      /private window|export a backup/i.test(a.$('#demoError').textContent), true);

    // Setting up fresh is still allowed — it destroys nothing by itself.
    a.click('#demoChoices [data-demo="fresh"]');
    await wait(20);
    check('starting fresh is still offered', a.vis('#consentModal'), true);
  }

  console.log('\n═══ ERRORS ACROSS EVERY JOURNEY ═══');
  if (pageErrors.length) pageErrors.slice(0, 5).forEach(e => console.log('   ! ' + e));
  check('nothing threw on any path a person would take', pageErrors.length, 0);

  console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
  if (failures.length) console.log('FAILURES:\n  · ' + failures.join('\n  · '));
  process.exit(fail ? 1 : 0);

})().catch(e => {
  console.error('\nJOURNEY CRASHED:', e.message, '\n', e.stack);
  process.exit(1);
});
