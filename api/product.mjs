/* ═══════════════════════════════════════════════════════════════
   /api/product — barcode lookup, proxied.

   The page cannot call Open Food Facts directly: the CSP sets
   connect-src 'self', deliberately. Relaxing it to allow a third-party
   host would widen what every script on the page is permitted to reach,
   to buy one feature. Proxying keeps the policy at 'self' and puts the
   outbound call somewhere it can be constrained.

   Constrained means: barcodes only. The path is built from digits this
   function validated itself, so no caller can steer it at another host
   or another endpoint, and the response is reshaped rather than
   forwarded — the client receives four known fields, never whatever
   the upstream happened to return.

   Open Food Facts is an open database with no key. It is also
   crowd-sourced and incomplete, which the interface says plainly rather
   than presenting a miss as "this product is fine".
   ═══════════════════════════════════════════════════════════════ */

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product/';

// Real-world barcodes are EAN-8 through GTIN-14.
const BARCODE = /^[0-9]{8,14}$/;

// Open Food Facts asks callers to identify themselves.
const UA = 'RenalRoute/1.0 (CKD nutrition education; hackathon reference build)';

function originIsForeign(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host) return true;
  try { return new URL(origin).host !== host; } catch { return true; }
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // A barcode's ingredients change rarely; a short cache spares the
  // upstream and makes a re-scan feel instant.
  res.setHeader('Cache-Control', 'public, max-age=3600');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (originIsForeign(req)) {
    return res.status(403).json({ error: 'forbidden_origin' });
  }

  const code = String((req.query && req.query.code) || '').trim();
  if (!BARCODE.test(code)) {
    return res.status(400).json({ error: 'bad_barcode' });
  }

  try {
    const upstream = await fetch(
      `${OFF_BASE}${code}.json?fields=product_name,brands,ingredients_text,ingredients_text_en`,
      { headers: { 'User-Agent': UA, accept: 'application/json' } }
    );

    if (!upstream.ok) {
      return res.status(502).json({ error: 'upstream_error', status: upstream.status });
    }

    const data = await upstream.json();
    if (!data || data.status === 0 || !data.product) {
      return res.status(404).json({ error: 'not_found' });
    }

    const p = data.product;
    const ingredients = (p.ingredients_text_en || p.ingredients_text || '').trim();

    // Reshaped, not forwarded, and length-capped: this text goes on to be
    // rendered and scanned, and an unbounded upstream string has no
    // business becoming either.
    return res.status(200).json({
      code,
      name: String(p.product_name || '').slice(0, 120),
      brand: String(p.brands || '').slice(0, 80),
      ingredients: ingredients.slice(0, 1200),
      hasIngredients: ingredients.length > 0
    });

  } catch (err) {
    console.error('product lookup failed', err);
    return res.status(502).json({ error: 'request_failed' });
  }
}
