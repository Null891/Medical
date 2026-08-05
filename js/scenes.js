/* ═══════════════════════════════════════════════════════════════
   SCENES — where you are changes what the app is for.
   ───────────────────────────────────────────────────────────────
   A kidney diet is not one problem, it is five, and they do not
   overlap much. Standing in a supermarket aisle, the whole question is
   "what is actually in this packet". Sitting in a restaurant, there is
   no packet and no label, and the only useful thing anybody can say is
   category-level. In a clinic waiting room the app should hand over a
   week and a card and then get out of the way.

   Tabs answer "which feature", which is the wrong question. Scenes
   answer "what am I doing", which is the one people actually have.

   WHAT A SCENE IS ALLOWED TO CHANGE. Emphasis and order — which
   actions lead, which cards surface, what the app opens on. Nothing
   else. A scene never changes a number, a threshold, a target, or what
   gets flagged. Sodium guidance in a restaurant is the same guidance
   as at home; the restaurant scene simply puts it first, because that
   is where it is needed. If a scene could change what counts, it would
   be a second clinical model with no evidence behind it.

   ADAPTIVE ORDER. Underneath the scenes, the dashboard also reorders
   itself through the day: an empty morning wants the day ahead, an
   evening wants what is left for dinner, a finished day wants the
   record. Same cards, same numbers, different lead.
   ═══════════════════════════════════════════════════════════════ */

const Scenes = (() => {

  /* ── The five scenes ──
     `lead` is the action that becomes the screen's primary button.
     `cards` is the order the dashboard assembles in. `opens` is where
     the scene lands you when you pick it. */
  const SCENES = [
    {
      key: 'home',
      name: 'At home',
      blurb: 'Cooking and eating in. The full dashboard.',
      icon: 'house',
      opens: 'home',
      lead: { label: 'Log a meal', nav: 'log' },
      cards: ['orbit', 'rings', 'stats', 'quick', 'list', 'today', 'checklist', 'trends', 'insights'],
      tip: null
    },
    {
      key: 'store',
      name: 'At the store',
      blurb: 'Reading packets. Label checker and barcode first.',
      icon: 'basket',
      opens: 'label',
      lead: { label: 'Check a label', nav: 'label' },
      cards: ['orbit', 'rings', 'stats', 'list', 'trends', 'insights', 'checklist'],
      tip: 'Any ingredient with PHOS in it is added phosphate — absorbed almost completely, and it never shows on the nutrition panel.'
    },
    {
      key: 'restaurant',
      name: 'Eating out',
      blurb: 'No labels. Portions and patterns instead of numbers.',
      icon: 'fork',
      opens: 'log',
      lead: { label: 'Log what you ordered', nav: 'log' },
      cards: ['orbit', 'rings', 'stats', 'list', 'insights', 'trends', 'checklist'],
      /* Category-level, because that is all restaurant sodium supports.
         The same rule the flag cards already follow — this scene just
         says it out loud before the meal rather than after. */
      tip: 'Restaurant sodium is wide and unlabelled. Ask for sauces and dressing on the side, skip the bread basket, and treat any number here as rough.'
    },
    {
      key: 'clinic',
      name: 'At the doctor',
      blurb: 'Your week, your passport, ready to hand over.',
      icon: 'clipboard',
      opens: 'home',
      lead: { label: 'Open my health passport', nav: 'passport' },
      cards: ['checklist', 'trends', 'insights', 'orbit', 'rings', 'stats', 'list'],
      tip: 'Your seven-day view and a one-page summary are both under Settings → Your data. The passport prints.'
    },
    {
      key: 'travel',
      name: 'Travelling',
      blurb: 'Offline-first. Passport and quick logging.',
      icon: 'plane',
      opens: 'home',
      lead: { label: 'Log a meal', nav: 'log' },
      cards: ['orbit', 'rings', 'quick', 'stats', 'list', 'trends', 'checklist'],
      tip: 'Everything except reading a typed meal works with no signal. The food list, the rings, and your passport are all on this device.'
    }
  ];

  const byKey = (k) => SCENES.find(s => s.key === k) || SCENES[0];

  function current() { return byKey(Store.settings().scene || 'home'); }

  function set(key) {
    const s = byKey(key);
    Store.setSetting('scene', s.key);
    return s;
  }

  /* ═══════════ adaptive order ═══════════
     The dashboard's lead card changes through the day. This is not
     personalisation and it does not learn: it is four fixed
     arrangements chosen by clock time and whether anything has been
     logged yet, which makes it predictable — somebody who opens the app
     at the same time each morning sees the same thing.

     The alternative, reordering by inferred preference, would mean a
     health app whose layout moves for reasons the user cannot see. */
  const PARTS = [
    { key: 'morning', from: 4,  to: 11 },
    { key: 'midday',  from: 11, to: 16 },
    { key: 'evening', from: 16, to: 21 },
    { key: 'night',   from: 21, to: 4  }
  ];

  function dayPart(hour) {
    const h = (hour === undefined || hour === null) ? new Date().getHours() : hour;
    for (const p of PARTS) {
      if (p.from < p.to) { if (h >= p.from && h < p.to) return p.key; }
      else if (h >= p.from || h < p.to) return p.key;
    }
    return 'midday';
  }

  /* Same cards, different lead. Nothing is ever hidden by the reorder —
     a card that would be dropped stays, at the end. Losing a feature
     because of the time of day would be a bug. */
  const ORDERS = {
    // Nothing logged yet: what today can be.
    morning: ['orbit', 'rings', 'quick', 'stats', 'list', 'today', 'checklist', 'insights', 'trends'],
    // Mid-day: how much room is left, and what has gone in.
    midday:  ['orbit', 'rings', 'stats', 'list', 'quick', 'today', 'trends', 'insights', 'checklist'],
    // The question the whole app exists for: what can dinner be?
    evening: ['orbit', 'rings', 'stats', 'quick', 'list', 'today', 'insights', 'trends', 'checklist'],
    // Day effectively done: the record and the week.
    night:   ['orbit', 'rings', 'today', 'list', 'checklist', 'stats', 'trends', 'insights', 'quick']
  };

  function order() {
    const scene = current();
    const part = dayPart();
    // The scene wins where it has an opinion; the clock fills the rest.
    const sceneOrder = scene.cards || [];
    const clockOrder = ORDERS[part] || ORDERS.midday;
    const seen = new Set();
    const out = [];
    for (const k of sceneOrder.concat(clockOrder)) {
      if (seen.has(k)) continue;
      seen.add(k); out.push(k);
    }
    return { part, scene, cards: out };
  }

  /* One line under the greeting that names the moment. Deliberately
     never a status or a judgement — just what part of the day it is
     and, if a scene is set, where you said you were. */
  function greetingSuffix() {
    const s = current();
    return s.key === 'home' ? '' : ` · ${s.name}`;
  }

  return { SCENES, byKey, current, set, order, dayPart, ORDERS, PARTS, greetingSuffix };
})();
