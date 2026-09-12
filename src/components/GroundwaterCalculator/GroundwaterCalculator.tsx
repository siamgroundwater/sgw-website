'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  Activity,
  Cable,
  Check,
  CircleGauge,
  ClipboardCopy,
  Cylinder,
  Database,
  DollarSign,
  Droplets,
  Gauge,
  Info,
  Printer,
  RotateCcw,
  Ruler,
  SlidersHorizontal,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  calculateGroundwaterPlan,
  calculateCasingVolume,
  calculateMotorCurrent,
  calculatePipeHydraulics,
  calculatePressureConversion,
  calculatePumpEnergy,
  calculateStoragePlan,
  calculateWaterCostComparison,
  calculateWellPerformance,
} from '@/lib/groundwater-calculator'
import { localeInfo, type LocalizedLocale } from '@/i18n/config'
import NumericInput from '@/components/LearningInputs/NumericInput'
import { buildLearningReport, validateNumericDraft, type NumericRules } from '@/lib/learning-inputs'
import './GroundwaterCalculator.css'

type ToolId =
  | 'demand'
  | 'storage'
  | 'energy'
  | 'well'
  | 'cost'
  | 'pipe'
  | 'pressure'
  | 'casing'
  | 'motor'

const toolOrder: ToolId[] = [
  'demand',
  'cost',
  'storage',
  'energy',
  'well',
  'pipe',
  'pressure',
  'casing',
  'motor',
]

const taskCopy = {
  th: { common: 'เริ่มจากสิ่งที่ต้องการรู้', more: 'เครื่องมือเพิ่มเติมสำหรับงานวิศวกรรม', example: 'ค่าเริ่มต้นเป็นตัวอย่าง กรุณาเปลี่ยนเป็นข้อมูลของโครงการก่อนใช้ผลลัพธ์', adjusted: 'ผลลัพธ์จากค่าที่กรอก โปรดตรวจสอบข้อมูลทุกช่องก่อนนำไปใช้', meaning: 'ใช้ผลลัพธ์นี้เพื่อ' },
  en: { common: 'What would you like to estimate?', more: 'More engineering tools', example: 'The starting values are examples. Replace them with your project data before using the results.', adjusted: 'Results use the entered values. Check every field before using them.', meaning: 'Use this estimate to' },
  zh: { common: '您想先估算什么？', more: '更多工程计算工具', example: '初始数值仅为示例。使用结果前，请替换为您的项目数据。', adjusted: '结果根据输入值计算。使用前请核对所有字段。', meaning: '本估算可用于' },
  ja: { common: '何を概算したいですか？', more: 'その他の技術計算ツール', example: '初期値は入力例です。結果を利用する前に、ご自身の事業データへ変更してください。', adjusted: '入力値から計算した結果です。利用前にすべての項目を確認してください。', meaning: 'この概算の用途' },
} satisfies Record<LocalizedLocale, { common: string; more: string; example: string; adjusted: string; meaning: string }>

type SuiteCopy = {
  eyebrow: string
  title: string
  intro: string
  inputs: string
  results: string
  reset: string
  copyResults: string
  copied: string
  liveNote: string
  disclaimerTitle: string
  disclaimer: string
  unavailable: string
  tools: Record<ToolId, { name: string; description: string }>
  labels: {
    dailyDemand: string
    pumpHours: string
    reservePercent: string
    designDemand: string
    requiredFlow: string
    minimumBuffer: string
    backupHours: string
    usablePercent: string
    averageHourlyDemand: string
    usableStorage: string
    nominalTankVolume: string
    flowRate: string
    totalHead: string
    efficiency: string
    operatingHours: string
    electricityRate: string
    hydraulicPower: string
    inputPower: string
    dailyEnergy: string
    monthlyEnergy: string
    monthlyElectricityCost: string
    staticWaterLevel: string
    pumpingWaterLevel: string
    pumpingRate: string
    drawdown: string
    specificCapacity: string
    operatingDays: string
    groundwaterUnitCost: string
    alternativeUnitCost: string
    monthlyVolume: string
    groundwaterCost: string
    alternativeCost: string
    monthlyDifference: string
    differencePercent: string
    internalDiameter: string
    pipeLength: string
    hazenWilliamsCoefficient: string
    velocity: string
    headLoss: string
    headLossPer100Metres: string
    pressureBar: string
    pressureHead: string
    pressureKilopascals: string
    pressurePsi: string
    waterColumnLength: string
    casingVolume: string
    litresPerMetre: string
    motorOutputPower: string
    voltage: string
    powerFactor: string
    motorEfficiency: string
    phase: string
    singlePhase: string
    threePhase: string
    electricalInputPower: string
    apparentPower: string
    estimatedCurrent: string
  }
}

const toolReadingHelp: Record<LocalizedLocale, Partial<Record<ToolId, string>>> = {
  th: {
    well: 'ระยะน้ำลด (Drawdown) คือส่วนต่างระหว่างระดับน้ำก่อนสูบกับขณะสูบ ส่วน Specific capacity คืออัตราสูบหารด้วยระยะน้ำลด ใช้เปรียบเทียบเมื่ออัตราสูบ ระยะเวลาทดสอบ และระดับน้ำเริ่มต้นใกล้เคียงกัน ค่านี้ไม่ใช่ปริมาณที่สูบได้อย่างยั่งยืนโดยอัตโนมัติ',
    pipe: 'เฮดสูญเสีย (Head loss) คือพลังงานของน้ำที่เสียไปกับแรงเสียดทาน แสดงเป็นความสูงของน้ำหน่วยเมตร ค่า C ในสมการ Hazen-Williams เกี่ยวกับสภาพผิวภายในท่อ ควรใช้ค่าที่เหมาะกับวัสดุและสภาพท่อจริง',
  },
  en: {
    well: 'Drawdown is the change from the pre-pumping water level to the pumping level. Specific capacity is pumping rate divided by drawdown. Compare tests with similar rates, durations and starting levels; this value does not automatically establish sustainable yield.',
    pipe: 'Head loss is energy lost to pipe friction, expressed in metres of water. The Hazen-Williams C value represents the internal pipe condition. Use a value appropriate to the actual material and condition.',
  },
  zh: {
    well: '降深（Drawdown）是抽水前与抽水时的水位差。比出水量（Specific capacity）是抽水流量除以降深。比较时应采用相近的流量、试验时长和初始水位；该值不能直接确定可持续开采量。',
    pipe: '水头损失（Head loss）是管道摩擦造成的能量损失，以米水柱表示。Hazen-Williams 的 C 值反映管内壁状况，应根据实际材质和管况选取。',
  },
  ja: {
    well: '水位低下量（Drawdown）は揚水前と揚水中の水位の差です。比湧出量（Specific capacity）は揚水量を水位低下量で割った値です。流量、試験時間、初期水位が近い条件で比較し、この値だけで持続可能な揚水量とは判断しません。',
    pipe: '損失水頭（Head loss）は管の摩擦で失われるエネルギーを水柱の高さ（m）で表したものです。Hazen-Williams の C 値は管内面の状態を表し、実際の材質と管の状態に合う値を使います。',
  },
}

