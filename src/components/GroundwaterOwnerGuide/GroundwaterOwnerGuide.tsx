'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Building2,
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
  Wrench,
} from 'lucide-react'
import { localePath, type LocalizedLocale } from '@/i18n/config'
import {
  calculateGroundwaterPlan,
  calculateStoragePlan,
} from '@/lib/groundwater-calculator'
import './GroundwaterOwnerGuide.css'

type Facility = 'factory' | 'hotel' | 'resort'
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

const facilityIcons = { factory: Factory, hotel: Hotel, resort: Building2 }

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
      eyebrow: 'OWNER’S PLANNING GUIDE', title: 'เปลี่ยน “อยากมีบ่อ” ให้เป็นระบบน้ำที่วางแผนได้',
      text: 'คู่มือนี้ช่วยเจ้าของกิจการรวบรวมความต้องการใช้น้ำ ตรวจจุดเสี่ยง และกำหนดหลักฐานรับมอบก่อนคุยกับนักธรณีวิทยา วิศวกร ผู้รับจ้าง และหน่วยงานอนุญาต',
      items: ['คำนวณจากข้อมูลใช้จริง ไม่เดาปริมาณน้ำจากขนาดกิจการ', 'แยกน้ำตามคุณภาพและความสำคัญของจุดใช้', 'วางแหล่งสำรอง ถัง และแผนหยุดระบบตั้งแต่ต้น', 'รับมอบด้วยค่าที่วัดได้และเอกสารตามสภาพจริง'],
      imageAlt: 'ภาพโรงงาน โรงแรม และรีสอร์ทกับบ่อน้ำบาดาลและระบบปรับปรุงน้ำ', caption: 'กิจการต่างกัน แต่หลักคิดเหมือนกัน: เริ่มจาก water balance แล้วออกแบบบ่อ ระบบปรับปรุง ถัง และแหล่งสำรองให้ทำงานเป็นระบบเดียว',
    },
    choose: {
      eyebrow: 'เลือกบริบทก่อน', title: 'ความเสี่ยงหลักของแต่ละกิจการไม่เหมือนกัน', text: 'เลือกประเภทที่ใกล้เคียงที่สุดเพื่อจัดลำดับหัวข้อด้านล่าง คุณยังต้องยืนยันตัวเลขและมาตรฐานเฉพาะของสถานประกอบการจริง',
      labels: { factory: 'โรงงาน', hotel: 'โรงแรม', resort: 'รีสอร์ท' },
      descriptions: { factory: 'เน้นความต่อเนื่องของกระบวนการ คุณภาพเฉพาะจุด และผลกระทบต่อการผลิต', hotel: 'เน้นพีกตามจำนวนผู้เข้าพัก สุขอนามัย ซักรีด ครัว และประสบการณ์ลูกค้า', resort: 'เน้นฤดูกาล พื้นที่กระจาย ระบบภูมิทัศน์ และความพร้อมเมื่อแหล่งหลักขัดข้อง' },
      priorityLabel: 'ประเด็นที่ควรยืนยันก่อน',
      priorities: {
        factory: ['แยก process, cooling, boiler และ domestic water', 'กำหนดคุณภาพรับเข้าเครื่องจักรและผลกระทบเมื่อหยุดน้ำ', 'ตรวจข้อกำหนดโรงงาน สิ่งแวดล้อม และการระบายน้ำร่วมด้วย'],
        hotel: ['แยกห้องพัก ครัว ซักรีด สระ และระบบปรับอากาศ', 'ออกแบบถังให้รับมือช่วง check-in และงานจัดเลี้ยง', 'กำหนดจุดตรวจคุณภาพน้ำดื่มและน้ำใช้ให้ชัด'],
        resort: ['แยกอาคารพัก สระ ภูมิทัศน์ และพื้นที่ห่างไกล', 'ตรวจฤดูท่องเที่ยวเทียบฤดูแล้งและช่วงไฟฟ้าดับ', 'พิจารณาการนำน้ำที่เหมาะสมกลับใช้กับภูมิทัศน์'],
      },
    },
    calculator: {
      eyebrow: 'WATER BALANCE WORKSHEET', title: 'คำนวณโจทย์ตั้งต้นจากการใช้น้ำจริง', text: 'กรอกปริมาณเฉลี่ยต่อวันจากมิเตอร์ บิลน้ำ บันทึกการผลิต หรือประมาณการที่มีที่มา ผลลัพธ์เป็นข้อมูลวางแผนเบื้องต้น ไม่ใช่คำรับรองว่าบ่อจะให้น้ำได้ตามต้องการ',
      useTitle: 'ปริมาณน้ำตามจุดใช้', assumptionsTitle: 'สมมติฐานการออกแบบ',
      uses: { core: 'กระบวนการหลัก / ห้องพัก', laundry: 'ซักรีดและทำความสะอาด', kitchen: 'ครัว อาหาร และเครื่องดื่ม', cooling: 'หล่อเย็น / HVAC / boiler makeup', landscape: 'ภูมิทัศน์ สระ และงานภายนอก', other: 'อื่น ๆ และการสูญเสียที่ทราบ' }, unit: 'ม³/วัน',
      targetShare: 'สัดส่วนที่ต้องการให้น้ำบาดาลรองรับ', pumpHours: 'ชั่วโมงสูบที่วางแผนต่อวัน', reserve: 'เผื่อเติบโต/ความไม่แน่นอน', backupHours: 'ชั่วโมงสำรองเมื่อแหล่งหลักหยุด', usableStorage: 'ปริมาตรถังที่ใช้งานได้จริง',
      resultsTitle: 'กรอบออกแบบเบื้องต้น', currentDemand: 'ความต้องการปัจจุบัน', designDemand: 'ความต้องการหลังเผื่อ', groundwaterTarget: 'เป้าหมายน้ำบาดาล', preliminaryFlow: 'อัตราสูบเฉลี่ยที่ต้องการ', usableTank: 'น้ำสำรองที่ต้องใช้', nominalTank: 'ขนาดถัง nominal โดยประมาณ',
      warning: 'ต้องยืนยันอัตราสูบด้วยการสูบทดสอบ ตรวจความยั่งยืนของชั้นน้ำ และตรวจเงื่อนไขใบอนุญาต ก่อนเลือกปั๊มหรือรับประกันกำลังผลิต', copyBrief: 'คัดลอก project brief', copied: 'คัดลอกแล้ว', briefTitle: 'ข้อมูลตั้งต้นโครงการน้ำบาดาล', noDemand: 'เริ่มจากกรอกปริมาณน้ำอย่างน้อยหนึ่งจุดใช้',
    },
    roadmap: {
      eyebrow: 'PROJECT GATES', title: 'เดินโครงการเป็นด่าน ไม่ข้ามหลักฐานสำคัญ', text: 'ติ๊กเมื่อทีมมีข้อมูลหรือผลส่งมอบจริง แถบความพร้อมช่วยให้เห็นว่ายังขาดอะไร ไม่ได้ใช้แทนการอนุมัติของผู้มีอำนาจ', done: 'ความพร้อม',
      steps: [
        { title: 'นิยามความต้องการและระดับบริการ', detail: 'ยืนยัน water balance ช่วงพีก คุณภาพแต่ละจุดใช้ เวลาหยุดระบบที่ยอมรับได้ และแหล่งสำรอง', output: 'Design basis และ load profile' },
        { title: 'ตรวจพื้นที่ ข้อมูลเดิม และข้อจำกัด', detail: 'ตรวจพิกัด สิทธิในที่ดิน ทางเข้าเครื่องเจาะ แหล่งปนเปื้อน ระบบท่อเดิม บ่อใกล้เคียง และ SmartGIS', output: 'แผนผังพื้นที่และ risk register' },
        { title: 'ยืนยันกฎหมายและขอบเขตผู้รับผิดชอบ', detail: 'ตรวจผู้รับคำขอ ใบอนุญาตเจาะ ใบอนุญาตใช้ ผู้รับจ้างที่มีคุณสมบัติ และข้อกำหนดกิจการอื่นที่เกี่ยวข้อง', output: 'Permit matrix และผู้รับผิดชอบแต่ละรายการ' },
        { title: 'สำรวจ ออกแบบ และเจาะตามข้อมูลจริง', detail: 'เลือกจุดด้วยข้อมูลอุทกธรณีวิทยา บันทึกชั้นดินหิน และปรับแบบบ่อตามชั้นน้ำที่พบ', output: 'Well log และ as-built construction' },
        { title: 'พัฒนาบ่อ สูบทดสอบ และตรวจน้ำ', detail: 'เก็บข้อมูลอัตราสูบ ระดับลด การฟื้นตัว ทราย และตัวอย่างน้ำด้วยวิธีที่เหมาะสม', output: 'Recommended yield, baseline และผลแล็บ' },
        { title: 'ออกแบบระบบปรับปรุง ถัง และระบบสำรอง', detail: 'เลือกกระบวนการจากผลตรวจจริง แยกคุณภาพตามจุดใช้ และวาง duty/standby, bypass, meter และ alarm', output: 'P&ID, equipment schedule และ control philosophy' },
        { title: 'ทดสอบ ส่งมอบ และวางแผนเดินระบบ', detail: 'commission ทั้งระบบภายใต้โหลดจริง อบรมผู้ปฏิบัติงาน และกำหนด KPI/จุดเก็บตัวอย่าง/อะไหล่สำคัญ', output: 'Acceptance record, O&M manual และ baseline' },
      ],
    },
    architecture: {
      eyebrow: 'RESILIENT SYSTEM', title: 'ออกแบบให้บ่อ ระบบปรับปรุง ถัง และจุดใช้คุยกันรู้เรื่อง', text: 'ระบบที่ดีไม่ใช่เพียงน้ำออกจากบ่อ แต่ต้องควบคุมคุณภาพ แรงดัน การสำรอง และการหยุดซ่อมโดยไม่ทำให้กิจการเสี่ยง',
      imageAlt: 'แผนผังระบบน้ำบาดาลที่มีบ่อ ปั๊ม ระบบปรับปรุง ถัง แหล่งสำรอง และจุดใช้งานหลายประเภท', caption: 'เส้นทางตัวอย่าง: บ่อที่ป้องกันการปนเปื้อน → ถังน้ำดิบ/จุดเก็บตัวอย่าง → ระบบปรับปรุง → ถังน้ำดี → จุดใช้ แหล่งสำรองและอุปกรณ์ standby ต้องทดสอบได้จริง',
      principles: [
        { title: 'แยก “ปริมาณ” ออกจาก “คุณภาพ”', text: 'บ่ออาจให้น้ำพอแต่คุณภาพไม่เหมาะกับทุกจุดใช้ จึงควรแยก treatment train และเกณฑ์น้ำตามหน้าที่' },
        { title: 'ถังช่วย decouple ระบบ', text: 'ถังที่กำหนดจาก load profile ลดการ start/stop ปั๊มและช่วยให้ระบบปรับปรุงเดินใกล้จุดออกแบบ' },
        { title: 'สำรองต้องไม่มี single point of failure', text: 'ทบทวนแหล่งน้ำสำรอง ปั๊ม ไฟฟ้า controller และชิ้นส่วนวิกฤต พร้อมวิธีสลับระบบที่ผู้ปฏิบัติงานทำได้' },
        { title: 'ติดมิเตอร์ตรงคำถาม', text: 'อย่างน้อยต้องตอบได้ว่าบ่อสูบเท่าไร ระบบสูญเสียตรงไหน คุณภาพหลังปรับปรุงเป็นอย่างไร และจุดใช้ใดเป็นพีก' },
      ],
    },
    handover: {
      eyebrow: 'ACCEPTANCE & HANDOVER', title: 'รับมอบสิ่งที่ตรวจย้อนกลับได้ ไม่รับเพียง “น้ำไหลแล้ว”', text: 'ระบุรายการนี้ในขอบเขตงานและผูกการจ่ายเงินกับผลทดสอบที่ตกลงกันก่อนเริ่มงาน',
      groups: [
        { title: 'ตัวบ่อและสมรรถนะ', items: ['well log, ขนาด/วัสดุ/ช่วงท่อกรองและอุดซีเมนต์', 'ผลพัฒนาบ่อ สูบทดสอบ ระดับน้ำ และ recovery', 'อัตราสูบแนะนำ ข้อจำกัดการเดินบ่อ และค่าฐานทราย'] },
        { title: 'คุณภาพและระบบปรับปรุง', items: ['chain of custody และผลแล็บก่อน–หลังระบบ', 'เกณฑ์รับมอบแยกตามจุดใช้และ intended use', 'P&ID, setpoint, alarm, chemical/SDS และรายการ consumable'] },
        { title: 'ไฟฟ้า เครื่องกล และระบบควบคุม', items: ['pump curve, duty point, motor protection และผลทดสอบ', 'การสลับ duty/standby, backup source และไฟสำรอง', 'tag อุปกรณ์ รายการอะไหล่ และแบบ as-built'] },
        { title: 'กฎหมายและการปฏิบัติงาน', items: ['ใบอนุญาต เอกสารรายงาน และผู้รับผิดชอบต่ออายุ', 'คู่มือ O&M ตารางบำรุงรักษา และบันทึกอบรม', 'baseline: flow, pressure, level, quality, energy และ vibration'] },
      ],
    },
    operate: {
      eyebrow: 'OPERATE BY TREND', title: 'ดูแนวโน้มก่อนระบบหยุด ไม่รอให้เกิดเหตุ', text: 'ความถี่จริงขึ้นกับใบอนุญาต คู่มือผู้ผลิต ความเสี่ยง และ intended use ตารางนี้เป็นกรอบเริ่มต้นให้ทีมกำหนด SOP ของตนเอง',
      rows: [
        { when: 'ทุกกะ / ทุกวัน', actions: 'ตรวจ alarm, flow, pressure, tank level, สี/กลิ่นผิดปกติ, เสียงและการสั่น', record: 'operator log และเหตุผิดปกติ' },
        { when: 'รายสัปดาห์', actions: 'ตรวจการรั่ว หัวบ่อ ตู้ควบคุม chemical/consumable และทดสอบปั๊ม standby ตาม SOP', record: 'inspection checklist' },
        { when: 'รายเดือน', actions: 'ทบทวนปริมาณสูบ เทียบ water balance พลังงานต่อม³ ระดับน้ำ และหน้าที่รายงานตามใบอนุญาต', record: 'monthly performance review' },
        { when: 'ตามความเสี่ยง/แผน', actions: 'เก็บตัวอย่างน้ำ สอบเทียบมิเตอร์ บำรุงรักษาปั๊ม/ระบบปรับปรุง และทบทวน emergency drill', record: 'lab, calibration และ maintenance history' },
      ],
    },
    sources: {
      eyebrow: 'OFFICIAL CHECKPOINTS', title: 'ตรวจข้อมูลล่าสุดกับแหล่งทางการก่อนอนุมัติงาน', text: 'ข้อกำหนดขึ้นกับพื้นที่ ปริมาณ วัตถุประสงค์ และประเภทกิจการ หน้านี้จึงสรุปหลักคิดและเชื่อมกลับไปยังข้อมูลของกรมทรัพยากรน้ำบาดาล ตรวจทาน 4 สิงหาคม 2569',
      links: [
        { label: 'ขั้นตอนและแบบคำขออนุญาตเจาะ/ใช้น้ำบาดาล', href: sourceLinks.permit },
        { label: 'หลักเกณฑ์ที่ใช้พิจารณาการอนุญาต', href: sourceLinks.criteria },
        { label: 'มาตรฐานคุณภาพน้ำบาดาลเพื่อการบริโภค', href: sourceLinks.quality },
        { label: 'บริการวิเคราะห์คุณภาพน้ำของกรมฯ', href: sourceLinks.lab },
        { label: 'ระบบแผนที่ SmartGIS ของกรมฯ', href: sourceLinks.map },
      ],
    },
    next: { title: 'พร้อมเปลี่ยน worksheet เป็นขอบเขตงานของพื้นที่จริง?', text: 'ส่งพิกัด แผนผัง ปริมาณน้ำ ผลตรวจเดิม และช่วงเวลาที่กิจการหยุดน้ำไม่ได้ให้ทีมงานช่วยทบทวน', contact: 'ปรึกษาทีมงาน', tools: 'เครื่องมือคำนวณช่าง', law: 'คู่มือกฎหมาย' },
  },
  en: {} as GuideCopy,
  zh: {} as GuideCopy,
  ja: {} as GuideCopy,
}

