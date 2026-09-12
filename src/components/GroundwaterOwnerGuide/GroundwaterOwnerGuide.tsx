'use client'

import Image from 'next/image'
import Link from 'next/link'
import NumericInput from '@/components/LearningInputs/NumericInput'
import { validateNumericDraft } from '@/lib/learning-inputs'
import { learningFeedback } from '@/i18n/learning-feedback'
import LearningProgress, { useLearningProgress } from '@/components/LearningProgress/LearningProgress'
import { useMemo, useState } from 'react'
import {
  ArrowRight,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Droplets,
  ExternalLink,
  Factory,
  FileCheck2,
  FlaskConical,
  Gauge,
  HardHat,
  Hotel,
  Landmark,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Sprout,
  Wrench,
} from 'lucide-react'
import { localePath, type LocalizedLocale } from '@/i18n/config'
import {
  calculateGroundwaterPlan,
  calculateStoragePlan,
} from '@/lib/groundwater-calculator'
import './GroundwaterOwnerGuide.css'

type Facility = 'factory' | 'hospitality' | 'agriculture' | 'dewatering'
type UseKey = 'core' | 'laundry' | 'kitchen' | 'cooling' | 'landscape' | 'other'

type GuideCopy = {
  overview: { eyebrow: string; title: string; text: string; items: string[]; imageAlt: string; caption: string }
  choose: { eyebrow: string; title: string; text: string; labels: Record<Facility, string>; descriptions: Record<Facility, string>; priorities: Record<Facility, string[]>; priorityLabel: string }
  calculator: {
    eyebrow: string; title: string; text: string; useTitle: string; assumptionsTitle: string
    uses: Record<UseKey, string>; unit: string; targetShare: string; pumpHours: string; reserve: string
    backupHours: string; usableStorage: string; resultsTitle: string; currentDemand: string
    designDemand: string; groundwaterTarget: string; preliminaryFlow: string; usableTank: string
    nominalTank: string; warning: string; copyBrief: string; copied: string; briefTitle: string
    noDemand: string
  }
  roadmap: { eyebrow: string; title: string; text: string; done: string; steps: Array<{ title: string; detail: string; output: string }> }
  architecture: { eyebrow: string; title: string; text: string; imageAlt: string; caption: string; principles: Array<{ title: string; text: string }> }
  handover: { eyebrow: string; title: string; text: string; groups: Array<{ title: string; items: string[] }> }
  operate: { eyebrow: string; title: string; text: string; rows: Array<{ when: string; actions: string; record: string }> }
  sources: { eyebrow: string; title: string; text: string; links: Array<{ label: string; href: string }> }
  next: { title: string; text: string; contact: string; tools: string; law: string }
}

const facilityIcons = {
  factory: Factory,
  hospitality: Hotel,
  agriculture: Sprout,
  dewatering: ArrowDownToLine,
}

const quickNavByLocale: Record<LocalizedLocale, Array<{ label: string; href: string }>> = {
  th: [
    { label: 'เลือกประเภทกิจการ', href: '#facility-profile' },
    { label: 'คำนวณปริมาณน้ำ', href: '#water-balance' },
    { label: 'เช็กลิสต์โครงการ', href: '#project-roadmap' },
    { label: 'การออกแบบระบบ', href: '#system-design' },
    { label: 'การรับมอบและดูแล', href: '#handover-operation' },
  ],
  en: [
    { label: 'Choose your context', href: '#facility-profile' },
    { label: 'Build a water balance', href: '#water-balance' },
    { label: 'Project checklist', href: '#project-roadmap' },
    { label: 'System design', href: '#system-design' },
    { label: 'Handover and operate', href: '#handover-operation' },
  ],
  zh: [
    { label: '选择应用场景', href: '#facility-profile' },
    { label: '建立用水平衡', href: '#water-balance' },
    { label: '项目检查表', href: '#project-roadmap' },
    { label: '系统设计', href: '#system-design' },
    { label: '验收与运行', href: '#handover-operation' },
  ],
  ja: [
    { label: '用途を選ぶ', href: '#facility-profile' },
    { label: '水収支を作る', href: '#water-balance' },
    { label: 'プロジェクト確認', href: '#project-roadmap' },
    { label: 'システム設計', href: '#system-design' },
    { label: '検収と運用', href: '#handover-operation' },
  ],
}

const useLabelsByLocale: Record<LocalizedLocale, Record<Facility, Record<UseKey, string>>> = {
  th: {
    factory: { core: 'กระบวนการผลิตหลัก', laundry: 'ล้างวัตถุดิบและอุปกรณ์', kitchen: 'น้ำใช้ของบุคลากรและโรงอาหาร', cooling: 'หล่อเย็น / ปรับอากาศ / น้ำเติมหม้อไอน้ำ', landscape: 'ภูมิทัศน์และงานภายนอก', other: 'อื่น ๆ และการสูญเสียที่ทราบ' },
    hospitality: { core: 'ห้องพักและพื้นที่บริการ', laundry: 'ซักรีดและทำความสะอาด', kitchen: 'ครัว อาหาร และเครื่องดื่ม', cooling: 'ระบบปรับอากาศและระบบอาคาร', landscape: 'สระ ภูมิทัศน์ และกิจกรรมกลางแจ้ง', other: 'อื่น ๆ และการสูญเสียที่ทราบ' },
    agriculture: { core: 'ให้น้ำพืชหลัก / สวน', laundry: 'ล้างผลผลิตและอุปกรณ์', kitchen: 'ปศุสัตว์และน้ำใช้ของแรงงาน', cooling: 'พ่นหมอก / ลดอุณหภูมิ', landscape: 'แปลงเพาะ โรงเรือน และบ่อพัก', other: 'อื่น ๆ และการสูญเสียที่ทราบ' },
    dewatering: { core: 'น้ำซึมเข้าสู่หลุมขุด', laundry: 'น้ำฝนและน้ำผิวดิน', kitchen: 'น้ำซึมตามแนวกำแพงและฐาน', cooling: 'กำลังสำรองและเหตุฉุกเฉิน', landscape: 'นำน้ำกลับใช้ / ระบายออก', other: 'ปัจจัยเผื่อและปริมาณที่ยังไม่ทราบ' },
  },
  en: {
    factory: { core: 'Core production process', laundry: 'Raw-material and equipment washing', kitchen: 'Staff and canteen water', cooling: 'Cooling / HVAC / boiler makeup', landscape: 'Landscape and external works', other: 'Other and known losses' },
    hospitality: { core: 'Guest rooms and service areas', laundry: 'Laundry and housekeeping', kitchen: 'Kitchen, food and beverage', cooling: 'HVAC and building systems', landscape: 'Pools, landscape and outdoor uses', other: 'Other and known losses' },
    agriculture: { core: 'Primary crop / orchard irrigation', laundry: 'Produce and equipment washing', kitchen: 'Livestock and worker facilities', cooling: 'Misting / temperature control', landscape: 'Nursery, greenhouse and ponds', other: 'Other and known losses' },
    dewatering: { core: 'Base excavation inflow', laundry: 'Rainfall and surface runoff', kitchen: 'Wall and formation seepage', cooling: 'Standby and contingency duty', landscape: 'Reuse / controlled discharge', other: 'Uncertainty and unmeasured inflow' },
  },
  zh: {
    factory: { core: '核心生产工艺', laundry: '原料与设备清洗', kitchen: '员工与食堂用水', cooling: '冷却 / 空调 / 锅炉补水', landscape: '景观与室外用水', other: '其他及已知损失' },
    hospitality: { core: '客房与服务区域', laundry: '洗衣与客房清洁', kitchen: '厨房与餐饮', cooling: '空调与楼宇系统', landscape: '泳池、景观与户外用水', other: '其他及已知损失' },
    agriculture: { core: '主要作物 / 果园灌溉', laundry: '农产品与设备清洗', kitchen: '畜牧与人员生活用水', cooling: '喷雾 / 降温', landscape: '育苗、温室与蓄水池', other: '其他及已知损失' },
    dewatering: { core: '基坑基础涌水', laundry: '降雨与地表径流', kitchen: '围护墙与地层渗水', cooling: '备用与应急能力', landscape: '回用 / 受控排放', other: '不确定量与未测涌水' },
  },
  ja: {
    factory: { core: '主要生産工程', laundry: '原料・設備洗浄', kitchen: '従業員・食堂用水', cooling: '冷却 / 空調 / ボイラー補給', landscape: '植栽・屋外用水', other: 'その他・既知の損失' },
    hospitality: { core: '客室・サービスエリア', laundry: 'ランドリー・客室清掃', kitchen: '厨房・飲食', cooling: '空調・建物設備', landscape: 'プール・植栽・屋外用途', other: 'その他・既知の損失' },
    agriculture: { core: '主要作物・果樹園の灌漑', laundry: '農産物・機器の洗浄', kitchen: '畜産・作業員用水', cooling: 'ミスト・温度管理', landscape: '育苗・温室・貯水池', other: 'その他・既知の損失' },
    dewatering: { core: '掘削底への流入', laundry: '降雨・表面流出', kitchen: '山留め壁・地層からの浸透', cooling: '予備・緊急能力', landscape: '再利用・管理放流', other: '不確実量・未計測流入' },
  },
}

