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
        isExpandable && onClick && 'cursor-pointer hover:bg-surface-secondary',
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

      <span className={cn('text-sm', isBold && 'font-semibold')}>
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
        'flex items-center justify-between py-2 text-sm text-text-muted',
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

export const TileDetailsModal: React.FC<TileDetailsModalProps> = ({
  isOpen,
  onClose,
  periodLabel,
  dateRange,
  data,
  currency = 'CAD',
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (!data) return null

  const toggle = (key: string) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // ============================================================
  // DATA
  // ============================================================

  const amazonFees = data.amazonFeeDetails || {}
  const advertising = data.advertisingDetails || {}
  const refunds = data.refundDetails || {}
  const displayCurrency = data.currency || currency

  // ============================================================
  // BASE VALUES
  // ============================================================

  const salesRevenue = Number(data.salesRevenue ?? 0)
  const totalFees = Number(data.totalFees ?? 0)
  const refundCost = Number(data.refundCost ?? 0)
  const totalCOGS = Number(data.totalCOGS ?? 0)
  const totalExpenses = Number(data.totalExpenses ?? 0)
  const advertisingCost = Number(data.advertisingCost ?? 0)
  const totalPromo = Number(data.totalPromo ?? 0)
  const unitsSold = Number(data.ordersUnitCount ?? 0)
  const refundCount = Number(data.totalRefundsCount ?? 0)

  // ============================================================
  // API CALCULATED VALUES
  // ============================================================

  const grossProfit = Number(data.grossProfit ?? 0)
  const estimatedPayout = Number(data.estimatedPayout ?? 0)
  const netProfit = Number(data.netProfit ?? 0)
  const margin = Number(data.margin ?? 0)
  const realACOS = Number(data.realACOS ?? 0)
  const roi = Number(data.roi ?? 0)
  const refundPercentage = Number(data.refundPercentage ?? 0)

  const metrics = [
    {
      key: 'sales',
      label: 'Sales',
      value: formatCurrency(salesRevenue, displayCurrency),
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
      value: formatCurrency(-totalPromo, displayCurrency),
      expandable: false,
    },
    {
      key: 'advertising',
      label: 'Advertising cost',
      value: formatCurrency(-advertisingCost, displayCurrency),
      expandable: true,
    },
    {
      key: 'refund',
      label: 'Refund cost',
      value: formatCurrency(-refundCost, displayCurrency),
      expandable: true,
    },
    {
      key: 'amazon-fees',
      label: 'Amazon fees',
      value: formatCurrency(-totalFees, displayCurrency),
      expandable: true,
    },
    {
      key: 'cogs',
      label: 'Cost of goods',
      value: formatCurrency(-totalCOGS, displayCurrency),
      expandable: false,
    },
    {
      key: 'gross-profit',
      label: 'Gross profit',
      value: formatCurrency(grossProfit, displayCurrency),
      expandable: false,
      bold: true,
    },
    {
      key: 'indirect-expenses',
      label: 'Indirect expenses',
      value: formatCurrency(-totalExpenses, displayCurrency),
      expandable: false,
    },
    {
      key: 'net-profit',
      label: 'Net profit',
      value: formatCurrency(netProfit, displayCurrency),
      expandable: false,
      bold: true,
    },
    {
      key: 'estimated-payout',
      label: 'Estimated payout',
      value: formatCurrency(estimatedPayout, displayCurrency),
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
      value: formatPercentage(refundPercentage),
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
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="px-6 py-4 border-b border-border">
        <div className="text-lg font-semibold">{periodLabel}</div>
        <div className="text-sm text-text-muted mt-1">{dateRange}</div>
      </div>

      <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
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
                  metric.expandable ? () => toggle(metric.key) : undefined
                }
              />

              {/* ADVERTISING DETAILS */}
              {metric.key === 'advertising' && expanded['advertising'] && (
                <div className="border-b border-border">
                  <DetailRow
                    label="Sponsored Products"
                    value={-Number(advertising.sponsoredProducts || 0)}
                    currency={displayCurrency}
                  />
                  <DetailRow
                    label="Sponsored Brands Video"
                    value={-Number(advertising.sponsoredBrandsVideo || 0)}
                    currency={displayCurrency}
                  />
                  <DetailRow
                    label="Sponsored Display"
                    value={-Number(advertising.sponsoredDisplay || 0)}
                    currency={displayCurrency}
                  />
                  <DetailRow
                    label="Sponsored Brands"
                    value={-Number(advertising.sponsoredBrands || 0)}
                    currency={displayCurrency}
                  />
                </div>
              )}

              {/* REFUND DETAILS */}
              {metric.key === 'refund' && expanded['refund'] && (
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
                    label="Promotion adjustment"
                    value={Number(refunds.promotion ?? 0)}
                    currency={displayCurrency}
                  />
                  <DetailRow
                    label="Value of returned items"
                    value={Number(refunds.valueOfReturnedItems ?? 0)}
                    currency={displayCurrency}
                  />
                  <DetailRow
                    label="Refunded referral fee"
                    value={Number(refunds.refundedReferralFee ?? 0)}
                    currency={displayCurrency}
                  />
                  <div className="flex items-center justify-between py-2 text-sm pl-7 text-text-muted">
                    <span>Refund count</span>
                    <span className="text-text-primary">
                      {formatNumber(refundCount, 0)}
                    </span>
                  </div>
                </div>
              )}

              {/* AMAZON FEE DETAILS */}
              
              {metric.key === 'amazon-fees' && expanded['amazon-fees'] && (
                <div className="border-b border-border">
                  {Object.entries({
                    'FBA storage fee': amazonFees.fbaStorageFee,
                    'FBA per unit fulfilment fee': amazonFees.fbaPerUnitFulfillmentFee,
                    'Referral fee': amazonFees.referralFee,
                    'Deal participation fee': amazonFees.dealParticipationFee,
                    'Deal performance fee': amazonFees.dealPerformanceFee,
                    'FBA disposal fee': amazonFees.fbaDisposalFee,
                    'Sales tax collection fee': amazonFees.salesTaxCollectionFee,
                    'Reversal reimbursement': amazonFees.reversalReimbursement,
                    'Shipping chargeback': amazonFees.shippingChargeback,
                    'Warehouse lost': amazonFees.warehouseLost,
                    'Warehouse damage': amazonFees.warehouseDamage,
                    'Refund commission': amazonFees.refundCommission,
                    'Base fee': amazonFees.baseFee,
                    'Tax on fee': amazonFees.taxOnFee,
                    'Other': amazonFees.other,
                  })
                    .filter(([, feeValue]) => Math.abs(Number(feeValue || 0)) > 0)
                    .map(([feeLabel, feeValue]) => (
                      <DetailRow
                        key={feeLabel}
                        label={feeLabel}
                        value={-Number(feeValue || 0)}
                        currency={displayCurrency}
                      />
                    ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </Modal>
  )
}