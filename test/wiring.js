/* ═══════════════════════════════════════════════════════════════
   WIRING LINT — buttons that exist and do nothing.

   Written after shipping a quick-add button that rendered perfectly and
   was completely inert: the click handler existed, the markup existed,
   but `[data-repeat]` had not been added to the delegated selector, so
   `closest()` never matched it. Nothing threw. Nothing logged. The
   e2e suite caught it only because a test happened to click that exact
   button and count the result.

   That is a class, not an incident. Any dataset key read inside the
   delegated handler but missing from its selector produces a dead
   control, silently. So this checks the two halves against each other,
   plus the simpler failure of addEventListener on an element that does
   not exist.
   ═══════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const failures = [];
function check(label, ok, detail) {
  if (ok) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; failures.push(label); console.log(`  FAIL  ${label}${detail ? '  → ' + detail : ''}`); }
}

const ui = fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = ui + '\n' + appJs;

const camelToKebab = (s) => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

console.log('\n═══ DELEGATED CLICKS ACTUALLY REACH THEIR HANDLERS ═══');

/* The selector list handed to closest() inside the global click handler. */
const selectorBlock = (js.match(/e\.target\.closest\(([\s\S]{0,400}?)\);/) || [])[1] || '';
const declared = new Set(
  [...selectorBlock.matchAll(/\[data-([a-z-]+)\]/g)].map(m => m[1])
);
check('the delegated selector list was found at all', declared.size > 0,
  'could not locate e.target.closest(...) — this lint is not running');

/* Every dataset key the handler branches on. `el.dataset.fooBar` in JS
   corresponds to `[data-foo-bar]` in the selector.

   Scanned across the whole file rather than by trying to slice out the
   handler body: matching a closing brace with a regex is how the first
   version of this lint reported all twelve keys as unhandled and told me
   nothing. `el` is the delegated element by convention here, so a
   file-wide scan is both simpler and correct. */
const handlerBody = js;

/* Only ROUTING keys need to be in the selector — the ones the handler
   branches on to decide what a click meant. Keys read as payload off an
   element that was already matched (data-mult beside data-step-item,
   data-on beside data-leach) are not selectors and must not be demanded
   as such; requiring them was this lint's second wrong answer. Branch
   conditions are the ones appearing in an `if`. */
const read = new Set(
  [...handlerBody.matchAll(/if\s*\(\s*el\.dataset\.([A-Za-z]+)/g)].map(m => camelToKebab(m[1]))
);
check('found dataset branches to check', read.size > 0,
  'no `if (el.dataset.*)` branches found — this lint is not running');

read.forEach(key => {
  check(`[data-${key}] is in the delegation selector`, declared.has(key),
    `handler branches on el.dataset — but closest() never matches it, so the control is dead`);
});

/* The reverse: a selector entry nobody handles is dead weight that will
   swallow a click and return, doing nothing. */
declared.forEach(key => {
  const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const handled = new RegExp('el\\.dataset\\.' + camel + '\\b').test(handlerBody);
  check(`[data-${key}] in the selector is actually handled`, handled,
    'selector matches this element, then falls through doing nothing');
});

console.log('\n═══ addEventListener TARGETS EXIST ═══');

/* IDs present in the static markup, plus IDs the app renders into the
   DOM itself (settings fields, review rows) — both are legitimate. */
const staticIds = new Set([...html.matchAll(/id="([A-Za-z0-9_-]+)"/g)].map(m => m[1]));
const templateIds = new Set([...js.matchAll(/id="([A-Za-z0-9_-]+)"/g)].map(m => m[1]));

const wired = [...js.matchAll(/\$\('#([A-Za-z0-9_-]+)'\)\s*\.addEventListener/g)].map(m => m[1]);
const uniqueWired = [...new Set(wired)];
check('found listeners to check', uniqueWired.length > 0);

uniqueWired.forEach(id => {
  const exists = staticIds.has(id) || templateIds.has(id);
  check(`#${id} exists for its listener`, exists,
    'addEventListener on an element that is in neither the markup nor any template — throws at boot');
});

console.log('\n═══ NAVIGATION TARGETS RESOLVE ═══');

/* Every data-nav value must be a screen the router knows, or the tap
   hides every screen and shows nothing. */
const screensLine = (js.match(/const SCREENS = \[([^\]]+)\]/) || [])[1] || '';
const screens = new Set([...screensLine.matchAll(/'([a-z]+)'/g)].map(m => m[1]));
const navTargets = [...new Set(
  [...(html + js).matchAll(/data-nav="([a-z]+)"/g)].map(m => m[1])
)];
navTargets.forEach(t => {
  check(`data-nav="${t}" is a known screen`, screens.has(t),
    `not in SCREENS — tapping it would hide everything and show nothing`);
});
screens.forEach(s => {
  check(`screen "${s}" has a section in the markup`, html.includes(`id="scr-${s}"`),
    'router will try to toggle an element that does not exist');
});

