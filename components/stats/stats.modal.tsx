'use client'

import React, { useEffect, useRef } from 'react'
import {
  formatCurrency,
  formatPercentage,
  formatNumber,
} from '@/utils/format'
import { cn } from '@/utils/cn'

export interface StatDetailItem {
  label: string
  value: number
  currency?: boolean
  percentage?: boolean
  integer?: boolean
  tooltipKey?: string
}

export interface StatSection {
  title: string
  value: number
  currency?: boolean
  defaultOpen?: boolean
  children?: StatDetailItem[]
  tooltipKey?: string
}

export interface StatModalData {
  title: string
  flag?: string
  sections: StatSection[]
  summaryRows?: StatDetailItem[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  data: StatModalData | null
  currency: string
  anchorRect: DOMRect | null
}

// ============================================================
// TOOLTIP DICTIONARY
// ============================================================

const STAT_TOOLTIPS: Record<
  string,
  { title: string; formula: string; note?: string }
> = {
  Sales: {
    title: 'Sales Revenue',
    formula: 'Sum(Product Principal Charges for Shipments)',
    note: 'Gross product order revenue excluding sales taxes and promotional rebates.',
  },
  Units: {
    title: 'Units Sold',
    formula: 'Sum(Quantity Shipped across Shipment Events)',
    note: 'Authoritative unit count shipped to customers during the selected period.',
  },
  'Units sold': {
    title: 'Units Sold',
    formula: 'Sum(Quantity Shipped across Shipment Events)',
    note: 'Authoritative unit count shipped to customers during the selected period.',
  },
  Promo: {
    title: 'Promotional Rebates',
    formula: 'Sum(Order Discounts & Promotion Credits)',
    note: 'Buyer discounts and promotional rebates issued on sales orders.',
  },
  'Advertising cost': {
    title: 'Advertising Spend',
    formula: 'SP Spend + SB Spend + SB Video + SD Spend',
    note: 'Total ad spend incurred across Amazon Sponsored Ads campaigns.',
  },
  'Refund cost': {
    title: 'Net Refund Cost',
    formula: '(Refunded Amount + Tax) + Promo - Refunded Referral Fee + Refund Commission',
    note: 'Total net financial impact resulting from customer returns and adjustments.',
  },
  'Amazon fees': {
    title: 'Amazon Fees',
    formula: 'FBA Fulfillment + Referral Fee + Storage + Admin Fees + Fee Taxes',
    note: 'Sum of all Amazon service, referral, storage, and fulfillment deductions.',
  },
  'Cost of goods': {
    title: 'Cost of Goods Sold (COGS)',
    formula: 'Units Sold × Unit COGS Rate',
    note: 'Inventory product cost calculated using your configured unit COGS rates.',
  },
  'Cost of goods sold': {
    title: 'Cost of Goods Sold (COGS)',
    formula: 'Units Sold × Unit COGS Rate',
    note: 'Inventory product cost calculated using your configured unit COGS rates.',
  },
  'Gross profit': {
    title: 'Gross Profit',
    formula: 'Sales Revenue - Promo - Ads - Amazon Fees - COGS',
    note: 'Direct profit generated before deducting indirect overhead expenses.',
  },
  'Indirect expenses': {
    title: 'Indirect Expenses',
    formula: 'Sum(Off-Amazon Operating Costs & Overheads)',
    note: 'Fixed and recurring business expenses configured for the period.',
  },
  'Net profit': {
    title: 'Net Profit',
    formula: 'Gross Profit - Indirect Expenses',
    note: 'Final bottom-line profit remaining after all direct and indirect expenses.',
  },
  'Real ACOS': {
    title: 'Real ACOS',
    formula: '(Advertising Cost / Sales Revenue) × 100',
    note: 'True advertising cost of sales relative to overall gross revenue.',
  },
  '% Refunds': {
    title: 'Refund Percentage',
    formula: '(Refunded Amount / Sales Revenue) × 100',
    note: 'Percentage of gross revenue returned to buyers.',
  },
  Margin: {
    title: 'Profit Margin',
    formula: '(Net Profit / Sales Revenue) × 100',
    note: 'Efficiency metric indicating revenue percentage converted to net profit.',
  },
  ROI: {
    title: 'Return on Investment (ROI)',
    formula: '(Net Profit / Total COGS) × 100',
    note: 'Return generated on total capital invested in sold inventory.',
  },

  // Detail Sub-row Tooltips
  'Refunded amount': {
    title: 'Gross Refunded Amount',
    formula: 'Principal Charges + Sales Tax + Shipping Charges Refunded',
    note: 'Total customer charge reversed during order return processing.',
  },
  'Value of returned items': {
    title: 'Base Price of Returned Items',
    formula: 'Sum(Product Charges / Principal Portion of Refunds)',
    note: 'Base selling price of returned items excluding tax and shipping.',
  },
  'Promotion adjustment': {
    title: 'Refund Promotional Adjustment',
    formula: 'Sum(Reversed Promotional Credits on Returns)',
    note: 'Clawed-back or adjusted buyer promotional discounts on returned items.',
  },
  'Refund commission': {
    title: 'Refund Administration Fee',
    formula: 'Min(20% of Referral Fee, $5.00 Cap per item)',
    note: 'Amazon administrative fee charged for handling customer returns.',
  },
  'Refunded referral fee': {
    title: 'Referral Fee Credit',
    formula: 'Original Selling Referral Fee Reversal',
    note: 'Selling fee credited back to your seller account upon customer return.',
  },
  'FBA per unit fulfillment fee': {
    title: 'FBA Fulfillment Fee',
    formula: 'Sum(Per-Unit FBA Pick & Pack Fees)',
    note: 'Fee charged by Amazon for picking, packing, and shipping items.',
  },
  'Selling fees': {
    title: 'Selling Fees / Referral Fee',
    formula: 'Sum(Amazon Category Commission Fees)',
    note: 'Percentage-based referral fee charged by Amazon for listing on marketplace.',
  },
  'Referral fee / Selling fees': {
    title: 'Referral Fee / Selling Fees',
    formula: 'Sum(Amazon Category Commission Fees)',
    note: 'Percentage-based referral fee charged by Amazon for listing on marketplace.',
  },
  'Sales tax collection fee': {
    title: 'Marketplace Tax Collection Fee',
    formula: 'Sum(Sales Tax Administrative Collection Fees)',
    note: 'Fee charged by Amazon for processing and remitting buyer sales tax.',
  },
  'Reversal reimbursement': {
    title: 'Reversal Reimbursements',
    formula: 'Sum(Amazon Reimbursement Reversals)',
    note: 'Adjustments made by Amazon to previously issued reimbursement amounts.',
  },
  'Other Amazon adjustments': {
    title: 'Other Amazon Adjustments',
    formula: 'Sum(Miscellaneous Amazon Fees & Credits)',
    note: 'Ad-hoc charges or credits applied to your account by Amazon.',
  },
}

// ============================================================
// TOOLTIP UI COMPONENT
// ============================================================

const RowTooltip: React.FC<{ tooltipKey?: string }> = ({ tooltipKey }) => {
  if (!tooltipKey) return null
  const info = STAT_TOOLTIPS[tooltipKey]
  if (!info) return null

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-60 p-2.5 bg-gray-900 text-white text-left text-xs rounded-md shadow-2xl opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999] font-normal normal-case">
      <div className="font-semibold text-white mb-1 border-b border-gray-700 pb-1">
        {info.title}
      </div>
      <div className="text-gray-300 font-mono text-[10px] bg-gray-800 p-1 rounded mb-1 border border-gray-700/50 break-words">
        {info.formula}
      </div>
      {info.note && (
        <div className="text-gray-400 text-[10px] leading-tight">
          {info.note}
        </div>
      )}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
    </div>
  )
}

