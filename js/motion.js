/* ═══════════════════════════════════════════════════════════════
   MOTION — the app's signature behaviours.
   ───────────────────────────────────────────────────────────────
   Every function here is decoration in the strict sense: if this
   whole file failed to load, the app would lose nothing a user needs
   and nothing a screen reader announces. That constraint is what
   makes it safe to be ambitious in it.

   Three rules hold throughout:

     1. Transform and opacity only. No animated width, height, top or
        filter — those repaint, and this app runs on the phones of
        people who did not choose their phone for its GPU.

     2. Reduced motion is checked LIVE, not once at load. Somebody who
        turns the setting on mid-session gets the change immediately.

     3. Nothing here ever changes a number, a colour with meaning, or
        the order of anything. Motion shows relationships that are
        already true. The moment it starts asserting something the
        data does not, it stops being decoration and starts being a
        claim — and this app's numbers are ±40% estimates that have no
        business being dramatised.
   ═══════════════════════════════════════════════════════════════ */

const Motion = (() => {

  const reduced = () =>
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canAnimate = () =>
    typeof document !== 'undefined' &&
    typeof window !== 'undefined' &&
    !!window.requestAnimationFrame &&
    !reduced();

  /* ═══════════ MEAL RIPPLE ═══════════
     The signature transition. A wave leaves the control that saved
     the meal and crosses the page; when it reaches the rings, they
     acknowledge it with one pulse.

     This is the only moment in the app with a real causal story —
     what you entered is WHY those numbers moved — and the ripple is
     that sentence told in motion rather than left to be inferred. */
  function ripple(originEl) {
    if (!canAnimate()) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.5;
    if (originEl && originEl.getBoundingClientRect) {
      const r = originEl.getBoundingClientRect();
      if (r.width || r.height) { x = r.left + r.width / 2; y = r.top + r.height / 2; }
    }

    const el = document.createElement('div');
    el.className = 'ripple';
    el.setAttribute('aria-hidden', 'true');
    // CSSOM, not a style attribute: the page's CSP forbids inline
    // style attributes in markup, but permits property sets through
    // the object model. Positioning cannot be a utility class here
    // because the origin is wherever the user's finger was.
    el.style.setProperty('left', x + 'px');
    el.style.setProperty('top', y + 'px');
    document.body.appendChild(el);

    const done = () => { if (el.parentNode) el.parentNode.removeChild(el); };
    el.addEventListener('animationend', done, { once: true });
    setTimeout(done, 1400);                    // belt and braces
  }

  /* The rings answer the wave. Called separately so the caller can
     time it to when the new numbers are actually on screen — a pulse
     on stale figures would be celebrating the wrong thing. */
  function ringsAcknowledge(delay) {
    if (!canAnimate()) return;
    setTimeout(() => {
      document.querySelectorAll('.ring__svg').forEach((svg, i) => {
        setTimeout(() => {
          svg.classList.remove('ring-arrive');
          void svg.offsetWidth;                // restart the animation
          svg.classList.add('ring-arrive');
          setTimeout(() => svg.classList.remove('ring-arrive'), 700);
        }, i * 70);                            // left to right, as read
      });
    }, delay || 260);
  }

  /* ═══════════ HEALTH BLOOM ═══════════
     Three short strokes that grow out of the ring card and fade.

     Fires only when every ring that is actually being tracked ended
     the day under its target on the HIGH end — the conservative
     reading — and only when something was logged. An empty day is not
     an achievement, and saying so would be the cheapest possible lie.

     No score, no streak, no congratulation. The app is not entitled
     to grade a person's health from estimates this wide; this marks
     an arithmetic fact and the copy beside it says exactly that. */
  function bloom(hostEl) {
    if (!canAnimate() || !hostEl) return;
    hostEl.classList.add('bloom');
    const rots = [-22, 0, 22];
    rots.forEach((rot, i) => {
      const leaf = document.createElement('span');
      leaf.className = 'bloom__leaf';
      leaf.setAttribute('aria-hidden', 'true');
      leaf.style.setProperty('--leaf-rot', rot + 'deg');
      leaf.style.setProperty('left', (46 + i * 4) + '%');
      leaf.style.setProperty('animation-delay', (i * 110) + 'ms');
      hostEl.appendChild(leaf);
      setTimeout(() => { if (leaf.parentNode) leaf.parentNode.removeChild(leaf); }, 2000);
    });
    setTimeout(() => hostEl.classList.remove('bloom'), 2100);
  }

  /* ═══════════ MORPHING CARDS ═══════════
     A row grows into the page it opens. FLIP: measure where the row
     is, measure where the destination lands, animate the difference
     on a throwaway ghost so neither real element is touched.

     If either measurement is degenerate the ghost is skipped
     entirely — a morph from a zero-size box is a flicker, and a
     flicker is worse than a cut. */
  function morph(fromEl, toEl) {
    if (!canAnimate() || !fromEl || !toEl) return;
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    if (!a.width || !a.height || !b.width || !b.height) return;

    const ghost = document.createElement('div');
    ghost.className = 'morph-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.setProperty('left', a.left + 'px');
    ghost.style.setProperty('top', a.top + 'px');
    ghost.style.setProperty('width', a.width + 'px');
    ghost.style.setProperty('height', a.height + 'px');
    ghost.style.setProperty('--dx', ((b.left + b.width / 2) - (a.left + a.width / 2)) + 'px');
    ghost.style.setProperty('--dy', ((b.top + b.height / 2) - (a.top + a.height / 2)) + 'px');
    ghost.style.setProperty('--sx', (b.width / a.width).toFixed(3));
    ghost.style.setProperty('--sy', (b.height / a.height).toFixed(3));
    document.body.appendChild(ghost);

    const done = () => { if (ghost.parentNode) ghost.parentNode.removeChild(ghost); };
    ghost.addEventListener('animationend', done, { once: true });
    setTimeout(done, 800);
  }

  /* ═══════════ SPOTLIGHT ═══════════
     A soft warm light under the cursor, tracked on cards.

     Fine pointers only — on a touch screen there is no cursor to
     follow and the listener would cost battery for nothing. Throttled
     to one write per frame; the read is from the event, so this never
     forces a layout.

     Entirely presentational. If the properties never update, surfaces
     are simply unlit and nothing else changes. */
  function spotlight() {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (reduced()) return;

    document.body.classList.add('spotlight-host');
    let pending = false, lastEv = null;

    document.addEventListener('pointermove', (ev) => {
      lastEv = ev;
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        const e = lastEv;
        if (!e) return;
        const card = e.target && e.target.closest && e.target.closest('.card, .m-stone');
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--px', (e.clientX - r.left) + 'px');
        card.style.setProperty('--py', (e.clientY - r.top) + 'px');
      });
    }, { passive: true });
  }

  /* ═══════════ DYNAMIC NAVIGATION ═══════════
     Past the fold you are reading, not navigating, so the rail's
     supporting furniture recedes. The four destinations and the
     glance figures never do — those are the only two things a
     scrolling reader might want from a navigation rail. */
  function condenseNav() {
    if (typeof window === 'undefined') return;
    let pending = false;
    const apply = () => {
      pending = false;
      document.body.classList.toggle('is-condensed', window.scrollY > 180);
    };
    window.addEventListener('scroll', () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(apply);
    }, { passive: true });
    apply();
  }

  /* ═══════════ TEACHING LOADER ═══════════
     Markup for the wait. The facts are the same static education set
     the empty dashboard uses — real figures from the reference table,
     never generated, never invented on the spot.

     Returns a string rather than mounting itself, so the caller keeps
     control of where it lands and what it replaces. */
  const FACTS = [
    'A half-cup of cooked spinach packs about five times the leaves — and five times the potassium — of a half-cup raw (420 vs 84 mg).',
    'Low-fat potato chips carry more potassium than regular ones (494 vs 339 mg per ounce).',
    'In one survey of dialysis patients, 93% knew cola contains sugar. Only 25% knew it contains phosphate.',
    'Additive phosphate is absorbed almost completely — over 90%, against under 40% from plant foods.',
    'Boiling and draining a potato removes roughly half its potassium. Soaking it barely does anything.'
  ];

  function loaderHtml(status) {
    const fact = FACTS[Math.floor(Math.random() * FACTS.length)];
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<div class="tloader">
      <svg class="tloader__ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle class="tloader__track" cx="22" cy="22" r="19"/>
        <circle class="tloader__fill"  cx="22" cy="22" r="19"/>
      </svg>
      <div class="tloader__text">
        <div class="tloader__status">${esc(status || 'Breaking your meal down…')}</div>
        <p class="tloader__fact">${esc(fact)}</p>
      </div>
    </div>`;
  }

  /* ═══════════ LIVING CHART ═══════════
     Pointing at a day's band says what that day was, in a sentence.

     Deliberately POINTER-ONLY, and the bands are deliberately NOT
     focusable. The chart is an <svg role="img"> carrying a complete
     text alternative that already names every logged day, its range,
     and the target. Putting tabindex on rects inside a role="img"
     would create focus stops inside something the accessibility tree
     presents as a single image — an inconsistency that makes the
     chart worse for the people it was meant to help, in exchange for
     duplicating information they already receive in full.

     So this is enhancement for pointer users only, and it reveals
     nothing the text alternative does not already carry. A hover that
     disclosed a NEW fact would be a fact hidden from everyone who
     cannot hover; that would be a bug, not a feature. */
  function livingChart(root) {
    if (!root) return;
    root.querySelectorAll('.trend').forEach(block => {
      const out = block.querySelector('.trend__read');
      if (!out) return;
      const idle = out.getAttribute('data-idle') || '';
      const say = (el) => {
        const t = el && el.getAttribute('data-read');
        out.textContent = t || idle;
        out.classList.toggle('is-live', !!t);
      };
      block.querySelectorAll('.trend-band').forEach(band => {
        band.addEventListener('pointerenter', () => say(band));
        band.addEventListener('pointerleave', () => say(null));
      });
      block.addEventListener('pointerleave', () => say(null));
    });
  }

  /* ═══════════ INTERACTIVE BACKGROUND ═══════════
     A single slow highlight in the atmosphere layer that drifts
     toward the pointer. Not a particle field: particles at this
     scale are a frame-rate tax paid by the user for the developer's
     amusement, and the aurora already carries the atmosphere.

     One property write per frame, fine pointers only, and it lags the
     cursor heavily on purpose so it reads as ambient rather than as
     something following you. */
  function livingBackground() {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (reduced()) return;

    const root = document.documentElement;
    let tx = 50, ty = 50, cx = 50, cy = 50, running = false;

    document.addEventListener('pointermove', (e) => {
      tx = (e.clientX / window.innerWidth) * 100;
      ty = (e.clientY / window.innerHeight) * 100;
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: true });

    function step() {
      cx += (tx - cx) * 0.028;                 // heavy lag: ambient, not a follower
      cy += (ty - cy) * 0.028;
      root.style.setProperty('--aurora-x', cx.toFixed(2) + '%');
      root.style.setProperty('--aurora-y', cy.toFixed(2) + '%');
      if (Math.abs(tx - cx) > 0.2 || Math.abs(ty - cy) > 0.2) requestAnimationFrame(step);
      else running = false;
    }
  }

  /* ═══════════ SCREEN CHARACTER ═══════════
     Names the current screen on the root element so the stylesheet
     can shift the canvas a few degrees toward what the screen is for.
     Data only — no colour decisions live here. */
  function setScreen(name) {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-screen', String(name || ''));
  }

  function init() {
    spotlight();
    condenseNav();
    livingBackground();
  }

  return {
    ripple, ringsAcknowledge, bloom, morph,
    loaderHtml, livingChart, setScreen, init,
    FACTS, reduced
  };
})();
