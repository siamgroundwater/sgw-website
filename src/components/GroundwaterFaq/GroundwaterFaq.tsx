'use client'

import LearningDiagram from '@/components/LearningDiagram/LearningDiagram'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clipboard,
  Droplets,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  Gauge,
  HardHat,
  Info,
  Landmark,
  LifeBuoy,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react'
import { localePath, type LocalizedLocale } from '@/i18n/config'
import {
  groundwaterFaqItems,
  groundwaterFaqSourceLinks,
  type GroundwaterFaqCategory,
  type GroundwaterFaqSource,
} from '@/data/groundwater-faq'
import './GroundwaterFaq.css'

type CategoryFilter = 'all' | GroundwaterFaqCategory
type Situation = 'new' | 'permit' | 'lowFlow' | 'quality' | 'pump' | 'quote'

type FaqUiCopy = {
  stats: { questions: string; topics: string; sources: string; reviewed: string }
  summaryTitle: string
  summaryItems: string[]
  noticeTitle: string
  noticeText: string
  imageAlt: { system: string; quality: string }
  imageCaption: { system: string; quality: string }
  navigator: {
    eyebrow: string
    title: string
    intro: string
    prompt: string
    situations: Record<Situation, string>
    resultTitle: string
    openAnswer: string
    verify: string
  }
  library: {
    eyebrow: string
    title: string
    intro: string
    searchLabel: string
    searchPlaceholder: string
    filterLabel: string
    all: string
    popular: string
    urgent: string
    answer: string
    action: string
    officialSource: string
    copyLink: string
    copied: string
    expandAll: string
    collapseAll: string
    results: string
    noResults: string
    reset: string
  }
  categories: Record<GroundwaterFaqCategory, string>
  urgentPanel: { eyebrow: string; title: string; items: string[] }
  qualitySection: { eyebrow: string; title: string; text: string }
  sources: {
    eyebrow: string
    title: string
    text: string
    labels: Record<GroundwaterFaqSource, string>
  }
  next: { title: string; text: string; contact: string; tools: string; law: string }
}

const categoryIcons = {
  planning: SlidersHorizontal,
  permits: Landmark,
  yield: Gauge,
  quality: FlaskConical,
  operation: Droplets,
  maintenance: Wrench,
  troubleshooting: LifeBuoy,
  cost: CircleDollarSign,
}

const situationQuestions: Record<Situation, string[]> = {
  new: ['where-to-start', 'survey-guarantee', 'choose-drilling-point', 'permit-required'],
  permit: ['permit-required', 'existing-well', 'reporting-renewal', 'temporary-dewatering'],
  lowFlow: ['low-flow', 'pumping-test', 'maintenance-frequency', 'monitoring-records'],
  quality: ['clear-water-safe', 'sample-correctly', 'water-test-list', 'choose-treatment'],
  pump: ['pump-short-cycle', 'pump-sizing', 'storage-tank', 'sand-production'],
  quote: ['quotation-information', 'handover-documents', 'price-guarantee', 'survey-guarantee'],
}

