import type { LocalizedLocale } from './config'
import { learningArticles } from '../data/learning.ts'

export const SERVICE_KEYS = [
  'survey',
  'drilling',
  'maintenance',
  'consult',
] as const

export type ServiceKey = (typeof SERVICE_KEYS)[number]

export const LEARNING_SLUGS = [
  'groundwater-calculator-tools',
  'groundwater-basics-thailand',
  'groundwater-case-studies-problems',
  'groundwater-law-regulation-thailand',
  'groundwater-faq-thailand',
  'groundwater-guide-factory-hotel-resort',
] as const

export type LearningSlug = (typeof LEARNING_SLUGS)[number]

export type LocalizedArticle = {
  slug: LearningSlug
  eyebrow: string
  title: string
  description: string
  audience: string
  sections: Array<{
    heading: string
    paragraphs: string[]
    bullets?: string[]
  }>
  sources?: Array<{ label: string; href: string }>
}

type ServiceContent = {
  title: string
  short: string
  intro: string
  highlights: string[]
  process: string[]
}

export type LocalizedContent = {
  siteTitle: string
  metaDescription: string
  common: {
    home: string
    learnMore: string
    contactTeam: string
    viewProjects: string
    breadcrumbLabel: string
    suitableFor: string
    officialSources: string
    sourceReviewed: string
    project: string
    service: string
  }
  home: {
    eyebrow: string
    title: string
    summary: string
    assurance: string
    motto: string
    primaryCta: string
    secondaryCta: string
    servicesTitle: string
    servicesIntro: string
    projectsTitle: string
    projectsIntro: string
    trustTitle: string
    trust: Array<{ value: string; label: string }>
  }
  about: {
    eyebrow: string
    title: string
    intro: string
    storyTitle: string
    story: string[]
    principlesTitle: string
    principles: Array<{ title: string; description: string }>
    teamTitle: string
    teamIntro: string
  }
  services: {
    eyebrow: string
    title: string
    intro: string
    highlightsTitle: string
    processTitle: string
    items: Record<ServiceKey, ServiceContent>
  }
  projects: {
    eyebrow: string
    title: string
    intro: string
    all: string
    showing: string
    loadMore: string
    details: string
    typeLabel: string
    categoryLabel: string
    location: string
    yearLabel: string
    workScopeLabel: string
    businessTypeLabel: string
    projectStoryTitle: string
    recoveredRecordNote: string
    registryNoteTitle: string
    registryNote: string
    mapCta: string
    enquiryCta: string
    categories: Record<
      'government' | 'factory' | 'resort' | 'agriculture' | 'dewatering' | 'other',
      string
    >
    types: Record<string, string>
  }
  governance: {
    eyebrow: string
    title: string
    intro: string
    pillars: Array<{ title: string; description: string }>
    commitmentTitle: string
    commitment: string
  }
  learning: {
    eyebrow: string
    title: string
    intro: string
    audienceTitle: string
    audience: string[]
    topicsTitle: string
    topicsIntro: string
    readMore: string
    articles: Record<LearningSlug, LocalizedArticle>
    ctaTitle: string
    ctaText: string
  }
  calculator: {
    kicker: string
    title: string
    intro: string
    dailyDemand: string
    dailyUnit: string
    pumpHours: string
    hoursUnit: string
    reserve: string
    percentUnit: string
    result: string
    flowUnit: string
    designDemand: string
    minimumBuffer: string
    volumeUnit: string
    disclaimer: string
  }
  contact: {
    eyebrow: string
    title: string
    intro: string
    officeTitle: string
    officeAddress: string
    locationTitle: string
    locationAction: string
    formTitle: string
    formIntro: string
    labels: {
      website: string
      subject: string
      name: string
      company: string
      phone: string
      email: string
      details: string
      detailsPlaceholder: string
      consentPrefix: string
      privacy: string
      submit: string
      submitting: string
      emailFallback: string
      success: string
      error: string
    }
  }
  privacy: {
    eyebrow: string
    title: string
    intro: string
    sections: Array<{ title: string; text: string }>
    back: string
  }
}

const officialSources = [
  {
    label: 'Department of Groundwater Resources — laws and regulations',
    href: 'https://www.dgr.go.th/law/th/banner/126',
  },
  {
    label: 'Department of Groundwater Resources — public services',
    href: 'https://www.dgr.go.th/th/public-service/42',
  },
]

const thaiArticles = Object.fromEntries(
  learningArticles.map((article) => [article.slug, article])
) as Record<LearningSlug, LocalizedArticle>

const englishArticles: Record<LearningSlug, LocalizedArticle> = {
  'groundwater-calculator-tools': {
    slug: 'groundwater-calculator-tools',
    eyebrow: 'PLANNING TOOL',
    title: 'Preliminary groundwater system calculator',
    description:
      'Estimate the pumping capacity required from daily demand, planned pumping hours and a practical reserve allowance.',
    audience: 'Project owners, engineering, maintenance and procurement teams',
    sections: [
      {
        heading: 'How to use the estimate',
        paragraphs: [
          'Use the result to frame a budget and prepare a technical conversation. It is not a guarantee of the yield available from a future or existing well.',
          'Final operating flow must be confirmed through hydrogeological evidence, well design and a properly interpreted pumping test.',
        ],
        bullets: [
          'Combine daily demand from every process and building.',
          'Identify peak-use periods and realistic pump operating hours.',
          'Allow for growth, cleaning cycles, fire reserve and interruptions.',
        ],
      },
    ],
  },
  'groundwater-basics-thailand': {
    slug: 'groundwater-basics-thailand',
    eyebrow: 'GROUNDWATER BASICS',
    title: 'Groundwater fundamentals in Thailand',
    description:
      'Understand aquifers, water quality, exploration, well construction and pumping tests before committing capital.',
    audience: 'First-time owners, managers and water-system operators',
    sections: [
      {
        heading: 'An aquifer is not simply an underground river',
        paragraphs: [
          'Groundwater moves through pores in soil and gravel or fractures in rock. Yield can therefore change significantly between nearby locations.',
          'A responsible drilling point and depth are selected from local evidence, site constraints and professional exploration—not from depth alone.',
        ],
      },
      {
        heading: 'Quantity and quality are separate decisions',
        paragraphs: [
          'A well may produce enough water but still require treatment for iron, manganese, hardness, salinity or other constituents. Laboratory analysis must match the intended use.',
        ],
      },
      {
        heading: 'What a complete well handover should contain',
        bullets: [
          'Construction log and as-built well details',
          'Pumping-test data and recommended operating rate',
          'Water-quality laboratory results',
          'Pump, control panel and maintenance documentation',
        ],
        paragraphs: [
          'These records protect the investment and create a baseline for future maintenance.',
        ],
      },
    ],
  },
  'groundwater-case-studies-problems': {
    slug: 'groundwater-case-studies-problems',
    eyebrow: 'FAILURE PREVENTION',
    title: 'Groundwater case studies: why systems fail',
    description:
      'Recognize common causes of declining yield, sand, corrosion, salinity and contamination before damage escalates.',
    audience: 'Asset owners, engineers, maintenance and environmental teams',
    sections: [
      {
        heading: 'Yield declines after continuous pumping',
        paragraphs: [
          'The pump may exceed the sustainable rate, the screen may be clogged, or the aquifer may not recover between operating cycles. Record flow, water level and power use before selecting a remedy.',
        ],
      },
      {
        heading: 'Sand appears in the system',
        paragraphs: [
          'Sand can indicate unsuitable screen or gravel-pack design, incomplete well development, excessive flow, or physical damage. Continuing to pump may harm both the well and downstream equipment.',
        ],
      },
      {
        heading: 'Water quality changes over time',
        paragraphs: [
          'Salinity, acidity, odour or unexpected contaminants can result from excessive drawdown, casing failure, a changed flow path or surface ingress. Compare new samples with the original baseline.',
        ],
      },
      {
        heading: 'Prevention is measurable',
        bullets: [
          'Log flow, dynamic water level, pressure and energy use.',
          'Sample water on a risk-based schedule.',
          'Investigate trends before increasing pump size or operating hours.',
        ],
        paragraphs: ['A trend history makes diagnosis faster and prevents guesswork.'],
      },
    ],
  },
  'groundwater-law-regulation-thailand': {
    slug: 'groundwater-law-regulation-thailand',
    eyebrow: 'THAI REGULATORY GUIDE',
    title: 'Groundwater law and permits in Thailand',
    description:
      'A practical orientation to drilling, groundwater-use permits, reporting and official verification in Thailand.',
    audience: 'Project owners, legal teams, engineers and permit applicants',
    sections: [
      {
        heading: 'Confirm the rules before drilling or using groundwater',
        paragraphs: [
          'Thailand regulates groundwater under the Groundwater Act and related ministerial regulations. Requirements depend on location, well characteristics and intended use.',
          'A drilling permit and a groundwater-use permit are distinct approvals. Do not assume land ownership or an existing well automatically grants the right to extract water.',
        ],
      },
      {
        heading: 'Plan compliance as part of the project',
        bullets: [
          'Check whether the site is within a designated groundwater area.',
          'Verify the current application documents, fees and responsible office.',
          'Keep well logs, meter readings and water-use reports required by the approval.',
          'Track permit conditions, renewal dates and changes in operating demand.',
        ],
        paragraphs: [
          'This article is general information, not legal advice. Confirm the latest requirements with the Department of Groundwater Resources or the responsible authority before acting.',
        ],
      },
      {
        heading: 'Use current official sources',
        paragraphs: [
          'Forms and procedures can change. The official links below should be the starting point for every live project.',
        ],
      },
    ],
    sources: officialSources,
  },
  'groundwater-faq-thailand': {
    slug: 'groundwater-faq-thailand',
    eyebrow: 'FREQUENTLY ASKED QUESTIONS',
    title: 'Groundwater questions project owners ask most often',
    description:
      'Straightforward answers about yield, water quality, maintenance and preparing a realistic quotation.',
    audience: 'Owners, procurement teams, engineers and general readers',
    sections: [
      {
        heading: 'How much water will one well produce?',
        paragraphs: [
          'Depth and casing diameter alone cannot answer this. Yield depends on the aquifer, well construction and pumping water level, and must be confirmed with a pumping test.',
        ],
      },
      {
        heading: 'Can groundwater be consumed directly?',
        paragraphs: [
          'Do not judge safety from clarity or taste. Test the water for its intended use and design treatment from laboratory results.',
        ],
      },
      {
        heading: 'How often should a well be cleaned?',
        paragraphs: [
          'There is no universal interval. Monitor flow, water level, sand, turbidity and energy use. Diagnose the cause when performance trends deteriorate.',
        ],
      },
      {
        heading: 'What information is needed for a quotation?',
        paragraphs: [
          'Provide the project location, daily demand, required quality, operating schedule, site access and any existing well records. Better inputs lead to a more realistic scope.',
        ],
      },
    ],
  },
  'groundwater-guide-factory-hotel-resort': {
    slug: 'groundwater-guide-factory-hotel-resort',
    eyebrow: 'OWNER’S GUIDE',
    title: 'Groundwater planning for factories, hotels and resorts',
    description:
      'A decision sequence from water balance and site investigation through handover, redundancy and long-term care.',
    audience: 'Business owners, plant directors, hotel managers and engineering teams',
    sections: [
      {
        heading: '1. Begin with the project water balance',
        paragraphs: [
          'Separate demand by activity, required quality and time of use—production, rooms, kitchens, laundry, irrigation and fire reserve should not automatically share one design standard.',
        ],
      },
      {
        heading: '2. Investigate the site before fixing a drilling point',
        paragraphs: [
          'Check buildings, utilities, contamination risks, rig access and future maintenance space. Combine these constraints with hydrogeological evidence.',
        ],
      },
      {
        heading: '3. Define measurable handover criteria',
        bullets: [
          'As-built well record and pumping-test interpretation',
          'Water-quality analysis from a suitable laboratory',
          'Recommended operating flow and pump settings',
          'Maintenance plan and warning thresholds',
        ],
        paragraphs: [
          'Writing these deliverables into the scope makes proposals comparable and protects long-term operation.',
        ],
      },
      {
        heading: '4. Design resilience',
        paragraphs: [
          'Projects that cannot stop using water need storage, backup pumping capacity, critical spares and an alternative source. Test the contingency plan before the primary system fails.',
        ],
      },
    ],
  },
}

