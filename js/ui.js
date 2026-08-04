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

  const SCREENS = ['onboarding', 'home', 'log', 'detail', 'labs', 'settings', 'learn'];

  function go(name, opts) {
    SCREENS.forEach(s => { const el = $('#scr-' + s); if (el) el.hidden = (s !== name); });
    $$('.tab').forEach(t => {
      const active = t.dataset.nav === name;
      if (active) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    if (name !== 'learn' && name !== 'detail') {
      lastScreen = name;
      // Remember where someone was. Reopening an app mid-task and being
      // dumped back at the start is a small tax paid every single time;
      // the log flow is excluded because a half-typed meal should resume
      // from its draft, not from a stale step.
      if (name !== 'log' && name !== 'onboarding') Store.setSetting('lastScreen', name);
    }
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
    go('onboarding');
    renderOnboarding();
  }

  /* ═══════════ onboarding ═══════════ */


  /* One screen. Nothing is pre-filled — the target fields render empty
     and stay empty until the user makes an explicit choice. */
  function renderOnboarding() {
    renderTargetFields('#onbTargetFields', {});
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
    Store.updateProfile({ display_name: name, ckd_stage: $('#onbStage').value });
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

  function renderHome() {
    const p = Store.profile();
    const name = p.display_name ? esc(p.display_name) : '';
    const hour = new Date().getHours();
    const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    $('#homeGreeting').textContent = name ? `${part}, ${p.display_name}` : part;
    $('#homeDate').textContent = new Date().toLocaleDateString('en-US',
      { weekday: 'long', month: 'long', day: 'numeric' });

    $('#footerDisclaimer').textContent = COPY.footerDisclaimer;

    renderModeBanners();
    $('#ringCard').innerHTML = Rings.render();
    $('#statBlocks').innerHTML = Rings.renderStats();
    renderQuickAdd();
    renderMealList();
    $('#trendsCard').innerHTML = Trends.render();
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
      host.innerHTML = `<div class="card empty">
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

  function resetLog(keep) {
    if (!keep) {
      draft = null; picker = [];
      $('#mealText').value = ''; $('#mealCount').textContent = '0';
      $('#analyzeBtn').disabled = true;
      Store.setSetting('mealDraft', '');   // the draft is spent
    }
    $('#logPending').hidden = true;
    $('#logPendingText').textContent = 'Breaking your meal down…';
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
    $('#logPendingText').textContent = 'Looking at your photo…';
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
              aria-pressed="${Math.abs((it.quantity_multiplier || 1) - m) < 0.01}">${m}×</button>`
          ).join('') + `</div>`
        : '';

      /* Cooking method, offered only where boiling genuinely changes the
         number. This is the rare case where something the patient
         already did — rather than something they should do differently —
         changes what gets counted, so it belongs on the review screen
         next to the portion, not in an education card they read once. */
      const row = it.matched_anchor_id
        ? ANCHOR_FOODS.find(f => f.id === it.matched_anchor_id) : null;
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
          ${stepper}
          ${cooking}
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
    go('home');
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

      host.innerHTML = hits.length
        ? hits.map(f => `<button type="button" class="result" data-pick="${esc(f.id)}">
            <span>
              <strong>${esc(f.food_name)}</strong><br>
              <span class="note">${esc(f.serving_text)} ·
                K ${Clinical.fmt(f.k_low)}–${Clinical.fmt(f.k_high)} ·
                P ${Clinical.fmt(f.p_low)}–${Clinical.fmt(f.p_high)}</span>
            </span><span aria-hidden="true">+</span>
          </button>`).join('')
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
        '[data-delete-meal],[data-remove-item],[data-step-item],[data-pick],[data-unpick],' +
        '[data-del-lab],[data-repeat],[data-leach]');
      if (!el) return;

      if (el.dataset.nav) { go(el.dataset.nav); return; }
      if (el.dataset.learn) { showLearn(el.dataset.learn); return; }
      if (el.dataset.meal) { renderDetail(el.dataset.meal); return; }
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
    $('#learnBack').addEventListener('click', () => go(lastScreen));
    $('#learnDismiss').addEventListener('click', () => go(lastScreen));
  }

  return { wire, go, renderConsent, renderOnboarding, renderHome, toast, esc, searchFoods };
})();
