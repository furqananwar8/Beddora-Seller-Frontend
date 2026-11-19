'use client'

import React from 'react'
import { CellInput, Figure } from '@/features/breakeven/amazon/PricingCells'
import { cn } from '@/utils/cn'
import { STAGES, type Stage } from './marketingPlan.calc'
import type { PlanLine } from './useMarketingPlan'

export interface PlanColumnContext {
  currency: string
  setStage: (sku: string, stage: Stage | undefined) => void
  setPlannedUnits: (sku: string, units: number | undefined) => void
}

export interface PlanColumn {
  id: string
  header: string
  width: number
  frozen?: boolean
  /** The user can change this column's cell. */
  editable?: boolean
  cell: (line: PlanLine, context: PlanColumnContext) => React.ReactNode
}

const DASH = '–'

const money = (value: number | null, currency: string) =>
  value === null || !Number.isFinite(value) ? DASH : new Intl.NumberFormat('en-CA', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(value)
const percent = (value: number | null) => (value === null || !Number.isFinite(value) ? DASH : `${(value * 100).toFixed(2)}%`)
const whole = (value: number | null) => (value === null || !Number.isFinite(value) ? DASH : new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 }).format(value))

const signed = (value: number | null) => (value === null ? undefined : value < 0 ? ('bad' as const) : ('good' as const))

const DECISION_TONE: Record<string, string> = {
  'CUT - ads losing money': 'bg-danger-50 text-danger-700',
  'TRIM to target': 'bg-warning-50 text-warning-700',
  'OK - hold or scale': 'bg-success-50 text-success-700',
}

const STOCK_TONE = (flag: string) => (flag === 'OK' ? 'text-success-700' : /STOCK-OUT|Stock-out|Overstock/.test(flag) ? 'text-danger-700' : 'text-text-muted')

const Tag: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <span className={cn('inline-block rounded-md px-2 py-0.5 text-xs font-medium', className ?? 'bg-secondary-100 text-text-secondary')}>{children}</span>
)