const chineseArticles: Record<LearningSlug, LocalizedArticle> = {
  'groundwater-calculator-tools': {
    slug: 'groundwater-calculator-tools',
    eyebrow: '规划工具',
    title: '地下水系统初步计算器',
    description: '根据每日用水量、计划抽水时间和储备比例，估算系统所需的设计流量。',
    audience: '项目业主、工程、维护及采购团队',
    sections: [
      {
        heading: '如何使用计算结果',
        paragraphs: [
          '该结果用于初步预算和技术沟通，并不保证拟建或现有水井一定具备相同出水量。',
          '最终运行流量应结合水文地质资料、成井设计和规范的抽水试验确定。',
        ],
        bullets: ['汇总所有工艺和建筑的日用水量。', '确认高峰用水时段和可运行小时数。', '为扩建、清洗、消防和故障预留余量。'],
      },
    ],
  },
  'groundwater-basics-thailand': {
    slug: 'groundwater-basics-thailand',
    eyebrow: '地下水基础',
    title: '泰国地下水基础知识',
    description: '在投资前了解含水层、水质、勘查、成井和抽水试验。',
    audience: '首次开发地下水的业主、管理人员和系统运维人员',
    sections: [
      {
        heading: '含水层并不等同于地下河',
        paragraphs: ['地下水在土壤、砂砾孔隙或岩石裂隙中流动，因此相邻地点的出水量也可能差异很大。', '井位和深度应根据当地资料、场地条件和专业勘查确定，而不能只看钻井深度。'],
      },
      {
        heading: '水量与水质是两个独立问题',
        paragraphs: ['水量充足并不代表可直接使用。铁、锰、硬度、盐分等指标应由实验室按目标用途检测，并据此设计处理系统。'],
      },
      {
        heading: '完整交付资料',
        bullets: ['成井结构和施工记录', '抽水试验与建议运行流量', '水质检测报告', '水泵、控制柜与维护资料'],
        paragraphs: ['这些资料是后续维护、诊断和保护投资的基线。'],
      },
    ],
  },
  'groundwater-case-studies-problems': {
    slug: 'groundwater-case-studies-problems',
    eyebrow: '故障预防',
    title: '地下水系统案例：常见故障原因',
    description: '识别出水量下降、出砂、腐蚀、咸化和污染的常见原因。',
    audience: '资产所有者、工程、维护及环境团队',
    sections: [
      {
        heading: '连续抽水后流量下降',
        paragraphs: ['可能是抽水量超过可持续能力、滤管堵塞或含水层恢复时间不足。处理前应记录流量、水位和耗电趋势。'],
      },
      {
        heading: '系统出现砂粒',
        paragraphs: ['原因可能包括滤管与砾料设计不当、洗井不足、抽水过大或井体损坏。继续运行会扩大水井和设备损伤。'],
      },
      {
        heading: '水质随时间改变',
        paragraphs: ['咸化、酸性、异味或污染可能来自过度降深、套管破损、流场变化或地表渗入，应与初始水质基线比较。'],
      },
      {
        heading: '可量化的预防措施',
        bullets: ['记录流量、动水位、压力和能耗。', '依据风险安排水质检测。', '在增大水泵或延长运行时间前先分析趋势。'],
        paragraphs: ['连续记录能减少猜测并显著提高诊断效率。'],
      },
    ],
  },
  'groundwater-law-regulation-thailand': {
    slug: 'groundwater-law-regulation-thailand',
    eyebrow: '泰国法规指南',
    title: '泰国地下水法规与许可证',
    description: '了解在泰国钻井、取用地下水、报告及核验的基本要求。',
    audience: '项目业主、法务、工程团队及许可证申请人',
    sections: [
      {
        heading: '钻井或取水前先确认法规',
        paragraphs: ['泰国依据《地下水法》及相关部级条例管理地下水，具体要求取决于地点、井的条件和用途。', '钻井许可证与地下水使用许可证是不同审批。拥有土地或已有水井，并不自动取得取水权。'],
      },
      {
        heading: '将合规纳入项目计划',
        bullets: ['确认场地是否位于地下水管制区域。', '核实最新文件、费用和主管机关。', '按许可要求保存井资料、计量和用水报告。', '跟踪许可条件、续期日期和用水变化。'],
        paragraphs: ['本文仅供一般参考，不构成法律意见。实施前请向泰国地下水资源厅或主管机关确认最新要求。'],
      },
      {
        heading: '使用最新官方资料',
        paragraphs: ['表格和程序可能调整，实际项目应始终从下列官方页面开始核实。'],
      },
    ],
    sources: officialSources.map((source) => ({ ...source, label: source.label.replace('Department of Groundwater Resources', '泰国地下水资源厅') })),
  },
  'groundwater-faq-thailand': {
    slug: 'groundwater-faq-thailand',
    eyebrow: '常见问题',
    title: '项目业主常问的地下水问题',
    description: '关于出水量、水质、维护和报价准备的简明说明。',
    audience: '业主、采购团队、工程师及一般读者',
    sections: [
      { heading: '一口井能出多少水？', paragraphs: ['不能只凭深度或管径判断。出水量取决于含水层、成井质量和抽水水位，必须通过抽水试验确认。'] },
      { heading: '地下水能直接饮用吗？', paragraphs: ['不能凭清澈度或味道判断安全性。应按目标用途检测，并根据实验室结果设计处理。'] },
      { heading: '多久洗井一次？', paragraphs: ['没有统一周期。应持续观察流量、水位、出砂、浑浊度和能耗，在趋势恶化时先诊断原因。'] },
      { heading: '报价需要哪些资料？', paragraphs: ['请提供项目位置、每日用量、水质要求、运行时间、现场通道和现有井资料。输入越完整，工作范围越可靠。'] },
    ],
  },
  'groundwater-guide-factory-hotel-resort': {
    slug: 'groundwater-guide-factory-hotel-resort',
    eyebrow: '业主指南',
    title: '工厂、酒店与度假村地下水规划指南',
    description: '从用水平衡、现场勘查到验收、备用方案和长期维护的决策流程。',
    audience: '企业业主、厂长、酒店管理人员及工程团队',
    sections: [
      { heading: '1. 从项目用水平衡开始', paragraphs: ['按用途、所需水质和使用时间拆分生产、客房、厨房、洗衣、灌溉和消防用水，避免所有系统采用同一标准。'] },
      { heading: '2. 确定井位前进行现场调查', paragraphs: ['检查建筑、地下管线、污染风险、钻机通道和维护空间，并与水文地质资料综合判断。'] },
      { heading: '3. 设定可量化的验收标准', bullets: ['成井记录及抽水试验解释', '合格实验室的水质报告', '建议运行流量与水泵设置', '维护计划和预警阈值'], paragraphs: ['将这些成果写入工作范围，便于比较方案并保障长期运行。'] },
      { heading: '4. 设计备用能力', paragraphs: ['无法停水的项目应配置储水、备用泵、关键备件和替代水源，并在主系统故障前测试应急方案。'] },
    ],
  },
}