copyByLocale.en = {
  ...copyByLocale.th,
  overview: { eyebrow: 'OWNER’S PLANNING GUIDE', title: 'Turn “we need a well” into a water system that can be planned', text: 'Build an evidence-based brief before speaking with hydrogeologists, engineers, contractors and permit authorities.', items: ['Base demand on measured use, not facility size alone', 'Separate end uses by quality and criticality', 'Plan storage, backup and shutdowns from the start', 'Accept measurable performance and as-built records'], imageAlt: 'Factory, hotel and resort served by groundwater wells and treatment systems', caption: 'Different facilities, one discipline: begin with the water balance and design the well, treatment, storage and backup as one system.' },
  choose: { eyebrow: 'CHOOSE THE CONTEXT', title: 'Each facility has a different dominant risk', text: 'Choose the closest profile to prioritize the guide. Confirm all figures and sector-specific requirements for the actual site.', labels: { factory: 'Factory', hotel: 'Hotel', resort: 'Resort' }, descriptions: { factory: 'Process continuity, use-specific quality and production impact.', hotel: 'Occupancy peaks, hygiene, laundry, kitchens and guest experience.', resort: 'Seasonality, dispersed loads, landscape demand and source resilience.' }, priorityLabel: 'Confirm these early', priorities: { factory: ['Separate process, cooling, boiler and domestic water', 'Define machine inlet quality and the cost of interruption', 'Check factory, environmental and discharge obligations too'], hotel: ['Separate rooms, kitchen, laundry, pool and HVAC loads', 'Size buffers for occupancy and event peaks', 'Define drinking and domestic sampling points'], resort: ['Compare high season with the dry season', 'Map remote buildings and power-outage exposure', 'Assess fit-for-purpose reuse for landscaping'] } },
  calculator: { ...copyByLocale.th.calculator, eyebrow: 'WATER BALANCE WORKSHEET', title: 'Build the design question from real consumption', text: 'Enter average daily use from meters, bills, production records or traceable estimates. Results are preliminary planning values—not a guarantee of well yield.', useTitle: 'Demand by end use', assumptionsTitle: 'Design assumptions', uses: { core: 'Core process / guest rooms', laundry: 'Laundry and cleaning', kitchen: 'Kitchen, food and beverage', cooling: 'Cooling / HVAC / boiler makeup', landscape: 'Landscape, pools and outdoor use', other: 'Other and known losses' }, unit: 'm³/day', targetShare: 'Target groundwater share', pumpHours: 'Planned pumping hours/day', reserve: 'Growth/uncertainty allowance', backupHours: 'Backup duration when source stops', usableStorage: 'Usable fraction of tank', resultsTitle: 'Preliminary design frame', currentDemand: 'Current demand', designDemand: 'Demand with allowance', groundwaterTarget: 'Groundwater target', preliminaryFlow: 'Average required pumping rate', usableTank: 'Required usable storage', nominalTank: 'Approximate nominal tank', warning: 'Confirm yield by pumping test, aquifer sustainability and permit conditions before selecting a pump or guaranteeing output.', copyBrief: 'Copy project brief', copied: 'Copied', briefTitle: 'Groundwater project starting brief', noDemand: 'Enter at least one end-use demand to begin' },
  roadmap: { eyebrow: 'PROJECT GATES', title: 'Advance by evidence, not assumptions', text: 'Tick an item only when the team holds the real input or deliverable. Progress shows missing evidence; it is not an approval.', done: 'readiness', steps: [
    { title: 'Define demand and service level', detail: 'Confirm water balance, peaks, quality by use, tolerable outage and backup source.', output: 'Design basis and load profile' },
    { title: 'Review site, records and constraints', detail: 'Check coordinates, land rights, rig access, pollution risks, existing pipes, nearby wells and SmartGIS.', output: 'Site plan and risk register' },
    { title: 'Confirm permits and responsibility', detail: 'Verify drilling/use permits, receiving authority, qualified parties and other facility obligations.', output: 'Permit matrix and owners' },
    { title: 'Survey, design and drill to evidence', detail: 'Select the target from hydrogeology and update construction to the formations encountered.', output: 'Well log and as-built construction' },
    { title: 'Develop, pump-test and analyse', detail: 'Measure discharge, drawdown, recovery, sand and representative water quality.', output: 'Recommended yield, baseline and laboratory results' },
    { title: 'Design treatment, storage and backup', detail: 'Use test results; define duty/standby equipment, meters, alarms, bypasses and quality zones.', output: 'P&ID, schedule and control philosophy' },
    { title: 'Commission, hand over and operate', detail: 'Test at realistic load, train operators and set KPIs, sampling points and critical spares.', output: 'Acceptance record, O&M manual and baseline' },
  ] },
  architecture: { eyebrow: 'RESILIENT SYSTEM', title: 'Make the well, treatment, tank and users work as one system', text: 'A successful system controls quality, pressure, backup and maintenance—not merely water flowing from a well.', imageAlt: 'Resilient groundwater system with well, treatment, storage, backup and multiple end uses', caption: 'Typical path: protected well → raw buffer and sampling → treatment → treated storage → end use. Backup and standby equipment must be testable.', principles: [
    { title: 'Separate quantity from quality', text: 'Adequate yield does not mean one quality suits every use. Define treatment and acceptance by duty.' },
    { title: 'Use storage to decouple systems', text: 'A tank based on the load profile reduces pump cycling and helps treatment operate near its design point.' },
    { title: 'Remove single points of failure', text: 'Review source, pumps, power, controls and critical spares, plus a practical changeover procedure.' },
    { title: 'Meter the questions that matter', text: 'Know abstraction, losses, post-treatment quality and which end use creates the peak.' },
  ] },
  handover: { eyebrow: 'ACCEPTANCE & HANDOVER', title: 'Accept traceable evidence, not only “water is flowing”', text: 'Put these deliverables in the scope and agree measurable payment gates before work begins.', groups: [
    { title: 'Well and performance', items: ['Well log, materials, screen and seal intervals', 'Development, pumping test, levels and recovery data', 'Recommended yield, operating limits and sand baseline'] },
    { title: 'Quality and treatment', items: ['Chain of custody and raw/treated laboratory results', 'Acceptance limits by end use', 'P&ID, setpoints, alarms, chemicals/SDS and consumables'] },
    { title: 'Mechanical, electrical and controls', items: ['Pump curve, duty point, motor protection and test records', 'Duty/standby, backup source and backup power tests', 'Equipment tags, spares list and as-built drawings'] },
    { title: 'Compliance and operation', items: ['Permits, reporting and renewal owners', 'O&M manual, maintenance plan and training records', 'Flow, pressure, level, quality, energy and vibration baselines'] },
  ] },
  operate: { eyebrow: 'OPERATE BY TREND', title: 'See deterioration before the system stops', text: 'Actual intervals depend on permits, manufacturer guidance, risk and intended use. Use this as a starting frame for site SOPs.', rows: [
    { when: 'Each shift / daily', actions: 'Check alarms, flow, pressure, levels, unusual appearance/odour, sound and vibration.', record: 'Operator log and exceptions' },
    { when: 'Weekly', actions: 'Inspect leaks, wellhead, panels and consumables; test standby equipment per SOP.', record: 'Inspection checklist' },
    { when: 'Monthly', actions: 'Review abstraction, water balance, energy per m³, levels and permit reporting duties.', record: 'Performance review' },
    { when: 'Risk-based / planned', actions: 'Sample water, calibrate meters, maintain equipment and rehearse emergency response.', record: 'Lab, calibration and maintenance history' },
  ] },
  sources: { eyebrow: 'OFFICIAL CHECKPOINTS', title: 'Verify current requirements before authorizing work', text: 'Requirements depend on location, volume, use and facility type. This guide links to official Department of Groundwater Resources material, reviewed 4 August 2026.', links: [
    { label: 'Drilling and groundwater-use permit process/forms', href: sourceLinks.permit }, { label: 'Permit assessment criteria', href: sourceLinks.criteria }, { label: 'Groundwater quality for consumption', href: sourceLinks.quality }, { label: 'DGR water-analysis services', href: sourceLinks.lab }, { label: 'DGR SmartGIS map system', href: sourceLinks.map },
  ] },
  next: { title: 'Ready to turn this worksheet into a site scope?', text: 'Send coordinates, layout, demand, existing analyses and the periods when water cannot be interrupted.', contact: 'Ask the team', tools: 'Technician calculators', law: 'Legal guide' },
}

