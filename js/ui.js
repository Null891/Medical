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

  const SCREENS = ['onboarding', 'home', 'log', 'detail', 'labs', 'settings', 'learn', 'label', 'passport', 'references', 'foods', 'kitchen', 'more'];

  /* ═══════════ the back button ═══════════
     This app had no history integration at all. Every screen change
     swapped `hidden` attributes and left the browser's history stack
     untouched, so pressing Back did not go back — it left the app
     entirely, discarding wherever somebody was.

     On Android that is the primary navigation gesture. Installed to a
     home screen there is no browser chrome to fall back on, so Back is
     the ONLY way out of a screen other than hunting for an on-screen
     control. An app that treats it as "quit" is an app people lose
     work in.

     go() therefore pushes; popstate replays. `silent` exists so the
     popstate handler can move the app without pushing a fresh entry
     and trapping somebody in a loop they cannot escape by holding
     Back. The initial screen replaces rather than pushes, so the first
     Back press leaves the app exactly as a user expects it to. */
  function go(name, opts) {
    const o = opts || {};
    render(name, o);

    if (typeof window === 'undefined' || !window.history || !window.history.pushState) return;
    if (o.silent) return;
    try {
      const state = { screen: name };
      if (window.history.state && window.history.state.screen === name) return;   // no duplicate entries
      if (o.replace) window.history.replaceState(state, '', window.location.href);
      else window.history.pushState(state, '', window.location.href);
    } catch (e) { /* history is never load-bearing */ }
  }

  /* Wired once at boot. A state without a screen is an entry this app
     did not create — the very first page load — so it is left alone
     rather than being coerced into a screen change. */
  function wireHistory() {
    if (typeof window === 'undefined') return;
    window.addEventListener('popstate', (e) => {
      const target = e.state && e.state.screen;
      if (!target || SCREENS.indexOf(target) === -1) return;
      /* A modal is what Back should close first, before any screen
         change — that is what the gesture means while one is open. */
      if (!$('#deleteModal').hidden) { closeDeleteModal(true); return; }
      if (!$('#demoModal').hidden) { $('#demoModal').hidden = true; return; }
      go(target, { silent: true });
    });
  }

  function render(name, opts) {
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
    if (name === 'kitchen') renderKitchen();
    if (name === 'more') renderMore();
    if (name === 'foods') renderFoods();
    // Depth-2 screens are somewhere you visit, not somewhere you live.
    if (name !== 'learn' && name !== 'detail' && name !== 'label' &&
        name !== 'passport' && name !== 'references' && name !== 'kitchen') {
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
    renderDemoBanner();
    // A quick-action menu left open across a screen change is a menu
    // floating over content it no longer relates to.
    const fabBtn = $('#fabToggle');
    if (fabBtn && fabBtn.getAttribute('aria-expanded') === 'true') toggleFab(false);
    // Guarded: not every environment implements scrollTo, and a missing
    // scroll must never take the navigation down with it.
    try { window.scrollTo(0, 0); } catch (e) { /* non-fatal */ }

    if (name === 'home') renderHome();
    if (name === 'log') resetLog(opts && opts.keepDraft);
    if (name === 'labs') { renderLabs(); renderVitals(); renderAppointments(); }
    if (name === 'settings') renderSettings();
  }

  /* ═══════════ storage failure ═══════════
     Called by Store the moment a write fails, and again when one
     succeeds after a failure. Persistent and undismissable: a dismiss
     button here would restore the exact silence this exists to break. */
  /* The demo banner, visible for the whole session rather than only at
     the entrance. Somebody handed the phone mid-walkthrough was
     otherwise looking at Frank's week with nothing on screen saying it
     was fiction. */
  function renderDemoBanner() {
    const el = $('#demoBanner');
    if (!el || typeof DemoAuth === 'undefined') return;
    if (!DemoAuth.isActive()) { el.hidden = true; return; }
    const persona = Store.settings().demoPersona === 'maria' ? 'Maria' : 'Frank';
    $('#demoBannerText').textContent = COPY.demo.banner(persona);
    $('#demoSignOut').textContent = COPY.demo.signOut;
    el.hidden = false;
  }

  function leaveDemo() {
    const res = DemoAuth.signOut();
    renderDemoBanner();
    $('#app').hidden = true;
    toast(COPY.demo.signedOut);
    // Back to the entrance, which is where somebody leaving a demo
    // expects to land — not into a half-empty app.
    renderDemo();
    return res;
  }

  function renderStorageBanner(kind) {
    const el = $('#storageBanner');
    if (!el) return;
    if (!kind) { el.hidden = true; return; }
    $('#storageBannerText').textContent =
      kind === 'quota' ? COPY.storage.quota : COPY.storage.unavailable;
    el.hidden = false;
  }

  /* Every path that tells somebody their work was kept calls this
     first. Returns true when the write landed. When it did not, the
     banner is already up — so the caller shows a failure, never a
     success, and never nothing. */
  function saved(ok) {
    if (ok) return true;
    renderStorageBanner(Store.storageState() || 'unavailable');
    return false;
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
  /* Nobody has to give a name. Somebody who skips it used to get a bare
     "Good evening" — correct, and slightly cold, and it left the
     passport and the export with an empty line where a name goes.

     So a skipped name gets a PLACEHOLDER, and the placeholder is
     deliberately not a person: no gender, no implied identity, and
     obviously editable. "You" reads as the app addressing the reader
     rather than the app having decided who they are — which is what
     inventing a first name would do, in an app whose whole argument is
     that it does not make things up about you.

     Stored as a real value so the passport and the export are never
     blank, and flagged as a placeholder so Settings can say so. */
  const NAME_PLACEHOLDER = 'You';

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
      display_name: name || NAME_PLACEHOLDER,
      ckd_stage: chosen ? chosen.dataset.val : 'not_sure'
    });
    // Remembered so Settings can offer to replace it rather than
    // presenting a name the reader never chose as one they did.
    Store.setSetting('namePlaceholder', !name);
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

  /* Filled before every print, and only ever on paper. Names whose
     diary it is, the date it was produced, and which targets the
     figures were measured against — without those three a printed page
     of milligrams is something a clinician has to interrogate rather
     than read. */
  function renderPrintHead() {
    const el = $('#printHeadMeta');
    if (!el) return;
    const p = Store.profile();
    const t = Store.targets();
    const bits = [];
    if (p.display_name) bits.push(p.display_name);
    bits.push('Printed ' + new Date().toLocaleDateString('en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }));
    if (Store.hasTargets()) {
      const named = [
        t.k ? `potassium ${Clinical.fmt(t.k)} mg` : null,
        t.p ? `phosphorus ${Clinical.fmt(t.p)} mg` : null,
        t.na ? `sodium ${Clinical.fmt(t.na)} mg` : null
      ].filter(Boolean);
      // Provenance travels with the numbers. A printed target with no
      // source invites a clinician to assume the app set it.
      const src = Store.profile().budget_source === 'care_team'
        ? 'care-team targets' : 'general education ranges';
      if (named.length) bits.push(`Daily ${src}: ${named.join(', ')}`);
    } else {
      bits.push('No daily targets set');
    }
    el.textContent = bits.join(' · ');
  }

  /* ═══════════ getting something out of the app ═══════════
     Three routes, tried in order, and the order is the point.

       SHARE — navigator.share opens the operating system's own sheet.
         This is how people actually send things: into WhatsApp, into a
         message to a daughter, into an email to a clinic. A download
         puts a .txt file somewhere in a phone's storage that a lot of
         people will never find again.
       COPY — the desktop answer, where a share sheet mostly does not
         exist and pasting into an email is the real workflow.
       DOWNLOAD — always works, and is what the app did before.

     WHAT THIS DOES AND DOES NOT DO WITH HEALTH DATA. The share sheet is
     the operating system's, and the destination is chosen by the person
     holding the phone — this app never picks one, never posts anywhere,
     and has no network path for any of this. Nothing leaves the device
     unless somebody taps a target in that sheet.

     Returns which route was taken so the caller can say so honestly,
     because "Summary downloaded" after a share is a small lie that
     makes somebody go looking in their Files app. */
  async function shareText(text, filename, title) {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: title, text: text });
        return 'shared';
      } catch (e) {
        /* AbortError means they opened the sheet and chose nothing,
           which is a decision, not a failure — falling through to a
           download would hand them a file they just declined to send. */
        if (e && e.name === 'AbortError') return 'cancelled';
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try { await navigator.clipboard.writeText(text); return 'copied'; }
      catch (e) { /* clipboard is refused in plenty of contexts */ }
    }
    return Exporter.download(filename, text, 'text/plain') ? 'downloaded' : 'failed';
  }

  /* ═══════════ one way to show a field error ═══════════
     Three forms had grown three slightly different versions of this,
     which is how a form ends up with an error that never clears, or one
     that clears the styling but leaves the text. It does four things
     together, because doing three of them is a bug:

       the message beside the field that caused it (never a toast — a
         toast for "check this number" vanishes before it is read, and
         vanishes fastest for the people who read slowest),
       the field marked invalid so it is visibly the one at fault,
       aria-invalid so a screen reader hears it as broken rather than
         merely hearing an alert from somewhere on the page,
       and focus moved there on the first error, so a keyboard user
         lands on the problem instead of hunting for it.

     `scope` is a container; passing one clears every error under it
     first, so a corrected field stops complaining. */
  function clearFieldErrors(scope) {
    const root = typeof scope === 'string' ? $(scope) : (scope || document);
    if (!root) return;
    root.querySelectorAll('[data-fielderr]').forEach(el => {
      el.hidden = true; el.textContent = '';
      const field = el.closest('.field');
      if (field) field.classList.remove('is-invalid');
      const input = field && field.querySelector('input, textarea, select');
      if (input) input.removeAttribute('aria-invalid');
    });
  }

  function showFieldError(scope, fieldKey, message, focusIt) {
    const root = typeof scope === 'string' ? $(scope) : (scope || document);
    const el = root && root.querySelector(`[data-fielderr="${fieldKey}"]`);
    if (!el) return false;                 // caller falls back to form level
    el.textContent = message;
    el.hidden = false;
    const field = el.closest('.field');
    if (field) field.classList.add('is-invalid');
    const input = field && field.querySelector('input, textarea, select');
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      if (focusIt) { try { input.focus(); } catch (e) { } }
    }
    return true;
  }

  /* Route a model result to the right place: beside the named field if
     it named one and that field exists on screen, otherwise the form's
     own error line. The fallback matters — "nothing to record yet"
     belongs to the whole form, and pinning it to an arbitrary input
     would be a lie about which field was wrong. */
  function showResultError(scope, formErrSel, res) {
    clearFieldErrors(scope);
    const placed = res.field && showFieldError(scope, res.field, res.message, true);
    const formEl = $(formErrSel);
    if (formEl) {
      formEl.textContent = placed ? '' : res.message;
      formEl.hidden = placed;
    }
    return placed;
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

    /* THE SENTENCE THAT MATTERS. Somebody opening this mid-afternoon
       wants one thing — "about 900 to 1,100 mg of potassium left" — and
       it existed only inside a ring column, competing with fifteen
       other elements for a glance that lasts a second.

       Which nutrient it names is decided by whichever is CLOSEST to its
       limit among the ones the care team actually restricted, because
       that is the one that would change a decision. Watched nutrients
       win outright; if nothing was picked, all three are eligible.

       Clinical.remainingText() already produces the exact phrasing,
       ranges and all, so this promotes an existing sentence rather
       than writing a second one that could disagree with the rings. */
    const watched = Store.settings().watched;
    const eligible = ['k', 'p', 'na']
      .filter(k => t[k] && !Clinical.ringSuppressed(k))
      .filter(k => !(Array.isArray(watched) && watched.length) || watched.indexOf(k) !== -1);

    if (eligible.length) {
      const tightest = eligible.reduce((a, b) =>
        (totals[b].high / t[b]) > (totals[a].high / t[a]) ? b : a);
      const name = { k: 'potassium', p: 'phosphorus', na: 'sodium' }[tightest];
      const remaining = Clinical.remainingText(
        totals[tightest].low, totals[tightest].high, t[tightest]);
      // "About 600–1,100 mg left" → "About 600–1,100 mg of potassium left"
      const line = remaining.replace(/\bmg\b/, `mg of ${name}`);

      /* If the nutrient this sentence names is built on food the table
         could not price, SAY SO HERE. This is the largest text on the
         dashboard and the number somebody acts on; leaving the caveat
         to a chip further down would make the most prominent figure the
         least qualified one. The direction is stated because it is the
         part that matters — the real total is higher, so the room is
         smaller, never larger. */
      const short = (totals.unpriced && totals.unpriced[tightest]) || 0;
      if (short) return `${line}. ${COPY.today.partial(short)}`;

      return `${line}. ${meals}.`;
    }

    // Nothing live to report against: fall back to the standing summary.
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
    renderChecklist();
    renderFirstMeal();
    applyAdaptiveOrder();
    maybeBloom();
    // Cards were just replaced, so the observer has nothing to watch.
    if (typeof Motion !== 'undefined') Motion.rearmReveal();
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
  /* Transient. The card is shown on the Home render that follows the
     first save and on no other — navigating away is dismissal, because
     they have moved on and the moment has passed. */
  let showFirstMeal = false;

  function renderFirstMeal() {
    const host = $('#firstMealCard');
    if (!host) return;
    if (!showFirstMeal) { host.hidden = true; host.innerHTML = ''; return; }
    showFirstMeal = false;                       // this render only

    /* Names what just happened, with the actual number from the meal
       they just logged rather than an example. "The AI read your words;
       the milligrams came from a published table" is the whole product
       argument, and this is the one moment somebody has a reason to
       care about it. */
    const totals = Store.dayTotals();
    const t = Store.targets();
    const key = ['k', 'p', 'na'].find(k => t[k] && !Clinical.ringSuppressed(k));
    const left = key
      ? Clinical.remainingText(totals[key].low, totals[key].high, t[key])
      : null;

    host.hidden = false;
    host.innerHTML = `<div class="card m-paper firstmeal">
      <h2 class="h3">${esc(COPY.firstMeal.title)}</h2>
      <p>${esc(COPY.firstMeal.body)}</p>
      ${left ? `<p class="firstmeal__left">${esc(left)}${
        key ? esc(' of ' + NUTRIENT_WORD[key]) : ''}.</p>` : ''}
      <p class="note">${esc(COPY.firstMeal.foot)}</p>
    </div>`;
  }

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
    /* A full BCP-47 tag, not the two-letter code. document.lang carries
       "es", and SpeechRecognition given "es" behaves inconsistently
       across engines — the regional variant is what actually selects a
       model. I18N.speechTag() maps es → es-US, zh → zh-CN, hi → hi-IN.
       [NEEDS VERIFICATION — recognition quality per tag has not been
       tested on a real device in any language including English.] */
    recognition.lang = I18N.speechTag();
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

    /* Binder timing. The one piece of medication guidance this app
       gives, shown when a meal is on screen because that is the only
       moment somebody can act on it. Not a dose, not a schedule, not an
       interaction check — the same sentence for every binder, which is
       precisely why it is safe to show. */
    const binders = Meds.hasPhosphateBinder() ? Meds.phosphateBinders() : [];
    const binderNote = binders.length
      ? `<div class="card m-paper binder">
           <h3 class="h3">${esc(COPY.meds.binderTiming)}</h3>
           <p class="note">${esc(COPY.meds.binderNamed(binders.join(', ')))} ${esc(COPY.meds.disclaimer)}</p>
         </div>`
      : '';

    host.innerHTML = binderNote + `<div class="card">` + items.map((it, idx) => {
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

    /* THE FIRST ONE. Every save fires the ripple, but the first is the
       only time somebody learns what this app actually does — text in,
       a number out of a published table, a figure for what is left. The
       ripple alone shows that something happened; it does not say what.

       So the first save gets one extra beat, once, and never again. A
       card rather than a modal: interrupting somebody in the second
       after their first success is the wrong instinct, and this is
       something to read, not something to acknowledge. The flag is
       stored, so a reinstall is the only way back to it. */
    if (!Store.settings().firstMealDone) {
      Store.setSetting('firstMealDone', true);
      showFirstMeal = true;
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
  /* Takes a target so the same panel can live on More (where it
     belongs, as the app's strongest credibility card) without being
     duplicated. Defaults to its original home so nothing that called it
     without an argument breaks. */
  function renderCoverage(sel) {
    const host = $(sel || '#coverageCard');
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

  /* ═══════════ more ═══════════
     A hub rather than a menu. Each card says what the screen is FOR in
     the reader's own terms, because a one-word label only works for
     somebody who already knows what is behind it — and the people this
     app is built for are meeting every one of these for the first time. */
  /* ═══════════ the food list ═══════════
     A view over ANCHOR_FOODS, not new logic: searchFoods() does the
     matching, Clinical.isLowPotassiumServing() applies the AKF
     threshold, Clinical.fmt() renders a null as an em-dash. What is new
     is that the table is browsable at all — it was reachable only from
     inside the log flow, so checking a food meant starting a meal.

     TWO RULES, and they are the whole reason this screen needed
     thinking about rather than just listing rows.

     1. A FOOD WITH NO VALUE IS NEVER RANKED AMONG FOODS THAT HAVE ONE.
        Sorting by potassium with `(a.k_high || 0) - (b.k_high || 0)`
        would put every unpriced food at the top of the low-potassium
        list — the exact place a CKD patient looks for something safe to
        eat, filled with foods we know nothing about. They go in a named
        group at the end instead.

     2. NO BADGE WITHOUT DATA. Absence of a potassium figure must never
        render as "lower potassium". Same rule the picker already
        follows; carried over verbatim rather than reinvented. */
  let foodsSort = 'name';
  let foodsPricedOnly = false;

  const FOOD_SORTS = [
    { key: 'name', label: () => COPY.foods.sortName, field: null },
    { key: 'k',    label: () => COPY.foods.sortK,    field: 'k_high',  word: 'potassium' },
    { key: 'p',    label: () => COPY.foods.sortP,    field: 'p_high',  word: 'phosphorus' },
    { key: 'na',   label: () => COPY.foods.sortNa,   field: 'na_high', word: 'sodium' }
  ];

  function foodRow(f) {
    /* No potassium figure, no badge. */
    const lowK = Clinical.isLowPotassiumServing(f.k_high);
    /* A missing value is ONE em-dash, not a range between two of them.
       "—–—" is noise that reads as a broken row; "—" reads as "we do
       not have this", which is what it means. A range collapses to a
       single figure too when both ends agree. */
    const val = (lo, hi) => {
      if (lo === null || lo === undefined) return '—';
      return lo === hi ? Clinical.fmt(lo) : `${Clinical.fmt(lo)}–${Clinical.fmt(hi)}`;
    };
    return `<div class="foodrow">
      <div class="foodrow__head">
        <strong class="foodrow__name">${esc(f.food_name)}</strong>
        ${lowK ? `<span class="chip chip--ok chip--tiny"
          title="${esc(COPY.picker.lowKTitle)}">Lower potassium</span>` : ''}
      </div>
      <p class="foodrow__serving">${esc(f.serving_text)}</p>
      <p class="foodrow__nums">
        <span>K ${val(f.k_low, f.k_high)}</span>
        <span>P ${val(f.p_low, f.p_high)}</span>
        <span>Na ${val(f.na_low, f.na_high)}</span>
        <span class="foodrow__unit">mg</span>
      </p>
      ${f.source ? `<p class="foodrow__src">${esc(f.source)}</p>` : ''}
    </div>`;
  }

  function renderFoods() {
    const c = COPY.foods;
    $('#foodsTitle').textContent = c.title;
    $('#foodsLede').textContent = c.lede;
    $('#foodsSearchLabel').textContent = c.searchLabel;
    $('#foodsPricedLabel').textContent = c.pricedOnly;
    $('#foodsFoot').textContent = c.foot;

    $('#foodsSort').innerHTML = FOOD_SORTS.map(s =>
      `<button type="button" class="chip-opt${s.key === foodsSort ? ' is-on' : ''}"
        role="radio" aria-checked="${s.key === foodsSort}"
        data-foodsort="${s.key}">${esc(s.label())}</button>`).join('');
    $('#foodsPricedOnly').checked = foodsPricedOnly;

    const q = Resolve.normalize($('#foodsSearch').value || '');
    // searchFoods caps at 12 for the picker; browsing wants everything.
    let rows = q ? searchFoods(q) : ANCHOR_FOODS.slice();

    const sort = FOOD_SORTS.find(s => s.key === foodsSort);

    /* THE SPLIT. Everything the sorted nutrient can rank, and everything
       it cannot — separated before ordering, so a null can never land
       between two real numbers. */
    let priced = rows, unpriced = [];
    if (sort.field) {
      priced = rows.filter(f => f[sort.field] !== null && f[sort.field] !== undefined);
      unpriced = rows.filter(f => f[sort.field] === null || f[sort.field] === undefined);
      priced.sort((a, b) => a[sort.field] - b[sort.field]);
    } else {
      priced.sort((a, b) => a.food_name.localeCompare(b.food_name));
    }

    if (foodsPricedOnly) unpriced = [];

    const shown = priced.length + unpriced.length;
    $('#foodsCount').textContent = c.count(shown, ANCHOR_FOODS.length);

    $('#foodsList').innerHTML = priced.length
      ? priced.map(foodRow).join('')
      : `<p class="note">${esc(c.none)}</p>`;

    $('#foodsUnpriced').innerHTML = unpriced.length
      ? `<div class="foods__unpriced">
           <h2 class="h3">${esc(c.unpriced(unpriced.length, sort.word))}</h2>
           <p class="note">${esc(c.unpricedWhy)}</p>
           ${unpriced.map(foodRow).join('')}
         </div>`
      : '';
  }

  function renderMore() {
    $('#moreDisclaimer').textContent = COPY.footerDisclaimer;
    // The coverage panel moves here: "what this build doesn't know" is
    // the app's strongest credibility card and it was buried in Settings
    // between a text-size control and an export button.
    renderCoverage('#coverageCardMore');
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
  /* Transient, deliberately not persisted. Which scene you are in is
     worth remembering; whether the picker happened to be open two days
     ago is not, and restoring it would hand the best space on the
     screen back to a control used about once a week. */
  let scenesOpen = false;

  function renderScenePicker() {
    const host = $('#scenePicker');
    if (!host) return;
    const cur = Scenes.current();

    /* COLLAPSED BY DEFAULT. Five cards with names and blurbs occupied
       the top of Home — the most valuable space in the app — for a
       control most people touch when their week changes, not when their
       meal does. What is actually needed there is one line saying where
       the app thinks you are, because that is what changes the hero
       button underneath it.

       Still a radiogroup when open, so the keyboard and screen-reader
       behaviour is unchanged; the summary is a plain expander with
       aria-expanded, which is the honest description of what it does. */
    host.innerHTML = `
      <div class="scenes-bar">
        <button type="button" class="scenes-summary" data-scenetoggle="1"
          aria-expanded="${scenesOpen}" aria-controls="sceneOptions">
          <span class="scenes-summary__where">${esc(cur.name)}</span>
          <span class="scenes-summary__change">${esc(scenesOpen ? COPY.scenes.close : COPY.scenes.change)}</span>
        </button>
      </div>
      <div class="scenes" id="sceneOptions" role="radiogroup"
           aria-label="Where are you?"${scenesOpen ? '' : ' hidden'}>
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
    orbit: '#orbitCard', rings: '#ringCard', stats: '#statBlocks',
    quick: '#quickAdd', list: '#homeList', today: '#todayFeed',
    trends: '#trendsCard', insights: '#insightsCard', checklist: '#checklistCard'
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

  function toggleFab(force) {
    const btn = $('#fabToggle');
    const open = (force === undefined) ? btn.getAttribute('aria-expanded') !== 'true' : force;
    btn.setAttribute('aria-expanded', String(open));
    $('#fabMenu').hidden = !open;
    $('#fab').classList.toggle('is-open', open);
    if (open) { const first = $('#fabMenu .fab__item'); if (first) first.focus(); }
  }

  /* The install card renders from Install.state(), so the three
     platform behaviours cannot drift apart in the markup. */
  function renderInstall() {
    const host = $('#installCard');
    if (!host || typeof Install === 'undefined') return;
    const c = COPY.install;
    const st = Install.state();

    const body =
      st === 'installed' ? `<p class="note">${esc(c.installed)}</p>` :
      st === 'ready'     ? `<p class="note">${esc(c.why)}</p>
                           <button type="button" class="btn btn--secondary btn--block" id="installBtn">${esc(c.button)}</button>` :
      st === 'ios'       ? `<p class="note">${esc(c.why)}</p><p class="note mt-2">${esc(c.ios)}</p>` :
                           `<p class="note">${esc(c.unavailable)}</p>`;

    host.innerHTML = `<h3 class="h3">${esc(c.title)}</h3>${body}
      <p class="note mt-2" id="installResult" role="status"></p>`;

    const btn = $('#installBtn');
    if (btn) btn.addEventListener('click', async () => {
      btn.disabled = true;
      const outcome = await Install.prompt();
      $('#installResult').textContent =
        outcome === 'accepted' ? COPY.install.accepted : COPY.install.dismissed;
      // A dismissed prompt cannot be shown again, so the card re-renders
      // to whatever is actually possible now rather than offering a
      // button that would do nothing.
      setTimeout(renderInstall, 2500);
    });
  }

  function showBackupError(msg) {
    $('#backupOk').hidden = true;
    $('#backupError').textContent = msg;
    $('#backupError').hidden = false;
  }

  /* ═══════════ kitchen ═══════════
     Recipes priced through the real resolver, so every card shows a
     range and carries the same provenance a logged meal does. Nothing
     here calls a model and nothing here is ranked by a score. */
  let kitchenTab = 'fit';

  function rangeLine(p) {
    const f = Clinical.fmt;
    const one = (band, label) => (band.low === null || band.low === undefined)
      ? `${label} —`
      : `${label} ${f(band.low)}${band.low === band.high ? '' : '–' + f(band.high)}`;
    return `${one(p.k, 'K')} · ${one(p.p, 'P')} · ${one(p.na, 'Na')} mg`;
  }

  function recipeCard(p, extra) {
    const r = p.recipe;
    return `<article class="card recipe">
      <h3 class="h3">${esc(r.name)}</h3>
      <p class="note">${esc(r.blurb)}</p>
      <p class="recipe__nums">${rangeLine(p)}</p>
      <p class="note">${esc(r.minutes)} min · serves ${esc(r.serves)}${
        p.sodiumIncomplete ? ' · sodium partly unknown' : ''}</p>
      ${extra || ''}
      <details class="srcnote">
        <summary>Ingredients and method</summary>
        <ul class="recipe__list">
          ${p.items.map(i => `<li>${esc(i.name)} — ${esc(i.portion_text)}${
            i._leached ? ' (boiled and drained)' : ''}</li>`).join('')}
        </ul>
        <ol class="recipe__steps">${r.steps.map(st => `<li>${esc(st)}</li>`).join('')}</ol>
        ${r.note ? `<p class="note">${esc(r.note)}</p>` : ''}
        <p class="note">${esc(COPY.kitchen.provenance)}</p>
      </details>
      <button type="button" class="btn btn--secondary" data-cook="${esc(r.id)}">Log this meal</button>
    </article>`;
  }

  function renderKitchen() {
    $$('#scr-kitchen .tabs__btn').forEach(b => {
      const on = b.dataset.kitchen === kitchenTab;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    const host = $('#kitchenBody');

    if (kitchenTab === 'all') {
      host.innerHTML = `<p class="helper">${esc(COPY.kitchen.allLede)}</p>` +
        Plan.all().map(p => recipeCard(p)).join('');
      return;
    }

    if (kitchenTab === 'plan') {
      const plan = Plan.threeDay();
      if (!plan) { host.innerHTML = `<div class="card m-paper"><p class="note">${esc(COPY.kitchen.needTargets)}</p></div>`; return; }
      host.innerHTML = `<p class="helper">${esc(COPY.kitchen.planLede)}</p>` +
        plan.days.map((d, i) => `<section class="card">
          <h2 class="h2">Day ${i + 1}</h2>
          ${d.meals.length ? d.meals.map(m => `<div class="planrow">
            <span class="planrow__slot">${esc(m.slot)}</span>
            <span class="planrow__name">${esc(m.priced.recipe.name)}</span>
            <span class="planrow__nums">${rangeLine(m.priced)}</span>
          </div>`).join('') : `<p class="note">${esc(COPY.kitchen.planThin)}</p>`}
          <p class="note mt-2">Day total, high end: K ${Clinical.fmt(Math.round(d.totals.k))} ·
            P ${Clinical.fmt(Math.round(d.totals.p))} · Na ${Clinical.fmt(Math.round(d.totals.na))} mg
            against ${Clinical.fmt(plan.targets.k)} · ${Clinical.fmt(plan.targets.p)} ·
            ${Clinical.fmt(plan.targets.na)}.</p>
        </section>`).join('') +
        `<div class="card m-paper"><p class="note">${esc(COPY.kitchen.planCaveat)}</p></div>`;
      return;
    }

    if (kitchenTab === 'shop') {
      const g = Plan.grocery();
      host.innerHTML = `<p class="helper">${esc(COPY.kitchen.shopLede)}</p>` +
        Object.keys(g.grouped).map(a => `<section class="card">
          <h2 class="h2">${esc(g.aisles[a].label)}</h2>
          <ul class="shoplist">
            ${g.grouped[a].map(v => `<li>${esc(v.row.food_name)}${
              v.servings === 1 ? '' : ` <span class="note">(${v.servings} servings)</span>`}</li>`).join('')}
          </ul>
        </section>`).join('') +
        `<button type="button" class="btn btn--secondary btn--block" id="shopCopy">Share this list</button>`;
      $('#shopCopy').addEventListener('click', async () => {
        // A shopping list is the most send-able thing in the app: it
        // usually needs to reach whoever is doing the shopping.
        const via = await shareText(Plan.groceryText(),
          'renalroute-shopping-list.txt', 'Shopping list');
        toast(COPY.share[via] || COPY.share.failed);
      });
      return;
    }

    /* "Fits today" — the thesis. Priced against what is actually left,
       using the HIGH end, which is the same conservative reading the
       rings colour themselves by. */
    const s = Plan.suggestions(4);
    if (!s.ready) {
      host.innerHTML = `<div class="card m-paper"><p class="note">${esc(COPY.kitchen.needTargets)}</p></div>`;
      return;
    }
    const roomLine = `K ${Clinical.fmt(s.room.k)} · P ${Clinical.fmt(s.room.p)} · Na ${Clinical.fmt(s.room.na)} mg left`;

    host.innerHTML =
      `<div class="card m-stone">
        <h2 class="h2">Room left today</h2>
        <p class="recipe__nums">${esc(roomLine)}</p>
        <p class="note">${esc(COPY.kitchen.fitLede)}</p>
      </div>` +
      (s.fitting.length
        ? s.fitting.map(p => recipeCard(p)).join('')
        : `<div class="card m-paper"><p class="note">${esc(COPY.kitchen.noneFit)}</p></div>`) +
      (s.overBy.length
        ? `<h2 class="h2">Just out of reach</h2>
           <p class="note">${esc(COPY.kitchen.overLede)}</p>` +
          s.overBy.map(x => recipeCard(x.p,
            `<p class="note recipe__over">${esc(COPY.kitchen.overBy(Math.round(x.over)))}</p>`)).join('')
        : '');
  }

  /* Logging a recipe runs the SAME save path a typed meal does — the
     items are already resolved anchor rows, so nothing here needs its
     own totals arithmetic. */
  function cookRecipe(id) {
    const r = RECIPES.find(x => x.id === id);
    if (!r) return;
    const items = Plan.itemsFor(r);
    if (!items.length) { toast('Those ingredients are missing from the table'); return; }
    const rec = Object.assign({
      meal_text: r.name,
      logged_at: new Date().toISOString(),
      meal_date: Store.todayISO(),
      items,
      confidence: Resolve.confidence(items),
      needs_clarification: false,
      clarification_question: null,
      clarification_status: 'none',
      explanation_text: ''
    }, Resolve.totals(items));

    const saved = Store.addMeal(rec);
    if (!saved) { toast(COPY.mutationFailed); return; }
    if (typeof Motion !== 'undefined') { Motion.haptic('commit'); Motion.chime(!!Store.settings().sound); }
    toastWithUndo(`Logged ${r.name}`, () => { Store.deleteMeal(saved.id); renderKitchen(); });
    renderKitchen();
  }

  /* ═══════════ lab scan ═══════════
     Autofill is the default and confirmation is the exception, gated on
     whether a value would move somebody out of the normal band. See the
     header of js/labscan.js for why that is the right place to spend
     the user's attention.

     The extracted numbers live only in this closure until saved. A
     photograph of a lab report is the most sensitive thing this app
     ever handles, and it is never written to storage in any form. */
  let vitalsPicked = [];
  let scanRows = null;
  let scanConfirmed = [];

  async function analyzeLabPhoto(file) {
    $('#labScanError').hidden = true;
    $('#labScanReview').hidden = true;
    $('#labPhotoBtn').disabled = true;

    let shot;
    try {
      shot = await downscale(file);
    } catch (e) {
      $('#labPhotoBtn').disabled = false;
      showLabScanError(COPY.labScan.unreadable);
      return;
    }

    if (typeof Motion !== 'undefined') {
      $('#labScanArt').innerHTML = Motion.loaderHtml(COPY.labScan.reading);
    }
    $('#labScanStatus').textContent = COPY.labScan.reading;
    $('#labScanPending').hidden = false;

    try {
      const { data } = await LLM.extractLab({ media_type: 'image/jpeg', data: shot.base64 });
      $('#labScanPending').hidden = true;
      $('#labPhotoBtn').disabled = false;

      if (!data.readable) { showLabScanError(COPY.labScan.unreadable); return; }

      scanRows = LabScan.review({
        k: data.potassium, p: data.phosphorus, egfr: data.egfr
      });
      scanConfirmed = [];

      if (!scanRows.some(r => r.found)) { showLabScanError(COPY.labScan.nothingFound); return; }

      /* A unit the app does not expect is reported, never converted.
         Phosphorus in mmol/L differs from mg/dL by roughly 3.2x, and
         silently converting somebody's report would be inventing a
         number they can no longer check against the page in front of
         them. */
      const oddUnit = (data.phosphorus_unit && !/mg\s*\/\s*dl/i.test(data.phosphorus_unit))
        ? data.phosphorus_unit : null;

      renderLabScanReview(data.lab_date, oddUnit);
    } catch (e) {
      $('#labScanPending').hidden = true;
      $('#labPhotoBtn').disabled = false;
      showLabScanError(COPY.labScan.failed);
    }
  }

  function showLabScanError(msg) {
    $('#labScanError').textContent = msg;
    $('#labScanError').hidden = false;
  }

  function renderLabScanReview(labDate, oddUnit) {
    const host = $('#labScanReview');
    host.hidden = false;

    const rows = scanRows.map(r => {
      if (!r.found) {
        return `<div class="scanrow scanrow--absent">
          <span class="scanrow__label">${esc(r.field.label)}</span>
          <span class="note">${esc(COPY.labScan.notOnReport)}</span>
        </div>`;
      }
      if (!r.valid) {
        return `<div class="scanrow scanrow--bad">
          <span class="scanrow__label">${esc(r.field.label)}</span>
          <span class="scanrow__value">${esc(String(r.value))} ${esc(r.field.unit)}</span>
          <p class="inline-error">${esc(r.error)}</p>
        </div>`;
      }
      const done = scanConfirmed.indexOf(r.field.key) !== -1;
      return `<div class="scanrow${r.confirm && !done ? ' scanrow--gate' : ''}">
        <span class="scanrow__label">${esc(r.field.label)}</span>
        <span class="scanrow__value">${esc(String(r.value))} ${esc(r.field.unit)}</span>
        ${r.confirm ? (done
          ? `<p class="note scanrow__ok">${esc(COPY.labScan.confirmed)}</p>`
          : `<p class="note">${esc(COPY.labScan.gate(r.value, r.confirm.consequence))}</p>
             <button type="button" class="btn btn--secondary" data-scanok="${esc(r.field.key)}">${esc(COPY.labScan.gateButton)}</button>`)
          : ''}
      </div>`;
    }).join('');

    const ready = LabScan.ready(scanRows, scanConfirmed);
    host.innerHTML = `
      <h3 class="h3">${esc(COPY.labScan.readTitle)}</h3>
      <p class="note">${esc(COPY.labScan.readBody)}</p>
      ${oddUnit ? `<p class="inline-error">${esc(COPY.labScan.oddUnit(oddUnit))}</p>` : ''}
      ${rows}
      ${labDate ? `<p class="note">${esc(COPY.labScan.dated(labDate))}</p>` : ''}
      <button type="button" class="btn btn--primary btn--block" id="labScanSave" ${ready ? '' : 'disabled'}>
        ${esc(ready ? COPY.labScan.save : COPY.labScan.saveBlocked)}
      </button>`;

    $('#labScanSave').addEventListener('click', () => saveScannedLab(labDate));
  }

  function saveScannedLab(labDate) {
    if (!scanRows || !LabScan.ready(scanRows, scanConfirmed)) return;
    const vals = { lab_date: labDate || Store.todayISO() };
    scanRows.forEach(r => { if (r.found && r.valid) vals[r.field.key] = Number(r.value); });
    Store.addLab(vals);
    scanRows = null; scanConfirmed = [];
    $('#labScanReview').hidden = true;
    toast('Lab values saved');
    renderLabs();
  }

  /* ═══════════ demo entrance ═══════════
     Three doors, no password. The security note this needs is that it
     guards nothing — every door leads to the same local app with
     fictional data, so there is no privilege to escalate and no other
     user's record to reach. The copy says exactly that on screen. */
  function renderDemo() {
    const c = COPY.demo;
    $('#demoTitle').textContent = c.title;
    $('#demoLede').textContent = c.lede;
    $('#demoNote').textContent = c.note;
    $('#demoChoices').innerHTML = c.choices.map(ch =>
      `<button type="button" class="hub__card m-stone demo__card" data-demo="${esc(ch.key)}">
        <span class="hub__name">${esc(ch.name)}</span>
        <span class="hub__what">${esc(ch.what)}</span>
      </button>`).join('');
    $('#demoModal').hidden = false;
    const first = $('#demoChoices .demo__card');
    if (first) first.focus();
  }

  function enterDemo(kind) {
    /* The one safeguard that genuinely matters: a demo must never
       overwrite somebody's real history. A test account that eats a
       patient's year of meals is a data-loss bug wearing a costume. */
    if (kind !== 'fresh' && DemoAuth.wouldDestroyRealData()) {
      $('#demoError').textContent = COPY.demo.hasRealData;
      $('#demoError').hidden = false;
      return;
    }
    $('#demoError').hidden = true;
    $('#demoModal').hidden = true;

    if (kind === 'fresh') { renderConsent(); return; }

    const res = DemoAuth.signIn(DemoAuth.USER, DemoAuth.PASS, kind);
    if (!res.ok) {
      $('#demoModal').hidden = false;
      $('#demoError').textContent = COPY.demo.hasRealData;
      $('#demoError').hidden = false;
      return;
    }
    if (kind === 'maria') Seed.runFull();
    Store.acceptConsent();
    Store.setSetting('refusalsSeen', true);
    $('#app').hidden = false;
    renderDemoBanner();
    go('home');
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

  /* ═══════════ vitals ═══════════
     Recorded, never interpreted. Every rendering decision here follows
     from that: the history is a flat list with no comparison to the
     previous entry, no arrow, and no colour. */
  function renderVitals() {
    const host = $('#vitSymptoms');
    if (!host) return;
    $('#vitalsIntro').textContent = COPY.vitals.intro;

    const picked = vitalsPicked;
    host.innerHTML = Vitals.SYMPTOMS.map(sy =>
      `<button type="button" class="chip-opt${picked.includes(sy.key) ? ' is-on' : ''}"
        aria-pressed="${picked.includes(sy.key)}" data-symptom="${esc(sy.key)}">${esc(sy.label)}</button>`
    ).join('');

    const rows = Vitals.recent(8);
    $('#vitalsHistory').innerHTML = rows.length
      ? `<div class="card m-paper">
           <h3 class="h3">${esc(COPY.vitals.historyTitle)}</h3>
           ${rows.map(r => `<div class="vitrow">
             <span class="vitrow__line">${esc(vitalLine(r))}</span>
             <button type="button" class="linkbtn" data-vitdel="${esc(r.id)}">${esc(COPY.vitals.remove)}</button>
           </div>`).join('')}
         </div>`
      : `<div class="card m-paper"><p class="note">${esc(COPY.vitals.empty)}</p></div>`;
  }

  /* One flat line per entry. No trend, no delta, no verdict — weight
     change in CKD can be fluid, muscle or diet, and telling those apart
     is the entire skill. An arrow pointing up would mean nothing. */
  function vitalLine(r) {
    const bits = [];
    if (r.weight_kg !== null) bits.push(`${r.weight_kg} kg`);
    if (r.systolic !== null) bits.push(`${r.systolic}/${r.diastolic} mmHg`);
    if (r.symptoms.length) bits.push(r.symptoms.map(Vitals.symptomLabel).join(', '));
    if (r.note.trim()) bits.push(r.note.trim());
    return `${r.date} — ${bits.join(' · ')}`;
  }

  function saveVitals() {
    const res = Vitals.add({
      weight_kg: $('#vitWeight').value,
      systolic: $('#vitSys').value,
      diastolic: $('#vitDia').value,
      symptoms: vitalsPicked,
      note: $('#vitNote').value
    });
    if (!res.ok) {
      $('#vitOk').hidden = true;
      showResultError('#vitalsForm', '#vitError', res);
      return;
    }
    /* The write is checked before anything claims it worked. This
       path used to print "Recorded." unconditionally, which in private
       browsing was simply false. */
    if (!saved(Store.storageState() === null)) {
      $('#vitOk').hidden = true;
      $('#vitError').textContent = COPY.storage[Store.storageState() || 'unavailable'];
      $('#vitError').hidden = false;
      return;
    }
    $('#vitError').hidden = true;
    clearFieldErrors('#vitalsForm');
    $('#vitOk').textContent = COPY.vitals.saved;
    $('#vitOk').hidden = false;
    ['#vitWeight', '#vitSys', '#vitDia', '#vitNote'].forEach(sel => { $(sel).value = ''; });
    vitalsPicked = [];
    if (typeof Motion !== 'undefined') Motion.haptic('commit');
    renderVitals();
  }

  /* ═══════════ appointments ═══════════ */
  function renderAppointments() {
    const host = $('#apptList');
    if (!host) return;
    $('#apptIntro').textContent = COPY.appts.intro;
    $('#apptQNote').textContent = COPY.appts.qNote;

    const rows = Vitals.appointments();
    const next = Vitals.nextAppointment();
    const today = Store.todayISO();

    const nextLine = next
      ? `<p class="appt__next">${esc(COPY.appts.next(Vitals.daysUntil(next.date), next.who))}</p>`
      : `<p class="note">${esc(COPY.appts.none)}</p>`;

    host.innerHTML = `<div class="card m-paper">
      <h3 class="h3">${esc(COPY.appts.listTitle)}</h3>
      ${nextLine}
      ${rows.map(a => `<div class="appt${a.date < today ? ' appt--past' : ''}">
        <div>
          <span class="appt__date">${esc(a.date)}</span>
          ${a.who ? `<span class="appt__who">${esc(a.who)}</span>` : ''}
          ${a.questions ? `<p class="note appt__q">${esc(a.questions)}</p>` : ''}
        </div>
        <button type="button" class="linkbtn" data-aptdel="${esc(a.id)}">${esc(COPY.appts.remove)}</button>
      </div>`).join('')}
    </div>`;
  }

  function saveAppointment() {
    const res = Vitals.addAppointment({
      date: $('#apptDate').value,
      who: $('#apptWho').value,
      questions: $('#apptQuestions').value
    });
    if (!res.ok) {
      showResultError('#apptForm', '#apptError', res);
      return;
    }
    if (!saved(Store.storageState() === null)) {
      $('#apptError').textContent = COPY.storage[Store.storageState() || 'unavailable'];
      $('#apptError').hidden = false;
      return;                                     // and the typed values stay put
    }
    $('#apptError').hidden = true;
    clearFieldErrors('#apptForm');
    ['#apptDate', '#apptWho', '#apptQuestions'].forEach(sel => { $(sel).value = ''; });
    toast(COPY.appts.saved);
    renderAppointments();
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
  /* ═══════════ what is out of date ═══════════
     Rendered from Checklist.rows(), which produces facts. Everything
     the tone rules forbid is absent by construction: there is no
     fraction to print, no streak to break, and the only tones in the
     markup are neutral and amber. See js/checklist.js.

     Rows are BUTTONS because every one of them has somewhere useful to
     go — a row that reports a stale lab and cannot take you to the lab
     screen is a complaint. */
  function renderChecklist() {
    const host = $('#checklistCard');
    if (!host || typeof Checklist === 'undefined') return;

    const rows = Checklist.rows();
    const summary = Checklist.summary();

    host.hidden = false;
    host.innerHTML = `<div class="card m-paper">
      <h2 class="h3">${esc(COPY.checklist.title)}</h2>
      <p class="note">${esc(summary || COPY.checklist.allCurrent)}</p>
      <ul class="chk">
        ${rows.map(r => `<li class="chk__row chk__row--${esc(r.state)}">
          <button type="button" class="chk__btn" data-nav="${esc(r.nav || 'home')}">
            <span class="chk__mark" aria-hidden="true">${r.state === 'current' ? '✓' : '·'}</span>
            <span class="chk__text">
              <span class="chk__label">${esc(r.label)}</span>
              <span class="chk__detail">${esc(r.detail)}</span>
            </span>
          </button>
        </li>`).join('')}
      </ul>
      <p class="note note--src">${esc(COPY.checklist.foot)}</p>
    </div>`;
  }

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

  /* One line serves both "looking it up…" and "that isn't a barcode",
     so it stays a polite status region — an assertive one would
     interrupt a screen-reader user mid-sentence on every lookup. What
     changes is the FIELD: a typing mistake marks the input invalid, so
     the fault is visibly attached to the box that holds it rather than
     floating below the card. A lookup that simply found nothing is not
     the user's mistake and never marks the field. */
  function barcodeStatus(msg, isUserError) {
    $('#barcodeStatus').textContent = msg || '';
    const input = $('#barcodeInput');
    const field = input && input.closest('.field');
    if (!input || !field) return;
    field.classList.toggle('is-invalid', !!isUserError);
    if (isUserError) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  async function lookupBarcode(code) {
    const clean = String(code || '').replace(/\D/g, '');
    if (!/^[0-9]{8,14}$/.test(clean)) {
      barcodeStatus(COPY.barcode.invalid, true);
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
    wireHistory();
    /* Wired before anything else can write, and probed immediately, so
       somebody is told BEFORE they type a meal into a browser that will
       not keep it rather than after. */
    Store.onStorageFail(renderStorageBanner);
    $('#demoSignOut').addEventListener('click', leaveDemo);
    if (!Store.storageWorks()) renderStorageBanner(Store.storageState());
    $('#consentAccept').addEventListener('click', acceptConsent);

    $('#devBannerClose').addEventListener('click', () => {
      $('#devBanner').hidden = true; Store.setSetting('devBannerHidden', true);
    });

    // Global delegated clicks
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-nav],[data-learn],[data-meal],[data-edit-meal],' +
        '[data-delete-meal],[data-remove-item],[data-step-item],[data-pick],[data-unpick],[data-scene],[data-onb],[data-scanok],[data-kitchen],[data-cook],[data-lang],[data-symptom],[data-vitdel],[data-aptdel],[data-demo],' +
        '[data-del-lab],[data-repeat],[data-leach],[data-scenetoggle],[data-foodsort]');
      if (!el) return;

      if (el.dataset.nav) { go(el.dataset.nav); return; }
      if (el.dataset.learn) { showLearn(el.dataset.learn); return; }
      if (el.dataset.lang) {
        /* Re-render the screen that is open rather than reloading. A
           full reload would lose a half-typed meal, and losing somebody's
           work because they changed language is not a trade worth making.

           Renders twice now that tables are fetched on demand: once
           immediately so the tap is never dead, and again when the file
           lands. On a second visit the table is cached and both happen
           in the same frame. */
        I18N.set(el.dataset.lang, () => { renderSettings(); });
        renderSettings();
        toast(COPY.lang.changed);
        return;
      }
      if (el.dataset.kitchen) { kitchenTab = el.dataset.kitchen; renderKitchen(); return; }
      if (el.dataset.cook) { cookRecipe(el.dataset.cook); return; }
      if (el.dataset.demo) { enterDemo(el.dataset.demo); return; }
      if (el.dataset.symptom) {
        const k = el.dataset.symptom;
        vitalsPicked = vitalsPicked.includes(k)
          ? vitalsPicked.filter(x => x !== k) : vitalsPicked.concat(k);
        el.classList.toggle('is-on', vitalsPicked.includes(k));
        el.setAttribute('aria-pressed', String(vitalsPicked.includes(k)));
        return;
      }
      if (el.dataset.vitdel) { Vitals.remove(el.dataset.vitdel); renderVitals(); return; }
      if (el.dataset.aptdel) { Vitals.removeAppointment(el.dataset.aptdel); renderAppointments(); return; }
      if (el.dataset.scanok) {
        // One tap, one field. Confirming a boundary-crossing reading
        // never confirms any other.
        if (scanConfirmed.indexOf(el.dataset.scanok) === -1) scanConfirmed.push(el.dataset.scanok);
        renderLabScanReview(null, null);
        return;
      }
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
      if (el.dataset.foodsort) { foodsSort = el.dataset.foodsort; renderFoods(); return; }
      if (el.dataset.scenetoggle) {
        scenesOpen = !scenesOpen;
        renderScenePicker();
        // Focus follows the control that was just pressed, which the
        // re-render replaced. Without this a keyboard user is dropped
        // back at the top of the document on every toggle.
        const again = $('[data-scenetoggle]');
        if (again) { try { again.focus(); } catch (e) { } }
        return;
      }
      if (el.dataset.scene) {
        const s = Scenes.set(el.dataset.scene);
        // Choosing one answers the question the picker asked, so it
        // closes behind you rather than sitting open over the rings.
        scenesOpen = false;
        renderHome();
        // Landing you where the scene is for. Picking "At the store"
        // and then having to find the label checker yourself would be
        // the scene doing nothing but changing a label.
        if (s.opens && s.opens !== 'home') go(s.opens);
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
    $('#seedFullBtn').addEventListener('click', () => {
      Seed.runFull(); toast('Full example loaded'); go('home');
    });
    $('#seedBtn').addEventListener('click', () => {
      Seed.run(); toast('Demo persona seeded'); go('home');
    });
    $('#resetBtn').addEventListener('click', () => {
      Store.reset(); location.reload();
    });

    $('#printPageBtn').addEventListener('click', () => {
      renderPrintHead();
      try { window.print(); } catch (err) { toast('Printing unavailable here'); }
    });
    $('#exportSummaryBtn').addEventListener('click', async () => {
      if (!Store.meals().length) { toast('Nothing logged yet to summarise'); return; }
      const via = await shareText(Exporter.summaryText(), 'renalroute-summary.txt',
        'RenalRoute food summary');
      toast(COPY.share[via] || COPY.share.failed);
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
    /* The reference-build controls exist only inside a demo session.
       An ArgosX scan rated their public exposure HIGH: a data-reset
       button anybody could reach is a destructive action with no gate
       on it. Checked at render rather than hidden with CSS, so the
       markup is never populated for an ordinary visitor. */
    const dev = $('#devControls');
    if (dev) dev.hidden = !(typeof DemoAuth !== 'undefined' && DemoAuth.isActive());

    renderInstall();

    /* ── Language ──
       Native names, not English ones: somebody looking for Hindi is
       looking for हिन्दी. Coverage is stated per language because a
       partly-translated app that presents itself as finished is the
       kind of thing people discover mid-sentence. */
    const cur = I18N.current();
    $('#langPicker').innerHTML = I18N.LANGUAGES.map(l => {
      const on = l.code === cur;
      const cov = I18N.coverage(l.code);
      return `<button type="button" class="chip-opt${on ? ' is-on' : ''}"
        role="radio" aria-checked="${on}" data-lang="${l.code}" lang="${l.code}">
        ${esc(l.native)}${cov.known && l.code !== 'en' ? ` <span class="note">${cov.pct}%</span>` : ''}
      </button>`;
    }).join('');
    $('#langNote').textContent = cur === 'en' ? COPY.lang.englishNote : COPY.lang.machineNote;

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

    /* The food list. Search re-renders as you type — the table is small
       enough that debouncing would add latency rather than remove it. */
    $('#foodsBack').addEventListener('click', () => go(lastScreen));
    $('#foodsSearch').addEventListener('input', renderFoods);
    $('#foodsPricedOnly').addEventListener('change', (e) => {
      foodsPricedOnly = e.target.checked;
      renderFoods();
    });
    $('#vitSave').addEventListener('click', saveVitals);
    $('#apptSave').addEventListener('click', saveAppointment);
    $('#kitchenBack').addEventListener('click', () => go(lastScreen));

    /* ── Quick actions ──
       Expanded state is on the toggle's aria-expanded, so the markup
       and the behaviour cannot drift apart. Escape closes it and
       returns focus, the same contract the delete dialog follows. */
    $('#fabToggle').addEventListener('click', () => toggleFab());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $('#fabToggle').getAttribute('aria-expanded') === 'true') {
        toggleFab(false);
        $('#fabToggle').focus();
      }
    });
    // Tapping anywhere else closes it — an expanded menu that survives
    // the next tap is a menu people close by navigating away from.
    document.addEventListener('click', (e) => {
      if (!$('#fab').contains(e.target) &&
          $('#fabToggle').getAttribute('aria-expanded') === 'true') toggleFab(false);
    });

    /* ── Backup and restore ──
       Restore is destructive by definition, so it goes behind the same
       confirmation the delete-everything action uses. The validation
       runs BEFORE the confirmation, so nobody is asked to confirm
       overwriting their history with a file that was never going to
       load. */
    $('#backupSaveBtn').addEventListener('click', () => {
      Exporter.download(Backup.filename(), Backup.text(), 'application/json');
      toast('Backup saved');
    });
    $('#backupLoadBtn').addEventListener('click', () => $('#backupFileInput').click());
    $('#backupFileInput').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      const reader = new FileReader();
      reader.onerror = () => showBackupError("That file couldn't be read.");
      reader.onload = () => {
        const raw = String(reader.result || '');
        const check = Backup.parse(raw);
        if (!check.ok) { showBackupError(check.reason); return; }
        if (!window.confirm(COPY.backup.confirm)) return;
        const done = Backup.restore(raw);
        if (!done.ok) { showBackupError(done.reason); return; }
        $('#backupError').hidden = true;
        $('#backupOk').textContent = COPY.backup.restored(done.summary.meals, done.summary.labs);
        $('#backupOk').hidden = false;
        renderSettings();
        toast('Backup restored');
      };
      reader.readAsText(f);
    });

    /* Lab scan. The file input is visually hidden and driven by the
       button, so the control is a real 44px target rather than a
       browser-styled file picker. */
    $('#labPhotoBtn').addEventListener('click', () => $('#labPhotoInput').click());
    $('#labPhotoInput').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) analyzeLabPhoto(f);
      e.target.value = '';        // same file twice must re-trigger
    });
    $('#refusalsGo').addEventListener('click', dismissRefusals);
    $('#passportFields').addEventListener('input', (e) => {
      const key = e.target && e.target.dataset && e.target.dataset.pp;
      if (!key) return;
      Passport.set(key, e.target.value);
      // Saves as you type, so a silent failure here loses the most and
      // is noticed the least.
      saved(Store.storageState() === null);
    });
    $('#passportCopy').addEventListener('click', async () => {
      /* Share first, because the passport is the thing people most want
         to hand to somebody else — a partner, a daughter, the clinic.
         Copy and download remain, in that order, so no platform is a
         dead end. */
      const via = await shareText(Passport.asText(), 'renalroute-passport.txt',
        'My health passport');
      toast(COPY.share[via] || COPY.share.failed);
    });
    $('#passportPrint').addEventListener('click', () => {
      // The print stylesheet already strips chrome; the screen prints
      // as the card it is. Paper in a wallet outlives every app.
      try { window.print(); } catch (err) { toast('Printing unavailable here'); }
    });

    /* beforeprint rather than only on the button, so Ctrl+P and the
       browser menu produce the same page. A masthead that appears only
       when you use the app's own button is a masthead most printouts
       will not have. */
    window.addEventListener('beforeprint', renderPrintHead);
    renderPrintHead();
    $('#learnBack').addEventListener('click', () => go(lastScreen));
    $('#learnDismiss').addEventListener('click', () => go(lastScreen));
  }

  return { wire, go, render, wireHistory, SCREENS, renderStorageBanner, renderDemoBanner, leaveDemo, renderConsent, renderOnboarding, renderHome, renderRefusals, renderDemo,
           renderReferences, renderKitchen, renderSettings, renderInstall,
           /* Exported so tests count the dashboard's cards from the app's own
              slot map rather than a literal. A hand-typed count is the same
              drift class that left three test harnesses loading an asset list
              the app had outgrown. */
           CARD_SLOTS,
           toast, esc, searchFoods };
})();
