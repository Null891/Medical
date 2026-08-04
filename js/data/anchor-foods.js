/* ═══════════════════════════════════════════════════════════════
   ANCHOR FOOD TABLE — the deterministic backbone.
   ───────────────────────────────────────────────────────────────
   Nutrient numbers come from HERE, never from the language model.
   Rationale: measured LLM accuracy is ~36% MAPE on food-photo energy,
   34–64% on sodium, and only ~60% correct when classifying LOW-potassium
   foods. Extraction is a language task the model does well; pricing the
   food is not.

   ▓▓ DATA STATUS — READ BEFORE TRUSTING ANY NUMBER ▓▓
   This is a REFERENCE BUILD. Values are transcribed from the plan's
   ground-truth pack (AKF / NKF / DaVita, USDA-derived) for testing.
   Rows carry an explicit `verify` array naming every field that must be
   re-derived from USDA FoodData Central before any real-world use.

   Data rules applied (Plan D.5 + audit finding on transcription errors):
   1. Ranges are used ONLY for genuine same-food variation (salmon by
      species, cola by brand, egg). A range spanning a suspected
      TRANSCRIPTION ERROR launders the error into false "honest
      uncertainty" — those get re-derived instead, and are flagged below.
   2. `swap_pool` is FALSE for every row with `additive_risk` true.
      Cola sits in the lower-potassium set but must never be suggested
      as a swap.
   3. Raw and cooked forms are separate rows — the 5x spinach teaching
      moment depends on it.
   4. Every row carries a gram weight where known, because serving-size
      mislabels are the error class that produced the milk problem.

   KNOWN SUSPECTS, handled per rule 1:
   · whole milk phosphorus — the source pack lists 134 mg/cup, which is
     almost certainly a half-cup value mislabeled (134 x 2 = 268, close
     to the 276 mg/cup figure listed elsewhere for 2% milk, and whole vs
     2% milk cannot differ ~2x in phosphorus). Stored as a re-derivation
     placeholder range and flagged. DO NOT ship the 134 figure.
   · deli ham phosphorus — the pack lists 447 mg "per slice", implausible
     by ~3–5x for a 28 g slice. Restated per 1 oz with a wide flagged
     range and an additive annotation.
   · lima beans — the pack's "1/2 can" unit is inconsistent with every
     other row; normalized to 1/2 cup.

   SODIUM: the source pack is almost entirely missing sodium. Values here
   are populated ONLY where the food is plainly unsalted (fresh produce,
   unsalted grains) and left null everywhere else, which drives the app's
   honest "Partial data" path rather than inventing numbers. Every sodium
   value carries a verify flag.
   ═══════════════════════════════════════════════════════════════ */

