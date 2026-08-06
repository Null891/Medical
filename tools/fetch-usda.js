/* ═══════════════════════════════════════════════════════════════
   FETCH-USDA — close the gaps with measured values, or not at all.
   ───────────────────────────────────────────────────────────────
   tools/data-gaps.js says WHAT is missing and in what order. This
   fetches it, from the actual database, and writes a patch file for
   review. It never edits js/data/anchor-foods.js directly.

   WHY THIS EXISTS. A 187-row table arrived carrying the citation
   "USDA FoodData Central (estimated per serving)" on every row. The
   numbers were a repeating ladder — 3, 8, 12, 18, 25, 35, 45, 55 —
   the serving text was "1 serving" on all 187, and not one row had a
   gram weight. Real published data does not look like that: the 42
   priced rows already in this table have 41 distinct potassium values
   between them.

   So the answer to "we need more foods" is not a better prompt. It is
   asking FoodData Central.

   WHAT THIS WILL NOT DO, in order of how badly it would matter:

     It will not write a value it did not receive from FDC.
     It will not invent or infer a serving size. A per-100g figure
       becomes a per-serving figure only when the row already states
       its serving in grams, or FDC returns a household portion with a
       gram weight. Otherwise the gap stays open, which is honest.
     It will not overwrite a value that is already there. Existing
       figures were transcribed from published tables and re-derived by
       hand; a fetch does not outrank that.
     It will not silently accept an implausible number. The per-gram
       density check runs on everything — the same pass that would have
       caught whole milk listed at 134 mg phosphorus per cup.

   Run:
     node tools/fetch-usda.js                  (dry run, prints a report)
     node tools/fetch-usda.js --write          (writes tools/usda-patch.json)
     node tools/fetch-usda.js --only egg,salmon

   Needs the app deployed, or a local server, with USDA_API_KEY set.
   Point it elsewhere with --base https://chroniccal.vercel.app
   ═══════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? fallback : (argv[i + 1] || fallback);
};
const WRITE = argv.includes('--write');
const BASE = flag('base', 'https://chroniccal.vercel.app');
const ONLY = (flag('only', '') || '').split(',').map(s => s.trim()).filter(Boolean);

const box = { console, module: {}, window: {} };
vm.createContext(box);
vm.runInContext(read('js/data/anchor-foods.js'), box, { filename: 'anchor-foods.js' });
const ANCHOR_FOODS = vm.runInContext('ANCHOR_FOODS', box);

const FIELD = {
  k:  { low: 'k_low',  high: 'k_high',  usda: 'potassium_mg',  name: 'potassium' },
  p:  { low: 'p_low',  high: 'p_high',  usda: 'phosphorus_mg', name: 'phosphorus' },
  na: { low: 'na_low', high: 'na_high', usda: 'sodium_mg',     name: 'sodium' }
};

/* Plausibility ceilings in mg per 100 g, well above any real food, set
   to catch a decimal in the wrong place rather than to second-guess the
   database. Potassium: dried herbs reach ~2,700; nothing edible is near
   9,000. Sodium: salt itself is ~38,000, so this only catches nonsense.
   [NEEDS VERIFICATION — engineering guards, not clinical limits.] */
const CEILING_PER_100G = { k: 9000, p: 2500, na: 40000 };

function gapsFor(row) {
  return Object.keys(FIELD).filter(n => row[FIELD[n].low] == null);
}

/* The only two ways a per-100g figure may become a per-serving one.
   Neither guesses. */
function gramsForServing(row, food) {
  if (typeof row.serving_grams === 'number' && row.serving_grams > 0) {
    return { grams: row.serving_grams, from: 'row' };
  }
  const text = String(row.serving_text || '').toLowerCase();
  const hit = (food.portions || []).find(p =>
    text && p.text && text.includes(String(p.text).toLowerCase().slice(0, 8)));
  if (hit) return { grams: hit.grams, from: 'fdc:' + hit.text };
  return null;
}

