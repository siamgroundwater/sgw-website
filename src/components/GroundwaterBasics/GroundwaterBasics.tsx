'use client'

import LearningDiagram from '@/components/LearningDiagram/LearningDiagram'
import Link from 'next/link'
import NumericInput from '@/components/LearningInputs/NumericInput'
import { validateNumericDraft } from '@/lib/learning-inputs'
import { learningFeedback } from '@/i18n/learning-feedback'
import LearningProgress, { useLearningProgress } from '@/components/LearningProgress/LearningProgress'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  CloudRain,
  Database,
  Droplets,
  FlaskConical,
  Gauge,
  MapPinned,
  RefreshCcw,
  ShieldCheck,
  Shovel,
  TestTube2,
  Waves,
  Wrench,
} from 'lucide-react'
import { localeInfo, localePath, type LocalizedLocale } from '@/i18n/config'
import './GroundwaterBasics.css'

const chapterIds = ['concept', 'thailand', 'workflow', 'well', 'pumping', 'quality', 'operation'] as const
type ChapterId = (typeof chapterIds)[number]

type BasicsCopy = {
  jumpLabel: string
  chapters: Record<ChapterId, string>
  takeawayTitle: string
  takeaways: string[]
  concept: {
    eyebrow: string
    title: string
    intro: string
    definition: string
    caption: string
    legend: string[]
    mythTitle: string
    mythText: string
    typesTitle: string
    types: Array<{ name: string; short: string; detail: string; implication: string }>
  }
  thailand: {
    eyebrow: string
    title: string
    intro: string
    regions: Array<{ title: string; detail: string; watch: string }>
    mapTitle: string
    mapText: string
    mapLink: string
  }
  workflow: {
    eyebrow: string
    title: string
    intro: string
    outputLabel: string
    steps: Array<{ title: string; detail: string; output: string }>
    legalTitle: string
    legalText: string
    legalLink: string
  }
  well: {
    eyebrow: string
    title: string
    intro: string
    caption: string
    parts: Array<{ title: string; detail: string }>
  }
  pumping: {
    eyebrow: string
    title: string
    intro: string
    staticLevel: string
    pumpingLevel: string
    flowRate: string
    drawdown: string
    specificCapacity: string
    unavailable: string
    interpretationTitle: string
    interpretation: string[]
    fullTool: string
  }
  quality: {
    eyebrow: string
    title: string
    intro: string
    clearWarning: string
    groups: Array<{ title: string; items: string; purpose: string }>
    salineTitle: string
    salineText: string
    standardLink: string
  }
  operation: {
    eyebrow: string
    title: string
    intro: string
    monitorTitle: string
    monitor: Array<{ title: string; detail: string }>
    warningTitle: string
    warnings: string[]
    checklistTitle: string
    checklistIntro: string
    checklist: string[]
    ready: string
    remaining: string
  }
  glossaryTitle: string
  glossary: Array<{ term: string; meaning: string }>
  quiz: {
    eyebrow: string
    title: string
    intro: string
    questions: Array<{ question: string; choices: string[]; correct: number; explanation: string }>
    correct: string
    review: string
    result: string
    perfect: string
    retry: string
  }
  sourcesTitle: string
  sourcesIntro: string
  reviewed: string
  nextTitle: string
  nextText: string
  calculatorLink: string
  contactLink: string
  imageAltAquifer: string
  imageAltWell: string
}

