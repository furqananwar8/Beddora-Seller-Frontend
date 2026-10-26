'use client'

import React, { useRef } from 'react'

import { PieChart } from '@/design-system/charts/PieChart'
import { ChartPalette } from '@/design-system/charts/ChartPalette'
import { Spinner } from '@/design-system/loaders'
import { ProductProfitBreakdown, useGetRefundReasonsQuery } from '@/services/api/profit.api'
import { formatNumber } from '@/utils/format'
import { useDismiss } from '@/hooks/useDismiss'

/** The date range and marketplaces the products table shows: the refunds counted in it. */
export interface RefundReasonsScope {
  startDate?: string
  endDate?: string
  marketplaces?: string[]
}

interface RefundReasonsPopoverProps {
  product: ProductProfitBreakdown
  scope: RefundReasonsScope
  anchorRect: DOMRect
  onClose: () => void
}

const WIDTH = 360
const GAP = 8

/** Refunds with no reported return yet keep green (as Sellerboard shows them); reasons take the other chart colours. */
const PENDING_COLOR = ChartPalette.success
const REASON_COLORS = [ChartPalette.danger, ChartPalette.warning, ChartPalette.accent, ChartPalette.neutral, ChartPalette.primary]

/**
 * A product's refunds by return reason: a donut of the refunded units and a legend of each reason, its status and
 * the customers' comments. Opens under the clicked refund count; closes on an outside click or Escape.
 */
export function RefundReasonsPopover({ product, scope, anchorRect, onClose }: RefundReasonsPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // A parent or group row counts its children's refunds
  const skus = product.children?.length ? product.children.map((child) => child.sku) : [product.sku]
  const { data, isFetching, isError } = useGetRefundReasonsQuery(
    { skus, startDate: scope.startDate!, endDate: scope.endDate!, marketplaces: scope.marketplaces },
    { skip: !scope.startDate || !scope.endDate },
  )

  useDismiss(panelRef, onClose)

  const left = Math.min(Math.max(8, anchorRect.left + anchorRect.width / 2 - WIDTH / 2), window.innerWidth - WIDTH - 8)
  const top = Math.min(anchorRect.bottom + GAP, window.innerHeight - 440)

  let reasonIndex = 0
  const slices = (data?.reasons ?? []).map((reason) => ({
    ...reason,
    color: reason.reasonCode ? REASON_COLORS[reasonIndex++ % REASON_COLORS.length] : PENDING_COLOR,
  }))
  const title = product.groupLabel ?? product.productTitle ?? product.sku

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Refunds of ${title}`}
      className="fixed z-50 bg-surface border border-border rounded-lg shadow-2xl"
      style={{ left, top: Math.max(8, top), width: WIDTH }}
    >
      <div className="flex items-start gap-3 px-4 py-3 border-b border-border">
        {product.imageUrl && (
          <img src={product.imageUrl} alt="" className="w-10 h-10 object-contain flex-shrink-0 mix-blend-multiply dark:mix-blend-normal" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-text-primary line-clamp-2">{title}</div>
          {!product.groupLabel && <div className="text-xs text-text-muted truncate">{product.sku} SKU</div>}
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-surface-secondary" aria-label="Close">
          <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isFetching ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="px-4 py-8 text-center text-sm text-danger-600">Could not load the refund reasons.</div>
      ) : !slices.length ? (
        <div className="px-4 py-8 text-center text-sm text-text-muted">No refunds in this period.</div>
      ) : (
        <>
          <PieChart
            data={slices.map((slice) => ({ name: slice.label, value: slice.units, color: slice.color }))}
            height={200}
            innerRadius={68}
            outerRadius={84}
            showLegend={false}
            showTooltip={false}
            centerLabel={<span className="text-2xl font-semibold text-text-primary">{formatNumber(data!.totalUnits, 0)}</span>}
          />
          <ul className="border-t border-border max-h-48 overflow-y-auto">
            {slices.map((slice) => (
              <li key={`${slice.reasonCode}|${slice.status}`} className="px-4 py-2 border-b border-border last:border-0 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: slice.color }} />
                  <span className="flex-1 min-w-0 text-text-primary">
                    {slice.label}
                    {slice.status && <span className="text-text-muted"> · {slice.status}</span>}
                  </span>
                  <span className="font-medium text-text-primary">{formatNumber(slice.units, 0)}</span>
                </div>
                {slice.comments.map((comment) => (
                  <p key={comment} className="mt-1 pl-[18px] text-xs italic text-text-muted">
                    “{comment}”
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
