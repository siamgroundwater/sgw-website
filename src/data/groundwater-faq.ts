import type { LocalizedLocale } from '@/i18n/config'

export type GroundwaterFaqCategory =
  | 'planning'
  | 'permits'
  | 'yield'
  | 'quality'
  | 'operation'
  | 'maintenance'
  | 'troubleshooting'
  | 'cost'

export type GroundwaterFaqSource =
  | 'faq'
  | 'permit'
  | 'handbook'
  | 'quality'
  | 'law'
  | 'reporting'
  | 'closure'

type LocalizedText = Record<LocalizedLocale, string>

export type GroundwaterFaqItem = {
  id: string
  category: GroundwaterFaqCategory
  popular?: boolean
  urgent?: boolean
  question: LocalizedText
  answer: LocalizedText
  action: LocalizedText
  keywords: string[]
  sources: GroundwaterFaqSource[]
}

const text = (th: string, en: string, zh: string, ja: string): LocalizedText => ({
  th,
  en,
  zh,
  ja,
})

export const groundwaterFaqSourceLinks: Record<GroundwaterFaqSource, string> = {
  faq: 'https://www.dgr.go.th/th/faq/18',
  permit: 'https://www.dgr.go.th/gcl/th/newsAll/433/13900',
  handbook: 'https://www.dgr.go.th/th/public-service/40',
  quality: 'https://www.dgr.go.th/th/newsAll/124/7941',
  law: 'https://www.dgr.go.th/law/th/banner/126',
  reporting: 'https://www.dgr.go.th/th/newsAll/124/7420',
  closure: 'https://www.dgr.go.th/th/newsAll/124/7515',
}