copyByLocale.zh = {
  ...copyByLocale.en,
  overview: { ...copyByLocale.en.overview, eyebrow: '业主规划指南', title: '把“需要一口井”转化为可验证的供水系统', text: '在与水文地质、工程、承包和许可团队沟通前，先形成有依据的项目任务书。', items: ['以实际用量为依据，而非只看项目规模', '按水质要求和重要性区分用途', '从一开始规划储水、备用水源和停机', '以可测性能和竣工资料进行验收'], caption: '设施不同，方法相同：先做用水平衡，再把井、处理、储水和备用系统作为整体设计。' },
  choose: { ...copyByLocale.en.choose, eyebrow: '先选场景', title: '不同设施的主导风险不同', text: '选择最接近的类型，以调整阅读重点；实际数值和行业要求仍需按现场确认。', labels: { factory: '工厂', hotel: '酒店', resort: '度假村' }, descriptions: { factory: '关注工艺连续性、分用途水质和停水损失。', hotel: '关注入住高峰、卫生、洗衣、厨房和宾客体验。', resort: '关注季节性、分散负荷、景观用水和备用能力。' }, priorityLabel: '应优先确认', priorities: { factory: ['区分工艺、冷却、锅炉和生活用水', '确定设备进水水质与停水影响', '同时核查工厂、环保和排放要求'], hotel: ['区分客房、厨房、洗衣、泳池和空调负荷', '按入住和活动高峰配置缓冲', '明确饮用与生活用水取样点'], resort: ['比较旺季与旱季用水', '梳理远端建筑和停电风险', '评估适用水质的景观回用'] } },
  calculator: { ...copyByLocale.en.calculator, eyebrow: '用水平衡表', title: '用实际用量建立设计条件', text: '输入来自水表、账单、生产记录或可追溯估算的日均用量。结果仅用于前期规划，不保证井的出水量。', useTitle: '按用途统计', assumptionsTitle: '设计假设', uses: { core: '核心工艺 / 客房', laundry: '洗衣与清洁', kitchen: '厨房、餐饮', cooling: '冷却 / 空调 / 锅炉补水', landscape: '景观、泳池和室外', other: '其他及已知损耗' }, unit: 'm³/天', targetShare: '地下水目标占比', pumpHours: '计划每日抽水小时', reserve: '增长/不确定性余量', backupHours: '主水源中断备用小时', usableStorage: '水箱可用比例', resultsTitle: '初步设计框架', currentDemand: '当前需求', designDemand: '含余量需求', groundwaterTarget: '地下水目标量', preliminaryFlow: '平均所需抽水量', usableTank: '所需可用储水', nominalTank: '估算名义水箱', warning: '选泵或承诺产水量前，必须通过抽水试验、含水层可持续性和许可条件确认。', copyBrief: '复制项目简报', copied: '已复制', briefTitle: '地下水项目前期资料', noDemand: '请至少输入一项用水量' },
  roadmap: { ...copyByLocale.en.roadmap, eyebrow: '项目关卡', title: '用证据推进，不凭假设跳步', text: '只有真正取得资料或成果后才勾选。进度表示资料完整度，不代表审批。', done: '准备度', steps: [
    { title: '确定需求与服务水平', detail: '确认用水平衡、高峰、各用途水质、可接受停水时间和备用水源。', output: '设计依据与负荷曲线' },
    { title: '核查场地、既有资料和限制', detail: '核查坐标、土地权利、钻机通道、污染风险、既有管网、邻井和SmartGIS。', output: '场地平面图与风险清单' },
    { title: '确认许可与责任人', detail: '确认钻井和用水许可、受理机关、合格承包方及其他经营许可义务。', output: '许可矩阵与负责人' },
    { title: '依据证据调查、设计与钻井', detail: '依据水文地质选择井位，并按实际钻遇地层调整井结构。', output: '钻井柱状图与竣工结构' },
    { title: '洗井、抽水试验与水质分析', detail: '记录流量、降深、恢复、含砂量及有代表性的水质。', output: '建议开采量、基线和实验室结果' },
    { title: '设计处理、储水和备用系统', detail: '依据检测结果设置主备设备、仪表、报警、旁路和水质分区。', output: 'P&ID、设备表和控制说明' },
    { title: '调试、移交与运行', detail: '在实际负荷下试运行，培训人员，并确定KPI、取样点和关键备件。', output: '验收记录、运维手册和基线' },
  ] },
  architecture: { ...copyByLocale.en.architecture, eyebrow: '韧性系统', title: '让水井、处理、储水和用户作为一个系统运行', text: '合格系统必须控制水质、压力、备用和检修，而不只是井里有水。', imageAlt: '含水井、水处理、储水、备用水源及多用途供水的韧性系统', caption: '典型流程：受保护井口 → 原水缓冲与取样 → 水处理 → 净水储存 → 用水点。备用设备必须能够实际测试。', principles: [
    { title: '区分水量与水质', text: '出水量足够不代表所有用途都适用同一水质；应按用途设定处理与验收标准。' },
    { title: '用储水解耦系统', text: '按负荷曲线配置水箱可减少水泵频繁启停，并让处理设备接近设计工况。' },
    { title: '消除单点故障', text: '检查水源、水泵、供电、控制和关键备件，并建立可执行的切换步骤。' },
    { title: '让仪表回答关键问题', text: '应能看出取水量、损耗、处理后水质以及造成高峰的具体用途。' },
  ] },
  handover: { ...copyByLocale.en.handover, eyebrow: '验收与移交', title: '验收可追溯证据，而不只是“已经出水”', text: '开工前把成果列入范围，并把付款节点与可测测试结果关联。', groups: [
    { title: '井体与性能', items: ['钻井记录、材料、滤管与封隔深度', '洗井、抽水试验、水位与恢复数据', '建议开采量、运行限制与含砂基线'] },
    { title: '水质与处理', items: ['样品交接记录及原水/处理后检测结果', '按用途设置验收限值', 'P&ID、设定值、报警、药剂/SDS及耗材'] },
    { title: '机电与控制', items: ['泵曲线、工况点、电机保护及测试记录', '主备泵、备用水源和备用电源测试', '设备标签、备件清单及竣工图'] },
    { title: '合规与运维', items: ['许可证、报告要求与续期责任人', '运维手册、维护计划和培训记录', '流量、压力、水位、水质、能耗和振动基线'] },
  ] },
  operate: { ...copyByLocale.en.operate, eyebrow: '按趋势运维', title: '在系统停机前看到劣化', text: '实际周期取决于许可、厂家要求、风险和用途。请以此为现场SOP起点。', rows: [
    { when: '每班 / 每日', actions: '检查报警、流量、压力、液位、异常颜色或气味、噪声与振动。', record: '运行日志与异常记录' },
    { when: '每周', actions: '检查泄漏、井口、控制柜和耗材；按SOP测试备用设备。', record: '检查清单' },
    { when: '每月', actions: '复核取水量、用水平衡、单位能耗、水位及许可报告义务。', record: '月度性能复核' },
    { when: '按风险 / 计划', actions: '取样、校准仪表、维护设备并演练应急响应。', record: '检测、校准和维护历史' },
  ] },
  sources: { ...copyByLocale.en.sources, eyebrow: '官方核查点', title: '批准施工前核实最新规定', text: '要求取决于地点、水量、用途和设施类型。本页链接泰国地下水资源厅官方资料，复核日期：2026年8月4日。', links: [
    { label: '钻井与地下水使用许可流程及表格', href: sourceLinks.permit }, { label: '许可审查标准', href: sourceLinks.criteria }, { label: '生活饮用地下水水质标准', href: sourceLinks.quality }, { label: '泰国地下水资源厅水质分析服务', href: sourceLinks.lab }, { label: '地下水SmartGIS地图系统', href: sourceLinks.map },
  ] },
  next: { title: '准备把工作表变成现场工作范围？', text: '请提供坐标、平面图、用水量、既有检测结果和不可停水时段。', contact: '咨询团队', tools: '技术计算工具', law: '法规指南' },
}

