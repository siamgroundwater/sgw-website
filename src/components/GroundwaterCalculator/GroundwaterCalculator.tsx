'use client'

import { useMemo, useRef, useState } from 'react'
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
  'energy',
  'storage',
  'well',
  'pipe',
  'pressure',
  'casing',
  'motor',
]

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

const copyByLocale: Record<LocalizedLocale, SuiteCopy> = {
  th: {
    eyebrow: 'เครื่องมือวางแผนระบบน้ำบาดาล',
    title: 'คำนวณข้อมูลเบื้องต้นก่อนออกแบบระบบ',
    intro: 'เลือกเครื่องมือแล้วกรอกข้อมูลของโครงการ ผลลัพธ์จะคำนวณทันทีเพื่อช่วยตั้งสมมติฐาน วางงบประมาณ และเตรียมข้อมูลสำหรับคุยกับทีมวิศวกรรม',
    inputs: 'ข้อมูลสำหรับคำนวณ',
    results: 'ผลคำนวณเบื้องต้น',
    reset: 'คืนค่าเริ่มต้น',
    copyResults: 'คัดลอกผลลัพธ์',
    copied: 'คัดลอกแล้ว',
    liveNote: 'ผลลัพธ์ปรับตามข้อมูลที่กรอกโดยอัตโนมัติ',
    disclaimerTitle: 'ข้อควรทราบ',
    disclaimer: 'เครื่องมือนี้ใช้สำหรับการวางแผนเบื้องต้น ไม่ใช่แบบก่อสร้าง การรับรองปริมาณน้ำ หรือคำเสนอราคา ควรยืนยันข้อมูลด้วยการสำรวจ Pumping Test ผลวิเคราะห์น้ำ และการออกแบบโดยผู้เชี่ยวชาญ',
    unavailable: 'ต้องมีค่าระดับน้ำลดมากกว่า 0 จึงจะคำนวณได้',
    tools: {
      demand: { name: 'อัตราสูบและความต้องการ', description: 'หาอัตราสูบที่ระบบควรรองรับจากการใช้น้ำรายวัน' },
      storage: { name: 'ถังพักและน้ำสำรอง', description: 'ประเมินปริมาตรใช้งานและขนาดถังขั้นต่ำ' },
      energy: { name: 'กำลังปั๊มและค่าไฟ', description: 'ประเมินกำลังไฟ พลังงาน และค่าใช้จ่ายรายเดือน' },
      well: { name: 'ผล Pumping Test', description: 'คำนวณ Drawdown และ Specific Capacity ของบ่อ' },
      cost: { name: 'เปรียบเทียบต้นทุนน้ำ', description: 'เปรียบเทียบค่าใช้จ่ายรายเดือนของสองแหล่งน้ำ' },
      pipe: { name: 'ความเร็วและแรงเสียดทานในท่อ', description: 'คำนวณความเร็วน้ำและ Head Loss ด้วยสมการ Hazen-Williams' },
      pressure: { name: 'แปลงแรงดันและเฮด', description: 'แปลง bar เป็นเมตรน้ำ kPa และ psi สำหรับตรวจงานภาคสนาม' },
      casing: { name: 'ปริมาตรน้ำในบ่อ', description: 'หาปริมาตรน้ำในท่อกรุจากเส้นผ่านศูนย์กลางและความยาวช่วงน้ำ' },
      motor: { name: 'กระแสมอเตอร์ปั๊ม', description: 'ประเมินกระแสมอเตอร์ 1 เฟสหรือ 3 เฟสจากกำลังและแรงดัน' },
    },
    labels: {
      dailyDemand: 'ความต้องการใช้น้ำต่อวัน', pumpHours: 'ชั่วโมงสูบต่อวัน', reservePercent: 'น้ำสำรองและการเติบโต', designDemand: 'ความต้องการเพื่อออกแบบ', requiredFlow: 'อัตราสูบที่ต้องรองรับ', minimumBuffer: 'ถังพักเบื้องต้น 25%', backupHours: 'ระยะเวลาสำรองน้ำ', usablePercent: 'สัดส่วนปริมาตรถังที่ใช้งานได้', averageHourlyDemand: 'ความต้องการเฉลี่ยต่อชั่วโมง', usableStorage: 'ปริมาตรน้ำสำรองที่ต้องใช้', nominalTankVolume: 'ขนาดถังที่ควรมี', flowRate: 'อัตราการไหล', totalHead: 'เฮดรวมของระบบ', efficiency: 'ประสิทธิภาพรวมปั๊มและมอเตอร์', operatingHours: 'ชั่วโมงเดินเครื่องต่อวัน', electricityRate: 'ค่าไฟเฉลี่ย', hydraulicPower: 'กำลังน้ำ', inputPower: 'กำลังไฟฟ้าที่ปั๊มต้องใช้', dailyEnergy: 'พลังงานต่อวัน', monthlyEnergy: 'พลังงานต่อเดือน', monthlyElectricityCost: 'ค่าไฟประมาณการต่อเดือน', staticWaterLevel: 'ระดับน้ำปกติจากปากบ่อ', pumpingWaterLevel: 'ระดับน้ำขณะสูบจากปากบ่อ', pumpingRate: 'อัตราสูบขณะทดสอบ', drawdown: 'ระดับน้ำลด', specificCapacity: 'ความสามารถจำเพาะของบ่อ', operatingDays: 'จำนวนวันใช้งานต่อเดือน', groundwaterUnitCost: 'ต้นทุนน้ำบาดาลต่อหน่วย', alternativeUnitCost: 'ต้นทุนแหล่งน้ำเปรียบเทียบต่อหน่วย', monthlyVolume: 'ปริมาณน้ำต่อเดือน', groundwaterCost: 'ต้นทุนน้ำบาดาลต่อเดือน', alternativeCost: 'ต้นทุนแหล่งน้ำเปรียบเทียบ', monthlyDifference: 'ส่วนต่างค่าใช้จ่ายต่อเดือน', differencePercent: 'ส่วนต่างเทียบกับแหล่งน้ำเปรียบเทียบ', internalDiameter: 'เส้นผ่านศูนย์กลางภายใน', pipeLength: 'ความยาวท่อ', hazenWilliamsCoefficient: 'ค่าสัมประสิทธิ์ Hazen-Williams (C)', velocity: 'ความเร็วน้ำในท่อ', headLoss: 'Head Loss ตลอดช่วงท่อ', headLossPer100Metres: 'Head Loss ต่อท่อ 100 เมตร', pressureBar: 'แรงดันที่วัดได้', pressureHead: 'เฮดน้ำโดยประมาณ', pressureKilopascals: 'แรงดันกิโลพาสคัล', pressurePsi: 'แรงดัน psi', waterColumnLength: 'ความยาวช่วงที่มีน้ำ', casingVolume: 'ปริมาตรน้ำในท่อกรุ', litresPerMetre: 'ปริมาตรต่อความยาว 1 เมตร', motorOutputPower: 'กำลังเพลามอเตอร์', voltage: 'แรงดันไฟฟ้า', powerFactor: 'Power factor', motorEfficiency: 'ประสิทธิภาพมอเตอร์', phase: 'ระบบไฟฟ้า', singlePhase: '1 เฟส', threePhase: '3 เฟส', electricalInputPower: 'กำลังไฟฟ้าขาเข้า', apparentPower: 'กำลังไฟฟ้าปรากฏ', estimatedCurrent: 'กระแสใช้งานโดยประมาณ',
    },
  },
  en: {
    eyebrow: 'Groundwater planning tools',
    title: 'Build a preliminary system estimate',
    intro: 'Choose a tool and enter your project assumptions. Results update instantly to support early sizing, budgeting and a more useful engineering discussion.',
    inputs: 'Calculation inputs', results: 'Preliminary results', reset: 'Reset values', copyResults: 'Copy results', copied: 'Copied', liveNote: 'Results update automatically as inputs change.', disclaimerTitle: 'Important limitation', disclaimer: 'These tools support preliminary planning only. They are not construction design, a guarantee of well yield, or a quotation. Confirm assumptions through site investigation, pumping tests, water analysis and professional engineering.', unavailable: 'A drawdown greater than zero is required for this calculation.',
    tools: {
      demand: { name: 'Demand & pumping flow', description: 'Estimate the flow the system must support from daily demand.' },
      storage: { name: 'Buffer storage', description: 'Estimate required usable storage and nominal tank volume.' },
      energy: { name: 'Pump energy & cost', description: 'Estimate pump input power, energy use and monthly cost.' },
      well: { name: 'Pumping-test performance', description: 'Calculate well drawdown and specific capacity.' },
      cost: { name: 'Water cost comparison', description: 'Compare the monthly operating cost of two water sources.' },
      pipe: { name: 'Pipe velocity & friction', description: 'Calculate velocity and Hazen-Williams head loss.' },
      pressure: { name: 'Pressure & head conversion', description: 'Convert bar to metres of water, kPa and psi.' },
      casing: { name: 'Casing water volume', description: 'Calculate volume from diameter and water-column length.' },
      motor: { name: 'Pump motor current', description: 'Estimate single- or three-phase motor current.' },
    },
    labels: {
      dailyDemand: 'Daily water demand', pumpHours: 'Pumping hours per day', reservePercent: 'Reserve and growth allowance', designDemand: 'Design demand', requiredFlow: 'Required pumping flow', minimumBuffer: 'Preliminary 25% buffer', backupHours: 'Required backup duration', usablePercent: 'Usable share of tank volume', averageHourlyDemand: 'Average hourly demand', usableStorage: 'Required usable storage', nominalTankVolume: 'Nominal tank volume', flowRate: 'Flow rate', totalHead: 'Total dynamic head', efficiency: 'Combined pump and motor efficiency', operatingHours: 'Operating hours per day', electricityRate: 'Average electricity rate', hydraulicPower: 'Hydraulic power', inputPower: 'Estimated electrical input', dailyEnergy: 'Daily energy', monthlyEnergy: 'Monthly energy', monthlyElectricityCost: 'Estimated monthly electricity cost', staticWaterLevel: 'Static water level below wellhead', pumpingWaterLevel: 'Pumping water level below wellhead', pumpingRate: 'Pumping-test flow rate', drawdown: 'Drawdown', specificCapacity: 'Well specific capacity', operatingDays: 'Operating days per month', groundwaterUnitCost: 'Groundwater unit cost', alternativeUnitCost: 'Comparison water unit cost', monthlyVolume: 'Monthly water volume', groundwaterCost: 'Monthly groundwater cost', alternativeCost: 'Monthly comparison-source cost', monthlyDifference: 'Monthly cost difference', differencePercent: 'Difference versus comparison source', internalDiameter: 'Internal diameter', pipeLength: 'Pipe length', hazenWilliamsCoefficient: 'Hazen-Williams coefficient (C)', velocity: 'Pipe velocity', headLoss: 'Head loss over pipe length', headLossPer100Metres: 'Head loss per 100 metres', pressureBar: 'Measured pressure', pressureHead: 'Approximate water head', pressureKilopascals: 'Pressure in kilopascals', pressurePsi: 'Pressure in psi', waterColumnLength: 'Water-column length', casingVolume: 'Water volume inside casing', litresPerMetre: 'Volume per metre', motorOutputPower: 'Motor shaft output', voltage: 'Supply voltage', powerFactor: 'Power factor', motorEfficiency: 'Motor efficiency', phase: 'Electrical phase', singlePhase: 'Single phase', threePhase: 'Three phase', electricalInputPower: 'Electrical input power', apparentPower: 'Apparent power', estimatedCurrent: 'Estimated line current',
    },
  },
  zh: {
    eyebrow: '地下水规划工具', title: '建立系统初步估算', intro: '选择工具并输入项目假设，结果会即时更新，用于前期选型、预算和工程沟通。', inputs: '计算输入', results: '初步结果', reset: '恢复默认值', copyResults: '复制结果', copied: '已复制', liveNote: '输入变化时结果会自动更新。', disclaimerTitle: '重要说明', disclaimer: '这些工具仅用于前期规划，不构成施工设计、出水量保证或报价。请通过现场调查、抽水试验、水质分析和专业工程设计确认。', unavailable: '水位降深必须大于零才能计算。',
    tools: { demand: { name: '需水量与抽水流量', description: '根据每日需水量估算系统所需流量。' }, storage: { name: '缓冲储水', description: '估算有效储水量和水箱标称容积。' }, energy: { name: '水泵能耗与费用', description: '估算输入功率、耗电量和月度费用。' }, well: { name: '抽水试验性能', description: '计算水位降深和单井比出水量。' }, cost: { name: '水源成本比较', description: '比较两种水源的月度运行成本。' }, pipe: { name: '管内流速与摩阻', description: '计算流速和Hazen-Williams水头损失。' }, pressure: { name: '压力与水头换算', description: '将bar换算为米水柱、kPa和psi。' }, casing: { name: '井管水量', description: '根据内径和水柱长度计算井管内水量。' }, motor: { name: '水泵电机电流', description: '估算单相或三相电机运行电流。' } },
    labels: { dailyDemand: '每日需水量', pumpHours: '每日抽水时间', reservePercent: '储备与增长比例', designDemand: '设计需水量', requiredFlow: '所需抽水流量', minimumBuffer: '初步25%缓冲储水', backupHours: '所需备用时间', usablePercent: '水箱可用容积比例', averageHourlyDemand: '平均小时需水量', usableStorage: '所需有效储水量', nominalTankVolume: '水箱标称容积', flowRate: '流量', totalHead: '系统总扬程', efficiency: '水泵与电机综合效率', operatingHours: '每日运行时间', electricityRate: '平均电价', hydraulicPower: '水力功率', inputPower: '估算输入功率', dailyEnergy: '每日耗电量', monthlyEnergy: '每月耗电量', monthlyElectricityCost: '预计每月电费', staticWaterLevel: '井口以下静水位', pumpingWaterLevel: '井口以下动水位', pumpingRate: '抽水试验流量', drawdown: '水位降深', specificCapacity: '单井比出水量', operatingDays: '每月运行天数', groundwaterUnitCost: '地下水单位成本', alternativeUnitCost: '对比水源单位成本', monthlyVolume: '每月用水量', groundwaterCost: '每月地下水成本', alternativeCost: '每月对比水源成本', monthlyDifference: '每月费用差额', differencePercent: '相对于对比水源的差额', internalDiameter: '内径', pipeLength: '管长', hazenWilliamsCoefficient: 'Hazen-Williams系数(C)', velocity: '管内流速', headLoss: '全管段水头损失', headLossPer100Metres: '每100米水头损失', pressureBar: '测量压力', pressureHead: '近似水头', pressureKilopascals: '千帕压力', pressurePsi: 'psi压力', waterColumnLength: '水柱长度', casingVolume: '井管内水量', litresPerMetre: '每米容积', motorOutputPower: '电机轴输出功率', voltage: '电源电压', powerFactor: '功率因数', motorEfficiency: '电机效率', phase: '电源相数', singlePhase: '单相', threePhase: '三相', electricalInputPower: '电气输入功率', apparentPower: '视在功率', estimatedCurrent: '估算线电流', },
  },
  ja: {
    eyebrow: '地下水計画ツール', title: 'システムの初期概算を作成', intro: 'ツールを選び、事業条件を入力してください。初期サイジング、予算検討、技術相談に役立つ結果を即時表示します。', inputs: '計算条件', results: '概算結果', reset: '初期値に戻す', copyResults: '結果をコピー', copied: 'コピー済み', liveNote: '入力の変更に合わせて結果が自動更新されます。', disclaimerTitle: '重要な注意事項', disclaimer: '本ツールは初期計画用であり、施工設計、井戸揚水量の保証、見積書ではありません。現地調査、揚水試験、水質分析、専門家による設計で確認してください。', unavailable: '計算には0より大きい水位低下量が必要です。',
    tools: { demand: { name: '需要量・揚水量', description: '1日の需要量から必要なシステム流量を概算します。' }, storage: { name: '予備貯水', description: '有効貯水量とタンク公称容量を概算します。' }, energy: { name: 'ポンプ電力・費用', description: '入力電力、消費電力量、月額費用を概算します。' }, well: { name: '揚水試験性能', description: '水位低下量と比湧出量を計算します。' }, cost: { name: '水源コスト比較', description: '2つの水源の月間運転費を比較します。' }, pipe: { name: '管内流速・摩擦損失', description: '流速とHazen-Williams損失水頭を計算します。' }, pressure: { name: '圧力・水頭換算', description: 'barを水頭、kPa、psiへ換算します。' }, casing: { name: 'ケーシング内水量', description: '内径と水柱長から井戸内水量を計算します。' }, motor: { name: 'ポンプモーター電流', description: '単相・三相モーターの電流を概算します。' } },
    labels: { dailyDemand: '1日の水需要', pumpHours: '1日の揚水時間', reservePercent: '予備・成長率', designDemand: '設計需要量', requiredFlow: '必要揚水量', minimumBuffer: '初期25%予備貯水', backupHours: '必要な予備時間', usablePercent: 'タンク有効容量率', averageHourlyDemand: '平均時間需要量', usableStorage: '必要有効貯水量', nominalTankVolume: 'タンク公称容量', flowRate: '流量', totalHead: '全揚程', efficiency: 'ポンプ・モーター総合効率', operatingHours: '1日の運転時間', electricityRate: '平均電力単価', hydraulicPower: '水動力', inputPower: '推定入力電力', dailyEnergy: '1日の電力量', monthlyEnergy: '月間電力量', monthlyElectricityCost: '推定月額電気料金', staticWaterLevel: '井戸口からの静水位', pumpingWaterLevel: '井戸口からの揚水水位', pumpingRate: '揚水試験流量', drawdown: '水位低下量', specificCapacity: '井戸の比湧出量', operatingDays: '月間運転日数', groundwaterUnitCost: '地下水単価', alternativeUnitCost: '比較水源単価', monthlyVolume: '月間水量', groundwaterCost: '月間地下水費', alternativeCost: '比較水源の月間費用', monthlyDifference: '月間費用差', differencePercent: '比較水源に対する差率', internalDiameter: '内径', pipeLength: '管長', hazenWilliamsCoefficient: 'Hazen-Williams係数(C)', velocity: '管内流速', headLoss: '配管全長の損失水頭', headLossPer100Metres: '100m当たりの損失水頭', pressureBar: '測定圧力', pressureHead: '概算水頭', pressureKilopascals: '圧力(kPa)', pressurePsi: '圧力(psi)', waterColumnLength: '水柱長', casingVolume: 'ケーシング内水量', litresPerMetre: '1m当たりの容量', motorOutputPower: 'モーター軸出力', voltage: '電源電圧', powerFactor: '力率', motorEfficiency: 'モーター効率', phase: '電源相', singlePhase: '単相', threePhase: '三相', electricalInputPower: '電気入力電力', apparentPower: '皮相電力', estimatedCurrent: '推定線電流', },
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

type NumberFieldProps = {
  id: string
  label: string
  unit: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
}

function NumberField({ id, label, unit, value, min = 0, max, step = 1, onChange }: NumberFieldProps) {
  return (
    <label className="gw-field" htmlFor={id}>
      <span className="gw-field-label">{label}</span>
      <span className="gw-field-control">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            const nextValue = event.currentTarget.valueAsNumber
            const finiteValue = Number.isFinite(nextValue) ? nextValue : min
            onChange(
              max === undefined
                ? Math.max(min, finiteValue)
                : Math.min(max, Math.max(min, finiteValue))
            )
          }}
        />
        <span>{unit}</span>
      </span>
    </label>
  )
}

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
  const toolPanelRef = useRef<HTMLDivElement>(null)
  const resultsContentRef = useRef<HTMLDivElement>(null)
  const copyFeedbackTimerRef = useRef<number | null>(null)
  const [activeTool, setActiveTool] = useState<ToolId>('demand')
  const [copied, setCopied] = useState(false)
  const [demand, setDemand] = useState(initialValues.demand)
  const [storage, setStorage] = useState(initialValues.storage)
  const [energy, setEnergy] = useState(initialValues.energy)
  const [well, setWell] = useState(initialValues.well)
  const [cost, setCost] = useState(initialValues.cost)
  const [pipe, setPipe] = useState(initialValues.pipe)
  const [pressure, setPressure] = useState(initialValues.pressure)
  const [casing, setCasing] = useState(initialValues.casing)
  const [motor, setMotor] = useState(initialValues.motor)

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

  const selectTool = (toolId: ToolId) => {
    setCopied(false)
    setActiveTool(toolId)
    window.requestAnimationFrame(() => {
      toolPanelRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
    })
  }

  const copyActiveResults = async () => {
    const resultText = resultsContentRef.current?.innerText.trim()
    if (!resultText) return

    const text = `${activeMeta.name}\n${resultText}`

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        const didCopy = document.execCommand('copy')
        textArea.remove()
        if (!didCopy) return
      }

      setCopied(true)
      if (copyFeedbackTimerRef.current !== null) {
        window.clearTimeout(copyFeedbackTimerRef.current)
      }
      copyFeedbackTimerRef.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const resetActiveTool = () => {
    if (activeTool === 'demand') setDemand(initialValues.demand)
    if (activeTool === 'storage') setStorage(initialValues.storage)
    if (activeTool === 'energy') setEnergy(initialValues.energy)
    if (activeTool === 'well') setWell(initialValues.well)
    if (activeTool === 'cost') setCost(initialValues.cost)
    if (activeTool === 'pipe') setPipe(initialValues.pipe)
    if (activeTool === 'pressure') setPressure(initialValues.pressure)
    if (activeTool === 'casing') setCasing(initialValues.casing)
    if (activeTool === 'motor') setMotor(initialValues.motor)
  }

  return (
    <section className="gw-suite" aria-labelledby="gw-suite-title">
      <header className="gw-suite-header">
        <span className="gw-suite-mark"><Droplets aria-hidden="true" /></span>
        <div>
          <p>{copy.eyebrow}</p>
          <h2 id="gw-suite-title">{copy.title}</h2>
          <span>{copy.intro}</span>
        </div>
      </header>

      <div className="gw-tool-tabs" role="tablist" aria-label={copy.title}>
        {toolOrder.map((toolId) => {
          const Icon = toolIcons[toolId]
          return (
            <button
              type="button"
              role="tab"
              aria-selected={activeTool === toolId}
              aria-controls="gw-tool-panel"
              id={`gw-tab-${toolId}`}
              className={activeTool === toolId ? 'is-active' : ''}
              onClick={() => selectTool(toolId)}
              key={toolId}
            >
              <Icon aria-hidden="true" />
              <span><strong>{copy.tools[toolId].name}</strong><small>{copy.tools[toolId].description}</small></span>
            </button>
          )
        })}
      </div>

      <div ref={toolPanelRef} className="gw-tool-panel" role="tabpanel" id="gw-tool-panel" aria-labelledby={`gw-tab-${activeTool}`}>
        <div className="gw-tool-heading">
          <span><ActiveIcon aria-hidden="true" /></span>
          <div><p>{activeMeta.name}</p><h3>{activeMeta.description}</h3></div>
          <button type="button" onClick={resetActiveTool}><RotateCcw aria-hidden="true" />{copy.reset}</button>
        </div>

        <div className="gw-tool-workspace">
          <div className="gw-tool-inputs">
            <h4><SlidersHorizontal aria-hidden="true" />{copy.inputs}</h4>
            {activeTool === 'demand' && <>
              <NumberField id="gw-demand-daily" label={copy.labels.dailyDemand} unit="m³/day" value={demand.dailyDemand} step={1} onChange={(dailyDemand) => setDemand((current) => ({ ...current, dailyDemand }))} />
              <NumberField id="gw-demand-hours" label={copy.labels.pumpHours} unit="h/day" value={demand.pumpHours} min={1} max={24} step={1} onChange={(pumpHours) => setDemand((current) => ({ ...current, pumpHours }))} />
              <NumberField id="gw-demand-reserve" label={copy.labels.reservePercent} unit="%" value={demand.reservePercent} max={100} step={5} onChange={(reservePercent) => setDemand((current) => ({ ...current, reservePercent }))} />
            </>}
            {activeTool === 'storage' && <>
              <NumberField id="gw-storage-daily" label={copy.labels.dailyDemand} unit="m³/day" value={storage.dailyDemand} step={1} onChange={(dailyDemand) => setStorage((current) => ({ ...current, dailyDemand }))} />
              <NumberField id="gw-storage-hours" label={copy.labels.backupHours} unit="h" value={storage.backupHours} max={168} step={1} onChange={(backupHours) => setStorage((current) => ({ ...current, backupHours }))} />
              <NumberField id="gw-storage-usable" label={copy.labels.usablePercent} unit="%" value={storage.usablePercent} min={1} max={100} step={5} onChange={(usablePercent) => setStorage((current) => ({ ...current, usablePercent }))} />
            </>}
            {activeTool === 'energy' && <>
              <NumberField id="gw-energy-flow" label={copy.labels.flowRate} unit="m³/h" value={energy.flowRate} step={0.1} onChange={(flowRate) => setEnergy((current) => ({ ...current, flowRate }))} />
              <NumberField id="gw-energy-head" label={copy.labels.totalHead} unit="m" value={energy.totalHead} step={1} onChange={(totalHead) => setEnergy((current) => ({ ...current, totalHead }))} />
              <NumberField id="gw-energy-efficiency" label={copy.labels.efficiency} unit="%" value={energy.efficiencyPercent} min={1} max={100} step={1} onChange={(efficiencyPercent) => setEnergy((current) => ({ ...current, efficiencyPercent }))} />
              <NumberField id="gw-energy-hours" label={copy.labels.operatingHours} unit="h/day" value={energy.operatingHours} max={24} step={1} onChange={(operatingHours) => setEnergy((current) => ({ ...current, operatingHours }))} />
              <NumberField id="gw-energy-rate" label={copy.labels.electricityRate} unit="THB/kWh" value={energy.electricityRate} step={0.1} onChange={(electricityRate) => setEnergy((current) => ({ ...current, electricityRate }))} />
            </>}
            {activeTool === 'well' && <>
              <NumberField id="gw-well-static" label={copy.labels.staticWaterLevel} unit="m" value={well.staticWaterLevel} step={0.1} onChange={(staticWaterLevel) => setWell((current) => ({ ...current, staticWaterLevel }))} />
              <NumberField id="gw-well-pumping" label={copy.labels.pumpingWaterLevel} unit="m" value={well.pumpingWaterLevel} step={0.1} onChange={(pumpingWaterLevel) => setWell((current) => ({ ...current, pumpingWaterLevel }))} />
              <NumberField id="gw-well-rate" label={copy.labels.pumpingRate} unit="m³/h" value={well.pumpingRate} step={0.1} onChange={(pumpingRate) => setWell((current) => ({ ...current, pumpingRate }))} />
            </>}
            {activeTool === 'cost' && <>
              <NumberField id="gw-cost-daily" label={copy.labels.dailyDemand} unit="m³/day" value={cost.dailyDemand} step={1} onChange={(dailyDemand) => setCost((current) => ({ ...current, dailyDemand }))} />
              <NumberField id="gw-cost-days" label={copy.labels.operatingDays} unit="day/month" value={cost.operatingDays} max={31} step={1} onChange={(operatingDays) => setCost((current) => ({ ...current, operatingDays }))} />
              <NumberField id="gw-cost-groundwater" label={copy.labels.groundwaterUnitCost} unit="THB/m³" value={cost.groundwaterUnitCost} step={0.1} onChange={(groundwaterUnitCost) => setCost((current) => ({ ...current, groundwaterUnitCost }))} />
              <NumberField id="gw-cost-alternative" label={copy.labels.alternativeUnitCost} unit="THB/m³" value={cost.alternativeUnitCost} step={0.1} onChange={(alternativeUnitCost) => setCost((current) => ({ ...current, alternativeUnitCost }))} />
            </>}
            {activeTool === 'pipe' && <>
              <NumberField id="gw-pipe-flow" label={copy.labels.flowRate} unit="m³/h" value={pipe.flowRate} step={0.1} onChange={(flowRate) => setPipe((current) => ({ ...current, flowRate }))} />
              <NumberField id="gw-pipe-diameter" label={copy.labels.internalDiameter} unit="mm" value={pipe.internalDiameter} min={1} step={1} onChange={(internalDiameter) => setPipe((current) => ({ ...current, internalDiameter }))} />
              <NumberField id="gw-pipe-length" label={copy.labels.pipeLength} unit="m" value={pipe.pipeLength} step={1} onChange={(pipeLength) => setPipe((current) => ({ ...current, pipeLength }))} />
              <NumberField id="gw-pipe-coefficient" label={copy.labels.hazenWilliamsCoefficient} unit="C" value={pipe.hazenWilliamsCoefficient} min={1} max={200} step={1} onChange={(hazenWilliamsCoefficient) => setPipe((current) => ({ ...current, hazenWilliamsCoefficient }))} />
            </>}
            {activeTool === 'pressure' && <>
              <NumberField id="gw-pressure-bar" label={copy.labels.pressureBar} unit="bar" value={pressure.pressureBar} step={0.1} onChange={(pressureBar) => setPressure({ pressureBar })} />
            </>}
            {activeTool === 'casing' && <>
              <NumberField id="gw-casing-diameter" label={copy.labels.internalDiameter} unit="mm" value={casing.internalDiameter} min={1} step={1} onChange={(internalDiameter) => setCasing((current) => ({ ...current, internalDiameter }))} />
              <NumberField id="gw-casing-length" label={copy.labels.waterColumnLength} unit="m" value={casing.waterColumnLength} step={0.1} onChange={(waterColumnLength) => setCasing((current) => ({ ...current, waterColumnLength }))} />
            </>}
            {activeTool === 'motor' && <>
              <NumberField id="gw-motor-power" label={copy.labels.motorOutputPower} unit="kW" value={motor.motorOutputPower} step={0.1} onChange={(motorOutputPower) => setMotor((current) => ({ ...current, motorOutputPower }))} />
              <NumberField id="gw-motor-voltage" label={copy.labels.voltage} unit="V" value={motor.voltage} min={1} step={1} onChange={(voltage) => setMotor((current) => ({ ...current, voltage }))} />
              <NumberField id="gw-motor-power-factor" label={copy.labels.powerFactor} unit="0–1" value={motor.powerFactor} min={0.1} max={1} step={0.01} onChange={(powerFactor) => setMotor((current) => ({ ...current, powerFactor }))} />
              <NumberField id="gw-motor-efficiency" label={copy.labels.motorEfficiency} unit="%" value={motor.efficiencyPercent} min={1} max={100} step={1} onChange={(efficiencyPercent) => setMotor((current) => ({ ...current, efficiencyPercent }))} />
              <PhaseField label={copy.labels.phase} value={motor.phase} singlePhase={copy.labels.singlePhase} threePhase={copy.labels.threePhase} onChange={(phase) => setMotor((current) => ({ ...current, phase }))} />
            </>}
          </div>

          <output className="gw-tool-results" aria-live="polite">
            <div className="gw-results-label">
              <div><span>{copy.results}</span><small>{copy.liveNote}</small></div>
              <button type="button" className={copied ? 'gw-copy-results is-copied' : 'gw-copy-results'} onClick={copyActiveResults}>
                {copied ? <Check aria-hidden="true" /> : <ClipboardCopy aria-hidden="true" />}
                <span>{copied ? copy.copied : copy.copyResults}</span>
              </button>
            </div>
            <div className="gw-results-content" ref={resultsContentRef}>
            {activeTool === 'demand' && <><div className="gw-primary-result"><span>{copy.labels.requiredFlow}</span><strong>{format(demandResult.requiredFlow)} <small>m³/h</small></strong></div><dl><ResultRow label={copy.labels.designDemand} value={`${format(demandResult.designDemand)} m³/day`} /><ResultRow label={copy.labels.minimumBuffer} value={`${format(demandResult.minimumBuffer)} m³`} /></dl></>}
            {activeTool === 'storage' && <><div className="gw-primary-result"><span>{copy.labels.nominalTankVolume}</span><strong>{format(storageResult.nominalTankVolume)} <small>m³</small></strong></div><dl><ResultRow label={copy.labels.averageHourlyDemand} value={`${format(storageResult.averageHourlyDemand)} m³/h`} /><ResultRow label={copy.labels.usableStorage} value={`${format(storageResult.requiredUsableStorage)} m³`} /></dl></>}
            {activeTool === 'energy' && <><div className="gw-primary-result"><span>{copy.labels.monthlyElectricityCost}</span><strong>{money(energyResult.monthlyCost)} <small>THB/month</small></strong></div><dl><ResultRow label={copy.labels.hydraulicPower} value={`${format(energyResult.hydraulicPower)} kW`} /><ResultRow label={copy.labels.inputPower} value={`${format(energyResult.inputPower)} kW`} /><ResultRow label={copy.labels.dailyEnergy} value={`${format(energyResult.dailyEnergy)} kWh/day`} /><ResultRow label={copy.labels.monthlyEnergy} value={`${format(energyResult.monthlyEnergy)} kWh/month`} /></dl></>}
            {activeTool === 'well' && <><div className="gw-primary-result"><span>{copy.labels.specificCapacity}</span><strong>{wellResult.specificCapacity === null ? '—' : format(wellResult.specificCapacity)} <small>m³/h/m</small></strong>{wellResult.specificCapacity === null && <em>{copy.unavailable}</em>}</div><dl><ResultRow label={copy.labels.drawdown} value={`${format(wellResult.drawdown)} m`} /><ResultRow label={copy.labels.pumpingRate} value={`${format(Math.max(0, well.pumpingRate))} m³/h`} /></dl></>}
            {activeTool === 'cost' && <><div className="gw-primary-result"><span>{copy.labels.monthlyDifference}</span><strong>{money(costResult.monthlyDifference)} <small>THB/month</small></strong></div><dl><ResultRow label={copy.labels.monthlyVolume} value={`${format(costResult.monthlyVolume)} m³`} /><ResultRow label={copy.labels.groundwaterCost} value={`${money(costResult.groundwaterCost)} THB`} /><ResultRow label={copy.labels.alternativeCost} value={`${money(costResult.alternativeCost)} THB`} /><ResultRow label={copy.labels.differencePercent} value={`${format(costResult.differencePercent)}%`} /></dl></>}
            {activeTool === 'pipe' && <><div className="gw-primary-result"><span>{copy.labels.headLoss}</span><strong>{format(pipeResult.headLoss)} <small>m</small></strong></div><dl><ResultRow label={copy.labels.velocity} value={`${format(pipeResult.velocity)} m/s`} /><ResultRow label={copy.labels.headLossPer100Metres} value={`${format(pipeResult.headLossPer100Metres)} m/100 m`} /></dl></>}
            {activeTool === 'pressure' && <><div className="gw-primary-result"><span>{copy.labels.pressureHead}</span><strong>{format(pressureResult.metresOfWater)} <small>mH₂O</small></strong></div><dl><ResultRow label={copy.labels.pressureKilopascals} value={`${format(pressureResult.kilopascals)} kPa`} /><ResultRow label={copy.labels.pressurePsi} value={`${format(pressureResult.poundsPerSquareInch)} psi`} /><ResultRow label={copy.labels.pressureBar} value={`${format(Math.max(0, pressure.pressureBar))} bar`} /></dl></>}
            {activeTool === 'casing' && <><div className="gw-primary-result"><span>{copy.labels.casingVolume}</span><strong>{format(casingResult.volumeLitres)} <small>L</small></strong></div><dl><ResultRow label={copy.labels.casingVolume} value={`${format(casingResult.volumeCubicMetres)} m³`} /><ResultRow label={copy.labels.litresPerMetre} value={`${format(casingResult.litresPerMetre)} L/m`} /></dl></>}
            {activeTool === 'motor' && <><div className="gw-primary-result"><span>{copy.labels.estimatedCurrent}</span><strong>{format(motorResult.estimatedCurrent)} <small>A</small></strong></div><dl><ResultRow label={copy.labels.electricalInputPower} value={`${format(motorResult.electricalInputPower)} kW`} /><ResultRow label={copy.labels.apparentPower} value={`${format(motorResult.apparentPower)} kVA`} /><ResultRow label={copy.labels.phase} value={motor.phase === 'single' ? copy.labels.singlePhase : copy.labels.threePhase} /></dl></>}
            </div>
          </output>
        </div>
      </div>

      <aside className="gw-suite-disclaimer"><Info aria-hidden="true" /><div><strong>{copy.disclaimerTitle}</strong><p>{copy.disclaimer}</p></div></aside>
    </section>
  )
}
