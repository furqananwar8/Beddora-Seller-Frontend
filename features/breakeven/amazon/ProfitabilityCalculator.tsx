'use client'

import React, { useState } from 'react'
import { Calculator } from 'lucide-react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { PricingCountry } from '@/services/api/amazonPricing.api'
import type { PricingLine } from './useAmazonPricing'

/**
 * A revenue-calculator style breakdown of one listing, opened from the icon beside its ASIN: what a unit sells for and
 * where the money goes, so profit per unit, margin and return on cost read at a glance. It reads the row as the table has
 * it now, so edits made in the table show here.
 */

export const ProfitabilityCalculator: React.FC<{ line: PricingLine; currency: string; country: PricingCountry }> = ({ line, currency, country }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Profitability calculator"
        aria-label={`Profitability calculator for ${line.row.asin ?? line.row.sku}`}
        className="shrink-0 rounded p-1 text-primary-600 hover:bg-secondary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <Calculator className="h-4 w-4" />
      </button>
      {open && <CalculatorModal line={line} currency={currency} country={country} onClose={() => setOpen(false)} />}
    </>
  )
}

const CalculatorModal: React.FC<{ line: PricingLine; currency: string; country: PricingCountry; onClose: () => void }> = ({ line, currency, country, onClose }) => {
  const { row, values, result } = line
  const price = values.sellingPrice ?? 0
  const promo = (values.promoPct ?? 0) / 100
  const fba = row.fulfillment === 'FBA'
  const money = (value: number | null | undefined) => (value === null || value === undefined ? '—' : formatCurrency(value, currency))

  const items: Array<{ label: string; value: number | null | undefined; note?: string }> = [
    { label: 'Referral (commission) fee', value: result.commission, note: `${values.commissionPct ?? 0}%` },
    { label: fba ? 'FBA fulfilment fee' : 'Shipping (FBM)', value: fba ? values.fbaFee : values.shippingCost },
    ...(country === 'US' && fba ? [{ label: 'Inbound placement fee', value: values.inboundPlacementFee ?? 0 }] : []),
    { label: 'Storage per unit sold', value: result.storagePerUnitSold, note: fba ? `${values.daysInStock ?? 0} days` : undefined },
    { label: 'Marketing', value: result.marketingCost, note: `${values.marketingPct ?? 0}%` },
    { label: 'Operational overhead', value: price * ((values.overheadPct ?? 0) / 100), note: `${values.overheadPct ?? 0}%` },
    { label: 'Estimated returns', value: result.returnCost, note: `${values.returnPct ?? 0}%` },
    { label: 'Landed cost', value: values.landedCost },
  ]

  const profit = result.realizedNetProfit
  const roi = profit !== null && values.landedCost ? profit / values.landedCost : null
  const tone = profit === null ? '' : profit >= 0 ? 'text-success-600' : 'text-danger-600'

  return (
    <Modal isOpen onClose={onClose} title="Profitability calculator" size="md">
      <div className="text-sm font-semibold leading-snug text-text-primary">{row.title}</div>
      <div className="mt-0.5 text-xs text-text-muted">
        {row.sku} · {row.asin ?? 'no ASIN'} · {row.fulfillment} · {country}
      </div>

      <div className="mt-4 divide-y divide-border rounded-lg border border-border text-sm">
        <Row label="Selling price" value={money(price)} bold />
        {promo > 0 && <Row label="After promo discount" value={money(price * (1 - promo))} note={`${values.promoPct}% off`} />}
        {items.map((item) => (
          <Row key={item.label} label={item.label} value={item.value === null || item.value === undefined ? '—' : `− ${money(item.value)}`} note={item.note} />
        ))}
        <Row label="Net profit per unit" value={money(profit)} bold className={cn('bg-surface-secondary', tone)} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Stat label="Net margin" value={result.realizedNetMargin === null ? '—' : `${(result.realizedNetMargin * 100).toFixed(1)}%`} tone={tone} />
        <Stat label="ROI on landed cost" value={roi === null ? '—' : `${(roi * 100).toFixed(1)}%`} tone={tone} />
        <Stat label="Break-even price" value={money(result.adjustedBreakEvenPrice ?? result.breakEvenPrice)} />
      </dl>
      {!values.landedCost && <p className="mt-3 text-xs text-text-muted">No landed cost for this listing yet, so profit cannot be worked out. Enter one in the table.</p>}

      <div className="mt-6 flex justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

const Row: React.FC<{ label: string; value: string; note?: string; bold?: boolean; className?: string }> = ({ label, value, note, bold, className }) => (
  <div className={cn('flex items-center justify-between gap-3 px-3 py-2', className)}>
    <span className={cn('text-text-primary', bold && 'font-semibold')}>
      {label}
      {note && <span className="ml-2 text-xs text-text-muted">{note}</span>}
    </span>
    <span className={cn('tabular-nums', bold && 'font-semibold')}>{value}</span>
  </div>
)

const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div className="rounded-lg border border-border px-2 py-2">
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className={cn('mt-1 text-base font-semibold tabular-nums', tone)}>{value}</dd>
  </div>
)
