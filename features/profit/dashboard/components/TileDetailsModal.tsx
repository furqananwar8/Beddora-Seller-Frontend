'use client'

import React from 'react'
import { Modal } from '@/design-system/modals'
import { ProfitSummary } from '@/services/api/profit.api'
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'

interface TileDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  periodLabel: string
  dateRange: string
  data: ProfitSummary | undefined
  currency?: string
}

interface MetricRowProps {
  label: string
  value: string | number
  isExpandable?: boolean
  isBold?: boolean
  onClick?: () => void
}

const MetricRow: React.FC<MetricRowProps> = ({
  label,
  value,
  isExpandable = false,
  isBold = false,
  onClick,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2.5 border-b border-border',
        isExpandable && onClick && 'cursor-pointer hover:bg-surface-secondary',
        isBold && 'font-semibold'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {isExpandable && (
          <span className="text-text-muted text-sm">›</span>
        )}
        <span className="text-sm text-text-primary">{label}</span>
      </div>
      <span className={cn('text-sm', isBold && 'font-semibold')}>{value}</span>
    </div>
  )
}

export const TileDetailsModal: React.FC<TileDetailsModalProps> = ({
  isOpen,
  onClose,
  periodLabel,
  dateRange,
  data,
  currency = 'CAD',
}) => {
  if (!data) return null
  
  // Calculate derived metrics
  const totalCosts = (data.totalExpenses || 0) + (data.totalFees || 0) + (data.totalCOGS || 0)
  const estimatedPayout = (data.salesRevenue || 0) - totalCosts
  const unitsSold = data.orderCount || 0 // Assuming units = orderCount for now
  const promo = 0 // Not in current data structure
  const shippingCosts = 0 // Not in current data structure
  const giftwrap = 0 // Not in current data structure
  const refundCost = -(data.totalRefunds || 0)
  const indirectExpenses = 0 // Not in current data structure
  const realACOS = data.salesRevenue > 0 
    ? ((data.totalExpenses || 0) / data.salesRevenue) * 100 
    : 0
  const refundsPercent = data.salesRevenue > 0
    ? ((data.totalRefunds || 0) / data.salesRevenue) * 100
    : 0
  const sellableReturns = 50.0 // Default value, should come from data
  const activeSubscriptions = 0 // Not in current data structure
  const sessions = 0 // Not in current data structure
  const unitSessionPercentage = sessions > 0 ? (unitsSold / sessions) * 100 : 0

  const metrics = [
    { label: 'Sales', value: formatCurrency(data.salesRevenue, currency), isExpandable: true },
    { label: 'Units', value: formatNumber(unitsSold, 0), isExpandable: true },
    { label: 'Promo', value: formatCurrency(-promo, currency) },
    { label: 'Advertising cost', value: formatCurrency(-(data.totalExpenses || 0), currency), isExpandable: true },
    { label: 'Shipping costs', value: formatCurrency(-shippingCosts, currency), isExpandable: true },
    { label: 'Giftwrap', value: formatCurrency(giftwrap, currency) },
    { label: 'Refund cost', value: formatCurrency(refundCost, currency), isExpandable: true },
    { label: 'Amazon fees', value: formatCurrency(-(data.totalFees || 0), currency), isExpandable: true },
    { label: 'Cost of goods', value: formatCurrency(-(data.totalCOGS || 0), currency), isExpandable: true },
    { label: 'Gross profit', value: formatCurrency(data.grossProfit || 0, currency), isBold: true },
    { label: 'Indirect expenses', value: formatCurrency(indirectExpenses, currency) },
    { label: 'Net profit', value: formatCurrency(data.netProfit || 0, currency), isBold: true },
    { label: 'Estimated payout', value: formatCurrency(estimatedPayout, currency) },
    { label: 'Real ACOS', value: formatPercentage(realACOS) },
    { label: '% Refunds', value: formatPercentage(refundsPercent) },
    { label: 'Sellable returns', value: formatPercentage(sellableReturns) },
    { label: 'Margin', value: formatPercentage(data.netMargin || 0) },
    { label: 'ROI', value: formatPercentage(data.grossMargin || 0) }, // Using grossMargin as ROI approximation
    { label: 'Active subscriptions (SnS)', value: formatNumber(activeSubscriptions, 0) },
    { label: 'Sessions', value: formatNumber(sessions, 0), isExpandable: true },
    { label: 'Unit session percentage', value: formatPercentage(unitSessionPercentage) },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="bg-surface">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{periodLabel}</h2>
              <p className="text-xs text-text-muted mt-0.5">{dateRange}</p>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Metrics List */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-0">
            {metrics.map((metric, index) => (
              <MetricRow
                key={index}
                label={metric.label}
                value={metric.value}
                isExpandable={metric.isExpandable}
                isBold={metric.isBold}
                onClick={metric.isExpandable ? () => {
                  // TODO: Implement expand functionality for drill-down views
                  console.log(`Expand ${metric.label}`)
                } : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
