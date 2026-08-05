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

  /* ═══════════ HAPTICS ═══════════
     A short pulse on the two actions that commit something: saving a
     meal and confirming a delete. Deliberately nowhere else.

     Vibration is the one output channel that cannot be ignored, muted,
     or looked away from, so it is spent only where a real change just
     happened. Buzzing on every tap trains people to feel nothing, and
     on a phone in a quiet clinic waiting room it is rude.

     Guarded three ways: the API may not exist, it may exist and throw
     inside an iframe, and reduced-motion users have asked for less
     physical feedback, which reasonably includes this. */
  const HAPTIC = { commit: 12, warn: [10, 60, 10] };

  function haptic(kind) {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    if (reduced()) return;
    const pattern = HAPTIC[kind];
    if (!pattern) return;
    try { navigator.vibrate(pattern); } catch (e) { /* never fatal */ }
  }

  /* ═══════════ SOUND ═══════════
     One tone, on saving a meal, off by default.

     Off by default is the whole design. A health app that makes noise
     unasked will be muted at the system level within a day, and that
     mute takes the accessibility uses of audio with it. So it is opt-in
     from Settings and it plays exactly one sound.

     Synthesised rather than a file: a 40ms sine at 660Hz with a soft
     envelope is a few lines of WebAudio, costs no download, and cannot
     be mistaken for a notification from something else. No sample, no
     asset, nothing to cache.

     The enabled flag is passed IN rather than read from settings. This
     module is not allowed to touch the data layer at all — a lint
     enforces it — and the reason is worth keeping: the moment
     decoration can read state, somebody eventually lets it write
     state, and then an animation is deciding something. */
  let audioCtx = null;

  function chime(enabled) {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      audioCtx = audioCtx || new Ctx();
      // Browsers suspend audio until a gesture; a save IS a gesture.
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.09);
      // Envelope, not a square edge: an abrupt start clicks.
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.06, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + 0.22);
    } catch (e) { /* audio is never load-bearing */ }
  }

  /* ═══════════ MAGNETIC CURSOR ═══════════
     Primary buttons lean a few pixels toward an approaching pointer.

     Capped at 6px and only inside the button's own box, so the control
     never moves away from where somebody is aiming — magnetism that
     can pull a target out from under a click is an accessibility
     problem wearing a design trend's clothes. Fine pointers only. */
  const MAGNET_MAX = 6;

  function magnetic() {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (reduced()) return;

    let pending = false, last = null;
    document.addEventListener('pointermove', (e) => {
      last = e;
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        const btn = last.target && last.target.closest && last.target.closest('.btn--primary');
        document.querySelectorAll('.btn--primary.is-magnet').forEach(b => {
          if (b !== btn) { b.classList.remove('is-magnet'); b.style.removeProperty('transform'); }
        });
        if (!btn) return;
        const r = btn.getBoundingClientRect();
        const dx = (last.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (last.clientY - (r.top + r.height / 2)) / (r.height / 2);
        btn.classList.add('is-magnet');
        btn.style.setProperty('transform',
          `translate(${(dx * MAGNET_MAX).toFixed(1)}px, ${(dy * MAGNET_MAX).toFixed(1)}px)`);
      });
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
      document.querySelectorAll('.btn--primary.is-magnet').forEach(b => {
        b.classList.remove('is-magnet'); b.style.removeProperty('transform');
      });
    }, true);
  }

  /* ═══════════ DAYLIGHT AND SEASON ═══════════
     The canvas warms and cools with the actual time of day, and shifts
     a few degrees with the season.

     This is atmosphere, and it is held to the same rule as everything
     else here: it names a state on the root element and the stylesheet
     decides what that means. No colour is chosen in JavaScript, and no
     status colour is touched — a green ring is the same green at
     midnight in December as at noon in June, because it means the same
     thing. Only the neutral canvas moves.

     Season comes from the month, which is wrong for the southern
     hemisphere. It is labelled by month name in the data rather than
     "winter", so nothing in the app ever states a season out loud. */
  function daylight(now) {
    if (typeof document === 'undefined') return null;
    const d = now || new Date();
    const h = d.getHours();
    const phase = h < 6 ? 'night' : h < 10 ? 'dawn' : h < 17 ? 'day' : h < 20 ? 'dusk' : 'night';
    // Quarters by month, named neutrally: no claim about anybody's weather.
    const quarter = ['q1', 'q1', 'q2', 'q2', 'q2', 'q3', 'q3', 'q3', 'q4', 'q4', 'q4', 'q1'][d.getMonth()];
    document.documentElement.setAttribute('data-daylight', phase);
    document.documentElement.setAttribute('data-quarter', quarter);
    return { phase, quarter };
  }

  /* ═══════════ PARALLAX ═══════════
     The atmosphere layer drifts at a fraction of scroll speed, so the
     page has depth without anything readable moving. Content is never
     parallaxed: text that lags its own scroll is a nausea trigger, and
     this app's users skew toward exactly the people who feel it. */
  function parallax() {
    if (typeof window === 'undefined' || reduced()) return;
    const root = document.documentElement;
    let pending = false;
    window.addEventListener('scroll', () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        root.style.setProperty('--scroll-drift', (window.scrollY * -0.04).toFixed(1) + 'px');
      });
    }, { passive: true });
  }

  /* ═══════════ NO EASTER EGG ═══════════
     There was one here: seven taps on the brand mark printed the
     anchor table's quality report to the console. It has been removed
     rather than kept, and the reasoning is worth leaving behind.

     The audience for this build is a board-certified renal dietitian
     and an MD. A hidden joke in a clinical tool is, at best, neutral
     with that room — and it carries a real downside: a stray run of
     taps during a live demo fires something unexplained on screen, and
     "why did that happen" is not a question worth any amount of
     charm. Hidden behaviour in software people might make health
     decisions around is a bad instinct even when the payload is
     harmless.

     The CONTENT was the good part. How many anchor values are still
     unverified is the most credible thing this build can say about
     itself, and burying it in a console gag was exactly backwards. It
     is now a visible, permanent panel in Settings — see the coverage
     card in js/ui.js. Same information, stated openly, where a
     clinician can actually find it. */

  function init() {
    spotlight();
    condenseNav();
    livingBackground();
    magnetic();
    parallax();
    daylight();
    // Re-check the light every ten minutes; a session can outlive dusk.
    if (typeof setInterval !== 'undefined') setInterval(() => daylight(), 600000);
  }

  return {
    ripple, ringsAcknowledge, bloom, morph,
    loaderHtml, livingChart, setScreen, init,
    haptic, chime, daylight, magnetic, parallax,
    HAPTIC, MAGNET_MAX, FACTS, reduced
  };
})();
