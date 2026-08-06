/* ═══════════════════════════════════════════════════════════════
   BUILD-ASSETS — join the stylesheets and the scripts into one of each.
   ───────────────────────────────────────────────────────────────
   An independent scan measured the load event at ~2.3 seconds. The
   document itself arrives in about 140ms; the rest was 34 blocking
   subresource requests — four stylesheets and thirty scripts.

   WHAT THIS DOES: joins the sources in load order, then minifies.

   MINIFICATION WAS ARGUED AGAINST HERE, AND THE ARGUMENT WAS WRONG.
   The reasoning was that gzip already gets the transfer to ~220 KB, so
   compressing further buys almost nothing. That is true about BYTES ON
   THE WIRE and irrelevant to the thing being measured. The four
   subresources were then fetched from the live site: 226 KB brotli
   total, arriving in about 0.2 s against a warm edge. Network was never
   the 2.3 s. What costs is 512 KB of JavaScript to tokenise, parse and
   execute before the load event can fire, and gzip does not reduce that
   by one byte — the browser decompresses first and parses the full text.

   So: 512 KB -> 238 KB of JS, 140 KB -> 68 KB of CSS. Roughly half the
   source a phone has to read before the app is usable.

   THE OBJECTION THAT DID HOLD was that a minified file cannot be read
   against its source. Two things answer it. The sources are still
   deployed and still readable — nothing loads them, but css/ and js/ are
   right there. And the bundle carries a sha256 of the exact sources it
   was built from, in a banner comment minification is told to keep, so
   "is this bundle stale?" is a question with a mechanical answer rather
   than an eyeball comparison. test/sweep.js asks it on every run.

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
   Check: test/sweep.js recomputes the source fingerprint and compares it
          to the one the bundle carries, so a stale bundle fails the
          suite loudly rather than shipping quietly. The behavioural
          proof is separate and stronger: e2e, wiring, journey and the
          axe run all load index.html, which names the bundle — so every
          one of those assertions runs against the minified code, not
          against the sources.
   ═══════════════════════════════════════════════════════════════ */

const fs = require('fs');
const crypto = require('crypto');
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
  'js/data/recipes.js', 'js/data/anchor-foods.js', 'js/data/a11y-report.js',
  // logic
  'js/store.js', 'js/clinical.js', 'js/resolve.js', 'js/llm.js',
  'js/cards.js', 'js/rings.js', 'js/trends.js', 'js/vitals.js',
  'js/demo-auth.js', 'js/install.js', 'js/backup.js', 'js/meds.js',
  'js/plan.js', 'js/labscan.js', 'js/motion.js', 'js/scenes.js',
  'js/orbit.js', 'js/insights.js', 'js/checklist.js', 'js/gaps.js', 'js/passport.js',
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

/* Exported so the test can rebuild the JOIN in memory and hash it,
   rather than reimplementing the join and testing its own copy. */
function joinFiles(list, kind) {
  const head =
    `/* GENERATED by tools/build-assets.js — do not edit.\n` +
    `   ${list.length} ${kind} files, joined in load order by tools/build-assets.js.\n` +
    `   Edit the sources; run: node tools/build-assets.js */\n`;
  return head + list.map(p => `\n/* ══ ${p} ══ */\n` + read(p)).join('\n');
}

/* The fingerprint of what went in. This is the whole staleness guard:
   edit a source, forget to rebuild, and the hash the bundle carries no
   longer matches the hash of the sources on disk. Before minification
   the test could just re-join and byte-compare; it cannot now, so the
   bundle states its own provenance instead. */
const fingerprint = (text) =>
  crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);

const banner = (kind, list, hash) =>
  `/*! RenalRoute ${kind} bundle — generated, do not edit.\n` +
  ` * ${list.length} source files joined in load order, then minified.\n` +
  ` * sources sha256:${hash}\n` +
  ` * The unminified sources are deployed alongside this file; read those.\n` +
  ` * Regenerate: node tools/build-assets.js */\n`;

