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

console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
if (failures.length) console.log('FAILURES:\n  · ' + failures.join('\n  · '));
process.exit(fail ? 1 : 0);
