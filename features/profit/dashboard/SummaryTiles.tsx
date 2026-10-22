'use client'

import React from 'react'
import { formatCurrency, formatNumber, formatPercentage } from "@/utils"

/** The grid the period tiles sit in: compact cards (220px and up) side by side, as many as fit in a row. */
/**
 * Responsive tile row, from the left: each tile grows from 200px to at most 280px with the screen, as many per row as
 * fit (five on a laptop, wrapping on narrow screens), a small fixed gap apart. Spare width stays on the right instead
 * of stretching tiles.
 */
export const RESPONSIVE_TILE_COLUMNS = 'grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,280px))] justify-start'
export const SUMMARY_TILE_GRID = `${RESPONSIVE_TILE_COLUMNS} mb-6`

/** Optional cells of the tile's metric grid. */
export type SummaryTileMetric = 'refunds' | 'secondary'

interface SummaryTilesProps {
    period: any
    setSelectedPeriodForDetails: (val: any) => void
    /** Overrides the % shown under Sales (defaults to the legacy margin value). `null` hides it. */
    salesChange?: number | null
    /** Rendered under the Sales figure, e.g. a channel share bar. */
    salesFooter?: React.ReactNode
    /** Replaces the "Est. payout" cell. */
    secondaryMetric?: { label: string; value: React.ReactNode }
    /** Replaces the formatted "Adv. cost" value (e.g. "n/a"). */
    advertisingDisplay?: React.ReactNode
    /** Replaces the margin text next to Net profit. */
    marginDisplay?: React.ReactNode
    /** Label of the breakdown link. Defaults to "More". */
    moreLabel?: string
    /** Hover tooltips carry Amazon formulas; turn them off for other data sources. Defaults to on. */
    showTooltips?: boolean
    /** Formats the amounts. Defaults to currency formatting. */
    formatAmount?: (value: number) => string
    /** Shows the Net profit / margin row. Defaults to on. */
    showNetProfit?: boolean
    /** Cells left out of the metric grid; the remaining ones close up. */
    hiddenMetrics?: SummaryTileMetric[]
}

/* ──────────────────────────────────────────────────────
 * Tooltip Information Map for Tile Fields
 * ────────────────────────────────────────────────────── */

const TILE_TOOLTIPS = {
    sales: {
        title: 'Sales Revenue',
        formula: 'Sum(Product Principal Charges for Shipments)',
        note: 'Gross product order revenue excluding sales taxes and promotional rebates.',
    },
    ordersUnits: {
        title: 'Orders / Units Sold',
        formula: 'Total Shipped Orders / Total Shipped Units',
        note: 'Units count extracted from shipment contexts.',
    },
    refunds: {
        title: 'Refund Units Count',
        formula: 'Sum(Quantity Refunded across Refund Events)',
        note: 'Total return transactions processed during the period.',
    },
    advCost: {
        title: 'Advertising Cost',
        formula: 'SP Spend + SB Spend + SD Spend',
        note: 'Total ad cost incurred across active Amazon advertising campaigns.',
    },
    estPayout: {
        title: 'Estimated Payout',
        formula: 'Sales Revenue - Amazon Fees - Product Refund Amount + Reimbursements',
        note: 'Estimated net settlement deposit to your bank account by Amazon.',
    },
    netProfit: {
        title: 'Net Profit',
        formula: 'Sales Revenue - Promo - Ads - Amazon Fees - COGS - Refund Cost',
        note: 'Final profit remaining after all direct, indirect, and operational costs.',
    },
}

/* ──────────────────────────────────────────────────────
 * Tooltip UI Component
 * ────────────────────────────────────────────────────── */

const FieldTooltip: React.FC<{ fieldKey: keyof typeof TILE_TOOLTIPS }> = ({ fieldKey }) => {
    const info = TILE_TOOLTIPS[fieldKey]
    if (!info) return null

    return (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-60 p-2.5 bg-gray-900 text-white text-left text-xs rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999] font-normal normal-case">
            <div className="font-semibold text-white mb-1 border-b border-gray-700 pb-1">
                {info.title}
            </div>
            <div className="text-gray-300 font-mono text-[10px] bg-gray-800 p-1 rounded mb-1 border border-gray-700/50 break-words">
                {info.formula}
            </div>
            <div className="text-gray-400 text-[10px] leading-tight">
                {info.note}
            </div>
            {/* Top Arrow pointing upward */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
        </div>
    )
}

