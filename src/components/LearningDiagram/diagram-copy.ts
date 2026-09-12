import type { SiteLocale } from '@/i18n/config'
import { faqDiagramCopy } from './faq-diagram-copy'

export type DiagramKind = 'aquifer' | 'well' | 'system' | 'quality'
type Point = { title: string; text: string }
export type DiagramCopy = { title: string; note: string; points: [Point, Point, Point, Point] }

// Percentages refer to the uncropped original illustrations, not measured site data.
export const diagramPositions: Record<DiagramKind, { x: number; y: number }[]> = {
  aquifer: [{ x: 20, y: 39 }, { x: 40, y: 55 }, { x: 55, y: 66 }, { x: 74, y: 81 }],
  well: [{ x: 45, y: 24 }, { x: 27, y: 43 }, { x: 39, y: 68 }, { x: 83, y: 28 }],
  system: [{ x: 17, y: 63 }, { x: 54, y: 30 }, { x: 71, y: 32 }, { x: 91, y: 45 }],
  quality: [{ x: 10, y: 45 }, { x: 46, y: 44 }, { x: 71, y: 46 }, { x: 89, y: 55 }],
}

const basicsDiagramCopy: Record<SiteLocale, Record<'aquifer' | 'well', DiagramCopy>> = {
  th: {
    aquifer: {
      title: 'ตามน้ำจากผิวดินลงไปถึงบ่อ',
      note: 'ภาพจำลองเพื่ออธิบายแนวคิด ไม่ใช่หน้าตัดของพื้นที่จริงหรือแบบก่อสร้าง',
      points: [
        { title: 'น้ำซึมลงดิน', text: 'น้ำฝนบางส่วนซึมผ่านดินลงไป ขณะเดียวกันบางส่วนไหลบนผิวดินหรือระเหยกลับไป' },
        { title: 'น้ำอยู่ในช่องว่าง', text: 'สีน้ำเงินแทนน้ำในช่องว่างของกรวด ทราย หรือหิน ไม่ใช่แม่น้ำใต้ดินที่เป็นโพรงเปิด' },
        { title: 'บางชั้นให้น้ำผ่านยาก', text: 'ชั้นดินหรือหินที่ซึมผ่านต่ำช่วยแยกชั้นน้ำ แต่ไม่ได้หมายความว่าน้ำจะผ่านไม่ได้เลย' },
        { title: 'บ่อรับน้ำจากชั้นเป้าหมาย', text: 'ช่วงรับน้ำของบ่อต้องเลือกจากข้อมูลชั้นดินและหิน ไม่ใช่เลือกความลึกจากภาพนี้' },
      ],
    },
    well: {
      title: 'สูบทดสอบแล้วต้องดูอะไรบ้าง?',
      note: 'ภาพจำลองแสดงแนวคิดและตำแหน่งโดยประมาณ ไม่ใช่แบบติดตั้งอุปกรณ์',
      points: [
        { title: 'ปากบ่อและท่อกรุ', text: 'ส่วนหัวบ่อและท่อกรุช่วยปกป้องบ่อ การผนึกต้องออกแบบตามสภาพจริงเพื่อกันน้ำสกปรกไหลเข้า' },
        { title: 'ระดับน้ำก่อนสูบ', text: 'วัดระดับน้ำเมื่อหยุดสูบและระดับน้ำฟื้นตัว ใช้เป็นค่าอ้างอิงในการทดสอบ' },
        { title: 'ระดับน้ำขณะสูบ', text: 'เมื่อสูบน้ำ ระดับน้ำรอบบ่ออาจลดลง ส่วนต่างจากก่อนสูบเรียกว่า “ระยะน้ำลด” หรือ Drawdown' },
        { title: 'วัดและบันทึกตามเวลา', text: 'บันทึกอัตราสูบ ระดับน้ำ และเวลา รวมถึงการฟื้นตัวหลังหยุดสูบ เพื่อให้ผู้เชี่ยวชาญแปลผล' },
      ],
    },
  },
  en: {
    aquifer: {
      title: 'Follow the water from the surface to a well',
      note: 'A teaching illustration, not a cross-section of a real site or a construction drawing.',
      points: [
        { title: 'Water seeps into the ground', text: 'Some rain enters the soil; some runs across the surface or returns to the air by evaporation.' },
        { title: 'Water occupies small spaces', text: 'Blue represents water in gravel, sand or rock openings—not an open underground river.' },
        { title: 'Some layers transmit water slowly', text: 'Low-permeability soil or rock separates water-bearing layers, but is not necessarily completely watertight.' },
        { title: 'The well receives water from a target layer', text: 'Select the intake interval using actual soil and rock records, not a depth inferred from this illustration.' },
      ],
    },
    well: {
      title: 'What should a pumping test measure?',
      note: 'A conceptual illustration with approximate positions, not an equipment installation drawing.',
      points: [
        { title: 'Wellhead and casing', text: 'The wellhead and casing protect the well. Sealing must suit site conditions to keep dirty surface water out.' },
        { title: 'Water level before pumping', text: 'Measure after pumping has stopped and the water level has recovered. This is the test reference level.' },
        { title: 'Water level during pumping', text: 'Pumping can lower the water level around the well. The difference from the pre-pumping level is called drawdown.' },
        { title: 'Measurements over time', text: 'Record pumping rate, water level and time, including recovery after stopping, for specialist interpretation.' },
      ],
    },
  },
  zh: {
    aquifer: {
      title: '从地表到水井，看看水的去向',
      note: '本图仅用于讲解概念，不代表真实场地剖面，也不是施工图。',
      points: [
        { title: '水渗入土壤', text: '部分雨水渗入土壤，另一些在地表流动或蒸发回空气中。' },
        { title: '水储存在孔隙中', text: '蓝色表示砾石、砂或岩石孔隙中的水，并非空洞中的地下河。' },
        { title: '有些地层透水较慢', text: '低渗透性的土层或岩层分隔含水层，但不一定完全不透水。' },
        { title: '水井从目标地层取水', text: '进水段应根据实际土层和岩层记录确定，不能从本图推断钻井深度。' },
      ],
    },
    well: {
      title: '抽水试验需要测量什么？',
      note: '本图为概念示意，位置仅供参考，不是设备安装图。',
      points: [
        { title: '井口与套管', text: '井口和套管保护水井，密封方式须依据现场条件设计，防止污水流入。' },
        { title: '抽水前的水位', text: '停泵并待水位恢复后测量，作为本次试验的参考水位。' },
        { title: '抽水时的水位', text: '抽水可能使井周水位下降，与抽水前水位的差值称为降深（Drawdown）。' },
        { title: '按时间记录数据', text: '记录抽水流量、水位和时间，包括停泵后的恢复过程，供专业人员解释。' },
      ],
    },
  },
  ja: {
    aquifer: {
      title: '地表から井戸まで、水の行方をたどる',
      note: '概念を説明する模式図です。実際の敷地の断面図や施工図ではありません。',
      points: [
        { title: '水が地面にしみ込む', text: '雨の一部は土にしみ込み、別の一部は地表を流れたり蒸発したりします。' },
        { title: '水は隙間に存在する', text: '青色は砂礫や岩の隙間にある水を表し、空洞の地下河川を示しているわけではありません。' },
        { title: '水が通りにくい層もある', text: '透水性の低い土や岩が帯水層を隔てますが、必ずしも完全に水を遮断するわけではありません。' },
        { title: '狙った地層から取水する', text: '取水区間は実際の地層記録を基に決めます。この図から掘削深度は判断できません。' },
      ],
    },
    well: {
      title: '揚水試験では何を測る？',
      note: '位置は概略を示すもので、設備の据付図ではありません。',
      points: [
        { title: '井戸の頭部とケーシング', text: '井戸を保護する部分です。汚れた地表水が入らないよう、現場条件に合った密閉が必要です。' },
        { title: '揚水前の水位', text: '揚水を止め、水位が回復してから測定し、試験の基準水位とします。' },
        { title: '揚水中の水位', text: '揚水で井戸周辺の水位が下がることがあります。揚水前との差を水位低下量（Drawdown）と呼びます。' },
        { title: '時間とともに記録する', text: '揚水量、水位、時間を記録し、停止後の回復も測定して専門家が解釈します。' },
      ],
    },
  },
}

export const diagramCopy: Record<SiteLocale, Record<DiagramKind, DiagramCopy>> = {
  th: { ...basicsDiagramCopy.th, ...faqDiagramCopy.th },
  en: { ...basicsDiagramCopy.en, ...faqDiagramCopy.en },
  zh: { ...basicsDiagramCopy.zh, ...faqDiagramCopy.zh },
  ja: { ...basicsDiagramCopy.ja, ...faqDiagramCopy.ja },
}
