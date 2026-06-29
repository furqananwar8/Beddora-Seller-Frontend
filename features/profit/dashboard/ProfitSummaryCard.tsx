'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { ProfitSummary } from '@/services/api/profit.api'
import { formatCurrency, formatPercentage } from '@/utils/format'
import { Spinner } from '@/design-system/loaders'

/**
 * ProfitSummaryCard component
 * 
 * Displays key financial metrics in a card layout
 * Shows sales revenue, expenses, gross profit, and net profit
 */
export interface ProfitSummaryCardProps {
  data?: ProfitSummary
  isLoading?: boolean
  error?: any
  className?: string
}

export const ProfitSummaryCard: React.FC<ProfitSummaryCardProps> = ({
  data,
  isLoading,
  error,
  className,
}) => {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Profit Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Profit Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">
            Failed to load profit summary. Please try again.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Profit Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-secondary-500 text-sm">No data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Profit Summary</CardTitle>
        {data.period.startDate && data.period.endDate && (
          <p className="text-sm text-secondary-500 mt-1">
            {new Date(data.period.startDate).toLocaleDateString()} -{' '}
            {new Date(data.period.endDate).toLocaleDateString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sales Revenue */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Sales Revenue</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.salesRevenue)}
            </div>
            <div className="text-xs text-secondary-500 mt-1">{data.orderCount} orders</div>
          </div>

          {/* Total Expenses */}
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Total Expenses</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data.totalExpenses)}
            </div>
            <div className="text-xs text-secondary-500 mt-1">
              Fees: {formatCurrency(data.totalFees)}
            </div>
          </div>

          {/* Gross Profit */}
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Gross Profit</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.grossProfit)}
            </div>
            <div className="text-xs text-secondary-500 mt-1">
              Margin: {formatPercentage(data.grossMargin)}
            </div>
          </div>

          {/* Net Profit */}
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Net Profit</div>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(data.netProfit)}
            </div>
            <div className="text-xs text-secondary-500 mt-1">
              Margin: {formatPercentage(data.netMargin)}
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="mt-6 pt-6 border-t border-secondary-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-secondary-600">COGS</div>
              <div className="font-semibold text-secondary-900">
                {formatCurrency(data.totalCOGS)}
              </div>
            </div>
            <div>
              <div className="text-secondary-600">Refunds</div>
              <div className="font-semibold text-secondary-900">
                {formatCurrency(data.totalRefunds)}
              </div>
            </div>
            <div>
              <div className="text-secondary-600">Gross Margin</div>
              <div className="font-semibold text-secondary-900">
                {formatPercentage(data.grossMargin)}
              </div>
            </div>
            <div>
              <div className="text-secondary-600">Net Margin</div>
              <div className="font-semibold text-secondary-900">
                {formatPercentage(data.netMargin)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

