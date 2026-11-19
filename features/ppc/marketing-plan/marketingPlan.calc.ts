/**
 * The SKU-wise Marketing Plan's working, one function per column of the "Marketing Plan" sheet (the letters in the
 * comments are that sheet's columns). Pure: a SKU's inputs and the plan settings in, every worked-out column out.
 *
 * Percentages are fractions here (0.15 for 15%); the screen converts at its edge.
 */

export const STAGES = ['Launch', 'Growth', 'Mature', 'Clearance'] as const
export type Stage = (typeof STAGES)[number]

/** The sheet's starting values: the target net profit as a share of price for each stage (G4:G7). */
export const DEFAULT_STAGE_TARGETS: Record<Stage, number> = { Launch: -0.15, Growth: 0.08, Mature: 0.15, Clearance: 0 }

export const DEFAULT_OVERSTOCK_DAYS = 60
export const DEFAULT_STOCKOUT_DAYS = 15
export const DEFAULT_AD_BUDGET_CAP = 21_000

export interface PlanSettings {
  stageTargets: Record<Stage, number>
  /** J3: more days of cover than this is overstock. */
  overstockDays: number
  /** J4: fewer days of cover than this is a stock-out risk. */
  stockoutDays: number
}

export interface PlanInputs {
  fulfillment: 'FBA' | 'FBM'
  /** E: the selling price. */
  price: number | null
  /** G: profit per unit before marketing (realized net profit plus the marketing cost, from the Amazon tab). */
  profitBeforeMarketing: number | null
  /** C: the stage picked for the SKU. */
  stage: Stage
  /** T: units planned for next month; null while none is typed. */
  plannedUnits: number | null
  /** K, L, M, N: last month. */
  units: number
  sales: number
  adSpend: number
  adSales: number
  /** Z: units available at Amazon. */
  availableUnits: number
}

export interface PlanResult {
  /** AA: how many days the stock lasts at last month's pace; null without sales. */
  daysOfCover: number | null
  /** D */
  suggestedStage: Stage
  /** H: the TACoS at which the SKU makes nothing. */
  breakEvenTacos: number | null
  /** I */
  stageTargetProfit: number | null
  /** J: the TACoS to aim for. */
  targetTacos: number | null
  /** O, P, Q */
  actualTacos: number | null
  actualAcos: number | null
  organicShare: number | null
  /** R, S */
  profitBeforeMarketingLastMonth: number | null
  actualNetProfitLastMonth: number | null
  /** U, V, W, X */
  plannedSales: number | null
  recommendedAdBudget: number | null
  perDay: number | null
  changeVsLastMonth: number | null
  /** Y, AB */
  decision: string
  stockFlag: string
}

const isNum = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const n = (value: number | null | undefined) => (isNum(value) ? value : 0)

/** AA */
export const daysOfCover = (availableUnits: number, units: number): number | null => (n(units) === 0 ? null : availableUnits / (units / 30))

/** D: the stage the data suggests. */
export function suggestStage(input: Pick<PlanInputs, 'fulfillment' | 'units'> & { organicShare: number | null; daysOfCover: number | null }, settings: PlanSettings): Stage {
  const cover = n(input.daysOfCover)
  if (input.fulfillment === 'FBA' && cover > settings.overstockDays) return 'Clearance'
  if (n(input.units) === 0) return 'Launch'
  const healthyCover = cover >= settings.stockoutDays && cover <= settings.overstockDays
  if (n(input.organicShare) > 0.5 && (input.fulfillment === 'FBM' || healthyCover)) return 'Mature'
  return 'Growth'
}

/** Y */
function decide(input: PlanInputs, breakEven: number | null, target: number | null, tacos: number | null): string {
  if (n(input.sales) === 0) return 'No last-month data'
  if (breakEven === null || target === null) return 'Check price/profit/stage'
  if (tacos !== null && tacos > breakEven) return 'CUT - ads losing money'
  if (tacos !== null && tacos > target) return 'TRIM to target'
  return 'OK - hold or scale'
}

/** AB */
function stockFlag(input: PlanInputs, cover: number | null, settings: PlanSettings): string {
  if (input.fulfillment === 'FBM') return 'FBM - FBA stock not applicable'
  if (n(input.availableUnits) === 0 && n(input.units) === 0) return 'No stock, no sales'
  if (n(input.availableUnits) === 0) return 'STOCK-OUT - pause ads'
  if (cover === null) return 'Stock but no sales'
  if (cover < settings.stockoutDays) return 'Stock-out risk - do not scale ads'
  if (cover > settings.overstockDays) return 'Overstock - consider Clearance stage'
  return 'OK'
}

export function planRow(input: PlanInputs, settings: PlanSettings): PlanResult {
  const cover = daysOfCover(input.availableUnits, input.units)
  const organicShare = n(input.sales) === 0 ? null : (input.sales - input.adSales) / input.sales
  const breakEvenTacos = input.profitBeforeMarketing === null || n(input.price) === 0 ? null : input.profitBeforeMarketing / (input.price as number)
  const stageTargetProfit = settings.stageTargets[input.stage] ?? null
  const targetTacos = breakEvenTacos === null || stageTargetProfit === null ? null : breakEvenTacos - stageTargetProfit
  const actualTacos = n(input.sales) === 0 ? null : input.adSpend / input.sales
  const profitLast = input.profitBeforeMarketing === null ? null : input.units * input.profitBeforeMarketing
  const plannedSales = input.price === null || input.plannedUnits === null ? null : input.plannedUnits * input.price
  const budget = plannedSales === null || targetTacos === null ? null : plannedSales * Math.max(targetTacos, 0)

  return {
    daysOfCover: cover,
    suggestedStage: suggestStage({ fulfillment: input.fulfillment, units: input.units, organicShare, daysOfCover: cover }, settings),
    breakEvenTacos,
    stageTargetProfit,
    targetTacos,
    actualTacos,
    actualAcos: n(input.adSales) === 0 ? null : input.adSpend / input.adSales,
    organicShare,
    profitBeforeMarketingLastMonth: profitLast,
    actualNetProfitLastMonth: profitLast === null ? null : profitLast - input.adSpend,
    plannedSales,
    recommendedAdBudget: budget,
    perDay: budget === null ? null : budget / 30,
    changeVsLastMonth: budget === null ? null : budget - input.adSpend,
    decision: decide(input, breakEvenTacos, targetTacos, actualTacos),
    stockFlag: stockFlag(input, cover, settings),
  }
}

/** The plan month (`YYYY-MM`) and the data month before it. */
export function previousMonth(planMonth: string): string {
  const [year, month] = planMonth.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 2, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}