/* Loaded from test/node_modules on purpose. A package.json at the repo
   root would make Vercel treat this static site as a Node project and
   try to build it, which is the same reason the test harness lives in
   test/. This runs by hand and its output is committed. */
function loadMinifiers() {
  const at = (n) => path.join(ROOT, 'test', 'node_modules', n);
  try {
    return { terser: require(at('terser')), CleanCSS: require(at('clean-css')) };
  } catch (e) {
    throw new Error(
      'Minifiers not installed. Run:  cd test && npm install\n' +
      '(terser and clean-css are devDependencies of the test harness.)');
  }
}

async function build() {
  const { css, js } = sources();
  if (!css.length || !js.length) {
    throw new Error('Empty source list — refusing to write an empty bundle.');
  }
  const { terser, CleanCSS } = loadMinifiers();

  const cssJoined = joinFiles(css, 'CSS');
  const jsJoined = joinFiles(js, 'JS');
  const cssHash = fingerprint(cssJoined);
  const jsHash = fingerprint(jsJoined);

  /* LEVEL 1, NOT 2, and the difference is 1.2 KB out of 68.
     Level 2 restructures: it merges rules, reorders selectors and hoists
     shared declarations. In a 140 KB cascade whose load order is
     deliberate — refine.css last, because it is the pass that takes
     things away — reordering is the one transformation that can change
     what the page looks like while every test still passes. Level 1 is
     whitespace, comments and value shortening: it cannot move a rule
     past another. Measured both; 1.7% is not worth a cascade bug. */
  const cssMin = new CleanCSS({ level: 1, returnPromise: false }).minify(cssJoined);
  if (cssMin.errors.length) throw new Error('CSS minify: ' + cssMin.errors.join('; '));

  /* toplevel mangling stays OFF, and that is load-bearing rather than
     cautious. These are classic scripts, not modules: `const Store =
     (() => {…})()` in one file is read by name from another. Renaming a
     top-level binding would sever every one of those links, and the app
     would fail at the first cross-module call. Property mangling is off
     for the same reason — COPY is addressed by key everywhere. */
  const jsMin = await terser.minify(jsJoined, {
    compress: { passes: 2, toplevel: false },
    mangle: { toplevel: false },
    format: { comments: /^!/ }
  });
  if (jsMin.error) throw jsMin.error;

  const cssOut = banner('CSS', css, cssHash) + cssMin.styles;
  const jsOut = banner('JS', js, jsHash) + jsMin.code;

  fs.writeFileSync(path.join(ROOT, CSS_BUNDLE), cssOut);
  fs.writeFileSync(path.join(ROOT, JS_BUNDLE), jsOut);

  return {
    css, js, cssHash, jsHash,
    cssBytes: Buffer.byteLength(cssOut), jsBytes: Buffer.byteLength(jsOut),
    cssSourceBytes: Buffer.byteLength(cssJoined), jsSourceBytes: Buffer.byteLength(jsJoined)
  };
}

module.exports = { sources, joinFiles, build, unlisted, fingerprint,
                   CSS_BUNDLE, JS_BUNDLE, EXCLUDED, CSS_ORDER, JS_ORDER };

if (require.main === module) {
  build().then(r => {
    const kb = (n) => (n / 1024).toFixed(1) + ' KB';
    const cut = (a, b) => ` (${Math.round((1 - b / a) * 100)}% less to parse)`;
    console.log(`${CSS_BUNDLE}  ${r.css.length} files  ${kb(r.cssSourceBytes)} -> ${kb(r.cssBytes)}${cut(r.cssSourceBytes, r.cssBytes)}`);
    console.log(`${JS_BUNDLE}   ${r.js.length} files  ${kb(r.jsSourceBytes)} -> ${kb(r.jsBytes)}${cut(r.jsSourceBytes, r.jsBytes)}`);
    console.log(`\nRequests for a first load: ${1 + r.css.length + r.js.length + 1} -> 3` +
      `  (document, ${CSS_BUNDLE}, js/theme.js + ${JS_BUNDLE})`);
    console.log('Then: cd test && npm test');
  }).catch(e => { console.error('\nBUILD FAILED:', e.message); process.exit(1); });
}