const copyByLocale: Record<LocalizedLocale, SuiteCopy> = {
  th: {
    eyebrow: 'เครื่องมือวางแผนระบบน้ำบาดาล',
    title: 'คำนวณข้อมูลเบื้องต้นก่อนออกแบบระบบ',
    intro: 'เลือกเรื่องที่ต้องการรู้ แล้วกรอกข้อมูลโครงการ ผลจะคำนวณทันทีเพื่อช่วยวางแผนก่อนคุยกับทีมวิศวกรรม',
    inputs: 'ข้อมูลสำหรับคำนวณ',
    results: 'ผลคำนวณเบื้องต้น',
    reset: 'คืนค่าเริ่มต้น',
    copyResults: 'คัดลอกผลลัพธ์',
    copied: 'คัดลอกแล้ว',
    liveNote: 'ผลลัพธ์ปรับตามข้อมูลที่กรอกโดยอัตโนมัติ',
    disclaimerTitle: 'ข้อควรทราบ',
    disclaimer: 'เครื่องมือนี้ใช้สำหรับการวางแผนเบื้องต้น ไม่ใช่แบบก่อสร้าง การรับรองปริมาณน้ำ หรือคำเสนอราคา ควรยืนยันข้อมูลด้วยการสำรวจ การสูบทดสอบ (Pumping Test) ผลวิเคราะห์น้ำ และการออกแบบโดยผู้เชี่ยวชาญ',
    unavailable: 'ต้องมีค่าระดับน้ำลดมากกว่า 0 จึงจะคำนวณได้',
    tools: {
      demand: { name: 'อัตราสูบและความต้องการ', description: 'หาอัตราสูบที่ระบบควรรองรับจากการใช้น้ำรายวัน' },
      storage: { name: 'ถังพักและน้ำสำรอง', description: 'ประเมินปริมาตรใช้งานและขนาดถังขั้นต่ำ' },
      energy: { name: 'กำลังปั๊มและค่าไฟ', description: 'ประเมินกำลังไฟ พลังงาน และค่าใช้จ่ายรายเดือน' },
      well: { name: 'ผลสูบทดสอบ', description: 'หาระยะน้ำลดและอัตราสูบต่อระยะน้ำลด' },
      cost: { name: 'เปรียบเทียบต้นทุนน้ำ', description: 'เปรียบเทียบค่าใช้จ่ายรายเดือนของสองแหล่งน้ำ' },
      pipe: { name: 'ความเร็วและแรงเสียดทานในท่อ', description: 'ประเมินความเร็วน้ำและเฮดที่เสียไปกับแรงเสียดทาน' },
      pressure: { name: 'แปลงแรงดันและเฮด', description: 'แปลง bar เป็นเมตรน้ำ kPa และ psi สำหรับตรวจงานภาคสนาม' },
      casing: { name: 'ปริมาตรน้ำในบ่อ', description: 'หาปริมาตรน้ำในท่อกรุจากเส้นผ่านศูนย์กลางและความยาวช่วงน้ำ' },
      motor: { name: 'กระแสมอเตอร์ปั๊ม', description: 'ประเมินกระแสมอเตอร์ 1 เฟสหรือ 3 เฟสจากกำลังและแรงดัน' },
    },
    labels: {
      dailyDemand: 'ความต้องการใช้น้ำต่อวัน', pumpHours: 'ชั่วโมงสูบต่อวัน', reservePercent: 'น้ำสำรองและการเติบโต', designDemand: 'ความต้องการเพื่อออกแบบ', requiredFlow: 'อัตราสูบที่ต้องรองรับ', minimumBuffer: 'ถังพักเบื้องต้น 25%', backupHours: 'ระยะเวลาสำรองน้ำ', usablePercent: 'สัดส่วนปริมาตรถังที่ใช้งานได้', averageHourlyDemand: 'ความต้องการเฉลี่ยต่อชั่วโมง', usableStorage: 'ปริมาตรน้ำสำรองที่ต้องใช้', nominalTankVolume: 'ขนาดถังที่ควรมี', flowRate: 'อัตราการไหล', totalHead: 'เฮดรวมของระบบ', efficiency: 'ประสิทธิภาพรวมปั๊มและมอเตอร์', operatingHours: 'ชั่วโมงเดินเครื่องต่อวัน', electricityRate: 'ค่าไฟเฉลี่ย', hydraulicPower: 'กำลังน้ำ', inputPower: 'กำลังไฟฟ้าที่ปั๊มต้องใช้', dailyEnergy: 'พลังงานต่อวัน', monthlyEnergy: 'พลังงานต่อเดือน', monthlyElectricityCost: 'ค่าไฟประมาณการต่อเดือน', staticWaterLevel: 'ก่อนสูบ: ระยะปากบ่อถึงน้ำที่ฟื้นตัวแล้ว', pumpingWaterLevel: 'ระดับน้ำขณะสูบจากปากบ่อ', pumpingRate: 'อัตราสูบขณะทดสอบ', drawdown: 'ระยะน้ำลด', specificCapacity: 'อัตราสูบต่อระยะน้ำลด', operatingDays: 'จำนวนวันใช้งานต่อเดือน', groundwaterUnitCost: 'ต้นทุนน้ำบาดาลต่อหน่วย', alternativeUnitCost: 'ต้นทุนแหล่งน้ำเปรียบเทียบต่อหน่วย', monthlyVolume: 'ปริมาณน้ำต่อเดือน', groundwaterCost: 'ต้นทุนน้ำบาดาลต่อเดือน', alternativeCost: 'ต้นทุนแหล่งน้ำเปรียบเทียบ', monthlyDifference: 'ส่วนต่างค่าใช้จ่ายต่อเดือน', differencePercent: 'ส่วนต่างเทียบกับแหล่งน้ำเปรียบเทียบ', internalDiameter: 'เส้นผ่านศูนย์กลางภายใน', pipeLength: 'ความยาวท่อ', hazenWilliamsCoefficient: 'ค่าสัมประสิทธิ์ Hazen-Williams (C)', velocity: 'ความเร็วน้ำในท่อ', headLoss: 'เฮดสูญเสียตลอดช่วงท่อ', headLossPer100Metres: 'เฮดสูญเสียต่อท่อ 100 เมตร', pressureBar: 'แรงดันที่วัดได้', pressureHead: 'เฮดน้ำโดยประมาณ', pressureKilopascals: 'แรงดันกิโลพาสคัล', pressurePsi: 'แรงดัน psi', waterColumnLength: 'ความยาวช่วงที่มีน้ำ', casingVolume: 'ปริมาตรน้ำในท่อกรุ', litresPerMetre: 'ปริมาตรต่อความยาว 1 เมตร', motorOutputPower: 'กำลังเพลามอเตอร์', voltage: 'แรงดันไฟฟ้า', powerFactor: 'Power factor', motorEfficiency: 'ประสิทธิภาพมอเตอร์', phase: 'ระบบไฟฟ้า', singlePhase: '1 เฟส', threePhase: '3 เฟส', electricalInputPower: 'กำลังไฟฟ้าขาเข้า', apparentPower: 'กำลังไฟฟ้าปรากฏ', estimatedCurrent: 'กระแสใช้งานโดยประมาณ',
    },
  },
  en: {
    eyebrow: 'Groundwater planning tools',
    title: 'Build a preliminary system estimate',
    intro: 'Choose a question and enter your project data. Results update immediately to help you plan before speaking with an engineer.',
    inputs: 'Calculation inputs', results: 'Preliminary results', reset: 'Reset values', copyResults: 'Copy results', copied: 'Copied', liveNote: 'Results update automatically as inputs change.', disclaimerTitle: 'Important limitation', disclaimer: 'These tools support preliminary planning only. They are not construction design, a guarantee of well yield, or a quotation. Confirm assumptions through site investigation, pumping tests, water analysis and professional engineering.', unavailable: 'A drawdown greater than zero is required for this calculation.',
    tools: {
      demand: { name: 'Demand & pumping flow', description: 'Estimate the flow the system must support from daily demand.' },
      storage: { name: 'Buffer storage', description: 'Estimate required usable storage and nominal tank volume.' },
      energy: { name: 'Pump energy & cost', description: 'Estimate pump input power, energy use and monthly cost.' },
      well: { name: 'Pumping-test results', description: 'Find the water-level drop and pumping rate per metre of drop.' },
      cost: { name: 'Water cost comparison', description: 'Compare the monthly operating cost of two water sources.' },
      pipe: { name: 'Pipe velocity & friction', description: 'Estimate water speed and head lost to pipe friction.' },
      pressure: { name: 'Pressure & head conversion', description: 'Convert bar to metres of water, kPa and psi.' },
      casing: { name: 'Casing water volume', description: 'Calculate volume from diameter and water-column length.' },
      motor: { name: 'Pump motor current', description: 'Estimate single- or three-phase motor current.' },
    },
    labels: {
      dailyDemand: 'Daily water demand', pumpHours: 'Pumping hours per day', reservePercent: 'Reserve and growth allowance', designDemand: 'Design demand', requiredFlow: 'Required pumping flow', minimumBuffer: 'Preliminary 25% buffer', backupHours: 'Required backup duration', usablePercent: 'Usable share of tank volume', averageHourlyDemand: 'Average hourly demand', usableStorage: 'Required usable storage', nominalTankVolume: 'Nominal tank volume', flowRate: 'Flow rate', totalHead: 'Total dynamic head', efficiency: 'Combined pump and motor efficiency', operatingHours: 'Operating hours per day', electricityRate: 'Average electricity rate', hydraulicPower: 'Hydraulic power', inputPower: 'Estimated electrical input', dailyEnergy: 'Daily energy', monthlyEnergy: 'Monthly energy', monthlyElectricityCost: 'Estimated monthly electricity cost', staticWaterLevel: 'Before pumping: recovered depth below wellhead', pumpingWaterLevel: 'Pumping water level below wellhead', pumpingRate: 'Pumping-test flow rate', drawdown: 'Drawdown', specificCapacity: 'Pumping rate per metre of water-level drop', operatingDays: 'Operating days per month', groundwaterUnitCost: 'Groundwater unit cost', alternativeUnitCost: 'Comparison water unit cost', monthlyVolume: 'Monthly water volume', groundwaterCost: 'Monthly groundwater cost', alternativeCost: 'Monthly comparison-source cost', monthlyDifference: 'Monthly cost difference', differencePercent: 'Difference versus comparison source', internalDiameter: 'Internal diameter', pipeLength: 'Pipe length', hazenWilliamsCoefficient: 'Hazen-Williams coefficient (C)', velocity: 'Pipe velocity', headLoss: 'Head loss over pipe length', headLossPer100Metres: 'Head loss per 100 metres', pressureBar: 'Measured pressure', pressureHead: 'Approximate water head', pressureKilopascals: 'Pressure in kilopascals', pressurePsi: 'Pressure in psi', waterColumnLength: 'Water-column length', casingVolume: 'Water volume inside casing', litresPerMetre: 'Volume per metre', motorOutputPower: 'Motor shaft output', voltage: 'Supply voltage', powerFactor: 'Power factor', motorEfficiency: 'Motor efficiency', phase: 'Electrical phase', singlePhase: 'Single phase', threePhase: 'Three phase', electricalInputPower: 'Electrical input power', apparentPower: 'Apparent power', estimatedCurrent: 'Estimated line current',
    },
  },
  zh: {
    eyebrow: '地下水规划工具', title: '建立系统初步估算', intro: '选择想了解的问题，输入项目数据，即可查看结果，为与工程师讨论前的规划做准备。', inputs: '计算输入', results: '初步结果', reset: '恢复默认值', copyResults: '复制结果', copied: '已复制', liveNote: '输入变化时结果会自动更新。', disclaimerTitle: '重要说明', disclaimer: '这些工具仅用于前期规划，不构成施工设计、出水量保证或报价。请通过现场调查、抽水试验、水质分析和专业工程设计确认。', unavailable: '水位降深必须大于零才能计算。',
    tools: { demand: { name: '需水量与抽水流量', description: '根据每日需水量估算系统所需流量。' }, storage: { name: '缓冲储水', description: '估算有效储水量和水箱标称容积。' }, energy: { name: '水泵能耗与费用', description: '估算输入功率、耗电量和月度费用。' }, well: { name: '抽水试验结果', description: '计算水位下降量，以及每下降一米对应的抽水量。' }, cost: { name: '水源成本比较', description: '比较两种水源的月度运行成本。' }, pipe: { name: '管内流速与摩擦', description: '估算水流速度和管道摩擦造成的水头损失。' }, pressure: { name: '压力与水头换算', description: '将bar换算为米水柱、kPa和psi。' }, casing: { name: '井管水量', description: '根据内径和水柱长度计算井管内水量。' }, motor: { name: '水泵电机电流', description: '估算单相或三相电机运行电流。' } },
    labels: { dailyDemand: '每日需水量', pumpHours: '每日抽水时间', reservePercent: '储备与增长比例', designDemand: '设计需水量', requiredFlow: '所需抽水流量', minimumBuffer: '初步25%缓冲储水', backupHours: '所需备用时间', usablePercent: '水箱可用容积比例', averageHourlyDemand: '平均小时需水量', usableStorage: '所需有效储水量', nominalTankVolume: '水箱标称容积', flowRate: '流量', totalHead: '系统总扬程', efficiency: '水泵与电机综合效率', operatingHours: '每日运行时间', electricityRate: '平均电价', hydraulicPower: '水力功率', inputPower: '估算输入功率', dailyEnergy: '每日耗电量', monthlyEnergy: '每月耗电量', monthlyElectricityCost: '预计每月电费', staticWaterLevel: '抽水前：井口至恢复水位的距离', pumpingWaterLevel: '井口以下动水位', pumpingRate: '抽水试验流量', drawdown: '水位降深', specificCapacity: '每米水位下降对应的抽水量', operatingDays: '每月运行天数', groundwaterUnitCost: '地下水单位成本', alternativeUnitCost: '对比水源单位成本', monthlyVolume: '每月用水量', groundwaterCost: '每月地下水成本', alternativeCost: '每月对比水源成本', monthlyDifference: '每月费用差额', differencePercent: '相对于对比水源的差额', internalDiameter: '内径', pipeLength: '管长', hazenWilliamsCoefficient: 'Hazen-Williams系数(C)', velocity: '管内流速', headLoss: '全管段水头损失', headLossPer100Metres: '每100米水头损失', pressureBar: '测量压力', pressureHead: '近似水头', pressureKilopascals: '千帕压力', pressurePsi: 'psi压力', waterColumnLength: '水柱长度', casingVolume: '井管内水量', litresPerMetre: '每米容积', motorOutputPower: '电机轴输出功率', voltage: '电源电压', powerFactor: '功率因数', motorEfficiency: '电机效率', phase: '电源相数', singlePhase: '单相', threePhase: '三相', electricalInputPower: '电气输入功率', apparentPower: '视在功率', estimatedCurrent: '估算线电流', },
  },
  ja: {
    eyebrow: '地下水計画ツール', title: 'システムの初期概算を作成', intro: '知りたいことを選び、計画のデータを入力すると、すぐに結果が表示されます。技術者に相談する前の検討に役立ててください。', inputs: '計算条件', results: '概算結果', reset: '初期値に戻す', copyResults: '結果をコピー', copied: 'コピー済み', liveNote: '入力の変更に合わせて結果が自動更新されます。', disclaimerTitle: '重要な注意事項', disclaimer: '本ツールは初期計画用であり、施工設計、井戸揚水量の保証、見積書ではありません。現地調査、揚水試験、水質分析、専門家による設計で確認してください。', unavailable: '計算には0より大きい水位低下量が必要です。',
    tools: { demand: { name: '需要量・揚水量', description: '1日の需要量から必要なシステム流量を概算します。' }, storage: { name: '予備貯水', description: '有効貯水量とタンク公称容量を概算します。' }, energy: { name: 'ポンプ電力・費用', description: '入力電力、消費電力量、月額費用を概算します。' }, well: { name: '揚水試験の結果', description: '水位の低下量と、低下1m当たりの揚水量を求めます。' }, cost: { name: '水源コスト比較', description: '2つの水源の月間運転費を比較します。' }, pipe: { name: '管内の流速・摩擦', description: '水の速さと、管の摩擦で失われる水頭を概算します。' }, pressure: { name: '圧力・水頭換算', description: 'barを水頭、kPa、psiへ換算します。' }, casing: { name: 'ケーシング内水量', description: '内径と水柱長から井戸内水量を計算します。' }, motor: { name: 'ポンプモーター電流', description: '単相・三相モーターの電流を概算します。' } },
    labels: { dailyDemand: '1日の水需要', pumpHours: '1日の揚水時間', reservePercent: '予備・成長率', designDemand: '設計需要量', requiredFlow: '必要揚水量', minimumBuffer: '初期25%予備貯水', backupHours: '必要な予備時間', usablePercent: 'タンク有効容量率', averageHourlyDemand: '平均時間需要量', usableStorage: '必要有効貯水量', nominalTankVolume: 'タンク公称容量', flowRate: '流量', totalHead: '全揚程', efficiency: 'ポンプ・モーター総合効率', operatingHours: '1日の運転時間', electricityRate: '平均電力単価', hydraulicPower: '水動力', inputPower: '推定入力電力', dailyEnergy: '1日の電力量', monthlyEnergy: '月間電力量', monthlyElectricityCost: '推定月額電気料金', staticWaterLevel: '揚水前：井戸口から回復した水面まで', pumpingWaterLevel: '井戸口からの揚水水位', pumpingRate: '揚水試験流量', drawdown: '水位低下量', specificCapacity: '水位低下1m当たりの揚水量', operatingDays: '月間運転日数', groundwaterUnitCost: '地下水単価', alternativeUnitCost: '比較水源単価', monthlyVolume: '月間水量', groundwaterCost: '月間地下水費', alternativeCost: '比較水源の月間費用', monthlyDifference: '月間費用差', differencePercent: '比較水源に対する差率', internalDiameter: '内径', pipeLength: '管長', hazenWilliamsCoefficient: 'Hazen-Williams係数(C)', velocity: '管内流速', headLoss: '配管全長の損失水頭', headLossPer100Metres: '100m当たりの損失水頭', pressureBar: '測定圧力', pressureHead: '概算水頭', pressureKilopascals: '圧力(kPa)', pressurePsi: '圧力(psi)', waterColumnLength: '水柱長', casingVolume: 'ケーシング内水量', litresPerMetre: '1m当たりの容量', motorOutputPower: 'モーター軸出力', voltage: '電源電圧', powerFactor: '力率', motorEfficiency: 'モーター効率', phase: '電源相', singlePhase: '単相', threePhase: '三相', electricalInputPower: '電気入力電力', apparentPower: '皮相電力', estimatedCurrent: '推定線電流', },
  },
}

