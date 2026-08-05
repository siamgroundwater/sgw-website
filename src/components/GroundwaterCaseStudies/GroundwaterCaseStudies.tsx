'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  Download,
  Droplets,
  Factory,
  FlaskConical,
  Gauge,
  History,
  Info,
  RefreshCcw,
  Search,
  ShieldAlert,
  TestTube2,
  TrendingDown,
  Wrench,
  Zap,
} from 'lucide-react'
import { localeInfo, localePath, type LocalizedLocale } from '@/i18n/config'
import './GroundwaterCaseStudies.css'

type SymptomId = 'flow' | 'sand' | 'quality' | 'power'
type ChapterId = 'triage' | 'workflow' | 'cases' | 'worksheet' | 'prevention' | 'quiz'

type CaseStudy = {
  title: string
  setting: string
  symptom: string
  evidence: string
  finding: string
  action: string
  verify: string
  lesson: string
}

type CourseCopy = {
  summary: { duration: string; durationValue: string; level: string; levelValue: string; cases: string; casesValue: string }
  outcomesTitle: string
  outcomes: string[]
  jumpLabel: string
  chapters: Record<ChapterId, string>
  visualAlt: { comparison: string; field: string }
  visualCaption: { comparison: string; field: string }
  triage: {
    eyebrow: string
    title: string
    intro: string
    stopTitle: string
    stopItems: string[]
    selectorTitle: string
    selectorHint: string
    labels: Record<SymptomId, string>
    details: Record<SymptomId, { signal: string; causes: string[]; collect: string[]; first: string; avoid: string; escalate: string }>
    likely: string
    collect: string
    first: string
    avoid: string
    escalate: string
  }
  workflow: {
    eyebrow: string
    title: string
    intro: string
    steps: { title: string; detail: string; output: string }[]
    outputLabel: string
    principleTitle: string
    principle: string
  }
  cases: { eyebrow: string; title: string; intro: string; labels: { setting: string; symptom: string; evidence: string; finding: string; action: string; verify: string; lesson: string }; items: CaseStudy[] }
  worksheet: {
    eyebrow: string
    title: string
    intro: string
    baseline: string
    current: string
    flow: string
    staticLevel: string
    pumpingLevel: string
    sandFlag: string
    qualityFlag: string
    resultTitle: string
    metrics: { flowChange: string; staticShift: string; drawdownChange: string }
    pathways: Record<'sand' | 'quality' | 'aquifer' | 'well' | 'equipment' | 'stable', { title: string; text: string; next: string }>
    nextLabel: string
    screeningNote: string
    copy: string
    copied: string
    download: string
    reportTitle: string
    reportLabels: { generated: string; observations: string; pathway: string; next: string; disclaimer: string }
  }
  prevention: {
    eyebrow: string
    title: string
    intro: string
    checklistTitle: string
    checklist: string[]
    complete: string
    remaining: string
    recordsTitle: string
    records: { title: string; detail: string }[]
  }
  quiz: {
    eyebrow: string
    title: string
    intro: string
    questions: { question: string; choices: string[]; correct: number; explanation: string }[]
    correct: string
    review: string
    score: string
    retry: string
    perfect: string
  }
  sources: { eyebrow: string; title: string; reviewed: string; labels: string[] }
  next: { title: string; text: string; calculator: string; contact: string }
}

const chapterIds: ChapterId[] = ['triage', 'workflow', 'cases', 'worksheet', 'prevention', 'quiz']
const chapterIcons = { triage: ShieldAlert, workflow: Search, cases: BookOpenCheck, worksheet: BarChart3, prevention: ClipboardCheck, quiz: CheckCircle2 }
const symptomIcons = { flow: TrendingDown, sand: TestTube2, quality: FlaskConical, power: Zap }

