'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Select } from '@/design-system/inputs'
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'

export interface ChartSummaryTableProps {
  data?: any
  isLoading?: boolean
  error?: any
  currency?: string
  startDate?: string
  endDate?: string
  onPeriodChange?: (period: 'current' | 'last-12-months') => void
  className?: string
}

const formatDateRangeDisplay = (startDate?: string, endDate?: string): string => {
  if (!startDate || !endDate) return 'Select date range'
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (startDate === endDate) {
    return start.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  
  return `${start.getDate()}-${end.getDate()} ${end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
}

export const ChartSummaryTable: React.FC<ChartSummaryTableProps> = ({
  data,
  isLoading,
  error,
  currency = 'CAD',
  startDate,
  endDate,
  onPeriodChange,
  className,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'last-12-months'>('current')

  const handlePeriodChange = (value: string) => {
    const period = value as 'current' | 'last-12-months'
    setSelectedPeriod(period)
    onPeriodChange?.(period)
  }

  // All metrics come from backend summary — no frontend calculations needed
  const metrics = data ? [
    { label: 'Sales', value: data.salesRevenue, format: 'currency' },
    { label: 'Units', value: data.unitsSold, format: 'number' },
    { label: 'Promo', value: data.promo, format: 'currency' },
    { label: 'Advertising cost', value: -data.advertisingCost, format: 'currency' },
    { label: 'Shipping costs', value: -data.shippingCosts, format: 'currency' },
    { label: 'Giftwrap', value: -data.giftwrap, format: 'currency' },
    { label: 'Refund cost', value: -data.refundCost, format: 'currency' },
    { label: 'Amazon fees', value: -data.amazonFees, format: 'currency' },
    { label: 'Cost of goods', value: -data.costOfGoods, format: 'currency' },
    { label: 'Gross profit', value: data.grossProfit, format: 'currency' },
    { label: 'Indirect expenses', value: -data.indirectExpenses, format: 'currency' },
    { label: 'Net profit', value: data.netProfit, format: 'currency' },
    { label: 'Estimated payout', value: data.estimatedPayout, format: 'currency' },
    { label: 'Real ACOS', value: data.realACOS, format: 'percentage' },
    { label: '% Refunds', value: data.refundsPercent, format: 'percentage' },
    { label: 'Sellable returns', value: data.sellableReturns, format: 'percentage' },
    { label: 'Margin', value: data.margin, format: 'percentage' },
    { label: 'ROI', value: data.roi, format: 'percentage' },
    { label: 'Active subscriptions (SnS)', value: data.activeSubscriptions, format: 'number' },
    { label: 'Sessions', value: data.sessions, format: 'number' },
    { label: 'Unit session percentage', value: data.unitSessionPercentage, format: 'percentage' },
  ] : []

  const formatValue = (value: number, format: string): string => {
    switch (format) {
      case 'currency':
        return formatCurrency(value, currency)
      case 'percentage':
        return formatPercentage(value)
      case 'number':
        return formatNumber(value, 0)
      default:
        return String(value)
    }
  }

  const getValueColor = (value: number, format: string): string => {
    if (format === 'currency' || format === 'percentage') {
      if (value < 0) return 'text-danger-600'
      if (value > 0 && format === 'currency') return 'text-success-600'
    }
    return 'text-text-primary'
  }

  if (isLoading) {
    return (
      <Card className={cn('h-full flex flex-col', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="space-y-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-4 bg-surface-secondary rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('h-full flex flex-col', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="text-xs text-danger-600">Failed to load summary data</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Summary</CardTitle>
          <div className="min-w-[160px]">
            <Select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              options={[
                { value: 'current', label: formatDateRangeDisplay(startDate, endDate) },
                { value: 'last-12-months', label: 'Last 12 months' },
              ]}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 overflow-y-auto py-2 px-4">
        <div className="space-y-0.5">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between py-1 border-b border-border last:border-0">
              <span className="text-xs text-text-muted">{metric.label}</span>
              <span className={cn('text-xs font-medium', getValueColor(metric.value, metric.format))}>
                {formatValue(metric.value, metric.format)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}