const toolIcons: Record<ToolId, LucideIcon> = {
  demand: Gauge,
  storage: Database,
  energy: Zap,
  well: Activity,
  cost: DollarSign,
  pipe: Ruler,
  pressure: CircleGauge,
  casing: Cylinder,
  motor: Cable,
}

const initialValues = {
  demand: { dailyDemand: 100, pumpHours: 16, reservePercent: 20 },
  storage: { dailyDemand: 100, backupHours: 12, usablePercent: 80 },
  energy: { flowRate: 10, totalHead: 60, efficiencyPercent: 70, operatingHours: 16, electricityRate: 4.2 },
  well: { staticWaterLevel: 12, pumpingWaterLevel: 27, pumpingRate: 30 },
  cost: { dailyDemand: 100, operatingDays: 30, groundwaterUnitCost: 5, alternativeUnitCost: 18 },
  pipe: { flowRate: 10, internalDiameter: 80, pipeLength: 100, hazenWilliamsCoefficient: 130 },
  pressure: { pressureBar: 3 },
  casing: { internalDiameter: 200, waterColumnLength: 30 },
  motor: { motorOutputPower: 7.5, voltage: 400, powerFactor: 0.85, efficiencyPercent: 90, phase: 'three' as 'single' | 'three' },
}

type ToolField = NumericRules & {
  key: string
  id: string
  label: keyof SuiteCopy['labels']
  unit: string
}

