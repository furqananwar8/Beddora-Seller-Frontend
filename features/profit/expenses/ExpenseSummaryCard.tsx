"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { ExpenseSummary } from '@/services/api/expenses.api'
import { formatCurrency } from '@/utils/format'
import { Spinner } from '@/design-system/loaders'

/**
 * ExpenseSummaryCard component
 * Displays total expenses and breakdown by type/category
 */
export interface ExpenseSummaryCardProps {
  summary?: ExpenseSummary
  currency?: string
  isLoading?: boolean
  error?: any
  className?: string
}

export const ExpenseSummaryCard: React.FC<ExpenseSummaryCardProps> = ({
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
          <CardTitle>Expense Summary</CardTitle>
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
          <CardTitle>Expense Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">Failed to load expenses</div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Expense Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-secondary-500 text-sm">No expense data</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Expense Summary</CardTitle>
        <p className="text-sm text-secondary-500 mt-1">
          {summary.count} expenses
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Total Expenses</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalAmount, currency)}
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Fixed</div>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(summary.byType.fixed, currency)}
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Recurring</div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(summary.byType.recurring, currency)}
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">One-time</div>
            <div className="text-xl font-bold text-purple-600">
              {formatCurrency(summary.byType['one-time'], currency)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