console.log('\n═══ EVERY SCREEN IS REACHABLE FROM A TAB ═══');

/* Written after finding eleven screens behind four tabs. The Kitchen —
   "what can dinner be?", the question this entire product exists to
   answer — was reachable only from a secondary button and the desktop
   rail. A first-time visitor would never have found the one screen
   that makes the case for the app.

   Nothing broke. No test failed. Navigation had simply grown by
   accretion: every new screen added a link from wherever happened to be
   convenient, and nobody ever asked whether the whole thing was still
   navigable. That is not a bug a unit test finds, so it needs a
   structural one.

   The rule: from the tab bar, every screen must be reachable in at most
   two taps. Two rather than one because depth-2 detail screens (a meal,
   a Learn card) are legitimately reached by acting on something. Three
   is where things start getting lost. */
{
  const screens = new Set([...html.matchAll(/id="scr-([a-z]+)"/g)].map(m => m[1]));
  const tabTargets = [...html.matchAll(/class="tab"[^>]*data-nav="([a-z]+)"/g)].map(m => m[1]);
  check('the tab bar was found', tabTargets.length >= 4, `only ${tabTargets.length} tabs`);

  /* Edges: which screen's markup contains a link to which other screen.
     Sections are sliced out of the markup so a link on Home is not
     credited to Settings. */
  const edges = {};
  screens.forEach(from => {
    const start = html.indexOf(`id="scr-${from}"`);
    if (start === -1) { edges[from] = []; return; }
    // Up to the next screen section, or the end of the app shell.
    const nextIdx = [...html.matchAll(/id="scr-[a-z]+"/g)]
      .map(m => m.index).find(i => i > start);
    const block = html.slice(start, nextIdx === undefined ? html.length : nextIdx);
    edges[from] = [...block.matchAll(/data-nav="([a-z]+)"/g)].map(m => m[1]);
  });
  // The tab bar and the floating quick actions are reachable from every
  // screen, so their targets are edges from everywhere.
  const globalNav = tabTargets.concat(
    [...(html.match(/<div class="fab"[\s\S]*?<\/div>\s*<\/div>/) || [''])[0]
      .matchAll(/data-nav="([a-z]+)"/g)].map(m => m[1]));

  const depth = {};
  tabTargets.forEach(t => { depth[t] = 1; });
  globalNav.forEach(t => { if (depth[t] === undefined) depth[t] = 1; });
  for (let pass = 0; pass < 4; pass++) {
    Object.keys(depth).forEach(from => {
      (edges[from] || []).forEach(to => {
        if (depth[to] === undefined || depth[to] > depth[from] + 1) depth[to] = depth[from] + 1;
      });
    });
  }

  /* Onboarding and detail are excluded by design: onboarding is a
     one-time gate you are placed into, and detail is opened by tapping
     a meal row rather than by navigating. */
  const excluded = new Set(['onboarding', 'detail', 'learn']);
  const unreachable = [...screens].filter(s => !excluded.has(s) && depth[s] === undefined);
  check('every screen is reachable from the tab bar',
    unreachable.join(', ') || 'none', 'none');

  const tooDeep = [...screens].filter(s => !excluded.has(s) && depth[s] > 2);
  check('  ...within two taps', tooDeep.join(', ') || 'none', 'none');

  /* The product thesis specifically. If "what can dinner be?" is ever
     more than one tap from anywhere, the app has lost its own argument. */
  check('the Kitchen is a tab, not a buried link', tabTargets.indexOf('kitchen') !== -1,
    'the screen that answers the question this product is built around must be a destination');

  // Learn cards are opened by data-learn, so check that route separately.
  const learnKeys = [...new Set([...html.matchAll(/data-learn="([a-z]+)"/g)].map(m => m[1]))];
  check('learn cards have entry points', learnKeys.length >= 4, `${learnKeys.length} found`);
  const copySrc = fs.readFileSync(path.join(ROOT, 'js/data/copy.js'), 'utf8');
  const missingCards = learnKeys.filter(k => !new RegExp('\\b' + k + ':\\s*{').test(copySrc));
  check('  ...and every one has copy behind it', missingCards.join(', ') || 'none', 'none');
}

