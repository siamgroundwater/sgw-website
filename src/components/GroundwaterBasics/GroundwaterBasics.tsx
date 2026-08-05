'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CloudRain,
  Database,
  Droplets,
  FlaskConical,
  Gauge,
  Layers3,
  MapPinned,
  RefreshCcw,
  ShieldCheck,
  Shovel,
  TestTube2,
  Waves,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { localeInfo, localePath, type LocalizedLocale } from '@/i18n/config'
import './GroundwaterBasics.css'

const chapterIds = ['concept', 'thailand', 'workflow', 'well', 'pumping', 'quality', 'operation'] as const
type ChapterId = (typeof chapterIds)[number]

type BasicsCopy = {
  jumpLabel: string
  chapters: Record<ChapterId, string>
  summary: { time: string; level: string; modules: string; timeValue: string; levelValue: string; modulesValue: string }
  outcomeTitle: string
  outcomes: string[]
  concept: {
    eyebrow: string
    title: string
    intro: string
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
    summary: { time: 'เวลาเรียน', level: 'ระดับ', modules: 'เนื้อหา', timeValue: 'ประมาณ 15–20 นาที', levelValue: 'พื้นฐานถึงใช้งานจริง', modulesValue: '7 บท + แบบทดสอบ' },
    outcomeTitle: 'เรียนจบแล้วคุณจะสามารถ',
    outcomes: ['อธิบายว่าชั้นน้ำบาดาลไม่ใช่แม่น้ำใต้ดิน', 'อ่านคำสำคัญในรายงานสำรวจและสูบทดสอบได้', 'แยกการตัดสินใจเรื่องปริมาณน้ำออกจากคุณภาพน้ำ', 'เตรียมข้อมูลและเอกสารส่งมอบบ่อได้ครบขึ้น'],
    concept: {
      eyebrow: 'พื้นฐานอุทกธรณีวิทยา', title: 'น้ำฝนเดินทางลงไปเป็นน้ำบาดาลอย่างไร',
      intro: 'น้ำฝนบางส่วนไหลบ่าบนผิวดิน บางส่วนระเหย และบางส่วนซึมผ่านดินลงสู่ช่องว่างระหว่างเม็ดตะกอนหรือรอยแตกของหิน เมื่อช่องว่างอิ่มตัวด้วยน้ำ บริเวณนั้นจึงเป็นเขตอิ่มน้ำ และวัสดุที่กักเก็บพร้อมให้น้ำได้อย่างมีนัยสำคัญเรียกว่า “ชั้นหินให้น้ำ”',
      caption: 'ภาพจำลองตัดขวาง: น้ำซึมผ่านเขตไม่อิ่มน้ำ สะสมในชั้นกรวดทราย และไหลตามความลาดชลศาสตร์ไปยังบ่อหรือแหล่งน้ำผิวดิน',
      legend: ['เขตไม่อิ่มน้ำ', 'ระดับน้ำบาดาล', 'ชั้นหินให้น้ำ', 'ชั้นกั้นน้ำ', 'หินแตกร้าว'],
      mythTitle: 'ความเข้าใจที่ควรแก้ไข', mythText: 'น้ำบาดาลส่วนใหญ่ไม่ได้ไหลเป็นโพรงแม่น้ำขนาดใหญ่ แต่เคลื่อนที่ช้า ๆ ผ่านรูพรุนของดินและหิน หรือผ่านรอยแตก ดังนั้นบ่อที่อยู่ใกล้กันอาจมีความลึก ปริมาณ และคุณภาพน้ำต่างกันมากได้',
      typesTitle: 'ลองเลือกชนิดชั้นน้ำเพื่อดูความแตกต่าง',
      types: [
        { name: 'ชั้นน้ำไร้แรงดัน', short: 'รับน้ำจากผิวดินโดยตรง', detail: 'ด้านบนของชั้นน้ำคือระดับน้ำบาดาล จึงตอบสนองต่อฝนและฤดูกาลได้เร็ว แต่มีโอกาสรับการปนเปื้อนจากผิวดินมากกว่า', implication: 'ต้องให้ความสำคัญกับระยะห่างจากแหล่งมลพิษ การผนึกปากบ่อ และแนวโน้มระดับน้ำตามฤดูกาล' },
        { name: 'ชั้นน้ำมีแรงดัน', short: 'ถูกคั่นด้วยชั้นซึมผ่านต่ำ', detail: 'น้ำอยู่ระหว่างชั้นดินหรือหินที่น้ำผ่านได้ยาก เมื่อเจาะถึงระดับน้ำในบ่ออาจสูงกว่าหลังคาชั้นน้ำเพราะมีแรงดัน', implication: 'ต้องออกแบบการกรุและอุดซีเมนต์ไม่ให้ชั้นน้ำต่างคุณภาพเชื่อมถึงกัน และไม่ควรตีความคำว่า “มีแรงดัน” ว่าให้น้ำไม่จำกัด' },
        { name: 'ชั้นหินแตกร้าว', short: 'น้ำอยู่ตามแนวแตกของหิน', detail: 'ในหินแข็ง ปริมาณน้ำขึ้นกับจำนวน การเชื่อมต่อ และทิศทางของรอยแตก ไม่ได้ขึ้นกับความลึกเพียงอย่างเดียว', implication: 'ตำแหน่งเจาะและการสำรวจโครงสร้างธรณีมีความสำคัญสูง ผลของบ่อข้างเคียงอาจใช้เทียบตรง ๆ ไม่ได้' },
      ],
    },
    thailand: {
      eyebrow: 'อ่านพื้นที่ให้ถูก', title: 'ประเทศไทยมีชั้นน้ำหลายแบบในระยะทางไม่ไกลกัน', intro: 'แผนที่น้ำบาดาลช่วยคัดกรองชนิดชั้นหินให้น้ำ ความลึก ปริมาณ และคุณภาพที่คาดหมาย แต่เป็นข้อมูลระดับพื้นที่ ไม่ใช่คำรับรองผลเจาะของจุดใดจุดหนึ่ง',
      regions: [
        { title: 'แอ่งตะกอนและที่ราบลุ่ม', detail: 'มักพบชั้นทรายและกรวดสลับดินเหนียวหลายชั้น บางแห่งมีทั้งชั้นน้ำจืดและชั้นน้ำเค็มต่างระดับกัน', watch: 'ระวังการเชื่อมชั้นน้ำด้วยการกรุหรืออุดซีเมนต์ไม่เหมาะสม และเฝ้าระวังการทรุดตัวเมื่อมีการสูบมากในพื้นที่' },
        { title: 'ภาคตะวันออกเฉียงเหนือ', detail: 'บางพื้นที่ได้รับอิทธิพลจากชั้นเกลือหิน ทำให้น้ำบาดาลมีความเค็มหรือค่าของแข็งละลายสูงได้', watch: 'ใช้ข้อมูลธรณีฟิสิกส์และหยั่งธรณีหลุมเจาะร่วมกับตัวอย่างน้ำเพื่อแยกช่วงน้ำจืดและน้ำเค็ม' },
        { title: 'พื้นที่หินแข็งและภูเขา', detail: 'น้ำมักอยู่ในรอยแตก รอยเลื่อน หรือชั้นหินผุ ปริมาณน้ำจึงเปลี่ยนมากตามตำแหน่ง', watch: 'สำรวจแนวโครงสร้างและข้อจำกัดหน้างานก่อนกำหนดจุดเจาะ พร้อมยอมรับความไม่แน่นอนที่สูงกว่าชั้นตะกอน' },
      ],
      mapTitle: 'เริ่มจากข้อมูลทางการ', mapText: 'กรมทรัพยากรน้ำบาดาลให้บริการแผนที่น้ำบาดาลรายจังหวัดและข้อมูลบ่อใกล้เคียงผ่าน Badan4Thai ใช้เพื่อวางแผนสำรวจ ไม่ควรใช้แทนการตรวจพื้นที่และออกแบบโดยผู้เชี่ยวชาญ', mapLink: 'ดูข้อมูล Badan4Thai',
    },
    workflow: {
      eyebrow: 'กระบวนการโครงการ', title: 'บ่อที่ดีเริ่มจากคำถามที่ถูก ไม่ใช่เริ่มจากความลึก', intro: 'ลำดับงานต่อไปนี้ช่วยลดความเสี่ยงก่อนลงทุน และทำให้ผลเจาะถูกเปลี่ยนเป็นระบบน้ำที่ใช้งานได้จริง', outputLabel: 'สิ่งที่ควรได้',
      steps: [
        { title: 'กำหนดความต้องการใช้น้ำ', detail: 'แยกปริมาณรายวัน ช่วงพีก ชั่วโมงเดินระบบ คุณภาพที่ต้องการ และความสำคัญของแหล่งน้ำสำรอง', output: 'Water balance และเกณฑ์ออกแบบเบื้องต้น' },
        { title: 'ศึกษาข้อมูลเดิมและข้อจำกัดพื้นที่', detail: 'ตรวจแผนที่น้ำบาดาล ข้อมูลบ่อใกล้เคียง ธรณีวิทยา ทางเข้าเครื่องเจาะ สาธารณูปโภค และแหล่งเสี่ยงปนเปื้อน', output: 'แผนสำรวจและจุดเสี่ยงของโครงการ' },
        { title: 'สำรวจและเลือกจุดเจาะ', detail: 'ใช้การตรวจพื้นที่ร่วมกับข้อมูลอุทกธรณีวิทยา และใช้ธรณีฟิสิกส์เมื่อเหมาะสมเพื่อเปรียบเทียบตำแหน่ง', output: 'จุดเจาะเป้าหมายพร้อมเหตุผลทางวิชาการ' },
        { title: 'ตรวจข้อกฎหมายก่อนเริ่มงาน', detail: 'ยืนยันพื้นที่ควบคุม หน่วยงานผู้รับคำขอ ใบอนุญาตเจาะ ผู้รับจ้างที่มีคุณสมบัติ และเงื่อนไขเฉพาะโครงการ', output: 'เอกสารอนุมัติและขอบเขตงานที่ถูกต้อง' },
        { title: 'เจาะ บันทึก และออกแบบบ่อจริง', detail: 'บันทึกชั้นดินหินและข้อมูลระหว่างเจาะ แล้วเลือกท่อกรุ ท่อกรอง กรวดกรุ และช่วงอุดซีเมนต์ตามชั้นน้ำที่พบ', output: 'Well log และแบบก่อสร้างตามสภาพจริง' },
        { title: 'พัฒนาบ่อและสูบทดสอบ', detail: 'ล้างเศษตะกอนจากงานเจาะ ทำให้กรวดกรุจัดตัว แล้ววัดอัตราสูบ ระดับน้ำตามเวลา และการฟื้นตัว', output: 'อัตราสูบแนะนำและข้อมูลเลือกปั๊ม' },
        { title: 'วิเคราะห์น้ำและส่งมอบระบบ', detail: 'เก็บตัวอย่างหลังพัฒนาบ่อด้วยวิธีที่เหมาะสม วิเคราะห์ตามวัตถุประสงค์ และบันทึกค่าฐานก่อนใช้งาน', output: 'ผลแล็บ เอกสารบ่อ คู่มือ และแผนติดตาม' },
      ],
      legalTitle: 'อย่าข้ามขั้นตอนใบอนุญาต', legalText: 'ข้อกำหนดและแบบฟอร์มอาจเปลี่ยนแปลงตามพื้นที่และประเภทการใช้ ก่อนเจาะหรือใช้น้ำบาดาลให้ตรวจสอบข้อมูลล่าสุดกับกรมทรัพยากรน้ำบาดาลหรือพนักงานน้ำบาดาลประจำท้องที่', legalLink: 'อ่านคู่มือกฎหมายและใบอนุญาต',
    },
    well: {
      eyebrow: 'โครงสร้างบ่อ', title: 'บ่อคือระบบป้องกันชั้นน้ำ ไม่ใช่เพียงรูเจาะและปั๊ม', intro: 'ส่วนประกอบต้องทำงานร่วมกันเพื่อรับน้ำจากช่วงที่ต้องการ ป้องกันทราย ลดการไหลลัดระหว่างชั้น และเปิดทางสำหรับตรวจวัดและบำรุงรักษา', caption: 'ภาพจำลองบ่อและการสูบทดสอบ: ระดับน้ำขณะสูบจะลดลงรอบบ่อเป็นกรวยลดระดับ การวัดอัตราสูบและระดับน้ำตามเวลาคือข้อมูลหลักในการประเมินสมรรถนะ',
      parts: [
        { title: 'ปากบ่อและฐานคอนกรีต', detail: 'ยกปากบ่อและระบายน้ำออกจากบ่อ ลดโอกาสให้น้ำสกปรกไหลย้อนลงแนวกรุ' },
        { title: 'ท่อกรุและซีเมนต์ผนึก', detail: 'พยุงผนังบ่อและแยกชั้นน้ำ ซีเมนต์ต้องต่อเนื่องในช่วงที่ออกแบบเพื่อปิดทางไหลลัด' },
        { title: 'ท่อกรองและกรวดกรุ', detail: 'รับน้ำจากชั้นเป้าหมายพร้อมควบคุมเม็ดทราย ขนาดช่องเปิดและกรวดต้องสัมพันธ์กับตัวอย่างชั้นน้ำ' },
        { title: 'เครื่องสูบและท่อส่ง', detail: 'ติดตั้งตามระดับน้ำขณะสูบ อัตราสูบแนะนำ ความลึกบ่อ และเงื่อนไขระบายความร้อนของมอเตอร์' },
        { title: 'จุดวัดและเก็บตัวอย่าง', detail: 'ควรเข้าถึงการวัดระดับน้ำ อัตราการไหล แรงดัน กระแสไฟ และจุดเก็บตัวอย่างที่เป็นตัวแทน' },
        { title: 'เอกสารก่อสร้างจริง', detail: 'ระบุความลึก ขนาดท่อ ช่วงท่อกรอง กรวด ซีเมนต์ ปั๊ม และผลทดสอบ เพื่อใช้ดูแลตลอดอายุบ่อ' },
      ],
    },
    pumping: {
      eyebrow: 'ฝึกอ่านตัวเลข', title: 'Pumping Test บอกความสัมพันธ์ระหว่างการสูบกับระดับน้ำ', intro: 'ทดลองปรับค่าด้านล่างเพื่อเห็นความสัมพันธ์พื้นฐาน การทดสอบจริงต้องบันทึกอัตราสูบและระดับน้ำตามเวลา รวมช่วงฟื้นตัว และให้ผู้เชี่ยวชาญแปลผลร่วมกับโครงสร้างบ่อและชั้นน้ำ', staticLevel: 'ระดับน้ำสถิตจากปากบ่อ', pumpingLevel: 'ระดับน้ำขณะสูบจากปากบ่อ', flowRate: 'อัตราการสูบทดสอบ', drawdown: 'ระยะน้ำลด', specificCapacity: 'ความจุจำเพาะของบ่อ', unavailable: 'ระดับน้ำขณะสูบต้องลึกกว่าระดับน้ำสถิต', interpretationTitle: 'อ่านผลอย่างมีข้อจำกัด',
      interpretation: ['Drawdown = ระดับน้ำขณะสูบ − ระดับน้ำสถิต', 'Specific capacity = อัตราสูบ ÷ ระยะน้ำลด ใช้เปรียบเทียบสมรรถนะภายใต้เงื่อนไขทดสอบ', 'ค่าที่สูงไม่ได้แปลว่าสูบได้ไม่จำกัด และไม่ใช่ Sustainable yield โดยอัตโนมัติ', 'เลือกอัตราเดินระบบโดยเผื่อระดับจุ่มปั๊ม การเปลี่ยนฤดูกาล การรบกวนจากบ่ออื่น และการฟื้นตัว'], fullTool: 'เปิดเครื่องมือคำนวณฉบับเต็ม',
    },
    quality: {
      eyebrow: 'น้ำใสอาจยังไม่ปลอดภัย', title: 'ปริมาณน้ำและคุณภาพน้ำต้องผ่านคนละการตัดสินใจ', intro: 'รายการตรวจวิเคราะห์ต้องอ้างอิงวัตถุประสงค์ เช่น ดื่ม ผลิตอาหาร หม้อไอน้ำ ระบบหล่อเย็น ชลประทาน หรือสุขาภิบาล ไม่ควรเลือกชุดตรวจเดียวกันสำหรับทุกงาน', clearWarning: 'สี กลิ่น และความใสไม่สามารถยืนยันความปลอดภัยได้ ต้องใช้ผลจากห้องปฏิบัติการและเก็บตัวอย่างอย่างถูกวิธี',
      groups: [
        { title: 'กายภาพและค่าพื้นฐาน', items: 'สี ความขุ่น กลิ่น pH การนำไฟฟ้า และของแข็งละลาย', purpose: 'ช่วยคัดกรองปัญหา ติดตามแนวโน้ม และเลือกกระบวนการปรับปรุงเบื้องต้น' },
        { title: 'แร่ธาตุและเคมี', items: 'เหล็ก แมงกานีส ความกระด้าง คลอไรด์ ฟลูออไรด์ ไนเตรต สารหนู และรายการตามความเสี่ยงพื้นที่', purpose: 'มีผลต่อสุขภาพ รสชาติ คราบ ตะกรัน การกัดกร่อน และกระบวนการผลิต' },
        { title: 'จุลชีววิทยา', items: 'โคลิฟอร์ม E. coli และตัวชี้วัดที่มาตรฐานการใช้น้ำกำหนด', purpose: 'สำคัญสำหรับน้ำบริโภค อาหาร และงานที่มีโอกาสสัมผัสคน' },
        { title: 'รายการเฉพาะกิจกรรม', items: 'โลหะหนัก สารอินทรีย์ สารกำจัดศัตรูพืช หรือพารามิเตอร์ของกระบวนการ', purpose: 'กำหนดจากประวัติพื้นที่ แหล่งมลพิษใกล้เคียง และข้อกำหนดของผู้ใช้น้ำ' },
      ],
      salineTitle: 'ความเค็มเป็นประเด็นสำคัญในบางพื้นที่', salineText: 'ภาคกลางตอนล่างและบางส่วนของภาคตะวันออกเฉียงเหนืออาจพบชั้นน้ำเค็มต่างสาเหตุ การแยกช่วงน้ำจืด–น้ำเค็มต้องใช้ข้อมูลหลายชนิดร่วมกัน และต้องออกแบบบ่อไม่ให้เชื่อมชั้นน้ำ', standardLink: 'ดูมาตรฐานคุณภาพน้ำบาดาลเพื่อการบริโภค',
    },
    operation: {
      eyebrow: 'รักษาค่าฐานของบ่อ', title: 'ข้อมูลแนวโน้มช่วยให้ซ่อมก่อนเสียหายใหญ่', intro: 'ไม่มีรอบบำรุงรักษาเดียวที่เหมาะกับทุกบ่อ ให้เริ่มจากค่าฐานหลังส่งมอบ แล้วกำหนดความถี่ตามความสำคัญของระบบ คุณภาพน้ำ ชั่วโมงทำงาน และเงื่อนไขใบอนุญาต', monitorTitle: 'ตัวแปรที่ควรติดตาม',
      monitor: [
        { title: 'อัตราการไหลและชั่วโมงทำงาน', detail: 'เปรียบเทียบปริมาณน้ำกับเวลาเดินเครื่อง เพื่อเห็นกำลังผลิตและความต้องการที่เปลี่ยนไป' },
        { title: 'ระดับน้ำสถิตและขณะสูบ', detail: 'ใช้ดูการเปลี่ยนของชั้นน้ำ การอุดตัน และความเหมาะสมของอัตราสูบ' },
        { title: 'แรงดัน กระแส และพลังงาน', detail: 'ความผิดปกติอาจชี้ไปที่ปั๊ม ท่อ วาล์ว ไฟฟ้า หรือระดับน้ำที่เปลี่ยน' },
        { title: 'ความขุ่น ทราย และคุณภาพน้ำ', detail: 'เทียบกับค่าฐานและเกณฑ์การใช้ ไม่รอจนสีหรือกลิ่นเปลี่ยนชัดเจน' },
      ],
      warningTitle: 'สัญญาณที่ควรหยุดวิเคราะห์ก่อนเพิ่มขนาดปั๊ม', warnings: ['อัตราการไหลลดลงแต่ระดับน้ำใกล้เดิม', 'Drawdown เพิ่มขึ้นที่อัตราสูบเท่าเดิม', 'มีทราย ความขุ่น กลิ่น หรือความเค็มเพิ่มขึ้น', 'กระแสไฟ แรงดัน เสียง หรือแรงสั่นเปลี่ยน', 'บ่อฟื้นตัวช้ากว่าข้อมูลฐานอย่างต่อเนื่อง'],
      checklistTitle: 'เช็กลิสต์ก่อนตัดสินใจลงทุน', checklistIntro: 'ลองทำเครื่องหมายเฉพาะรายการที่โครงการมีข้อมูลยืนยันแล้ว',
      checklist: ['มี Water balance และช่วงพีกที่ตรวจสอบได้', 'ตรวจแผนที่และข้อมูลบ่อใกล้เคียงแล้ว', 'สำรวจทางเข้าเครื่องเจาะและแหล่งเสี่ยงปนเปื้อนแล้ว', 'ตรวจเงื่อนไขใบอนุญาตและผู้รับผิดชอบแล้ว', 'กำหนดขอบเขต Well log และแบบก่อสร้างจริงแล้ว', 'กำหนดวิธีสูบทดสอบและเอกสารผลลัพธ์แล้ว', 'กำหนดชุดวิเคราะห์น้ำตามวัตถุประสงค์แล้ว', 'มีแผนบันทึกค่าและบำรุงรักษาหลังส่งมอบแล้ว'], ready: 'ข้อมูลพร้อมสำหรับคุยขอบเขตงาน', remaining: 'รายการที่ควรเตรียมเพิ่ม',
    },
    glossaryTitle: 'คำศัพท์ที่ควรรู้',
    glossary: [
      { term: 'Aquifer', meaning: 'ชั้นดินหรือหินอิ่มน้ำที่สามารถกักเก็บและถ่ายเทน้ำให้บ่อได้อย่างมีนัยสำคัญ' },
      { term: 'Water table', meaning: 'ผิวบนของเขตอิ่มน้ำในชั้นน้ำไร้แรงดัน' },
      { term: 'Recharge', meaning: 'น้ำที่ซึมลงไปเติมแหล่งน้ำบาดาล' },
      { term: 'Static water level', meaning: 'ระดับน้ำในบ่อเมื่อไม่ถูกรบกวนจากการสูบตามช่วงเวลาที่กำหนด' },
      { term: 'Drawdown', meaning: 'ผลต่างระหว่างระดับน้ำสถิตกับระดับน้ำขณะสูบ' },
      { term: 'Well development', meaning: 'กระบวนการกำจัดตะกอนจากการเจาะและปรับบริเวณรอบท่อกรองให้น้ำไหลเข้าบ่อได้ดี' },
    ],
    quiz: {
      eyebrow: 'ทบทวนความเข้าใจ', title: 'แบบทดสอบสั้นก่อนจบบทเรียน', intro: 'เลือกคำตอบที่เหมาะสมที่สุด ระบบจะแสดงเหตุผลทันที', correct: 'ถูกต้อง', review: 'ลองทบทวนอีกครั้ง', result: 'คะแนนของคุณ', perfect: 'เข้าใจพื้นฐานพร้อมนำไปใช้คุยกับทีมสำรวจและออกแบบแล้ว', retry: 'เริ่มทำใหม่',
      questions: [
        { question: 'เหตุใดบ่อใกล้กันจึงอาจให้น้ำต่างกันมาก?', choices: ['เพราะปั๊มทุกยี่ห้อไม่เท่ากัน', 'เพราะรูพรุน รอยแตก และชั้นหินให้น้ำเปลี่ยนตามตำแหน่ง', 'เพราะน้ำบาดาลไหลเฉพาะตอนกลางคืน'], correct: 1, explanation: 'สมรรถนะขึ้นกับการกระจายและการเชื่อมต่อของช่องว่างในชั้นน้ำ รวมถึงการก่อสร้างบ่อ' },
        { question: 'ผล Pumping Test ควรนำไปใช้ทำอะไร?', choices: ['เลือกอัตราเดินระบบและปั๊มโดยดูความสัมพันธ์ระหว่างอัตราสูบกับระดับน้ำ', 'ยืนยันว่าบ่อจะให้น้ำเท่าเดิมตลอดไป', 'ใช้แทนผลวิเคราะห์คุณภาพน้ำ'], correct: 0, explanation: 'การสูบทดสอบช่วยประเมินสมรรถนะภายใต้เงื่อนไขทดสอบ แต่ไม่แทนการวิเคราะห์น้ำหรือการติดตามระยะยาว' },
        { question: 'น้ำใสและไม่มีกลิ่นหมายความว่าดื่มได้หรือไม่?', choices: ['ดื่มได้ทันที', 'ดื่มได้ถ้าบ่อลึก', 'ยังสรุปไม่ได้ ต้องเก็บตัวอย่างและตรวจตามมาตรฐานการใช้'], correct: 2, explanation: 'สารละลายและจุลชีพบางชนิดมองไม่เห็นและไม่มีกลิ่น' },
        { question: 'เอกสารใดสำคัญต่อการดูแลบ่อในอนาคต?', choices: ['เฉพาะใบเสร็จค่าเจาะ', 'Well log แบบก่อสร้างจริง ผลสูบทดสอบ ผลแล็บ และข้อมูลปั๊ม', 'เฉพาะรูปถ่ายวันส่งมอบ'], correct: 1, explanation: 'เอกสารชุดนี้เป็นค่าฐานสำหรับเลือกอะไหล่ วิเคราะห์แนวโน้ม และวางแผนซ่อม' },
      ],
    },
    sourcesTitle: 'แหล่งเรียนรู้ทางการ', sourcesIntro: 'เนื้อหานี้สรุปเพื่อการเรียนรู้และวางแผนเบื้องต้น โครงการจริงควรตรวจข้อมูลล่าสุดจากหน่วยงานกำกับและผู้เชี่ยวชาญ', reviewed: 'ตรวจทานแหล่งข้อมูลล่าสุด: 4 สิงหาคม 2569',
    nextTitle: 'พร้อมเปลี่ยนความรู้เป็นข้อมูลโครงการ?', nextText: 'คำนวณความต้องการเบื้องต้น หรือส่งข้อมูลพื้นที่ให้ทีมงานช่วยจัดลำดับการสำรวจและออกแบบ', calculatorLink: 'ไปที่เครื่องมือคำนวณ', contactLink: 'ปรึกษาทีมงาน',
    imageAltAquifer: 'ภาพตัดขวางแสดงน้ำฝนซึมผ่านชั้นดินสู่ชั้นน้ำบาดาลและบ่อ', imageAltWell: 'ภาพตัดขวางส่วนประกอบบ่อน้ำบาดาลและอุปกรณ์สูบทดสอบ',
  },
  en: {
    jumpLabel: 'Choose a module', chapters: { concept: 'How groundwater forms', thailand: 'Thailand context', workflow: 'From evidence to a well', well: 'Well anatomy', pumping: 'Read a pumping test', quality: 'Water quality', operation: 'Long-term care' },
    summary: { time: 'Study time', level: 'Level', modules: 'Content', timeValue: 'About 15–20 minutes', levelValue: 'Foundation to practical use', modulesValue: '7 modules + quiz' },
    outcomeTitle: 'By the end, you will be able to', outcomes: ['Explain why an aquifer is not an underground river.', 'Recognize the key numbers in exploration and pumping-test reports.', 'Assess water quantity and water quality as separate decisions.', 'Prepare a more complete well handover and monitoring record.'],
    concept: { eyebrow: 'Hydrogeology foundation', title: 'How rainfall becomes groundwater', intro: 'Some rainfall runs off, some evaporates and some infiltrates through soil into pores and rock fractures. Below the water table those openings are saturated. A body of saturated material that can store and transmit useful quantities of water is an aquifer.', caption: 'Conceptual section: recharge moves through the unsaturated zone, enters sand, gravel or fractured rock, and follows the hydraulic gradient toward wells and surface-water bodies.', legend: ['Unsaturated zone', 'Water table', 'Aquifer', 'Low-permeability layer', 'Fractured rock'], mythTitle: 'Correct the mental model', mythText: 'Most groundwater does not flow through giant open underground rivers. It moves through connected pores and fractures, so nearby wells can differ greatly in depth, yield and quality.', typesTitle: 'Select an aquifer type to compare', types: [
      { name: 'Unconfined aquifer', short: 'Directly connected to recharge', detail: 'Its upper surface is the water table. It may respond quickly to seasons and is generally more exposed to contamination from land surface.', implication: 'Protect the wellhead, assess nearby contamination sources and interpret seasonal water-level trends.' },
      { name: 'Confined aquifer', short: 'Bounded by low-permeability layers', detail: 'Water is held under pressure between layers that transmit water poorly, so the water level in a well may rise above the top of the aquifer.', implication: 'Casing and grout must prevent mixing between aquifers. Pressure does not mean unlimited yield.' },
      { name: 'Fractured-rock aquifer', short: 'Water follows connected fractures', detail: 'In hard rock, yield depends on the number, opening, orientation and connection of fractures rather than depth alone.', implication: 'Structural interpretation and careful siting are critical; a nearby well is not a guaranteed analogue.' },
    ] },
    thailand: { eyebrow: 'Read the setting', title: 'Thailand contains different aquifer systems over short distances', intro: 'Groundwater maps are useful screening tools for aquifer type, expected depth, quantity and quality. They describe an area, not a guaranteed outcome at one drilling point.', regions: [
      { title: 'Sedimentary basins and river plains', detail: 'Sand and gravel aquifers may alternate with clay, sometimes with fresh and saline water at different depths.', watch: 'Prevent vertical mixing with suitable casing and grout; monitor land-subsidence risk where regional pumping is intensive.' },
      { title: 'Northeastern Thailand', detail: 'Rock-salt influence can produce saline groundwater or high dissolved solids in some areas.', watch: 'Combine surface geophysics, borehole logging and water samples to distinguish fresh and saline intervals.' },
      { title: 'Hard-rock and upland areas', detail: 'Groundwater is commonly stored in weathered zones, joints and faults, creating strong location-to-location variation.', watch: 'Map structures and site constraints before drilling and plan for greater uncertainty than in continuous sedimentary aquifers.' },
    ], mapTitle: 'Begin with official data', mapText: 'The Department of Groundwater Resources provides provincial groundwater maps and nearby-well information through Badan4Thai. Use them to plan investigation, not to replace site inspection and professional design.', mapLink: 'Open Badan4Thai information' },
    workflow: { eyebrow: 'Project workflow', title: 'A reliable well starts with the right questions—not a target depth', intro: 'This sequence reduces investment risk and turns a borehole into a usable, documented water system.', outputLabel: 'Expected output', steps: [
      { title: 'Define demand', detail: 'Separate daily volume, peak periods, operating hours, required quality and backup needs.', output: 'Water balance and initial design criteria' },
      { title: 'Review existing evidence and constraints', detail: 'Check groundwater maps, nearby wells, geology, rig access, utilities and contamination hazards.', output: 'Investigation plan and risk register' },
      { title: 'Investigate and select the drilling point', detail: 'Combine site inspection and hydrogeological evidence, adding geophysics where it can improve comparison.', output: 'A defensible target location' },
      { title: 'Confirm regulatory requirements', detail: 'Verify the responsible authority, drilling and use permits, contractor qualifications and project conditions.', output: 'Valid approvals and compliant scope' },
      { title: 'Drill, log and design the actual well', detail: 'Record formations during drilling, then choose casing, screen, gravel pack and grout for the aquifers encountered.', output: 'Well log and as-built construction record' },
      { title: 'Develop and pump-test the well', detail: 'Remove drilling fines, stabilize the intake zone and record flow, water level and recovery over time.', output: 'Recommended operating rate and pump basis' },
      { title: 'Analyze water and hand over the asset', detail: 'Sample correctly after development, analyze for the intended use and record an operating baseline.', output: 'Laboratory report, well file and monitoring plan' },
    ], legalTitle: 'Do not skip permits', legalText: 'Requirements and forms can vary by area and use. Confirm the latest requirements with the Department of Groundwater Resources or the responsible local groundwater officer before drilling or abstraction.', legalLink: 'Read the law and permit guide' },
    well: { eyebrow: 'Well construction', title: 'A well protects aquifers; it is more than a hole and pump', intro: 'Each component must admit water from the intended zone, control sand, prevent cross-flow and preserve access for measurement and maintenance.', caption: 'Conceptual pumping test: pumping lowers the water level around the well. Flow and time-series water levels are the primary observations used to assess performance.', parts: [
      { title: 'Wellhead and concrete apron', detail: 'Keep the casing above grade and drain dirty water away from the well.' }, { title: 'Casing and annular grout', detail: 'Support the borehole and isolate aquifers by sealing unwanted vertical pathways.' }, { title: 'Screen and gravel pack', detail: 'Admit water while controlling formation particles; screen opening and pack size must match the formation.' }, { title: 'Pump and rising main', detail: 'Select and position the pump from tested flow, pumping level, well depth and motor-cooling requirements.' }, { title: 'Measurement and sampling access', detail: 'Provide access for water level, flow, pressure, current and a representative sampling point.' }, { title: 'As-built file', detail: 'Record depths, diameters, screen, gravel, grout, pump and tests for the entire service life.' },
    ] },
    pumping: { eyebrow: 'Practice the numbers', title: 'A pumping test relates abstraction to water-level response', intro: 'Change the values below to explore the basic relationship. A real test records flow and water level over time, including recovery, and requires professional interpretation with the aquifer and well construction.', staticLevel: 'Static water level below wellhead', pumpingLevel: 'Pumping water level below wellhead', flowRate: 'Test pumping rate', drawdown: 'Drawdown', specificCapacity: 'Well specific capacity', unavailable: 'Pumping level must be deeper than static level.', interpretationTitle: 'Interpret with limits', interpretation: ['Drawdown = pumping water level − static water level.', 'Specific capacity = pumping rate ÷ drawdown and compares performance under stated test conditions.', 'A high value does not mean unlimited or automatically sustainable yield.', 'Operating rate must allow for pump submergence, seasons, nearby wells and recovery.'], fullTool: 'Open the full calculator' },
    quality: { eyebrow: 'Clear does not mean safe', title: 'Water quantity and quality require separate decisions', intro: 'The test suite should match the intended use—drinking, food, boilers, cooling, irrigation or sanitation. One standard panel does not fit every project.', clearWarning: 'Appearance, smell and clarity cannot confirm safety. Use properly collected samples and an accredited laboratory.', groups: [
      { title: 'Physical and baseline', items: 'Color, turbidity, odor, pH, conductivity and dissolved solids', purpose: 'Screen problems, establish trends and guide preliminary treatment.' }, { title: 'Minerals and chemistry', items: 'Iron, manganese, hardness, chloride, fluoride, nitrate, arsenic and site-risk parameters', purpose: 'Affect health, taste, staining, scale, corrosion and process performance.' }, { title: 'Microbiology', items: 'Coliforms, E. coli and indicators required by the applicable standard', purpose: 'Critical for drinking, food and human-contact uses.' }, { title: 'Activity-specific risks', items: 'Metals, organics, pesticides or process-specific parameters', purpose: 'Set from land-use history, nearby hazards and user requirements.' },
    ], salineTitle: 'Salinity matters in some Thai settings', salineText: 'Lower Central Thailand and parts of the Northeast may contain saline intervals for different geological reasons. Distinguishing fresh and saline zones requires multiple lines of evidence and a well design that does not connect them.', standardLink: 'View the DGR drinking-water standard' },
    operation: { eyebrow: 'Protect the baseline', title: 'Trend data makes early repair possible', intro: 'No single maintenance interval fits every well. Start with the commissioning baseline and set frequency from criticality, water quality, operating hours and permit conditions.', monitorTitle: 'What to trend', monitor: [
      { title: 'Flow and operating hours', detail: 'Relate delivered volume to runtime and changing demand.' }, { title: 'Static and pumping water levels', detail: 'Track aquifer response, clogging and whether the abstraction rate remains appropriate.' }, { title: 'Pressure, current and energy', detail: 'Changes can reveal pump, pipe, valve, electrical or water-level problems.' }, { title: 'Turbidity, sand and water quality', detail: 'Compare against the baseline and end-use criteria before visible deterioration.' },
    ], warningTitle: 'Investigate before installing a larger pump', warnings: ['Flow falls while water level remains similar.', 'Drawdown increases at the same flow rate.', 'Sand, turbidity, odor or salinity increases.', 'Current, pressure, sound or vibration changes.', 'Recovery becomes consistently slower than the baseline.'], checklistTitle: 'Pre-investment readiness checklist', checklistIntro: 'Mark only items supported by project evidence.', checklist: ['Verified water balance and peak demand', 'Reviewed maps and nearby-well data', 'Checked rig access and contamination risks', 'Confirmed permits and responsible parties', 'Specified well log and as-built deliverables', 'Specified pumping-test method and outputs', 'Defined the water-analysis suite by end use', 'Prepared post-handover monitoring and maintenance'], ready: 'Ready for a scope discussion', remaining: 'Items still to prepare' },
    glossaryTitle: 'Essential glossary', glossary: [
      { term: 'Aquifer', meaning: 'Saturated earth material that stores and transmits useful quantities of groundwater.' }, { term: 'Water table', meaning: 'The upper surface of the saturated zone in an unconfined aquifer.' }, { term: 'Recharge', meaning: 'Water that infiltrates and replenishes groundwater.' }, { term: 'Static water level', meaning: 'Water level in a well after an agreed non-pumping recovery period.' }, { term: 'Drawdown', meaning: 'The difference between static and pumping water levels.' }, { term: 'Well development', meaning: 'Removal of drilling fines and conditioning of the intake zone to improve flow and control sand.' },
    ],
    quiz: { eyebrow: 'Knowledge check', title: 'A short review before you finish', intro: 'Choose the best answer and see the reason immediately.', correct: 'Correct', review: 'Review this point', result: 'Your score', perfect: 'You are ready to discuss the fundamentals with an investigation and design team.', retry: 'Try again', questions: [
      { question: 'Why can nearby wells have very different yields?', choices: ['Every pump brand is different.', 'Pore spaces, fractures and aquifer layers change by location.', 'Groundwater flows only at night.'], correct: 1, explanation: 'Aquifer continuity and well construction control how water reaches each well.' }, { question: 'What is a pumping test mainly used for?', choices: ['Relating flow to water-level response for operating and pump decisions.', 'Guaranteeing the same yield forever.', 'Replacing water-quality analysis.'], correct: 0, explanation: 'It assesses hydraulic performance under test conditions; it does not replace water analysis or monitoring.' }, { question: 'Does clear, odorless groundwater mean it is drinkable?', choices: ['Yes, immediately.', 'Yes, if the well is deep.', 'Not necessarily; it must be sampled and tested for the intended use.'], correct: 2, explanation: 'Many dissolved substances and microorganisms are invisible and odorless.' }, { question: 'Which handover record best protects the well asset?', choices: ['Only the drilling invoice.', 'Well log, as-built, pumping test, laboratory report and pump data.', 'Only completion-day photographs.'], correct: 1, explanation: 'These records provide the baseline for diagnosis, maintenance and replacement.' },
    ] },
    sourcesTitle: 'Official learning sources', sourcesIntro: 'This lesson supports learning and early planning. Confirm project decisions against current regulatory information and professional advice.', reviewed: 'Sources reviewed: 4 August 2026', nextTitle: 'Ready to turn learning into project data?', nextText: 'Estimate the preliminary demand or send site information to the team for an investigation and design discussion.', calculatorLink: 'Open calculator tools', contactLink: 'Talk to the team', imageAltAquifer: 'Cutaway showing rainfall recharge, aquifer layers and a groundwater well', imageAltWell: 'Cutaway of groundwater well construction and pumping-test equipment',
  },
  zh: {
    jumpLabel: '选择学习模块', chapters: { concept: '地下水如何形成', thailand: '泰国水文地质', workflow: '从资料到成井', well: '水井构造', pumping: '读懂抽水试验', quality: '水质', operation: '长期维护' },
    summary: { time: '学习时间', level: '难度', modules: '内容', timeValue: '约15–20分钟', levelValue: '基础至实务', modulesValue: '7个模块 + 测验' }, outcomeTitle: '完成后您将能够', outcomes: ['解释含水层并不是地下河。', '识别勘查和抽水试验报告中的关键数据。', '分别评估水量与水质。', '准备较完整的水井交付和监测资料。'],
    concept: { eyebrow: '水文地质基础', title: '降雨如何成为地下水', intro: '部分降雨形成地表径流，部分蒸发，部分渗入土壤、沉积物孔隙和岩石裂隙。水位面以下的孔隙被水充满；能够储存并传输可利用水量的饱和地层称为含水层。', caption: '概念剖面：补给水穿过非饱和带进入砂砾层或裂隙岩体，并沿水力梯度流向水井和地表水体。', legend: ['非饱和带', '地下水位', '含水层', '弱透水层', '裂隙岩体'], mythTitle: '建立正确概念', mythText: '多数地下水并非在大型地下河道中流动，而是在相互连通的孔隙和裂隙中缓慢移动，因此相邻水井的深度、出水量和水质也可能明显不同。', typesTitle: '选择含水层类型进行比较', types: [
      { name: '潜水含水层', short: '直接接受地表补给', detail: '上边界为地下水位，对季节和降雨响应较快，也较容易受到地表污染影响。', implication: '应保护井口、调查污染源并分析季节性水位变化。' }, { name: '承压含水层', short: '夹在弱透水层之间', detail: '地下水处于压力状态，井中水位可高于含水层顶部。', implication: '套管和固井必须防止不同含水层串通；承压并不代表水量无限。' }, { name: '裂隙岩含水层', short: '水沿连通裂隙流动', detail: '硬岩区出水量取决于裂隙数量、开度、方向与连通性，而非只取决于深度。', implication: '构造分析和井位选择十分关键，邻井不能作为保证。' },
    ] },
    thailand: { eyebrow: '理解场地', title: '泰国不同地区的含水层条件差异明显', intro: '地下水图可用于初步判断含水层类型、预期深度、水量和水质，但属于区域资料，不保证单个钻孔结果。', regions: [
      { title: '沉积盆地与河流平原', detail: '砂砾含水层常与黏土层互层，不同深度可能分别出现淡水和咸水。', watch: '通过合适套管和固井防止串层，并在区域大量开采处关注地面沉降。' }, { title: '泰国东北部', detail: '部分地区受岩盐影响，地下水可能含盐或总溶解固体较高。', watch: '结合地球物理、井中测井和水样区分淡水与咸水层段。' }, { title: '硬岩与山地区', detail: '地下水多赋存在风化带、节理和断层中，井位差异大。', watch: '钻探前分析构造与施工条件，并为较高不确定性预留方案。' },
    ], mapTitle: '从官方资料开始', mapText: '泰国地下水资源厅通过 Badan4Thai 提供分府地下水图和邻近水井资料，可用于规划勘查，但不能代替现场调查和专业设计。', mapLink: '查看 Badan4Thai 信息' },
    workflow: { eyebrow: '项目流程', title: '可靠水井从正确问题开始，而不是从深度开始', intro: '以下流程可降低投资风险，并把钻孔转化为可运行、可维护、资料完整的供水系统。', outputLabel: '应取得的成果', steps: [
      { title: '明确用水需求', detail: '区分日用量、峰值、运行小时、水质和备用需求。', output: '水量平衡和初步设计标准' }, { title: '审查资料与场地限制', detail: '查看地图、邻井、地质、钻机通道、地下管线和污染风险。', output: '勘查计划和风险清单' }, { title: '勘查并选择井位', detail: '结合现场踏勘、水文地质资料和适用的地球物理方法。', output: '有技术依据的目标井位' }, { title: '确认法规要求', detail: '核实主管单位、钻井与取水许可、承包方资格和项目条件。', output: '有效许可和合规工作范围' }, { title: '钻探、记录并完成设计', detail: '记录地层，再按实际含水层确定套管、滤管、砾料和固井。', output: '钻井柱状图和竣工结构记录' }, { title: '洗井与抽水试验', detail: '清除钻井细料并连续记录流量、水位和恢复。', output: '建议运行流量和选泵依据' }, { title: '水质分析与交付', detail: '按用途正确采样，建立运行基线并整理完整井档案。', output: '化验报告、井档案与监测计划' },
    ], legalTitle: '不要跳过许可', legalText: '各地区和用途的要求可能不同，钻井或取水前应向泰国地下水资源厅或当地主管人员确认最新规定。', legalLink: '阅读法规与许可指南' },
    well: { eyebrow: '水井结构', title: '水井不仅是钻孔和水泵，也是保护含水层的工程结构', intro: '各部件应共同控制进水层段、防砂、防止含水层串通，并保留监测与维护通道。', caption: '抽水试验概念：抽水使井周水位下降，流量及随时间变化的水位是评价性能的主要数据。', parts: [
      { title: '井口与混凝土台', detail: '井口高出地面并把污水排离水井。' }, { title: '套管与环空固井', detail: '支撑井壁并封闭不需要的垂向水流通道。' }, { title: '滤管与砾料', detail: '让目标含水层进水并控制地层颗粒。' }, { title: '水泵与扬水管', detail: '根据试验流量、动水位、井深和电机冷却条件选择。' }, { title: '监测与采样接口', detail: '保留水位、流量、压力、电流和代表性采样位置。' }, { title: '竣工档案', detail: '记录深度、管径、滤管、砾料、固井、水泵和试验结果。' },
    ] },
    pumping: { eyebrow: '练习读数', title: '抽水试验反映流量与水位响应的关系', intro: '调整下列数值观察基本关系。实际试验还需连续记录时间序列和恢复过程，并结合含水层与井结构进行专业解释。', staticLevel: '井口以下静水位', pumpingLevel: '井口以下动水位', flowRate: '试验抽水量', drawdown: '水位降深', specificCapacity: '单位降深出水量', unavailable: '动水位必须深于静水位。', interpretationTitle: '注意解释边界', interpretation: ['降深 = 动水位 − 静水位。', '单位降深出水量 = 抽水量 ÷ 降深，用于比较特定试验条件下的性能。', '数值高不代表出水量无限，也不自动等于可持续开采量。', '运行流量还需考虑水泵淹没深度、季节、邻井影响和恢复。'], fullTool: '打开完整计算工具' },
    quality: { eyebrow: '清澈不等于安全', title: '水量和水质需要分别决策', intro: '检测项目应与用途匹配，例如饮用、食品、锅炉、冷却、灌溉或卫生用水。', clearWarning: '颜色、气味和清澈度不能证明安全，必须正确采样并由实验室检测。', groups: [
      { title: '物理与基础指标', items: '颜色、浊度、气味、pH、电导率、溶解固体', purpose: '筛查问题、建立趋势并初选处理工艺。' }, { title: '矿物与化学指标', items: '铁、锰、硬度、氯化物、氟化物、硝酸盐、砷及场地风险指标', purpose: '影响健康、味道、结垢、腐蚀和生产。' }, { title: '微生物指标', items: '大肠菌群、E. coli 及适用标准要求的指标', purpose: '饮用、食品和人体接触用途尤为重要。' }, { title: '活动专项风险', items: '金属、有机物、农药或工艺指标', purpose: '依据土地历史、附近污染源和使用要求确定。' },
    ], salineTitle: '泰国部分地区需关注咸水', salineText: '泰国中部下游和东北部的部分区域可能因不同地质原因存在咸水层。区分淡咸水需综合多种资料，成井结构不得造成串层。', standardLink: '查看地下水饮用水质标准' },
    operation: { eyebrow: '保护基线', title: '趋势数据有助于在严重损坏前维修', intro: '没有适用于所有水井的统一周期。应从交付基线开始，根据系统重要性、水质、运行小时和许可条件设定频率。', monitorTitle: '应跟踪的变量', monitor: [
      { title: '流量与运行小时', detail: '比较供水量、运行时间和需求变化。' }, { title: '静水位与动水位', detail: '观察含水层响应、堵塞和抽水量是否合适。' }, { title: '压力、电流与能耗', detail: '变化可能来自水泵、管路、阀门、电气或水位。' }, { title: '浊度、砂和水质', detail: '在明显恶化前与基线和用途标准比较。' },
    ], warningTitle: '更换更大水泵前先调查', warnings: ['流量下降但水位接近原值。', '同流量下水位降深增加。', '砂、浊度、气味或盐度增加。', '电流、压力、声音或振动改变。', '恢复持续慢于基线。'], checklistTitle: '投资前准备清单', checklistIntro: '只勾选已有资料支持的项目。', checklist: ['已核实水量平衡与峰值需求', '已审查地图与邻井资料', '已检查钻机通道与污染风险', '已确认许可和责任单位', '已规定钻井记录和竣工资料', '已规定抽水试验方法与成果', '已按用途确定水质检测项目', '已制定交付后的监测维护计划'], ready: '可以进入工作范围讨论', remaining: '仍需准备的项目' },
    glossaryTitle: '关键术语', glossary: [
      { term: '含水层 Aquifer', meaning: '能够储存并传输可利用地下水量的饱和地层。' }, { term: '地下水位 Water table', meaning: '潜水含水层饱和带的上表面。' }, { term: '补给 Recharge', meaning: '渗入并补充地下水的水。' }, { term: '静水位', meaning: '按规定停泵恢复后井内的水位。' }, { term: '水位降深', meaning: '静水位与动水位之间的差值。' }, { term: '洗井', meaning: '清除钻井细料并改善滤管周围进水条件的过程。' },
    ], quiz: { eyebrow: '知识测验', title: '完成前快速复习', intro: '选择最佳答案并立即查看解释。', correct: '正确', review: '请复习此知识点', result: '您的得分', perfect: '您已具备用这些基础知识与勘查设计团队沟通的能力。', retry: '重新开始', questions: [
      { question: '为什么相邻水井的出水量会明显不同？', choices: ['因为水泵品牌不同。', '因为孔隙、裂隙和含水层随位置变化。', '因为地下水只在夜间流动。'], correct: 1, explanation: '含水层连通性与成井质量共同控制进水能力。' }, { question: '抽水试验的主要用途是什么？', choices: ['用流量和水位响应确定运行与选泵依据。', '保证永远保持相同水量。', '替代水质分析。'], correct: 0, explanation: '抽水试验评价特定条件下的水力性能，不能替代水质和长期监测。' }, { question: '清澈无味的地下水一定能喝吗？', choices: ['一定可以。', '深井就可以。', '不一定，需按用途采样检测。'], correct: 2, explanation: '很多溶解物和微生物不可见也无味。' }, { question: '哪组交付资料最有利于长期维护？', choices: ['只有钻井发票。', '钻井记录、竣工结构、抽水试验、化验和水泵资料。', '只有完工照片。'], correct: 1, explanation: '完整资料可作为诊断、维护和更换设备的基线。' },
    ] },
    sourcesTitle: '官方学习来源', sourcesIntro: '本课程用于学习与前期规划。实际项目应核对最新法规并咨询专业人员。', reviewed: '资料核对日期：2026年8月4日', nextTitle: '准备把知识变成项目资料了吗？', nextText: '先估算基础需求，或把场地资料发送给团队讨论勘查与设计。', calculatorLink: '打开计算工具', contactLink: '联系团队', imageAltAquifer: '降雨补给、含水层和地下水井的剖面图', imageAltWell: '地下水井结构和抽水试验设备剖面图',
  },
  ja: {
    jumpLabel: '学習モジュールを選択', chapters: { concept: '地下水のでき方', thailand: 'タイの地域特性', workflow: '調査から井戸完成まで', well: '井戸の構造', pumping: '揚水試験の読み方', quality: '水質', operation: '長期維持管理' },
    summary: { time: '学習時間', level: 'レベル', modules: '内容', timeValue: '約15～20分', levelValue: '基礎から実務', modulesValue: '7モジュール＋確認テスト' }, outcomeTitle: '学習後にできること', outcomes: ['帯水層が地下河川ではない理由を説明する。', '調査・揚水試験報告の主要数値を理解する。', '水量と水質を別々に評価する。', '井戸引渡し・監視資料を整える。'],
    concept: { eyebrow: '水文地質の基礎', title: '降雨が地下水になるまで', intro: '降雨の一部は流出・蒸発し、一部は土壌の孔隙や岩盤亀裂へ浸透します。地下水面より下では孔隙が水で満たされ、有用な水量を貯留・伝達できる飽和地層を帯水層と呼びます。', caption: '概念断面：涵養水は不飽和帯を通り、砂礫層や亀裂岩盤へ入り、水理勾配に沿って井戸や地表水へ移動します。', legend: ['不飽和帯', '地下水面', '帯水層', '難透水層', '亀裂岩盤'], mythTitle: '正しいイメージ', mythText: '地下水の多くは大きな地下河川ではなく、連続する孔隙や亀裂をゆっくり移動します。そのため近接井戸でも深度、揚水量、水質が大きく異なる場合があります。', typesTitle: '帯水層タイプを選んで比較', types: [
      { name: '不圧帯水層', short: '地表から直接涵養', detail: '上面は地下水面で、降雨や季節に早く反応し、地表汚染の影響も受けやすい傾向があります。', implication: '井戸口保護、周辺汚染源、季節水位を重点的に確認します。' }, { name: '被圧帯水層', short: '難透水層に挟まれる', detail: '水が圧力を受け、井戸水位が帯水層上面より高くなることがあります。', implication: 'ケーシングとグラウトで異なる帯水層の混合を防ぎます。被圧でも水量は無限ではありません。' }, { name: '亀裂性岩盤帯水層', short: '連続亀裂に地下水が存在', detail: '硬岩では深度だけでなく亀裂の数、開口、方向、連続性が揚水量を支配します。', implication: '構造解析と井戸位置選定が重要で、近隣井戸は保証になりません。' },
    ] },
    thailand: { eyebrow: '地域を読む', title: 'タイでは短い距離でも帯水層条件が変わります', intro: '地下水図は帯水層、想定深度、水量、水質の一次評価に有効ですが、個別地点の掘削結果を保証するものではありません。', regions: [
      { title: '堆積盆地・河川平野', detail: '砂礫帯水層と粘土層が互層し、深度によって淡水と塩水が分かれる場合があります。', watch: '適切なケーシング・グラウトで層間流動を防ぎ、広域過剰揚水地域では地盤沈下に注意します。' }, { title: 'タイ東北部', detail: '一部地域では岩塩の影響で塩分や溶解性固形物が高くなります。', watch: '物理探査、孔内検層、水試料を組み合わせて淡水・塩水区間を区別します。' }, { title: '硬岩・丘陵地域', detail: '風化帯、節理、断層に地下水が存在し、地点差が大きくなります。', watch: '掘削前に地質構造と施工条件を確認し、不確実性を計画に含めます。' },
    ], mapTitle: '公的資料から始める', mapText: 'タイ地下水資源局はBadan4Thaiで県別地下水図と周辺井戸情報を提供しています。調査計画に利用し、現地調査と専門設計の代替にはしません。', mapLink: 'Badan4Thai情報を見る' },
    workflow: { eyebrow: 'プロジェクト工程', title: '良い井戸は深度ではなく、正しい問いから始まります', intro: '以下の順序は投資リスクを減らし、掘削孔を運用・保守可能な水システムへ変えます。', outputLabel: '必要な成果', steps: [
      { title: '水需要を定義', detail: '日量、ピーク、運転時間、必要水質、予備能力を分けます。', output: '水収支と初期設計条件' }, { title: '既存資料と敷地制約を確認', detail: '地下水図、近隣井戸、地質、搬入路、埋設物、汚染リスクを確認します。', output: '調査計画とリスク一覧' }, { title: '調査・井戸位置選定', detail: '現地調査と水文地質資料を統合し、必要に応じて物理探査を利用します。', output: '技術根拠のある掘削位置' }, { title: '法規要件を確認', detail: '担当機関、掘削・利用許可、業者資格、個別条件を確認します。', output: '有効な許可と適法な作業範囲' }, { title: '掘削・記録・実井設計', detail: '地層を記録し、実際の帯水層に合わせてケーシング、スクリーン、砂利、グラウトを決定します。', output: '井戸柱状図と完成構造記録' }, { title: '井戸仕上げ・揚水試験', detail: '掘削細粒を除去し、流量、水位、回復を連続測定します。', output: '推奨運転流量とポンプ選定根拠' }, { title: '水質分析・引渡し', detail: '用途に合う採水・分析を行い、運転基準値と井戸台帳を整えます。', output: '分析書、井戸資料、監視計画' },
    ], legalTitle: '許可手続きを省略しない', legalText: '地域と用途により要件が異なるため、掘削・取水前にタイ地下水資源局または所管担当者へ最新要件を確認してください。', legalLink: '法規・許可ガイドを読む' },
    well: { eyebrow: '井戸構造', title: '井戸は穴とポンプだけでなく、帯水層を守る構造物です', intro: '各部は対象層から取水し、砂を抑え、層間流動を防ぎ、測定・保守経路を確保します。', caption: '揚水試験の概念：揚水で井戸周辺水位が低下します。流量と時間ごとの水位が性能評価の中心データです。', parts: [
      { title: '井戸口・コンクリート台', detail: '井戸口を地表より高くし、汚水を井戸から排水します。' }, { title: 'ケーシング・環状グラウト', detail: '孔壁を支持し、不要な鉛直流路を封鎖します。' }, { title: 'スクリーン・砂利充填', detail: '対象帯水層から取水しながら地層粒子を制御します。' }, { title: 'ポンプ・揚水管', detail: '試験流量、動水位、井深、モーター冷却条件から選定します。' }, { title: '測定・採水口', detail: '水位、流量、圧力、電流、代表採水点を確保します。' }, { title: '完成図書', detail: '深度、管径、スクリーン、砂利、グラウト、ポンプ、試験結果を記録します。' },
    ] },
    pumping: { eyebrow: '数値を練習', title: '揚水試験は流量と水位応答の関係を示します', intro: '下の値を変えて基本関係を確認できます。実際の試験では回復を含む時系列データを記録し、帯水層と井戸構造を含め専門的に解釈します。', staticLevel: '井戸口からの静水位', pumpingLevel: '井戸口からの動水位', flowRate: '試験揚水量', drawdown: '水位低下量', specificCapacity: '比湧出量', unavailable: '動水位は静水位より深く設定してください。', interpretationTitle: '解釈上の注意', interpretation: ['水位低下量 = 動水位 − 静水位。', '比湧出量 = 揚水量 ÷ 水位低下量で、試験条件下の性能比較に使います。', '高い値でも無限または自動的に持続可能な揚水量を意味しません。', '運転流量はポンプ水没、季節、近隣井戸、回復を考慮します。'], fullTool: '完全版計算ツールを開く' },
    quality: { eyebrow: '透明でも安全とは限らない', title: '水量と水質は別々に判断します', intro: '飲用、食品、ボイラー、冷却、灌漑、衛生など用途に合わせて分析項目を決めます。', clearWarning: '色、臭い、透明度だけでは安全を確認できません。適切な採水と試験室分析が必要です。', groups: [
      { title: '物理・基礎項目', items: '色、濁度、臭気、pH、電気伝導度、溶解性固形物', purpose: '問題のスクリーニング、傾向管理、初期処理検討に使います。' }, { title: '鉱物・化学項目', items: '鉄、マンガン、硬度、塩化物、フッ化物、硝酸、ヒ素、地域リスク項目', purpose: '健康、味、着色、スケール、腐食、工程に影響します。' }, { title: '微生物', items: '大腸菌群、E. coli、適用基準の指標', purpose: '飲用、食品、人体接触用途で重要です。' }, { title: '活動固有リスク', items: '金属、有機物、農薬、工程固有項目', purpose: '土地利用履歴、近隣汚染源、利用条件から決めます。' },
    ], salineTitle: 'タイの一部地域では塩水に注意', salineText: 'タイ中部低地と東北部の一部には異なる地質要因による塩水層があります。複数資料で淡水・塩水を区分し、井戸で層を接続しない設計が必要です。', standardLink: '地下水飲用水質基準を見る' },
    operation: { eyebrow: '基準値を守る', title: '傾向データが大きな故障前の修理を可能にします', intro: '全井戸共通の保守周期はありません。引渡し時基準値から始め、重要度、水質、運転時間、許可条件に応じて頻度を決めます。', monitorTitle: '記録する項目', monitor: [
      { title: '流量・運転時間', detail: '供給量、運転時間、需要変化を比較します。' }, { title: '静水位・動水位', detail: '帯水層応答、目詰まり、揚水量の妥当性を確認します。' }, { title: '圧力・電流・エネルギー', detail: 'ポンプ、配管、バルブ、電気、水位の異常を検知します。' }, { title: '濁度・砂・水質', detail: '目に見える悪化前に基準値と用途条件に比較します。' },
    ], warningTitle: '大型ポンプへ変更する前に調査', warnings: ['水位は同程度だが流量が低下。', '同じ流量で水位低下が増加。', '砂、濁度、臭気、塩分が増加。', '電流、圧力、音、振動が変化。', '回復が基準より継続的に遅い。'], checklistTitle: '投資前準備チェック', checklistIntro: '資料で確認できた項目だけ選択してください。', checklist: ['水収支とピーク需要を確認済み', '地図と近隣井戸資料を確認済み', '搬入路と汚染リスクを確認済み', '許可と担当者を確認済み', '井戸記録・完成図書を仕様化済み', '揚水試験方法・成果を仕様化済み', '用途別水質分析項目を設定済み', '引渡し後監視・保守計画を作成済み'], ready: '作業範囲協議の準備完了', remaining: '追加準備項目' },
    glossaryTitle: '重要用語', glossary: [
      { term: '帯水層 Aquifer', meaning: '有用な地下水量を貯留・伝達できる飽和地層。' }, { term: '地下水面 Water table', meaning: '不圧帯水層の飽和帯上面。' }, { term: '涵養 Recharge', meaning: '浸透して地下水を補給する水。' }, { term: '静水位', meaning: '所定の停止・回復後の井戸水位。' }, { term: '水位低下量 Drawdown', meaning: '静水位と動水位の差。' }, { term: '井戸仕上げ Well development', meaning: '掘削細粒を除去しスクリーン周辺の流入条件を整える工程。' },
    ], quiz: { eyebrow: '理解度確認', title: '学習終了前の短い復習', intro: '最適な答えを選ぶと理由が表示されます。', correct: '正解', review: 'この点を復習', result: '得点', perfect: '調査・設計チームと基礎事項を協議する準備ができました。', retry: 'もう一度', questions: [
      { question: '近接井戸で揚水量が大きく異なる理由は？', choices: ['ポンプメーカーが異なるため。', '孔隙、亀裂、帯水層が位置で変わるため。', '地下水は夜だけ流れるため。'], correct: 1, explanation: '帯水層の連続性と井戸構造が流入能力を支配します。' }, { question: '揚水試験の主目的は？', choices: ['流量と水位応答から運転・ポンプ選定を検討する。', '永久に同じ水量を保証する。', '水質分析を代替する。'], correct: 0, explanation: '試験条件下の水理性能を評価しますが、水質・長期監視は別に必要です。' }, { question: '透明で無臭の地下水は飲めますか？', choices: ['必ず飲める。', '深井戸なら飲める。', '用途に沿う採水・分析なしでは判断できない。'], correct: 2, explanation: '見えず臭わない溶解物質や微生物があります。' }, { question: '長期保守に最も有用な引渡し資料は？', choices: ['掘削請求書のみ。', '井戸記録、完成構造、揚水試験、水質、ポンプ資料。', '完成日の写真のみ。'], correct: 1, explanation: '完全な資料が診断、保守、交換の基準になります。' },
    ] },
    sourcesTitle: '公的学習資料', sourcesIntro: '本教材は学習・初期計画用です。実案件は最新法規と専門家助言を確認してください。', reviewed: '資料確認日：2026年8月4日', nextTitle: '知識を案件データへ変えますか？', nextText: '初期需要を計算するか、敷地情報を送って調査・設計を相談できます。', calculatorLink: '計算ツールを開く', contactLink: 'チームへ相談', imageAltAquifer: '降雨涵養、帯水層、地下水井戸を示す断面図', imageAltWell: '地下水井戸構造と揚水試験設備の断面図',
  },
}

