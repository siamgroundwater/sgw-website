import type { SiteLocale } from '@/i18n/config'
import type { DiagramCopy } from './diagram-copy'

export const faqDiagramCopy: Record<SiteLocale, Record<'system' | 'quality', DiagramCopy>> = {
  th: {
    system: { title: 'ดูระบบจากบ่อไปถึงจุดใช้น้ำ', note: 'ภาพจำลองเพื่อการเรียนรู้ อุปกรณ์และสีในภาพไม่ใช่คำแนะนำให้ติดตั้งหรือผลตรวจของระบบจริง', points: [
      { title: 'บ่อและเครื่องสูบ', text: 'ดูทั้งน้ำที่บ่อให้ได้และการทำงานของปั๊ม อาการน้ำไหลน้อยไม่ได้บอกสาเหตุได้จากจุดเดียว' },
      { title: 'ระบบปรับปรุงคุณภาพน้ำ', text: 'เลือกระบบจากผลตรวจน้ำและวัตถุประสงค์การใช้ ไม่จำเป็นต้องมีอุปกรณ์ทุกชิ้นเหมือนในภาพ' },
      { title: 'ถังพัก', text: 'ถังช่วยเก็บน้ำไว้ให้ใช้ในช่วงที่ต้องการมาก ต้องดูแลความสะอาดและกำหนดขนาดตามการใช้งาน' },
      { title: 'ท่อและจุดใช้น้ำ', text: 'ถ้าปลายทางมีปัญหา ให้ตรวจท่อ วาล์ว และอุปกรณ์ร่วมด้วย ไม่สรุปทันทีว่าต้องเจาะบ่อใหม่' },
    ] },
    quality: { title: 'จากตัวอย่างน้ำไปสู่ระบบที่เหมาะกับการใช้', note: 'ภาพนี้อธิบายลำดับการตัดสินใจ ไม่ใช่ชุดเครื่องกรองที่ทุกโครงการต้องใช้', points: [
      { title: 'เก็บตัวอย่างให้ถูกจุด', text: 'น้ำดิบ น้ำหลังระบบ และน้ำที่จุดใช้ตอบคนละคำถาม ให้ห้องแล็บแนะนำภาชนะและวิธีเก็บ' },
      { title: 'ตรวจตามวัตถุประสงค์', text: 'เลือกรายการตรวจให้เหมาะกับการใช้และความเสี่ยง น้ำใสหรือค่าของแข็งละลายทั้งหมด (TDS) ต่ำเพียงอย่างเดียว ยังยืนยันไม่ได้ว่าดื่มได้' },
      { title: 'เลือกระบบจากผลตรวจ', text: 'ให้ผู้เชี่ยวชาญเลือกกระบวนการที่แก้ปัญหาที่พบจริง ไม่เลือกจากสีหรือกลิ่นเพียงอย่างเดียว' },
      { title: 'ตรวจยืนยันก่อนใช้', text: 'ตรวจน้ำหลังปรับปรุงและที่จุดใช้ตามแผน เพื่อยืนยันว่าเหมาะกับการใช้งาน แล้วติดตามต่อเนื่อง' },
    ] },
  },
  en: {
    system: { title: 'Follow the system from well to tap', note: 'A teaching illustration. Equipment and colours are not an installation recommendation or real test results.', points: [
      { title: 'Well and pump', text: 'Consider both the water available from the well and pump performance. Low flow alone does not identify the cause.' },
      { title: 'Water treatment', text: 'Choose treatment from water-test results and intended use. A real system need not include every device shown.' },
      { title: 'Storage tank', text: 'Storage supports demand peaks. Keep it clean and size it for actual use.' },
      { title: 'Pipes and points of use', text: 'Check pipes, valves and equipment when a problem appears at the tap. Do not immediately assume a new well is needed.' },
    ] },
    quality: { title: 'From a water sample to suitable treatment', note: 'This illustrates a decision process, not a filter package required for every project.', points: [
      { title: 'Sample the right point', text: 'Raw water, treated water and water at the tap answer different questions. Ask the laboratory about containers and sampling methods.' },
      { title: 'Test for the intended use', text: 'Choose tests for the use and site risks. Clear water or low total dissolved solids (TDS) alone does not establish drinking-water safety.' },
      { title: 'Choose treatment from the results', text: 'Have a specialist select processes for the problems actually measured, not just water colour or smell.' },
      { title: 'Verify before use', text: 'Test treated water and points of use according to the plan, confirm suitability, and keep monitoring.' },
    ] },
  },
  zh: {
    system: { title: '从水井到用水点，逐段看系统', note: '本图仅用于教学，设备与颜色不代表安装建议或实际检测结果。', points: [
      { title: '水井与水泵', text: '同时检查水井供水能力和水泵运行情况，仅凭流量下降不能确定原因。' },
      { title: '水质处理', text: '根据水质检测结果和用途选择处理工艺，实际系统不必包含图中所有设备。' },
      { title: '储水箱', text: '储水可应对用水高峰，应保持清洁并按实际需求确定容量。' },
      { title: '管道与用水点', text: '末端出现问题时，也要检查管道、阀门及设备，不应立即认定需要新钻水井。' },
    ] },
    quality: { title: '从水样到适合用途的处理系统', note: '本图说明决策步骤，并非每个项目都必须安装的过滤设备组合。', points: [
      { title: '在正确位置取样', text: '原水、处理后水和末端水反映不同问题，容器与取样方法应咨询实验室。' },
      { title: '按用途安排检测', text: '根据用途和场地风险选择检测项目，水清澈或总溶解固体（TDS）低本身不能证明饮用安全。' },
      { title: '依据结果选择工艺', text: '由专业人员针对实际检测到的问题选择工艺，不应只凭颜色或气味决定。' },
      { title: '使用前验证', text: '按计划检测处理后及末端水，确认适合用途，并持续监测。' },
    ] },
  },
  ja: {
    system: { title: '井戸から蛇口まで、順に確認する', note: '学習用の模式図です。機器や色は設置推奨や実際の検査結果を表しません。', points: [
      { title: '井戸とポンプ', text: '井戸の供給能力とポンプの運転状況を確認します。流量低下だけでは原因を特定できません。' },
      { title: '水質処理', text: '分析結果と用途から処理方法を選びます。図の機器をすべて設置する必要はありません。' },
      { title: '貯水タンク', text: '使用量のピークに備える設備です。清潔に保ち、実際の用途に合わせて容量を決めます。' },
      { title: '配管と使用地点', text: '蛇口側の問題では配管、弁、機器も確認し、すぐに新しい井戸が必要とは判断しません。' },
    ] },
    quality: { title: '採水から用途に合った処理へ', note: '判断の手順を説明する図です。すべての計画に必要な機器の組合せではありません。', points: [
      { title: '適切な地点で採水', text: '原水、処理後、蛇口の水では確認する内容が異なります。容器と方法は検査機関に相談します。' },
      { title: '用途に応じて検査', text: '用途と敷地のリスクに合わせて項目を選びます。透明さや総溶解固形分（TDS）の低さだけでは飲用安全性を確認できません。' },
      { title: '結果から処理を選ぶ', text: '実際に測定した問題に合う方法を専門家が選びます。色やにおいだけで決めません。' },
      { title: '使用前に確認', text: '計画に沿って処理後と使用地点の水を検査し、用途への適合を確かめて継続的に監視します。' },
    ] },
  },
}