/** The sheet's columns in its order. "Profit before Marketing (Old)" is left out: it was a typed-in snapshot with no source. */
export const PLAN_COLUMNS: PlanColumn[] = [
  { id: 'sku', header: 'SKU', width: 230, frozen: true, cell: (line) => <span className="block break-all text-left font-medium text-text-primary">{line.sku}</span> },
  { id: 'fulfillment', header: 'FBA / FBM', width: 80, cell: (line) => line.inputs.fulfillment },
  {
    id: 'stage',
    header: 'Stage (pick)',
    width: 130,
    editable: true,
    cell: (line, { setStage }) => (
      <select
        aria-label={`Stage for ${line.sku}`}
        value={line.inputs.stage}
        onChange={(event) => setStage(line.sku, event.target.value === 'Growth' ? undefined : (event.target.value as Stage))}
        className={cn('w-full rounded border px-1.5 py-1 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500', line.stageEdited ? 'border-warning-300 bg-warning-50' : 'border-border bg-surface')}
      >
        {STAGES.map((stage) => (
          <option key={stage} value={stage}>
            {stage}
          </option>
        ))}
      </select>
    ),
  },
  { id: 'suggested', header: 'Suggested Stage', width: 110, cell: (line) => line.result.suggestedStage },
  { id: 'price', header: 'Selling Price', width: 100, cell: (line, { currency }) => <Figure>{money(line.inputs.price, currency)}</Figure> },
  { id: 'profit', header: 'Profit before Marketing (per unit)', width: 130, cell: (line, { currency }) => <Figure tone={signed(line.inputs.profitBeforeMarketing)}>{money(line.inputs.profitBeforeMarketing, currency)}</Figure> },
  { id: 'breakEven', header: 'Break-even TACoS %', width: 110, cell: (line) => <Figure>{percent(line.result.breakEvenTacos)}</Figure> },
  { id: 'stageTarget', header: 'Stage Target Profit %', width: 110, cell: (line) => <Figure>{percent(line.result.stageTargetProfit)}</Figure> },
  { id: 'targetTacos', header: 'Target TACoS %', width: 110, cell: (line) => <Figure bold tone={signed(line.result.targetTacos)}>{percent(line.result.targetTacos)}</Figure> },
  { id: 'units', header: 'Last Month Total Units', width: 100, cell: (line) => <Figure>{whole(line.inputs.units)}</Figure> },
  { id: 'sales', header: 'Last Month Total Sales', width: 120, cell: (line, { currency }) => <Figure>{money(line.inputs.sales, currency)}</Figure> },
  { id: 'adSpend', header: 'Last Month Ad Spend', width: 120, cell: (line, { currency }) => <Figure>{money(line.inputs.adSpend, currency)}</Figure> },
  { id: 'adSales', header: 'Last Month Ad Sales', width: 120, cell: (line, { currency }) => <Figure>{money(line.inputs.adSales, currency)}</Figure> },
  { id: 'tacos', header: 'Actual TACoS %', width: 100, cell: (line) => <Figure>{percent(line.result.actualTacos)}</Figure> },
  { id: 'acos', header: 'Actual ACoS %', width: 100, cell: (line) => <Figure>{percent(line.result.actualAcos)}</Figure> },
  { id: 'organic', header: 'Organic Share %', width: 100, cell: (line) => <Figure>{percent(line.result.organicShare)}</Figure> },
  { id: 'profitLast', header: 'Profit before Marketing (last month)', width: 140, cell: (line, { currency }) => <Figure tone={signed(line.result.profitBeforeMarketingLastMonth)}>{money(line.result.profitBeforeMarketingLastMonth, currency)}</Figure> },
  { id: 'netLast', header: 'Actual Net Profit (last month)', width: 130, cell: (line, { currency }) => <Figure tone={signed(line.result.actualNetProfitLastMonth)}>{money(line.result.actualNetProfitLastMonth, currency)}</Figure> },
  {
    id: 'planned',
    header: 'Planned Units (next month)',
    width: 130,
    editable: true,
    cell: (line, { setPlannedUnits }) => (
      <CellInput ariaLabel={`Planned units for ${line.sku}`} value={line.inputs.plannedUnits} edited={line.plannedEdited} onChange={(value) => setPlannedUnits(line.sku, value)} />
    ),
  },
  { id: 'plannedSales', header: 'Planned Sales', width: 110, cell: (line, { currency }) => <Figure>{money(line.result.plannedSales, currency)}</Figure> },
  { id: 'budget', header: 'Recommended Ad Budget', width: 130, cell: (line, { currency }) => <Figure bold>{money(line.result.recommendedAdBudget, currency)}</Figure> },
  { id: 'perDay', header: 'Per Day', width: 90, cell: (line, { currency }) => <Figure>{money(line.result.perDay, currency)}</Figure> },
  { id: 'change', header: 'Change vs Last Month Spend', width: 130, cell: (line, { currency }) => <Figure tone={line.result.changeVsLastMonth === null ? undefined : line.result.changeVsLastMonth > 0 ? 'good' : 'bad'}>{money(line.result.changeVsLastMonth, currency)}</Figure> },
  { id: 'decision', header: 'Decision', width: 190, cell: (line) => <Tag className={DECISION_TONE[line.result.decision]}>{line.result.decision}</Tag> },
  { id: 'available', header: 'Available Units (FBA)', width: 100, cell: (line) => <Figure>{whole(line.inputs.availableUnits)}</Figure> },
  { id: 'cover', header: 'Days of Cover', width: 90, cell: (line) => <Figure>{whole(line.result.daysOfCover)}</Figure> },
  { id: 'stockFlag', header: 'Stock Flag', width: 230, cell: (line) => <span className={cn('text-xs font-medium', STOCK_TONE(line.result.stockFlag))}>{line.result.stockFlag}</span> },
]

export const PLAN_TABLE_WIDTH = PLAN_COLUMNS.reduce((sum, column) => sum + column.width, 0)
