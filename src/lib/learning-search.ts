export type LearningSearchEntry = {
  id: string
  href: string
  title: string
  article: string
  category: string
  text: string
  keywords: string[]
}

export type LearningSearchResult = LearningSearchEntry & { snippet: string; terms: string[] }

// Everyday wording and the abbreviations already used in the learning articles.
// Each group is equivalent for retrieval; the displayed answer always stays local.
const synonyms = [
  ['tds', 'total dissolved solids', 'dissolved solids', 'ของแข็งละลาย', 'สารละลายทั้งหมด', '总溶解固体', '溶解性物質', '溶解固形物'],
  ['ec', 'electrical conductivity', 'conductivity', 'การนำไฟฟ้า', '导电率', '电导率', '電気伝導率'],
  ['ro', 'reverse osmosis', 'รีเวิร์สออสโมซิส', 'อาร์โอ', '反渗透', '逆浸透'],
  ['drawdown', 'ระดับน้ำลด', 'ระยะน้ำลด', '降深', '水位低下'],
  ['aquifer', 'ชั้นน้ำ', 'ชั้นหินให้น้ำ', '含水层', '帯水層'],
  ['pumping test', 'pump test', 'สูบทดสอบ', 'ทดสอบสูบ', '抽水试验', '揚水試験'],
  ['permit', 'licence', 'license', 'ใบอนุญาต', 'ขออนุญาต', '许可证', '许可', '許可'],
  ['salinity', 'saline', 'saltwater', 'salty water', 'น้ำเค็ม', 'ความเค็ม', '盐度', '咸水', '塩分', '塩水'],
  ['low flow', 'low yield', 'น้ำไหลน้อย', 'น้ำน้อย', 'น้ำไม่พอ', '流量下降', '出水量低', '流量低下', '水量低下'],
  ['hardness', 'hard water', 'น้ำกระด้าง', 'ความกระด้าง', '硬度', '硬水'],
  ['sand', 'ทราย', '出砂', '砂'],
]

export function normalizeLearningSearch(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, '')
}

function queryGroups(query: string) {
  const clean = query.trim().slice(0, 160)
  if (!normalizeLearningSearch(clean)) return []
  const exactGroup = synonyms.find((group) => group.some((term) => normalizeLearningSearch(term) === normalizeLearningSearch(clean)))
  if (exactGroup) return [exactGroup]
  return clean.split(/\s+/u).filter((word) => normalizeLearningSearch(word)).map((word) => synonyms.find((group) => group.some((term) => normalizeLearningSearch(term) === normalizeLearningSearch(word))) || [word])
}

// Offsets map normalized characters back to source text, so spaces and Thai
// combining marks are preserved when React renders the highlighted result.
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

function normalizedOffsets(value: string) {
  let normalized = ''
  const offsets: Array<{ start: number; end: number }> = []
  for (const { segment, index: sourceOffset } of graphemes.segment(value)) {
    const part = normalizeLearningSearch(segment)
    normalized += part
    for (let index = 0; index < part.length; index++) offsets.push({ start: sourceOffset, end: sourceOffset + segment.length })
  }
  return { normalized, offsets }
}

function matchingRanges(value: string, terms: string[]) {
  const { normalized, offsets } = normalizedOffsets(value)
  const ranges: Array<{ start: number; end: number }> = []
  for (const term of terms) {
    const needle = normalizeLearningSearch(term)
    if (!needle) continue
    let cursor = 0
    while (cursor < normalized.length) {
      const start = normalized.indexOf(needle, cursor)
      if (start < 0) break
      const sourceStart = offsets[start].start
      const sourceEnd = offsets[start + needle.length - 1].end
      // Two-letter abbreviations must not match inside English words (RO in
      // "project", EC in "check"). Full words still support partial typing.
      if (!/^[a-z]{1,2}$/.test(needle) || (!/[a-z]/i.test(value[sourceStart - 1] || '') && !/[a-z]/i.test(value[sourceEnd] || ''))) {
        ranges.push({ start: sourceStart, end: sourceEnd })
      }
      cursor = start + needle.length
    }
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end)
  return ranges.reduce<Array<{ start: number; end: number }>>((merged, range) => {
    const last = merged.at(-1)
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end)
    else merged.push({ ...range })
    return merged
  }, [])
}

export function learningSearchHighlights(value: string, terms: string[]) {
  const chunks: Array<{ text: string; matched: boolean }> = []
  let cursor = 0
  for (const range of matchingRanges(value, terms)) {
    if (range.start > cursor) chunks.push({ text: value.slice(cursor, range.start), matched: false })
    chunks.push({ text: value.slice(range.start, range.end), matched: true })
    cursor = range.end
  }
  if (cursor < value.length) chunks.push({ text: value.slice(cursor), matched: false })
  return chunks
}

function snippetFor(text: string, terms: string[]) {
  const first = matchingRanges(text, terms)[0]
  let start = Math.max(0, (first?.start || 0) - 55)
  let end = Math.min(text.length, start + 230)
  // Prefer nearby word boundaries for spaced languages. Thai/CJK remain useful
  // contiguous excerpts without splitting surrogate pairs or combining marks.
  if (start > 0) {
    const boundary = text.indexOf(' ', start)
    if (boundary >= 0 && boundary < start + 24 && boundary < (first?.start || 0)) start = boundary + 1
    while (start > 0 && /[\p{M}\uDC00-\uDFFF]/u.test(text[start])) start--
  }
  if (end < text.length) {
    const boundary = text.lastIndexOf(' ', end)
    if (boundary > end - 24) end = boundary
    while (end < text.length && /[\p{M}\uDC00-\uDFFF]/u.test(text[end])) end++
  }
  return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

export function searchLearningIndex(entries: LearningSearchEntry[], query: string): LearningSearchResult[] {
  const groups = queryGroups(query)
  if (!groups.length) return []
  const terms = [...new Set(groups.flat())]
  return entries.flatMap((entry) => {
    const body = `${entry.title} ${entry.article} ${entry.category} ${entry.text}`
    const keywords = entry.keywords.join(' ')
    if (!groups.every((group) => matchingRanges(body, group).length || matchingRanges(keywords, group).length)) return []
    const score = groups.reduce((sum, group) => sum + (matchingRanges(entry.title, group).length ? 8 : 0) + (matchingRanges(entry.text, group).length ? 3 : 0), 0)
    return [{ result: { ...entry, terms, snippet: snippetFor(entry.text, terms) }, score }]
  }).sort((a, b) => b.score - a.score || a.result.id.localeCompare(b.result.id)).map(({ result }) => result)
}
