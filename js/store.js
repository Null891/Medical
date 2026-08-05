/* ═══════════════════════════════════════════════════════════════
   STORE — the four entities, persisted to localStorage.
   ───────────────────────────────────────────────────────────────
   Entities are exactly the four in the plan: UserProfile, LabEntry,
   MealLog, AnchorFood. AnchorFood is shipped read-only in code rather
   than stored, mirroring its admin-write-only rule.

   OWNERSHIP MODEL
   Base44 enforces `created_by == {{user.email}}` server-side. A browser
   app cannot enforce anything server-side, so this is a FAITHFUL MIRROR,
   not a security control: every record is stamped with created_by, and
   every read filters on the current identity. That makes the two builds
   behave identically and lets you test the cross-account case by
   switching identity in the dev panel — but understand clearly that in
   this build the boundary is a convention, whereas in Base44 it is a
   rule. Never put real patient data in this build.

   DAY TOTALS ARE NEVER STORED. They are summed at render time from
   MealLog records, because editing or deleting a past meal must move
   the rings immediately and any persisted total would go stale.
   ═══════════════════════════════════════════════════════════════ */

const Store = (() => {

  const KEY = 'renalroute.v1';
  const DEFAULT_USER = 'frank@example.test';

  const blank = () => ({
    identity: DEFAULT_USER,
    profiles: [],
    labs: [],
    meals: [],
    settings: { demoMode: true, devBannerHidden: false, llmCalls: 0 }
  });

  let db = blank();

  /* ── persistence ── */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        db = Object.assign(blank(), parsed);
        db.settings = Object.assign(blank().settings, parsed.settings || {});
      }
    } catch (e) {
      console.warn('Store: could not read saved data, starting fresh.', e);
      db = blank();
    }
    return db;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Store: save failed', e);
      return false;
    }
    return true;
  }

  const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const me = () => db.identity;
  const mine = (rows) => rows.filter(r => r.created_by === me());

  /* ── date helpers: local calendar day, not UTC ── */
  function todayISO(d) {
    const t = d ? new Date(d) : new Date();
    const off = t.getTimezoneOffset() * 60000;
    return new Date(t.getTime() - off).toISOString().slice(0, 10);
  }
  function daysAgoISO(n) {
    const t = new Date();
    t.setDate(t.getDate() - n);
    return todayISO(t);
  }
  function daysBetween(isoA, isoB) {
    const a = new Date(isoA + 'T00:00:00');
    const b = new Date(isoB + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  /* ═══════════ UserProfile — one per identity ═══════════ */

  function profile() {
    let p = mine(db.profiles)[0];
    if (!p) {
      // Singleton enforcement is app logic; a rules engine cannot express
      // uniqueness. Find-or-create, never blind-create.
      p = {
        id: uid('prof'),
        created_by: me(),
        display_name: '',
        ckd_stage: 'not_sure',
        budget_source: 'none',          // care_team | education_default | none
        potassium_budget_mg: null,      // NOTHING is pre-filled. Ever.
        phosphorus_budget_mg: null,
        sodium_budget_mg: null,
        consent_accepted_at: null,
        consent_version: 'v1',
        parse_count_date: null,
        parse_count: 0                  // counts MEALS analyzed, not API calls
      };
      db.profiles.push(p);
      save();
    }
    return p;
  }

  function updateProfile(patch) {
    Object.assign(profile(), patch);
    save();
    return profile();
  }

  function acceptConsent() {
    return updateProfile({ consent_accepted_at: new Date().toISOString() });
  }

  const hasConsented = () => !!profile().consent_accepted_at;

  /* Targets. budget_source NEVER changes as a side effect of editing a
     number — audit finding F8. Promotion to care_team is an explicit act. */
  function setTargets(values, sourceOverride) {
    const patch = {
      potassium_budget_mg: values.k,
      phosphorus_budget_mg: values.p,
      sodium_budget_mg: values.na
    };
    if (sourceOverride) patch.budget_source = sourceOverride;
    return updateProfile(patch);
  }

  function useEducationRanges() {
    return updateProfile({
      potassium_budget_mg: 2500,
      phosphorus_budget_mg: 900,
      sodium_budget_mg: 2000,
      budget_source: 'education_default'
    });
  }

  function claimCareTeam() { return updateProfile({ budget_source: 'care_team' }); }

  function skipTargets() {
    return updateProfile({
      potassium_budget_mg: null, phosphorus_budget_mg: null,
      sodium_budget_mg: null, budget_source: 'none'
    });
  }

  function targets() {
    const p = profile();
    return { k: p.potassium_budget_mg, p: p.phosphorus_budget_mg, na: p.sodium_budget_mg };
  }
  const hasTargets = () => profile().budget_source !== 'none';

  /* ── Daily meal-analysis cap (F20: counts MEALS, not calls) ── */
  const PARSE_CAP = 20;

  function parseBudget() {
    const p = profile();
    if (p.parse_count_date !== todayISO()) return { used: 0, cap: PARSE_CAP, left: PARSE_CAP };
    return { used: p.parse_count, cap: PARSE_CAP, left: Math.max(0, PARSE_CAP - p.parse_count) };
  }
  const canAnalyze = () => parseBudget().left > 0;

  function countAnalysis() {
    const p = profile();
    const today = todayISO();
    if (p.parse_count_date !== today) {
      updateProfile({ parse_count_date: today, parse_count: 1 });
    } else {
      updateProfile({ parse_count: p.parse_count + 1 });
    }
  }

  /* ═══════════ LabEntry ═══════════ */

  function labs() {
    return mine(db.labs).slice().sort((a, b) => {
      if (a.lab_date !== b.lab_date) return b.lab_date.localeCompare(a.lab_date);
      return b.entered_at.localeCompare(a.entered_at);
    });
  }

  function addLab(values) {
    const rec = {
      id: uid('lab'),
      created_by: me(),
      lab_date: values.lab_date,
      entered_at: new Date().toISOString(),
      serum_potassium_meq_l: values.k ?? null,
      serum_phosphorus_mg_dl: values.p ?? null,
      egfr_ml_min_1_73m2: values.egfr ?? null
    };
    db.labs.push(rec);
    save();
    return rec;
  }

  function deleteLab(id) {
    const i = db.labs.findIndex(r => r.id === id && r.created_by === me());
    if (i === -1) return false;
    db.labs.splice(i, 1);
    return save();
  }

  /* Latest NON-NULL value per analyte, independently. A user may know
     only one number from their report. */
  function latestLab(field) {
    return labs().find(r => r[field] !== null && r[field] !== undefined) || null;
  }

  /* ═══════════ MealLog ═══════════ */

  function meals(dateISO) {
    const rows = mine(db.meals);
    const filtered = dateISO ? rows.filter(m => m.meal_date === dateISO) : rows;
    return filtered.slice().sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  }

  const meal = (id) => mine(db.meals).find(m => m.id === id) || null;

  /* Atomic: the record is assembled fully in memory by the caller and
     created in ONE write. There is no partial-meal code path. */
  function addMeal(record) {
    const rec = Object.assign({ id: uid('meal'), created_by: me() }, record);
    db.meals.push(rec);
    return save() ? rec : null;
  }

  function updateMeal(id, patch) {
    const m = meal(id);
    if (!m) return null;
    Object.assign(m, patch);
    return save() ? m : null;
  }

  function deleteMeal(id) {
    const i = db.meals.findIndex(m => m.id === id && m.created_by === me());
    if (i === -1) return false;
    db.meals.splice(i, 1);
    return save();
  }

  /* Put back a deleted record exactly as it was — same id, same
     timestamps — so an undo restores history rather than creating a new
     entry that merely resembles the old one. Ownership is re-stamped
     from the current identity, never trusted from the snapshot, so this
     cannot be used to inject a record belonging to someone else. */
  function restoreMeal(record) {
    if (!record || !record.id) return false;
    if (db.meals.some(m => m.id === record.id)) return false;   // already back
    db.meals.push(Object.assign({}, record, { created_by: me() }));
    return save();
  }

  /* ── Day totals: DERIVED, never persisted ── */
  function dayTotals(dateISO) {
    const rows = meals(dateISO || todayISO());
    const t = {
      k: { low: 0, high: 0 }, p: { low: 0, high: 0 }, na: { low: 0, high: 0 },
      sodiumIncomplete: false, uncountedMeals: 0, mealCount: rows.length
    };
    rows.forEach(m => {
      t.k.low  += m.total_potassium_low_mg  || 0;
      t.k.high += m.total_potassium_high_mg || 0;
      t.p.low  += m.total_phosphorus_low_mg || 0;
      t.p.high += m.total_phosphorus_high_mg|| 0;
      t.na.low += m.total_sodium_low_mg     || 0;
      t.na.high+= m.total_sodium_high_mg    || 0;
      if (m.sodium_totals_incomplete) t.sodiumIncomplete = true;
      if ((m.items || []).some(i => i.source === 'uncounted')) t.uncountedMeals++;
    });
    return t;
  }

  /* ═══════════ settings & identity ═══════════ */

  const settings = () => db.settings;
  function setSetting(k, v) { db.settings[k] = v; save(); return db.settings; }
  function bumpCalls(n) { db.settings.llmCalls = (db.settings.llmCalls || 0) + (n || 1); save(); }

  function setIdentity(email) { db.identity = email || DEFAULT_USER; save(); }

  function reset() { db = blank(); save(); }

  /* Wholesale replace — the demo seeder and the backup restore. Both
     are all-or-nothing by construction: the object is built completely
     before it is assigned, so there is no window in which half the
     store is new and half is old. */
  function replaceAll(next) { db = Object.assign(blank(), next); save(); }

  /* A deep copy for export. Returned by value rather than by reference
     so a caller holding a backup cannot accidentally mutate live data
     while serialising it — which would be a very quiet way to corrupt
     somebody's history at exactly the moment they were trying to
     protect it. */
  function exportAll() { return JSON.parse(JSON.stringify(db)); }

  return {
    load, save, reset, replaceAll, exportAll,
    todayISO, daysAgoISO, daysBetween,
    me, setIdentity,
    profile, updateProfile, acceptConsent, hasConsented,
    setTargets, useEducationRanges, claimCareTeam, skipTargets, targets, hasTargets,
    parseBudget, canAnalyze, countAnalysis, PARSE_CAP,
    labs, addLab, deleteLab, latestLab,
    meals, meal, addMeal, updateMeal, deleteMeal, restoreMeal, dayTotals,
    settings, setSetting, bumpCalls,
    _raw: () => db
  };
})();
