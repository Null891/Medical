/* ═══════════════════════════════════════════════════════════════
   HEALTH ORBIT — the centrepiece.
   ───────────────────────────────────────────────────────────────
   The app needed one image somebody remembers after the demo ends, and
   three arcs in a row were never going to be it. This is that image:
   the day as a small system, with the three nutrients in orbit around
   it.

   THE ONE RULE THAT MAKES THIS HONEST. It shows the SAME numbers as
   the rings, read the same way, and it invents nothing:

     orbital radius  = how much room is LEFT (range midpoint)
                       far out = plenty of room, close in = nearly none
     body colour     = the HIGH end against the target, exactly as the
                       rings colour themselves
     body size       = fixed. Size is the obvious place a viewer would
                       read a magnitude that is not there, so nothing
                       encodes anything in it.

   It is a second READING of the day, not a second calculation. If the
   orbit and the rings ever disagreed, the orbit would be wrong.

   WHY RADIUS FOR REMAINING. The whole product thesis is that what
   matters is what is left, not what was consumed. On a ring that is
   the unfilled arc, which has to be taught. In an orbit it is
   distance, and "close to the middle means nearly out of room" is
   something people read without being told once.

   WHAT IT IS NOT. It is not a kidney, and not a picture of a body.
   Drawing an organ that fills up or changes colour with a food diary
   would claim a physiological relationship this app has spent its
   entire design refusing to claim — dietary intake correlates weakly
   with serum values, and an animated kidney reacting to lunch is a
   lie with a very good frame rate.
   ═══════════════════════════════════════════════════════════════ */

const Orbit = (() => {

  const BOX = 260;
  const C = BOX / 2;
  const R_INNER = 34;          // the core: the day itself
  const R_MIN = 52;            // no room left — a body sits here
  const R_MAX = 112;           // full budget remaining
  const BODY = 9;              // fixed, always

  const ORDER = ['k', 'p', 'na'];
  const NAME = { k: 'Potassium', p: 'Phosphorus', na: 'Sodium' };
  const SHORT = { k: 'K', p: 'P', na: 'Na' };
  // Starting angles, spread so the three never stack at a glance.
  const PHASE = { k: -90, p: 30, na: 150 };
  // Different periods so the arrangement is never twice the same, and
  // slow enough that nothing on this screen ever demands attention.
  const PERIOD = { k: 54, p: 68, na: 82 };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Remaining fraction, clamped. Uses the midpoint, matching the ring
     fill exactly — the orbit must never be readable as a different
     answer to the same question. */
  function remainingFraction(sums, target) {
    if (!target) return 1;
    const mid = (sums.low + sums.high) / 2;
    return Math.max(0, Math.min(1, 1 - (mid / target)));
  }

  function model() {
    const t = Store.targets();
    const totals = Store.dayTotals();
    const map = { k: totals.k, p: totals.p, na: totals.na };

    return ORDER.map(key => {
      const target = t[key];
      const sums = map[key];
      const suppressed = Clinical.ringSuppressed(key);
      const live = !!target && !suppressed;
      const frac = live ? remainingFraction(sums, target) : 1;
      const unpriced = (totals.unpriced && totals.unpriced[key]) || 0;
      const status = live ? Clinical.ringStatus(sums.high, target, unpriced) : null;

      return {
        key,
        name: NAME[key],
        short: SHORT[key],
        live,
        suppressed,
        radius: R_MIN + (R_MAX - R_MIN) * frac,
        frac,
        status,
        remaining: live ? Clinical.remainingText(sums.low, sums.high, target) : null
      };
    });
  }

  function bodySvg(r) {
    const cls = r.live && r.status ? 'orbit-body--' + r.status.key : 'orbit-body--none';
    /* Each body rides a rotating group, so the animation is one
       transform on a parent rather than per-frame maths. The track
       beneath it is drawn, because "how far out could this be" is part
       of reading the picture.

       Period and phase come from per-nutrient CLASSES, not an inline
       style attribute: the page's CSP sets style-src 'self', which
       blocks style="" in generated markup. It would have worked on a
       local file and silently frozen every orbit on the deployed site
       — the same trap the rail's width bars fell into. There are
       exactly three nutrients, so three classes cost nothing. */
    return `
      <circle cx="${C}" cy="${C}" r="${r.radius.toFixed(1)}"
        class="orbit-track" fill="none"/>
      <g class="orbit-arm orbit-arm--${r.key}">
        <g class="orbit-spin">
          <circle cx="${C}" cy="${(C - r.radius).toFixed(1)}" r="${BODY}"
            class="orbit-body ${cls}"/>
          <text x="${C}" y="${(C - r.radius + 4).toFixed(1)}"
            class="orbit-label" text-anchor="middle">${esc(r.short)}</text>
        </g>
      </g>`;
  }

  /* The text alternative carries the whole picture in words, because
     this is the screen's headline image and a headline image that only
     works visually is a headline nobody who uses a screen reader gets. */
  function aria(rows) {
    const parts = rows.map(r => {
      if (r.suppressed) return `${r.name} is not being tracked against a limit`;
      if (!r.live) return `${r.name} has no target set`;
      return `${r.name}, ${r.remaining}`;
    });
    return 'Your day, as an orbit. Each nutrient sits further out the more room ' +
           'you have left. ' + parts.join('. ') + '.';
  }

  function render() {
    if (!Store.hasTargets()) return '';
    const rows = model();
    const anyLive = rows.some(r => r.live);
    if (!anyLive) return '';

    const totals = Store.dayTotals();
    const core = totals.mealCount
      ? `${totals.mealCount} meal${totals.mealCount === 1 ? '' : 's'}`
      : 'Nothing yet';

    return `<div class="card m-stone orbit-card">
      <svg class="orbit" viewBox="0 0 ${BOX} ${BOX}" role="img"
           aria-label="${esc(aria(rows))}">
        <circle cx="${C}" cy="${C}" r="${R_INNER}" class="orbit-core"/>
        <text x="${C}" y="${C - 2}" class="orbit-core-label" text-anchor="middle">Today</text>
        <text x="${C}" y="${C + 14}" class="orbit-core-sub" text-anchor="middle">${esc(core)}</text>
        ${rows.map(bodySvg).join('')}
      </svg>
      <p class="note orbit-legend">Further out means more room left today.
      Colour is the cautious end of each range — the same reading as the rings.</p>
    </div>`;
  }

  return { render, model, remainingFraction, R_MIN, R_MAX, BOX };
})();