async function lookup(name) {
  const url = `${BASE}/api/usda?q=${encodeURIComponent(name)}&n=5`;
  const r = await fetch(url);
  if (!r.ok) {
    let why = 'http ' + r.status;
    try { const j = await r.json(); if (j.error) why = j.error; } catch (e) { }
    return { error: why };
  }
  return r.json();
}

(async function main() {
  let rows = ANCHOR_FOODS.filter(r => gapsFor(r).length);
  if (ONLY.length) rows = rows.filter(r => ONLY.includes(r.id));

  console.log(`\n═══ FILLING GAPS FROM FOODDATA CENTRAL ═══`);
  console.log(`  ${rows.length} rows have at least one gap · asking ${BASE}\n`);

  const patch = [];
  const skipped = [];

  for (const row of rows) {
    const want = gapsFor(row);
    const res = await lookup(row.food_name);

    if (res.error) {
      skipped.push({ id: row.id, why: res.error });
      console.log(`  ..  ${row.food_name.padEnd(28)} ${res.error}`);
      if (res.error === 'no_api_key' || res.error === 'bad_api_key') {
        console.log('\n  Stopping: the key is the problem, not the food.\n');
        break;
      }
      continue;
    }
    const food = (res.foods || [])[0];
    if (!food) {
      skipped.push({ id: row.id, why: 'no Foundation match' });
      console.log(`  --  ${row.food_name.padEnd(28)} no Foundation match`);
      continue;
    }

    const scale = gramsForServing(row, food);
    if (!scale) {
      /* The failure that matters. Without a gram weight the per-100g
         figure cannot honestly become a per-serving one, and inventing
         the serving is precisely what made the other table worthless. */
      skipped.push({ id: row.id, why: 'no gram weight for its serving' });
      console.log(`  !!  ${row.food_name.padEnd(28)} no gram weight — gap stays open`);
      continue;
    }

    const filled = {};
    want.forEach(n => {
      const per100 = food.nutrients[FIELD[n].usda];
      if (typeof per100 !== 'number') return;
      if (per100 > CEILING_PER_100G[n]) {
        skipped.push({ id: row.id, why: `${FIELD[n].name} ${per100}/100g above plausibility ceiling` });
        return;
      }
      const v = Math.round(per100 * (scale.grams / 100));
      filled[FIELD[n].low] = v;
      filled[FIELD[n].high] = v;
    });

    if (!Object.keys(filled).length) {
      skipped.push({ id: row.id, why: 'match had none of the missing nutrients' });
      console.log(`  --  ${row.food_name.padEnd(28)} match lacked the missing values`);
      continue;
    }

    patch.push({
      id: row.id,
      food_name: row.food_name,
      fill: filled,
      serving_grams: scale.grams,
      scaled_from: scale.from,
      fdcId: food.fdcId,
      matched: food.description,
      /* Written verbatim from what the route returned, and still marked
         for checking: nobody has yet eyeballed that "Egg, whole, raw"
         is the right FDC record for this row's "1 large" serving. */
      source: `${res.citation} (fdcId ${food.fdcId})`,
      verify: Object.keys(filled).filter(k => k.endsWith('_low')).map(k => k.slice(0, -4))
    });

    const got = Object.keys(filled).filter(k => k.endsWith('_low'))
      .map(k => `${k.slice(0, -4)}=${filled[k]}`).join(' ');
    console.log(`  ok  ${row.food_name.padEnd(28)} ${got}  (${scale.grams}g, ${scale.from})`);
  }

  console.log(`\n  filled ${patch.length} · skipped ${skipped.length}`);

  if (WRITE && patch.length) {
    const out = path.join(ROOT, 'tools/usda-patch.json');
    fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), patch, skipped }, null, 2));
    console.log(`\n  wrote tools/usda-patch.json — REVIEW IT before applying.`);
    console.log('  Nothing has touched js/data/anchor-foods.js.');
  } else if (patch.length) {
    console.log('\n  Dry run. Add --write to save the patch for review.');
  }

  console.log('\n  Every value above came from FoodData Central and was scaled by a real');
  console.log('  gram weight. Rows marked !! kept their gap on purpose — a per-100g');
  console.log('  figure with no serving weight cannot honestly become a per-serving one.\n');
})();
