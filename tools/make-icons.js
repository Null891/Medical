/* ═══════════════════════════════════════════════════════════════
   ICON GENERATOR — the app mark, rendered to real PNGs.
   ───────────────────────────────────────────────────────────────
   The manifest declared no icons and none existed, which means "add to
   home screen" did not work: Chrome will not offer an install prompt
   without a 192px and a 512px icon, and iOS falls back to a blurry
   screenshot of the page. A PWA that cannot be installed is a website
   with extra JSON.

   Rather than hand-wave an SVG and hope, this writes genuine PNGs with
   Node's built-in zlib — signature, IHDR, IDAT, IEND, nothing else. No
   image library, no build step, no dependency added to a project that
   deliberately has none.

   WHAT IT DRAWS. The app's own mark: an arc that is deliberately
   incomplete, because the gap IS the product — the unfilled part of a
   ring is what you have left. Drawn per-pixel from the same geometry
   the rail mark uses, so the icon and the interface are the same idea
   rather than two drawings that resemble each other.

   Run: node tools/make-icons.js
   ═══════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'icons');

/* ── PNG writing, from first principles ── */
function crc32(buf) {
  let c, crc = 0xFFFFFFFF;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xFF;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function png(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 6;    // colour type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Each scanline is prefixed with a filter byte; 0 = none.
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ── The mark ──
   Same geometry as the rail: a ring with a gap at twelve o'clock and a
   filled portion that stops short of closing. Anti-aliased by
   supersampling, because a jagged arc at 192px looks like a mistake. */
const CANVAS = '#FBF7F2';     // the app's canvas
const TRACK  = '#EFE7DC';     // unfilled arc — what is left
const FILL   = '#1F7A6B';     // the accent
const SS = 3;                 // supersample factor

function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function draw(size, maskable) {
  const S = size * SS;
  const acc = new Float64Array(size * size * 4);

  const cx = S / 2, cy = S / 2;
  /* A maskable icon must keep its content inside the safe zone — the
     middle 80% — because the platform may crop it to a circle, a
     squircle, or a rounded square and will happily slice the arc off
     otherwise. */
  const scale = maskable ? 0.62 : 0.78;
  const rOuter = S * scale / 2;
  const stroke = S * (maskable ? 0.085 : 0.105);
  const rMid = rOuter - stroke / 2;

  const GAP = 26;                       // degrees of open space at the top
  const START = -90 + GAP / 2;          // where the arc begins
  const SWEEP = 360 - GAP;
  const FILLED = SWEEP * 0.42;          // deliberately incomplete

  const [br, bg, bb] = hex(CANVAS);
  const [tr, tg, tb] = hex(TRACK);
  const [fr, fg, fb] = hex(FILL);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = br, g = bg, b = bb;
      if (Math.abs(dist - rMid) <= stroke / 2) {
        // Angle measured clockwise from twelve o'clock.
        let ang = Math.atan2(dy, dx) * 180 / Math.PI;
        let rel = ang - START;
        while (rel < 0) rel += 360;
        if (rel <= SWEEP) {
          const filled = rel <= FILLED;
          r = filled ? fr : tr; g = filled ? fg : tg; b = filled ? fb : tb;
        }
      }

      const oi = (Math.floor(y / SS) * size + Math.floor(x / SS)) * 4;
      acc[oi] += r; acc[oi + 1] += g; acc[oi + 2] += b; acc[oi + 3] += 255;
    }
  }

  const n = SS * SS;
  const out = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size * 4; i++) out[i] = Math.round(acc[i] / n);
  return png(size, size, out);
}

fs.mkdirSync(OUT, { recursive: true });

const jobs = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-192.png', 192, true],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true]   // iOS crops to a squircle
];

jobs.forEach(([name, size, maskable]) => {
  const buf = draw(size, maskable);
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`  wrote icons/${name}  ${size}x${size}  ${(buf.length / 1024).toFixed(1)} KB`);
});

/* A monochrome SVG for anywhere that wants a scalable mark. */
fs.writeFileSync(path.join(OUT, 'icon.svg'),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="RenalRoute">
  <title>RenalRoute</title>
  <!-- An arc left deliberately incomplete: the gap IS the product. -->
  <circle cx="16" cy="16" r="12.5" fill="none" stroke="#EFE7DC" stroke-width="3"
          stroke-dasharray="72.7 5.9" transform="rotate(-77 16 16)"/>
  <circle cx="16" cy="16" r="12.5" fill="none" stroke="#1F7A6B" stroke-width="3"
          stroke-dasharray="30.5 78.5" stroke-linecap="round" transform="rotate(-77 16 16)"/>
</svg>\n`);
console.log('  wrote icons/icon.svg');
console.log('\nDone. These are generated — re-run after any change to the mark.');
