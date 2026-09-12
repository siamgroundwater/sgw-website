import type { SiteLocale } from './config'
import type { LearningSlug } from './localized-content'

type Topic = { title: string; outcome: string }
type Experience = { title: string; intro: string; start: string; library: string; libraryIntro: string; audience: string; journeys: { title: string; description: string }[]; topics: Record<LearningSlug, Topic> }
export const learningJourneys: [LearningSlug, LearningSlug][] = [
  ['groundwater-basics-thailand', 'groundwater-guide-factory-hotel-resort'],
  ['groundwater-case-studies-problems', 'groundwater-faq-thailand'],
  ['groundwater-calculator-tools', 'groundwater-law-regulation-thailand'],
]

export const learningExperience: Record<SiteLocale, Experience> = {
  th: {
    title: 'เรื่องน้ำบาดาล เริ่มตรงนี้', intro: 'ค่อย ๆ ทำความเข้าใจ ตั้งแต่วางแผนเจาะบ่อ ไปจนถึงดูแลระบบที่ใช้อยู่', start: 'วันนี้คุณอยากรู้เรื่องไหน?', library: 'เลือกอ่านตามหัวข้อ', libraryIntro: 'อ่านเฉพาะเรื่องที่ต้องใช้ หรือเริ่มจากพื้นฐานแล้วค่อยต่อยอด', audience: 'คู่มือนี้เหมาะกับใคร?',
    journeys: [
      { title: 'กำลังวางแผนเจาะบ่อ', description: 'เริ่มจากสิ่งที่ควรรู้ แล้วเตรียมข้อมูลสำหรับโครงการของคุณ' },
      { title: 'มีบ่อแล้ว เจอปัญหา', description: 'เลือกอาการที่พบ ทำความเข้าใจสาเหตุและข้อควรระวัง' },
      { title: 'หาตัวช่วยวางแผน', description: 'คำนวณเบื้องต้นและตรวจรายการเอกสารก่อนดำเนินงาน' },
    ],
    topics: {
      'groundwater-basics-thailand': { title: 'พื้นฐานน้ำบาดาล', outcome: 'น้ำบาดาลมาจากไหน และควรรู้อะไรก่อนตัดสินใจเจาะบ่อ' },
      'groundwater-guide-factory-hotel-resort': { title: 'วางแผนระบบสำหรับธุรกิจ', outcome: 'เตรียมความต้องการใช้น้ำและรายการตรวจสอบสำหรับโรงงาน โรงแรม และรีสอร์ต' },
      'groundwater-case-studies-problems': { title: 'บ่อมีปัญหา เริ่มตรวจตรงไหน', outcome: 'ดูตัวอย่างสถานการณ์จากอาการที่พบ พร้อมสิ่งที่ควรตรวจและข้อควรระวัง' },
      'groundwater-faq-thailand': { title: 'คำถามที่พบบ่อย', outcome: 'ค้นหาคำตอบเรื่องการเจาะบ่อ การใช้น้ำ และการดูแลระบบ' },
      'groundwater-calculator-tools': { title: 'เครื่องมือคำนวณเบื้องต้น', outcome: 'ลองประเมินความต้องการใช้น้ำและระบบด้วยข้อมูลของคุณ ก่อนปรึกษาผู้เชี่ยวชาญ' },
      'groundwater-law-regulation-thailand': { title: 'ใบอนุญาตและข้อกำหนด', outcome: 'ตรวจสิ่งที่ต้องเตรียมตามขั้นตอนโครงการ พร้อมแหล่งข้อมูลทางการ' },
    },
  },
  en: {
    title: 'Groundwater, step by step', intro: 'Understand the essentials, from planning a new well to looking after the system you already use.', start: 'What would you like help with?', library: 'Explore the topics', libraryIntro: 'Find the answer you need, or start with the basics and build from there.', audience: 'Who is this guide for?',
    journeys: [
      { title: 'Planning a new well', description: 'Learn the essentials and gather the information your project needs.' },
      { title: 'A problem with an existing well', description: 'Choose a symptom to understand possible causes and safety precautions.' },
      { title: 'Tools for your next step', description: 'Make preliminary calculations and check which documents to prepare.' },
    ],
    topics: {
      'groundwater-basics-thailand': { title: 'Groundwater basics', outcome: 'Where groundwater comes from and what to understand before drilling a well.' },
      'groundwater-guide-factory-hotel-resort': { title: 'Plan a system for your business', outcome: 'Prepare water-demand information and checklists for factories, hotels and resorts.' },
      'groundwater-case-studies-problems': { title: 'Well problems: where to start', outcome: 'Explore illustrative scenarios by symptom, with checks and safety precautions.' },
      'groundwater-faq-thailand': { title: 'Frequently asked questions', outcome: 'Find answers about drilling, using groundwater and caring for your system.' },
      'groundwater-calculator-tools': { title: 'Planning calculators', outcome: 'Estimate water demand and system needs using your own figures before consulting a specialist.' },
      'groundwater-law-regulation-thailand': { title: 'Permits and requirements', outcome: 'Check what to prepare at each project stage, with links to official sources.' },
    },
  },
  zh: {
    title: '一步步了解地下水', intro: '从规划新水井到维护现有系统，逐步掌握实用基础知识。', start: '您想先了解什么？', library: '按主题阅读', libraryIntro: '查找当前需要的答案，也可以从基础知识开始。', audience: '本指南适合谁？',
    journeys: [
      { title: '计划新建水井', description: '先了解基础知识，再收集项目所需信息。' },
      { title: '现有水井出现问题', description: '根据症状了解可能的原因和安全注意事项。' },
      { title: '寻找规划工具', description: '进行初步计算，并检查需要准备的文件。' },
    ],
    topics: {
      'groundwater-basics-thailand': { title: '地下水基础知识', outcome: '了解地下水的来源，以及决定钻井前应掌握的知识。' },
      'groundwater-guide-factory-hotel-resort': { title: '企业供水系统规划', outcome: '为工厂、酒店和度假村准备需水信息与项目检查清单。' },
      'groundwater-case-studies-problems': { title: '水井问题从哪里查起', outcome: '按症状查看模拟情景，了解检查步骤和安全注意事项。' },
      'groundwater-faq-thailand': { title: '常见问题', outcome: '查找有关钻井、地下水使用和系统维护的答案。' },
      'groundwater-calculator-tools': { title: '初步规划计算工具', outcome: '使用您的数据估算需水量和系统需求，为咨询专业人员做好准备。' },
      'groundwater-law-regulation-thailand': { title: '许可证与相关要求', outcome: '按项目阶段检查准备事项，并查阅官方资料。' },
    },
  },
  ja: {
    title: '地下水を、一歩ずつ学ぶ', intro: '新しい井戸の計画から既存設備の管理まで、実用的な基礎を学べます。', start: 'どんなことを知りたいですか？', library: 'テーマから探す', libraryIntro: '必要な答えを探すことも、基礎から順番に学ぶこともできます。', audience: 'このガイドの対象は？',
    journeys: [
      { title: '新しい井戸を計画している', description: 'まず基礎を知り、計画に必要な情報を整理しましょう。' },
      { title: '使っている井戸に問題がある', description: '症状から考えられる原因と安全上の注意を確認できます。' },
      { title: '計画に役立つツールを探す', description: '概算を行い、準備すべき書類を確認しましょう。' },
    ],
    topics: {
      'groundwater-basics-thailand': { title: '地下水の基礎', outcome: '地下水の成り立ちと、井戸を掘る前に知っておきたいこと。' },
      'groundwater-guide-factory-hotel-resort': { title: '事業用の給水計画', outcome: '工場・ホテル・リゾート向けに、水需要の情報と確認事項を整理します。' },
      'groundwater-case-studies-problems': { title: '井戸の問題、どこから調べる？', outcome: '症状別の想定事例から、確認手順と安全上の注意を学べます。' },
      'groundwater-faq-thailand': { title: 'よくある質問', outcome: '掘削、地下水の利用、設備管理についての答えを探せます。' },
      'groundwater-calculator-tools': { title: '計画用の概算ツール', outcome: '専門家への相談前に、ご自身の数値で水需要と設備の目安を計算できます。' },
      'groundwater-law-regulation-thailand': { title: '許可と関連要件', outcome: '計画の段階に応じた準備事項と公式資料を確認できます。' },
    },
  },
}
