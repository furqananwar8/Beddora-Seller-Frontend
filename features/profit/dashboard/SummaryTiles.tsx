'use client'

import React, { useState } from 'react'
import { formatCurrency, formatNumber, formatPercentage } from "@/utils"

interface SummaryTilesProps {
    period: any
    setSelectedPeriodForDetails: (val: any) => void
}

/* ──────────────────────────────────────────────────────
 * Tooltip Information Map for Tile Fields
 * ────────────────────────────────────────────────────── */

const TILE_TOOLTIPS = {
    sales: {
        title: 'Sales Revenue',
        formula: 'Sum(Product Principal Charges for Shipments)',
        note: 'Gross order revenue excluding sales taxes and promotional discounts.',
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
        formula: 'Sales Revenue - Amazon Fees - Net Refund Cost',
        note: 'Estimated net bank disbursement from Amazon for the period.',
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
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-gray-900 text-white text-left text-xs rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 font-normal normal-case">
            <div className="font-semibold text-white mb-1 border-b border-gray-700 pb-1">
                {info.title}
            </div>
            <div className="text-gray-300 font-mono text-[10px] bg-gray-800 p-1 rounded mb-1 border border-gray-700/50 break-words">
                {info.formula}
            </div>
            <div className="text-gray-400 text-[10px] leading-tight">
                {info.note}
            </div>
            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
    )
}

const SummaryTiles = ({ period, setSelectedPeriodForDetails }: SummaryTilesProps) => {
    const margin = period.margin ?? 0

    return (
        <div className="space-y-3 flex-1 flex flex-col">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-text-primary break-words">{period.label}</h3>
                <p className="text-xs text-text-muted break-words">{period.dateRange}</p>
            </div>

            {/* Sales */}
            <div className="group relative cursor-pointer">
                <div className="text-xs text-text-muted inline-flex items-center gap-1">
                    Sales
                </div>
                <div className="text-2xl font-bold text-text-primary break-words">
                    {formatCurrency(period.salesRevenue)}
                </div>
                <div className={`text-xs mt-1 break-words ${margin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    {margin >= 0 ? '+' : ''}{formatPercentage(margin)}
                </div>
                <FieldTooltip fieldKey="sales" />
            </div>

            {/* Orders / Refunds */}
            <div className="grid grid-cols-2 gap-3 text-xs min-w-0">
                <div className="min-w-0 group relative cursor-pointer">
                    <div className="text-text-muted break-words">Orders / Units</div>
                    <div className="font-semibold text-text-primary break-words">
                        {period.salesCount} / {period.ordersUnitCount}
                    </div>
                    <FieldTooltip fieldKey="ordersUnits" />
                </div>
                <div className="min-w-0 group relative cursor-pointer">
                    <div className="text-text-muted break-words">Refunds</div>
                    <div className="font-semibold text-text-primary break-words">
                        {formatNumber(period.totalRefundsCount ?? 0)}
                    </div>
                    <FieldTooltip fieldKey="refunds" />
                </div>
            </div>

            {/* Adv cost / Est payout */}
            <div className="grid grid-cols-2 gap-3 text-xs min-w-0">
                <div className="min-w-0 group relative cursor-pointer">
                    <div className="text-text-muted break-words">Adv. cost</div>
                    <div className="font-semibold text-danger-600 break-words">
                        -{formatCurrency(period.advertisingCost)}
                    </div>
                    <FieldTooltip fieldKey="advCost" />
                </div>
                <div className="min-w-0 group relative cursor-pointer">
                    <div className="text-text-muted break-words">Est. payout</div>
                    <div className="font-semibold text-text-primary break-words">
                        {formatCurrency(period.estimatedPayout)}
                    </div>
                    <FieldTooltip fieldKey="estPayout" />
                </div>
            </div>

            {/* Net profit */}
            <div className="pt-3 border-t border-border group relative cursor-pointer">
                <div className="text-text-muted text-xs break-words">Net profit</div>
                <div className="flex items-center justify-between min-w-0">
                    <div className={`text-xl font-bold break-words ${period.netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {formatCurrency(period.netProfit)}
                    </div>
                    <div className={`text-sm break-words ${margin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {margin >= 0 ? '+' : ''}{formatPercentage(margin)}
                    </div>
                </div>
                <FieldTooltip fieldKey="netProfit" />
            </div>

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
                    More
                </button>
            </div>
        </div>
    )
}

export default SummaryTiles