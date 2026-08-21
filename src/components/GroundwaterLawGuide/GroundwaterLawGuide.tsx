'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Droplets,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Filter,
  Gauge,
  Gavel,
  HardHat,
  History,
  Info,
  Landmark,
  MapPinned,
  RefreshCcw,
  Scale,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { localePath, type LocalizedLocale } from '@/i18n/config'
import {
  groundwaterLawDocuments,
  groundwaterLawOfficialRepositories,
  type GroundwaterLawCategory,
  type GroundwaterLawStatus,
} from '@/data/groundwater-law-library'
import './GroundwaterLawGuide.css'

type ChapterId = 'foundation' | 'navigator' | 'lifecycle' | 'duties' | 'library' | 'penalties' | 'quiz'
type ProjectStage = 'planned' | 'operating' | 'closing'
type UseProfile = 'household' | 'agriculture' | 'business' | 'industrial' | 'large'
type CategoryFilter = 'all' | GroundwaterLawCategory

type GuideCopy = {
  summary: { documents: string; documentsValue: string; sources: string; sourcesValue: string; reviewed: string; reviewedValue: string }
  outcomesTitle: string
  outcomes: string[]
  jumpLabel: string
  chapters: Record<ChapterId, string>
  disclaimer: { title: string; text: string; scope: string }
  imageAlt: { hierarchy: string; lifecycle: string }
  imageCaption: { hierarchy: string; lifecycle: string }
  foundation: {
    eyebrow: string
    title: string
    intro: string
    layers: { title: string; text: string; example: string }[]
    exampleLabel: string
    exactTitle: string
    exactIntro: string
    sections: { section: string; title: string; text: string }[]
    sourceLink: string
  }
  navigator: {
    eyebrow: string
    title: string
    intro: string
    depth: string
    depthHint: string
    stage: string
    stages: Record<ProjectStage, string>
    use: string
    uses: Record<UseProfile, string>
    critical: string
    discharge: string
    resultTitle: string
    results: Record<'zone' | 'shallow' | 'drill' | 'use' | 'close' | 'type23' | 'critical' | 'discharge', string>
    verify: string
  }
  lifecycle: { eyebrow: string; title: string; intro: string; steps: { title: string; text: string; evidence: string }[]; evidenceLabel: string }
  duties: {
    eyebrow: string
    title: string
    intro: string
    items: { title: string; rule: string; timing: string; source: string }[]
    timingLabel: string
    sourceLabel: string
    deadlineTitle: string
    deadlineItems: string[]
  }
  library: {
    eyebrow: string
    title: string
    intro: string
    officialThaiNote: string
    searchLabel: string
    searchPlaceholder: string
    filtersLabel: string
    all: string
    categories: Record<GroundwaterLawCategory, string>
    showReference: string
    results: string
    noResults: string
    reset: string
    officialText: string
    status: Record<GroundwaterLawStatus, string>
    yearLabel: string
    repositoriesTitle: string
    repositoriesText: string
    masterLink: string
  }
  checklist: { title: string; intro: string; items: string[]; complete: string; remaining: string }
  penalties: {
    eyebrow: string
    title: string
    intro: string
    items: { section: string; title: string; text: string }[]
    warningTitle: string
    warningText: string
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
  sources: { eyebrow: string; title: string; text: string; links: string[] }
  next: { title: string; text: string; contact: string; basics: string }
}

const chapterIds: ChapterId[] = ['foundation', 'navigator', 'lifecycle', 'duties', 'library', 'penalties', 'quiz']
const chapterIcons = { foundation: Landmark, navigator: FileSearch, lifecycle: HardHat, duties: ClipboardCheck, library: Search, penalties: Gavel, quiz: CheckCircle2 }

const copyByLocale: Record<LocalizedLocale, GuideCopy> = {
  th: {
    summary: { documents: 'เอกสารในคลัง', documentsValue: `${groundwaterLawDocuments.length} ฉบับ`, sources: 'แหล่งหลัก', sourcesValue: 'กรมทรัพยากรน้ำบาดาล', reviewed: 'ตรวจสอบล่าสุด', reviewedValue: '4 สิงหาคม 2569' },
    outcomesTitle: 'หน้านี้ช่วยให้คุณ',
    outcomes: ['เห็นภาพว่าพ.ร.บ. กฎกระทรวง ประกาศ และระเบียบทำงานร่วมกันอย่างไร', 'ค้นชื่อกฎหมายจริงตามปี เรื่อง และคำสำคัญได้ทันที', 'จัดลำดับงานตั้งแต่ก่อนเจาะจนถึงเลิกใช้และอุดกลบ', 'แยกหน้าที่ทั่วไปออกจากข้อกำหนดเขตวิกฤตและการใช้น้ำประเภทที่ 2–3'],
    jumpLabel: 'ไปยังหัวข้อ',
    chapters: { foundation: 'โครงสร้างกฎหมาย', navigator: 'เช็กโครงการ', lifecycle: 'วงจรใบอนุญาต', duties: 'หน้าที่และกำหนดเวลา', library: 'ค้นกฎหมายทั้งหมด', penalties: 'การบังคับและโทษ', quiz: 'ทบทวนความรู้' },
    disclaimer: { title: 'คลังเรียนรู้ ไม่ใช่คำปรึกษากฎหมายเฉพาะกรณี', text: 'ข้อความอธิบายเป็นการเรียบเรียงเพื่อช่วยอ่านเท่านั้น เมื่อใช้จริงให้ยึดถ้อยคำในราชกิจจานุเบกษา เงื่อนไขในใบอนุญาต และคำแนะนำของพนักงานน้ำบาดาลประจำท้องที่', scope: 'คลังนี้รวบรวมเอกสารที่สร้างหน้าที่แก่ผู้เจาะ ผู้ใช้ ผู้รับใบอนุญาต และโครงการ ไม่รวมระเบียบสวัสดิการหรือคำสั่งบริหารภายในที่ไม่สร้างหน้าที่แก่ผู้ประกอบกิจการ โดยมีลิงก์คลังกลางของกรมสำหรับตรวจทั้งหมด' },
    imageAlt: { hierarchy: 'ภาพลำดับกฎหมายน้ำบาดาลจากตัวบทสู่ใบอนุญาต การเจาะ เครื่องวัด และบ่อน้ำบาดาล', lifecycle: 'ภาพขั้นตอนตั้งแต่สำรวจ ยื่นคำขอ เจาะ เดินระบบและอุดกลบบ่อน้ำบาดาล' },
    imageCaption: { hierarchy: 'กฎหมายแม่บทกำหนดอำนาจและหน้าที่ ส่วนกฎกระทรวง ประกาศ และระเบียบทำให้ข้อกำหนดนั้นใช้ได้จริงในงานภาคสนาม', lifecycle: 'ใบอนุญาตไม่จบที่การได้รับเอกสาร—การเจาะ รายงาน วัดปริมาณ ต่ออายุ และอุดกลบเป็นส่วนของวงจรเดียวกัน' },
    foundation: {
      eyebrow: 'อ่านให้ถูกลำดับ', title: 'กฎหมาย 5 ชั้นที่ต้องเปิดประกอบกัน', intro: 'การอ่านเพียง พ.ร.บ. ฉบับเดียวไม่พอ เพราะรายละเอียดแบบคำขอ มาตรฐานเจาะ ค่าใช้จ่าย และวิธีปฏิบัติอยู่ในกฎหมายลำดับรอง', exampleLabel: 'ตัวอย่าง',
      layers: [
        { title: 'พ.ร.บ.น้ำบาดาล', text: 'วางคำนิยาม อำนาจรัฐ ใบอนุญาต หน้าที่ การตรวจสอบ อุทธรณ์ และบทกำหนดโทษ', example: 'มาตรา 16 ห้ามประกอบกิจการโดยไม่มีใบอนุญาต' },
        { title: 'พ.ร.บ.ทรัพยากรน้ำ', text: 'วางระบบการใช้น้ำสาธารณะประเภทที่ 1–3 และเชื่อมกับโครงการที่มีขนาดหรือผลกระทบสูง', example: 'ประเภทที่ 2–3 ต้องมีแผนบริหารจัดการน้ำ' },
        { title: 'กฎกระทรวง', text: 'ลงรายละเอียดประเภทการใช้ คำขอ ใบอนุญาต ค่าธรรมเนียม ค่าใช้น้ำ และค่าอนุรักษ์', example: 'อายุใบอนุญาตและรายการเอกสาร' },
        { title: 'ประกาศ', text: 'กำหนดเขต/ความลึก มาตรฐานวิชาการ แบบ นบ. ผู้ควบคุมงาน และเขตวิกฤตการณ์', example: 'ทั่วประเทศ ลึกเกิน 15 เมตรอยู่ในนิยามน้ำบาดาลตามประกาศปัจจุบัน' },
        { title: 'ระเบียบและเงื่อนไขใบอนุญาต', text: 'กำหนดวิธีตรวจสถานที่ พิจารณา โอน ต่ออายุ ระบบอิเล็กทรอนิกส์ และรายละเอียดเฉพาะราย', example: 'เงื่อนไขในใบอนุญาตผูกพันผู้รับใบอนุญาตโดยตรง' },
      ],
      exactTitle: 'มาตราหลักที่ควรรู้ก่อนเริ่มโครงการ', exactIntro: 'คำอธิบายด้านล่างเป็นสาระย่อ ให้กดเปิดฉบับปัจจุบันเพื่ออ่านถ้อยคำเต็มและเชิงอรรถ',
      sections: [
        { section: 'มาตรา 16', title: 'ที่ดินของตนเองก็ต้องมีใบอนุญาต', text: 'ห้ามประกอบกิจการน้ำบาดาลในเขตน้ำบาดาล เว้นแต่ได้รับใบอนุญาตจากอธิบดีหรือผู้ได้รับมอบหมาย' },
        { section: 'มาตรา 18', title: 'ใบอนุญาตมี 3 ประเภท', text: 'ใบอนุญาตเจาะ ใบอนุญาตใช้ และใบอนุญาตระบายน้ำลงบ่อน้ำบาดาล เป็นคนละการอนุญาต' },
        { section: 'มาตรา 20', title: 'ใบอนุญาตมีวันสิ้นอายุ', text: 'พ.ร.บ.กำหนดเพดานอายุ และกฎหมายลำดับรอง/ใบอนุญาตกำหนดอายุจริง ต้องยื่นต่ออายุก่อนสิ้นอายุ' },
        { section: 'มาตรา 22–25/1', title: 'ต้องทำตามเงื่อนไขและชำระเงินที่เกี่ยวข้อง', text: 'ผู้รับใบอนุญาตต้องทำตามใบอนุญาต แสดงใบอนุญาต จัดการใบแทน และชำระค่าใช้/ค่าอนุรักษ์ตามที่กฎหมายกำหนด' },
        { section: 'มาตรา 26–27', title: 'เลิกใช้ต้องแจ้งและจัดการบ่อ', text: 'แจ้งเลิกกิจการภายใน 15 วัน และรื้อถอนหรืออุดกลบตามคำสั่งและมาตรฐานเพื่อไม่ให้บ่อเป็นทางปนเปื้อน' },
      ],
      sourceLink: 'เปิด พ.ร.บ.ฉบับปัจจุบันจากกรม',
    },
    navigator: {
      eyebrow: 'คัดกรองเบื้องต้น', title: 'โครงการของคุณต้องเปิดกฎหมายชุดใดก่อน?', intro: 'ระบุข้อมูลพื้นฐาน ระบบจะแสดงรายการที่ควรตรวจ ไม่ได้ตัดสินว่าอนุญาตได้หรือจัดประเภททางกฎหมายแทนเจ้าหน้าที่', depth: 'ความลึกที่วางแผนหรือความลึกบ่อ', depthHint: 'เมตรจากผิวดิน', stage: 'สถานะโครงการ', stages: { planned: 'กำลังวางแผน/ยังไม่เจาะ', operating: 'มีบ่อหรือกำลังใช้งาน', closing: 'กำลังเลิกใช้หรือบ่อชำรุด' }, use: 'ลักษณะการใช้หลัก', uses: { household: 'อุปโภคบริโภค/ที่พักอาศัย', agriculture: 'เกษตรหรือปศุสัตว์', business: 'โรงแรม อาคาร หรือธุรกิจ', industrial: 'โรงงานหรือกระบวนการผลิต', large: 'ปริมาณมาก/กระทบหลายพื้นที่/อาจเป็นประเภท 2–3' }, critical: 'พื้นที่กรุงเทพฯ และ 6 จังหวัดเขตวิกฤตการณ์', discharge: 'มีแผนระบายน้ำหรือของเหลวลงบ่อน้ำบาดาล', resultTitle: 'ชุดกฎหมายที่ควรตรวจ',
      results: {
        zone: 'ความลึกเกิน 15 เมตร: ตรวจใบอนุญาตตาม พ.ร.บ.น้ำบาดาล ประกาศเขตและความลึก และกฎกระทรวงการขอใบอนุญาต', shallow: 'ความลึกไม่เกิน 15 เมตร: อย่าสรุปว่าไม่อยู่ภายใต้กฎหมาย ให้ยืนยันชนิดบ่อ พื้นที่ และประกาศเฉพาะกับพนักงานท้องที่ก่อนดำเนินงาน', drill: 'ก่อนเจาะ: ขอใบอนุญาตเจาะก่อนเริ่มงาน ใช้ช่างเจาะ/ผู้ควบคุมที่มีหนังสือรับรอง และทำตามมาตรฐานทางวิชาการ', use: 'บ่อที่ใช้งาน: ตรวจใบอนุญาตใช้ เงื่อนไขปริมาณ เครื่องวัด แบบ นบ.11 ค่าใช้น้ำ และวันต่ออายุ', close: 'เลิกใช้: แจ้งเป็นหนังสือภายใน 15 วัน และดำเนินการอุดกลบ/รายงานตามคำสั่งและประกาศ พ.ศ. 2552', type23: 'ปริมาณหรือผลกระทบสูง: ให้เจ้าหน้าที่จำแนกประเภทตาม พ.ร.บ.ทรัพยากรน้ำและกฎกระทรวง พ.ศ. 2567 พร้อมแผนบริหารจัดการน้ำ', critical: 'เขตวิกฤตการณ์: ตรวจข้อจำกัดเฉพาะ ค่าอนุรักษ์น้ำบาดาล สัดส่วนแหล่งน้ำ และเงื่อนไขในใบอนุญาต', discharge: 'การระบายน้ำลงบ่อเป็นกิจการที่ต้องมีใบอนุญาตเฉพาะและต้องผ่านมาตรฐานป้องกันการปนเปื้อน ไม่ใช่การกำจัดน้ำทั่วไป' },
      verify: 'นำผลนี้ไปยืนยันกับสำนักงานทรัพยากรธรรมชาติและสิ่งแวดล้อมจังหวัด สำนักทรัพยากรน้ำบาดาลเขต หรือสำนักควบคุมกิจการน้ำบาดาลก่อนออกแบบและจัดซื้อ',
    },
    lifecycle: {
      eyebrow: 'จากพื้นที่ถึงวันอุดกลบ', title: 'วงจรการปฏิบัติตามกฎหมาย 9 ขั้น', intro: 'เอกสารและหลักฐานควรถูกวางไว้ในแผนงานตั้งแต่ต้น ไม่ใช่รอแก้หลังเจาะเสร็จ', evidenceLabel: 'หลักฐานที่ควรเก็บ',
      steps: [
        { title: 'ยืนยันพื้นที่และความลึก', text: 'ตรวจเขตน้ำบาดาล เขตวิกฤต หน่วยงานผู้รับคำขอ และข้อจำกัดเฉพาะพื้นที่', evidence: 'แผนที่ พิกัด เอกสารสิทธิ และคำยืนยันหน่วยงาน' },
        { title: 'จำแนกกิจกรรมและประเภทการใช้', text: 'แยกเจาะ ใช้ หรือระบาย และประเมินว่าการใช้อาจเข้าประเภทที่ 2–3 หรือไม่', evidence: 'สมดุลน้ำ ปริมาณสูงสุด วัตถุประสงค์ และแผนบริหารจัดการน้ำ' },
        { title: 'เตรียมผู้รับผิดชอบและแบบ', text: 'ใช้ผู้มีหนังสือรับรองตามขนาด/เงื่อนไขงาน และเตรียมแบบคำขอล่าสุด', evidence: 'หนังสือรับรอง แบบบ่อ รายการเครื่องจักร และหนังสือยินยอม' },
        { title: 'รับใบอนุญาตเจาะก่อนเริ่ม', text: 'ห้ามเริ่มเจาะเพียงเพราะยื่นคำขอแล้ว ต้องรอการอนุญาตและอ่านเงื่อนไขทุกข้อ', evidence: 'ใบอนุญาตเจาะและหลักฐานการแสดง ณ สถานที่' },
        { title: 'เจาะและรายงานตามมาตรฐาน', text: 'บันทึกชั้นดิน/หิน ช่วงกรอง การพัฒนาบ่อ การทดสอบสูบ และตัวอย่างน้ำ', evidence: 'รายงานผลเจาะ well log pumping test และผลวิเคราะห์' },
        { title: 'ขอใบอนุญาตใช้', text: 'ยื่นผลการเจาะและข้อมูลใช้จริง ก่อนสูบน้ำเพื่อประกอบกิจการตามปกติ', evidence: 'ใบอนุญาตใช้ ปริมาณอนุญาต และเงื่อนไขเฉพาะ' },
        { title: 'ติดตั้งวัดและรายงาน', text: 'ติดตั้งเครื่องวัดที่ตรวจสอบได้ จดค่าตามจริง และส่ง นบ.11 ภายในวันที่ 7 ของเดือนถัดไป', evidence: 'รูปมิเตอร์ สมุดบันทึก นบ.11 และใบรับส่งรายงาน' },
        { title: 'ชำระ ต่ออายุ และแจ้งเปลี่ยน', text: 'ชำระตามงวด ต่ออายุก่อนหมดอายุ และขอแก้ไข/โอน/ใบแทนเมื่อข้อมูลเปลี่ยน', evidence: 'ใบเสร็จ ปฏิทินต่ออายุ และหนังสืออนุญาตการเปลี่ยนแปลง' },
        { title: 'แจ้งเลิกและอุดกลบ', text: 'เมื่อเลิกใช้หรือบ่อชำรุด ให้แจ้งและอุดกลบตามวิธีที่ป้องกันการไหลข้ามชั้น', evidence: 'หนังสือแจ้ง แบบ นบ.12 รูปงาน และรายงานอุดกลบ' },
      ],
    },
    duties: {
      eyebrow: 'หน้าที่ระหว่างถือใบอนุญาต', title: 'สิ่งที่ต้องทำต่อเนื่อง ไม่ใช่ทำเฉพาะวันยื่นคำขอ', intro: 'กำหนดเวลาอาจเปลี่ยนตามประเภทและเงื่อนไขเฉพาะ ให้ใช้ใบอนุญาตจริงและเอกสารล่าสุดเป็นตัวตั้ง', timingLabel: 'จังหวะเวลา', sourceLabel: 'หลักกฎหมาย',
      items: [
        { title: 'แสดงใบอนุญาต', rule: 'แสดงต้นฉบับ ใบแทน หรือรูปแบบอิเล็กทรอนิกส์ตามประกาศไว้ในที่เปิดเผย ณ สถานที่ที่อนุญาต', timing: 'ตลอดเวลาที่ประกอบกิจการ', source: 'มาตรา 24 และประกาศ พ.ศ. 2566' },
        { title: 'ใช้ไม่เกินเงื่อนไข', rule: 'ควบคุมปริมาณ อัตราสูบ จุดใช้ และวัตถุประสงค์ให้ตรงกับเงื่อนไขในใบอนุญาต', timing: 'ทุกครั้งที่เดินระบบ', source: 'มาตรา 22 และใบอนุญาตรายบ่อ' },
        { title: 'ดูแลเครื่องวัด', rule: 'ติดตั้งให้อ่านได้ ไม่ดัดแปลง และแจ้งเมื่อเสีย พร้อมบันทึกข้อมูลสำรองตามที่เจ้าหน้าที่กำหนด', timing: 'ตรวจเป็นประจำ', source: 'กฎกระทรวง/ประกาศเครื่องวัด' },
        { title: 'รายงาน นบ.11', rule: 'รายงานปริมาณใช้น้ำจริง หากไม่รายงานอาจถูกประเมินจากปริมาณสูงสุดในใบอนุญาต', timing: 'ภายในวันที่ 7 ของเดือนถัดไป', source: 'ประกาศแบบรายงานและเงื่อนไขใบอนุญาต' },
        { title: 'ชำระค่าใช้น้ำ', rule: 'ชำระตามปริมาณและงวดที่กฎหมายกำหนด การชำระช้าอาจถูกคิดเพิ่มตามช่วงเวลา', timing: 'รายไตรมาส/ตามใบแจ้ง', source: 'กฎกระทรวงฉบับที่ 7–9' },
        { title: 'ติดตามคุณภาพน้ำ', rule: 'ตรวจตามวัตถุประสงค์ใช้และความเสี่ยง โดยเฉพาะน้ำบริโภคหรือพื้นที่อาจกระทบสุขภาพและสิ่งแวดล้อม', timing: 'ตามเงื่อนไขและแผนเฝ้าระวัง', source: 'มาตรการสาธารณสุขและเงื่อนไขใบอนุญาต' },
        { title: 'ต่ออายุและแก้ไข', rule: 'ยื่นต่ออายุก่อนสิ้นอายุ ขออนุญาตก่อนโอน และแก้ข้อมูลเมื่อข้อเท็จจริงในใบอนุญาตเปลี่ยน', timing: 'ก่อนวันหมดอายุ/ก่อนเปลี่ยน', source: 'มาตรา 20–21 และระเบียบที่เกี่ยวข้อง' },
        { title: 'แจ้งเหตุและเลิกกิจการ', rule: 'แจ้งเหตุผิดปกติ การเลิกใช้ และดำเนินการกับบ่อให้ปลอดภัยตามคำสั่ง', timing: 'แจ้งเลิกภายใน 15 วัน', source: 'มาตรา 26–27 และประกาศอุดกลบ' },
      ],
      deadlineTitle: 'ตัวเลขที่ควรใส่ในปฏิทิน', deadlineItems: ['วันที่ 7 — ส่งรายงานการใช้น้ำของเดือนก่อน', 'ก่อนวันสิ้นอายุ — ยื่นคำขอต่ออายุ', '15 วัน — แจ้งเลิกกิจการนับแต่วันเลิก', '30 วัน — ขอใบแทนเมื่อทราบว่าใบอนุญาตสูญหาย/เสียหาย', '30 วัน — อุทธรณ์คำสั่งไม่ออก/ไม่ต่อ/ไม่ให้โอน หรือเพิกถอน ตามกรณี'],
    },
    library: {
      eyebrow: 'คลังกฎหมายฉบับจริง', title: 'ค้นตามชื่อ ปี เรื่อง และคำสำคัญ', intro: 'รายการทุกใบเชื่อมไปยังหน้าทางการที่มีไฟล์เอกสารแนบ ดาวน์โหลดฉบับเต็มจากกรมก่อนอ้างอิงในสัญญา รายงาน หรือคำขอ', officialThaiNote: 'ชื่อกฎหมายและคำอธิบายคงภาษาไทยเพื่อไม่ให้การแปลเปลี่ยนความหมายทางกฎหมาย ส่วนเมนูและบทเรียนปรับตามภาษาที่เลือก', searchLabel: 'ค้นกฎหมาย', searchPlaceholder: 'เช่น อุดกลบ, นบ.11, ค่าอนุรักษ์, 2567…', filtersLabel: 'กรองตามประเภท', all: 'ทั้งหมด', categories: { act: 'พ.ร.บ.น้ำบาดาล', 'water-act': 'กฎหมายทรัพยากรน้ำ', ministerial: 'กฎกระทรวง', notification: 'ประกาศ', regulation: 'ระเบียบ' }, showReference: 'แสดงฉบับอ้างอิง/ต้องอ่านร่วมกับฉบับใหม่', results: 'รายการ', noResults: 'ไม่พบเอกสารที่ตรงกับคำค้นและตัวกรอง', reset: 'ล้างตัวกรอง', officialText: 'เปิดเอกสารทางการ', status: { current: 'ใช้อยู่', consolidated: 'ฉบับรวม', amended: 'ต้องอ่านฉบับแก้ไขร่วม', reference: 'อ้างอิง/ตรวจฉบับใหม่' }, yearLabel: 'พ.ศ.', repositoriesTitle: 'ต้องการตรวจคลังทั้งหมดของกรม?', repositoriesText: 'คลังกลางยังรวมคำสั่ง มอบอำนาจ หนังสือเวียน ข้อหารือ และระเบียบภายใน ซึ่งไม่ได้แสดงทั้งหมดในหน้าสำหรับผู้ประกอบกิจการนี้', masterLink: 'เปิดคลังกฎหมายกลางของกรม' },
    checklist: { title: 'แฟ้มตรวจความพร้อมโครงการ', intro: 'กดรายการที่คุณมีแล้ว เพื่อเห็นสิ่งที่ยังขาดก่อนยื่นหรือก่อนตรวจสถานที่', items: ['พิกัด แผนที่ และเอกสารสิทธิ/หนังสือยินยอม', 'ประมาณการความต้องการน้ำ อัตราสูบ และวัตถุประสงค์ใช้', 'แบบบ่อและข้อมูลอุทกธรณีวิทยาเบื้องต้น', 'หนังสือรับรองช่างเจาะ/วิศวกร/นักธรณีวิทยาที่ตรงกับงาน', 'แบบคำขอล่าสุดและเอกสารนิติบุคคล/ผู้รับมอบอำนาจ', 'แผนจัดการน้ำทิ้ง แหล่งมลพิษ และระยะป้องกัน', 'แผนติดตั้งเครื่องวัด เก็บข้อมูล และส่ง นบ.11', 'ปฏิทินค่าธรรมเนียม ค่าใช้น้ำ ต่ออายุ และผู้รับผิดชอบ'], complete: 'ครบสำหรับนำไปทวนกับเจ้าหน้าที่', remaining: 'รายการที่ยังขาด' },
    penalties: {
      eyebrow: 'ความเสี่ยงทางกฎหมาย', title: 'โทษอาญาไม่ใช่ความเสี่ยงเดียว', intro: 'นอกจากค่าปรับ อาจมีการริบเครื่องมือ คำสั่งอุดบ่อ แก้ไขความเสียหาย พักหรือเพิกถอนใบอนุญาต และค่าใช้จ่ายจากการหยุดโครงการ',
      items: [
        { section: 'มาตรา 36 ทวิ', title: 'เจาะ/ใช้/ระบายโดยไม่มีใบอนุญาต', text: 'อาจจำคุกไม่เกิน 6 เดือน หรือปรับไม่เกิน 20,000 บาท หรือทั้งจำทั้งปรับ และศาลอาจสั่งริบเครื่องมือหรืออุดกลบ' },
        { section: 'มาตรา 37', title: 'ฝ่าฝืนประกาศมาตรการทางวิชาการ', text: 'มีโทษปรับไม่เกิน 20,000 บาท และอาจเชื่อมกับคำสั่งแก้ไขหรือเพิกถอน' },
        { section: 'มาตรา 39', title: 'ไม่ทำตามเงื่อนไขใบอนุญาต', text: 'ผู้รับใบอนุญาต ลูกจ้าง หรือตัวแทน อาจถูกปรับไม่เกิน 5,000 บาท' },
        { section: 'มาตรา 33–35', title: 'แก้ไขหรือเพิกถอนใบอนุญาต', text: 'เมื่อข้อเท็จจริงเปลี่ยน เกิดความเสียหายต่อทรัพยากร/สิ่งแวดล้อม/สุขภาพ/แผ่นดินทรุด หรือฝ่าฝืนกฎหมาย อธิบดีมีอำนาจแก้ไขหรือเพิกถอน' },
      ],
      warningTitle: 'อย่าตัดสินใจจากจำนวนค่าปรับอย่างเดียว', warningText: 'ยอดโทษใน พ.ร.บ.บางมาตราเป็นตัวเลขเก่า แต่ความเสียหายจริงอาจรวมการหยุดงาน ริบเครื่องจักร อุดบ่อ ค่าใช้น้ำย้อนหลัง ความรับผิดสิ่งแวดล้อม และผลต่อใบอนุญาตอื่น',
    },
    quiz: {
      eyebrow: 'ตรวจความเข้าใจ', title: 'อ่านกฎหมายเป็นระบบหรือยัง?', intro: 'เลือกคำตอบที่สอดคล้องกับหลักกฎหมายและลดความเสี่ยงที่สุด', correct: 'ถูกต้อง', review: 'ควรทบทวน', score: 'คะแนน', retry: 'ทำอีกครั้ง', perfect: 'ยอดเยี่ยม—คุณแยกใบอนุญาต เอกสาร และหน้าที่ต่อเนื่องได้ถูกต้อง',
      questions: [
        { question: 'เจ้าของที่ดินจะเจาะบ่อเองได้ทันทีหรือไม่?', choices: ['ได้ เพราะเป็นที่ดินตนเอง', 'ไม่ได้ ต้องตรวจเขต/ความลึกและได้รับใบอนุญาตก่อน', 'ได้ถ้าใช้น้ำไม่มาก'], correct: 1, explanation: 'มาตรา 16 ใช้ไม่ว่าผู้ดำเนินการจะมีกรรมสิทธิ์หรือสิทธิครอบครองที่ดินหรือไม่' },
        { question: 'ได้รับใบอนุญาตเจาะแล้ว หมายความว่าใช้น้ำเพื่อกิจการได้ทันทีหรือไม่?', choices: ['ได้ทุกกรณี', 'ไม่ได้ ใบอนุญาตเจาะและใบอนุญาตใช้เป็นคนละประเภท', 'ได้ 30 วัน'], correct: 1, explanation: 'มาตรา 18 แยกใบอนุญาตเจาะ ใช้ และระบายลงบ่อออกจากกัน' },
        { question: 'หากไม่ส่ง นบ.11 จะเกิดอะไรขึ้นได้?', choices: ['ไม่มีผลถ้ามีน้ำมิเตอร์', 'อาจถูกประเมินจากปริมาณสูงสุดตามใบอนุญาต', 'ใบอนุญาตต่ออายุเอง'], correct: 1, explanation: 'การไม่มีรายงาน/ค่ามิเตอร์ที่ใช้คำนวณได้ อาจทำให้ประเมินค่าใช้น้ำจากปริมาณสูงสุด' },
        { question: 'เมื่อเลิกใช้บ่อ สิ่งที่ถูกต้องคืออะไร?', choices: ['ทิ้งบ่อไว้และปิดปั๊ม', 'แจ้งเลิกและอุดกลบตามมาตรฐาน/คำสั่ง', 'โอนบ่อให้ผู้รับเหมาโดยไม่แจ้ง'], correct: 1, explanation: 'บ่อที่ทิ้งไว้อาจเป็นทางไหลปนเปื้อนข้ามชั้น มาตรา 26–27 และประกาศอุดกลบจึงกำหนดขั้นตอน' },
      ],
    },
    sources: { eyebrow: 'ตรวจสอบย้อนกลับ', title: 'แหล่งทางการที่ใช้จัดทำ', text: 'รายการและคำอธิบายตรวจเทียบกับหน้ารวมเอกสารของกรมทรัพยากรน้ำบาดาลและฉบับรวมของสำนักงานคณะกรรมการกฤษฎีกา ณ วันที่ 4 สิงหาคม 2569', links: ['พ.ร.บ.น้ำบาดาลและฉบับปัจจุบัน', 'กฎหมายทรัพยากรน้ำและกฎกระทรวง พ.ศ. 2567', 'ประกาศสำหรับผู้ประกอบกิจการ', 'ระเบียบและวิธีปฏิบัติ', 'แบบฟอร์ม/คู่มือประกอบกิจการ', 'คลังกฎหมายกลางกลุ่มนิติการ'] },
    next: { title: 'ต้องการตรวจเอกสารของโครงการจริง?', text: 'ส่งจังหวัด พิกัด ความลึก ปริมาณใช้ วัตถุประสงค์ และสถานะบ่อให้ทีมช่วยจัดรายการเอกสารก่อนยื่นกับหน่วยงาน', contact: 'ปรึกษาทีมงาน', basics: 'ทบทวนพื้นฐานน้ำบาดาล' },
  },
  en: {
    summary: { documents: 'Library', documentsValue: `${groundwaterLawDocuments.length} documents`, sources: 'Primary source', sourcesValue: 'Thailand DGR', reviewed: 'Reviewed', reviewedValue: '4 August 2026' },
    outcomesTitle: 'This guide helps you', outcomes: ['Understand how Acts, ministerial regulations, notifications and procedures work together', 'Search official Thai instruments by year, subject and keyword', 'Plan compliance from pre-drilling through closure', 'Separate general duties from critical-zone and Type 2–3 requirements'], jumpLabel: 'Jump to', chapters: { foundation: 'Legal framework', navigator: 'Project check', lifecycle: 'Permit lifecycle', duties: 'Duties & dates', library: 'Full law library', penalties: 'Enforcement', quiz: 'Knowledge check' },
    disclaimer: { title: 'Learning resource—not project-specific legal advice', text: 'Explanations are reading aids. For action, rely on the Royal Gazette text, your permit conditions and confirmation from the competent groundwater officer.', scope: 'The library covers public-facing instruments that create duties for drillers, users, permit holders and projects. Internal welfare and administrative orders are excluded; the DGR master repository remains linked.' },
    imageAlt: { hierarchy: 'Hierarchy from groundwater law to permits, drilling, metering and a completed well', lifecycle: 'Groundwater permit lifecycle from survey and application to drilling, operation and sealing' }, imageCaption: { hierarchy: 'The Act creates powers and duties; subordinate instruments turn them into forms, technical standards, fees and field procedures.', lifecycle: 'Compliance continues after approval through construction records, metering, reporting, renewal and proper closure.' },
    foundation: { eyebrow: 'Read in sequence', title: 'Five legal layers operate together', intro: 'The Act alone is not enough: application forms, drilling standards, charges and procedures sit in subordinate instruments.', exampleLabel: 'Example', layers: [{ title: 'Groundwater Act', text: 'Definitions, authority, permits, duties, inspection, appeals and penalties.', example: 'Section 16 requires a permit.' }, { title: 'Water Resources Act', text: 'Public-water use Types 1–3 and additional controls for larger-impact projects.', example: 'Types 2–3 require a water-management plan.' }, { title: 'Ministerial regulations', text: 'Use categories, applications, permit terms, fees and charges.', example: 'Documents and permit duration.' }, { title: 'Notifications', text: 'Zones/depth, technical standards, DGR forms, certified supervision and critical zones.', example: 'The current national depth threshold is over 15 metres.' }, { title: 'Procedures and permit conditions', text: 'Site inspection, transfer, renewal, electronic processing and project-specific terms.', example: 'Your permit conditions bind the permit holder.' }], exactTitle: 'Core sections to know before a project', exactIntro: 'These are summaries. Open the current consolidated Act for the full Thai text and amendment notes.', sections: [{ section: 'Section 16', title: 'Land ownership is not a permit', text: 'Groundwater operations in a groundwater zone require authorization.' }, { section: 'Section 18', title: 'Three separate permit types', text: 'Drilling, use and discharge-to-well permits are distinct.' }, { section: 'Section 20', title: 'Permits expire', text: 'The Act sets maximum terms; subordinate rules and the issued permit determine the actual term.' }, { section: 'Sections 22–25/1', title: 'Conditions, display and charges', text: 'Permit conditions, display/replacement and applicable water/conservation charges remain ongoing duties.' }, { section: 'Sections 26–27', title: 'Closure requires notice and action', text: 'Notify cessation within 15 days and seal/remove works as legally directed.' }], sourceLink: 'Open the current consolidated Act' },
    navigator: { eyebrow: 'Preliminary screening', title: 'Which legal set should your project open first?', intro: 'Enter basic facts to produce a verification list. This does not classify or approve a project.', depth: 'Planned or existing depth', depthHint: 'metres below ground', stage: 'Project stage', stages: { planned: 'Planning / not drilled', operating: 'Existing or operating well', closing: 'Closing or failed well' }, use: 'Main use', uses: { household: 'Household/accommodation', agriculture: 'Agriculture/livestock', business: 'Hotel/building/business', industrial: 'Factory/process', large: 'Large volume/wide impact/possible Type 2–3' }, critical: 'Bangkok and six-province critical groundwater zone', discharge: 'Planned discharge of water/liquid into a groundwater well', resultTitle: 'Priority legal checks', results: { zone: 'Depth over 15 m: verify Groundwater Act permits, the zone/depth notification and application regulation.', shallow: 'At or below 15 m: do not assume exemption; confirm well type, location and any special notification with the local officer.', drill: 'Before drilling: obtain the drilling permit, use appropriately certified supervision and follow technical standards.', use: 'Operating well: verify use permit, authorized volume, meter, monthly report, charges and renewal date.', close: 'Closure: give written notice within 15 days and seal/report according to the 2009 notification and officer direction.', type23: 'High volume/impact: request formal classification under the Water Resources Act and 2024 regulations, including a management plan.', critical: 'Critical zone: check specific restrictions, conservation charges, source proportions and permit conditions.', discharge: 'Discharge to a well needs its own permit and contamination-prevention standards; it is not ordinary wastewater disposal.' }, verify: 'Confirm this list with the Provincial Natural Resources and Environment Office, regional DGR office or Bureau of Groundwater Control before design and procurement.' },
    lifecycle: { eyebrow: 'Site to sealing', title: 'The nine-step compliance lifecycle', intro: 'Evidence belongs in the project schedule from the start—not as a repair after drilling.', evidenceLabel: 'Keep', steps: [{ title: 'Confirm zone and depth', text: 'Check groundwater/critical zone, competent office and local constraints.', evidence: 'Coordinates, map, land rights and official confirmation.' }, { title: 'Classify activity and use', text: 'Separate drilling, use and discharge; screen potential Type 2–3 use.', evidence: 'Water balance, peak demand, purpose and management plan.' }, { title: 'Prepare qualified parties and forms', text: 'Use current certified supervision and current forms.', evidence: 'Certificates, well design, machinery and consents.' }, { title: 'Receive drilling permit', text: 'Filing is not approval; read every condition before mobilization.', evidence: 'Issued permit displayed at site.' }, { title: 'Drill and report correctly', text: 'Record geology, screen, development, pumping test and samples.', evidence: 'Well log, test and laboratory results.' }, { title: 'Obtain use permit', text: 'Submit construction/use data before normal abstraction.', evidence: 'Use permit, volume and special conditions.' }, { title: 'Meter and report', text: 'Maintain a verifiable meter and file NB.11 by the seventh of the following month.', evidence: 'Meter photos, logs, filings and receipts.' }, { title: 'Pay, renew and amend', text: 'Pay by period, renew before expiry, and obtain approval for changes/transfer.', evidence: 'Receipts, calendar and written approvals.' }, { title: 'Notify and seal', text: 'On closure, notify and seal against cross-aquifer contamination.', evidence: 'Notice, NB.12, photographs and sealing report.' }] },
    duties: { eyebrow: 'While licensed', title: 'Compliance is continuous', intro: 'Exact dates can vary by permit type and conditions; the issued permit and latest official forms control.', timingLabel: 'Timing', sourceLabel: 'Basis', items: [{ title: 'Display the permit', rule: 'Display the original, replacement or accepted electronic form visibly at the licensed site.', timing: 'Throughout operation', source: 'Section 24 / 2023 notification' }, { title: 'Stay within conditions', rule: 'Control volume, rate, location and purpose to match the permit.', timing: 'Every operating period', source: 'Section 22 / permit' }, { title: 'Maintain the meter', rule: 'Keep it readable and untampered; report failure and retain backup data.', timing: 'Routine inspection', source: 'Meter rules' }, { title: 'File NB.11', rule: 'Report actual use; missing usable data can trigger assessment at maximum authorized volume.', timing: 'By the 7th of next month', source: 'Report notification / permit' }, { title: 'Pay charges', rule: 'Pay water and applicable conservation charges by legal period.', timing: 'Quarterly / invoice', source: 'Ministerial regulations 7–9' }, { title: 'Monitor quality', rule: 'Test by intended use and risk, especially drinking and sensitive sites.', timing: 'Permit/monitoring plan', source: 'Health/environment measures' }, { title: 'Renew and amend', rule: 'Renew before expiry and obtain approval before transfer or material changes.', timing: 'Before expiry/change', source: 'Sections 20–21 / procedures' }, { title: 'Report incident/closure', rule: 'Notify cessation and make the well safe as directed.', timing: 'Closure notice within 15 days', source: 'Sections 26–27' }], deadlineTitle: 'Calendar numbers', deadlineItems: ['7th — previous month’s use report', 'Before expiry — renewal filing', '15 days — notice after cessation', '30 days — replacement application after learning of loss/damage', '30 days — relevant permit/revocation appeal period'] },
    library: { eyebrow: 'Official instrument library', title: 'Search by title, year, topic or keyword', intro: 'Each card links to an official page containing the source attachment. Download the Thai full text before citing it in an application, contract or report.', officialThaiNote: 'Official law titles and document summaries remain in Thai to avoid changing legal meaning. The learning interface follows the selected language.', searchLabel: 'Search laws', searchPlaceholder: 'Try sealing, NB.11, conservation, 2567…', filtersLabel: 'Filter by type', all: 'All', categories: { act: 'Groundwater Act', 'water-act': 'Water-resources law', ministerial: 'Ministerial regulation', notification: 'Notification', regulation: 'Procedure' }, showReference: 'Show reference/superseded-context documents', results: 'documents', noResults: 'No instrument matches this search and filter.', reset: 'Reset filters', officialText: 'Open official document', status: { current: 'Current', consolidated: 'Consolidated', amended: 'Read with amendments', reference: 'Reference/check newer text' }, yearLabel: 'B.E.', repositoriesTitle: 'Need the complete DGR repository?', repositoriesText: 'The master repository also contains internal orders, delegations, circulars and legal opinions outside this operator-focused library.', masterLink: 'Open DGR master law repository' },
    checklist: { title: 'Project readiness file', intro: 'Check what is ready before filing or inspection.', items: ['Coordinates, map and land-right/consent evidence', 'Demand, pumping rate and use purpose', 'Preliminary hydrogeology and well design', 'Correct driller/engineer/geologist certificates', 'Latest forms and corporate/authorization documents', 'Wastewater, pollution-source and protection plan', 'Meter, data retention and NB.11 plan', 'Fee, charge, renewal and responsibility calendar'], complete: 'Ready for an officer review', remaining: 'items remaining' },
    penalties: { eyebrow: 'Legal exposure', title: 'Criminal fines are not the only risk', intro: 'Enforcement can include seizure, sealing, corrective directions, revocation, back charges and project delay.', items: [{ section: 'Section 36 bis', title: 'Unlicensed operation', text: 'Up to six months’ imprisonment, a fine up to THB 20,000, or both; equipment may be forfeited and a court may order sealing.' }, { section: 'Section 37', title: 'Breach of technical notification', text: 'Fine up to THB 20,000, with possible corrective or permit action.' }, { section: 'Section 39', title: 'Breach of permit condition', text: 'Permit holder, employee or agent may be fined up to THB 5,000.' }, { section: 'Sections 33–35', title: 'Amendment or revocation', text: 'DGR may amend or revoke where facts change, harm may occur, or the law/conditions are breached.' }], warningTitle: 'Do not judge risk only by the fine', warningText: 'Some statutory amounts are historic. Real exposure may include shutdown, equipment loss, well sealing, back charges, environmental liability and effects on other approvals.' },
    quiz: { eyebrow: 'Knowledge check', title: 'Can you navigate the legal stack?', intro: 'Choose the safest evidence-based answer.', correct: 'Correct', review: 'Review', score: 'Score', retry: 'Try again', perfect: 'Excellent—you distinguish permits, documents and continuing duties.', questions: [{ question: 'Can a landowner drill immediately on their own land?', choices: ['Yes, ownership is enough', 'No—check zone/depth and obtain authorization first', 'Yes if volume is small'], correct: 1, explanation: 'Section 16 applies regardless of ownership or possession.' }, { question: 'Does a drilling permit automatically authorize normal water use?', choices: ['Always', 'No—drilling and use permits are distinct', 'For 30 days'], correct: 1, explanation: 'Section 18 separates drilling, use and discharge permits.' }, { question: 'What may happen if NB.11 is not filed?', choices: ['Nothing if a meter exists', 'Use may be assessed at the authorized maximum', 'The permit renews automatically'], correct: 1, explanation: 'Missing usable reporting can lead to assessment using maximum authorized volume.' }, { question: 'What is correct when abandoning a well?', choices: ['Remove the pump only', 'Notify and seal under the standard/direction', 'Transfer it informally'], correct: 1, explanation: 'Sections 26–27 and the sealing notification address contamination pathways.' }] },
    sources: { eyebrow: 'Traceable sources', title: 'Official material used', text: 'The inventory was checked against DGR repositories and the consolidated Office of the Council of State text on 4 August 2026.', links: ['Groundwater Act/current text', 'Water Resources Act and 2024 regulations', 'Operator notifications', 'Procedures', 'Forms/guides', 'DGR master legal repository'] }, next: { title: 'Need a project-specific document check?', text: 'Share province, coordinates, depth, demand, purpose and well status so the team can prepare a filing list for official confirmation.', contact: 'Contact the team', basics: 'Review groundwater basics' },
  },
  zh: {} as GuideCopy,
  ja: {} as GuideCopy,
}

copyByLocale.zh = {
  ...copyByLocale.en,
  summary: { documents: '法规库', documentsValue: `${groundwaterLawDocuments.length} 份文件`, sources: '主要来源', sourcesValue: '泰国地下水资源厅', reviewed: '复核日期', reviewedValue: '2026年8月4日' },
  outcomesTitle: '本指南帮助您',
  outcomes: ['理解法律、部级法规、公告和程序如何配合', '按年份、主题和关键词检索泰文正式文件', '从钻井前一直规划到封井', '区分一般义务、危机区要求和第2–3类用水'],
  jumpLabel: '跳至',
  chapters: { foundation: '法律结构', navigator: '项目检查', lifecycle: '许可周期', duties: '义务与期限', library: '完整法规库', penalties: '执法与处罚', quiz: '知识检测' },
  disclaimer: { title: '学习资料，不是针对具体项目的法律意见', text: '说明仅帮助阅读。实际行动应以政府公报原文、许可证条件及主管地下水官员确认结果为准。', scope: '本库收录对钻井者、用水者、持证人和项目产生义务的公开文件；内部福利和行政命令不在此列，但提供官方总库链接。' },
  imageAlt: { hierarchy: '从地下水法律到许可证、钻井、计量及成井的法律层级示意图', lifecycle: '从调查、申请、钻井、运行到封井的地下水许可周期示意图' },
  imageCaption: { hierarchy: '法律规定权力与义务；下位法规将其落实为表格、技术标准、费用和现场程序。', lifecycle: '取得许可后仍须持续合规，包括施工记录、计量、申报、续期和妥善封井。' },
  foundation: { eyebrow: '按层次阅读', title: '五个法律层级共同生效', intro: '仅阅读《地下水法》并不够；申请表、技术标准、收费和程序位于下位法规中。', exampleLabel: '示例', layers: [{ title: '地下水法', text: '规定定义、主管权限、许可、义务、检查、申诉和处罚。', example: '第16条要求事先取得许可。' }, { title: '水资源法', text: '规定公共水资源第1至3类用水，并对影响较大的项目实施额外管控。', example: '第2至3类须提交水资源管理计划。' }, { title: '部级法规', text: '规定用水类别、申请、许可期限、费用及相关收费。', example: '申请文件和许可有效期。' }, { title: '公告', text: '规定区域与深度、技术标准、DGR表格、持证监督人员和危机区。', example: '现行全国深度界限为超过15米。' }, { title: '程序规定与许可条件', text: '规定现场检查、转让、续期、电子程序和项目特定条件。', example: '持证人必须遵守许可证条件。' }], exactTitle: '项目开始前应了解的核心条款', exactIntro: '以下为摘要。请打开现行合并文本阅读泰文原文和修订注释。', sections: [{ section: '第16条', title: '拥有土地不等于取得许可', text: '在地下水区域开展地下水活动必须取得许可。' }, { section: '第18条', title: '三类许可彼此独立', text: '钻井、取用地下水和向井内排放分别需要许可。' }, { section: '第20条', title: '许可证有有效期', text: '法律规定最长期限；实际期限由下位法规和签发的许可证确定。' }, { section: '第22至25/1条', title: '条件、展示与收费', text: '遵守许可条件、展示或补领许可证，以及缴纳适用的用水费与保护费，均为持续义务。' }, { section: '第26至27条', title: '停用须通知并处理', text: '停用后15日内通知，并依法按指示封井或拆除设施。' }], sourceLink: '打开现行《地下水法》' },
  navigator: { eyebrow: '初步筛查', title: '您的项目应先查哪套法规？', intro: '输入基本事实生成核对清单。本工具不代替主管部门分类或审批。', depth: '计划或现有井深', depthHint: '地面以下米数', stage: '项目阶段', stages: { planned: '规划中/尚未钻井', operating: '已有或运行中的井', closing: '停用或损坏井' }, use: '主要用途', uses: { household: '生活/住宿', agriculture: '农业/畜牧', business: '酒店/建筑/商业', industrial: '工厂/生产', large: '大水量/广泛影响/可能第2–3类' }, critical: '曼谷及周边六府地下水危机区', discharge: '计划向地下水井排放水或液体', resultTitle: '优先法规检查', results: { zone: '深度超过15米：核查《地下水法》许可、区域与深度公告及申请法规。', shallow: '深度不超过15米：不要自行认定豁免；请向当地主管人员确认井型、地点及特别公告。', drill: '钻井前：取得钻井许可，使用具备相应资质的监督人员，并遵守技术标准。', use: '运行中的水井：核查取水许可、核准水量、计量表、月报、收费和续期日期。', close: '停用：15日内书面通知，并依2009年公告及主管人员指示封井和报告。', type23: '大水量或高影响：依《水资源法》和2024年法规申请正式分类，并提交管理计划。', critical: '危机区：核查特别限制、保护费、水源比例和许可条件。', discharge: '向井内排放需要独立许可及防污染标准，不属于一般废水处置。' }, verify: '设计和采购前，请向府自然资源与环境办公室、地区地下水办公室或地下水管制局确认。' },
  lifecycle: { eyebrow: '从场地到封井', title: '九步合规周期', intro: '从项目开始就应安排证据和文件，不能钻完后再补。', evidenceLabel: '应保存', steps: [{ title: '确认区域与深度', text: '核查地下水区或危机区、主管办公室及当地限制。', evidence: '坐标、地图、土地权属和官方确认。' }, { title: '划分活动与用途', text: '区分钻井、取用和排放，并筛查是否可能属于第2至3类用水。', evidence: '水量平衡、峰值需求、用途和管理计划。' }, { title: '准备合资格人员和表格', text: '使用具备现行资质的监督人员和最新表格。', evidence: '资格证书、井体设计、机械清单和同意文件。' }, { title: '取得钻井许可', text: '提交申请不等于获准；进场前须读懂所有条件。', evidence: '已签发并在现场展示的许可证。' }, { title: '按标准钻井并报告', text: '记录地层、滤管、洗井、抽水试验和取样。', evidence: '钻井记录、试验和实验室结果。' }, { title: '取得取水许可', text: '正常抽取地下水前提交施工和使用资料。', evidence: '取水许可证、核准水量和特殊条件。' }, { title: '计量并申报', text: '维护可核验的计量表，并在次月7日前提交NB.11。', evidence: '计量表照片、记录、申报和收据。' }, { title: '缴费、续期和变更', text: '按期缴费、到期前续期，变更或转让须先取得批准。', evidence: '收据、日历和书面批准。' }, { title: '通知并封井', text: '停用时通知主管部门，并封井以防止含水层之间交叉污染。', evidence: '通知、NB.12、照片和封井报告。' }] },
  duties: { eyebrow: '持证期间', title: '合规是持续义务', intro: '具体日期可能随许可证类型和条件而变化；以正式许可证和最新表格为准。', timingLabel: '时间', sourceLabel: '依据', items: [{ title: '展示许可证', rule: '在获准地点显眼处展示许可证原件、补发件或认可的电子形式。', timing: '整个运营期间', source: '第24条／2023年公告' }, { title: '遵守许可条件', rule: '控制水量、抽水率、地点和用途，使其符合许可证。', timing: '每次运行', source: '第22条／许可证' }, { title: '维护计量表', rule: '保持清晰可读且不得改动；故障时须报告并保留备用数据。', timing: '定期检查', source: '计量表法规' }, { title: '提交NB.11', rule: '申报实际用水量；缺少可用数据时，可能按核准最高水量计费。', timing: '次月7日前', source: '申报公告／许可证' }, { title: '缴纳费用', rule: '在法定期限内缴纳用水费和适用的保护费。', timing: '每季度／按账单', source: '第7至9号部级法规' }, { title: '监测水质', rule: '按用途和风险检测，尤其是饮用水和敏感地点。', timing: '按许可条件／监测计划', source: '健康与环境措施' }, { title: '续期与变更', rule: '到期前续期；转让或重大变更前须取得批准。', timing: '到期或变更前', source: '第20至21条／程序' }, { title: '报告事故或停用', rule: '通知停止使用，并按指示确保水井安全。', timing: '停用后15日内通知', source: '第26至27条' }], deadlineTitle: '应加入日历的日期', deadlineItems: ['每月7日——提交上月用水报告', '到期前——提交续期申请', '15日内——停用后通知', '30日内——得知许可证遗失或损坏后申请补发', '30日内——相关拒发、拒续、拒转让或撤销决定的申诉期限'] },
  library: { ...copyByLocale.en.library, eyebrow: '正式法规文件库', title: '按名称、年份、主题和关键词检索', intro: '每张卡片链接至带正式附件的政府页面。在申请、合同或报告中引用前请下载泰文全文。', officialThaiNote: '正式法规名称和文件摘要保留泰文，避免翻译改变法律含义；学习界面使用所选语言。', searchLabel: '搜索法规', searchPlaceholder: '例如：อุดกลบ、นบ.11、2567…', filtersLabel: '按类型筛选', all: '全部', categories: { act: '地下水法', 'water-act': '水资源法规', ministerial: '部级法规', notification: '公告', regulation: '程序规定' }, showReference: '显示参考/需核对新文本的文件', results: '份', noResults: '没有符合搜索和筛选条件的文件。', reset: '清除筛选', officialText: '打开正式文件', status: { current: '现行', consolidated: '合并文本', amended: '须连同修订阅读', reference: '参考/核对新文本' }, yearLabel: '佛历', repositoriesTitle: '需要DGR完整法规库？', repositoriesText: '总库还包含内部命令、授权、通函及法律意见。', masterLink: '打开DGR法规总库' },
  checklist: { title: '项目准备文件夹', intro: '在申请或现场检查前核对已有材料。', items: ['坐标、地图及土地权属或同意证明', '需水量、抽水率和用途', '初步水文地质资料和井体设计', '符合工作要求的钻井人员、工程师或地质学家证书', '最新表格、法人文件和授权文件', '废水、污染源和保护方案', '计量、数据保存和NB.11申报计划', '费用、收费、续期和负责人日历'], complete: '可提交主管人员复核', remaining: '项尚未完成' },
  penalties: { eyebrow: '法律风险', title: '刑事罚款并非唯一风险', intro: '执法还可能包括扣押、封井、整改、撤销许可、追缴费用和项目延误。', items: [{ section: '第36条之二', title: '无证作业', text: '最高可判处六个月监禁、20,000泰铢罚款，或两者并处；设备可能被没收，法院也可命令封井。' }, { section: '第37条', title: '违反技术公告', text: '最高罚款20,000泰铢，并可能受到整改命令或许可处分。' }, { section: '第39条', title: '违反许可条件', text: '持证人、雇员或代理人最高可被罚款5,000泰铢。' }, { section: '第33至35条', title: '变更或撤销许可', text: '事实变化、可能造成损害或违反法律及许可条件时，DGR可变更或撤销许可。' }], warningTitle: '不要只看罚款金额', warningText: '部分法定金额制定较早；实际风险还包括停工、设备损失、封井、追缴、环境责任及其他许可影响。' },
  quiz: { eyebrow: '知识检测', title: '您能正确浏览法规体系吗？', intro: '请选择最安全、最有依据的答案。', correct: '正确', review: '复习', score: '得分', retry: '重新作答', perfect: '很好—您已能区分许可、文件和持续义务。', questions: [{ question: '土地所有人能否立即在自己的土地上钻井？', choices: ['可以，拥有土地即可', '不可以，须先核查区域和深度并取得许可', '用水量少即可'], correct: 1, explanation: '第16条不因经营者拥有或占有土地而免除许可要求。' }, { question: '取得钻井许可后，是否自动可以正常取用地下水？', choices: ['任何情况都可以', '不可以，钻井许可和取水许可相互独立', '可以使用30天'], correct: 1, explanation: '第18条将钻井、取用和向井内排放许可分开规定。' }, { question: '未提交NB.11可能有什么后果？', choices: ['有计量表就没有影响', '可能按核准最高水量计费', '许可证会自动续期'], correct: 1, explanation: '缺少可用于计算的申报或计量数据时，可能按核准最高水量计费。' }, { question: '停用水井时，正确做法是什么？', choices: ['只拆除水泵', '通知并依标准或指示封井', '不通知主管部门，直接转给承包商'], correct: 1, explanation: '第26至27条和封井公告旨在防止废弃井成为跨含水层污染通道。' }] },
  sources: { eyebrow: '可追溯来源', title: '使用的官方资料', text: '2026年8月4日对照DGR法规库及泰国国务委员会办公室合并文本复核。', links: ['《地下水法》及现行文本', '《水资源法》及2024年法规', '经营者相关公告', '程序规定', '表格与指南', 'DGR法规总库'] },
  next: { title: '需要按项目核对文件？', text: '提供府名、坐标、井深、水量、用途和井况，团队可整理供主管部门确认的清单。', contact: '联系团队', basics: '复习地下水基础' },
}

copyByLocale.ja = {
  ...copyByLocale.en,
  summary: { documents: '法令ライブラリ', documentsValue: `${groundwaterLawDocuments.length}件`, sources: '一次資料', sourcesValue: 'タイ地下水資源局', reviewed: '確認日', reviewedValue: '2026年8月4日' },
  outcomesTitle: 'このガイドでできること',
  outcomes: ['法律・省令・告示・手続の関係を理解する', 'タイ語の正式文書を年・主題・キーワードで検索する', '掘削前から廃止・埋戻しまで計画する', '一般義務と危機区域・第2～3種利用を分けて確認する'],
  jumpLabel: '章へ移動',
  chapters: { foundation: '法体系', navigator: '事業チェック', lifecycle: '許可ライフサイクル', duties: '義務と期限', library: '法令検索', penalties: '執行・罰則', quiz: '理解度確認' },
  disclaimer: { title: '学習資料であり、個別案件の法的助言ではありません', text: '説明は読解補助です。実務では官報原文、許可条件、管轄地下水担当官の確認を優先してください。', scope: '掘削者、利用者、許可保持者、事業者に義務を課す公開文書を対象とし、内部福利・行政命令は除外します。DGR総合ライブラリへのリンクを掲載しています。' },
  imageAlt: { hierarchy: '地下水法から許可、掘削、計量、井戸完成までの法令階層図', lifecycle: '調査、申請、掘削、運用、埋戻しまでの地下水許可サイクル図' },
  imageCaption: { hierarchy: '法律が権限と義務を定め、下位法令が様式、技術基準、料金、現場手続へ具体化します。', lifecycle: '許可後も施工記録、計量、報告、更新、適切な廃止まで法令遵守が続きます。' },
  foundation: { eyebrow: '階層順に読む', title: '5つの法令階層が連動します', intro: '地下水法だけでは不十分です。申請様式、技術基準、料金、手続は下位法令にあります。', exampleLabel: '例', layers: [{ title: '地下水法', text: '定義、権限、許可、義務、検査、不服申立て、罰則を定めます。', example: '第16条は事前許可を求めています。' }, { title: '水資源法', text: '公共水資源の第1～3種利用と、影響の大きい事業への追加管理を定めます。', example: '第2～3種には水管理計画が必要です。' }, { title: '省令', text: '利用区分、申請、許可期間、手数料、料金を定めます。', example: '申請書類と許可の有効期間。' }, { title: '告示', text: '区域・深度、技術基準、DGR様式、有資格監督者、危機区域を定めます。', example: '現行の全国深度基準は15メートル超です。' }, { title: '手続規程と許可条件', text: '現地検査、譲渡、更新、電子手続、案件固有の条件を定めます。', example: '許可保持者は交付された条件に従います。' }], exactTitle: '着手前に知る主要条文', exactIntro: '以下は要約です。現行統合版でタイ語原文と改正注記を確認してください。', sections: [{ section: '第16条', title: '土地所有だけでは許可にならない', text: '地下水区域で地下水事業を行うには許可が必要です。' }, { section: '第18条', title: '3種類の許可は別々', text: '掘削、利用、井戸への排出は、それぞれ別の許可です。' }, { section: '第20条', title: '許可には期限がある', text: '法律が最長期間を定め、実際の期間は下位法令と交付許可で決まります。' }, { section: '第22～25/1条', title: '条件、掲示、料金', text: '許可条件、掲示・再交付、適用される利用料・保全料は継続義務です。' }, { section: '第26～27条', title: '廃止には届出と措置が必要', text: '廃止後15日以内に届け出て、法令と指示に従い埋戻しまたは設備撤去を行います。' }], sourceLink: '現行地下水法を開く' },
  navigator: { eyebrow: '一次スクリーニング', title: '案件で最初に確認する法令は？', intro: '基本情報から確認リストを示します。法的分類や許可判断ではありません。', depth: '計画/既設井の深度', depthHint: '地表面下メートル', stage: '事業段階', stages: { planned: '計画中/未掘削', operating: '既設/運転中', closing: '廃止/故障井' }, use: '主な用途', uses: { household: '生活・宿泊', agriculture: '農業・畜産', business: 'ホテル・建物・事業', industrial: '工場・生産工程', large: '大規模/広域影響/第2～3種の可能性' }, critical: 'バンコクと周辺6県の危機区域', discharge: '井戸への水・液体の排出計画あり', resultTitle: '優先確認事項', results: { zone: '深度15メートル超：地下水法の許可、区域・深度告示、申請省令を確認します。', shallow: '深度15メートル以下でも自己判断で適用除外とせず、井戸種別、所在地、特別告示を地域担当官へ確認します。', drill: '掘削前：掘削許可を取得し、適切な有資格監督者と技術基準を使用します。', use: '運転井：利用許可、許可水量、メーター、月次報告、料金、更新日を確認します。', close: '廃止：15日以内に書面で届け出て、2009年告示と担当官の指示に従い埋戻し・報告します。', type23: '大規模・高影響：水資源法と2024年規則に基づく正式分類と管理計画を求めます。', critical: '危機区域：固有の制限、保全料、水源比率、許可条件を確認します。', discharge: '井戸への排出には別個の許可と汚染防止基準が必要で、通常の排水処理ではありません。' }, verify: '設計・調達前に県天然資源環境事務所、DGR地方事務所または地下水管理局へ確認してください。' },
  lifecycle: { eyebrow: '敷地から埋戻しまで', title: '9段階の法令遵守サイクル', intro: '掘削後の後追いではなく、開始時から証拠と文書を工程に組み込みます。', evidenceLabel: '保管資料', steps: [{ title: '区域と深度を確認', text: '地下水区域・危機区域、管轄事務所、地域制限を確認します。', evidence: '座標、地図、土地権利、公式確認。' }, { title: '活動と用途を分類', text: '掘削、利用、排出を分け、第2～3種利用の可能性を確認します。', evidence: '水収支、最大需要、用途、管理計画。' }, { title: '有資格者と様式を準備', text: '有効な資格を持つ監督者と最新様式を使用します。', evidence: '資格証明、井戸設計、機械一覧、同意書。' }, { title: '掘削許可を取得', text: '申請は許可ではありません。着手前にすべての条件を確認します。', evidence: '交付され、現場に掲示した許可証。' }, { title: '基準どおりに掘削・報告', text: '地質、スクリーン、洗浄、揚水試験、試料を記録します。', evidence: '井戸記録、試験、分析結果。' }, { title: '利用許可を取得', text: '通常揚水の前に施工・利用情報を提出します。', evidence: '利用許可、許可水量、特別条件。' }, { title: '計量・報告', text: '検証可能なメーターを維持し、翌月7日までにNB.11を提出します。', evidence: 'メーター写真、記録、提出控え、受領証。' }, { title: '支払・更新・変更', text: '期限どおり支払い、満了前に更新し、変更・譲渡は事前承認を得ます。', evidence: '領収書、日程表、書面承認。' }, { title: '届出・埋戻し', text: '廃止時に届け出て、帯水層間の汚染を防ぐよう埋め戻します。', evidence: '届出、NB.12、写真、埋戻し報告。' }] },
  duties: { eyebrow: '許可期間中', title: '法令遵守は継続します', intro: '期限は許可種別・条件で変わるため、交付許可と最新様式を優先します。', timingLabel: '時期', sourceLabel: '根拠', items: [{ title: '許可証を掲示', rule: '許可場所の見やすい位置に、原本、再交付証または認められた電子形式を掲示します。', timing: '操業期間中', source: '第24条／2023年告示' }, { title: '条件内で利用', rule: '水量、揚水率、場所、用途を許可条件に合わせます。', timing: '運転の都度', source: '第22条／許可証' }, { title: 'メーターを維持', rule: '読み取り可能で改変のない状態を保ち、故障を報告して代替記録を保存します。', timing: '定期点検', source: 'メーター規則' }, { title: 'NB.11を提出', rule: '実使用量を報告します。利用可能な記録がないと許可最大量で算定される場合があります。', timing: '翌月7日まで', source: '報告告示／許可証' }, { title: '料金を支払う', rule: '法定期間内に利用料と該当する保全料を支払います。', timing: '四半期／請求時', source: '省令第7～9号' }, { title: '水質を監視', rule: '用途とリスクに応じ、特に飲用や敏感な場所で検査します。', timing: '許可条件／監視計画', source: '保健・環境措置' }, { title: '更新・変更', rule: '満了前に更新し、譲渡や重要変更の前に承認を得ます。', timing: '満了・変更前', source: '第20～21条／手続' }, { title: '事故・廃止を報告', rule: '利用停止を届け出て、指示に従い井戸を安全な状態にします。', timing: '廃止後15日以内', source: '第26～27条' }], deadlineTitle: 'カレンダーに入れる期限', deadlineItems: ['毎月7日 — 前月の利用報告', '満了前 — 更新申請', '15日以内 — 廃止後の届出', '30日以内 — 紛失・破損を知った後の再交付申請', '30日以内 — 不許可、更新・譲渡拒否または取消しに対する該当不服申立期間'] },
  library: { ...copyByLocale.en.library, eyebrow: '正式法令ライブラリ', title: '名称・年・主題・キーワードで検索', intro: '各カードから原本添付の政府ページを開けます。申請・契約・報告書で引用する前にタイ語全文を取得してください。', officialThaiNote: '法的意味を変えないよう正式名称と文書要約はタイ語を維持し、学習UIのみ選択言語で表示します。', searchLabel: '法令検索', searchPlaceholder: '例：อุดกลบ、นบ.11、2567…', filtersLabel: '種別で絞込', all: 'すべて', categories: { act: '地下水法', 'water-act': '水資源法令', ministerial: '省令', notification: '告示', regulation: '手続規程' }, showReference: '参考/新版確認が必要な文書も表示', results: '件', noResults: '条件に一致する文書がありません。', reset: '絞込解除', officialText: '正式文書を開く', status: { current: '現行', consolidated: '統合版', amended: '改正文と併読', reference: '参考/新版確認' }, yearLabel: '仏暦', repositoriesTitle: 'DGR全法令庫が必要ですか？', repositoriesText: '総合ライブラリには内部命令、権限委任、通達、法的見解も含まれます。', masterLink: 'DGR総合法令庫を開く' },
  checklist: { title: '案件準備ファイル', intro: '申請・現地確認前に揃っている資料を確認します。', items: ['座標、地図、土地権利または同意の証明', '必要水量、揚水率、利用目的', '予備的水文地質情報と井戸設計', '作業に適合する掘削者・技術者・地質専門家の資格証明', '最新様式、法人書類、委任書類', '排水、汚染源、保護計画', 'メーター、データ保存、NB.11提出計画', '手数料、料金、更新、担当者の日程表'], complete: '担当官レビューの準備完了', remaining: '項目が未完了' },
  penalties: { eyebrow: '法的リスク', title: '刑事罰だけがリスクではありません', intro: '差押え、埋戻し、是正命令、許可取消、追徴、事業遅延もあり得ます。', items: [{ section: '第36条の2', title: '無許可操業', text: '6か月以下の拘禁、20,000バーツ以下の罰金、またはその両方。機材の没収や裁判所による埋戻し命令もあり得ます。' }, { section: '第37条', title: '技術告示違反', text: '20,000バーツ以下の罰金に加え、是正命令や許可処分の可能性があります。' }, { section: '第39条', title: '許可条件違反', text: '許可保持者、従業員、代理人に5,000バーツ以下の罰金が科される場合があります。' }, { section: '第33～35条', title: '許可の変更・取消し', text: '事情変更、損害のおそれ、法令・条件違反がある場合、DGRは許可を変更または取り消すことができます。' }], warningTitle: '罰金額だけで判断しない', warningText: '法定額が古い条文もあります。実際のリスクには停止、機材損失、埋戻し、追徴、環境責任、他許可への影響が含まれます。' },
  quiz: { eyebrow: '理解度確認', title: '法令体系を正しく使えますか？', intro: '最も安全で根拠のある答えを選びます。', correct: '正解', review: '確認', score: '得点', retry: 'もう一度', perfect: 'すばらしい—許可、文書、継続義務を区別できています。', questions: [{ question: '土地所有者は自分の土地ですぐに掘削できますか？', choices: ['所有者ならできる', 'できない。区域と深度を確認し、先に許可を得る', '少量利用ならできる'], correct: 1, explanation: '第16条は土地の所有・占有にかかわらず適用されます。' }, { question: '掘削許可があれば通常利用も直ちに認められますか？', choices: ['常に認められる', '認められない。掘削許可と利用許可は別である', '30日間だけ認められる'], correct: 1, explanation: '第18条は掘削、利用、井戸への排出を別々の許可としています。' }, { question: 'NB.11を提出しないと何が起こり得ますか？', choices: ['メーターがあれば影響しない', '許可最大量で利用量を算定される場合がある', '許可が自動更新される'], correct: 1, explanation: '利用可能な報告・計量値がない場合、許可最大量で料金を算定されることがあります。' }, { question: '井戸を廃止するときの正しい対応は？', choices: ['ポンプだけ外す', '届け出て基準または指示に従い埋め戻す', '届け出ずに請負業者へ譲る'], correct: 1, explanation: '第26～27条と埋戻し告示は、帯水層間の汚染経路を防ぐためのものです。' }] },
  sources: { eyebrow: '追跡可能な出典', title: '使用した公的資料', text: '2026年8月4日にDGR法令庫とタイ国務院事務局の統合文を照合しました。', links: ['地下水法・現行文', '水資源法と2024年規則', '事業者向け告示', '手続規程', '様式・手引き', 'DGR総合法令庫'] },
  next: { title: '案件別の文書確認が必要ですか？', text: '県、座標、深度、使用量、用途、井戸状態を共有いただければ、当局確認用リストを整理します。', contact: 'チームへ相談', basics: '地下水基礎を復習' },
}

const sourceHrefs = [
  groundwaterLawOfficialRepositories.acts,
  groundwaterLawOfficialRepositories.waterAct,
  groundwaterLawOfficialRepositories.notifications,
  groundwaterLawOfficialRepositories.regulations,
  groundwaterLawOfficialRepositories.permitForms,
  groundwaterLawOfficialRepositories.master,
]

export default function GroundwaterLawGuide({ locale = 'th', localized = false }: { locale?: LocalizedLocale; localized?: boolean }) {
  const copy = copyByLocale[locale]
  const [depth, setDepth] = useState(18)
  const [stage, setStage] = useState<ProjectStage>('planned')
  const [useProfile, setUseProfile] = useState<UseProfile>('business')
  const [criticalZone, setCriticalZone] = useState(false)
  const [discharge, setDischarge] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('act')
  const [showReference, setShowReference] = useState(true)
  const [checked, setChecked] = useState<number[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const localLink = (path: string) => localized ? localePath(path, locale) : path

  const navigatorResults = useMemo(() => {
    const results = [depth > 15 ? copy.navigator.results.zone : copy.navigator.results.shallow]
    if (stage === 'planned') results.push(copy.navigator.results.drill)
    if (stage === 'operating') results.push(copy.navigator.results.use)
    if (stage === 'closing') results.push(copy.navigator.results.close)
    if (useProfile === 'large') results.push(copy.navigator.results.type23)
    if (criticalZone) results.push(copy.navigator.results.critical)
    if (discharge) results.push(copy.navigator.results.discharge)
    return results
  }, [copy, criticalZone, depth, discharge, stage, useProfile])

  const filteredDocuments = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('th')
    return groundwaterLawDocuments
      .filter((document) => category === 'all' || document.category === category)
      .filter((document) => showReference || document.status !== 'reference')
      .filter((document) => {
        if (!term) return true
        return [document.title, document.scope, document.year.toString(), ...document.keywords, copy.library.categories[document.category]].join(' ').toLocaleLowerCase('th').includes(term)
      })
      .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title, 'th'))
  }, [category, copy.library.categories, query, showReference])

  const quizScore = copy.quiz.questions.reduce((score, question, index) => score + (answers[index] === question.correct ? 1 : 0), 0)
  const quizComplete = Object.keys(answers).length === copy.quiz.questions.length
  const scrollTo = (chapter: ChapterId) => document.getElementById(`gwl-${chapter}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })

  return (
    <article className="gwl-guide">
      <section className="gwl-overview">
        <div className="gwl-summary"><div><BookOpen aria-hidden="true" /><span>{copy.summary.documents}</span><strong>{copy.summary.documentsValue}</strong></div><div><Landmark aria-hidden="true" /><span>{copy.summary.sources}</span><strong>{copy.summary.sourcesValue}</strong></div><div><CalendarClock aria-hidden="true" /><span>{copy.summary.reviewed}</span><strong>{copy.summary.reviewedValue}</strong></div></div>
        <div className="gwl-outcomes"><h2>{copy.outcomesTitle}</h2><ul>{copy.outcomes.map((outcome) => <li key={outcome}><CheckCircle2 aria-hidden="true" />{outcome}</li>)}</ul></div>
      </section>

      <aside className="gwl-disclaimer"><Scale aria-hidden="true" /><div><h2>{copy.disclaimer.title}</h2><p>{copy.disclaimer.text}</p><small>{copy.disclaimer.scope}</small></div></aside>

      <nav className="gwl-chapter-nav" aria-label={copy.jumpLabel}><strong>{copy.jumpLabel}</strong><div>{chapterIds.map((chapter) => { const Icon = chapterIcons[chapter]; return <button type="button" key={chapter} onClick={() => scrollTo(chapter)}><Icon aria-hidden="true" />{copy.chapters[chapter]}</button> })}</div></nav>

      <section className="gwl-module" id="gwl-foundation">
        <header className="gwl-heading"><span><Landmark aria-hidden="true" /></span><div><p>{copy.foundation.eyebrow}</p><h2>{copy.foundation.title}</h2><div>{copy.foundation.intro}</div></div></header>
        <figure className="gwl-hero-figure"><Image src="/images/learning/groundwater-law/legal-hierarchy.webp" alt={copy.imageAlt.hierarchy} width={1536} height={1024} sizes="(width <= 900px) 100vw, 1280px" priority /><figcaption>{copy.imageCaption.hierarchy}</figcaption></figure>
        <div className="gwl-layers">{copy.foundation.layers.map((layer, index) => <article key={layer.title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{layer.title}</h3><p>{layer.text}</p><small><strong>{copy.foundation.exampleLabel}:</strong> {layer.example}</small></article>)}</div>
        <div className="gwl-sections"><header><h3>{copy.foundation.exactTitle}</h3><p>{copy.foundation.exactIntro}</p></header><div>{copy.foundation.sections.map((item) => <article key={item.section}><span>{item.section}</span><h4>{item.title}</h4><p>{item.text}</p></article>)}</div><a href={groundwaterLawOfficialRepositories.acts} target="_blank" rel="noopener noreferrer">{copy.foundation.sourceLink}<ExternalLink aria-hidden="true" /></a></div>
      </section>

      <section className="gwl-module" id="gwl-navigator">
        <header className="gwl-heading"><span><FileSearch aria-hidden="true" /></span><div><p>{copy.navigator.eyebrow}</p><h2>{copy.navigator.title}</h2><div>{copy.navigator.intro}</div></div></header>
        <div className="gwl-navigator"><form onSubmit={(event) => event.preventDefault()}><label className="gwl-depth" htmlFor="gwl-depth"><span>{copy.navigator.depth}</span><div><input id="gwl-depth" type="number" inputMode="decimal" min="0" value={depth} onChange={(event) => setDepth(Math.max(0, event.currentTarget.valueAsNumber || 0))} /><small>m</small></div><em>{copy.navigator.depthHint}</em></label><label><span>{copy.navigator.stage}</span><select value={stage} onChange={(event) => setStage(event.currentTarget.value as ProjectStage)}>{(Object.keys(copy.navigator.stages) as ProjectStage[]).map((value) => <option key={value} value={value}>{copy.navigator.stages[value]}</option>)}</select></label><label><span>{copy.navigator.use}</span><select value={useProfile} onChange={(event) => setUseProfile(event.currentTarget.value as UseProfile)}>{(Object.keys(copy.navigator.uses) as UseProfile[]).map((value) => <option key={value} value={value}>{copy.navigator.uses[value]}</option>)}</select></label><div className="gwl-navigator-flags"><label><input type="checkbox" checked={criticalZone} onChange={(event) => setCriticalZone(event.currentTarget.checked)} /><span><Check aria-hidden="true" /></span>{copy.navigator.critical}</label><label><input type="checkbox" checked={discharge} onChange={(event) => setDischarge(event.currentTarget.checked)} /><span><Check aria-hidden="true" /></span>{copy.navigator.discharge}</label></div></form><output><p>{copy.navigator.resultTitle}</p><div>{navigatorResults.map((result, index) => <article key={result}><span>{index + 1}</span><p>{result}</p></article>)}</div><small><Info aria-hidden="true" />{copy.navigator.verify}</small></output></div>
      </section>

      <section className="gwl-module" id="gwl-lifecycle">
        <header className="gwl-heading"><span><HardHat aria-hidden="true" /></span><div><p>{copy.lifecycle.eyebrow}</p><h2>{copy.lifecycle.title}</h2><div>{copy.lifecycle.intro}</div></div></header>
        <figure className="gwl-lifecycle-figure"><Image src="/images/learning/groundwater-law/permit-lifecycle.webp" alt={copy.imageAlt.lifecycle} width={1600} height={854} sizes="(width <= 900px) 100vw, 1280px" /><figcaption>{copy.imageCaption.lifecycle}</figcaption></figure>
        <div className="gwl-lifecycle">{copy.lifecycle.steps.map((step, index) => <article key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{step.title}</h3><p>{step.text}</p><small><FileCheck2 aria-hidden="true" /><strong>{copy.lifecycle.evidenceLabel}:</strong> {step.evidence}</small></div></article>)}</div>
      </section>

      <section className="gwl-module" id="gwl-duties">
        <header className="gwl-heading"><span><ClipboardCheck aria-hidden="true" /></span><div><p>{copy.duties.eyebrow}</p><h2>{copy.duties.title}</h2><div>{copy.duties.intro}</div></div></header>
        <div className="gwl-duties">{copy.duties.items.map((item, index) => <article key={item.title}>{index === 0 ? <FileCheck2 aria-hidden="true" /> : index === 1 ? <Gauge aria-hidden="true" /> : index === 2 ? <Wrench aria-hidden="true" /> : index === 3 ? <CalendarClock aria-hidden="true" /> : index === 4 ? <Landmark aria-hidden="true" /> : index === 5 ? <Droplets aria-hidden="true" /> : index === 6 ? <History aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}<h3>{item.title}</h3><p>{item.rule}</p><dl><div><dt>{copy.duties.timingLabel}</dt><dd>{item.timing}</dd></div><div><dt>{copy.duties.sourceLabel}</dt><dd>{item.source}</dd></div></dl></article>)}</div>
        <aside className="gwl-deadlines"><CalendarClock aria-hidden="true" /><div><h3>{copy.duties.deadlineTitle}</h3><ul>{copy.duties.deadlineItems.map((item) => <li key={item}>{item}</li>)}</ul></div></aside>
        <div className="gwl-checklist"><header><div><h3>{copy.checklist.title}</h3><p>{copy.checklist.intro}</p></div><strong>{checked.length}/{copy.checklist.items.length}</strong></header><div className="gwl-progress" aria-hidden="true"><span style={{ width: `${(checked.length / copy.checklist.items.length) * 100}%` }} /></div><div>{copy.checklist.items.map((item, index) => <label key={item} className={checked.includes(index) ? 'is-checked' : ''}><input type="checkbox" checked={checked.includes(index)} onChange={() => setChecked((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])} /><span><Check aria-hidden="true" /></span>{item}</label>)}</div><p>{checked.length === copy.checklist.items.length ? copy.checklist.complete : `${copy.checklist.remaining}: ${copy.checklist.items.length - checked.length}`}</p></div>
      </section>

      <section className="gwl-module" id="gwl-library">
        <header className="gwl-heading"><span><Search aria-hidden="true" /></span><div><p>{copy.library.eyebrow}</p><h2>{copy.library.title}</h2><div>{copy.library.intro}</div></div></header>
        {locale !== 'th' && <aside className="gwl-language-note"><Info aria-hidden="true" />{copy.library.officialThaiNote}</aside>}
        <div className="gwl-library-controls"><label htmlFor="gwl-law-search"><span>{copy.library.searchLabel}</span><div><Search aria-hidden="true" /><input id="gwl-law-search" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={copy.library.searchPlaceholder} /></div></label><div className="gwl-filters"><span><Filter aria-hidden="true" />{copy.library.filtersLabel}</span><div><button type="button" className={category === 'all' ? 'is-active' : ''} onClick={() => setCategory('all')}>{copy.library.all}</button>{(Object.keys(copy.library.categories) as GroundwaterLawCategory[]).map((value) => <button type="button" className={category === value ? 'is-active' : ''} onClick={() => setCategory(value)} key={value}>{copy.library.categories[value]}</button>)}</div></div><label className="gwl-reference-toggle"><input type="checkbox" checked={showReference} onChange={(event) => setShowReference(event.currentTarget.checked)} /><span><Check aria-hidden="true" /></span>{copy.library.showReference}</label></div>
        <div className="gwl-library-count"><strong>{filteredDocuments.length}</strong> {copy.library.results}</div>
        {filteredDocuments.length > 0 ? <div className="gwl-law-grid">{filteredDocuments.map((document) => <article key={document.id}><header><span className={`gwl-status is-${document.status}`}>{copy.library.status[document.status]}</span><small>{copy.library.yearLabel} {document.year}</small></header><p>{copy.library.categories[document.category]}</p><h3>{document.title}</h3><div>{document.scope}</div><ul>{document.keywords.slice(0, 4).map((keyword) => <li key={keyword}>{keyword}</li>)}</ul><a href={document.officialHref} target="_blank" rel="noopener noreferrer"><Download aria-hidden="true" />{copy.library.officialText}<ExternalLink aria-hidden="true" /></a></article>)}</div> : <div className="gwl-empty"><FileSearch aria-hidden="true" /><p>{copy.library.noResults}</p><button type="button" onClick={() => { setQuery(''); setCategory('act'); setShowReference(true) }}><RefreshCcw aria-hidden="true" />{copy.library.reset}</button></div>}
        <aside className="gwl-master-library"><Landmark aria-hidden="true" /><div><h3>{copy.library.repositoriesTitle}</h3><p>{copy.library.repositoriesText}</p></div><a href={groundwaterLawOfficialRepositories.master} target="_blank" rel="noopener noreferrer">{copy.library.masterLink}<ExternalLink aria-hidden="true" /></a></aside>
      </section>

      <section className="gwl-module" id="gwl-penalties">
        <header className="gwl-heading"><span><Gavel aria-hidden="true" /></span><div><p>{copy.penalties.eyebrow}</p><h2>{copy.penalties.title}</h2><div>{copy.penalties.intro}</div></div></header>
        <div className="gwl-penalties">{copy.penalties.items.map((item) => <article key={item.section}><span>{item.section}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div><aside className="gwl-penalty-warning"><AlertTriangle aria-hidden="true" /><div><h3>{copy.penalties.warningTitle}</h3><p>{copy.penalties.warningText}</p></div></aside>
      </section>

      <section className="gwl-quiz" id="gwl-quiz"><header><p>{copy.quiz.eyebrow}</p><h2>{copy.quiz.title}</h2><span>{copy.quiz.intro}</span></header><div>{copy.quiz.questions.map((question, questionIndex) => { const selected = answers[questionIndex]; const answered = selected !== undefined; return <fieldset key={question.question}><legend>{question.question}</legend>{question.choices.map((choice, choiceIndex) => <button type="button" key={choice} className={answered ? choiceIndex === question.correct ? 'is-correct' : selected === choiceIndex ? 'is-wrong' : '' : ''} onClick={() => setAnswers((current) => ({ ...current, [questionIndex]: choiceIndex }))}><span>{answered && choiceIndex === question.correct ? <CheckCircle2 aria-hidden="true" /> : null}</span>{choice}</button>)}{answered && <p className={selected === question.correct ? 'is-correct' : 'is-review'}><strong>{selected === question.correct ? copy.quiz.correct : copy.quiz.review}:</strong> {question.explanation}</p>}</fieldset> })}</div>{quizComplete && <div className="gwl-quiz-result"><div><span>{copy.quiz.score}</span><strong>{quizScore}/{copy.quiz.questions.length}</strong>{quizScore === copy.quiz.questions.length && <p>{copy.quiz.perfect}</p>}</div><button type="button" onClick={() => setAnswers({})}><RefreshCcw aria-hidden="true" />{copy.quiz.retry}</button></div>}</section>

      <section className="gwl-sources"><div><p>{copy.sources.eyebrow}</p><h2>{copy.sources.title}</h2><span>{copy.sources.text}</span></div><ul>{sourceHrefs.map((href, index) => <li key={href}><a href={href} target="_blank" rel="noopener noreferrer">{copy.sources.links[index]}<ArrowRight aria-hidden="true" /></a></li>)}</ul></section>
      <section className="gwl-next"><div><MapPinned aria-hidden="true" /><div><h2>{copy.next.title}</h2><p>{copy.next.text}</p></div></div><nav><Link href={localLink('/contact')}>{copy.next.contact}<ArrowRight aria-hidden="true" /></Link><Link href={localLink('/learn/groundwater-basics-thailand')}>{copy.next.basics}</Link></nav></section>
    </article>
  )
}