const toolFields: Record<ToolId, ToolField[]> = {
  demand: [
    { key: 'dailyDemand', id: 'gw-demand-daily', label: 'dailyDemand', unit: 'm³/day' },
    { key: 'pumpHours', id: 'gw-demand-hours', label: 'pumpHours', unit: 'h/day', min: 1, max: 24 },
    { key: 'reservePercent', id: 'gw-demand-reserve', label: 'reservePercent', unit: '%', max: 100 },
  ],
  storage: [
    { key: 'dailyDemand', id: 'gw-storage-daily', label: 'dailyDemand', unit: 'm³/day' },
    { key: 'backupHours', id: 'gw-storage-hours', label: 'backupHours', unit: 'h', max: 168 },
    { key: 'usablePercent', id: 'gw-storage-usable', label: 'usablePercent', unit: '%', min: 1, max: 100 },
  ],
  energy: [
    { key: 'flowRate', id: 'gw-energy-flow', label: 'flowRate', unit: 'm³/h' },
    { key: 'totalHead', id: 'gw-energy-head', label: 'totalHead', unit: 'm' },
    { key: 'efficiencyPercent', id: 'gw-energy-efficiency', label: 'efficiency', unit: '%', min: 1, max: 100 },
    { key: 'operatingHours', id: 'gw-energy-hours', label: 'operatingHours', unit: 'h/day', max: 24 },
    { key: 'electricityRate', id: 'gw-energy-rate', label: 'electricityRate', unit: 'THB/kWh' },
  ],
  well: [
    { key: 'staticWaterLevel', id: 'gw-well-static', label: 'staticWaterLevel', unit: 'm' },
    { key: 'pumpingWaterLevel', id: 'gw-well-pumping', label: 'pumpingWaterLevel', unit: 'm' },
    { key: 'pumpingRate', id: 'gw-well-rate', label: 'pumpingRate', unit: 'm³/h' },
  ],
  cost: [
    { key: 'dailyDemand', id: 'gw-cost-daily', label: 'dailyDemand', unit: 'm³/day' },
    { key: 'operatingDays', id: 'gw-cost-days', label: 'operatingDays', unit: 'day/month', max: 31 },
    { key: 'groundwaterUnitCost', id: 'gw-cost-groundwater', label: 'groundwaterUnitCost', unit: 'THB/m³' },
    { key: 'alternativeUnitCost', id: 'gw-cost-alternative', label: 'alternativeUnitCost', unit: 'THB/m³' },
  ],
  pipe: [
    { key: 'flowRate', id: 'gw-pipe-flow', label: 'flowRate', unit: 'm³/h' },
    { key: 'internalDiameter', id: 'gw-pipe-diameter', label: 'internalDiameter', unit: 'mm', min: 1, max: 5000 },
    { key: 'pipeLength', id: 'gw-pipe-length', label: 'pipeLength', unit: 'm' },
    { key: 'hazenWilliamsCoefficient', id: 'gw-pipe-coefficient', label: 'hazenWilliamsCoefficient', unit: 'C', min: 1, max: 200 },
  ],
  pressure: [{ key: 'pressureBar', id: 'gw-pressure-bar', label: 'pressureBar', unit: 'bar' }],
  casing: [
    { key: 'internalDiameter', id: 'gw-casing-diameter', label: 'internalDiameter', unit: 'mm', min: 1, max: 5000 },
    { key: 'waterColumnLength', id: 'gw-casing-length', label: 'waterColumnLength', unit: 'm' },
  ],
  motor: [
    { key: 'motorOutputPower', id: 'gw-motor-power', label: 'motorOutputPower', unit: 'kW' },
    { key: 'voltage', id: 'gw-motor-voltage', label: 'voltage', unit: 'V', min: 1, max: 50000 },
    { key: 'powerFactor', id: 'gw-motor-power-factor', label: 'powerFactor', unit: '0–1', min: 0.1, max: 1 },
    { key: 'efficiencyPercent', id: 'gw-motor-efficiency', label: 'motorEfficiency', unit: '%', min: 1, max: 100 },
  ],
}

