/* ═══════════════════════════════════════════════════════════════
   LIVE — what the deployment actually serves, not what we declared.
   ───────────────────────────────────────────────────────────────
   THIS EXISTS BECAUSE OF A REPORT WE COULD ONLY REFUTE BY HAND.

   An independent scan returned eleven findings against the live app,
   six of them "missing security header" — X-Frame-Options, HSTS, CSP,
   nosniff, Permissions-Policy, Referrer-Policy. All six were present.
   Their fetcher had been given a 403 challenge, and a challenge page is
   served at the edge without the project's headers on it, so "missing"
   really meant "we never reached your app".

   Refuting that took a person running curl. Nothing in eleven suites
   and 1,498 assertions could speak to it, because test/headers.js reads
   vercel.json — it validates the policy we WROTE and has never once
   looked at a response. Declared and served are two different facts,
   and only one of them protects anybody.

   So this file asks the deployment.

   ═══ THE SKIP RULE, WHICH IS THE EASY THING TO GET WRONG ═══

   A network test that quietly passes when it cannot connect is a check
   that cannot fail — the exact failure mode this project has been bitten
   by repeatedly, most recently an axe rule that reported a pass it had
   not earned because jsdom could not evaluate it.

   So: no network, no verdict. The run prints SKIPPED in full, counts
   the skips separately from passes, and never lets a skip stand in for
   a pass. It fails ONLY when the site answers and the answer is wrong.
   An offline developer sees a clearly incomplete run rather than a
   green one.

   ═══ WHY THIS IS NOT PART OF `npm test` ═══

   It verifies a DEPLOYMENT. Running it before deploying is a category
   error — the bundle-fingerprint check would fail every time a source
   is edited, which is most of the time, and a suite that is always red
   gets ignored just as thoroughly as one that cannot fail.

   So it runs AFTER a push:
     npm test      the eleven suites, offline, against the working copy
     npm run live  this file, against what is now serving
     npm run verify  both, in that order

   Point it somewhere else with:
     node live.js https://chronic-ca.vercel.app
   ═══════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0, skip = 0;
const failures = [];

function check(label, ok, detail) {
  if (ok) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; failures.push(label); console.log(`  FAIL  ${label}${detail ? '  → ' + detail : ''}`); }
}
function skipped(label, why) {
  skip++; console.log(`  SKIP  ${label}  — ${why}`);
}

/* The host is DERIVED from the canonical tag, not typed here. A second
   hand-maintained copy of the domain is the thing test/sweep.js section
   0c exists to prevent, and this file would be that copy. */
const html = read('index.html');
const canonical = (html.match(/<link rel="canonical" href="(https:\/\/[^"]+)"/) || [])[1];
const BASE = (process.argv[2] || canonical || '').replace(/\/$/, '');

const TIMEOUT_MS = 10000;

async function get(url, method) {
  return fetch(url, {
    method: method || 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    /* A plain, honest user agent. Not a browser impersonation: if the
       host challenges non-browser traffic, that is a fact worth
       discovering here rather than disguising. */
    headers: { 'User-Agent': 'RenalRoute-live-check/1.0 (+repo test/live.js)' }
  });
}

