import { useCallback, useMemo, useState } from 'react'
import { useAmazonPricing } from '@/features/breakeven/amazon/useAmazonPricing'
import type { PricingCountry } from '@/services/api/amazonPricing.api'
import { useGetMarketingPlanQuery, type MarketingPlanSku } from '@/services/api/marketingPlan.api'
import {
  DEFAULT_AD_BUDGET_CAP,
  DEFAULT_OVERSTOCK_DAYS,
  DEFAULT_STAGE_TARGETS,
  DEFAULT_STOCKOUT_DAYS,
  planRow,
  previousMonth,
  type PlanInputs,
  type PlanResult,
  type PlanSettings,
  type Stage,
} from './marketingPlan.calc'

const DEFAULT_STAGE: Stage = 'Growth'

const currentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const NO_ACTIVITY: Omit<MarketingPlanSku, 'sku'> = { units: 0, sales: 0, adSpend: 0, adSales: 0, availableUnits: 0 }

export interface PlanLine {
  sku: string
  title: string
  inputs: PlanInputs
  result: PlanResult
  /** The user changed this row's stage or planned units. */
  stageEdited: boolean
  plannedEdited: boolean
}

const DEFAULT_SETTINGS: PlanSettings = { stageTargets: DEFAULT_STAGE_TARGETS, overstockDays: DEFAULT_OVERSTOCK_DAYS, stockoutDays: DEFAULT_STOCKOUT_DAYS }

/**
 * The Marketing Plan's rows: every SKU of the marketplace with the profit per unit the Amazon tab works out (its
 * edits included), last month's orders, ads and stock from the server, and the plan's own inputs. Nothing here is saved:
 * the plan starts from the defaults on every visit and an edit only shows what the figures would be.
 */
export function useMarketingPlan(country: PricingCountry, searchTerm: string) {
  const [planMonth, setPlanMonth] = useState(currentMonth)
  const dataMonth = previousMonth(planMonth)
  const [settings, setSettings] = useState<PlanSettings>(DEFAULT_SETTINGS)
  const [budgetCap, setBudgetCap] = useState(DEFAULT_AD_BUDGET_CAP)
  const [stages, setStages] = useState<Record<string, Stage>>({})
  const [planned, setPlanned] = useState<Record<string, number>>({})

  const pricing = useAmazonPricing(country, '')
  const activity = useGetMarketingPlanQuery({ country, month: dataMonth })

  const setStage = useCallback((sku: string, stage: Stage | undefined) => setStages((current) => withKey(current, sku, stage)), [])
  const setPlannedUnits = useCallback((sku: string, units: number | undefined) => setPlanned((current) => withKey(current, sku, units)), [])
  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    setBudgetCap(DEFAULT_AD_BUDGET_CAP)
    setStages({})
    setPlanned({})
  }, [])

  const lines = useMemo<PlanLine[]>(() => {
    const bySku = new Map((activity.data?.rows ?? []).map((row) => [row.sku, row]))
    const seen = new Set<string>()
    const result: PlanLine[] = []
    for (const { row, result: pricingResult, values } of pricing.allLines) {
      // A SKU listed as FBA and FBM is one row of the plan, the first listing (the sheet looks each SKU up once)
      if (seen.has(row.sku)) continue
      seen.add(row.sku)
      const month = bySku.get(row.sku) ?? { sku: row.sku, ...NO_ACTIVITY }
      const profit = pricingResult.realizedNetProfit === null ? null : pricingResult.realizedNetProfit + (pricingResult.marketingCost ?? 0)
      const inputs: PlanInputs = {
        fulfillment: row.fulfillment,
        price: values.sellingPrice,
        profitBeforeMarketing: profit,
        stage: stages[row.sku] ?? DEFAULT_STAGE,
        plannedUnits: planned[row.sku] ?? null,
        units: month.units,
        sales: month.sales,
        adSpend: month.adSpend,
        adSales: month.adSales,
        availableUnits: month.availableUnits,
      }
      result.push({ sku: row.sku, title: row.title, inputs, result: planRow(inputs, settings), stageEdited: row.sku in stages, plannedEdited: row.sku in planned })
    }
    return result
  }, [pricing.allLines, activity.data, settings, stages, planned])

  const term = searchTerm.trim().toLowerCase()
  const visible = useMemo(() => (term ? lines.filter((line) => line.sku.toLowerCase().includes(term) || line.title.toLowerCase().includes(term)) : lines), [lines, term])

  const totals = useMemo(
    () => ({
      recommendedBudget: lines.reduce((sum, line) => sum + (line.result.recommendedAdBudget ?? 0), 0),
      lastMonthSpend: lines.reduce((sum, line) => sum + line.inputs.adSpend, 0),
    }),
    [lines],
  )

  return {
    planMonth,
    setPlanMonth,
    dataMonth,
    settings,
    setSettings,
    budgetCap,
    setBudgetCap,
    setStage,
    setPlannedUnits,
    reset,
    editedCount: Object.keys(stages).length + Object.keys(planned).length,
    currency: activity.data?.currency ?? pricing.data?.currency ?? 'CAD',
    isLoading: pricing.isLoading || activity.isLoading,
    isFetching: pricing.isFetching || activity.isFetching,
    error: pricing.error ?? activity.error,
    lines: visible,
    totals,
  }
}

/** A copy of `record` with `key` set, or removed when `value` is undefined. */
function withKey<T>(record: Record<string, T>, key: string, value: T | undefined): Record<string, T> {
  const next = { ...record }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}
