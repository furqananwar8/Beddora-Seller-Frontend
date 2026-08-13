import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

export type TrendMetric =
  | 'sales'
  | 'units'
  | 'orders'
  | 'promo'
  | 'advertisingCost'
  | 'refunds'
  | 'refundCost'
  | 'refundsPercent'
  | 'sellableReturns'
  | 'amazonFees'
  | 'estimatedPayout'
  | 'costOfGoods'
  | 'grossProfit'
  | 'indirectExpenses'
  | 'netProfit'
  | 'margin'
  | 'realACOS'
  | 'roi'

interface MetricTabsProps {
  value: TrendMetric
  onChange: (metric: TrendMetric) => void
}

const PRIMARY_METRICS: Array<{
  value: TrendMetric
  label: string
}> = [
  { value: 'sales', label: 'Sales' },
  { value: 'units', label: 'Units' },
  { value: 'orders', label: 'Orders' },
  { value: 'promo', label: 'Promo' },
  { value: 'advertisingCost', label: 'Advertising' },
  { value: 'refunds', label: 'Refunds' },
]

const OTHER_METRICS: Array<{
  value: TrendMetric
  label: string
}> = [
  { value: 'refundCost', label: 'Refund Cost' },
  { value: 'refundsPercent', label: '% Refunds' },
  { value: 'sellableReturns', label: 'Sellable Returns' },
  { value: 'amazonFees', label: 'Amazon Fees' },
  { value: 'estimatedPayout', label: 'Estimated Payout' },
  { value: 'costOfGoods', label: 'Cost of Goods' },
  { value: 'grossProfit', label: 'Gross Profit' },
  { value: 'indirectExpenses', label: 'Indirect Expenses' },
  { value: 'netProfit', label: 'Net Profit' },
  { value: 'margin', label: 'Margin' },
  { value: 'realACOS', label: 'Real ACOS' },
  { value: 'roi', label: 'ROI' },
]

export const MetricTabs: React.FC<MetricTabsProps> = ({
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onOutside)

    return () => {
      document.removeEventListener('mousedown', onOutside)
    }
  }, [])

  const selectedOther = OTHER_METRICS.find(
    (metric) => metric.value === value
  )

  return (
    <div
      ref={ref}
      className="relative min-w-0 max-w-full overflow-visible"
    >
      <div className="inline-flex max-w-full items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-sm">
        {PRIMARY_METRICS.map((metric) => {
          const active = value === metric.value

          return (
            <button
              key={metric.value}
              type="button"
              onClick={() => {
                onChange(metric.value)
                setOpen(false)
              }}
              className={cn(
                'shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
                active
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
              )}
            >
              {metric.label}
            </button>
          )
        })}

        {/* Others + Dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((current) => !current)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-all',
              'inline-flex items-center gap-1.5',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
              selectedOther || open
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
            )}
          >
            <span>
              {selectedOther
                ? selectedOther.label
                : 'Others'}
            </span>

            <svg
              className={cn(
                'h-4 w-4 transition-transform',
                open && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 top-full z-[100] mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl"
            >
              <div className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                More metrics
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {OTHER_METRICS.map((metric) => {
                  const active =
                    value === metric.value

                  return (
                    <button
                      key={metric.value}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onChange(metric.value)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                        active
                          ? 'bg-primary-600 text-white'
                          : 'text-text-primary hover:bg-surface-secondary'
                      )}
                    >
                      <span>{metric.label}</span>

                      {active && (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}