(async function run() {
  console.log('\n═══ THE DEPLOYMENT, AS IT ACTUALLY ANSWERS ═══');

  if (!BASE) {
    console.log('  No canonical URL found in index.html and none given. Nothing to check.');
    console.log('\n═══ 0 passed, 1 failed ═══');
    process.exit(1);
  }
  console.log(`  ${BASE}\n`);

  let root;
  try {
    root = await get(BASE + '/');
  } catch (e) {
    skipped('the whole suite', `cannot reach ${BASE} (${e.name || e.message})`);
    finish();
    return;
  }

  /* ── 1 · IT ANSWERS AT ALL ──
     Stated first and separately, because everything below is
     meaningless if this is a challenge page. A 403 here is exactly what
     the scanner hit, and if it happens the remaining header assertions
     would report failures that are really this one failure wearing six
     costumes. */
  check('/ returns 200', root.status === 200, `got ${root.status}`);

  if (root.status === 403) {
    console.log('\n  A 403 here is a bot challenge, not a missing page.');
    console.log('  Every header check below would fail for that one reason, so they');
    console.log('  are skipped rather than reported as six separate defects.\n');
    ['X-Frame-Options', 'Strict-Transport-Security', 'Content-Security-Policy',
     'X-Content-Type-Options', 'Permissions-Policy', 'Referrer-Policy']
      .forEach(h => skipped(`${h} is served`, 'blocked before reaching the app'));
    finish();
    return;
  }

  /* ── 2 · EVERY HEADER WE DECLARED IS ON THE RESPONSE ──
     Derived from vercel.json rather than listed here, so adding a header
     to the config automatically extends this check. That is the whole
     point: the two can never drift apart silently again. */
  const vercel = JSON.parse(read('vercel.json'));
  const declared = ((vercel.headers || []).find(h => h.source === '/(.*)') || {}).headers || [];

  check('vercel.json declares global headers', declared.length > 0, `${declared.length}`);

  declared.forEach(({ key, value }) => {
    const got = root.headers.get(key);
    if (got === null) {
      check(`  ${key} is served`, false, 'header absent from the live response');
      return;
    }
    /* Compared on substance, not byte-for-byte: an edge may normalise
       whitespace or case in a long policy, and failing on that would be
       noise. What must hold is that the directives we wrote are there. */
    const norm = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();
    check(`  ${key} is served`, norm(got) === norm(value),
      `served: ${String(got).slice(0, 70)}`);
  });

  /* ── 3 · THE CSP STILL REFUSES WHAT IT IS SUPPOSED TO REFUSE ──
     A header that is present but has quietly gained 'unsafe-inline' is
     worse than one that is missing, because it reads as protection. */
  const csp = root.headers.get('content-security-policy') || '';
  check('the CSP has not gained unsafe-inline',
    csp.indexOf("'unsafe-inline'") === -1, csp.slice(0, 90));
  check('  ...nor unsafe-eval', csp.indexOf("'unsafe-eval'") === -1, '');
  check('  ...and still carries its script hashes',
    (csp.match(/'sha256-/g) || []).length >= 2, '');

  /* ── 4 · A MISTYPED URL IS A REAL 404 ──
     Not a 200 with an empty page, which is how a single-page app
     usually gets this wrong, and not a soft redirect to the homepage. */
  try {
    const missing = await get(BASE + '/no-such-route-' + Date.now());
    check('an unknown route returns 404', missing.status === 404, `got ${missing.status}`);
    const body = await missing.text();
    check('  ...as a branded page, not the host default',
      /RenalRoute/i.test(body), 'the 404 body does not mention the app');
  } catch (e) {
    skipped('the 404 route', e.name || e.message);
  }

  /* ── 5 · THE SHARE PREVIEW ACTUALLY RESOLVES ──
     og:image is an absolute URL, and a social scraper fetching it is an
     automated request from a datacentre. If that request is challenged,
     the card unfurls empty and nothing in the app ever tells us. This is
     the one check that would notice. */
  const ogImage = (html.match(/property="og:image" content="([^"]+)"/) || [])[1];
  if (!ogImage) {
    check('og:image is declared', false, 'no og:image in index.html');
  } else {
    try {
      const img = await get(ogImage);
      check('the og:image fetches (share previews will not be empty)',
        img.status === 200, `got ${img.status} for ${ogImage}`);
      check('  ...and is served as an image',
        /^image\//.test(img.headers.get('content-type') || ''),
        img.headers.get('content-type') || 'no content-type');
    } catch (e) {
      skipped('the og:image', e.name || e.message);
    }
  }

  /* ── 6 · THE DEPLOYED BUNDLE IS THE ONE WE BUILT ──
     tools/build-assets.js stamps a fingerprint of the joined sources
     into the bundle. sweep.js checks the local file carries the right
     one; this checks the SERVED file does. That closes the gap the
     CRLF/CSP-hash incident opened, where the bytes on disk and the bytes
     on the wire were not the same. */
  try {
    const bundle = await get(BASE + '/js/bundle.js');
    const served = (await bundle.text()).match(/sources sha256:([0-9a-f]+)/);
    const local = read('js/bundle.js').match(/sources sha256:([0-9a-f]+)/);
    check('the served bundle carries a source fingerprint', !!served, '');
    check('  ...matching the local build',
      !!served && !!local && served[1] === local[1],
      served && local ? `live ${served[1]} vs local ${local[1]}` : 'one of them is missing');
  } catch (e) {
    skipped('the bundle fingerprint', e.name || e.message);
  }

  finish();
})().catch(e => {
  console.error('\nLIVE RUN CRASHED:', e.message, '\n', e.stack);
  process.exit(1);
});

function finish() {
  console.log(`\n═══ ${pass} passed, ${fail} failed${skip ? `, ${skip} SKIPPED` : ''} ═══`);
  if (failures.length) console.log('FAILURES:\n  · ' + failures.join('\n  · '));
  if (skip) {
    console.log('\n  ' + skip + ' check(s) could not run. That is NOT a pass — this suite');
    console.log('  reports what it could not reach rather than assuming it was fine.');
  }
  process.exit(fail ? 1 : 0);
}