const contextVisualByLocale: Record<LocalizedLocale, { alt: string; caption: string; navLabel: string }> = {
  th: {
    alt: 'ภาพตัดระบบน้ำบาดาลเพื่อการเกษตรและระบบสูบลดระดับน้ำรอบหลุมขุด',
    caption: 'เกษตรกรรมต้องจับคู่ปริมาณและคุณภาพน้ำกับพืชและระบบให้น้ำ ส่วนการสูบลดระดับน้ำต้องควบคุมระดับน้ำ ผลกระทบข้างเคียง การตกตะกอน และทางระบายตลอดช่วงก่อสร้าง',
    navLabel: 'ทางลัดในคู่มือ',
  },
  en: {
    alt: 'Cutaway of an agricultural groundwater system and construction dewatering system',
    caption: 'Agriculture matches quantity and quality to crops and irrigation. Dewatering controls water level, neighbouring impacts, settlement treatment and discharge throughout construction.',
    navLabel: 'Guide shortcuts',
  },
  zh: {
    alt: '农业地下水系统与施工降水系统剖面图',
    caption: '农业应让水量和水质匹配作物与灌溉系统；施工降水则需在整个施工期控制水位、邻近影响、沉淀处理和排放。',
    navLabel: '指南快捷入口',
  },
  ja: {
    alt: '農業用地下水設備と工事排水設備の断面図',
    caption: '農業では水量・水質を作物と灌漑に合わせます。工事排水では施工期間を通じ、水位、周辺影響、沈殿処理、放流を管理します。',
    navLabel: 'ガイド内ショートカット',
  },
}

const sourceLinks = {
  permit: 'https://www.dgr.go.th/gcl/th/newsAll/433/13900',
  criteria: 'https://www.dgr.go.th/th/newsAll/124/2729',
  quality: 'https://www.dgr.go.th/th/newsAll/124/7941',
  lab: 'https://www.dgr.go.th/dga/th/about',
  map: 'https://smartgis.dgr.go.th/dgr_gis/map/',
}