const copyByLocale: Record<LocalizedLocale, FaqUiCopy> = {
  th: {
    stats: { questions: 'คำถามพร้อมคำตอบ', topics: 'หมวดค้นหา', sources: 'แหล่งข้อมูลทางการ', reviewed: 'ตรวจทานล่าสุด' },
    summaryTitle: 'หน้านี้ช่วยให้คุณ',
    summaryItems: ['เริ่มโครงการด้วยข้อมูลที่ถูกลำดับ', 'แยกปัญหาบ่อ ปั๊ม และระบบจ่ายน้ำ', 'เข้าใจหน้าที่ด้านใบอนุญาตและรายงาน', 'เตรียมขอบเขตงานและเอกสารรับมอบได้ครบขึ้น'],
    noticeTitle: 'คำตอบเพื่อการเรียนรู้ ไม่แทนการสำรวจหรือคำวินิจฉัยเฉพาะพื้นที่',
    noticeText: 'ชั้นน้ำ คุณภาพน้ำ เงื่อนไขใบอนุญาต และสภาพระบบแตกต่างกันในแต่ละโครงการ กรณีด้านความปลอดภัย สุขภาพ หรือกฎหมาย ให้หยุดใช้งานส่วนที่เสี่ยงและตรวจสอบกับผู้เชี่ยวชาญหรือเจ้าหน้าที่ผู้รับผิดชอบ',
    imageAlt: { system: 'ภาพตัดระบบน้ำบาดาลจากชั้นน้ำ บ่อ เครื่องสูบ ระบบปรับปรุง ถัง และจุดใช้งาน', quality: 'ภาพขั้นตอนเก็บตัวอย่าง วิเคราะห์ เลือกระบบปรับปรุง และตรวจน้ำก่อนใช้งาน' },
    imageCaption: { system: 'คำถามหนึ่งข้ออาจเกิดได้หลายจุด ตั้งแต่ชั้นน้ำ ตัวบ่อ เครื่องสูบ ระบบปรับปรุง ถัง ไปจนถึงท่อภายในอาคาร', quality: 'ความใสไม่ใช่ผลตรวจ: เก็บตัวอย่างให้ตรงจุด วิเคราะห์ตามการใช้งาน แล้วเลือกกระบวนการจากข้อมูลจริง' },
    navigator: { eyebrow: 'เริ่มจากสถานการณ์ของคุณ', title: 'ไม่แน่ใจว่าควรอ่านข้อไหนก่อน?', intro: 'เลือกสถานการณ์หนึ่งรายการ ระบบจะจัดคำถามสำคัญสี่ข้อให้เป็นจุดเริ่มต้น', prompt: 'ฉันกำลัง…', situations: { new: 'เริ่มโครงการใหม่', permit: 'จัดการใบอนุญาต/บ่อเดิม', lowFlow: 'แก้ปัญหาน้ำไหลน้อย', quality: 'แก้สี กลิ่น หรือน้ำไม่ผ่าน', pump: 'แก้ปั๊มและค่าไฟ', quote: 'เตรียมขอราคา/รับมอบงาน' }, resultTitle: 'แนะนำให้อ่านตามลำดับ', openAnswer: 'เปิดคำตอบ', verify: 'ตัวช่วยนี้จัดลำดับความรู้เบื้องต้น ไม่ใช่ผลวินิจฉัยหน้างาน' },
    library: { eyebrow: 'FAQ ที่ค้นหาได้', title: 'ค้นคำตอบจากคำถามที่เจ้าของโครงการพบจริง', intro: 'ค้นด้วยอาการ อุปกรณ์ เอกสาร หรือคำทั่วไป แล้วกรองตามหัวข้อที่สนใจ', searchLabel: 'ค้นคำถาม', searchPlaceholder: 'เช่น น้ำไหลน้อย ทราย ใบอนุญาต RO ราคา…', filterLabel: 'กรองตามหมวด', all: 'ทั้งหมด', popular: 'ถามบ่อย', urgent: 'ควรหยุดและตรวจ', answer: 'คำตอบ', action: 'สิ่งที่ควรทำต่อ', officialSource: 'ตรวจแหล่งข้อมูลทางการ', copyLink: 'คัดลอกลิงก์คำถาม', copied: 'คัดลอกแล้ว', expandAll: 'เปิดคำตอบทั้งหมด', collapseAll: 'ปิดคำตอบทั้งหมด', results: 'คำถาม', noResults: 'ไม่พบคำถามที่ตรงกับคำค้นและตัวกรอง', reset: 'ล้างการค้นหา' },
    categories: { planning: 'ก่อนเริ่มโครงการ', permits: 'กฎหมายและใบอนุญาต', yield: 'ความลึกและปริมาณน้ำ', quality: 'คุณภาพและการปรับปรุงน้ำ', operation: 'เครื่องสูบและการเดินระบบ', maintenance: 'ดูแลบ่อระยะยาว', troubleshooting: 'วิเคราะห์อาการผิดปกติ', cost: 'ราคา สัญญา และความคุ้มค่า' },
    urgentPanel: { eyebrow: 'สัญญาณที่ไม่ควรรอดู', title: 'หยุดส่วนที่เสี่ยงและตรวจสอบก่อนเดินระบบต่อ', items: ['มีทรายออกมากผิดปกติหรือปั๊มสั่น/มีเสียงรุนแรง', 'สี กลิ่น หรือรสเปลี่ยนกะทันหัน โดยเฉพาะน้ำสำหรับดื่มหรืออาหาร', 'น้ำท่วมหัวบ่อ สารเคมีหก หรือสงสัยน้ำเสียไหลเข้าบ่อ', 'ระบบไฟรั่ว ตู้ควบคุมร้อนจัด สายไหม้ หรือเบรกเกอร์ตัดซ้ำ', 'พื้นทรุด ท่อบิด หรือหัวบ่อแตกร้าว'] },
    qualitySection: { eyebrow: 'เข้าใจคุณภาพน้ำให้ถูก', title: 'ผลวิเคราะห์ต้องมาก่อนการเลือกเครื่องกรอง', text: 'น้ำดิบ น้ำหลังระบบ และน้ำที่จุดใช้ตอบคนละคำถาม ควรวางแผนจุดเก็บตัวอย่างและเกณฑ์รับมอบตั้งแต่ก่อนออกแบบระบบ' },
    sources: { eyebrow: 'อ้างอิงกลับไปยังต้นทาง', title: 'แหล่งข้อมูลกรมทรัพยากรน้ำบาดาล', text: 'คำตอบด้านกฎหมายและหน้าที่ผู้มีบ่อสรุปจากหน้าบริการ คู่มือ และ FAQ ทางการ ตรวจทานวันที่ 4 สิงหาคม 2569', labels: { faq: 'คำถามที่พบบ่อยของกรมฯ', permit: 'การขออนุญาตเจาะและใช้น้ำบาดาล', handbook: 'คู่มือสำหรับผู้มีบ่อน้ำบาดาล', quality: 'มาตรฐานคุณภาพน้ำบาดาลเพื่อการบริโภค', law: 'คลังกฎหมายน้ำบาดาล', reporting: 'การรายงานการใช้น้ำแบบ นบ./11', closure: 'การเลิกใช้และอุดกลบบ่อ' } },
    next: { title: 'ยังไม่แน่ใจว่าอาการอยู่ที่บ่อ ปั๊ม หรือระบบน้ำ?', text: 'รวบรวมพิกัด ภาพหัวบ่อ อัตราไหล ระดับน้ำ ผลตรวจ และประวัติซ่อม แล้วส่งให้ทีมงานช่วยจัดลำดับการตรวจ', contact: 'ปรึกษาทีมงาน', tools: 'ใช้เครื่องมือคำนวณ', law: 'เปิดคู่มือกฎหมาย' },
  },
  en: {
    stats: { questions: 'answered questions', topics: 'search topics', sources: 'official source groups', reviewed: 'last reviewed' },
    summaryTitle: 'Use this page to',
    summaryItems: ['Start a project with the right inputs', 'Separate well, pump and distribution problems', 'Understand permits and ongoing duties', 'Prepare clearer scopes and handover records'],
    noticeTitle: 'Learning guidance, not a site-specific survey or ruling',
    noticeText: 'Aquifers, quality, permits and equipment vary by project. For safety, health or legal issues, stop the affected use and verify with a qualified specialist or responsible authority.',
    imageAlt: { system: 'Groundwater system from aquifer and well through pump, treatment, storage and building use', quality: 'Water sampling, laboratory analysis, treatment selection and verification workflow' },
    imageCaption: { system: 'One symptom can begin in the aquifer, well, pump, treatment, storage or building pipework.', quality: 'Clarity is not a laboratory result: sample the right point, test for the intended use and design from evidence.' },
    navigator: { eyebrow: 'Start with your situation', title: 'Not sure which answer to read first?', intro: 'Choose one situation and the guide will prioritize four useful questions.', prompt: 'I am…', situations: { new: 'starting a new project', permit: 'managing permits or an existing well', lowFlow: 'investigating low flow', quality: 'investigating colour, odour or failed quality', pump: 'investigating pumps or energy', quote: 'preparing a quotation or handover' }, resultTitle: 'Read these first', openAnswer: 'Open answer', verify: 'This navigator organizes initial learning; it is not a field diagnosis.' },
    library: { eyebrow: 'Searchable FAQ', title: 'Answers to questions project owners actually face', intro: 'Search by symptom, equipment, document or everyday wording, then filter by topic.', searchLabel: 'Search questions', searchPlaceholder: 'Try low flow, sand, permit, RO, cost…', filterLabel: 'Filter by topic', all: 'All', popular: 'Most asked', urgent: 'Stop and check', answer: 'Answer', action: 'What to do next', officialSource: 'Check official source', copyLink: 'Copy question link', copied: 'Copied', expandAll: 'Expand all answers', collapseAll: 'Collapse all answers', results: 'questions', noResults: 'No question matches this search and filter.', reset: 'Clear search' },
    categories: { planning: 'Before the project', permits: 'Law and permits', yield: 'Depth and yield', quality: 'Quality and treatment', operation: 'Pumps and operation', maintenance: 'Long-term care', troubleshooting: 'Troubleshooting', cost: 'Cost, contract and value' },
    urgentPanel: { eyebrow: 'Do not wait on these signs', title: 'Stop the affected system and inspect before continuing', items: ['Unusual sand production or severe pump vibration/noise', 'Sudden colour, odour or taste change, especially for food or drinking', 'Flooded wellhead, chemical spill or wastewater entry', 'Electrical leakage, overheating, burning or repeat breaker trips', 'Subsidence, twisted pipework or a cracked wellhead'] },
    qualitySection: { eyebrow: 'Read water quality correctly', title: 'Laboratory evidence comes before filter selection', text: 'Raw water, post-treatment and point-of-use samples answer different questions. Define sampling points and measurable acceptance criteria before design.' },
    sources: { eyebrow: 'Trace the answer to its source', title: 'Department of Groundwater Resources sources', text: 'Legal and owner-duty answers are summarized from official services, handbooks and FAQ pages, reviewed 4 August 2026.', labels: { faq: 'Official DGR FAQ', permit: 'Drilling and use permit guidance', handbook: 'Groundwater Well Handbook', quality: 'Groundwater quality for consumption', law: 'Groundwater legal library', reporting: 'Monthly NB.11 reporting guidance', closure: 'Well cessation and sealing guidance' } },
    next: { title: 'Still unsure whether the issue is the well, pump or water system?', text: 'Collect coordinates, wellhead photos, flow, water levels, analysis and repair history so the team can prioritize checks.', contact: 'Ask the team', tools: 'Open calculation tools', law: 'Open legal guide' },
  },
  zh: {
    stats: { questions: '已解答问题', topics: '检索主题', sources: '官方来源组', reviewed: '最近复核' },
    summaryTitle: '本页帮助您',
    summaryItems: ['用正确资料启动项目', '区分井、泵和供水系统问题', '理解许可与持续义务', '完善工作范围和验收资料'],
    noticeTitle: '学习指南不能替代现场勘查或主管机关认定',
    noticeText: '每个项目的含水层、水质、许可和设备不同。涉及安全、健康或法律时，应停止相关用途，并向合格专业人员或主管机关确认。',
    imageAlt: { system: '从含水层、水井、泵、处理、储水到建筑用水的地下水系统', quality: '取样、实验室分析、处理选择和验证流程' },
    imageCaption: { system: '同一现象可能来自含水层、井、泵、处理、储水或建筑管网。', quality: '清澈不等于检测合格：在正确点位取样，按用途检测，再依据证据设计。' },
    navigator: { eyebrow: '从您的情况开始', title: '不确定先读哪一题？', intro: '选择一种情况，系统会优先推荐四个问题。', prompt: '我正在…', situations: { new: '启动新项目', permit: '处理许可或既有井', lowFlow: '调查流量下降', quality: '调查颜色、气味或水质不合格', pump: '调查水泵或能耗', quote: '准备报价或验收' }, resultTitle: '建议先阅读', openAnswer: '打开答案', verify: '本工具用于安排学习顺序，不构成现场诊断。' },
    library: { eyebrow: '可检索FAQ', title: '项目业主真实遇到的问题与答案', intro: '可按现象、设备、文件或常用词搜索，再按主题筛选。', searchLabel: '搜索问题', searchPlaceholder: '例如：流量下降、出砂、许可、RO、价格…', filterLabel: '按主题筛选', all: '全部', popular: '常问', urgent: '停止并检查', answer: '答案', action: '下一步', officialSource: '查看官方来源', copyLink: '复制问题链接', copied: '已复制', expandAll: '展开全部', collapseAll: '收起全部', results: '个问题', noResults: '没有符合搜索和筛选条件的问题。', reset: '清除搜索' },
    categories: { planning: '项目前期', permits: '法律与许可', yield: '深度与出水量', quality: '水质与处理', operation: '水泵与运行', maintenance: '长期维护', troubleshooting: '故障诊断', cost: '费用、合同与价值' },
    urgentPanel: { eyebrow: '这些信号不要等待', title: '停止相关系统，检查后再继续', items: ['异常大量出砂或泵剧烈振动/噪声', '颜色、气味或味道突然变化，尤其是食品和饮用', '井口被淹、化学品泄漏或污水进入', '漏电、过热、烧焦或断路器反复跳闸', '地面沉降、管道扭曲或井口开裂'] },
    qualitySection: { eyebrow: '正确理解水质', title: '先有实验室证据，再选择过滤系统', text: '原水、处理后和末端样品回答不同问题。设计前应确定采样点和可测量的验收标准。' },
    sources: { eyebrow: '追溯答案来源', title: '泰国地下水资源厅官方资料', text: '法律及井主责任依据官方服务、手册和FAQ整理，复核日期为2026年8月4日。', labels: { faq: 'DGR官方FAQ', permit: '钻井和用水许可指南', handbook: '地下水井手册', quality: '生活用地下水质量', law: '地下水法规库', reporting: 'NB.11月报指南', closure: '停井与封井指南' } },
    next: { title: '仍不确定问题在井、泵还是供水系统？', text: '准备坐标、井口照片、流量、水位、水质和维修记录，以便团队安排检查顺序。', contact: '咨询团队', tools: '打开计算工具', law: '打开法规指南' },
  },
  ja: {
    stats: { questions: '回答済み質問', topics: '検索分野', sources: '公的情報群', reviewed: '最終確認' },
    summaryTitle: 'このページでできること',
    summaryItems: ['正しい情報で案件を開始', '井戸・ポンプ・配水問題を切り分け', '許可と継続義務を理解', '仕様と引渡し資料を改善'],
    noticeTitle: '学習ガイドであり、現地調査や行政判断ではありません',
    noticeText: '帯水層、水質、許可、設備は案件ごとに異なります。安全・健康・法令に関する場合は該当利用を停止し、専門家または所管当局に確認してください。',
    imageAlt: { system: '帯水層、井戸、ポンプ、処理、貯留、建物利用までの地下水システム', quality: '採水、分析、処理選定、確認の流れ' },
    imageCaption: { system: '同じ症状でも帯水層、井戸、ポンプ、処理、貯留、建物配管のどこからでも発生します。', quality: '透明でも分析合格とは限りません。適切な地点で採水し、用途別に分析して根拠から設計します。' },
    navigator: { eyebrow: '状況から始める', title: 'どの回答を先に読むか迷っていますか？', intro: '状況を選ぶと、優先する4問を案内します。', prompt: '現在…', situations: { new: '新規案件を開始', permit: '許可・既設井戸を管理', lowFlow: '流量低下を調査', quality: '色・臭い・水質不適合を調査', pump: 'ポンプ・電力を調査', quote: '見積り・引渡しを準備' }, resultTitle: '最初に読む質問', openAnswer: '回答を開く', verify: '学習順序を案内するもので、現地診断ではありません。' },
    library: { eyebrow: '検索できるFAQ', title: '事業主が実際に直面する質問への回答', intro: '症状、設備、書類、一般的な言葉で検索し、分野で絞り込めます。', searchLabel: '質問を検索', searchPlaceholder: '例：流量低下、砂、許可、RO、費用…', filterLabel: '分野で絞込', all: 'すべて', popular: 'よくある', urgent: '停止して確認', answer: '回答', action: '次にすること', officialSource: '公的情報を確認', copyLink: '質問リンクをコピー', copied: 'コピー済み', expandAll: 'すべて開く', collapseAll: 'すべて閉じる', results: '問', noResults: '検索・絞込に一致する質問がありません。', reset: '検索を解除' },
    categories: { planning: '案件開始前', permits: '法令と許可', yield: '深度と揚水量', quality: '水質と処理', operation: 'ポンプと運転', maintenance: '長期保守', troubleshooting: '不具合診断', cost: '費用・契約・価値' },
    urgentPanel: { eyebrow: '様子見しない兆候', title: '該当設備を停止し、確認後に再開', items: ['異常な砂、強い振動・騒音', '特に飲用・食品用で色・臭い・味が急変', '井戸元浸水、薬品流出、汚水流入', '漏電、過熱、焦げ、遮断器の反復動作', '地盤沈下、配管変形、井戸元の亀裂'] },
    qualitySection: { eyebrow: '水質を正しく読む', title: 'フィルター選定より先に分析根拠', text: '原水、処理後、末端の試料は異なる問いに答えます。設計前に採水点と測定可能な受入基準を定めます。' },
    sources: { eyebrow: '回答の出典', title: 'タイ地下水資源局の公的情報', text: '法令・井戸所有者義務は公式サービス、手引き、FAQから整理し、2026年8月4日に確認しました。', labels: { faq: 'DGR公式FAQ', permit: '掘削・利用許可ガイド', handbook: '地下水井戸ハンドブック', quality: '飲用地下水の水質', law: '地下水法令ライブラリ', reporting: 'NB.11月次報告ガイド', closure: '廃止・埋戻しガイド' } },
    next: { title: '井戸、ポンプ、水処理のどこが問題か不明ですか？', text: '座標、井戸元写真、流量、水位、分析、修理履歴を揃えると、確認順序を決めやすくなります。', contact: 'チームに相談', tools: '計算ツール', law: '法令ガイド' },
  },
}

