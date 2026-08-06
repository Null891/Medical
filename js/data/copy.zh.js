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

/* ═══════════════════════════════════════════════════════════════
   CHINESE (Simplified) — second wave.
   ───────────────────────────────────────────────────────────────
   Same rules. NO NUMBER MOVES: 5.5 mEq/L, 420 mg, 90%, 2,500 — every
   digit is quoted from KDOQI, KDIGO, AKF or NICE and stays in Western
   Arabic numerals, because a reader is comparing this against a lab
   report printed the same way. Full-width digits would break that and
   a test rejects them.

   Units stay as printed on the report too: mEq/L, mg/dL, mL/min/1.73 m².
   ═══════════════════════════════════════════════════════════════ */
const COPY_ZH_2 = {

  lang: {
    englishNote: '本应用以英文撰写并以英文审校。',
    machineNote:
      '这些译文由语言模型生成，未经母语译者或肾病营养师审校。所有数字、阈值和指南数值与英文版完全一致。' +
      '尚未翻译的内容会显示英文原文，而不是凭猜测填写。',
    changed: '语言已更改'
  },

  storage: {
    unavailable:
      '此浏览器不允许 RenalRoute 保存任何内容——通常是因为处于隐私浏览模式。您输入的内容在关闭此标签页后不会保留。' +
      '请在普通窗口中打开 RenalRoute。',
    quota:
      '此浏览器分配给 RenalRoute 的存储空间已满，因此新内容无法保存。请先在“设置”中导出备份，然后删除一些较早的记录腾出空间。',
    recovered: '保存功能已恢复正常。'
  },

  dataNotice:
    '此处的营养素数值是根据已发表数据表得出的估计值，未经临床验证。仅供教育用途——“设置”中列出了全部来源与全部缺口。',

  gaps: {
    title: '我们不知道的部分',
    lede: '三种不同的缺口：食物表中缺少的数字、超出目标的日子，以及正在过期的记录。这些都不是评分。',
    empty: '没有需要报告的内容——这是一个真实的答案，而不是一个空白页面。',
    data: {
      title: '我们没有的数字',
      lede:
        '您记录过、但我们的食物表无法完整计算的食物。它们不是零。我们没有的营养素会被排除在总量之外，' +
        '当天会标记为部分计算，这就是为什么圆环有时会显示“至少”。',
      none: '您记录的每种食物都有全部三项数值。没有任何内容被遗漏。',
      food: (name, times) => `${name}——记录了 ${times} 次`,
      missingList: (names) => {
        const n = names.length;
        const joined = n === 1 ? names[0] : names.join('、');
        return `缺少${joined}数值`;
      },
      affected: (days, logged, nutrient) =>
        `在您最近记录的 ${logged} 天中，有 ${days} 天的某处缺少${nutrient}数值。`,
      uncounted: (n) => `有 ${n} 项无法匹配到任何食物，因此没有为其计入任何数值。`,
      why:
        '我们的食物表收录 55 种食物，其中并非每一种都已具备全部三项已发表数值。' +
        '我们宁愿留下空白，也不愿印出无人测量过的数字。'
    },
    intake: {
      title: '各天与您的目标对照',
      lede: (n) => `您最近 ${n} 天，按营养素分列。`,
      noTargets: '尚未设定目标，因此没有可用来对照各天的依据。您可以在“设置”中添加，或询问您的医疗团队您的目标是多少。',
      noTarget: (label) => `未设定${label}目标。`,
      over: (n) => `${n} 天超出`,
      under: (n) => `${n} 天在范围内`,
      partial: (n) => `${n} 天无法合计`,
      partialWhy: '单独计算——缺少某项数值的一天，并不等于低于目标的一天。',
      none: '此期间尚未记录任何内容。'
    },
    care: {
      title: '正在过期的记录',
      lede: '应用所掌握的内容，以及最后一次更新的时间。',
      none: '此处的内容都是最新的。'
    }
  },

  foods: {
    title: '食物清单',
    lede: 'RenalRoute 能够计算的全部食物，附带所用数值及其来源。用区间而非单一数字——诚实的数字本来就是区间。',
    searchLabel: '搜索食物',
    sortName: 'A–Z',
    sortK: '钾',
    sortP: '磷',
    sortNa: '钠',
    pricedOnly: '仅显示我们能按所排序营养素计算的食物',
    count: (shown, total) => `正在显示 ${total} 种食物中的 ${shown} 种。`,
    none: '没有匹配结果。请尝试更简单的词——用“土豆”而不是“带皮烤土豆”。',
    unpriced: (n, nutrient) => `有 ${n} 种食物无法按${nutrient}排序`,
    unpricedWhy: '我们的表中尚无该营养素的已发表数值，因此这些食物只是列出而未排序。它们不是零——我们只是不知道。',
    foot: '数值对应所示分量。某项营养素为空白时，表中没有它的数值，应用会将其排除在您的总量之外，而不是当作零计入。'
  },

  scenes: { change: '更改', close: '完成' },

  firstMeal: {
    title: '这就是整个流程',
    body:
      '您输入了文字。RenalRoute 从中提取出食物及其分量，然后依据已发表的数值进行计算——而不是靠猜测。' +
      '数字以区间呈现，因为诚实的数字本来就是区间。',
    foot: '无法识别的内容会被记录并标记为“未计入”，而不是编造出来。此提示只会显示一次。'
  },

  share: {
    shared: '已发送',
    copied: '已复制——可粘贴到任何需要的地方',
    downloaded: '已下载',
    cancelled: '未发送任何内容',
    failed: '无法创建文件'
  },

  checklist: {
    title: '哪些内容已过期',
    allCurrent: '此处没有正在过期的内容。',
    foot: '日期来自您自己的记录——这不是待办清单，也不是时间表。多久需要做一次化验或测量由您的医疗团队决定，不由本应用决定。'
  },

  vitals: {
    intro:
      'RenalRoute 记录并交付这些数字——它不解读它们。这里没有分类、没有颜色、也没有箭头，' +
      '因为一个读数意味着什么，取决于您的目标、您的用药以及您的团队正在治疗的问题。' +
      '所有内容都会出现在您的健康护照和导出文件中。',
    saved: '已记录。',
    empty: '尚未记录任何内容。这些正是肾科门诊会问、而几乎没有人能随手拿出的数字。',
    historyTitle: '您已记录的内容',
    remove: '移除'
  },

  appts: {
    intro:
      'RenalRoute 不发送提醒——就诊提醒这种事，应用承诺了却没送到，比根本不提醒更糟。' +
      '它所做的是把您的问题带到健康护照上，让您带进诊室的那张卡片上已经写着它们。',
    qNote: '这是人们最常忘记的东西。想到时就写下来，而不是在去的路上。',
    next: (days, who) => days === 0 ? `今天${who ? '——' + who : ''}。`
      : days === 1 ? `明天${who ? '——' + who : ''}。`
      : `${days} 天后${who ? '——' + who : ''}。`,
    none: '尚未保存任何预约。添加一个，您的问题就会随健康护照一同带走。',
    listTitle: '已保存的预约',
    saved: '已保存。',
    remove: '移除'
  },

  demo: {
    title: '您想怎样开始？',
    lede: 'RenalRoute 没有账户，也无需注册。无论您选择哪一项，一切都留在此浏览器中——不会上传任何内容，也不会为您创建任何东西。',
    note:
      '下面两位示例患者是虚构的，您无需输入任何内容即可查看完整的一周。' +
      '这里没有任何内容受密码保护或被隐藏——“设置”中写明了您的数据究竟存放在哪里。',
    choices: [
      { key: 'fresh', name: '按我自己的情况设置',
        what: '正常的首次使用流程——先说明本应用不会做什么，然后四个问题。大约一分钟，没有任何预填内容，每一步都可以跳过。' },
      { key: 'frank', name: '以 Frank 的身份继续',
        what: '一周的用餐记录和一次近期化验结果。这是了解日常流程最清晰的方式：今天还剩多少，晚餐可以吃什么。' },
      { key: 'maria', name: '以 Maria 的身份继续——功能全部使用过',
        what: '一位用过全部功能的患者：两次化验结果、记录了体重和血压、记下了症状、一次写好问题的预约、填好的健康护照、包含磷结合剂在内的用药，以及足够让模式检测有话可说的历史记录。' }
    ],
    hasRealData:
      '此浏览器中已有真实数据，因此演示不会加载——它会覆盖现有内容。请改在隐私窗口中打开演示，或先在“设置”中导出备份。',
    banner: (who) => `正在查看 ${who}——一位示例患者，并非真实个人的记录。`,
    signOut: '退出演示',
    signedOut: '演示已结束，示例数据已清除。'
  },

  install: {
    title: '把 RenalRoute 添加到主屏幕',
    why:
      '它会像应用一样打开，没有信号也能使用，您也不必再在超市货架旁翻找浏览器标签页。' +
      '不会上传任何内容，也不会创建账户——安装改变的是图标所在的位置，而不是您数据所在的位置。',
    button: '添加到主屏幕',
    ios: '在 iPhone 或 iPad 上：点按 Safari 底部的“分享”按钮（带向上箭头的方块），向下滚动，然后点按“添加到主屏幕”。',
    installed: '您正在使用已安装的应用。它可离线工作，您的数据保留在本设备上。',
    unavailable: '您的浏览器未在此处提供安装选项。RenalRoute 在普通标签页中的运行方式完全相同——您也可以将其加入书签。',
    accepted: '已添加。请在主屏幕上寻找 RenalRoute。',
    dismissed: '没关系——在浏览器标签页中使用效果完全相同。'
  },

  meds: {
    binderTiming: '磷结合剂需要随餐服用才有效，而不是餐前或餐后。',
    binderNamed: (names) => `您的清单上有 ${names}。`,
    disclaimer:
      '请遵循开药医生给您的服用时间。RenalRoute 不管理药物——它只保存您输入的内容以便您向他人展示，' +
      '除本条提示外，从不检查剂量、相互作用或服用时间。',
    passportHint: '此处的内容也会出现在您的健康护照上。'
  },

  kitchen: {
    planLede:
      '按您完整的每日目标（而不是今天的剩余额度）构建的三天方案。刻意采用贪心而非最优的方式：' +
      '每一步的判断都是“下一样还放得下吗”，您可以自己加总核对。',
    planThin: '符合您目标的食谱不足以填满这一天。这是我们食谱库较小的限制，而不是对您目标的评判。',
    planCaveat:
      '这是建议，绝非处方。分量大小、烹饪方式和您自己的食欲都会改变这些数字，' +
      '您的医疗团队的方案优先于此处的任何内容。',
    provenance: '本食谱中的每个数字都来自应用其余部分所用的同一张参考表，由计算您输入餐食的同一段代码得出。这里没有任何手工填写的内容。'
  },

  labScan: {
    gate: (v, consequence) =>
      `此处读数为 ${v}，这会让应用${consequence}。保存前请与您的报告核对。`,
    consequence: {
      paused:      '暂停全部指导并显示紧急联系医疗团队的提示',
      restricted:  '切换到限制模式并停止提供食物替换建议',
      caution:     '切换到谨慎模式',
      low:         '停止所有带限制语气的指导',
      below_range: '将磷标记为低于常见范围'
    },
    nothingFound: '我们无法在该图像中找到钾、磷或 eGFR。请在光线更好的条件下拍一张更端正的照片，或在下方手动输入数字——那样总是有效。',
    failed: '扫描此刻未能成功。您的报告未被更改，在下方手动输入数字仍然可行。',
    oddUnit: (u) => `您的报告以 ${u} 显示磷，而 RenalRoute 需要 mg/dL。我们没有进行换算——` +
      '请与您的医疗团队核对，而不要相信一个单位不对的数字。',
    dated: (d) => `报告日期为 ${d}。`
  },

  references: {
    title: '我们的数字从何而来',
    lede:
      '本应用采取的每一个立场，以及其背后的来源。营养类应用很少公布这些，而这正是值得公布的原因——' +
      '无法追溯的数字就是无法核对的数字。',
    unverifiedNote: (n) =>
      `其中 ${n} 项标记为未核验：它们转录自一份资料包，本团队尚未重新推导。` +
      `明说这一点正是重点——只列出对自己有利内容的应用不是参考资料，而是宣传册。`,
    usedLabel: '用于',
    verifiedChip: '已核验',
    unverifiedChip: '尚未重新推导'
  },

  captionEducation: '通用的患者教育起始范围——不是处方。当您的医疗团队给出数字时，请替换它们。',
  captionEducationSettings: '正在使用通用教育范围（钾 2,500 / 磷 900 / 钠 2,000）——不是处方。当您的医疗团队给出数字时，请替换它们。',
  captionCareTeam: '您的医疗团队设定的目标。KDOQI 2020 并未规定固定的钾或磷毫克目标——这些数字属于您和您的团队。',
  captionNone: '尚未设定目标——请向您的医疗团队询问您的目标。',
  targetOutOfBounds:
    '这看起来超出了本应用支持的范围。请再核对一次数字。如果您的医疗团队确实设定了这个目标，请遵循他们的指示——' +
    '本应用的限制是技术性的，不是医学性的。',
  capReached: '您已达到今天的分析次数上限——食物清单仍然可用。',
  photoUnreadable: '我们无法辨认那张照片中的食物。请在光线更好的条件下重试，或直接输入您吃了什么。',
  photoMealLabel: '来自照片的餐食',
  emptyExtraction: '我们没有从中识别出任何食物。请试着逐一说出它们——例如：鸡肉、米饭、四季豆。',
  ambientNote: '在浏览器中合成，因此不下载任何内容。它不会自行启动——如果您已在设备上要求减弱动态效果，它会保持静音。',
  ambientUnavailable: '此浏览器不会播放背景声音。',
  takeYourTime: '慢慢来——您已输入的内容已保存，即使您暂时离开也仍会在这里。',
  didYouMean: '您是否想输入以下其中之一？',
  didYouMeanApplied: (name) => `正在使用 ${name}。如果分量不对，请在下方修改。`,

  unrecognised: {
    one: (name) => `抱歉——我们无法识别“${name}”，我们宁愿直说，也不愿猜测。`,
    why: '它在这里可能拼写不同，也可能尚未收录在我们的食物清单中。',
    tryList: '浏览食物清单',
    tryLabel: '改为查看它的配料表',
    keepAnyway: '您仍然可以把它留在这餐里——它会显示为未计入，当天会标记为部分计算，这样就不会在无声中少报。',
    overflow: (shown, dropped) =>
      `这是一份很长的清单——我们取了前 ${shown} 种食物，略去了 ${dropped} 种。` +
      `请把其余部分作为第二餐记录，以免遗漏。`
  },

  photoPortion: {
    small: '从照片判读为小份。区间比平常更宽，因为从图片判断分量大小只是粗略估计。',
    average: '从照片判读为中等份。区间比平常更宽，因为从图片判断分量大小只是粗略估计。',
    large: '从照片判读为大份。区间比平常更宽，因为从图片判断分量大小只是粗略估计。'
  },
  photoPortionFix: '它也倾向于往高估而非低估，因为照片往往会低估分量。在下方点选一个分量，区间就会收窄到您的数字。',
  leachApplied: '因为水煮后沥干会去除钾，所以计入的数值更低。该估计刻意保持保守——已发表的降幅比这里采用的更大。',
  nothingCounted: '已记录，但没有任何内容可以计入。点按以补充细节。',
  clarifyUse: '使用此回答',
  clarifySkip: '跳过——记录但不计入',
  reviewEmpty: '没有可保存的内容了——请返回修改您的餐食文字。',
  saveFailed: '保存失败。您的餐食仍在这里——点按“保存到今天”重试。',

  coverage: {
    intro:
      'RenalRoute 依据一份精选的已发表食物数值表运行。它刻意保持小巧，也确实有缺口。' +
      '这些缺口在此列出而非隐藏，因为一个看不出其局限的数字，价值低于一个能看出局限的数字。',
    missing:
      '当某个数值缺失时，该食物仍会被记录，也仍会为我们拥有数值的营养素计入——' +
      '只是该营养素被排除在总量之外，当天标记为部分计算，而不是在无声中当作没有缺失来求和。',
    thin:
      '这些食物类别在表中低钾成员太少，不值得给出替换建议，因此不会为它们显示任何替换提示。' +
      '这是我们数据的缺口，而不是判定不存在更好的选择。',
    verify:
      '此处的每个数值都转录自已发表来源，尚待依据 USDA FoodData Central 重新推导。' +
      '在某餐中打开任一食物，即可查看其来源以及哪些数字仍未核验。'
  },

  picker: {
    lowKTitle: '每份 150 mg 钾或更少——这是美国肾脏基金会自己用来称一份为低钾的界值。它描述的是这一份，而不是一整天。'
  },

  source: {
    cited: (food, serving, src) => `${food}，每${serving}。数值来自 ${src}。`,
    unverified: (list) =>
      `尚未依据 USDA FoodData Central 重新核对：${list}。这些数字最有可能变动，` +
      `因此以区间形式呈现。`
  },

  barcode: {
    invalid: '这看起来不像条形码——应为 8 到 14 位数字。',
    looking: '正在查询…',
    scanning: '请将摄像头对准条形码。',
    found: (label) => `已找到 ${label}。配料已填入下方——请核对是否与包装一致。`,
    notFound: '该条形码不在开放数据库中。这并不能说明这种食物的任何情况——很多产品只是未被收录。请改在下方输入配料。',
    noIngredients: (name) => `${name} 已收录，但没有配料表。请改在下方输入配料。`,
    failed: '查询此刻未能成功。您仍可在下方输入配料。',
    offline: '您当前处于离线状态，无法查询——但在下方输入配料仍然有效。',
    cameraDenied: '摄像头不可用，请改为手动输入号码。'
  },

  label: {
    idle: '在上方粘贴配料表，RenalRoute 会说出它找到的内容。',
    noneTitle: '在您粘贴的内容中没有标记出任何项。',
    noneBody:
      '这表示 RenalRoute 按名称识别的磷酸盐添加剂、添加钾成分或代盐都没有出现在这份配料表中。' +
      '这并不表示该食物不含这些——添加剂名称会变化，有些成分被归入笼统的名称之下。若有疑问，请询问您的医疗团队。',
    ruleTitle: '值得记住的窍门',
    ruleBody:
      '任何含有“PHOS”（磷）的成分都是添加磷酸盐，而添加磷酸盐几乎被完全吸收——超过 90%，' +
      '相比之下植物性食物低于 40%。它很少出现在营养成分表上，因此配料表是唯一能看到它的地方。' +
      '钾也一样：两个词里有一个是“钾”，就值得再看一眼。'
  },

  today: {
    nothingYet: '尚未记录任何内容——圆环显示的是您一整天的额度。',
    noTargets: '尚未设定目标，因此这是一份记录，而不是一次比较。',
    room: '今天这三项都还有余量。',
    close: '三项中有一项已接近上限。',
    over: '三项中有一项已超出——下一餐之前值得看一眼。',
    paused: '在您的钾结果偏高期间，指导已暂停。记录功能仍然可用。',
    partial: (n) => `今天有 ${n} 项没有已发表数值，因此您的余量比显示的稍少一些。`
  },

  emptyFacts: [
    '半杯熟菠菜浓缩了约五倍的菜叶——也就是五倍的钾——相当于半杯生菠菜的量（420 对 84 mg）。',
    '低脂薯片的含钾量其实比普通薯片更高（每盎司 494 对 339 mg）。',
    '在一项针对透析患者的调查中，93% 的人知道可乐含糖——只有 25% 知道它含磷酸盐。'
  ],
  loadError: '无法加载今天的餐食。请下拉刷新。',
  sodiumPartial: '钠的区间刻意设得较宽——包装食品和餐厅食物的差异很大。',
  noLabsCard:
    '没有存档的化验结果——这没关系。RenalRoute 会按通用指导运行：您的目标是常见的起点，天然食物默认不会被标记。' +
    '添加一次近期的钾或磷结果，可以让指导更贴合您。这是可选的，绝非必需。',
  statusPartial: '部分计入',
  partialChip: (n) => `${n} 项未计算`,
  partialTitle:
    '今天餐食中的一些食物，在我们的表中没有该营养素的已发表数值，因此它们被记录但排除在此总量之外。' +
    '真实数字高于显示值——绝不会更低。请在“设置”中查看究竟缺少哪些数值。',
  statusOk: '进展良好',
  statusWarn: '接近上限',
  statusDanger: '超出额度',

  labImplausible: (analyte, unit) =>
    `该数值对${analyte}（${unit}）来说似乎不太可能。请再次核对您的化验报告——` +
    `此条目未被保存。如果报告上确实是这个数值，请联系您的医疗团队，而不是本应用。`,
  staleNudge: (analyte) =>
    `您最近一次${analyte}结果距今已超过 90 天。化验数值会变化——如果您已有更新的化验，` +
    `请添加结果，让指导与您保持同步。`,

  kMode: {
    low: (v) =>
      `您最近一次钾结果（${v} mEq/L）低于常见范围（3.5–5.0）。偏低的结果不是本应用能够给出建议的情况——` +
      `请不要自行进一步限制饮食，并与您的医疗团队讨论。在此期间 RenalRoute 不会显示限钾提示。`,
    normal: (v, d) =>
      `您最近一次钾结果（${v} mEq/L，录入于 ${d}）处于常见范围（3.5–5.0——以您自己化验报告上的范围为准）。` +
      `水果、蔬菜、豆类和全谷物默认不受限制。只有当您每日额度的计算不够用时，RenalRoute 才会提醒。`,
    caution: (v) =>
      `您最近一次钾结果（${v} mEq/L）略高于常见范围（3.5–5.0）。RenalRoute 已切换到谨慎模式：` +
      `对含钾较高的餐食您会更早收到提示。这是教育性指导，不是诊断。如果尚未提及，请把这个结果告诉您的医疗团队。`,
    restricted: (v) =>
      `您最近一次钾结果（${v} mEq/L）高于 5.5——值得尽快与您的医疗团队讨论。` +
      `RenalRoute 现已进入限制模式：主动进行钾相关教育，且不提供替换建议——在这个水平上，` +
      `应由您医疗团队的方案主导，而不是应用的变通办法。如果他们已给出指示，请遵循。`,
    paused: (v) =>
      `${v} mEq/L 的钾水平可能有危险。RenalRoute 在此水平无法提供饮食指导，已暂停全部指导。` +
      `请立即联系您的肾科医疗团队或就医。您仍可以记录餐食，当录入低于 6.0 的更新结果后，指导会恢复。`
  },

  kChip: {
    low: '钾：低于常见范围',
    normal: '钾：常见范围指导',
    caution: '钾：谨慎',
    restricted: '钾：受限',
    paused: '钾：指导已暂停',
    no_lab: '钾：无存档化验'
  },

  pMode: {
    below_range: (v) =>
      `您最近一次磷结果（${v} mg/dL）低于常见范围（2.5–4.5）——值得向您的医疗团队提及。` +
      `（如果您的报告以 mmol/L 显示磷——在美国以外很常见——请换算或与您的医疗团队核对；RenalRoute 需要 mg/dL。）`,
    normal: (v, d) =>
      `您最近一次磷结果（${v} mg/dL，录入于 ${d}）处于常见范围（2.5–4.5）。` +
      `RenalRoute 会把磷的指导重点放在添加剂来源（含“PHOS”的成分）上，它们几乎被完全吸收，而不是放在天然食物上。`,
    caution: (v) =>
      `您最近一次磷结果（${v} mg/dL）高于常见范围（2.5–4.5）。请特别注意可乐、熟食与腌制肉类、` +
      `加工奶酪和包装烘焙食品中的磷酸盐添加剂——与天然食物中结合态的磷不同，添加的磷酸盐几乎被完全吸收。`
  },

  pChip: {
    below_range: '磷：低于常见范围',
    normal: '磷：常见范围指导',
    caution: '磷：谨慎',
    no_lab: '磷：无存档化验'
  },

  lowModeRing: '您的医疗团队正在管理您的钾。RenalRoute 目前不会对照某个上限来追踪它。',

  egfrEducation: (n, stage, range) =>
    `您录入的 eGFR（${n}）落在您医疗团队所用 KDIGO 量表中标记为 ${stage} 的范围（${range} mL/min/1.73 m²）内。` +
    `此 GFR 分类仅供教育参考——它绝不会改变您的目标或指导模式，也不是诊断。您的目标来自您的医疗团队。`,

  spinachTeaching:
    '您知道吗？半杯熟菠菜浓缩了约五倍的菜叶——也就是五倍的钾——相当于半杯生菠菜的量（420 对 84 mg）。',

  cards: {
    bigNumberNormal: (item, mg, pct, target, low, high) =>
      `关于计算的提示：${item}约含 ${mg} mg 钾——大约占您 ${target} mg 一天额度的 ${pct}%。` +
      `今天余下时间您还有 ${low}–${high} mg。这是来自天然食物的天然钾，其吸收不如添加剂中的钾完全——` +
      `所以这是用来规划的信息，不是警告。`,
    bigNumberCaution: (item, mg, pct, target, low, high) =>
      `谨慎模式提示：${item}约含 ${mg} mg 钾——大约占您 ${target} mg 一天额度的 ${pct}%，` +
      `剩下 ${low}–${high} mg。由于您上次的钾结果略高于范围，值得据此规划今天余下的部分。`,
    bigNumberPaused: (mg) => `作为参考，这是钾密度最高的日常食物之一（约 ${mg} mg）。请遵循您医疗团队的指示。`,
    additiveTitle: '数字小，却几乎被完全吸收。',
    additive: (food, low, high) =>
      `${food}中含磷酸盐添加剂。数字看起来不大（${low}–${high} mg），但添加的磷酸盐——例如可乐中的磷酸——` +
      `几乎被完全吸收（超过 90%）。植物性食物中天然结合的磷吸收率低于 40%，动物性食物约为 40–60%。` +
      `这就是为什么一份含 200 mg 添加磷的包装食品，实际提供的磷酸盐可能比含 350 mg 的豆类菜肴还多。` +
      `还有一个容易被忽略的原因：在一项针对透析患者的调查中，93% 的人知道可乐含糖——只有 25% 知道它含磷酸盐。`,
    phosTitle: '标签上的“PHOS”意味着添加磷酸盐。',
    phos: (ing) =>
      `发现“PHOS”：这份配料表包含 ${ing}，一种磷酸盐添加剂。您的营养师会认可的经验法则：` +
      `任何含有“PHOS”的成分都是添加磷酸盐，而添加磷酸盐几乎被完全吸收（超过 90%）——` +
      `相比之下植物性食物低于 40%，动物性食物约为 40–60%。添加剂通常不会出现在营养成分表的磷那一行。`,
    bakingPowder: '仅泡打粉每茶匙就含有超过 450 mg 的磷。',
    kAdditiveTier1Title: '内含添加钾。',
    kAdditiveTier1: (ing, e) =>
      `内含添加钾：这份配料表包含 ${ing}${e ? '（' + e + '）' : ''}。加入加工食品中的钾可能是相当可观的量，` +
      `却从不出现在营养成分表的钾那一行——而且它比天然植物性食物中所含的钾更容易被吸收。`,
    kAdditiveTier2: (ing) => `含有一种钾类防腐剂（${ing}）——用量通常很小。`,
    saltSubProactive:
      '关于代盐的说明。许多“低钠”盐用氯化钾替代钠。当钾结果高于范围时，这一点很重要：' +
      '英国指南（NICE）建议肾病患者完全不要使用代盐。在一例已发表的病例中，一位患有肾病的老年人' +
      '在餐食中加入钾类代盐后，钾水平达到了危险的 7.5 mEq/L。请在标签上查找“氯化钾”——并询问您的医疗团队。',
    sodiumTitle: '钠的区间刻意设得较宽。',
    sodium: (cat, low, high) =>
      `${cat}类食物的钠含量偏高，而且难以精确确定。我们计入了一个较宽的区间（${low}–${high} mg）。` +
      `请把这个数字当作粗略值：对于钠，模式（罐装、腌制和餐厅食物）比具体数字更重要。`,
    swap: (flagged, swapFood, sLow, sHigh, nutrient, serving, fLow, fHigh) => {
      const s = sLow === sHigh ? `约 ${sLow} mg` : `约 ${sLow}–${sHigh} mg`;
      const f = fLow === fHigh ? `${fLow} mg` : `${fLow}–${fHigh} mg`;
      return `与其选择${flagged}，不如试试${swapFood}——每${serving}含${nutrient}${s}，而前者为 ${f}。`;
    },
    swapNoFit: (nutrient) => `没有替换方案能放进今天剩余的${nutrient}额度。明天是全新的开始——您的医疗团队也可以帮您为喜欢的食物做规划。`
  },

  learn: {
    protein: {
      title: '为什么 RenalRoute 不追踪蛋白质或液体？',
      body: [
        '因为没有一个适用于所有人的正确数字。肾脏营养指南（KDOQI 2020）要求蛋白质按个体处方——例如，对许多未透析且没有糖尿病的 CKD 3–5 期患者，为每公斤体重每天 0.55–0.60 g（这是其最强的证据等级，1A），而糖尿病或透析患者的目标不同。安全地限制蛋白质还需要营养师的监督，因为蛋白质摄入过少本身也有风险。所以我们把蛋白质留给您的医疗团队。',
        '对大多数未透析的 CKD 患者来说，常规限制液体也不是标准做法——这是由您的医疗团队做出的个体化决定。',
        'RenalRoute 专注于钾、磷和钠：在这三种矿物质上，隐藏来源——磷酸盐添加剂、含钾代盐、包装食品中的钠——可能在两次门诊之间造成真实伤害。'
      ]
    },
    medicines: {
      title: '药物与钾',
      body: [
        '您血液中的钾不只取决于食物。几种常见的降压药，以及补水状况、其他药物和其他健康因素，都可能使其升高——这也是目标因人而异的原因之一，也是这里的绿色圆环并不保证化验正常的原因。如果您服用磷结合剂或钾结合剂，请遵循开药医生的指示。RenalRoute 不管理药物。'
      ]
    },
    leaching: {
      title: '烹饪小贴士：降低钾',
      body: [
        '把高钾蔬菜水煮后沥干——有时称为浸出——可以显著降低其钾含量。请询问您的营养师，对于您最常做的食物是否适用以及如何使用。',
        '关键在于水，而不在于等待。大多数人听到的版本是单纯浸泡，而单纯浸泡几乎不改变钾。真正起作用的是水煮：把蔬菜切小，用一大锅水，至少煮十分钟，然后沥干并倒掉那些水。关于土豆的研究报告称，用这种方法约可去除一半的钾，切丝或煮两次时更多。',
        '当您告诉 RenalRoute 某个土豆经过水煮沥干时，它会按更低的量计入——但低于那些研究的幅度，因为在这里，把钾算得太少才是要紧的错误。'
      ]
    },
    cost: {
      title: '当这份饮食超出预算',
      body: [
        '肾脏饮食偏向购物中较贵的那一端。新鲜蔬菜、普通罐头的低钠版本、更小份而更频繁的采买——所有这些都比它们所替代的包装食品更贵，而通常没有哪条建议会提到这一点。',
        '如果您正处于这种情况，这很常见，也值得向您的医疗团队明说。肾科营养师知道哪些替换便宜、哪些不便宜，而他们只能依据他们所了解的您的一周来工作。',
        '食物援助是存在的，而大多数符合条件的人从未申请。在美国，SNAP（在加利福尼亚州称为 CalFresh）可用于购买食品杂货，有些州还会在同一张卡上每月增加一笔果蔬补助。Feeding America 列出了覆盖任一邮政编码的食物银行，其中许多专门开展生鲜发放，正是因为生鲜通常是食物包裹里最缺的东西。',
        'RenalRoute 不知道您的购物花费多少，也绝不会猜测。它无从判断某一周是否昂贵，而一款营养应用宣称您负担不起自己的饮食，既不正确也不受欢迎。这张卡片出现在这里，是因为这个问题很常见，而不是因为应用检测到了关于您的任何信息。'
      ]
    },
    ai: {
      title: 'RenalRoute 如何使用 AI',
      body: [
        'RenalRoute 使用 AI 读取您输入的餐食，并将其拆分为食物和分量。营养素数字来自一份精选参考表，该表由已发表的 USDA 和美国肾脏基金会数值构建，而不是来自 AI。',
        '食物替换建议同样按规则来自那张表，而不是来自 AI。您看到的每一条说明都由固定模板拼装而成，因此同一餐总会产生同样的文字。',
        'AI 从不接触您的化验数值、您的目标或您的姓名。'
      ]
    }
  }
};

(function register() {
  var g = (typeof globalThis !== 'undefined') ? globalThis : window;
  g.COPY_TABLES = g.COPY_TABLES || {};
  /* Deep-merged, and the two halves are kept apart on purpose.
     COPY_ZH is the first wave, and it holds every string flagged for
     human review first — the consent gate, the refusals, the warning
     copy. COPY_ZH_2 is everything added since. A reviewer can see at a
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
  g.COPY_TABLES['zh'] = (typeof COPY_ZH_2 !== 'undefined') ? deep(COPY_ZH, COPY_ZH_2) : COPY_ZH;
})();