const copyByLocale: Record<LocalizedLocale, BasicsCopy> = {
  th: {
    jumpLabel: 'เลือกบทเรียน',
    chapters: { concept: 'น้ำบาดาลเกิดขึ้นอย่างไร', thailand: 'บริบทประเทศไทย', workflow: 'จากข้อมูลสู่บ่อจริง', well: 'ส่วนประกอบของบ่อ', pumping: 'อ่านผลสูบทดสอบ', quality: 'คุณภาพน้ำ', operation: 'ดูแลระยะยาว' },
    takeawayTitle: 'สรุปสั้น ๆ ก่อนเริ่ม',
    takeaways: ['น้ำบาดาลอยู่ในช่องว่างของดินและหิน บ่อใกล้กันจึงให้น้ำต่างกันได้', 'น้ำพอใช้กับน้ำปลอดภัยเป็นคนละเรื่อง ต้องทดสอบทั้งปริมาณและคุณภาพ', 'ก่อนลงทุน ควรรู้ความต้องการใช้น้ำ ตรวจเรื่องใบอนุญาต และวางแผนดูแลบ่อ'],
    concept: {
      eyebrow: 'เริ่มจากเรื่องใกล้ตัว', title: 'น้ำบาดาลมาจากไหน?',
      intro: 'น้ำฝนบางส่วนซึมลงดิน แล้วสะสมในช่องว่างของทราย กรวด หรือรอยแตกของหิน เมื่อช่องว่างเหล่านี้มีน้ำเต็ม เราเรียกน้ำส่วนนี้ว่า “น้ำบาดาล”',
      definition: 'บริเวณที่ช่องว่างอิ่มตัวด้วยน้ำเรียกว่าเขตอิ่มน้ำ ส่วนดินหรือหินที่กักเก็บและให้น้ำได้ในปริมาณที่นำมาใช้ประโยชน์ได้ เรียกว่า “ชั้นหินให้น้ำ” แต่ละชนิดรับน้ำและตอบสนองต่อการสูบต่างกัน',
      caption: 'อ่านภาพจากบนลงล่าง: ฝนซึมผ่านดิน → น้ำสะสมในช่องว่างของชั้นทราย กรวด หรือหิน → น้ำเคลื่อนที่ไปยังบ่อหรือแหล่งน้ำผิวดิน ภาพนี้เป็นแบบจำลองเพื่ออธิบาย ไม่ใช่หน้าตัดของพื้นที่จริง',
      legend: ['เขตไม่อิ่มน้ำ', 'ระดับน้ำบาดาล', 'ชั้นหินให้น้ำ', 'ชั้นกั้นน้ำ', 'หินแตกร้าว'],
      mythTitle: 'ทำไมบ่อใกล้กันจึงให้น้ำไม่เท่ากัน?', mythText: 'น้ำบาดาลส่วนใหญ่เคลื่อนผ่านช่องว่างเล็ก ๆ และรอยแตก ไม่ใช่แม่น้ำใต้ดินขนาดใหญ่ ช่องว่างเหล่านี้เชื่อมต่อกันต่างกันในแต่ละจุด บ่อใกล้กันจึงอาจมีความลึก ปริมาณน้ำ และคุณภาพน้ำต่างกันมาก',
      typesTitle: 'อ่านเพิ่ม: ชั้นหินให้น้ำแต่ละแบบต่างกันอย่างไร?',
      types: [
        { name: 'ชั้นน้ำไร้แรงดัน', short: 'น้ำซึมลงมาเติมจากด้านบน', detail: 'ผิวบนของชั้นนี้คือระดับน้ำบาดาล ระดับน้ำอาจเปลี่ยนตามฝนและฤดูกาลได้เร็ว และมักเสี่ยงรับสิ่งปนเปื้อนจากผิวดินมากกว่าชั้นน้ำที่มีชั้นกั้น', implication: 'ตรวจแหล่งมลพิษใกล้บ่อ ผนึกปากบ่อให้ดี และติดตามระดับน้ำต่างฤดูกาล' },
        { name: 'ชั้นน้ำมีแรงดัน', short: 'ถูกคั่นด้วยชั้นซึมผ่านต่ำ', detail: 'น้ำอยู่ระหว่างชั้นดินหรือหินที่น้ำผ่านได้ยาก เมื่อเจาะถึงระดับน้ำในบ่ออาจสูงกว่าหลังคาชั้นน้ำเพราะมีแรงดัน', implication: 'ต้องออกแบบการกรุและอุดซีเมนต์ไม่ให้ชั้นน้ำต่างคุณภาพเชื่อมถึงกัน และไม่ควรตีความคำว่า “มีแรงดัน” ว่าให้น้ำไม่จำกัด' },
        { name: 'ชั้นหินแตกร้าว', short: 'น้ำอยู่ตามแนวแตกของหิน', detail: 'ในหินแข็ง ปริมาณน้ำขึ้นกับจำนวน การเชื่อมต่อ และทิศทางของรอยแตก ไม่ได้ขึ้นกับความลึกเพียงอย่างเดียว', implication: 'ตำแหน่งเจาะและการสำรวจโครงสร้างธรณีมีความสำคัญสูง ผลของบ่อข้างเคียงอาจใช้เทียบตรง ๆ ไม่ได้' },
      ],
    },
    thailand: {
      eyebrow: 'รู้จักพื้นที่ของคุณ', title: 'แผนที่บอกได้ไหมว่าเจาะตรงไหนจะมีน้ำ?', intro: 'แผนที่ช่วยประเมินเบื้องต้นว่าพื้นที่นั้นมีชั้นน้ำแบบใด ลึกประมาณไหน และอาจได้ปริมาณกับคุณภาพน้ำอย่างไร แต่ยังต้องสำรวจจุดจริง เพราะแผนที่ไม่รับรองผลเจาะของแต่ละบ่อ',
      regions: [
        { title: 'แอ่งตะกอนและที่ราบลุ่ม', detail: 'มักพบชั้นทรายและกรวดสลับดินเหนียวหลายชั้น บางแห่งมีทั้งชั้นน้ำจืดและชั้นน้ำเค็มต่างระดับกัน', watch: 'ระวังการเชื่อมชั้นน้ำด้วยการกรุหรืออุดซีเมนต์ไม่เหมาะสม และเฝ้าระวังการทรุดตัวเมื่อมีการสูบมากในพื้นที่' },
        { title: 'ภาคตะวันออกเฉียงเหนือ', detail: 'บางพื้นที่มีชั้นเกลือหิน ทำให้น้ำบาดาลเค็มหรือมีแร่ธาตุละลายอยู่มากได้', watch: 'ให้ผู้เชี่ยวชาญใช้ผลสำรวจ ผลวัดในหลุมเจาะ และตัวอย่างน้ำร่วมกัน เพื่อแยกช่วงน้ำจืดกับน้ำเค็ม' },
        { title: 'พื้นที่หินแข็งและภูเขา', detail: 'น้ำมักอยู่ในรอยแตก รอยเลื่อน หรือชั้นหินผุ ปริมาณน้ำจึงเปลี่ยนมากตามตำแหน่ง', watch: 'สำรวจแนวโครงสร้างและข้อจำกัดหน้างานก่อนกำหนดจุดเจาะ พร้อมยอมรับความไม่แน่นอนที่สูงกว่าชั้นตะกอน' },
      ],
      mapTitle: 'เริ่มจากข้อมูลทางการ', mapText: 'กรมทรัพยากรน้ำบาดาลให้บริการแผนที่น้ำบาดาลรายจังหวัดและข้อมูลบ่อใกล้เคียงผ่าน Badan4Thai ใช้เพื่อวางแผนสำรวจ ไม่ควรใช้แทนการตรวจพื้นที่และออกแบบโดยผู้เชี่ยวชาญ', mapLink: 'ดูข้อมูล Badan4Thai',
    },
    workflow: {
      eyebrow: 'วางแผนก่อนลงทุน', title: 'ก่อนเจาะบ่อ ต้องเตรียมอะไรบ้าง?', intro: 'เริ่มจากน้ำที่ต้องใช้ แล้วตรวจพื้นที่และใบอนุญาต ขั้นตอนต่อไปนี้ช่วยให้คุยขอบเขตงานกับทีมสำรวจและผู้รับจ้างได้ชัดเจน', outputLabel: 'สิ่งที่ควรได้',
      steps: [
        { title: 'ต้องใช้น้ำเท่าไร?', detail: 'สรุปปริมาณน้ำต่อวัน ช่วงที่ใช้มากที่สุด ชั่วโมงเดินระบบ คุณภาพที่ต้องการ และแหล่งน้ำสำรอง', output: 'ตารางน้ำเข้า น้ำใช้ และน้ำเก็บสำรอง (Water balance) พร้อมเงื่อนไขออกแบบเบื้องต้น' },
        { title: 'ศึกษาข้อมูลเดิมและข้อจำกัดพื้นที่', detail: 'ตรวจแผนที่น้ำบาดาล ข้อมูลบ่อใกล้เคียง ธรณีวิทยา ทางเข้าเครื่องเจาะ สาธารณูปโภค และแหล่งเสี่ยงปนเปื้อน', output: 'แผนสำรวจและจุดเสี่ยงของโครงการ' },
        { title: 'ควรเจาะตรงไหน?', detail: 'ตรวจพื้นที่ร่วมกับข้อมูลดิน หิน และน้ำใต้ดิน หากจำเป็นให้ใช้เครื่องมือสำรวจใต้ผิวดินเพื่อช่วยเปรียบเทียบจุดเจาะ', output: 'จุดเจาะเป้าหมายพร้อมข้อมูลและเหตุผลที่เลือก' },
        { title: 'ตรวจข้อกฎหมายก่อนเริ่มงาน', detail: 'ยืนยันพื้นที่ควบคุม หน่วยงานผู้รับคำขอ ใบอนุญาตเจาะ ผู้รับจ้างที่มีคุณสมบัติ และเงื่อนไขเฉพาะโครงการ', output: 'เอกสารอนุมัติและขอบเขตงานที่ถูกต้อง' },
        { title: 'ระหว่างเจาะต้องบันทึกอะไร?', detail: 'บันทึกดินและหินที่พบในแต่ละความลึก แล้วออกแบบท่อกรุ ท่อกรอง กรวด และซีเมนต์ผนึกตามชั้นน้ำจริง', output: 'บันทึกชั้นดินหินและข้อมูลบ่อ (Well log) พร้อมแบบบ่อที่ก่อสร้างจริง' },
        { title: 'พัฒนาบ่อและสูบทดสอบ', detail: 'ล้างเศษตะกอนจากงานเจาะ ทำให้กรวดกรุจัดตัว แล้ววัดอัตราสูบ ระดับน้ำตามเวลา และการฟื้นตัว', output: 'อัตราสูบแนะนำและข้อมูลเลือกปั๊ม' },
        { title: 'วิเคราะห์น้ำและส่งมอบระบบ', detail: 'เก็บตัวอย่างหลังพัฒนาบ่อด้วยวิธีที่เหมาะสม วิเคราะห์ตามวัตถุประสงค์ และบันทึกค่าฐานก่อนใช้งาน', output: 'ผลแล็บ เอกสารบ่อ คู่มือ และแผนติดตาม' },
      ],
      legalTitle: 'อย่าข้ามขั้นตอนใบอนุญาต', legalText: 'ข้อกำหนดและแบบฟอร์มอาจเปลี่ยนแปลงตามพื้นที่และประเภทการใช้ ก่อนเจาะหรือใช้น้ำบาดาลให้ตรวจสอบข้อมูลล่าสุดกับกรมทรัพยากรน้ำบาดาลหรือพนักงานน้ำบาดาลประจำท้องที่', legalLink: 'อ่านคู่มือกฎหมายและใบอนุญาต',
    },
    well: {
      eyebrow: 'รู้จักส่วนประกอบ', title: 'แต่ละส่วนของบ่อช่วยอะไร?', intro: 'บ่อต้องรับน้ำจากชั้นที่เลือก ควบคุมทราย และป้องกันน้ำต่างชั้นไหลปนกัน จึงต้องออกแบบทั้งตัวบ่อ ปั๊ม และจุดตรวจวัดให้ทำงานร่วมกัน', caption: 'ภาพจำลองการสูบทดสอบ: เมื่อสูบ ระดับน้ำรอบบ่อลดลง การวัดว่าสูบน้ำได้เท่าไรและระดับน้ำเปลี่ยนตามเวลาอย่างไร ช่วยประเมินการทำงานของบ่อ ภาพนี้ไม่ใช่แบบก่อสร้างจริง',
      parts: [
        { title: 'ปากบ่อและฐานคอนกรีต', detail: 'ยกปากบ่อและระบายน้ำออกจากบ่อ ลดโอกาสให้น้ำสกปรกไหลย้อนลงแนวกรุ' },
        { title: 'ท่อกรุและซีเมนต์ผนึก', detail: 'ท่อกรุช่วยพยุงผนังบ่อ ซีเมนต์ปิดช่องว่างรอบท่อในช่วงที่ออกแบบ เพื่อไม่ให้น้ำต่างชั้นไหลปนกัน' },
        { title: 'ท่อกรองและกรวดกรุ', detail: 'ช่องเปิดของท่อให้น้ำเข้า ส่วนกรวดรอบท่อช่วยควบคุมทราย ต้องเลือกขนาดให้เหมาะกับเม็ดดินและทรายของชั้นน้ำ' },
        { title: 'เครื่องสูบและท่อส่ง', detail: 'ติดตั้งตามระดับน้ำขณะสูบ อัตราสูบแนะนำ ความลึกบ่อ และเงื่อนไขระบายความร้อนของมอเตอร์' },
        { title: 'จุดวัดและเก็บตัวอย่าง', detail: 'ควรเข้าถึงการวัดระดับน้ำ อัตราการไหล แรงดัน กระแสไฟ และจุดเก็บตัวอย่างที่เป็นตัวแทน' },
        { title: 'เอกสารก่อสร้างจริง', detail: 'ระบุความลึก ขนาดท่อ ช่วงท่อกรอง กรวด ซีเมนต์ ปั๊ม และผลทดสอบ เพื่อใช้ดูแลตลอดอายุบ่อ' },
      ],
    },
    pumping: {
      eyebrow: 'ลองอ่านผลสูบทดสอบ', title: 'สูบน้ำแล้ว ระดับน้ำลดลงเท่าไร?', intro: 'การสูบทดสอบ (Pumping test) ดูว่าสูบน้ำได้เท่าไรและระดับน้ำเปลี่ยนอย่างไร ตัวเลขด้านล่างเป็นตัวอย่างให้ลองปรับ ให้วัดความลึกของระดับน้ำก่อนสูบและขณะสูบจากจุดเดียวกันที่ปากบ่อ', staticLevel: 'ความลึกระดับน้ำก่อนสูบ (ระดับน้ำสถิต)', pumpingLevel: 'ความลึกระดับน้ำขณะสูบ', flowRate: 'ปริมาณน้ำที่สูบต่อชั่วโมง', drawdown: 'ระดับน้ำลดลง', specificCapacity: 'น้ำที่ได้ต่อระยะน้ำลด 1 เมตร', unavailable: 'คำนวณค่านี้ได้เมื่อระดับน้ำขณะสูบลึกกว่าก่อนสูบ', interpretationTitle: 'ตัวเลขนี้บอกอะไร และยังไม่บอกอะไร?',
      interpretation: ['ระยะน้ำลด (Drawdown) = ความลึกระดับน้ำขณะสูบ − ความลึกก่อนสูบ เช่น จาก 12 เป็น 27 เมตร ระดับน้ำลดลง 15 เมตร', 'ความจุจำเพาะของบ่อ (Specific capacity) = อัตราสูบ ÷ ระยะน้ำลด เช่น 30 ÷ 15 = 2 ลูกบาศก์เมตรต่อชั่วโมง ต่อระยะน้ำลด 1 เมตร ใช้เทียบเมื่อเงื่อนไขและระยะเวลาทดสอบใกล้เคียงกัน', 'ค่าสูงไม่ได้ยืนยันว่าสูบได้เท่านั้นตลอดไป ปริมาณที่สูบได้ระยะยาวโดยไม่เกิดผลกระทบที่ยอมรับไม่ได้ (Sustainable yield) ต้องประเมินทั้งพื้นที่ รวมผลต่อแหล่งน้ำและสิ่งแวดล้อม', 'การทดสอบจริงต้องบันทึกอัตราสูบ ระดับน้ำตามเวลา และการฟื้นตัวหลังหยุดสูบ ให้ผู้เชี่ยวชาญเลือกอัตราใช้งานโดยดูชั้นน้ำ โครงสร้างบ่อ ระดับจุ่มปั๊ม ฤดูกาล และบ่อข้างเคียงร่วมกัน'], fullTool: 'เปิดเครื่องมือคำนวณฉบับเต็ม',
    },
    quality: {
      eyebrow: 'ตรวจให้ตรงกับการใช้', title: 'น้ำใสแล้ว ใช้หรือดื่มได้เลยไหม?', intro: 'ยังสรุปไม่ได้ แม้บ่อให้น้ำพอ ก็ต้องตรวจคุณภาพแยกต่างหาก เลือกรายการตรวจให้ตรงกับการใช้ เช่น ดื่ม ผลิตอาหาร หล่อเย็น รดน้ำ หรือสุขาภิบาล แต่ละงานต้องการคุณภาพน้ำต่างกัน', clearWarning: 'สี กลิ่น และความใสไม่ยืนยันความปลอดภัย ต้องเก็บตัวอย่างอย่างถูกวิธีและใช้ผลจากห้องปฏิบัติการ',
      groups: [
        { title: 'กายภาพและค่าพื้นฐาน', items: 'สี ความขุ่น กลิ่น pH การนำไฟฟ้า และของแข็งละลาย', purpose: 'ช่วยคัดกรองปัญหา ติดตามแนวโน้ม และเลือกกระบวนการปรับปรุงเบื้องต้น' },
        { title: 'แร่ธาตุและเคมี', items: 'เหล็ก แมงกานีส ความกระด้าง คลอไรด์ ฟลูออไรด์ ไนเตรต สารหนู และรายการตามความเสี่ยงพื้นที่', purpose: 'มีผลต่อสุขภาพ รสชาติ คราบ ตะกรัน การกัดกร่อน และกระบวนการผลิต' },
        { title: 'จุลชีววิทยา', items: 'โคลิฟอร์ม E. coli และตัวชี้วัดที่มาตรฐานการใช้น้ำกำหนด', purpose: 'สำคัญสำหรับน้ำบริโภค อาหาร และงานที่มีโอกาสสัมผัสคน' },
        { title: 'รายการเฉพาะกิจกรรม', items: 'โลหะหนัก สารอินทรีย์ สารกำจัดศัตรูพืช หรือพารามิเตอร์ของกระบวนการ', purpose: 'กำหนดจากประวัติพื้นที่ แหล่งมลพิษใกล้เคียง และข้อกำหนดของผู้ใช้น้ำ' },
      ],
      salineTitle: 'ความเค็มเป็นประเด็นสำคัญในบางพื้นที่', salineText: 'ภาคกลางตอนล่างและบางส่วนของภาคตะวันออกเฉียงเหนืออาจพบชั้นน้ำเค็มต่างสาเหตุ การแยกช่วงน้ำจืด–น้ำเค็มต้องใช้ข้อมูลหลายชนิดร่วมกัน และต้องออกแบบบ่อไม่ให้เชื่อมชั้นน้ำ', standardLink: 'ดูมาตรฐานคุณภาพน้ำบาดาลเพื่อการบริโภค',
    },
    operation: {
      eyebrow: 'ดูแลหลังเริ่มใช้งาน', title: 'จะรู้ได้อย่างไรว่าบ่อเริ่มมีปัญหา?', intro: 'เก็บค่าตอนส่งมอบไว้เป็นจุดอ้างอิง แล้วเทียบกับค่าที่วัดในเงื่อนไขใกล้เคียงกันภายหลัง รอบตรวจแต่ละบ่ออาจต่างกัน ขึ้นกับความสำคัญของระบบ คุณภาพน้ำ ชั่วโมงใช้งาน และเงื่อนไขใบอนุญาต', monitorTitle: 'ควรจดอะไรไว้บ้าง?',
      monitor: [
        { title: 'อัตราการไหลและชั่วโมงทำงาน', detail: 'เปรียบเทียบปริมาณน้ำกับเวลาเดินเครื่อง เพื่อเห็นกำลังผลิตและความต้องการที่เปลี่ยนไป' },
        { title: 'ระดับน้ำสถิตและขณะสูบ', detail: 'ใช้ดูการเปลี่ยนของชั้นน้ำ การอุดตัน และความเหมาะสมของอัตราสูบ' },
        { title: 'แรงดัน กระแส และพลังงาน', detail: 'ความผิดปกติอาจชี้ไปที่ปั๊ม ท่อ วาล์ว ไฟฟ้า หรือระดับน้ำที่เปลี่ยน' },
        { title: 'ความขุ่น ทราย และคุณภาพน้ำ', detail: 'เทียบกับค่าฐานและเกณฑ์การใช้ ไม่รอจนสีหรือกลิ่นเปลี่ยนชัดเจน' },
      ],
      warningTitle: 'เจอสัญญาณเหล่านี้ ให้หาสาเหตุก่อนเพิ่มขนาดปั๊ม', warnings: ['น้ำไหลน้อยลง ทั้งที่ระดับน้ำใกล้เดิม', 'สูบเท่าเดิม แต่ระดับน้ำลดลงมากกว่าเดิม', 'มีทราย ความขุ่น กลิ่น หรือความเค็มเพิ่มขึ้น', 'กระแสไฟ แรงดัน เสียง หรือแรงสั่นเปลี่ยน', 'หลังหยุดสูบ ระดับน้ำกลับคืนช้ากว่าเดิมอย่างต่อเนื่อง'],
      checklistTitle: 'เช็กลิสต์ก่อนตัดสินใจลงทุน', checklistIntro: 'ลองทำเครื่องหมายเฉพาะรายการที่โครงการมีข้อมูลยืนยันแล้ว',
      checklist: ['รู้ปริมาณน้ำเข้า น้ำใช้ น้ำสำรอง และช่วงที่ใช้มากที่สุด', 'ตรวจแผนที่และข้อมูลบ่อใกล้เคียงแล้ว', 'ตรวจทางเข้าเครื่องเจาะและแหล่งเสี่ยงปนเปื้อนแล้ว', 'ตรวจเงื่อนไขใบอนุญาตและผู้รับผิดชอบแล้ว', 'ตกลงให้ส่งบันทึกชั้นดินหินและแบบบ่อที่ก่อสร้างจริงแล้ว', 'ตกลงวิธีสูบทดสอบและรายงานที่จะได้รับแล้ว', 'เลือกรายการตรวจน้ำให้ตรงกับการใช้งานแล้ว', 'มีแผนจดค่าตรวจวัดและดูแลบ่อหลังส่งมอบแล้ว'], ready: 'ข้อมูลพร้อมสำหรับคุยขอบเขตงาน', remaining: 'รายการที่ควรเตรียมเพิ่ม',
    },
    glossaryTitle: 'คำศัพท์ที่ควรรู้',
    glossary: [
      { term: 'ชั้นหินให้น้ำ (Aquifer)', meaning: 'ชั้นดินหรือหินที่ช่องว่างอิ่มน้ำ และสามารถกักเก็บกับส่งน้ำให้ใช้ประโยชน์ได้' },
      { term: 'ระดับน้ำบาดาล (Water table)', meaning: 'ผิวบนของบริเวณที่ช่องว่างมีน้ำเต็มในชั้นน้ำไร้แรงดัน เหนือขึ้นไปยังมีทั้งอากาศและน้ำในช่องว่าง' },
      { term: 'การเติมน้ำบาดาล (Recharge)', meaning: 'น้ำที่ซึมลงไปจนถึงเขตอิ่มน้ำและเติมแหล่งน้ำบาดาล น้ำฝนที่ตกลงมาไม่ได้กลายเป็นน้ำบาดาลทั้งหมด' },
      { term: 'ระดับน้ำสถิต (Static water level)', meaning: 'ระดับน้ำในบ่อก่อนสูบหรือหลังหยุดสูบและปล่อยให้ฟื้นตัวตามเงื่อนไขทดสอบ ต้องระบุจุดอ้างอิงและเวลาที่วัด' },
      { term: 'ระยะน้ำลด (Drawdown)', meaning: 'ระยะที่ระดับน้ำลดลงจากก่อนสูบ เมื่อวัดความลึกจากจุดเดียวกัน ให้ลบความลึกก่อนสูบออกจากความลึกขณะสูบ' },
      { term: 'ความจุจำเพาะของบ่อ (Specific capacity)', meaning: 'อัตราสูบหารด้วยระยะน้ำลด บอกว่าสูบน้ำได้เท่าไรต่อระดับน้ำที่ลดลง 1 เมตร ต้องระบุอัตราสูบและระยะเวลาทดสอบเมื่อนำไปเปรียบเทียบ' },
      { term: 'ตารางสมดุลน้ำ (Water balance)', meaning: 'ในแผนโครงการ คือการสรุปน้ำเข้า น้ำออก และการเปลี่ยนของน้ำที่เก็บไว้ในช่วงเวลาเดียวกัน เพื่อเทียบแหล่งน้ำกับความต้องการใช้' },
      { term: 'บันทึกข้อมูลบ่อ (Well log)', meaning: 'บันทึกสิ่งที่พบตามความลึก เช่น ชั้นดินหินและข้อมูลระหว่างเจาะ ใช้ร่วมกับแบบบ่อที่ก่อสร้างจริงเพื่อดูแลบ่อภายหลัง' },
      { term: 'ปริมาณสูบที่ยั่งยืน (Sustainable yield)', meaning: 'ปริมาณที่สูบได้ในระยะยาวโดยไม่เกิดผลกระทบที่ยอมรับไม่ได้ต่อแหล่งน้ำและสิ่งแวดล้อม ต้องประเมินทั้งระบบ ไม่ได้อ่านจากผลสูบทดสอบครั้งเดียว' },
      { term: 'การพัฒนาบ่อ (Well development)', meaning: 'การนำตะกอนจากงานเจาะออกและจัดสภาพรอบท่อกรอง เพื่อให้น้ำไหลเข้าบ่อได้ดีและลดทราย' },
    ],
    quiz: {
      eyebrow: 'ทบทวนความเข้าใจ', title: 'แบบทดสอบสั้นก่อนจบบทเรียน', intro: 'เลือกคำตอบที่เหมาะสมที่สุด ระบบจะแสดงเหตุผลทันที', correct: 'ถูกต้อง', review: 'ลองทบทวนอีกครั้ง', result: 'คะแนนของคุณ', perfect: 'เข้าใจพื้นฐานพร้อมนำไปใช้คุยกับทีมสำรวจและออกแบบแล้ว', retry: 'เริ่มทำใหม่',
      questions: [
        { question: 'เหตุใดบ่อใกล้กันจึงอาจให้น้ำต่างกันมาก?', choices: ['เพราะยี่ห้อปั๊มเพียงอย่างเดียว', 'เพราะช่องว่าง รอยแตก และชั้นน้ำต่างกันในแต่ละจุด', 'เพราะน้ำบาดาลไหลเฉพาะตอนกลางคืน'], correct: 1, explanation: 'น้ำไหลเข้าบ่อผ่านช่องว่างที่เชื่อมถึงกัน ปริมาณน้ำจึงขึ้นกับชั้นน้ำและการก่อสร้างบ่อด้วย' },
        { question: 'การสูบทดสอบช่วยตัดสินใจเรื่องใด?', choices: ['เลือกอัตราสูบและปั๊มจากปริมาณน้ำกับระดับน้ำที่เปลี่ยน', 'ยืนยันว่าบ่อจะให้น้ำเท่าเดิมตลอดไป', 'ใช้แทนผลวิเคราะห์คุณภาพน้ำ'], correct: 0, explanation: 'ผลทดสอบบอกการทำงานของบ่อในเงื่อนไขที่ทดสอบ ยังต้องตรวจคุณภาพน้ำและติดตามการใช้งานระยะยาว' },
        { question: 'น้ำใสและไม่มีกลิ่นหมายความว่าดื่มได้หรือไม่?', choices: ['ดื่มได้ทันที', 'ดื่มได้ถ้าบ่อลึก', 'ยังสรุปไม่ได้ ต้องเก็บตัวอย่างและตรวจตามมาตรฐานการใช้'], correct: 2, explanation: 'สารละลายและจุลชีพบางชนิดมองไม่เห็นและไม่มีกลิ่น' },
        { question: 'เอกสารใดช่วยให้ดูแลบ่อในอนาคตได้?', choices: ['เฉพาะใบเสร็จค่าเจาะ', 'บันทึกชั้นดินหิน แบบบ่อจริง ผลสูบทดสอบ ผลตรวจน้ำ และข้อมูลปั๊ม', 'เฉพาะรูปถ่ายวันส่งมอบ'], correct: 1, explanation: 'ใช้เอกสารเหล่านี้เทียบกับค่าปัจจุบัน หาสาเหตุเมื่อบ่อผิดปกติ และวางแผนซ่อมหรือเปลี่ยนอุปกรณ์' },
      ],
    },
    sourcesTitle: 'แหล่งเรียนรู้ทางการ', sourcesIntro: 'เนื้อหานี้สรุปเพื่อการเรียนรู้และวางแผนเบื้องต้น โครงการจริงควรตรวจข้อมูลล่าสุดจากหน่วยงานกำกับและผู้เชี่ยวชาญ', reviewed: 'ตรวจทานแหล่งข้อมูลล่าสุด: 4 สิงหาคม 2569',
    nextTitle: 'พร้อมเปลี่ยนความรู้เป็นข้อมูลโครงการ?', nextText: 'คำนวณความต้องการเบื้องต้น หรือส่งข้อมูลพื้นที่ให้ทีมงานช่วยจัดลำดับการสำรวจและออกแบบ', calculatorLink: 'ไปที่เครื่องมือคำนวณ', contactLink: 'ปรึกษาทีมงาน',
    imageAltAquifer: 'ภาพตัดขวางแสดงน้ำฝนซึมผ่านชั้นดินสู่ชั้นน้ำบาดาลและบ่อ', imageAltWell: 'ภาพตัดขวางส่วนประกอบบ่อน้ำบาดาลและอุปกรณ์สูบทดสอบ',
  },
  en: {
    jumpLabel: 'Choose a module', chapters: { concept: 'How groundwater forms', thailand: 'Thailand context', workflow: 'From evidence to a well', well: 'Well anatomy', pumping: 'Read a pumping test', quality: 'Water quality', operation: 'Long-term care' },
    takeawayTitle: 'The essentials at a glance',
    takeaways: ['Groundwater fills pores and fractures in the ground. Nearby wells can give different yields.', 'Enough water and safe water are separate questions. Check both quantity and quality.', 'Before investing, understand your demand, check permits and plan for well maintenance.'],
    concept: { eyebrow: 'Start with the basics', title: 'Where does groundwater come from?', intro: 'Some rain soaks into the ground and collects in the spaces between sand, gravel or cracks in rock. Where those spaces are filled with water, that water is groundwater.', definition: 'The area where openings are filled with water is the saturated zone. Material that can store and transmit useful quantities of water is called an aquifer. Different aquifer types receive water and respond to pumping differently.', caption: 'Read from top to bottom: rain soaks through soil → water collects in sand, gravel or rock → water moves toward wells or surface water. This illustration explains the concept; it is not a cross-section of a specific site.', legend: ['Unsaturated zone', 'Water table', 'Aquifer', 'Low-permeability layer', 'Fractured rock'], mythTitle: 'Why can nearby wells give different amounts of water?', mythText: 'Most groundwater moves through small spaces and cracks, rather than giant underground rivers. Those spaces connect differently from place to place, so nearby wells can differ greatly in depth, water quantity and quality.', typesTitle: 'Read more: how do aquifer types differ?', types: [
      { name: 'Unconfined aquifer', short: 'Water can soak in from above', detail: 'Its upper surface is the water table. It may respond quickly to rain and seasons and is often more exposed to surface contamination than a confined aquifer.', implication: 'Check nearby pollution sources, seal the wellhead properly and track water levels across seasons.' },
      { name: 'Confined aquifer', short: 'Bounded by low-permeability layers', detail: 'Water is held under pressure between layers that transmit water poorly, so the water level in a well may rise above the top of the aquifer.', implication: 'Casing and grout must prevent mixing between aquifers. Pressure does not mean unlimited yield.' },
      { name: 'Fractured-rock aquifer', short: 'Water follows connected fractures', detail: 'In hard rock, yield depends on the number, opening, orientation and connection of fractures rather than depth alone.', implication: 'Structural interpretation and careful siting are critical; a nearby well is not a guaranteed analogue.' },
    ] },
    thailand: { eyebrow: 'Understand your site', title: 'Can a map tell you where drilling will find water?', intro: 'A map helps estimate the aquifer type, likely depth, water quantity and quality in an area. The actual site still needs investigation: a map does not guarantee the result of an individual well.', regions: [
      { title: 'Sedimentary basins and river plains', detail: 'Sand and gravel aquifers may alternate with clay, sometimes with fresh and saline water at different depths.', watch: 'Prevent vertical mixing with suitable casing and grout; monitor land-subsidence risk where regional pumping is intensive.' },
      { title: 'Northeastern Thailand', detail: 'Rock-salt layers can make groundwater salty or rich in dissolved minerals in some areas.', watch: 'Have specialists combine survey results, measurements inside the borehole and water samples to distinguish fresh and salty water zones.' },
      { title: 'Hard-rock and upland areas', detail: 'Groundwater is commonly stored in weathered zones, joints and faults, creating strong location-to-location variation.', watch: 'Map structures and site constraints before drilling and plan for greater uncertainty than in continuous sedimentary aquifers.' },
    ], mapTitle: 'Begin with official data', mapText: 'The Department of Groundwater Resources provides provincial groundwater maps and nearby-well information through Badan4Thai. Use them to plan investigation, not to replace site inspection and professional design.', mapLink: 'Open Badan4Thai information' },
    workflow: { eyebrow: 'Plan before investing', title: 'What should you prepare before drilling?', intro: 'Start with the water you need, then check the site and permits. These steps help you agree a clear scope with the survey team and contractor.', outputLabel: 'What you should receive', steps: [
      { title: 'How much water do you need?', detail: 'List daily water use, the busiest periods, operating hours, required quality and backup sources.', output: 'A record of water coming in, being used and stored (water balance), plus initial design requirements' },
      { title: 'Review existing evidence and constraints', detail: 'Check groundwater maps, nearby wells, geology, rig access, utilities and contamination hazards.', output: 'Investigation plan and risk register' },
      { title: 'Where should the well go?', detail: 'Inspect the site alongside soil, rock and groundwater information. Where useful, use subsurface survey equipment to compare drilling locations.', output: 'A target location with the evidence and reasons for choosing it' },
      { title: 'Confirm regulatory requirements', detail: 'Verify the responsible authority, drilling and use permits, contractor qualifications and project conditions.', output: 'Valid approvals and compliant scope' },
      { title: 'What should be recorded during drilling?', detail: 'Record soil and rock at each depth, then design the casing, screen, gravel and sealing grout for the aquifers found.', output: 'A depth-by-depth ground and borehole record (well log), plus drawings of the well as actually built' },
      { title: 'Develop and pump-test the well', detail: 'Remove drilling fines, stabilize the intake zone and record flow, water level and recovery over time.', output: 'Recommended operating rate and pump basis' },
      { title: 'Analyze water and hand over the asset', detail: 'Sample correctly after development, analyze for the intended use and record an operating baseline.', output: 'Laboratory report, well file and monitoring plan' },
    ], legalTitle: 'Do not skip permits', legalText: 'Requirements and forms can vary by area and use. Confirm the latest requirements with the Department of Groundwater Resources or the responsible local groundwater officer before drilling or abstraction.', legalLink: 'Read the law and permit guide' },
    well: { eyebrow: 'Meet the components', title: 'What does each part of a well do?', intro: 'A well must collect water from the chosen layer, control sand and prevent water from different layers mixing. The well structure, pump and measurement points need to work together.', caption: 'Illustrated pumping test: pumping lowers the water level around the well. Measuring how much water is pumped and how levels change over time helps assess the well. This is not a construction drawing.', parts: [
      { title: 'Wellhead and concrete apron', detail: 'Keep the casing above ground level and drain dirty water away from the well.' }, { title: 'Casing and sealing grout', detail: 'Casing supports the borehole wall. Grout seals the space around it at designed depths to stop water from different layers mixing.' }, { title: 'Screen and gravel pack', detail: 'Screen openings let water in; the surrounding gravel helps control sand. Their sizes must suit the grains in the aquifer.' }, { title: 'Pump and rising main', detail: 'Select and position the pump from tested flow, pumping level, well depth and motor-cooling requirements.' }, { title: 'Measurement and sampling access', detail: 'Provide access for water level, flow, pressure, current and a representative sampling point.' }, { title: 'As-built file', detail: 'Record depths, diameters, screen, gravel, grout, pump and tests for the entire service life.' },
    ] },
    pumping: { eyebrow: 'Explore a pumping test', title: 'How far does the water level fall when you pump?', intro: 'A pumping test measures how much water is pumped and how the water level responds. The numbers below are examples to try. Measure depth to water before and during pumping from the same point at the wellhead.', staticLevel: 'Depth to water before pumping (static level)', pumpingLevel: 'Depth to water during pumping', flowRate: 'Water pumped per hour', drawdown: 'Fall in water level', specificCapacity: 'Water per 1 metre of water-level fall', unavailable: 'This needs a pumping level deeper than the level before pumping.', interpretationTitle: 'What do these numbers tell you—and what do they not?', interpretation: ['Drawdown is the fall in water level: pumping depth minus depth before pumping. From 12 to 27 metres means a 15-metre fall.', 'Specific capacity is pumping rate divided by drawdown. For example, 30 ÷ 15 = 2 cubic metres per hour per metre of fall. Compare values only under similar conditions and test durations.', 'A high value does not confirm that this rate can continue forever. Sustainable yield means the amount that can be pumped long term without unacceptable effects; it needs a wider assessment of water resources and the environment.', 'Real tests record flow, water level over time and recovery after stopping. Specialists set operating rates using the aquifer, well structure, pump submergence, seasons and nearby wells together.'], fullTool: 'Open the full calculator' },
    quality: { eyebrow: 'Test for the intended use', title: 'If the water is clear, can you use or drink it?', intro: 'You cannot tell yet. Even when there is enough water, quality needs a separate check. Choose tests for the intended use, such as drinking, food production, cooling, irrigation or sanitation. Each needs different water quality.', clearWarning: 'Color, smell and clarity do not confirm safety. Collect samples correctly and use laboratory results.', groups: [
      { title: 'Physical and baseline', items: 'Color, turbidity, odor, pH, conductivity and dissolved solids', purpose: 'Screen problems, establish trends and guide preliminary treatment.' }, { title: 'Minerals and chemistry', items: 'Iron, manganese, hardness, chloride, fluoride, nitrate, arsenic and site-risk parameters', purpose: 'Affect health, taste, staining, scale, corrosion and process performance.' }, { title: 'Microbiology', items: 'Coliforms, E. coli and indicators required by the applicable standard', purpose: 'Critical for drinking, food and human-contact uses.' }, { title: 'Activity-specific risks', items: 'Metals, organics, pesticides or process-specific parameters', purpose: 'Set from land-use history, nearby hazards and user requirements.' },
    ], salineTitle: 'Salinity matters in some Thai settings', salineText: 'Lower Central Thailand and parts of the Northeast may contain saline intervals for different geological reasons. Distinguishing fresh and saline zones requires multiple lines of evidence and a well design that does not connect them.', standardLink: 'View the DGR drinking-water standard' },
    operation: { eyebrow: 'Care after handover', title: 'How can you spot a developing well problem?', intro: 'Keep handover readings as a reference, then compare later readings taken under similar conditions. Inspection schedules vary with system importance, water quality, operating hours and permit conditions.', monitorTitle: 'What should you write down?', monitor: [
      { title: 'Flow and operating hours', detail: 'Relate delivered volume to runtime and changing demand.' }, { title: 'Static and pumping water levels', detail: 'Track aquifer response, clogging and whether the abstraction rate remains appropriate.' }, { title: 'Pressure, current and energy', detail: 'Changes can reveal pump, pipe, valve, electrical or water-level problems.' }, { title: 'Turbidity, sand and water quality', detail: 'Compare against the baseline and end-use criteria before visible deterioration.' },
    ], warningTitle: 'Find the cause before installing a larger pump', warnings: ['Less water flows while the water level stays similar.', 'At the same pumping rate, the water level falls further.', 'Sand, turbidity, odor or salinity increases.', 'Current, pressure, sound or vibration changes.', 'After stopping, the water level consistently recovers more slowly.'], checklistTitle: 'Pre-investment readiness checklist', checklistIntro: 'Mark only items supported by project evidence.', checklist: ['Know water supply, use, storage and busiest periods', 'Reviewed maps and nearby-well data', 'Checked rig access and contamination risks', 'Confirmed permits and responsible parties', 'Agreed to receive ground records and drawings of the completed well', 'Agreed the pumping-test method and report', 'Chosen water tests for the intended use', 'Planned readings and well care after handover'], ready: 'Ready for a scope discussion', remaining: 'Items still to prepare' },
    glossaryTitle: 'Essential glossary', glossary: [
      { term: 'Aquifer', meaning: 'A layer of soil or rock whose spaces are water-filled and which can store and supply useful quantities of water.' },
      { term: 'Water table', meaning: 'The top of the water-filled zone in an unconfined aquifer. Above it, spaces contain both air and water.' },
      { term: 'Recharge', meaning: 'Water that reaches the saturated zone and replenishes groundwater. Not all rainfall becomes groundwater.' },
      { term: 'Static water level', meaning: 'The water level before pumping, or after stopping and allowing recovery under the test conditions. Record the reference point and measurement time.' },
      { term: 'Drawdown', meaning: 'How far water falls from its pre-pumping level. For depths measured from the same point, subtract the pre-pumping depth from the pumping depth.' },
      { term: 'Specific capacity', meaning: 'Pumping rate divided by drawdown: water pumped per metre of water-level fall. State the pumping rate and test duration when comparing values.' },
      { term: 'Water balance', meaning: 'For project planning, a record of water coming in, going out and changes in stored water over the same period, used to compare supply with demand.' },
      { term: 'Well log', meaning: 'A depth-by-depth record of ground and drilling observations. Keep it with drawings of the actual completed well for future maintenance.' },
      { term: 'Sustainable yield', meaning: 'The amount that can be pumped long term without unacceptable effects on water resources and the environment. It requires a whole-system assessment, not a single pumping-test result.' },
      { term: 'Well development', meaning: 'Removing drilling sediment and improving the area around the screen so water can enter more easily with less sand.' },
    ],
    quiz: { eyebrow: 'Knowledge check', title: 'A short review before you finish', intro: 'Choose the best answer and see the reason immediately.', correct: 'Correct', review: 'Review this point', result: 'Your score', perfect: 'You are ready to discuss the fundamentals with an investigation and design team.', retry: 'Try again', questions: [
      { question: 'Why can nearby wells give very different amounts of water?', choices: ['The pump brand alone explains it.', 'Spaces, cracks and aquifer layers vary by location.', 'Groundwater flows only at night.'], correct: 1, explanation: 'Water enters through connected spaces, so the aquifer and well construction both affect quantity.' }, { question: 'What decision does a pumping test help with?', choices: ['Choosing a pumping rate and pump using flow and changing water levels.', 'Guaranteeing the same amount of water forever.', 'Replacing water-quality analysis.'], correct: 0, explanation: 'It shows how the well works under the test conditions. Water-quality checks and long-term monitoring are still needed.' }, { question: 'Does clear, odorless groundwater mean it is drinkable?', choices: ['Yes, immediately.', 'Yes, if the well is deep.', 'Not necessarily; it must be sampled and tested for the intended use.'], correct: 2, explanation: 'Many dissolved substances and microorganisms are invisible and odorless.' }, { question: 'Which records help you care for the well later?', choices: ['Only the drilling invoice.', 'Ground records, completed-well drawings, pumping tests, water tests and pump data.', 'Only completion-day photographs.'], correct: 1, explanation: 'Compare these records with current readings to investigate changes and plan repairs or replacement.' },
    ] },
    sourcesTitle: 'Official learning sources', sourcesIntro: 'This lesson supports learning and early planning. Confirm project decisions against current regulatory information and professional advice.', reviewed: 'Sources reviewed: 4 August 2026', nextTitle: 'Ready to turn learning into project data?', nextText: 'Estimate the preliminary demand or send site information to the team for an investigation and design discussion.', calculatorLink: 'Open calculator tools', contactLink: 'Talk to the team', imageAltAquifer: 'Cutaway showing rainfall recharge, aquifer layers and a groundwater well', imageAltWell: 'Cutaway of groundwater well construction and pumping-test equipment',
  },
  zh: {
    jumpLabel: '选择学习模块', chapters: { concept: '地下水如何形成', thailand: '泰国水文地质', workflow: '从资料到成井', well: '水井构造', pumping: '读懂抽水试验', quality: '水质', operation: '长期维护' },
    takeawayTitle: '先掌握三个要点',
    takeaways: ['地下水储存在土壤和岩石的孔隙、裂隙中，相邻水井的出水量也可能不同。', '水量充足不代表水质安全，需要分别检测水量和水质。', '投资前先明确用水需求、核实许可，并安排水井维护。'],
    concept: { eyebrow: '从基础开始', title: '地下水从哪里来？', intro: '部分雨水渗入地下，汇集在砂、砾石的孔隙或岩石裂隙中。当这些空间充满水时，其中的水就是地下水。', definition: '孔隙被水充满的区域称为饱和带。能够储存并传输可利用水量的地层称为含水层。不同类型的含水层接受补给和响应抽水的方式不同。', caption: '从上往下看：雨水渗入土壤 → 水汇集在砂砾或岩石中 → 水向水井或地表水体移动。这是用于解释概念的示意图，并非某个实际场地的剖面。', legend: ['非饱和带', '地下水位', '含水层', '弱透水层', '裂隙岩体'], mythTitle: '为什么相邻水井的出水量也会不同？', mythText: '多数地下水经过细小的孔隙和裂缝流动，并非大型地下河。这些空间在各处的连通方式不同，所以相邻水井的深度、水量和水质也可能差异很大。', typesTitle: '了解更多：不同含水层有什么区别？', types: [
      { name: '潜水含水层', short: '水可从上方渗入补充', detail: '上表面是地下水位，可能较快随降雨和季节变化。与有隔水覆盖的承压含水层相比，通常更容易受地表污染影响。', implication: '检查附近污染源，做好井口密封，并记录不同季节的水位。' }, { name: '承压含水层', short: '夹在弱透水层之间', detail: '地下水处于压力状态，井中水位可高于含水层顶部。', implication: '套管和固井必须防止不同含水层串通；承压并不代表水量无限。' }, { name: '裂隙岩含水层', short: '水沿连通裂隙流动', detail: '硬岩区出水量取决于裂隙数量、开度、方向与连通性，而非只取决于深度。', implication: '构造分析和井位选择十分关键，邻井不能作为保证。' },
    ] },
    thailand: { eyebrow: '了解自己的场地', title: '地图能告诉你在哪里钻井有水吗？', intro: '地图可以初步估计当地含水层类型、深度、水量和水质。实际井位仍需调查，因为地图不能保证每口井的钻探结果。', regions: [
      { title: '沉积盆地与河流平原', detail: '砂砾含水层常与黏土层互层，不同深度可能分别出现淡水和咸水。', watch: '通过合适套管和固井防止串层，并在区域大量开采处关注地面沉降。' }, { title: '泰国东北部', detail: '部分地区有岩盐层，地下水可能较咸，或含有较多溶解的矿物质。', watch: '请专业人员综合调查结果、孔内测量和水样，区分淡水与咸水层段。' }, { title: '硬岩与山地区', detail: '地下水多赋存在风化带、节理和断层中，井位差异大。', watch: '钻探前分析构造与施工条件，并为较高不确定性预留方案。' },
    ], mapTitle: '从官方资料开始', mapText: '泰国地下水资源厅通过 Badan4Thai 提供分府地下水图和邻近水井资料，可用于规划勘查，但不能代替现场调查和专业设计。', mapLink: '查看 Badan4Thai 信息' },
    workflow: { eyebrow: '投资前先规划', title: '钻井前需要准备什么？', intro: '先明确需要多少水，再检查场地和许可。以下步骤帮助你与勘查团队、承包方谈清工作范围。', outputLabel: '应取得的资料', steps: [
      { title: '需要多少水？', detail: '列出日用水量、用水最多的时段、运行小时、所需水质和备用水源。', output: '进水、用水和储水记录（水量平衡，Water balance），以及初步设计条件' }, { title: '审查资料与场地限制', detail: '查看地图、邻井、地质、钻机通道、地下管线和污染风险。', output: '勘查计划和风险清单' }, { title: '在哪里钻井？', detail: '结合现场检查与土、岩石和地下水资料；必要时借助地下探测设备比较井位。', output: '目标井位，以及选择它的资料和理由' }, { title: '确认法规要求', detail: '核实主管单位、钻井与取水许可、承包方资格和项目条件。', output: '有效许可和合规工作范围' }, { title: '钻井时需要记录什么？', detail: '记录每个深度的土和岩石，再根据实际含水层设计套管、滤管、砾料和水泥密封。', output: '按深度记录地层和钻井信息的井记录（Well log），以及实际完工的井结构图' }, { title: '洗井与抽水试验', detail: '清除钻井细料并连续记录流量、水位和恢复。', output: '建议运行流量和选泵依据' }, { title: '水质分析与交付', detail: '按用途正确采样，建立运行基线并整理完整井档案。', output: '化验报告、井档案与监测计划' },
    ], legalTitle: '不要跳过许可', legalText: '各地区和用途的要求可能不同，钻井或取水前应向泰国地下水资源厅或当地主管人员确认最新规定。', legalLink: '阅读法规与许可指南' },
    well: { eyebrow: '认识各个部件', title: '水井的每个部分有什么作用？', intro: '水井需要从选定地层取水、控制砂粒，并避免不同地层的水混合。因此井结构、水泵和测量点需要配合设计。', caption: '抽水试验示意：抽水会使井周水位下降。测量抽出了多少水，以及水位随时间如何变化，有助于评价水井。这不是施工图。', parts: [
      { title: '井口与混凝土台', detail: '井口高出地面并把污水排离水井。' }, { title: '套管与水泥密封', detail: '套管支撑井壁，水泥封住设计深度内管外的空隙，避免不同地层的水混合。' }, { title: '滤管与砾料', detail: '滤管开口让水进入，周围砾料帮助控制砂粒。开口和砾料尺寸必须适合含水层的土砂颗粒。' }, { title: '水泵与扬水管', detail: '根据试验流量、动水位、井深和电机冷却条件选择。' }, { title: '监测与采样接口', detail: '保留水位、流量、压力、电流和代表性采样位置。' }, { title: '竣工档案', detail: '记录深度、管径、滤管、砾料、固井、水泵和试验结果。' },
    ] },
    pumping: { eyebrow: '试着读懂抽水结果', title: '抽水后，水位下降了多少？', intro: '抽水试验（Pumping test）测量抽水量与水位变化。下面的数值只是供你调整的示例。抽水前与抽水中，都应从井口同一个参照点测量水位深度。', staticLevel: '抽水前的水位深度（静水位）', pumpingLevel: '抽水中的水位深度', flowRate: '每小时抽水量', drawdown: '水位下降距离', specificCapacity: '水位每下降1米的出水量', unavailable: '抽水中的水位深度大于抽水前时，才能计算此值。', interpretationTitle: '这些数字能说明什么，不能说明什么？', interpretation: ['水位降深（Drawdown）= 抽水中的水位深度 − 抽水前深度。例如从12米变为27米，水位下降15米。', '单位降深出水量（Specific capacity）= 每小时抽水量 ÷ 降深。例如30 ÷ 15 = 每米降深每小时2立方米。应在相近试验条件和持续时间下比较。', '数值高不保证能永远按此速度抽水。可持续开采量（Sustainable yield）指长期抽取而不造成不可接受影响的水量，需要综合评价区域水资源和环境。', '实际试验须记录流量、水位随时间的变化及停泵后的恢复。专业人员应综合含水层、井结构、水泵淹没深度、季节和邻井确定运行流量。'], fullTool: '打开完整计算工具' },
    quality: { eyebrow: '按用途选择检测', title: '水清澈，就能直接使用或饮用吗？', intro: '还不能判断。水量够用，也需要单独检查水质。饮用、食品生产、冷却、灌溉和卫生等用途，对水质的要求不同，应据此选择检测项目。', clearWarning: '颜色、气味和清澈度不能证明安全。应正确采样，并依据实验室检测结果判断。', groups: [
      { title: '物理与基础指标', items: '颜色、浊度、气味、pH、电导率、溶解固体', purpose: '筛查问题、建立趋势并初选处理工艺。' }, { title: '矿物与化学指标', items: '铁、锰、硬度、氯化物、氟化物、硝酸盐、砷及场地风险指标', purpose: '影响健康、味道、结垢、腐蚀和生产。' }, { title: '微生物指标', items: '大肠菌群、E. coli 及适用标准要求的指标', purpose: '饮用、食品和人体接触用途尤为重要。' }, { title: '活动专项风险', items: '金属、有机物、农药或工艺指标', purpose: '依据土地历史、附近污染源和使用要求确定。' },
    ], salineTitle: '泰国部分地区需关注咸水', salineText: '泰国中部下游和东北部的部分区域可能因不同地质原因存在咸水层。区分淡咸水需综合多种资料，成井结构不得造成串层。', standardLink: '查看地下水饮用水质标准' },
    operation: { eyebrow: '投用后的维护', title: '怎样发现水井开始出现问题？', intro: '保留交付时的读数作为参照，再与以后在相近条件下测得的数据比较。检查频率因系统重要性、水质、运行小时和许可条件而异。', monitorTitle: '应该记录哪些数据？', monitor: [
      { title: '流量与运行小时', detail: '比较供水量、运行时间和需求变化。' }, { title: '静水位与动水位', detail: '观察含水层响应、堵塞和抽水量是否合适。' }, { title: '压力、电流与能耗', detail: '变化可能来自水泵、管路、阀门、电气或水位。' }, { title: '浊度、砂和水质', detail: '在明显恶化前与基线和用途标准比较。' },
    ], warningTitle: '出现这些变化，先查原因再换更大水泵', warnings: ['出水变少，但水位与之前相近。', '抽水量相同，水位却下降更多。', '砂、浊度、气味或盐度增加。', '电流、压力、声音或振动改变。', '停泵后，水位持续比以前恢复得慢。'], checklistTitle: '投资前准备清单', checklistIntro: '只勾选已有资料支持的项目。', checklist: ['已明确进水、用水、储水和用水最多的时段', '已审查地图与邻井资料', '已检查钻机通道与污染风险', '已确认许可和责任单位', '已约定交付地层记录和实际完工井结构图', '已约定抽水试验方法和报告', '已按用途选择水质检测项目', '已计划交付后的读数记录和维护'], ready: '可以进入工作范围讨论', remaining: '仍需准备的项目' },
    glossaryTitle: '关键术语', glossary: [
      { term: '含水层（Aquifer）', meaning: '孔隙充满水，并能储存和提供可利用水量的土层或岩层。' },
      { term: '地下水位（Water table）', meaning: '潜水含水层中孔隙被水充满区域的上表面。其上方的孔隙同时含有空气和水。' },
      { term: '地下水补给（Recharge）', meaning: '到达饱和带并补充地下水的水。并非所有降雨都会变成地下水。' },
      { term: '静水位（Static water level）', meaning: '抽水前，或停泵后按试验条件恢复的水位。需要注明测量参照点和时间。' },
      { term: '水位降深（Drawdown）', meaning: '水位比抽水前下降的距离。从同一点测量深度时，用抽水中深度减去抽水前深度。' },
      { term: '单位降深出水量（Specific capacity）', meaning: '抽水量除以水位降深，表示水位每下降1米能抽出的水量。比较时要注明抽水量和试验持续时间。' },
      { term: '水量平衡（Water balance）', meaning: '项目规划中，在同一时间段记录进水、出水和储水变化，用来比较供水与需求。' },
      { term: '井记录（Well log）', meaning: '按深度记录地层和钻井时发现的情况。应与实际完工井结构图一同保存，供日后维护使用。' },
      { term: '可持续开采量（Sustainable yield）', meaning: '长期抽取而不对水资源和环境造成不可接受影响的水量。需要评价整个系统，不能由一次抽水试验确定。' },
      { term: '洗井（Well development）', meaning: '清除钻井留下的沉积物，改善滤管周围进水条件，让水更容易进入并减少出砂。' },
    ], quiz: { eyebrow: '知识测验', title: '完成前快速复习', intro: '选择最佳答案并立即查看解释。', correct: '正确', review: '请复习此知识点', result: '您的得分', perfect: '您已具备用这些基础知识与勘查设计团队沟通的能力。', retry: '重新开始', questions: [
      { question: '为什么相邻水井的出水量会明显不同？', choices: ['仅仅因为水泵品牌不同。', '因为孔隙、裂缝和含水层因地点而异。', '因为地下水只在夜间流动。'], correct: 1, explanation: '水通过连通的空隙进入井中，所以含水层和井的建造方式都会影响水量。' }, { question: '抽水试验帮助做出哪种决定？', choices: ['根据流量和水位变化选择抽水量与水泵。', '保证永远保持相同水量。', '替代水质分析。'], correct: 0, explanation: '它反映试验条件下水井的运行情况，仍需检查水质并长期监测。' }, { question: '清澈无味的地下水一定能喝吗？', choices: ['一定可以。', '深井就可以。', '不一定，需按用途采样检测。'], correct: 2, explanation: '很多溶解物和微生物不可见也无味。' }, { question: '哪些资料有助于以后维护水井？', choices: ['只有钻井发票。', '地层记录、实际井结构图、抽水试验、水质检测和水泵资料。', '只有完工照片。'], correct: 1, explanation: '与当前读数比较这些资料，可以调查异常原因并计划维修或更换设备。' },
    ] },
    sourcesTitle: '官方学习来源', sourcesIntro: '本课程用于学习与前期规划。实际项目应核对最新法规并咨询专业人员。', reviewed: '资料核对日期：2026年8月4日', nextTitle: '准备把知识变成项目资料了吗？', nextText: '先估算基础需求，或把场地资料发送给团队讨论勘查与设计。', calculatorLink: '打开计算工具', contactLink: '联系团队', imageAltAquifer: '降雨补给、含水层和地下水井的剖面图', imageAltWell: '地下水井结构和抽水试验设备剖面图',
  },
  ja: {
    jumpLabel: '学習モジュールを選択', chapters: { concept: '地下水のでき方', thailand: 'タイの地域特性', workflow: '調査から井戸完成まで', well: '井戸の構造', pumping: '揚水試験の読み方', quality: '水質', operation: '長期維持管理' },
    takeawayTitle: '最初に押さえる3つのこと',
    takeaways: ['地下水は土や岩の隙間・亀裂にあります。近くの井戸でも揚水量は異なります。', '十分な水量と安全な水質は別の問題です。両方を確認します。', '投資前に必要水量を整理し、許可を確認して、維持管理を計画します。'],
    concept: { eyebrow: '身近なところから', title: '地下水はどこから来る？', intro: '雨の一部は地面にしみ込み、砂や砂利の隙間、岩の亀裂にたまります。こうした隙間が水で満たされているとき、その水を地下水と呼びます。', definition: '隙間が水で満たされた部分は飽和帯です。利用できる量の水を蓄え、通す地層を帯水層と呼びます。種類によって水の補給や揚水への反応が異なります。', caption: '上から順に見てください：雨が土にしみ込む → 砂礫や岩の隙間に水がたまる → 井戸や地表水へ移動する。これは仕組みを説明する図で、特定の敷地の断面ではありません。', legend: ['不飽和帯', '地下水面', '帯水層', '難透水層', '亀裂岩盤'], mythTitle: '近くの井戸でも、水量が違うのはなぜ？', mythText: '地下水の多くは、小さな隙間や割れ目を通って移動します。大きな地下の川とは限りません。隙間のつながり方は場所ごとに異なるため、近くの井戸でも深さ、水量、水質が大きく違うことがあります。', typesTitle: '詳しく読む：帯水層の種類と違い', types: [
      { name: '不圧帯水層', short: '上から水がしみ込んで補給される', detail: '上面が地下水面です。雨や季節に合わせて水位が早く変わることがあり、被圧帯水層より地表の汚染を受けやすい傾向があります。', implication: '近くの汚染源を調べ、井戸口を適切に密閉し、季節ごとの水位を記録します。' }, { name: '被圧帯水層', short: '水を通しにくい層に挟まれる', detail: '水が圧力を受け、井戸水位が帯水層上面より高くなることがあります。', implication: 'ケーシングとグラウトで異なる帯水層の混合を防ぎます。被圧でも水量は無限ではありません。' }, { name: '亀裂性岩盤帯水層', short: 'つながった岩の割れ目に水がある', detail: '硬岩では深度だけでなく亀裂の数、開口、方向、連続性が揚水量を支配します。', implication: '構造解析と井戸位置選定が重要で、近隣井戸は保証になりません。' },
    ] },
    thailand: { eyebrow: '自分の敷地を知る', title: '地図で、水が出る場所はわかる？', intro: '地図は地域の帯水層、深さ、水量、水質を見積もる手がかりになります。ただし、個々の井戸の結果を保証するものではないため、実際の掘削地点の調査が必要です。', regions: [
      { title: '堆積盆地・河川平野', detail: '砂礫帯水層と粘土層が互層し、深度によって淡水と塩水が分かれる場合があります。', watch: '適切なケーシング・グラウトで層間流動を防ぎ、広域過剰揚水地域では地盤沈下に注意します。' }, { title: 'タイ東北部', detail: '一部には岩塩層があり、地下水に塩分や溶けた鉱物が多く含まれることがあります。', watch: '専門家が調査結果、掘削孔内の測定、水試料を合わせて、淡水と塩水の区間を判断します。' }, { title: '硬岩・丘陵地域', detail: '風化帯、節理、断層に地下水が存在し、地点差が大きくなります。', watch: '掘削前に地質構造と施工条件を確認し、不確実性を計画に含めます。' },
    ], mapTitle: '公的資料から始める', mapText: 'タイ地下水資源局はBadan4Thaiで県別地下水図と周辺井戸情報を提供しています。調査計画に利用し、現地調査と専門設計の代替にはしません。', mapLink: 'Badan4Thai情報を見る' },
    workflow: { eyebrow: '投資前に計画する', title: '井戸を掘る前に、何を準備する？', intro: 'まず必要な水量を整理し、敷地と許可を確認します。以下の手順で、調査チームや施工業者と作業範囲を具体的に話し合えます。', outputLabel: '受け取る資料', steps: [
      { title: '水はどれだけ必要？', detail: '1日の水量、最も多く使う時間帯、運転時間、必要水質、予備水源を整理します。', output: '入る水・使う水・蓄える水の記録（水収支、Water balance）と初期設計条件' }, { title: '既存資料と敷地制約を確認', detail: '地下水図、近隣井戸、地質、搬入路、埋設物、汚染リスクを確認します。', output: '調査計画とリスク一覧' }, { title: 'どこに井戸を掘る？', detail: '現地を確認し、土・岩・地下水の資料と合わせて検討します。必要に応じて地下を調べる機器で候補地点を比較します。', output: '掘削候補地点と、それを選んだ資料・理由' }, { title: '法規要件を確認', detail: '担当機関、掘削・利用許可、業者資格、個別条件を確認します。', output: '有効な許可と適法な作業範囲' }, { title: '掘削中に何を記録する？', detail: '深さごとの土や岩を記録し、実際の帯水層に合わせて管、スクリーン、砂利、密封用セメントを設計します。', output: '深さごとの地層・掘削情報（井戸記録、Well log）と実際に完成した井戸の図面' }, { title: '井戸仕上げ・揚水試験', detail: '掘削で出た細かい土砂を除き、流量、水位、回復を連続測定します。', output: '推奨運転流量とポンプ選定根拠' }, { title: '水質分析・引渡し', detail: '用途に合う採水・分析を行い、運転基準値と井戸台帳を整えます。', output: '分析書、井戸資料、監視計画' },
    ], legalTitle: '許可手続きを省略しない', legalText: '地域と用途により要件が異なるため、掘削・取水前にタイ地下水資源局または所管担当者へ最新要件を確認してください。', legalLink: '法規・許可ガイドを読む' },
    well: { eyebrow: '各部の役割を知る', title: '井戸の部品は、それぞれ何をする？', intro: '井戸は選んだ地層から水を取り、砂を抑え、異なる地層の水が混ざるのを防ぎます。井戸の構造、ポンプ、測定点を一緒に設計する必要があります。', caption: '揚水試験の模式図です。水をくみ上げると井戸周辺の水位が下がります。水量と水位の時間変化を測り、井戸の働きを評価します。施工図ではありません。', parts: [
      { title: '井戸口・コンクリート台', detail: '井戸口を地表より高くし、汚水が井戸から離れる方向へ流れるようにします。' }, { title: '保護管と密封用セメント', detail: '保護管（ケーシング）が孔壁を支え、設計した深さの管周りをセメントで密封して地層間の水の混合を防ぎます。' }, { title: '取水管と周りの砂利', detail: '取水管（スクリーン）の開口から水を入れ、周りの砂利で砂を抑えます。開口と砂利の大きさは地層の粒に合わせます。' }, { title: 'ポンプ・揚水管', detail: '試験流量、動水位、井深、モーター冷却条件から選定します。' }, { title: '測定・採水口', detail: '水位、流量、圧力、電流、代表採水点を確保します。' }, { title: '完成図書', detail: '深度、管径、スクリーン、砂利、グラウト、ポンプ、試験結果を記録します。' },
    ] },
    pumping: { eyebrow: '揚水試験を読んでみる', title: '水をくむと、水位はどれだけ下がる？', intro: '揚水試験（Pumping test）は、くみ上げた水量と水位の変化を測る試験です。下の数値は操作用の例です。運転前と運転中の水面までの深さは、井戸口の同じ基準点から測ります。', staticLevel: '運転前の水面までの深さ（静水位）', pumpingLevel: '運転中の水面までの深さ', flowRate: '1時間にくみ上げる水量', drawdown: '水位が下がった距離', specificCapacity: '水位低下1メートル当たりの水量', unavailable: '運転中の水位が運転前より深い場合に計算できます。', interpretationTitle: 'この数値で何がわかり、何はわからない？', interpretation: ['水位低下量（Drawdown）は運転中の水面深さから運転前の深さを引いた値です。12メートルから27メートルなら15メートルの低下です。', '比湧出量（Specific capacity）は揚水量を水位低下量で割った値です。30 ÷ 15なら、水位低下1メートル当たり毎時2立方メートルです。近い試験条件・試験時間で比較します。', '値が高くても、その水量を永久にくめる保証にはなりません。持続可能な揚水量（Sustainable yield）は、長期にわたり許容できない影響を生じずにくめる量で、地域の水資源と環境の評価が必要です。', '実際の試験は流量、水位の時間変化、停止後の回復を記録します。専門家が帯水層、井戸構造、ポンプの水没深さ、季節、近隣井戸を合わせて運転水量を決めます。'], fullTool: '完全版計算ツールを開く' },
    quality: { eyebrow: '用途に合う検査を選ぶ', title: '透明な水なら、そのまま使える・飲める？', intro: 'まだ判断できません。水量が十分でも、水質は別に確認します。飲用、食品製造、冷却、散水、衛生など、用途ごとに必要な水質が違うため、検査項目を合わせます。', clearWarning: '色、臭い、透明度は安全の証明になりません。正しく採水し、試験室の結果で判断します。', groups: [
      { title: '物理・基礎項目', items: '色、濁度、臭気、pH、電気伝導度、溶解性固形物', purpose: '問題のスクリーニング、傾向管理、初期処理検討に使います。' }, { title: '鉱物・化学項目', items: '鉄、マンガン、硬度、塩化物、フッ化物、硝酸、ヒ素、地域リスク項目', purpose: '健康、味、着色、スケール、腐食、工程に影響します。' }, { title: '微生物', items: '大腸菌群、E. coli、適用基準の指標', purpose: '飲用、食品、人体接触用途で重要です。' }, { title: '活動固有リスク', items: '金属、有機物、農薬、工程固有項目', purpose: '土地利用履歴、近隣汚染源、利用条件から決めます。' },
    ], salineTitle: 'タイの一部地域では塩水に注意', salineText: 'タイ中部低地と東北部の一部には異なる地質要因による塩水層があります。複数資料で淡水・塩水を区分し、井戸で層を接続しない設計が必要です。', standardLink: '地下水飲用水質基準を見る' },
    operation: { eyebrow: '使い始めてからの手入れ', title: '井戸の不調に、どう気づく？', intro: '引渡し時の数値を残し、後で近い条件で測った数値と比較します。検査の間隔は、設備の重要度、水質、運転時間、許可条件によって異なります。', monitorTitle: '何を記録しておく？', monitor: [
      { title: '流量・運転時間', detail: '供給量、運転時間、需要変化を比較します。' }, { title: '静水位・動水位', detail: '帯水層応答、目詰まり、揚水量の妥当性を確認します。' }, { title: '圧力・電流・エネルギー', detail: 'ポンプ、配管、バルブ、電気、水位の異常を検知します。' }, { title: '濁度・砂・水質', detail: '目に見える悪化前に基準値と用途条件に比較します。' },
    ], warningTitle: 'こんな変化があれば、大型ポンプに替える前に原因を調べる', warnings: ['水位は近い値なのに、出る水が減った。', '同じ水量をくんでも、水位が以前より下がる。', '砂、濁り、臭い、塩分が増えた。', '電流、圧力、音、振動が変わった。', '停止後の水位の戻りが、継続して遅くなった。'], checklistTitle: '投資前準備チェック', checklistIntro: '資料で確認できた項目だけ選択してください。', checklist: ['入る水・使う水・蓄える水と、最も多く使う時間帯がわかる', '地図と近隣井戸資料を確認済み', '搬入路と汚染リスクを確認済み', '許可と担当者を確認済み', '地層記録と実際の完成図面の受取りを合意済み', '揚水試験の方法と報告書を合意済み', '用途に合う水質検査項目を選択済み', '引渡し後の測定記録と手入れを計画済み'], ready: '作業範囲協議の準備完了', remaining: '追加準備項目' },
    glossaryTitle: '重要用語', glossary: [
      { term: '帯水層（Aquifer）', meaning: '隙間が水で満たされ、利用できる量の水を蓄えて供給できる土や岩の層。' },
      { term: '地下水面（Water table）', meaning: '不圧帯水層で隙間が水に満たされた部分の上面。その上の隙間には空気と水の両方があります。' },
      { term: '地下水の補給・涵養（Recharge）', meaning: '飽和帯まで届いて地下水を補う水。降った雨がすべて地下水になるわけではありません。' },
      { term: '静水位（Static water level）', meaning: '運転前、または停止して試験条件に応じて回復させた水位。測定の基準点と時刻を記録します。' },
      { term: '水位低下量（Drawdown）', meaning: '運転前から水位が下がった距離。同じ基準点から測る場合、運転中の水面深さから運転前の深さを引きます。' },
      { term: '比湧出量（Specific capacity）', meaning: '揚水量を水位低下量で割った値。水位低下1メートル当たりにくめる水量を示し、比較には揚水量と試験時間を明記します。' },
      { term: '水収支（Water balance）', meaning: '計画では、同じ期間に入る水・出る水・貯水量の変化を整理したもの。供給と必要水量を比べます。' },
      { term: '井戸記録（Well log）', meaning: '深さごとの地層や掘削中の観察を記録した資料。実際の完成図面と一緒に保管し、後の維持管理に使います。' },
      { term: '持続可能な揚水量（Sustainable yield）', meaning: '水資源や環境に許容できない影響を与えず、長期にわたりくめる水量。全体の仕組みを評価する必要があり、1回の揚水試験だけでは決まりません。' },
      { term: '井戸仕上げ（Well development）', meaning: '掘削で出た土砂を除き、取水管の周りを整えて、水が入りやすく砂が出にくい状態にする作業。' },
    ], quiz: { eyebrow: '理解度確認', title: '学習終了前の短い復習', intro: '最適な答えを選ぶと理由が表示されます。', correct: '正解', review: 'この点を復習', result: '得点', perfect: '調査・設計チームと基礎事項を協議する準備ができました。', retry: 'もう一度', questions: [
      { question: '近くの井戸でも水量が大きく違うのはなぜ？', choices: ['ポンプのメーカーだけが理由。', '隙間、割れ目、水を含む層が場所によって違うため。', '地下水は夜だけ流れるため。'], correct: 1, explanation: '水はつながった隙間から井戸に入るため、帯水層と井戸の造りの両方が水量に関わります。' }, { question: '揚水試験は、どんな判断に役立つ？', choices: ['水量と水位変化から運転水量やポンプを選ぶ。', '永久に同じ水量を保証する。', '水質検査の代わりにする。'], correct: 0, explanation: '試験条件での井戸の働きを示します。水質検査と長期の測定は引き続き必要です。' }, { question: '透明で無臭の地下水は飲めますか？', choices: ['必ず飲める。', '深井戸なら飲める。', '用途に沿う採水・分析なしでは判断できない。'], correct: 2, explanation: '見えず臭わない溶解物質や微生物があります。' }, { question: '後で井戸を手入れするために必要な資料は？', choices: ['掘削の請求書だけ。', '地層記録、実際の井戸図面、揚水試験、水質検査、ポンプ資料。', '完成日の写真だけ。'], correct: 1, explanation: '現在の測定値と比べて異常の原因を調べ、修理や設備交換を計画できます。' },
    ] },
    sourcesTitle: '公的学習資料', sourcesIntro: '本教材は学習・初期計画用です。実案件は最新法規と専門家助言を確認してください。', reviewed: '資料確認日：2026年8月4日', nextTitle: '知識を案件データへ変えますか？', nextText: '初期需要を計算するか、敷地情報を送って調査・設計を相談できます。', calculatorLink: '計算ツールを開く', contactLink: 'チームへ相談', imageAltAquifer: '降雨涵養、帯水層、地下水井戸を示す断面図', imageAltWell: '地下水井戸構造と揚水試験設備の断面図',
  },
}

