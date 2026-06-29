'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Select } from '@/design-system/inputs'
import { ProfitSummary } from '@/services/api/profit.api'
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'

/**
 * ChartSummaryTable Component
 * 
 * Displays financial metrics summary for the chart screen
 * Shows all key metrics in a vertical list format
 */

export interface ChartSummaryTableProps {
  data?: ProfitSummary
  isLoading?: boolean
  error?: any
  currency?: string
  startDate?: string
  endDate?: string
  onPeriodChange?: (period: 'current' | 'last-12-months') => void
  className?: string
}

/**
 * Format date range for display
 */
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

  // Calculate additional metrics
  // Note: These calculations should match the backend logic
  // For now, using simplified calculations based on available data
  const estimatedPayout = data
    ? (data.salesRevenue || 0) - (data.totalFees || 0) - (data.totalRefunds || 0) - (data.totalExpenses || 0)
    : 0

  // Real ACOS = Advertising cost / Sales * 100
  // For now, using totalExpenses as proxy for advertising cost
  const realACOS = data && data.salesRevenue > 0
    ? ((data.totalExpenses || 0) / data.salesRevenue) * 100
    : 0

  const refundsPercent = data && data.salesRevenue > 0
    ? ((data.totalRefunds || 0) / data.salesRevenue) * 100
    : 0

  const sellableReturnsPercent = 57.93 // TODO: Calculate from actual returns data

  const roi = data && data.totalCOGS > 0
    ? ((data.netProfit || 0) / data.totalCOGS) * 100
    : 0

  // Estimate sessions (TODO: Get from actual analytics)
  // Rough estimate: 50 sessions per order
  const estimatedSessions = data ? (data.orderCount || 0) * 50 : 0
  const units = data?.orderCount || 0 // Using orderCount as proxy for units
  const unitSessionPercentage = estimatedSessions > 0
    ? (units / estimatedSessions) * 100
    : 0

  const metrics = [
    { label: 'Sales', value: data?.salesRevenue || 0, format: 'currency' },
    { label: 'Units', value: units, format: 'number' },
    { label: 'Promo', value: 0, format: 'currency' }, // TODO: Get from actual data
    { label: 'Advertising cost', value: -(data?.totalExpenses || 0), format: 'currency' },
    { label: 'Shipping costs', value: 0, format: 'currency' }, // TODO: Get from actual data
    { label: 'Giftwrap', value: 0, format: 'currency' },
    { label: 'Refund cost', value: -(data?.totalRefunds || 0), format: 'currency' },
    { label: 'Amazon fees', value: -(data?.totalFees || 0), format: 'currency' },
    { label: 'Cost of goods', value: -(data?.totalCOGS || 0), format: 'currency' },
    { label: 'Gross profit', value: data?.grossProfit || 0, format: 'currency' },
    { label: 'Indirect expenses', value: 0, format: 'currency' },
    { label: 'Net profit', value: data?.netProfit || 0, format: 'currency' },
    { label: 'Estimated payout', value: estimatedPayout, format: 'currency' },
    { label: 'Real ACOS', value: realACOS, format: 'percentage' },
    { label: '% Refunds', value: refundsPercent, format: 'percentage' },
    { label: 'Sellable returns', value: sellableReturnsPercent, format: 'percentage' },
    { label: 'Margin', value: data?.netMargin || 0, format: 'percentage' },
    { label: 'ROI', value: roi, format: 'percentage' },
    { label: 'Active subscriptions (SnS)', value: 0, format: 'number' },
    { label: 'Sessions', value: estimatedSessions, format: 'number' },
    { label: 'Unit session percentage', value: unitSessionPercentage, format: 'percentage' },
  ]

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
