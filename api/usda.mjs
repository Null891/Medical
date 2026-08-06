/* ═══════════════════════════════════════════════════════════════
   USDA FOODDATA CENTRAL — the real one.
   ───────────────────────────────────────────────────────────────
   This exists because of a specific near-miss. A 187-row food table
   arrived for import carrying the citation "USDA FoodData Central
   (estimated per serving)" on every row — and the numbers were
   generated, not looked up. The tells were a repeating ladder of
   values, "1 serving" as the serving text on all 187 rows, no gram
   weights anywhere, and one identical teaching note.

   FoodData Central publishes measured values. The word "estimated"
   beside its name is the contradiction. So rather than argue about
   whether a given table is real, this asks the actual database.

   WHY Foundation ONLY. FDC holds several dataTypes and they are not
   equally trustworthy for this purpose:

     Foundation      — laboratory-analysed, with sample counts and
                       provenance. This is what we want.
     SR Legacy       — the old standard reference, still decent, but
                       frozen since 2018.
     Survey (FNDDS)  — modelled from recipes, not measured.
     Branded         — manufacturer-submitted label data, unverified,
                       and the phosphorus is usually absent precisely
                       because labels are not required to carry it.

   Restricting to Foundation means fewer hits and better ones, which is
   the correct trade for a table whose whole claim is traceability.

   THE FOUR NUTRIENT IDS, and why 1225 matters most:

     1092  Potassium, K
     1091  Phosphorus, P
     1225  Phosphorus, added        <- see below
     1093  Sodium, Na
     1003  Protein                  <- carried, never displayed

   1225 is the interesting one. This app teaches that additive
   phosphate is absorbed almost completely while plant-bound phosphorus
   is under 40% — and until now it had no data for that distinction,
   only a hand-tagged `additive_risk` boolean. A measured added-
   phosphorus figure is the difference between asserting that argument
   and showing it.

   Protein is fetched and stored but never surfaced. The app does not
   track protein, deliberately: KDOQI prescribes it per kilogram of body
   weight, individualised by a dietitian, and a generic number would be
   wrong for most people. Keeping the value costs nothing and means the
   education card can cite a real figure if it ever needs to.

   THE KEY LIVES HERE, NEVER IN THE BROWSER. Same rule as
   api/invoke-llm.mjs. FDC issues free keys; set USDA_API_KEY in the
   Vercel environment. Without it this route reports that plainly rather
   than failing in a way that looks like the food is missing.
   ═══════════════════════════════════════════════════════════════ */

const FDC_SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search';

/* Laboratory-analysed only. Not Branded, not Survey. */
const DATA_TYPE = ['Foundation'];

const NUTRIENTS = {
  1003: 'protein_g',
  1091: 'phosphorus_mg',
  1092: 'potassium_mg',
  1093: 'sodium_mg',
  1225: 'phosphorus_added_mg'
};

/* A query is a food name. Anything with a scheme, a slash or an angle
   bracket is not one, and there is no reason to forward it. */
const QUERY_OK = /^[\p{L}\p{N} ,.'()%-]{2,80}$/u;

function originIsForeign(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host) return true;
  try { return new URL(origin).host !== host; } catch { return true; }
}

/* FDC reports per 100 g in Foundation records. The caller gets that
   figure and the portions FDC knows about, and does its own scaling —
   this route never invents a serving size. Guessing what "1 serving"
   means is exactly the error that made the imported table useless. */
function parseFood(food) {
  const out = {
    fdcId: food.fdcId,
    description: food.description,
    dataType: food.dataType,
    publishedDate: food.publishedDate || null,
    per: '100 g',
    nutrients: {},
    portions: []
  };

  (food.foodNutrients || []).forEach(n => {
    const id = n.nutrientId || (n.nutrient && n.nutrient.id);
    const key = NUTRIENTS[id];
    if (!key) return;
    const value = (n.value !== undefined) ? n.value : n.amount;
    if (typeof value !== 'number' || !isFinite(value)) return;
    out.nutrients[key] = value;
  });

  /* Household measures with their gram weights — the thing the failed
     import had none of, and without which a per-100g figure cannot
     become a per-serving one. */
  (food.foodMeasures || food.foodPortions || []).forEach(p => {
    const grams = p.gramWeight;
    const text = p.disseminationText || p.modifier ||
      (p.measureUnit && p.measureUnit.name) || null;
    if (typeof grams === 'number' && grams > 0 && text) {
      out.portions.push({ text: String(text).slice(0, 60), grams });
    }
  });

  return out;
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  /* Published nutrient values for a named food change on the order of
     years. A day of caching spares FDC the traffic and makes a repeated
     gap-filling run fast. */
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (originIsForeign(req)) {
    res.status(403).json({ error: 'forbidden_origin' });
    return;
  }

  const key = process.env.USDA_API_KEY;
  if (!key) {
    /* Named plainly. A missing key that reads as "food not found" would
       send somebody looking for the wrong problem, and it is the kind
       of misdirection that costs an afternoon. */
    res.status(503).json({
      error: 'no_api_key',
      detail: 'USDA_API_KEY is not set in this environment. Get a free key at ' +
              'https://fdc.nal.usda.gov/api-key-signup.html and add it to the Vercel project.'
    });
    return;
  }

  const query = String((req.query && req.query.q) || '').trim();
  if (!QUERY_OK.test(query)) {
    res.status(400).json({ error: 'bad_query' });
    return;
  }

  const pageSize = Math.min(Math.max(parseInt(req.query.n, 10) || 5, 1), 25);

  try {
    const r = await fetch(FDC_SEARCH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': key },
      body: JSON.stringify({
        query,
        dataType: DATA_TYPE,
        pageSize,
        requireAllWords: true
      })
    });

    if (r.status === 403) { res.status(502).json({ error: 'bad_api_key' }); return; }
    if (!r.ok) { res.status(502).json({ error: 'upstream', status: r.status }); return; }

    const data = await r.json();
    const foods = (data.foods || []).map(parseFood)
      // A hit with none of the four nutrients is not useful here.
      .filter(f => Object.keys(f.nutrients).length > 0);

    res.status(200).json({
      query,
      dataType: DATA_TYPE,
      count: foods.length,
      foods,
      /* Returned so the caller can write it into `source` verbatim
         rather than composing a citation of its own. */
      citation: 'USDA FoodData Central, Foundation Foods'
    });
  } catch (e) {
    res.status(502).json({ error: 'fetch_failed' });
  }
}
