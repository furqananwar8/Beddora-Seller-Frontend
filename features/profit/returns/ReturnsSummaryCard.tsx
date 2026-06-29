"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { ReturnSummary } from '@/services/api/returns.api'
import { Spinner } from '@/design-system/loaders'
import { formatCurrency, formatNumber } from '@/utils/format'

export interface ReturnsSummaryCardProps {
  summary?: ReturnSummary
  currency?: string
  isLoading?: boolean
  error?: any
  className?: string
}

export const ReturnsSummaryCard: React.FC<ReturnsSummaryCardProps> = ({
  summary,
  currency = 'USD',
  isLoading,
  error,
  className,
}) => {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Returns Summary</CardTitle>
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
          <CardTitle>Returns Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">Failed to load returns summary</div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Returns Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-secondary-500 text-sm">No return data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Returns Summary</CardTitle>
        <p className="text-sm text-secondary-500 mt-1">
          {formatNumber(summary.totalReturnedUnits, 0)} units returned
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Refund Amount</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalRefundAmount, currency)}
            </div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Return Fees</div>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.totalFeeAmount, currency)}
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Sellable Units</div>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(summary.sellableUnits, 0)}
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Lost Units</div>
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(summary.lostUnits, 0)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