const copyByLocale: Record<LocalizedLocale, GuideCopy> = {
  th: {
    overview: {
      eyebrow: 'คู่มือเจ้าของกิจการ', title: 'เปลี่ยน “อยากมีบ่อ” ให้เป็นระบบน้ำที่วางแผนได้',
      text: 'คู่มือนี้ช่วยเจ้าของกิจการรวบรวมความต้องการใช้น้ำ ตรวจจุดเสี่ยง และกำหนดหลักฐานรับมอบก่อนคุยกับนักธรณีวิทยา วิศวกร ผู้รับจ้าง และหน่วยงานอนุญาต',
      items: ['คำนวณจากข้อมูลใช้จริง ไม่เดาปริมาณน้ำจากขนาดกิจการ', 'แยกน้ำตามคุณภาพและความสำคัญของจุดใช้', 'วางแหล่งสำรอง ถัง และแผนหยุดระบบตั้งแต่ต้น', 'รับมอบด้วยค่าที่วัดได้และเอกสารตามสภาพจริง'],
      imageAlt: 'ภาพระบบน้ำบาดาลสำหรับโรงงาน โรงแรมและรีสอร์ท เกษตรกรรม และงานสูบลดระดับน้ำ', caption: 'สี่บริบท หนึ่งหลักคิด: เริ่มจากข้อมูลหน้างาน แล้วออกแบบแหล่งน้ำ ระบบสูบ การปรับปรุง การสำรอง และจุดตรวจวัดให้ทำงานร่วมกัน',
    },
    choose: {
      eyebrow: 'ขั้นที่ 1', title: 'คุณวางแผนระบบน้ำให้กิจการแบบไหน?', text: 'เลือกประเภทที่ใกล้เคียง เพื่อดูเรื่องที่ควรเตรียมและชื่อช่องกรอกปริมาณน้ำให้ตรงกับงานของคุณ',
      labels: { factory: 'โรงงาน', hospitality: 'โรงแรมและรีสอร์ท', agriculture: 'เกษตรกรรม', dewatering: 'สูบลดระดับน้ำ' },
      descriptions: { factory: 'ความต่อเนื่องของกระบวนการ คุณภาพเฉพาะจุด และผลกระทบต่อการผลิต', hospitality: 'พีกตามจำนวนผู้เข้าพัก ฤดูกาล สุขอนามัย ซักรีด ครัว และภูมิทัศน์', agriculture: 'ความต้องการน้ำตามชนิดพืช ฤดูกาล ระบบให้น้ำ คุณภาพน้ำ และต้นทุนพลังงาน', dewatering: 'ควบคุมน้ำใต้ดินรอบหลุมขุด เสถียรภาพพื้นที่ การระบาย และผลกระทบข้างเคียง' },
      priorityLabel: 'ประเด็นที่ควรยืนยันก่อน',
      priorities: {
        factory: ['แยกน้ำสำหรับการผลิต หล่อเย็น หม้อไอน้ำ และการใช้งานทั่วไป', 'กำหนดคุณภาพรับเข้าเครื่องจักรและผลกระทบเมื่อหยุดน้ำ', 'ตรวจข้อกำหนดโรงงาน สิ่งแวดล้อม และการระบายน้ำร่วมด้วย'],
        hospitality: ['แยกน้ำสำหรับห้องพัก ครัว ซักรีด สระ ระบบปรับอากาศ และภูมิทัศน์', 'ตรวจพีกของอัตราเข้าพัก งานจัดเลี้ยง ฤดูแล้ง และช่วงไฟฟ้าดับ', 'กำหนดจุดตรวจคุณภาพน้ำดื่ม น้ำใช้ และน้ำสำหรับภูมิทัศน์ให้ชัด'],
        agriculture: ['คำนวณจากพื้นที่ ชนิดพืช วิธีให้น้ำ และช่วงพีกจริง', 'ตรวจคุณภาพน้ำต่อดิน พืช ระบบน้ำหยด หัวพ่น และการอุดตัน', 'วางบ่อพัก การแบ่งโซน และเวลาเดินปั๊มให้สอดคล้องกับพลังงานและใบอนุญาต'],
        dewatering: ['มีข้อมูลชั้นดิน ระดับน้ำใต้ดิน และผลทดสอบก่อนกำหนดจำนวนปั๊ม', 'ออกแบบปั๊มหลักและปั๊มสำรอง จุดวัดระดับน้ำ การตกตะกอน และทางระบายที่อนุญาต', 'ติดตามการทรุดตัว น้ำขุ่น ผลกระทบต่อบ่อและอาคารข้างเคียง พร้อมแผนฉุกเฉิน'],
      },
    },
    calculator: {
      eyebrow: 'ขั้นที่ 2', title: 'ต้องใช้น้ำวันละเท่าไร?', text: 'กรอกปริมาณเฉลี่ยต่อวันจากมิเตอร์ บิลน้ำ บันทึกการผลิต หรือประมาณการที่มีที่มา ผลลัพธ์เป็นข้อมูลวางแผนเบื้องต้น ไม่ใช่คำรับรองว่าบ่อจะให้น้ำได้ตามต้องการ',
      useTitle: 'ปริมาณน้ำตามจุดใช้', assumptionsTitle: 'สมมติฐานการออกแบบ',
      uses: { core: 'กระบวนการหลัก / ห้องพัก', laundry: 'ซักรีดและทำความสะอาด', kitchen: 'ครัว อาหาร และเครื่องดื่ม', cooling: 'หล่อเย็น / ปรับอากาศ / น้ำเติมหม้อไอน้ำ', landscape: 'ภูมิทัศน์ สระ และงานภายนอก', other: 'อื่น ๆ และการสูญเสียที่ทราบ' }, unit: 'ม³/วัน',
      targetShare: 'สัดส่วนที่ต้องการให้น้ำบาดาลรองรับ', pumpHours: 'ชั่วโมงสูบที่วางแผนต่อวัน', reserve: 'เผื่อเติบโต/ความไม่แน่นอน', backupHours: 'ชั่วโมงสำรองเมื่อแหล่งหลักหยุด', usableStorage: 'ปริมาตรถังที่ใช้งานได้จริง',
      resultsTitle: 'กรอบออกแบบเบื้องต้น', currentDemand: 'ความต้องการปัจจุบัน', designDemand: 'ความต้องการหลังเผื่อ', groundwaterTarget: 'เป้าหมายน้ำบาดาล', preliminaryFlow: 'อัตราสูบเฉลี่ยที่ต้องการ', usableTank: 'น้ำสำรองที่ต้องใช้', nominalTank: 'ความจุถังรวมโดยประมาณ',
      warning: 'ต้องยืนยันอัตราสูบด้วยการสูบทดสอบ ตรวจความยั่งยืนของชั้นน้ำ และตรวจเงื่อนไขใบอนุญาต ก่อนเลือกปั๊มหรือรับประกันกำลังผลิต', copyBrief: 'คัดลอกสรุปโครงการ', copied: 'คัดลอกแล้ว', briefTitle: 'ข้อมูลตั้งต้นโครงการน้ำบาดาล', noDemand: 'เริ่มจากกรอกปริมาณน้ำอย่างน้อยหนึ่งจุดใช้',
    },
    roadmap: {
      eyebrow: 'ขั้นที่ 3', title: 'เตรียมข้อมูลให้ครบก่อนเดินหน้าต่อ', text: 'ติ๊กเมื่อมีข้อมูลหรือผลส่งมอบจริง แถบความพร้อมบอกว่ายังขาดอะไร ไม่ใช่การอนุมัติให้เริ่มงาน', done: 'ความพร้อม',
      steps: [
        { title: 'สรุปการใช้น้ำและความต่อเนื่องที่ต้องการ', detail: 'ยืนยันปริมาณน้ำเข้า–ออก ช่วงที่ใช้มากที่สุด คุณภาพแต่ละจุดใช้ เวลาที่หยุดระบบได้ และแหล่งสำรอง', output: 'เกณฑ์ออกแบบและข้อมูลการใช้น้ำแต่ละช่วงเวลา' },
        { title: 'ตรวจพื้นที่ ข้อมูลเดิม และข้อจำกัด', detail: 'ตรวจพิกัด สิทธิในที่ดิน ทางเข้าเครื่องเจาะ แหล่งปนเปื้อน ระบบท่อเดิม บ่อใกล้เคียง และ SmartGIS', output: 'แผนผังพื้นที่และรายการความเสี่ยง' },
        { title: 'ยืนยันกฎหมายและขอบเขตผู้รับผิดชอบ', detail: 'ตรวจผู้รับคำขอ ใบอนุญาตเจาะ ใบอนุญาตใช้ ผู้รับจ้างที่มีคุณสมบัติ และข้อกำหนดกิจการอื่นที่เกี่ยวข้อง', output: 'รายการใบอนุญาตและผู้รับผิดชอบแต่ละรายการ' },
        { title: 'สำรวจ ออกแบบ และเจาะตามข้อมูลจริง', detail: 'เลือกจุดด้วยข้อมูลอุทกธรณีวิทยา บันทึกชั้นดินหิน และปรับแบบบ่อตามชั้นน้ำที่พบ', output: 'บันทึกชั้นดินหินและแบบบ่อตามที่ก่อสร้างจริง' },
        { title: 'พัฒนาบ่อ สูบทดสอบ และตรวจน้ำ', detail: 'เก็บข้อมูลอัตราสูบ ระดับลด การฟื้นตัว ทราย และตัวอย่างน้ำด้วยวิธีที่เหมาะสม', output: 'อัตราสูบแนะนำ ค่าฐานอ้างอิง และผลตรวจน้ำ' },
        { title: 'ออกแบบระบบปรับปรุง ถัง และระบบสำรอง', detail: 'เลือกกระบวนการจากผลตรวจจริง แยกคุณภาพตามจุดใช้ และวางอุปกรณ์หลัก–สำรอง ท่อทางเลี่ยง มิเตอร์ และสัญญาณเตือน', output: 'แผนผังท่อและเครื่องมือวัด (P&ID) รายการอุปกรณ์ และแนวทางควบคุม' },
        { title: 'ทดสอบ ส่งมอบ และวางแผนเดินระบบ', detail: 'ทดสอบทั้งระบบภายใต้การใช้งานจริง อบรมผู้ปฏิบัติงาน และกำหนดตัวชี้วัด จุดเก็บตัวอย่าง และอะไหล่สำคัญ', output: 'บันทึกรับมอบ คู่มือเดินระบบและบำรุงรักษา และค่าฐานอ้างอิง' },
      ],
    },
    architecture: {
      eyebrow: 'ขั้นที่ 4', title: 'ให้บ่อ ระบบปรับปรุง ถัง และจุดใช้ทำงานร่วมกัน', text: 'ระบบที่ดีไม่ใช่เพียงน้ำออกจากบ่อ แต่ต้องควบคุมคุณภาพ แรงดัน การสำรอง และการหยุดซ่อมโดยไม่ทำให้กิจการเสี่ยง',
      imageAlt: 'แผนผังระบบน้ำบาดาลที่มีบ่อ ปั๊ม ระบบปรับปรุง ถัง แหล่งสำรอง และจุดใช้งานหลายประเภท', caption: 'เส้นทางตัวอย่าง: บ่อที่ป้องกันการปนเปื้อน → ถังน้ำดิบ/จุดเก็บตัวอย่าง → ระบบปรับปรุง → ถังน้ำดี → จุดใช้ แหล่งสำรองและอุปกรณ์สำรอง ต้องทดสอบได้จริง',
      principles: [
        { title: 'แยก “ปริมาณ” ออกจาก “คุณภาพ”', text: 'บ่ออาจให้น้ำพอแต่คุณภาพไม่เหมาะกับทุกจุดใช้ จึงควรแยกขั้นตอนปรับปรุงคุณภาพน้ำและเกณฑ์น้ำตามการใช้งาน' },
        { title: 'ใช้ถังพักให้เวลาสูบและเวลาใช้น้ำไม่ต้องตรงกัน', text: 'ออกแบบถังตามปริมาณน้ำที่ใช้แต่ละช่วงเวลา เพื่อช่วยลดการเปิด–ปิดปั๊มบ่อย และให้ระบบปรับปรุงน้ำทำงานตามที่ออกแบบ' },
        { title: 'อุปกรณ์เสียจุดเดียว ต้องไม่ทำให้ระบบสำรองหยุดด้วย', text: 'ทบทวนแหล่งน้ำสำรอง ปั๊ม ไฟฟ้า ชุดควบคุม และชิ้นส่วนสำคัญ พร้อมวิธีสลับระบบที่ผู้ปฏิบัติงานทำได้' },
        { title: 'ติดมิเตอร์ตรงคำถาม', text: 'อย่างน้อยต้องตอบได้ว่าบ่อสูบเท่าไร ระบบสูญเสียตรงไหน คุณภาพหลังปรับปรุงเป็นอย่างไร และจุดใดใช้น้ำมากที่สุด' },
      ],
    },
    handover: {
      eyebrow: 'ขั้นที่ 5', title: 'ตรวจอะไรบ้างก่อนรับมอบระบบ?', text: 'ระบุรายการนี้ในขอบเขตงานและผูกการจ่ายเงินกับผลทดสอบที่ตกลงกันก่อนเริ่มงาน',
      groups: [
        { title: 'ตัวบ่อและสมรรถนะ', items: ['บันทึกชั้นดินหิน ขนาด วัสดุ ช่วงท่อกรอง และช่วงอุดซีเมนต์', 'ผลพัฒนาบ่อ สูบทดสอบ ระดับน้ำ และการคืนตัวของระดับน้ำ', 'อัตราสูบแนะนำ ข้อจำกัดการเดินบ่อ และค่าฐานทราย'] },
        { title: 'คุณภาพและระบบปรับปรุง', items: ['บันทึกการเก็บและส่งต่อสิ่งส่งตรวจ และผลตรวจน้ำก่อน–หลังระบบ', 'เกณฑ์รับมอบแยกตามจุดใช้และวัตถุประสงค์การใช้งาน', 'แผนผังท่อและเครื่องมือวัด ค่าควบคุม สัญญาณเตือน ข้อมูลความปลอดภัยสารเคมี (SDS) และวัสดุสิ้นเปลือง'] },
        { title: 'ไฟฟ้า เครื่องกล และระบบควบคุม', items: ['กราฟสมรรถนะปั๊ม จุดทำงาน อุปกรณ์ป้องกันมอเตอร์ และผลทดสอบ', 'การสลับอุปกรณ์หลัก–สำรอง แหล่งน้ำสำรอง และไฟสำรอง', 'ป้ายระบุอุปกรณ์ รายการอะไหล่ และแบบตามที่ก่อสร้างจริง'] },
        { title: 'กฎหมายและการปฏิบัติงาน', items: ['ใบอนุญาต เอกสารรายงาน และผู้รับผิดชอบต่ออายุ', 'คู่มือเดินระบบและบำรุงรักษา ตารางบำรุงรักษา และบันทึกอบรม', 'ค่าฐานอ้างอิง: อัตราไหล แรงดัน ระดับน้ำ คุณภาพน้ำ พลังงาน และการสั่น'] },
      ],
    },
    operate: {
      eyebrow: 'การดูแลหลังรับมอบ', title: 'ดูแนวโน้มก่อนระบบหยุด ไม่รอให้เกิดเหตุ', text: 'ความถี่จริงขึ้นกับใบอนุญาต คู่มือผู้ผลิต ความเสี่ยง และวัตถุประสงค์ใช้งาน ตารางนี้เป็นกรอบเริ่มต้นให้ทีมกำหนดขั้นตอนปฏิบัติงานของตนเอง',
      rows: [
        { when: 'ทุกกะ / ทุกวัน', actions: 'ตรวจสัญญาณเตือน อัตราไหล แรงดัน ระดับน้ำในถัง สี กลิ่น เสียง และการสั่นผิดปกติ', record: 'บันทึกเดินระบบและเหตุผิดปกติ' },
        { when: 'รายสัปดาห์', actions: 'ตรวจการรั่ว หัวบ่อ ตู้ควบคุม สารเคมีและวัสดุสิ้นเปลือง และทดสอบปั๊มสำรองตามขั้นตอน', record: 'รายการตรวจสภาพ' },
        { when: 'รายเดือน', actions: 'ทบทวนปริมาณสูบ เทียบปริมาณน้ำเข้า–ออก พลังงานต่อม³ ระดับน้ำ และหน้าที่รายงานตามใบอนุญาต', record: 'สรุปสมรรถนะรายเดือน' },
        { when: 'ตามความเสี่ยง/แผน', actions: 'เก็บตัวอย่างน้ำ สอบเทียบมิเตอร์ บำรุงรักษาปั๊ม/ระบบปรับปรุง และซ้อมรับมือเหตุฉุกเฉิน', record: 'ประวัติผลตรวจน้ำ สอบเทียบ และบำรุงรักษา' },
      ],
    },
    sources: {
      eyebrow: 'ตรวจสอบกับหน่วยงาน', title: 'ตรวจข้อมูลล่าสุดกับแหล่งทางการก่อนอนุมัติงาน', text: 'ข้อกำหนดขึ้นกับพื้นที่ ปริมาณ วัตถุประสงค์ และประเภทกิจการ หน้านี้จึงสรุปหลักคิดและเชื่อมกลับไปยังข้อมูลของกรมทรัพยากรน้ำบาดาล ตรวจทาน 4 สิงหาคม 2569',
      links: [
        { label: 'ขั้นตอนและแบบคำขออนุญาตเจาะ/ใช้น้ำบาดาล', href: sourceLinks.permit },
        { label: 'หลักเกณฑ์ที่ใช้พิจารณาการอนุญาต', href: sourceLinks.criteria },
        { label: 'มาตรฐานคุณภาพน้ำบาดาลเพื่อการบริโภค', href: sourceLinks.quality },
        { label: 'บริการวิเคราะห์คุณภาพน้ำของกรมฯ', href: sourceLinks.lab },
        { label: 'ระบบแผนที่ SmartGIS ของกรมฯ', href: sourceLinks.map },
      ],
    },
    next: { title: 'พร้อมนำสรุปนี้ไปวางแผนโครงการจริง?', text: 'ส่งพิกัด แผนผัง ปริมาณน้ำ ผลตรวจเดิม และช่วงเวลาที่กิจการหยุดน้ำไม่ได้ให้ทีมงานช่วยทบทวน', contact: 'ปรึกษาทีมงาน', tools: 'เครื่องมือคำนวณช่าง', law: 'คู่มือกฎหมาย' },
  },
  en: {} as GuideCopy,
  zh: {} as GuideCopy,
  ja: {} as GuideCopy,
}

