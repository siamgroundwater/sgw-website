export type GroundwaterPlanInput = {
  dailyDemand: number
  pumpHours: number
  reservePercent: number
}

function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

function limitRange(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, safeNumber(value, minimum)))
}

export function calculateGroundwaterPlan({
  dailyDemand,
  pumpHours,
  reservePercent,
}: GroundwaterPlanInput) {
  const safeDemand = Math.max(0, Number.isFinite(dailyDemand) ? dailyDemand : 0)
  const safeHours = Math.min(
    24,
    Math.max(1, Number.isFinite(pumpHours) ? pumpHours : 1)
  )
  const safeReserve = Math.min(
    100,
    Math.max(0, Number.isFinite(reservePercent) ? reservePercent : 0)
  )
  const designDemand = safeDemand * (1 + safeReserve / 100)

  return {
    designDemand,
    requiredFlow: designDemand / safeHours,
    minimumBuffer: designDemand * 0.25,
  }
}

export type StoragePlanInput = {
  dailyDemand: number
  backupHours: number
  usablePercent: number
}

export function calculateStoragePlan({
  dailyDemand,
  backupHours,
  usablePercent,
}: StoragePlanInput) {
  const safeDemand = Math.max(0, safeNumber(dailyDemand))
  const safeBackupHours = limitRange(backupHours, 0, 168)
  const safeUsablePercent = limitRange(usablePercent, 1, 100)
  const averageHourlyDemand = safeDemand / 24
  const requiredUsableStorage = averageHourlyDemand * safeBackupHours

  return {
    averageHourlyDemand,
    requiredUsableStorage,
    nominalTankVolume: requiredUsableStorage / (safeUsablePercent / 100),
  }
}

export type PumpEnergyInput = {
  flowRate: number
  totalHead: number
  efficiencyPercent: number
  operatingHours: number
  electricityRate: number
}

export function calculatePumpEnergy({
  flowRate,
  totalHead,
  efficiencyPercent,
  operatingHours,
  electricityRate,
}: PumpEnergyInput) {
  const safeFlow = Math.max(0, safeNumber(flowRate))
  const safeHead = Math.max(0, safeNumber(totalHead))
  const safeEfficiency = limitRange(efficiencyPercent, 1, 100) / 100
  const safeHours = limitRange(operatingHours, 0, 24)
  const safeRate = Math.max(0, safeNumber(electricityRate))
  const hydraulicPower =
    (1000 * 9.80665 * (safeFlow / 3600) * safeHead) / 1000
  const inputPower = hydraulicPower / safeEfficiency
  const dailyEnergy = inputPower * safeHours

  return {
    hydraulicPower,
    inputPower,
    dailyEnergy,
    monthlyEnergy: dailyEnergy * 30,
    monthlyCost: dailyEnergy * 30 * safeRate,
  }
}

export type WellPerformanceInput = {
  staticWaterLevel: number
  pumpingWaterLevel: number
  pumpingRate: number
}

export function calculateWellPerformance({
  staticWaterLevel,
  pumpingWaterLevel,
  pumpingRate,
}: WellPerformanceInput) {
  const safeStaticLevel = Math.max(0, safeNumber(staticWaterLevel))
  const safePumpingLevel = Math.max(0, safeNumber(pumpingWaterLevel))
  const safePumpingRate = Math.max(0, safeNumber(pumpingRate))
  const drawdown = Math.max(0, safePumpingLevel - safeStaticLevel)

  return {
    drawdown,
    specificCapacity: drawdown > 0 ? safePumpingRate / drawdown : null,
  }
}

export type WaterCostInput = {
  dailyDemand: number
  operatingDays: number
  groundwaterUnitCost: number
  alternativeUnitCost: number
}

