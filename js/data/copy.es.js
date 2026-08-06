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

/* ═══════════════════════════════════════════════════════════════
   SPANISH — second wave.
   ───────────────────────────────────────────────────────────────
   Everything the first table did not cover. Same rules apply and the
   first one is worth repeating: NO NUMBER MOVES. 5.5 mEq/L, 420 mg,
   90%, 2,500 — every digit here is quoted from KDOQI, KDIGO, AKF or
   NICE, and a test compares the numerals in each string against its
   English original on every run.

   Register: es-US rather than es-ES. The largest Spanish-speaking
   population this app is likely to reach is in the United States, so
   the vocabulary leans that way where the two differ — "papa" over
   "patata", "arvejas" avoided in favour of the neutral "guisantes".
   ═══════════════════════════════════════════════════════════════ */
const COPY_ES_2 = {

  lang: {
    englishNote: 'El inglés es el idioma en el que se escribió y se revisó esta aplicación.',
    machineNote:
      'Estas traducciones fueron generadas por un modelo de lenguaje y no han sido revisadas por un ' +
      'hablante nativo ni por un dietista renal. Cada número, umbral y cifra de las guías es idéntico ' +
      'a la versión en inglés. Lo que aún no está traducido aparece en inglés en lugar de adivinarse.',
    changed: 'Idioma cambiado'
  },

  storage: {
    unavailable:
      'Este navegador no permite que RenalRoute guarde nada — normalmente por navegación privada. ' +
      'Nada de lo que escriba se conservará al cerrar esta pestaña. Abra RenalRoute en una ventana normal.',
    quota:
      'El almacenamiento de este navegador para RenalRoute está lleno, así que no se está guardando nada nuevo. ' +
      'Exporte una copia de seguridad desde Ajustes y luego borre algunas entradas antiguas para hacer sitio.',
    recovered: 'Ya se está guardando de nuevo.'
  },

  dataNotice:
    'Los valores de nutrientes son estimaciones tomadas de tablas publicadas, no verificadas clínicamente. ' +
    'Solo para uso educativo — en Ajustes están todas las fuentes y todos los huecos.',

  gaps: {
    title: 'Lo que no sabemos',
    lede:
      'Tres tipos distintos de hueco: cifras que faltan en nuestra tabla de alimentos, días que superaron ' +
      'sus objetivos y registros que se están quedando antiguos. Nada de esto es una puntuación.',
    empty: 'Nada que informar — y esa es una respuesta real, no una pantalla vacía.',
    data: {
      title: 'Cifras que no tenemos',
      lede:
        'Alimentos que ha registrado y que nuestra tabla no puede calcular por completo. No son ceros. ' +
        'Un nutriente que no tenemos se deja fuera del total y el día se marca como parcial, que es por lo ' +
        'que a veces un anillo dice «al menos».',
      none: 'Todos los alimentos que ha registrado tienen las tres cifras. No se está dejando nada fuera.',
      food: (name, times) => `${name} — registrado ${times} ${times === 1 ? 'vez' : 'veces'}`,
      missingList: (names) => {
        const n = names.length;
        const joined = n === 1 ? names[0]
          : n === 2 ? `${names[0]} ni ${names[1]}`
          : `${names.slice(0, -1).join(', ')} ni ${names[n - 1]}`;
        return `sin cifra de ${joined}`;
      },
      affected: (days, logged, nutrient) =>
        `${days} de sus últimos ${logged} días registrados no tienen en algún punto una cifra de ${nutrient.toLowerCase()}.`,
      uncounted: (n) =>
        `${n} ${n === 1 ? 'elemento no pudo' : 'elementos no pudieron'} asociarse a ningún alimento, así que no se contó nada por ${n === 1 ? 'él' : 'ellos'}.`,
      why:
        'Nuestra tabla tiene 55 alimentos y no todos ellos tienen aún las tres cifras publicadas. ' +
        'Preferimos dejar un hueco antes que imprimir un número que nadie midió.'
    },
    intake: {
      title: 'Días frente a sus objetivos',
      lede: (n) => `Sus últimos ${n} días, por nutriente.`,
      noTargets:
        'No hay objetivos definidos, así que no hay nada con lo que comparar los días. ' +
        'Puede añadirlos en Ajustes, o preguntar a su equipo de atención cuáles son los suyos.',
      noTarget: (label) => `Sin objetivo de ${label.toLowerCase()}.`,
      over: (n) => `${n} ${n === 1 ? 'día por encima' : 'días por encima'}`,
      under: (n) => `${n} ${n === 1 ? 'día dentro' : 'días dentro'}`,
      partial: (n) => `${n} ${n === 1 ? 'día que no pudimos' : 'días que no pudimos'} totalizar`,
      partialWhy: 'Se cuentan aparte — un día con una cifra que falta no es un día por debajo del objetivo.',
      none: 'Todavía no hay nada registrado en este periodo.'
    },
    care: {
      title: 'Registros que se están quedando antiguos',
      lede: 'Lo que la aplicación tiene y cuándo supo de ello por última vez.',
      none: 'Aquí todo está al día.'
    }
  },

  foods: {
    title: 'La lista de alimentos',
    lede:
      'Todos los alimentos que RenalRoute puede calcular, con las cifras que usa y de dónde salió cada una. ' +
      'Rangos, no números sueltos — los honestos son rangos.',
    searchLabel: 'Buscar alimentos',
    sortName: 'A–Z',
    sortK: 'Potasio',
    sortP: 'Fósforo',
    sortNa: 'Sodio',
    pricedOnly: 'Solo alimentos que podemos calcular para el nutriente ordenado',
    count: (shown, total) => `Mostrando ${shown} de ${total} alimentos.`,
    none: 'No hubo coincidencias. Pruebe con una palabra más simple — «papa» en lugar de «papa asada con cáscara».',
    unpriced: (n, nutrient) =>
      `${n} ${n === 1 ? 'alimento que no podemos ordenar' : 'alimentos que no podemos ordenar'} por ${nutrient}`,
    unpricedWhy:
      'Todavía no hay una cifra publicada de ese nutriente en nuestra tabla, así que se listan en lugar de ' +
      'ordenarse. No son cero — simplemente no lo sabemos.',
    foot:
      'Las cifras corresponden a la ración indicada. Donde un nutriente está en blanco, la tabla no tiene ' +
      'valor para él y la aplicación lo deja fuera de sus totales en lugar de contarlo como nada.'
  },

  scenes: { change: 'Cambiar', close: 'Listo' },

  firstMeal: {
    title: 'Ese es todo el ciclo',
    body:
      'Usted escribió palabras. RenalRoute extrajo los alimentos y sus raciones y luego los calculó con cifras ' +
      'publicadas — no a partir de una suposición. Los números vienen como rangos porque los honestos lo son.',
    foot:
      'Lo que no se pudo identificar queda registrado y marcado como «No contado» en lugar de inventarse. ' +
      'Esta nota solo se muestra una vez.'
  },

  share: {
    shared: 'Enviado',
    copied: 'Copiado — péguelo donde lo necesite',
    downloaded: 'Descargado',
    cancelled: 'No se envió nada',
    failed: 'No se pudo crear el archivo'
  },

  checklist: {
    title: 'Qué está desactualizado',
    allCurrent: 'Aquí no hay nada quedándose antiguo.',
    foot:
      'Fechas de su propio registro — no es una lista de tareas ni un calendario. Con qué frecuencia necesita ' +
      'análisis o mediciones lo decide su equipo de atención, no esta aplicación.'
  },

  vitals: {
    intro:
      'RenalRoute anota estos datos y los entrega — no los interpreta. Aquí no hay categorías, ni colores, ni ' +
      'flechas, porque lo que significa una medición depende de sus objetivos, sus medicamentos y de qué está ' +
      'tratando su equipo. Todo aparece en su pasaporte de salud y en su exportación.',
    saved: 'Registrado.',
    empty: 'Todavía no hay nada registrado. Son las cifras que pide una consulta de nefrología y que casi nadie lleva a mano.',
    historyTitle: 'Lo que ha registrado',
    remove: 'Quitar'
  },

  appts: {
    intro:
      'RenalRoute no envía recordatorios — un recordatorio que una aplicación promete y no entrega, para una cita ' +
      'de la clínica, es peor que ninguno. Lo que sí hace es llevar sus preguntas a su pasaporte de salud, para que ' +
      'la tarjeta que entre con usted a la consulta ya las tenga.',
    qNote: 'Lo que más se olvida. Anótelo cuando se le ocurra, no de camino a la cita.',
    next: (days, who) => days === 0 ? `Hoy${who ? ' — ' + who : ''}.`
      : days === 1 ? `Mañana${who ? ' — ' + who : ''}.`
      : `En ${days} días${who ? ' — ' + who : ''}.`,
    none: 'No hay ninguna cita guardada. Añada una y sus preguntas viajarán con su pasaporte.',
    listTitle: 'Citas guardadas',
    saved: 'Guardado.',
    remove: 'Quitar'
  },

  demo: {
    title: '¿Cómo le gustaría empezar?',
    lede:
      'RenalRoute no tiene cuentas ni registro. Todo se queda en este navegador, elija lo que elija — no se sube ' +
      'nada y no se crea nada a su nombre.',
    note:
      'Los dos pacientes de ejemplo de abajo son inventados, para que pueda ver una semana entera sin escribir ' +
      'nada. Aquí no hay nada protegido ni oculto tras una contraseña — en Ajustes está exactamente dónde viven sus datos.',
    choices: [
      { key: 'fresh', name: 'Configurarlo como yo',
        what: 'El primer arranque normal — lo que la aplicación no hará y luego cuatro preguntas. Alrededor de un minuto, nada rellenado de antemano, y puede saltarse cualquier parte.' },
      { key: 'frank', name: 'Continuar como Frank',
        what: 'Una semana de comidas registradas y un análisis reciente. La forma más limpia de ver el ciclo diario: qué queda hoy y qué puede ser la cena.' },
      { key: 'maria', name: 'Continuar como Maria — todo usado',
        what: 'Una paciente que lo ha usado todo: dos análisis, peso y presión arterial registrados, síntomas anotados, una cita con preguntas escritas, un pasaporte de salud completo, medicamentos incluido un quelante de fósforo, y suficiente historial para que el detector de patrones tenga algo que decir.' }
    ],
    hasRealData:
      'Este navegador ya tiene datos reales, así que la demostración no se cargará — sobrescribiría lo que hay. ' +
      'Abra la demostración en una ventana privada, o exporte primero una copia de seguridad desde Ajustes.',
    banner: (who) => `Viendo a ${who} — un paciente de ejemplo, no el registro de una persona real.`,
    signOut: 'Salir de la demostración',
    signedOut: 'Demostración terminada y datos de ejemplo borrados.'
  },

  install: {
    title: 'Ponga RenalRoute en su pantalla de inicio',
    why:
      'Se abre como una aplicación, funciona sin cobertura y deja de tener que buscar una pestaña del navegador en ' +
      'el pasillo del supermercado. No se sube nada y no se crea ninguna cuenta — instalar cambia dónde vive el ' +
      'icono, no dónde viven sus datos.',
    button: 'Añadir a la pantalla de inicio',
    ios: 'En un iPhone o iPad: toque el botón Compartir en la parte inferior de Safari (el cuadrado con una flecha hacia arriba), baje y toque «Añadir a pantalla de inicio».',
    installed: 'Está usando la aplicación instalada. Funciona sin conexión y sus datos se quedan en este dispositivo.',
    unavailable:
      'Su navegador no ha ofrecido la opción de instalar aquí. RenalRoute funciona exactamente igual en una pestaña ' +
      'normal — también puede guardarla en marcadores.',
    accepted: 'Añadida. Busque RenalRoute en su pantalla de inicio.',
    dismissed: 'Sin problema — la aplicación funciona igual en una pestaña del navegador.'
  },

  meds: {
    binderTiming: 'Los quelantes de fósforo funcionan cuando se toman CON la comida, no antes ni después.',
    binderNamed: (names) => `Tiene ${names} en su lista.`,
    disclaimer:
      'Siga las indicaciones de horario que le dio quien se los recetó. RenalRoute no gestiona medicamentos — guarda ' +
      'lo que usted escribe para que pueda enseñárselo a alguien, y nunca comprueba dosis, interacciones ni horarios ' +
      'más allá de esta nota.',
    passportHint: 'Lo que esté aquí también aparece en su pasaporte de salud.'
  },

  kitchen: {
    planLede:
      'Tres días construidos frente a sus objetivos diarios completos, no frente a lo que sobra hoy. Voraz en lugar de ' +
      'óptimo a propósito: cada elección es «¿sigue cabiendo lo siguiente?», algo que usted puede comprobar sumando.',
    planThin:
      'No hay suficientes recetas que encajen en sus objetivos para llenar este día. Eso es un límite de nuestro ' +
      'pequeño recetario, no un veredicto sobre sus objetivos.',
    planCaveat:
      'Una sugerencia, nunca una prescripción. El tamaño de las raciones, el método de cocción y su propio apetito ' +
      'mueven estas cifras, y el plan de su equipo de atención está por encima de cualquier cosa que haya aquí.',
    provenance:
      'Cada número de esta receta viene de la misma tabla de referencia que usa el resto de la aplicación, calculado ' +
      'por el mismo código que una comida que usted escriba. Aquí no se introdujo nada a mano.'
  },

  labScan: {
    nothingFound:
      'No pudimos encontrar potasio, fósforo ni eGFR en esa imagen. Pruebe con una foto más recta y con mejor luz, ' +
      'o escriba las cifras abajo — eso siempre funciona.',
    failed: 'El escaneo no funcionó ahora mismo. Su informe no ha cambiado, y escribir las cifras abajo sigue funcionando.',
    oddUnit: (u) =>
      `Su informe muestra el fósforo en ${u}, y RenalRoute espera mg/dL. No lo hemos convertido — ` +
      'consúltelo con su equipo de atención en lugar de fiarse de un número en la unidad equivocada.',
    dated: (d) => `Informe con fecha ${d}.`
  },

  references: {
    title: 'De dónde vienen nuestras cifras',
    lede:
      'Cada postura que toma esta aplicación y la fuente que hay detrás. Las aplicaciones de nutrición rara vez ' +
      'publican esto, que es exactamente por lo que vale la pena publicarlo — un número que no se puede rastrear ' +
      'es un número que no se puede comprobar.',
    unverifiedNote: (n) =>
      `${n} de estas están marcadas como no verificadas: se transcribieron de un paquete de fuentes y este equipo ` +
      `todavía no las ha vuelto a derivar. Decirlo es justamente el punto — una aplicación que solo enumera lo que ` +
      `la favorece no es una referencia, es un folleto.`,
    usedLabel: 'Se usa para',
    verifiedChip: 'Verificado',
    unverifiedChip: 'Aún sin volver a derivar'
  },

  captionEducation:
    'Rangos de partida generales de educación al paciente — no una prescripción. Sustitúyalos cuando su equipo de atención le dé cifras.',
  captionEducationSettings:
    'Usando rangos educativos generales (2,500 K / 900 P / 2,000 Na) — no una prescripción. Sustitúyalos cuando su equipo de atención le dé cifras.',
  captionCareTeam:
    'Los objetivos de su equipo de atención. KDOQI 2020 no fija ningún objetivo en mg de potasio ni de fósforo — estas cifras son suyas y de su equipo.',
  captionNone: 'Sin objetivos definidos — pregunte a su equipo de atención por los suyos.',
  targetOutOfBounds:
    'Eso parece estar fuera del rango que admite esta aplicación. Vuelva a comprobar el número. Si su equipo de ' +
    'atención realmente fijó este objetivo, siga su indicación — los límites de esta aplicación son técnicos, no médicos.',
  capReached: 'Ha alcanzado el límite de análisis de hoy — la lista de alimentos sigue funcionando.',
  photoUnreadable: 'No pudimos distinguir la comida en esa foto. Inténtelo con mejor luz, o escriba lo que comió.',
  photoMealLabel: 'Comida a partir de una foto',
  emptyExtraction:
    'No detectamos ningún alimento ahí. Pruebe a nombrarlos de uno en uno — por ejemplo: pollo, arroz, ejotes.',
  ambientNote:
    'Sintetizado en el navegador, así que no descarga nada. No se iniciará por su cuenta — y se mantiene en ' +
    'silencio si ha pedido movimiento reducido en su dispositivo.',
  ambientUnavailable: 'Este navegador no reproducirá sonido de fondo.',
  takeYourTime: 'Tómese su tiempo — lo que ha escrito está guardado y seguirá aquí si se aleja un momento.',
  didYouMean: '¿Quiso decir alguno de estos?',
  didYouMeanApplied: (name) => `Usando ${name}. Cambie la ración abajo si no es correcta.`,

  unrecognised: {
    one: (name) => `Lo sentimos — no reconocemos «${name}», y preferimos decirlo antes que adivinarlo.`,
    why: 'Puede que aquí se escriba de otra forma, o puede que todavía no esté en nuestra lista de alimentos.',
    tryList: 'Ver la lista de alimentos',
    tryLabel: 'Comprobar su etiqueta',
    keepAnyway:
      'Puede dejarlo en la comida de todos modos — aparecerá como no contado, y el día se marca como parcial para ' +
      'que nada quede infravalorado en silencio.',
    overflow: (shown, dropped) =>
      `Era una lista larga — tomamos los primeros ${shown} alimentos y dejamos fuera ${dropped}. ` +
      `Registre el resto como una segunda comida para que no se pierda nada.`
  },

  photoPortion: {
    small: 'Leído de la foto como una ración pequeña. El rango es más amplio de lo habitual porque el tamaño de la ración juzgado desde una imagen es aproximado.',
    average: 'Leído de la foto como una ración media. El rango es más amplio de lo habitual porque el tamaño de la ración juzgado desde una imagen es aproximado.',
    large: 'Leído de la foto como una ración grande. El rango es más amplio de lo habitual porque el tamaño de la ración juzgado desde una imagen es aproximado.'
  },
  photoPortionFix:
    'También se inclina hacia arriba en lugar de hacia abajo, ya que las fotos tienden a subestimar las raciones. ' +
    'Toque una ración abajo y se ajusta a su número.',
  leachApplied:
    'Contado más bajo porque hervir y escurrir elimina potasio. La estimación se mantiene deliberadamente prudente — ' +
    'las reducciones publicadas son mayores que la aplicada aquí.',
  nothingCounted: 'Registrado, pero no se pudo contar nada. Toque para añadir detalle.',
  clarifyUse: 'Usar esta respuesta',
  clarifySkip: 'Omitir — registrarlo sin contarlo',
  reviewEmpty: 'No queda nada que guardar — vuelva atrás y edite el texto de su comida.',
  saveFailed: 'No se pudo guardar. Su comida sigue aquí — toque Guardar en hoy para volver a intentarlo.',

  coverage: {
    intro:
      'RenalRoute funciona con una tabla curada de valores publicados de alimentos. Es deliberadamente pequeña y ' +
      'tiene huecos. Esos huecos se listan aquí en lugar de ocultarse, porque un número cuyos límites no se ven vale ' +
      'menos que uno cuyos límites sí se ven.',
    missing:
      'Donde falta un valor, el alimento igualmente se registra y se cuenta para los nutrientes que sí tenemos — ese ' +
      'nutriente simplemente se deja fuera del total, y el día se marca como parcial en lugar de sumarse en silencio ' +
      'como si no faltara nada.',
    thin:
      'Estos grupos de alimentos tienen muy pocos miembros bajos en potasio en la tabla como para que valga la pena ' +
      'sugerir un cambio, así que para ellos no aparece ninguna línea de sustitución. Eso es un hueco en nuestros ' +
      'datos, no un veredicto de que no exista una opción mejor.',
    verify:
      'Todos los valores de aquí se transcribieron de fuentes publicadas y están pendientes de volver a derivarse ' +
      'frente a USDA FoodData Central. Abra cualquier alimento de una comida para ver su fuente y cuáles de sus ' +
      'cifras siguen sin verificar.'
  },

  picker: {
    lowKTitle:
      '150 mg de potasio o menos por ración — el propio punto de corte de la American Kidney Fund para llamar a una ' +
      'ración baja en potasio. Describe esta ración, no el día entero.'
  },

  source: {
    cited: (food, serving, src) => `${food}, por ${serving}. Valores de ${src}.`,
    unverified: (list) =>
      `Aún sin volver a comprobar frente a USDA FoodData Central: ${list}. Esas cifras son las que ` +
      `más probablemente cambien, y por eso se muestran como rangos.`
  },

  barcode: {
    invalid: 'Eso no parece un código de barras — debería tener entre 8 y 14 dígitos.',
    looking: 'Buscándolo…',
    scanning: 'Apunte la cámara al código de barras.',
    found: (label) => `Encontrado ${label}. Ingredientes rellenados abajo — compruebe que coinciden con el paquete.`,
    notFound:
      'Ese código de barras no está en la base de datos abierta. Eso no dice nada sobre el alimento — muchos ' +
      'productos simplemente no están listados. Escriba los ingredientes abajo.',
    noIngredients: (name) => `${name} está listado, pero sin lista de ingredientes. Escriba los ingredientes abajo.`,
    failed: 'La búsqueda no funcionó ahora mismo. Aún puede escribir los ingredientes abajo.',
    offline: 'Está sin conexión, así que la búsqueda no puede ejecutarse — pero escribir los ingredientes abajo sigue funcionando.',
    cameraDenied: 'La cámara no está disponible, así que introduzca el número a mano.'
  },

  label: {
    idle: 'Pegue una lista de ingredientes arriba y RenalRoute nombrará lo que encuentre.',
    noneTitle: 'No se marcó nada en lo que pegó.',
    noneBody:
      'Eso significa que ninguno de los aditivos de fosfato, ingredientes con potasio añadido o sustitutos de la sal ' +
      'que RenalRoute conoce por su nombre apareció en esta lista. No significa que el alimento no tenga ninguno — ' +
      'los nombres de los aditivos cambian y algunos ingredientes se agrupan bajo términos generales. Ante la duda, ' +
      'pregunte a su equipo de atención.',
    ruleTitle: 'El truco que vale la pena recordar',
    ruleBody:
      'Cualquier ingrediente que contenga «FOS» es fosfato añadido, y el fosfato añadido se absorbe casi por completo ' +
      '— más del 90%, frente a menos del 40% de los alimentos vegetales. Rara vez aparece en el panel nutricional, así ' +
      'que la lista de ingredientes es el único sitio donde se ve. Lo mismo pasa con el potasio: dos palabras en las ' +
      'que una es potasio merecen una segunda mirada.'
  },

  today: {
    nothingYet: 'Todavía no hay nada registrado — los anillos muestran su día completo por delante.',
    noTargets: 'Sin objetivos definidos, así que esto es un registro y no una comparación.',
    room: 'Queda margen en los tres hoy.',
    close: 'Acercándose en uno de los tres.',
    over: 'Por encima en uno de los tres — vale la pena mirarlo antes de su próxima comida.',
    paused: 'El acompañamiento está en pausa mientras su resultado de potasio esté alto. El registro sigue funcionando.',
    partial: (n) =>
      `${n} ${n === 1 ? 'elemento de hoy no tiene' : 'elementos de hoy no tienen'} ` +
      'cifra publicada, así que tiene un poco menos de margen del que se muestra.'
  },

  emptyFacts: [
    'Media taza de espinacas cocidas concentra unas cinco veces las hojas — y cinco veces el potasio — de media taza cruda (420 frente a 84 mg).',
    'Las papas fritas bajas en grasa llevan en realidad más potasio que las normales (494 frente a 339 mg por onza).',
    'En una encuesta a pacientes en diálisis, el 93% sabía que la cola contiene azúcar — solo el 25% sabía que contiene fosfato.'
  ],
  loadError: 'No se pudieron cargar las comidas de hoy. Deslice para actualizar.',
  sodiumPartial: 'Los rangos de sodio son amplios a propósito — los alimentos envasados y de restaurante varían mucho.',
  noLabsCard:
    'No hay análisis en el archivo — y no pasa nada. RenalRoute funciona con orientación general: sus objetivos son ' +
    'puntos de partida comunes, y los alimentos integrales no se marcan por defecto. Añadir un resultado reciente de ' +
    'potasio o fósforo ajusta la orientación a usted. Es opcional, nunca obligatorio.',
  statusPartial: 'Parcialmente contado',
  partialChip: (n) => `${n} ${n === 1 ? 'elemento sin calcular' : 'elementos sin calcular'}`,
  partialTitle:
    'Algunos alimentos de las comidas de hoy no tienen cifra publicada de este nutriente en nuestra tabla, así que ' +
    'quedan registrados pero fuera de este total. El número real es más alto que el mostrado — nunca más bajo. ' +
    'Vea en Ajustes exactamente qué valores faltan.',
  statusOk: 'En camino',
  statusWarn: 'Acercándose',
  statusDanger: 'Por encima del presupuesto',

  labImplausible: (analyte, unit) =>
    `Ese valor parece poco probable para ${analyte} (${unit}). Vuelva a comprobar su informe de laboratorio — ` +
    `esta entrada no se guardó. Si el valor realmente está en su informe, contacte con su equipo de atención en lugar de con esta aplicación.`,
  staleNudge: (analyte) =>
    `Su último resultado de ${analyte} tiene más de 90 días. Los valores de laboratorio cambian — si tiene análisis más nuevos, ` +
    `añada el resultado para que la orientación siga a la par con usted.`,

  kMode: {
    low: (v) =>
      `Su último resultado de potasio (${v} mEq/L) está por debajo del rango habitual (3.5–5.0). Un resultado bajo no es ` +
      `algo sobre lo que esta aplicación pueda orientar — por favor no restrinja más por su cuenta, y coméntelo con su ` +
      `equipo de atención. RenalRoute no aplicará mensajes de restricción de potasio mientras esto sea así.`,
    normal: (v, d) =>
      `Su último resultado de potasio (${v} mEq/L, introducido ${d}) está en el rango habitual (3.5–5.0 — el rango de su propio ` +
      `informe de laboratorio es el que cuenta). Las frutas, verduras, legumbres y cereales integrales no están restringidos por ` +
      `defecto. RenalRoute solo intervendrá cuando las cuentas de su presupuesto diario no cuadren.`,
    caution: (v) =>
      `Su último resultado de potasio (${v} mEq/L) está ligeramente por encima del rango habitual (3.5–5.0). RenalRoute ha ` +
      `cambiado a modo de precaución: verá avisos más tempranos en comidas más altas en potasio. Esto es orientación ` +
      `educativa, no un diagnóstico. Si aún no lo ha hecho, comente este resultado con su equipo de atención.`,
    restricted: (v) =>
      `Su último resultado de potasio (${v} mEq/L) está por encima de 5.5 — conviene comentarlo pronto con su equipo de atención. ` +
      `RenalRoute está ahora en modo restringido: educación proactiva sobre el potasio y ninguna sugerencia de sustitución — a este ` +
      `nivel debe guiar el plan de su equipo de atención, no el apaño de una aplicación. Si ya le han dado indicaciones, sígalas.`,
    paused: (v) =>
      `Un nivel de potasio de ${v} mEq/L puede ser peligroso. RenalRoute no puede dar orientación alimentaria a este nivel y ` +
      `ha pausado todo el acompañamiento. Por favor, contacte ahora con su equipo de nefrología o busque atención médica. Puede seguir ` +
      `registrando comidas, y el acompañamiento se reanudará cuando se introduzca un resultado más nuevo por debajo de 6.0.`
  },

  kChip: {
    low: 'Potasio: por debajo del rango habitual',
    normal: 'Potasio: orientación de rango habitual',
    caution: 'Potasio: precaución',
    restricted: 'Potasio: restringido',
    paused: 'Potasio: orientación en pausa',
    no_lab: 'Potasio: sin análisis en el archivo'
  },

  pMode: {
    below_range: (v) =>
      `Su último resultado de fósforo (${v} mg/dL) está por debajo del rango habitual (2.5–4.5) — conviene mencionarlo a ` +
      `su equipo de atención. (Si su informe muestra el fósforo en mmol/L — habitual fuera de EE. UU. — conviértalo o ` +
      `consúltelo con su equipo; RenalRoute espera mg/dL.)`,
    normal: (v, d) =>
      `Su último resultado de fósforo (${v} mg/dL, introducido ${d}) está en el rango habitual (2.5–4.5). RenalRoute ` +
      `centrará la orientación sobre el fósforo en las fuentes aditivas (ingredientes con «FOS»), que se absorben casi ` +
      `por completo, más que en los alimentos integrales.`,
    caution: (v) =>
      `Su último resultado de fósforo (${v} mg/dL) está por encima del rango habitual (2.5–4.5). Atención especial a los ` +
      `aditivos de fosfato en colas, embutidos y carnes curadas, quesos procesados y bollería envasada — el fosfato aditivo ` +
      `se absorbe casi por completo, a diferencia del fósforo unido en los alimentos integrales.`
  },

  pChip: {
    below_range: 'Fósforo: por debajo del rango habitual',
    normal: 'Fósforo: orientación de rango habitual',
    caution: 'Fósforo: precaución',
    no_lab: 'Fósforo: sin análisis en el archivo'
  },

  lowModeRing: 'Su equipo de atención está manejando su potasio. RenalRoute no lo está siguiendo frente a un límite ahora mismo.',

  egfrEducation: (n, stage, range) =>
    `El eGFR que introdujo (${n}) cae en el rango etiquetado ${stage} (${range} mL/min/1.73 m²) en la escala KDIGO ` +
    `que usa su equipo de atención. Esta categoría de FG se muestra solo con fines educativos — nunca cambia sus objetivos ni su modo ` +
    `de orientación, y no es un diagnóstico. Sus objetivos vienen de su equipo de atención.`,

  spinachTeaching:
    '¿Sabía que media taza de espinacas cocidas concentra unas cinco veces las hojas — y cinco veces el potasio — de media taza cruda (420 frente a 84 mg)?'
};