copyByLocale.ja = {
  ...copyByLocale.en,
  overview: { ...copyByLocale.en.overview, eyebrow: '事業主向け計画ガイド', title: '「井戸が必要」を検証可能な給水計画へ', text: '水文地質、設計、施工、許認可の担当者と協議する前に、根拠のあるプロジェクト要件を整理します。', items: ['施設規模だけでなく実測使用量を基準にする', '用途を必要水質と重要度で分ける', '貯留、予備水源、停止計画を初期から組み込む', '測定できる性能と完成図書で検収する'], caption: '施設が違っても基本は同じです。水収支から始め、井戸・処理・貯留・予備を一体で設計します。' },
  choose: { ...copyByLocale.en.choose, eyebrow: '施設を選択', title: '施設ごとに主要リスクは異なります', text: '最も近い施設を選ぶと、確認事項の優先順位が変わります。数値と業種固有要件は現地条件で確認してください。', labels: { factory: '工場', hotel: 'ホテル', resort: 'リゾート' }, descriptions: { factory: '工程継続性、用途別水質、生産停止の影響。', hotel: '稼働率ピーク、衛生、ランドリー、厨房、顧客体験。', resort: '季節変動、分散負荷、植栽用水、予備能力。' }, priorityLabel: '初期に確認する項目', priorities: { factory: ['工程、冷却、ボイラー、生活用水を分ける', '設備入口水質と断水影響を定義する', '工場・環境・排水要件も確認する'], hotel: ['客室、厨房、ランドリー、プール、空調を分ける', '稼働率とイベントピークに備える', '飲用・生活用水の採水点を決める'], resort: ['繁忙期と乾季を比較する', '遠隔棟と停電リスクを把握する', '植栽への適正な再利用を検討する'] } },
  calculator: { ...copyByLocale.en.calculator, eyebrow: '水収支ワークシート', title: '実際の使用量から設計条件を作る', text: 'メーター、請求書、生産記録、根拠のある推計から日平均使用量を入力します。結果は予備計画値であり、井戸揚水量の保証ではありません。', useTitle: '用途別需要', assumptionsTitle: '設計前提', uses: { core: '主要工程 / 客室', laundry: 'ランドリー・清掃', kitchen: '厨房・飲食', cooling: '冷却 / 空調 / ボイラー補給', landscape: '植栽・プール・屋外', other: 'その他・既知の損失' }, unit: 'm³/日', targetShare: '地下水の目標比率', pumpHours: '計画揚水時間/日', reserve: '成長・不確実性の余裕', backupHours: '主水源停止時の予備時間', usableStorage: 'タンク有効率', resultsTitle: '予備設計フレーム', currentDemand: '現在需要', designDemand: '余裕込み需要', groundwaterTarget: '地下水目標量', preliminaryFlow: '必要平均揚水量', usableTank: '必要有効貯留量', nominalTank: '概算公称タンク容量', warning: 'ポンプ選定や水量保証の前に、揚水試験、帯水層の持続性、許可条件で確認してください。', copyBrief: 'プロジェクト要件をコピー', copied: 'コピーしました', briefTitle: '地下水プロジェクト初期要件', noDemand: '少なくとも1用途の水量を入力してください' },
  roadmap: { ...copyByLocale.en.roadmap, eyebrow: 'プロジェクトゲート', title: '想定ではなく証拠で進める', text: '実際の資料や成果物がある場合のみチェックします。進捗は資料の準備度で、承認を意味しません。', done: '準備度', steps: [
    { title: '需要とサービスレベルを定義', detail: '水収支、ピーク、用途別水質、許容停止時間、予備水源を確認します。', output: '設計条件と負荷プロファイル' },
    { title: '敷地・既存資料・制約を確認', detail: '座標、土地権利、掘削機アクセス、汚染リスク、既設配管、近隣井戸、SmartGISを確認します。', output: '配置図とリスク台帳' },
    { title: '許認可と責任者を確認', detail: '掘削・使用許可、申請先、有資格者、施設に関係する他の義務を確認します。', output: '許認可マトリクスと担当者' },
    { title: '根拠に基づく調査・設計・掘削', detail: '水文地質から位置を選定し、実際の地層に合わせて井戸構造を更新します。', output: '柱状図と完成井構造' },
    { title: '井戸洗浄・揚水試験・水質分析', detail: '流量、水位低下、回復、砂、有効な水質試料を記録します。', output: '推奨揚水量、基準値、分析結果' },
    { title: '処理・貯留・予備システム設計', detail: '分析結果から主予備機、計器、警報、バイパス、水質区分を定義します。', output: 'P&ID、機器表、制御方針' },
    { title: '試運転・引渡し・運用', detail: '実負荷で試験し、担当者を教育し、KPI、採水点、重要予備品を決めます。', output: '検収記録、O&M手順書、基準値' },
  ] },
  architecture: { ...copyByLocale.en.architecture, eyebrow: 'レジリエントなシステム', title: '井戸・処理・タンク・使用先を一体で機能させる', text: '良いシステムは水が出るだけでなく、水質、圧力、予備、保守停止を管理します。', imageAlt: '井戸、水処理、貯留、予備水源、複数用途を備えた地下水システム', caption: '代表的な流れ：保護された井戸 → 原水バッファと採水 → 処理 → 処理水タンク → 使用先。予備設備は実際に試験できることが重要です。', principles: [
    { title: '水量と水質を分ける', text: '十分な揚水量でも、全用途に同じ水質が適するとは限りません。用途別に処理と検収基準を定めます。' },
    { title: '貯留でシステムを分離', text: '負荷プロファイルに基づくタンクは頻繁な起動停止を減らし、処理を設計点付近で運転できます。' },
    { title: '単一故障点をなくす', text: '水源、ポンプ、電源、制御、重要予備品と、実行可能な切替手順を確認します。' },
    { title: '必要な問いを計測する', text: '取水量、損失、処理後水質、ピークを作る用途が分かる計器を配置します。' },
  ] },
  handover: { ...copyByLocale.en.handover, eyebrow: '検収と引渡し', title: '「水が出た」だけでなく追跡可能な証拠を検収', text: '着工前に成果物を仕様へ入れ、測定可能な試験結果を支払条件にします。', groups: [
    { title: '井戸と性能', items: ['柱状図、材質、スクリーン・遮水区間', '洗浄、揚水試験、水位、回復データ', '推奨揚水量、運転制限、砂の基準値'] },
    { title: '水質と処理', items: ['試料管理記録と原水・処理水分析結果', '用途別の検収限界値', 'P&ID、設定値、警報、薬品/SDS、消耗品'] },
    { title: '機械・電気・制御', items: ['ポンプ曲線、運転点、電動機保護、試験記録', '主予備機、予備水源、予備電源の試験', '機器タグ、予備品表、完成図'] },
    { title: '法令と運用', items: ['許可、報告、更新の責任者', 'O&M手順書、保全計画、教育記録', '流量、圧力、水位、水質、電力、振動の基準値'] },
  ] },
  operate: { ...copyByLocale.en.operate, eyebrow: '傾向で運転管理', title: '停止する前に劣化を見つける', text: '実際の周期は許可、メーカー、リスク、用途によります。現場SOP作成の出発点として使用してください。', rows: [
    { when: '各シフト / 毎日', actions: '警報、流量、圧力、水位、色・臭い、音、振動を確認します。', record: '運転日誌と異常記録' },
    { when: '毎週', actions: '漏れ、井戸口、制御盤、消耗品を点検し、SOPに従い予備機を試験します。', record: '点検チェックリスト' },
    { when: '毎月', actions: '取水量、水収支、m³当たり電力、水位、許可に基づく報告を確認します。', record: '月次性能レビュー' },
    { when: 'リスク / 計画に応じて', actions: '採水、計器校正、機器保全、緊急対応訓練を行います。', record: '分析・校正・保全履歴' },
  ] },
  sources: { ...copyByLocale.en.sources, eyebrow: '公式確認先', title: '工事承認前に最新要件を確認', text: '要件は場所、水量、用途、施設種別で変わります。タイ地下水資源局の公式資料へリンクしています。確認日：2026年8月4日。', links: [
    { label: '掘削・地下水使用許可の手順と様式', href: sourceLinks.permit }, { label: '許可審査の基準', href: sourceLinks.criteria }, { label: '飲用地下水の水質基準', href: sourceLinks.quality }, { label: '地下水資源局の水質分析サービス', href: sourceLinks.lab }, { label: '地下水資源局SmartGIS', href: sourceLinks.map },
  ] },
  next: { title: 'ワークシートを現地仕様へ進めますか？', text: '位置、配置図、需要、既存分析、断水できない時間帯をお知らせください。', contact: 'チームに相談', tools: '技術計算ツール', law: '法規ガイド' },
}