export function calculateWaterCostComparison({
  dailyDemand,
  operatingDays,
  groundwaterUnitCost,
  alternativeUnitCost,
}: WaterCostInput) {
  const safeDemand = Math.max(0, safeNumber(dailyDemand))
  const safeDays = limitRange(operatingDays, 0, 31)
  const safeGroundwaterCost = Math.max(0, safeNumber(groundwaterUnitCost))
  const safeAlternativeCost = Math.max(0, safeNumber(alternativeUnitCost))
  const monthlyVolume = safeDemand * safeDays
  const groundwaterCost = monthlyVolume * safeGroundwaterCost
  const alternativeCost = monthlyVolume * safeAlternativeCost
  const monthlyDifference = alternativeCost - groundwaterCost

  return {
    monthlyVolume,
    groundwaterCost,
    alternativeCost,
    monthlyDifference,
    differencePercent:
      alternativeCost > 0 ? (monthlyDifference / alternativeCost) * 100 : 0,
  }
}

export type PipeHydraulicsInput = {
  flowRate: number
  internalDiameter: number
  pipeLength: number
  hazenWilliamsCoefficient: number
}

export function calculatePipeHydraulics({
  flowRate,
  internalDiameter,
  pipeLength,
  hazenWilliamsCoefficient,
}: PipeHydraulicsInput) {
  const safeFlow = Math.max(0, safeNumber(flowRate))
  const diameterMetres = limitRange(internalDiameter, 1, 5000) / 1000
  const safeLength = Math.max(0, safeNumber(pipeLength))
  const safeCoefficient = limitRange(hazenWilliamsCoefficient, 1, 200)
  const flowCubicMetresPerSecond = safeFlow / 3600
  const crossSectionArea = Math.PI * diameterMetres ** 2 / 4
  const velocity = flowCubicMetresPerSecond / crossSectionArea
  const headLoss =
    safeLength === 0 || safeFlow === 0
      ? 0
      : (10.67 * safeLength * flowCubicMetresPerSecond ** 1.852) /
        (safeCoefficient ** 1.852 * diameterMetres ** 4.87)

  return {
    velocity,
    headLoss,
    headLossPer100Metres: safeLength > 0 ? (headLoss / safeLength) * 100 : 0,
  }
}

export function calculatePressureConversion(pressureBar: number) {
  const safePressure = Math.max(0, safeNumber(pressureBar))

  return {
    bar: safePressure,
    kilopascals: safePressure * 100,
    poundsPerSquareInch: safePressure * 14.5037738,
    metresOfWater: (safePressure * 100000) / (1000 * 9.80665),
  }
}

export type CasingVolumeInput = {
  internalDiameter: number
  waterColumnLength: number
}

export function calculateCasingVolume({
  internalDiameter,
  waterColumnLength,
}: CasingVolumeInput) {
  const diameterMetres = limitRange(internalDiameter, 1, 5000) / 1000
  const safeLength = Math.max(0, safeNumber(waterColumnLength))
  const volumeCubicMetres = Math.PI * diameterMetres ** 2 / 4 * safeLength

  return {
    volumeCubicMetres,
    volumeLitres: volumeCubicMetres * 1000,
    litresPerMetre: Math.PI * diameterMetres ** 2 / 4 * 1000,
  }
}

export type MotorCurrentInput = {
  motorOutputPower: number
  voltage: number
  powerFactor: number
  efficiencyPercent: number
  phase: 'single' | 'three'
}

export function calculateMotorCurrent({
  motorOutputPower,
  voltage,
  powerFactor,
  efficiencyPercent,
  phase,
}: MotorCurrentInput) {
  const safeOutputPower = Math.max(0, safeNumber(motorOutputPower))
  const safeVoltage = limitRange(voltage, 1, 50000)
  const safePowerFactor = limitRange(powerFactor, 0.1, 1)
  const safeEfficiency = limitRange(efficiencyPercent, 1, 100) / 100
  const electricalInputPower = safeOutputPower / safeEfficiency
  const apparentPower = electricalInputPower / safePowerFactor
  const phaseFactor = phase === 'three' ? Math.sqrt(3) : 1
  const estimatedCurrent =
    (electricalInputPower * 1000) /
    (phaseFactor * safeVoltage * safePowerFactor)

  return {
    electricalInputPower,
    apparentPower,
    estimatedCurrent,
  }
}
