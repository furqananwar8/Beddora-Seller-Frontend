'use client'

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/design-system/cards'
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'
import { formatInTimeZone } from 'date-fns-tz'
import { TIMEZONE } from '../ProfitDashboardScreen'

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

interface MetricRowProps {
  label: string
  value: string | number
  isExpandable?: boolean
  isBold?: boolean
  isOpen?: boolean
  onClick?: () => void
}

interface DetailRowProps {
  label: string
  value: number
  currency: string
  indent?: boolean
}

const MetricRow: React.FC<MetricRowProps> = ({
  label,
  value,
  isExpandable = false,
  isBold = false,
  isOpen = false,
  onClick,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 border-b border-border',
        isExpandable &&
          onClick &&
          'cursor-pointer hover:bg-surface-secondary',
        isBold && 'font-semibold'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5">
        {isExpandable && (
          <span
            className={cn(
              'text-xs transition-transform',
              isOpen && 'rotate-90'
            )}
          >
            ›
          </span>
        )}

        <span className="text-xs">{label}</span>
      </div>

      <span
        className={cn(
          'text-xs',
          isBold && 'font-semibold'
        )}
      >
        {value}
      </span>
    </div>
  )
}

const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
  currency,
  indent = true,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-1.5 text-xs',
        'text-text-muted',
        indent && 'pl-7'
      )}
    >
      <span>{label}</span>

      <span className="text-text-primary">
        {formatCurrency(value, currency)}
      </span>
    </div>
  )
}

