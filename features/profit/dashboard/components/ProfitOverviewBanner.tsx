'use client'

import React from 'react'

import { formatCurrency } from '@/utils/format'

interface ProfitOverviewBannerProps {
  title: React.ReactNode
  totalRevenue: number
  /** Omit to hide the Net Profit figure. */
  totalProfit?: number
  totalOrders: number
  totalUnits: number
  /** Formats the amounts. Defaults to currency formatting. */
  formatAmount?: (value: number) => string
  /** Rendered under the figures, e.g. a channel share bar. */
  children?: React.ReactNode
}

/** "Profit Overview" banner above the period tiles, in the primary colour of the tile headers. */
export const ProfitOverviewBanner: React.FC<ProfitOverviewBannerProps> = ({
  title,
  totalRevenue,
  totalProfit,
  totalOrders,
  totalUnits,
  formatAmount = (value: number) => formatCurrency(value),
  children,
}) => (
  <div className="bg-primary-600 p-6 text-text-inverse mb-6">
    <h2 className="text-lg font-semibold mb-4">{title}</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <div className="text-3xl font-bold">{formatAmount(totalRevenue)}</div>
        <div className="text-secondary-300 text-sm">Total Revenue</div>
      </div>
      {totalProfit !== undefined && (
      <div>
        <div className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
          {formatAmount(totalProfit)}
        </div>
        <div className="text-secondary-300 text-sm">Total Net Profit</div>
      </div>
      )}
      <div>
        <div className="text-3xl font-bold">{totalOrders}</div>
        <div className="text-secondary-300 text-sm">Total Orders</div>
      </div>
      <div>
        <div className="text-3xl font-bold">{totalUnits}</div>
        <div className="text-secondary-300 text-sm">Total Units</div>
      </div>
    </div>
    {children}
  </div>
)

export default ProfitOverviewBanner
