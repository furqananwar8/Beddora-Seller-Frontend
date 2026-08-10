'use client'

import React, { useState } from 'react'
import { Modal } from '@/design-system/modals'
import {
  formatCurrency,
  formatPercentage,
  formatNumber,
} from '@/utils/format'
import { cn } from '@/utils/cn'

// ============================================================
// TYPES
// ============================================================

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

interface TileDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  periodLabel: string
  dateRange: string
  data: any | undefined
  currency?: string
}

// ============================================================
// METRIC ROW
// ============================================================

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
        'flex items-center justify-between py-2.5 border-b border-border',
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

        <span>{label}</span>
      </div>

      <span
        className={cn(
          'text-sm',
          isBold && 'font-semibold'
        )}
      >
        {value}
      </span>
    </div>
  )
}

// ============================================================
// DETAIL ROW
// ============================================================

const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
  currency,
  indent = true,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 text-sm',
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

// ============================================================
// TILE DETAILS MODAL
// ============================================================

export const TileDetailsModal: React.FC<
  TileDetailsModalProps
> = ({
  isOpen,
  onClose,
  periodLabel,
  dateRange,
  data,
  currency = 'CAD',
}) => {
  const [expanded, setExpanded] =
    useState<Record<string, boolean>>({})

  if (!data) {
    return null
  }

  const toggle = (key: string) => {
    setExpanded(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // ============================================================
  // DATA
  // ============================================================

  const amazonFees =
    data.amazonFeeDetails || {}

  const advertising =
    data.advertisingDetails || {}

  const refunds =
    data.refundDetails || {}

  // IMPORTANT:
  //
  // The API returns all values already converted into the
  // requested target currency.
  //
  // Prefer the currency returned by the API.
  //
  const displayCurrency =
    data.currency || currency

  // ============================================================
  // BASE VALUES
  // ============================================================
// ============================================================
// BASE VALUES
// ============================================================

const salesRevenue = Number(data.salesRevenue ?? 0)

const totalFees = Number(data.totalFees ?? 0)

const totalRefunds = Number(
  data.totalRefunds ?? 0
)

const refundCost = Number(
  data.refundCost ?? 0
)

const totalCOGS = Number(data.totalCOGS ?? 0)

const totalExpenses = Number(data.totalExpenses ?? 0)

const advertisingCost = Number(
  data.advertisingCost ?? 0
)

const totalPromo = Number(
  data.totalPromo ?? 0
)

const unitsSold = Number(
  data.ordersUnitCount ?? 0
)

const refundCount = Number(
  data.refundCount ??
  data.totalRefundsCount ??
  0
)

// ============================================================
// USE API CALCULATED VALUES
// ============================================================

const grossProfit = Number(
  data.grossProfit ?? 0
)

const grossMargin = Number(
  data.grossMargin ?? 0
)

const netProfit = Number(
  data.netProfit ?? 0
)

const netMargin = Number(
  data.netMargin ?? 0
)

// ============================================================
// DERIVED VALUES
// ============================================================

const estimatedPayout =
  salesRevenue -
  totalFees -
  totalRefunds -
  totalCOGS -
  totalExpenses -
  advertisingCost

const realACOS =
  salesRevenue > 0
    ? (advertisingCost / salesRevenue) * 100
    : 0

const refundsPercent =
  salesRevenue > 0
    ? (totalRefunds / salesRevenue) * 100
    : 0

const sellableReturns = 0

const activeSubscriptions = 0

const sessions = 0

const unitSessionPercentage =
  sessions > 0
    ? (unitsSold / sessions) * 100
    : 0

  // ============================================================
  // METRICS
  // ============================================================

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
      value: formatNumber(
        unitsSold,
        0
      ),
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

    // ==========================================================
    // ADVERTISING
    // ==========================================================

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
        0,
        displayCurrency
      ),
      expandable: false,
    },

    {
      key: 'giftwrap',
      label: 'Giftwrap',
      value: formatCurrency(
        0,
        displayCurrency
      ),
      expandable: false,
    },

    // ==========================================================
    // REFUNDS
    // ==========================================================

    {
      key: 'refund',
      label: 'Refund cost',
      value: formatCurrency(
        -refundCost,
        displayCurrency
      ),
      expandable: true,
    },

    // ==========================================================
    // AMAZON FEES
    // ==========================================================

    {
      key: 'amazon-fees',
      label: 'Amazon fees',
      value: formatCurrency(
        -totalFees,
        displayCurrency
      ),
      expandable: true,
    },

    // ==========================================================
    // COGS
    // ==========================================================

    {
      key: 'cogs',
      label: 'Cost of goods',
      value: formatCurrency(
        -totalCOGS,
        displayCurrency
      ),
      expandable: false,
    },

    // ==========================================================
    // GROSS PROFIT
    // ==========================================================

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

    // ==========================================================
    // INDIRECT EXPENSES
    // ==========================================================

    {
      key: 'indirect-expenses',
      label: 'Indirect expenses',
      value: formatCurrency(
        -totalExpenses,
        displayCurrency
      ),
      expandable: false,
    },

    // ==========================================================
    // NET PROFIT
    // ==========================================================

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

    // ==========================================================
    // ESTIMATED PAYOUT
    // ==========================================================

    {
      key: 'estimated-payout',
      label: 'Estimated payout',
      value: formatCurrency(
        estimatedPayout,
        displayCurrency
      ),
      expandable: false,
    },

    // ==========================================================
    // PERFORMANCE
    // ==========================================================

    {
      key: 'real-acos',
      label: 'Real ACOS',
      value: formatPercentage(
        realACOS
      ),
      expandable: false,
    },

    {
      key: 'refund-percent',
      label: '% Refunds',
      value: formatPercentage(
        refundsPercent
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
      value: formatPercentage(
        netMargin
      ),
      expandable: false,
    },

    {
      key: 'roi',
      label: 'ROI',
      value: formatPercentage(
        grossMargin
      ),
      expandable: false,
    },

    {
      key: 'subscriptions',
      label:
        'Active subscriptions (SnS)',
      value: formatNumber(
        activeSubscriptions,
        0
      ),
      expandable: false,
    },

    {
      key: 'sessions',
      label: 'Sessions',
      value: formatNumber(
        sessions,
        0
      ),
      expandable: true,
    },

    {
      key: 'unit-session',
      label:
        'Unit session percentage',
      value: formatPercentage(
        unitSessionPercentage
      ),
      expandable: false,
    },
  ]

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="px-6 py-4 border-b border-border">
        <div className="text-lg font-semibold">
          {periodLabel}
        </div>

        <div className="text-sm text-text-muted mt-1">
          {dateRange}
        </div>
      </div>

      {/* ======================================================
          METRICS
      ====================================================== */}

      <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
        <div className="space-y-0">
          {metrics.map(metric => (
            <React.Fragment
              key={metric.key}
            >
              <MetricRow
                label={metric.label}
                value={metric.value}
                isExpandable={
                  metric.expandable
                }
                isBold={metric.bold}
                isOpen={
                  !!expanded[metric.key]
                }
                onClick={
                  metric.expandable
                    ? () =>
                        toggle(
                          metric.key
                        )
                    : undefined
                }
              />

              {/* ==================================================
                  ADVERTISING DETAILS
              ================================================== */}

              {metric.key ===
                'advertising' &&
                expanded[
                  'advertising'
                ] && (
                  <div className="border-b border-border">
                    <DetailRow
                      label="Sponsored Products"
                      value={
                        -Number(
                          advertising
                            .sponsoredProducts ||
                            0
                        )
                      }
                      currency={
                        displayCurrency
                      }
                    />

                    <DetailRow
                      label="Sponsored Brands Video"
                      value={
                        -Number(
                          advertising
                            .sponsoredBrandsVideo ||
                            0
                        )
                      }
                      currency={
                        displayCurrency
                      }
                    />

                    <DetailRow
                      label="Sponsored Display"
                      value={
                        -Number(
                          advertising
                            .sponsoredDisplay ||
                            0
                        )
                      }
                      currency={
                        displayCurrency
                      }
                    />

                    <DetailRow
                      label="Sponsored Brands"
                      value={
                        -Number(
                          advertising
                            .sponsoredBrands ||
                            0
                        )
                      }
                      currency={
                        displayCurrency
                      }
                    />
                  </div>
                )}

              {/* ==================================================
                  REFUND DETAILS
              ================================================== */}

              {metric.key === 'refund' &&
                expanded['refund'] && (
                  <div className="border-b border-border">

                    <DetailRow
                      label="Refunded amount"
                      value={-Number(refunds.refundedAmount ?? 0)}
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Refund commission"
                      value={-Number(refunds.refundCommission ?? 0)}
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Promotion"
                      value={-Number(refunds.promotion ?? 0)}
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Value of returned items"
                      value={-Number(refunds.valueOfReturnedItems ?? 0)}
                      currency={displayCurrency}
                    />

                    <DetailRow
                      label="Refunded referral fee"
                      value={Number(refunds.refundedReferralFee ?? 0)}
                      currency={displayCurrency}
                    />

                    <div className="flex items-center justify-between py-2 text-sm">
                      <span className="text-text-muted pl-7">
                        Refund count
                      </span>

                      <span className="text-text-primary">
                        {formatNumber(refundCount, 0)}
                      </span>
                    </div>

                  </div>
              )}

              {/* ==================================================
                  AMAZON FEE DETAILS
              ================================================== */}

              {metric.key ===
                'amazon-fees' &&
                expanded[
                  'amazon-fees'
                ] && (
                  <div className="border-b border-border">
                    <DetailRow
                      label="FBA storage fee"
                      value={
                        -Number(
                          amazonFees
                            .fbaStorageFee ||
                            0
                        )
                      }
                      currency={
                        displayCurrency
                      }
                    />

                    <DetailRow
                      label="FBA per unit fulfilment fee"
                      value={
                        -Number(
                          amazonFees
                            .fbaPerUnitFulfillmentFee ||
                            0
                        )
                      }
                      currency={
                        displayCurrency
                      }
                    />

                    <DetailRow
                      label="Referral fee"
                      value={
                        -Number(
                          amazonFees
                            .referralFee ||
                            0
                        )
                      }
                      currency={
                        displayCurrency
                      }
                    />

                    <DetailRow
                      label="Deal participation fee"
                      value={
                        -Number(
                          amazonFees
                            .dealParticipationFee ||
                            0
                        )
                      }
                      currency={
                        displayCurrency
                      }
                    />

                    <DetailRow
                      label="Deal performance fee"
                      value={
                        -Number(
                          amazonFees
                            .dealPerformanceFee ||
                            0
                        )
                      }
                      currency={
                        displayCurrency
                      }
                    />

                    <DetailRow
                      label="FBA disposal fee"
                      value={
                        -Number(
                          amazonFees
                            .fbaDisposalFee ||
                            0
                        )
                      }
                      currency={
                        displayCurrency
                      }
                    />

                    <DetailRow
                      label="Sales tax collection fee"
                      value={
                        -Number(
                          amazonFees
                            .salesTaxCollectionFee ||
                            0
                        )
                      }
                      currency={
                        displayCurrency
                      }
                    />

                    <DetailRow
                      label="Reversal reimbursement"
                      value={
                        -Number(
                          amazonFees
                            .reversalReimbursement ||
                            0
                        )
                      }
                      currency={
                        displayCurrency
                      }
                    />

                    <DetailRow
                      label="Other"
                      value={
                        -Number(
                          amazonFees
                            .other ||
                            0
                        )
                      }
                      currency={
                        displayCurrency
                      }
                    />
                  </div>
                )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </Modal>
  )
}