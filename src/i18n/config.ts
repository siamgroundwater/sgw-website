export const SITE_LOCALES = ['th', 'en', 'zh', 'ja'] as const
export const LOCALIZED_LOCALES = SITE_LOCALES

export type SiteLocale = (typeof SITE_LOCALES)[number]
export type LocalizedLocale = (typeof LOCALIZED_LOCALES)[number]

export const localeInfo: Record<
  SiteLocale,
  {
    code: string
    htmlLang: string
    name: string
    shortName: string
    flag: string
  }
> = {
  th: {
    code: 'TH',
    htmlLang: 'th',
    name: 'ภาษาไทย',
    shortName: 'ไทย',
    flag: '/icons/flags/th-Thailand.svg',
  },
  en: {
    code: 'EN',
    htmlLang: 'en',
    name: 'English',
    shortName: 'English',
    flag: '/icons/flags/en-UK.svg',
  },
  zh: {
    code: '中文',
    htmlLang: 'zh-CN',
    name: '简体中文',
    shortName: '中文',
    flag: '/icons/flags/zh-China.svg',
  },
  ja: {
    code: '日本語',
    htmlLang: 'ja',
    name: '日本語',
    shortName: '日本語',
    flag: '/icons/flags/ja-Japan.svg',
  },
}

export function isSiteLocale(value: string): value is SiteLocale {
  return SITE_LOCALES.includes(value as SiteLocale)
}

export function isLocalizedLocale(value: string): value is LocalizedLocale {
  return LOCALIZED_LOCALES.includes(value as LocalizedLocale)
}

export function localeFromPathname(pathname: string): SiteLocale {
  const firstSegment = pathname.split('/').filter(Boolean)[0]
  return firstSegment && isSiteLocale(firstSegment) ? firstSegment : 'th'
}

export function stripLocaleFromPathname(pathname: string) {
  const firstSegment = pathname.split('/').filter(Boolean)[0]
  if (!firstSegment || !isSiteLocale(firstSegment)) return pathname || '/'
  const stripped = pathname.replace(new RegExp(`^/${firstSegment}(?=/|$)`), '')
  return stripped || '/'
}

export function localePath(pathname: string, locale: SiteLocale) {
  const basePath = stripLocaleFromPathname(pathname)
  return basePath === '/' ? `/${locale}` : `/${locale}${basePath}`
}

export function languageAlternates(pathname: string) {
  return {
    'th-TH': localePath(pathname, 'th'),
    en: localePath(pathname, 'en'),
    'zh-CN': localePath(pathname, 'zh'),
    ja: localePath(pathname, 'ja'),
    'x-default': localePath(pathname, 'th'),
  }
}

export type NavItem = {
  label: string
  href: string
  subNav?: Array<{ label: string; href: string }>
}

type NavigationCopy = {
  home: string
  about: string
  services: string
  projects: string
  governance: string
  learning: string
  contact: string
  menuOpen: string
  menuClose: string
  primaryLabel: string
  mobileLabel: string
  languageLabel: string
  privacy: string
  backToTop: string
  phone: string
  fax: string
  email: string
  company: string
  address: string
  serviceItems: [string, string, string, string]
  learningItems: [string, string, string, string, string, string]
}