const formatDateRangeDisplay = (
  startDate?: string,
  endDate?: string
): string => {
  if (!startDate || !endDate) return 'Select date range'



  const startDay = formatInTimeZone(startDate, TIMEZONE, 'd')
  const endDay = formatInTimeZone(endDate, TIMEZONE, 'd')

  const startMonth = formatInTimeZone(startDate, TIMEZONE, 'MMMM')
  const endMonth = formatInTimeZone(endDate, TIMEZONE, 'MMMM')

  const startYear = formatInTimeZone(startDate, TIMEZONE, 'yyyy')
  const endYear = formatInTimeZone(endDate, TIMEZONE, 'yyyy')

  // Same exact calendar date
  if (startDate === endDate) {
    return `${startDay} ${startMonth} ${startYear}`
  }

  // Same month and same year
  if (
    startMonth === endMonth &&
    startYear === endYear
  ) {
    return `${startDay} - ${endDay} ${endMonth} ${endYear}`
  }

  // Different months, same year
  if (startYear === endYear) {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`
  }

  // Different years
  return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (key: string) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const displayCurrency = data?.currency || currency

  /*
   * ============================================================
   * BASE VALUES
   * ============================================================
   */

  const salesRevenue = Number(data?.salesRevenue ?? data?.sales ?? 0)

  const unitsSold = Number(
    data?.unitsSold ??
      data?.ordersUnitCount ??
      data?.units ??
      0
  )

  const totalPromo = Number(
    data?.totalPromo ??
      data?.promo ??
      0
  )

  const advertisingCost = Number(
    data?.advertisingCost ?? 0
  )

  const shippingCosts = Number(
    data?.shippingCosts ?? 0
  )

  const giftwrap = Number(
    data?.giftwrap ?? 0
  )

  const refundCost = Number(
    data?.refundCost ?? 0
  )

  const totalFees = Number(
    data?.totalFees ??
      data?.amazonFees ??
      0
  )

  const totalCOGS = Number(
    data?.totalCOGS ??
      data?.costOfGoods ??
      0
  )

  const totalExpenses = Number(
    data?.totalExpenses ??
      data?.indirectExpenses ??
      0
  )

  const grossProfit = Number(
    data?.grossProfit ?? 0
  )

  const estimatedPayout = Number(
    data?.estimatedPayout ?? 0
  )

  const netProfit = Number(
    data?.netProfit ?? 0
  )

  const realACOS = Number(
    data?.realACOS ?? 0
  )

  const refundPercentage = Number(
    data?.refundPercentage ??
      data?.refundsPercent ??
      0
  )

  const margin = Number(
    data?.margin ?? 0
  )

  const roi = Number(
    data?.roi ?? 0
  )

  const activeSubscriptions = Number(
    data?.activeSubscriptions ?? 0
  )

  const sessions = Number(
    data?.sessions ?? 0
  )

  const unitSessionPercentage = Number(
    data?.unitSessionPercentage ??
      (sessions > 0
        ? (unitsSold / sessions) * 100
        : 0)
  )

  const sellableReturns = Number(
    data?.sellableReturns ?? 0
  )

  const refundCount = Number(
    data?.totalRefundsCount ??
      data?.refundCount ??
      0
  )

  /*
   * ============================================================
   * DETAIL DATA
   * ============================================================
   */

  const advertising =
    data?.advertisingDetails || {}

  const refunds =
    data?.refundDetails || {}

  const amazonFees =
    data?.amazonFeeDetails || {}

  /*
   * ============================================================
   * METRICS
   * Same structure as TileDetailsModal
   * ============================================================
   */

  const metrics = [
    {
      key: 'sales',
      label: 'Sales',
      value: formatCurrency(
        salesRevenue,
        displayCurrency
      ),
      expandable: false,
    },

    {
      key: 'units',
      label: 'Units',
      value: formatNumber(unitsSold, 0),
      expandable: false,
    },

    {
      key: 'promo',
      label: 'Promo',
      value: formatCurrency(
        -totalPromo,
        displayCurrency
      ),
      expandable: false,
    },

    {
      key: 'advertising',
      label: 'Advertising cost',
      value: formatCurrency(
        -advertisingCost,
        displayCurrency
      ),
      expandable: true,
    },

    {
      key: 'shipping',
      label: 'Shipping costs',
      value: formatCurrency(
        -shippingCosts,
        displayCurrency
      ),
      expandable: false,
    },

    {
      key: 'giftwrap',
      label: 'Giftwrap',
      value: formatCurrency(
        -giftwrap,
        displayCurrency
      ),
      expandable: false,
    },

    {
      key: 'refund',
      label: 'Refund cost',
      value: formatCurrency(
        -refundCost,
        displayCurrency
      ),
      expandable: true,
    },

    {
      key: 'amazon-fees',
      label: 'Amazon fees',
      value: formatCurrency(
        -totalFees,
        displayCurrency
      ),
      expandable: true,
    },

    {
      key: 'cogs',
      label: 'Cost of goods',
      value: formatCurrency(
        -totalCOGS,
        displayCurrency
      ),
      expandable: false,
    },

    {
      key: 'gross-profit',
      label: 'Gross profit',
      value: formatCurrency(
        grossProfit,
        displayCurrency
      ),
      expandable: false,
      bold: true,
    },

    {
      key: 'indirect-expenses',
      label: 'Indirect expenses',
      value: formatCurrency(
        -totalExpenses,
        displayCurrency
      ),
      expandable: false,
    },

    {
      key: 'net-profit',
      label: 'Net profit',
      value: formatCurrency(
        netProfit,
        displayCurrency
      ),
      expandable: false,
      bold: true,
    },

    {
      key: 'estimated-payout',
      label: 'Estimated payout',
      value: formatCurrency(
        estimatedPayout,
        displayCurrency
      ),
      expandable: false,
    },

    {
      key: 'real-acos',
      label: 'Real ACOS',
      value: formatPercentage(realACOS),
      expandable: false,
    },

    {
      key: 'refund-percent',
      label: '% Refunds',
      value: formatPercentage(
        refundPercentage
      ),
      expandable: false,
    },

    {
      key: 'sellable-returns',
      label: 'Sellable returns',
      value: formatPercentage(
        sellableReturns
      ),
      expandable: false,
    },

    {
      key: 'margin',
      label: 'Margin',
      value: formatPercentage(margin),
      expandable: false,
    },

    {
      key: 'roi',
      label: 'ROI',
      value: formatPercentage(roi),
      expandable: false,
    },

    {
      key: 'subscriptions',
      label: 'Active subscriptions (SnS)',
      value: formatNumber(
        activeSubscriptions,
        0
      ),
      expandable: false,
    },

    {
      key: 'sessions',
      label: 'Sessions',
      value: formatNumber(sessions, 0),
      expandable: true,
    },

    {
      key: 'unit-session',
      label: 'Unit session percentage',
      value: formatPercentage(
        unitSessionPercentage
      ),
      expandable: false,
    },
  ]

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (isLoading) {
    return (
      <Card
        className={cn(
          'h-full flex flex-col',
          className
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Summary
          </CardTitle>
        </CardHeader>

        <CardContent className="py-2 px-4">
          <div className="space-y-1">
            {Array.from({ length: 10 }).map(
              (_, i) => (
                <div
                  key={i}
                  className="h-4 bg-surface-secondary rounded animate-pulse"
                />
              )
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  /*
   * ============================================================
   * ERROR
   * ============================================================
   */

  if (error) {
    return (
      <Card
        className={cn(
          'h-full flex flex-col',
          className
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Summary
          </CardTitle>
        </CardHeader>

        <CardContent className="py-2 px-4">
          <div className="text-xs text-danger-600">
            Failed to load summary data
          </div>
        </CardContent>
      </Card>
    )
  }

  /*
   * ============================================================
   * EMPTY STATE
   * ============================================================
   */

  if (!data) {
    return (
      <Card
        className={cn(
          'h-full flex flex-col',
          className
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Summary
          </CardTitle>
        </CardHeader>

        <CardContent className="flex items-center justify-center py-12">
          <div className="text-xs text-text-muted">
            No summary data available
          </div>
        </CardContent>
      </Card>
    )
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <Card
      className={cn(
        'h-full flex flex-col',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Summary
          </CardTitle>

          {(startDate && endDate) && (
            <span className="text-xs text-text-muted">
              {formatDateRangeDisplay(
                startDate,
                endDate
              )}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 overflow-y-auto py-2 px-4">
        <div className="space-y-0">

          {metrics.map((metric) => (
            <React.Fragment key={metric.key}>

              <MetricRow
                label={metric.label}
                value={metric.value}
                isExpandable={metric.expandable}
                isBold={metric.bold}
                isOpen={!!expanded[metric.key]}
                onClick={
                  metric.expandable
                    ? () => toggle(metric.key)
                    : undefined
                }
              />

              {/* ==================================================
                  ADVERTISING DETAILS
              ================================================== */}

              {metric.key === 'advertising' &&
                expanded.advertising && (
                  <div className="border-b border-border">

                    <DetailRow
                      label="Sponsored Products"
                      value={
                        -Number(
                          advertising.sponsoredProducts ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Sponsored Brands Video"
                      value={
                        -Number(
                          advertising.sponsoredBrandsVideo ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Sponsored Display"
                      value={
                        -Number(
                          advertising.sponsoredDisplay ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Sponsored Brands"
                      value={
                        -Number(
                          advertising.sponsoredBrands ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                  </div>
                )}

              {/* ==================================================
                  REFUND DETAILS
              ================================================== */}

              {metric.key === 'refund' &&
                expanded.refund && (
                  <div className="border-b border-border">

                    <DetailRow
                      label="Refunded amount"
                      value={
                        -Number(
                          refunds.refundedAmount ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Refund commission"
                      value={
                        -Number(
                          refunds.refundCommission ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Promotion"
                      value={
                        -Number(
                          refunds.promotion ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Value of returned items"
                      value={
                        -Number(
                          refunds.valueOfReturnedItems ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Refunded referral fee"
                      value={
                        Number(
                          refunds.refundedReferralFee ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <div className="flex items-center justify-between py-1.5 text-xs">
                      <span className="text-text-muted pl-7">
                        Refund count
                      </span>

                      <span className="text-text-primary">
                        {formatNumber(
                          refundCount,
                          0
                        )}
                      </span>
                    </div>

                  </div>
                )}

              {/* ==================================================
                  AMAZON FEE DETAILS
              ================================================== */}

              {metric.key === 'amazon-fees' &&
                expanded['amazon-fees'] && (
                  <div className="border-b border-border">

                    <DetailRow
                      label="FBA storage fee"
                      value={
                        -Number(
                          amazonFees.fbaStorageFee ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="FBA per unit fulfilment fee"
                      value={
                        -Number(
                          amazonFees.fbaPerUnitFulfillmentFee ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Referral fee"
                      value={
                        -Number(
                          amazonFees.referralFee ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Deal participation fee"
                      value={
                        -Number(
                          amazonFees.dealParticipationFee ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Deal performance fee"
                      value={
                        -Number(
                          amazonFees.dealPerformanceFee ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="FBA disposal fee"
                      value={
                        -Number(
                          amazonFees.fbaDisposalFee ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Sales tax collection fee"
                      value={
                        -Number(
                          amazonFees.salesTaxCollectionFee ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Reversal reimbursement"
                      value={
                        -Number(
                          amazonFees.reversalReimbursement ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Other"
                      value={
                        -Number(
                          amazonFees.other ?? 0
                        )
                      }
                      currency={displayCurrency}
                    />

                  </div>
                )}

            </React.Fragment>
          ))}

        </div>
      </CardContent>
    </Card>
  )
}