copyByLocale.en = {
  ...copyByLocale.th,
  overview: { eyebrow: 'OWNER’S PLANNING GUIDE', title: 'Turn “we need water” into an evidence-based system plan', text: 'Build an evidence-based brief before speaking with hydrogeologists, engineers, contractors and permit authorities.', items: ['Base demand on measured use, not facility size alone', 'Separate end uses by quality and criticality', 'Plan storage, backup and shutdowns from the start', 'Accept measurable performance and as-built records'], imageAlt: 'Groundwater systems for a factory, hotel and resort, agriculture and construction dewatering', caption: 'Four contexts, one discipline: start with site evidence and design the source, pumping, treatment, storage and monitoring as one system.' },
  choose: { eyebrow: 'Step 1', title: 'What kind of operation are you planning for?', text: 'Choose the closest type to see what to prepare and tailor the water-use fields to your work.', labels: { factory: 'Factory', hospitality: 'Hotel and resort', agriculture: 'Agriculture', dewatering: 'Dewatering' }, descriptions: { factory: 'Process continuity, use-specific quality and production impact.', hospitality: 'Occupancy peaks, seasonality, hygiene, laundry, kitchens and landscapes.', agriculture: 'Crop demand, seasons, irrigation method, water quality and energy cost.', dewatering: 'Groundwater control around an excavation, stability, discharge and neighbouring impacts.' }, priorityLabel: 'Confirm these early', priorities: { factory: ['Separate process, cooling, boiler and domestic water', 'Define machine inlet quality and the cost of interruption', 'Check factory, environmental and discharge obligations too'], hospitality: ['Separate rooms, kitchen, laundry, pools, HVAC and landscape loads', 'Check occupancy, events, dry-season demand and power-outage exposure', 'Define sampling points for drinking, domestic and landscape water'], agriculture: ['Calculate from crop, area, irrigation method and real peak period', 'Check effects of water quality on soil, crops, emitters and clogging', 'Coordinate storage, zones and pump hours with power and permit limits'], dewatering: ['Use ground profile, groundwater levels and testing before sizing pumps', 'Provide duty/standby capacity, level monitoring, settlement and an approved outlet', 'Monitor settlement, turbidity and impacts on nearby wells and structures with an emergency plan'] } },
  calculator: { ...copyByLocale.th.calculator, eyebrow: 'Step 2', title: 'How much water do you need each day?', text: 'Enter average daily use from meters, bills, production records or traceable estimates. Results are preliminary planning values—not a guarantee of well yield.', useTitle: 'Demand by end use', assumptionsTitle: 'Design assumptions', uses: { core: 'Core process / guest rooms', laundry: 'Laundry and cleaning', kitchen: 'Kitchen, food and beverage', cooling: 'Cooling / HVAC / boiler makeup', landscape: 'Landscape, pools and outdoor use', other: 'Other and known losses' }, unit: 'm³/day', targetShare: 'Target groundwater share', pumpHours: 'Planned pumping hours/day', reserve: 'Growth/uncertainty allowance', backupHours: 'Backup duration when source stops', usableStorage: 'Usable fraction of tank', resultsTitle: 'Preliminary design frame', currentDemand: 'Current demand', designDemand: 'Demand with allowance', groundwaterTarget: 'Groundwater target', preliminaryFlow: 'Average required pumping rate', usableTank: 'Required usable storage', nominalTank: 'Approximate nominal tank', warning: 'Confirm yield by pumping test, aquifer sustainability and permit conditions before selecting a pump or guaranteeing output.', copyBrief: 'Copy project brief', copied: 'Copied', briefTitle: 'Groundwater project starting brief', noDemand: 'Enter at least one end-use demand to begin' },
  roadmap: { eyebrow: 'Step 3', title: 'Gather the evidence before moving ahead', text: 'Tick only when the input or deliverable is ready. Progress shows what is missing; it is not approval to start work.', done: 'readiness', steps: [
    { title: 'Define demand and service level', detail: 'Confirm water coming in and going out, busiest periods, quality by use, acceptable downtime and backup supply.', output: 'Design requirements and water use through the day' },
    { title: 'Review site, records and constraints', detail: 'Check coordinates, land rights, rig access, pollution risks, existing pipes, nearby wells and SmartGIS.', output: 'Site plan and risk register' },
    { title: 'Confirm permits and responsibility', detail: 'Verify drilling/use permits, receiving authority, qualified parties and other facility obligations.', output: 'Permit checklist and the person responsible for each' },
    { title: 'Survey, design and drill to evidence', detail: 'Select the target from hydrogeology and update construction to the formations encountered.', output: 'Record of soil/rock layers and the well as actually built' },
    { title: 'Develop, pump-test and analyse', detail: 'Measure discharge, drawdown, recovery, sand and representative water quality.', output: 'Recommended yield, baseline and laboratory results' },
    { title: 'Design treatment, storage and backup', detail: 'Use test results; define duty/standby equipment, meters, alarms, bypasses and quality zones.', output: 'Piping and instrument diagram (P&ID), equipment list and control plan' },
    { title: 'Commission, hand over and operate', detail: 'Test under real-use conditions, train operators, and agree performance measures, sampling points and essential spares.', output: 'Acceptance record, operation and maintenance manual, and baseline readings' },
  ] },
  architecture: { eyebrow: 'Step 4', title: 'Make the well, treatment, tank and users work as one system', text: 'A successful system controls quality, pressure, backup and maintenance—not merely water flowing from a well.', imageAlt: 'Resilient groundwater system with well, treatment, storage, backup and multiple end uses', caption: 'Typical path: protected well → raw buffer and sampling → treatment → treated storage → end use. Backup and standby equipment must be testable.', principles: [
    { title: 'Separate quantity from quality', text: 'Adequate yield does not mean one quality suits every use. Define treatment and acceptance by duty.' },
    { title: 'Use storage so pumping and water use can happen at different times', text: 'Size the tank for water use through the day. This helps reduce repeated pump starts and keeps treatment working as designed.' },
    { title: 'Keep one equipment failure from stopping the backup too', text: 'Review source, pumps, power, controls and critical spares, plus a practical changeover procedure.' },
    { title: 'Meter the questions that matter', text: 'Know abstraction, losses, post-treatment quality and which end use creates the peak.' },
  ] },
  handover: { eyebrow: 'Step 5', title: 'What should you check before accepting the system?', text: 'Put these deliverables in the scope and agree measurable payment gates before work begins.', groups: [
    { title: 'Well and performance', items: ['Soil/rock-layer record, materials, and screen and seal depths', 'Development, pumping test, levels and recovery data', 'Recommended yield, operating limits and sand baseline'] },
    { title: 'Quality and treatment', items: ['Sampling and sample-handover records, plus raw and treated water test results', 'Acceptance limits by end use', 'Piping and instrument diagram, control settings, alarms, chemical safety data sheets (SDS) and consumables'] },
    { title: 'Mechanical, electrical and controls', items: ['Pump curve, duty point, motor protection and test records', 'Duty/standby, backup source and backup power tests', 'Equipment tags, spares list and as-built drawings'] },
    { title: 'Compliance and operation', items: ['Permits, reporting and renewal owners', 'Operation and maintenance manual, maintenance plan and training records', 'Flow, pressure, level, quality, energy and vibration baselines'] },
  ] },
  operate: { eyebrow: 'After handover', title: 'See deterioration before the system stops', text: 'Actual intervals depend on permits, manufacturer guidance, risk and intended use. Use this as a starting point for your site operating procedures.', rows: [
    { when: 'Each shift / daily', actions: 'Check alarms, flow, pressure, levels, unusual appearance/odour, sound and vibration.', record: 'Operator log and exceptions' },
    { when: 'Weekly', actions: 'Inspect leaks, wellhead, panels and consumables; test standby equipment using the agreed operating procedure.', record: 'Inspection checklist' },
    { when: 'Monthly', actions: 'Review pumped volume, water coming in and going out, energy per m³, water levels and permit reporting duties.', record: 'Performance review' },
    { when: 'Risk-based / planned', actions: 'Sample water, calibrate meters, maintain equipment and rehearse emergency response.', record: 'Lab, calibration and maintenance history' },
  ] },
  sources: { eyebrow: 'Official checkpoints', title: 'Verify current requirements before authorizing work', text: 'Requirements depend on location, volume, use and facility type. This guide links to official Department of Groundwater Resources material, reviewed 4 August 2026.', links: [
    { label: 'Drilling and groundwater-use permit process/forms', href: sourceLinks.permit }, { label: 'Permit assessment criteria', href: sourceLinks.criteria }, { label: 'Groundwater quality for consumption', href: sourceLinks.quality }, { label: 'DGR water-analysis services', href: sourceLinks.lab }, { label: 'DGR SmartGIS map system', href: sourceLinks.map },
  ] },
  next: { title: 'Ready to turn this worksheet into a site scope?', text: 'Send coordinates, layout, demand, existing analyses and the periods when water cannot be interrupted.', contact: 'Ask the team', tools: 'Technician calculators', law: 'Legal guide' },
}

