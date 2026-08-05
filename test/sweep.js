/* ═══════════════════════════════════════════════════════════════
   SWEEP — the manual checklist, automated.
   ───────────────────────────────────────────────────────────────
   The README has carried a manual QA list since the first week —
   320px, keyboard-only, grayscale, 200% zoom, measured contrast — and
   not one item on it has ever been performed. A checklist nobody runs
   is a checklist that reports whatever you hope.

   So the parts that can be checked mechanically are checked here, on
   every `npm test`. What CANNOT be automated is stated as such at the
   end rather than quietly dropped, because the honest failure is a
   short list of real manual items, not a long list of imaginary
   automated ones.

   WHAT jsdom CANNOT DO, and why these tests are shaped the way they
   are: it does not lay out, so nothing here can measure a rendered
   pixel or detect an overflow. It resolves computed styles only for
   simple declarations and never resolves var(). It does not evaluate
   media queries. Every check below is therefore either a SOURCE-level
   check on the stylesheet, or a DOM-structure check — and each one
   says which, so nobody mistakes this file for a rendering test.
   ═══════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
const failures = [];
function check(label, ok, detail) {
  if (ok) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; failures.push(label); console.log(`  FAIL  ${label}${detail ? '  → ' + detail : ''}`); }
}

const html = read('index.html');
const cssFiles = Array.from(html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)).map(m => m[1]);
const css = cssFiles.map(read).join('\n');
const scripts = Array.from(html.matchAll(/<script src="([^"]+)"(?: defer)?><\/script>/g)).map(m => m[1]);

/* ═══════════════════════════════════════════════════════════════
   1 · NO HORIZONTAL OVERFLOW — source-level
   jsdom cannot lay out, so a fixed width wider than the smallest
   supported viewport is caught in the stylesheet instead. 320px is the
   floor the design commits to.
   ═══════════════════════════════════════════════════════════════ */
console.log('\n═══ 0. THE APP CAN ACTUALLY BE INSTALLED ═══');

