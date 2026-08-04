/* ═══════════════════════════════════════════════════════════════
   TRENDS — the last seven days, as bands.

   WHY BANDS AND NOT A LINE. A trend line asserts that consecutive
   points are comparable and that the slope between them means
   something. Neither holds here. Every daily figure is a low–high range
   that can span several hundred milligrams, and the width of that range
   varies day to day with how much of the meal matched the reference
   table. Drawing a line through the midpoints would render an artefact
   of data quality as if it were a change in what somebody ate — which
   is the same false-precision failure the rings were designed to avoid,
   just stretched across a week.

   So each day is drawn as the band it actually is. Where the bands sit
   relative to the target line is the signal, and a reader can see at a
   glance both the level and how certain it was.

   This exists because "get ready for a clinic appointment" is a real
   thing people use these apps for, and a week of honest bands is
   something a patient can hand to a dietitian without either of them
   having to discount it.
   ═══════════════════════════════════════════════════════════════ */

const Trends = (() => {

  const DAYS = 7;
  const W = 320;              // viewBox units; the SVG scales to fit
  const H = 96;
  const PAD_L = 4, PAD_R = 4, PAD_T = 8, PAD_B = 18;
  const BAND_W = 18;

  const NUTRIENTS = [
    { key: 'k',  name: 'Potassium'  },
    { key: 'p',  name: 'Phosphorus' },
    { key: 'na', name: 'Sodium'     }
  ];

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Oldest first, today last — the direction people read. */
  function series(key) {
    const out = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const iso = Store.daysAgoISO(i);
      const t = Store.dayTotals(iso);
      out.push({
        iso,
        low: t[key].low,
        high: t[key].high,
        logged: t.mealCount > 0,
        isToday: i === 0
      });
    }
    return out;
  }

  function dayInitial(iso) {
    return new Date(iso + 'T00:00:00')
      .toLocaleDateString('en-US', { weekday: 'narrow' });
  }

  function chart(key, target) {
    const rows = series(key);
    const anyLogged = rows.some(r => r.logged);
    if (!anyLogged) return null;

    // Scale headroom so a day that goes over the target is still visibly
    // over rather than clipped flat against the top edge.
    const maxHigh = Math.max(...rows.map(r => r.high), target || 0);
    const ceiling = Math.max(maxHigh * 1.1, (target || maxHigh) * 1.2, 1);

    const plotH = H - PAD_T - PAD_B;
    const step = (W - PAD_L - PAD_R) / DAYS;
    const y = (v) => PAD_T + plotH - (v / ceiling) * plotH;

    const bands = rows.map((r, i) => {
      const cx = PAD_L + step * i + step / 2;
      const x = cx - BAND_W / 2;

      if (!r.logged) {
        // An unlogged day is a gap in the record, not a zero. Saying
        // "you ate nothing" would be a claim we cannot support.
        return `<line x1="${cx}" y1="${y(0)}" x2="${cx}" y2="${y(0) - 3}"
                  class="trend-empty" stroke-width="2" stroke-linecap="round"/>`;
      }

      const top = y(r.high);
      const bottom = y(r.low);
      const h = Math.max(bottom - top, 3);      // a flat day still reads
      const status = target ? Clinical.ringStatus(r.high, target) : null;
      const cls = status ? 'trend-band--' + status.key : 'trend-band--none';

      /* The narrative this band tells when somebody points at it or
         tabs to it. A chart that only yields its meaning to a mouse
         yields it to half the audience, so the bands are focusable and
         this string is what both routes surface.

         It says the SAME thing the chart's text alternative already
         says — the range, the day, and how it sat against the target.
         A hover that reveals a fact the chart does not otherwise carry
         would be a fact hidden from everybody who cannot hover. */
      const day = new Date(r.iso + 'T00:00:00')
        .toLocaleDateString('en-US', { weekday: 'long' });
      const width = Math.round(r.high - r.low);
      const certainty = width > (target ? target * 0.25 : 400)
        ? ' The range is wide, so much of that day was estimated rather than matched.'
        : '';
      const against = target
        ? (r.high > target
            ? ` Above the ${Clinical.fmt(target)} mg target on the high end.`
            : ` Inside the ${Clinical.fmt(target)} mg target.`)
        : '';
      const read = `${r.isToday ? 'Today' : day}: ${Clinical.fmt(r.low)}–${Clinical.fmt(r.high)} mg.` +
        against + certainty;

      return `<rect x="${x}" y="${top}" width="${BAND_W}" height="${h}"
                rx="3" class="trend-band ${cls}" data-read="${esc(read)}"/>`;
    }).join('');

    const targetLine = target ? `
      <line x1="${PAD_L}" y1="${y(target)}" x2="${W - PAD_R}" y2="${y(target)}"
            class="trend-target" stroke-width="1.5" stroke-dasharray="4 4"/>` : '';

    const labels = rows.map((r, i) => {
      const cx = PAD_L + step * i + step / 2;
      return `<text x="${cx}" y="${H - 5}" text-anchor="middle"
                class="trend-day ${r.isToday ? 'is-today' : ''}">${esc(dayInitial(r.iso))}</text>`;
    }).join('');

    const loggedDays = rows.filter(r => r.logged).length;
    const aria = `${NUTRIENTS.find(n => n.key === key).name} over the last ${DAYS} days. ` +
      rows.filter(r => r.logged).map(r =>
        `${new Date(r.iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}: ` +
        `${Math.round(r.low)} to ${Math.round(r.high)} milligrams`).join('. ') +
      (target ? `. Target ${target} milligrams.` : '') +
      ` ${loggedDays} of ${DAYS} days logged.`;

    return `<svg class="trend__svg" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="${esc(aria)}">${targetLine}${bands}${labels}</svg>`;
  }

  function render() {
    const t = Store.targets();
    const blocks = NUTRIENTS.map(n => {
      const svg = chart(n.key, t[n.key]);
      if (!svg) return null;
      const logged = series(n.key).filter(r => r.logged).length;
      const idle = `${logged} of ${DAYS} days logged.`;
      return `<div class="trend">
        <div class="trend__head">
          <span class="trend__name">${n.name}</span>
          ${t[n.key] ? `<span class="note">target ${Clinical.fmt(t[n.key])} mg</span>` : ''}
        </div>
        ${svg}
        <p class="trend__read" data-idle="${esc(idle)}" aria-hidden="true">${esc(idle)}</p>
      </div>`;
    }).filter(Boolean);

    if (!blocks.length) return '';

    return `<div class="card m-liquid">
      <h2 class="h3">Your last 7 days</h2>
      <p class="note">Each bar is that day's range, not a single number — taller means less certain. The dashed line is your target.</p>
      ${blocks.join('')}
      <p class="note mt-2">Useful to show your care team. Days with nothing logged are left blank rather than counted as zero.</p>
    </div>`;
  }

  return { render, series };
})();