copyByLocale.zh = {
  ...copyByLocale.en,
  overview: { ...copyByLocale.en.overview, eyebrow: '业主规划指南', title: '把“需要用水”转化为可验证的系统方案', text: '在与水文地质、工程、承包和许可团队沟通前，先形成有依据的项目任务书。', items: ['以实际用量为依据，而非只看项目规模', '按水质要求和重要性区分用途', '从一开始规划储水、备用水源和停机', '以可测性能和竣工资料进行验收'], imageAlt: '工厂、酒店度假村、农业和施工降水的地下水系统', caption: '四种场景，同一原则：从现场资料开始，把水源、抽水、处理、储存与监测作为一个系统设计。' },
  choose: { ...copyByLocale.en.choose, eyebrow: '第 1 步', title: '您要为哪类业务规划用水？', text: '选择最接近的类型，查看应准备的资料，并调整用水量填写项目。', labels: { factory: '工厂', hospitality: '酒店与度假村', agriculture: '农业', dewatering: '施工降水' }, descriptions: { factory: '工艺连续性、分用途水质和停水损失。', hospitality: '入住高峰、季节性、卫生、洗衣、厨房与景观用水。', agriculture: '作物需求、季节、灌溉方式、水质与能源成本。', dewatering: '基坑周边地下水控制、稳定性、排放及邻近影响。' }, priorityLabel: '应优先确认', priorities: { factory: ['区分工艺、冷却、锅炉和生活用水', '确定设备进水水质与停水影响', '同时核查工厂、环保和排放要求'], hospitality: ['区分客房、厨房、洗衣、泳池、空调和景观负荷', '核查入住率、活动、旱季需求与停电风险', '明确饮用、生活与景观用水取样点'], agriculture: ['按作物、面积、灌溉方式和真实高峰期计算', '核查水质对土壤、作物、滴头和堵塞的影响', '让储水、分区与抽水时间符合供电和许可限制'], dewatering: ['在确定泵量前取得地层、地下水位与试验资料', '设置主备能力、水位监测、沉淀处理和获批排放口', '监测沉降、浊度及对邻井和建筑的影响，并备有应急方案'] } },
  calculator: { ...copyByLocale.en.calculator, eyebrow: '第 2 步', title: '每天需要多少水？', text: '输入来自水表、账单、生产记录或可追溯估算的日均用量。结果仅用于前期规划，不保证井的出水量。', useTitle: '按用途统计', assumptionsTitle: '设计假设', uses: { core: '核心工艺 / 客房', laundry: '洗衣与清洁', kitchen: '厨房、餐饮', cooling: '冷却 / 空调 / 锅炉补水', landscape: '景观、泳池和室外', other: '其他及已知损耗' }, unit: 'm³/天', targetShare: '地下水目标占比', pumpHours: '计划每日抽水小时', reserve: '增长/不确定性余量', backupHours: '主水源中断备用小时', usableStorage: '水箱可用比例', resultsTitle: '初步设计框架', currentDemand: '当前需求', designDemand: '含余量需求', groundwaterTarget: '地下水目标量', preliminaryFlow: '平均所需抽水量', usableTank: '所需可用储水', nominalTank: '估算名义水箱', warning: '选泵或承诺产水量前，必须通过抽水试验、含水层可持续性和许可条件确认。', copyBrief: '复制项目简报', copied: '已复制', briefTitle: '地下水项目前期资料', noDemand: '请至少输入一项用水量' },
  roadmap: { ...copyByLocale.en.roadmap, eyebrow: '第 3 步', title: '资料齐全后再推进下一步', text: '取得资料或成果后再勾选。进度显示还缺什么，不代表已获准开工。', done: '准备度', steps: [
    { title: '确定需求与服务水平', detail: '确认进水量与出水量、用水高峰、各用途水质、可接受停水时间和备用水源。', output: '设计要求和一天内各时段的用水量' },
    { title: '核查场地、既有资料和限制', detail: '核查坐标、土地权利、钻机通道、污染风险、既有管网、邻井和SmartGIS。', output: '场地平面图与风险清单' },
    { title: '确认许可与责任人', detail: '确认钻井和用水许可、受理机关、合格承包方及其他经营许可义务。', output: '许可清单及每项负责人' },
    { title: '依据证据调查、设计与钻井', detail: '依据水文地质选择井位，并按实际钻遇地层调整井结构。', output: '土层岩层记录和实际建成的水井结构' },
    { title: '洗井、抽水试验与水质分析', detail: '记录流量、降深、恢复、含砂量及有代表性的水质。', output: '建议开采量、基线和实验室结果' },
    { title: '设计处理、储水和备用系统', detail: '依据检测结果设置主备设备、仪表、报警、旁路和水质分区。', output: '管道与仪表图（P&ID）、设备表和控制说明' },
    { title: '调试、移交与运行', detail: '按实际用水情况试运行，培训人员，并确定性能指标、取样点和关键备件。', output: '验收记录、运维手册和基线' },
  ] },
  architecture: { ...copyByLocale.en.architecture, eyebrow: '第 4 步', title: '让水井、处理、储水和用户作为一个系统运行', text: '合格系统必须控制水质、压力、备用和检修，而不只是井里有水。', imageAlt: '含水井、水处理、储水、备用水源及多用途供水的韧性系统', caption: '典型流程：受保护井口 → 原水缓冲与取样 → 水处理 → 净水储存 → 用水点。备用设备必须能够实际测试。', principles: [
    { title: '区分水量与水质', text: '出水量足够不代表所有用途都适用同一水质；应按用途设定处理与验收标准。' },
    { title: '用储水错开抽水与用水时间', text: '按一天内各时段的用水量配置水箱，帮助减少水泵频繁启停，并让处理设备按设计要求运行。' },
    { title: '避免一台设备故障使备用系统也停机', text: '检查水源、水泵、供电、控制和关键备件，并建立可执行的切换步骤。' },
    { title: '让仪表回答关键问题', text: '应能看出取水量、损耗、处理后水质以及造成高峰的具体用途。' },
  ] },
  handover: { ...copyByLocale.en.handover, eyebrow: '第 5 步', title: '验收系统前应检查什么？', text: '开工前把成果列入范围，并把付款节点与可测测试结果关联。', groups: [
    { title: '井体与性能', items: ['钻井记录、材料、滤管与封隔深度', '洗井、抽水试验、水位与恢复数据', '建议开采量、运行限制与含砂基线'] },
    { title: '水质与处理', items: ['样品交接记录及原水/处理后检测结果', '按用途设置验收限值', '管道与仪表图、控制设定、报警、化学品安全数据表（SDS）及耗材'] },
    { title: '机电与控制', items: ['泵曲线、工况点、电机保护及测试记录', '主备泵、备用水源和备用电源测试', '设备标签、备件清单及竣工图'] },
    { title: '合规与运维', items: ['许可证、报告要求与续期责任人', '运维手册、维护计划和培训记录', '流量、压力、水位、水质、能耗和振动基线'] },
  ] },
  operate: { ...copyByLocale.en.operate, eyebrow: '按趋势运维', title: '在系统停机前看到劣化', text: '实际周期取决于许可、厂家要求、风险和用途。请以此为起点编写现场操作规程。', rows: [
    { when: '每班 / 每日', actions: '检查报警、流量、压力、液位、异常颜色或气味、噪声与振动。', record: '运行日志与异常记录' },
    { when: '每周', actions: '检查泄漏、井口、控制柜和耗材；按已确定的操作规程测试备用设备。', record: '检查清单' },
    { when: '每月', actions: '复核抽水量、进出水量、每立方米能耗、水位及许可报告义务。', record: '月度性能复核' },
    { when: '按风险 / 计划', actions: '取样、校准仪表、维护设备并演练应急响应。', record: '检测、校准和维护历史' },
  ] },
  sources: { ...copyByLocale.en.sources, eyebrow: '官方核查点', title: '批准施工前核实最新规定', text: '要求取决于地点、水量、用途和设施类型。本页链接泰国地下水资源厅官方资料，复核日期：2026年8月4日。', links: [
    { label: '钻井与地下水使用许可流程及表格', href: sourceLinks.permit }, { label: '许可审查标准', href: sourceLinks.criteria }, { label: '生活饮用地下水水质标准', href: sourceLinks.quality }, { label: '泰国地下水资源厅水质分析服务', href: sourceLinks.lab }, { label: '地下水SmartGIS地图系统', href: sourceLinks.map },
  ] },
  next: { title: '准备把工作表变成现场工作范围？', text: '请提供坐标、平面图、用水量、既有检测结果和不可停水时段。', contact: '咨询团队', tools: '技术计算工具', law: '法规指南' },
}