const officialSourceUrls = [
  'https://www.dgr.go.th/th/newsAll/124/2637',
  'https://www.dgr.go.th/th/newsAll/124/11299',
  'https://www.dgr.go.th/th/newsAll/124/3706',
  'https://www.dgr.go.th/th/vdo/168/716',
  'https://www.dgr.go.th/th/newsAll/124/7941',
  'https://www.dgr.go.th/gcl/th/newsAll/433/13900',
  'https://www.usgs.gov/mission-areas/water-resources/science/groundwater-basics',
]

const officialSourceLabels: Record<LocalizedLocale, string[]> = {
  th: ['กรมทรัพยากรน้ำบาดาล — แหล่งกำเนิดน้ำบาดาล', 'กรมทรัพยากรน้ำบาดาล — แผนที่น้ำบาดาลคืออะไร', 'กรมทรัพยากรน้ำบาดาล — การสำรวจ เจาะ และวิเคราะห์น้ำ', 'กรมทรัพยากรน้ำบาดาล — หลักการสูบทดสอบปริมาณน้ำบาดาล', 'กรมทรัพยากรน้ำบาดาล — มาตรฐานคุณภาพน้ำบาดาลเพื่อการบริโภค', 'กรมทรัพยากรน้ำบาดาล — การขออนุญาตเจาะหรือใช้น้ำบาดาล', 'U.S. Geological Survey — Groundwater basics'],
  en: ['DGR — How groundwater forms', 'DGR — Understanding groundwater maps', 'DGR — Groundwater exploration, drilling and analysis', 'DGR — Groundwater pumping-test principles', 'DGR — Drinking groundwater quality standard', 'DGR — Applying for drilling and groundwater-use permits', 'U.S. Geological Survey — Groundwater basics'],
  zh: ['泰国地下水资源厅 — 地下水的形成', '泰国地下水资源厅 — 认识地下水图', '泰国地下水资源厅 — 勘查、钻井与水质分析', '泰国地下水资源厅 — 抽水试验原理', '泰国地下水资源厅 — 地下水饮用水质标准', '泰国地下水资源厅 — 钻井与取水许可申请', '美国地质调查局 — 地下水基础'],
  ja: ['タイ地下水資源局 — 地下水の形成', 'タイ地下水資源局 — 地下水図の読み方', 'タイ地下水資源局 — 調査・掘削・水質分析', 'タイ地下水資源局 — 揚水試験の原理', 'タイ地下水資源局 — 地下水飲用水質基準', 'タイ地下水資源局 — 掘削・地下水利用許可申請', '米国地質調査所 — 地下水の基礎'],
}