export const groundwaterFaqItems: GroundwaterFaqItem[] = [
  {
    id: 'where-to-start',
    category: 'planning',
    popular: true,
    question: text('อยากใช้น้ำบาดาล ควรเริ่มจากอะไร?', 'Where should a groundwater project begin?', '地下水项目应从哪里开始？', '地下水プロジェクトは何から始めますか？'),
    answer: text('เริ่มจากระบุสถานที่ ปริมาณน้ำรายวันและช่วงพีก คุณภาพที่ต้องการ ชั่วโมงใช้งาน และแหล่งน้ำสำรอง จากนั้นตรวจข้อกฎหมายและข้อมูลอุทกธรณีวิทยาก่อนกำหนดจุดเจาะ วิธีนี้ช่วยไม่ให้ออกแบบบ่อจากงบประมาณหรือความลึกที่คาดเดาเพียงอย่างเดียว', 'Define the location, daily and peak demand, required quality, operating hours and backup source. Then review legal and hydrogeological constraints before choosing a drilling point.', '先明确位置、日用水量与峰值、水质目标、运行时段及备用水源，再核查法规和水文地质条件，之后才确定钻井点。', '所在地、日量とピーク、水質目標、運転時間、代替水源を整理し、法規と水文地質条件を確認してから掘削位置を決めます。'),
    action: text('เตรียม water balance และพิกัดโครงการ', 'Prepare a water balance and site coordinates.', '准备用水平衡和项目坐标。', '水収支と敷地座標を準備します。'),
    keywords: ['เริ่มต้น', 'วางแผน', 'water balance', 'start', 'demand'],
    sources: ['handbook', 'permit'],
  },
  {
    id: 'survey-guarantee',
    category: 'planning',
    popular: true,
    question: text('สำรวจแล้วรับประกันว่าจะเจอน้ำหรือไม่?', 'Does a survey guarantee groundwater?', '勘查能保证找到地下水吗？', '調査で地下水を保証できますか？'),
    answer: text('ไม่สามารถรับประกันได้ การสำรวจช่วยลดความเสี่ยงโดยรวมข้อมูลธรณีวิทยา บ่อใกล้เคียง ภูมิประเทศ และผลวัดทางธรณีฟิสิกส์ แต่ผลจริงของชั้นน้ำ ปริมาณ และคุณภาพจะยืนยันหลังเจาะ พัฒนาบ่อ สูบทดสอบ และวิเคราะห์น้ำ', 'No survey can guarantee success. It reduces risk by combining geology, nearby well records, terrain and geophysics; actual yield and quality are confirmed only after drilling, development, pumping tests and analysis.', '不能保证。勘查通过地质、邻井资料、地形和地球物理数据降低风险；实际水量与水质需在钻井、洗井、抽水试验和检测后确认。', '保証はできません。地質、周辺井戸、地形、物理探査でリスクを下げ、実際の揚水量と水質は掘削・井戸洗浄・揚水試験・分析後に確認します。'),
    action: text('ให้ข้อเสนอระบุวิธีสำรวจและข้อจำกัดอย่างโปร่งใส', 'Require the proposal to state methods and limitations.', '要求方案明确说明方法和局限。', '提案書に調査方法と限界を明記させます。'),
    keywords: ['สำรวจ', 'รับประกัน', 'resistivity', 'survey', 'geophysics'],
    sources: ['handbook'],
  },
  {
    id: 'choose-drilling-point',
    category: 'planning',
    question: text('เลือกจุดเจาะจากอะไรบ้าง?', 'How is a drilling point selected?', '钻井点如何选择？', '掘削地点はどう選びますか？'),
    answer: text('ต้องพิจารณาทั้งศักยภาพชั้นน้ำ ระยะจากแหล่งปนเปื้อน แนวสาธารณูปโภค ทางเข้าเครื่องจักร พื้นที่ระบายโคลน ความปลอดภัย และพื้นที่ซ่อมในอนาคต จุดที่ให้สัญญาณสำรวจดีอาจไม่ใช่จุดก่อสร้างที่เหมาะสมที่สุด', 'Selection combines aquifer potential, contamination setbacks, buried utilities, rig access, drilling-fluid management, safety and future maintenance space. The strongest survey response is not always the best construction location.', '需综合含水层潜力、污染源距离、地下管线、钻机通道、泥浆处置、安全与未来维修空间；勘查信号最强处未必最适合施工。', '帯水層の可能性、汚染源との距離、埋設物、機械進入、泥水処理、安全、将来の保守空間を総合判断します。'),
    action: text('ทำ site walk ร่วมกับฝ่ายอาคารและความปลอดภัย', 'Walk the site with facilities and safety teams.', '与设施和安全团队联合踏勘。', '施設・安全担当と現地確認します。'),
    keywords: ['จุดเจาะ', 'ตำแหน่ง', 'site', 'location', 'contamination'],
    sources: ['handbook'],
  },
  {
    id: 'drilling-depth',
    category: 'yield',
    popular: true,
    question: text('บ่อต้องลึกเท่าไร?', 'How deep should the well be?', '井应该多深？', '井戸はどのくらい深くしますか？'),
    answer: text('ไม่ควรกำหนดจากบ่อข้างเคียงหรือราคาต่อเมตรอย่างเดียว ความลึกขึ้นกับชั้นน้ำเป้าหมาย คุณภาพน้ำ โครงสร้างธรณีวิทยา และเงื่อนไขใบอนุญาต ผู้ควบคุมงานต้องใช้ข้อมูลระหว่างเจาะเพื่อยืนยันตำแหน่งท่อกรองและความลึกสุดท้าย', 'Depth should not be copied from a neighboring well or set only by price per metre. It depends on target aquifers, quality, geology and permit conditions, with the final screen interval confirmed from drilling evidence.', '不能仅照搬邻井深度或按每米价格决定；应依据目标含水层、水质、地质和许可条件，并根据钻进资料确定筛管位置和最终深度。', '近隣井戸やメートル単価だけで決めず、対象帯水層、水質、地質、許可条件と掘削記録からスクリーン区間と最終深度を決めます。'),
    action: text('กำหนดเกณฑ์หยุดเจาะและผู้มีอำนาจตัดสินใจก่อนเริ่มงาน', 'Define stop criteria and decision authority before drilling.', '开工前明确停钻标准和决策权限。', '掘削前に停止基準と決定権者を定めます。'),
    keywords: ['ความลึก', 'เมตร', 'depth', 'screen', 'ชั้นน้ำ'],
    sources: ['permit', 'handbook'],
  },
  {
    id: 'well-yield',
    category: 'yield',
    popular: true,
    question: text('บ่อหนึ่งบ่อให้น้ำได้เท่าไร?', 'How much water can one well produce?', '一口井能出多少水？', '井戸1本でどれだけ揚水できますか？'),
    answer: text('ตอบจากความลึกหรือขนาดท่อไม่ได้ ปริมาณที่ใช้อย่างยั่งยืนขึ้นกับชั้นน้ำ การก่อสร้างบ่อ ระดับน้ำขณะสูบ และผลกระทบต่อบ่อหรือพื้นที่รอบข้าง ต้องใช้ pumping test กำหนดอัตราสูบใช้งาน ไม่ใช่ใช้อัตราสูบสูงสุดชั่วคราว', 'Depth and casing size cannot answer this. Sustainable yield depends on the aquifer, construction, pumping water level and surrounding impacts, and must be set from a pumping test rather than a brief maximum flow.', '不能仅凭深度或管径判断。可持续出水量取决于含水层、成井质量、抽水水位及周边影响，应通过抽水试验确定，而非采用短时最大流量。', '深度や口径だけでは判断できません。帯水層、井戸構造、揚水水位、周辺影響を揚水試験で評価し、短時間の最大流量ではなく運用揚水量を決めます。'),
    action: text('ขอกราฟ drawdown, recovery และอัตราสูบแนะนำ', 'Request drawdown, recovery and recommended-rate records.', '索取降深、恢复曲线及建议抽水量。', '水位低下・回復曲線と推奨揚水量を受領します。'),
    keywords: ['ปริมาณน้ำ', 'yield', 'ลิตร', 'ลูกบาศก์เมตร', 'flow'],
    sources: ['handbook'],
  },
  {
    id: 'pumping-test',
    category: 'yield',
    question: text('Pumping Test สำคัญอย่างไร?', 'Why is a pumping test important?', '抽水试验为什么重要？', '揚水試験はなぜ重要ですか？'),
    answer: text('ใช้วัดความสัมพันธ์ระหว่างอัตราสูบกับระดับน้ำ การฟื้นตัว และสมรรถนะบ่อ เพื่อนำไปเลือกอัตราสูบ ตำแหน่งติดตั้งเครื่องสูบ และระบบสำรอง การเปิดปั๊มระยะสั้นจนเห็นน้ำไหลไม่ใช่ pumping test ที่เพียงพอสำหรับออกแบบ', 'It measures flow versus drawdown, recovery and well performance so the operating rate, pump setting and storage can be designed. A short run that merely produces water is not a sufficient design test.', '它测定流量与降深、恢复和井效之间的关系，用于确定运行流量、泵位和储水；短时间出水并不能替代正式抽水试验。', '流量と水位低下、回復、井戸性能を測定し、運転流量、ポンプ位置、貯留を設計します。短時間水が出ただけでは十分ではありません。'),
    action: text('บันทึกอัตราสูบและระดับน้ำเป็นช่วงเวลาตลอดการทดสอบ', 'Record flow and water levels throughout the test.', '全程按时间记录流量和水位。', '試験中の流量と水位を時系列で記録します。'),
    keywords: ['สูบทดสอบ', 'pumping test', 'drawdown', 'recovery'],
    sources: ['handbook'],
  },
  {
    id: 'number-of-wells',
    category: 'yield',
    question: text('ควรมีบ่อเดียวหรือหลายบ่อ?', 'Do we need one well or several?', '需要一口井还是多口井？', '井戸は1本か複数必要ですか？'),
    answer: text('พิจารณาจากความต้องการสูงสุด สมรรถนะที่พิสูจน์แล้ว ชั่วโมงสูบต่อวัน ความสำคัญของน้ำต่อธุรกิจ และแผนหยุดซ่อม โครงการที่หยุดน้ำไม่ได้มักต้องมีถังสำรอง แหล่งน้ำอื่น หรือบ่อสำรอง ไม่ควรให้บ่อเดียวรับภาระเต็มตลอดเวลาโดยไม่มีแผนฉุกเฉิน', 'Decide from peak demand, proven capacity, daily pumping hours, business criticality and maintenance downtime. Critical sites generally need storage, another source or standby capacity.', '应依据峰值需求、已验证井能力、每日运行时间、业务重要性和检修停机确定；关键项目通常需要储水、备用水源或备用井。', 'ピーク需要、実証能力、運転時間、事業重要度、保守停止を考慮し、重要施設は貯水・別水源・予備能力を持たせます。'),
    action: text('ทำแผน N+1 หรือแผนจ่ายน้ำระหว่างหยุดบ่อ', 'Prepare an N+1 or outage water-supply plan.', '制定N+1或停井期间供水方案。', 'N+1または停止時の給水計画を作ります。'),
    keywords: ['จำนวนบ่อ', 'สำรอง', 'redundancy', 'storage'],
    sources: ['handbook'],
  },
  {
    id: 'permit-required',
    category: 'permits',
    popular: true,
    question: text('เจาะในที่ดินตัวเองต้องขออนุญาตหรือไม่?', 'Is a permit needed on privately owned land?', '在自有土地钻井也要许可吗？', '自己の土地でも許可が必要ですか？'),
    answer: text('กรรมสิทธิ์ที่ดินไม่ได้แทนสิทธิประกอบกิจการน้ำบาดาล โดยทั่วไปต้องตรวจและขอใบอนุญาตก่อนเจาะหรือใช้น้ำตามกฎหมายและเงื่อนไขพื้นที่ ทั้งใบอนุญาตเจาะและใบอนุญาตใช้น้ำเป็นคนละขั้นตอน', 'Land ownership does not replace groundwater authorization. Drilling and use generally require advance checks and separate permits under the applicable area rules.', '土地所有权不能替代地下水许可。通常钻井和取用水需事先核查并分别申请许可。', '土地所有権は地下水許可の代わりになりません。通常、掘削と利用は事前確認と別々の許可が必要です。'),
    action: text('ตรวจจุดยื่นคำขอกับพนักงานน้ำบาดาลประจำท้องที่ก่อนว่าจ้างเจาะ', 'Confirm the filing office before appointing a driller.', '委托钻井前确认受理机关。', '掘削業者選定前に申請窓口を確認します。'),
    keywords: ['ใบอนุญาต', 'ที่ดิน', 'permit', 'กฎหมาย', 'เจาะ'],
    sources: ['permit', 'law', 'handbook'],
  },
  {
    id: 'existing-well',
    category: 'permits',
    question: text('ซื้อที่ดินหรือกิจการที่มีบ่อเดิม ต้องทำอะไร?', 'What should be checked when acquiring an existing well?', '接手已有井的土地或企业要检查什么？', '既設井戸を引き継ぐ際に何を確認しますか？'),
    answer: text('ตรวจเลขที่บ่อ ใบอนุญาต ผู้ถือใบอนุญาต วันหมดอายุ ปริมาณที่อนุญาต รายงาน นบ./11 หนี้ค่าใช้น้ำ แบบก่อสร้าง ผลทดสอบ และสภาพจริง การซื้อทรัพย์ไม่ทำให้ใบอนุญาตโอนอัตโนมัติ ควรดำเนินการโอนหรือแก้ไขกับเจ้าหน้าที่ก่อนใช้งานต่อ', 'Check the well ID, permit holder and expiry, authorized volume, reports, charges, construction record, tests and actual condition. A property transaction does not automatically transfer the permit.', '核查井号、持证人、有效期、许可水量、月报、水费、成井资料、试验及现状；产权交易不会自动转移地下水许可。', '井戸番号、名義、有効期限、許可量、報告、料金、施工記録、試験、現況を確認します。不動産取引で許可は自動移転しません。'),
    action: text('ใส่ groundwater due diligence ในรายการส่งมอบกิจการ', 'Add groundwater due diligence to the acquisition checklist.', '将地下水尽调纳入交接清单。', '取得時チェックリストに地下水デューデリジェンスを含めます。'),
    keywords: ['บ่อเดิม', 'โอน', 'ซื้อที่ดิน', 'existing well', 'transfer'],
    sources: ['faq', 'handbook', 'law'],
  },
  {
    id: 'reporting-renewal',
    category: 'permits',
    question: text('หลังได้ใบอนุญาตแล้วต้องทำอะไรต่อ?', 'What continues after a permit is issued?', '取得许可后还需做什么？', '許可取得後も何が必要ですか？'),
    answer: text('ต้องปฏิบัติตามเงื่อนไข ติดตั้งและดูแลเครื่องวัดปริมาณน้ำ บันทึกการใช้ ส่งรายงาน นบ./11 ภายในวันที่ 7 ของเดือนถัดไป ชำระค่าใช้และค่าอนุรักษ์เมื่อเข้าเกณฑ์ และจัดการวันต่ออายุ หากไม่รายงาน เจ้าหน้าที่อาจประเมินจากปริมาณสูงสุดที่อนุญาต', 'Comply with conditions, maintain the meter, keep readings, submit NB.11 by the 7th of the following month, pay applicable charges and manage renewal dates. Missing reports may cause assessment at the authorized maximum.', '应遵守许可条件、维护水表、保存读数、次月7日前提交NB.11、缴纳适用费用并管理续期；缺报可能按许可最大量核算。', '条件遵守、メーター管理、記録、翌月7日までのNB.11、料金、更新日管理が続きます。未報告は許可最大量で算定される場合があります。'),
    action: text('ตั้งปฏิทินรายเดือนและผู้รับผิดชอบสำรอง', 'Set a monthly compliance calendar and backup owner.', '设置月度合规日历和备用负责人。', '月次コンプライアンス予定と代替担当者を設定します。'),
    keywords: ['นบ.11', 'รายงาน', 'ต่ออายุ', 'meter', 'renewal'],
    sources: ['reporting', 'faq', 'handbook'],
  },
  {
    id: 'temporary-dewatering',
    category: 'permits',
    question: text('งานลดระดับน้ำใต้ดินชั่วคราวต้องตรวจเรื่องกฎหมายหรือไม่?', 'Does temporary dewatering need legal review?', '临时降水需要法规审查吗？', '一時的な地下水位低下工事も法規確認が必要ですか？'),
    answer: text('ต้องตรวจ แม้งานจะชั่วคราวก็อาจเกี่ยวข้องกับการเจาะ การสูบ การระบาย และผลกระทบต่ออาคารหรือบ่อข้างเคียง ต้องกำหนดจุดทิ้งน้ำ ระบบติดตามระดับน้ำและการทรุดตัว รวมถึงใบอนุญาตที่เกี่ยวข้องก่อนเริ่มงาน', 'Yes. Temporary work may involve drilling, abstraction, discharge and impacts on nearby structures or wells. Review disposal, monitoring and all applicable approvals before work.', '需要。临时工程也可能涉及钻孔、抽水、排放及对邻近建筑或井的影响，应事先核查排水、监测和许可。', '必要です。仮設でも掘削、揚水、排水、周辺建物・井戸への影響があるため、排水先、監視、許可を事前確認します。'),
    action: text('ให้แผน dewatering มี baseline และ trigger level', 'Include baseline data and trigger levels in the plan.', '降水方案应包含基线和触发值。', '計画にベースラインとトリガー値を含めます。'),
    keywords: ['dewatering', 'ลดระดับน้ำ', 'ก่อสร้าง', 'ชั่วคราว'],
    sources: ['law', 'permit'],
  },
  {
    id: 'clear-water-safe',
    category: 'quality',
    popular: true,
    question: text('น้ำใส ไม่มีกลิ่น ดื่มได้เลยหรือไม่?', 'Is clear, odourless groundwater safe to drink?', '清澈无味的地下水能直接饮用吗？', '透明で無臭ならそのまま飲めますか？'),
    answer: text('สรุปไม่ได้ สารละลายและจุลชีพบางชนิดมองไม่เห็นและไม่มีรส ต้องเก็บตัวอย่างอย่างถูกต้อง วิเคราะห์ตามวัตถุประสงค์ และประเมินทั้งแหล่งน้ำ ระบบปรับปรุง ถัง ท่อ และจุดจ่าย การผ่านครั้งเดียวไม่แทนการควบคุมระบบระยะยาว', 'No. Dissolved substances and microorganisms can be invisible and tasteless. Representative sampling, use-specific testing and control of treatment, storage and distribution are required.', '不能。部分溶解物和微生物无色无味，需要规范采样、按用途检测，并管理处理、储存和管网。', '判断できません。見えない溶解物や微生物があるため、適切な採水、用途別分析、処理・貯留・配管管理が必要です。'),
    action: text('ห้ามใช้ความใสหรือ TDS อย่างเดียวตัดสินความปลอดภัย', 'Never use clarity or TDS alone as proof of safety.', '不得仅凭清澈度或TDS判断安全。', '透明度やTDSだけで安全と判断しません。'),
    keywords: ['ดื่ม', 'น้ำใส', 'ปลอดภัย', 'drink', 'TDS', 'microbiology'],
    sources: ['quality', 'faq'],
  },
  {
    id: 'water-test-list',
    category: 'quality',
    question: text('ควรตรวจคุณภาพน้ำรายการอะไรบ้าง?', 'Which water-quality parameters should be tested?', '水质应检测哪些项目？', 'どの水質項目を分析しますか？'),
    answer: text('รายการต้องอิงการใช้งานและความเสี่ยง โดยมักเริ่มจากกายภาพ เคมีพื้นฐาน แร่ธาตุที่พบบ่อย ความเค็ม/ความกระด้าง และจุลชีววิทยาสำหรับการอุปโภคบริโภค โรงงานหรืออาหารต้องเพิ่มพารามิเตอร์ตามกระบวนการ มาตรฐานผลิตภัณฑ์ และข้อกำหนดหน่วยงาน', 'The test suite must follow use and risk: physical and basic chemistry, common minerals, salinity or hardness, plus microbiology for domestic use. Industrial and food uses need process- and regulation-specific parameters.', '检测项目应按用途和风险确定，通常包括物理、基础化学、常见矿物、盐度/硬度；生活用水还需微生物，工业和食品用途应增加工艺及法规项目。', '用途とリスクに応じ、物理・基礎化学、主要鉱物、塩分・硬度、生活用途なら微生物を含めます。工業・食品用途は工程・規格項目を追加します。'),
    action: text('แจ้งห้องปฏิบัติการถึงการใช้น้ำปลายทางเสมอ', 'Tell the laboratory the intended end use.', '务必告知实验室最终用途。', '分析機関に最終用途を伝えます。'),
    keywords: ['ตรวจน้ำ', 'พารามิเตอร์', 'lab', 'analysis', 'quality'],
    sources: ['quality', 'faq'],
  },
  {
    id: 'sample-correctly',
    category: 'quality',
    question: text('เก็บตัวอย่างน้ำจากก๊อกไหนก็ได้หรือไม่?', 'Can a sample be taken from any tap?', '可以从任意水龙头取样吗？', 'どの蛇口から採水してもよいですか？'),
    answer: text('ไม่ได้ จุดเก็บต้องสัมพันธ์กับคำถาม เช่น น้ำดิบก่อนปรับปรุง น้ำหลังระบบ หรือจุดใช้งาน ภาชนะ การล้างจุดเก็บ เวลาไหลทิ้ง การรักษาอุณหภูมิ สารกันเสีย และเวลาส่งต่างกันตามรายการวิเคราะห์ ควรทำตามคำแนะนำห้องปฏิบัติการ', 'No. Raw water, post-treatment and point-of-use samples answer different questions. Containers, flushing, preservation, temperature and holding time must follow the laboratory method.', '不可以。原水、处理后和末端样品代表不同问题；容器、放水、保存、温度和送检时限应遵循实验室方法。', '原水、処理後、末端では目的が異なります。容器、フラッシング、保存、温度、搬入時間は分析方法に従います。'),
    action: text('จัดทำ sampling plan ระบุจุด เวลา และผู้เก็บ', 'Use a sampling plan with points, timing and sampler.', '制定包含点位、时间和采样人的计划。', '採水点・時刻・担当者を定めた計画を作ります。'),
    keywords: ['ตัวอย่างน้ำ', 'sampling', 'ก๊อก', 'ห้องแล็บ'],
    sources: ['quality', 'faq'],
  },
  {
    id: 'choose-treatment',
    category: 'quality',
    popular: true,
    question: text('เลือกเครื่องกรองจากสีหรือกลิ่นของน้ำได้หรือไม่?', 'Can treatment be selected from colour or odour alone?', '能仅凭颜色或气味选择处理设备吗？', '色や臭いだけで処理設備を選べますか？'),
    answer: text('ไม่ควร อาการเดียวอาจมีหลายสาเหตุ และวิธีแก้ต่างกัน ระบบต้องออกแบบจากผลวิเคราะห์ อัตราการไหล ชั่วโมงเดินเครื่อง คุณภาพเป้าหมาย น้ำทิ้ง พื้นที่ และการดูแลสารกรอง ควรมีจุดเก็บตัวอย่างและเกณฑ์รับมอบที่วัดได้', 'No. One symptom can have several causes. Design must use laboratory results, flow, duty, target quality, waste stream, footprint and maintenance requirements, with measurable acceptance criteria.', '不应。相同现象可能由不同原因造成；设计应依据检测结果、流量、运行时间、目标水质、废水、空间和维护，并设可测验收标准。', '推奨できません。同じ症状でも原因が異なります。分析、流量、運転時間、目標水質、排水、設置・保守条件から設計し、測定可能な受入基準を設けます。'),
    action: text('อย่าซื้อระบบก่อนมีผลวิเคราะห์น้ำดิบที่เป็นตัวแทน', 'Do not buy treatment before representative raw-water results.', '取得代表性原水结果前不要采购系统。', '代表的な原水分析前に設備を購入しません。'),
    keywords: ['เครื่องกรอง', 'สนิม', 'กลิ่น', 'treatment', 'filter'],
    sources: ['quality'],
  },
  {
    id: 'reverse-osmosis',
    category: 'quality',
    question: text('น้ำบาดาลต้องใช้ RO ทุกแห่งหรือไม่?', 'Does every groundwater system need RO?', '所有地下水系统都需要RO吗？', 'すべての地下水にROが必要ですか？'),
    answer: text('ไม่จำเป็น RO เหมาะกับปัญหาสารละลายบางกลุ่ม แต่ใช้พลังงาน มีน้ำทิ้ง และต้องเตรียมน้ำก่อนเข้าเมมเบรน ปัญหาเหล็ก แมงกานีส ความขุ่น หรือจุลชีพอาจต้องใช้กระบวนการอื่น การเลือกต้องเริ่มจากน้ำดิบและคุณภาพปลายทาง', 'No. RO addresses certain dissolved constituents but consumes energy, produces reject water and needs pretreatment. Iron, manganese, turbidity or microbiological risks may require other processes.', '不一定。RO适用于部分溶解性问题，但耗能、产生浓水并需预处理；铁锰、浊度或微生物问题可能需要其他工艺。', '不要です。ROは一部の溶解成分に有効ですが、電力、濃縮排水、前処理が必要です。鉄・マンガン・濁り・微生物には別工程が必要な場合があります。'),
    action: text('เปรียบเทียบ recovery, พลังงาน, น้ำทิ้ง และค่าดูแลตลอดอายุระบบ', 'Compare recovery, energy, reject water and lifecycle cost.', '比较回收率、能耗、浓水和全生命周期成本。', '回収率、電力、濃縮排水、ライフサイクル費を比較します。'),
    keywords: ['RO', 'reverse osmosis', 'เมมเบรน', 'น้ำทิ้ง'],
    sources: ['quality'],
  },
  {
    id: 'pump-sizing',
    category: 'operation',
    question: text('เลือกปั๊มจากแรงม้าอย่างเดียวได้หรือไม่?', 'Can a pump be selected by horsepower alone?', '可以只按马力选泵吗？', '馬力だけでポンプを選べますか？'),
    answer: text('ไม่ได้ ต้องรู้จุดทำงานจากอัตราไหล เฮดรวม ระดับน้ำขณะสูบ ความลึกติดตั้ง การสูญเสียในท่อ และประสิทธิภาพปั๊ม ปั๊มใหญ่เกินทำให้สูบเกินสมรรถนะบ่อ กินไฟ และตัดต่อบ่อย ส่วนปั๊มเล็กเกินอาจจ่ายน้ำไม่พอ', 'No. Select from flow, total head, pumping level, setting depth, pipe losses and efficiency. Oversizing can overpump the well, waste energy and short-cycle; undersizing may miss demand.', '不可以。应依据流量、总扬程、抽水水位、安装深度、管损和效率选型；过大会过抽、耗电和频繁启停，过小则供水不足。', '流量、全揚程、揚水水位、設置深度、配管損失、効率で選定します。過大は過剰揚水・電力浪費・頻繁起動の原因になります。'),
    action: text('ขอ pump curve และระบุ operating point ในเอกสารส่งมอบ', 'Require the pump curve and marked operating point.', '要求提供泵曲线并标明工况点。', 'ポンプ曲線と運転点を引渡し資料に含めます。'),
    keywords: ['ปั๊ม', 'แรงม้า', 'pump', 'head', 'flow'],
    sources: ['handbook'],
  },
  {
    id: 'storage-tank',
    category: 'operation',
    question: text('ทำไมควรสูบเข้าถังแทนจ่ายตรง?', 'Why pump into storage instead of directly to demand?', '为什么建议先抽入水箱？', 'なぜ需要へ直送せず貯水しますか？'),
    answer: text('ถังช่วยแยกอัตราสูบที่บ่อรับได้ออกจากช่วงใช้น้ำพีก ลดการตัดต่อปั๊ม และมีเวลาสำรองเมื่อบ่อหรือระบบปรับปรุงหยุด ขนาดถังต้องคำนวณจากรูปแบบใช้น้ำ เวลาฟื้นตัว แผนฉุกเฉิน และคุณภาพน้ำ ไม่ใช่เลือกจากพื้นที่ว่างเพียงอย่างเดียว', 'Storage separates sustainable well flow from peak demand, reduces cycling and provides outage time. Size it from demand patterns, recovery, contingency and water-quality needs.', '储水可将井的可持续流量与峰值需求分开，减少启停并提供停机缓冲；容量应按用水曲线、恢复、应急和水质确定。', '持続可能な井戸流量とピーク需要を分離し、起動回数と停止リスクを下げます。容量は需要、回復、非常時、水質から決めます。'),
    action: text('คำนวณ usable volume ไม่ใช่ดูความจุถังบนป้ายอย่างเดียว', 'Calculate usable volume, not only nominal tank volume.', '计算可用容积，而非只看标称容量。', '公称容量でなく有効容量を計算します。'),
    keywords: ['ถังน้ำ', 'storage', 'สำรอง', 'peak'],
    sources: ['handbook'],
  },
  {
    id: 'monitoring-records',
    category: 'operation',
    question: text('ควรบันทึกค่าอะไรระหว่างใช้งาน?', 'What operating data should be recorded?', '运行中应记录哪些数据？', '運転中に何を記録しますか？'),
    answer: text('อย่างน้อยควรมีเลขมิเตอร์ ปริมาณรายวัน ชั่วโมงทำงาน อัตราไหล ระดับน้ำสถิตและขณะสูบ กระแส/แรงดันไฟ แรงดันระบบ ความขุ่นหรือค่าควบคุมหลัก เหตุขัดข้อง และงานบำรุงรักษา การดูแนวโน้มสำคัญกว่าค่าเดี่ยว', 'At minimum log meter readings, daily volume, run hours, flow, static and pumping levels, electrical load, pressure, key quality controls, faults and maintenance. Trends are more useful than isolated readings.', '至少记录水表、日水量、运行小时、流量、静水位和动水位、电流电压、压力、关键水质、故障和维护；趋势比单点值更重要。', 'メーター、日量、運転時間、流量、静水位・揚水水位、電気負荷、圧力、主要水質、故障、保守を記録し、単値より傾向を見ます。'),
    action: text('ตั้ง baseline หลังรับมอบเพื่อใช้เปรียบเทียบทุกเดือน', 'Set a commissioning baseline for monthly comparison.', '验收后建立基线供每月比较。', '引渡し時の基準値を設定し毎月比較します。'),
    keywords: ['บันทึก', 'monitoring', 'มิเตอร์', 'ระดับน้ำ', 'baseline'],
    sources: ['handbook', 'reporting'],
  },
  {
    id: 'maintenance-frequency',
    category: 'maintenance',
    popular: true,
    question: text('ควรล้างบ่อทุกกี่ปี?', 'How often should a well be cleaned?', '多久洗井一次？', '井戸洗浄は何年ごとですか？'),
    answer: text('ไม่มีรอบตายตัว ควรตัดสินจากแนวโน้ม specific capacity ระดับน้ำ ปริมาณทราย ความขุ่น คุณภาพน้ำ กระแสไฟ และประวัติบ่อ การล้างตามปฏิทินโดยไม่วินิจฉัยอาจไม่แก้สาเหตุ หรือทำให้บ่อเสียหายได้', 'There is no universal interval. Use trends in specific capacity, water levels, sand, turbidity, quality, electrical load and well history. Calendar cleaning without diagnosis may miss the cause or damage the well.', '没有统一周期。应依据比出水量、水位、出砂、浊度、水质、电负荷和井史趋势；未诊断就按年限洗井可能无效甚至损坏井。', '一律の周期はありません。比湧出量、水位、砂、濁り、水質、電気負荷、履歴の傾向から判断し、診断なしの定期洗浄は避けます。'),
    action: text('ทำ performance check ก่อนกำหนดวิธีฟื้นฟู', 'Run a performance check before choosing rehabilitation.', '确定修复方法前先做性能检查。', '再生方法を決める前に性能診断します。'),
    keywords: ['ล้างบ่อ', 'เป่าล้าง', 'cleaning', 'rehabilitation'],
    sources: ['handbook', 'faq'],
  },
  {
    id: 'sanitary-protection',
    category: 'maintenance',
    question: text('บริเวณหัวบ่อต้องดูแลอย่างไร?', 'How should the wellhead be protected?', '井口区域如何维护？', '井戸元はどう保護しますか？'),
    answer: text('หัวบ่อต้องปิดมิดชิด สูงกว่าระดับน้ำท่วม มีพื้นระบายน้ำออก ไม่มีสารเคมี น้ำเสีย หรือสัตว์สะสมใกล้บ่อ ตรวจรอยแตก ท่อร้อยสาย ฝาปิด ช่องระบาย และการไหลย้อน หลังน้ำท่วมหรือซ่อมใหญ่ควรประเมินและเก็บตัวอย่างก่อนกลับมาใช้', 'Keep the wellhead sealed, above flood level and drained away from the well, with no nearby chemicals, wastewater or animal waste. Inspect seals and backflow protection; reassess after flooding or major work.', '井口应密封、高于洪水位并向外排水，周边不得积存化学品、污水或动物排泄物；洪水或大修后应评估并检测。', '井戸元を密閉し浸水位より高く、外向き排水とし、薬品・汚水・動物排泄物を近づけません。洪水・大規模修理後は再評価します。'),
    action: text('เพิ่ม wellhead inspection ในรอบตรวจความปลอดภัยประจำเดือน', 'Add wellhead inspection to the monthly safety round.', '将井口检查纳入月度安全巡检。', '月次安全巡回に井戸元点検を追加します。'),
    keywords: ['หัวบ่อ', 'น้ำท่วม', 'สุขาภิบาล', 'wellhead', 'flood'],
    sources: ['handbook'],
  },
  {
    id: 'inactive-well',
    category: 'maintenance',
    question: text('บ่อที่ไม่ใช้แล้วปล่อยทิ้งไว้ได้หรือไม่?', 'Can an unused well simply be abandoned?', '停用井可以直接闲置吗？', '使用しない井戸を放置できますか？'),
    answer: text('ไม่ควร บ่อเปิดหรือเสื่อมสภาพเป็นช่องทางปนเปื้อนและอันตราย ต้องแจ้งเลิกใช้ตามกำหนด ป้องกันบ่อระหว่างรอดำเนินการ และอุดกลบตามคำสั่ง/มาตรฐานโดยผู้มีความรู้ พร้อมเก็บหลักฐานการอุดกลบ', 'No. An open or deteriorated well is a contamination pathway and safety hazard. Notify cessation, secure it while pending and seal it to the required method with records.', '不应。敞开或破损井会成为污染通道和安全隐患；应申报停用、临时防护，并按要求由专业人员封井留档。', '放置できません。汚染経路・安全リスクになるため、廃止届、仮保護、基準に沿った埋戻しと記録が必要です。'),
    action: text('อย่าเทดินหรือเศษวัสดุลงบ่อเอง', 'Do not fill the well with soil or debris yourself.', '不要自行向井内倾倒土或废料。', '土や廃材を自己判断で投入しません。'),
    keywords: ['เลิกใช้', 'อุดกลบ', 'abandoned', 'seal', 'closure'],
    sources: ['closure', 'handbook', 'law'],
  },
  {
    id: 'low-flow',
    category: 'troubleshooting',
    popular: true,
    question: text('น้ำไหลน้อยลง ต้องเจาะบ่อใหม่เลยหรือไม่?', 'Does falling flow mean a new well is needed?', '出水量下降就必须打新井吗？', '流量低下ですぐ新井戸が必要ですか？'),
    answer: text('ยังสรุปไม่ได้ ตรวจมิเตอร์ วาล์ว รอยรั่ว แรงดัน ไฟฟ้า จุดทำงานปั๊ม ระดับน้ำ และ specific capacity ก่อน หากระดับน้ำใกล้เดิมแต่สมรรถนะลด อาจเป็นปั๊ม ท่อ หรือบ่ออุดตัน หากระดับน้ำพื้นที่ลดลงต้องประเมินชั้นน้ำและการสูบรอบข้าง', 'Not necessarily. Check meters, valves, leaks, pressure, electricity, pump duty, water levels and specific capacity. Similar levels with lower output suggest equipment or clogging; falling area levels need aquifer review.', '不一定。先检查水表、阀门、漏水、压力、电气、泵工况、水位和比出水量；水位近似但流量下降多与设备或堵塞有关，区域水位下降则需评估含水层。', 'すぐには判断できません。メーター、弁、漏水、圧力、電気、ポンプ、水位、比湧出量を確認し、設備・目詰まりか帯水層変化かを分けます。'),
    action: text('เก็บข้อมูลก่อนปรับวาล์ว เพิ่มปั๊ม หรือเป่าล้าง', 'Collect data before throttling, upsizing or cleaning.', '调阀、加大泵或洗井前先采集数据。', '弁調整、ポンプ増強、洗浄前にデータを取ります。'),
    keywords: ['น้ำลด', 'ไหลน้อย', 'low flow', 'specific capacity'],
    sources: ['handbook'],
  },
  {
    id: 'sand-production',
    category: 'troubleshooting',
    urgent: true,
    question: text('มีทรายออกมากับน้ำ ควรทำอย่างไร?', 'What should be done when a well produces sand?', '井水出砂怎么办？', '揚水に砂が混じる場合は？'),
    answer: text('ลดหรือหยุดสูบเพื่อป้องกันเครื่องสูบ ท่อ และบ่อเสียหาย เก็บตัวอย่างตะกอน บันทึกว่าเกิดเมื่อใด ตรวจอัตราสูบ ระดับน้ำ ประวัติปั๊ม และตรวจสภาพบ่อ สาเหตุอาจมาจากสูบแรงเกิน ชั้นกรอง/กรวดกรองผิดปกติ หรือบ่อเสียหาย ไม่ควรเพิ่มขนาดปั๊ม', 'Reduce or stop pumping to protect the pump, piping and well. Record timing, collect sediment and inspect flow, levels, pump history and well condition. Causes include overpumping or screen, gravel-pack or casing damage.', '应减小或停止抽水，保护泵、管道和井；记录发生时机、收集沉积物并检查流量、水位、泵史及井况。原因可能是过抽或筛管、滤料、井管损坏。', 'ポンプ・配管・井戸保護のため減量または停止し、砂試料、発生時期、流量、水位、履歴、井戸状態を確認します。過剰揚水やスクリーン損傷等が考えられます。'),
    action: text('หลีกเลี่ยงการเดินระบบต่อจนทรายทำลายปั๊ม', 'Avoid continued operation that can destroy the pump.', '避免继续运行导致泵损坏。', '砂でポンプを損傷するまで運転を続けません。'),
    keywords: ['ทราย', 'sand', 'ตะกอน', 'screen', 'เร่งด่วน'],
    sources: ['handbook'],
  },
  {
    id: 'colour-odour-change',
    category: 'troubleshooting',
    urgent: true,
    question: text('สี กลิ่น หรือรสเปลี่ยนกะทันหัน ควรทำอย่างไร?', 'What if colour, odour or taste changes suddenly?', '颜色、气味或味道突然变化怎么办？', '色・臭い・味が急変したら？'),
    answer: text('หากใช้ดื่มหรือเกี่ยวข้องอาหารให้หยุดใช้ส่วนที่เสี่ยง แยกว่าน้ำเปลี่ยนตั้งแต่น้ำดิบหรือหลังถัง/ระบบ เก็บตัวอย่างตามแผน ตรวจเหตุซ่อม น้ำท่วม สารเคมี หรือการเปลี่ยนแปลงรอบบ่อ แล้ววิเคราะห์ก่อนเลือกวิธีแก้', 'For drinking or food use, stop the affected use. Determine whether the change begins in raw water or after treatment/storage, sample correctly and investigate repairs, flooding, chemicals and nearby changes before acting.', '如用于饮用或食品，应暂停相关用途；确认变化发生在原水还是处理/储存后，规范采样并调查维修、洪水、化学品及井周变化。', '飲用・食品用途は該当使用を停止し、原水か処理・貯留後かを切り分け、適切に採水して修理、浸水、薬品、周辺変化を調べます。'),
    action: text('อย่าเติมสารเคมีหรือเปลี่ยนสารกรองโดยไม่มีผลตรวจ', 'Do not dose chemicals or replace media without evidence.', '无检测依据不要投药或更换滤料。', '根拠なく薬注・ろ材交換をしません。'),
    keywords: ['กลิ่น', 'สี', 'รส', 'odour', 'colour', 'urgent'],
    sources: ['quality', 'handbook'],
  },
  {
    id: 'pump-short-cycle',
    category: 'troubleshooting',
    question: text('ปั๊มตัดต่อถี่หรือกินไฟเพิ่ม เกิดจากอะไร?', 'Why is the pump short-cycling or using more energy?', '水泵频繁启停或耗电增加是什么原因？', 'ポンプの頻繁起動・電力増加の原因は？'),
    answer: text('ตรวจถังแรงดัน pressure switch วาล์วกันกลับ รอยรั่ว เซนเซอร์ ระดับน้ำ จุดทำงานบน pump curve และการอุดตันของบ่อ/ท่อ ค่าไฟเพิ่มอาจมาจากระดับน้ำลด แรงเสียดทานเพิ่ม ใบพัดสึก หรือมอเตอร์ผิดปกติ ต้องเทียบกับ baseline ไม่ใช่เปลี่ยนปั๊มทันที', 'Check the pressure tank, switch, check valve, leaks, sensors, water level, pump curve and clogging. Rising energy can reflect drawdown, friction, wear or motor faults; compare with baseline before replacing equipment.', '检查压力罐、压力开关、止回阀、漏水、传感器、水位、泵曲线和堵塞；耗电增加可能来自降深、阻力、磨损或电机故障，应先与基线比较。', '圧力タンク、スイッチ、逆止弁、漏水、センサー、水位、ポンプ曲線、目詰まりを確認し、基準値と比較してから交換判断します。'),
    action: text('บันทึกกระแส แรงดัน อัตราไหล และแรงดันระบบพร้อมกัน', 'Log current, voltage, flow and pressure at the same time.', '同时记录电流、电压、流量和压力。', '電流、電圧、流量、圧力を同時記録します。'),
    keywords: ['ปั๊มตัดต่อ', 'กินไฟ', 'short cycle', 'energy'],
    sources: ['handbook'],
  },
  {
    id: 'flood-contamination',
    category: 'troubleshooting',
    urgent: true,
    question: text('น้ำท่วมหัวบ่อหรือมีสารเคมีหกรอบบ่อ ใช้ต่อได้หรือไม่?', 'Can the well be used after flooding or a chemical spill?', '井口被淹或附近化学品泄漏后还能用吗？', '井戸元浸水・薬品流出後も使えますか？'),
    answer: text('ควรหยุดใช้ในงานอุปโภคบริโภคและป้องกันพื้นที่ทันที ตรวจสภาพฝาปิด ซีล ระบบไฟ และทางไหลเข้าบ่อ ประสานผู้เชี่ยวชาญ/เจ้าหน้าที่ตามความรุนแรง สูบล้าง ฆ่าเชื้อ หรือฟื้นฟูตามสาเหตุ แล้วตรวจยืนยันก่อนเปิดใช้ ห้ามลงไปในบ่อหรือพื้นที่อับอากาศ', 'Stop potable use and secure the area. Inspect seals, electrical safety and entry pathways; involve specialists or authorities as needed, remediate to the cause and verify quality before reopening. Never enter confined spaces.', '应停止生活饮用用途并封控现场，检查密封、电气和污染进入路径；按严重程度联系专业人员或主管机关，完成修复和检测后再启用，严禁进入受限空间。', '生活・飲用利用を停止し、区域を確保します。密閉・電気・侵入経路を確認し、必要に応じ専門家・当局と対応、復旧と水質確認後に再開します。閉所へ入ってはいけません。'),
    action: text('เหตุฉุกเฉินให้เน้นความปลอดภัยและหยุดการแพร่กระจายก่อน', 'Prioritize safety and containment before restoration.', '紧急情况下先确保安全并控制扩散。', '復旧より安全確保と拡散防止を優先します。'),
    keywords: ['น้ำท่วม', 'สารเคมี', 'ปนเปื้อน', 'flood', 'spill', 'urgent'],
    sources: ['quality', 'handbook'],
  },
  {
    id: 'quotation-information',
    category: 'cost',
    popular: true,
    question: text('ต้องส่งข้อมูลอะไรเพื่อขอราคา?', 'What information is needed for a useful quotation?', '询价需要提供哪些资料？', '適切な見積りに必要な情報は？'),
    answer: text('พิกัดและรูปพื้นที่ ปริมาณรายวัน/ช่วงพีก คุณภาพเป้าหมาย ชั่วโมงใช้งาน ข้อจำกัดทางเข้า ไฟฟ้า จุดระบายน้ำ เอกสารบ่อเดิม และเงื่อนไขรับมอบ หากข้อมูลชั้นน้ำยังไม่พอ ควรแยกงบสำรวจ งานเจาะตามรายการจริง และงานระบบหลังทราบผล ไม่ควรบังคับราคาเหมารวมจากความลึกที่เดา', 'Provide coordinates and site photos, daily and peak demand, target quality, schedule, access, power, discharge, existing records and acceptance criteria. Where geology is uncertain, separate investigation, measured drilling and post-test system scope.', '提供坐标和现场照片、日量与峰值、目标水质、运行时段、通道、电源、排水、既有井资料和验收条件；地质不确定时应分开勘查、按实钻井和试验后系统费用。', '座標・現場写真、日量・ピーク、水質、運転、進入、電源、排水、既存資料、受入条件を提示し、不確実な地質では調査・実績掘削・試験後設備を分けます。'),
    action: text('เปรียบเทียบขอบเขตและเอกสารส่งมอบ ไม่ใช่ยอดรวมอย่างเดียว', 'Compare scope and deliverables, not only the total price.', '比较工作范围和交付资料，而不只看总价。', '総額だけでなく範囲と成果物を比較します。'),
    keywords: ['ราคา', 'ใบเสนอราคา', 'quotation', 'budget', 'ขอบเขต'],
    sources: ['handbook', 'permit'],
  },
  {
    id: 'handover-documents',
    category: 'cost',
    question: text('รับมอบงานบ่อน้ำบาดาลควรได้เอกสารอะไร?', 'What should be included at well handover?', '水井验收应取得哪些资料？', '井戸引渡しで受け取る資料は？'),
    answer: text('ควรมีใบอนุญาตและเลขบ่อ แบบ/รายงานประวัติบ่อ บันทึกชั้นดินหิน ตำแหน่งท่อกรองและซีล ผลพัฒนาบ่อและ pumping test ผลวิเคราะห์น้ำ รายละเอียดปั๊ม/ตู้/มิเตอร์ แบบ as-built คู่มือ อะไหล่ การรับประกัน baseline และแผนบำรุงรักษา', 'Require permits and well ID, completion and geological logs, screen and seal details, development and pumping-test results, water analysis, equipment data, as-builts, manuals, spares, warranty, baseline and maintenance plan.', '应取得许可和井号、成井及地层记录、筛管与封隔、洗井和抽水试验、水质、泵柜水表资料、竣工图、手册、备件、保修、基线和维护计划。', '許可・井戸番号、完成・地質記録、スクリーン・シール、洗浄・揚水試験、水質、機器、竣工図、取説、予備品、保証、基準値、保守計画を受領します。'),
    action: text('ผูกงวดสุดท้ายกับเอกสารและผลทดสอบที่ครบถ้วน', 'Tie final payment to complete records and test results.', '将尾款与完整资料和试验结果挂钩。', '最終支払を完全な記録・試験結果と連動させます。'),
    keywords: ['รับมอบ', 'เอกสาร', 'as-built', 'handover', 'warranty'],
    sources: ['handbook', 'permit'],
  },
  {
    id: 'price-guarantee',
    category: 'cost',
    question: text('รับประกันทั้งราคา ความลึก ปริมาณ และคุณภาพพร้อมกันได้หรือไม่?', 'Can price, depth, yield and quality all be guaranteed?', '价格、深度、水量和水质能同时保证吗？', '価格・深度・水量・水質をすべて保証できますか？'),
    answer: text('ก่อนมีข้อมูลเพียงพอไม่ควรรับเงื่อนไขที่ทำให้ดูแน่นอนเกินจริง ธรณีวิทยาเป็นความไม่แน่นอนใต้ดินที่ควรบริหารด้วยผลสำรวจ รายการราคาเป็นหน่วย เกณฑ์ตัดสินใจระหว่างเจาะ งบเผื่อ และเกณฑ์รับมอบหลังทดสอบ แยกสิ่งที่ผู้รับเหมาควบคุมได้ออกจากผลธรรมชาติ', 'Not credibly before adequate evidence. Manage subsurface uncertainty with investigation, unit rates, drilling decision gates, contingency and post-test acceptance criteria, separating workmanship from natural outcomes.', '在证据不足前不应承诺全部确定。应通过勘查、单价、钻进决策点、预备费和试验后验收管理地下不确定性，并区分施工质量与自然结果。', '十分な根拠前にすべてを保証するのは不適切です。調査、単価、掘削判断点、予備費、試験後基準で地下の不確実性を管理し、施工責任と自然条件を分けます。'),
    action: text('ให้สัญญาระบุ assumption, exclusion และ decision gate', 'Document assumptions, exclusions and decision gates.', '合同应写明假设、除外项和决策点。', '前提、除外、判断ゲートを契約に明記します。'),
    keywords: ['รับประกัน', 'ราคาเหมารวม', 'guarantee', 'contract', 'risk'],
    sources: ['handbook'],
  },
  {
    id: 'sustainable-use',
    category: 'cost',
    question: text('ใช้น้ำบาดาลอย่างไรให้คุ้มค่าและยั่งยืน?', 'How can groundwater be used efficiently and sustainably?', '如何高效、可持续地使用地下水？', '地下水を効率的・持続的に使うには？'),
    answer: text('สูบไม่เกินอัตราที่ทดสอบและเงื่อนไขใบอนุญาต วัดทุกวัน แก้รั่ว แยกคุณภาพตามงาน ใช้น้ำหมุนเวียนเมื่อทำได้ มีถังสมดุล ติดตามระดับน้ำ/พลังงาน/คุณภาพ และทบทวน water balance เมื่อการผลิตหรือจำนวนผู้ใช้งานเปลี่ยน การประหยัดน้ำช่วยลดทั้งความเสี่ยง ค่าพลังงาน และค่าปรับปรุงน้ำ', 'Stay within tested and permitted rates, meter use, repair leaks, match quality to use, reuse where suitable, buffer demand with storage and trend water level, energy and quality. Revisit the water balance whenever operations change.', '不超过试验和许可流量，计量用水、修漏、按用途分级水质、适当回用、用储水调峰，并跟踪水位、能耗和水质；运营变化时重做用水平衡。', '試験・許可流量内で運転し、計量、漏水修理、用途別水質、適切な再利用、貯留、水位・電力・水質の傾向管理を行い、事業変更時に水収支を見直します。'),
    action: text('ตั้ง KPI เป็นน้ำต่อหน่วยผลิต ไม่ใช่ดูยอดรวมอย่างเดียว', 'Track water per production unit, not only total volume.', '以单位产量用水作为KPI，而非只看总量。', '総量だけでなく生産単位当たり水量をKPIにします。'),
    keywords: ['ยั่งยืน', 'ประหยัด', 'sustainable', 'water balance', 'KPI'],
    sources: ['handbook', 'reporting'],
  },
]

