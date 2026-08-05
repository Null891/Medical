/* ═══════════════════════════════════════════════════════════════
   DATA-GAPS — what the food table cannot price, worst first.
   ───────────────────────────────────────────────────────────────
   The table has holes: 13 of 55 rows carry no potassium figure, 36 no
   phosphorus, 35 no sodium. The app is now honest about that — a total
   built on an unpriced food says so and withholds the green verdict
   rather than reporting headroom it cannot support.

   Being honest about a gap is not the same as closing it. This is the
   list for closing it.

   WHY THIS SCRIPT WRITES NO NUMBERS. Filling these in is a sourcing
   job, not a coding job. Every figure in this app traces to a published
   source and carries a `verify` list naming what still needs checking,
   and the product's entire argument to a renal dietitian is that it
   does not supply values of its own. A number invented here — however
   plausible — would be the app doing precisely the thing it tells
   judges it refuses to do, and one spot-check finding it off would cost
   more than all 41 gaps combined.

   So this orders the work instead. A row nobody eats and a row in every
   seeded breakfast are not equally worth an hour with FoodData Central
   open, and the difference between them is measurable: how often the id
   actually appears in the seeded weeks, the recipes, and the swap
   pools. Egg turns up seven times. Some rows turn up never.

   Run:  node tools/data-gaps.js
         node tools/data-gaps.js --csv     (paste into a sheet)

   tools/ is in .vercelignore, so this ships nowhere.
   ═══════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* Loaded in a VM context, the same way test/verify.js does it.
   Rewriting `const` to `global.` looks simpler and is not: the file
   references ANCHOR_FOODS from inside ANCHOR_STATS, and a half-rewritten
   declaration puts that reference in the temporal dead zone. A top-level
   const also never becomes a property of globalThis — the bug that once
   left every translation table in this app silently unreachable. */
const vm = require('vm');
const sandbox = { console, module: {}, window: {} };
vm.createContext(sandbox);
vm.runInContext(read('js/data/anchor-foods.js'), sandbox, { filename: 'anchor-foods.js' });
const { ANCHOR_FOODS } = vm.runInContext('({ ANCHOR_FOODS })', sandbox);

/* Every place an id is USED, so the ordering reflects what a reader
   actually meets rather than what happens to be near the top of the
   table. Counted across the seeded weeks (both personas), the recipes,
   and the quick-add list. */
function usageCounts() {
  const hay = ['js/seed.js', 'js/data/recipes.js', 'js/ui.js']
    .map(f => { try { return read(f); } catch (e) { return ''; } }).join('\n');
  const counts = {};
  ANCHOR_FOODS.forEach(r => {
    // Word-bounded, quoted: 'egg' must not match 'eggplant' or a comment.
    const re = new RegExp("['\"]" + r.id + "['\"]", 'g');
    counts[r.id] = (hay.match(re) || []).length;
  });
  return counts;
}

const NUTRIENT = { k: 'potassium', p: 'phosphorus', na: 'sodium' };

function gaps() {
  const uses = usageCounts();
  const rows = [];
  ANCHOR_FOODS.forEach(r => {
    const missing = ['k', 'p', 'na'].filter(n => r[n + '_low'] == null);
    if (!missing.length) return;
    rows.push({
      id: r.id,
      name: r.food_name,
      serving: r.serving_text,
      grams: r.serving_grams,
      missing,
      uses: uses[r.id] || 0,
      source: r.source || '',
      verify: (r.verify || []).join(' ')
    });
  });
  /* Most-used first; ties broken by how many values are missing, so a
     row needing all three outranks a row needing one. */
  return rows.sort((a, b) => (b.uses - a.uses) || (b.missing.length - a.missing.length));
}

function main() {
  const rows = gaps();
  const values = rows.reduce((n, r) => n + r.missing.length, 0);
  const csv = process.argv.includes('--csv');

  if (csv) {
    console.log('id,food,serving,grams,missing,uses,source,verify');
    rows.forEach(r => console.log([r.id, `"${r.name}"`, `"${r.serving}"`, r.grams == null ? '' : r.grams,
      `"${r.missing.map(m => NUTRIENT[m]).join(' ')}"`, r.uses, `"${r.source}"`, `"${r.verify}"`].join(',')));
    return;
  }

  console.log('\n═══ WHAT THE TABLE CANNOT PRICE ═══\n');
  console.log(`  ${rows.length} of ${ANCHOR_FOODS.length} rows have a gap · ${values} values to source\n`);
  console.log('  ' + 'FOOD'.padEnd(26) + 'SERVING'.padEnd(16) + 'MISSING'.padEnd(30) + 'USED');
  console.log('  ' + '─'.repeat(78));

  rows.forEach(r => {
    const flag = r.uses >= 4 ? ' ←' : '';
    console.log('  ' + r.name.slice(0, 25).padEnd(26) +
      String(r.serving).slice(0, 15).padEnd(16) +
      r.missing.map(m => NUTRIENT[m]).join(', ').padEnd(30) +
      String(r.uses).padStart(3) + flag);
  });

  const hot = rows.filter(r => r.uses >= 4);
  console.log('\n  ' + '─'.repeat(78));
  console.log(`  The ${hot.length} marked ← appear four or more times in the seeded weeks and`);
  console.log('  recipes. They are what a reader actually meets, so they are worth');
  console.log(`  sourcing first: ${hot.reduce((n, r) => n + r.missing.length, 0)} values, not ${values}.`);
  console.log('\n  Fill from USDA FoodData Central. Keep the serving size the row already');
  console.log('  states, put the citation in `source`, and remove the nutrient from that');
  console.log("  row's `verify` list only once it has actually been checked.");
  console.log('\n  Nothing in this script writes a value. That is deliberate — see the header.\n');
}

module.exports = { gaps, usageCounts };
if (require.main === module) main();
