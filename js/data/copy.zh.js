/* ═══════════════════════════════════════════════════════════════
   SIMPLIFIED CHINESE — zh
   ───────────────────────────────────────────────────────────────
   MACHINE TRANSLATION, NOT CLINICALLY REVIEWED. Same standing as the
   Spanish file: produced by a language model, read by no native
   speaker and no renal dietitian. The language picker says so in
   Chinese.

   Numbers never move. 5.5 mEq/L is 5.5 mEq/L; 2,300 mg is 2,300 mg.
   The sentence around a figure may be rebuilt however Chinese
   requires, but no digit, unit, or guideline name may change. A test
   compares the numerals in every translated string against its English
   original and fails on any difference.

   TYPOGRAPHY NOTE. CJK needs more line-height than Latin at the same
   font size, and it does not break on spaces. css/refine.css keys off
   :root[data-script="cjk"] rather than off the language code, so the
   rule applies to any future CJK language without being rewritten.

   Omitted keys fall back to English individually. Where a clinical
   instruction was not confidently translatable it is omitted rather
   than guessed — an English sentence a reader can paste into a
   translator is safer than a Chinese sentence that says the wrong
   thing with confidence.
   ═══════════════════════════════════════════════════════════════ */

const COPY_ZH = {

  /* ── 免责声明 ── */
  consentTitle: '开始之前',
  consentBody: [
    'RenalRoute 是一款健康教育工具，不是医疗器械。它不诊断、治疗、治愈或预防任何疾病。',
    '这里的营养数值是估算值，以范围显示，因为它们可能有误。任何初始目标都是常见的教育参考值，不是处方。',
    '请始终遵循您的肾脏科医生和肾病营养师给出的目标与建议。不要根据本应用改变您的饮食、药物或透析治疗。',
    'RenalRoute 需要您确认才能继续——这样才能让本应用停留在健康教育的范围内，而不是医疗建议。'
  ],
  consentButton: '我已了解——继续',
  footerDisclaimer: '仅供教育参考的估算值——不构成医疗建议。请遵循您医疗团队设定的目标。',
  cardDisclaimer: '教育性估算——请与您的医疗团队确认。',

  /* ── 本应用不会做的三件事 ── */
  refusals: {
    title: 'RenalRoute 不会做的三件事',
    lede: '大多数营养应用对什么都很有把握。这一款刻意不这样——下面正是它退让的地方。',
    items: [
      {
        h: '它不会编造数字',
        p: '输入它无法识别的东西——剩菜砂锅、没有食谱的菜——它只会问一个问题。如果您答不上来，它会记录这顿饭并标注为"未计入"，而不是猜测。您的总量会如实反映它没有包含的部分。'
      },
      {
        h: '它不会给您健康评分',
        p: '没有分数、没有连续打卡、没有十分制。这里的每个数字都是可能有较大误差的估算值，用这样宽的估算给一个人的一天打分，等于凭空制造无人拥有的确定性。'
      },
      {
        h: '它不会告诉您化验结果意味着什么',
        p: '输入一个血钾结果，本应用会改变它的语气，而不是给出判断。高于 6.0 时它会完全停止饮食指导，并告诉您联系医疗团队。解读血液化验是他们的工作。'
      }
    ],
    footer: '以上每一条您都可以自己验证。想的话，现在就可以试第一条。',
    button: '明白了——开始'
  },

  /* ── 这款应用为谁而做 ── */
  focusLine: '专为慢性肾脏病 G3b 和 G4 期设计——已确诊、已获得饮食限制建议、尚未透析。',
  focusOffBand: 'RenalRoute 是围绕 G3b 和 G4 期设计的。对您来说一切功能照常，只是教育内容是按那个群体来写的。',

  /* ── 目标与来源 ── */
  provenanceChip: '正在使用一般教育参考范围——请与您的医疗团队确定您自己的数值',
  targetsKPNote:
    '这些是常见的起点，不是处方——请与您的医疗团队确定您自己的数值。' +
    '肾脏营养指南（KDOQI 2020）没有为钾或磷设定固定的毫克上限；' +
    '它们建议调整摄入量，使血液数值保持在正常范围内，并由您的医疗团队个体化决定。',
  targetsNaNote:
    '钠：KDOQI 2020 建议慢性肾脏病 3–5 期每天低于 2.3 克（2,300 毫克）（1B 级推荐）。' +
    'KDIGO 2024 建议更严格的 2.0 克（2,000 毫克）。一般教育参考范围 2,000 毫克同时符合两者。',

  /* ── 设置 ── */
  onb: {
    stageUnknown: '没关系——您可以以后再填，或者一直不填。它只决定您看到哪些教育内容。',
    stageInFocus: (s) => `${s} 正是本应用的目标人群。您看到的指导内容就是为您这个阶段写的。`,
    stageOutOfFocus: (s) => `已记录——${s}。RenalRoute 是围绕 G3b 和 G4 期设计的，所以部分教育内容会偏向他们。所有功能照常，任何数字都不会改变。`,
    nutrientNone: '未选择，因此三个环同等显示。如果您不确定，这就是正确的设置。',
    nutrientAll: '三个都会在您的主页突出显示——医疗团队全面监测时通常如此。',
    nutrientSome: (names) => `${names} 会在您的主页突出显示。其余的仍然完整计入，只是不再争夺您的注意力。`,
    hardestNone: '选一个，应用打开时就会为它做好准备。',
    hardestEcho: (label) => `应用将以「${label}」的模式打开。您随时可以在主页顶部切换。`
  },

  /* ── 记录饮食 ── */
  emptyDashboard:
    '您今天的钾、磷和钠的余量——圆环显示的是您还剩多少。' +
    '今天还没有记录；用平常的话就可以，比如「鸡肉、米饭和四季豆」。',
  uncountedItem: '我们没有为这项食物估算数字。它已记录，但未计入您的总量。',
  analyzeError: '现在无法分析。您输入的文字已保存——请重试，或从食物列表中选择。',
  pickerEmpty: '搜索食物列表——试试「土豆」或「牛奶」。',
  pickerNoResults: '没有匹配结果。换一个更简单的词，或稍后再记录。',
  deleteConfirm: '删除这条记录吗？此操作无法撤销。',
  mutationFailed: '没有保存成功。请再试一次。',

  /* ── 厨房 ── */
  kitchen: {
    fitLede: '下面的食谱符合您今天剩余的量，按各自范围的高端计算——这是谨慎的读法，和圆环用的是同一种。符合预算是算术，不是健康判断。',
    allLede: '所有 RenalRoute 能够计算的食谱。每一道都只用参考表中的食物做成，所以数字带有与您手动记录时相同的范围和来源。',
    noneFit: '今天剩下的量装不下任何一道菜，这不是失败——这是应用在如实告诉您。明天重新开始，您的医疗团队也可以帮您安排想保留的食物。',
    overLede: '很接近，但按谨慎的算法超了。超出多少也写出来了，由您自己判断。',
    overBy: (mg) => `比今天剩余的量多出约 ${mg} 毫克钾。`,
    needTargets: '请先设定您的每日目标，这个页面才能告诉您什么合适。设置 → 每日目标。',
    shopLede: '食谱需要的所有材料，按货架分类。无网络也能用，并可复制为纯文本。'
  },

  /* ── 化验单扫描 ── */
  labScan: {
    reading: '正在读取您的化验单…',
    readTitle: '这是我们读到的内容',
    readBody: '请对照您手上的化验单核对。在您点击保存之前不会存储任何内容，照片本身也从不保存。',
    notOnReport: '这份化验单上没有找到——您可以在下面手动输入。',
    unreadable: '无法读取该图片。请在下面手动输入数值——大约需要二十秒。',
    gate: (v, consequence) => `这里读到的是 ${v}。保存前请对照您的化验单核对。`,
    gateButton: '与我的化验单一致',
    confirmed: '已与您的化验单核对。',
    save: '保存这些数值',
    saveBlocked: '请先核对标记出的数值'
  },

  /* ── 教育：临床分量最重的一张卡片 ── */
  learn: {
    warnings: {
      title: '值得了解的警示信号',
      body: [
        '请询问您的医疗团队，您自己的警示信号是什么，以及他们希望您在什么情况下打电话。以下是一般性教育内容，其中最重要的一点是：症状非常不可靠。',
        '血钾高常常在已经危险之前完全没有任何症状。感觉良好并不能证明您的血钾正常——只有血液化验才能回答这个问题。绝不要用自己的感觉来决定是否跳过化验或门诊。',
        '当确实出现症状时，可能包括肌肉无力或腿部沉重、麻木或刺痛、心跳不规则或异常缓慢、恶心以及异常疲倦。这些都还有许多其他原因。',
        '胸痛、心跳过快或不规则、呼吸困难或严重肌肉无力属于急症。请拨打急救电话——不要等待，也不要先上网查。',
        '有一点特别值得知道：大多数「低钠」或「淡」盐是用氯化钾代替钠的。在一个已发表的病例中，一位患有肾病的老年人在饮食中加入这类产品后血钾达到了 7.5 mEq/L。请检查任何代盐产品的标签。',
        'RenalRoute 无法告诉您这些是否适用于您。它记录的是食物。如果您输入的血钾结果为 6.0 或更高，它会完全停止饮食指导，并告诉您联系医疗团队。'
      ]
    }
  },

  /* ── 警示卡片 ── */
  cards: {
    saltSubTitle: '代盐是钾的隐患。',
    saltSub:
      '大多数代盐用氯化钾代替钠。对许多人来说这是有益的替换，但在肾功能下降的情况下可能有危险，' +
      '英国 NICE 指南建议肾病患者不要使用代盐。香草、香料或柠檬是更安全的调味方式——也请告诉您的医疗团队。'
  },

  /* ── 备份 ── */
  backup: {
    confirm: '恢复会用该文件的内容替换应用中现有的一切——所有饮食记录、化验结果、目标和设置。此操作无法撤销。是否继续？',
    restored: (meals, labs) => `已恢复 ${meals} 条饮食记录和 ${labs} 条化验结果。`
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
  g.COPY_TABLES['zh'] = COPY_ZH;
})();
