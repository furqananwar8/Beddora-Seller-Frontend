// components/ProfitSummaryCard.tsx
import React from 'react'
import { PeriodSummary, ProfitSummary } from '@/services/api/profit.api'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

const formatPercent = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`

const periodLabel: any = {
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  '7DAYSAGO': '7 Days Ago',
  '14DAYSAGO': '14 Days Ago',
  '30DAYSAGO': '30 Days Ago',
}

const SkeletonTile = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-20 mb-4" />
    <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-24" />
  </div>
)

const MetricRow = ({
  label,
  value,
  valueClass = '',
}: {
  label: string
  value: string
  valueClass?: string
}) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-sm text-gray-500">{label}</span>
    <span className={`text-sm font-medium ${valueClass}`}>{value}</span>
  </div>
)

const PeriodTileCard = ({ tile }: { tile: PeriodSummary }) => {
  const isProfit = tile.netProfit >= 0
  console.log({tile})

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {periodLabel[tile.period]}
        </h3>
        <span
          className={`text-xs font-bold px-2 py-1 rounded-full ${
            isProfit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {formatPercent(tile.netMargin)}
        </span>
      </div>

      <div className="mb-4">
        <div className="text-2xl font-bold text-gray-900">
          {formatCurrency(tile.salesRevenue)}
        </div>
        <div className="text-xs text-gray-500">Revenue</div>
      </div>

      <div className="space-y-1 border-t border-gray-100 pt-3">
        <MetricRow
          label="Net Profit"
          value={formatCurrency(tile.netProfit)}
          valueClass={isProfit ? 'text-green-600' : 'text-red-600'}
        />
        <MetricRow label="Orders" value={tile.salesCount.toString()} />
        <MetricRow label="Units" value={tile.ordersUnitCount.toString()} />
        <MetricRow label="Fees" value={formatCurrency(tile.totalFees)} valueClass="text-gray-600" />
        <MetricRow label="COGS" value={formatCurrency(tile.totalCOGS)} valueClass="text-gray-600" />
        <MetricRow
          label="Expenses"
          value={formatCurrency(tile.totalExpenses)}
          valueClass="text-gray-600"
        />
        {tile.totalRefunds > 0 && (
          <MetricRow
            label="Refunds"
            value={formatCurrency(tile.totalRefunds)}
            valueClass="text-orange-600"
          />
        )}
      </div>
    </div>
  )
}

export interface ProfitSummaryCardProps {
  data: any
  periodData: any
  periodLoading: any
  periodError: any
  isLoading: boolean
  error: string | null
}

export const ProfitSummaryCard = ({
  data,
  isLoading,
  error,
}: any) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <SkeletonTile key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-medium">Failed to load profit summary</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const { summary, periods } = data

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Profit Overview (Last 30 Days)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-3xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            <div className="text-blue-100 text-sm">Total Revenue</div>
          </div>
          <div>
            <div
              className={`text-3xl font-bold ${
                summary.totalProfit >= 0 ? 'text-green-300' : 'text-red-300'
              }`}
            >
              {formatCurrency(summary.totalProfit)}
            </div>
            <div className="text-blue-100 text-sm">Total Net Profit</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{summary.totalOrders}</div>
            <div className="text-blue-100 text-sm">Total Orders</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{summary.totalUnits}</div>
            <div className="text-blue-100 text-sm">Total Units</div>
          </div>
        </div>
      </div>

      {/* Period Tiles */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Period Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {periods.map((tile: any) => (
            <PeriodTileCard key={tile.period} tile={tile} />
          ))}
        </div>
      </div>
    </div>
  )
}