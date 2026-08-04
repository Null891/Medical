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
    if (name !== 'learn' && name !== 'detail') lastScreen = name;
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
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 2600);
  }

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

  let onbStep = 1;

  function renderOnboarding() {
    $$('.onb__step').forEach(el => { el.hidden = Number(el.dataset.step) !== onbStep; });
    $$('.onb__dots li').forEach(el => {
      el.classList.toggle('is-active', Number(el.dataset.step) <= onbStep);
    });
    if (onbStep === 2) renderTargetFields('#onbTargetFields', {});
    if (onbStep === 3) renderLabFields('#onbLabFields');
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
    if (sel === '#onbLabFields') {
      $(sel).addEventListener('input', () => {
        const any = ['k', 'p', 'egfr'].some(f => $(`${sel} [data-lab="${f}"]`).value.trim() !== '');
        $('#onbLabAction').textContent = any ? 'Save and continue' : 'Skip for now';
      });
    }
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
    renderMealList();
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

      return `<div class="itemrow">
        <div>
          <div class="itemrow__name">${esc(it.name)}</div>
          <div class="chiprow">${chip}</div>
          <p class="itemrow__meta">${esc(it.portion_text || '')}</p>
          ${nums}
          ${it._note ? `<p class="itemrow__meta">${esc(it._note)}</p>` : ''}
          ${stepper}
        </div>
        <div><button type="button" class="iconbtn" data-remove-item="${idx}"
          aria-label="Remove ${esc(it.name)}">✕</button></div>
      </div>`;
    }).join('') + `</div>`;

    const cards = Cards.generate(items, draft.text);
    draft.cards = cards;
    $('#reviewCards').innerHTML = cards.map(flagCardHtml).join('');
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
        <select id="setStage">
          ${['not_sure', 'G3a', 'G3b', 'G4', 'G5'].map(s =>
            `<option value="${s}" ${p.ckd_stage === s ? 'selected' : ''}>${s === 'not_sure' ? 'Prefer not to say' : s}</option>`
          ).join('')}
        </select>
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
        '[data-delete-meal],[data-remove-item],[data-step-item],[data-pick],[data-unpick],[data-del-lab]');
      if (!el) return;

      if (el.dataset.nav) { go(el.dataset.nav); return; }
      if (el.dataset.learn) { showLearn(el.dataset.learn); return; }
      if (el.dataset.meal) { renderDetail(el.dataset.meal); return; }
      if (el.dataset.editMeal) { editMeal(el.dataset.editMeal); return; }

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
        draft.items[i] = Resolve.rescale(draft.items[i], mult);
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

    // Onboarding
    $$('[data-onb-next]').forEach(b => b.addEventListener('click', () => {
      const name = $('#onbName').value.trim();
      if (name.length > 40) {
        $('#onbNameErr').textContent = "That's a bit long — 40 characters max.";
        $('#onbNameErr').hidden = false; return;
      }
      Store.updateProfile({ display_name: name });
      onbStep = 2; renderOnboarding();
    }));

    $('#onbSaveCareTeam').addEventListener('click', () => {
      const r = readTargets('#onbTargetFields');
      if (!r.ok) return;
      Store.setTargets(r.values, 'care_team');
      Store.updateProfile({ ckd_stage: $('#onbStage').value });
      onbStep = 3; renderOnboarding();
    });

    $('#onbUseEducation').addEventListener('click', () => {
      Store.useEducationRanges();
      Store.updateProfile({ ckd_stage: $('#onbStage').value });
      renderTargetFields('#onbTargetFields', Store.targets());
      $('#onbTargetCaption').textContent = COPY.captionEducation;
      $('#onbTargetCaption').hidden = false;
      onbStep = 3; renderOnboarding();
    });

    $('#onbSkipTargets').addEventListener('click', () => {
      Store.skipTargets();
      Store.updateProfile({ ckd_stage: $('#onbStage').value });
      onbStep = 3; renderOnboarding();
    });

    $('#onbLabAction').addEventListener('click', () => {
      const r = readLabs('#onbLabFields');
      if (!r.ok) return;
      if (r.any) Store.addLab({ k: r.values.k, p: r.values.p, egfr: r.values.egfr, lab_date: r.values.lab_date });
      go('home');
    });

    // Log flow
    const mt = $('#mealText');
    mt.addEventListener('input', () => {
      $('#mealCount').textContent = mt.value.length;
      $('#analyzeBtn').disabled = mt.value.trim().length === 0;
    });
    $('#analyzeBtn').addEventListener('click', () => analyze(mt.value.trim(), false));
    $('#toPickerBtn').addEventListener('click', () => { renderPicker(''); showLogStep('log-picker'); });

    // Photo path. The button proxies the file input so the control can be
    // styled and sized like every other 44px target in the app.
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
      if (pendingDelete && Store.deleteMeal(pendingDelete)) {
        // Focus is NOT restored here: the row that opened the modal no
        // longer exists, and go('home') moves the user anyway.
        closeDeleteModal(false);
        toast('Entry deleted'); go('home');
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
