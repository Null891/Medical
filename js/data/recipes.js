/* ═══════════════════════════════════════════════════════════════
   RECIPES — assembled from the anchor table, never from new numbers.
   ───────────────────────────────────────────────────────────────
   Every recipe here is a LIST OF ANCHOR ROW IDS with portion
   multipliers. Not one nutrient figure is typed into this file, and
   that is the entire design.

   Why it matters. A kidney recipe page checked while building this
   publishes its per-serving figures as bare point values with no
   source — one page states phosphorus in "u" and salt in grams where
   milligrams were plainly meant. That is not carelessness unique to
   one site; it is what happens whenever a recipe's nutrition is typed
   in by hand. Nothing on the page distinguishes a carefully sourced
   number from a guessed one, so a reader cannot tell them apart.

   Because these recipes are composed, their totals come out of
   Resolve.totals() — which means they inherit, for free and without
   any new machinery:

     · low–high RANGES, not point values
     · the source citation already attached to every anchor row
     · the per-nutrient "not yet verified" list
     · leaching, portion scaling, and every future correction

   Fix a value in the anchor table and every recipe containing it
   changes. There is no second place for a number to go stale.

   WHAT THESE ARE NOT. Not meal prescriptions, not a diet plan, and
   not claimed to be "kidney-safe" — a phrase this app never uses,
   because whether a meal suits a person depends on their labs, their
   targets, and their care team, none of which a recipe knows. They are
   ordinary meals whose contents this app can actually price.

   ADDING A RECipe: reference existing anchor ids only. If a recipe
   needs an ingredient the table does not carry, add the ingredient to
   the anchor table WITH ITS SOURCE first. Never inline a number here.
   ═══════════════════════════════════════════════════════════════ */

