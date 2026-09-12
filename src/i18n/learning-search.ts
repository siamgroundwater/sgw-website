import type { LocalizedLocale } from './config'

export type SearchCopy = {
  title: string; label: string; placeholder: string; hint: string; reset: string
  initial: string; count: string; noResults: string; noResultsHint: string
  section: string; faq: string; open: string; read: string; showMore: string
  categories: Record<string, string>
}

export const learningSearchCopy: Record<LocalizedLocale, SearchCopy> = {
  th: {
    title: 'ค้นทั้งศูนย์ความรู้', label: 'อยากรู้เรื่องอะไร?', placeholder: 'เช่น น้ำไหลน้อย ใบอนุญาต TDS ถังสำรอง',
    hint: 'ค้นเนื้อหา คำศัพท์ เครื่องมือ และคำถามที่พบบ่อย จากทั้ง 6 หัวข้อ', reset: 'ล้างคำค้น', initial: 'เริ่มจากเส้นทางหรือหัวข้อด้านล่างได้เลย', count: 'พบ {count} รายการ',
    noResults: 'ยังไม่พบเรื่องที่ตรงกับคำค้นนี้', noResultsHint: 'ลองใช้คำสั้นลง เช่น “น้ำเค็ม” “สูบทดสอบ” หรือ “ใบอนุญาต” หรือล้างคำค้นเพื่อดูทุกหัวข้อ',
    section: 'หัวข้อในบทความ', faq: 'คำถามที่พบบ่อย', open: 'เปิดอ่านตรงนี้', read: 'เปิดอ่าน', showMore: 'แสดงผลเพิ่ม',
    categories: { planning: 'ก่อนเริ่มโครงการ', permits: 'กฎหมายและใบอนุญาต', yield: 'ความลึกและปริมาณน้ำ', quality: 'คุณภาพและการปรับปรุงน้ำ', operation: 'เครื่องสูบและการเดินระบบ', maintenance: 'ดูแลบ่อระยะยาว', troubleshooting: 'วิเคราะห์อาการผิดปกติ', cost: 'ราคา สัญญา และความคุ้มค่า' },
  },
  en: {
    title: 'Search the learning centre', label: 'What would you like to know?', placeholder: 'Try low flow, permit, TDS or storage tank',
    hint: 'Search articles, terms, tools and frequently asked questions across all 6 topics.', reset: 'Clear search', initial: 'You can also start with a journey or topic below.', count: '{count} results',
    noResults: 'No matching topic yet', noResultsHint: 'Try a shorter phrase such as “salinity”, “pumping test” or “permit”, or clear the search to browse every topic.',
    section: 'Article section', faq: 'FAQ', open: 'Read this section', read: 'Open topic', showMore: 'Show more results',
    categories: { planning: 'Before the project', permits: 'Law and permits', yield: 'Depth and yield', quality: 'Quality and treatment', operation: 'Pumps and operation', maintenance: 'Long-term care', troubleshooting: 'Troubleshooting', cost: 'Cost, contract and value' },
  },
  zh: {
    title: '搜索整个知识中心', label: '您想了解什么？', placeholder: '例如：流量下降、许可、TDS、储水罐',
    hint: '搜索全部 6 个主题中的文章、术语、工具与常见问题。', reset: '清除搜索', initial: '也可以从下方学习路径或主题开始。', count: '找到 {count} 条结果',
    noResults: '暂未找到匹配的内容', noResultsHint: '请尝试更短的词语，如“盐度”“抽水试验”或“许可”，也可清除搜索查看全部主题。',
    section: '文章章节', faq: '常见问题', open: '阅读本章节', read: '打开主题', showMore: '显示更多结果',
    categories: { planning: '项目前期', permits: '法律与许可', yield: '深度与出水量', quality: '水质与处理', operation: '水泵与运行', maintenance: '长期维护', troubleshooting: '故障诊断', cost: '费用、合同与价值' },
  },
  ja: {
    title: '学習センター全体を検索', label: '何を知りたいですか？', placeholder: '例：流量低下、許可、TDS、貯水タンク',
    hint: '全6テーマの記事、用語、計算ツール、よくある質問を検索できます。', reset: '検索をクリア', initial: '下の学習コースやテーマからも始められます。', count: '{count} 件の検索結果',
    noResults: '一致する内容が見つかりませんでした', noResultsHint: '「塩分」「揚水試験」「許可」など短い言葉で試すか、検索をクリアして全テーマをご覧ください。',
    section: '記事の章', faq: 'よくある質問', open: 'この章を読む', read: 'テーマを開く', showMore: '結果をさらに表示',
    categories: { planning: '計画前', permits: '法律・許可', yield: '深度・揚水量', quality: '水質・処理', operation: 'ポンプ・運転', maintenance: '長期保守', troubleshooting: '不具合調査', cost: '費用・契約・価値' },
  },
}