const reportCopy = {
  th: { invalid: 'กรุณากรอกข้อมูลให้ครบและแก้ช่องที่มีข้อความแจ้ง ก่อนดูหรือคัดลอกผลลัพธ์', tooLarge: 'ข้อมูลชุดนี้ให้ผลลัพธ์เกินช่วงที่เครื่องมือคำนวณได้ กรุณาตรวจสอบค่าและหน่วย', wellLevel: 'ระดับน้ำขณะสูบต้องลึกกว่าระดับก่อนสูบ (ตัวเลขมากกว่า) จึงจะคำนวณระยะน้ำลดได้', assumptions: 'สมมติฐานและวิธีอ่าน', source: 'หน้าที่มา', copyFailed: 'คัดลอกไม่สำเร็จ กรุณาลองอีกครั้ง หรือเลือกข้อความรายงานด้านล่างเพื่อคัดลอกเอง', report: 'ดูรายงานสำหรับบันทึก', selectReport: 'เลือกข้อความรายงาน', inputHelp: 'กรอกตัวเลขของโครงการ ใช้จุดสำหรับทศนิยม เช่น 12.5 หน่วยแสดงข้างแต่ละช่อง' },
  en: { invalid: 'Complete the inputs and correct the marked fields before viewing or copying results.', tooLarge: 'These inputs produce a result outside the supported calculation range. Check the values and units.', wellLevel: 'The pumping level must be deeper than the recovered level (a larger number) to calculate drawdown.', assumptions: 'Assumptions and reading guide', source: 'Source page', copyFailed: 'Copy failed. Try again or select the report text below to copy it manually.', report: 'View report for saving', selectReport: 'Select report text', inputHelp: 'Enter your project values. Use a decimal point, for example 12.5. Units appear beside each field.' },
  zh: { invalid: '请填写完整数据并修正标记的字段后，再查看或复制结果。', tooLarge: '这些输入产生的结果超出计算范围。请核对数值和单位。', wellLevel: '抽水时水位必须比恢复水位更深（数值更大），才能计算降深。', assumptions: '假设与阅读说明', source: '来源页面', copyFailed: '复制失败。请重试，或选择下方报告文本手动复制。', report: '查看可保存的报告', selectReport: '选择报告文本', inputHelp: '请输入项目数值。小数请使用点，例如12.5。每项旁边均显示单位。' },
  ja: { invalid: '結果の表示・コピーの前に、すべての項目を入力し、指摘された項目を修正してください。', tooLarge: '入力値による結果が計算可能な範囲を超えています。数値と単位を確認してください。', wellLevel: '水位低下量を計算するには、揚水中の水位が回復水位より深い（数値が大きい）必要があります。', assumptions: '計算の前提と読み方', source: '参照ページ', copyFailed: 'コピーできませんでした。再試行するか、下のレポートを選択して手動でコピーしてください。', report: '保存用レポートを表示', selectReport: 'レポートの文章を選択', inputHelp: '計画の数値を入力してください。小数点は「.」を使います（例：12.5）。各項目に単位を表示しています。' },
}

const printCopy = {
  th: { action: 'พิมพ์รายงาน', failed: 'เปิดหน้าพิมพ์ไม่สำเร็จ กรุณาใช้รายงานด้านล่างเพื่อบันทึกหรือคัดลอก' },
  en: { action: 'Print estimate', failed: 'The print dialog could not open. Use the report below to save or copy the estimate.' },
  zh: { action: '打印估算报告', failed: '无法打开打印窗口。请使用下方报告保存或复制估算结果。' },
  ja: { action: '概算を印刷', failed: '印刷画面を開けませんでした。下のレポートを保存またはコピーしてください。' },
}

const toolAssumptions: Record<LocalizedLocale, Record<ToolId, string>> = {
  th: {
    demand: 'เพิ่มสัดส่วนน้ำสำรองในความต้องการรายวัน แล้วหารด้วยชั่วโมงสูบ ถังพักตัวอย่างเท่ากับ 25% ของความต้องการเพื่อออกแบบ ไม่รวมรูปแบบการใช้น้ำช่วงพีก',
    storage: 'สมมติว่าใช้น้ำสม่ำเสมอตลอด 24 ชั่วโมง ขนาดถังคำนึงถึงสัดส่วนปริมาตรที่ใช้งานได้ แต่ยังไม่รวมข้อกำหนดน้ำดับเพลิงหรือช่วงพีก',
    energy: 'ใช้น้ำความหนาแน่น 1,000 kg/m³ และแรงโน้มถ่วง 9.80665 m/s² เดือนละ 30 วัน ประสิทธิภาพและชั่วโมงเดินเครื่องคงที่ ไม่รวมค่าบริการคงที่และค่าไฟประเภทอื่น',
    well: 'วัดทั้งสองระดับจากปากบ่อจุดเดียวกัน ระยะน้ำลดต้องมากกว่า 0 ไม่สามารถใช้ผลนี้รับรองปริมาณน้ำที่สูบได้อย่างยั่งยืน',
    cost: 'เปรียบเทียบปริมาณน้ำเท่ากันตามจำนวนวันที่กรอก ส่วนต่างบวกหมายถึงน้ำบาดาลถูกกว่า ไม่รวมค่าลงทุนและต้นทุนที่ไม่ได้รวมในราคาต่อหน่วย',
    pipe: 'ใช้สมการ Hazen-Williams สำหรับท่อตรงที่น้ำไหลเต็มท่อ เส้นผ่านศูนย์กลางต้องเป็นขนาดภายใน ไม่รวมข้อต่อ วาล์ว และความต่างระดับ',
    pressure: 'ใช้ความหนาแน่นน้ำ 1,000 kg/m³ และแรงโน้มถ่วง 9.80665 m/s² เป็นการแปลงหน่วยแรงดัน ไม่ใช่เฮดรวมของระบบ',
    casing: 'ถือว่าช่วงที่มีน้ำเป็นทรงกระบอกตามเส้นผ่านศูนย์กลางภายในและความยาวที่กรอก ไม่รวมปริมาตรที่ปั๊มหรือท่อภายในแทนที่',
    motor: 'ใช้กำลังเพลา ประสิทธิภาพ และ power factor ที่กรอก ระบบ 3 เฟสถือว่าโหลดสมดุลและใช้แรงดันระหว่างสาย ไม่รวมกระแสเริ่มเดินเครื่อง',
  },
  en: {
    demand: 'Daily demand includes the reserve allowance and is divided by pumping hours. The example buffer is 25% of design demand; peak demand patterns are not modelled.',
    storage: 'Demand is spread evenly over 24 hours. Nominal volume accounts for the usable tank share; fire storage and peak demand requirements are not included.',
    energy: 'Water density is 1,000 kg/m³ and gravity is 9.80665 m/s². A month is 30 days with constant efficiency and operating hours. Fixed charges and other tariffs are excluded.',
    well: 'Both water levels use the same wellhead reference. Drawdown must be positive. The result does not establish sustainable yield.',
    cost: 'Both sources supply the same volume over the entered operating days. A positive difference means groundwater costs less. Capital costs and costs omitted from unit rates are excluded.',
    pipe: 'Hazen-Williams estimates friction in a straight, full pipe using its internal diameter. Fittings, valves and elevation changes are excluded.',
    pressure: 'Water density is 1,000 kg/m³ and gravity is 9.80665 m/s². This converts pressure units; it does not calculate total dynamic head.',
    casing: 'The water column is a cylinder using the entered internal diameter and length. Displacement by the pump and internal piping is excluded.',
    motor: 'Uses the entered shaft power, efficiency and power factor. Three-phase supply assumes a balanced load and line-to-line voltage. Starting current is excluded.',
  },
  zh: {
    demand: '每日需水量加上储备比例后除以抽水时间。示例缓冲储水为设计需水量的25%；不模拟高峰用水规律。',
    storage: '假设24小时均匀用水。标称容积考虑水箱可用比例；不含消防储水及高峰需求。',
    energy: '水密度取1,000 kg/m³，重力加速度取9.80665 m/s²。每月按30天，效率与运行时间固定。不含固定费用及其他电价项目。',
    well: '两项水位均以同一井口为基准，降深必须为正。结果不能用于确定可持续开采量。',
    cost: '两种水源在输入的运行天数内供水量相同。正差额表示地下水成本更低。不含初始投资及未计入单价的费用。',
    pipe: '采用Hazen-Williams公式，按实际内径估算直管满管流的摩擦损失。不含管件、阀门及高程变化。',
    pressure: '水密度取1,000 kg/m³，重力加速度取9.80665 m/s²。仅换算压力单位，不计算系统总扬程。',
    casing: '按输入的内径及长度将水柱视为圆柱体。不扣除水泵及内部管道占据的体积。',
    motor: '使用输入的轴功率、效率与功率因数。三相计算假设负载平衡并采用线电压。不含启动电流。',
  },
  ja: {
    demand: '1日の需要に予備率を加え、揚水時間で割ります。予備貯水の例は設計需要量の25%で、ピーク時の需要は考慮しません。',
    storage: '24時間均等に使用すると仮定します。公称容量は有効容量率を考慮しますが、消防用貯水やピーク需要は含みません。',
    energy: '水密度は1,000 kg/m³、重力加速度は9.80665 m/s²です。1か月を30日とし、効率と運転時間は一定です。基本料金などは含みません。',
    well: '両水位は同じ井戸口を基準とし、水位低下量は正である必要があります。持続可能な揚水量を示すものではありません。',
    cost: '入力した運転日数で、両水源が同量を供給すると仮定します。差が正なら地下水の費用が低いことを示します。設備投資と単価に含めない費用は除外します。',
    pipe: 'Hazen-Williams式を用い、内径から満流の直管の摩擦損失を概算します。継手、バルブ、高低差は含みません。',
    pressure: '水密度は1,000 kg/m³、重力加速度は9.80665 m/s²です。圧力単位の換算であり、全揚程の計算ではありません。',
    casing: '入力した内径と長さによる円柱として計算します。ポンプや内部配管が占める容積は差し引きません。',
    motor: '入力した軸出力、効率、力率を使います。三相は平衡負荷と線間電圧を仮定します。始動電流は含みません。',
  },
}

