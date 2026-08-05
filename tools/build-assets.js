/* ═══════════════════════════════════════════════════════════════
   BUILD-ASSETS — join the stylesheets and the scripts into one of each.
   ───────────────────────────────────────────────────────────────
   An independent scan measured the load event at ~2.3 seconds. The
   document itself arrives in about 140ms; the rest was 34 blocking
   subresource requests — four stylesheets and thirty scripts.

   WHAT THIS DOES, AND ALL IT DOES: concatenation. Byte for byte, in
   order, with a comment marking each file boundary. Nothing is removed,
   nothing is minified, nothing is reordered, nothing is rewritten. Every
   rule, every @keyframes, every module is the same bytes it was. The
   only thing that changes is how many times the browser has to ask.

   Minification is deliberately NOT done here. It changes bytes, makes
   the deployed file unreadable against its source, and buys almost
   nothing once gzip is applied — the transfer is already ~220 KB
   compressed. Joining is safe and reversible; minifying is neither.

   THIS IS NOT A DEPLOY-TIME BUILD STEP. It is run by hand, like
   tools/make-icons.js beside it, and the output is committed. tools/ is
   in .vercelignore, and a package.json at the repo root would make
   Vercel treat this static site as a Node project and try to build it.

   WHY THE ORDER IS WRITTEN DOWN HERE, given that hand-maintained asset
   lists have silently gone stale in this project three times. The first
   version of this file read the list out of index.html — which worked
   exactly once, because index.html then stopped naming the sources and
   started naming the bundle. There is no longer anywhere to derive the
   order FROM, and order is load-bearing: data before logic before view
   before bootstrap, and js/app.js dead last.

   So the order is explicit, and COMPLETENESS is what gets checked
   mechanically instead. `unlisted()` walks css/ and js/ on disk and
   reports anything neither bundled nor deliberately excluded, and
   test/sweep.js fails on it. Adding a file and forgetting to list it —
   the actual drift risk — cannot pass silently.

   Run:  node tools/build-assets.js
   Check: test/sweep.js asserts each bundle equals the concatenation of
          its sources, so a stale bundle fails the suite loudly rather
          than shipping quietly.
   ═══════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* The bundles themselves appear in index.html once this has run, so they
   must never be treated as their own sources. Same for theme.js, which
   stays a separate blocking script in <head>: it applies the saved theme
   before first paint, and deferring or bundling it would put the
   white flash back for every dark-mode user on every load. */
const CSS_BUNDLE = 'css/bundle.css';
const JS_BUNDLE = 'js/bundle.js';

/* Deliberately NOT bundled, each for its own reason:

     js/theme.js            — blocking in <head>, runs before first
                              paint so a dark-mode user never sees the
                              white flash. Bundling it would defer it.
     js/data/copy.{es,zh,hi} — fetched by I18N.load() only when somebody
                              picks that language. Bundling them would
                              put 47 KB of unread translation back into
                              every first load. */
const EXCLUDED = [
  'js/theme.js',
  'js/data/copy.es.js',
  'js/data/copy.zh.js',
  'js/data/copy.hi.js',
  CSS_BUNDLE,
  JS_BUNDLE
];

/* THE ORDER. Stylesheets cascade, so refine.css — the pass that takes
   things away — must come last. Scripts are classic (not modules), so
   this is the order the browser executed them in when they were 29
   separate tags: data, then logic, then view, then bootstrap. */
const CSS_ORDER = [
  'css/tokens.css',
  'css/app.css',
  'css/materials.css',
  'css/refine.css'
];

const JS_ORDER = [
  // data
  'js/data/copy.js', 'js/i18n.js', 'js/data/references.js',
  'js/data/recipes.js', 'js/data/anchor-foods.js',
  // logic
  'js/store.js', 'js/clinical.js', 'js/resolve.js', 'js/llm.js',
  'js/cards.js', 'js/rings.js', 'js/trends.js', 'js/vitals.js',
  'js/demo-auth.js', 'js/install.js', 'js/backup.js', 'js/meds.js',
  'js/plan.js', 'js/labscan.js', 'js/motion.js', 'js/scenes.js',
  'js/orbit.js', 'js/insights.js', 'js/checklist.js', 'js/passport.js',
  'js/exporter.js',
  // view, then bootstrap — app.js reads every module above it
  'js/ui.js', 'js/seed.js', 'js/app.js'
];

function sources() {
  return { css: CSS_ORDER.slice(), js: JS_ORDER.slice() };
}

/* Everything on disk that is neither bundled nor excluded on purpose.
   This is the completeness half of the guard: the order above is
   hand-written, so this is what stops a newly added module from being
   quietly left out of the file the site actually loads. */
function unlisted() {
  const walk = (dir, out) => {
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach(e => {
      const rel = dir + '/' + e.name;
      if (e.isDirectory()) walk(rel, out);
      else if (/\.(css|js)$/.test(e.name)) out.push(rel);
    });
    return out;
  };
  const known = CSS_ORDER.concat(JS_ORDER, EXCLUDED);
  return walk('css', []).concat(walk('js', []))
    .filter(p => known.indexOf(p) === -1);
}

/* Exported so the test can rebuild in memory and compare, rather than
   reimplementing the join and testing its own copy of the logic. */
function joinFiles(list, kind) {
  const head =
    `/* GENERATED by tools/build-assets.js — do not edit.\n` +
    `   ${list.length} ${kind} files, joined in load order by tools/build-assets.js.\n` +
    `   Edit the sources; run: node tools/build-assets.js */\n`;
  return head + list.map(p => `\n/* ══ ${p} ══ */\n` + read(p)).join('\n');
}

function build() {
  const { css, js } = sources();
  if (!css.length || !js.length) {
    throw new Error('Empty source list — refusing to write an empty bundle.');
  }
  const cssOut = joinFiles(css, 'CSS');
  const jsOut = joinFiles(js, 'JS');
  fs.writeFileSync(path.join(ROOT, CSS_BUNDLE), cssOut);
  fs.writeFileSync(path.join(ROOT, JS_BUNDLE), jsOut);
  return { css, js, cssBytes: Buffer.byteLength(cssOut), jsBytes: Buffer.byteLength(jsOut) };
}

module.exports = { sources, joinFiles, build, unlisted,
                   CSS_BUNDLE, JS_BUNDLE, EXCLUDED, CSS_ORDER, JS_ORDER };

if (require.main === module) {
  const r = build();
  const kb = (n) => (n / 1024).toFixed(1) + ' KB';
  console.log(`${CSS_BUNDLE}  ${r.css.length} files  ${kb(r.cssBytes)}`);
  console.log(`${JS_BUNDLE}   ${r.js.length} files  ${kb(r.jsBytes)}`);
  console.log(`\nRequests for a first load: ${1 + r.css.length + r.js.length + 1} -> 3` +
    `  (document, ${CSS_BUNDLE}, js/theme.js + ${JS_BUNDLE})`);
  console.log('Now update index.html to load the bundles, then run: cd test && npm test');
}
