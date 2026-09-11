'use client'

import React, { useState } from 'react'
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
import {
  PLResponse,
  PLMetricRow,
} from '@/services/api/profit.api'
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from '@/utils/format'

export interface PLTableProps {
  data?: PLResponse
  isLoading?: boolean
  error?: any
  currency?: string
}

/**
 * P&L Table
 */
export const PLTable: React.FC<PLTableProps> = ({
  data,
  isLoading,
  error,
  currency = 'CAD',
}) => {
  /**
   * Default expanded rows.
   */
  const [expandedRows, setExpandedRows] = useState<Set<string>>(
    new Set([
      'Sales',
      'Units',
      'Advertising cost',
      'Refund cost',
      'Amazon fees',
      'Costs of goods',
    ])
  )

  const toggleRow = (parameter: string) => {
    setExpandedRows((previous) => {
      const next = new Set(previous)

      if (next.has(parameter)) {
        next.delete(parameter)
      } else {
        next.add(parameter)
      }

      return next
    })
  }

  /**
   * Main currency rows.
   */
  const currencyRows = new Set([
    'Sales',
    'Promo',
    'Advertising cost',
    'Shipping costs',
    'Refund cost',
    'Amazon fees',
    'Costs of goods',
    'Gross profit',
    'Indirect expenses',
    'Net profit',
    'Estimated payout',
  ])

  /**
   * Rows whose values are percentages.
   */
  const percentageRows = new Set([
    'Real ACOS',
    '% Refunds',
    'Sellable returns',
    'Margin',
    'ROI',
    'Unit session percentage',
  ])

  /**
   * Rows whose values are plain numbers/counts.
   */
  const numberRows = new Set([
    'Refunds',
  ])

  /**
   * Parent rows whose children are counts/units.
   */
  const numericParentRows = new Set([
    'Units',
    'Sessions',
  ])

  /**
   * Format metric values.
   */
  const formatValue = (
    parameter: string,
    value: number,
    parentParameter?: string
  ): string => {
    const safeValue = Number.isFinite(Number(value))
      ? Number(value)
      : 0

    if (numberRows.has(parameter)) {
      return formatNumber(safeValue, 0)
    }

    if (
      parentParameter &&
      numericParentRows.has(parentParameter)
    ) {
      return formatNumber(safeValue, 0)
    }

    if (
      percentageRows.has(parameter)
    ) {
      return formatPercentage(safeValue)
    }

    if (
      currencyRows.has(parameter)
    ) {
      return formatCurrency(
        safeValue,
        currency
      )
    }

    if (
      parentParameter &&
      currencyRows.has(parentParameter)
    ) {
      return formatCurrency(
        safeValue,
        currency
      )
    }

    if (
      parameter.toLowerCase().includes('%') ||
      parameter.toLowerCase().includes('margin') ||
      parameter.toLowerCase().includes('roi') ||
      parameter.toLowerCase().includes('acos') ||
      parameter.toLowerCase().includes('percentage')
    ) {
      return formatPercentage(safeValue)
    }

    return formatNumber(
      safeValue,
      0
    )
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
          <div className="text-sm text-danger-600">
            Failed to load P&L data
          </div>
        </CardContent>
      </Card>
    )
  }

  if (
    !data ||
    !data.metrics ||
    data.metrics.length === 0
  ) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-text-muted">
            No P&L data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="
                    min-w-[220px]
                    max-w-[280px]
                    sticky
                    left-0
                    bg-surface
                    z-10
                  "
                >
                  Parameter/Date
                </TableHead>

                {data.periods.map(
                  (period, index) => (
                    <TableHead
                      key={`period-${index}`}
                      className="
                        min-w-[120px]
                        text-right
                        whitespace-nowrap
                      "
                    >
                      {period}
                    </TableHead>
                  )
                )}

                <TableHead
                  className="
                    min-w-[130px]
                    text-right
                    font-semibold
                    whitespace-nowrap
                  "
                >
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.metrics.map(
                (
                  metric: PLMetricRow,
                  rowIndex
                ) => {
                  const isExpanded =
                    expandedRows.has(
                      metric.parameter
                    )

                  const hasValue =
                    metric.periods?.some(
                      (period) =>
                        Number(period.value || 0) !== 0
                    ) ||
                    Number(metric.total || 0) !== 0

                  const hasChildren =
                    Boolean(
                      metric.isExpandable &&
                      metric.children &&
                      metric.children.length > 0
                    )

                  return (
                    <React.Fragment
                      key={`${metric.parameter}-${rowIndex}`}
                    >
                      <TableRow
                        className={`
                          hover:bg-surface-secondary
                          ${
                            metric.isExpandable
                              ? 'cursor-pointer'
                              : ''
                          }
                          ${
                            !hasValue
                              ? 'opacity-50'
                              : ''
                          }
                        `}
                        onClick={() => {
                          if (
                            metric.isExpandable
                          ) {
                            toggleRow(
                              metric.parameter
                            )
                          }
                        }}
                      >
                        <TableCell
                          className="
                            sticky
                            left-0
                            bg-surface
                            z-10
                            min-w-[220px]
                            max-w-[280px]
                          "
                        >
                          <div className="flex items-center gap-2">
                            {metric.isExpandable && (
                              <svg
                                className={`
                                  w-4
                                  h-4
                                  text-text-muted
                                  transition-transform
                                  flex-shrink-0
                                  ${
                                    isExpanded
                                      ? 'rotate-90'
                                      : ''
                                  }
                                `}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            )}

                            <span
                              className="
                                font-medium
                                break-words
                              "
                            >
                              {metric.parameter}
                            </span>
                          </div>
                        </TableCell>

                        {data.periods.map(
                          (
                            periodLabel,
                            periodIndex
                          ) => {
                            const periodValue =
                              Number(
                                metric.periods?.[
                                  periodIndex
                                ]?.value || 0
                              )

                            return (
                              <TableCell
                                key={`
                                  ${metric.parameter}
                                  -${periodIndex}
                                `}
                                className="
                                  text-right
                                  whitespace-nowrap
                                "
                              >
                                {formatValue(
                                  metric.parameter,
                                  periodValue
                                )}
                              </TableCell>
                            )
                          }
                        )}

                        <TableCell
                          className="
                            text-right
                            font-semibold
                            whitespace-nowrap
                          "
                        >
                          {formatValue(
                            metric.parameter,
                            Number(
                              metric.total || 0
                            )
                          )}
                        </TableCell>
                      </TableRow>

                      {isExpanded &&
                        hasChildren &&
                        metric.children!.map(
                          (
                            child,
                            childIndex
                          ) => {
                            const childHasValue =
                              child.periods?.some(
                                (period) =>
                                  Number(
                                    period.value || 0
                                  ) !== 0
                              ) ||
                              Number(
                                child.total || 0
                              ) !== 0

                            return (
                              <TableRow
                                key={`
                                  ${metric.parameter}
                                  -${child.parameter}
                                  -${childIndex}
                                `}
                                className={`
                                  bg-surface-secondary
                                  hover:bg-surface-tertiary
                                  ${
                                    !childHasValue
                                      ? 'opacity-50'
                                      : ''
                                  }
                                `}
                              >
                                <TableCell
                                  className="
                                    sticky
                                    left-0
                                    bg-surface-secondary
                                    z-10
                                    pl-8
                                    min-w-[220px]
                                    max-w-[280px]
                                  "
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="
                                        w-1
                                        h-1
                                        rounded-full
                                        bg-text-muted
                                        flex-shrink-0
                                      "
                                    />

                                    <span
                                      className="
                                        text-sm
                                        break-words
                                        text-text-secondary
                                      "
                                    >
                                      {child.parameter}
                                    </span>
                                  </div>
                                </TableCell>

                                {data.periods.map(
                                  (
                                    periodLabel,
                                    periodIndex
                                  ) => {
                                    const periodValue =
                                      Number(
                                        child
                                          .periods?.[
                                          periodIndex
                                        ]?.value || 0
                                      )

                                    return (
                                      <TableCell
                                        key={`
                                          ${metric.parameter}
                                          -${child.parameter}
                                          -${periodIndex}
                                        `}
                                        className="
                                          text-right
                                          whitespace-nowrap
                                          text-sm
                                        "
                                      >
                                        {formatValue(
                                          child.parameter,
                                          periodValue,
                                          metric.parameter
                                        )}
                                      </TableCell>
                                    )
                                  }
                                )}

                                <TableCell
                                  className="
                                    text-right
                                    font-semibold
                                    text-sm
                                    whitespace-nowrap
                                  "
                                >
                                  {formatValue(
                                    child.parameter,
                                    Number(
                                      child.total || 0
                                    ),
                                    metric.parameter
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          }
                        )}
                    </React.Fragment>
                  )
                }
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default PLTable