/* "Add to home screen" did not work at all until this section existed.
   The manifest declared NO icons and no icon files were present, which
   means Chrome will not offer an install prompt and iOS falls back to a
   blurry screenshot of the page. A PWA that cannot be installed is a
   website with extra JSON — and nothing anywhere reported a problem,
   because nothing was checking. */
{
  const manifest = JSON.parse(read('manifest.webmanifest'));

  check('the manifest declares icons', Array.isArray(manifest.icons) && manifest.icons.length > 0,
    'without icons no browser will offer to install this');

  // Chrome's install criteria: a 192 and a 512, and at least one maskable.
  const sizes = (manifest.icons || []).map(i => i.sizes);
  check('  ...including 192x192', sizes.some(s => /\b192x192\b/.test(s)), sizes.join(' '));
  check('  ...and 512x512', sizes.some(s => /\b512x512\b/.test(s)), sizes.join(' '));
  check('  ...and a maskable one',
    (manifest.icons || []).some(i => /maskable/.test(i.purpose || '')),
    'without maskable, Android crops the icon badly');

  // Declared files must exist, or the manifest is a promise it cannot keep.
  const missing = (manifest.icons || [])
    .map(i => i.src)
    .filter(src => !fs.existsSync(path.join(ROOT, src)));
  check('every declared icon file exists', missing.length === 0, missing.join(', '));

  // And they must be real PNGs, not renamed anything.
  (manifest.icons || []).filter(i => /\.png$/.test(i.src)).forEach(i => {
    const buf = fs.readFileSync(path.join(ROOT, i.src));
    const sig = buf.slice(0, 8).toString('hex');
    check(`${i.src} is a real PNG`, sig, '89504e470d0a1a0a');
  });

  check('start_url and scope are set',
    !!manifest.start_url && !!manifest.scope, 'a PWA without scope can escape itself');
  check('display is standalone', manifest.display === 'standalone', manifest.display);

  // iOS reads none of the manifest for icons or the status bar.
  check('iOS gets its own touch icon', /rel="apple-touch-icon"/.test(html),
    'without it iOS uses a screenshot of the page');
  check('  ...and knows it can run standalone',
    /apple-mobile-web-app-capable/.test(html), '');
  check('  ...and the apple-touch-icon file exists',
    fs.existsSync(path.join(ROOT, 'icons/apple-touch-icon.png')), '');

  /* Home-screen shortcuts must point at screens the router knows, or a
     long-press menu becomes a set of dead links. */
  const screens = new Set([...html.matchAll(/id="scr-([a-z]+)"/g)].map(m => m[1]));
  const badShortcuts = (manifest.shortcuts || [])
    .map(s => (s.url.match(/go=([a-z]+)/) || [])[1])
    .filter(t => t && !screens.has(t));
  check('every home-screen shortcut points at a real screen',
    badShortcuts.length === 0, badShortcuts.join(', '));
  check('  ...and there are some', (manifest.shortcuts || []).length >= 3,
    `${(manifest.shortcuts || []).length} shortcuts`);

  /* THE SERVICE WORKER SHELL MUST NOT DRIFT. It was seventeen assets
     behind index.html — every module added after the first week was
     missing. Runtime caching meant a second visit still worked, so
     nothing ever looked broken; what the stale list cost was the first
     offline visit, and the icons were never cached at all. */
  const sw = read('sw.js');
  const shellBlock = sw.slice(sw.indexOf('const SHELL = ['), sw.indexOf('];', sw.indexOf('const SHELL = [')));
  const shell = new Set([...shellBlock.matchAll(/'([^']+)'/g)].map(m => m[1]));
  const pageAssets = cssFiles.concat(scripts);
  const notCached = pageAssets.filter(a => !shell.has(a));
  check('the service worker caches every asset the page loads',
    notCached.length === 0, notCached.join(', '));
  check('  ...and the icons too',
    ['icons/icon-192.png', 'icons/icon-512.png'].every(i => shell.has(i)), true);
  check('  ...but never the API', !shellBlock.includes('/api/'), true);
}

console.log('\n═══ 0. THE BUNDLES MATCH THEIR SOURCES ═══');

/* This is the assertion that makes joining the assets safe at all.
   index.html now loads css/bundle.css and js/bundle.js instead of
   thirty-four separate files, so the sources in css/ and js/ are edited
   but no longer SHIPPED. Without this check, editing a source and
   forgetting to regenerate would mean every other suite tests one thing
   while visitors get another — the exact drift that has already cost
   this project three separate incidents.

   The comparison rebuilds in memory using the generator's own join
   function, rather than reimplementing it here. A test that
   reimplements the logic it is checking only proves the two copies
   agree with each other. */
{
  const builder = require(path.join(ROOT, 'tools/build-assets.js'));
  const src = builder.sources();

  check('the generator has a source list',
    src.css.length > 0 && src.js.length > 0,
    `css ${src.css.length}, js ${src.js.length}`);

  /* The completeness half. The ORDER in build-assets.js is hand-written
     because order is load-bearing and there is nowhere left to derive it
     from — index.html now names the bundle, not the sources. So the risk
     is not a wrong order (which breaks loudly) but a NEW FILE nobody
     added to the list, which would simply never ship. This walks the
     directories and catches exactly that. */
  const missed = builder.unlisted();
  check('  ...covering every css/ and js/ file on disk',
    missed.length === 0,
    'not bundled and not deliberately excluded: ' + missed.join(', '));

  const expectCss = builder.joinFiles(src.css, 'CSS');
  const expectJs = builder.joinFiles(src.js, 'JS');
  const actualCss = read(builder.CSS_BUNDLE);
  const actualJs = read(builder.JS_BUNDLE);

  check('css/bundle.css is exactly its sources joined',
    actualCss === expectCss,
    'STALE — run: node tools/build-assets.js');
  check('js/bundle.js is exactly its sources joined',
    actualJs === expectJs,
    'STALE — run: node tools/build-assets.js');

  /* Concatenation, not transformation. If these byte counts ever drift
     apart, something is minifying or rewriting, and the claim that
     behaviour is unchanged stops being true. */
  const rawCss = src.css.reduce((n, p) => n + Buffer.byteLength(read(p)), 0);
  const rawJs = src.js.reduce((n, p) => n + Buffer.byteLength(read(p)), 0);
  check('  ...and nothing was minified out of the CSS',
    Buffer.byteLength(actualCss) >= rawCss, `${Buffer.byteLength(actualCss)} < ${rawCss}`);
  check('  ...nor out of the JS',
    Buffer.byteLength(actualJs) >= rawJs, `${Buffer.byteLength(actualJs)} < ${rawJs}`);

  // theme.js must stay out: it is blocking in <head> by design.
  check('  ...and js/theme.js is not swallowed into the bundle',
    src.js.indexOf('js/theme.js') === -1 && /<script src="js\/theme\.js"><\/script>/.test(html),
    'it must stay a separate blocking script or the dark-mode flash returns');

  // The lazily-fetched language tables must stay separate files.
  check('  ...and the language tables stay separate',
    src.js.every(p => !/copy\.(es|zh|hi)\.js/.test(p)),
    'I18N.load() fetches these at runtime — bundling them undoes that');

  /* The whole point, as a number. Counts SUBRESOURCES the document
     blocks on — one stylesheet plus theme.js plus the bundle — not the
     document itself. Was 34 (4 CSS + 30 JS). */
  const before = src.css.length + src.js.length + 1;   // +1 for theme.js
  const now = [...html.matchAll(/<link rel="stylesheet"|<script src=/g)].length;
  check(`  ...leaving 3 blocking subresources, down from ${before}`,
    now === 3, `index.html references ${now}: expected one stylesheet and two scripts`);
}

console.log('\n═══ 0-404. A MISTYPED URL IS NOT A DEAD END ═══');

/* An independent scan navigated to a nonexistent route and got the
   host's raw NOT_FOUND: no branding, no explanation, and no way back.
   Vercel serves 404.html automatically on a static deployment. */
{
  const nf = fs.existsSync(path.join(ROOT, '404.html')) ? read('404.html') : '';
  check('a 404 page exists', nf.length > 0, 'visitors get the raw host error page');

  // The reason the page exists at all.
  check('  ...with a route back into the app', /href="\/"/.test(nf),
    'a branded dead end is still a dead end');

  /* It must not trip the very policy the rest of the app is careful
     about. A 404 page that violates CSP is a worse failure than the
     one it replaces. */
  check('  ...and no inline style attribute', !/\sstyle="/.test(nf), '');
  check('  ...and no inline script', !/<script(?![^>]*\ssrc=)/.test(nf), '');

  // Same-origin only: no CDN, no font host, nothing external.
  const external = [...nf.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(m => m[1]);
  check('  ...and loads nothing from another origin', external.length === 0,
    external.join(', '));

  // It reuses the app's stylesheet rather than growing its own.
  check('  ...reusing the app stylesheet', /href="css\/bundle\.css"/.test(nf), '');
  check('  ...and applying the theme before paint',
    /src="js\/theme\.js"/.test(nf), 'otherwise dark-mode users get a white flash');

  // Tone: it says what happened without blaming the reader or alarming them.
  check('  ...saying nothing logged is affected',
    /untouched|not affected|nothing you have logged/i.test(nf), '');
  check('  ...and never calling the request invalid or forbidden',
    !/\b(invalid|forbidden|illegal|error 404)\b/i.test(nf), '');
}

console.log('\n═══ 0a. THE DATA NOTICE DESCRIBES DATA, NOT A DEPLOYMENT ═══');

/* An independent pro scan raised a HIGH on the old wording — "Reference
   build. Anchor nutrient values are unverified test data." — reading it
   as a staging deployment left running in production. That is a fair
   reading of "reference build", and the fix was to drop the phrases that
   name an ENVIRONMENT while keeping the claim about the NUMBERS, which
   is true and which the coverage panel backs up.

   Both halves are checked, because either one alone is a way to get this
   wrong: reintroducing "staging" would bring the finding back, and
   deleting the honesty would trade a true statement for a score. */
{
  const notice = (read('js/data/copy.js').match(/dataNotice:\s*([\s\S]*?)',\n\n/) || [''])[0];
  check('the data notice exists in COPY', notice.length > 0,
    'it must live in COPY so it translates, not hard-coded in markup');

  const ENV_WORDS = /reference build|test data|staging|draft|dev build|prototype|not for production/i;
  check('  ...and names no build environment', !ENV_WORDS.test(notice),
    'a scanner reads these as staging-in-production; describe the data instead');

  // The honest half must survive. Deleting it would be the worse failure.
  check('  ...but still says the values are unverified',
    /not clinically verified|unverified/i.test(notice),
    'the anchor table genuinely is unverified — saying so is not optional');
  check('  ...and still says educational use only',
    /educational/i.test(notice), '');

  // And it must actually reach the screen.
  check('  ...and the markup has a slot for it',
    /id="devBannerText"/.test(html), '');
  check('  ...that app.js fills from COPY',
    /devBannerText'\)\.textContent = COPY\.dataNotice/.test(read('js/app.js')), '');
  check('  ...and no build-environment wording is left in the markup',
    !ENV_WORDS.test(html.slice(html.indexOf('id="devBanner"'), html.indexOf('id="devBanner"') + 400)),
    'the banner region still carries an environment word');
}

console.log('\n═══ 0b. EVERY ARGOSX FINDING, AS A REGRESSION CHECK ═══');

/* The free deep scan scored 95/100 and flagged seven things. Each is a
   check here now, so none of them can quietly come back.

   The HIGH one was real and worth stating plainly: reference-build
   controls — a data-reset button, a persona seeder, a demo-mode
   toggle — shipped in the DOM to every anonymous visitor, alongside
   the name of the internal build platform. A destructive action
   reachable by anybody who loads the page, with no gate on it. */
{
  const devIdx = html.indexOf('id="devControls"');
  check('the reference-build controls exist and ship hidden',
    devIdx !== -1 && /hidden/.test(html.slice(devIdx, devIdx + 60)),
    'a reset button reachable by anyone is a destructive action with no gate on it');
  const uiSrc = read('js/ui.js');
  check('  ...revealed only inside a demo session',
    /devControls[\s\S]{0,200}DemoAuth\.isActive/.test(uiSrc),
    'gating must be a render decision, not a CSS rule');

  // The two disclosures: internal platform name, internal route.
  check('no internal build platform is named in the markup',
    !/Base44/i.test(html), 'naming internal tooling tells an attacker where to look next');
  check('no serverless route is printed in the markup',
    !/\/api\/invoke-llm/.test(html),
    'the client must KNOW the route; it need not advertise it in prose');

  // The four LOW findings.
  check('Open Graph tags are present',
    /property="og:title"/.test(html) && /property="og:image"/.test(html) &&
    /property="og:description"/.test(html),
    'a shared link renders as a bare URL without them');
  check('  ...and the OG image is the mark, not a screenshot',
    /og:image" content="[^"]*icon-512\.png/.test(html),
    'a screenshot of a health dashboard shared into a group chat shows somebody numbers');
  check('a canonical link is present', /rel="canonical"/.test(html),
    'query-string variants split ranking signal, and this app generates its own');
  check('robots.txt exists', fs.existsSync(path.join(ROOT, 'robots.txt')), '');
  check('sitemap.xml exists', fs.existsSync(path.join(ROOT, 'sitemap.xml')), '');
  check('  ...and does not overstate a single-page app',
    (read('sitemap.xml').match(/<url>/g) || []).length === 1,
    'listing client-side screens as URLs would tell a crawler something untrue');

  /* The MEDIUM finding was that their axe run was blocked by our CSP.
     The fix is NOT to weaken script-src — that header is what makes
     stored XSS in a free-text meal field unexploitable, and trading a
     real defence for a green tick on a report measuring defences is
     exactly backwards. The fix is running axe ourselves. */
  check('script-src is still locked to self',
    /script-src 'self'/.test(read('vercel.json')),
    'never add unsafe-inline to satisfy a scanner');
  check('  ...and never gains unsafe-inline or unsafe-eval',
    !/unsafe-inline|unsafe-eval/.test(read('vercel.json')),
    'a hash is the correct mechanism for inline content; unsafe-inline is not');

  /* The JSON-LD hash must match the block byte for byte, or the
     structured data is silently dropped by the browser and nobody
     notices — the block still LOOKS present in the markup. Recomputed
     here so editing one character in the schema fails loudly and
     prints the hash to paste. */
  {
    const crypto = require('crypto');
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    check('structured data is present', !!m, 'JSON-LD block missing');
    if (m) {
      /* NORMALISED TO LF BEFORE HASHING, and this is not a detail.
         A CSP hash covers the exact bytes the browser receives. Git
         stores this file with LF and Vercel builds on Linux, so the
         deployed bytes are LF — but a Windows working copy is CRLF, and
         hashing that produces a value that matches locally and matches
         NOTHING in production.

         That is precisely what happened: the hash committed here was
         the CRLF one, so the browser silently dropped the JSON-LD block
         on the live site while every local check passed. .gitattributes
         now pins this file to LF so the two can't diverge again, and
         this line means the test would still be right if it did. */
      const block = m[1].replace(/\r\n/g, '\n');
      const want = 'sha256-' + crypto.createHash('sha256').update(block, 'utf8').digest('base64');
      check('  ...and its CSP hash matches the block as DEPLOYED (LF)',
        read('vercel.json').indexOf(want) !== -1,
        `CSP needs '${want}' — the block changed and the hash did not`);
      let parsed = null;
      try { parsed = JSON.parse(m[1]); } catch (e) { /* reported below */ }
      check('  ...and it is valid JSON', !!parsed, 'the schema block does not parse');
      if (parsed) {
        check('  ...describing a health application',
          parsed.applicationCategory === 'HealthApplication', parsed.applicationCategory);
        /* Structured data is read by machines that will repeat whatever
           a health app claims about itself, so it carries the same
           disclaimer the app does and makes no medical claim. */
        check('  ...carrying the not-a-medical-device line',
          /not a medical device/i.test(parsed.disclaimer || ''), '');
        /* NOTE the signature: this file uses check(label, ok, detail),
           while verify.js and journey.js use (label, actual, expected).
           Passing `false` as the third argument here reads as a detail
           string, not an expectation, so the assertion inverted and
           failed on correct copy. Third time I have tripped on this
           across the suite — the negation belongs in the expression. */
        check('  ...and claiming no medical capability',
          !/\btreats?\b|\bdiagnos|\bcures?\b/i.test(parsed.description || ''),
          'structured data must not describe a medical capability');
      }
    }
  }
  check('  ...and axe-core runs in our own suite instead',
    fs.existsSync(path.join(ROOT, 'test/a11y.js')), '');
}

console.log('\n═══ 1. NOTHING IS WIDER THAN THE SMALLEST PHONE ═══');
{
  const decls = Array.from(css.matchAll(/(?:^|[;{])\s*(min-width|width)\s*:\s*(\d+)px/g));
  const tooWide = decls.filter(m => Number(m[2]) > 320).map(m => `${m[1]}: ${m[2]}px`);
  check('no fixed width exceeds 320px', tooWide.length === 0, tooWide.join(', '));

  check('the body forbids horizontal scroll', /body\s*{[^}]*overflow-x:\s*hidden/s.test(css),
    'body needs overflow-x: hidden as the backstop');

  // Wide content must scroll inside its own container, not the page.
  ['.tabs', '.scenes', '.chipset'].forEach(sel => {
    const rule = css.match(new RegExp('\\' + sel + '\\s*{[^}]*}', 's'));
    const ok = rule && (/overflow-x:\s*auto/.test(rule[0]) || /flex-wrap:\s*wrap/.test(rule[0]));
    check(`${sel} either scrolls itself or wraps`, !!ok,
      'a horizontal row that neither wraps nor scrolls pushes the page sideways');
  });
}

/* ═══════════════════════════════════════════════════════════════
   2 · TAP TARGETS — source-level
   Every interactive class must declare at least 44px somewhere in its
   own rule. Cannot be measured here; it can be required.
   ═══════════════════════════════════════════════════════════════ */
console.log('\n═══ 2. TAP TARGETS ARE DECLARED AT 44px OR MORE ═══');
{
  const interactive = ['.btn', '.chip-opt', '.scene', '.tabs__btn', '.fab__item', '.fab__toggle', '.tab'];
  interactive.forEach(sel => {
    const rules = Array.from(css.matchAll(new RegExp('\\' + sel + '[^{]*{([^}]*)}', 'gs')))
      .map(m => m[1]).join(' ');
    const sizes = Array.from(rules.matchAll(/(?:min-height|height|min-width|width)\s*:\s*(\d+)px/g))
      .map(m => Number(m[1]));
    check(`${sel} declares a target of 44px or more`,
      sizes.some(n => n >= 44), sizes.length ? `largest declared: ${Math.max(...sizes)}px` : 'no size declared');
  });
}

/* ═══════════════════════════════════════════════════════════════
   3 · CONTRAST — computed from the tokens, not eyeballed
   The one item on the manual list that is pure arithmetic, and so the
   one there was never any excuse for not automating.
   ═══════════════════════════════════════════════════════════════ */
console.log('\n═══ 3. CONTRAST, MEASURED ═══');
{
  /* ONLY the base :root block. tokens.css also defines dark-mode and
     high-contrast palettes further down with literal hex values, and a
     naive last-wins scan picked those up instead — reporting the DARK
     secondary text against the LIGHT canvas as 1.28:1 and calling it a
     failure. The first draft of this test measured two palettes mixed
     together, which is worse than not measuring at all: it produces a
     confident number about a pairing that never appears on screen. */
  const tokensSrc = read('css/tokens.css');
  const baseBlock = tokensSrc.slice(tokensSrc.indexOf(':root {'),
                                    tokensSrc.indexOf('}', tokensSrc.indexOf(':root {')));
  const tokens = {};
  Array.from(baseBlock.matchAll(/(--color-[a-z-]+):\s*(#[0-9A-Fa-f]{6})/g))
    .forEach(m => { tokens[m[1]] = m[2]; });
  check('the light palette parsed on its own', Object.keys(tokens).length >= 10,
    `only ${Object.keys(tokens).length} colours found in the base :root block`);

  const lum = (hex) => {
    const c = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
  };

  /* WCAG AA: 4.5:1 for normal text, 3:1 for large text and for
     non-text indicators. Status colours are checked against BOTH
     surfaces they actually appear on. */
  const pairs = [
    ['text-primary on canvas',   '--color-text-primary',   '--color-canvas',       4.5],
    ['text-primary on surface',  '--color-text-primary',   '--color-surface',      4.5],
    ['text-secondary on canvas', '--color-text-secondary', '--color-canvas',       4.5],
    ['text-secondary on surface','--color-text-secondary', '--color-surface',      4.5],
    ['accent on surface',        '--color-accent',         '--color-surface',      4.5],
    ['status ok on surface',     '--color-status-ok',      '--color-surface',      4.5],
    ['status warn on surface',   '--color-status-warn',    '--color-surface',      4.5],
    ['status danger on surface', '--color-status-danger',  '--color-surface',      4.5],
    ['status warn on its tint',  '--color-status-warn',    '--color-tint-warn',    4.5],
    ['status ok on its tint',    '--color-status-ok',      '--color-tint-ok',      4.5],
    ['status danger on its tint','--color-status-danger',  '--color-tint-danger',  4.5],
    ['accent on its tint',       '--color-accent',         '--color-tint-accent',  4.5]
  ];

  pairs.forEach(([label, fg, bg, min]) => {
    const a = tokens[fg], b = tokens[bg];
    if (!a || !b) { check(`${label} — tokens found`, false, `${fg} or ${bg} missing`); return; }
    const r = ratio(a, b);
    check(`${label} meets ${min}:1`, r >= min, `measured ${r.toFixed(2)}:1`);
  });

  /* ── DARK MODE, measured too ──
     The dark palette was never checked either, and a colour that works
     on white very often fails on a dark surface — the status amber in
     particular, since darkening it for AA on white pushes it toward
     failing against a dark card. Two palettes, both measured. */
  const dkBlock = tokensSrc.slice(tokensSrc.indexOf('--dk-'));
  const dk = {};
  Array.from(dkBlock.matchAll(/(--dk-[a-z-]+):\s*(#[0-9A-Fa-f]{6})/g))
    .forEach(m => { dk[m[1]] = m[2]; });

  if (Object.keys(dk).length >= 6) {
    check('the dark palette parsed', true);
    [['dark text-primary',   '--dk-text-primary',   '--dk-surface'],
     ['dark text-secondary', '--dk-text-secondary', '--dk-surface'],
     ['dark status ok',      '--dk-status-ok',      '--dk-surface'],
     ['dark status warn',    '--dk-status-warn',    '--dk-surface'],
     ['dark status danger',  '--dk-status-danger',  '--dk-surface']
    ].forEach(([label, fg, bg]) => {
      if (!dk[fg] || !dk[bg]) { check(`${label} — tokens found`, false, `${fg} or ${bg} missing`); return; }
      const r = ratio(dk[fg], dk[bg]);
      check(`${label} meets 4.5:1`, r >= 4.5, `measured ${r.toFixed(2)}:1`);
    });
  } else {
    check('the dark palette parsed', false, `only ${Object.keys(dk).length} --dk- colours found`);
  }

  // White on the CTA is the one reversed pairing in the app.
  const white = '#FFFFFF';
  const cta = tokens['--color-cta'];
  check('white text on the CTA meets 4.5:1', ratio(white, cta) >= 4.5,
    `measured ${ratio(white, cta).toFixed(2)}:1`);
}

/* ═══════════════════════════════════════════════════════════════
   4 · STATUS IS NEVER COLOUR ALONE — grayscale, mechanically
   The grayscale screenshot check, done as a structural assertion: any
   element carrying a status class must also carry text. This is the
   rule that survives colour-blindness, a photocopier, and a projector.
   ═══════════════════════════════════════════════════════════════ */
console.log('\n═══ 4. STATUS SURVIVES GRAYSCALE ═══');
{
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { url: 'https://renalroute.test/', runScripts: 'dangerously',
    virtualConsole: vc, pretendToBeVisual: true });
  const { window } = dom, doc = window.document;
  window.fetch = () => Promise.reject(new Error('offline'));
  const style = doc.createElement('style');
  style.textContent = css;
  doc.head.appendChild(style);
  for (const s of scripts) {
    const el = doc.createElement('script');
    el.textContent = read(s);
    doc.body.appendChild(el);
  }

  const R = window.RenalRoute;
  R.Store.acceptConsent();
  R.Store.setSetting('refusalsSeen', true);
  R.Store.useEducationRanges();
  R.Seed.run();
  R.UI.go('home');

  const statusEls = Array.from(doc.querySelectorAll('.ring__status, .statblock__status, .chip'));
  check('there are status indicators to check', statusEls.length > 0);
  const silent = statusEls.filter(el => el.textContent.replace(/[^\p{L}\p{N}]/gu, '').length === 0);
  check('every status indicator carries text, not just colour',
    silent.length === 0, `${silent.length} indicator(s) render colour with no words`);

  // Every ring must state its own meaning without a voiceover.
  const ringNames = Array.from(doc.querySelectorAll('.ring__name')).length;
  const ringSubs = Array.from(doc.querySelectorAll('.ring__sub')).length;
  check('every ring is labelled', ringNames >= 3 && ringSubs >= 3,
    `${ringNames} names, ${ringSubs} sub-labels`);

  // Every chart carries a text alternative.
  const charts = Array.from(doc.querySelectorAll('svg[role="img"]'));
  const unlabelled = charts.filter(s => !(s.getAttribute('aria-label') || '').trim());
  check('every role=img graphic has a text alternative',
    unlabelled.length === 0, `${unlabelled.length} unlabelled`);

  console.log('\n═══ 5. KEYBOARD ═══');

  // Skip link must be the first focusable thing on the page.
  const focusable = Array.from(doc.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.closest('[hidden]'));
  check('the first focusable element is the skip link',
    focusable.length > 0 && focusable[0].classList.contains('skiplink'),
    focusable[0] ? focusable[0].className || focusable[0].tagName : 'nothing focusable');

  // Nothing may be reachable by keyboard without an accessible name.
  const nameless = focusable.filter(el => {
    if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return false;
    if ((el.textContent || '').trim()) return false;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
      const id = el.getAttribute('id');
      if (el.closest('label') || (id && doc.querySelector(`label[for="${id}"]`))) return false;
      if (el.getAttribute('placeholder')) return false;
    }
    return true;
  });
  check('every focusable control has an accessible name',
    nameless.length === 0,
    nameless.slice(0, 4).map(el => el.id || el.className || el.tagName).join(', '));

  /* outline:none is only a failure when nothing replaces it. A custom
     focus ring built from box-shadow is a perfectly good indicator, and
     the first version of this check flagged one and was simply wrong.
     What matters is that every rule removing the outline supplies its
     own visible ring in the same declaration block. */
  const strippedCss = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const suppressors = Array.from(strippedCss.matchAll(/{[^}]*outline:\s*(?:none|0)[^}]*}/g))
    .map(m => m[0])
    .filter(block => !/box-shadow:\s*0\s+0\s+0/.test(block) && !/outline-width/.test(block));
  check('every outline:none supplies its own focus ring',
    suppressors.length === 0,
    `${suppressors.length} rule(s) remove the outline with nothing in its place`);

  console.log('\n═══ 6. MOTION AND ZOOM ═══');

  /* Checked against the viewport META TAG, not the whole document. The
     first version scanned all of index.html and matched its own HTML
     comment — the one explaining that neither attribute is used. That
     is the second time in this suite a test has failed on its own
     documentation; both times the fix was to narrow what it reads. */
  const viewportTag = (html.match(/<meta[^>]+name="viewport"[^>]*>/i) || [''])[0];
  check('the viewport allows zoom',
    !!viewportTag &&
    !/user-scalable\s*=\s*no/i.test(viewportTag) &&
    !/maximum-scale/i.test(viewportTag),
    `viewport tag: ${viewportTag || 'MISSING'}`);

  /* Text size scales TOKENS, not zoom, so layout survives. Checked as
     a source assertion since jsdom will not resolve var(). */
  check('text size scales the type tokens',
    /:root\[data-textsize="large"\][^}]*--type-body/s.test(css) ||
    /:root\[data-textsize="large"\]/.test(css),
    'text size must scale tokens rather than zooming the page');

  const reducedBlocks = (css.match(/@media[^{]*prefers-reduced-motion:\s*reduce/g) || []).length;
  check('reduced motion is honoured throughout', reducedBlocks >= 8,
    `only ${reducedBlocks} reduced-motion blocks for a build with this much animation`);

  // Every keyframe animation needs a reduced-motion escape somewhere.
  const keyframes = Array.from(css.matchAll(/@keyframes\s+([A-Za-z][\w-]*)/g)).map(m => m[1]);
  check('there are animations to check', keyframes.length > 0);
  const reducedCss = (css.match(/@media[^{]*prefers-reduced-motion:\s*reduce[^{]*{([\s\S]*?)\n}/g) || []).join(' ');
  check('reduced-motion rules disable animation broadly',
    /animation:\s*none/.test(reducedCss) && /transition:\s*none/.test(reducedCss),
    'reduced motion must switch off both animation and transition');

  console.log('\n═══ 7. CSP — NO INLINE STYLES ANYWHERE ═══');

  /* The bug class this build has hit twice: style-src 'self' drops
     style="" from generated markup, so a layout works on a local file
     and silently collapses on the deployed site. */
  check('no inline style attribute in the markup',
    !/\sstyle="/.test(html), 'style-src self will drop it on the deployed site');

  const renderedInline = Array.from(doc.querySelectorAll('#app [style]'))
    .filter(el => !el.className || typeof el.className !== 'string' ||
      !/ripple|morph-ghost|bloom__leaf|is-magnet|is-lifted/.test(el.className));
  check('no rendered element carries an inline style',
    renderedInline.length === 0,
    renderedInline.slice(0, 3).map(el => el.id || el.className).join(', '));

  /* ═══ 8. THE BOOT SCREEN NEVER WAITS ON PURPOSE ═══
     A splash that pads its own duration is a lie about how fast the app
     is, and this one is opened several times a day. These checks exist
     because the mistake is a single plausible line — somebody deciding
     the logo "deserves a moment" — and it would be invisible in review.

     Enforced at source level: the dismissal must not sit behind a timer,
     and the CSS must not hold the screen open with a delay. */
  console.log('\n═══ 8. THE BOOT SCREEN NEVER WAITS ON PURPOSE ═══');

  const appJs = read('js/app.js');
  const bootBlock = (appJs.match(/const bootEl[\s\S]*?\n  }/) || [''])[0];
  check('the boot screen is dismissed in app.js', bootBlock.length > 0,
    'no dismissal found — the screen would never come down');
  check('  ...not behind a timer that delays the dismissal',
    !/setTimeout\([^)]*\)\s*;?\s*(?:\n\s*)?bootEl\.classList\.add\('is-done'\)/.test(appJs) &&
    !/setTimeout\(\s*\(\)\s*=>\s*{?\s*bootEl\.classList\.add/.test(appJs),
    'is-done must be set immediately, never inside a delay');
  const delays = (bootBlock.match(/setTimeout\([^,]*,\s*(\d+)\)/g) || [])
    .map(s => Number(s.match(/(\d+)\)/)[1]));
  check('  ...and the only timer is the fade already running in CSS',
    delays.length <= 1 && (delays[0] === undefined || delays[0] <= 400),
    'timers found: ' + delays.join(', '));
  check('  ...the node is removed, not merely hidden',
    /removeChild\(bootEl\)|bootEl\.remove\(\)/.test(bootBlock),
    'a fixed overlay left in the tree keeps announcing and can come back');

  /* It ships VISIBLE. Hidden, it would cover nothing on the cold load
     it exists for — the exact load where a blank canvas is longest. */
  check('the boot screen ships visible, not hidden',
    /<div id="boot"[^>]*>/.test(html) && !/<div id="boot"[^>]*\shidden/.test(html),
    'hidden at rest means it covers nothing on a cold start');

  // The honest line, first thing on screen rather than in a footer.
  const bootMarkup = (html.match(/<div id="boot"[\s\S]*?<\/div>\s*<\/div>/) || [''])[0];
  check('  ...and carries the not-a-medical-device line',
    /not a medical device/i.test(bootMarkup),
    'the first thing on screen should be the honest one');
  check('  ...announces itself without trapping anything',
    /role="status"/.test(bootMarkup) && !/tabindex|<button|<a /.test(bootMarkup),
    'nothing focusable belongs on a screen that is gone in 80ms');

  // Nothing in CSS may hold it open.
  const bootCss = (css.match(/\.boot[\s\S]*?(?=\n\/\* ═|$)/) || [''])[0];
  const holdOpen = (bootCss.match(/animation:[^;]*?(\d+(?:\.\d+)?)s\s+(?:\w+\s+)?(\d+(?:\.\d+)?)s/g) || [])
    .filter(s => !/boot-slow/.test(s));
  check('  ...and no CSS delay holds it open', holdOpen.length === 0,
    holdOpen.join(' | '));
  check('  ...the stall notice is the only timed thing on it',
    /boot-slow/.test(bootCss) && /6s/.test(bootCss),
    'the one timer should admit a failure, not stage a performance');

  /* ═══ 9. THE TEST HARNESS ITSELF ═══
     This project runs two check() signatures: (label, ok, detail) in the
     lint suites, and (label, actual, expected) in the behavioural ones.
     Mixing them has now cost four separate incidents — three false
     FAILURES on clean runs, and once, worse, a silent PASS: the service
     worker drift guard was written in the wrong form, so a non-empty
     list of uncached files was read as a truthy "ok" and the assertion
     could never fail. It sat green while the shell drifted by two
     modules, guarding nothing.

     A false pass is far more expensive than a false failure, so this
     file now checks its own calls: in a (label, ok, detail) suite, the
     second argument must actually be a boolean expression. */
  console.log('\n═══ 9. THE TEST HARNESS ITSELF ═══');
  {
    /* Arguments are split by bracket matching, not by a regex on commas:
       a naive split breaks on the commas inside `path.join(a, b)` and
       reports the wrong argument, which is how the first version of
       this lint produced four false positives of its own. */
    function checkArgs(s, i) {
      let depth = 0, quote = null, out = [], cur = '';
      for (; i < s.length; i++) {
        const c = s[i];
        if (quote) { cur += c; if (c === quote && s[i - 1] !== '\\') quote = null; continue; }
        if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
        if ('([{'.indexOf(c) !== -1) { depth++; cur += c; continue; }
        if (')]}'.indexOf(c) !== -1) {
          if (c === ')' && depth === 0) { out.push(cur); return out; }
          depth--; cur += c; continue;
        }
        if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
        cur += c;
      }
      return out;
    }

    /* The bug class, stated precisely: an argument that produces a
       STRING where a boolean belongs. Every real instance took one of
       these shapes — `list.join(', ')`, a bare string literal, or a
       plain property read like `manifest.display` — and every one of
       them is truthy, so the assertion passed no matter what the app
       did. A bare identifier (`ok`, `sig`) is left alone: those hold
       booleans, and flagging them would train people to ignore this. */
    /* Every suite that uses the (label, ok, detail) signature, not just
       this one. The inert assertions found so far were spread across
       two files, and the one in wiring.js was self-testing a clinical
       lint — it reported that a medication-safety check caught all four
       decoys while only counting them. The suites using
       (label, actual, expected) are deliberately excluded: there, a
       value in the second position is correct. */
    const OK_DETAIL_SUITES = ['test/sweep.js', 'test/wiring.js', 'test/headers.js', 'test/a11y.js'];
    const src = OK_DETAIL_SUITES.map(read).join('\n');

    /* `.join(` and a leading quote are decisive on their own: an `||`
       between two strings is still a string, so the presence of a
       boolean-looking operator proves nothing. The real instance was
       literally `notCached.join(', ') || 'none'` — a first version of
       this lint let that through because of the `||`, which is why the
       string-producing forms below are checked BEFORE anything else. */
    /* An ALLOW-LIST first, because these settle the question on their
       own: a comparison, or a call that can only return a boolean. It
       has to run first for two reasons found by testing this lint
       against the file it lints — `fs.existsSync(path.join(...))`
       contains `.join(` without producing a string, and a regex literal
       like /content="[^"]*icon/.test(html) contains a double quote that
       the argument splitter reads as the start of a string. */
    const STRONG_BOOL = /===|!==|[<>]=?|&&\s*\w+\s*===|\.every\(|\.some\(|\.includes\(|\.test\(|existsSync|^!/;
    // Otherwise: does it produce a string where a boolean belongs?
    const ALWAYS_STRING = /\.join\(|^'|^"|^`/;
    const BARE_READ = /^[\w$]+(?:\.[\w$]+)+$/;   // e.g. manifest.display
    const bad = [];
    const re = /\bcheck\(/g;
    let m;
    while ((m = re.exec(src))) {
      const a = checkArgs(src, m.index + 6).map(x => x.trim());
      if (a.length < 2) continue;
      const arg = a[1];
      if (STRONG_BOOL.test(arg)) continue;
      if (ALWAYS_STRING.test(arg) || BARE_READ.test(arg)) {
        bad.push(a[0].slice(0, 40) + ' → ' + arg.slice(0, 34));
      }
    }
    check('every assertion in the ok/detail suites passes a boolean, not a value',
      bad.length === 0,
      'these can never fail: ' + bad.slice(0, 4).join('  |  '));
  }

  /* ═══ 10. SCRIPT LOADING ═══
     The application scripts sit in <head> with defer so their downloads
     run alongside the HTML parse instead of waiting for it. js/theme.js
     is the one exception and must stay blocking — it applies the saved
     theme before first paint, and deferring it puts the white flash
     back for every dark-mode user on every single load. That is a
     one-word mistake with a visible cost, so it gets a check. */
  console.log('\n═══ 10. SCRIPT LOADING ═══');
  {
    const headEnd = html.indexOf('</head>');
    const head = html.slice(0, headEnd);
    const themeTag = (html.match(/<script src="js\/theme\.js"[^>]*>/) || [''])[0];
    check('theme.js is in the head', head.includes('js/theme.js'),
      'it must run before first paint');
    check('  ...and is NOT deferred', !/defer|async/.test(themeTag), themeTag);

    const appScripts = [...html.matchAll(/<script src="(js\/[^"]+)"([^>]*)>/g)]
      .filter(m => m[1] !== 'js/theme.js');
    const notDeferred = appScripts.filter(m => !/defer/.test(m[2])).map(m => m[1]);
    check('every other script is deferred', notDeferred.length === 0,
      notDeferred.join(', '));
    check('  ...and they all load from the head',
      appScripts.every(m => html.indexOf(m[0]) < headEnd),
      'in the body, downloads cannot start until the HTML is parsed');

    /* The language tables must NOT be here. 47 KB of translation for
       languages the reader did not choose, on every visit. */
    check('no translation table is loaded up front',
      !/<script src="js\/data\/copy\.(es|zh|hi)\.js"/.test(html),
      'these are fetched on demand by I18N.load()');
    const i18nSrc = read('js/i18n.js');
    check('  ...but there is a loader that fetches them',
      /function load\(/.test(i18nSrc) && /createElement\('script'\)/.test(i18nSrc),
      'without it, choosing a language would do nothing');
    check('  ...and a failed fetch falls back rather than throwing',
      /onerror/.test(i18nSrc),
      'a missing file must leave the app in English, not broken');
  }
}

console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
if (failures.length) console.log('FAILURES:\n  · ' + failures.join('\n  · '));

/* ═══════════════════════════════════════════════════════════════
   WHAT THIS FILE CANNOT CHECK
   Stated rather than dropped. These need a real browser and a person:
     · Actual rendered overflow at 320 / 375 / 768 / 1440
     · Whether the tab ORDER matches the visual order on each screen
     · Camera, dictation and barcode on a real device
     · Whether Devanagari and CJK clip at the two larger text sizes
     · How the orbit and the rings read to somebody seeing them cold
   ═══════════════════════════════════════════════════════════════ */
console.log('\nSTILL NEEDS A HUMAN AND A REAL BROWSER:');
[
  'rendered overflow at 320 / 375 / 768 / 1440',
  'tab order matches visual order on each screen',
  'camera, dictation and barcode on a device',
  'Devanagari and CJK at the two larger text sizes',
  'whether the rings read correctly to somebody seeing them cold'
].forEach(s => console.log('  · ' + s));

process.exit(fail ? 1 : 0);
