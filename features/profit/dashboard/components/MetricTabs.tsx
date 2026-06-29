'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'
import { cn } from '@/utils/cn'

/**
 * MetricTabs Component
 * 
 * Reusable component for switching between different metrics in Trends screen
 * 
 * @example
 * <MetricTabs
 *   value="sales"
 *   onChange={(metric) => setMetric(metric)}
 * />
 */

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
  | 'other'

export interface MetricTabsProps {
  value: TrendMetric
  onChange: (metric: TrendMetric) => void
  className?: string
}

const METRIC_LABELS: Record<TrendMetric, string> = {
  sales: 'Sales',
  units: 'Units',
  orders: 'Orders',
  promo: 'Promo',
  advertisingCost: 'Advertising cost',
  refunds: 'Refunds',
  refundCost: 'Refund cost',
  refundsPercent: '% Refunds',
  sellableReturns: 'Sellable returns',
  amazonFees: 'Amazon fees',
  estimatedPayout: 'Estimated payout',
  costOfGoods: 'Cost of goods',
  grossProfit: 'Gross profit',
  indirectExpenses: 'Indirect expenses',
  netProfit: 'Net profit',
  margin: 'Margin',
  other: 'Other',
}

export const MetricTabs: React.FC<MetricTabsProps> = ({ value, onChange, className }) => {
  const metrics: TrendMetric[] = [
    'sales',
    'units',
    'orders',
    'promo',
    'advertisingCost',
    'refunds',
    'refundCost',
    'refundsPercent',
    'sellableReturns',
    'amazonFees',
    'estimatedPayout',
    'costOfGoods',
    'grossProfit',
    'indirectExpenses',
    'netProfit',
    'margin',
    'other',
  ]

  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto pb-2', className)}>
      {metrics.map((metric) => (
        <Button
          key={metric}
          variant={value === metric ? 'primary' : 'ghost'}
          onClick={() => onChange(metric)}
          size="sm"
          className={cn(
            'whitespace-nowrap',
            value === metric && 'bg-primary-600 text-white hover:bg-primary-700'
          )}
        >
          {METRIC_LABELS[metric]}
        </Button>
      ))}
    </div>
  )
}
