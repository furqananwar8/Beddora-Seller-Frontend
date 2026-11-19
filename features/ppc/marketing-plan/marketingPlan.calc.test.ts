// Run with: npx tsx --test features/ppc/marketing-plan/marketingPlan.calc.test.ts (tsx from the backend's node_modules)
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_OVERSTOCK_DAYS, DEFAULT_STAGE_TARGETS, DEFAULT_STOCKOUT_DAYS, planRow, previousMonth, type PlanInputs } from './marketingPlan.calc'

const settings = { stageTargets: DEFAULT_STAGE_TARGETS, overstockDays: DEFAULT_OVERSTOCK_DAYS, stockoutDays: DEFAULT_STOCKOUT_DAYS }
const base: PlanInputs = { fulfillment: 'FBA', price: 20, profitBeforeMarketing: 5, stage: 'Growth', plannedUnits: 100, units: 60, sales: 1200, adSpend: 100, adSales: 400, availableUnits: 90 }

describe('planRow', () => {
  it('works the target TACoS and the ad budget out from the break-even TACoS and the stage', () => {
    const row = planRow(base, settings)
    assert.equal(row.breakEvenTacos, 0.25)
    assert.equal(row.stageTargetProfit, 0.08)
    assert.ok(Math.abs((row.targetTacos as number) - 0.17) < 1e-12)
    assert.equal(row.plannedSales, 2000)
    assert.ok(Math.abs((row.recommendedAdBudget as number) - 340) < 1e-9)
    assert.ok(Math.abs((row.changeVsLastMonth as number) - 240) < 1e-9)
  })

  it('never recommends a negative budget when the target TACoS is below zero', () => {
    const row = planRow({ ...base, profitBeforeMarketing: 1, stage: 'Mature' }, settings)
    assert.equal(row.recommendedAdBudget, 0)
  })

  it('leaves the budget blank until units are planned', () => {
    assert.equal(planRow({ ...base, plannedUnits: null }, settings).recommendedAdBudget, null)
  })

  it('decides from TACoS against the break-even and target TACoS', () => {
    assert.equal(planRow({ ...base, adSpend: 100 }, settings).decision, 'OK - hold or scale') // 8.3% vs 17% target
    assert.equal(planRow({ ...base, adSpend: 250 }, settings).decision, 'TRIM to target') // 20.8% > 17%
    assert.equal(planRow({ ...base, adSpend: 400 }, settings).decision, 'CUT - ads losing money') // 33% > 25%
    assert.equal(planRow({ ...base, sales: 0, units: 0 }, settings).decision, 'No last-month data')
    assert.equal(planRow({ ...base, profitBeforeMarketing: null }, settings).decision, 'Check price/profit/stage')
  })

  it('suggests Clearance for overstocked FBA, Launch without sales, Mature when organic and stocked sensibly', () => {
    assert.equal(planRow({ ...base, availableUnits: 500 }, settings).suggestedStage, 'Clearance') // 250 days of cover
    assert.equal(planRow({ ...base, units: 0, sales: 0, availableUnits: 0 }, settings).suggestedStage, 'Launch')
    assert.equal(planRow({ ...base, adSales: 100 }, settings).suggestedStage, 'Mature') // 91.7% organic, 45 days of cover
    assert.equal(planRow({ ...base, adSales: 800 }, settings).suggestedStage, 'Growth') // only 33% organic
  })

  it('flags stock by days of cover', () => {
    assert.equal(planRow({ ...base, availableUnits: 10 }, settings).stockFlag, 'Stock-out risk - do not scale ads')
    assert.equal(planRow({ ...base, availableUnits: 0 }, settings).stockFlag, 'STOCK-OUT - pause ads')
    assert.equal(planRow({ ...base, availableUnits: 500 }, settings).stockFlag, 'Overstock - consider Clearance stage')
    assert.equal(planRow({ ...base, fulfillment: 'FBM' }, settings).stockFlag, 'FBM - FBA stock not applicable')
  })
})

describe('previousMonth', () => {
  it('steps back one month across a year', () => {
    assert.equal(previousMonth('2026-11'), '2026-10')
    assert.equal(previousMonth('2026-01'), '2025-12')
  })
})
