/* ═══════════════════════════════════════════════════════════════
   HEADER LINT — does the deployed policy permit what the code does?

   This exists because of a bug that shipped. Permissions-Policy denied
   `camera` and `microphone` to the page as a hardening measure, and
   dictation and barcode scanning were added later. On the deployed site
   both were silently blocked by a header written weeks earlier — and
   nearly three hundred passing assertions could not see it, because
   jsdom does not enforce Permissions-Policy or CSP.

   So rather than hardcoding an expected policy, this DERIVES the
   requirements from the source: it looks for what the app actually
   calls, then asserts the headers permit exactly that. Add a capability
   and forget the header, and this fails.
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

const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const globalHeaders = (vercel.headers || []).find(h => h.source === '/(.*)');
const H = {};
(globalHeaders ? globalHeaders.headers : []).forEach(h => { H[h.key.toLowerCase()] = h.value; });

// Everything the browser will actually run.
const appSource = ['js', '.']
  .flatMap(dir => {
    const full = path.join(ROOT, dir);
    return fs.readdirSync(full, { withFileTypes: true })
      .filter(e => e.isFile() && e.name.endsWith('.js'))
      .map(e => fs.readFileSync(path.join(full, e.name), 'utf8'));
  })
  .concat(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'))
  .join('\n');

const csp = H['content-security-policy'] || '';
const directive = (name) => {
  const m = csp.split(';').map(s => s.trim()).find(s => s.startsWith(name + ' '));
  return m ? m.slice(name.length + 1).trim() : null;
};
const pp = H['permissions-policy'] || '';
const ppAllows = (feature) => new RegExp(feature + '=\\((self|\\*)\\)').test(pp);

console.log('\n═══ REQUIRED HEADERS PRESENT ═══');
[
  'content-security-policy', 'x-content-type-options', 'x-frame-options',
  'referrer-policy', 'strict-transport-security', 'permissions-policy',
  'cross-origin-opener-policy', 'cross-origin-resource-policy'
].forEach(k => check(k, !!H[k], 'missing'));

console.log('\n═══ CSP IS NOT QUIETLY DEFEATED ═══');
check("no 'unsafe-inline'", !csp.includes('unsafe-inline'));
check("no 'unsafe-eval'", !csp.includes('unsafe-eval'));
check('no bare wildcard source', !/(^|\s)\*(\s|;|$)/.test(csp));
check("frame-ancestors is 'none'", directive('frame-ancestors') === "'none'");
check("object-src is 'none'", directive('object-src') === "'none'");
check('a default-src exists to catch anything unlisted', !!directive('default-src'));

console.log('\n═══ POLICY PERMITS WHAT THE CODE ACTUALLY DOES ═══');
/* Each of these derives a requirement from the source. The point is that
   adding a capability without widening the header fails HERE, at the
   only layer that can see both. */

const usesGetUserMedia = /getUserMedia\s*\(/.test(appSource);
check('camera allowed iff the code opens a camera',
  usesGetUserMedia === ppAllows('camera'),
  `code uses getUserMedia: ${usesGetUserMedia}, policy allows camera: ${ppAllows('camera')}`);

const usesSpeech = /SpeechRecognition/.test(appSource);
check('microphone allowed iff the code listens',
  usesSpeech === ppAllows('microphone'),
  `code uses speech: ${usesSpeech}, policy allows microphone: ${ppAllows('microphone')}`);

const usesSrcObject = /srcObject/.test(appSource);
const mediaSrc = directive('media-src') || directive('default-src') || '';
check('media-src permits a MediaStream when one is attached',
  !usesSrcObject || mediaSrc.includes('blob:'),
  `srcObject used: ${usesSrcObject}, media-src: "${mediaSrc}"`);

const usesBlobUrl = /createObjectURL/.test(appSource);
const imgSrc = directive('img-src') || '';
check('img-src permits blob: when the code creates object URLs',
  !usesBlobUrl || imgSrc.includes('blob:'),
  `createObjectURL used: ${usesBlobUrl}, img-src: "${imgSrc}"`);

const usesDataUrlImage = /toDataURL/.test(appSource);
check('img-src permits data: when the code builds data URLs',
  !usesDataUrlImage || imgSrc.includes('data:'),
  `toDataURL used: ${usesDataUrlImage}, img-src: "${imgSrc}"`);

const registersSW = /serviceWorker\s*\.\s*register/.test(appSource);
const workerSrc = directive('worker-src') || directive('default-src') || '';
check('worker-src permits a service worker when one is registered',
  !registersSW || workerSrc.includes("'self'"),
  `SW registered: ${registersSW}, worker-src: "${workerSrc}"`);

const hasManifest = /rel="manifest"/.test(appSource);
const manifestSrc = directive('manifest-src') || directive('default-src') || '';
check('manifest-src permits the manifest when one is linked',
  !hasManifest || manifestSrc.includes("'self'"),
  `manifest linked: ${hasManifest}, manifest-src: "${manifestSrc}"`);

const callsOwnApi = /fetch\(\s*['"`]\/api\//.test(appSource);
const connectSrc = directive('connect-src') || directive('default-src') || '';
check('connect-src permits the app calling its own API',
  !callsOwnApi || connectSrc.includes("'self'"),
  `calls /api: ${callsOwnApi}, connect-src: "${connectSrc}"`);

console.log('\n═══ THIRD-PARTY CALLS STAY BEHIND THE PROXY ═══');
/* The page must never reach a foreign host directly — that is the whole
   reason /api/product exists. Serverless functions may, and are excluded. */
const pageFetchesForeignHost = /fetch\(\s*['"`]https?:\/\//.test(appSource);
check('no page-level fetch to an external origin', !pageFetchesForeignHost);
check('api routes are marked no-store',
  ((vercel.headers || []).find(h => h.source === '/api/(.*)') || { headers: [] })
    .headers.some(h => h.key === 'Cache-Control' && h.value.includes('no-store')));

console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
if (failures.length) console.log('FAILURES:\n  · ' + failures.join('\n  · '));
process.exit(fail ? 1 : 0);