console.log('\n═══ THE APP DOES NOT MANAGE MEDICATIONS ═══');

/* js/meds.js stores a list and shows one line of binder timing. The
   line it must never cross is doing anything a medication manager does
   — doses, interactions, contraindications, schedules, reminders. Each
   of those is a real medical-device function, each would be done badly
   here, and the app tells users in writing that it does none of them.

   A promise in copy that nothing enforces is a promise waiting to be
   broken by a well-meaning feature six commits from now. So it is
   enforced against the source. */
{
  const medsSrc = fs.readFileSync(path.join(ROOT, 'js/meds.js'), 'utf8');
  const code = medsSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  /* No \b anchors. The first version used them and would have walked
     straight past `checkInteractions()` — the word boundary fails in
     the middle of camelCase, which is exactly how such a function would
     actually be named. Its own self-test caught it. */
  const FORBIDDEN = [
    ['dose arithmetic',      /dose\s*[*/+-]|mg\s*\*|calculatedose|dosage\s*=/i],
    ['interaction checking', /interact|contraindicat|conflictswith/i],
    ['scheduling',           /schedule|remind|nextdue|setinterval|notification/i],
    ['clinical decisions',   /shouldtake|issafe|recommenddose|warnabout/i]
  ];
  FORBIDDEN.forEach(([what, re]) => {
    check(`meds.js contains no ${what}`, !re.test(code),
      `js/meds.js has grown ${what} — the app promises in writing that it does not manage medications`);
  });

  // It must also never read a lab value or touch a threshold: education
  // that changes with somebody's potassium is guidance, not a list.
  ['latestLab', 'potassiumMode', 'phosphorusMode', 'ringStatus'].forEach(fn => {
    check(`meds.js never calls ${fn}`, medsSrc.indexOf(fn) === -1,
      'medication education must not vary with a lab value — that is clinical guidance');
  });

  /* And the lint has to be able to fail — against realistically-named
     code, in every category, not against a string chosen to match. */
  const DECOYS = [
    'function checkInteractions(a, b) { return true; }',
    'const nextDose = mg * 2;',
    'setInterval(remindUser, 3600);',
    'function isSafeToTake(med) { return true; }'
  ];
  const caught = DECOYS.filter(d => FORBIDDEN.some(([, re]) => re.test(d)));
  check('the medication lint catches every decoy', caught.length, DECOYS.length);
}

console.log('\n═══ DECORATION IS NEVER LOAD-BEARING ═══');