export default function GroundwaterFaq({ locale = 'th', localized = false }: { locale?: LocalizedLocale; localized?: boolean }) {
  const copy = copyByLocale[locale]
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [situation, setSituation] = useState<Situation>('new')
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(['where-to-start']))
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [pendingQuestion, setPendingQuestion] = useState<{ id: string; focus: boolean } | null>(null)
  const localLink = (path: string) => localized ? localePath(path, locale) : path

  useEffect(() => {
    const readHash = () => {
      const match = /^#faq-([a-z0-9-]+)$/.exec(window.location.hash)
      const id = match?.[1]
      if (!id || !groundwaterFaqItems.some((item) => item.id === id)) return
      setQuery('')
      setCategory('all')
      setOpenIds((current) => new Set(current).add(id))
      setPendingQuestion({ id, focus: false })
    }
    const timeout = window.setTimeout(readHash, 0)
    window.addEventListener('hashchange', readHash)
    return () => { window.clearTimeout(timeout); window.removeEventListener('hashchange', readHash) }
  }, [])

  useEffect(() => {
    if (!pendingQuestion) return
    const frame = window.requestAnimationFrame(() => {
      const question = document.getElementById(`faq-question-${pendingQuestion.id}`)
      if (!question) return
      if (pendingQuestion.focus) question.focus({ preventScroll: true })
      question.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [pendingQuestion])

  const filteredItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase(locale)
    return groundwaterFaqItems.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (!term) return true
      const haystack = [item.question[locale], item.answer[locale], item.action[locale], copy.categories[item.category], ...item.keywords].join(' ').toLocaleLowerCase(locale)
      return haystack.includes(term)
    })
  }, [category, copy.categories, locale, query])

  const recommendedItems = situationQuestions[situation].map((id) => groundwaterFaqItems.find((item) => item.id === id)).filter(Boolean) as typeof groundwaterFaqItems
  const allVisibleOpen = filteredItems.length > 0 && filteredItems.every((item) => openIds.has(item.id))
  const structuredData = { '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: locale, mainEntity: groundwaterFaqItems.map((item) => ({ '@type': 'Question', name: item.question[locale], acceptedAnswer: { '@type': 'Answer', text: `${item.answer[locale]} ${item.action[locale]}` } })) }

  const openQuestion = (id: string) => {
    if (!groundwaterFaqItems.some((item) => item.id === id)) return
    setQuery('')
    setCategory('all')
    setOpenIds((current) => new Set(current).add(id))
    window.history.replaceState(window.history.state, '', `#faq-${id}`)
    setPendingQuestion({ id, focus: true })
  }

  const toggleQuestion = (id: string) => {
    setOpenIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copyQuestionLink = async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#faq-${id}`
    try {
      await navigator.clipboard.writeText(url)
      window.history.replaceState(window.history.state, '', `#faq-${id}`)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((current) => current === id ? null : current), 1800)
    } catch {
      window.location.hash = `faq-${id}`
    }
  }

  return (
    <article className="gwf-guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="gwf-library" id="gwf-library">
        <header className="gwf-section-heading"><p>{copy.library.eyebrow}</p><h2>{copy.library.title}</h2><span>{copy.library.intro}</span></header>
        <div className="gwf-library-controls">
          <label htmlFor="gwf-search"><span>{copy.library.searchLabel}</span><div><Search aria-hidden="true" /><input id="gwf-search" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={copy.library.searchPlaceholder} />{query && <button type="button" onClick={() => { setQuery(''); document.getElementById('gwf-search')?.focus() }} aria-label={copy.library.reset}><X aria-hidden="true" /></button>}</div></label>
          <details className="gwf-category-filter"><summary>{copy.library.filterLabel}</summary><div role="group" aria-label={copy.library.filterLabel}><button type="button" aria-pressed={category === 'all'} className={category === 'all' ? 'is-active' : ''} onClick={() => setCategory('all')}><Sparkles aria-hidden="true" />{copy.library.all}</button>{(Object.keys(copy.categories) as GroundwaterFaqCategory[]).map((value) => { const Icon = categoryIcons[value]; return <button type="button" key={value} aria-pressed={category === value} className={category === value ? 'is-active' : ''} onClick={() => setCategory(value)}><Icon aria-hidden="true" />{copy.categories[value]}</button> })}</div></details>
          <div className="gwf-library-meta"><span role="status"><strong>{filteredItems.length}</strong> {copy.library.results}</span><button type="button" onClick={() => setOpenIds(allVisibleOpen ? new Set() : new Set(filteredItems.map((item) => item.id)))}>{allVisibleOpen ? <X aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}{allVisibleOpen ? copy.library.collapseAll : copy.library.expandAll}</button></div>
        </div>

        <details className="gwf-safety-note" open><summary>{copy.urgentPanel.title}</summary><div><p>{copy.urgentPanel.eyebrow}</p><ul>{copy.urgentPanel.items.map((item) => <li key={item}>{item}</li>)}</ul></div></details>

        {filteredItems.length > 0 ? <div className="gwf-faq-list">{filteredItems.map((item) => { const Icon = categoryIcons[item.category]; const isOpen = openIds.has(item.id); return <article className={`gwf-faq-item ${isOpen ? 'is-open' : ''}`} id={`faq-${item.id}`} key={item.id}><button type="button" className="gwf-question" id={`faq-question-${item.id}`} aria-expanded={isOpen} aria-controls={`faq-answer-${item.id}`} onClick={() => toggleQuestion(item.id)}><span className="gwf-question-copy"><small>{copy.categories[item.category]}{item.popular && <em>{copy.library.popular}</em>}{item.urgent && <em className="is-urgent">{copy.library.urgent}</em>}</small><strong><span className="gwf-question-icon"><Icon aria-hidden="true" /></span>{item.question[locale]}</strong></span><ChevronDown className="gwf-chevron" aria-hidden="true" /></button><div className="gwf-answer" id={`faq-answer-${item.id}`} hidden={!isOpen} role="region" aria-labelledby={`faq-question-${item.id}`}><div><span>{copy.library.answer}</span><p>{item.answer[locale]}</p></div><aside><div><strong><CheckCircle2 aria-hidden="true" />{copy.library.action}</strong><p>{item.action[locale]}</p></div></aside><footer><div>{item.sources.map((source) => <a href={groundwaterFaqSourceLinks[source]} target="_blank" rel="noopener noreferrer" key={source}>{copy.sources.labels[source]}<ExternalLink aria-hidden="true" /></a>)}</div><button type="button" onClick={() => copyQuestionLink(item.id)}><Clipboard aria-hidden="true" />{copiedId === item.id ? copy.library.copied : copy.library.copyLink}</button></footer></div></article> })}</div> : <div className="gwf-empty"><Search aria-hidden="true" /><p>{copy.library.noResults}</p><button type="button" onClick={() => { setQuery(''); setCategory('all'); document.getElementById('gwf-search')?.focus() }}>{copy.library.reset}</button></div>}
      </section>

      <aside className="gwf-notice"><div><h2><Info aria-hidden="true" />{copy.noticeTitle}</h2><p>{copy.noticeText}</p></div></aside>

      <figure className="gwf-system-figure"><LearningDiagram kind="system" locale={locale} src="/images/learning/groundwater-faq/well-to-building.webp" alt={copy.imageAlt.system} /></figure>

      <section className="gwf-navigator">
        <header><p>{copy.navigator.eyebrow}</p><h2>{copy.navigator.title}</h2><span>{copy.navigator.intro}</span></header>
        <div className="gwf-navigator-layout">
          <div className="gwf-situations" role="group" aria-label={copy.navigator.prompt}><strong>{copy.navigator.prompt}</strong>{(Object.keys(copy.navigator.situations) as Situation[]).map((value) => <button type="button" key={value} aria-pressed={situation === value} aria-controls="gwf-recommended" className={situation === value ? 'is-active' : ''} onClick={() => setSituation(value)}>{value === 'new' ? <HardHat aria-hidden="true" /> : value === 'permit' ? <FileCheck2 aria-hidden="true" /> : value === 'lowFlow' ? <Gauge aria-hidden="true" /> : value === 'quality' ? <FlaskConical aria-hidden="true" /> : value === 'pump' ? <Wrench aria-hidden="true" /> : <CircleDollarSign aria-hidden="true" />}{copy.navigator.situations[value]}</button>)}</div>
          <div className="gwf-recommended" id="gwf-recommended" aria-live="polite"><strong>{copy.navigator.resultTitle}</strong><ol>{recommendedItems.map((item, index) => <li key={item.id}><span>{index + 1}</span><div><p>{item.question[locale]}</p><button type="button" onClick={() => openQuestion(item.id)}>{copy.navigator.openAnswer}<ArrowRight aria-hidden="true" /></button></div></li>)}</ol><small><Info aria-hidden="true" />{copy.navigator.verify}</small></div>
        </div>
      </section>

      <section className="gwf-quality-section"><header><p>{copy.qualitySection.eyebrow}</p><h2>{copy.qualitySection.title}</h2><span>{copy.qualitySection.text}</span></header><figure><LearningDiagram kind="quality" locale={locale} src="/images/learning/groundwater-faq/sample-to-treatment.webp" alt={copy.imageAlt.quality} /></figure></section>

      <p className="gwf-review-date">{copy.stats.reviewed}: {locale === 'th' ? '4 ส.ค. 2569' : '04 Aug 2026'}</p>

      <section className="gwf-sources"><div><p>{copy.sources.eyebrow}</p><h2>{copy.sources.title}</h2><span>{copy.sources.text}</span></div><ul>{(Object.keys(groundwaterFaqSourceLinks) as GroundwaterFaqSource[]).map((source) => <li key={source}><a href={groundwaterFaqSourceLinks[source]} target="_blank" rel="noopener noreferrer">{copy.sources.labels[source]}<ArrowRight aria-hidden="true" /></a></li>)}</ul></section>

      <section className="gwf-next"><div><h2><ShieldCheck aria-hidden="true" />{copy.next.title}</h2><p>{copy.next.text}</p></div><nav><Link href={localLink('/contact')}>{copy.next.contact}<ArrowRight aria-hidden="true" /></Link><Link href={localLink('/learn/groundwater-calculator-tools')}>{copy.next.tools}</Link><Link href={localLink('/learn/groundwater-law-regulation-thailand')}>{copy.next.law}</Link></nav></section>
    </article>
  )
}
