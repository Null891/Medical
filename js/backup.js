/* ═══════════════════════════════════════════════════════════════
   BACKUP — the price of having no account.
   ───────────────────────────────────────────────────────────────
   RenalRoute has never had a login and never will. That is a real
   feature: no signup wall, no password to forget, no server holding
   somebody's lab values, and nothing to breach. It is also, unmanaged,
   a quiet way to lose people's data — clear the browser, switch
   phones, or open the app in a different browser, and a year of meals
   is simply gone.

   Both halves of that have to be true at once, so:

     · The no-account promise is STATED, not merely implemented. An
       app that happens not to ask for a password reads as unfinished;
       one that says "no account, ever, and nothing leaves this device"
       reads as a decision. Same behaviour, different product.

     · A full export and import exists, so leaving is possible. One
       file, everything in it, restorable anywhere.

   WHY VALIDATION MATTERS MORE THAN IT LOOKS. An import writes directly
   over somebody's entire history, and the file may have been edited,
   truncated by a failed download, or be a completely different JSON
   file with the same extension. A half-applied import — profile
   restored, meals lost — would be worse than a refused one, because
   the user would not know which half survived.

   So the import is all-or-nothing: the shape is validated in full
   BEFORE anything is written, and a file that fails is rejected with a
   reason rather than partially applied. There is no state in which
   this function half-succeeds.
   ═══════════════════════════════════════════════════════════════ */

const Backup = (() => {

  const FORMAT = 'renalroute-backup';
  const VERSION = 1;

  /* Everything the app knows. Deliberately the whole store rather than
     a curated subset: a backup that silently omits something is a
     backup somebody discovers is incomplete at the worst moment. */
  function build() {
    const db = Store.exportAll();
    return {
      format: FORMAT,
      version: VERSION,
      exported_at: new Date().toISOString(),
      app: 'RenalRoute',
      note: 'Your own data, from a device with no account. Import it back into RenalRoute on any device. Nutrient figures are estimated ranges from an educational reference table, not measurements.',
      data: db
    };
  }

  const text = () => JSON.stringify(build(), null, 2);

  function filename() {
    return `renalroute-backup-${Store.todayISO()}.json`;
  }

  /* ── Validation ──
     Returns { ok, reason }. Every failure names what was wrong in words
     a person can act on, because "invalid file" tells somebody holding
     the only copy of their data precisely nothing. */
  function validate(parsed) {
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, reason: "That file isn't readable as data. Check you picked the right one." };
    }
    if (parsed.format !== FORMAT) {
      return { ok: false, reason: "That isn't a RenalRoute backup. It may be a file from another app." };
    }
    if (typeof parsed.version !== 'number' || parsed.version > VERSION) {
      return { ok: false, reason: 'That backup was made by a newer version of RenalRoute than this one. Update the app first.' };
    }
    const d = parsed.data;
    if (!d || typeof d !== 'object') {
      return { ok: false, reason: 'That backup is missing its contents — it may have downloaded incompletely.' };
    }
    // The three collections must be arrays. A truncated download very
    // often leaves one of them undefined, which would restore an empty
    // history over a full one without complaining.
    /* The key names are the store's own — see Store.blank(): identity,
       profiles, labs, meals, settings. An earlier draft of this
       validator checked for a "profile" singular that does not exist in
       the schema, and so rejected every genuine backup. The round-trip
       test caught it on the first run, which is precisely what a
       round-trip test is for: a validator nobody exercised against a
       real file is a guess about a format. */
    for (const key of ['meals', 'labs', 'profiles']) {
      if (!Array.isArray(d[key])) {
        return { ok: false, reason: `That backup is missing its ${key} — it looks incomplete rather than empty.` };
      }
    }
    if (!d.settings || typeof d.settings !== 'object') {
      return { ok: false, reason: 'That backup is missing its settings section.' };
    }
    return { ok: true, reason: null };
  }

  function parse(raw) {
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) { return { ok: false, reason: "That file isn't valid JSON. It may have been edited or truncated." }; }
    return validate(parsed);
  }

  /* Restores only after validating in full. Nothing is written on a
     failure, so a rejected import leaves the existing data exactly as
     it was. */
  function restore(raw) {
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) {
      return { ok: false, reason: "That file isn't valid JSON. It may have been edited or truncated." };
    }
    const check = validate(parsed);
    if (!check.ok) return check;

    Store.replaceAll(parsed.data);
    const d = parsed.data;
    return {
      ok: true,
      reason: null,
      summary: {
        meals: d.meals.length,
        labs: d.labs.length,
        exported_at: parsed.exported_at || null
      }
    };
  }

  return { FORMAT, VERSION, build, text, filename, validate, parse, restore };
})();
