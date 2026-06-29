'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/design-system/cards'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { Spinner } from '@/design-system/loaders'
import { PLResponse, PLMetricRow } from '@/services/api/profit.api'
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/format'

export interface PLTableProps {
  data?: PLResponse
  isLoading?: boolean
  error?: any
  currency?: string
}

/**
 * P&L Table Component
 * 
 * Displays financial metrics in a table format with:
 * - Parameter/Date column on the left
 * - Period columns (current month-to-date, past 12 months, Total)
 * - Expandable rows for certain metrics
 */
export const PLTable: React.FC<PLTableProps> = ({
  data,
  isLoading,
  error,
  currency = 'CAD',
}) => {
  // Default expanded rows: Sales, Units, and Advertising cost
  const [expandedRows, setExpandedRows] = useState<Set<string>>(
    new Set(['Sales', 'Units', 'Advertising cost'])
  )

  const toggleRow = (parameter: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(parameter)) {
      newExpanded.delete(parameter)
    } else {
      newExpanded.add(parameter)
    }
    setExpandedRows(newExpanded)
  }

  const formatValue = (parameter: string, value: number, parentParameter?: string): string => {
    // Parameters that should be formatted as currency
    const currencyParams = [
      'Sales',
      'Promo',
      'Advertising cost',
      'Shipping costs',
      'Giftwrap',
      'Refund cost',
      'Amazon fees',
      'Cost of goods',
      'Gross profit',
      'Indirect expenses',
      'Net profit',
      'Estimated payout',
      // Child parameters that are currency
      'Organic',
      'Sponsored Products (same day)',
      'Sponsored Display (same day)',
      'Direct sales',
      'Subscription sales (est.)',
      'Sponsored Products',
      'Sponsored Brands Video',
      'Sponsored Brands',
      'Sponsored Display',
      'FBA shipping chargeback',
      'Value of returned items',
      'Refunded referral fee',
      'Promotion',
      'Ship Promotion',
      'DigitalServicesFee',
      'Refunded shipping',
      'Refund commission',
      'Unsellable products costs',
      'Refunded amount',
      // Amazon fees children
      'FBA per unit fulfilment fee',
      'Referral fee',
      'FBA storage fee',
      'FBA removal fee',
      'Vine fee',
      'Vine enrollment fee',
      'Coupon redemption fee',
      'FBA disposal fee',
      'Subscription',
      'Lightning deal fee',
      'Digital services fee',
      'Coupon performance fee rollup',
      'Deal participation fee rollup',
      'Sales tax collection fee',
      'Coupon participation fee rollup',
      'Coupon performance fee',
      'Deal performance fee rollup',
      'Coupon participation fee',
      'Compensated clawback',
      'Long term storage fee',
      'Deal participation fee',
      'Deal performance fee',
      'Micro Deposit',
      'Micro deposit (failed)',
      'Warehouse damage',
      'Warehouse lost',
      'Adjustment FBA per unit fulfillment fee',
      'Reversal reimbursement',
      // Cost of goods children
      'Cost of goods sold',
      'Disposal of sellable products',
      'Lost/damaged by Amazon',
      'Missing returns',
    ]

    // Parameters that should be formatted as percentage
    const percentageParams = [
      'Real ACOS',
      '% Refunds',
      'Sellable returns',
      'Margin',
      'ROI',
      'Unit session percentage',
    ]

    // If it's a child of Sales, Advertising cost, Shipping costs, Refund cost, Amazon fees, or Cost of goods, format as currency
    if (parentParameter === 'Sales' || parentParameter === 'Advertising cost' || 
        parentParameter === 'Shipping costs' || parentParameter === 'Refund cost' || 
        parentParameter === 'Amazon fees' || parentParameter === 'Cost of goods') {
      if (currencyParams.includes(parameter)) {
        return formatCurrency(value, currency)
      }
    }

    // If it's a child of Units or Sessions, format as number
    if (parentParameter === 'Units' || parentParameter === 'Sessions') {
      return formatNumber(value, 0)
    }

    if (currencyParams.includes(parameter)) {
      return formatCurrency(value, currency)
    } else if (percentageParams.includes(parameter)) {
      return formatPercentage(value)
    } else {
      // Numbers (Units, Refunds, Sessions, Active subscriptions)
      return formatNumber(value, 0)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-danger-600">Failed to load P&L data</div>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.metrics || data.metrics.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-text-muted">No P&L data available</div>
        </CardContent>
      </Card>
    )
  }

  // The periods array from the API should match the order of periods in each metric
  // Each metric.periods array has the same length and order as data.periods

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] max-w-[250px] sticky left-0 bg-surface z-10">
                  Parameter/Date
                </TableHead>
                      {data.periods.map((period, index) => (
                        <TableHead key={`period-${index}`} className="min-w-[120px] text-right whitespace-nowrap">
                          {period}
                        </TableHead>
                      ))}
                <TableHead className="min-w-[120px] text-right font-semibold">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.metrics.map((metric, rowIndex) => {
                const isExpanded = expandedRows.has(metric.parameter)
                const hasValue = metric.periods.some((p) => p.value !== 0) || metric.total !== 0

                return (
                  <React.Fragment key={metric.parameter}>
                    <TableRow
                      className={`hover:bg-surface-secondary cursor-pointer ${!hasValue ? 'opacity-50' : ''}`}
                      onClick={() => metric.isExpandable && toggleRow(metric.parameter)}
                    >
                      <TableCell className="sticky left-0 bg-surface z-10 min-w-[200px] max-w-[250px]">
                        <div className="flex items-center gap-2">
                          {metric.isExpandable && (
                            <svg
                              className={`w-4 h-4 text-text-muted transition-transform flex-shrink-0 ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
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
                          )}
                          <span className="font-medium break-words">{metric.parameter}</span>
                        </div>
                      </TableCell>
                      {data.periods.map((periodLabel, periodIndex) => {
                        const periodValue = metric.periods[periodIndex]?.value || 0
                        return (
                          <TableCell key={`${metric.parameter}-${periodIndex}`} className="text-right whitespace-nowrap">
                            {formatValue(metric.parameter, periodValue)}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-right font-semibold">
                        {formatValue(metric.parameter, metric.total)}
                      </TableCell>
                    </TableRow>
                    {/* Child rows */}
                    {isExpanded && metric.isExpandable && metric.children && metric.children.length > 0 && (
                      <>
                        {metric.children.map((child) => {
                          const childHasValue = child.periods.some((p) => p.value !== 0) || child.total !== 0
                          return (
                            <TableRow
                              key={`${metric.parameter}-${child.parameter}`}
                              className={`bg-surface-secondary hover:bg-surface-tertiary ${!childHasValue ? 'opacity-50' : ''}`}
                            >
                              <TableCell className="sticky left-0 bg-surface-secondary z-10 pl-8 min-w-[200px] max-w-[250px]">
                                <span className="text-sm break-words">{child.parameter}</span>
                              </TableCell>
                              {data.periods.map((periodLabel, periodIndex) => {
                                const periodValue = child.periods[periodIndex]?.value || 0
                                return (
                                  <TableCell
                                    key={`${child.parameter}-${periodIndex}`}
                                    className="text-right whitespace-nowrap text-sm"
                                  >
                                    {formatValue(child.parameter, periodValue, metric.parameter)}
                                  </TableCell>
                                )
                              })}
                              <TableCell className="text-right font-semibold text-sm">
                                {formatValue(child.parameter, child.total, metric.parameter)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