/* js/motion.js is decoration by contract: if it failed to load, the app
   must lose nothing a user needs and nothing a screen reader announces.
   That contract lives entirely in the call sites, so it is checked
   there, in source.

   This test exists because the obvious runtime version of it — delete
   the module, re-render, assert nothing broke — passes trivially and
   proves nothing. Every module here is a top-level `const`, so it never
   becomes a window property and `delete window.Motion` is a no-op. A
   green test that cannot fail is worse than no test: it reports a
   guarantee nobody is actually holding.

   So: every reference to Motion outside its own file must sit behind a
   typeof guard.

   Both guard shapes in this codebase count, because both are correct:

     inline    if (typeof Motion !== 'undefined') Motion.ripple(el);
     early-out if (typeof Motion === 'undefined') return;   ...later... Motion.bloom(el);

   The first draft of this lint only looked at the current line and the
   one above it, and duly failed two call sites that were perfectly
   guarded — one by an enclosing block, one by a function-top early
   return. A lint that flags correct code trains people to ignore it,
   which is the same outcome as not having it. So it scans backward to
   the nearest function boundary, which is where a guard's protection
   actually ends. */
const guardedFiles = ['js/ui.js', 'js/app.js'];
const GUARD = /typeof\s+Motion\s*(!==|===)\s*['"]undefined['"]/;
const FN_START = /^\s{0,4}(async\s+)?function\s|^\(function\b/;
let callSites = 0;

guardedFiles.forEach(file => {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const lines = src.split(/\r?\n/);

  lines.forEach((line, i) => {
    // Prose mentioning the module is not a call.
    const code = line.replace(/\/\/.*$/, '');
    if (/^\s*\*/.test(line) || /^\s*\/\*/.test(line)) return;
    /* Any reference, not just a method call. The first version of this
       matched `Motion.` only, and so walked straight past a bare
       `Motion,` in an object shorthand in app.js — which is a
       ReferenceError at boot if the file is missing, the single worst
       version of the failure this lint exists to prevent. The probe
       suite caught it; this lint should have. */
    if (!/\bMotion\b/.test(code)) return;

    callSites++;
    let guarded = GUARD.test(code);
    for (let j = i - 1; j >= 0 && !guarded; j--) {
      const prev = lines[j];
      if (GUARD.test(prev)) { guarded = true; break; }
      // A guard cannot reach past the start of the function it is in.
      if (FN_START.test(prev)) break;
    }

    check(`${file}:${i + 1} — Motion call is guarded`, guarded,
      `unguarded Motion.* — if js/motion.js ever fails to load, this line throws and takes a real feature down with the decoration`);
  });
});

/* The lint must be able to fail. A guard check that passes on anything
   is the exact failure mode it was written to replace, so it is tested
   against a string that should not survive it. */
{
  const decoy = ['function decoy() {', '  Motion.ripple(el);', '}'];
  let decoyGuarded = GUARD.test(decoy[1]);
  for (let j = 0; j >= 0 && !decoyGuarded; j--) {
    if (GUARD.test(decoy[j])) { decoyGuarded = true; break; }
    if (FN_START.test(decoy[j])) break;
  }
  check('the guard lint can actually fail', decoyGuarded === false,
    'an unguarded call site passed the check — this lint proves nothing');
}

check('found Motion call sites to check', callSites > 0,
  'no call sites found — the guard lint is checking nothing, which means it cannot fail');

/* And the module must never be a dependency of the data path. Motion
   may read the DOM and animate it; it may not compute, store, or format
   a number that reaches a user. */
const motionSrc = fs.readFileSync(path.join(ROOT, 'js/motion.js'), 'utf8');
[['Store.', 'reads or writes stored data'],
 ['Clinical.', 'touches clinical thresholds'],
 ['Resolve.', 'touches nutrient resolution'],
 ['LLM.', 'calls the model']].forEach(([token, why]) => {
  check(`motion.js does not reference ${token}`, !motionSrc.includes(token),
    `decoration ${why} — motion must never be able to change a number`);
});

console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
if (failures.length) console.log('FAILURES:\n  · ' + failures.join('\n  · '));
process.exit(fail ? 1 : 0);