export default function GroundwaterBasics({ locale = 'th', localized = false }: { locale?: LocalizedLocale; localized?: boolean }) {
  const copy = copyByLocale[locale]
  const [chaptersOpen, setChaptersOpen] = useState(false)
  const [activeAquifer, setActiveAquifer] = useState(0)
  const [staticLevelDraft, setStaticLevel] = useState('12')
  const staticLevel = validateNumericDraft(staticLevelDraft, { min: 0 }).value
  const [pumpingLevelDraft, setPumpingLevel] = useState('27')
  const pumpingLevel = validateNumericDraft(pumpingLevelDraft, { min: 0 }).value
  const [flowRateDraft, setFlowRate] = useState('30')
  const flowRate = validateNumericDraft(flowRateDraft, { min: 0 }).value
  const progress = useLearningProgress('basics')
  const checkedItems = progress.checked
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const formatter = useMemo(() => new Intl.NumberFormat(localeInfo[locale].htmlLang, { maximumFractionDigits: 2 }), [locale])
  const pumpingError = staticLevel !== null && pumpingLevel !== null && pumpingLevel < staticLevel ? learningFeedback[locale].pumpingLevel : undefined
  const inputsValid = staticLevel !== null && pumpingLevel !== null && flowRate !== null && !pumpingError
  const drawdown = Math.max(0, (pumpingLevel ?? 0) - (staticLevel ?? 0))
  const specificCapacity = drawdown > 0 ? (flowRate ?? 0) / drawdown : null
  const quizScore = copy.quiz.questions.reduce((score, question, index) => score + (answers[index] === question.correct ? 1 : 0), 0)
  const quizComplete = Object.keys(answers).length === copy.quiz.questions.length
  const localLink = (path: string) => localized ? localePath(path, locale) : path

  const toggleChecklist = (index: number) => {
    progress.toggle(progress.ids[index])
  }

  return (
    <article className="gb-course" aria-label={copy.concept.title}>
      <section className="gb-course-overview" aria-labelledby="gb-takeaway-title">
        <h2 id="gb-takeaway-title"><BookOpen aria-hidden="true" />{copy.takeawayTitle}</h2>
        <ul className="gb-takeaways">{copy.takeaways.map((takeaway) => <li key={takeaway}><CheckCircle2 aria-hidden="true" /><span>{takeaway}</span></li>)}</ul>
      </section>

      <nav className="gb-chapter-nav" aria-label={copy.jumpLabel}>
        <strong>{copy.jumpLabel}</strong>
        <button className="gb-chapter-toggle" type="button" aria-expanded={chaptersOpen} aria-controls="gb-chapter-links" onClick={() => setChaptersOpen((current) => !current)}>{copy.jumpLabel}<ChevronDown aria-hidden="true" /></button>
        <div id="gb-chapter-links" className={chaptersOpen ? 'is-open' : ''}>{chapterIds.map((chapter, index) => <a href={`#gb-${chapter}`} key={chapter} onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; document.getElementById(`gb-${chapter}`)?.focus({ preventScroll: true }); setChaptersOpen(false) }}><span aria-hidden="true">{index + 1}</span>{copy.chapters[chapter]}</a>)}</div>
      </nav>

      <section className="gb-module" id="gb-concept" tabIndex={-1}>
        <header className="gb-module-heading"><div><p>{copy.concept.eyebrow}</p><h2><span><CloudRain aria-hidden="true" /></span>{copy.concept.title}</h2><div>{copy.concept.intro}</div></div></header>
        <figure className="gb-hero-figure"><LearningDiagram kind="aquifer" locale={locale} src="/images/learning/groundwater-basics/aquifer-cross-section.webp" alt={copy.imageAltAquifer} priority /></figure>
        <aside className="gb-myth"><div><h3><AlertTriangle aria-hidden="true" />{copy.concept.mythTitle}</h3><p>{copy.concept.mythText}</p></div></aside>
        <details className="gb-aquifer-explorer"><summary>{copy.concept.typesTitle}</summary><p className="gb-aquifer-definition">{copy.concept.definition}</p><div className="gb-aquifer-tabs" role="group" aria-label={copy.concept.typesTitle}>{copy.concept.types.map((type, index) => <button type="button" aria-pressed={activeAquifer === index} aria-controls="gb-aquifer-detail" className={activeAquifer === index ? 'is-active' : ''} onClick={() => setActiveAquifer(index)} key={type.name}><span>{type.name}</span><small>{type.short}</small></button>)}</div><div className="gb-aquifer-detail" id="gb-aquifer-detail" aria-live="polite"><div><h3><Droplets aria-hidden="true" />{copy.concept.types[activeAquifer].name}</h3><p>{copy.concept.types[activeAquifer].detail}</p><strong>{copy.concept.types[activeAquifer].implication}</strong></div></div></details>
      </section>

      <section className="gb-module" id="gb-thailand" tabIndex={-1}>
        <header className="gb-module-heading"><div><p>{copy.thailand.eyebrow}</p><h2><span><MapPinned aria-hidden="true" /></span>{copy.thailand.title}</h2><div>{copy.thailand.intro}</div></div></header>
        <div className="gb-region-grid">{copy.thailand.regions.map((region) => <article key={region.title}><h3>{region.title}</h3><p>{region.detail}</p><div><AlertTriangle aria-hidden="true" />{region.watch}</div></article>)}</div>
        <aside className="gb-official-card"><div><h3><Database aria-hidden="true" />{copy.thailand.mapTitle}</h3><p>{copy.thailand.mapText}</p><a href="https://www.dgr.go.th/th/newsAll/124/9048" target="_blank" rel="noopener noreferrer">{copy.thailand.mapLink}<ArrowRight aria-hidden="true" /></a></div></aside>
      </section>

      <section className="gb-module" id="gb-workflow" tabIndex={-1}>
        <header className="gb-module-heading"><div><p>{copy.workflow.eyebrow}</p><h2><span><ClipboardCheck aria-hidden="true" /></span>{copy.workflow.title}</h2><div>{copy.workflow.intro}</div></div></header>
        <div className="gb-workflow">{copy.workflow.steps.map((step, index) => <article key={step.title}><div><h3><span aria-hidden="true">{index === 0 ? <Droplets /> : index === 1 ? <Database /> : index === 2 ? <MapPinned /> : index === 3 ? <ShieldCheck /> : index === 4 ? <Shovel /> : index === 5 ? <Gauge /> : <TestTube2 />}</span>{step.title}</h3><p>{step.detail}</p><small><strong>{copy.workflow.outputLabel}:</strong> {step.output}</small></div></article>)}</div>
        <aside className="gb-legal-note"><div><h3><ShieldCheck aria-hidden="true" />{copy.workflow.legalTitle}</h3><p>{copy.workflow.legalText}</p><Link href={localLink('/learn/groundwater-law-regulation-thailand')}>{copy.workflow.legalLink}<ArrowRight aria-hidden="true" /></Link></div></aside>
      </section>

      <section className="gb-module" id="gb-well" tabIndex={-1}>
        <header className="gb-module-heading"><div><p>{copy.well.eyebrow}</p><h2><span><Shovel aria-hidden="true" /></span>{copy.well.title}</h2><div>{copy.well.intro}</div></div></header>
        <div className="gb-well-layout"><figure><LearningDiagram kind="well" locale={locale} src="/images/learning/groundwater-basics/well-pumping-test.webp" alt={copy.imageAltWell} /></figure><div className="gb-well-parts">{copy.well.parts.map((part) => <article key={part.title}><h3><Check aria-hidden="true" />{part.title}</h3><p>{part.detail}</p></article>)}</div></div>
      </section>

      <section className="gb-module" id="gb-pumping" tabIndex={-1}>
        <header className="gb-module-heading"><div><p>{copy.pumping.eyebrow}</p><h2><span><Gauge aria-hidden="true" /></span>{copy.pumping.title}</h2><div>{copy.pumping.intro}</div></div></header>
        <div className="gb-pumping-lab"><div className="gb-pumping-inputs"><NumericInput id="gb-static-level" label={copy.pumping.staticLevel} value={staticLevelDraft} onChange={setStaticLevel} locale={locale} min={0} unit="m" /><NumericInput id="gb-pumping-level" label={copy.pumping.pumpingLevel} value={pumpingLevelDraft} onChange={setPumpingLevel} locale={locale} min={0} unit="m" error={pumpingError} /><NumericInput id="gb-flow-rate" label={copy.pumping.flowRate} value={flowRateDraft} onChange={setFlowRate} locale={locale} min={0} unit="m³/h" /></div>{inputsValid ? <output className="gb-pumping-results"><div><span>{copy.pumping.drawdown}</span><strong>{formatter.format(drawdown)} <small>m</small></strong></div><div><span>{copy.pumping.specificCapacity}</span><strong>{specificCapacity === null ? '—' : formatter.format(specificCapacity)} <small>m³/h/m</small></strong>{specificCapacity === null && <em>{copy.pumping.unavailable}</em>}</div></output> : <p className="learning-number-error" role="status">{learningFeedback[locale].incomplete}</p>}</div>
        <div className="gb-interpretation"><h3>{copy.pumping.interpretationTitle}</h3><ul>{copy.pumping.interpretation.map((item) => <li key={item}><CheckCircle2 aria-hidden="true" />{item}</li>)}</ul><Link href={localLink('/learn/groundwater-calculator-tools')}>{copy.pumping.fullTool}<ArrowRight aria-hidden="true" /></Link></div>
      </section>

      <section className="gb-module" id="gb-quality" tabIndex={-1}>
        <header className="gb-module-heading"><div><p>{copy.quality.eyebrow}</p><h2><span><FlaskConical aria-hidden="true" /></span>{copy.quality.title}</h2><div>{copy.quality.intro}</div></div></header>
        <aside className="gb-quality-warning"><TestTube2 aria-hidden="true" />{copy.quality.clearWarning}</aside>
        <div className="gb-quality-grid">{copy.quality.groups.map((group) => <article key={group.title}><h3><FlaskConical aria-hidden="true" />{group.title}</h3><strong>{group.items}</strong><p>{group.purpose}</p></article>)}</div>
        <aside className="gb-saline-note"><div><h3><Waves aria-hidden="true" />{copy.quality.salineTitle}</h3><p>{copy.quality.salineText}</p><a href="https://www.dgr.go.th/th/newsAll/124/7941" target="_blank" rel="noopener noreferrer">{copy.quality.standardLink}<ArrowRight aria-hidden="true" /></a></div></aside>
      </section>

      <section className="gb-module" id="gb-operation" tabIndex={-1}>
        <header className="gb-module-heading"><div><p>{copy.operation.eyebrow}</p><h2><span><Wrench aria-hidden="true" /></span>{copy.operation.title}</h2><div>{copy.operation.intro}</div></div></header>
        <h3 className="gb-subheading">{copy.operation.monitorTitle}</h3><div className="gb-monitor-grid">{copy.operation.monitor.map((item) => <article key={item.title}><h4><Gauge aria-hidden="true" />{item.title}</h4><p>{item.detail}</p></article>)}</div>
        <aside className="gb-warning-list"><div><h3><AlertTriangle aria-hidden="true" />{copy.operation.warningTitle}</h3><ul>{copy.operation.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div></aside>
        <div className="gb-checklist"><div className="gb-checklist-heading"><div><p>{copy.operation.checklistTitle}</p><span>{copy.operation.checklistIntro}</span></div><strong>{checkedItems.length}/{copy.operation.checklist.length}</strong></div><div className="gb-check-progress" aria-hidden="true"><span style={{ width: `${checkedItems.length / copy.operation.checklist.length * 100}%` }} /></div><div className="gb-check-items">{copy.operation.checklist.map((item, index) => <label key={item} className={checkedItems.includes(progress.ids[index]) ? 'is-checked' : ''}><input type="checkbox" disabled={!progress.ready} checked={checkedItems.includes(progress.ids[index])} onChange={() => toggleChecklist(index)} /><span><Check aria-hidden="true" /></span>{item}</label>)}</div><p className="gb-check-status" role="status"><strong>{checkedItems.length === copy.operation.checklist.length ? copy.operation.ready : copy.operation.remaining}:</strong> {copy.operation.checklist.length - checkedItems.length}</p></div>
        <LearningProgress locale={locale} checklist="basics" progress={progress} />
      </section>

      <section className="gb-glossary" id="gb-glossary" tabIndex={-1}><h2>{copy.glossaryTitle}</h2><div>{copy.glossary.map((item) => <details key={item.term}><summary>{item.term}</summary><p>{item.meaning}</p></details>)}</div></section>

      <section className="gb-quiz">
        <header><p>{copy.quiz.eyebrow}</p><h2>{copy.quiz.title}</h2><span>{copy.quiz.intro}</span></header>
        <div className="gb-quiz-questions">{copy.quiz.questions.map((question, questionIndex) => { const selected = answers[questionIndex]; const answered = selected !== undefined; return <fieldset key={question.question} id={`gb-question-${questionIndex}`}><legend>{question.question}</legend><div>{question.choices.map((choice, choiceIndex) => <button type="button" className={answered ? choiceIndex === question.correct ? 'is-correct' : selected === choiceIndex ? 'is-wrong' : '' : ''} aria-pressed={selected === choiceIndex} aria-describedby={answered ? `gb-feedback-${questionIndex}` : undefined} onClick={() => setAnswers((current) => ({ ...current, [questionIndex]: choiceIndex }))} key={choice}><span>{answered && choiceIndex === question.correct ? <CheckCircle2 aria-hidden="true" /> : <span aria-hidden="true" />}</span>{choice}</button>)}</div><p id={`gb-feedback-${questionIndex}`} role="status" aria-live="polite" className={answered ? selected === question.correct ? 'is-correct' : 'is-review' : 'learning-quiz-feedback-empty'}>{answered && <><strong>{selected === question.correct ? copy.quiz.correct : copy.quiz.review}:</strong> {question.explanation}</>}</p></fieldset> })}</div>
        {quizComplete && <div className="gb-quiz-result" aria-live="polite"><div><span>{copy.quiz.result}</span><strong>{quizScore}/{copy.quiz.questions.length}</strong><p>{quizScore === copy.quiz.questions.length ? copy.quiz.perfect : copy.quiz.review}</p></div><button type="button" onClick={() => { setAnswers({}); document.querySelector<HTMLButtonElement>('#gb-question-0 button')?.focus() }}><RefreshCcw aria-hidden="true" />{copy.quiz.retry}</button></div>}
      </section>

      <section className="gb-sources"><div><p>{copy.sourcesTitle}</p><h2>{copy.sourcesIntro}</h2><span>{copy.reviewed}</span></div><ul>{officialSourceUrls.map((href, index) => <li key={href}><a href={href} target="_blank" rel="noopener noreferrer">{officialSourceLabels[locale][index]}<ArrowRight aria-hidden="true" /></a></li>)}</ul></section>

      <section className="gb-next"><div><h2><Droplets aria-hidden="true" />{copy.nextTitle}</h2><p>{copy.nextText}</p></div><nav><Link href={localLink('/learn/groundwater-calculator-tools')}>{copy.calculatorLink}<ArrowRight aria-hidden="true" /></Link><Link href={localLink('/contact')}>{copy.contactLink}</Link></nav></section>
    </article>
  )
}