copyByLocale.ja = {
  ...copyByLocale.en,
  overview: { ...copyByLocale.en.overview, eyebrow: '事業主向け計画ガイド', title: '「水が必要」を検証可能なシステム計画へ', text: '水文地質、設計、施工、許認可の担当者と協議する前に、根拠のあるプロジェクト要件を整理します。', items: ['施設規模だけでなく実測使用量を基準にする', '用途を必要水質と重要度で分ける', '貯留、予備水源、停止計画を初期から組み込む', '測定できる性能と完成図書で検収する'], imageAlt: '工場、ホテルとリゾート、農業、工事排水の地下水システム', caption: '4つの用途、1つの原則。現地データから始め、水源・揚水・処理・貯留・監視を一体で設計します。' },
  choose: { ...copyByLocale.en.choose, eyebrow: 'ステップ 1', title: 'どの用途の水システムを計画しますか？', text: '近い用途を選ぶと、準備する内容と使用水量の入力項目を確認できます。', labels: { factory: '工場', hospitality: 'ホテル・リゾート', agriculture: '農業', dewatering: '工事排水' }, descriptions: { factory: '工程継続性、用途別水質、生産停止の影響。', hospitality: '稼働率ピーク、季節性、衛生、ランドリー、厨房、植栽。', agriculture: '作物需要、季節、灌漑方式、水質、エネルギー費。', dewatering: '掘削周辺の地下水制御、安定、放流、近隣影響。' }, priorityLabel: '初期に確認する項目', priorities: { factory: ['工程、冷却、ボイラー、生活用水を分ける', '設備入口水質と断水影響を定義する', '工場・環境・排水要件も確認する'], hospitality: ['客室、厨房、ランドリー、プール、空調、植栽を分ける', '稼働率、イベント、乾季、停電リスクを確認する', '飲用・生活・植栽用水の採水点を決める'], agriculture: ['作物、面積、灌漑方式、実際のピーク期から計算する', '土壌・作物・散水器・目詰まりへの水質影響を確認する', '貯留、ゾーン、揚水時間を電力と許可条件に合わせる'], dewatering: ['ポンプ台数決定前に地層、水位、試験資料を得る', '主予備容量、水位監視、沈殿処理、許可された放流先を設ける', '沈下、濁度、近隣井戸・構造物への影響を監視し緊急計画を持つ'] } },
  calculator: { ...copyByLocale.en.calculator, eyebrow: 'ステップ 2', title: '1日にどれくらい水が必要ですか？', text: 'メーター、請求書、生産記録、根拠のある推計から日平均使用量を入力します。結果は予備計画値であり、井戸揚水量の保証ではありません。', useTitle: '用途別需要', assumptionsTitle: '設計前提', uses: { core: '主要工程 / 客室', laundry: 'ランドリー・清掃', kitchen: '厨房・飲食', cooling: '冷却 / 空調 / ボイラー補給', landscape: '植栽・プール・屋外', other: 'その他・既知の損失' }, unit: 'm³/日', targetShare: '地下水の目標比率', pumpHours: '計画揚水時間/日', reserve: '成長・不確実性の余裕', backupHours: '主水源停止時の予備時間', usableStorage: 'タンク有効率', resultsTitle: '予備設計フレーム', currentDemand: '現在需要', designDemand: '余裕込み需要', groundwaterTarget: '地下水目標量', preliminaryFlow: '必要平均揚水量', usableTank: '必要有効貯留量', nominalTank: '概算公称タンク容量', warning: 'ポンプ選定や水量保証の前に、揚水試験、帯水層の持続性、許可条件で確認してください。', copyBrief: 'プロジェクト要件をコピー', copied: 'コピーしました', briefTitle: '地下水プロジェクト初期要件', noDemand: '少なくとも1用途の水量を入力してください' },
  roadmap: { ...copyByLocale.en.roadmap, eyebrow: 'ステップ 3', title: '必要な資料をそろえてから次へ進む', text: '資料や成果物がそろったらチェックします。進捗は不足項目を示すもので、着工の承認ではありません。', done: '準備度', steps: [
    { title: '需要とサービスレベルを定義', detail: '入ってくる水量と使われる水量、使用ピーク、用途別水質、許容停止時間、予備水源を確認します。', output: '設計条件と時間帯別の使用水量' },
    { title: '敷地・既存資料・制約を確認', detail: '座標、土地権利、掘削機アクセス、汚染リスク、既設配管、近隣井戸、SmartGISを確認します。', output: '配置図とリスク台帳' },
    { title: '許認可と責任者を確認', detail: '掘削・使用許可、申請先、有資格者、施設に関係する他の義務を確認します。', output: '許認可の一覧と各項目の担当者' },
    { title: '根拠に基づく調査・設計・掘削', detail: '水文地質から位置を選定し、実際の地層に合わせて井戸構造を更新します。', output: '土や岩の層の記録と実際に完成した井戸の構造' },
    { title: '井戸洗浄・揚水試験・水質分析', detail: '流量、水位低下、回復、砂、有効な水質試料を記録します。', output: '推奨揚水量、基準値、分析結果' },
    { title: '処理・貯留・予備システム設計', detail: '分析結果から主予備機、計器、警報、バイパス、水質区分を定義します。', output: '配管・計装図（P&ID）、機器一覧、制御の方針' },
    { title: '試運転・引渡し・運用', detail: '実際の使用条件で試験し、担当者を教育します。性能の確認項目、採水点、重要な予備品も決めます。', output: '検収記録、運転・保守手順書、基準値' },
  ] },
  architecture: { ...copyByLocale.en.architecture, eyebrow: 'ステップ 4', title: '井戸・処理・タンク・使用先を一体で機能させる', text: '良いシステムは水が出るだけでなく、水質、圧力、予備、保守停止を管理します。', imageAlt: '井戸、水処理、貯留、予備水源、複数用途を備えた地下水システム', caption: '代表的な流れ：保護された井戸 → 原水バッファと採水 → 処理 → 処理水タンク → 使用先。予備設備は実際に試験できることが重要です。', principles: [
    { title: '水量と水質を分ける', text: '十分な揚水量でも、全用途に同じ水質が適するとは限りません。用途別に処理と検収基準を定めます。' },
    { title: '貯水で揚水と使用の時間をずらす', text: '時間帯別の使用水量からタンク容量を決めます。ポンプの頻繁な起動停止を減らし、処理設備を設計に沿って運転する助けになります。' },
    { title: '1台の故障で予備系統も止まらないようにする', text: '水源、ポンプ、電源、制御、重要予備品と、実行可能な切替手順を確認します。' },
    { title: '必要な問いを計測する', text: '取水量、損失、処理後水質、ピークを作る用途が分かる計器を配置します。' },
  ] },
  handover: { ...copyByLocale.en.handover, eyebrow: 'ステップ 5', title: '引き渡し前に何を確認しますか？', text: '着工前に成果物を仕様へ入れ、測定可能な試験結果を支払条件にします。', groups: [
    { title: '井戸と性能', items: ['土や岩の層の記録、材質、取水管と遮水部分の深度', '洗浄、揚水試験、水位、回復データ', '推奨揚水量、運転制限、砂の基準値'] },
    { title: '水質と処理', items: ['試料管理記録と原水・処理水分析結果', '用途別の検収限界値', '配管・計装図、制御設定、警報、化学品の安全データシート（SDS）、消耗品'] },
    { title: '機械・電気・制御', items: ['ポンプ曲線、運転点、電動機保護、試験記録', '主予備機、予備水源、予備電源の試験', '機器タグ、予備品表、完成図'] },
    { title: '法令と運用', items: ['許可、報告、更新の責任者', '運転・保守手順書、保守計画、教育記録', '流量、圧力、水位、水質、電力、振動の基準値'] },
  ] },
  operate: { ...copyByLocale.en.operate, eyebrow: '傾向で運転管理', title: '停止する前に劣化を見つける', text: '実際の周期は許可、メーカー、リスク、用途によります。現場の運転手順を作る際の出発点にしてください。', rows: [
    { when: '各シフト / 毎日', actions: '警報、流量、圧力、水位、色・臭い、音、振動を確認します。', record: '運転日誌と異常記録' },
    { when: '毎週', actions: '漏れ、井戸口、制御盤、消耗品を点検し、定めた運転手順に従って予備機を試験します。', record: '点検チェックリスト' },
    { when: '毎月', actions: '揚水量、入水量と使用水量、m³当たり電力、水位、許可に基づく報告を確認します。', record: '月次性能レビュー' },
    { when: 'リスク / 計画に応じて', actions: '採水、計器校正、機器保全、緊急対応訓練を行います。', record: '分析・校正・保全履歴' },
  ] },
  sources: { ...copyByLocale.en.sources, eyebrow: '公式確認先', title: '工事承認前に最新要件を確認', text: '要件は場所、水量、用途、施設種別で変わります。タイ地下水資源局の公式資料へリンクしています。確認日：2026年8月4日。', links: [
    { label: '掘削・地下水使用許可の手順と様式', href: sourceLinks.permit }, { label: '許可審査の基準', href: sourceLinks.criteria }, { label: '飲用地下水の水質基準', href: sourceLinks.quality }, { label: '地下水資源局の水質分析サービス', href: sourceLinks.lab }, { label: '地下水資源局SmartGIS', href: sourceLinks.map },
  ] },
  next: { title: 'ワークシートを現地仕様へ進めますか？', text: '位置、配置図、需要、既存分析、断水できない時間帯をお知らせください。', contact: 'チームに相談', tools: '技術計算ツール', law: '法規ガイド' },
}

