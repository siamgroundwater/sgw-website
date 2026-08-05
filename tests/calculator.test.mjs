import assert from 'node:assert/strict'
import test from 'node:test'
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
} from '../src/lib/groundwater-calculator.ts'

test('calculates design flow and buffer', () => {
  const result = calculateGroundwaterPlan({
    dailyDemand: 100,
    pumpHours: 16,
    reservePercent: 20,
  })
  assert.equal(result.designDemand, 120)
  assert.equal(result.requiredFlow, 7.5)
  assert.equal(result.minimumBuffer, 30)
})

test('limits unsafe calculator inputs', () => {
  const result = calculateGroundwaterPlan({
    dailyDemand: -20,
    pumpHours: 0,
    reservePercent: 250,
  })
  assert.equal(result.designDemand, 0)
  assert.equal(result.requiredFlow, 0)
  assert.equal(result.minimumBuffer, 0)
})

test('calculates usable and nominal storage requirements', () => {
  const result = calculateStoragePlan({
    dailyDemand: 240,
    backupHours: 12,
    usablePercent: 80,
  })
  assert.equal(result.averageHourlyDemand, 10)
  assert.equal(result.requiredUsableStorage, 120)
  assert.equal(result.nominalTankVolume, 150)
})

test('calculates pump power, energy and monthly electricity cost', () => {
  const result = calculatePumpEnergy({
    flowRate: 36,
    totalHead: 50,
    efficiencyPercent: 70,
    operatingHours: 10,
    electricityRate: 4,
  })
  assert.ok(Math.abs(result.hydraulicPower - 4.903325) < 0.000001)
  assert.ok(Math.abs(result.inputPower - 7.00475) < 0.000001)
  assert.ok(Math.abs(result.monthlyCost - 8405.7) < 0.001)
})

test('calculates drawdown and specific capacity safely', () => {
  const result = calculateWellPerformance({
    staticWaterLevel: 12,
    pumpingWaterLevel: 27,
    pumpingRate: 30,
  })
  assert.equal(result.drawdown, 15)
  assert.equal(result.specificCapacity, 2)

  const zeroDrawdown = calculateWellPerformance({
    staticWaterLevel: 20,
    pumpingWaterLevel: 10,
    pumpingRate: 30,
  })
  assert.equal(zeroDrawdown.drawdown, 0)
  assert.equal(zeroDrawdown.specificCapacity, null)
})

test('compares monthly water-source operating costs', () => {
  const result = calculateWaterCostComparison({
    dailyDemand: 100,
    operatingDays: 30,
    groundwaterUnitCost: 5,
    alternativeUnitCost: 18,
  })
  assert.equal(result.monthlyVolume, 3000)
  assert.equal(result.groundwaterCost, 15000)
  assert.equal(result.alternativeCost, 54000)
  assert.equal(result.monthlyDifference, 39000)
  assert.ok(Math.abs(result.differencePercent - 72.222222) < 0.000001)
})

test('new calculators keep unsafe values finite and within operating limits', () => {
  const storage = calculateStoragePlan({
    dailyDemand: -100,
    backupHours: 500,
    usablePercent: 0,
  })
  assert.ok(Number.isFinite(storage.nominalTankVolume))
  assert.equal(storage.nominalTankVolume, 0)

  const energy = calculatePumpEnergy({
    flowRate: 10,
    totalHead: 50,
    efficiencyPercent: 0,
    operatingHours: 100,
    electricityRate: 4,
  })
  assert.ok(Number.isFinite(energy.inputPower))
  assert.equal(energy.dailyEnergy, energy.inputPower * 24)

  const cost = calculateWaterCostComparison({
    dailyDemand: 10,
    operatingDays: 100,
    groundwaterUnitCost: -5,
    alternativeUnitCost: 10,
  })
  assert.equal(cost.monthlyVolume, 310)
  assert.equal(cost.groundwaterCost, 0)
})

test('calculates pipe velocity and Hazen-Williams friction loss', () => {
  const result = calculatePipeHydraulics({
    flowRate: 36,
    internalDiameter: 100,
    pipeLength: 100,
    hazenWilliamsCoefficient: 130,
  })
  assert.ok(Math.abs(result.velocity - 1.2732395) < 0.000001)
  assert.ok(Math.abs(result.headLoss - 1.901697) < 0.00001)
  assert.equal(result.headLossPer100Metres, result.headLoss)
})

test('converts pressure to field units', () => {
  const result = calculatePressureConversion(1)
  assert.equal(result.kilopascals, 100)
  assert.ok(Math.abs(result.poundsPerSquareInch - 14.5037738) < 0.000001)
  assert.ok(Math.abs(result.metresOfWater - 10.1971621) < 0.000001)
})

test('calculates casing water volume', () => {
  const result = calculateCasingVolume({
    internalDiameter: 200,
    waterColumnLength: 10,
  })
  assert.ok(Math.abs(result.volumeCubicMetres - 0.3141593) < 0.000001)
  assert.ok(Math.abs(result.volumeLitres - 314.159265) < 0.000001)
})

test('estimates single and three-phase motor current', () => {
  const threePhase = calculateMotorCurrent({
    motorOutputPower: 7.5,
    voltage: 400,
    powerFactor: 0.85,
    efficiencyPercent: 90,
    phase: 'three',
  })
  assert.ok(Math.abs(threePhase.estimatedCurrent - 14.150742) < 0.00001)

  const singlePhase = calculateMotorCurrent({
    motorOutputPower: 2.2,
    voltage: 230,
    powerFactor: 0.8,
    efficiencyPercent: 85,
    phase: 'single',
  })
  assert.ok(singlePhase.estimatedCurrent > 14)
  assert.ok(singlePhase.estimatedCurrent < 15)
})