const japaneseArticles: Record<LearningSlug, LocalizedArticle> = {
  'groundwater-calculator-tools': {
    slug: 'groundwater-calculator-tools',
    eyebrow: '計画ツール',
    title: '地下水システム概算計算ツール',
    description: '1日の使用量、計画運転時間、予備率から必要な設計揚水量を概算します。',
    audience: '事業主、技術、保守、調達の各担当者',
    sections: [
      { heading: '計算結果の使い方', paragraphs: ['結果は予算検討と技術協議のための概算値であり、井戸の揚水量を保証するものではありません。', '最終的な運転流量は、水文地質資料、井戸設計、適切な揚水試験により確認します。'], bullets: ['全工程・建物の日使用量を集計する。', 'ピーク時間と現実的なポンプ運転時間を確認する。', '増設、洗浄、消防、故障時の余裕を見込む。'] },
    ],
  },
  'groundwater-basics-thailand': {
    slug: 'groundwater-basics-thailand',
    eyebrow: '地下水の基礎',
    title: 'タイにおける地下水の基礎知識',
    description: '投資前に帯水層、水質、調査、井戸施工、揚水試験の基本を理解します。',
    audience: '初めて地下水を検討する事業主、管理者、設備担当者',
    sections: [
      { heading: '帯水層は単純な地下河川ではありません', paragraphs: ['地下水は土砂の空隙や岩盤の亀裂を流れるため、近接地点でも揚水量が大きく異なることがあります。', '掘削位置と深度は、地域資料、敷地条件、専門調査を組み合わせて決定します。'] },
      { heading: '水量と水質は別々に評価します', paragraphs: ['十分な水量があっても、鉄、マンガン、硬度、塩分などの処理が必要な場合があります。用途に合った水質分析が必要です。'] },
      { heading: '引渡し時に必要な資料', bullets: ['井戸構造・施工記録', '揚水試験と推奨運転流量', '水質分析結果', 'ポンプ・制御盤・保守資料'], paragraphs: ['これらは将来の保守と投資保全の基準になります。'] },
    ],
  },
  'groundwater-case-studies-problems': {
    slug: 'groundwater-case-studies-problems',
    eyebrow: '故障予防',
    title: '地下水システムの事例と故障原因',
    description: '揚水量低下、砂、腐食、塩水化、汚染の一般的な原因を早期に把握します。',
    audience: '設備所有者、技術、保守、環境部門',
    sections: [
      { heading: '連続運転後に流量が低下する', paragraphs: ['持続可能量を超える揚水、スクリーン閉塞、回復時間不足などが考えられます。対策前に流量、水位、電力の推移を記録します。'] },
      { heading: '配管に砂が出る', paragraphs: ['スクリーンや砂利充填の不適合、井戸開発不足、過大揚水、井戸の損傷が原因になり得ます。運転継続は被害を拡大させます。'] },
      { heading: '水質が時間とともに変化する', paragraphs: ['塩分、酸性、臭気、汚染は過剰な水位低下、ケーシング損傷、流動経路の変化、地表水の侵入などで生じます。初期分析値と比較してください。'] },
      { heading: '予防は数値で管理できます', bullets: ['流量、動水位、圧力、電力を記録する。', 'リスクに応じて水質を分析する。', 'ポンプ増強前に傾向を診断する。'], paragraphs: ['履歴データは推測を減らし、診断を迅速にします。'] },
    ],
  },
  'groundwater-law-regulation-thailand': {
    slug: 'groundwater-law-regulation-thailand',
    eyebrow: 'タイ法規ガイド',
    title: 'タイの地下水法規と許可',
    description: 'タイでの掘削、地下水利用、報告、公式確認に関する基本的な手続きを整理します。',
    audience: '事業主、法務、技術部門、許可申請者',
    sections: [
      { heading: '掘削・利用前に規制を確認する', paragraphs: ['タイでは地下水法および関連省令に基づき地下水が管理され、要件は地域、井戸条件、用途により異なります。', '掘削許可と地下水利用許可は別の承認です。土地所有や既存井戸だけで取水権が認められるわけではありません。'] },
      { heading: 'コンプライアンスを計画に組み込む', bullets: ['地下水指定区域か確認する。', '最新の書類、手数料、管轄窓口を確認する。', '井戸記録、計量、使用量報告を保管する。', '許可条件と更新日を管理する。'], paragraphs: ['本記事は一般情報であり法的助言ではありません。実施前に地下水資源局または管轄当局で最新要件を確認してください。'] },
      { heading: '最新の公式情報を参照する', paragraphs: ['様式や手続きは変更される可能性があります。実際の案件では以下の公式ページから確認してください。'] },
    ],
    sources: officialSources.map((source) => ({ ...source, label: source.label.replace('Department of Groundwater Resources', 'タイ地下水資源局') })),
  },
  'groundwater-faq-thailand': {
    slug: 'groundwater-faq-thailand',
    eyebrow: 'よくある質問',
    title: '事業主から多く寄せられる地下水の質問',
    description: '揚水量、水質、保守、見積り準備について簡潔に解説します。',
    audience: '事業主、調達担当、技術者、一般の方',
    sections: [
      { heading: '井戸1本でどの程度揚水できますか？', paragraphs: ['深度や口径だけでは判断できません。帯水層、井戸構造、揚水時水位に左右され、揚水試験で確認します。'] },
      { heading: '地下水はそのまま飲めますか？', paragraphs: ['透明度や味だけで安全性を判断しないでください。用途に応じた分析を行い、その結果から処理設備を設計します。'] },
      { heading: '井戸洗浄は何年ごとですか？', paragraphs: ['一律の周期はありません。流量、水位、砂、濁度、電力の傾向を監視し、性能低下時は原因を診断します。'] },
      { heading: '見積りに必要な情報は？', paragraphs: ['所在地、日使用量、必要水質、運転時間、現場アクセス、既存井戸資料をご提示ください。情報が詳しいほど現実的な計画になります。'] },
    ],
  },
  'groundwater-guide-factory-hotel-resort': {
    slug: 'groundwater-guide-factory-hotel-resort',
    eyebrow: '事業主向けガイド',
    title: '工場・ホテル・リゾートの地下水計画',
    description: '水収支、敷地調査、引渡し、冗長性、長期保守までの判断手順です。',
    audience: '事業主、工場長、ホテル管理者、技術チーム',
    sections: [
      { heading: '1. 事業の水収支から始める', paragraphs: ['製造、客室、厨房、洗濯、散水、消防を用途・水質・時間帯別に分け、すべてを同一仕様にしないことが重要です。'] },
      { heading: '2. 掘削地点を決める前に敷地調査を行う', paragraphs: ['建物、埋設物、汚染リスク、掘削機の進入、将来の保守スペースを確認し、水文地質情報と合わせて評価します。'] },
      { heading: '3. 測定可能な引渡し基準を定める', bullets: ['井戸完成記録と揚水試験解析', '適切な試験所による水質分析', '推奨運転流量とポンプ設定', '保守計画と警告基準'], paragraphs: ['成果物を仕様書に明記することで、提案比較と長期運用が容易になります。'] },
      { heading: '4. バックアップを設計する', paragraphs: ['断水できない施設では、貯水、予備ポンプ、重要予備品、代替水源を準備し、主系統の故障前に計画を試験します。'] },
    ],
  },
}