const RECIPES = [
  {
    id: 'chicken_rice_beans',
    name: 'Chicken with rice and green beans',
    blurb: 'The plain weeknight plate. Everything in it is in the reference table, so the numbers are as solid as this app gets.',
    minutes: 25,
    serves: 1,
    tags: ['dinner', 'low_potassium'],
    items: [
      { id: 'chicken_breast', mult: 1 },
      { id: 'white_rice', mult: 1 },
      { id: 'green_beans_frozen', mult: 1 }
    ],
    steps: [
      'Season the chicken with pepper, herbs, garlic or lemon — not salt, and not a salt substitute.',
      'Cook the rice in plenty of water and drain it.',
      'Pan-cook the chicken through, and steam or boil the green beans.',
      'Plate with lemon over the top rather than a sauce from a jar.'
    ]
  },
  {
    id: 'boiled_potato_plate',
    name: 'Boiled potatoes with cauliflower',
    blurb: 'Potatoes are usually the first thing people are told to give up. Boiled and drained they can often stay — this is that meal.',
    minutes: 30,
    serves: 1,
    tags: ['dinner', 'leaching'],
    items: [
      /* NO leach flag, deliberately. The boiled-potato row is ALREADY a
         boiled value (515 mg against 926 for baked with skin), so
         applying our leaching factor on top would count the same
         reduction twice — and in the unsafe direction, since it would
         under-state potassium.

         The first draft of this recipe did exactly that. It was caught
         because potato_boiled is not marked leachable in the anchor
         table, and Plan.itemsFor() checks that flag before applying
         anything. The data refused the double-count. */
      { id: 'potato_boiled', mult: 1 },
      { id: 'cauliflower_cooked', mult: 1 },
      { id: 'chicken_breast', mult: 1 }
    ],
    steps: [
      'Cut the potatoes small — surface area is what does the work.',
      'Boil in a large pot of water for at least ten minutes, then drain and discard that water.',
      'Boil or steam the cauliflower.',
      'Cook the chicken and serve everything together.'
    ],
    note: 'The figure here is already the boiled value — about 515 mg against roughly 926 for the same potato baked with its skin on. RenalRoute does not apply a further reduction on top, because that would count the same boiling twice.'
  },
  {
    id: 'egg_toast',
    name: 'Scrambled eggs on white toast',
    blurb: 'Breakfast that does not need a decision. White bread is here on purpose — it carries less potassium and phosphorus than wholewheat.',
    minutes: 10,
    serves: 1,
    tags: ['breakfast'],
    items: [
      { id: 'egg', mult: 2 },
      { id: 'white_bread', mult: 2 }
    ],
    steps: [
      'Scramble the eggs with a splash of water rather than milk if you are watching phosphorus.',
      'Toast the bread.',
      'Pepper and herbs to season. Never a salt substitute — most replace sodium with potassium chloride.'
    ]
  },
  {
    id: 'tuna_style_salmon_rice',
    name: 'Salmon with rice and cucumber',
    blurb: 'Salmon values genuinely vary by species, so this one shows a wider range than the others. That width is real, not sloppiness.',
    minutes: 20,
    serves: 1,
    tags: ['dinner'],
    items: [
      { id: 'salmon', mult: 1 },
      { id: 'white_rice', mult: 1 },
      { id: 'cucumber', mult: 1 }
    ],
    steps: [
      'Bake or pan-cook the salmon with lemon and dill.',
      'Boil and drain the rice.',
      'Slice the cucumber raw alongside.'
    ]
  },
  {
    id: 'pepper_cabbage_salad',
    name: 'Cabbage and pepper salad',
    blurb: 'The side that fits almost any remaining budget. Both are among the lowest-potassium vegetables in the table.',
    minutes: 10,
    serves: 1,
    tags: ['side', 'low_potassium', 'no_cook'],
    items: [
      { id: 'cabbage_raw', mult: 1 },
      { id: 'bell_pepper_green', mult: 1 },
      { id: 'cucumber', mult: 1 }
    ],
    steps: [
      'Shred the cabbage, slice the pepper and cucumber.',
      'Dress with oil, vinegar and black pepper — check any bottled dressing for sodium first.'
    ]
  },
  {
    id: 'berry_yogurt',
    name: 'Yogurt with berries',
    blurb: 'Dairy carries phosphorus, so this is one serving rather than a bowlful — the app will show you exactly what it costs.',
    minutes: 5,
    serves: 1,
    tags: ['breakfast', 'no_cook'],
    items: [
      { id: 'yogurt_lowfat', mult: 1 },
      { id: 'blueberries', mult: 1 },
      { id: 'strawberries', mult: 1 }
    ],
    steps: ['Spoon the berries over the yogurt. That is the whole recipe.']
  },
  {
    id: 'apple_pb_toast',
    name: 'Peanut butter toast with apple',
    blurb: 'A snack that holds. Peanut butter is worth watching for phosphorus, which is why it is one spoon here.',
    minutes: 5,
    serves: 1,
    tags: ['snack', 'no_cook'],
    items: [
      { id: 'white_bread', mult: 1 },
      { id: 'peanut_butter', mult: 1 },
      { id: 'apple_noskin', mult: 1 }
    ],
    steps: ['Toast, spread, slice the apple alongside.']
  },
  {
    id: 'rice_veg_bowl',
    name: 'Rice bowl with green vegetables',
    blurb: 'No meat, and still not a high-potassium plate — which is the point worth making about plant food and kidneys.',
    minutes: 20,
    serves: 1,
    tags: ['dinner', 'low_potassium'],
    items: [
      { id: 'white_rice', mult: 1.5 },
      { id: 'green_beans_frozen', mult: 1 },
      { id: 'cauliflower_cooked', mult: 1 },
      { id: 'bell_pepper_green', mult: 1 }
    ],
    steps: [
      'Boil and drain the rice.',
      'Steam the green beans and cauliflower; slice the pepper in raw at the end for crunch.',
      'Season with garlic, ginger, chilli or lemon rather than soy sauce, which is very high in sodium.'
    ]
  },
  {
    id: 'lentil_bowl',
    name: 'Lentils with rice and cabbage',
    blurb: 'Legumes are not banned. Their phosphorus is plant-bound and absorbed at under 40%, which is a different thing from the additive kind.',
    minutes: 35,
    serves: 1,
    tags: ['dinner', 'vegetarian'],
    items: [
      { id: 'lentils', mult: 1 },
      { id: 'white_rice', mult: 1 },
      { id: 'cabbage_raw', mult: 1 }
    ],
    steps: [
      'Cook the lentils in plenty of water and drain.',
      'Boil and drain the rice.',
      'Shred the cabbage raw over the top.'
    ],
    note: 'Phosphorus bound in plant foods is absorbed at under 40%, against over 90% for additive phosphate in packaged food. The milligram figure alone does not tell you which kind you are eating.'
  },
  {
    id: 'chicken_sweet_potato',
    name: 'Chicken with sweet potato',
    blurb: 'A bigger-potassium plate, shown honestly. Log it and see whether today has room — that is what the app is for.',
    minutes: 40,
    serves: 1,
    tags: ['dinner'],
    items: [
      { id: 'chicken_breast', mult: 1 },
      { id: 'sweet_potato', mult: 1 },
      { id: 'green_beans_frozen', mult: 1 }
    ],
    steps: [
      'Roast or boil the sweet potato.',
      'Cook the chicken through.',
      'Steam the green beans.'
    ]
  },
  {
    id: 'grape_cheese_plate',
    name: 'Grapes with a little cheddar',
    blurb: 'A small evening plate. Cheddar is here in a small portion because cheese is dense in phosphorus.',
    minutes: 3,
    serves: 1,
    tags: ['snack', 'no_cook'],
    items: [
      { id: 'grapes', mult: 1 },
      { id: 'cheddar', mult: 0.5 },
      { id: 'white_bread', mult: 1 }
    ],
    steps: ['Assemble. No cooking involved.']
  },
  {
    id: 'tomato_rice',
    name: 'Rice with tomato sauce',
    blurb: 'Tomato is high in potassium, so this uses sauce rather than paste — the paste is far more concentrated.',
    minutes: 20,
    serves: 1,
    tags: ['dinner', 'vegetarian'],
    items: [
      { id: 'white_rice', mult: 1 },
      { id: 'tomato_sauce', mult: 1 },
      { id: 'bell_pepper_green', mult: 1 }
    ],
    steps: [
      'Boil and drain the rice.',
      'Warm the sauce with the sliced pepper.',
      'Check the jar: many sauces are high in sodium, and some carry phosphate additives.'
    ]
  },
  {
    id: 'egg_rice_bowl',
    name: 'Egg and rice bowl',
    blurb: 'Five minutes and two ingredients, both in the table. Good for a day when logging is already the most effort available.',
    minutes: 12,
    serves: 1,
    tags: ['dinner', 'quick'],
    items: [
      { id: 'egg', mult: 2 },
      { id: 'white_rice', mult: 1 },
      { id: 'cucumber', mult: 1 }
    ],
    steps: ['Boil and drain the rice, fry or scramble the eggs, cucumber on the side.']
  },
  {
    id: 'chicken_salad_plate',
    name: 'Cold chicken salad plate',
    blurb: 'No cooking at all if the chicken is left over. Built from the lowest-potassium vegetables in the table.',
    minutes: 8,
    serves: 1,
    tags: ['lunch', 'no_cook', 'low_potassium'],
    items: [
      { id: 'chicken_breast', mult: 1 },
      { id: 'cabbage_raw', mult: 1 },
      { id: 'cucumber', mult: 1 },
      { id: 'bell_pepper_green', mult: 1 }
    ],
    steps: ['Slice everything. Oil, vinegar, black pepper.']
  }
];

/* Aisle grouping for the shopping list.

   [NEEDS VERIFICATION — these categories mirror the structure of a
   published renal grocery list (UC Davis Health, post-transplant renal
   grocery list). The PDF did not parse when fetched, so the CATEGORY
   NAMES here are ordinary supermarket aisles rather than a transcription
   of that document, and no food has been assigned to a "choose often" or
   "limit" list on its authority. Transcribe the source before making any
   recommendation claim on its behalf.] */
const AISLES = {
  produce:   { label: 'Produce',            match: ['fruit', 'vegetable'] },
  protein:   { label: 'Meat, fish and eggs', match: ['meat_fish_egg'] },
  dairy:     { label: 'Dairy',              match: ['dairy'] },
  pantry:    { label: 'Pantry and grains',  match: ['starch_grain', 'legume', 'canned', 'packaged'] },
  other:     { label: 'Everything else',    match: [] }
};