const Section: React.FC<{
  title: string
  value: React.ReactNode
  children?: React.ReactNode
  defaultOpen?: boolean
  tooltipKey?: string
}> = ({ title, value, children, defaultOpen = false, tooltipKey }) => {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <div className="border-b border-border last:border-0">
      <div className="group/row relative">
        <button
          onClick={() => setOpen((previous) => !previous)}
          className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-surface-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg
              className={cn(
                'w-4 h-4 text-text-muted transition-transform',
                open && 'rotate-90'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>

            <span className="text-sm font-medium text-text-primary">
              {title}
            </span>
          </div>

          <span className="text-sm font-semibold text-text-primary">
            {value}
          </span>
        </button>
        <RowTooltip tooltipKey={tooltipKey || title} />
      </div>

      {open && children && (
        <div className="pl-6 pr-1 pb-3 space-y-2">{children}</div>
      )}
    </div>
  )
}

const Row: React.FC<{
  label: string
  value: React.ReactNode
  className?: string
  tooltipKey?: string
}> = ({ label, value, className, tooltipKey }) => (
  <div className="group/row relative flex items-center justify-between py-1.5 text-sm">
    <span className="text-text-secondary">{label}</span>

    <span className={cn('font-medium', className)}>{value}</span>

    <RowTooltip tooltipKey={tooltipKey || label} />
  </div>
)

export const StatModal: React.FC<Props> = ({
  isOpen,
  onClose,
  data,
  currency,
  anchorRect,
}) => {
  const panelRef = useRef<HTMLDivElement>(null)

  // ==========================================================
  // OUTSIDE CLICK
  // ==========================================================

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleClick = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClick)

    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  if (!isOpen || !data) {
    return null
  }

  const MODAL_WIDTH = 420
  const GAP = 12
  const viewportH = window.innerHeight
  const approxModalHeight = 560

  // ==========================================================
  // POSITION
  // ==========================================================

  let left = anchorRect ? anchorRect.left - MODAL_WIDTH - GAP : 20

  if (left < 8) {
    left = 8
  }

  if (left + MODAL_WIDTH > window.innerWidth - 8) {
    left = window.innerWidth - MODAL_WIDTH - 8
  }

  let top = 80

  if (anchorRect) {
    const anchorCenter = anchorRect.top + anchorRect.height / 2
    top = anchorCenter - approxModalHeight / 2
  }

  top = Math.max(16, Math.min(top, viewportH - approxModalHeight - 16))

  // ==========================================================
  // FORMAT
  // ==========================================================

  const fmt = (item: StatDetailItem) => {
    const value = Number(item.value || 0)

    if (item.currency) {
      return formatCurrency(value, currency)
    }

    if (item.percentage) {
      return formatPercentage(value)
    }

    if (item.integer) {
      return formatNumber(value, 0)
    }

    return formatNumber(value)
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      ref={panelRef}
      className="fixed z-50 w-[420px] max-h-[80vh] overflow-y-auto bg-surface border border-border rounded-lg shadow-2xl"
      style={{
        left: `${left}px`,
        top: `${top}px`,
      }}
    >
      {/* HEADER */}

      <div className="sticky top-0 bg-surface z-20 border-b border-border flex items-center justify-between px-4 py-3">
        <div className="font-semibold flex items-center gap-2 text-base">
          {data.flag && <span>{data.flag}</span>}
          <span>{data.title}</span>
        </div>

        <button
          onClick={onClose}
          className="p-1 hover:bg-surface-secondary rounded transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* BODY */}

      <div className="px-3 py-2">
        {data.sections.map((section) => (
          <Section
            key={section.title}
            title={section.title}
            tooltipKey={section.tooltipKey || section.title}
            value={
              section.currency
                ? formatCurrency(Number(section.value || 0), currency)
                : formatNumber(Number(section.value || 0))
            }
            defaultOpen={section.defaultOpen}
          >
            {section.children?.map((child) => (
              <Row
                key={child.label}
                label={child.label}
                tooltipKey={child.tooltipKey || child.label}
                value={fmt(child)}
              />
            ))}
          </Section>
        ))}

        {data.summaryRows && data.summaryRows.length > 0 && (
          <>
            <div className="border-t-2 border-border my-2" />

            {data.summaryRows.map((row) => (
              <Row
                key={row.label}
                label={row.label}
                tooltipKey={row.tooltipKey || row.label}
                value={fmt(row)}
                className={cn(
                  row.label === 'Net profit' &&
                    'font-semibold text-primary-600',
                  row.label === 'Gross profit' && 'font-semibold'
                )}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}