const chapterIcons: Record<ChapterId, LucideIcon> = {
  concept: CloudRain,
  thailand: MapPinned,
  workflow: ClipboardCheck,
  well: Shovel,
  pumping: Gauge,
  quality: FlaskConical,
  operation: Wrench,
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

function NumberInput({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="gb-number-field" htmlFor={id}>
      <span>{label}</span>
      <span><input id={id} type="number" inputMode="decimal" min="0" step="0.1" value={value} onChange={(event) => onChange(Math.max(0, event.currentTarget.valueAsNumber || 0))} /><small>m</small></span>
    </label>
  )
}

export default function GroundwaterBasics({ locale = 'th', localized = false }: { locale?: LocalizedLocale; localized?: boolean }) {
  const copy = copyByLocale[locale]
  const [activeAquifer, setActiveAquifer] = useState(0)
  const [staticLevel, setStaticLevel] = useState(12)
  const [pumpingLevel, setPumpingLevel] = useState(27)
  const [flowRate, setFlowRate] = useState(30)
  const [checkedItems, setCheckedItems] = useState<number[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const formatter = useMemo(() => new Intl.NumberFormat(localeInfo[locale].htmlLang, { maximumFractionDigits: 2 }), [locale])
  const drawdown = Math.max(0, pumpingLevel - staticLevel)
  const specificCapacity = drawdown > 0 ? flowRate / drawdown : null
  const quizScore = copy.quiz.questions.reduce((score, question, index) => score + (answers[index] === question.correct ? 1 : 0), 0)
  const quizComplete = Object.keys(answers).length === copy.quiz.questions.length
  const localLink = (path: string) => localized ? localePath(path, locale) : path

  const scrollToChapter = (chapter: ChapterId) => {
    document.getElementById(`gb-${chapter}`)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  const toggleChecklist = (index: number) => {
    setCheckedItems((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])
  }

  return (
    <article className="gb-course" aria-label={copy.concept.title}>
      <section className="gb-course-overview">
        <div className="gb-summary-grid">
          <div><BookOpen aria-hidden="true" /><span>{copy.summary.time}</span><strong>{copy.summary.timeValue}</strong></div>
          <div><Waves aria-hidden="true" /><span>{copy.summary.level}</span><strong>{copy.summary.levelValue}</strong></div>
          <div><Layers3 aria-hidden="true" /><span>{copy.summary.modules}</span><strong>{copy.summary.modulesValue}</strong></div>
        </div>
        <div className="gb-outcomes"><h2>{copy.outcomeTitle}</h2><ul>{copy.outcomes.map((outcome) => <li key={outcome}><CheckCircle2 aria-hidden="true" />{outcome}</li>)}</ul></div>
      </section>

      <nav className="gb-chapter-nav" aria-label={copy.jumpLabel}>
        <strong>{copy.jumpLabel}</strong>
        <div>{chapterIds.map((chapter) => { const Icon = chapterIcons[chapter]; return <button type="button" key={chapter} onClick={() => scrollToChapter(chapter)}><Icon aria-hidden="true" /><span>{copy.chapters[chapter]}</span></button> })}</div>
      </nav>

      <section className="gb-module" id="gb-concept">
        <header className="gb-module-heading"><span><CloudRain aria-hidden="true" /></span><div><p>{copy.concept.eyebrow}</p><h2>{copy.concept.title}</h2><div>{copy.concept.intro}</div></div></header>
        <figure className="gb-hero-figure"><Image src="/images/learning/groundwater-basics/aquifer-cross-section.webp" alt={copy.imageAltAquifer} width={1600} height={1024} sizes="(width <= 900px) 100vw, 1280px" priority /><figcaption>{copy.concept.caption}</figcaption></figure>
        <ul className="gb-figure-legend">{copy.concept.legend.map((item, index) => <li key={item}><span style={{ '--legend-index': index } as React.CSSProperties} />{item}</li>)}</ul>
        <aside className="gb-myth"><AlertTriangle aria-hidden="true" /><div><h3>{copy.concept.mythTitle}</h3><p>{copy.concept.mythText}</p></div></aside>
        <div className="gb-aquifer-explorer"><h3>{copy.concept.typesTitle}</h3><div className="gb-aquifer-tabs" role="tablist">{copy.concept.types.map((type, index) => <button type="button" role="tab" aria-selected={activeAquifer === index} className={activeAquifer === index ? 'is-active' : ''} onClick={() => setActiveAquifer(index)} key={type.name}><span>{type.name}</span><small>{type.short}</small></button>)}</div><div className="gb-aquifer-detail" role="tabpanel"><Droplets aria-hidden="true" /><div><h4>{copy.concept.types[activeAquifer].name}</h4><p>{copy.concept.types[activeAquifer].detail}</p><strong>{copy.concept.types[activeAquifer].implication}</strong></div></div></div>
      </section>

      <section className="gb-module" id="gb-thailand">
        <header className="gb-module-heading"><span><MapPinned aria-hidden="true" /></span><div><p>{copy.thailand.eyebrow}</p><h2>{copy.thailand.title}</h2><div>{copy.thailand.intro}</div></div></header>
        <div className="gb-region-grid">{copy.thailand.regions.map((region) => <article key={region.title}><h3>{region.title}</h3><p>{region.detail}</p><div><AlertTriangle aria-hidden="true" />{region.watch}</div></article>)}</div>
        <aside className="gb-official-card"><Database aria-hidden="true" /><div><h3>{copy.thailand.mapTitle}</h3><p>{copy.thailand.mapText}</p><a href="https://www.dgr.go.th/th/newsAll/124/9048" target="_blank" rel="noopener noreferrer">{copy.thailand.mapLink}<ArrowRight aria-hidden="true" /></a></div></aside>
      </section>

      <section className="gb-module" id="gb-workflow">
        <header className="gb-module-heading"><span><ClipboardCheck aria-hidden="true" /></span><div><p>{copy.workflow.eyebrow}</p><h2>{copy.workflow.title}</h2><div>{copy.workflow.intro}</div></div></header>
        <div className="gb-workflow">{copy.workflow.steps.map((step, index) => <article key={step.title}><span aria-hidden="true">{index === 0 ? <Droplets /> : index === 1 ? <Database /> : index === 2 ? <MapPinned /> : index === 3 ? <ShieldCheck /> : index === 4 ? <Shovel /> : index === 5 ? <Gauge /> : <TestTube2 />}</span><div><h3>{step.title}</h3><p>{step.detail}</p><small><strong>{copy.workflow.outputLabel}:</strong> {step.output}</small></div></article>)}</div>
        <aside className="gb-legal-note"><ShieldCheck aria-hidden="true" /><div><h3>{copy.workflow.legalTitle}</h3><p>{copy.workflow.legalText}</p><Link href={localLink('/learn/groundwater-law-regulation-thailand')}>{copy.workflow.legalLink}<ArrowRight aria-hidden="true" /></Link></div></aside>
      </section>

      <section className="gb-module" id="gb-well">
        <header className="gb-module-heading"><span><Shovel aria-hidden="true" /></span><div><p>{copy.well.eyebrow}</p><h2>{copy.well.title}</h2><div>{copy.well.intro}</div></div></header>
        <div className="gb-well-layout"><figure><Image src="/images/learning/groundwater-basics/well-pumping-test.webp" alt={copy.imageAltWell} width={1600} height={1024} sizes="(width <= 900px) 100vw, 760px" /><figcaption>{copy.well.caption}</figcaption></figure><div className="gb-well-parts">{copy.well.parts.map((part) => <article key={part.title}><Check aria-hidden="true" /><div><h3>{part.title}</h3><p>{part.detail}</p></div></article>)}</div></div>
      </section>

      <section className="gb-module" id="gb-pumping">
        <header className="gb-module-heading"><span><Gauge aria-hidden="true" /></span><div><p>{copy.pumping.eyebrow}</p><h2>{copy.pumping.title}</h2><div>{copy.pumping.intro}</div></div></header>
        <div className="gb-pumping-lab"><div className="gb-pumping-inputs"><NumberInput id="gb-static-level" label={copy.pumping.staticLevel} value={staticLevel} onChange={setStaticLevel} /><NumberInput id="gb-pumping-level" label={copy.pumping.pumpingLevel} value={pumpingLevel} onChange={setPumpingLevel} /><label className="gb-number-field" htmlFor="gb-flow-rate"><span>{copy.pumping.flowRate}</span><span><input id="gb-flow-rate" type="number" inputMode="decimal" min="0" step="0.1" value={flowRate} onChange={(event) => setFlowRate(Math.max(0, event.currentTarget.valueAsNumber || 0))} /><small>m³/h</small></span></label></div><output className="gb-pumping-results"><div><span>{copy.pumping.drawdown}</span><strong>{formatter.format(drawdown)} <small>m</small></strong></div><div><span>{copy.pumping.specificCapacity}</span><strong>{specificCapacity === null ? '—' : formatter.format(specificCapacity)} <small>m³/h/m</small></strong>{specificCapacity === null && <em>{copy.pumping.unavailable}</em>}</div></output></div>
        <div className="gb-interpretation"><h3>{copy.pumping.interpretationTitle}</h3><ul>{copy.pumping.interpretation.map((item) => <li key={item}><CheckCircle2 aria-hidden="true" />{item}</li>)}</ul><Link href={localLink('/learn/groundwater-calculator-tools')}>{copy.pumping.fullTool}<ArrowRight aria-hidden="true" /></Link></div>
      </section>

      <section className="gb-module" id="gb-quality">
        <header className="gb-module-heading"><span><FlaskConical aria-hidden="true" /></span><div><p>{copy.quality.eyebrow}</p><h2>{copy.quality.title}</h2><div>{copy.quality.intro}</div></div></header>
        <aside className="gb-quality-warning"><TestTube2 aria-hidden="true" />{copy.quality.clearWarning}</aside>
        <div className="gb-quality-grid">{copy.quality.groups.map((group) => <article key={group.title}><FlaskConical aria-hidden="true" /><h3>{group.title}</h3><strong>{group.items}</strong><p>{group.purpose}</p></article>)}</div>
        <aside className="gb-saline-note"><Waves aria-hidden="true" /><div><h3>{copy.quality.salineTitle}</h3><p>{copy.quality.salineText}</p><a href="https://www.dgr.go.th/th/newsAll/124/7941" target="_blank" rel="noopener noreferrer">{copy.quality.standardLink}<ArrowRight aria-hidden="true" /></a></div></aside>
      </section>

      <section className="gb-module" id="gb-operation">
        <header className="gb-module-heading"><span><Wrench aria-hidden="true" /></span><div><p>{copy.operation.eyebrow}</p><h2>{copy.operation.title}</h2><div>{copy.operation.intro}</div></div></header>
        <h3 className="gb-subheading">{copy.operation.monitorTitle}</h3><div className="gb-monitor-grid">{copy.operation.monitor.map((item) => <article key={item.title}><Gauge aria-hidden="true" /><h4>{item.title}</h4><p>{item.detail}</p></article>)}</div>
        <aside className="gb-warning-list"><AlertTriangle aria-hidden="true" /><div><h3>{copy.operation.warningTitle}</h3><ul>{copy.operation.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div></aside>
        <div className="gb-checklist"><div className="gb-checklist-heading"><div><p>{copy.operation.checklistTitle}</p><span>{copy.operation.checklistIntro}</span></div><strong>{checkedItems.length}/{copy.operation.checklist.length}</strong></div><div className="gb-check-progress" aria-hidden="true"><span style={{ width: `${checkedItems.length / copy.operation.checklist.length * 100}%` }} /></div><div className="gb-check-items">{copy.operation.checklist.map((item, index) => <label key={item} className={checkedItems.includes(index) ? 'is-checked' : ''}><input type="checkbox" checked={checkedItems.includes(index)} onChange={() => toggleChecklist(index)} /><span><Check aria-hidden="true" /></span>{item}</label>)}</div><p className="gb-check-status"><strong>{checkedItems.length === copy.operation.checklist.length ? copy.operation.ready : copy.operation.remaining}:</strong> {copy.operation.checklist.length - checkedItems.length}</p></div>
      </section>

      <section className="gb-glossary"><h2>{copy.glossaryTitle}</h2><div>{copy.glossary.map((item) => <details key={item.term}><summary>{item.term}</summary><p>{item.meaning}</p></details>)}</div></section>

      <section className="gb-quiz">
        <header><p>{copy.quiz.eyebrow}</p><h2>{copy.quiz.title}</h2><span>{copy.quiz.intro}</span></header>
        <div className="gb-quiz-questions">{copy.quiz.questions.map((question, questionIndex) => { const selected = answers[questionIndex]; const answered = selected !== undefined; return <fieldset key={question.question}><legend>{question.question}</legend><div>{question.choices.map((choice, choiceIndex) => <button type="button" className={answered ? choiceIndex === question.correct ? 'is-correct' : selected === choiceIndex ? 'is-wrong' : '' : ''} onClick={() => setAnswers((current) => ({ ...current, [questionIndex]: choiceIndex }))} key={choice}><span>{answered && choiceIndex === question.correct ? <CheckCircle2 aria-hidden="true" /> : <span aria-hidden="true" />}</span>{choice}</button>)}</div>{answered && <p className={selected === question.correct ? 'is-correct' : 'is-review'}><strong>{selected === question.correct ? copy.quiz.correct : copy.quiz.review}:</strong> {question.explanation}</p>}</fieldset> })}</div>
        {quizComplete && <div className="gb-quiz-result" aria-live="polite"><div><span>{copy.quiz.result}</span><strong>{quizScore}/{copy.quiz.questions.length}</strong><p>{quizScore === copy.quiz.questions.length ? copy.quiz.perfect : copy.quiz.review}</p></div><button type="button" onClick={() => setAnswers({})}><RefreshCcw aria-hidden="true" />{copy.quiz.retry}</button></div>}
      </section>

      <section className="gb-sources"><div><p>{copy.sourcesTitle}</p><h2>{copy.sourcesIntro}</h2><span>{copy.reviewed}</span></div><ul>{officialSourceUrls.map((href, index) => <li key={href}><a href={href} target="_blank" rel="noopener noreferrer">{officialSourceLabels[locale][index]}<ArrowRight aria-hidden="true" /></a></li>)}</ul></section>

      <section className="gb-next"><div><Droplets aria-hidden="true" /><div><h2>{copy.nextTitle}</h2><p>{copy.nextText}</p></div></div><nav><Link href={localLink('/learn/groundwater-calculator-tools')}>{copy.calculatorLink}<ArrowRight aria-hidden="true" /></Link><Link href={localLink('/contact')}>{copy.contactLink}</Link></nav></section>
    </article>
  )
}
