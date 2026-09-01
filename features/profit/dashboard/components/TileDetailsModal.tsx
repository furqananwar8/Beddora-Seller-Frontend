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
  metricKey?: string
  onClick?: () => void
}

interface DetailRowProps {
  label: string
  value: number
  currency: string
  indent?: boolean
  tooltipKey?: string
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
// TOOLTIP DICTIONARY (ACCURATE API FORMULAS)
// ============================================================

const MODAL_TOOLTIPS: Record<
  string,
  { title: string; formula: string; note?: string }
> = {
  sales: {
    title: 'Sales Revenue',
    formula: 'Sum(Product Principal Charges for Shipments)',
    note: 'Gross product order revenue excluding sales taxes and promotional rebates.',
  },
  units: {
    title: 'Units Sold',
    formula: 'Sum(Quantity Shipped across Shipment Events)',
    note: 'Authoritative unit count shipped to customers during the selected period.',
  },
  promo: {
    title: 'Promotional Rebates',
    formula: 'Sum(Order Discounts & Promotion Credits)',
    note: 'Buyer discounts and promotional rebates issued on sales orders.',
  },
  advertising: {
    title: 'Advertising Spend',
    formula: 'SP Spend + SB Spend + SB Video + SD Spend',
    note: 'Total ad spend incurred across Amazon Sponsored Ads campaigns.',
  },
  refund: {
    title: 'Net Refund Cost',
    formula: '(Refunded Amount + Tax) + Promo - Refunded Referral Fee + Refund Commission',
    note: 'Total net financial impact resulting from customer returns and adjustments.',
  },
  'amazon-fees': {
    title: 'Amazon Fees',
    formula: 'FBA Fulfillment + Referral Fee + Storage + Admin Fees + Fee Taxes',
    note: 'Sum of all Amazon service, referral, storage, and fulfillment deductions.',
  },
  cogs: {
    title: 'Cost of Goods Sold (COGS)',
    formula: 'Units Sold × Unit COGS Rate',
    note: 'Inventory product cost calculated using your configured unit COGS rates.',
  },
  'gross-profit': {
    title: 'Gross Profit',
    formula: 'Sales Revenue - Promo - Ads - Amazon Fees - COGS',
    note: 'Direct profit generated before deducting indirect overhead expenses.',
  },
  'indirect-expenses': {
    title: 'Indirect Expenses',
    formula: 'Sum(Off-Amazon Operating Costs & Overheads)',
    note: 'Fixed and recurring business expenses configured for the period.',
  },
  'net-profit': {
    title: 'Net Profit',
    formula: 'Gross Profit - Indirect Expenses',
    note: 'Final bottom-line profit remaining after all direct and indirect expenses.',
  },
  'estimated-payout': {
    title: 'Estimated Bank Payout',
    formula: 'Sales Revenue - Promo Rebates - Amazon Fees - Refund Cost',
    note: 'Estimated net bank disbursement from Amazon settlement releases.',
  },
  'real-acos': {
    title: 'Real ACOS',
    formula: '(Advertising Cost / Sales Revenue) × 100',
    note: 'True advertising cost of sales relative to overall gross revenue.',
  },
  'refund-percent': {
    title: 'Refund Percentage',
    formula: '(Refunded Units / Units Sold) × 100',
    note: 'Percentage of shipped units returned by buyers.',
  },
  margin: {
    title: 'Profit Margin',
    formula: '(Net Profit / Sales Revenue) × 100',
    note: 'Efficiency metric indicating revenue percentage converted to net profit.',
  },
  roi: {
    title: 'Return on Investment (ROI)',
    formula: '(Net Profit / Total COGS) × 100',
    note: 'Return generated on total capital invested in sold inventory.',
  },

  // Detail Sub-row Tooltips
  'Sponsored Products': {
    title: 'Sponsored Products Ad Spend',
    formula: 'Sum(Cost from SP Campaigns)',
    note: 'Cost generated from keyword and product-targeted SP ads.',
  },
  'Sponsored Brands Video': {
    title: 'Sponsored Brands Video Spend',
    formula: 'Sum(Cost from SB Video Campaigns)',
    note: 'Cost generated from video-based SB search placements.',
  },
  'Sponsored Display': {
    title: 'Sponsored Display Spend',
    formula: 'Sum(Cost from SD Campaigns)',
    note: 'Cost from display placements on and off Amazon product pages.',
  },
  'Sponsored Brands': {
    title: 'Sponsored Brands Spend',
    formula: 'Sum(Cost from Standard SB Headline Ads)',
    note: 'Cost from brand headline banner campaigns in search results.',
  },
  'Refunded amount': {
    title: 'Gross Refunded Amount',
    formula: 'Principal Charges + Sales Tax + Shipping Charges Refunded',
    note: 'Total customer charge reversed during order return processing.',
  },
  'Value of returned items': {
    title: 'Base Price of Returned Items',
    formula: 'Sum(Product Charges / Principal Portion of Refunds)',
    note: 'Base selling price of returned items excluding tax and shipping.',
  },
  'Promotion adjustment': {
    title: 'Refund Promotional Adjustment',
    formula: 'Sum(Reversed Promotional Credits on Returns)',
    note: 'Clawed-back or adjusted buyer promotional discounts on returned items.',
  },
  'Refund commission': {
    title: 'Refund Administration Fee',
    formula: 'Min(20% of Referral Fee, $5.00 Cap per item)',
    note: 'Amazon administrative fee charged for handling customer returns.',
  },
  'Refunded referral fee': {
    title: 'Referral Fee Credit',
    formula: 'Original Selling Referral Fee Reversal',
    note: 'Selling fee credited back to your seller account upon customer return.',
  },
}

// ============================================================
// TOOLTIP UI COMPONENT
// ============================================================

const RowTooltip: React.FC<{ tooltipKey?: string }> = ({ tooltipKey }) => {
  if (!tooltipKey) return null
  const info = MODAL_TOOLTIPS[tooltipKey]
  if (!info) return null

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 p-2.5 bg-gray-900 text-white text-left text-xs rounded-md shadow-2xl opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999] font-normal normal-case">
      <div className="font-semibold text-white mb-1 border-b border-gray-700 pb-1">
        {info.title}
      </div>
      <div className="text-gray-300 font-mono text-[10px] bg-gray-800 p-1 rounded mb-1 border border-gray-700/50 break-words">
        {info.formula}
      </div>
      {info.note && (
        <div className="text-gray-400 text-[10px] leading-tight">
          {info.note}
        </div>
      )}
      {/* Top Arrow pointing upward */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
    </div>
  )
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
  metricKey,
  onClick,
}) => {
  return (
    <div
      className={cn(
        'group/row relative flex items-center justify-between py-2.5 border-b border-border',
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

      <RowTooltip tooltipKey={metricKey} />
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
  tooltipKey,
}) => {
  return (
    <div
      className={cn(
        'group/row relative flex items-center justify-between py-2 text-sm text-text-muted',
        indent && 'pl-7'
      )}
    >
      <span>{label}</span>
      <span className="text-text-primary">
        {formatCurrency(value, currency)}
      </span>
      <RowTooltip tooltipKey={tooltipKey || label} />
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

  const amazonFees = data.amazonFeeDetails || {}
  const advertising = data.advertisingDetails || {}
  const refunds = data.refundDetails || {}
  const displayCurrency = data.currency || currency

  const salesRevenue = Number(data.salesRevenue ?? 0)
  const totalFees = Number(data.totalFees ?? 0)
  const refundCost = Number(data.refundCost ?? 0)
  const totalCOGS = Number(data.totalCOGS ?? 0)
  const totalExpenses = Number(data.totalExpenses ?? 0)
  const advertisingCost = Number(data.advertisingCost ?? 0)
  const totalPromo = Number(data.totalPromo ?? 0)
  const unitsSold = Number(data.ordersUnitCount ?? 0)
  const refundCount = Number(data.totalRefundsCount ?? 0)

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
      <div className="px-6 py-4 border-b border-border sticky top-0 bg-surface z-20">
        <div className="text-lg font-semibold">{periodLabel}</div>
        <div className="text-sm text-text-muted mt-1">{dateRange}</div>
      </div>

      <div className="px-6 py-4 max-h-[70vh] overflow-y-auto relative">
        <div className="space-y-0">
          {metrics.map((metric) => (
            <React.Fragment key={metric.key}>
              <MetricRow
                label={metric.label}
                value={metric.value}
                isExpandable={metric.expandable}
                isBold={metric.bold}
                isOpen={!!expanded[metric.key]}
                metricKey={metric.key}
                onClick={
                  metric.expandable ? () => toggle(metric.key) : undefined
                }
              />

              {/* ADVERTISING DETAILS */}
              {metric.key === 'advertising' && expanded['advertising'] && (
                <div className="border-b border-border">
                  {Object.entries({
                    'Sponsored Products': advertising.sponsoredProducts,
                    'Sponsored Brands Video': advertising.sponsoredBrandsVideo,
                    'Sponsored Display': advertising.sponsoredDisplay,
                    'Sponsored Brands': advertising.sponsoredBrands,
                  })
                    .filter(([, adVal]) => Math.abs(Number(adVal || 0)) > 0)
                    .map(([adLabel, adVal]) => (
                      <DetailRow
                        key={adLabel}
                        label={adLabel}
                        value={-Number(adVal || 0)}
                        currency={displayCurrency}
                        tooltipKey={adLabel}
                      />
                    ))}
                </div>
              )}

              {/* REFUND DETAILS */}
              {metric.key === 'refund' && expanded['refund'] && (
                <div className="border-b border-border">
                  {Math.abs(Number(refunds.refundedAmount || 0)) > 0 && (
                    <DetailRow
                      label="Refunded amount"
                      value={-Number(refunds.refundedAmount ?? 0)}
                      currency={displayCurrency}
                      tooltipKey="Refunded amount"
                    />
                  )}

                  {Math.abs(Number(refunds.valueOfReturnedItems || 0)) > 0 && (
                    <DetailRow
                      label="Value of returned items"
                      value={Number(refunds.valueOfReturnedItems ?? 0)}
                      currency={displayCurrency}
                      tooltipKey="Value of returned items"
                    />
                  )}

                  {Math.abs(Number(refunds.promotion || 0)) > 0 && (
                    <DetailRow
                      label="Promotion adjustment"
                      value={Number(refunds.promotion ?? 0)}
                      currency={displayCurrency}
                      tooltipKey="Promotion adjustment"
                    />
                  )}

                  {Math.abs(Number(refunds.refundCommission || 0)) > 0 && (
                    <DetailRow
                      label="Refund commission"
                      value={-Number(refunds.refundCommission ?? 0)}
                      currency={displayCurrency}
                      tooltipKey="Refund commission"
                    />
                  )}

                  {Math.abs(Number(refunds.refundedReferralFee || 0)) > 0 && (
                    <DetailRow
                      label="Refunded referral fee"
                      value={Number(refunds.refundedReferralFee ?? 0)}
                      currency={displayCurrency}
                      tooltipKey="Refunded referral fee"
                    />
                  )}

                  {refundCount > 0 && (
                    <div className="flex items-center justify-between py-2 text-sm pl-7 text-text-muted">
                      <span>Refund count</span>
                      <span className="text-text-primary">
                        {formatNumber(refundCount, 0)}
                      </span>
                    </div>
                  )}
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