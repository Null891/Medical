/* ═══════════════════════════════════════════════════════════════
   SPANISH — es
   ───────────────────────────────────────────────────────────────
   MACHINE TRANSLATION, NOT CLINICALLY REVIEWED. Produced by a
   language model. No native-speaker translator and no renal dietitian
   has read it. The app states this on the language picker, in Spanish,
   and it must keep doing so until a human has actually reviewed this
   file.

   RULES FOR EDITING THIS FILE

   1. NEVER change a number. Every threshold, milligram figure and
      guideline value here is quoted from KDOQI, KDIGO, AKF or NICE.
      5.5 mEq/L is 5.5 mEq/L in every language. The sentence around it
      may be rebuilt however Spanish requires; the digits may not move.
      A test enforces this by comparing the numerals in each string
      against its English original.

   2. Any key you omit falls back to English for that key alone. An
      untranslated string is a small inconsistency; a mistranslated
      clinical instruction is a safety problem. When unsure, omit.

   3. FLAGGED FOR HUMAN REVIEW FIRST — the strings where a rough
      translation is worse than none:
        · consentBody / consentTitle  (consent nobody can read is not consent)
        · refusals.*                  (the app's central promises)
        · learn.warnings              (when to call for help)
        · cards.saltSub               (a documented hazard)
      These are translated here because a Spanish-speaking user reading
      an English consent gate is worse than either option. They are the
      first thing a reviewer should look at.
   ═══════════════════════════════════════════════════════════════ */

