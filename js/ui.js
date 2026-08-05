/* ═══════════════════════════════════════════════════════════════
   UI — screens, router, and every interaction.
   ───────────────────────────────────────────────────────────────
   One rule dominates this file: EVERY string that originated from a
   person or from a language model goes through esc() before it reaches
   innerHTML. Meal text, clarification answers, display names, extracted
   item names and the model-authored clarification question are all
   untrusted. They are stored exactly as typed and rendered as inert
   text — never interpreted as markup.
   ═══════════════════════════════════════════════════════════════ */

const UI = (() => {

  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* The single most important function in this file. */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ── volatile state for the in-flight meal ── */
  let draft = null;      // { text, items, cards, clarification, editingId }
  let picker = [];       // manual picker basket
  let pendingDelete = null;
  let lastScreen = 'home';

  /* ═══════════ routing ═══════════ */

  const SCREENS = ['onboarding', 'home', 'log', 'detail', 'labs', 'settings', 'learn', 'label', 'passport', 'references'];

  function go(name, opts) {
    SCREENS.forEach(s => { const el = $('#scr-' + s); if (el) el.hidden = (s !== name); });
    $$('.tab').forEach(t => {
      const active = t.dataset.nav === name;
      if (active) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    // Leaving the label screen by ANY route releases the camera. Hiding
    // a video element does not stop its stream, and a camera light that
    // stays on after you navigate away is alarming in a health app.
    if (name !== 'label') stopScan();
    if (name === 'label') renderLabel();
    if (name === 'passport') renderPassport();
    if (name === 'references') renderReferences();
    // Depth-2 screens are somewhere you visit, not somewhere you live.
    if (name !== 'learn' && name !== 'detail' && name !== 'label' &&
        name !== 'passport' && name !== 'references') {
      lastScreen = name;
      // Remember where someone was. Reopening an app mid-task and being
      // dumped back at the start is a small tax paid every single time;
      // the log flow is excluded because a half-typed meal should resume
      // from its draft, not from a stale step.
      if (name !== 'log' && name !== 'onboarding') Store.setSetting('lastScreen', name);
    }
    // Name the screen on the root element so the stylesheet can shift
    // the canvas a few degrees toward what the screen is for — cooler
    // for the label scanner, warmer for reading, clinical for labs.
    // Data only: no colour decision lives in JS.
    if (typeof Motion !== 'undefined') Motion.setScreen(name);
    // Guarded: not every environment implements scrollTo, and a missing
    // scroll must never take the navigation down with it.
    try { window.scrollTo(0, 0); } catch (e) { /* non-fatal */ }

    if (name === 'home') renderHome();
    if (name === 'log') resetLog(opts && opts.keepDraft);
    if (name === 'labs') renderLabs();
    if (name === 'settings') renderSettings();
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('toast--action');
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 2600);
  }

  /* A toast that can be acted on. Undo belongs here rather than behind a
     confirmation, because the honest sequence is: let people act, then
     let them take it back. A dialog before every delete trains people to
     dismiss dialogs; an undo after costs one tap only when it is wrong. */
  function toastWithUndo(msg, onUndo) {
    const el = $('#toast');
    el.innerHTML = '';
    el.append(doc().createTextNode(msg + ' '));
    const btn = doc().createElement('button');
    btn.type = 'button';
    btn.className = 'toast__undo';
    btn.textContent = 'Undo';
    btn.addEventListener('click', () => {
      clearTimeout(el._t);
      el.hidden = true;
      onUndo();
    });
    el.append(btn);
    el.classList.add('toast--action');
    el.hidden = false;
    clearTimeout(el._t);
    // Longer than a plain toast: an undo nobody has time to read is décor.
    el._t = setTimeout(() => { el.hidden = true; }, 7000);
  }

  const doc = () => document;

  /* ═══════════ delete modal — focus is a loan ═══════════
     Whatever opened the dialog gets focus back when it closes. Without
     this, dismissing the modal drops a keyboard user at the top of the
     document and they have to tab all the way back to where they were.
     The confirm path deliberately does not restore, because the row
     that opened it has just been deleted. */
  let deleteOpener = null;

  function openDeleteModal(opener) {
    deleteOpener = opener || null;
    $('#deleteModal').hidden = false;
    const first = $('#deleteCancel');
    if (first) first.focus();
  }

  function closeDeleteModal(restoreFocus) {
    $('#deleteModal').hidden = true;
    pendingDelete = null;
    if (restoreFocus && deleteOpener && document.contains(deleteOpener)) {
      deleteOpener.focus();
    }
    deleteOpener = null;
  }

  /* ═══════════ consent ═══════════ */

  function renderConsent() {
    $('#consentBody').innerHTML = COPY.consentBody.map(p => `<p>${esc(p)}</p>`).join('');
    $('#consentAccept').textContent = COPY.consentButton;
    $('#consentModal').hidden = false;
  }

  function acceptConsent() {
    const ok = Store.acceptConsent();
    if (!ok) { $('#consentErr').hidden = false; return; }
    $('#consentModal').hidden = true;
    $('#app').hidden = false;
    /* The refusals beat sits between consent and setup, and only once.
       Consent is a legal necessity nobody reads; this is the first
       thing anybody actually reads, so it is where the app gets to say
       what it is — and it says it in three claims the reader can go
       and check rather than three adjectives. */
    if (!Store.settings().refusalsSeen) { renderRefusals(); return; }
    go('onboarding');
    renderOnboarding();
  }

  /* ═══════════ onboarding ═══════════ */


  /* One screen. Nothing is pre-filled — the target fields render empty
     and stay empty until the user makes an explicit choice. */
  /* ═══════════ onboarding ═══════════
     Four questions, and each one is answerable in a tap. The rule this
     rebuild follows: no question may exist unless its answer visibly
     changes the app, and the change is stated back immediately.

     The old version asked for a name first and a stage second, and
     neither did anything. Asking someone for information before you
     have shown them anything, and then not using it, is how a setup
     screen teaches people that the rest of the app is also busywork. */

  const NUTRIENT_CHOICES = [
    { key: 'k',  label: 'Potassium' },
    { key: 'p',  label: 'Phosphorus' },
    { key: 'na', label: 'Sodium' }
  ];

  const HARDEST = [
    { key: 'restaurant', label: 'Eating out',   scene: 'restaurant' },
    { key: 'home',       label: 'Cooking',      scene: 'home' },
    { key: 'store',      label: 'Shopping',     scene: 'store' },
    { key: 'label',      label: 'Reading labels', scene: 'store' }
  ];

  function chip(group, value, label, on) {
    return `<button type="button" class="chip-opt${on ? ' is-on' : ''}"
      role="radio" aria-checked="${on}" data-onb="${group}" data-val="${esc(value)}">${esc(label)}</button>`;
  }

  function renderOnboarding() {
    const p = Store.profile();

    /* Who this is for, said before anything is asked. Mentor feedback
       was that the app served everyone and therefore nobody. */
    $('#onbFocus').textContent = COPY.focusLine;

    const stages = ['G3b', 'G4', 'G3a', 'G5', 'not_sure'];
    const stageLabel = (s) => s === 'not_sure' ? 'Not sure' : s;
    $('#onbStageSet').innerHTML = stages
      .map(s => chip('stage', s, stageLabel(s), p.ckd_stage === s)).join('');
    echoStage(p.ckd_stage);

    const watched = Store.settings().watched || [];
    $('#onbFocusNutrients').innerHTML = NUTRIENT_CHOICES
      .map(n => `<button type="button" class="chip-opt${watched.includes(n.key) ? ' is-on' : ''}"
        aria-pressed="${watched.includes(n.key)}" data-onb="nutrient" data-val="${n.key}">${n.label}</button>`)
      .join('');
    echoNutrients(watched);

    const hardest = Store.settings().hardest || '';
    $('#onbHardest').innerHTML = HARDEST
      .map(h => chip('hardest', h.key, h.label, hardest === h.key)).join('');
    echoHardest(hardest);

    /* The name field mirrors what is STORED, rather than whatever is
       left in the DOM. Every other control on this screen is rebuilt
       from state on each render; this one was not, so after "delete all
       my data" the input still held the old name and the next setup
       silently saved it back. Somebody who wiped their data to hand the
       phone to a relative would have handed over the previous name. */
    $('#onbName').value = p.display_name || '';
    $('#onbNameErr').hidden = true;

    renderTargetFields('#onbTargetFields', {});
  }

  /* Every echo below exists so a tap has a visible consequence on the
     same screen. Without them these are still four questions that
     appear to do nothing until much later. */
  function echoStage(stage) {
    const el = $('#onbStageEcho');
    if (!stage || stage === 'not_sure') {
      el.textContent = COPY.onb.stageUnknown;
      return;
    }
    el.textContent = Clinical.inFocus(stage)
      ? COPY.onb.stageInFocus(stage)
      : COPY.onb.stageOutOfFocus(stage);
  }

  function echoNutrients(list) {
    const el = $('#onbNutrientEcho');
    if (!list || !list.length) { el.textContent = COPY.onb.nutrientNone; return; }
    const names = NUTRIENT_CHOICES.filter(n => list.includes(n.key)).map(n => n.label);
    el.textContent = list.length === NUTRIENT_CHOICES.length
      ? COPY.onb.nutrientAll
      : COPY.onb.nutrientSome(names.join(' and '));
  }

  function echoHardest(key) {
    const el = $('#onbHardestEcho');
    const h = HARDEST.find(x => x.key === key);
    el.textContent = h ? COPY.onb.hardestEcho(h.label.toLowerCase()) : COPY.onb.hardestNone;
  }

  /* Name and stage are captured wherever the user leaves them, because
     on a single screen they may fill those and then press any of the
     three target buttons. Reading them at that moment is what makes the
     fields genuinely optional rather than a hidden prerequisite. */
  function commitOnboardingProfile() {
    const name = $('#onbName').value.trim();
    if (name.length > 40) {
      $('#onbNameErr').textContent = "That's a bit long — 40 characters max.";
      $('#onbNameErr').hidden = false;
      return false;
    }
    $('#onbNameErr').hidden = true;
    /* Stage comes from the chip set now. Reading it here — at the moment
       a target button is pressed — is what keeps every question on this
       screen genuinely optional rather than a hidden prerequisite. */
    const chosen = $('#onbStageSet .chip-opt.is-on');
    Store.updateProfile({
      display_name: name,
      ckd_stage: chosen ? chosen.dataset.val : 'not_sure'
    });
    return true;
  }

  function targetFieldMarkup(which, value) {
    const b = Clinical.TARGET_BOUNDS[which];
    return `<label class="field" data-target="${which}">
      <span class="field__label">${b.label} (${b.unit})</span>
      <input type="number" inputmode="numeric" step="1"
             data-tf="${which}" value="${value === null || value === undefined ? '' : value}">
      <span class="field__err" role="alert" data-err="${which}" hidden></span>
    </label>`;
  }

  function renderTargetFields(sel, values) {
    const t = Object.keys(values).length ? values : Store.targets();
    $(sel).innerHTML = ['k', 'p', 'na'].map(k => targetFieldMarkup(k, t[k])).join('');
    $(sel).addEventListener('input', () => {
      const filled = ['k', 'p', 'na'].some(k => $(`${sel} [data-tf="${k}"]`).value.trim() !== '');
      const btn = $('#onbSaveCareTeam');
      if (btn) btn.disabled = !filled;
    });
  }

  function readTargets(sel) {
    const out = { ok: true, values: {} };
    ['k', 'p', 'na'].forEach(k => {
      const input = $(`${sel} [data-tf="${k}"]`);
      const errEl = $(`${sel} [data-err="${k}"]`);
      const res = Clinical.validateTarget(k, input.value.trim());
      if (!res.ok) {
        out.ok = false;
        errEl.textContent = res.message; errEl.hidden = false;
        input.closest('.field').classList.add('is-invalid');
      } else {
        errEl.hidden = true;
        input.closest('.field').classList.remove('is-invalid');
        out.values[k] = res.value;
      }
    });
    return out;
  }

  function renderLabFields(sel) {
    $(sel).innerHTML = `
      <label class="field">
        <span class="field__label">Serum potassium (mEq/L)</span>
        <input type="number" step="0.1" inputmode="decimal" data-lab="k">
        <span class="field__err" role="alert" data-laberr="k" hidden></span>
      </label>
      <label class="field">
        <span class="field__label">Serum phosphorus (mg/dL — check the unit on your report)</span>
        <input type="number" step="0.1" inputmode="decimal" data-lab="p">
        <span class="field__err" role="alert" data-laberr="p" hidden></span>
      </label>
      <label class="field">
        <span class="field__label">eGFR (mL/min/1.73m²) — optional</span>
        <input type="number" step="1" inputmode="numeric" data-lab="egfr">
        <span class="field__err" role="alert" data-laberr="egfr" hidden></span>
      </label>
      <label class="field">
        <span class="field__label">Date of lab report</span>
        <input type="date" data-lab="date" value="${Store.todayISO()}" max="${Store.todayISO()}">
      </label>`;
  }

  function readLabs(sel) {
    const out = { ok: true, values: {}, any: false };
    ['k', 'p', 'egfr'].forEach(f => {
      const input = $(`${sel} [data-lab="${f}"]`);
      const errEl = $(`${sel} [data-laberr="${f}"]`);
      const raw = input.value.trim();
      if (raw === '') { errEl.hidden = true; input.closest('.field').classList.remove('is-invalid'); return; }
      out.any = true;
      const res = Clinical.validateLab(f, raw);
      if (!res.ok) {
        out.ok = false;
        errEl.textContent = res.message; errEl.hidden = false;
        input.closest('.field').classList.add('is-invalid');
      } else {
        errEl.hidden = true; input.closest('.field').classList.remove('is-invalid');
        out.values[f] = res.value;
      }
    });
    out.values.lab_date = $(`${sel} [data-lab="date"]`).value || Store.todayISO();
    return out;
  }

  /* ═══════════ home ═══════════ */

  /* ═══════════ the line under the greeting ═══════════
     A greeting that only ever says "Good morning" is furniture. This
     says the one true thing about the day so far, and it is deliberately
     the least dramatic sentence available: no score out of a hundred, no
     streak, no "excellent". Those invent a verdict out of estimates, and
     shame is the emotion this app is least entitled to produce.

     What it CAN say honestly is where the day stands and whether
     anything needs attention. Nothing more. */
  function dayLine() {
    const t = Store.targets();
    const totals = Store.dayTotals();
    const mode = Clinical.potassiumMode();

    if (mode.mode === 'paused') return COPY.today.paused;
    if (!totals.mealCount) return COPY.today.nothingYet;

    const meals = `${totals.mealCount} meal${totals.mealCount === 1 ? '' : 's'} logged`;
    if (!Store.hasTargets()) return `${meals}. ${COPY.today.noTargets}`;

    // Report the worst standing across the three, since that is the one
    // that would change a decision.
    const worst = ['k', 'p', 'na']
      .filter(k => t[k])
      .map(k => Clinical.ringStatus(totals[k].high, t[k]).key);
    if (worst.includes('danger')) return `${meals}. ${COPY.today.over}`;
    if (worst.includes('warn')) return `${meals}. ${COPY.today.close}`;
    return `${meals}. ${COPY.today.room}`;
  }

  /* A plain record of what happened today, in order. Not notifications,
     not a score — the things the person did, played back. It reads as a
     day rather than a dataset, and it costs nothing to produce because
     every entry already exists. */
  function renderToday() {
    const host = $('#todayFeed');
    if (!host) return;

    const meals = Store.meals(Store.todayISO())
      .slice().sort((a, b) => a.logged_at < b.logged_at ? -1 : 1);
    /* Convert the timestamp to a LOCAL calendar date before comparing.
       This used to slice the first ten characters off entered_at, which
       is a UTC string — so for anyone west of UTC, every lab entered
       after their local evening cutoff carried tomorrow's UTC date and
       silently vanished from today's feed. East of UTC the same bug
       fires in the early morning. It only surfaced because the machine
       running the tests crossed midnight UTC.

       Store.todayISO() already does the offset conversion and accepts a
       date, so the fix is to use it on both sides rather than comparing
       a UTC string to a local one. */
    const labs = Store.labs().filter(l =>
      l.entered_at && Store.todayISO(l.entered_at) === Store.todayISO());

    const events = [
      ...meals.map(m => ({
        at: m.logged_at,
        text: (m.items || []).some(i => i.source === 'uncounted')
          ? `Logged ${esc(m.meal_text.slice(0, 60))} — part of it not counted`
          : `Logged ${esc(m.meal_text.slice(0, 60))}`
      })),
      ...labs.map(l => ({ at: l.entered_at, text: 'Added a lab result' }))
    ].sort((a, b) => a.at < b.at ? -1 : 1);

    if (events.length < 2) { host.innerHTML = ''; host.hidden = true; return; }

    host.hidden = false;
    host.innerHTML = `<div class="card">
      <h2 class="h3">Today, in order</h2>
      <ol class="feed">
        ${events.map(e => `<li class="feed__item">
          <span class="feed__time">${new Date(e.at).toLocaleTimeString('en-US',
            { hour: 'numeric', minute: '2-digit' })}</span>
          <span class="feed__text">${e.text}</span>
        </li>`).join('')}
      </ol>
    </div>`;
  }

  function renderHome() {
    const p = Store.profile();
    const hour = new Date().getHours();
    const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    /* textContent, not innerHTML — the browser escapes this for us, so a
       display name of "<script>…" lands as literal characters. An esc()
       call used to sit here and was discarded, which read as though
       escaping were load-bearing when the safety actually comes from the
       assignment target. Left explicit so nobody "restores" it and then
       switches to innerHTML trusting a variable that does nothing. */
    $('#homeGreeting').textContent = (p.display_name
      ? `${part}, ${p.display_name}` : part) + Scenes.greetingSuffix();
    $('#homeDayLine').textContent = dayLine();
    $('#homeDate').textContent = new Date().toLocaleDateString('en-US',
      { weekday: 'long', month: 'long', day: 'numeric' });

    $('#footerDisclaimer').textContent = COPY.footerDisclaimer;

    renderModeBanners();
    renderScenePicker();
    $('#ringCard').innerHTML = Rings.render();
    Rings.countUp($('#ringCard'));
    $('#orbitCard').innerHTML = Orbit.render();
    $('#statBlocks').innerHTML = Rings.renderStats();
    renderQuickAdd();
    renderMealList();
    renderToday();
    renderRail();
    $('#trendsCard').innerHTML = Trends.render();
    if (typeof Motion !== 'undefined') Motion.livingChart($('#trendsCard'));
    renderInsights();
    applyAdaptiveOrder();
    maybeBloom();
  }

  /* ═══════════ the bloom ═══════════
     Three short strokes that grow out of the ring card once, on a day
     that closed inside every budget being tracked.

     The conditions are deliberately strict. Something must have been
     logged — an empty day is not an achievement, and treating it as one
     would be the cheapest lie the app could tell. Every LIVE ring must
     be under its target on the HIGH end, the conservative reading, so
     the mark never fires on a day that might have gone over. And it
     fires once per calendar day, because a reward that repeats on every
     render is a reward that means nothing.

     There is deliberately no score, no streak, and no congratulation.
     These figures are ±40% estimates; grading somebody's health from
     them would be inventing certainty this app spent its whole design
     refusing to invent. A day's arithmetic landed inside the lines —
     that is the entire claim, and the copy beside it says so. */
  function maybeBloom() {
    if (typeof Motion === 'undefined') return;
    if (!Store.hasTargets()) return;

    const today = Store.todayISO();
    if (Store.settings().bloomedOn === today) return;

    const totals = Store.dayTotals();
    if (!totals.mealCount) return;

    const t = Store.targets();
    let live = 0;
    for (const key of ['k', 'p', 'na']) {
      if (!t[key] || Clinical.ringSuppressed(key)) continue;
      live++;
      if (totals[key].high > t[key]) return;      // any ring over: no bloom
    }
    if (!live) return;

    Store.setSetting('bloomedOn', today);
    const host = $('#ringCard');
    if (host && host.firstElementChild) Motion.bloom(host.firstElementChild);
  }

  /* ═══════════ quick add — the retention lever ═══════════
     Sixty percent of people who install a food tracker stop within two
     weeks, and the measured cause is not motivation, it is friction:
     past roughly two minutes per meal, logging does not survive the
     month. People also eat the same breakfast most days.

     So the meals someone actually repeats become one tap. This fires
     ZERO AI calls — it replays anchor-resolved items straight through
     the deterministic pipeline — which means it costs nothing, works
     offline, and is the fastest path in the app by a wide margin.

     Ordering is by how often a meal has been logged, then recency, so
     the list is genuinely "your usuals" rather than "whatever you did
     last". Meals containing anything uncounted are excluded: repeating
     a meal the app admitted it could not price would silently repeat
     the gap. */
  function frequentMeals(limit) {
    const meals = Store.meals();
    const groups = new Map();

    for (const m of meals) {
      const items = m.items || [];
      if (!items.length) continue;
      if (items.some(i => i.source === 'uncounted')) continue;
      if (!items.every(i => i.matched_anchor_id)) continue;   // replayable only

      // Same set of anchor rows at the same portions = the same meal.
      const key = items
        .map(i => `${i.matched_anchor_id}@${i.quantity_multiplier || 1}`)
        .sort().join('|');

      const prev = groups.get(key);
      if (prev) {
        prev.count++;
        if (m.logged_at > prev.logged_at) prev.logged_at = m.logged_at;
      } else {
        groups.set(key, { count: 1, logged_at: m.logged_at, meal: m });
      }
    }

    return Array.from(groups.values())
      .sort((a, b) => (b.count - a.count) || (a.logged_at < b.logged_at ? 1 : -1))
      .slice(0, limit || 3);
  }

  function renderQuickAdd() {
    const host = $('#quickAdd');
    if (!host) return;
    const top = frequentMeals(3);

    // Nothing worth repeating yet, and an empty shelf is worse than none.
    if (!top.length) { host.innerHTML = ''; host.hidden = true; return; }

    host.hidden = false;
    host.innerHTML = `<div class="card">
      <h2 class="h3">Log again</h2>
      <p class="note">One tap. No AI, no waiting.</p>
      <div class="quickadd">
        ${top.map(g => {
          const label = (g.meal.items || []).map(i => i.name).join(', ');
          return `<button type="button" class="quickadd__btn" data-repeat="${esc(g.meal.id)}">
            <span class="quickadd__name">${esc(label)}</span>
            <span class="quickadd__meta">${g.count > 1 ? `logged ${g.count} times` : 'logged once'}</span>
          </button>`;
        }).join('')}
      </div>
    </div>`;
  }

  /* Replay a past meal onto today. Deterministic: the anchor rows are
     re-resolved now, so a corrected reference value flows into the copy
     rather than the old numbers being duplicated forward. */
  function repeatMeal(id) {
    const src = Store.meals().find(m => m.id === id);
    if (!src) { toast(COPY.mutationFailed); return; }

    const items = (src.items || [])
      .map(i => Resolve.fromPicker(i.matched_anchor_id, i.quantity_multiplier || 1))
      .filter(Boolean);

    if (!items.length) { toast(COPY.mutationFailed); return; }

    // Same shape the normal save path builds, so a repeated meal is
    // indistinguishable from a typed one once it lands.
    const record = Object.assign({
      meal_text: src.meal_text,
      logged_at: new Date().toISOString(),
      meal_date: Store.todayISO(),
      items,
      confidence: Resolve.confidence(items),
      needs_clarification: false,
      clarification_question: null,
      clarification_status: 'none',
      explanation_text: ''
    }, Resolve.totals(items));

    if (!Store.addMeal(record)) { toast(COPY.mutationFailed); return; }
    toast('Logged again');
    renderHome();
  }

  function renderModeBanners() {
    const host = $('#labModeBanners');
    const kM = Clinical.potassiumMode();
    const pM = Clinical.phosphorusMode();
    let html = '';

    // Paused is a persistent, non-dismissible banner — a banner rather
    // than a modal, so record-keeping stays usable.
    if (kM.mode === 'paused') {
      $('#pausedBanner').hidden = false;
      $('#pausedBanner').innerHTML =
        `<div class="banner__title"><span aria-hidden="true">⬣</span> Contact your care team</div>
         <p>${esc(COPY.kMode.paused(kM.value))}</p>`;
    } else {
      $('#pausedBanner').hidden = true;
    }

    if (kM.mode === 'low') {
      html += banner('warn', '▲', 'Potassium below typical range', COPY.kMode.low(kM.value));
    }
    if (kM.mode === 'restricted') {
      html += banner('warn', '▲', 'Discuss with your care team', COPY.kMode.restricted(kM.value));
      const pro = Cards.proactiveSaltCard();
      if (pro) html += flagCardHtml(pro);
    }
    if (kM.mode === 'caution') {
      html += banner('warn', '▲', 'Caution mode', COPY.kMode.caution(kM.value));
    }
    if (pM.mode === 'caution') {
      html += banner('warn', '▲', 'Phosphorus above typical range', COPY.pMode.caution(pM.value));
    }
    if (kM.stale) html += banner('muted', 'i', 'Older result', COPY.staleNudge('potassium'));
    if (kM.mode === 'no_lab' && pM.mode === 'no_lab' && !kM.decayed) {
      html += banner('muted', 'i', 'No labs on file', COPY.noLabsCard);
    }

    host.innerHTML = html;
  }

  const banner = (tone, icon, title, body) =>
    `<div class="banner banner--${tone}">
       <div class="banner__title"><span aria-hidden="true">${icon}</span> ${esc(title)}</div>
       <p>${esc(body)}</p>
     </div>`;

  function renderMealList() {
    const meals = Store.meals(Store.todayISO());
    const host = $('#homeList');

    if (!meals.length) {
      const fact = COPY.emptyFacts[new Date().getDate() % COPY.emptyFacts.length];
      /* The empty state draws the idea rather than only describing it:
         an arc that fills and releases on a slow loop, which is the
         rings' own language before there is any data to put in them.
         A judge creating a fresh account gives this screen about five
         seconds, and a page of text was losing them. */
      host.innerHTML = `<div class="card m-paper empty">
        <svg class="emptyart" viewBox="0 0 220 92" aria-hidden="true">
          <path class="ea-track" d="M28 74 A 48 48 0 1 1 116 74"/>
          <path class="ea-fill"  d="M28 74 A 48 48 0 1 1 116 74"/>
          <circle class="ea-track" cx="168" cy="40" r="14"/>
          <circle class="ea-fill"  cx="168" cy="40" r="14"/>
        </svg>
        <p>${esc(COPY.emptyDashboard)}</p>
        <div class="empty__fact">${esc(fact)}</div>
      </div>`;
      return;
    }

    host.innerHTML = `<h2 class="h2">Today's meals</h2>` + meals.map(m => {
      const time = new Date(m.logged_at).toLocaleTimeString('en-US',
        { hour: 'numeric', minute: '2-digit' });
      const conf = m.confidence;
      const confChip = `<span class="chip chip--${conf === 'high' ? 'ok' : conf === 'moderate' ? 'muted' : 'warn'}">
          <span aria-hidden="true">${conf === 'high' ? '✓' : conf === 'moderate' ? '≈' : '?'}</span>
          ${conf === 'high' ? 'High confidence' : conf === 'moderate' ? 'Moderate' : 'Low — wide range'}
        </span>`;
      const uncounted = (m.items || []).some(i => i.source === 'uncounted')
        ? `<span class="chip chip--muted"><span aria-hidden="true">?</span> Not counted</span>` : '';
      const rng = (lo, hi, unit) =>
        `<span class="chip">${unit} ${Clinical.fmt(lo)}–${Clinical.fmt(hi)}</span>`;

      return `<button type="button" class="meal" data-meal="${esc(m.id)}">
        <div class="meal__top"><span class="meal__time">${esc(time)}</span></div>
        <p class="meal__text">${esc(m.meal_text)}</p>
        <div class="chiprow">
          ${rng(m.total_potassium_low_mg, m.total_potassium_high_mg, 'K')}
          ${rng(m.total_phosphorus_low_mg, m.total_phosphorus_high_mg, 'P')}
          ${rng(m.total_sodium_low_mg, m.total_sodium_high_mg, 'Na')}
          ${confChip}${uncounted}
        </div>
      </button>`;
    }).join('');
  }

  /* ═══════════ flag cards ═══════════ */

  function flagCardHtml(c) {
    if (c.quiet) {
      return `<div class="flagcard flagcard--info">
        <p class="flagcard__body">${esc(c.body)}</p>
        <p class="flagcard__disc">${esc(COPY.cardDisclaimer)}</p>
      </div>`;
    }
    return `<div class="flagcard flagcard--${c.tone === 'danger' ? 'danger' : c.tone === 'warn' ? 'warn' : 'info'}">
      <div class="flagcard__head">
        <span class="chip chip--${c.tone === 'danger' ? 'danger' : c.tone === 'warn' ? 'warn' : 'ok'}">
          <span aria-hidden="true">${c.tone === 'danger' ? '⬣' : c.tone === 'warn' ? '▲' : 'i'}</span>
          ${esc(c.chip)}
        </span>
      </div>
      ${c.title ? `<p class="flagcard__title">${esc(c.title)}</p>` : ''}
      <p class="flagcard__body">${esc(c.body)}</p>
      ${c.swap ? `<p class="flagcard__swap">${esc(c.swap)}</p>` : ''}
      <p class="flagcard__disc">${esc(COPY.cardDisclaimer)}</p>
    </div>`;
  }

  /* ═══════════ log flow ═══════════ */

  function showLogStep(id) {
    ['log-input', 'log-clarify', 'log-review', 'log-picker']
      .forEach(s => { $('#' + s).hidden = (s !== id); });
  }

  /* One place sets the waiting state, so the visible art and the
     announced status can never drift apart. The fact rotates on every
     call; the status string is what a screen reader hears, because
     announcing a nutrition fact somebody did not ask for would be
     noise at exactly the wrong moment. */
  function setPending(status) {
    const art = $('#logPendingArt');
    if (art && typeof Motion !== 'undefined') art.innerHTML = Motion.loaderHtml(status);
    const t = $('#logPendingText');
    if (t) t.textContent = status;
  }

  function resetLog(keep) {
    if (!keep) {
      draft = null; picker = [];
      $('#mealText').value = ''; $('#mealCount').textContent = '0';
      $('#analyzeBtn').disabled = true;
      Store.setSetting('mealDraft', '');   // the draft is spent
    }
    $('#logPending').hidden = true;
    setPending('Breaking your meal down…');
    $('#logError').hidden = true;
    $('#photoBtn').disabled = false;
    clearPhoto();          // a stale preview must not survive into a new meal
    showLogStep('log-input');
  }

  async function analyze(text, isRetryOfClarify) {
    $('#logError').hidden = true;
    $('#logPending').hidden = false;
    $('#analyzeBtn').disabled = true;

    // Daily cap counts MEALS, not calls. A clarification re-run of the
    // same meal does not spend a second one.
    if (!isRetryOfClarify) {
      if (!Store.canAnalyze()) {
        $('#logPending').hidden = true;
        showError(COPY.capReached);
        return;
      }
    }

    try {
      const { data } = await LLM.extract(text);
      if (!isRetryOfClarify) Store.countAnalysis();
      $('#logPending').hidden = true;
      $('#analyzeBtn').disabled = false;

      if (!data.items.length) { showError(COPY.emptyExtraction, true); return; }

      if (data.needs_clarification && data.clarification_question) {
        draft = { text, extraction: data, clarification: data.clarification_question };
        $('#clarifyOriginal').textContent = text;
        $('#clarifyQuestion').textContent = data.clarification_question;
        $('#clarifyAnswer').value = '';
        showLogStep('log-clarify');
        return;
      }
      buildReview(text, data.items);
    } catch (e) {
      $('#logPending').hidden = true;
      $('#analyzeBtn').disabled = false;
      showError(COPY.analyzeError);
    }
  }

  function showError(msg, hidePicker) {
    $('#logErrorText').textContent = msg;
    $('#toPickerBtn').hidden = !!hidePicker;
    $('#logError').hidden = false;
  }

  /* ═══════════ photo capture ═══════════
     Downscale on the device before anything leaves it. A modern phone
     camera produces 4000px JPEGs; the model gains nothing from more than
     ~1024px for identifying a plate of food, and sending the full frame
     costs the user upload time on a connection we cannot assume is good.
     It also keeps the request far under the endpoint's size ceiling. */
  const PHOTO_MAX_EDGE = 1024;
  const PHOTO_QUALITY = 0.82;

  function downscale(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        // JPEG throughout: photographs of food have no flat colour for
        // PNG to exploit, and the size difference is large.
        const dataUrl = canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
        resolve({ dataUrl, base64: dataUrl.split(',')[1] });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode_failed')); };
      img.src = url;
    });
  }

  async function analyzePhoto(file) {
    $('#logError').hidden = true;
    $('#photoBtn').disabled = true;

    if (!Store.canAnalyze()) { $('#photoBtn').disabled = false; showError(COPY.capReached); return; }

    let shot;
    try {
      shot = await downscale(file);
    } catch (e) {
      $('#photoBtn').disabled = false;
      showError(COPY.photoUnreadable, true);
      return;
    }

    $('#photoPreview').src = shot.dataUrl;
    $('#photoPreviewWrap').hidden = false;
    setPending('Looking at your photo…');
    $('#logPending').hidden = false;

    try {
      const { data } = await LLM.extractFromPhoto({
        media_type: 'image/jpeg', data: shot.base64
      });
      Store.countAnalysis();
      $('#logPending').hidden = true;
      $('#photoBtn').disabled = false;

      if (!data.items.length) {
        // The model could see the picture but not the food. Typing is the
        // recovery, so say that rather than offering the camera again.
        showError(data.clarification_question || COPY.photoUnreadable, true);
        return;
      }
      if (data.needs_clarification && data.clarification_question) {
        draft = { text: COPY.photoMealLabel, extraction: data, clarification: data.clarification_question };
        $('#clarifyOriginal').textContent = COPY.photoMealLabel;
        $('#clarifyQuestion').textContent = data.clarification_question;
        $('#clarifyAnswer').value = '';
        showLogStep('log-clarify');
        return;
      }
      buildReview(COPY.photoMealLabel, data.items);
    } catch (e) {
      $('#logPending').hidden = true;
      $('#photoBtn').disabled = false;
      showError(COPY.analyzeError);
    }
  }

  /* ═══════════ dictation ═══════════
     Typing a meal is the single most effortful thing this app asks for,
     and the population it asks it of skews older, often with arthritis
     or tremor or vision that makes a phone keyboard genuinely hard. So
     the same text field can be filled by speaking.

     Progressive enhancement, strictly: the button stays hidden unless
     the browser exposes the API, because a control that does nothing is
     worse than no control. Recognition runs in the browser or on the
     device — nothing is uploaded by us, and the note says so, since
     "this app is listening to me" is a fair thing to wonder.

     Results land in the textarea and go nowhere else. The user reads
     what was heard and presses Analyze themselves; a mis-heard meal
     that logged itself would be a nutrient error nobody chose. */
  let recognition = null;
  let listening = false;

  function speechSupported() {
    return typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function stopListening() {
    listening = false;
    $('#micLabel').textContent = 'Say it instead';
    $('#micBtn').classList.remove('is-listening');
    if (recognition) { try { recognition.stop(); } catch (e) { /* already stopped */ } }
  }

  function toggleDictation() {
    if (!speechSupported()) return;
    if (listening) { stopListening(); return; }

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new Ctor();
    recognition.lang = document.documentElement.lang || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    const field = $('#mealText');
    const startedWith = field.value ? field.value.trim() + ' ' : '';

    recognition.onresult = (ev) => {
      let text = '';
      for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
      field.value = (startedWith + text).slice(0, 500);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    };
    recognition.onerror = (ev) => {
      stopListening();
      // "no-speech" is someone changing their mind, not a failure worth
      // an error message.
      if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
        toast(ev.error === 'not-allowed'
          ? 'Microphone permission was declined'
          : "Didn't catch that — try again or type it");
      }
    };
    recognition.onend = () => stopListening();

    try {
      recognition.start();
      listening = true;
      $('#micLabel').textContent = 'Listening — tap to stop';
      $('#micBtn').classList.add('is-listening');
    } catch (e) {
      stopListening();
      toast("Couldn't start the microphone");
    }
  }

  function clearPhoto() {
    $('#photoPreviewWrap').hidden = true;
    $('#photoPreview').removeAttribute('src');
    $('#photoInput').value = '';
  }

  async function buildReview(text, extractedItems, forcedUncounted) {
    const { resolved, unmatched } = Resolve.resolveItems(extractedItems);
    let items = resolved.slice();

    if (unmatched.length) {
      try {
        const est = await LLM.estimateUnmatched(unmatched);
        est.estimates.forEach((e, i) => {
          const src = unmatched[i] || {};
          items.push({
            name: e.name || src.name,
            portion_text: src.portion_text || '',
            quantity_multiplier: 1,
            matched_anchor_id: null,
            source: e.estimable ? 'llm' : 'uncounted',
            potassium_low_mg: e.estimable ? e.potassium_low_mg : null,
            potassium_high_mg: e.estimable ? e.potassium_high_mg : null,
            phosphorus_low_mg: e.estimable ? e.phosphorus_low_mg : null,
            phosphorus_high_mg: e.estimable ? e.phosphorus_high_mg : null,
            sodium_low_mg: e.estimable ? e.sodium_low_mg : null,
            sodium_high_mg: e.estimable ? e.sodium_high_mg : null,
            additive_phosphate_flag: false,
            salt_substitute_flag: false,
            _basis: e.basis || ''
          });
        });
      } catch (err) {
        // The fallback failing is not a reason to invent numbers.
        unmatched.forEach(u => items.push(uncountedItem(u.name, u.portion_text)));
      }
    }

    (forcedUncounted || []).forEach(u => items.push(uncountedItem(u.name, u.portion_text)));

    // Salt-substitute detection is on the raw meal text, not on items.
    if (Cards.detectSaltSubstitute(text) && items.length) items[0].salt_substitute_flag = true;

    draft = Object.assign(draft || {}, { text, items });
    renderReview();
    showLogStep('log-review');
  }

  const uncountedItem = (name, portion) => ({
    name: name || 'Unidentified item', portion_text: portion || '',
    quantity_multiplier: 1, matched_anchor_id: null, source: 'uncounted',
    potassium_low_mg: null, potassium_high_mg: null,
    phosphorus_low_mg: null, phosphorus_high_mg: null,
    sodium_low_mg: null, sodium_high_mg: null,
    additive_phosphate_flag: false, salt_substitute_flag: false
  });

  function renderReview() {
    const items = draft.items;
    const host = $('#reviewItems');

    if (!items.length) {
      host.innerHTML = `<div class="card"><p>${esc(COPY.reviewEmpty)}</p></div>`;
      $('#saveMealBtn').disabled = true;
      $('#reviewCards').innerHTML = '';
      return;
    }
    $('#saveMealBtn').disabled = false;

    host.innerHTML = `<div class="card">` + items.map((it, idx) => {
      const chip = it.source === 'anchor'
        ? `<span class="chip chip--ok"><span aria-hidden="true">✓</span> Matched</span>`
        : it.source === 'llm'
          ? `<span class="chip chip--warn"><span aria-hidden="true">≈</span> Estimated</span>`
          : `<span class="chip chip--muted"><span aria-hidden="true">?</span> Not counted</span>`;

      const nums = it.source === 'uncounted'
        ? `<p class="itemrow__meta">${esc(COPY.uncountedItem)}</p>`
        : `<p class="itemrow__meta">
             K ${Clinical.fmt(it.potassium_low_mg)}–${Clinical.fmt(it.potassium_high_mg)} ·
             P ${Clinical.fmt(it.phosphorus_low_mg)}–${Clinical.fmt(it.phosphorus_high_mg)} ·
             Na ${Clinical.fmt(it.sodium_low_mg)}–${Clinical.fmt(it.sodium_high_mg)} mg
           </p>`;

      const stepper = it.matched_anchor_id
        ? `<div class="stepper" role="group" aria-label="Portion for ${esc(it.name)}">` +
          [0.5, 1, 1.5, 2].map(m =>
            `<button type="button" data-step-item="${idx}" data-mult="${m}"
              aria-pressed="${it.photo_portion ? 'false' : Math.abs((it.quantity_multiplier || 1) - m) < 0.01}">${m}×</button>`
          ).join('') + `</div>`
        : '';

      /* Where a photo-derived range came from, and how to make it
         narrower. This sentence is the whole reason estimating from a
         picture is defensible: the width is visible, its cause is
         named, and the fix is one tap away.

         Nothing here is pressed in the stepper while the band is live —
         no single multiplier is being claimed, so showing one as
         selected would assert a precision the photo does not have. */
      const photoNote = it.photo_portion
        ? `<p class="itemrow__meta itemrow__meta--photo">
             ${esc(COPY.photoPortion[it.photo_portion] || COPY.photoPortion.average)}
             ${esc(COPY.photoPortionFix)}
           </p>`
        : '';

      /* Cooking method, offered only where boiling genuinely changes the
         number. This is the rare case where something the patient
         already did — rather than something they should do differently —
         changes what gets counted, so it belongs on the review screen
         next to the portion, not in an education card they read once. */
      const row = it.matched_anchor_id
        ? ANCHOR_FOODS.find(f => f.id === it.matched_anchor_id) : null;

      /* Where the number came from, per food, on request.
         The app already tracked a citation and a per-nutrient verify
         list for every row and showed the user none of it — so "these
         are estimates" was a claim the interface asked people to take on
         faith while sitting on the specifics. Collapsed by default,
         because provenance should be available without being in the way. */
      /* Provenance is now stated INLINE, not hidden behind a
         disclosure. It used to sit inside a collapsed <details>, which
         meant the app's single strongest credibility claim — every
         number traces to a named source — was invisible unless
         somebody thought to go looking for it.

         The source line is one short sentence and it always shows.
         What stays collapsed is only the longer detail: which specific
         nutrients on this row are still unverified, and any per-row
         caveat. That is the right split — the claim is free, the
         footnotes are on request. */
      const provenance = row ? (() => {
        const gaps = (row.verify || []).map(v => NUTRIENT_WORD[v] || v);
        const detail = gaps.length || row.note;
        return `<p class="srcline">${esc(COPY.source.cited(row.food_name, row.serving_text, row.source))}</p>` +
          (detail ? `<details class="srcnote">
            <summary>What we haven't checked on this food</summary>
            ${gaps.length ? `<p class="note">${esc(COPY.source.unverified(gaps.join(', ')))}</p>` : ''}
            ${row.note ? `<p class="note">${esc(row.note)}</p>` : ''}
          </details>` : '');
      })() : '';
      const cooking = (row && row.leachable)
        ? `<div class="cookrow">
             <span class="cookrow__q">How was it cooked?</span>
             <div class="stepper" role="group" aria-label="Cooking method for ${esc(it.name)}">
               <button type="button" data-leach="${idx}" data-on="0"
                 aria-pressed="${!it._leached}">Baked or roasted</button>
               <button type="button" data-leach="${idx}" data-on="1"
                 aria-pressed="${!!it._leached}">Boiled &amp; drained</button>
             </div>
           </div>`
        : '';

      return `<div class="itemrow">
        <div>
          <div class="itemrow__name">${esc(it.name)}</div>
          <div class="chiprow">${chip}</div>
          <p class="itemrow__meta">${esc(it.portion_text || '')}</p>
          ${nums}
          ${it._note ? `<p class="itemrow__meta">${esc(it._note)}</p>` : ''}
          ${it._leached ? `<p class="itemrow__meta itemrow__meta--good">${esc(COPY.leachApplied)}</p>` : ''}
          ${photoNote}
          ${stepper}
          ${cooking}
          ${provenance}
        </div>
        <div><button type="button" class="iconbtn" data-remove-item="${idx}"
          aria-label="Remove ${esc(it.name)}">✕</button></div>
      </div>`;
    }).join('') + `</div>`;

    const cards = Cards.generate(items, draft.text);
    draft.cards = cards;
    $('#reviewCards').innerHTML = cards.map(flagCardHtml).join('');
  }

  /* Applying and un-applying the cooking choice. Always recomputed from
     the anchor row's own numbers rather than from whatever is currently
     on the item, so toggling back and forth cannot compound a factor and
     drift the value downward with every tap. Potassium only: boiling
     leaches minerals broadly, but the published figures this is built on
     are potassium figures, and quietly extending them to phosphorus and
     sodium would be inventing evidence. */
  function applyLeach(item, on) {
    const row = ANCHOR_FOODS.find(f => f.id === item.matched_anchor_id);
    if (!row || !row.leachable) return item;

    const mult = item.quantity_multiplier || 1;
    const baseLow = (row.k_low === null || row.k_low === undefined) ? null : row.k_low * mult;
    const baseHigh = (row.k_high === null || row.k_high === undefined) ? null : row.k_high * mult;

    const next = Object.assign({}, item, { _leached: !!on });
    if (baseLow === null) return next;

    if (on) {
      const l = Clinical.leach(baseLow, baseHigh);
      next.potassium_low_mg = l.low;
      next.potassium_high_mg = l.high;
    } else {
      next.potassium_low_mg = Math.round(baseLow);
      next.potassium_high_mg = Math.round(baseHigh);
    }
    return next;
  }

  function saveMeal() {
    const items = draft.items;
    const t = Resolve.totals(items);
    const conf = Resolve.confidence(items);

    const record = Object.assign({
      meal_text: draft.text,
      logged_at: new Date().toISOString(),
      meal_date: Store.todayISO(),
      items,
      confidence: conf,
      needs_clarification: !!draft.clarification,
      clarification_question: draft.clarification || null,
      clarification_status: draft.clarificationStatus || 'none',
      explanation_text: (draft.cards || []).map(c => c.body).join(' ')
    }, t);

    let saved;
    if (draft.editingId) {
      saved = Store.updateMeal(draft.editingId, record);
    } else {
      saved = Store.addMeal(record);
    }

    if (!saved) { $('#saveError').hidden = false; return; }
    draft = null;
    toast(record.meal_date === Store.todayISO() ? 'Saved to today' : 'Saved');

    /* The signature transition. A wave leaves the save control and
       crosses the page; the rings pulse as it arrives. This is the one
       moment in the app with a real causal story — what you entered is
       WHY those numbers moved — and showing it beats making somebody
       infer it from two figures changing between screens.
       Fired before go() so the origin is measured while the button is
       still on screen. */
    if (typeof Motion !== 'undefined') {
      Motion.ripple($('#saveMealBtn'));
      Motion.ringsAcknowledge(300);
      // The two channels that cost the user something if overused, so
      // they are spent only here: a meal was actually committed.
      Motion.haptic('commit');
      Motion.chime(!!Store.settings().sound);
    }
    go('home');
  }

  const NUTRIENT_WORD = { k: 'potassium', p: 'phosphorus', na: 'sodium' };

  /* ═══════════ the rail ═══════════
     Four tabs in a 232px column left ~500px of nothing underneath them,
     which is what "the sidebar looks empty" actually meant. It now
     carries today at a glance, the two actions people repeat most, and
     one rotating fact.

     Deliberately NOT a second dashboard: three thin bars, no numbers
     competing with the hero, no status words. The rail answers "roughly
     where am I" so the main column can answer it properly. */
  function renderRail() {
    const glance = $('#railGlance');
    const tip = $('#railTip');
    if (!glance) return;

    if (!Store.hasTargets()) {
      glance.innerHTML = `<p class="rail__name">No targets set yet.</p>`;
    } else {
      glance.innerHTML = Rings.model().map(r => {
        if (r.suppressed) {
          return `<div class="rail__row">
            <span class="rail__name">${r.name}</span>
            <span class="rail__val">—</span>
          </div>`;
        }
        const pct = Math.min(100, Math.round((r.high / r.target) * 100));
        /* Width comes from a class, never an inline style. The CSP sets
           style-src 'self', which blocks style="" attributes — this would
           have worked on file:// and silently flattened every bar to zero
           on the deployed site. Rounded to the nearest 5% because a bar
           4px tall cannot express finer than that anyway. */
        const step = Math.round(pct / 5) * 5;
        return `<div class="rail__row">
          <span class="rail__name">${r.name}</span>
          <span class="rail__val is-${r.status.key}">${pct}%</span>
          <span class="rail__bar"><i class="bg-${r.status.key} w-${step}"></i></span>
        </div>`;
      }).join('');
    }

    // One fact, rotating daily rather than per render — a tip that
    // changes every time you look at it reads as noise.
    if (tip) {
      const facts = COPY.emptyFacts || [];
      if (facts.length) {
        const day = Math.floor(Date.now() / 86400000);
        tip.textContent = facts[day % facts.length];
      }
    }
  }

  /* ═══════════ what this build does not know ═══════════
     Every limitation here was already computed and shown only to the
     console. A gap the developers can see and the user cannot is not
     honesty, it is bookkeeping — and this app's entire argument is that
     it tells you when it does not know something.

     Rendered from ANCHOR_STATS rather than written by hand, so it cannot
     quietly become untrue as the table changes. */
  function renderCoverage() {
    const host = $('#coverageCard');
    if (!host) return;
    const s = ANCHOR_STATS;

    const gaps = [];
    if (s.missingNa) gaps.push(`sodium on ${s.missingNa} of ${s.total} foods`);
    if (s.missingP)  gaps.push(`phosphorus on ${s.missingP}`);
    if (s.missingK)  gaps.push(`potassium on ${s.missingK}`);

    host.innerHTML = `<div class="card m-paper">
      <h2 class="h2">What this build doesn't know</h2>
      <p class="note">${esc(COPY.coverage.intro)}</p>
      ${gaps.length ? `<p class="note mt-2"><strong>Missing values:</strong> ${esc(gaps.join(', '))}.
        ${esc(COPY.coverage.missing)}</p>` : ''}
      ${s.thinCategories.length ? `<p class="note mt-2"><strong>No swap suggestions for:</strong>
        ${esc(s.thinCategories.join(', ').replace(/_/g, ' '))}.
        ${esc(COPY.coverage.thin)}</p>` : ''}
      <p class="note mt-2">${esc(COPY.coverage.verify)}</p>
    </div>`;
  }

  /* ═══════════ scenes ═══════════
     Five buttons that change what the app leads with. A scene never
     changes a number, a threshold, a target, or what gets flagged —
     only emphasis and order. Sodium guidance in a restaurant is the
     same guidance as at home; the restaurant scene puts it first,
     because that is where it is needed.

     Rendered as a radio group, not a menu: exactly one is true at a
     time, and the current one has to be visible without opening
     anything. */
  function renderScenePicker() {
    const host = $('#scenePicker');
    if (!host) return;
    const cur = Scenes.current();

    host.innerHTML = `<div class="scenes" role="radiogroup" aria-label="Where are you?">
      ${Scenes.SCENES.map(s => `
        <button type="button" class="scene${s.key === cur.key ? ' is-on' : ''}"
          role="radio" aria-checked="${s.key === cur.key}" data-scene="${esc(s.key)}">
          <span class="scene__name">${esc(s.name)}</span>
          <span class="scene__blurb">${esc(s.blurb)}</span>
        </button>`).join('')}
    </div>
    ${cur.tip ? `<div class="card m-paper scene-tip"><p class="note">${esc(cur.tip)}</p></div>` : ''}`;

    /* The primary action follows the scene. In a shop the thing you
       want is the label checker, and making somebody navigate to it
       past a "Log a meal" button is the whole problem scenes exist to
       fix. */
    const hero = $('#scr-home .btn--hero');
    if (hero) {
      hero.textContent = cur.lead.label;
      hero.dataset.nav = cur.lead.nav;
    }
  }

  /* Adaptive order. Same cards, same numbers, different lead —
     driven by clock time and the current scene, never by anything
     learned. A health app whose layout moves for reasons the user
     cannot see is a health app people stop trusting. */
  const CARD_SLOTS = {
    rings: '#ringCard', stats: '#statBlocks', quick: '#quickAdd',
    list: '#homeList', today: '#todayFeed', trends: '#trendsCard',
    insights: '#insightsCard'
  };

  function applyAdaptiveOrder() {
    const bento = $('#scr-home .bento');
    if (!bento) return;
    const { cards } = Scenes.order();
    /* CSS `order` rather than moving nodes: reparenting would restart
       every entrance animation and, worse, move focus out from under
       anybody who was mid-interaction. The DOM order stays fixed, so
       the tab sequence and screen-reader order stay fixed with it —
       only the visual arrangement follows the clock. */
    cards.forEach((key, i) => {
      const el = $(CARD_SLOTS[key]);
      if (!el) return;
      el.classList.remove(...Array.from(el.classList).filter(c => c.startsWith('ord-')));
      el.classList.add('ord-' + i);
    });
  }

  /* ═══════════ the three refusals ═══════════
     Shown once, right after consent. The whole design of this screen is
     that every claim on it is CHECKABLE within a minute of using the
     app — "we take accuracy seriously" is unfalsifiable and therefore
     worth nothing, while "it will not put a number on a meal it could
     not identify" can be tested by typing two words.

     It also pre-frames the moments that would otherwise read as the app
     breaking. A "Not counted" chip means something completely different
     to somebody who was told the app refuses to guess. */
  function renderRefusals() {
    const r = COPY.refusals;
    $('#refusalsTitle').textContent = r.title;
    $('#refusalsGo').textContent = r.button;
    $('#refusalsBody').innerHTML =
      `<p class="modal__lede">${esc(r.lede)}</p>` +
      r.items.map((it, i) => `<div class="refusal">
        <span class="refusal__n" aria-hidden="true">${i + 1}</span>
        <div>
          <h2 class="h3">${esc(it.h)}</h2>
          <p class="note">${esc(it.p)}</p>
        </div>
      </div>`).join('') +
      `<p class="note mt-2">${esc(r.footer)}</p>`;
    $('#refusalsModal').hidden = false;
    $('#refusalsGo').focus();
  }

  function dismissRefusals() {
    Store.setSetting('refusalsSeen', true);
    $('#refusalsModal').hidden = true;
    // Straight into setup, or home for somebody who already has targets.
    if (Store.profile().budget_source === 'none' && !Store.meals().length) {
      go('onboarding'); renderOnboarding();
    } else {
      go('home');
    }
  }

  /* ═══════════ references ═══════════
     Every position the app takes, with its source and where it is
     load-bearing — including the entries marked unverified, which are
     the ones that make the rest of the list worth reading. */
  function renderReferences() {
    $('#refsTitle').textContent = COPY.references.title;
    $('#refsLede').textContent = COPY.references.lede;
    $('#refsUnverified').textContent =
      COPY.references.unverifiedNote(REFERENCE_STATS.unverified);

    $('#refsList').innerHTML = Object.keys(REFERENCE_GROUPS).map(group => `
      <section class="card">
        <h2 class="h2">${esc(group)}</h2>
        ${REFERENCE_GROUPS[group].map(r => `
          <article class="ref">
            <h3 class="h3">${esc(r.title)}</h3>
            <span class="chip ${r.verified ? 'chip--ok' : 'chip--muted'}">
              <span aria-hidden="true">${r.verified ? '✓' : '?'}</span>
              ${esc(r.verified ? COPY.references.verifiedChip : COPY.references.unverifiedChip)}
            </span>
            <p class="note">${esc(r.body)}</p>
            <p class="note ref__used"><strong>${esc(COPY.references.usedLabel)}:</strong> ${esc(r.used)}</p>
          </article>`).join('')}
      </section>`).join('');
  }

  /* ═══════════ health passport ═══════════
     Renders from local storage only — no network, no model, no lookup.
     If the app opens at all, this screen is complete.

     Textareas rather than a wizard: this is a card somebody fills in
     once and edits rarely, and the fastest possible version of that is
     six labelled boxes that save as you type. */
  function renderPassport() {
    const host = $('#passportFields');
    if (!host) return;
    const d = Passport.data();

    host.innerHTML = Passport.FIELDS.map(f => `
      <div class="card">
        <label class="field">
          <span class="field__label">${esc(f.label)}</span>
          <textarea data-pp="${esc(f.key)}" rows="2" maxlength="${Passport.MAXLEN}"
            placeholder="${esc(f.placeholder)}">${esc(d[f.key] || '')}</textarea>
          <span class="field__note">${esc(f.hint)}</span>
        </label>
      </div>`).join('');

    /* The lab block reproduces what was entered, verbatim, with its
       date and the word "self-entered". A lab value on an emergency
       card that turns out to be paraphrased or three months old
       unlabelled is worse than no lab value at all. */
    const lab = Passport.labLine();
    $('#passportLab').innerHTML = lab
      ? `<div class="card m-stone">
           <h2 class="h3">Most recent lab values</h2>
           <p class="itemrow__meta">${esc(lab.text)}</p>
           <p class="note">Entered by you, dated ${esc(lab.date)}${
             lab.stale ? ' — <strong>over three months old</strong>' : ''}.</p>
         </div>`
      : `<div class="card m-paper">
           <p class="note">No lab values saved. If you have a recent potassium or phosphorus
           result, adding it on the Labs tab puts it on this card too.</p>
         </div>`;
  }

  /* ═══════════ patterns ═══════════
     Only arithmetic over what has been logged, phrased as an
     observation about the record rather than advice or a prediction.
     Renders nothing at all when there is not enough data or no pattern
     clears its evidence floor — an app that always has something to
     say about your week is an app that is making things up. */
  function renderInsights() {
    const host = $('#insightsCard');
    if (!host) return;
    const r = Insights.read(2);

    if (!r.ready) {
      // Say what is missing and how far off it is. "Come back later"
      // with no number is a dead end dressed as a promise.
      host.innerHTML = r.days
        ? `<div class="card m-paper">
             <h2 class="h3">Patterns</h2>
             <p class="note">${r.days} of ${r.need} days logged. Once there are
             ${r.need}, RenalRoute will point out anything that stands out in
             your own record.</p>
           </div>`
        : '';
      host.hidden = !r.days;
      return;
    }
    if (!r.patterns.length) {
      host.innerHTML = `<div class="card m-paper">
        <h2 class="h3">Patterns</h2>
        <p class="note">Nothing stands out across your last ${r.days} logged days —
        no day of the week or single food is running noticeably higher than the rest.</p>
      </div>`;
      host.hidden = false;
      return;
    }

    host.hidden = false;
    host.innerHTML = `<div class="card m-paper">
      <h2 class="h3">From your own record</h2>
      ${r.patterns.map(p => `
        <div class="insight">
          <p class="insight__text">${esc(p.text)}</p>
          <p class="note">${esc(p.basis)}</p>
        </div>`).join('')}
      <p class="note mt-2">These are observations about what you logged, not advice
      and not predictions. What food does to your blood work is a question for your
      care team.</p>
    </div>`;
  }

  /* ═══════════ label checker ═══════════
     Runs the same additive detectors the log flow uses, against text the
     user copies off a package. Nothing is logged and nothing is sent —
     it answers "what is actually in this?" and stops there.

     The honest part is the empty result. Finding nothing is NOT the same
     as there being nothing: the detector holds a finite list of names
     and E-numbers, manufacturers rename things, and "natural flavouring"
     can hide a multitude. So a clean scan says what was checked rather
     than declaring the food safe. */
  function renderLabel() {
    const text = $('#labelText').value;
    const host = $('#labelResults');

    if (!text.trim()) {
      host.innerHTML = `<p class="note">${esc(COPY.label.idle)}</p>`;
      return;
    }

    const phos = Cards.detectPhos(text);
    const potassium = Cards.detectPotassiumAdditive(text);
    const saltSub = Cards.detectSaltSubstitute(text);
    const found = [];

    if (saltSub) {
      found.push({
        tone: 'danger', chip: 'Salt substitute',
        title: COPY.cards.saltSubTitle,
        body: COPY.cards.saltSub
      });
    }
    if (potassium && potassium.tier === 1) {
      found.push({
        tone: 'warn', chip: 'Potassium additive',
        title: COPY.cards.kAdditiveTier1Title,
        body: COPY.cards.kAdditiveTier1(potassium.name, potassium.e)
      });
    }
    if (potassium && potassium.tier === 2) {
      // Tier 2 is preservative-level and stays visually quiet on purpose:
      // flagging a diet soda as a hyperkalaemia risk over sorbate is a
      // quantitative error a dietitian spots instantly.
      found.push({
        tone: 'muted', chip: 'Potassium additive',
        title: 'Potassium-based preservative.',
        body: COPY.cards.kAdditiveTier2(potassium.name)
      });
    }
    if (phos) {
      found.push({
        tone: 'warn', chip: 'Additive phosphate',
        title: COPY.cards.phosTitle,
        body: COPY.cards.phos(phos.match) +
              (phos.bakingPowder ? ' ' + COPY.cards.bakingPowder : '')
      });
    }

    const cards = found.length
      ? found.map(flagCardHtml).join('')
      : `<div class="card card--warm m-paper">
           <h2 class="h3">${esc(COPY.label.noneTitle)}</h2>
           <p class="note">${esc(COPY.label.noneBody)}</p>
         </div>`;

    host.innerHTML = cards + `<div class="card card--warm m-paper">
      <h2 class="h3">${esc(COPY.label.ruleTitle)}</h2>
      <p class="note">${esc(COPY.label.ruleBody)}</p>
    </div>`;
  }

  /* ═══════════ barcode lookup ═══════════
     Two ways in, and manual entry is the baseline rather than the
     fallback: BarcodeDetector ships on Chrome and Android but not
     everywhere, and a feature that only exists on some phones cannot be
     the only way to use the screen.

     A miss is reported as a miss. Open Food Facts is crowd-sourced and
     incomplete, so "not in the database" has to read as exactly that and
     not as "nothing to worry about" — the whole point of this screen is
     that absence of a finding is not a clean bill of health. */
  let scanStream = null;
  let scanTimer = null;

  function barcodeStatus(msg) { $('#barcodeStatus').textContent = msg || ''; }

  async function lookupBarcode(code) {
    const clean = String(code || '').replace(/\D/g, '');
    if (!/^[0-9]{8,14}$/.test(clean)) {
      barcodeStatus(COPY.barcode.invalid);
      return;
    }

    barcodeStatus(COPY.barcode.looking);
    try {
      const res = await fetch('/api/product?code=' + encodeURIComponent(clean));
      if (res.status === 404) { barcodeStatus(COPY.barcode.notFound); return; }
      if (!res.ok) { barcodeStatus(COPY.barcode.failed); return; }

      const p = await res.json();
      if (!p.hasIngredients) {
        barcodeStatus(COPY.barcode.noIngredients(p.name || clean));
        return;
      }

      $('#labelText').value = p.ingredients;
      renderLabel();
      const label = [p.brand, p.name].filter(Boolean).join(' — ') || clean;
      barcodeStatus(COPY.barcode.found(label));
    } catch (e) {
      barcodeStatus(COPY.barcode.offline);
    }
  }

  function scanSupported() {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async function startScan() {
    if (!scanSupported()) return;
    try {
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']
      });
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      const video = $('#scanVideo');
      video.srcObject = scanStream;
      await video.play();
      $('#scanStage').hidden = false;
      barcodeStatus(COPY.barcode.scanning);

      scanTimer = setInterval(async () => {
        try {
          const hits = await detector.detect(video);
          if (hits && hits.length) {
            const code = hits[0].rawValue;
            stopScan();
            $('#barcodeInput').value = code;
            lookupBarcode(code);
          }
        } catch (e) { /* a frame that will not decode is not an error */ }
      }, 400);
    } catch (e) {
      stopScan();
      barcodeStatus(COPY.barcode.cameraDenied);
    }
  }

  function stopScan() {
    if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
    if (scanStream) {
      // Releasing every track is what actually turns the camera light
      // off. Leaving it lit on a health app is its own kind of alarming.
      scanStream.getTracks().forEach(t => t.stop());
      scanStream = null;
    }
    const v = $('#scanVideo');
    if (v) v.srcObject = null;
    $('#scanStage').hidden = true;
  }

  /* ═══════════ manual picker ═══════════ */

  /* Token search, not substring search.
     The old rule needed one contiguous run of characters, so "potato
     baked" and "milk glass" found nothing while "baked potato" worked —
     the food is there, and the app says it isn't. People do not recall
     food names in our word order, and this list is the guaranteed path
     when the AI is unavailable, so it has to be forgiving.

     Every token must appear somewhere in the name or an alias, in any
     order. Ranking then puts the closest thing first: an exact name,
     then a name that starts with the query, then an alias hit, then
     everything else, shorter names ahead of longer ones so "potato"
     ranks above "potato chips, low-fat". */
  function searchFoods(normalizedQuery) {
    const tokens = normalizedQuery.split(/\s+/).filter(t => t.length >= 2);
    if (!tokens.length) return [];

    const scored = [];
    for (const f of ANCHOR_FOODS) {
      const name = Resolve.normalize(f.food_name);
      const aliases = (f.aliases || []).map(a => Resolve.normalize(a));
      const haystack = [name, ...aliases].join(' | ');

      if (!tokens.every(t => haystack.includes(t))) continue;

      let score = 0;
      if (name === normalizedQuery) score += 1000;
      else if (aliases.includes(normalizedQuery)) score += 800;
      else if (name.startsWith(normalizedQuery)) score += 600;
      else if (aliases.some(a => a.startsWith(normalizedQuery))) score += 400;
      if (name.includes(normalizedQuery)) score += 120;
      score += tokens.filter(t => name.includes(t)).length * 40;
      score -= name.length;                       // prefer the plainer name

      scored.push({ f, score });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, 12).map(x => x.f);
  }

  function renderPicker(query) {
    const q = Resolve.normalize(query || '');
    const host = $('#pickerResults');

    if (!q) { host.innerHTML = `<p class="note">${esc(COPY.pickerEmpty)}</p>`; }
    else {
      const hits = searchFoods(q);

      /* The "Lower potassium" badge uses the American Kidney Fund's own
         published cut-off for the phrase — 150 mg or less per serving —
         rather than a threshold of our invention. It only labels what
         the table already says, so at worst it costs a second look.
         Foods with no potassium value get no badge: absence of data must
         never render as reassurance. */
      host.innerHTML = hits.length
        ? hits.map(f => {
            const lowK = Clinical.isLowPotassiumServing(f.k_high);
            return `<button type="button" class="result" data-pick="${esc(f.id)}">
            <span>
              <strong>${esc(f.food_name)}</strong>
              ${lowK ? `<span class="chip chip--ok chip--tiny" title="${esc(COPY.picker.lowKTitle)}">Lower potassium</span>` : ''}
              <br>
              <span class="note">${esc(f.serving_text)} ·
                K ${Clinical.fmt(f.k_low)}–${Clinical.fmt(f.k_high)} ·
                P ${Clinical.fmt(f.p_low)}–${Clinical.fmt(f.p_high)}</span>
            </span><span aria-hidden="true">+</span>
          </button>`;
          }).join('')
        : `<p class="note">${esc(COPY.pickerNoResults)}</p>`;
    }

    $('#pickerBasket').innerHTML = picker.length
      ? `<div class="card"><h3 class="h3">Added</h3>` + picker.map((p, i) =>
          `<div class="itemrow">
             <div><div class="itemrow__name">${esc(p.name)}</div>
             <p class="itemrow__meta">${esc(p.portion_text)}</p></div>
             <div><button type="button" class="iconbtn" data-unpick="${i}"
               aria-label="Remove ${esc(p.name)}">✕</button></div>
           </div>`).join('') + `</div>`
      : '';
    $('#pickerReview').disabled = picker.length === 0;
  }

  /* ═══════════ meal detail ═══════════ */

  function renderDetail(id) {
    const m = Store.meal(id);
    if (!m) { go('home'); return; }

    const time = new Date(m.logged_at).toLocaleString('en-US',
      { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

    const rows = (m.items || []).map(it => `
      <div class="itemrow">
        <div>
          <div class="itemrow__name">${esc(it.name)}</div>
          <p class="itemrow__meta">${esc(it.portion_text || '')}</p>
          ${it.source === 'uncounted'
            ? `<p class="itemrow__meta">${esc(COPY.uncountedItem)}</p>`
            : `<p class="itemrow__meta">
                K ${Clinical.fmt(it.potassium_low_mg)}–${Clinical.fmt(it.potassium_high_mg)} ·
                P ${Clinical.fmt(it.phosphorus_low_mg)}–${Clinical.fmt(it.phosphorus_high_mg)} ·
                Na ${Clinical.fmt(it.sodium_low_mg)}–${Clinical.fmt(it.sodium_high_mg)} mg</p>`}
        </div><div></div>
      </div>`).join('');

    const cards = Cards.generate(m.items || [], m.meal_text);

    $('#detailBody').innerHTML = `
      <header class="hdr"><p class="hdr__eyebrow">${esc(time)}</p>
        <h1 class="hdr__title">Meal detail</h1></header>
      <div class="card"><p class="meal__text">${esc(m.meal_text)}</p>
        <div class="chiprow"><span class="chip">Confidence: ${esc(m.confidence)}</span></div></div>
      <div class="card">${rows}</div>
      ${cards.map(flagCardHtml).join('')}
      <button type="button" class="btn btn--primary btn--block" data-edit-meal="${esc(m.id)}">Edit entry</button>
      <button type="button" class="btn btn--ghost btn--block" data-delete-meal="${esc(m.id)}">Delete entry</button>`;
    go('detail');
  }

  function editMeal(id) {
    const m = Store.meal(id);
    if (!m) return;
    // Re-opening the review editor. Portion and removal edits re-resolve
    // deterministically — they fire ZERO model calls.
    draft = { text: m.meal_text, items: JSON.parse(JSON.stringify(m.items)), editingId: id };
    $('#mealText').value = m.meal_text;
    renderReview();
    go('log', { keepDraft: true });
    showLogStep('log-review');
  }

  /* ═══════════ labs ═══════════ */

  function renderLabs() {
    renderLabFields('#labFields');
    const kM = Clinical.potassiumMode();
    const pM = Clinical.phosphorusMode();
    let html = '';

    const chip = (txt) => `<span class="chip">${esc(txt)}</span>`;

    html += `<div class="card"><div class="chiprow">
        ${chip(COPY.kChip[kM.mode])} ${chip(COPY.pChip[pM.mode])}
      </div>`;

    if (kM.mode !== 'no_lab') {
      const body = COPY.kMode[kM.mode];
      html += `<p class="mt-2">${esc(
        typeof body === 'function' ? body(kM.value, kM.date) : ''
      )}</p>`;
      if (kM.mode === 'restricted') {
        html += `<button type="button" class="btn btn--secondary btn--block mt-2"
          data-nav="settings">Set my care-team targets</button>`;
      }
    }
    if (pM.mode !== 'no_lab') {
      const body = COPY.pMode[pM.mode];
      html += `<p class="mt-2">${esc(
        typeof body === 'function' ? body(pM.value, pM.date) : ''
      )}</p>`;
    }
    if (kM.mode === 'no_lab' && pM.mode === 'no_lab') {
      html += `<p class="mt-2">${esc(COPY.noLabsCard)}</p>`;
    }
    if (kM.stale) html += `<p class="note mt-2">${esc(COPY.staleNudge('potassium'))}</p>`;
    html += `</div>`;

    const egfrRec = Store.latestLab('egfr_ml_min_1_73m2');
    if (egfrRec) {
      const s = Clinical.egfrSentence(egfrRec.egfr_ml_min_1_73m2);
      if (s) html += `<div class="card card--warm"><p class="note">${esc(s)}</p></div>`;
    }

    $('#labModeCards').innerHTML = html;

    const rows = Store.labs();
    $('#labHistory').innerHTML = rows.length
      ? `<div class="card"><h2 class="h2">History</h2>` + rows.map((r, i) => `
          <div class="itemrow">
            <div>
              <div class="itemrow__name">${esc(r.lab_date)} ${i === 0 ? '· Current' : ''}</div>
              <p class="itemrow__meta">
                ${r.serum_potassium_meq_l !== null ? 'K ' + r.serum_potassium_meq_l + ' mEq/L ' : ''}
                ${r.serum_phosphorus_mg_dl !== null ? '· P ' + r.serum_phosphorus_mg_dl + ' mg/dL ' : ''}
                ${r.egfr_ml_min_1_73m2 !== null ? '· eGFR ' + r.egfr_ml_min_1_73m2 : ''}
              </p>
            </div>
            <div><button type="button" class="iconbtn" data-del-lab="${esc(r.id)}"
              aria-label="Delete lab entry">✕</button></div>
          </div>`).join('') + `</div>`
      : '';
  }

  /* ═══════════ settings ═══════════ */

  function renderSettings() {
    const p = Store.profile();
    renderTargetFields('#setTargetFields', Store.targets());

    $('#setTargetCaption').textContent =
      p.budget_source === 'education_default' ? COPY.captionEducationSettings
      : p.budget_source === 'care_team' ? COPY.captionCareTeam
      : COPY.captionNone;

    $('#setKPNote').textContent = COPY.targetsKPNote;
    $('#setNaNote').textContent = COPY.targetsNaNote;
    $('#claimCareTeamBtn').hidden = p.budget_source !== 'education_default';
    $('#useEduBtn').hidden = p.budget_source !== 'none';

    $('#setProfileFields').innerHTML = `
      <label class="field">
        <span class="field__label">Display name</span>
        <input type="text" id="setName" maxlength="40" value="${esc(p.display_name)}">
      </label>
      <label class="field">
        <span class="field__label">CKD stage (optional)</span>
        <div class="select-wrap">
          <select id="setStage">
            ${['not_sure', 'G3a', 'G3b', 'G4', 'G5'].map(s =>
              `<option value="${s}" ${p.ckd_stage === s ? 'selected' : ''}>${s === 'not_sure' ? 'Prefer not to say' : s}</option>`
            ).join('')}
          </select>
          <svg class="select-wrap__chevron" viewBox="0 0 24 24" aria-hidden="true" fill="none"
               stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
        <span class="field__note">Education only — never changes targets.</span>
      </label>`;

    $('#demoModeToggle').checked = !!Store.settings().demoMode;
    renderCoverage();

    const b = Store.parseBudget();
    const stats = ANCHOR_STATS;
    $('#callCounter').textContent =
      `Model calls this browser: ${Store.settings().llmCalls || 0} · ` +
      `Meals analysed today: ${b.used}/${b.cap} · ` +
      `Anchor rows: ${stats.total} (missing K ${stats.missingK}, P ${stats.missingP}, Na ${stats.missingNa}) · ` +
      `Swap pool: ${stats.swapPool}` +
      (stats.thinCategories.length ? ` · Thin swap categories: ${stats.thinCategories.join(', ')}` : '');

    LLM.probe().then(ok => {
      $('#llmStatus').textContent = ok
        ? 'Live parsing endpoint reachable. Turn demo mode off to use it.'
        : 'No live endpoint (no server or no API key configured) — demo mode is the only option here.';
    });
  }

  /* ═══════════ learn cards ═══════════ */

  function showLearn(key) {
    const c = COPY.learn[key];
    if (!c) return;
    $('#learnBody').innerHTML =
      `<h1 class="h1">${esc(c.title)}</h1>` + c.body.map(p => `<p>${esc(p)}</p>`).join('');
    go('learn');
  }

  /* ═══════════ event wiring ═══════════ */

  function wire() {
    $('#consentAccept').addEventListener('click', acceptConsent);

    $('#devBannerClose').addEventListener('click', () => {
      $('#devBanner').hidden = true; Store.setSetting('devBannerHidden', true);
    });

    // Global delegated clicks
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-nav],[data-learn],[data-meal],[data-edit-meal],' +
        '[data-delete-meal],[data-remove-item],[data-step-item],[data-pick],[data-unpick],[data-scene],[data-onb],' +
        '[data-del-lab],[data-repeat],[data-leach]');
      if (!el) return;

      if (el.dataset.nav) { go(el.dataset.nav); return; }
      if (el.dataset.learn) { showLearn(el.dataset.learn); return; }
      if (el.dataset.onb) {
        const group = el.dataset.onb, val = el.dataset.val;
        if (group === 'stage') {
          $$('#onbStageSet .chip-opt').forEach(b => {
            const on = b === el;
            b.classList.toggle('is-on', on);
            b.setAttribute('aria-checked', String(on));
          });
          echoStage(val);
        } else if (group === 'nutrient') {
          // Multi-select: a care team can restrict any combination, and
          // "all three" is a real and common answer.
          const cur = Store.settings().watched || [];
          const next = cur.includes(val) ? cur.filter(k => k !== val) : cur.concat(val);
          Store.setSetting('watched', next);
          el.classList.toggle('is-on', next.includes(val));
          el.setAttribute('aria-pressed', String(next.includes(val)));
          echoNutrients(next);
        } else if (group === 'hardest') {
          $$('#onbHardest .chip-opt').forEach(b => {
            const on = b === el;
            b.classList.toggle('is-on', on);
            b.setAttribute('aria-checked', String(on));
          });
          Store.setSetting('hardest', val);
          const h = HARDEST.find(x => x.key === val);
          // The answer picks the opening scene, so the first Home screen
          // already leans toward whatever they just called hardest.
          if (h) Scenes.set(h.scene);
          echoHardest(val);
        }
        return;
      }
      if (el.dataset.scene) {
        const s = Scenes.set(el.dataset.scene);
        renderHome();
        // Landing you where the scene is for. Picking "At the store"
        // and then having to find the label checker yourself would be
        // the scene doing nothing but changing a label.
        if (s.opens && s.opens !== 'home') go(s.opens);
        return;
      }
      if (el.dataset.scene) {
        const sc = Scenes.set(el.dataset.scene);
        renderHome();
        /* Land where the scene is for. Picking "At the store" and then
           having to find the label checker yourself would be the scene
           changing a label and nothing else. */
        if (sc.opens && sc.opens !== 'home') go(sc.opens);
        return;
      }
      if (el.dataset.meal) {
        /* The row grows into the page it opens. Measured before the
           screen swap, drawn after, so the ghost travels from where the
           finger actually was to where the content actually lands —
           showing the relationship instead of asking somebody to
           rebuild it from a cut. */
        renderDetail(el.dataset.meal);
        if (typeof Motion !== 'undefined') Motion.morph(el, $('#scr-detail'));
        return;
      }
      if (el.dataset.editMeal) { editMeal(el.dataset.editMeal); return; }

      if (el.dataset.repeat) { repeatMeal(el.dataset.repeat); return; }
      if (el.dataset.deleteMeal) {
        pendingDelete = el.dataset.deleteMeal;
        openDeleteModal(el);
        return;
      }
      if (el.dataset.removeItem !== undefined) {
        draft.items.splice(Number(el.dataset.removeItem), 1);
        renderReview();
        return;
      }
      if (el.dataset.stepItem !== undefined) {
        const i = Number(el.dataset.stepItem);
        const mult = Number(el.dataset.mult);
        const wasLeached = draft.items[i]._leached;
        draft.items[i] = Resolve.rescale(draft.items[i], mult);
        /* Confirming a portion retires the photo's guess. The band
           existed only because nobody had told us the size; the person
           who ate the meal just did, and their answer is better
           evidence than a picture. The extra width goes with it. */
        draft.items[i].photo_portion = null;
        // Rescaling rebuilds the item from the anchor row, which drops
        // the cooking choice. Re-apply it rather than silently reverting
        // a decision the user already made.
        if (wasLeached) draft.items[i] = applyLeach(draft.items[i], true);
        renderReview();
        return;
      }
      if (el.dataset.leach !== undefined) {
        const i = Number(el.dataset.leach);
        draft.items[i] = applyLeach(draft.items[i], el.dataset.on === '1');
        renderReview();
        return;
      }
      if (el.dataset.pick) {
        const it = Resolve.fromPicker(el.dataset.pick, 1);
        if (it) picker.push(it);
        renderPicker($('#pickerSearch').value);
        return;
      }
      if (el.dataset.unpick !== undefined) {
        picker.splice(Number(el.dataset.unpick), 1);
        renderPicker($('#pickerSearch').value);
        return;
      }
      if (el.dataset.delLab) {
        Store.deleteLab(el.dataset.delLab);
        renderLabs();
        return;
      }
    });

    /* Onboarding — one screen, three ways out, all of them finished.
       Each target button commits the optional profile fields first, so a
       name typed at the top is never lost by pressing a button further
       down. */
    $('#onbSaveCareTeam').addEventListener('click', () => {
      if (!commitOnboardingProfile()) return;
      const r = readTargets('#onbTargetFields');
      if (!r.ok) return;
      Store.setTargets(r.values, 'care_team');
      go('home');
    });

    $('#onbUseEducation').addEventListener('click', () => {
      if (!commitOnboardingProfile()) return;
      Store.useEducationRanges();
      renderTargetFields('#onbTargetFields', Store.targets());
      $('#onbTargetCaption').textContent = COPY.captionEducation;
      $('#onbTargetCaption').hidden = false;
      go('home');
    });

    $('#onbSkipTargets').addEventListener('click', () => {
      if (!commitOnboardingProfile()) return;
      Store.skipTargets();
      go('home');
    });

    // Log flow
    const mt = $('#mealText');
    /* Draft saving. Typing out a meal is the most effortful thing this
       app asks for, and losing it to a stray tab close or a phone
       killing the page in the background is the kind of small betrayal
       people do not give an app a second chance after. Saved on input,
       cleared the moment the meal is analysed or abandoned. */
    mt.addEventListener('input', () => {
      $('#mealCount').textContent = mt.value.length;
      $('#analyzeBtn').disabled = mt.value.trim().length === 0;
      Store.setSetting('mealDraft', mt.value);
    });

    const draftText = Store.settings().mealDraft;
    if (draftText) {
      mt.value = draftText;
      $('#mealCount').textContent = draftText.length;
      $('#analyzeBtn').disabled = draftText.trim().length === 0;
    }
    $('#analyzeBtn').addEventListener('click', () => analyze(mt.value.trim(), false));
    $('#toPickerBtn').addEventListener('click', () => { renderPicker(''); showLogStep('log-picker'); });

    // Photo path. The button proxies the file input so the control can be
    // styled and sized like every other 44px target in the app.
    // Dictation reveals itself only where it actually works.
    if (speechSupported()) {
      $('#micBtn').hidden = false;
      $('#micNote').hidden = false;
      $('#micBtn').addEventListener('click', toggleDictation);
    }

    $('#photoBtn').addEventListener('click', () => $('#photoInput').click());
    $('#photoInput').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) analyzePhoto(file);
    });
    $('#photoClear').addEventListener('click', clearPhoto);

    $('#clarifyUse').addEventListener('click', async () => {
      const answer = $('#clarifyAnswer').value.trim();
      draft.clarificationStatus = 'answered';
      if (!answer) { skipClarify(); return; }
      $('#logPending').hidden = false; showLogStep('log-input');
      try {
        const { data } = await LLM.extract(draft.text + '. Contains: ' + answer);
        $('#logPending').hidden = true;
        // One clarification per meal, ever. Anything still unresolvable
        // after this pass is logged as not counted, never guessed at.
        const stillVague = data.items.filter(i => i.resolvable === false);
        const usable = data.items.filter(i => i.resolvable !== false);
        buildReview(draft.text, usable, stillVague);
      } catch (err) {
        $('#logPending').hidden = true;
        showError(COPY.analyzeError);
      }
    });

    $('#clarifySkip').addEventListener('click', skipClarify);

    function skipClarify() {
      draft.clarificationStatus = 'skipped';
      const items = draft.extraction.items;
      const usable = items.filter(i => i.resolvable !== false);
      const vague = items.filter(i => i.resolvable === false);
      buildReview(draft.text, usable, vague);
    }

    $('#saveMealBtn').addEventListener('click', saveMeal);
    $('#backToTextBtn').addEventListener('click', () => { showLogStep('log-input'); });

    $('#pickerSearch').addEventListener('input', (e) => renderPicker(e.target.value));
    $('#pickerReview').addEventListener('click', () => {
      draft = { text: picker.map(p => p.name).join(', '), items: picker.slice() };
      picker = [];
      renderReview(); showLogStep('log-review');
    });

    // Delete modal
    $('#deleteCancel').addEventListener('click', () => {
      closeDeleteModal(true);
    });
    $('#deleteConfirm').addEventListener('click', () => {
      // Snapshot before deleting so Undo can put back the exact record,
      // id and timestamps included, rather than a lookalike.
      const snapshot = pendingDelete ? Store.meal(pendingDelete) : null;
      const copy = snapshot ? JSON.parse(JSON.stringify(snapshot)) : null;

      if (pendingDelete && Store.deleteMeal(pendingDelete)) {
        // Focus is NOT restored here: the row that opened the modal no
        // longer exists, and go('home') moves the user anyway.
        closeDeleteModal(false);
        go('home');
        toastWithUndo('Entry deleted', () => {
          if (Store.restoreMeal(copy)) { toast('Entry restored'); renderHome(); }
          else toast(COPY.mutationFailed);
        });
      } else {
        toast(COPY.mutationFailed);
      }
    });
    // Escape closes the modal, like every other dialog on the platform.
    $('#deleteModal').addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDeleteModal(true);
    });

    // Labs
    $('#saveLabBtn').addEventListener('click', () => {
      const r = readLabs('#labFields');
      if (!r.ok) return;
      if (!r.any) { toast('Enter at least one value'); return; }
      Store.addLab({ k: r.values.k, p: r.values.p, egfr: r.values.egfr, lab_date: r.values.lab_date });
      toast('Lab saved'); renderLabs();
    });

    // Settings
    $('#saveTargetsBtn').addEventListener('click', () => {
      const r = readTargets('#setTargetFields');
      if (!r.ok) return;
      // Audit F8: editing a number NEVER changes provenance. Promotion to
      // care_team is an explicit act, below.
      Store.setTargets(r.values);
      toast('Targets saved'); renderSettings();
    });
    $('#claimCareTeamBtn').addEventListener('click', () => {
      Store.claimCareTeam(); toast('Marked as your care team\'s targets'); renderSettings();
    });
    $('#useEduBtn').addEventListener('click', () => {
      Store.useEducationRanges(); toast('Education ranges applied'); renderSettings();
    });
    $('#saveProfileBtn').addEventListener('click', () => {
      Store.updateProfile({
        display_name: $('#setName').value.trim().slice(0, 40),
        ckd_stage: $('#setStage').value
      });
      toast('Profile saved');
    });
    $('#demoModeToggle').addEventListener('change', (e) => {
      Store.setSetting('demoMode', e.target.checked);
      toast(e.target.checked ? 'Demo mode on — no API calls' : 'Demo mode off — live parsing');
    });
    $('#seedBtn').addEventListener('click', () => {
      Seed.run(); toast('Demo persona seeded'); go('home');
    });
    $('#resetBtn').addEventListener('click', () => {
      Store.reset(); location.reload();
    });

    $('#exportSummaryBtn').addEventListener('click', () => {
      if (!Store.meals().length) { toast('Nothing logged yet to summarise'); return; }
      toast(Exporter.downloadSummary() ? 'Summary downloaded' : "Couldn't create the file");
    });
    $('#exportCsvBtn').addEventListener('click', () => {
      if (!Store.meals().length) { toast('Nothing logged yet to export'); return; }
      toast(Exporter.downloadCsv() ? 'Spreadsheet downloaded' : "Couldn't create the file");
    });

    /* Theme. Applied immediately and stored; js/theme.js re-applies it
       before paint on the next load. "system" removes the attribute
       rather than setting it, so the media query stays in charge and
       there is no second source of truth to drift. */
    function paintThemeButtons(active) {
      $$('[data-theme-set]').forEach(b => {
        b.setAttribute('aria-checked', String(b.dataset.themeSet === active));
      });
    }
    $$('[data-theme-set]').forEach(b => b.addEventListener('click', () => {
      const choice = b.dataset.themeSet;
      Store.setSetting('theme', choice);
      if (choice === 'system') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', choice);
      paintThemeButtons(choice);
      toast(choice === 'system' ? 'Following your device' : `${choice[0].toUpperCase()}${choice.slice(1)} mode on`);
    }));
    paintThemeButtons(Store.settings().theme || 'system');

    // Text size — same attribute-on-<html> pattern as the theme, so
    // js/theme.js reapplies it before paint on the next load.
    function paintSizeButtons(active) {
      $$('[data-textsize]').forEach(b => {
        b.setAttribute('aria-checked', String(b.dataset.textsize === active));
      });
    }
    $$('[data-textsize]').forEach(b => b.addEventListener('click', () => {
      const size = b.dataset.textsize;
      Store.setSetting('textSize', size);
      if (size === 'normal') document.documentElement.removeAttribute('data-textsize');
      else document.documentElement.setAttribute('data-textsize', size);
      paintSizeButtons(size);
      toast('Text size updated');
    }));
    paintSizeButtons(Store.settings().textSize || 'normal');

    /* Sound is opt-in and previews itself the moment it is switched on
       — a toggle for something you cannot hear until later is a toggle
       people flip twice and then give up on. */
    const snd = $('#soundToggle');
    snd.checked = !!Store.settings().sound;
    snd.addEventListener('change', () => {
      Store.setSetting('sound', snd.checked);
      if (snd.checked && typeof Motion !== 'undefined') Motion.chime(true);
    });

    const hc = $('#highContrastToggle');
    hc.checked = !!Store.settings().highContrast;
    hc.addEventListener('change', (e) => {
      Store.setSetting('highContrast', e.target.checked);
      if (e.target.checked) document.documentElement.setAttribute('data-contrast', 'high');
      else document.documentElement.removeAttribute('data-contrast');
      toast(e.target.checked ? 'Higher contrast on' : 'Higher contrast off');
    });

    /* Delete everything. Counts what will actually go before asking, so
       the confirmation names real numbers rather than a vague warning —
       "3 meals and 1 lab result" is a decision; "are you sure?" is not.
       Focus moves into the dialog and returns on cancel, same contract
       as the delete-a-meal modal. */
    let wipeOpener = null;
    $('#deleteAllBtn').addEventListener('click', (e) => {
      const meals = Store.meals().length;
      const labs = Store.labs().length;
      const parts = [];
      if (meals) parts.push(`${meals} meal${meals === 1 ? '' : 's'}`);
      if (labs) parts.push(`${labs} lab result${labs === 1 ? '' : 's'}`);
      $('#wipeSummary').textContent = parts.length
        ? `You have ${parts.join(' and ')} saved.`
        : 'You have nothing logged yet.';
      wipeOpener = e.currentTarget;
      $('#wipeModal').hidden = false;
      $('#wipeCancel').focus();
    });
    const closeWipe = (restore) => {
      $('#wipeModal').hidden = true;
      if (restore && wipeOpener && document.contains(wipeOpener)) wipeOpener.focus();
      wipeOpener = null;
    };
    $('#wipeCancel').addEventListener('click', () => closeWipe(true));
    $('#wipeModal').addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') closeWipe(true);
    });
    $('#wipeConfirm').addEventListener('click', () => {
      Store.reset();
      location.reload();
    });

    // Disclaimers & learn
    $('#fullDisclaimerBtn').addEventListener('click', () => {
      $('#consentBody').innerHTML = COPY.consentBody.map(p => `<p>${esc(p)}</p>`).join('');
      $('#consentAccept').textContent = 'Close';
      $('#consentModal').hidden = false;
      $('#consentAccept').onclick = () => {
        $('#consentModal').hidden = true;
        $('#consentAccept').textContent = COPY.consentButton;
        $('#consentAccept').onclick = null;
      };
    });
    $('#readDisclaimerBtn').addEventListener('click', () => $('#fullDisclaimerBtn').click());
    $('#labelText').addEventListener('input', renderLabel);
    $('#barcodeGo').addEventListener('click', () => lookupBarcode($('#barcodeInput').value));
    $('#barcodeInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); lookupBarcode($('#barcodeInput').value); }
    });
    if (scanSupported()) {
      $('#scanBtn').hidden = false;
      $('#scanBtn').addEventListener('click', startScan);
    }
    $('#scanStop').addEventListener('click', () => { stopScan(); barcodeStatus(''); });
    // Leaving the screen must release the camera, not just hide it.
    $('#labelBack').addEventListener('click', () => { stopScan(); go(lastScreen); });

    /* ── Health passport ──
       Saves as you type. This is a card somebody fills in once and
       edits rarely; making them find a Save button afterwards is how
       half-filled emergency cards happen. */
    $('#passportBack').addEventListener('click', () => go(lastScreen));
    $('#refsBack').addEventListener('click', () => go(lastScreen));
    $('#refusalsGo').addEventListener('click', dismissRefusals);
    $('#passportFields').addEventListener('input', (e) => {
      const key = e.target && e.target.dataset && e.target.dataset.pp;
      if (key) Passport.set(key, e.target.value);
    });
    $('#passportCopy').addEventListener('click', async () => {
      const text = Passport.asText();
      try {
        await navigator.clipboard.writeText(text);
        toast('Passport copied');
      } catch (err) {
        // No clipboard permission is not a dead end: hand them the file.
        Exporter.download('renalroute-passport.txt', text, 'text/plain');
        toast('Passport downloaded');
      }
    });
    $('#passportPrint').addEventListener('click', () => {
      // The print stylesheet already strips chrome; the screen prints
      // as the card it is. Paper in a wallet outlives every app.
      try { window.print(); } catch (err) { toast('Printing unavailable here'); }
    });
    $('#learnBack').addEventListener('click', () => go(lastScreen));
    $('#learnDismiss').addEventListener('click', () => go(lastScreen));
  }

  return { wire, go, renderConsent, renderOnboarding, renderHome, renderRefusals,
           renderReferences, toast, esc, searchFoods };
})();