const NoTooltip: React.FC<{ fieldKey: keyof typeof TILE_TOOLTIPS }> = () => null

const SummaryTiles = ({
    period,
    setSelectedPeriodForDetails,
    salesChange,
    salesFooter,
    secondaryMetric,
    advertisingDisplay,
    marginDisplay,
    moreLabel = 'More',
    showTooltips = true,
    formatAmount = (value: number) => formatCurrency(value),
    showNetProfit = true,
    hiddenMetrics = [],
}: SummaryTilesProps) => {
    const margin = period.margin ?? 0
    const salesPct = salesChange === undefined ? margin : salesChange
    const Tooltip = showTooltips ? FieldTooltip : NoTooltip
    const isShown = (metric: SummaryTileMetric) => !hiddenMetrics.includes(metric)

    return (
        <div className="space-y-3 flex-1 flex flex-col">
            {/* Header: a primary-coloured band across the top of the card (the tile sits in p-4 card content) */}
            <div className="-mx-4 -mt-4 px-4 py-3 bg-primary-600">
                <h3 className="text-base font-semibold text-text-inverse break-words">{period.label}</h3>
                <p className="text-xs text-secondary-300 break-words">{period.dateRange}</p>
            </div>

            {/* Sales */}
            <div className="group relative cursor-pointer">
                <div className="text-xs text-text-muted inline-flex items-center gap-1">
                    Sales
                </div>
                <div className="text-2xl font-bold text-text-primary break-words">
                    {formatAmount(period.salesRevenue)}
                </div>
                {salesPct !== null && (
                    <div className={`text-xs mt-1 break-words ${salesPct >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {salesPct >= 0 ? '+' : ''}{formatPercentage(salesPct)}
                    </div>
                )}
                {salesFooter}
                <Tooltip fieldKey="sales" />
            </div>

            {/* Orders / Refunds / Adv cost / Est payout */}
            <div className="grid grid-cols-2 gap-3 text-xs min-w-0">
                <div className="min-w-0 group relative cursor-pointer">
                    <div className="text-text-muted break-words">Orders / Units</div>
                    <div className="font-semibold text-text-primary break-words">
                        {period.salesCount} / {period.ordersUnitCount}
                    </div>
                    <Tooltip fieldKey="ordersUnits" />
                </div>
                {isShown('refunds') && (
                <div className="min-w-0 group relative cursor-pointer">
                    <div className="text-text-muted break-words">Refunds</div>
                    <div className="font-semibold text-text-primary break-words">
                        {formatNumber(period.totalRefundsCount ?? 0)}
                    </div>
                    <Tooltip fieldKey="refunds" />
                </div>
                )}
                <div className="min-w-0 group relative cursor-pointer">
                    <div className="text-text-muted break-words">Adv. cost</div>
                    <div className="font-semibold text-danger-600 break-words">
                        {advertisingDisplay ?? <>-{formatAmount(period.advertisingCost)}</>}
                    </div>
                    <Tooltip fieldKey="advCost" />
                </div>
                {isShown('secondary') && (
                <div className="min-w-0 group relative cursor-pointer">
                    <div className="text-text-muted break-words">{secondaryMetric?.label ?? 'Est. payout'}</div>
                    <div className="font-semibold text-text-primary break-words">
                        {secondaryMetric ? secondaryMetric.value : formatAmount(period.estimatedPayout)}
                    </div>
                    <Tooltip fieldKey="estPayout" />
                </div>
                )}
            </div>

            {/* Net profit */}
            {showNetProfit && (
            <div className="pt-3 border-t border-border group relative cursor-pointer">
                <div className="text-text-muted text-xs break-words">Net profit</div>
                <div className="flex items-center justify-between min-w-0">
                    <div className={`text-xl font-bold break-words ${period.netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {formatAmount(period.netProfit)}
                    </div>
                    <div className={`text-sm break-words ${margin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {marginDisplay ?? <>{margin >= 0 ? '+' : ''}{formatPercentage(margin)}</>}
                    </div>
                </div>
                <Tooltip fieldKey="netProfit" />
            </div>
            )}

            {/* Spacer pushes "More" to bottom */}
            <div className="flex-1" />

            {/* More button */}
            <div className="text-center">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPeriodForDetails(period.id)
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
                >
                    {moreLabel}
                </button>
            </div>
        </div>
    )
}

export default SummaryTiles