const COPY_ES = {

  /* ── Descargos de responsabilidad ── */
  consentTitle: 'Antes de empezar',
  consentBody: [
    'RenalRoute es una herramienta educativa de bienestar, no un dispositivo médico. No diagnostica, trata, cura ni previene ninguna enfermedad.',
    'Las cifras de nutrientes son estimaciones y se muestran como rangos porque pueden estar equivocadas. Cualquier objetivo inicial es un valor educativo común, no una prescripción.',
    'Siga siempre los objetivos y las indicaciones de su nefrólogo y de su dietista renal. No cambie su dieta, sus medicamentos ni su tratamiento de diálisis basándose en esta aplicación.',
    'RenalRoute necesita esta confirmación para continuar: así se mantiene en el terreno educativo y no en el del consejo médico.'
  ],
  consentButton: 'Entiendo — continuar',
  footerDisclaimer: 'Estimaciones con fines educativos — no son consejo médico. Siga los objetivos de su equipo de salud.',
  cardDisclaimer: 'Estimación educativa — confírmelo con su equipo de salud.',

  /* ── Las tres cosas que la aplicación no hará ── */
  refusals: {
    title: 'Tres cosas que RenalRoute no hará',
    lede: 'La mayoría de las aplicaciones de nutrición se muestran seguras de todo. Esta, deliberadamente, no — y aquí está exactamente dónde.',
    items: [
      {
        h: 'No inventará una cifra',
        p: 'Escriba algo que no pueda identificar — un guiso de sobras, un plato sin receta — y le hará una sola pregunta. Si no puede responderla, registra la comida y la marca como "no contabilizada" en lugar de adivinar. Sus totales siguen siendo honestos sobre lo que no incluyen.'
      },
      {
        h: 'No le dará una puntuación de salud',
        p: 'Sin nota, sin racha, sin número sobre diez. Cada cifra aquí es una estimación que puede equivocarse por un margen amplio, y calificar el día de una persona con estimaciones así de amplias sería inventar una certeza que nadie tiene.'
      },
      {
        h: 'No le dirá qué significan sus análisis',
        p: 'Introduzca un resultado de potasio y la aplicación cambiará su tono, no su veredicto. Por encima de 6.0 deja de orientar por completo y le indica que contacte con su equipo de salud. Interpretar un análisis de sangre es tarea de ellos.'
      }
    ],
    footer: 'Todo lo anterior se puede comprobar. Pruebe lo primero ahora mismo si quiere.',
    button: 'Entendido — empezar'
  },

  /* ── Para quién es ── */
  focusLine: 'Diseñada para la enfermedad renal crónica en etapas G3b y G4 — diagnosticada, con restricciones dietéticas indicadas, sin diálisis.',
  focusOffBand: 'RenalRoute está pensada para las etapas G3b y G4. Todo sigue funcionando para usted; simplemente la información educativa está escrita pensando en ese grupo.',

  /* ── Objetivos y procedencia ── */
  provenanceChip: 'Usando rangos educativos generales — fije los suyos con su equipo de salud',
  targetsKPNote:
    'Estos son puntos de partida comunes, no prescripciones: fije los suyos con su equipo de salud. ' +
    'Las guías de nutrición renal (KDOQI 2020) no establecen un límite fijo en miligramos para el potasio ni para el fósforo; ' +
    'recomiendan ajustar la ingesta para mantener los valores en sangre dentro del rango, de forma individualizada.',
  targetsNaNote:
    'Sodio: KDOQI 2020 recomienda menos de 2.3 g (2,300 mg) al día para la ERC en etapas 3–5 ' +
    '(recomendación de grado 1B). KDIGO 2024 sugiere un límite más estricto de 2.0 g (2,000 mg). ' +
    'El rango educativo general de 2,000 mg cumple con ambos.',

  /* ── Configuración inicial ── */
  onb: {
    stageUnknown: 'No pasa nada: puede añadirlo más tarde, o nunca. Solo decide qué información educativa verá.',
    stageInFocus: (s) => `${s} es exactamente para quien está hecha esta aplicación. La orientación que verá está escrita para su etapa.`,
    stageOutOfFocus: (s) => `Anotado — ${s}. RenalRoute está pensada para G3b y G4, así que parte de la información estará escrita para ellos. Todo sigue funcionando y ninguna cifra cambia.`,
    nutrientNone: 'Nada seleccionado, así que los tres anillos tienen el mismo peso. Es lo correcto si no está seguro.',
    nutrientAll: 'Los tres destacan en su panel: lo habitual cuando el equipo de salud vigila todo.',
    nutrientSome: (names) => `${names} destacarán en su panel. Los demás se siguen contando por completo; simplemente dejan de competir por su atención.`,
    hardestNone: 'Elija una y la aplicación se abrirá preparada para ello.',
    hardestEcho: (label) => `La aplicación se abrirá preparada para ${label}. Puede cambiarlo cuando quiera desde la parte superior del panel.`
  },

  /* ── Comidas ── */
  emptyDashboard:
    'Su margen diario de potasio, fósforo y sodio: los anillos muestran lo que le queda. ' +
    'Hoy no ha registrado nada todavía; basta con palabras sencillas, por ejemplo "pollo, arroz y judías verdes".',
  uncountedItem: 'No lo hemos contabilizado. No teníamos suficiente detalle para estimar este alimento.',
  analyzeError: 'No hemos podido analizar eso ahora mismo. Su texto está guardado — inténtelo otra vez o elija los alimentos de la lista.',
  pickerEmpty: 'Busque en la lista de alimentos — pruebe con "patata" o "leche".',
  pickerNoResults: 'No hay coincidencias. Pruebe con una palabra más sencilla, o regístrelo más tarde.',
  deleteConfirm: '¿Eliminar esta entrada? No se puede deshacer.',
  mutationFailed: 'Eso no se ha guardado. Inténtelo de nuevo.',

  /* ── Cocina ── */
  kitchen: {
    fitLede:
      'Las recetas de abajo caben en lo que le queda, contadas por el extremo alto de su rango — la lectura ' +
      'prudente, la misma que usan los anillos. Que quepa en el presupuesto es aritmética, no un veredicto de salud.',
    allLede:
      'Todas las recetas que RenalRoute puede calcular. Cada una está hecha solo con alimentos de la tabla de referencia, ' +
      'así que las cifras llevan los mismos rangos y las mismas fuentes que cualquier cosa que registre a mano.',
    noneFit:
      'Nada cabe en lo que queda hoy, y eso no es un fallo: es la aplicación siendo franca con usted. ' +
      'Mañana se empieza de cero, y su equipo de salud puede ayudarle a planificar los alimentos que quiere conservar.',
    overLede: 'Cerca, pero por encima según la cuenta prudente. Se muestra cuánto, para que lo juzgue usted.',
    overBy: (mg) => `Unos ${mg} mg de potasio más de los que le quedan hoy.`,
    needTargets: 'Fije primero sus objetivos diarios y esta pantalla podrá decirle qué cabe. Ajustes → Objetivos diarios.',
    shopLede: 'Todo lo que necesitan las recetas, agrupado por pasillo. Funciona sin conexión y se copia como texto.'
  },

  /* ── Análisis de laboratorio ── */
  labScan: {
    reading: 'Leyendo su informe…',
    readTitle: 'Esto es lo que hemos leído',
    readBody: 'Compárelo con la hoja que tiene delante. No se guarda nada hasta que pulse guardar, y la foto nunca se almacena.',
    notOnReport: 'No aparece en este informe — puede escribirlo abajo.',
    unreadable: 'No hemos podido leer esa imagen. Escriba sus cifras abajo; se tarda unos veinte segundos.',
    gate: (v, consequence) => `Aquí pone ${v}. Compruébelo con su informe antes de guardar.`,
    gateButton: 'Coincide con mi informe',
    confirmed: 'Confirmado con su informe.',
    save: 'Guardar estos valores',
    saveBlocked: 'Compruebe primero el valor marcado'
  },

  /* ── Educación: la tarjeta con más peso clínico ── */
  learn: {
    warnings: {
      title: 'Señales de alerta que conviene conocer',
      body: [
        'Pregunte a su equipo de salud cuáles son SUS señales de alerta y cuándo quieren que llame. Lo siguiente es información general, y lo más importante de ella es lo poco fiables que son los síntomas.',
        'El potasio alto a menudo no causa ningún síntoma hasta que ya es peligroso. Sentirse bien no es prueba de que su potasio esté bien: solo un análisis de sangre responde a esa pregunta. Nunca use cómo se siente para decidir si se salta un análisis o una cita.',
        'Cuando sí causa síntomas, pueden incluir debilidad muscular o pesadez en las piernas, entumecimiento u hormigueo, latidos irregulares o inusualmente lentos, náuseas y cansancio poco habitual. Todos ellos tienen muchas otras causas.',
        'Dolor en el pecho, latidos acelerados o irregulares, dificultad para respirar o debilidad muscular intensa son urgencias. Llame a los servicios de emergencia: no espere y no lo busque antes en internet.',
        'Algo concreto que conviene saber: la mayoría de las sales "bajas en sodio" o "ligeras" sustituyen el sodio por cloruro de potasio. En un caso publicado, una persona mayor con enfermedad renal alcanzó un potasio de 7.5 mEq/L después de que se añadiera una de ellas a sus comidas. Revise la etiqueta de cualquier sustituto de la sal.',
        'RenalRoute no puede decirle si algo de esto le afecta. Registra comida. Si introduce un resultado de potasio de 6.0 o más, deja de dar orientación alimentaria por completo y le indica que contacte con su equipo de salud.'
      ]
    }
  },

  /* ── Tarjetas de aviso ── */
  cards: {
    saltSubTitle: 'Los sustitutos de la sal son un riesgo de potasio.',
    saltSub:
      'La mayoría de los sustitutos de la sal reemplazan el sodio por cloruro de potasio. Para muchas personas ' +
      'es un buen cambio, pero con la función renal reducida puede ser peligroso, y las guías del NICE aconsejan ' +
      'a las personas con enfermedad renal no usarlos. Las hierbas, las especias o el limón son alternativas más ' +
      'seguras — y coméntelo con su equipo de salud.'
  },

  /* ── Copia de seguridad ── */
  backup: {
    confirm: 'Restaurar reemplaza todo lo que hay ahora en la aplicación — comidas, análisis, objetivos y ajustes — por el contenido de ese archivo. No se puede deshacer. ¿Continuar?',
    restored: (meals, labs) => `Se han restaurado ${meals} comida${meals === 1 ? '' : 's'} y ${labs} resultado${labs === 1 ? '' : 's'} de laboratorio.`
  }
};

/* Self-registration, and it is not optional.

   A top-level `const` in a classic script goes into the global LEXICAL
   environment — it never becomes a property of window or globalThis.
   So i18n could not find these tables by name, and every language
   silently fell back to English while the picker cheerfully reported a
   coverage percentage. The feature would have shipped completely
   inert, in the browser as well as in the tests.

   Registering into a plain object is the fix that works in every
   environment: browser, VM sandbox, and anything else that loads these
   as scripts rather than modules. */
(function register() {
  var g = (typeof globalThis !== 'undefined') ? globalThis : window;
  g.COPY_TABLES = g.COPY_TABLES || {};
  g.COPY_TABLES['es'] = COPY_ES;
})();