type ToolDrafts = Record<ToolId, Record<string, string>>
const initialDrafts = Object.fromEntries(Object.entries(initialValues).map(([tool, values]) => [tool, Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)]))])) as ToolDrafts

function ResultRow({ label, value }: { label: string; value: string }) {
  return <div className="gw-result-row"><dt>{label}</dt><dd>{value}</dd></div>
}

function PhaseField({
  label,
  value,
  singlePhase,
  threePhase,
  onChange,
}: {
  label: string
  value: 'single' | 'three'
  singlePhase: string
  threePhase: string
  onChange: (value: 'single' | 'three') => void
}) {
  return (
    <label className="gw-field" htmlFor="gw-motor-phase">
      <span className="gw-field-label">{label}</span>
      <select
        className="gw-field-select"
        id="gw-motor-phase"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as 'single' | 'three')}
      >
        <option value="single">{singlePhase}</option>
        <option value="three">{threePhase}</option>
      </select>
    </label>
  )
}

export default function GroundwaterCalculator({ locale = 'th' }: { locale?: LocalizedLocale }) {
  const copy = copyByLocale[locale]
  const tasks = taskCopy[locale]
  const reportLabels = reportCopy[locale]
  const toolPanelRef = useRef<HTMLDivElement>(null)
  const resultsContentRef = useRef<HTMLDivElement>(null)
  const toolTitleRef = useRef<HTMLHeadingElement>(null)
  const moreToolsRef = useRef<HTMLDetailsElement>(null)
  const reportTextRef = useRef<HTMLTextAreaElement>(null)
  const reportDetailsRef = useRef<HTMLDetailsElement>(null)
  const interactionVersionRef = useRef(0)
  const [activeTool, setActiveTool] = useState<ToolId>('demand')
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'copied' | 'failed' | 'print-failed'>('idle')
  const [savedReport, setSavedReport] = useState('')
  const [printReport, setPrintReport] = useState('')
  const [drafts, setDrafts] = useState(initialDrafts)
  const { values, validTools } = useMemo(() => {
    const parsed = {} as Record<ToolId, Record<string, number | string>>
    const valid = {} as Record<ToolId, boolean>
    for (const tool of toolOrder) {
      parsed[tool] = {}
      valid[tool] = true
      for (const field of toolFields[tool]) {
        const result = validateNumericDraft(drafts[tool][field.key], { min: 0, ...field })
        parsed[tool][field.key] = result.value ?? Number.NaN
        if (result.error) valid[tool] = false
      }
    }
    parsed.motor.phase = drafts.motor.phase
    return { values: parsed as typeof initialValues, validTools: valid }
  }, [drafts])
  const { demand, storage, energy, well, cost, pipe, pressure, casing, motor } = values
  const usesExampleValues = JSON.stringify(drafts[activeTool]) === JSON.stringify(initialDrafts[activeTool])
  const invalidWellLevel = validTools.well && well.pumpingWaterLevel <= well.staticWaterLevel

  const demandResult = useMemo(() => calculateGroundwaterPlan(demand), [demand])
  const storageResult = useMemo(() => calculateStoragePlan(storage), [storage])
  const energyResult = useMemo(() => calculatePumpEnergy(energy), [energy])
  const wellResult = useMemo(() => calculateWellPerformance(well), [well])
  const costResult = useMemo(() => calculateWaterCostComparison(cost), [cost])
  const pipeResult = useMemo(() => calculatePipeHydraulics(pipe), [pipe])
  const pressureResult = useMemo(() => calculatePressureConversion(pressure.pressureBar), [pressure])
  const casingResult = useMemo(() => calculateCasingVolume(casing), [casing])
  const motorResult = useMemo(() => calculateMotorCurrent(motor), [motor])
  const formatter = useMemo(() => new Intl.NumberFormat(localeInfo[locale].htmlLang, { maximumFractionDigits: 2 }), [locale])
  const moneyFormatter = useMemo(() => new Intl.NumberFormat(localeInfo[locale].htmlLang, { maximumFractionDigits: 0 }), [locale])
  const format = (value: number) => formatter.format(value)
  const money = (value: number) => moneyFormatter.format(value)
  const activeMeta = copy.tools[activeTool]
  const ActiveIcon = toolIcons[activeTool]
  const activeResult = { demand: demandResult, storage: storageResult, energy: energyResult, well: wellResult, cost: costResult, pipe: pipeResult, pressure: pressureResult, casing: casingResult, motor: motorResult }[activeTool]
  const finiteResults = Object.values(activeResult).every((value) => typeof value !== 'number' || Number.isFinite(value))
  const inputsValid = validTools[activeTool] && !(activeTool === 'well' && invalidWellLevel)
  const resultsAvailable = inputsValid && finiteResults
  const copied = copyFeedback === 'copied'

  const clearFeedback = () => {
    interactionVersionRef.current += 1
    setCopyFeedback('idle')
    setSavedReport('')
    setPrintReport('')
    if (reportDetailsRef.current) reportDetailsRef.current.open = false
  }

  const updateDraft = (key: string, value: string) => {
    clearFeedback()
    setDrafts((current) => ({ ...current, [activeTool]: { ...current[activeTool], [key]: value } }))
  }

  const selectTool = (toolId: ToolId) => {
    clearFeedback()
    setActiveTool(toolId)
    if (toolOrder.indexOf(toolId) >= 3 && moreToolsRef.current) moreToolsRef.current.open = true
    window.requestAnimationFrame(() => {
      toolTitleRef.current?.focus({ preventScroll: true })
      toolPanelRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
    })
  }

  useEffect(() => {
    const applyLinkedTool = () => {
      const tool = window.location.hash.replace(/^#gw-tab-/, '')
      if (!toolOrder.includes(tool as ToolId)) return
      interactionVersionRef.current += 1
      setCopyFeedback('idle')
      setSavedReport('')
      setActiveTool(tool as ToolId)
      if (toolOrder.indexOf(tool as ToolId) >= 3 && moreToolsRef.current) moreToolsRef.current.open = true
      window.requestAnimationFrame(() => {
        toolTitleRef.current?.focus({ preventScroll: true })
        toolPanelRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
      })
    }
    const initialFrame = window.requestAnimationFrame(applyLinkedTool)
    window.addEventListener('hashchange', applyLinkedTool)
    const finishPrinting = () => setPrintReport('')
    window.addEventListener('afterprint', finishPrinting)
    return () => {
      window.cancelAnimationFrame(initialFrame)
      window.removeEventListener('hashchange', applyLinkedTool)
      window.removeEventListener('afterprint', finishPrinting)
    }
  }, [])

  const createActiveReport = () => {
    if (!resultsAvailable) return ''
    const resultText = resultsContentRef.current?.innerText.trim()
    if (!resultText) return ''
    const inputs = toolFields[activeTool].map((field) => ({ label: copy.labels[field.label], value: drafts[activeTool][field.key], unit: field.unit }))
    if (activeTool === 'motor') inputs.push({ label: copy.labels.phase, value: motor.phase === 'single' ? copy.labels.singlePhase : copy.labels.threePhase, unit: '' })
    return buildLearningReport({
      title: activeMeta.name,
      status: usesExampleValues ? tasks.example : tasks.adjusted,
      inputsHeading: copy.inputs,
      inputs,
      resultsHeading: copy.results,
      results: resultText,
      assumptionsHeading: reportLabels.assumptions,
      assumptions: [toolAssumptions[locale][activeTool], toolReadingHelp[locale][activeTool]].filter(Boolean).join('\n'),
      limitationsHeading: copy.disclaimerTitle,
      limitations: copy.disclaimer,
      sourceHeading: reportLabels.source,
      pageUrl: window.location.href,
    })
  }

  const copyActiveResults = async () => {
    const text = createActiveReport()
    if (!text) return
    const version = interactionVersionRef.current
    setSavedReport(text)
    setCopyFeedback('idle')

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        const focusedElement = document.activeElement
        try {
          textArea.select()
          if (!document.execCommand('copy')) throw new Error('Clipboard unavailable')
        } finally {
          textArea.remove()
          if (focusedElement instanceof HTMLElement) focusedElement.focus({ preventScroll: true })
        }
      }

      if (version === interactionVersionRef.current) setCopyFeedback('copied')
    } catch {
      if (version === interactionVersionRef.current) {
        setCopyFeedback('failed')
        if (reportDetailsRef.current) reportDetailsRef.current.open = true
      }
    }
  }

  const resetActiveTool = () => {
    clearFeedback()
    setDrafts((current) => ({ ...current, [activeTool]: initialDrafts[activeTool] }))
  }

  const printActiveResults = () => {
    const text = createActiveReport()
    if (!text) return
    flushSync(() => {
      setCopyFeedback('idle')
      setSavedReport(text)
      setPrintReport(text)
    })
    try {
      window.print()
    } catch {
      setPrintReport('')
      setCopyFeedback('print-failed')
      if (reportDetailsRef.current) reportDetailsRef.current.open = true
    }
  }

  const renderToolButton = (toolId: ToolId) => {
    const Icon = toolIcons[toolId]
    return (
      <button type="button" aria-pressed={activeTool === toolId} aria-controls="gw-tool-panel" id={`gw-tab-${toolId}`} className={activeTool === toolId ? 'is-active' : ''} onClick={() => selectTool(toolId)} key={toolId}>
        <strong><Icon aria-hidden="true" />{copy.tools[toolId].name}</strong>
        <small>{copy.tools[toolId].description}</small>
      </button>
    )
  }

  return (
    <section className="gw-suite" aria-labelledby="gw-suite-title">
      <header className="gw-suite-header">
        <div>
          <p>{copy.eyebrow}</p>
          <h2 id="gw-suite-title"><span className="gw-suite-mark"><Droplets aria-hidden="true" /></span>{copy.title}</h2>
          <span>{copy.intro}</span>
        </div>
      </header>

      <div className="gw-tool-picker" role="group" aria-label={tasks.common}>
        <h3>{tasks.common}</h3>
        <div className="gw-tool-tabs">{toolOrder.slice(0, 3).map(renderToolButton)}</div>
        <details ref={moreToolsRef} className="gw-more-tools">
          <summary>{tasks.more}</summary>
          <div className="gw-tool-tabs">{toolOrder.slice(3).map(renderToolButton)}</div>
        </details>
      </div>

      <div ref={toolPanelRef} className="gw-tool-panel" role="region" id="gw-tool-panel" aria-labelledby="gw-active-tool-title">
        <div className="gw-tool-heading">
          <div><h3 ref={toolTitleRef} tabIndex={-1} id="gw-active-tool-title"><span><ActiveIcon aria-hidden="true" /></span>{activeMeta.name}</h3><p>{activeMeta.description}</p></div>
          <button type="button" onClick={resetActiveTool}><RotateCcw aria-hidden="true" />{copy.reset}</button>
        </div>

        <p className="gw-example-note" role="status"><Info aria-hidden="true" />{usesExampleValues ? tasks.example : tasks.adjusted}</p>
        <details className="gw-tool-assumptions"><summary>{reportLabels.assumptions}</summary><p>{toolAssumptions[locale][activeTool]}</p>{toolReadingHelp[locale][activeTool] && <p>{toolReadingHelp[locale][activeTool]}</p>}</details>

        <div className="gw-tool-workspace">
          <div className="gw-tool-inputs">
            <h4><SlidersHorizontal aria-hidden="true" />{copy.inputs}</h4>
            <p className="gw-input-help">{reportLabels.inputHelp}</p>
            {toolFields[activeTool].map((field) => <NumericInput
              key={field.id}
              id={field.id}
              label={copy.labels[field.label]}
              unit={field.unit}
              locale={locale}
              min={field.min ?? 0}
              max={field.max}
              value={drafts[activeTool][field.key]}
              error={activeTool === 'well' && field.key === 'pumpingWaterLevel' && invalidWellLevel ? reportLabels.wellLevel : undefined}
              onChange={(raw) => updateDraft(field.key, raw)}
            />)}
            {activeTool === 'motor' && <PhaseField label={copy.labels.phase} value={motor.phase} singlePhase={copy.labels.singlePhase} threePhase={copy.labels.threePhase} onChange={(phase) => updateDraft('phase', phase)} />}
          </div>

          <section className="gw-tool-results" aria-labelledby="gw-results-title">
            <p className="gw-result-purpose"><strong>{tasks.meaning}</strong> {activeMeta.description}</p>
            <div className="gw-results-label">
              <div><span id="gw-results-title">{copy.results}</span><small>{copy.liveNote}</small></div>
              <button type="button" className={copied ? 'gw-copy-results is-copied' : 'gw-copy-results'} disabled={!resultsAvailable} aria-describedby={!resultsAvailable ? 'gw-input-status' : undefined} onClick={copyActiveResults}>
                {copied ? <Check aria-hidden="true" /> : <ClipboardCopy aria-hidden="true" />}
                <span>{copied ? copy.copied : copy.copyResults}</span>
              </button>
            </div>
            <button type="button" className="gw-print-results" disabled={!resultsAvailable} aria-describedby={!resultsAvailable ? 'gw-input-status' : undefined} onClick={printActiveResults}><Printer aria-hidden="true" />{printCopy[locale].action}</button>
            <p id="gw-copy-feedback" className={`gw-copy-feedback ${copyFeedback === 'failed' || copyFeedback === 'print-failed' ? 'is-error' : ''}`} role="status" aria-live="polite" aria-atomic="true">{copied ? copy.copied : copyFeedback === 'failed' ? reportLabels.copyFailed : copyFeedback === 'print-failed' ? printCopy[locale].failed : ''}</p>
            {!resultsAvailable && <p className="gw-input-status" id="gw-input-status" role="status">{inputsValid ? reportLabels.tooLarge : reportLabels.invalid}</p>}
            {resultsAvailable && <div className="gw-results-content" ref={resultsContentRef} aria-live="polite" aria-atomic="true">
            {activeTool === 'demand' && <><div className="gw-primary-result"><span>{copy.labels.requiredFlow}</span><strong>{format(demandResult.requiredFlow)} <small>m³/h</small></strong></div><dl><ResultRow label={copy.labels.designDemand} value={`${format(demandResult.designDemand)} m³/day`} /><ResultRow label={copy.labels.minimumBuffer} value={`${format(demandResult.minimumBuffer)} m³`} /></dl></>}
            {activeTool === 'storage' && <><div className="gw-primary-result"><span>{copy.labels.nominalTankVolume}</span><strong>{format(storageResult.nominalTankVolume)} <small>m³</small></strong></div><dl><ResultRow label={copy.labels.averageHourlyDemand} value={`${format(storageResult.averageHourlyDemand)} m³/h`} /><ResultRow label={copy.labels.usableStorage} value={`${format(storageResult.requiredUsableStorage)} m³`} /></dl></>}
            {activeTool === 'energy' && <><div className="gw-primary-result"><span>{copy.labels.monthlyElectricityCost}</span><strong>{money(energyResult.monthlyCost)} <small>THB/month</small></strong></div><dl><ResultRow label={copy.labels.hydraulicPower} value={`${format(energyResult.hydraulicPower)} kW`} /><ResultRow label={copy.labels.inputPower} value={`${format(energyResult.inputPower)} kW`} /><ResultRow label={copy.labels.dailyEnergy} value={`${format(energyResult.dailyEnergy)} kWh/day`} /><ResultRow label={copy.labels.monthlyEnergy} value={`${format(energyResult.monthlyEnergy)} kWh/month`} /></dl></>}
            {activeTool === 'well' && <><div className="gw-primary-result"><span>{copy.labels.specificCapacity}</span><strong>{wellResult.specificCapacity === null ? '—' : format(wellResult.specificCapacity)} <small>m³/h/m</small></strong>{wellResult.specificCapacity === null && <em>{copy.unavailable}</em>}</div><dl><ResultRow label={copy.labels.drawdown} value={`${format(wellResult.drawdown)} m`} /><ResultRow label={copy.labels.pumpingRate} value={`${format(Math.max(0, well.pumpingRate))} m³/h`} /></dl></>}
            {activeTool === 'cost' && <><div className="gw-primary-result"><span>{copy.labels.monthlyDifference}</span><strong>{money(costResult.monthlyDifference)} <small>THB/month</small></strong></div><dl><ResultRow label={copy.labels.monthlyVolume} value={`${format(costResult.monthlyVolume)} m³`} /><ResultRow label={copy.labels.groundwaterCost} value={`${money(costResult.groundwaterCost)} THB`} /><ResultRow label={copy.labels.alternativeCost} value={`${money(costResult.alternativeCost)} THB`} /><ResultRow label={copy.labels.differencePercent} value={`${format(costResult.differencePercent)}%`} /></dl></>}
            {activeTool === 'pipe' && <><div className="gw-primary-result"><span>{copy.labels.headLoss}</span><strong>{format(pipeResult.headLoss)} <small>m</small></strong></div><dl><ResultRow label={copy.labels.velocity} value={`${format(pipeResult.velocity)} m/s`} /><ResultRow label={copy.labels.headLossPer100Metres} value={`${format(pipeResult.headLossPer100Metres)} m/100 m`} /></dl></>}
            {activeTool === 'pressure' && <><div className="gw-primary-result"><span>{copy.labels.pressureHead}</span><strong>{format(pressureResult.metresOfWater)} <small>mH₂O</small></strong></div><dl><ResultRow label={copy.labels.pressureKilopascals} value={`${format(pressureResult.kilopascals)} kPa`} /><ResultRow label={copy.labels.pressurePsi} value={`${format(pressureResult.poundsPerSquareInch)} psi`} /><ResultRow label={copy.labels.pressureBar} value={`${format(Math.max(0, pressure.pressureBar))} bar`} /></dl></>}
            {activeTool === 'casing' && <><div className="gw-primary-result"><span>{copy.labels.casingVolume}</span><strong>{format(casingResult.volumeLitres)} <small>L</small></strong></div><dl><ResultRow label={copy.labels.casingVolume} value={`${format(casingResult.volumeCubicMetres)} m³`} /><ResultRow label={copy.labels.litresPerMetre} value={`${format(casingResult.litresPerMetre)} L/m`} /></dl></>}
            {activeTool === 'motor' && <><div className="gw-primary-result"><span>{copy.labels.estimatedCurrent}</span><strong>{format(motorResult.estimatedCurrent)} <small>A</small></strong></div><dl><ResultRow label={copy.labels.electricalInputPower} value={`${format(motorResult.electricalInputPower)} kW`} /><ResultRow label={copy.labels.apparentPower} value={`${format(motorResult.apparentPower)} kVA`} /><ResultRow label={copy.labels.phase} value={motor.phase === 'single' ? copy.labels.singlePhase : copy.labels.threePhase} /></dl></>}
            </div>}
            {resultsAvailable && <details ref={reportDetailsRef} className="gw-report-preview" onToggle={(event) => { if (event.currentTarget.open) setSavedReport(createActiveReport()) }}>
              <summary>{reportLabels.report}</summary>
              <label htmlFor="gw-report-text">{activeMeta.name}</label>
              <textarea ref={reportTextRef} id="gw-report-text" readOnly value={savedReport} rows={14} />
              <button type="button" onClick={() => { reportTextRef.current?.focus(); reportTextRef.current?.select() }}>{reportLabels.selectReport}</button>
            </details>}
          </section>
        </div>
      </div>

      <aside className="gw-suite-disclaimer"><div><strong><Info aria-hidden="true" />{copy.disclaimerTitle}</strong><p>{copy.disclaimer}</p></div></aside>
      {printReport && <div className="gw-print-report" lang={localeInfo[locale].htmlLang}><pre>{printReport}</pre></div>}
    </section>
  )
}
