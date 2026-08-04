/* ═══════════════════════════════════════════════════════════════
   RINGS — three side-by-side remaining-budget arcs.
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

   WHY SIDE BY SIDE, NOT CONCENTRIC. Concentric was the first design and
   it lost on three counts: the innermost arc (sodium) is illegible at
   phone width; sodium is also the least trustworthy number in the app,
   so it should not occupy the most cramped slot; and three separate
   rings put real visual distance between this and Apple's Activity
   rings, which may not be replicated for non-Activity data.

   READING THE RING WITHOUT A VOICEOVER. A first-time viewer gets one
   silent pass. So every ring states its own meaning in text: the label
   says "left today", and the remaining range — not the consumed
   figure — is the largest type in the column. Nobody should have to
   infer that the empty part of the arc is the point.
   ═══════════════════════════════════════════════════════════════ */

const Rings = (() => {

  /* One ring's own coordinate space. Every ring is identical, so they
     read as three instances of one thing rather than a hierarchy. */
  const BOX = 100;
  const C = BOX / 2;
  const R = 41;
  const STROKE = 9;
  const GAP_DEG = 26;          // the visible break at 12 o'clock

  const ORDER = ['k', 'p', 'na'];
  const NUTRIENT_NAME = { k: 'Potassium', p: 'Phosphorus', na: 'Sodium' };

  const CIRC = 2 * Math.PI * R;
  const ARC = CIRC * (1 - GAP_DEG / 360);
  const ROT = `rotate(${-90 + GAP_DEG / 2} ${C} ${C})`;

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── Compact remaining figure for the ring column ──
     Still a RANGE — never collapsed to a single number, because a point
     value here would undo the honesty the whole app is built on. The
     full sentence ("About 600–1,100 mg left") stays in the stat block
     below; this is its short form for a ~110px column. */
  function compactLeft(low, high, target) {
    const f = Clinical.fmt;
    if (high <= target) return `${f(target - high)}–${f(target - low)}`;
    if (low <= target)  return `0–${f(target - low)}`;
    return `−${f(low - target)}–${f(high - target)}`;
  }
  function compactUnit(low, high, target) {
    return (low > target) ? 'mg over' : 'mg left';
  }

  function ringSvg(row) {
    const fill = row.suppressed ? 0 : row.fill;
    const offset = ARC * (1 - fill);
    const statusClass = row.status ? 'ring-fill--' + row.status.key : 'ring-fill--ok';

    const track = `<circle cx="${C}" cy="${C}" r="${R}" fill="none"
      class="ring-track" stroke-width="${STROKE}" stroke-linecap="round"
      stroke-dasharray="${ARC} ${CIRC}" transform="${ROT}"/>`;

    /* A suppressed ring draws its track only. There is no limit being
       tracked, so there is nothing honest to fill. */
    const value = row.suppressed ? '' :
      `<circle cx="${C}" cy="${C}" r="${R}" fill="none"
        class="ring-fill ${statusClass}" stroke-width="${STROKE}"
        stroke-dasharray="${ARC} ${CIRC}"
        stroke-dashoffset="${offset}" transform="${ROT}"/>`;

    return `<svg class="ring__svg" viewBox="0 0 ${BOX} ${BOX}" role="img"
      aria-label="${esc(row.aria)}">${track}${value}</svg>`;
  }

  /* ── Build the per-nutrient view model ── */
  function model() {
    const t = Store.targets();
    const totals = Store.dayTotals();
    const map = { k: totals.k, p: totals.p, na: totals.na };

    return ORDER.map(key => {
      const target = t[key];
      const sums = map[key];
      const suppressed = Clinical.ringSuppressed(key);   // audit F5: low-K mode
      const live = target && !suppressed;
      const status = live ? Clinical.ringStatus(sums.high, target) : null;

      return {
        key,
        name: NUTRIENT_NAME[key],
        low: sums.low,
        high: sums.high,
        target,
        suppressed,
        status,
        fill: live ? Clinical.ringFill(sums.low, sums.high, target) : 0,
        readout: Clinical.readoutText(sums.low, sums.high, target),
        remaining: live ? Clinical.remainingText(sums.low, sums.high, target) : null,
        compact: live ? compactLeft(sums.low, sums.high, target) : null,
        unit: live ? compactUnit(sums.low, sums.high, target) : null,
        aria: buildAria(NUTRIENT_NAME[key], sums, target, status, suppressed)
      };
    });
  }

  function buildAria(name, sums, target, status, suppressed) {
    if (suppressed) return `${name}: not tracked against a limit right now`;
    if (!target) return `${name}: about ${Math.round(sums.low)} to ${Math.round(sums.high)} milligrams today, no target set`;
    return `${name}: ${Math.round(sums.low)} to ${Math.round(sums.high)} of ${target} milligrams used, ${status ? status.label.toLowerCase() : ''}`;
  }

  /* ── One ring column ── */
  function ringCell(r) {
    /* Suppressed (low-potassium mode): no fill, no colour, no
       over-budget line. The ring is the loudest restriction signal in
       the app, and in hypokalaemia it must stop signalling restriction. */
    if (r.suppressed) {
      return `<div class="ring">
        ${ringSvg(r)}
        <div class="ring__name">${r.name}</div>
        <div class="ring__sub">not tracked</div>
        <div class="ring__left ring__left--muted">${Clinical.fmt(r.low)}–${Clinical.fmt(r.high)}</div>
        <div class="ring__unit">mg today</div>
      </div>`;
    }

    const s = r.status;
    return `<div class="ring">
      ${ringSvg(r)}
      <div class="ring__name">${r.name}</div>
      <div class="ring__sub">left today</div>
      <div class="ring__left">${r.compact}</div>
      <div class="ring__unit">${r.unit}</div>
      <div class="ring__status is-${s.key}">
        <span aria-hidden="true">${s.icon}</span> ${s.label}
      </div>
    </div>`;
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
      ? `<p class="note mt-2">
           ${totals.uncountedMeals} meal${totals.uncountedMeals === 1 ? '' : 's'} not counted today
         </p>` : '';

    const provenance = profile.budget_source === 'education_default'
      ? `<div class="provenance">
           <span>${COPY.provenanceChip}</span>
           <button type="button" class="linkbtn" data-nav="settings">Change</button>
         </div>` : '';

    return `<div class="card">
      <div class="rings">${rows.map(ringCell).join('')}</div>
      ${uncounted}
      ${provenance}
    </div>`;
  }

  /* ── The three detail blocks beneath the rings ──
     The ring column answers "how much is left?". This answers
     "left out of what?" — the consumed range against the target. */
  function renderStats() {
    if (!Store.hasTargets()) return '';
    const rows = model();
    const totals = Store.dayTotals();

    return `<div class="card">` + rows.map(r => {

      /* Audit F5: in low-potassium mode the whole block becomes a plain
         intake readout with no colour and no over-budget line. */
      if (r.suppressed) {
        return `<div class="statblock">
          <div></div>
          <div>
            <div class="statblock__name">${r.name}</div>
            <div class="statblock__left">≈ ${Clinical.fmt(r.low)}–${Clinical.fmt(r.high)} mg today</div>
            <p class="note mt-xs">${COPY.lowModeRing}</p>
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

  /* ═══════════ counting up ═══════════
     Numbers arrive rather than appear. This is the one piece of pure
     delight in the app, and it is allowed because it costs nothing and
     lies about nothing: it counts to the real figure and stops.

     It animates BOTH ends of the range in step, so the range never
     briefly reads as a wrong pair on its way up — a half-animated
     "463–120" would be a number this app never computed, on screen, in
     a health tool. Ends together, or not at all.

     600ms, ease-out, and skipped entirely under reduced motion, where
     the final value is simply written. */
  function countUp(root) {
    if (!root || typeof window === 'undefined' || !window.requestAnimationFrame) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    root.querySelectorAll('.ring__left').forEach(el => {
      const finalText = el.textContent;
      // Only animate a plain low–high pair; anything else is left alone
      // rather than guessed at.
      const m = finalText.match(/^(−?)([\d,]+)–([\d,]+)$/);
      if (!m) return;
      const sign = m[1];
      const lo = Number(m[2].replace(/,/g, ''));
      const hi = Number(m[3].replace(/,/g, ''));
      if (!isFinite(lo) || !isFinite(hi)) return;

      const start = performance.now();
      const DUR = 600;
      const step = (now) => {
        const t = Math.min(1, (now - start) / DUR);
        const e = 1 - Math.pow(1 - t, 3);            // ease-out cubic
        el.textContent = sign + Clinical.fmt(Math.round(lo * e)) +
                         '–' + Clinical.fmt(Math.round(hi * e));
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = finalText;             // land on the exact string
      };
      requestAnimationFrame(step);
    });
  }

  return { render, renderStats, model, countUp };
})();