const copyByLocale: Record<LocalizedLocale, CourseCopy> = {
  th: {
    summary: { duration: 'เวลาเรียน', durationValue: '35–45 นาที', level: 'ระดับ', levelValue: 'เจ้าของบ่อ–ช่างเทคนิค', cases: 'กรณีศึกษา', casesValue: '5 สถานการณ์จริง' },
    outcomesTitle: 'เมื่อเรียนจบ คุณจะสามารถ',
    outcomes: ['แยกอาการของบ่อออกจากปัญหาปั๊ม ท่อ และระบบไฟฟ้า', 'เลือกข้อมูลภาคสนามที่ต้องวัดก่อนตัดสินใจซ่อม', 'อ่านแนวโน้มอัตราการไหล ระดับน้ำ และระยะน้ำลดอย่างเป็นระบบ', 'ระบุสัญญาณที่ต้องหยุดเดินระบบและเรียกผู้เชี่ยวชาญ'],
    jumpLabel: 'ไปยังหัวข้อ',
    chapters: { triage: 'คัดกรองอาการ', workflow: 'ลำดับตรวจสอบ', cases: 'กรณีศึกษา', worksheet: 'แบบประเมิน', prevention: 'ป้องกันปัญหา', quiz: 'ทบทวนความรู้' },
    visualAlt: { comparison: 'ภาพตัดเปรียบเทียบบ่อน้ำบาดาลที่สมบูรณ์กับบ่อที่ตะแกรงอุดตันและมีทราย', field: 'ทีมช่างตรวจระดับน้ำ ระบบไฟฟ้า อัตราการไหล และเก็บตัวอย่างน้ำที่หน้างาน' },
    visualCaption: { comparison: 'อาการน้ำลดไม่ได้แปลว่าปั๊มเสียเสมอไป—ตะแกรง กรวดกรุ ระดับน้ำในชั้นหิน และระบบส่งน้ำต้องถูกแยกตรวจ', field: 'การวินิจฉัยที่ดีเริ่มจากข้อมูลหลายชุดในเวลาเดียวกัน ไม่ใช่จากอาการเพียงข้อเดียว' },
    triage: {
      eyebrow: 'เริ่มจากความปลอดภัย', title: 'อาการเดียว อาจมีหลายสาเหตุ', intro: 'เลือกอาการหลักเพื่อดูสาเหตุที่ควรตรวจ ข้อมูลที่ต้องเก็บ และสิ่งที่ไม่ควรทำ การ์ดนี้เป็นแนวทางคัดกรอง ไม่ใช่คำวินิจฉัยจากระยะไกล',
      stopTitle: 'หยุดหรือลดการสูบทันที เมื่อพบสัญญาณเหล่านี้', stopItems: ['ปั๊มทำงานแห้ง เกิดเสียงคาวิเทชัน สั่น หรือร้อนผิดปกติ', 'ทรายเพิ่มขึ้นอย่างฉับพลัน น้ำขุ่นจัด หรือมีชิ้นส่วนวัสดุบ่อ', 'กระแสไฟ แรงดัน หรืออุณหภูมิมอเตอร์ผิดปกติและตัดซ้ำ', 'คุณภาพน้ำเปลี่ยนฉับพลัน มีกลิ่นสารเคมี น้ำมัน หรือสงสัยการปนเปื้อน'],
      selectorTitle: 'เลือกอาการหลัก', selectorHint: 'กดเพื่อดูแนวทางตรวจสอบ', labels: { flow: 'น้ำไหลน้อยลง', sand: 'มีทรายหรือน้ำขุ่น', quality: 'คุณภาพน้ำเปลี่ยน', power: 'ปั๊มตัดหรือกินไฟสูง' },
      details: {
        flow: { signal: 'ผลผลิตลด ความดันตก หรือใช้เวลาสูบนานขึ้น', causes: ['ระดับน้ำสถิตลดจากฤดูกาล ภัยแล้ง หรือบ่อใกล้เคียง', 'ตะแกรงและกรวดกรุอุดตันจากตะกรัน ตะกอน หรือชีวภาพ', 'ปั๊มสึก ท่อรั่ว วาล์วเปิดไม่สุด หรือไฟฟ้าผิดปกติ'], collect: ['อัตราการไหลและความดันเทียบค่าฐาน', 'ระดับน้ำสถิต ระดับขณะสูบ และการคืนตัว', 'แรงดันไฟ กระแสไฟ และตำแหน่งวาล์ว'], first: 'ยืนยันเครื่องมือวัด แล้วทดสอบที่อัตราสูบเดิมก่อนเปลี่ยนขนาดปั๊ม', avoid: 'อย่าเพิ่มปั๊มให้ใหญ่ขึ้นทันที เพราะอาจเร่งน้ำลดและดึงทราย', escalate: 'หากระยะน้ำลดมากขึ้นหรือปั๊มเกือบพ้นน้ำ ให้หยุดและทำ pumping test โดยผู้เชี่ยวชาญ' },
        sand: { signal: 'เห็นเม็ดทราย ตะกอน น้ำขุ่น หรืออุปกรณ์สึกเร็วกว่าปกติ', causes: ['ตะแกรงชำรุดหรือช่องเปิดไม่เหมาะกับชั้นหิน', 'กรวดกรุเคลื่อน การพัฒนาบ่อไม่สมบูรณ์ หรือตะกอนเต็มก้นบ่อ', 'สูบแรงเกินสมรรถนะบ่อ ทำให้ความเร็วผ่านตะแกรงสูง'], collect: ['ตัวอย่างก่อนและหลังเริ่มสูบ พร้อมเวลาที่เก็บ', 'ปริมาณ/ขนาดเม็ดทรายและอัตราการสูบ', 'ความลึกบ่อปัจจุบันเทียบข้อมูลก่อสร้าง'], first: 'ลดอัตราสูบ เก็บตัวอย่างตามเวลา และตรวจว่าทรายลดลงหรือเพิ่มขึ้น', avoid: 'อย่าเดินปั๊มต่อด้วยอัตราสูงหรือปล่อยทรายผ่านระบบกรองและถัง', escalate: 'ทรายเพิ่มฉับพลันหรือความลึกบ่อลดลงมาก ควรตรวจด้วยกล้องและประเมินโครงสร้างบ่อ' },
        quality: { signal: 'สี กลิ่น รส ความเค็ม คราบสนิม หรือตะกรันเปลี่ยนไป', causes: ['เหล็ก แมงกานีส ความกระด้าง หรือสารละลายธรรมชาติเปลี่ยน', 'น้ำเค็มรุก การไหลข้ามชั้นผ่านท่อกรุชำรุด หรือสูบมากเกินไป', 'การปนเปื้อนจากผิวดิน ระบบบำบัด ของเสีย หรือกิจกรรมรอบบ่อ'], collect: ['ตัวอย่างจากจุดเก็บที่ถูกต้องส่งห้องปฏิบัติการ', 'EC/TDS, pH, ความขุ่น และพารามิเตอร์ตามการใช้งาน', 'ประวัติฝน น้ำท่วม การซ่อม และกิจกรรมรอบบ่อ'], first: 'แยกน้ำออกจากการใช้งานที่มีความเสี่ยง เก็บตัวอย่างใหม่ และยืนยันผลวิเคราะห์', avoid: 'อย่าตัดสินจากความใสหรือกลิ่นเพียงอย่างเดียว และอย่าผสมน้ำเพื่อกลบค่าโดยไม่มีแบบ', escalate: 'สงสัยสารเคมี/จุลชีพ น้ำเค็มเพิ่มเร็ว หรือค่าเกินเกณฑ์ ต้องให้ผู้เชี่ยวชาญประเมินทันที' },
        power: { signal: 'เบรกเกอร์ตัด กระแสสูง พลังงานต่อปริมาตรเพิ่ม หรือแรงดันไม่คงที่', causes: ['แรงดันตก เฟสไม่สมดุล จุดต่อหลวม หรืออุปกรณ์ควบคุมผิดปกติ', 'ระดับน้ำลดทำให้ระยะยกสูงขึ้น ปั๊มสึก หรือมีทรายขัด', 'ท่ออุดตัน วาล์วผิดตำแหน่ง เช็ควาล์วเสีย หรือมอเตอร์มีปัญหา'], collect: ['แรงดันและกระแสแต่ละเฟสขณะเริ่มและเดินเครื่อง', 'อัตราการไหล ความดัน ระดับน้ำขณะสูบ และเวลาเกิดเหตุ', 'ประวัติการตัด สัญญาณเตือน และพลังงานต่อ m³'], first: 'ให้ช่างไฟที่มีคุณสมบัติตรวจระบบควบคุมและบันทึกค่าพร้อมข้อมูลน้ำ', avoid: 'อย่าบายพาสอุปกรณ์ป้องกันหรือรีเซ็ตซ้ำโดยไม่หาสาเหตุ', escalate: 'มีกลิ่นไหม้ จุดต่อร้อน เฟสหาย หรือปั๊มตัดซ้ำ ให้แยกแหล่งจ่ายและเรียกผู้เชี่ยวชาญ' },
      },
      likely: 'สาเหตุที่ควรตรวจ', collect: 'ข้อมูลที่ต้องเก็บ', first: 'ขั้นแรกที่ปลอดภัย', avoid: 'อย่าทำ', escalate: 'ควรเรียกผู้เชี่ยวชาญเมื่อ',
    },
    workflow: {
      eyebrow: 'กระบวนการวินิจฉัย', title: 'ตรวจจากข้อมูลราคาถูกไปหาหลักฐานเชิงลึก', intro: 'ลำดับนี้ช่วยลดการถอดปั๊มหรือฟื้นฟูบ่อโดยไม่รู้สาเหตุ และทำให้เปรียบเทียบผลก่อน–หลังได้', outputLabel: 'ผลลัพธ์',
      steps: [
        { title: 'ตั้งค่าฐาน', detail: 'รวบรวมแบบบ่อ รายงานเจาะ รุ่นปั๊ม ผล pumping test และผลน้ำเดิม', output: 'ค่าปกติที่ใช้อ้างอิง' },
        { title: 'ยืนยันอาการ', detail: 'ตรวจมิเตอร์ วาล์ว รอยรั่ว และถามว่าเริ่มเกิดเมื่อใด เกิดตลอดหรือเป็นช่วง', output: 'อาการที่วัดซ้ำได้' },
        { title: 'วัดระบบ', detail: 'บันทึกอัตราการไหล ความดัน แรงดันไฟ กระแสไฟ และพลังงานในเวลาเดียวกัน', output: 'แยกปั๊ม–ท่อ–ไฟฟ้า' },
        { title: 'วัดระดับน้ำ', detail: 'วัดระดับสถิต ระดับขณะสูบ ระยะน้ำลด และการคืนตัวด้วยอัตราสูบที่ทราบ', output: 'แยกชั้นน้ำ–บ่อ–ปั๊ม' },
        { title: 'ตรวจน้ำและทราย', detail: 'เก็บตัวอย่างตามเวลา บันทึกความขุ่น ทราย EC/TDS และส่งวิเคราะห์ตามความเสี่ยง', output: 'หลักฐานคุณภาพและตะกอน' },
        { title: 'ตรวจเชิงลึกตามเหตุ', detail: 'ถอดปั๊ม ตรวจความลึก กล้องบ่อ หรือทดสอบเพิ่มเติมเฉพาะเมื่อข้อมูลชี้นำ', output: 'ยืนยันสาเหตุทางกายภาพ' },
        { title: 'แก้ไขแบบมีเกณฑ์', detail: 'เลือกซ่อมปั๊ม ล้าง/ฟื้นฟูบ่อ ซ่อมท่อกรุ ปรับอัตราสูบ หรือปรับปรุงน้ำตามสาเหตุ', output: 'แผนงานและจุดหยุด' },
        { title: 'ทดสอบยืนยัน', detail: 'ทำซ้ำค่าหลักและ pumping test หลังงาน ก่อนกำหนดปั๊มหรืออัตราใช้งานใหม่', output: 'หลักฐานว่าดีขึ้นจริง' },
      ],
      principleTitle: 'หลักสำคัญ', principle: 'เปรียบเทียบ “ค่าฐานเดิม” กับ “ค่าปัจจุบัน” ภายใต้เงื่อนไขใกล้เคียงกันเสมอ ค่าเดี่ยวโดยไม่มีบริบทมักชี้สาเหตุไม่ได้',
    },
    cases: {
      eyebrow: 'เรียนจากหลักฐาน', title: '5 กรณีศึกษาแบบอาการ → หลักฐาน → การยืนยัน', intro: 'สถานการณ์จำลองจากรูปแบบปัญหาที่พบได้ทั่วไป ใช้เพื่อฝึกวิธีคิด ไม่ใช่ค่ารับประกันสำหรับทุกพื้นที่',
      labels: { setting: 'บริบท', symptom: 'อาการ', evidence: 'หลักฐานสำคัญ', finding: 'ข้อค้นพบ', action: 'การแก้ไข', verify: 'วิธียืนยันผล', lesson: 'บทเรียน' },
      items: [
        { title: 'บ่อโรงงานผลิตน้ำลดลง', setting: 'บ่อเดิมมีข้อมูลทดสอบและเดินเครื่องทุกวัน', symptom: 'อัตราการไหลลด 35% แต่ปั๊มยังทำงาน', evidence: 'ระดับสถิตใกล้เดิม แต่ระยะน้ำลดเพิ่มและการคืนตัวช้าลง', finding: 'ความสูญเสียบริเวณตะแกรงเพิ่มจากการอุดตัน มากกว่าปัญหาภูมิภาค', action: 'ฟื้นฟูบ่อตามชนิดตะกรันและตะกอน ไม่เพิ่มขนาดปั๊มก่อน', verify: 'ทดสอบสูบซ้ำที่อัตราเดิมและเทียบ specific capacity', lesson: 'ระดับสถิตคงเดิมแต่ drawdown เพิ่ม ชี้ให้ตรวจประสิทธิภาพบ่อก่อน' },
        { title: 'บ่อเกษตรมีทรายหลังเพิ่มอัตราสูบ', setting: 'เปลี่ยนปั๊มใหม่กำลังสูงกว่าเดิม', symptom: 'น้ำขุ่นและมีทรายช่วงสูบต่อเนื่อง', evidence: 'ทรายเพิ่มตามอัตราสูบ ความลึกบ่อลด และแรงดันแกว่ง', finding: 'การสูบเกินสมรรถนะร่วมกับปัญหากรวดกรุ/ตะแกรง', action: 'ลดอัตราสูบ ตรวจความลึกและสภาพตะแกรง แล้วออกแบบแก้ไข', verify: 'เก็บตัวอย่างทรายตามเวลาระหว่าง step test', lesson: 'ปั๊มใหญ่ขึ้นไม่ได้ทำให้บ่อให้น้ำได้มากขึ้นอย่างปลอดภัยเสมอ' },
        { title: 'ระบบกรองอุดตันและเกิดคราบแดง', setting: 'โรงแรมใช้น้ำบาดาลผ่านระบบกรอง', symptom: 'แรงดันตก ไส้กรองตันเร็ว และสุขภัณฑ์เป็นคราบ', evidence: 'เหล็ก/แมงกานีสและความขุ่นหลังสัมผัสอากาศสูงขึ้น', finding: 'การตกตะกอนในบ่อ ท่อ และระบบปรับปรุงน้ำ', action: 'ทบทวนสภาพบ่อ จุดเติมอากาศ การกรอง และรอบล้างย้อน', verify: 'วิเคราะห์น้ำดิบ–หลังบำบัดและติดตามแรงดันต่าง', lesson: 'ปัญหาคุณภาพน้ำกับสมรรถนะระบบมักเชื่อมโยงกัน' },
        { title: 'ความเค็มเพิ่มเฉพาะช่วงสูบหนัก', setting: 'พื้นที่เสี่ยงน้ำกร่อย ใช้บ่อหลายช่วงเวลา', symptom: 'EC/TDS เพิ่มเมื่อเดินปั๊มนาน', evidence: 'ค่าลดลงหลังพักบ่อ แต่กลับสูงเมื่อเพิ่มอัตราสูบ', finding: 'มีความเสี่ยงดึงน้ำเค็มหรือเกิดการไหลข้ามชั้น ต้องยืนยันโครงสร้างบ่อ', action: 'ลดอัตราสูบ เก็บ profile ตามเวลา และตรวจท่อกรุ/ช่วงรับน้ำ', verify: 'ติดตาม EC พร้อมอัตราสูบและระดับน้ำหลายรอบ', lesson: 'ต้องดูความสัมพันธ์กับเวลาและอัตราสูบ ไม่ใช่ผลตัวอย่างครั้งเดียว' },
        { title: 'ปั๊มตัดและค่าไฟเพิ่ม', setting: 'บ่ออาคารเดินตามแรงดันอัตโนมัติ', symptom: 'โอเวอร์โหลดตัดบ่อยและ kWh/m³ สูงขึ้น', evidence: 'กระแสไม่สมดุล ระดับสูบต่ำลง และอัตราการไหลลด', finding: 'มีทั้งปัญหาไฟฟ้าและภาระยกน้ำสูงขึ้น จึงต้องแยกสองระบบ', action: 'แก้ไฟฟ้าโดยช่างที่มีคุณสมบัติ ตรวจปั๊ม และปรับจุดทำงาน', verify: 'วัดกระแสทุกเฟส อัตราไหล ระดับน้ำ และ kWh/m³ หลังแก้', lesson: 'ห้ามสรุปว่าเป็นมอเตอร์หรือบ่อจากเบรกเกอร์ตัดเพียงอย่างเดียว' },
      ],
    },
    worksheet: {
      eyebrow: 'แบบประเมินภาคสนาม', title: 'เปรียบเทียบค่าฐานกับค่าปัจจุบัน', intro: 'กรอกค่าที่วัดภายใต้อัตราสูบและเงื่อนไขใกล้เคียงกัน ระบบจะจัด “เส้นทางตรวจลำดับแรก” เพื่อช่วยเตรียมข้อมูลคุยกับช่าง', baseline: 'ค่าฐานเดิม', current: 'ค่าปัจจุบัน', flow: 'อัตราการไหล', staticLevel: 'ระดับน้ำสถิตจากปากบ่อ', pumpingLevel: 'ระดับน้ำขณะสูบจากปากบ่อ', sandFlag: 'พบทรายหรือน้ำขุ่นผิดปกติ', qualityFlag: 'คุณภาพน้ำ/ความเค็มเปลี่ยนชัดเจน', resultTitle: 'แนวทางตรวจลำดับแรก', metrics: { flowChange: 'การเปลี่ยนแปลงอัตราไหล', staticShift: 'ระดับสถิตลึกขึ้น', drawdownChange: 'ระยะน้ำลดเปลี่ยน' },
      pathways: {
        sand: { title: 'ให้ความสำคัญกับทรายและโครงสร้างบ่อ', text: 'ลดอัตราสูบและเก็บตัวอย่างตามเวลา ก่อนที่ทรายจะทำให้ปั๊มและระบบเสียหาย', next: 'วัดปริมาณทราย ความลึกบ่อ และพิจารณากล้องบ่อตามหลักฐาน' },
        quality: { title: 'ให้ความสำคัญกับคุณภาพน้ำ', text: 'แยกน้ำจากการใช้ที่มีความเสี่ยงและยืนยันด้วยการเก็บตัวอย่าง/ห้องปฏิบัติการ', next: 'บันทึก EC/TDS, pH, ความขุ่น เวลาสูบ และส่งตรวจตามวัตถุประสงค์ใช้' },
        aquifer: { title: 'ตรวจการเปลี่ยนแปลงระดับชั้นน้ำก่อน', text: 'ระดับสถิตลึกขึ้นอย่างมีนัยสำคัญ อาจเกี่ยวกับฤดูกาล การเติมน้ำ หรือการสูบโดยรอบ', next: 'ตรวจระดับบ่อข้างเคียง ประวัติฝน และทำ pumping/recovery test ที่ควบคุมอัตรา' },
        well: { title: 'ตรวจประสิทธิภาพบ่อและช่วงรับน้ำ', text: 'อัตราไหลลดพร้อม drawdown เพิ่ม โดยระดับสถิตไม่ได้เปลี่ยนมาก สอดคล้องกับความสูญเสียในบ่อที่เพิ่มขึ้น', next: 'ตรวจ specific capacity, ตะกรัน/ตะกอน และวางแผนตรวจเชิงลึกก่อนฟื้นฟู' },
        equipment: { title: 'ตรวจปั๊ม ท่อ วาล์ว และไฟฟ้าก่อน', text: 'อัตราไหลลดแต่ระดับน้ำและ drawdown ใกล้เดิม จึงควรตรวจระบบเหนือบ่อก่อน', next: 'บันทึกแรงดัน กระแสไฟ ความดัน ตำแหน่งวาล์ว และตรวจรอยรั่ว/การสึก' },
        stable: { title: 'ยังไม่พบการเปลี่ยนแปลงเด่นจากค่าที่กรอก', text: 'รักษาการติดตามแนวโน้ม และตรวจว่าค่าถูกวัดด้วยวิธี/เงื่อนไขเดียวกัน', next: 'บันทึกค่ารายเดือน พร้อมอัตราสูบ ชั่วโมงทำงาน คุณภาพน้ำ และเหตุการณ์รอบบ่อ' },
      },
      nextLabel: 'ขั้นถัดไป', screeningNote: 'ผลนี้เป็นการคัดกรองจากข้อมูลจำกัด ไม่ใช่การวินิจฉัยหรือแบบซ่อม ค่าคลาดเคลื่อน เครื่องมือ และบริบทหน้างานอาจเปลี่ยนข้อสรุปได้', copy: 'คัดลอกสรุป', copied: 'คัดลอกแล้ว', download: 'ดาวน์โหลดสรุป', reportTitle: 'สรุปการคัดกรองบ่อน้ำบาดาล', reportLabels: { generated: 'วันที่สร้าง', observations: 'ข้อมูลที่กรอก', pathway: 'แนวทางตรวจลำดับแรก', next: 'ขั้นถัดไป', disclaimer: 'หมายเหตุ' },
    },
    prevention: {
      eyebrow: 'ลดปัญหาซ้ำ', title: 'บันทึกเล็กน้อย ช่วยให้วินิจฉัยได้เร็วขึ้นมาก', intro: 'ค่าฐานที่สม่ำเสมอทำให้เห็นความเสื่อมก่อนระบบหยุด และช่วยเลือกวิธีซ่อมที่ตรงสาเหตุ', checklistTitle: 'เช็กลิสต์ข้อมูลประจำบ่อ', complete: 'ครบแล้ว—พร้อมสร้างประวัติค่าฐาน', remaining: 'รายการที่ยังควรจัดเก็บ',
      checklist: ['แบบก่อสร้าง ความลึก ช่วงตะแกรง และข้อมูลกรวดกรุ', 'รุ่นปั๊ม ระดับติดตั้ง กราฟปั๊ม และค่าตั้งป้องกัน', 'อัตราการไหล ความดัน ระดับสถิต/ระดับสูบ และการคืนตัว', 'แรงดัน กระแสแต่ละเฟส ชั่วโมงทำงาน และ kWh/m³', 'ผลวิเคราะห์น้ำ วันที่เก็บ จุดเก็บ และลักษณะตัวอย่าง', 'ประวัติทราย การล้างบ่อ ซ่อมปั๊ม และเหตุการณ์ผิดปกติ'],
      recordsTitle: 'ติดตามแนวโน้ม ไม่ใช่แค่ผ่าน/ไม่ผ่าน', records: [
        { title: 'สมรรถนะบ่อ', detail: 'บันทึก flow, drawdown และ specific capacity ภายใต้เงื่อนไขใกล้กัน' },
        { title: 'พลังงาน', detail: 'ใช้ kWh/m³ ร่วมกับระดับน้ำและแรงดัน เพื่อเห็นประสิทธิภาพที่ลดลง' },
        { title: 'คุณภาพน้ำ', detail: 'ดูกราฟตามเวลาและช่วงสูบ เพราะค่าบางชนิดเปลี่ยนเมื่อสูบนาน' },
        { title: 'เหตุการณ์', detail: 'บันทึกภัยแล้ง น้ำท่วม งานก่อสร้าง บ่อใหม่รอบพื้นที่ และการปรับวาล์ว' },
      ],
    },
    quiz: {
      eyebrow: 'ตรวจความเข้าใจ', title: 'คุณจะเริ่มตรวจจากตรงไหน?', intro: 'เลือกคำตอบที่ปลอดภัยและใช้หลักฐานมากที่สุด', correct: 'ถูกต้อง', review: 'ทบทวน', score: 'คะแนน', retry: 'ทำอีกครั้ง', perfect: 'ยอดเยี่ยม—คุณแยกอาการออกจากสาเหตุได้อย่างเป็นระบบ',
      questions: [
        { question: 'น้ำไหลลดลง 30% สิ่งแรกที่ควรทำคืออะไร?', choices: ['เปลี่ยนปั๊มให้ใหญ่ขึ้น', 'ยืนยัน flow/pressure และเทียบระดับน้ำกับค่าฐาน', 'เติมสารเคมีล้างบ่อทันที'], correct: 1, explanation: 'ต้องยืนยันอาการและแยกปั๊ม ท่อ บ่อ และชั้นน้ำก่อนเลือกการแก้ไข' },
        { question: 'ระดับน้ำสถิตใกล้เดิม แต่ระดับขณะสูบลึกขึ้นมาก บอกอะไรได้ดีที่สุด?', choices: ['ความสูญเสียในบ่ออาจเพิ่มขึ้น', 'ยืนยันว่ามอเตอร์เสีย', 'ยืนยันว่าชั้นน้ำแห้งถาวร'], correct: 0, explanation: 'drawdown ที่เพิ่มภายใต้เงื่อนไขใกล้กันชี้ให้ตรวจประสิทธิภาพบ่อและช่วงรับน้ำ แต่ยังต้องยืนยัน' },
        { question: 'พบทรายเพิ่มขึ้นทันทีหลังเปลี่ยนปั๊ม ควรทำอย่างไร?', choices: ['เพิ่มเวลาสูบให้ทรายหมด', 'ลดอัตราสูบ เก็บตัวอย่าง และตรวจโครงสร้างบ่อ', 'ปิดอุปกรณ์ป้องกันปั๊ม'], correct: 1, explanation: 'ทรายทำลายปั๊มและอาจบ่งชี้การสูบเกินสมรรถนะหรือความเสียหายของบ่อ' },
        { question: 'น้ำใสและไม่มีกลิ่น หมายความว่าปลอดภัยหรือไม่?', choices: ['ปลอดภัยเสมอ', 'ไม่สามารถสรุปได้ ต้องตรวจตามวัตถุประสงค์ใช้', 'ปลอดภัยถ้าสูบนาน 10 นาที'], correct: 1, explanation: 'สารละลายและจุลชีพบางชนิดมองไม่เห็น การเก็บตัวอย่างและผลห้องปฏิบัติการจึงจำเป็น' },
      ],
    },
    sources: { eyebrow: 'แหล่งข้อมูลทางการ', title: 'หลักการอ้างอิงจากหน่วยงานน้ำบาดาล', reviewed: 'ทบทวนเนื้อหา 4 สิงหาคม 2569', labels: ['กรมทรัพยากรน้ำบาดาล — ความรู้ด้านคุณภาพน้ำบาดาล', 'กรมทรัพยากรน้ำบาดาล — การเตรียมบ่อรับมือภัยแล้งและการฟื้นฟู', 'กรมทรัพยากรน้ำบาดาล — 7 วิธีดูแลบ่อน้ำบาดาล', 'กรมทรัพยากรน้ำบาดาล — 108 คำถามเรื่องน้ำบาดาล (PDF)', 'USGS — Groundwater Wells', 'USGS — Groundwater Decline and Depletion', 'USGS — Contamination of Groundwater'] },
    next: { title: 'ต้องการนำข้อมูลไปคำนวณต่อ?', text: 'ใช้ชุดเครื่องมือคำนวณ drawdown, specific capacity, ปริมาตรถัง และพลังงาน หรือส่งค่าหน้างานให้ทีมช่วยวางแผนตรวจ', calculator: 'เปิดเครื่องมือคำนวณ', contact: 'ปรึกษาทีมงาน' },
  },
  en: {
    summary: { duration: 'Study time', durationValue: '35–45 minutes', level: 'Level', levelValue: 'Owners–technicians', cases: 'Case studies', casesValue: '5 field scenarios' },
    outcomesTitle: 'By the end, you can', outcomes: ['Separate well symptoms from pump, pipe and electrical faults', 'Choose the field data needed before repair decisions', 'Read flow, water-level and drawdown trends systematically', 'Recognize stop-work and specialist escalation signals'], jumpLabel: 'Jump to', chapters: { triage: 'Triage', workflow: 'Diagnostic sequence', cases: 'Case studies', worksheet: 'Worksheet', prevention: 'Prevention', quiz: 'Knowledge check' },
    visualAlt: { comparison: 'Cutaway comparison of a healthy groundwater well and a clogged sand-producing well', field: 'Technicians measuring water level, electricity and flow while sampling a well' }, visualCaption: { comparison: 'Lower output does not automatically mean a failed pump—screen, gravel pack, aquifer level and distribution system must be separated.', field: 'Reliable diagnosis combines several measurements taken under known operating conditions.' },
    triage: { eyebrow: 'Safety first', title: 'One symptom can have several causes', intro: 'Choose the primary symptom to see what to investigate, collect and avoid. This is a screening guide, not a remote diagnosis.', stopTitle: 'Stop or reduce pumping when any of these appear', stopItems: ['Dry running, cavitation noise, abnormal vibration or heat', 'A sudden sand surge, extreme turbidity or fragments from the well', 'Abnormal voltage/current/temperature with repeated trips', 'Sudden chemical or petroleum odor, or suspected contamination'], selectorTitle: 'Choose the main symptom', selectorHint: 'Select a card for a diagnostic pathway', labels: { flow: 'Declining flow', sand: 'Sand or turbidity', quality: 'Water-quality change', power: 'Trips or high energy' }, details: {
      flow: { signal: 'Yield falls, pressure drops or pumping takes longer.', causes: ['Seasonal, drought or nearby-pumping decline in static level', 'Screen/gravel-pack clogging by mineral, sediment or biological growth', 'Worn pump, leaking pipe, restricted valve or electrical fault'], collect: ['Flow and pressure against baseline', 'Static, pumping and recovery levels', 'Voltage, current and valve position'], first: 'Verify instruments, then test at the previous known pumping rate.', avoid: 'Do not immediately install a larger pump; it can deepen drawdown and pull sand.', escalate: 'Stop and arrange a controlled pumping test if drawdown grows or the intake approaches exposure.' },
      sand: { signal: 'Visible grains, sediment, turbidity or accelerated equipment wear.', causes: ['Damaged/mismatched screen', 'Moved gravel pack, incomplete development or filled sump', 'Pumping above safe well performance'], collect: ['Timed samples from startup onward', 'Sand amount/size with pumping rate', 'Current depth versus construction record'], first: 'Reduce pumping and collect timed samples to see whether sand rises or clears.', avoid: 'Do not keep operating at high flow or send sand through filters and tanks.', escalate: 'A sudden surge or major loss of depth warrants structural assessment and possible camera inspection.' },
      quality: { signal: 'Changed color, odor, taste, salinity, rust staining or scale.', causes: ['Natural iron, manganese, hardness or dissolved constituents', 'Saline upconing/cross-flow through damaged casing or over-pumping', 'Surface, wastewater, industrial or agricultural contamination'], collect: ['Correctly collected laboratory samples', 'EC/TDS, pH, turbidity and use-specific parameters', 'Rain, flood, repair and nearby-activity history'], first: 'Isolate water from sensitive uses, resample and confirm analysis.', avoid: 'Do not judge safety from clarity/odor alone or dilute without an engineered plan.', escalate: 'Suspected chemical/microbial contamination, rapid salinity rise or exceedance needs prompt specialist review.' },
      power: { signal: 'Trips, high current, rising kWh/m³ or unstable pressure.', causes: ['Voltage drop, phase imbalance, loose connection or control fault', 'Greater lift from lower levels, pump wear or sand abrasion', 'Pipe restriction, valve/check-valve or motor problems'], collect: ['Per-phase voltage/current at start and run', 'Flow, pressure, pumping level and event time', 'Trip history, alarms and kWh/m³'], first: 'Have a qualified electrical technician record controls and electrical values alongside hydraulic data.', avoid: 'Never bypass protection or repeatedly reset without finding the cause.', escalate: 'Burning odor, hot joints, phase loss or repeated trips require isolation and specialist service.' },
    }, likely: 'Likely areas to check', collect: 'Collect', first: 'Safe first action', avoid: 'Avoid', escalate: 'Escalate when' },
    workflow: { eyebrow: 'Diagnostic process', title: 'Move from low-cost measurements to deeper evidence', intro: 'This sequence reduces unnecessary pump removal or blind rehabilitation and gives a before/after comparison.', outputLabel: 'Output', steps: [
      { title: 'Establish baseline', detail: 'Gather the well log, completion report, pump data, pumping test and historic water quality.', output: 'Normal reference values' }, { title: 'Confirm the symptom', detail: 'Check meters, valves and leaks; establish when and under what conditions it occurs.', output: 'A repeatable symptom' }, { title: 'Measure the system', detail: 'Record flow, pressure, voltage, current and energy at the same time.', output: 'Pump–pipe–electrical separation' }, { title: 'Measure water levels', detail: 'Record static, pumping, drawdown and recovery at a known rate.', output: 'Aquifer–well–pump separation' }, { title: 'Check water and sand', detail: 'Take timed samples, document turbidity/sand and test quality by risk and use.', output: 'Quality and sediment evidence' }, { title: 'Inspect as indicated', detail: 'Pull the pump, verify depth, camera-inspect or test further only when evidence supports it.', output: 'Confirmed physical cause' }, { title: 'Correct with criteria', detail: 'Repair, rehabilitate, adjust pumping or treat water according to the cause.', output: 'Scope and stop criteria' }, { title: 'Verify performance', detail: 'Repeat key measurements and a pumping test before final pump sizing.', output: 'Evidence of real improvement' },
    ], principleTitle: 'Core principle', principle: 'Always compare baseline and current values under similar conditions. A single value without context rarely identifies a cause.' },
    cases: { eyebrow: 'Evidence-based practice', title: '5 symptom → evidence → verification cases', intro: 'Teaching scenarios based on common problem patterns; they are not guarantees for every hydrogeologic setting.', labels: { setting: 'Setting', symptom: 'Symptom', evidence: 'Key evidence', finding: 'Finding', action: 'Corrective action', verify: 'Verification', lesson: 'Lesson' }, items: [
      { title: 'Factory well loses output', setting: 'Daily-use well with historic test data', symptom: 'Flow down 35%; pump still runs', evidence: 'Static level similar, but drawdown increased and recovery slowed', finding: 'Higher well loss around the intake is more likely than a regional decline', action: 'Diagnose deposit type and rehabilitate; do not upsize first', verify: 'Repeat test at the same rate and compare specific capacity', lesson: 'Stable static level plus greater drawdown points first toward well efficiency' },
      { title: 'Farm well produces sand after pump upgrade', setting: 'A higher-capacity pump replaced the original', symptom: 'Persistent turbidity and sand', evidence: 'Sand rises with rate, depth is reduced and pressure fluctuates', finding: 'Over-pumping with gravel-pack/screen concern', action: 'Reduce rate, verify depth and inspect the intake', verify: 'Timed sand sampling during a controlled step test', lesson: 'A bigger pump does not safely create more well capacity' },
      { title: 'Filters clog with red staining', setting: 'Hotel well feeding a treatment system', symptom: 'Pressure loss, short filter runs and staining', evidence: 'Iron/manganese and post-aeration turbidity increased', finding: 'Precipitation affects the well, pipework and treatment train', action: 'Review the well, oxidation, filtration and backwash cycle', verify: 'Test raw/treated water and track differential pressure', lesson: 'Water quality and hydraulic performance are connected' },
      { title: 'Salinity rises during long pumping', setting: 'Multiple wells in a brackish-risk area', symptom: 'EC/TDS rises with runtime', evidence: 'Values fall after rest and return at higher rates', finding: 'Possible saline movement or cross-flow needs structural confirmation', action: 'Reduce rate, time-profile samples and inspect casing/intakes', verify: 'Track EC with rate and water level over repeated cycles', lesson: 'Time and pumping rate matter more than one sample' },
      { title: 'Pump trips and energy rises', setting: 'Pressure-controlled building supply', symptom: 'Overload trips and higher kWh/m³', evidence: 'Phase imbalance, lower pumping level and lower flow', finding: 'Electrical and lifting-load issues coexist', action: 'Qualified electrical correction plus pump/duty-point review', verify: 'Recheck phases, flow, water level and kWh/m³', lesson: 'A trip alone cannot distinguish motor from well problems' },
    ] },
    worksheet: { eyebrow: 'Field worksheet', title: 'Compare baseline with current performance', intro: 'Enter values measured under similar rates and conditions. The tool suggests a first-priority pathway for discussion with a technician.', baseline: 'Baseline', current: 'Current', flow: 'Flow rate', staticLevel: 'Static level below wellhead', pumpingLevel: 'Pumping level below wellhead', sandFlag: 'Abnormal sand or turbidity observed', qualityFlag: 'Clear water-quality/salinity change', resultTitle: 'First-priority pathway', metrics: { flowChange: 'Flow change', staticShift: 'Static level deepened', drawdownChange: 'Drawdown change' }, pathways: {
      sand: { title: 'Prioritize sand and well integrity', text: 'Reduce flow and collect timed samples before sand damages the pump and system.', next: 'Measure sand, verify well depth and consider camera inspection when supported.' }, quality: { title: 'Prioritize water quality', text: 'Isolate sensitive uses and confirm with correct sampling and laboratory analysis.', next: 'Record EC/TDS, pH, turbidity, runtime and use-specific laboratory parameters.' }, aquifer: { title: 'Investigate aquifer-level change first', text: 'A material deepening of static level can reflect season, recharge or surrounding pumping.', next: 'Review nearby levels/rainfall and run a controlled pumping/recovery test.' }, well: { title: 'Investigate well and intake efficiency', text: 'Lower flow with higher drawdown and similar static level is consistent with increasing well loss.', next: 'Compare specific capacity, deposits and sediment before planning rehabilitation.' }, equipment: { title: 'Check pump, pipe, valve and electrical system first', text: 'Flow fell while water levels and drawdown remained similar.', next: 'Record pressure, current, voltage and valve position; inspect leakage and wear.' }, stable: { title: 'No strong change in the entered values', text: 'Continue trend monitoring and confirm measurements used the same method and conditions.', next: 'Record monthly performance, runtime, quality and surrounding events.' },
    }, nextLabel: 'Next step', screeningNote: 'This is limited-data screening, not a diagnosis or repair design. Measurement error and site conditions can change the conclusion.', copy: 'Copy summary', copied: 'Copied', download: 'Download summary', reportTitle: 'Groundwater well screening summary', reportLabels: { generated: 'Generated', observations: 'Entered observations', pathway: 'First-priority pathway', next: 'Next step', disclaimer: 'Disclaimer' } },
    prevention: { eyebrow: 'Prevent recurrence', title: 'Small records make later diagnosis much faster', intro: 'Consistent baselines expose deterioration before shutdown and help target repair.', checklistTitle: 'Well-record checklist', complete: 'Complete—ready to build a baseline history', remaining: 'Items still to collect', checklist: ['Construction log, depth, screen intervals and gravel-pack record', 'Pump model, setting depth, curve and protection settings', 'Flow, pressure, static/pumping levels and recovery', 'Voltage, per-phase current, runtime and kWh/m³', 'Water results with date, sampling point and sample condition', 'Sand, rehabilitation, pump repair and incident history'], recordsTitle: 'Track trends, not only pass/fail', records: [{ title: 'Well performance', detail: 'Track flow, drawdown and specific capacity under similar conditions.' }, { title: 'Energy', detail: 'Use kWh/m³ with water level and pressure to expose lost efficiency.' }, { title: 'Water quality', detail: 'Plot results over time and runtime because some values drift while pumping.' }, { title: 'Events', detail: 'Record drought, flood, construction, nearby wells and valve changes.' }] },
    quiz: { eyebrow: 'Knowledge check', title: 'Where would you start?', intro: 'Choose the safest, most evidence-based answer.', correct: 'Correct', review: 'Review', score: 'Score', retry: 'Try again', perfect: 'Excellent—you are separating symptoms from causes systematically.', questions: [
      { question: 'Flow falls by 30%. What should happen first?', choices: ['Install a larger pump', 'Verify flow/pressure and compare water levels with baseline', 'Chemically clean immediately'], correct: 1, explanation: 'Confirm and separate pump, pipe, well and aquifer before choosing a remedy.' }, { question: 'Static level is similar but pumping level is much deeper. What is the best inference?', choices: ['Well loss may have increased', 'The motor is definitely failed', 'The aquifer is permanently dry'], correct: 0, explanation: 'Higher drawdown under similar conditions points first toward intake/well efficiency, but still needs confirmation.' }, { question: 'Sand surges after a pump upgrade. What is safest?', choices: ['Pump longer to clear it', 'Reduce rate, sample sand and inspect well integrity', 'Disable pump protection'], correct: 1, explanation: 'Sand damages equipment and may signal over-pumping or well damage.' }, { question: 'Clear, odorless water is always safe.', choices: ['True', 'False—test according to intended use', 'True after ten minutes of pumping'], correct: 1, explanation: 'Many dissolved and microbial hazards are not visible.' },
    ] },
    sources: { eyebrow: 'Official sources', title: 'Principles grounded in groundwater-agency guidance', reviewed: 'Content reviewed 4 August 2026', labels: ['DGR — Groundwater quality knowledge', 'DGR — Drought preparation and well rehabilitation', 'DGR — Seven ways to care for groundwater wells', 'DGR — 108 groundwater questions (PDF)', 'USGS — Groundwater Wells', 'USGS — Groundwater Decline and Depletion', 'USGS — Contamination of Groundwater'] },
    next: { title: 'Continue with your field data', text: 'Calculate drawdown, specific capacity, tank volume and energy, or share observations with our team.', calculator: 'Open calculator suite', contact: 'Contact the team' },
  },
  zh: {
    summary: { duration: '学习时间', durationValue: '35–45 分钟', level: '适合人群', levelValue: '井主–技术人员', cases: '案例', casesValue: '5 个现场情境' }, outcomesTitle: '完成后，您将能够', outcomes: ['区分水井、泵、管路与电气故障', '在决定维修前选择必要的现场数据', '系统阅读流量、水位与降深趋势', '识别必须停机并升级处理的信号'], jumpLabel: '跳至', chapters: { triage: '症状筛查', workflow: '诊断顺序', cases: '案例学习', worksheet: '评估表', prevention: '预防', quiz: '知识检测' }, visualAlt: { comparison: '健康地下水井与堵塞产砂井的剖面对比', field: '技术人员测量水位、电气、流量并采集水样' }, visualCaption: { comparison: '出水量下降不一定是泵故障；滤管、砾料、水层水位和输水系统都要分别检查。', field: '可靠诊断需要在已知运行条件下同时采集多组数据。' },
    triage: { eyebrow: '安全优先', title: '同一症状可能有多种原因', intro: '选择主要症状，查看应调查、采集和避免的事项。本工具用于初筛，并非远程诊断。', stopTitle: '出现以下情况应停泵或降低抽水量', stopItems: ['干转、气蚀声、异常振动或过热', '突然大量出砂、严重浑浊或出现井体碎片', '电压/电流/温度异常且反复跳闸', '突然出现化学品或油味，或怀疑污染'], selectorTitle: '选择主要症状', selectorHint: '选择卡片查看路径', labels: { flow: '流量下降', sand: '出砂或浑浊', quality: '水质变化', power: '跳闸或能耗高' }, details: {
      flow: { signal: '出水量下降、压力降低或抽水时间变长。', causes: ['季节、干旱或邻井抽水导致静水位下降', '矿物、沉积物或生物膜堵塞滤管/砾料', '泵磨损、管漏、阀门受限或电气故障'], collect: ['与基准对比的流量和压力', '静水位、动水位与恢复水位', '电压、电流和阀位'], first: '先验证仪表，再按原有已知流量测试。', avoid: '不要立即换大泵，以免加深降深并带砂。', escalate: '降深持续增大或泵入口接近露出时应停机并进行受控抽水试验。' },
      sand: { signal: '可见砂粒、沉积物、浑浊或设备异常磨损。', causes: ['滤管损坏或开孔不匹配', '砾料移动、洗井不充分或沉砂管填满', '抽水超过井的安全能力'], collect: ['从启泵开始的定时水样', '砂量/粒径与抽水量', '当前井深与成井记录'], first: '降低抽水量并定时取样，观察砂量趋势。', avoid: '不要继续高流量运行或让砂进入过滤器和水箱。', escalate: '突然增砂或井深明显变浅时，应评估井体并考虑井下摄像。' },
      quality: { signal: '颜色、气味、味道、盐度、锈斑或结垢改变。', causes: ['天然铁、锰、硬度或溶解物变化', '咸水上移、套管损坏导致串层或过量抽水', '地表、污水、工业或农业污染'], collect: ['按规范采样并送实验室', 'EC/TDS、pH、浊度和用途相关指标', '降雨、洪水、维修和周边活动历史'], first: '暂停敏感用途，重新采样并确认分析结果。', avoid: '不能只凭清澈/气味判断安全，也不要无设计稀释。', escalate: '疑似化学/微生物污染、盐度快速上升或超标时应立即处理。' },
      power: { signal: '跳闸、电流高、kWh/m³ 上升或压力不稳。', causes: ['电压降、缺相/不平衡、接头松动或控制故障', '水位下降增加扬程、泵磨损或砂磨', '管路堵塞、阀门/止回阀或电机问题'], collect: ['启动与运行时各相电压/电流', '流量、压力、动水位和故障时间', '跳闸记录、报警和 kWh/m³'], first: '由合格电工在记录水力数据的同时检查控制和电气参数。', avoid: '不要旁路保护或反复复位。', escalate: '有焦味、接头发热、缺相或反复跳闸时应断电并检修。' },
    }, likely: '可能原因', collect: '需要采集', first: '安全的第一步', avoid: '避免', escalate: '升级处理条件' },
    workflow: { eyebrow: '诊断流程', title: '从低成本测量走向深入证据', intro: '这个顺序可减少盲目提泵或洗井，并支持前后对比。', outputLabel: '输出', steps: [{ title: '建立基准', detail: '收集成井记录、泵资料、抽水试验和历史水质。', output: '正常参考值' }, { title: '确认症状', detail: '检查仪表、阀门和泄漏，明确发生时间和条件。', output: '可重复症状' }, { title: '测量系统', detail: '同时记录流量、压力、电压、电流和能耗。', output: '区分泵–管–电' }, { title: '测量水位', detail: '在已知流量下记录静水位、动水位、降深和恢复。', output: '区分水层–井–泵' }, { title: '检查水与砂', detail: '定时取样并按风险检测浊度、砂和水质。', output: '水质与沉积证据' }, { title: '按证据深入检查', detail: '仅在数据支持时提泵、测深、摄像或进一步试验。', output: '确认物理原因' }, { title: '按原因修复', detail: '维修、洗井、调整抽水或处理水质，并设验收标准。', output: '工作范围' }, { title: '验证性能', detail: '重复关键测量和抽水试验，再确定泵型。', output: '改善证据' }], principleTitle: '核心原则', principle: '始终在相近条件下比较基准值与当前值。脱离情境的单个数值很少能确定原因。' },
    cases: { eyebrow: '基于证据学习', title: '5 个症状 → 证据 → 验证案例', intro: '这些教学情境来自常见问题模式，并不保证适用于每个水文地质条件。', labels: { setting: '背景', symptom: '症状', evidence: '关键证据', finding: '发现', action: '措施', verify: '验证', lesson: '要点' }, items: [
      { title: '工厂井出水量下降', setting: '有历史试验数据的日常用井', symptom: '流量下降 35%，泵仍运行', evidence: '静水位相近，但降深增大、恢复变慢', finding: '进水段井损增加比区域水位下降更可能', action: '诊断沉积类型后洗井，不先加大泵', verify: '同流量复测并比较单位涌水量', lesson: '静水位稳定而降深增加，应先查井效率' },
      { title: '农用井换泵后出砂', setting: '换成更大流量的泵', symptom: '持续浑浊和出砂', evidence: '砂量随流量增加，井深变浅且压力波动', finding: '过量抽水并伴随砾料/滤管问题', action: '降流量、测深并检查进水段', verify: '阶梯试验期间定时测砂', lesson: '大泵不会安全地增加井本身的能力' },
      { title: '过滤器堵塞并有红色污渍', setting: '酒店井连接水处理系统', symptom: '压差增大、过滤周期短、出现污渍', evidence: '铁锰及曝气后浊度上升', finding: '沉淀影响井、管路和处理系统', action: '复核井况、氧化、过滤和反洗', verify: '检测原水/处理水并跟踪压差', lesson: '水质与水力性能相互关联' },
      { title: '长时间抽水时盐度上升', setting: '咸水风险区的多井系统', symptom: 'EC/TDS 随运行时间上升', evidence: '停泵后下降，高流量时又上升', finding: '可能有咸水迁移或串层，需确认井体', action: '降流量、分时取样并查套管/进水段', verify: '多个周期同步跟踪 EC、流量和水位', lesson: '时间和抽水量比单次样品更有意义' },
      { title: '泵跳闸且能耗增加', setting: '恒压建筑供水', symptom: '过载跳闸和 kWh/m³ 上升', evidence: '三相不平衡、动水位下降且流量降低', finding: '电气问题与扬程增加并存', action: '电工整改并检查泵和工况点', verify: '复测各相、流量、水位和能耗', lesson: '仅凭跳闸不能区分电机和井的问题' },
    ] },
    worksheet: { eyebrow: '现场评估表', title: '对比基准与当前性能', intro: '请输入在相似流量和条件下测得的值，系统将给出与技术人员讨论的优先检查路径。', baseline: '基准值', current: '当前值', flow: '流量', staticLevel: '井口以下静水位', pumpingLevel: '井口以下动水位', sandFlag: '发现异常砂或浑浊', qualityFlag: '水质/盐度明显变化', resultTitle: '优先检查路径', metrics: { flowChange: '流量变化', staticShift: '静水位加深', drawdownChange: '降深变化' }, pathways: {
      sand: { title: '优先处理出砂和井体完整性', text: '降低流量并定时取样，避免砂损坏泵和系统。', next: '测砂量、核实井深，并按证据考虑井下摄像。' }, quality: { title: '优先处理水质', text: '暂停敏感用途，并通过规范采样和实验室确认。', next: '记录 EC/TDS、pH、浊度、运行时间和用途相关指标。' }, aquifer: { title: '先调查水层水位变化', text: '静水位明显加深可能与季节、补给或周边抽水有关。', next: '查看邻井和降雨，并进行受控抽水/恢复试验。' }, well: { title: '调查井和进水段效率', text: '静水位相近但流量下降、降深增大，符合井损增加。', next: '比较单位涌水量、沉积物和砂，再计划洗井。' }, equipment: { title: '先查泵、管路、阀门和电气', text: '流量下降而水位与降深相近。', next: '记录压力、电流、电压和阀位，检查泄漏和磨损。' }, stable: { title: '输入值未显示强烈变化', text: '继续趋势监测，并确认测量方法与条件一致。', next: '每月记录性能、运行时间、水质和周边事件。' },
    }, nextLabel: '下一步', screeningNote: '此结果仅为有限数据初筛，并非诊断或维修设计。测量误差和现场条件可能改变结论。', copy: '复制摘要', copied: '已复制', download: '下载摘要', reportTitle: '地下水井初筛摘要', reportLabels: { generated: '生成日期', observations: '输入数据', pathway: '优先检查路径', next: '下一步', disclaimer: '说明' } },
    prevention: { eyebrow: '预防复发', title: '少量记录能大幅加快诊断', intro: '一致的基准能在停机前发现恶化，并让维修更有针对性。', checklistTitle: '水井资料清单', complete: '已完整—可以建立基准历史', remaining: '仍需收集', checklist: ['成井记录、井深、滤管区间和砾料记录', '泵型、安装深度、曲线和保护设定', '流量、压力、静/动水位和恢复', '电压、各相电流、运行时间和 kWh/m³', '水质结果、日期、采样点和样品状态', '出砂、洗井、泵维修和故障历史'], recordsTitle: '看趋势，而不只看合格/不合格', records: [{ title: '井性能', detail: '在相似条件下跟踪流量、降深和单位涌水量。' }, { title: '能耗', detail: '结合水位与压力分析 kWh/m³。' }, { title: '水质', detail: '按时间和运行时长绘图。' }, { title: '事件', detail: '记录干旱、洪水、施工、邻井和阀门变化。' }] },
    quiz: { eyebrow: '知识检测', title: '您会从哪里开始？', intro: '选择最安全、最有证据的答案。', correct: '正确', review: '复习', score: '得分', retry: '重新作答', perfect: '很好—您正在系统地区分症状与原因。', questions: [{ question: '流量下降 30%，第一步是什么？', choices: ['换大泵', '核实流量/压力并与基准水位对比', '立即化学洗井'], correct: 1, explanation: '先确认症状并区分泵、管、井和水层。' }, { question: '静水位相近，但动水位深很多，最合理的判断是？', choices: ['井损可能增加', '电机肯定损坏', '水层永久枯竭'], correct: 0, explanation: '相近条件下降深增加，应先调查进水段和井效率。' }, { question: '换泵后突然出砂，最安全的做法是？', choices: ['继续抽到砂消失', '降流量、取样并检查井体', '关闭保护'], correct: 1, explanation: '砂会损坏设备，也可能表示过量抽水或井损坏。' }, { question: '清澈无味的水一定安全吗？', choices: ['一定安全', '不能确定，应按用途检测', '抽十分钟后安全'], correct: 1, explanation: '许多溶解物和微生物不可见。' }] },
    sources: { eyebrow: '官方来源', title: '依据地下水管理机构指导的原则', reviewed: '内容复核：2026 年 8 月 4 日', labels: ['泰国地下水资源厅 — 地下水水质知识', '泰国地下水资源厅 — 抗旱准备与水井修复', '泰国地下水资源厅 — 水井养护七法', '泰国地下水资源厅 — 地下水 108 问（PDF）', 'USGS — Groundwater Wells', 'USGS — Groundwater Decline and Depletion', 'USGS — Contamination of Groundwater'] }, next: { title: '继续处理您的现场数据', text: '计算降深、单位涌水量、水箱和能耗，或与团队分享现场数据。', calculator: '打开计算工具', contact: '联系团队' },
  },
  ja: {
    summary: { duration: '学習時間', durationValue: '35～45分', level: '対象', levelValue: '井戸所有者～技術者', cases: 'ケース', casesValue: '現場想定 5件' }, outcomesTitle: '学習後にできること', outcomes: ['井戸・ポンプ・配管・電気の不具合を切り分ける', '修理判断前に必要な現場データを選ぶ', '流量・水位・水位低下量の傾向を読む', '停止・専門家対応が必要な兆候を判断する'], jumpLabel: '章へ移動', chapters: { triage: '症状の切り分け', workflow: '診断手順', cases: 'ケーススタディ', worksheet: '評価シート', prevention: '予防', quiz: '理解度確認' }, visualAlt: { comparison: '健全な地下水井と目詰まり・揚砂井の断面比較', field: '水位、電気、流量を測定し採水する技術者' }, visualCaption: { comparison: '揚水量低下は必ずしもポンプ故障ではありません。スクリーン、砂利充填、帯水層水位、送水系統を分けて確認します。', field: '確かな診断は、既知の運転条件で複数の測定値を同時に集めることから始まります。' },
    triage: { eyebrow: '安全を最優先', title: '一つの症状に複数の原因があります', intro: '主な症状を選び、調べる原因、記録するデータ、避ける行為を確認します。遠隔診断ではなく一次スクリーニングです。', stopTitle: '次の兆候があれば停止または揚水量を下げる', stopItems: ['空運転、キャビテーション音、異常振動・過熱', '砂の急増、著しい濁り、井戸部材の破片', '電圧・電流・温度異常と繰り返すトリップ', '化学品・油の臭い、急な水質変化、汚染の疑い'], selectorTitle: '主症状を選択', selectorHint: 'カードを選んで診断経路を表示', labels: { flow: '流量低下', sand: '砂・濁り', quality: '水質変化', power: 'トリップ・高消費電力' }, details: {
      flow: { signal: '揚水量低下、圧力低下、揚水時間の長期化。', causes: ['季節・干ばつ・周辺揚水による静水位低下', '鉱物・沈殿・生物膜によるスクリーン目詰まり', 'ポンプ摩耗、配管漏れ、弁制限、電気不具合'], collect: ['基準値と比較した流量・圧力', '静水位、動水位、回復', '電圧、電流、弁位置'], first: '計器を確認し、以前の既知揚水量で試験します。', avoid: 'すぐに大型ポンプへ変更しないでください。水位低下と揚砂を悪化させます。', escalate: '水位低下量が増大し吸込口露出の恐れがあれば停止し、揚水試験を行います。' },
      sand: { signal: '砂粒、沈殿、濁り、機器の早期摩耗。', causes: ['スクリーン損傷・不適切な開口', '砂利充填の移動、不十分な井戸仕上げ、沈砂部閉塞', '安全能力を超える揚水'], collect: ['起動後の時間別試料', '砂量・粒径と揚水量', '現在深度と完成記録'], first: '揚水量を下げ、時間別に採水して砂の傾向を確認します。', avoid: '高流量運転や砂をろ過器・タンクへ流すことは避けます。', escalate: '砂の急増や大幅な深度減少は、井戸構造とカメラ調査を検討します。' },
      quality: { signal: '色、臭い、味、塩分、さび、スケールの変化。', causes: ['鉄、マンガン、硬度、溶存成分', '塩水上昇、ケーシング損傷による層間流、過剰揚水', '地表、排水、産業・農業由来の汚染'], collect: ['適切に採取した分析試料', 'EC/TDS、pH、濁度、用途別項目', '降雨、洪水、修理、周辺活動履歴'], first: '影響の大きい用途から隔離し、再採水して分析を確認します。', avoid: '透明・無臭だけで安全と判断せず、設計なしに希釈しないでください。', escalate: '化学・微生物汚染、塩分急増、基準超過は速やかに専門家へ。' },
      power: { signal: 'トリップ、高電流、kWh/m³増加、圧力不安定。', causes: ['電圧低下、相不平衡、接続緩み、制御不良', '水位低下による揚程増、ポンプ摩耗、砂摩耗', '配管閉塞、弁・逆止弁、モーター不具合'], collect: ['始動・運転時の各相電圧/電流', '流量、圧力、動水位、発生時刻', 'トリップ、警報、kWh/m³'], first: '有資格者が水理データと同時に電気値を記録します。', avoid: '保護装置のバイパスや原因不明の再投入を繰り返さないでください。', escalate: '焦げ臭、接続部過熱、欠相、反復トリップは電源を隔離します。' },
    }, likely: '確認する原因', collect: '記録するデータ', first: '安全な第一手', avoid: '避けること', escalate: '専門家対応の目安' },
    workflow: { eyebrow: '診断プロセス', title: '低コスト測定から深い証拠へ', intro: '不要なポンプ引上げや根拠のない井戸洗浄を減らし、前後比較を可能にします。', outputLabel: '成果', steps: [{ title: '基準値を作る', detail: '井戸台帳、完成記録、ポンプ、揚水試験、過去水質を集めます。', output: '正常時の参照値' }, { title: '症状を確認', detail: '計器、弁、漏れを確認し、発生時期・条件を特定します。', output: '再現できる症状' }, { title: '系統を測定', detail: '流量、圧力、電圧、電流、電力量を同時に記録します。', output: 'ポンプ・配管・電気の切分け' }, { title: '水位を測定', detail: '既知流量で静水位、動水位、水位低下量、回復を測定します。', output: '帯水層・井戸・ポンプの切分け' }, { title: '水と砂を確認', detail: '時間別試料、濁り、砂、水質をリスクに応じて確認します。', output: '水質・沈殿の証拠' }, { title: '必要に応じ詳細調査', detail: '証拠に基づきポンプ引上げ、深度確認、カメラ等を実施します。', output: '物理原因の確認' }, { title: '原因に合わせ修正', detail: '修理、井戸洗浄、揚水量調整、水処理を原因別に選びます。', output: '作業範囲と判定基準' }, { title: '性能を検証', detail: '主要値と揚水試験を再実施してからポンプを選定します。', output: '改善の証拠' }], principleTitle: '基本原則', principle: '必ず近い条件で基準値と現在値を比較します。文脈のない単一値だけでは原因を特定できません。' },
    cases: { eyebrow: '証拠から学ぶ', title: '5つの症状 → 証拠 → 検証ケース', intro: '一般的な問題パターンに基づく教材で、すべての地質条件を保証するものではありません。', labels: { setting: '背景', symptom: '症状', evidence: '重要証拠', finding: '所見', action: '対策', verify: '検証', lesson: '学び' }, items: [
      { title: '工場井戸の揚水量低下', setting: '過去試験のある常用井', symptom: '流量35%低下、ポンプは運転', evidence: '静水位は同程度、低下量増大、回復遅延', finding: '地域低下より取水部の井戸損失増加が疑われる', action: '付着物を診断し洗浄。先に大型化しない', verify: '同流量で再試験し比湧出量を比較', lesson: '静水位が同じで低下量増なら井戸効率を先に確認' },
      { title: 'ポンプ更新後の農業井の揚砂', setting: '高容量ポンプへ更新', symptom: '濁り・砂が継続', evidence: '流量とともに砂増、深度減、圧力変動', finding: '過剰揚水と砂利充填/スクリーン懸念', action: '流量低下、深度確認、取水部調査', verify: '段階揚水試験で時間別に砂を測定', lesson: '大型ポンプは井戸能力を増やさない' },
      { title: 'フィルター閉塞と赤い着色', setting: '水処理を持つホテル井', symptom: '圧損、短い運転周期、着色', evidence: '鉄・マンガンと曝気後濁度が上昇', finding: '沈殿が井戸・配管・処理に影響', action: '井戸、酸化、ろ過、逆洗を見直す', verify: '原水/処理水と差圧を追跡', lesson: '水質と水理性能は関連する' },
      { title: '長時間揚水で塩分上昇', setting: '汽水リスク地域の複数井', symptom: '運転時間とともにEC/TDS上昇', evidence: '休止後低下し高流量で再上昇', finding: '塩水移動または層間流の確認が必要', action: '流量低下、時間別採水、ケーシング調査', verify: '複数周期でEC・流量・水位を追跡', lesson: '単一試料より時間と流量の関係が重要' },
      { title: 'ポンプトリップと電力増', setting: '定圧建物給水', symptom: '過負荷とkWh/m³上昇', evidence: '相不平衡、動水位低下、流量低下', finding: '電気と揚程負荷の複合問題', action: '有資格電気修理とポンプ運転点確認', verify: '各相、流量、水位、電力量を再測定', lesson: 'トリップだけでモーター/井戸を断定できない' },
    ] },
    worksheet: { eyebrow: '現場評価シート', title: '基準値と現在性能を比較', intro: '同程度の流量と条件で測定した値を入力すると、技術者と相談するための優先経路を提示します。', baseline: '基準値', current: '現在値', flow: '流量', staticLevel: '井口からの静水位', pumpingLevel: '井口からの動水位', sandFlag: '異常な砂・濁りあり', qualityFlag: '明確な水質・塩分変化あり', resultTitle: '優先確認経路', metrics: { flowChange: '流量変化', staticShift: '静水位の深化', drawdownChange: '水位低下量の変化' }, pathways: {
      sand: { title: '砂と井戸健全性を優先', text: '砂が機器を損傷する前に流量を下げ、時間別採水を行います。', next: '砂量と井戸深度を測り、証拠に応じカメラ調査を検討します。' }, quality: { title: '水質を優先', text: '影響の大きい用途から隔離し、適切な採水と分析で確認します。', next: 'EC/TDS、pH、濁度、運転時間、用途別分析を記録します。' }, aquifer: { title: '帯水層水位の変化を先に調査', text: '静水位の大幅な深化は季節、涵養、周辺揚水の影響が考えられます。', next: '周辺井戸・降雨を確認し、制御した揚水/回復試験を行います。' }, well: { title: '井戸・取水部効率を調査', text: '静水位が近く、流量低下と水位低下量増加は井戸損失増加と整合します。', next: '比湧出量、付着物、沈殿を比較してから洗浄計画を立てます。' }, equipment: { title: 'ポンプ・配管・弁・電気を先に確認', text: '流量低下でも水位と低下量は同程度です。', next: '圧力、電流、電圧、弁位置を記録し、漏れ・摩耗を確認します。' }, stable: { title: '入力値に大きな変化なし', text: '測定方法と条件を確認し、傾向監視を続けます。', next: '性能、運転時間、水質、周辺イベントを毎月記録します。' },
    }, nextLabel: '次の手順', screeningNote: '限られたデータによる一次評価であり、診断・修理設計ではありません。誤差や現場条件で結論は変わります。', copy: '要約をコピー', copied: 'コピー済み', download: '要約を保存', reportTitle: '地下水井一次評価要約', reportLabels: { generated: '作成日', observations: '入力値', pathway: '優先確認経路', next: '次の手順', disclaimer: '注意' } },
    prevention: { eyebrow: '再発予防', title: '少しの記録で診断は大幅に速くなります', intro: '一貫した基準値は停止前の劣化を見つけ、修理を原因に合わせます。', checklistTitle: '井戸記録チェック', complete: '完了—基準履歴を作成できます', remaining: '未収集項目', checklist: ['完成記録、深度、スクリーン区間、砂利充填', 'ポンプ型式、設置深度、曲線、保護設定', '流量、圧力、静/動水位、回復', '電圧、各相電流、運転時間、kWh/m³', '水質結果、日付、採水点、試料状態', '砂、洗浄、ポンプ修理、異常履歴'], recordsTitle: '合否だけでなく傾向を見る', records: [{ title: '井戸性能', detail: '同条件で流量、低下量、比湧出量を追跡。' }, { title: 'エネルギー', detail: '水位・圧力とともにkWh/m³を確認。' }, { title: '水質', detail: '時間と運転時間に対してグラフ化。' }, { title: 'イベント', detail: '干ばつ、洪水、工事、周辺井戸、弁変更を記録。' }] },
    quiz: { eyebrow: '理解度確認', title: 'どこから調べますか？', intro: '最も安全で証拠に基づく答えを選びます。', correct: '正解', review: '確認', score: '得点', retry: 'もう一度', perfect: 'すばらしい—症状と原因を体系的に分けられています。', questions: [{ question: '流量が30%低下。最初に何をしますか？', choices: ['大型ポンプに交換', '流量/圧力を確認し水位を基準値と比較', 'すぐ薬品洗浄'], correct: 1, explanation: '対策前にポンプ・配管・井戸・帯水層を切り分けます。' }, { question: '静水位は同じで動水位が大幅に深い。最もよい推定は？', choices: ['井戸損失が増えた可能性', 'モーター故障確定', '帯水層が永久枯渇'], correct: 0, explanation: '同条件で低下量増加なら取水部と井戸効率を先に確認します。' }, { question: 'ポンプ更新後に砂が急増。安全な対応は？', choices: ['砂が消えるまで運転', '流量を下げ、採水し井戸を調査', '保護を解除'], correct: 1, explanation: '砂は機器を損傷し、過剰揚水や井戸損傷の兆候です。' }, { question: '透明・無臭の水は常に安全ですか？', choices: ['はい', 'いいえ、用途に応じ検査', '10分揚水すれば安全'], correct: 1, explanation: '目に見えない溶存物質や微生物があります。' }] },
    sources: { eyebrow: '公的情報源', title: '地下水機関のガイダンスに基づく原則', reviewed: '内容確認：2026年8月4日', labels: ['タイ地下水資源局 — 地下水水質', 'タイ地下水資源局 — 干ばつ準備と井戸再生', 'タイ地下水資源局 — 井戸管理の7項目', 'タイ地下水資源局 — 地下水108問（PDF）', 'USGS — Groundwater Wells', 'USGS — Groundwater Decline and Depletion', 'USGS — Contamination of Groundwater'] }, next: { title: '現場データをさらに活用', text: '水位低下量、比湧出量、タンク、エネルギーを計算するか、チームへご相談ください。', calculator: '計算ツールを開く', contact: 'チームへ相談' },
  },
}

