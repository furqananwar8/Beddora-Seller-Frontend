'use client'

import React, { useRef } from 'react'
import { useDismiss } from '@/hooks/useDismiss'
import type { FbaStockSummary } from '@/services/api/inventoryPlanner.api'
import { formatCurrency, formatNumber } from '@/utils/format'

interface FbaStockPopoverProps {
  stock: FbaStockSummary
  /** COGS per unit, to value the FBA stock; unknown when null. */
  cogsRate?: number | null
  anchorRect: DOMRect
  onClose: () => void
}

const WIDTH = 520
const GAP = 8
/** Days until the next order at or below this read as a warning. */
const REORDER_SOON_DAYS = 7

/** Stock is running low: the next order is due within a week (shown orange / with a warning). */
export const isReorderSoon = (stock: { daysUntilNextOrder?: number | null }): boolean =>
  stock.daysUntilNextOrder != null && stock.daysUntilNextOrder <= REORDER_SOON_DAYS

const days = (value: number | null) => (value === null ? '—' : formatNumber(value, 0))

const Metric: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs leading-snug text-text-muted">{label}</dt>
    <dd className="mt-1 text-base font-medium text-text-primary">{children}</dd>
  </div>
)

/**
 * A SKU's FBA stock picture: how long it lasts, when to reorder, how fast it sells, what it is worth, and what is
 * reserved, inbound or still on order. Opens under the clicked "FBA stock"; closes on an outside click or Escape.
 */
export function FbaStockPopover({ stock, cogsRate, anchorRect, onClose }: FbaStockPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useDismiss(panelRef, onClose)

  const left = Math.min(Math.max(8, anchorRect.left), window.innerWidth - WIDTH - 8)
  const top = Math.min(anchorRect.bottom + GAP, window.innerHeight - 220)
  const reorderSoon = isReorderSoon(stock)

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`FBA stock of ${stock.sku}`}
      className="fixed z-50 rounded-lg border border-border bg-surface p-4 shadow-2xl"
      style={{ left, top: Math.max(8, top), width: WIDTH }}
    >
      <dl className="grid grid-cols-4 gap-x-4 gap-y-3">
        <Metric label="Days of stock left (FBA)">{days(stock.daysOfStockLeft)}</Metric>
        <Metric label="Days until next order">
          <span className={reorderSoon ? 'inline-flex items-center gap-1 text-warning-600' : undefined}>
            {reorderSoon && <span aria-hidden>⚠</span>}
            {days(stock.daysUntilNextOrder)}
          </span>
        </Metric>
        <Metric label="Sales velocity (units/day)">{formatNumber(stock.salesVelocity, 2)}</Metric>
        <Metric label="Stock value">{cogsRate == null ? '—' : formatCurrency(stock.fbaStock * cogsRate)}</Metric>
      </dl>
      <hr className="my-3 border-border" />
      <dl className="grid grid-cols-4 gap-x-4 gap-y-3">
        <Metric label="FBA stock">{formatNumber(stock.fbaStock, 0)}</Metric>
        <Metric label="Ordered">{formatNumber(stock.ordered, 0)}</Metric>
        <Metric label="Reserved">{formatNumber(stock.reserved, 0)}</Metric>
        <Metric label="Sent to FBA">{formatNumber(stock.sentToFba, 0)}</Metric>
      </dl>
    </div>
  )
}
