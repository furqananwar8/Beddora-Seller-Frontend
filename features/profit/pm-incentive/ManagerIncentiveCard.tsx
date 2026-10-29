'use client'

import React from 'react'
import { FormField, fieldClass, selectClass } from '@/components/form-field/FormField'
import { NumericInput } from '@/components/form-field/NumericInput'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { SelectShell } from '@/features/finance/shared/SelectShell'
import type { ProductManager } from '@/services/api/productManagers.api'
import { cn } from '@/utils/cn'
import { formatAmount, formatPkr, formatUsd } from './format'
import type { ManagerPayout } from './plan/incentiveCalculator'
import { BONUS_MAX_PKR, INCENTIVE_PLAN, TIER_NAMES } from './plan/incentivePlan'
import type { ManagerSales } from './useManagerProducts'

/** What is typed in per manager: the by-product report has neither. */
export interface ManualMetrics {
  conversionPct: number
  categoryRank: number
}

interface ManagerIncentiveCardProps {
  managers: ProductManager[]
  selectedId: string
  onSelect: (id: string) => void
  /** Left out when the user cannot edit managers. */
  onEdit?: (manager: ProductManager) => void
  sales: ManagerSales
  metrics: ManualMetrics
  onMetricsChange: (metrics: ManualMetrics) => void
  payout: ManagerPayout | undefined
  loading: boolean
}

const BonusPill: React.FC<{ amount: number }> = ({ amount }) =>
  amount >= BONUS_MAX_PKR ? (
    <Badge variant="success" size="sm">Max</Badge>
  ) : amount > 0 ? (
    <Badge variant="warning" size="sm">Earned</Badge>
  ) : (
    <Badge variant="error" size="sm">None</Badge>
  )

const BonusRow: React.FC<{ label: string; amount: number; why: string }> = ({ label, amount, why }) => (
  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-0.5 text-sm">
    <span className="text-text-primary">{label}</span>
    <BonusPill amount={amount} />
    <span className="min-w-[7ch] text-right font-mono tabular-nums">{formatAmount(amount)}</span>
    <span className="col-span-3 text-xs text-text-muted">{why}</span>
  </div>
)

const TotalLine: React.FC<{ label: string; value: number; grand?: boolean }> = ({ label, value, grand }) => (
  <div className={cn('flex justify-between gap-2', grand ? 'pt-1 text-lg font-bold text-text-primary' : 'text-sm')}>
    <span>{label}</span>
    <span className="font-mono tabular-nums">{formatPkr(value)}</span>
  </div>
)

const ReadOnlyValue: React.FC<{ id: string; value: string }> = ({ id, value }) => (
  <input id={id} readOnly value={value} className={cn(fieldClass(), 'cursor-default bg-secondary-50 font-mono')} />
)

const adsWhy = (p: ManagerPayout) =>
  p.manager.acosPct > 0
    ? `ACoS ${p.manager.acosPct}% (ROAS ${p.roas}) is ${TIER_NAMES[p.acosTier]}; conversion ${p.manager.conversionPct}% is ${TIER_NAMES[p.conversionTier]}. The lower tier is paid.`
    : 'No ad spend or sales on these SKUs this month.'

const rankWhy = (p: ManagerPayout) =>
  p.manager.categoryRank > 0 ? `Rank ${p.manager.categoryRank}${p.rankingBonus ? '' : ' is outside the top 10'}` : 'Not ranked'

/** One manager's month: pick the manager, type conversion and rank, read the payout. */
export const ManagerIncentiveCard: React.FC<ManagerIncentiveCardProps> = ({ managers, selectedId, onSelect, onEdit, sales, metrics, onMetricsChange, payout, loading }) => {
  const selected = managers.find((manager) => manager.id === selectedId)
  const setMetric = (key: keyof ManualMetrics) => (event: React.ChangeEvent<HTMLInputElement>) => onMetricsChange({ ...metrics, [key]: Number(event.target.value) || 0 })

  return (
    <article className="grid min-w-0 content-start gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <FormField label="Product manager" htmlFor="pm-select">
          <SelectShell>
            <select id="pm-select" value={selectedId} onChange={(event) => onSelect(event.target.value)} className={cn(selectClass(), 'font-semibold')}>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </SelectShell>
        </FormField>
        {selected && onEdit && (
          <Button type="button" variant="outline" size="field" onClick={() => onEdit(selected)}>
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Monthly sales (USD)" htmlFor="pm-sales" className="col-span-2" hint={selected ? `From ${sales.activeSkus} of ${selected.skus.length} managed SKUs with activity this month` : undefined}>
          <ReadOnlyValue id="pm-sales" value={loading ? 'Loading…' : formatUsd(sales.salesUsd)} />
        </FormField>
        <FormField label="ACoS (%)" htmlFor="pm-acos" hint={loading ? undefined : `Ad spend ${formatUsd(sales.adSpendUsd)}`}>
          <ReadOnlyValue id="pm-acos" value={loading ? 'Loading…' : String(sales.acosPct)} />
        </FormField>
        <FormField label="Conversion, Unit Session (%)" htmlFor="pm-conversion" hint="From Seller Central Business Reports">
          <NumericInput id="pm-conversion" decimal value={metrics.conversionPct || ''} onChange={setMetric('conversionPct')} placeholder="0" className={cn(fieldClass(), 'font-mono')} />
        </FormField>
        <FormField label="Best category rank (0 = not ranked)" htmlFor="pm-rank" className="col-span-2">
          <NumericInput id="pm-rank" value={metrics.categoryRank || ''} onChange={setMetric('categoryRank')} placeholder="0" className={cn(fieldClass(), 'font-mono')} />
        </FormField>
      </div>

      {payout && (
        <>
          <div className="flex items-baseline justify-between gap-2 rounded-lg bg-secondary-100 px-3 py-2.5">
            <span className="text-sm text-text-primary">Sales incentive</span>
            <span className="font-mono text-lg font-semibold tabular-nums">{formatPkr(payout.salesIncentive)}</span>
          </div>
          {payout.aboveTopSlab && (
            <p className="rounded-md bg-warning-50 px-3 py-1.5 text-xs text-warning-700">
              Sales are above {formatUsd(INCENTIVE_PLAN.salesSlabTopUsd)}. This is paid at the top tier until a higher tier is added.
            </p>
          )}

          <div className="grid gap-2">
            <BonusRow label="Ads & conversion" amount={payout.adsBonus} why={adsWhy(payout)} />
            <BonusRow label="Category ranking" amount={payout.rankingBonus} why={rankWhy(payout)} />
          </div>

          <div className="grid gap-1 border-t border-border pt-3">
            <TotalLine label="Sales incentive" value={payout.salesIncentive} />
            <TotalLine label="Performance bonuses" value={payout.adsBonus + payout.rankingBonus} />
            <TotalLine label="Team bonus" value={payout.teamBonus} />
            <TotalLine label="Additional rewards" value={payout.additionalRewards} />
            <TotalLine label="Total" value={payout.total} grand />
          </div>
        </>
      )}
    </article>
  )
}
