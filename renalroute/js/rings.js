/* ═══════════════════════════════════════════════════════════════
   RINGS — three concentric remaining-budget arcs.
   ───────────────────────────────────────────────────────────────
   The product thesis made visual: the UNFILLED arc is what is LEFT.
   That is why the track renders in a visible tone rather than as
   invisible background — "what can dinner be?" is the question this
   component answers.

   Fill length  = MIDPOINT of the day's range ÷ target   (the estimate)
   Fill colour  = HIGH end of the range ÷ target          (the risk)

   Those two deliberately disagree. A ring can sit half-filled and glow
   amber because its high end crossed 70%. That divergence is the
   honest-uncertainty design working, not a bug.

   Deliberately NOT Apple Activity rings: arcs never wrap past 360° or
   overlap, there is no glow or gradient, the palette is warm rather than
   red/green/cyan, and there is a visible gap at 12 o'clock where each
   ring's label anchors. Apple prohibits replicating Activity rings for
   non-Activity data.
   ═══════════════════════════════════════════════════════════════ */

const Rings = (() => {

  const SIZE = 240;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const STROKE = 15;
  const GAP_DEG = 26;          // the visible break at 12 o'clock

  // Outermost = potassium (largest budget), then phosphorus, then sodium.
  const GEOM = [
    { key: 'k',  r: 98, label: 'K'  },
    { key: 'p',  r: 76, label: 'P'  },
    { key: 'na', r: 54, label: 'Na' }
  ];

  const NUTRIENT_NAME = { k: 'Potassium', p: 'Phosphorus', na: 'Sodium' };

  function arcLength(r) {
    const full = 2 * Math.PI * r;
    return full * (1 - GAP_DEG / 360);
  }

  /* Rotate so the gap sits at the top and the arc sweeps clockwise. */
  const rotation = (r) => `rotate(${-90 + GAP_DEG / 2} ${CX} ${CY})`;

  function ringSvg(rows) {
    const parts = rows.map(row => {
      const g = GEOM.find(x => x.key === row.key);
      const len = arcLength(g.r);
      const fill = row.suppressed ? 0 : row.fill;
      const offset = len * (1 - fill);
      const statusClass = row.status ? 'ring-fill--' + row.status.key : 'ring-fill--ok';

      const track = `<circle cx="${CX}" cy="${CY}" r="${g.r}" fill="none"
        class="ring-track" stroke-width="${STROKE}" stroke-linecap="round"
        stroke-dasharray="${len} ${2 * Math.PI * g.r}" transform="${rotation(g.r)}"/>`;

      const value = row.suppressed ? '' :
        `<circle cx="${CX}" cy="${CY}" r="${g.r}" fill="none"
          class="ring-fill ${statusClass}" stroke-width="${STROKE}"
          stroke-dasharray="${len} ${2 * Math.PI * g.r}"
          stroke-dashoffset="${offset}" transform="${rotation(g.r)}"/>`;

      const labelY = CY - g.r + 3.5;
      const label = `<text x="${CX}" y="${labelY}" text-anchor="middle"
        class="ring-anchor">${g.label}</text>`;

      return track + value + label;
    }).join('');

    return `<svg class="rings__svg" viewBox="0 0 ${SIZE} ${SIZE}" role="img"
      aria-label="${escapeAttr(rows.map(r => r.aria).join('. '))}">${parts}</svg>`;
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  /* ── Build the per-nutrient view model ── */
  function model() {
    const t = Store.targets();
    const totals = Store.dayTotals();
    const map = { k: totals.k, p: totals.p, na: totals.na };

    return ['k', 'p', 'na'].map(key => {
      const target = t[key];
      const sums = map[key];
      const suppressed = Clinical.ringSuppressed(key);   // audit F5: low-K mode
      const status = (target && !suppressed) ? Clinical.ringStatus(sums.high, target) : null;

      return {
        key,
        name: NUTRIENT_NAME[key],
        low: sums.low,
        high: sums.high,
        target,
        suppressed,
        status,
        fill: (target && !suppressed) ? Clinical.ringFill(sums.low, sums.high, target) : 0,
        readout: Clinical.readoutText(sums.low, sums.high, target),
        remaining: (target && !suppressed) ? Clinical.remainingText(sums.low, sums.high, target) : null,
        aria: buildAria(NUTRIENT_NAME[key], sums, target, status, suppressed)
      };
    });
  }

  function buildAria(name, sums, target, status, suppressed) {
    if (suppressed) return `${name}: not tracked against a limit right now`;
    if (!target) return `${name}: about ${Math.round(sums.low)} to ${Math.round(sums.high)} milligrams today, no target set`;
    return `${name}: ${Math.round(sums.low)} to ${Math.round(sums.high)} of ${target} milligrams used, ${status ? status.label.toLowerCase() : ''}`;
  }

  /* ── Full hero card markup ── */
  function render() {
    const rows = model();
    const profile = Store.profile();
    const totals = Store.dayTotals();
    const noTargets = !Store.hasTargets();

    /* No-target state: rings are replaced entirely by plain intake
       readouts. There is nothing to be "over", so nothing is coloured. */
    if (noTargets) {
      const readouts = rows.map(r => `
        <div class="statblock">
          <div></div>
          <div>
            <div class="statblock__name">${r.name} today</div>
            <div class="statblock__left">≈ ${Clinical.fmt(r.low)}–${Clinical.fmt(r.high)} mg</div>
          </div>
        </div>`).join('');
      return `<div class="card">
        <h2 class="h2">${COPY.captionNone}</h2>
        ${readouts}
        <button type="button" class="btn btn--secondary btn--block" data-nav="settings">Set targets</button>
      </div>`;
    }

    const uncounted = totals.uncountedMeals > 0
      ? `<p class="note" style="margin-top:var(--space-2)">
           ${totals.uncountedMeals} meal${totals.uncountedMeals === 1 ? '' : 's'} not counted today
         </p>` : '';

    const provenance = profile.budget_source === 'education_default'
      ? `<div class="provenance">
           <span>${COPY.provenanceChip}</span>
           <button type="button" class="linkbtn" data-nav="settings">Change</button>
         </div>` : '';

    return `<div class="card">
      <div class="rings">${ringSvg(rows)}</div>
      ${uncounted}
      ${provenance}
    </div>`;
  }

  /* ── The three status blocks beneath the rings ── */
  function renderStats() {
    if (!Store.hasTargets()) return '';
    const rows = model();
    const totals = Store.dayTotals();

    return `<div class="card">` + rows.map(r => {

      /* Audit F5: in low-potassium mode the ring is the loudest
         restriction signal in the app, so the whole block becomes a
         plain intake readout with no colour and no over-budget line. */
      if (r.suppressed) {
        return `<div class="statblock">
          <div></div>
          <div>
            <div class="statblock__name">${r.name}</div>
            <div class="statblock__left">≈ ${Clinical.fmt(r.low)}–${Clinical.fmt(r.high)} mg today</div>
            <p class="note" style="margin-top:6px">${COPY.lowModeRing}</p>
          </div>
        </div>`;
      }

      const s = r.status;
      const partial = (r.key === 'na' && totals.sodiumIncomplete)
        ? `<span class="chip chip--muted" title="${COPY.sodiumPartial}">Partial data</span>` : '';

      return `<div class="statblock">
        <div class="statblock__dot bg-${s.key}"></div>
        <div>
          <div class="statblock__name">${r.name}</div>
          <div class="statblock__status is-${s.key}">
            <span aria-hidden="true">${s.icon}</span> ${s.label}
          </div>
          <div class="statblock__left">${r.remaining}</div>
          <div class="statblock__read">${r.readout}</div>
          ${partial ? `<div class="chiprow">${partial}</div>` : ''}
        </div>
      </div>`;
    }).join('') + `</div>`;
  }

  return { render, renderStats, model };
})();