/* The two groups the first pass left partly translated. Stated in full
   here, because a deep merge fills key by key and a half-filled group
   would leave a Spanish card with English sentences inside it. */
const COPY_ES_3 = {
  labScan: {
    gate: (v, consequence) =>
      `Aquí pone ${v}, lo que haría que la aplicación ${consequence}. Compruébelo con su informe antes de guardar.`,
    consequence: {
      paused:      'pausara todo el acompañamiento y mostrara un aviso urgente para su equipo de atención',
      restricted:  'cambiara a modo restringido y dejara de ofrecer sustituciones de alimentos',
      caution:     'cambiara a modo de precaución',
      low:         'dejara de dar orientación con tono de restricción',
      below_range: 'marcara el fósforo como por debajo del rango habitual'
    }
  },

  cards: {
    bigNumberNormal: (item, mg, pct, target, low, high) =>
      `Un aviso sobre las cuentas: ${item} lleva unos ${mg} mg de potasio — aproximadamente el ${pct}% de su día de ${target} mg. ` +
      `Le quedan ${low}–${high} mg para el resto de hoy. Este es potasio natural de un alimento integral, que ` +
      `se absorbe menos completamente que el potasio de los aditivos — así que esto es información para planificar, no una advertencia.`,
    bigNumberCaution: (item, mg, pct, target, low, high) =>
      `Aviso en modo de precaución: ${item} lleva unos ${mg} mg de potasio — aproximadamente el ${pct}% de su día de ${target} mg, ` +
      `dejando ${low}–${high} mg. Como su último resultado de potasio estuvo ligeramente por encima del rango, conviene ` +
      `planificar el resto de hoy teniéndolo en cuenta.`,
    bigNumberPaused: (mg) =>
      `Como referencia, este es uno de los alimentos cotidianos más densos en potasio (~${mg} mg). Por favor, siga ` +
      `las indicaciones de su equipo de atención.`,
    additiveTitle: 'Cifra pequeña, absorbida casi por completo.',
    additive: (food, low, high) =>
      `Aditivo de fosfato en ${food}. La cifra parece pequeña (${low}–${high} mg), pero el fosfato aditivo — como ` +
      `el ácido fosfórico de la cola — se absorbe casi por completo (más del 90%). El fósforo unido de forma natural en ` +
      `alimentos vegetales se absorbe por debajo del 40%, y en alimentos de origen animal en torno al 40–60%. Por eso un alimento envasado con ` +
      `200 mg de fósforo aditivo puede aportar más fosfato real que un plato de legumbres con 350 mg. Otra ` +
      `razón por la que es fácil pasarlo por alto: en una encuesta a pacientes en diálisis, el 93% sabía que la cola contiene azúcar — solo el 25% sabía ` +
      `que contiene fosfato.`,
    phosTitle: '«FOS» en una etiqueta significa fosfato aditivo.',
    phos: (ing) =>
      `«FOS» detectado: esta lista de ingredientes incluye ${ing}, un aditivo de fosfato. Regla práctica que su dietista ` +
      `reconocerá: cualquier ingrediente que contenga «FOS» es fosfato añadido, y el fosfato añadido se absorbe ` +
      `casi por completo (más del 90%) — frente a menos del 40% de los alimentos vegetales y en torno al 40–60% de los de origen animal. ` +
      `Los aditivos normalmente no aparecen en la línea de fósforo del panel nutricional.`,
    bakingPowder: 'El polvo de hornear por sí solo lleva más de 450 mg de fósforo por cucharadita.',
    kAdditiveTier1Title: 'Lleva potasio añadido.',
    kAdditiveTier1: (ing, e) =>
      `Potasio añadido dentro: esta lista de ingredientes incluye ${ing}${e ? ' (' + e + ')' : ''}. El potasio añadido a ` +
      `alimentos procesados puede ser una cantidad importante que nunca aparece en la línea de potasio del panel nutricional — ` +
      `y se asimila más fácilmente que el potasio contenido dentro de los alimentos vegetales integrales.`,
    kAdditiveTier2: (ing) => `Contiene un conservante a base de potasio (${ing}) — la cantidad suele ser pequeña.`,
    saltSubProactive:
      'Una nota sobre los sustitutos de la sal. Muchas sales «bajas en sodio» sustituyen el sodio por cloruro de potasio. ' +
      'Con un resultado de potasio por encima del rango, esto importa: la guía del Reino Unido (NICE) aconseja a las personas ' +
      'con enfermedad renal no usar sustitutos de la sal en absoluto. En un caso publicado, una persona mayor con enfermedad ' +
      'renal alcanzó un nivel peligroso de potasio de 7.5 mEq/L después de añadir a sus comidas un sustituto de la sal a base ' +
      'de potasio. Busque «cloruro de potasio» en las etiquetas — y pregunte a su equipo de atención.',
    sodiumTitle: 'El rango de sodio es amplio a propósito.',
    sodium: (cat, low, high) =>
      `El sodio es alto — y difícil de precisar — en los alimentos de tipo ${cat}. Hemos contado un rango amplio (${low}–${high} mg). ` +
      `Tome la cifra como aproximada: con el sodio, el patrón (enlatado, curado y comida de restaurante) importa más ` +
      `que los dígitos.`,
    swap: (flagged, swapFood, sLow, sHigh, nutrient, serving, fLow, fHigh) => {
      const s = sLow === sHigh ? `unos ${sLow} mg` : `unos ${sLow}–${sHigh} mg`;
      const f = fLow === fHigh ? `${fLow} mg` : `${fLow}–${fHigh} mg`;
      return `En lugar de ${flagged}, pruebe ${swapFood} — ${s} de ${nutrient} por ${serving}, frente a ${f}.`;
    },
    swapNoFit: (nutrient) =>
      `Ninguna sustitución cabe en el presupuesto de ${nutrient} que queda hoy. Mañana se empieza de nuevo — y su equipo de atención puede ` +
      `ayudarle a planificar para sus comidas favoritas.`
  },

  learn: {
    protein: {
      title: '¿Por qué RenalRoute no controla las proteínas ni los líquidos?',
      body: [
        'Porque no hay una única cifra correcta que darle. Las guías de nutrición renal (KDOQI 2020) piden que las proteínas se prescriban de forma individual — por ejemplo 0.55–0.60 g por kg de peso corporal al día para muchas personas con ERC en estadios 3–5 que no están en diálisis y no tienen diabetes (su grado de evidencia más fuerte, 1A), con objetivos distintos para la diabetes o la diálisis. Restringir proteínas de forma segura también necesita la supervisión de un dietista, porque tomar muy pocas proteínas tiene sus propios riesgos. Así que dejamos las proteínas a su equipo de atención.',
        'La restricción rutinaria de líquidos tampoco es lo habitual para la mayoría de personas con ERC que no están en diálisis — es una decisión individual de su equipo de atención.',
        'RenalRoute se centra en el potasio, el fósforo y el sodio: los tres minerales donde las fuentes ocultas — aditivos de fosfato, sustitutos de la sal con potasio, sodio de los alimentos envasados — pueden causar daño real entre visitas a la consulta.'
      ]
    },
    medicines: {
      title: 'Medicamentos y potasio',
      body: [
        'Su potasio en sangre depende de más cosas que la comida. Varios medicamentos habituales para la presión arterial, junto con la hidratación, otros medicamentos y otros factores de salud, pueden elevarlo — que es parte de por qué los objetivos son personales, y por qué los anillos verdes de aquí no garantizan análisis normales. Si toma quelantes de fósforo o de potasio, siga las indicaciones de quien se los recetó. RenalRoute no gestiona medicamentos.'
      ]
    },
    leaching: {
      title: 'Consejo de cocina: bajar el potasio',
      body: [
        'Hervir y escurrir verduras altas en potasio — a veces llamado lixiviación — puede bajar su potasio de forma considerable. Pregunte a su dietista si conviene usarlo y cómo, para los alimentos que más cocina.',
        'Lo que importa es el agua, no la espera. Remojar sin más, que es la versión de este consejo que recibe la mayoría de la gente, apenas cambia el potasio. Hervir es lo que hace el trabajo: corte la verdura pequeña, use una olla grande de agua, hierva al menos diez minutos, y luego escurra y tire esa agua. Los estudios con papas informan de que así se elimina aproximadamente la mitad del potasio, y más cuando los trozos se rallan o se hierven dos veces.',
        'Cuando le dice a RenalRoute que una papa se hirvió y se escurrió, la cuenta más baja — pero menos de lo que encontraron esos estudios, porque contar demasiado poco potasio es el error que importa aquí.'
      ]
    },
    cost: {
      title: 'Cuando la dieta cuesta más que el presupuesto',
      body: [
        'Una dieta renal se apoya en la parte cara de la compra. Verduras frescas, versiones bajas en sodio de las latas de siempre, viajes más pequeños y más frecuentes — todo cuesta más que la comida envasada a la que sustituye, y los consejos casi nunca lo dicen.',
        'Si ahí es donde está, es algo común y vale la pena decirlo en voz alta a su equipo de atención. Los dietistas renales saben qué sustituciones son baratas y cuáles no, y solo pueden trabajar con lo que sepan de su semana.',
        'La ayuda alimentaria existe y la mayoría de quienes cumplen los requisitos nunca la reclaman. En Estados Unidos, SNAP (llamado CalFresh en California) cubre la compra de comida, y algunos estados añaden un complemento mensual para frutas y verduras en la misma tarjeta. Feeding America indica el banco de alimentos que cubre cualquier código postal, y muchos organizan repartos de productos frescos precisamente porque eso es lo que suele faltar en un paquete de alimentos.',
        'RenalRoute no sabe lo que cuesta su compra y nunca lo supondrá. No tiene forma de saber si una semana fue cara, y una aplicación de nutrición anunciando que usted no puede permitirse su dieta sería a la vez incorrecta y desagradable. Esta tarjeta está aquí porque el problema es común, no porque la aplicación haya detectado nada sobre usted.'
      ]
    },
    ai: {
      title: 'Cómo usa RenalRoute la IA',
      body: [
        'RenalRoute usa IA para leer la comida que usted escribe y separarla en alimentos y raciones. Las cifras de nutrientes vienen de una tabla de referencia curada, construida con valores publicados del USDA y de la American Kidney Fund, no de la IA.',
        'Las sugerencias de sustitución de alimentos vienen de esa misma tabla por regla, no de la IA. Cada explicación que ve se compone a partir de plantillas fijas, así que la misma comida produce siempre las mismas palabras.',
        'La IA nunca ve sus valores de laboratorio, sus objetivos ni su nombre.'
      ]
    }
  }
};

(function register() {
  var g = (typeof globalThis !== 'undefined') ? globalThis : window;
  g.COPY_TABLES = g.COPY_TABLES || {};
  /* Deep-merged, and the two halves are kept apart on purpose.
     COPY_ES is the first wave, and it holds every string flagged for
     human review first — the consent gate, the refusals, the warning
     copy. COPY_ES_2 is everything added since. A reviewer can see at a
     glance which strings have been sitting in front of users longest
     and which arrived later, which is exactly the distinction that
     matters when nobody has reviewed either yet.

     Merged here rather than at load time so the table this file
     registers is complete the moment it registers. The merge is
     local rather than borrowed from I18N because these files are
     fetched on demand and must not depend on module load order. */
  function deep(a, b) {
    var out = {}, k;
    for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
    for (k in b) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) continue;
      var bv = b[k], av = out[k];
      out[k] = (av && bv && typeof av === 'object' && typeof bv === 'object' &&
                !Array.isArray(av) && !Array.isArray(bv)) ? deep(av, bv) : bv;
    }
    return out;
  }
  g.COPY_TABLES['es'] = deep(deep(COPY_ES, COPY_ES_2), COPY_ES_3);
})();