export default function GroundwaterOwnerGuide({ locale = 'th' }: { locale?: LocalizedLocale; localized?: boolean }) {
  const copy = copyByLocale[locale]
  const quickNav = quickNavByLocale[locale]
  const contextVisual = contextVisualByLocale[locale]
  const [facility, setFacility] = useState<Facility>('factory')
  const [usesDraft, setUses] = useState<Record<UseKey, string>>({ core: '0', laundry: '0', kitchen: '0', cooling: '0', landscape: '0', other: '0' })
  const uses = useMemo(() => Object.fromEntries(Object.entries(usesDraft).map(([key, raw]) => [key, validateNumericDraft(raw, { min: 0, max: 100000 }).value ?? 0])) as Record<UseKey, number>, [usesDraft])
  const [targetShareDraft, setTargetShare] = useState('70')
  const targetShare = validateNumericDraft(targetShareDraft, { min: 0, max: 100 }).value ?? 0
  const [pumpHoursDraft, setPumpHours] = useState('16')
  const pumpHours = validateNumericDraft(pumpHoursDraft, { min: 1, max: 24 }).value ?? 0
  const [reserveDraft, setReserve] = useState('20')
  const reserve = validateNumericDraft(reserveDraft, { min: 0, max: 100 }).value ?? 0
  const [backupHoursDraft, setBackupHours] = useState('12')
  const backupHours = validateNumericDraft(backupHoursDraft, { min: 0, max: 168 }).value ?? 0
  const [usableStorageDraft, setUsableStorage] = useState('85')
  const usableStorage = validateNumericDraft(usableStorageDraft, { min: 1, max: 100 }).value ?? 0
  const progress = useLearningProgress('owner')
  const completed = progress.checked
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const inputsValid = Object.values(usesDraft).every((raw) => !validateNumericDraft(raw, { min: 0, max: 100000 }).error)
    && !validateNumericDraft(targetShareDraft, { min: 0, max: 100 }).error
    && !validateNumericDraft(pumpHoursDraft, { min: 1, max: 24 }).error
    && !validateNumericDraft(reserveDraft, { min: 0, max: 100 }).error
    && !validateNumericDraft(backupHoursDraft, { min: 0, max: 168 }).error
    && !validateNumericDraft(usableStorageDraft, { min: 1, max: 100 }).error

  const calculation = useMemo(() => {
    const daily = Object.values(uses).reduce((sum, value) => sum + Math.max(0, Number.isFinite(value) ? value : 0), 0)
    const design = daily * (1 + reserve / 100)
    const groundwaterDaily = design * targetShare / 100
    const plan = calculateGroundwaterPlan({ dailyDemand: groundwaterDaily, pumpHours, reservePercent: 0 })
    const storage = calculateStoragePlan({ dailyDemand: design, backupHours, usablePercent: usableStorage })
    return { daily, design, groundwaterDaily, requiredFlow: plan.requiredFlow, ...storage }
  }, [uses, reserve, targetShare, pumpHours, backupHours, usableStorage])

  const format = (value: number) => new Intl.NumberFormat(locale === 'th' ? 'th-TH' : locale, { maximumFractionDigits: 1 }).format(value)
  const readiness = Math.round(completed.length / copy.roadmap.steps.length * 100)
  const useLabels = useLabelsByLocale[locale][facility]

  const selectFacility = (nextFacility: Facility) => {
    setFacility(nextFacility)
    if (nextFacility === 'dewatering' && targetShare === 70) setTargetShare('100')
  }

  const brief = [
    copy.calculator.briefTitle,
    `${copy.choose.labels[facility]} — ${copy.choose.descriptions[facility]}`,
    ...Object.entries(uses).map(([key, value]) => `${useLabels[key as UseKey]}: ${format(value)} ${copy.calculator.unit}`),
    `${copy.calculator.currentDemand}: ${format(calculation.daily)} ${copy.calculator.unit}`,
    `${copy.calculator.designDemand}: ${format(calculation.design)} ${copy.calculator.unit}`,
    `${copy.calculator.groundwaterTarget}: ${format(calculation.groundwaterDaily)} ${copy.calculator.unit} (${targetShare}%)`,
    `${copy.calculator.preliminaryFlow}: ${format(calculation.requiredFlow)} m³/h (${pumpHours} h/day)`,
    `${copy.calculator.usableTank}: ${format(calculation.requiredUsableStorage)} m³ (${backupHours} h)`,
    `${copy.calculator.nominalTank}: ${format(calculation.nominalTankVolume)} m³`,
    '', copy.calculator.warning,
  ].join('\n')

  const copyBrief = async () => {
    if (!inputsValid) return
    setCopyFailed(false)
    try {
      await navigator.clipboard.writeText(brief)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopyFailed(true)
    }
  }

  return (
    <div className="gog-shell">
      <details className="gog-navigation">
        <summary>{contextVisual.navLabel}</summary>
        <nav className="gog-quick-nav" aria-label={contextVisual.navLabel}>
          {quickNav.map((item, index) => <a href={item.href} key={item.href} onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.currentTarget.closest('details')?.removeAttribute('open'); document.getElementById(item.href.slice(1))?.focus({ preventScroll: true }) }}><span>{index + 1}</span>{item.label}</a>)}
        </nav>
      </details>

      <section className="gog-section" id="facility-profile" tabIndex={-1}>
        <div className="gog-section-heading"><p className="gog-eyebrow">{copy.choose.eyebrow}</p><h2>{copy.choose.title}</h2><p>{copy.choose.text}</p></div>
        <div className="gog-facility-grid" role="group" aria-label={copy.choose.title}>
          {(Object.keys(copy.choose.labels) as Facility[]).map((key) => { const Icon = facilityIcons[key]; return <button key={key} type="button" className={facility === key ? 'is-active' : ''} id={`gog-facility-${key}`} aria-pressed={facility === key} aria-controls="gog-priority-panel" onClick={() => selectFacility(key)}><span><strong><Icon aria-hidden="true" />{copy.choose.labels[key]}</strong><small>{copy.choose.descriptions[key]}</small></span>{facility === key && <Check aria-hidden="true" className="gog-selected" />}</button> })}
        </div>
        <div className="gog-priority-panel" id="gog-priority-panel" role="region" aria-labelledby={`gog-facility-${facility}`} aria-live="polite"><div><strong><Sparkles aria-hidden="true" />{copy.choose.priorityLabel}: {copy.choose.labels[facility]}</strong></div><ul>{copy.choose.priorities[facility].map((item) => <li key={item}>{item}</li>)}</ul></div>
        <a className="gog-continue" href="#water-balance" onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; document.getElementById('water-balance')?.focus({ preventScroll: true }) }}>{quickNav[1].label}<ArrowRight aria-hidden="true" /></a>
      </section>

      <section className="gog-section gog-calculator" id="water-balance" tabIndex={-1}>
        <div className="gog-section-heading"><p className="gog-eyebrow">{copy.calculator.eyebrow}</p><h2>{copy.calculator.title}</h2><p>{copy.calculator.text}</p></div>
        <div className="gog-calculator-layout">
          <div className="gog-input-panel"><h3><Droplets aria-hidden="true" />{copy.calculator.useTitle}: {copy.choose.labels[facility]}</h3><div className="gog-use-list">{(Object.keys(uses) as UseKey[]).map((key) => <NumericInput key={key} id={`gog-use-${key}`} locale={locale} label={useLabels[key]} value={usesDraft[key]} onChange={(value) => setUses((current) => ({ ...current, [key]: value }))} unit={copy.calculator.unit} min={0} max={100000} />)}</div>
            <h3><Gauge aria-hidden="true" />{copy.calculator.assumptionsTitle}</h3><div className="gog-assumption-grid">
              <NumericInput id="gog-target-share" locale={locale} label={copy.calculator.targetShare} value={targetShareDraft} onChange={setTargetShare} unit="%" min={0} max={100} />
              <NumericInput id="gog-pump-hours" locale={locale} label={copy.calculator.pumpHours} value={pumpHoursDraft} onChange={setPumpHours} unit="h" min={1} max={24} />
              <NumericInput id="gog-reserve" locale={locale} label={copy.calculator.reserve} value={reserveDraft} onChange={setReserve} unit="%" min={0} max={100} />
              <NumericInput id="gog-backup-hours" locale={locale} label={copy.calculator.backupHours} value={backupHoursDraft} onChange={setBackupHours} unit="h" min={0} max={168} />
              <NumericInput id="gog-usable-storage" locale={locale} label={copy.calculator.usableStorage} value={usableStorageDraft} onChange={setUsableStorage} unit="%" min={1} max={100} />
            </div>
          </div>
          <aside className="gog-results" aria-live="polite">{inputsValid ? <><p className="gog-eyebrow">{copy.calculator.resultsTitle}</p>{calculation.daily === 0 && <p className="gog-empty-result">{copy.calculator.noDemand}</p>}<div className="gog-result-grid">
            <div><span>{copy.calculator.currentDemand}</span><strong>{format(calculation.daily)}</strong><small>{copy.calculator.unit}</small></div>
            <div><span>{copy.calculator.designDemand}</span><strong>{format(calculation.design)}</strong><small>{copy.calculator.unit}</small></div>
            <div><span>{copy.calculator.groundwaterTarget}</span><strong>{format(calculation.groundwaterDaily)}</strong><small>{copy.calculator.unit}</small></div>
            <div><span>{copy.calculator.preliminaryFlow}</span><strong>{format(calculation.requiredFlow)}</strong><small>m³/h</small></div>
            <div><span>{copy.calculator.usableTank}</span><strong>{format(calculation.requiredUsableStorage)}</strong><small>m³</small></div>
            <div><span>{copy.calculator.nominalTank}</span><strong>{format(calculation.nominalTankVolume)}</strong><small>m³</small></div>
          </div><p className="gog-result-note"><ShieldCheck aria-hidden="true" />{copy.calculator.warning}</p><button type="button" onClick={copyBrief}><Copy aria-hidden="true" />{copied ? copy.calculator.copied : copy.calculator.copyBrief}</button>{copyFailed && <p role="status">{learningFeedback[locale].copyFailed}</p>}</> : <p className="learning-number-error" role="status">{learningFeedback[locale].incomplete}</p>}</aside>
        </div>
      </section>

      <section className="gog-section" id="project-roadmap" tabIndex={-1}>
        <div className="gog-section-heading gog-roadmap-heading"><div><p className="gog-eyebrow">{copy.roadmap.eyebrow}</p><h2>{copy.roadmap.title}</h2><p>{copy.roadmap.text}</p></div><div className="gog-progress" role="status"><strong>{readiness}%</strong><span>{copy.roadmap.done}</span><div><i style={{ width: `${readiness}%` }} /></div></div></div>
        <div className="gog-roadmap">{copy.roadmap.steps.map((step, index) => { const checked = completed.includes(progress.ids[index]); return <article key={step.title} className={checked ? 'is-complete' : ''}><button type="button" aria-pressed={checked} disabled={!progress.ready} onClick={() => progress.toggle(progress.ids[index])}><span><strong><span className="gog-step-marker">{checked ? <Check aria-hidden="true" /> : index + 1}</span>{step.title}</strong><small>{step.detail}</small><em><FileCheck2 aria-hidden="true" />{step.output}</em><small className="gog-mark-action">{checked ? learningFeedback[locale].markIncomplete : learningFeedback[locale].markComplete}</small></span></button></article> })}</div>
        <LearningProgress locale={locale} checklist="owner" progress={progress} />
      </section>

      <section className="gog-section gog-architecture" id="system-design" tabIndex={-1}>
        <div className="gog-section-heading"><p className="gog-eyebrow">{copy.architecture.eyebrow}</p><h2>{copy.architecture.title}</h2><p>{copy.architecture.text}</p></div>
        <details className="gog-context-details">
          <summary>{copy.overview.title}</summary>
          <div className="gog-overview">
            <div className="gog-overview-copy"><p>{copy.overview.text}</p><ul>{copy.overview.items.map((item) => <li key={item}><CheckCircle2 aria-hidden="true" />{item}</li>)}</ul></div>
            <figure><Image src="/images/learning/groundwater-owner-guide/four-context-groundwater-guide.webp" alt={copy.overview.imageAlt} width={1600} height={900} /><figcaption>{copy.overview.caption}</figcaption></figure>
          </div>
          <figure className="gog-context-visual"><Image src="/images/learning/groundwater-owner-guide/agriculture-dewatering-systems.webp" alt={contextVisual.alt} width={1600} height={900} /><figcaption>{contextVisual.caption}</figcaption></figure>
        </details>
        <figure><Image src="/images/learning/groundwater-owner-guide/resilient-water-system.webp" alt={copy.architecture.imageAlt} width={1600} height={900} /><figcaption>{copy.architecture.caption}</figcaption></figure>
        <div className="gog-principles">{copy.architecture.principles.map((item, index) => { const icons = [FlaskConical, Droplets, ShieldCheck, Gauge]; const Icon = icons[index]; return <article key={item.title}><h3><Icon aria-hidden="true" />{item.title}</h3><p>{item.text}</p></article> })}</div>
      </section>

      <section className="gog-section" id="handover-operation" tabIndex={-1}>
        <div className="gog-section-heading"><p className="gog-eyebrow">{copy.handover.eyebrow}</p><h2>{copy.handover.title}</h2><p>{copy.handover.text}</p></div>
        <div className="gog-handover-grid">{copy.handover.groups.map((group, index) => { const icons = [HardHat, FlaskConical, Wrench, ClipboardCheck]; const Icon = icons[index]; return <article key={group.title}><div><h3><Icon aria-hidden="true" />{group.title}</h3></div><ul>{group.items.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul></article> })}</div>
      </section>

      <section className="gog-section">
        <div className="gog-section-heading"><p className="gog-eyebrow">{copy.operate.eyebrow}</p><h2>{copy.operate.title}</h2><p>{copy.operate.text}</p></div>
        <div className="gog-operations">{copy.operate.rows.map((row) => <article key={row.when}><strong>{row.when}</strong><p>{row.actions}</p><span>{row.record}</span></article>)}</div>
      </section>

      <section className="gog-section gog-sources">
        <div className="gog-section-heading"><p className="gog-eyebrow">{copy.sources.eyebrow}</p><h2>{copy.sources.title}</h2><p>{copy.sources.text}</p></div>
        <div className="gog-source-links">{copy.sources.links.map((source, index) => { const icons = [FileCheck2, Landmark, FlaskConical, ClipboardCheck, MapPinned]; const Icon = icons[index]; return <a href={source.href} target="_blank" rel="noopener noreferrer" key={source.href}><Icon aria-hidden="true" /><span>{source.label}</span><ExternalLink aria-hidden="true" /></a> })}</div>
      </section>

      <aside className="gog-next"><div><p className="gog-eyebrow">NEXT STEP</p><h2>{copy.next.title}</h2><p>{copy.next.text}</p></div><div><Link href={localePath('/contact', locale)}>{copy.next.contact}<ArrowRight aria-hidden="true" /></Link><Link href={localePath('/learn/groundwater-calculator-tools', locale)} className="is-secondary">{copy.next.tools}</Link><Link href={localePath('/learn/groundwater-law-regulation-thailand', locale)} className="is-secondary">{copy.next.law}</Link></div></aside>
    </div>
  )
}