export const navigationCopy: Record<SiteLocale, NavigationCopy> = {
  th: {
    home: 'หน้าแรก',
    about: 'เกี่ยวกับเรา',
    services: 'บริการของเรา',
    projects: 'ผลงานของเรา',
    governance: 'บรรษัทบริบาล',
    learning: 'ศูนย์การเรียนรู้',
    contact: 'ติดต่อเรา',
    menuOpen: 'เปิดเมนูหลัก',
    menuClose: 'ปิดเมนูหลัก',
    primaryLabel: 'เมนูหลัก',
    mobileLabel: 'เมนูหลักสำหรับมือถือ',
    languageLabel: 'เลือกภาษา',
    privacy: 'นโยบายข้อมูลส่วนบุคคล',
    backToTop: 'กลับขึ้นด้านบน',
    phone: 'โทร',
    fax: 'โทรสาร',
    email: 'อีเมล',
    company: 'บริษัท สยามกราวด์วอเตอร์ จำกัด',
    address:
      '75 ซอยรามคำแหง 60 (สวนสน) แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240',
    serviceItems: [
      'สำรวจศึกษาน้ำบาดาล น้ำแร่ น้ำพุร้อน EIA',
      'เจาะบ่อน้ำบาดาล น้ำแร่ น้ำพุร้อน และบ่อสูบลดระดับน้ำ',
      'ซ่อมบำรุงบ่อและเครื่องสูบน้ำ',
      'วิเคราะห์และแก้ไขปัญหาระบบน้ำบาดาล',
    ],
    learningItems: [
      'เครื่องมือคำนวณ',
      'ความรู้พื้นฐานเรื่องน้ำบาดาล',
      'กรณีศึกษาและปัญหา',
      'กฎหมายน้ำบาดาล',
      'คำถามที่พบบ่อย',
      'คู่มือสำหรับผู้ประกอบการ',
    ],
  },
  en: {
    home: 'Home',
    about: 'About Us',
    services: 'Services',
    projects: 'Projects',
    governance: 'Governance',
    learning: 'Learning Center',
    contact: 'Contact',
    menuOpen: 'Open main menu',
    menuClose: 'Close main menu',
    primaryLabel: 'Primary navigation',
    mobileLabel: 'Mobile navigation',
    languageLabel: 'Select language',
    privacy: 'Privacy notice',
    backToTop: 'Back to top',
    phone: 'Tel',
    fax: 'Fax',
    email: 'Email',
    company: 'Siam Groundwater Co., Ltd.',
    address:
      '75 Ramkhamhaeng Soi 60 (Suan Son), Hua Mak, Bang Kapi, Bangkok 10240, Thailand',
    serviceItems: [
      'Groundwater, mineral water, hot spring and EIA studies',
      'Groundwater, mineral water, hot spring and dewatering wells',
      'Well and pump maintenance',
      'Groundwater system diagnostics and remediation',
    ],
    learningItems: [
      'Planning calculator',
      'Groundwater fundamentals',
      'Case studies and failures',
      'Thai groundwater law',
      'Frequently asked questions',
      'Guide for factories, hotels and resorts',
    ],
  },
  zh: {
    home: '首页',
    about: '关于我们',
    services: '专业服务',
    projects: '项目案例',
    governance: '企业治理',
    learning: '知识中心',
    contact: '联系我们',
    menuOpen: '打开主菜单',
    menuClose: '关闭主菜单',
    primaryLabel: '主导航',
    mobileLabel: '移动端导航',
    languageLabel: '选择语言',
    privacy: '隐私声明',
    backToTop: '返回顶部',
    phone: '电话',
    fax: '传真',
    email: '电子邮箱',
    company: '暹罗地下水有限公司',
    address: '泰国曼谷邦卡皮区华马克，兰甘亨路60巷75号，邮编10240',
    serviceItems: [
      '地下水、矿泉水、温泉及EIA调查',
      '地下水井、矿泉井、温泉井及降水井施工',
      '水井与水泵维护',
      '地下水系统诊断与修复',
    ],
    learningItems: [
      '规划计算工具',
      '地下水基础知识',
      '案例与故障分析',
      '泰国地下水法规',
      '常见问题',
      '工厂、酒店与度假村指南',
    ],
  },
  ja: {
    home: 'ホーム',
    about: '会社案内',
    services: 'サービス',
    projects: '施工実績',
    governance: '企業統治',
    learning: '学習センター',
    contact: 'お問い合わせ',
    menuOpen: 'メインメニューを開く',
    menuClose: 'メインメニューを閉じる',
    primaryLabel: 'メインナビゲーション',
    mobileLabel: 'モバイルナビゲーション',
    languageLabel: '言語を選択',
    privacy: 'プライバシー通知',
    backToTop: 'ページ上部へ戻る',
    phone: '電話',
    fax: 'ファクス',
    email: 'メール',
    company: 'サイアム・グラウンドウォーター株式会社',
    address:
      '75 Ramkhamhaeng Soi 60, Hua Mak, Bang Kapi, Bangkok 10240, Thailand',
    serviceItems: [
      '地下水・鉱泉・温泉・EIA調査',
      '地下水井・鉱泉井・温泉井・ディウォータリング井の掘削',
      '井戸・ポンプの保守',
      '地下水システムの診断・改善',
    ],
    learningItems: [
      '計画計算ツール',
      '地下水の基礎',
      '事例とトラブル分析',
      'タイの地下水関連法規',
      'よくある質問',
      '工場・ホテル・リゾート向けガイド',
    ],
  },
}

const SERVICE_PATHS = [
  '/services/survey',
  '/services/drilling',
  '/services/maintenance',
  '/services/consult',
] as const

const LEARNING_PATHS = [
  '/learn/groundwater-calculator-tools',
  '/learn/groundwater-basics-thailand',
  '/learn/groundwater-case-studies-problems',
  '/learn/groundwater-law-regulation-thailand',
  '/learn/groundwater-faq-thailand',
  '/learn/groundwater-guide-factory-hotel-resort',
] as const

export function getNavigation(locale: SiteLocale): NavItem[] {
  const copy = navigationCopy[locale]
  const path = (pathname: string) => localePath(pathname, locale)

  return [
    { label: copy.home, href: path('/') },
    { label: copy.about, href: path('/about') },
    {
      label: copy.services,
      href: path('/services'),
      subNav: SERVICE_PATHS.map((href, index) => ({
        label: copy.serviceItems[index],
        href: path(href),
      })),
    },
    { label: copy.projects, href: path('/projects') },
    { label: copy.governance, href: path('/governance') },
    {
      label: copy.learning,
      href: path('/groundwater-learning'),
      subNav: LEARNING_PATHS.map((href, index) => ({
        label: copy.learningItems[index],
        href: path(href),
      })),
    },
    { label: copy.contact, href: path('/contact') },
  ]
}