function NumberInput({ value, onChange, suffix, min = 0, max = 100000, step = 1 }: { value: number; onChange: (value: number) => void; suffix: string; min?: number; max?: number; step?: number }) {
  return <label className="gog-number-input"><input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /><span>{suffix}</span></label>
}

export default function GroundwaterOwnerGuide({ locale = 'th' }: { locale?: LocalizedLocale; localized?: boolean }) {
  const copy = copyByLocale[locale]
  const [facility, setFacility] = useState<Facility>('factory')
  const [uses, setUses] = useState<Record<UseKey, number>>({ core: 0, laundry: 0, kitchen: 0, cooling: 0, landscape: 0, other: 0 })
  const [targetShare, setTargetShare] = useState(70)
  const [pumpHours, setPumpHours] = useState(16)
  const [reserve, setReserve] = useState(20)
  const [backupHours, setBackupHours] = useState(12)
  const [usableStorage, setUsableStorage] = useState(85)
  const [completed, setCompleted] = useState<number[]>([])
  const [copied, setCopied] = useState(false)

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

  const brief = [
    copy.calculator.briefTitle,
    `${copy.choose.labels[facility]} — ${copy.choose.descriptions[facility]}`,
    ...Object.entries(uses).map(([key, value]) => `${copy.calculator.uses[key as UseKey]}: ${format(value)} ${copy.calculator.unit}`),
    `${copy.calculator.currentDemand}: ${format(calculation.daily)} ${copy.calculator.unit}`,
    `${copy.calculator.designDemand}: ${format(calculation.design)} ${copy.calculator.unit}`,
    `${copy.calculator.groundwaterTarget}: ${format(calculation.groundwaterDaily)} ${copy.calculator.unit} (${targetShare}%)`,
    `${copy.calculator.preliminaryFlow}: ${format(calculation.requiredFlow)} m³/h (${pumpHours} h/day)`,
    `${copy.calculator.usableTank}: ${format(calculation.requiredUsableStorage)} m³ (${backupHours} h)`,
    `${copy.calculator.nominalTank}: ${format(calculation.nominalTankVolume)} m³`,
    '', copy.calculator.warning,
  ].join('\n')

  const copyBrief = async () => {
    await navigator.clipboard.writeText(brief)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="gog-shell">
      <section className="gog-overview">
        <div className="gog-overview-copy"><p className="gog-eyebrow">{copy.overview.eyebrow}</p><h2>{copy.overview.title}</h2><p>{copy.overview.text}</p><ul>{copy.overview.items.map((item) => <li key={item}><CheckCircle2 aria-hidden="true" />{item}</li>)}</ul></div>
        <figure><Image src="/images/learning/groundwater-owner-guide/factory-hotel-resort-planning.webp" alt={copy.overview.imageAlt} width={1600} height={900} priority /><figcaption>{copy.overview.caption}</figcaption></figure>
      </section>

      <section className="gog-section" id="facility-profile">
        <div className="gog-section-heading"><p className="gog-eyebrow">{copy.choose.eyebrow}</p><h2>{copy.choose.title}</h2><p>{copy.choose.text}</p></div>
        <div className="gog-facility-grid" role="group" aria-label={copy.choose.title}>
          {(Object.keys(copy.choose.labels) as Facility[]).map((key) => { const Icon = facilityIcons[key]; return <button key={key} type="button" className={facility === key ? 'is-active' : ''} aria-pressed={facility === key} onClick={() => setFacility(key)}><Icon aria-hidden="true" /><span><strong>{copy.choose.labels[key]}</strong><small>{copy.choose.descriptions[key]}</small></span>{facility === key && <Check aria-hidden="true" className="gog-selected" />}</button> })}
        </div>
        <div className="gog-priority-panel"><div><Sparkles aria-hidden="true" /><strong>{copy.choose.priorityLabel}: {copy.choose.labels[facility]}</strong></div><ul>{copy.choose.priorities[facility].map((item) => <li key={item}>{item}</li>)}</ul></div>
      </section>

      <section className="gog-section gog-calculator" id="water-balance">
        <div className="gog-section-heading"><p className="gog-eyebrow">{copy.calculator.eyebrow}</p><h2>{copy.calculator.title}</h2><p>{copy.calculator.text}</p></div>
        <div className="gog-calculator-layout">
          <div className="gog-input-panel"><h3><Droplets aria-hidden="true" />{copy.calculator.useTitle}</h3><div className="gog-use-list">{(Object.keys(uses) as UseKey[]).map((key) => <div className="gog-use-row" key={key}><span>{copy.calculator.uses[key]}</span><NumberInput value={uses[key]} onChange={(value) => setUses((current) => ({ ...current, [key]: value }))} suffix={copy.calculator.unit} step={0.1} /></div>)}</div>
            <h3><Gauge aria-hidden="true" />{copy.calculator.assumptionsTitle}</h3><div className="gog-assumption-grid">
              <label><span>{copy.calculator.targetShare}</span><NumberInput value={targetShare} onChange={setTargetShare} suffix="%" max={100} /></label>
              <label><span>{copy.calculator.pumpHours}</span><NumberInput value={pumpHours} onChange={setPumpHours} suffix="h" min={1} max={24} /></label>
              <label><span>{copy.calculator.reserve}</span><NumberInput value={reserve} onChange={setReserve} suffix="%" max={100} /></label>
              <label><span>{copy.calculator.backupHours}</span><NumberInput value={backupHours} onChange={setBackupHours} suffix="h" max={168} /></label>
              <label><span>{copy.calculator.usableStorage}</span><NumberInput value={usableStorage} onChange={setUsableStorage} suffix="%" min={1} max={100} /></label>
            </div>
          </div>
          <aside className="gog-results" aria-live="polite"><p className="gog-eyebrow">{copy.calculator.resultsTitle}</p>{calculation.daily === 0 && <p className="gog-empty-result">{copy.calculator.noDemand}</p>}<div className="gog-result-grid">
            <div><span>{copy.calculator.currentDemand}</span><strong>{format(calculation.daily)}</strong><small>{copy.calculator.unit}</small></div>
            <div><span>{copy.calculator.designDemand}</span><strong>{format(calculation.design)}</strong><small>{copy.calculator.unit}</small></div>
            <div><span>{copy.calculator.groundwaterTarget}</span><strong>{format(calculation.groundwaterDaily)}</strong><small>{copy.calculator.unit}</small></div>
            <div><span>{copy.calculator.preliminaryFlow}</span><strong>{format(calculation.requiredFlow)}</strong><small>m³/h</small></div>
            <div><span>{copy.calculator.usableTank}</span><strong>{format(calculation.requiredUsableStorage)}</strong><small>m³</small></div>
            <div><span>{copy.calculator.nominalTank}</span><strong>{format(calculation.nominalTankVolume)}</strong><small>m³</small></div>
          </div><p className="gog-result-note"><ShieldCheck aria-hidden="true" />{copy.calculator.warning}</p><button type="button" onClick={copyBrief}><Copy aria-hidden="true" />{copied ? copy.calculator.copied : copy.calculator.copyBrief}</button></aside>
        </div>
      </section>

      <section className="gog-section" id="project-roadmap">
        <div className="gog-section-heading gog-roadmap-heading"><div><p className="gog-eyebrow">{copy.roadmap.eyebrow}</p><h2>{copy.roadmap.title}</h2><p>{copy.roadmap.text}</p></div><div className="gog-progress"><strong>{readiness}%</strong><span>{copy.roadmap.done}</span><div><i style={{ width: `${readiness}%` }} /></div></div></div>
        <div className="gog-roadmap">{copy.roadmap.steps.map((step, index) => { const checked = completed.includes(index); return <article key={step.title} className={checked ? 'is-complete' : ''}><button type="button" aria-pressed={checked} onClick={() => setCompleted((current) => checked ? current.filter((item) => item !== index) : [...current, index])}><span>{checked ? <Check aria-hidden="true" /> : index + 1}</span><span><strong>{step.title}</strong><small>{step.detail}</small><em><FileCheck2 aria-hidden="true" />{step.output}</em></span></button></article> })}</div>
      </section>

      <section className="gog-section gog-architecture">
        <div className="gog-section-heading"><p className="gog-eyebrow">{copy.architecture.eyebrow}</p><h2>{copy.architecture.title}</h2><p>{copy.architecture.text}</p></div>
        <figure><Image src="/images/learning/groundwater-owner-guide/resilient-water-system.webp" alt={copy.architecture.imageAlt} width={1600} height={900} /><figcaption>{copy.architecture.caption}</figcaption></figure>
        <div className="gog-principles">{copy.architecture.principles.map((item, index) => { const icons = [FlaskConical, Droplets, ShieldCheck, Gauge]; const Icon = icons[index]; return <article key={item.title}><Icon aria-hidden="true" /><h3>{item.title}</h3><p>{item.text}</p></article> })}</div>
      </section>

      <section className="gog-section">
        <div className="gog-section-heading"><p className="gog-eyebrow">{copy.handover.eyebrow}</p><h2>{copy.handover.title}</h2><p>{copy.handover.text}</p></div>
        <div className="gog-handover-grid">{copy.handover.groups.map((group, index) => { const icons = [HardHat, FlaskConical, Wrench, ClipboardCheck]; const Icon = icons[index]; return <article key={group.title}><div><Icon aria-hidden="true" /><h3>{group.title}</h3></div><ul>{group.items.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul></article> })}</div>
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
