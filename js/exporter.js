/* ═══════════════════════════════════════════════════════════════
   EXPORT — your data leaves in a form you can actually use.

   Two shapes, because two different people read them.

   The SUMMARY is for a clinic appointment. "Bring your food diary" is
   advice patients get constantly and almost nobody can act on, because
   what they have is an app they would have to hand over and scroll
   through in front of someone whose time is measured in minutes. A page
   of plain text with the week on it is something you can print, paste
   into an email, or read aloud.

   The CSV is for the person who wants their own numbers back — the
   principle being that data someone entered by hand should never be
   trapped in the app that collected it.

   Both state, in the file itself, that the figures are ranges from an
   educational reference table rather than measurements. A number that
   leaves the app loses the interface that framed it, so the framing has
   to travel with it.
   ═══════════════════════════════════════════════════════════════ */

const Exporter = (() => {

  const DAYS = 7;

  function fmtDate(iso) {
    return new Date(iso + 'T00:00:00')
      .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  const n = (v) => Clinical.fmt(v);

  /* ── Readable summary for a care-team conversation ── */
  function summaryText() {
    const p = Store.profile();
    const t = Store.targets();
    const lines = [];

    lines.push('RENALROUTE — FOOD SUMMARY');
    if (p.display_name) lines.push(`For: ${p.display_name}`);
    lines.push(`Generated: ${new Date().toLocaleDateString('en-US',
      { year: 'numeric', month: 'long', day: 'numeric' })}`);
    lines.push('');

    // Provenance travels with the numbers. A target means something very
    // different depending on who set it, and that distinction is exactly
    // what a dietitian will want to know first.
    const src = p.budget_source === 'care_team' ? 'set with care team'
              : p.budget_source === 'education_default' ? 'general education ranges, NOT prescribed'
              : 'no targets set';
    lines.push(`DAILY TARGETS (${src})`);
    lines.push(t.k  ? `  Potassium:  ${n(t.k)} mg`  : '  Potassium:  not set');
    lines.push(t.p  ? `  Phosphorus: ${n(t.p)} mg`  : '  Phosphorus: not set');
    lines.push(t.na ? `  Sodium:     ${n(t.na)} mg` : '  Sodium:     not set');
    lines.push('');

    const labs = Store.labs();
    if (labs.length) {
      const l = labs[0];
      lines.push('MOST RECENT LAB VALUES (self-entered)');
      if (l.serum_potassium_meq_l  != null) lines.push(`  Potassium:  ${l.serum_potassium_meq_l} mEq/L`);
      if (l.serum_phosphorus_mg_dl != null) lines.push(`  Phosphorus: ${l.serum_phosphorus_mg_dl} mg/dL`);
      if (l.egfr_ml_min_1_73m2     != null) lines.push(`  eGFR:       ${l.egfr_ml_min_1_73m2} mL/min/1.73m²`);
      lines.push(`  Dated:      ${l.lab_date}`);
      lines.push('');
    }

    lines.push(`LAST ${DAYS} DAYS`);
    lines.push('Each figure is a low–high range, not a single measurement.');
    lines.push('');
    for (let i = DAYS - 1; i >= 0; i--) {
      const iso = Store.daysAgoISO(i);
      const d = Store.dayTotals(iso);
      if (!d.mealCount) { lines.push(`${fmtDate(iso).padEnd(14)}  nothing logged`); continue; }
      lines.push(
        `${fmtDate(iso).padEnd(14)}  ` +
        `K ${(n(d.k.low) + '–' + n(d.k.high)).padEnd(13)} ` +
        `P ${(n(d.p.low) + '–' + n(d.p.high)).padEnd(11)} ` +
        `Na ${(n(d.na.low) + '–' + n(d.na.high)).padEnd(13)} ` +
        `${d.mealCount} meal${d.mealCount === 1 ? '' : 's'}` +
        (d.uncountedMeals ? `, ${d.uncountedMeals} not counted` : '') +
        (d.sodiumIncomplete ? ' (sodium partial)' : '')
      );
    }
    lines.push('');
    lines.push('ABOUT THESE NUMBERS');
    lines.push('RenalRoute is an educational wellness tool, not a medical device.');
    lines.push('Figures come from a curated reference table of published food values');
    lines.push('and are shown as ranges because they are estimates. Items the app');
    lines.push('could not identify are logged but excluded from totals rather than');
    lines.push('guessed at. Lab values above were typed in by the patient.');

    return lines.join('\n');
  }

  /* ── CSV: one row per logged item ── */
  function csv() {
    const esc = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      // Guard the spreadsheet-formula injection case: a cell starting
      // with = + - or @ is executed by Excel and Sheets on open, and
      // meal text is user-supplied.
      const safe = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
      return `"${safe.replace(/"/g, '""')}"`;
    };

    const rows = [[
      'meal_date', 'logged_at', 'meal_text', 'item', 'portion', 'source',
      'potassium_low_mg', 'potassium_high_mg',
      'phosphorus_low_mg', 'phosphorus_high_mg',
      'sodium_low_mg', 'sodium_high_mg', 'meal_confidence'
    ].map(esc).join(',')];

    Store.meals().slice().sort((a, b) => a.logged_at < b.logged_at ? -1 : 1)
      .forEach(m => {
        (m.items || []).forEach(i => {
          rows.push([
            m.meal_date, m.logged_at, m.meal_text, i.name, i.portion_text, i.source,
            i.potassium_low_mg, i.potassium_high_mg,
            i.phosphorus_low_mg, i.phosphorus_high_mg,
            i.sodium_low_mg, i.sodium_high_mg, m.confidence
          ].map(esc).join(','));
        });
      });

    return rows.join('\r\n');
  }

  /* Download without leaving the page or touching a server. Guarded
     because a headless DOM has no object URLs and this must not be the
     thing that breaks a test run. */
  function download(filename, text, mime) {
    if (typeof URL === 'undefined' || !URL.createObjectURL) return false;
    const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  }

  const stamp = () => Store.todayISO();

  return {
    summaryText, csv, download,
    downloadSummary: () => download(`renalroute-summary-${stamp()}.txt`, summaryText(), 'text/plain'),
    downloadCsv: () => download(`renalroute-data-${stamp()}.csv`, csv(), 'text/csv')
  };
})();