const officialSources = [
  'https://www.dgr.go.th/dga/th/about/352',
  'https://www.dgr.go.th/th/newsAll/124/6629',
  'https://www.dgr.go.th/th/newsAll/124/5452',
  'https://gdf.dgr.go.th/public/upload/001/d1e8af2b20adb979ea13c7983710964b59f90b60files/108%20%20Q-AGroundwater.pdf',
  'https://www.usgs.gov/water-science-school/science/groundwater-wells',
  'https://www.usgs.gov/water-science-school/science/groundwater-decline-and-depletion',
  'https://www.usgs.gov/water-science-school/science/contamination-groundwater',
]

function NumberField({ id, label, unit, value, onChange }: { id: string; label: string; unit: string; value: number; onChange: (value: number) => void }) {
  return <label className="gcs-number-field" htmlFor={id}><span>{label}</span><div><input id={id} type="number" inputMode="decimal" min="0" step="0.1" value={value} onChange={(event) => onChange(Math.max(0, event.currentTarget.valueAsNumber || 0))} /><small>{unit}</small></div></label>
}

export default function GroundwaterCaseStudies({ locale = 'th', localized = false }: { locale?: LocalizedLocale; localized?: boolean }) {
  const copy = copyByLocale[locale]
  const [symptom, setSymptom] = useState<SymptomId>('flow')
  const [baselineFlow, setBaselineFlow] = useState(30)
  const [currentFlow, setCurrentFlow] = useState(20)
  const [baselineStatic, setBaselineStatic] = useState(12)
  const [currentStatic, setCurrentStatic] = useState(13)
  const [baselinePumping, setBaselinePumping] = useState(25)
  const [currentPumping, setCurrentPumping] = useState(31)
  const [hasSand, setHasSand] = useState(false)
  const [hasQualityChange, setHasQualityChange] = useState(false)
  const [copied, setCopied] = useState(false)
  const [checked, setChecked] = useState<number[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const formatter = useMemo(() => new Intl.NumberFormat(localeInfo[locale].htmlLang, { maximumFractionDigits: 1, signDisplay: 'exceptZero' }), [locale])
  const localLink = (path: string) => localized ? localePath(path, locale) : path

  const baselineDrawdown = Math.max(0, baselinePumping - baselineStatic)
  const currentDrawdown = Math.max(0, currentPumping - currentStatic)
  const flowChange = baselineFlow > 0 ? ((currentFlow - baselineFlow) / baselineFlow) * 100 : 0
  const staticShift = currentStatic - baselineStatic
  const drawdownChange = currentDrawdown - baselineDrawdown
  const pathwayKey: keyof CourseCopy['worksheet']['pathways'] = hasSand
    ? 'sand'
    : hasQualityChange
      ? 'quality'
      : staticShift >= 3
        ? 'aquifer'
        : flowChange <= -20 && drawdownChange >= 3
          ? 'well'
          : flowChange <= -20 && Math.abs(drawdownChange) < 3
            ? 'equipment'
            : 'stable'
  const pathway = copy.worksheet.pathways[pathwayKey]
  const selectedSymptom = copy.triage.details[symptom]
  const quizScore = copy.quiz.questions.reduce((total, question, index) => total + (answers[index] === question.correct ? 1 : 0), 0)
  const quizComplete = Object.keys(answers).length === copy.quiz.questions.length

  const scrollTo = (chapter: ChapterId) => document.getElementById(`gcs-${chapter}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  const report = `${copy.worksheet.reportTitle}\n${copy.worksheet.reportLabels.generated}: ${new Intl.DateTimeFormat(localeInfo[locale].htmlLang, { dateStyle: 'medium' }).format(new Date())}\n\n${copy.worksheet.reportLabels.observations}\n- ${copy.worksheet.flow}: ${baselineFlow} → ${currentFlow} m³/h (${formatter.format(flowChange)}%)\n- ${copy.worksheet.staticLevel}: ${baselineStatic} → ${currentStatic} m (${formatter.format(staticShift)} m)\n- ${copy.worksheet.pumpingLevel}: ${baselinePumping} → ${currentPumping} m\n- ${copy.worksheet.metrics.drawdownChange}: ${formatter.format(drawdownChange)} m\n- ${copy.worksheet.sandFlag}: ${hasSand ? '✓' : '—'}\n- ${copy.worksheet.qualityFlag}: ${hasQualityChange ? '✓' : '—'}\n\n${copy.worksheet.reportLabels.pathway}: ${pathway.title}\n${pathway.text}\n${copy.worksheet.reportLabels.next}: ${pathway.next}\n\n${copy.worksheet.reportLabels.disclaimer}: ${copy.worksheet.screeningNote}`

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = report
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const downloadReport = () => {
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = 'groundwater-well-screening.txt'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(href)
  }

  return (
    <article className="gcs-course">
      <section className="gcs-overview">
        <div className="gcs-summary"><div><History aria-hidden="true" /><span>{copy.summary.duration}</span><strong>{copy.summary.durationValue}</strong></div><div><Gauge aria-hidden="true" /><span>{copy.summary.level}</span><strong>{copy.summary.levelValue}</strong></div><div><BookOpenCheck aria-hidden="true" /><span>{copy.summary.cases}</span><strong>{copy.summary.casesValue}</strong></div></div>
        <div className="gcs-outcomes"><h2>{copy.outcomesTitle}</h2><ul>{copy.outcomes.map((item) => <li key={item}><CheckCircle2 aria-hidden="true" />{item}</li>)}</ul></div>
      </section>

      <nav className="gcs-chapter-nav" aria-label={copy.jumpLabel}><strong>{copy.jumpLabel}</strong><div>{chapterIds.map((chapter) => { const Icon = chapterIcons[chapter]; return <button type="button" key={chapter} onClick={() => scrollTo(chapter)}><Icon aria-hidden="true" />{copy.chapters[chapter]}</button> })}</div></nav>

      <section className="gcs-module" id="gcs-triage">
        <header className="gcs-heading"><span><ShieldAlert aria-hidden="true" /></span><div><p>{copy.triage.eyebrow}</p><h2>{copy.triage.title}</h2><div>{copy.triage.intro}</div></div></header>
        <aside className="gcs-stop-card"><AlertOctagon aria-hidden="true" /><div><h3>{copy.triage.stopTitle}</h3><ul>{copy.triage.stopItems.map((item) => <li key={item}>{item}</li>)}</ul></div></aside>
        <figure className="gcs-comparison-figure"><Image src="/images/learning/groundwater-case-studies/healthy-vs-failing-well.webp" alt={copy.visualAlt.comparison} width={1536} height={1024} sizes="(width <= 900px) 100vw, 1280px" priority /><figcaption>{copy.visualCaption.comparison}</figcaption></figure>
        <div className="gcs-symptom-explorer">
          <div className="gcs-subheading"><div><p>{copy.triage.selectorTitle}</p><span>{copy.triage.selectorHint}</span></div></div>
          <div className="gcs-symptom-tabs" role="tablist">{(Object.keys(copy.triage.labels) as SymptomId[]).map((id) => { const Icon = symptomIcons[id]; return <button type="button" role="tab" aria-selected={symptom === id} className={symptom === id ? 'is-active' : ''} onClick={() => setSymptom(id)} key={id}><Icon aria-hidden="true" /><span>{copy.triage.labels[id]}</span></button> })}</div>
          <div className="gcs-symptom-panel" role="tabpanel"><div className="gcs-signal"><Activity aria-hidden="true" /><p>{selectedSymptom.signal}</p></div><div className="gcs-detail-grid"><section><h3><Search aria-hidden="true" />{copy.triage.likely}</h3><ul>{selectedSymptom.causes.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3><ClipboardCheck aria-hidden="true" />{copy.triage.collect}</h3><ul>{selectedSymptom.collect.map((item) => <li key={item}>{item}</li>)}</ul></section></div><div className="gcs-action-grid"><div className="is-good"><CheckCircle2 aria-hidden="true" /><p><strong>{copy.triage.first}</strong>{selectedSymptom.first}</p></div><div className="is-warning"><AlertTriangle aria-hidden="true" /><p><strong>{copy.triage.avoid}</strong>{selectedSymptom.avoid}</p></div><div className="is-alert"><ShieldAlert aria-hidden="true" /><p><strong>{copy.triage.escalate}</strong>{selectedSymptom.escalate}</p></div></div></div>
        </div>
      </section>

      <section className="gcs-module" id="gcs-workflow">
        <header className="gcs-heading"><span><Search aria-hidden="true" /></span><div><p>{copy.workflow.eyebrow}</p><h2>{copy.workflow.title}</h2><div>{copy.workflow.intro}</div></div></header>
        <div className="gcs-field-layout"><figure><Image src="/images/learning/groundwater-case-studies/field-diagnostic-team.webp" alt={copy.visualAlt.field} width={1536} height={1024} sizes="(width <= 900px) 100vw, 760px" /><figcaption>{copy.visualCaption.field}</figcaption></figure><aside><Info aria-hidden="true" /><h3>{copy.workflow.principleTitle}</h3><p>{copy.workflow.principle}</p></aside></div>
        <div className="gcs-workflow">{copy.workflow.steps.map((step, index) => <article key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{step.title}</h3><p>{step.detail}</p><small><strong>{copy.workflow.outputLabel}:</strong> {step.output}</small></div></article>)}</div>
      </section>

      <section className="gcs-module" id="gcs-cases">
        <header className="gcs-heading"><span><BookOpenCheck aria-hidden="true" /></span><div><p>{copy.cases.eyebrow}</p><h2>{copy.cases.title}</h2><div>{copy.cases.intro}</div></div></header>
        <div className="gcs-cases">{copy.cases.items.map((item, index) => <details key={item.title} open={index === 0}><summary><span>{String(index + 1).padStart(2, '0')}</span><div><small>{item.setting}</small><h3>{item.title}</h3></div><ArrowRight aria-hidden="true" /></summary><div className="gcs-case-body"><dl><div><dt>{copy.cases.labels.symptom}</dt><dd>{item.symptom}</dd></div><div><dt>{copy.cases.labels.evidence}</dt><dd>{item.evidence}</dd></div><div><dt>{copy.cases.labels.finding}</dt><dd>{item.finding}</dd></div><div><dt>{copy.cases.labels.action}</dt><dd>{item.action}</dd></div><div><dt>{copy.cases.labels.verify}</dt><dd>{item.verify}</dd></div></dl><aside><CheckCircle2 aria-hidden="true" /><div><strong>{copy.cases.labels.lesson}</strong><p>{item.lesson}</p></div></aside></div></details>)}</div>
      </section>

      <section className="gcs-module" id="gcs-worksheet">
        <header className="gcs-heading"><span><BarChart3 aria-hidden="true" /></span><div><p>{copy.worksheet.eyebrow}</p><h2>{copy.worksheet.title}</h2><div>{copy.worksheet.intro}</div></div></header>
        <div className="gcs-worksheet">
          <div className="gcs-worksheet-inputs"><div className="gcs-input-head"><span /> <strong>{copy.worksheet.baseline}</strong><strong>{copy.worksheet.current}</strong></div><div className="gcs-paired-row"><span>{copy.worksheet.flow}</span><NumberField id="gcs-baseline-flow" label={copy.worksheet.baseline} unit="m³/h" value={baselineFlow} onChange={setBaselineFlow} /><NumberField id="gcs-current-flow" label={copy.worksheet.current} unit="m³/h" value={currentFlow} onChange={setCurrentFlow} /></div><div className="gcs-paired-row"><span>{copy.worksheet.staticLevel}</span><NumberField id="gcs-baseline-static" label={copy.worksheet.baseline} unit="m" value={baselineStatic} onChange={setBaselineStatic} /><NumberField id="gcs-current-static" label={copy.worksheet.current} unit="m" value={currentStatic} onChange={setCurrentStatic} /></div><div className="gcs-paired-row"><span>{copy.worksheet.pumpingLevel}</span><NumberField id="gcs-baseline-pumping" label={copy.worksheet.baseline} unit="m" value={baselinePumping} onChange={setBaselinePumping} /><NumberField id="gcs-current-pumping" label={copy.worksheet.current} unit="m" value={currentPumping} onChange={setCurrentPumping} /></div><div className="gcs-flags"><label><input type="checkbox" checked={hasSand} onChange={(event) => setHasSand(event.currentTarget.checked)} /><span><Check aria-hidden="true" /></span>{copy.worksheet.sandFlag}</label><label><input type="checkbox" checked={hasQualityChange} onChange={(event) => setHasQualityChange(event.currentTarget.checked)} /><span><Check aria-hidden="true" /></span>{copy.worksheet.qualityFlag}</label></div></div>
          <output className="gcs-result" aria-live="polite"><p>{copy.worksheet.resultTitle}</p><h3>{pathway.title}</h3><div className="gcs-metrics"><div><span>{copy.worksheet.metrics.flowChange}</span><strong>{formatter.format(flowChange)}%</strong></div><div><span>{copy.worksheet.metrics.staticShift}</span><strong>{formatter.format(staticShift)} m</strong></div><div><span>{copy.worksheet.metrics.drawdownChange}</span><strong>{formatter.format(drawdownChange)} m</strong></div></div><p>{pathway.text}</p><div className="gcs-next-step"><ArrowRight aria-hidden="true" /><p><strong>{copy.worksheet.nextLabel}</strong>{pathway.next}</p></div><small><Info aria-hidden="true" />{copy.worksheet.screeningNote}</small><div className="gcs-report-actions"><button type="button" onClick={copyReport}>{copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}{copied ? copy.worksheet.copied : copy.worksheet.copy}</button><button type="button" onClick={downloadReport}><Download aria-hidden="true" />{copy.worksheet.download}</button></div></output>
        </div>
      </section>

      <section className="gcs-module" id="gcs-prevention">
        <header className="gcs-heading"><span><Wrench aria-hidden="true" /></span><div><p>{copy.prevention.eyebrow}</p><h2>{copy.prevention.title}</h2><div>{copy.prevention.intro}</div></div></header>
        <div className="gcs-prevention-grid"><div className="gcs-checklist"><div><h3>{copy.prevention.checklistTitle}</h3><strong>{checked.length}/{copy.prevention.checklist.length}</strong></div><div className="gcs-progress"><span style={{ width: `${(checked.length / copy.prevention.checklist.length) * 100}%` }} /></div>{copy.prevention.checklist.map((item, index) => <label key={item} className={checked.includes(index) ? 'is-checked' : ''}><input type="checkbox" checked={checked.includes(index)} onChange={() => setChecked((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])} /><span><Check aria-hidden="true" /></span>{item}</label>)}<p>{checked.length === copy.prevention.checklist.length ? copy.prevention.complete : `${copy.prevention.remaining}: ${copy.prevention.checklist.length - checked.length}`}</p></div><div className="gcs-records"><h3>{copy.prevention.recordsTitle}</h3>{copy.prevention.records.map((item, index) => <article key={item.title}>{index === 0 ? <Droplets aria-hidden="true" /> : index === 1 ? <Zap aria-hidden="true" /> : index === 2 ? <FlaskConical aria-hidden="true" /> : <History aria-hidden="true" />}<div><h4>{item.title}</h4><p>{item.detail}</p></div></article>)}</div></div>
      </section>

      <section className="gcs-quiz" id="gcs-quiz"><header><p>{copy.quiz.eyebrow}</p><h2>{copy.quiz.title}</h2><span>{copy.quiz.intro}</span></header><div>{copy.quiz.questions.map((question, questionIndex) => { const selected = answers[questionIndex]; const answered = selected !== undefined; return <fieldset key={question.question}><legend>{question.question}</legend>{question.choices.map((choice, choiceIndex) => <button type="button" key={choice} className={answered ? choiceIndex === question.correct ? 'is-correct' : selected === choiceIndex ? 'is-wrong' : '' : ''} onClick={() => setAnswers((current) => ({ ...current, [questionIndex]: choiceIndex }))}><span>{answered && choiceIndex === question.correct ? <CheckCircle2 aria-hidden="true" /> : null}</span>{choice}</button>)}{answered && <p className={selected === question.correct ? 'is-correct' : 'is-review'}><strong>{selected === question.correct ? copy.quiz.correct : copy.quiz.review}:</strong> {question.explanation}</p>}</fieldset> })}</div>{quizComplete && <div className="gcs-quiz-result"><div><span>{copy.quiz.score}</span><strong>{quizScore}/{copy.quiz.questions.length}</strong>{quizScore === copy.quiz.questions.length && <p>{copy.quiz.perfect}</p>}</div><button type="button" onClick={() => setAnswers({})}><RefreshCcw aria-hidden="true" />{copy.quiz.retry}</button></div>}</section>

      <section className="gcs-sources"><div><p>{copy.sources.eyebrow}</p><h2>{copy.sources.title}</h2><span>{copy.sources.reviewed}</span></div><ul>{officialSources.map((href, index) => <li key={href}><a href={href} target="_blank" rel="noopener noreferrer">{copy.sources.labels[index]}<ArrowRight aria-hidden="true" /></a></li>)}</ul></section>
      <section className="gcs-next"><div><Factory aria-hidden="true" /><div><h2>{copy.next.title}</h2><p>{copy.next.text}</p></div></div><nav><Link href={localLink('/learn/groundwater-calculator-tools')}>{copy.next.calculator}<ArrowRight aria-hidden="true" /></Link><Link href={localLink('/contact')}>{copy.next.contact}</Link></nav></section>
    </article>
  )
}