export const localizedContent: Record<LocalizedLocale, LocalizedContent> = {
  th: {
    siteTitle: 'สยามกราวด์วอเตอร์ | ผู้เชี่ยวชาญด้านน้ำบาดาล',
    metaDescription:
      'บริการสำรวจ เจาะบ่อ ซ่อมบำรุง วิเคราะห์ปัญหา และวางแผนระบบน้ำบาดาลอย่างยั่งยืนทั่วประเทศไทย',
    common: {
      home: 'หน้าหลัก',
      learnMore: 'ดูรายละเอียด',
      contactTeam: 'ปรึกษาทีมงาน',
      viewProjects: 'ดูผลงาน',
      breadcrumbLabel: 'เส้นทางนำทาง',
      suitableFor: 'เหมาะสำหรับ',
      officialSources: 'แหล่งข้อมูลทางการ',
      sourceReviewed: 'ตรวจสอบข้อมูลล่าสุด: 2 สิงหาคม 2569',
      project: 'โครงการ',
      service: 'บริการ',
    },
    home: {
      eyebrow: 'รักษ์น้ำบาดาล',
      title: 'เจาะบ่อคุณภาพดี ติดเครื่องสูบคุณภาพดี สูบน้ำขึ้นมาใช้ถูกวิธี',
      summary:
        'เราจะเป็นผู้นำด้านการเจาะบ่อน้ำบาดาลคุณภาพดี และสูบพัฒนาน้ำบาดาลขึ้นมาใช้อย่างถูกหลักวิชาการ',
      assurance:
        'ป้องกัน ไม่ทำให้ชั้นน้ำเสียหาย ไม่ทำลายสิ่งแวดล้อม ดูแลรักษา ทุกโครงการให้มีน้ำคุณภาพดี ใช้ได้อย่างยั่งยืน คุ้มค่าการลงทุน',
      motto: 'ทำความดีตอบแทนแผ่นดิน',
      primaryCta: 'ปรึกษาโครงการของคุณ',
      secondaryCta: 'ดูบริการของเรา',
      servicesTitle: 'ทีมเทคนิคหนึ่งเดียว ดูแลครบตลอดอายุการใช้งานของบ่อ',
      servicesIntro:
        'การประสานงานตั้งแต่สำรวจ เจาะ ติดตั้งเครื่องสูบ ตรวจคุณภาพน้ำ และดูแลระยะยาว ช่วยลดช่องว่างในการออกแบบ',
      projectsTitle: 'ผลงาน ทุกภูมิภาค ทั่วประเทศ',
      projectsIntro:
        'ผลงานโครงการภาครัฐ อุตสาหกรรม โรงแรม เกษตรกรรม และโครงสร้างพื้นฐานในประเทศไทยและภูมิภาค',
      trustTitle: 'สร้างเพื่อการตัดสินใจที่ยั่งยืน',
      trust: [
        { value: '80', label: 'โครงการที่เผยแพร่ในทะเบียนผลงาน' },
        { value: '4', label: 'สาขาบริการที่ทำงานร่วมกัน' },
        { value: 'ทั่วประเทศ', label: 'ความพร้อมของทีมภาคสนาม' },
      ],
    },
    about: {
      eyebrow: 'เกี่ยวกับสยามกราวด์วอเตอร์',
      title: 'เกี่ยวกับเรา',
      intro:
        'บริษัท สยามกราวด์วอเตอร์ จำกัด ก่อตั้งเมื่อปี พ.ศ.2530 โดยคณะผู้เชี่ยวชาญที่เคยปฏิบัติงานน้ำบาดาลของภาครัฐ มีความเชี่ยวชาญด้านการเจาะ การสำรวจ การซ่อมบำรุงรักษา และการใช้น้ำบาดาล',
      storyTitle: 'ความเป็นมา',
      story: [
        'บริษัทฯ มีเจตนาเพื่อดำเนินธุรกิจด้านการเจาะพัฒนาน้ำบาดาลขึ้นมาใช้อย่างถูกหลักวิชาการ ส่งเสริมให้มีการใช้น้ำบาดาลอย่างอนุรักษ์ ปกป้องรักษาทรัพยากรน้ำบาดาลให้มีใช้อย่างยั่งยืน และใช้ทรัพยากรน้ำบาดาลอย่างคุ้มค่า เพื่อให้เกิดประโยชน์กับผู้ใช้น้ำบาดาล และประชาชนทั้งประเทศ',
        'จากประสบการณ์และผลงานที่ผ่านมา เราได้พัฒนาด้านคุณภาพและประสิทธิภาพอย่างต่อเนื่อง โดยนำเทคโนโลยีและวิทยาการสมัยใหม่มาประยุกต์ใช้กับการทำงาน จนสามารถให้บริการสำรวจศึกษาน้ำบาดาล เจาะบ่อน้ำบาดาลคุณภาพดี และพัฒนาการบริหารจัดการน้ำขึ้นมาใช้ให้เหมาะสมกับสภาพแหล่งน้ำและการใช้งานจริง',
      ],
      principlesTitle: 'หลักการทำงาน',
      principles: [
        { title: 'ข้อมูลก่อนการเจาะ', description: 'ข้อจำกัดของพื้นที่และข้อมูลธรณีวิทยาน้ำบาดาลเป็นพื้นฐานของการสำรวจและออกแบบ' },
        { title: 'ปกป้องชั้นน้ำ', description: 'โครงสร้างบ่อและอัตราสูบได้รับการวางแผนเพื่อลดความเสียหายที่ป้องกันได้' },
        { title: 'วัดผลได้', description: 'ผลสูบทดสอบ คุณภาพน้ำ และบันทึกการเดินระบบทำให้บ่อเป็นสินทรัพย์ที่บริหารจัดการได้' },
        { title: 'ดูแลให้ใช้งานได้นาน', description: 'ข้อมูลตั้งต้นและการบำรุงรักษาที่เหมาะสมช่วยรักษาปริมาณน้ำ คุณภาพน้ำ และประสิทธิภาพพลังงาน' },
      ],
      teamTitle: 'ทีมงาน สยามกราวด์วอเตอร์',
      teamIntro:
        'ทีมสำรวจใช้เครื่อง Resistivity Meter สำรวจและแปลผลโดยทีมที่มีประสบการณ์ ทีมเจาะผ่านการอบรมและมีใบอนุญาตเจาะจากกรมทรัพยากรน้ำบาดาล และทีมซ่อมบำรุงมีความชำนาญงานบ่อ เครื่องสูบ และการสูบทดสอบปริมาณน้ำ',
    },
    services: {
      eyebrow: 'บริการด้านน้ำบาดาล',
      title: 'บริการของเรา',
      intro: 'เลือกบริการเฉพาะด้าน หรือให้เราประสานงานระบบน้ำบาดาลแบบครบวงจร',
      highlightsTitle: 'ขอบเขตบริการ',
      processTitle: 'ขั้นตอนการทำงานโดยทั่วไป',
      items: {
        survey: {
          title: 'สำรวจศึกษาน้ำบาดาล น้ำแร่ น้ำพุร้อน และ EIA',
          short: 'สำรวจศึกษาโดยผู้เชี่ยวชาญ และทีมสำรวจที่มีความชำนาญและประสบการณ์สูง',
          intro: 'รับสำรวจศึกษาน้ำบาดาลให้กับโครงการที่ต้องการเจาะน้ำบาดาลขึ้นมาใช้ โดยการวัดค่าความต้านทานไฟฟ้า (Resistivity Survey) รวมถึงการสำรวจแหล่งน้ำแร่ น้ำพุร้อน และการสำรวจสำหรับรายงานวิเคราะห์ผลกระทบสิ่งแวดล้อม (EIA)',
          highlights: ['ทบทวนข้อมูลและสำรวจพื้นที่เบื้องต้น', 'สำรวจธรณีวิทยาน้ำบาดาลและธรณีฟิสิกส์', 'ประเมินจุดเจาะที่มีศักยภาพ', 'จัดทำรายงานประกอบโครงการและ EIA'],
          process: ['กำหนดความต้องการใช้น้ำและเกณฑ์ตัดสินใจ', 'ทบทวนข้อมูลเดิมและความเสี่ยงของพื้นที่', 'ดำเนินการสำรวจภาคสนาม', 'จัดลำดับเป้าหมายเจาะและขั้นตอนถัดไป'],
        },
        drilling: {
          title: 'เจาะบ่อน้ำบาดาล น้ำแร่ น้ำพุร้อน และบ่อสูบลดระดับน้ำ',
          short: 'เจาะบ่อพร้อมติดตั้งเครื่องสูบอย่างถูกหลักวิชาการ และอุดกลบบ่อน้ำบาดาลที่เลิกใช้งาน',
          intro: 'รับขุดเจาะก่อสร้างบ่อน้ำบาดาลได้มาตรฐานตามหลักวิชาการ และถูกต้องตาม พ.ร.บ. น้ำบาดาล ทั้งบ่อในชั้นกรวดทราย บ่อในหินแข็ง บ่อสูบลดระดับน้ำ และบ่อสังเกตการณ์',
          highlights: ['บ่อน้ำบาดาลและบ่อผลิต', 'บ่อน้ำแร่และบ่อน้ำพุร้อน', 'บ่อสูบลดระดับน้ำ', 'พัฒนาบ่อ สูบทดสอบ และจัดทำเอกสารส่งมอบ'],
          process: ['ยืนยันผลสำรวจและทางเข้าพื้นที่', 'กำหนดโครงสร้างบ่อและเกณฑ์รับงาน', 'เจาะ บันทึกชั้นดิน และก่อสร้างบ่อ', 'พัฒนาบ่อ ทดสอบ และบันทึกผล'],
        },
        maintenance: {
          title: 'ซ่อมบำรุงบ่อและเครื่องสูบน้ำ',
          short: 'เพื่อให้บ่อน้ำบาดาลและเครื่องสูบมีอายุการใช้งานยาวนาน ควรทำการบำรุงรักษาให้ถูกต้อง',
          intro: 'บ่อที่ใช้งานเป็นเวลานานอาจมีตะกอนดินทราย สนิมเหล็ก หรือตะกรันอุดตัน ทำให้น้ำไหลเข้าบ่อน้อยลง ควรเป่าล้างพัฒนาบ่อและตรวจเช็คเครื่องสูบทุก 1 ปี หรือตามความเหมาะสมของสภาพการใช้งานจริง',
          highlights: ['เป่าล้างและพัฒนาบ่อ', 'ถอน ตรวจสอบ และซ่อมเครื่องสูบ', 'ปรับระดับติดตั้งและระบบควบคุม', 'วิเคราะห์แนวโน้มอัตราสูบ ระดับน้ำ และพลังงาน'],
          process: ['รวบรวมข้อมูลเดิมและอาการผิดปกติ', 'ตรวจบ่อและระบบสูบน้ำ', 'เลือกวิธีแก้ไขที่มีประสิทธิภาพและกระทบน้อยที่สุด', 'ทดสอบซ้ำและกำหนดเกณฑ์ติดตาม'],
        },
        consult: {
          title: 'วิเคราะห์และแก้ไขปัญหาระบบน้ำบาดาล',
          short: '•ซ่อมบ่อใหญ่ คุ้มค่ากว่าเจาะบ่อใหม่•',
          intro: 'บ่อใหญ่ขนาด 8–12 นิ้วที่ชำรุดเสียหาย ทั้งปัญหาทรายเข้าบ่อ น้ำขุ่น บ่ออุดตัน น้ำเค็มเข้าบ่อ บ่อรั่วทะลุ น้ำเสียเข้าบ่อ หรือเครื่องสูบชำรุด เราสามารถซ่อมแก้ไขด้ด้วยวิธีพิเศษ เร็วกว่า ถูกกว่าเจาะบ่อใหม่ และคุ้มค่าการลงทุน',
          highlights: ['วิเคราะห์อัตราสูบต่ำและระดับน้ำลด', 'วิเคราะห์ทราย ความขุ่น และความสมบูรณ์ของบ่อ', 'ตรวจเส้นทางความเค็ม ความเป็นกรด และการปนเปื้อน', 'จัดทำแผนฟื้นฟูและให้คำปรึกษาฝ่ายเจ้าของ'],
          process: ['ทบทวนแบบเดิมและประวัติความเสียหาย', 'วัดสภาพชลศาสตร์และคุณภาพน้ำปัจจุบัน', 'ทดสอบสาเหตุที่เป็นไปได้', 'จัดลำดับการซ่อม เปลี่ยน หรือปรับการใช้งาน'],
        },
      },
    },
    projects: {
      eyebrow: 'ทะเบียนผลงาน',
      title: 'ตัวอย่าง โครงการของเรา',
      intro: 'เรามีประสบการณ์และผลงานด้านการสำรวจศึกษาน้ำบาดาล เจาะบ่อน้ำบาดาลคุณภาพดี และวางแผนบริหารจัดการน้ำบาดาลขึ้นมาใช้ให้เหมาะสมกับแหล่งน้ำบาดาล ทำให้โครงการมีน้ำคุณภาพดีใช้ได้อย่างเพียงพอและยั่งยืน',
      all: 'ทั้งหมด',
      showing: 'แสดง',
      loadMore: 'แสดงโครงการเพิ่มเติม',
      details: 'ดูรายละเอียดโครงการ',
      typeLabel: 'ประเภทงาน',
      categoryLabel: 'ภาคส่วน',
      location: 'สถานที่โครงการ',
      yearLabel: 'ปีผลงาน',
      workScopeLabel: 'ขอบเขตงาน',
      businessTypeLabel: 'ประเภทธุรกิจ',
      projectStoryTitle: 'รายละเอียดงาน',
      recoveredRecordNote: 'เรียบเรียงจากทะเบียนผลงานและเนื้อหาที่เผยแพร่ในเว็บไซต์เดิมของบริษัท',
      registryNoteTitle: 'เกี่ยวกับข้อมูลนี้',
      registryNote: 'รายการนี้รวบรวมจากข้อมูลโครงการที่บริษัทเคยเผยแพร่บนเว็บไซต์เดิม โดยสงวนเฉพาะรายละเอียดเชิงสัญญาและข้อมูลที่อ่อนไหวของลูกค้า โปรดติดต่อทีมงานหากต้องการกรณีศึกษาที่ใกล้เคียง',
      mapCta: 'เปิดตำแหน่งใน Google Maps',
      enquiryCta: 'สอบถามผลงานที่ใกล้เคียง',
      categories: { government: 'ภาครัฐ', factory: 'โรงงาน', resort: 'โรงแรม รีสอร์ต', agriculture: 'เกษตรกรรม ปศุสัตว์', dewatering: 'Dewatering', other: 'อื่นๆ' },
      types: { agriculture: 'โครงการน้ำบาดาลเพื่อการเกษตร', factory: 'โครงการน้ำบาดาลภาคอุตสาหกรรม', government: 'โครงการน้ำบาดาลภาครัฐ', 'island, resort': 'โครงการน้ำบาดาลรีสอร์ตบนเกาะ', infrastructure: 'โครงการสูบลดระดับน้ำและโครงสร้างพื้นฐาน', other: 'โครงการน้ำบาดาล', resort: 'โครงการน้ำบาดาลโรงแรมและรีสอร์ต', train: 'โครงการน้ำบาดาลด้านโครงสร้างพื้นฐาน' },
    },
    governance: {
      eyebrow: 'โครงการรักษ์น้ำบาดาล',
      title: 'รู้จักใช้อย่างชาญฉลาด แหล่งน้ำของชาติไม่เสียหาย',
      intro: 'น้ำบาดาลมีคุณค่า ควรพัฒนาอย่างอนุรักษ์ โครงการรักษ์น้ำบาดาลก่อตั้งเมื่อ 22 ธันวาคม 2543 เพื่อส่งเสริมให้ใช้น้ำอย่างชาญฉลาด และปกป้องรักษาแหล่งน้ำบาดาลให้ใช้ได้อย่างยั่งยืน',
      pillars: [
        { title: 'ความซื่อตรงทางวิชาชีพ', description: 'คำแนะนำอ้างอิงข้อมูลที่มี ระบุสมมติฐานชัดเจน และกำหนดเกณฑ์รับงานที่วัดผลได้' },
        { title: 'ความรับผิดชอบต่อสิ่งแวดล้อม', description: 'วางแผนอัตราสูบและโครงสร้างบ่อเพื่อรักษาชั้นน้ำบาดาลอย่างยั่งยืน' },
        { title: 'ความปลอดภัยและวินัยภาคสนาม', description: 'การวางแผน ควบคุมพื้นที่ และใช้อุปกรณ์ที่เหมาะสมช่วยให้งานเจาะและซ่อมบำรุงปลอดภัยขึ้น' },
        { title: 'เคารพข้อมูลของลูกค้า', description: 'ใช้ข้อมูลโครงการเพื่อส่งมอบงาน และไม่เผยแพร่โดยปราศจากการอนุญาตที่เหมาะสม' },
      ],
      commitmentTitle: 'ความมุ่งมั่นในการอนุรักษ์น้ำบาดาล',
      commitment: '“รู้จักใช้อย่างชาญฉลาด แหล่งน้ำของชาติไม่เสียหาย น้ำบาดาลมีคุณค่า ควรพัฒนาอย่างอนุรักษ์”',
    },
    learning: {
      eyebrow: 'Groundwater Learning Center – Thailand',
      title: 'ศูนย์การเรียนรู้ เรื่องน้ำบาดาล',
      intro: 'ความรู้เชิงปฏิบัติสำหรับเจ้าของโครงการ วิศวกร และผู้ดูแลระบบน้ำบาดาลในประเทศไทย',
      audienceTitle: 'เหมาะสำหรับ',
      audience: ['โรงงาน โรงแรม รีสอร์ต และโครงการอสังหาริมทรัพย์', 'ทีมวิศวกรรม ซ่อมบำรุง และจัดซื้อ', 'ที่ปรึกษาและผู้ออกแบบระบบน้ำ', 'ผู้ที่กำลังเริ่มโครงการน้ำบาดาลในประเทศไทย'],
      topicsTitle: 'เลือกหัวข้อการเรียนรู้',
      topicsIntro: 'ใช้เครื่องมือคำนวณ ศึกษาพื้นฐาน วิเคราะห์ปัญหาที่พบบ่อย และตรวจสอบข้อกำหนดทางกฎหมาย',
      readMore: 'อ่านบทความ',
      articles: thaiArticles,
      ctaTitle: 'ต้องการนำข้อมูลไปใช้กับพื้นที่จริงหรือไม่',
      ctaText: 'ส่งตำแหน่ง ความต้องการใช้น้ำ และข้อจำกัดของโครงการให้ทีมงานช่วยประเมินเบื้องต้น',
    },
    calculator: {
      kicker: 'ประมาณการเบื้องต้น',
      title: 'คำนวณอัตราสูบที่ระบบต้องรองรับ',
      intro: 'กรอกความต้องการใช้น้ำต่อวัน ชั่วโมงเดินเครื่อง และปริมาณสำรอง',
      dailyDemand: 'ความต้องการใช้น้ำต่อวัน',
      dailyUnit: 'ลบ.ม./วัน',
      pumpHours: 'ชั่วโมงสูบที่วางแผนไว้',
      hoursUnit: 'ชั่วโมง/วัน',
      reserve: 'ปริมาณสำรองและการเติบโต',
      percentUnit: 'เปอร์เซ็นต์',
      result: 'อัตราสูบเบื้องต้นที่ระบบต้องรองรับ',
      flowUnit: 'ลบ.ม./ชั่วโมง',
      designDemand: 'ความต้องการใช้น้ำเพื่อออกแบบ',
      minimumBuffer: 'ถังพักขั้นต่ำเบื้องต้น',
      volumeUnit: 'ลบ.ม.',
      disclaimer: 'ผลลัพธ์นี้ไม่ใช่การรับรองปริมาณน้ำของบ่อ ต้องยืนยันอัตราสูบด้วยการสูบทดสอบและการออกแบบโดยผู้เชี่ยวชาญ',
    },
    contact: {
      eyebrow: 'ติดต่อเรา',
      title: 'เริ่มจากข้อมูลที่โครงการของคุณมีอยู่',
      intro: 'ส่งตำแหน่ง ความต้องการใช้น้ำ ข้อมูลบ่อเดิม หรืออาการของระบบ เพื่อให้ทีมงานประเมินและติดต่อกลับ',
      officeTitle: 'บริษัท สยามกราวด์วอเตอร์ จำกัด',
      officeAddress: '75 ซอยรามคำแหง 60 (สวนสน) แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240',
      locationTitle: 'เปิดตำแหน่งสำนักงาน',
      locationAction: 'ดูเส้นทางใน Google Maps',
      formTitle: 'ส่งรายละเอียดโครงการ',
      formIntro: 'ข้อมูลที่จำเป็นจะช่วยให้เราเข้าใจคำขอและประสานทีมเทคนิคที่เหมาะสม',
      labels: {
        website: 'เว็บไซต์',
        subject: 'หัวข้อที่ต้องการปรึกษา',
        name: 'ชื่อผู้ติดต่อ',
        company: 'บริษัท / โครงการ',
        phone: 'โทรศัพท์',
        email: 'อีเมล',
        details: 'รายละเอียดโครงการ',
        detailsPlaceholder: 'ตำแหน่งโครงการ ปริมาณน้ำที่ต้องการ อาการ ข้อมูลเดิม และช่วงเวลาที่ต้องการ',
        consentPrefix: 'ข้าพเจ้ายินยอมให้บริษัทใช้ข้อมูลนี้เพื่อตอบกลับคำขอ ตาม',
        privacy: 'นโยบายข้อมูลส่วนบุคคล',
        submit: 'ส่งให้ทีมงาน',
        submitting: 'กำลังส่ง…',
        emailFallback: 'หรือติดต่อทางอีเมลโดยตรง',
        success: 'ได้รับข้อความแล้ว ทีมงานจะติดต่อกลับโดยเร็วที่สุด',
        error: 'ไม่สามารถส่งแบบฟอร์มได้ กรุณาติดต่อ sgw_th@outlook.com หรือ 0-2735-0789',
      },
    },
    privacy: {
      eyebrow: 'นโยบายข้อมูลส่วนบุคคล',
      title: 'การใช้ข้อมูลจากแบบฟอร์มติดต่อ',
      intro: 'ข้อมูลที่คุณส่งจะใช้เพื่อประเมินคำขอ ติดต่อกลับ และประสานงานโครงการที่เกี่ยวข้องเท่านั้น',
      sections: [
        { title: 'ข้อมูลที่เราเก็บ', text: 'ชื่อ บริษัทหรือโครงการ โทรศัพท์ อีเมล หัวข้อ และรายละเอียดโครงการที่คุณเลือกส่งให้เรา' },
        { title: 'วัตถุประสงค์และการเปิดเผย', text: 'เราใช้ข้อมูลเพื่อติดต่อและประเมินโครงการ ไม่ขายหรือเผยแพร่ข้อมูล โดยข้อมูลอาจผ่านผู้ให้บริการอีเมลของบริษัทเพื่อส่งถึงทีมที่เกี่ยวข้องอย่างปลอดภัย' },
        { title: 'ระยะเวลาเก็บและสิทธิของคุณ', text: 'เราเก็บข้อมูลเท่าที่จำเป็นต่อการตอบคำขอและงานที่เกี่ยวข้อง หากต้องการสอบถาม แก้ไข หรือลบข้อมูล โปรดติดต่อ sgw_th@outlook.com' },
      ],
      back: 'กลับไปหน้าติดต่อเรา',
    },
  },
  en: {
    siteTitle: 'Siam Groundwater | Groundwater specialists in Thailand',
    metaDescription:
      'Groundwater exploration, well drilling, maintenance, diagnostics and sustainable water-system planning across Thailand.',
    common: { home: 'Home', learnMore: 'Learn more', contactTeam: 'Talk to our team', viewProjects: 'View projects', breadcrumbLabel: 'Breadcrumb', suitableFor: 'Suitable for', officialSources: 'Official sources', sourceReviewed: 'Information reviewed: 2 August 2026', project: 'Project', service: 'Service' },
    home: {
      eyebrow: 'GROUNDWATER ENGINEERING · THAILAND',
      title: 'We know groundwater.',
      summary: 'From exploration and well construction to pumping tests, maintenance and recovery, we build groundwater systems around evidence—not guesswork.',
      assurance: 'Protect the aquifer. Deliver dependable water. Preserve the investment for the long term.',
      motto: 'Give back to the land through good work',
      primaryCta: 'Discuss your site',
      secondaryCta: 'Explore our services',
      servicesTitle: 'One technical team, the complete well lifecycle',
      servicesIntro: 'A coordinated scope reduces design gaps between exploration, drilling, pumps, water quality and long-term operation.',
      projectsTitle: 'Experience across Thailand and the region',
      projectsIntro: 'A searchable registry of public, industrial, hospitality, agricultural and infrastructure assignments.',
      trustTitle: 'Built for decisions that last',
      trust: [
        { value: '80', label: 'published project records' },
        { value: '4', label: 'integrated service disciplines' },
        { value: 'Nationwide', label: 'field capability across Thailand' },
      ],
    },
    about: {
      eyebrow: 'ABOUT SIAM GROUNDWATER',
      title: 'Specialists who treat every well as long-term infrastructure',
      intro: 'Siam Groundwater combines field experience, hydrogeology, drilling control and maintenance discipline to develop groundwater responsibly.',
      storyTitle: 'Our operating philosophy',
      story: [
        'A productive well is not defined by depth alone. It is the result of a suitable location, sound construction, controlled development, a verified pumping rate and a maintenance plan.',
        'We work with project owners from the first water-demand discussion through handover and long-term monitoring, keeping technical evidence at the center of each decision.',
      ],
      principlesTitle: 'How we work',
      principles: [
        { title: 'Evidence before drilling', description: 'Site constraints and hydrogeological information guide the investigation and design.' },
        { title: 'Protect the aquifer', description: 'Well construction and pumping rates are planned to avoid preventable damage.' },
        { title: 'Measure the result', description: 'Pumping tests, water-quality results and operating records turn a well into a manageable asset.' },
        { title: 'Maintain for decades', description: 'Baseline data and timely maintenance preserve flow, water quality and energy efficiency.' },
      ],
      teamTitle: 'A multidisciplinary field team',
      teamIntro: 'Management, survey, drilling, maintenance and communication teams work together under one quality objective.',
    },
    services: {
      eyebrow: 'GROUNDWATER SERVICES',
      title: 'Technical support from first survey to long-term operation',
      intro: 'Choose a focused service or ask us to coordinate the complete groundwater scope.',
      highlightsTitle: 'What this service covers',
      processTitle: 'Typical working sequence',
      items: {
        survey: { title: 'Groundwater, mineral water, hot spring and EIA studies', short: 'Reduce drilling uncertainty with site evidence and a defensible investigation plan.', intro: 'We review project demand, site constraints, geological information and suitable geophysical methods before recommending investigation and drilling priorities.', highlights: ['Desktop review and site reconnaissance', 'Hydrogeological and geophysical investigation', 'Candidate drilling-point assessment', 'Study reporting for project and EIA coordination'], process: ['Define water demand and decision criteria', 'Review existing records and site risks', 'Complete field investigation', 'Rank drilling targets and next steps'] },
        drilling: { title: 'Groundwater, mineral water, hot spring and dewatering wells', short: 'Design and construct wells for the aquifer, duty and operating environment.', intro: 'Our drilling scope connects borehole construction, screen and gravel design, well development, pumping tests and final operating recommendations.', highlights: ['Groundwater and production wells', 'Mineral-water and hot-spring wells', 'Dewatering and drawdown systems', 'Well development, pumping tests and handover records'], process: ['Confirm investigation findings and access', 'Set construction and acceptance criteria', 'Drill, log and construct the well', 'Develop, test and document performance'] },
        maintenance: { title: 'Well and pump maintenance', short: 'Restore performance and extend the useful life of wells and pumping equipment.', intro: 'We diagnose decline before choosing cleaning, rehabilitation, pump work or operating changes.', highlights: ['Air-development and well cleaning', 'Pump removal, inspection and repair', 'Pump setting and control adjustment', 'Flow, water-level and energy trend review'], process: ['Collect baseline and operating symptoms', 'Inspect the well and pumping system', 'Select the least-destructive effective treatment', 'Retest and set monitoring thresholds'] },
        consult: { title: 'Groundwater system diagnostics and remediation', short: 'Find the cause of low yield, sand, salinity, corrosion or unstable operation.', intro: 'A structured diagnosis separates aquifer, well, pump, water-quality and operating problems so investment targets the real cause.', highlights: ['Low-yield and drawdown investigation', 'Sand, turbidity and well-integrity diagnosis', 'Salinity, acidity and contamination pathway review', 'Recovery plan and owner-side technical advice'], process: ['Review original records and failure history', 'Measure current hydraulic and water-quality conditions', 'Test the most likely causes', 'Prioritize repair, replacement or operating changes'] },
      },
    },
    projects: {
      eyebrow: 'PROJECT REGISTRY', title: 'Groundwater experience across sectors', intro: 'Browse 80 published records recovered from the company’s former website, covering government, factories, hospitality, agriculture and dewatering.', all: 'All projects', showing: 'Showing', loadMore: 'Show more projects', details: 'View project', typeLabel: 'Project type', categoryLabel: 'Sector', location: 'Project location', yearLabel: 'Project year', workScopeLabel: 'Scope of work', businessTypeLabel: 'Business sector', projectStoryTitle: 'Original project record', recoveredRecordNote: 'Recovered from the project registry and public content of the company’s former website. The original Thai wording is retained.', registryNoteTitle: 'About this record', registryNote: 'This record contains information previously published by the company. Contractual and client-sensitive details remain private; contact our team for a comparable case study.', mapCta: 'Open location in Google Maps', enquiryCta: 'Ask about similar experience',
      categories: { government: 'Government', factory: 'Factories', resort: 'Hotels & resorts', agriculture: 'Agriculture & livestock', dewatering: 'Dewatering', other: 'Other' },
      types: { agriculture: 'Agricultural groundwater project', factory: 'Industrial groundwater project', government: 'Government groundwater project', 'island, resort': 'Island resort groundwater project', infrastructure: 'Dewatering and infrastructure project', other: 'Groundwater project', resort: 'Hotel and resort groundwater project', train: 'Infrastructure groundwater project' },
    },
    governance: {
      eyebrow: 'CORPORATE GOVERNANCE', title: 'Good wells begin with responsible decisions', intro: 'Our governance approach connects technical quality, aquifer protection, safe field work and honest communication.',
      pillars: [
        { title: 'Technical integrity', description: 'Recommendations are based on available evidence, stated assumptions and measurable acceptance criteria.' },
        { title: 'Environmental responsibility', description: 'We seek sustainable pumping rates and construction practices that protect groundwater layers.' },
        { title: 'Safety and field discipline', description: 'Planning, site control and suitable equipment support safer drilling and maintenance work.' },
        { title: 'Respect for client information', description: 'Sensitive project data is used for delivery and is not published without appropriate permission.' },
      ],
      commitmentTitle: 'Groundwater conservation commitment', commitment: '“Drill quality wells and give back to the land” means treating every aquifer as shared natural infrastructure, not an unlimited resource.',
    },
    learning: {
      eyebrow: 'GROUNDWATER LEARNING CENTER', title: 'Better groundwater decisions begin with clear information', intro: 'Practical guidance for owners, engineers and operators planning groundwater systems in Thailand.', audienceTitle: 'Designed for', audience: ['Factories, hotels, resorts and property projects', 'Engineering, maintenance and procurement teams', 'Consultants and water-system designers', 'Anyone beginning a groundwater project in Thailand'], topicsTitle: 'Choose a learning topic', topicsIntro: 'Use the calculator, review technical fundamentals, study common failures and verify Thai regulatory requirements.', readMore: 'Read article', articles: englishArticles, ctaTitle: 'Need help applying this to your site?', ctaText: 'Share your location, water demand and project constraints with our team.',
    },
    calculator: { kicker: 'QUICK ESTIMATE', title: 'Estimate the required pumping flow', intro: 'Enter total daily demand, planned pump operating hours and a reserve allowance.', dailyDemand: 'Daily water demand', dailyUnit: 'm³/day', pumpHours: 'Planned pumping hours', hoursUnit: 'hours/day', reserve: 'Reserve and growth allowance', percentUnit: 'percent', result: 'Preliminary required system flow', flowUnit: 'm³/hour', designDemand: 'Design demand', minimumBuffer: 'Preliminary minimum buffer storage', volumeUnit: 'm³', disclaimer: 'This estimate does not certify well yield. Confirm the operating rate through a pumping test and professional system design.' },
    contact: {
      eyebrow: 'CONTACT', title: 'Start with the facts your project already has', intro: 'Send the location, water demand, existing-well information or system symptoms. Our team will use it for an initial review and follow-up.', officeTitle: 'Siam Groundwater office', officeAddress: '75 Ramkhamhaeng Soi 60, Hua Mak, Bang Kapi, Bangkok 10240, Thailand', locationTitle: 'Open our office location', locationAction: 'View directions in Google Maps', formTitle: 'Send project details', formIntro: 'Required fields help us understand the request and reply through the right technical team.',
      labels: { website: 'Website', subject: 'What would you like to discuss?', name: 'Contact name', company: 'Company / project', phone: 'Telephone', email: 'Email', details: 'Project details', detailsPlaceholder: 'Project location, required water volume, symptoms, existing records and preferred timing', consentPrefix: 'I agree that the company may use this information to respond to my request under the', privacy: 'privacy notice', submit: 'Send to our team', submitting: 'Sending…', emailFallback: 'Or email us directly', success: 'Your message has been received. Our team will contact you as soon as possible.', error: 'The form could not be sent. Please email sgw_th@outlook.com or call 0-2735-0789.' },
    },
    privacy: { eyebrow: 'PRIVACY NOTICE', title: 'How contact-form information is used', intro: 'Siam Groundwater uses the information you submit only to evaluate your request, respond and prepare relevant project communication.', sections: [
      { title: 'Information received', text: 'Your name, company or project, telephone number, email, enquiry subject and any project details you choose to provide.' },
      { title: 'Purpose and disclosure', text: 'The information is used for communication and project evaluation. It is not sold or publicly disclosed. It may pass through the company’s email service provider so the message reaches the responsible team.' },
      { title: 'Retention and your rights', text: 'Information is retained only as needed for the enquiry and related business obligations. To ask about, correct or request deletion of your information, email sgw_th@outlook.com.' },
    ], back: 'Back to contact' },
  },
  zh: {
    siteTitle: '暹罗地下水 | 泰国地下水专业服务',
    metaDescription: '提供地下水勘查、钻井、维护、故障诊断及可持续供水系统规划。',
    common: { home: '首页', learnMore: '了解更多', contactTeam: '咨询团队', viewProjects: '查看项目', breadcrumbLabel: '面包屑导航', suitableFor: '适合对象', officialSources: '官方资料', sourceReviewed: '资料复核日期：2026年8月2日', project: '项目', service: '服务' },
    home: { eyebrow: '泰国地下水工程', title: '我们懂地下水。', summary: '从勘查、成井、抽水试验到维护与修复，我们以现场数据和专业判断建设可靠的地下水系统。', assurance: '保护含水层，稳定供水，长期守护项目投资。', motto: '以善行回馈大地', primaryCta: '咨询项目场地', secondaryCta: '查看专业服务', servicesTitle: '覆盖水井全生命周期的技术团队', servicesIntro: '勘查、钻井、水泵、水质与长期运维由同一技术体系协调，减少设计衔接风险。', projectsTitle: '泰国及周边地区项目经验', projectsIntro: '涵盖公共事业、工业、酒店度假、农业与基础设施项目。', trustTitle: '面向长期运营的专业能力', trust: [{ value: '80', label: '公开项目记录' }, { value: '4', label: '一体化服务领域' }, { value: '全泰国', label: '现场服务能力' }] },
    about: { eyebrow: '关于暹罗地下水', title: '把每一口井都当作长期基础设施', intro: '暹罗地下水将现场经验、水文地质、钻井质量控制与维护管理结合，负责任地开发地下水。', storyTitle: '我们的工作理念', story: ['好井不只取决于深度，而来自合适的井位、可靠的结构、充分洗井、经过验证的抽水量和维护计划。', '我们从用水需求讨论开始，持续支持到交付和长期监测，并以技术资料作为每项决定的依据。'], principlesTitle: '工作原则', principles: [{ title: '先调查，后钻井', description: '以场地条件和水文地质资料制定调查与设计方案。' }, { title: '保护含水层', description: '合理的成井和抽水方案可避免不必要的资源损害。' }, { title: '用数据验收', description: '抽水试验、水质结果和运行记录让水井成为可管理资产。' }, { title: '面向长期维护', description: '建立基线并及时保养，以维持流量、水质和能源效率。' }], teamTitle: '多专业现场团队', teamIntro: '管理、勘查、钻井、维护和客户沟通团队以统一质量目标协作。' },
    services: { eyebrow: '地下水专业服务', title: '从初步调查到长期运行的技术支持', intro: '可选择单项服务，也可由我们统筹完整的地下水工程。', highlightsTitle: '服务内容', processTitle: '典型工作流程', items: {
      survey: { title: '地下水、矿泉水、温泉及EIA调查', short: '通过场地资料和专业调查降低盲目钻井风险。', intro: '我们分析项目用水、场地限制、地质资料和适用的物探方法，再确定调查重点与建议井位。', highlights: ['资料审查与现场踏勘', '水文地质及地球物理调查', '候选井位评估', '项目与EIA协调报告'], process: ['明确用水需求和决策标准', '审查既有资料与场地风险', '实施现场调查', '排序井位并提出下一步建议'] },
      drilling: { title: '地下水井、矿泉井、温泉井及降水井', short: '根据含水层、用途和运行环境设计并施工水井。', intro: '将钻孔、滤管与砾料设计、洗井、抽水试验和运行建议形成完整交付。', highlights: ['生产与供水井', '矿泉与温泉井', '基坑降水系统', '洗井、抽水试验与成井记录'], process: ['确认调查结果和施工通道', '制定结构与验收标准', '钻进、编录并成井', '洗井、试验并完成资料'] },
      maintenance: { title: '水井与水泵维护', short: '恢复性能并延长水井和抽水设备寿命。', intro: '先诊断性能下降原因，再选择洗井、修复、水泵维护或运行调整。', highlights: ['气举洗井与井内清洗', '水泵拆装、检查和维修', '水泵安装深度与控制调整', '流量、水位和能耗趋势分析'], process: ['收集基线与故障现象', '检查水井和抽水系统', '选择有效且损伤最小的处理方式', '复测并设定监测阈值'] },
      consult: { title: '地下水系统诊断与修复', short: '分析低流量、出砂、咸化、腐蚀及运行不稳的真正原因。', intro: '系统区分含水层、水井、水泵、水质和运行问题，让投资用于正确的解决方案。', highlights: ['低流量和降深分析', '出砂、浑浊及井体完整性诊断', '盐分、酸性和污染通道分析', '修复方案与业主技术支持'], process: ['审查原始资料和故障历史', '测量当前水力与水质状态', '验证最可能的原因', '排序修复、更换或运行调整方案'] },
    } },
    projects: { eyebrow: '项目登记', title: '跨行业地下水项目经验', intro: '浏览从公司旧网站恢复的80条公开项目记录。', all: '全部项目', showing: '当前显示', loadMore: '显示更多项目', details: '查看项目', typeLabel: '项目类型', categoryLabel: '行业', location: '项目地点', yearLabel: '项目年份', workScopeLabel: '工作范围', businessTypeLabel: '业务领域', projectStoryTitle: '原项目记录', recoveredRecordNote: '内容来自公司旧网站公开的项目登记和项目资料，并保留原始泰文。', registryNoteTitle: '关于本记录', registryNote: '本记录仅包含公司曾经公开的资料；合同及客户敏感信息仍不公开。', mapCta: '在Google地图中打开', enquiryCta: '咨询类似项目经验', categories: { government: '政府', factory: '工厂', resort: '酒店与度假村', agriculture: '农业与畜牧', dewatering: '降水工程', other: '其他' }, types: { agriculture: '农业地下水项目', factory: '工业地下水项目', government: '政府地下水项目', 'island, resort': '海岛度假村地下水项目', infrastructure: '降水与基础设施项目', other: '地下水项目', resort: '酒店与度假村地下水项目', train: '基础设施地下水项目' } },
    governance: { eyebrow: '企业治理', title: '可靠水井始于负责任的决策', intro: '我们的治理体系将技术质量、含水层保护、现场安全和诚信沟通结合起来。', pillars: [{ title: '技术诚信', description: '建议基于现有资料、明确假设和可衡量的验收标准。' }, { title: '环境责任', description: '采用可持续抽水量和保护地下水层的成井方式。' }, { title: '安全与现场纪律', description: '通过计划、现场控制和合适设备支持安全施工。' }, { title: '尊重客户信息', description: '敏感项目资料仅用于项目交付，未经许可不公开。' }], commitmentTitle: '地下水保护承诺', commitment: '“钻好井，回馈土地”意味着把每个含水层视为共享的自然基础设施，而不是无限资源。' },
    learning: { eyebrow: '地下水知识中心', title: '清晰信息，帮助做出更好的地下水决策', intro: '为在泰国规划地下水系统的业主、工程师和运维人员提供实用指南。', audienceTitle: '适合对象', audience: ['工厂、酒店、度假村和地产项目', '工程、维护和采购团队', '顾问与供水系统设计人员', '首次在泰国开展地下水项目的人士'], topicsTitle: '选择学习主题', topicsIntro: '使用计算工具、了解技术基础、分析常见故障并核实泰国法规。', readMore: '阅读文章', articles: chineseArticles, ctaTitle: '需要结合您的场地进一步分析吗？', ctaText: '请将位置、用水需求和项目限制发送给我们的团队。' },
    calculator: { kicker: '快速估算', title: '估算所需抽水流量', intro: '输入每日总用水量、计划抽水时间和储备比例。', dailyDemand: '每日用水量', dailyUnit: '立方米/日', pumpHours: '计划抽水时间', hoursUnit: '小时/日', reserve: '储备与增长比例', percentUnit: '百分比', result: '系统初步所需流量', flowUnit: '立方米/小时', designDemand: '设计用水量', minimumBuffer: '初步最低储水量', volumeUnit: '立方米', disclaimer: '本结果不代表水井出水量保证。实际运行流量应通过抽水试验和专业系统设计确认。' },
    contact: { eyebrow: '联系我们', title: '从您已有的项目资料开始', intro: '请提供位置、用水需求、现有井资料或系统故障现象，团队将进行初步评估并联系您。', officeTitle: '暹罗地下水办公室', officeAddress: '泰国曼谷邦卡皮区华马克，兰甘亨路60巷75号，邮编10240', locationTitle: '打开办公室位置', locationAction: '在Google地图查看路线', formTitle: '发送项目资料', formIntro: '必填信息帮助我们理解需求并由合适的技术团队回复。', labels: { website: '网站', subject: '希望咨询的主题', name: '联系人姓名', company: '公司 / 项目', phone: '电话', email: '电子邮箱', details: '项目详情', detailsPlaceholder: '项目位置、所需水量、故障现象、现有资料和期望时间', consentPrefix: '我同意公司依据', privacy: '隐私声明', submit: '发送给团队', submitting: '正在发送…', emailFallback: '或直接发送邮件', success: '我们已收到您的信息，团队将尽快联系您。', error: '表单暂时无法发送，请发送邮件至 sgw_th@outlook.com 或致电 0-2735-0789。' } },
    privacy: { eyebrow: '隐私声明', title: '联系表单信息的使用方式', intro: '暹罗地下水仅将您提交的信息用于评估需求、回复和准备相关项目沟通。', sections: [{ title: '接收的信息', text: '姓名、公司或项目、电话、电子邮箱、咨询主题以及您主动提供的项目资料。' }, { title: '用途与披露', text: '信息用于沟通和项目评估，不出售或公开。为了将信息安全送达负责团队，可能经过公司使用的电子邮件服务商。' }, { title: '保存期限与您的权利', text: '信息仅在处理咨询和相关业务义务所需期间保存。如需查询、更正或删除，请联系 sgw_th@outlook.com。' }], back: '返回联系页面' },
  },
  ja: {
    siteTitle: 'サイアム・グラウンドウォーター | タイの地下水専門会社',
    metaDescription: 'タイ全土で地下水調査、井戸掘削、保守、診断、持続可能な給水計画を提供します。',
    common: { home: 'ホーム', learnMore: '詳しく見る', contactTeam: 'チームに相談', viewProjects: '実績を見る', breadcrumbLabel: 'パンくずリスト', suitableFor: '対象', officialSources: '公式情報', sourceReviewed: '情報確認日：2026年8月2日', project: 'プロジェクト', service: 'サービス' },
    home: { eyebrow: 'タイの地下水エンジニアリング', title: '地下水を知り尽くす。', summary: '調査、井戸施工、揚水試験、保守、再生まで、推測ではなく現場データに基づいて地下水システムを構築します。', assurance: '帯水層を守り、安定した水を届け、投資価値を長期に維持します。', motto: '確かな仕事で大地に恩返しする', primaryCta: '敷地について相談', secondaryCta: 'サービスを見る', servicesTitle: '井戸のライフサイクルを支える一貫した技術体制', servicesIntro: '調査、掘削、ポンプ、水質、長期運用を同じ技術体系でつなぎ、設計の抜けを減らします。', projectsTitle: 'タイ全土と周辺地域での経験', projectsIntro: '公共、工業、宿泊、農業、インフラ分野の登録実績をご覧いただけます。', trustTitle: '長期運用を見据えた技術力', trust: [{ value: '80', label: '公開プロジェクト記録' }, { value: '4', label: '一体化した専門分野' }, { value: 'タイ全土', label: '現場対応エリア' }] },
    about: { eyebrow: '会社案内', title: 'すべての井戸を長期インフラとして考える専門家', intro: '現場経験、水文地質、掘削品質、保守管理を統合し、地下水を責任を持って開発します。', storyTitle: '私たちの考え方', story: ['良い井戸は深さだけでは決まりません。適切な位置、確かな構造、十分な井戸開発、確認された揚水量、保守計画が必要です。', '水需要の整理から引渡し、長期モニタリングまで、技術的根拠を中心にお客様を支援します。'], principlesTitle: '仕事の原則', principles: [{ title: '掘削前に根拠を集める', description: '敷地条件と水文地質情報から調査・設計を組み立てます。' }, { title: '帯水層を守る', description: '適切な井戸構造と揚水量で予防可能な損傷を避けます。' }, { title: '結果を測定する', description: '揚水試験、水質、運転記録により井戸を管理可能な資産にします。' }, { title: '長期保守を設計する', description: '基準データと適時の保守で流量、水質、効率を守ります。' }], teamTitle: '多分野の現場チーム', teamIntro: '管理、調査、掘削、保守、顧客対応の各チームが共通の品質目標で連携します。' },
    services: { eyebrow: '地下水サービス', title: '初期調査から長期運用までの技術支援', intro: '個別サービスにも、地下水業務全体の統括にも対応します。', highlightsTitle: 'サービス内容', processTitle: '標準的な進め方', items: {
      survey: { title: '地下水・鉱泉・温泉・EIA調査', short: '敷地データと専門調査で掘削の不確実性を減らします。', intro: '水需要、敷地制約、地質資料、適切な物理探査手法を検討し、調査と掘削候補の優先順位を提案します。', highlights: ['資料調査と現地踏査', '水文地質・物理探査', '掘削候補地点の評価', '事業・EIA調整用の報告'], process: ['水需要と判断基準を整理', '既存資料と敷地リスクを確認', '現地調査を実施', '掘削候補と次の手順を提示'] },
      drilling: { title: '地下水井・鉱泉井・温泉井・ディウォータリング井', short: '帯水層、用途、運転環境に合わせて設計・施工します。', intro: '掘削、スクリーン・砂利設計、井戸開発、揚水試験、運転提案までを一貫してつなぎます。', highlights: ['給水・生産井', '鉱泉・温泉井', 'ディウォータリングシステム', '井戸開発、揚水試験、完成記録'], process: ['調査結果と施工アクセスを確認', '構造・検収基準を設定', '掘削・検層・井戸施工', '井戸開発・試験・記録'] },
      maintenance: { title: '井戸・ポンプの保守', short: '性能を回復し、井戸とポンプ設備の寿命を延ばします。', intro: '性能低下の原因を診断してから、洗浄、再生、ポンプ整備、運転変更を選択します。', highlights: ['エアリフトによる井戸洗浄', 'ポンプ引上げ・点検・修理', '設置深度と制御の調整', '流量・水位・電力傾向の確認'], process: ['基準値と症状を収集', '井戸と揚水設備を点検', '効果的で損傷の少ない処置を選択', '再試験と監視基準の設定'] },
      consult: { title: '地下水システムの診断・改善', short: '流量低下、砂、塩分、腐食、不安定運転の原因を特定します。', intro: '帯水層、井戸、ポンプ、水質、運転の問題を切り分け、本当の原因に投資を集中させます。', highlights: ['流量低下・水位低下の調査', '砂・濁り・井戸健全性の診断', '塩分・酸性・汚染経路の確認', '復旧計画と事業主側技術支援'], process: ['元資料と故障履歴を確認', '水理・水質の現状を測定', '可能性の高い原因を検証', '修理・更新・運転変更を優先順位化'] },
    } },
    projects: { eyebrow: 'プロジェクト登録', title: '多様な分野での地下水実績', intro: '会社の旧サイトから復元した80件の公開プロジェクト記録をご覧いただけます。', all: 'すべて', showing: '表示中', loadMore: 'さらに表示', details: '詳細を見る', typeLabel: '案件種別', categoryLabel: '分野', location: 'プロジェクト所在地', yearLabel: '実施年', workScopeLabel: '業務範囲', businessTypeLabel: '事業分野', projectStoryTitle: '旧サイトの案件記録', recoveredRecordNote: '会社の旧サイトで公開されていた案件登録とコンテンツをもとに復元し、原文のタイ語を保持しています。', registryNoteTitle: 'この記録について', registryNote: '過去に会社が公開した資料のみを掲載し、契約および顧客の機密情報は引き続き非公開です。', mapCta: 'Googleマップで開く', enquiryCta: '類似実績を問い合わせる', categories: { government: '行政', factory: '工場', resort: 'ホテル・リゾート', agriculture: '農業・畜産', dewatering: 'ディウォータリング', other: 'その他' }, types: { agriculture: '農業地下水プロジェクト', factory: '工業地下水プロジェクト', government: '行政地下水プロジェクト', 'island, resort': '島嶼リゾート地下水プロジェクト', infrastructure: 'ディウォータリング・インフラプロジェクト', other: '地下水プロジェクト', resort: 'ホテル・リゾート地下水プロジェクト', train: 'インフラ地下水プロジェクト' } },
    governance: { eyebrow: '企業統治', title: '良い井戸は責任ある判断から始まる', intro: '技術品質、帯水層保全、現場安全、誠実なコミュニケーションを一体化しています。', pillars: [{ title: '技術的誠実さ', description: '入手可能な根拠、明示した仮定、測定可能な検収基準に基づいて提案します。' }, { title: '環境への責任', description: '持続可能な揚水量と地下水層を守る施工を目指します。' }, { title: '安全と現場規律', description: '計画、現場管理、適切な機材で安全な施工・保守を支えます。' }, { title: '顧客情報の尊重', description: '機密情報は業務遂行にのみ使用し、適切な許可なく公開しません。' }], commitmentTitle: '地下水保全への約束', commitment: '「高品質な井戸を掘り、大地に恩返しする」とは、帯水層を無限資源ではなく共有の自然インフラとして扱うことです。' },
    learning: { eyebrow: '地下水学習センター', title: '明確な情報から、より良い地下水判断へ', intro: 'タイで地下水システムを計画する事業主、技術者、運転担当者向けの実践情報です。', audienceTitle: '対象', audience: ['工場、ホテル、リゾート、不動産事業', '技術、保守、調達チーム', 'コンサルタントと給水設計者', 'タイで地下水事業を始める方'], topicsTitle: '学習テーマを選ぶ', topicsIntro: '計算ツール、技術基礎、故障事例、タイの法規情報を確認できます。', readMore: '記事を読む', articles: japaneseArticles, ctaTitle: '敷地への適用について相談しますか？', ctaText: '所在地、水需要、事業上の制約をお知らせください。' },
    calculator: { kicker: '概算', title: '必要揚水量を概算する', intro: '1日の総需要、ポンプ運転時間、予備率を入力してください。', dailyDemand: '1日の水需要', dailyUnit: 'm³/日', pumpHours: '計画運転時間', hoursUnit: '時間/日', reserve: '予備・成長率', percentUnit: '％', result: '必要システム流量の概算', flowUnit: 'm³/時', designDemand: '設計需要量', minimumBuffer: '最低予備貯水量の概算', volumeUnit: 'm³', disclaimer: 'この結果は井戸揚水量を保証するものではありません。揚水試験と専門設計により運転流量を確認してください。' },
    contact: { eyebrow: 'お問い合わせ', title: '現在お持ちの事業情報から始めましょう', intro: '所在地、水需要、既存井戸資料、設備の症状をお送りください。初期確認後、担当チームからご連絡します。', officeTitle: 'サイアム・グラウンドウォーター事務所', officeAddress: '75 Ramkhamhaeng Soi 60, Hua Mak, Bang Kapi, Bangkok 10240, Thailand', locationTitle: '事務所の位置を開く', locationAction: 'Googleマップで経路を見る', formTitle: 'プロジェクト情報を送る', formIntro: '必須項目は内容を把握し、適切な技術担当から返信するために使用します。', labels: { website: 'ウェブサイト', subject: 'ご相談内容', name: 'ご担当者名', company: '会社・プロジェクト', phone: '電話', email: 'メール', details: 'プロジェクト詳細', detailsPlaceholder: '所在地、必要水量、症状、既存資料、希望時期', consentPrefix: '以下の方針に基づき、回答のために会社が情報を利用することに同意します：', privacy: 'プライバシー通知', submit: 'チームへ送信', submitting: '送信中…', emailFallback: 'または直接メール', success: 'メッセージを受け付けました。担当チームよりできるだけ早くご連絡します。', error: 'フォームを送信できません。sgw_th@outlook.com または 0-2735-0789 へご連絡ください。' } },
    privacy: { eyebrow: 'プライバシー通知', title: 'お問い合わせ情報の利用方法', intro: '送信いただいた情報は、ご依頼の評価、返信、関連する事業連絡のためにのみ使用します。', sections: [{ title: '取得する情報', text: '氏名、会社・事業名、電話、メール、相談件名、お客様が任意で送信する事業情報。' }, { title: '利用目的と開示', text: '情報は連絡と事業評価に使用し、販売・公開しません。担当者へ安全に届けるため、当社のメールサービスを経由する場合があります。' }, { title: '保管期間とお客様の権利', text: '相談対応と関連業務に必要な期間のみ保管します。照会、訂正、削除のご希望は sgw_th@outlook.com へご連絡ください。' }], back: 'お問い合わせへ戻る' },
  },
}

export function getLocalizedContent(locale: LocalizedLocale) {
  return localizedContent[locale]
}

export function isLearningSlug(value: string): value is LearningSlug {
  return LEARNING_SLUGS.includes(value as LearningSlug)
}

export function isServiceKey(value: string): value is ServiceKey {
  return SERVICE_KEYS.includes(value as ServiceKey)
}