const ANCHOR_FOODS = [

  /* ───────────────── FRUIT ───────────────── */
  { id: 'banana', food_name: 'Banana', base_food: 'banana', category: 'fruit',
    aliases: ['banana', 'bananas', 'a banana'],
    serving_text: '1 medium', serving_qty: 1, serving_unit: 'medium', serving_grams: 118,
    k_low: 422, k_high: 422, p_low: null, p_high: null, na_low: 1, na_high: 2,
    additive_risk: false, phos_bio: 'plant', swap_pool: false,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'orange', food_name: 'Orange', base_food: 'orange', category: 'fruit',
    aliases: ['orange', 'oranges'],
    serving_text: '1 fruit', serving_qty: 1, serving_unit: 'fruit', serving_grams: 131,
    k_low: 232, k_high: 232, p_low: null, p_high: null, na_low: 0, na_high: 2,
    additive_risk: false, phos_bio: 'plant', swap_pool: false,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'avocado', food_name: 'Avocado', base_food: 'avocado', category: 'fruit',
    aliases: ['avocado', 'avocados', 'half an avocado'],
    serving_text: '½ fruit', serving_qty: 0.5, serving_unit: 'fruit', serving_grams: 100,
    k_low: 488, k_high: 488, p_low: null, p_high: null, na_low: 3, na_high: 7,
    additive_risk: false, phos_bio: 'plant', swap_pool: false,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'cantaloupe', food_name: 'Cantaloupe', base_food: 'cantaloupe', category: 'fruit',
    aliases: ['cantaloupe', 'melon'],
    serving_text: '1 cup diced', serving_qty: 1, serving_unit: 'cup', serving_grams: 160,
    k_low: 417, k_high: 417, p_low: null, p_high: null, na_low: 20, na_high: 30,
    additive_risk: false, phos_bio: 'plant', swap_pool: false,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'honeydew', food_name: 'Honeydew melon', base_food: 'honeydew', category: 'fruit',
    aliases: ['honeydew', 'honeydew melon'],
    serving_text: '1 cup diced', serving_qty: 1, serving_unit: 'cup', serving_grams: 170,
    k_low: 388, k_high: 388, p_low: null, p_high: null, na_low: 25, na_high: 35,
    additive_risk: false, phos_bio: 'plant', swap_pool: false,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'pomegranate', food_name: 'Pomegranate', base_food: 'pomegranate', category: 'fruit',
    aliases: ['pomegranate'],
    serving_text: '1 fruit', serving_qty: 1, serving_unit: 'fruit', serving_grams: 282,
    k_low: 666, k_high: 666, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'raisins', food_name: 'Raisins', base_food: 'raisins', category: 'fruit',
    aliases: ['raisins', 'raisin'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 72,
    k_low: 540, k_high: 540, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  /* ── lower-potassium fruit: the swap set ── */
  { id: 'apple_noskin', food_name: 'Apple, no skin', base_food: 'apple', category: 'fruit',
    aliases: ['apple', 'apples', 'apple no skin', 'peeled apple'],
    serving_text: '1 medium', serving_qty: 1, serving_unit: 'medium', serving_grams: 161,
    k_low: 145, k_high: 145, p_low: null, p_high: null, na_low: 0, na_high: 2,
    additive_risk: false, phos_bio: 'plant', swap_pool: true,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'blueberries', food_name: 'Blueberries', base_food: 'blueberries', category: 'fruit',
    aliases: ['blueberries', 'blueberry'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 74,
    k_low: 57, k_high: 57, p_low: null, p_high: null, na_low: 0, na_high: 1,
    additive_risk: false, phos_bio: 'plant', swap_pool: true,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'grapes', food_name: 'Grapes', base_food: 'grapes', category: 'fruit',
    aliases: ['grapes', 'grape'],
    serving_text: '10 grapes', serving_qty: 10, serving_unit: 'grapes', serving_grams: 49,
    k_low: 94, k_high: 94, p_low: null, p_high: null, na_low: 0, na_high: 1,
    additive_risk: false, phos_bio: 'plant', swap_pool: true,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'strawberries', food_name: 'Strawberries', base_food: 'strawberries', category: 'fruit',
    aliases: ['strawberries', 'strawberry'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 76,
    k_low: 117, k_high: 117, p_low: null, p_high: null, na_low: 0, na_high: 1,
    additive_risk: false, phos_bio: 'plant', swap_pool: true,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  /* ───────────────── VEGETABLE ───────────────── */
  { id: 'potato_baked_skin', food_name: 'Baked potato with skin', base_food: 'potato', category: 'vegetable',
    aliases: ['baked potato with skin', 'baked potato skin on', 'potato with skin', 'jacket potato'],
    serving_text: '1 medium', serving_qty: 1, serving_unit: 'medium', serving_grams: 173,
    k_low: 926, k_high: 926, p_low: null, p_high: null, na_low: 10, na_high: 20,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, leachable: true, swap_affinity: 'cooked_side',
    source: 'AKF/USDA', verify: ['p', 'na'],
    note: 'Phosphorus absent from the source pack — must be added in data prep.' },

  { id: 'potato_baked_noskin', food_name: 'Baked potato, no skin', base_food: 'potato', category: 'vegetable',
    aliases: ['baked potato no skin', 'baked potato without skin', 'baked potato', 'potato'],
    serving_text: '1 medium', serving_qty: 1, serving_unit: 'medium', serving_grams: 156,
    k_low: 610, k_high: 610, p_low: null, p_high: null, na_low: 8, na_high: 16,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, leachable: true, swap_affinity: 'cooked_side',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'potato_boiled', food_name: 'Boiled potato', base_food: 'potato', category: 'vegetable',
    aliases: ['boiled potato', 'boiled potatoes'],
    serving_text: '1 medium', serving_qty: 1, serving_unit: 'medium', serving_grams: 167,
    k_low: 515, k_high: 515, p_low: null, p_high: null, na_low: 5, na_high: 12,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, swap_affinity: 'cooked_side',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'sweet_potato', food_name: 'Sweet potato, mashed', base_food: 'sweet_potato', category: 'vegetable',
    aliases: ['sweet potato', 'sweet potatoes', 'mashed sweet potato', 'yam'],
    serving_text: '½ cup mashed', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 125,
    k_low: 377, k_high: 377, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, leachable: true, swap_affinity: 'cooked_side',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'spinach_cooked', food_name: 'Cooked spinach', base_food: 'spinach', category: 'vegetable',
    aliases: ['cooked spinach', 'spinach cooked', 'boiled spinach', 'sauteed spinach'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 90,
    k_low: 420, k_high: 420, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, leachable: true, swap_affinity: 'cooked_side',
    teaching_note: 'spinach',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'spinach_raw', food_name: 'Raw spinach', base_food: 'spinach', category: 'vegetable',
    aliases: ['raw spinach', 'spinach raw', 'spinach salad', 'baby spinach'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 15,
    k_low: 84, k_high: 84, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: true, swap_affinity: 'raw_salad',
    teaching_note: 'spinach',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'tomato_sauce', food_name: 'Tomato sauce', base_food: 'tomato', category: 'vegetable',
    aliases: ['tomato sauce', 'pasta sauce', 'marinara'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 122,
    k_low: 455, k_high: 455, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, swap_affinity: 'sauce', sodium_category: 'canned',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'tomato_paste', food_name: 'Tomato paste', base_food: 'tomato', category: 'vegetable',
    aliases: ['tomato paste'],
    serving_text: '¼ cup', serving_qty: 0.25, serving_unit: 'cup', serving_grams: 66,
    k_low: 669, k_high: 669, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, swap_affinity: 'sauce', sodium_category: 'canned',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'cauliflower_cooked', food_name: 'Cooked cauliflower', base_food: 'cauliflower', category: 'vegetable',
    aliases: ['cooked cauliflower', 'cauliflower', 'steamed cauliflower', 'roasted cauliflower'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 62,
    k_low: 88, k_high: 88, p_low: null, p_high: null, na_low: 9, na_high: 16,
    additive_risk: false, phos_bio: 'plant', swap_pool: true, leachable: true, swap_affinity: 'cooked_side',
    source: 'AKF/USDA', verify: ['p', 'na'],
    note: 'Phosphorus absent from the source pack — must be added in data prep.' },

  { id: 'cabbage_raw', food_name: 'Raw cabbage', base_food: 'cabbage', category: 'vegetable',
    aliases: ['raw cabbage', 'cabbage', 'coleslaw cabbage', 'shredded cabbage'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 35,
    k_low: 60, k_high: 60, p_low: null, p_high: null, na_low: 5, na_high: 10,
    additive_risk: false, phos_bio: 'plant', swap_pool: true, swap_affinity: 'raw_salad',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'green_beans_frozen', food_name: 'Frozen green beans', base_food: 'green_beans', category: 'vegetable',
    aliases: ['green beans', 'frozen green beans', 'string beans'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 68,
    k_low: 113, k_high: 113, p_low: null, p_high: null, na_low: 2, na_high: 8,
    additive_risk: false, phos_bio: 'plant', swap_pool: true, leachable: true, swap_affinity: 'cooked_side',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'cucumber', food_name: 'Cucumber with peel', base_food: 'cucumber', category: 'vegetable',
    aliases: ['cucumber', 'cucumbers', 'cucumber with peel'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 52,
    k_low: 76, k_high: 76, p_low: null, p_high: null, na_low: 1, na_high: 3,
    additive_risk: false, phos_bio: 'plant', swap_pool: true, swap_affinity: 'raw_salad',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'bell_pepper_green', food_name: 'Raw green bell pepper', base_food: 'bell_pepper', category: 'vegetable',
    aliases: ['green bell pepper', 'bell pepper', 'green pepper', 'peppers'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 75,
    k_low: 131, k_high: 131, p_low: null, p_high: null, na_low: 1, na_high: 3,
    additive_risk: false, phos_bio: 'plant', swap_pool: true, swap_affinity: 'raw_salad',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  /* ───────────────── LEGUME ───────────────── */
  { id: 'lentils', food_name: 'Lentils', base_food: 'lentils', category: 'legume',
    aliases: ['lentils', 'lentil', 'lentil stew', 'dal'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 99,
    k_low: 366, k_high: 366, p_low: 178, p_high: 178, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false,
    source: 'AKF/USDA', verify: ['na'] },

  { id: 'black_beans', food_name: 'Black beans', base_food: 'black_beans', category: 'legume',
    aliases: ['black beans', 'black bean'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 86,
    k_low: 370, k_high: 370, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, sodium_category: 'canned',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'kidney_beans_canned', food_name: 'Canned kidney beans', base_food: 'kidney_beans', category: 'legume',
    aliases: ['kidney beans', 'canned kidney beans', 'red beans'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 89,
    k_low: 333, k_high: 333, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, sodium_category: 'canned',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'lima_beans', food_name: 'Lima beans', base_food: 'lima_beans', category: 'legume',
    aliases: ['lima beans', 'butter beans'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 85,
    k_low: 485, k_high: 485, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, sodium_category: 'canned',
    source: 'AKF/USDA', verify: ['k', 'p', 'na'],
    note: 'Source pack used an inconsistent "½ can" unit; normalized to ½ cup. Re-derive.' },

  /* ───────────────── DAIRY ───────────────── */
  { id: 'milk_whole', food_name: 'Whole milk', base_food: 'milk', category: 'dairy',
    aliases: ['milk', 'whole milk', 'glass of milk', 'a glass of milk'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 122,
    k_low: 184, k_high: 184, p_low: 103, p_high: 125, na_low: 50, na_high: 60,
    additive_risk: false, phos_bio: 'animal', swap_pool: false,
    source: 'AKF/USDA (phosphorus re-derived)', verify: ['p', 'na'],
    note: 'SUSPECTED TRANSCRIPTION ERROR in source: 134 mg P per CUP is almost certainly a half-cup ' +
          'value mislabeled. Stored here per HALF cup as a re-derivation placeholder (~205–250 mg/cup). ' +
          'Must be confirmed against USDA FoodData Central before any real use.' },

  { id: 'milk_evaporated', food_name: 'Evaporated milk', base_food: 'milk', category: 'dairy',
    aliases: ['evaporated milk'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 126,
    k_low: 382, k_high: 382, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'animal', swap_pool: false,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'yogurt_lowfat', food_name: 'Plain low-fat yogurt', base_food: 'yogurt', category: 'dairy',
    aliases: ['yogurt', 'plain yogurt', 'low-fat yogurt', 'low fat yogurt'],
    serving_text: '6 oz', serving_qty: 6, serving_unit: 'oz', serving_grams: 170,
    k_low: 398, k_high: 398, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'animal', swap_pool: false,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'yogurt_greek', food_name: 'Plain low-fat Greek yogurt', base_food: 'greek_yogurt', category: 'dairy',
    aliases: ['greek yogurt', 'plain greek yogurt'],
    serving_text: '7 oz', serving_qty: 7, serving_unit: 'oz', serving_grams: 200,
    k_low: null, k_high: null, p_low: 274, p_high: 274, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'animal', swap_pool: false,
    source: 'NKF', verify: ['k', 'na'] },

  { id: 'cheddar', food_name: 'Cheddar cheese', base_food: 'cheddar', category: 'dairy',
    aliases: ['cheddar', 'cheddar cheese', 'cheese'],
    serving_text: '1 oz', serving_qty: 1, serving_unit: 'oz', serving_grams: 28,
    k_low: null, k_high: null, p_low: 129, p_high: 129, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'animal', swap_pool: false, sodium_category: 'cured',
    source: 'AKF/USDA', verify: ['k', 'na'] },

  { id: 'american_cheese', food_name: 'American cheese', base_food: 'american_cheese', category: 'dairy',
    aliases: ['american cheese', 'processed cheese', 'cheese slice'],
    serving_text: '1 oz', serving_qty: 1, serving_unit: 'oz', serving_grams: 28,
    k_low: null, k_high: null, p_low: 182, p_high: 182, na_low: null, na_high: null,
    additive_risk: true, phos_bio: 'additive', swap_pool: false, sodium_category: 'cured',
    source: 'AKF/USDA', verify: ['k', 'na'],
    note: 'Processed cheese commonly carries phosphate additives.' },

  /* ───────────────── MEAT / FISH / EGG ───────────────── */
  { id: 'chicken_breast', food_name: 'Chicken breast', base_food: 'chicken', category: 'meat_fish_egg',
    aliases: ['chicken', 'chicken breast', 'grilled chicken', 'roast chicken', 'baked chicken'],
    serving_text: '3 oz', serving_qty: 3, serving_unit: 'oz', serving_grams: 85,
    k_low: null, k_high: null, p_low: 168, p_high: 190, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'animal', swap_pool: false,
    source: 'AKF/USDA', verify: ['k', 'na'],
    note: 'Potassium absent from the source pack — must be added in data prep. ' +
          'The golden-path demo meal depends on this value.' },

  { id: 'salmon', food_name: 'Salmon', base_food: 'salmon', category: 'meat_fish_egg',
    aliases: ['salmon', 'grilled salmon', 'baked salmon'],
    serving_text: '3 oz', serving_qty: 3, serving_unit: 'oz', serving_grams: 85,
    k_low: null, k_high: null, p_low: 215, p_high: 253, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'animal', swap_pool: false,
    source: 'AKF/NKF (varies by species and preparation)', verify: ['k', 'na'] },

  { id: 'sardines', food_name: 'Sardines with bone', base_food: 'sardines', category: 'meat_fish_egg',
    aliases: ['sardines', 'sardine'],
    serving_text: '3 oz', serving_qty: 3, serving_unit: 'oz', serving_grams: 85,
    k_low: null, k_high: null, p_low: 451, p_high: 451, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'animal', swap_pool: false, sodium_category: 'canned',
    source: 'AKF/USDA', verify: ['k', 'na'] },

  { id: 'beef_liver', food_name: 'Beef liver', base_food: 'beef_liver', category: 'meat_fish_egg',
    aliases: ['beef liver', 'liver'],
    serving_text: '4 oz', serving_qty: 4, serving_unit: 'oz', serving_grams: 113,
    k_low: null, k_high: null, p_low: 422, p_high: 422, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'animal', swap_pool: false,
    source: 'AKF/USDA', verify: ['k', 'na'] },

  { id: 'egg', food_name: 'Egg', base_food: 'egg', category: 'meat_fish_egg',
    aliases: ['egg', 'eggs', 'scrambled egg', 'scrambled eggs', 'boiled egg', 'fried egg'],
    serving_text: '1 large', serving_qty: 1, serving_unit: 'large', serving_grams: 50,
    k_low: null, k_high: null, p_low: 86, p_high: 95, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'animal', swap_pool: false,
    source: 'AKF/NKF/DaVita (sources disagree 86 vs 95)', verify: ['k', 'na'],
    note: 'Potassium absent from the source pack — must be added in data prep.' },

  { id: 'deli_ham', food_name: 'Cured deli ham', base_food: 'ham', category: 'meat_fish_egg',
    aliases: ['ham', 'deli ham', 'cured ham', 'ham sandwich'],
    serving_text: '1 oz', serving_qty: 1, serving_unit: 'oz', serving_grams: 28,
    k_low: null, k_high: null, p_low: 45, p_high: 150, na_low: null, na_high: null,
    additive_risk: true, phos_bio: 'additive', swap_pool: false, sodium_category: 'cured',
    source: 'USDA-derived, re-stated per ounce', verify: ['k', 'p', 'na'],
    note: 'SUSPECTED TRANSCRIPTION ERROR in source: 447 mg P "per slice" is implausible by ~3–5x for a ' +
          '28 g slice. Restated per 1 oz with a wide flagged range pending USDA re-derivation. ' +
          'Often phosphate-enhanced — check the label for PHOS ingredients.' },

  /* ───────────────── STARCH / GRAIN ───────────────── */
  { id: 'white_rice', food_name: 'White rice, cooked', base_food: 'white_rice', category: 'starch_grain',
    aliases: ['white rice', 'rice', 'cooked rice', 'parboiled white rice', 'parboiled rice'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 79,
    k_low: 44, k_high: 44, p_low: 35, p_high: 51, na_low: 0, na_high: 5,
    additive_risk: false, phos_bio: 'plant', swap_pool: true,
    source: 'AKF/DaVita (sources disagree 35 vs 51)', verify: ['na'] },

  { id: 'brown_rice', food_name: 'Brown rice, cooked', base_food: 'brown_rice', category: 'starch_grain',
    aliases: ['brown rice'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 98,
    k_low: null, k_high: null, p_low: 102, p_high: 102, na_low: 0, na_high: 5,
    additive_risk: false, phos_bio: 'plant', swap_pool: false,
    source: 'AKF/USDA', verify: ['k', 'na'] },

  { id: 'white_bread', food_name: 'White bread', base_food: 'white_bread', category: 'starch_grain',
    aliases: ['white bread', 'bread', 'toast', 'white toast', 'slice of bread'],
    serving_text: '1 slice', serving_qty: 1, serving_unit: 'slice', serving_grams: 28,
    k_low: 36, k_high: 36, p_low: 25, p_high: 28, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: true, sodium_category: 'packaged',
    source: 'AKF/USDA', verify: ['na'] },

  { id: 'wheat_bread', food_name: 'Whole wheat bread', base_food: 'wheat_bread', category: 'starch_grain',
    aliases: ['whole wheat bread', 'wheat bread', 'brown bread', 'wholemeal bread'],
    serving_text: '1 slice', serving_qty: 1, serving_unit: 'slice', serving_grams: 28,
    k_low: 36, k_high: 36, p_low: 57, p_high: 60, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, sodium_category: 'packaged',
    source: 'AKF/USDA', verify: ['na'] },

  /* ───────────────── BEVERAGE ───────────────── */
  { id: 'cola', food_name: 'Cola', base_food: 'cola', category: 'beverage',
    aliases: ['cola', 'coke', 'pepsi', 'soda', 'a 12 oz cola', '12 oz cola'],
    serving_text: '12 fl oz', serving_qty: 12, serving_unit: 'fl oz', serving_grams: 355,
    k_low: 19, k_high: 19, p_low: 33.5, p_high: 41, na_low: null, na_high: null,
    additive_risk: true, phos_bio: 'additive', swap_pool: false,
    source: 'AKF/NKF (brand-dependent 33.5–41)', verify: ['na'],
    note: 'Phosphoric acid (E338). swap_pool deliberately false despite low potassium.' },

  { id: 'lemon_lime_soda', food_name: 'Lemon-lime soda', base_food: 'lemon_lime_soda', category: 'beverage',
    aliases: ['lemon-lime soda', 'lemon lime soda', 'sprite', '7up', 'ginger ale'],
    serving_text: '12 fl oz', serving_qty: 12, serving_unit: 'fl oz', serving_grams: 355,
    k_low: 4, k_high: 4, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'mixed', swap_pool: true,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'cranberry_juice', food_name: 'Cranberry juice', base_food: 'cranberry_juice', category: 'beverage',
    aliases: ['cranberry juice'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 127,
    k_low: 26, k_high: 26, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: true,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'orange_juice', food_name: 'Orange juice', base_food: 'orange_juice', category: 'beverage',
    aliases: ['orange juice', 'oj'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 124,
    k_low: 248, k_high: 248, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false,
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'tomato_juice', food_name: 'Tomato juice', base_food: 'tomato_juice', category: 'beverage',
    aliases: ['tomato juice'],
    serving_text: '½ cup', serving_qty: 0.5, serving_unit: 'cup', serving_grams: 122,
    k_low: 264, k_high: 264, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, sodium_category: 'canned',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  /* ───────────────── SNACK / SWEET ───────────────── */
  { id: 'potato_chips', food_name: 'Potato chips', base_food: 'potato_chips', category: 'snack_sweet',
    aliases: ['potato chips', 'chips', 'crisps'],
    serving_text: '1 oz', serving_qty: 1, serving_unit: 'oz', serving_grams: 28,
    k_low: 339, k_high: 339, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, sodium_category: 'packaged',
    source: 'AKF/USDA', verify: ['p', 'na'] },

  { id: 'potato_chips_lowfat', food_name: 'Low-fat potato chips', base_food: 'potato_chips', category: 'snack_sweet',
    aliases: ['low-fat potato chips', 'low fat chips', 'baked chips'],
    serving_text: '1 oz', serving_qty: 1, serving_unit: 'oz', serving_grams: 28,
    k_low: 494, k_high: 494, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, sodium_category: 'packaged',
    source: 'AKF/USDA', verify: ['p', 'na'],
    note: 'Counterintuitive: MORE potassium than regular chips.' },

  { id: 'peanut_butter', food_name: 'Smooth peanut butter', base_food: 'peanut_butter', category: 'snack_sweet',
    aliases: ['peanut butter', 'pb'],
    serving_text: '2 tbsp', serving_qty: 2, serving_unit: 'tbsp', serving_grams: 32,
    k_low: null, k_high: null, p_low: 107, p_high: 107, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false, sodium_category: 'packaged',
    source: 'AKF/USDA', verify: ['k', 'na'] },

  { id: 'almonds', food_name: 'Almonds', base_food: 'almonds', category: 'snack_sweet',
    aliases: ['almonds', 'almond'],
    serving_text: '1 oz', serving_qty: 1, serving_unit: 'oz', serving_grams: 28,
    k_low: null, k_high: null, p_low: 132, p_high: 132, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false,
    source: 'AKF/USDA', verify: ['k', 'na'] },

  { id: 'peanuts', food_name: 'Peanuts', base_food: 'peanuts', category: 'snack_sweet',
    aliases: ['peanuts', 'peanut'],
    serving_text: '1 oz', serving_qty: 1, serving_unit: 'oz', serving_grams: 28,
    k_low: null, k_high: null, p_low: 103, p_high: 103, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'plant', swap_pool: false,
    source: 'AKF/USDA', verify: ['k', 'na'] },

  /* ───────────────── MIXED DISH ───────────────── */
  { id: 'chili_beans', food_name: 'Chili with beans', base_food: 'chili', category: 'mixed_dish',
    aliases: ['chili with beans', 'chili', 'chilli'],
    serving_text: '1 cup', serving_qty: 1, serving_unit: 'cup', serving_grams: 256,
    k_low: 934, k_high: 934, p_low: null, p_high: null, na_low: null, na_high: null,
    additive_risk: false, phos_bio: 'mixed', swap_pool: false, sodium_category: 'canned',
    source: 'AKF/USDA', verify: ['p', 'na'] }

  /* Deliberately absent, because the demo depends on it being absent:
     "casserole" must match NOTHING, so the clarify-once path fires. */
];

/* ── Data-quality summary, computed once for the Settings dev panel ── */
const ANCHOR_STATS = (() => {
  const total = ANCHOR_FOODS.length;
  const missingK = ANCHOR_FOODS.filter(f => f.k_low === null).length;
  const missingP = ANCHOR_FOODS.filter(f => f.p_low === null).length;
  const missingNa = ANCHOR_FOODS.filter(f => f.na_low === null).length;
  const swapPool = ANCHOR_FOODS.filter(f => f.swap_pool).length;

  // Audit finding F14: the swap engine matches on category. If a category
  // has zero swap_pool rows, every flagged item in it returns "no fit".
  const byCategory = {};
  ANCHOR_FOODS.forEach(f => {
    byCategory[f.category] = byCategory[f.category] || { total: 0, swaps: 0 };
    byCategory[f.category].total++;
    if (f.swap_pool) byCategory[f.category].swaps++;
  });
  const thinCategories = Object.keys(byCategory).filter(c => byCategory[c].swaps < 2);

  return { total, missingK, missingP, missingNa, swapPool, byCategory, thinCategories };
})();
