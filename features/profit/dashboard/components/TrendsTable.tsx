// ── TrendsTable.tsx ──
'use client'

import React, { useState, useMemo } from 'react'
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts'
import { format, parseISO } from 'date-fns'
import { cn } from '@/utils/cn'
import { Button } from '@/design-system/buttons'

interface DailyValue {
  date: string
  value: number
  changePercent: number
}

interface ProductTrend {
  productId: string
  sku: string
  productTitle: string | null
  productImageUrl: string | null
  dailyValues: DailyValue[]
  chartData: number[]
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface TrendsData {
  products: ProductTrend[]
  dates: string[]
  metric: string
  periodicity: string
  currency: string
  pagination: PaginationMeta
}

export interface TrendsTableProps {
  data: TrendsData | undefined
  isLoading: boolean
  isFetching: boolean
  error?: any
  currency: string
  searchTerm: string
  heatmapEnabled: boolean
  page: number
  onPageChange: (page: number) => void
}

const MONETARY_METRICS = [
  'sales',
  'advertisingCost',
  'refundCost',
  'amazonFees',
  'estimatedPayout',
  'costOfGoods',
  'grossProfit',
  'indirectExpenses',
  'netProfit',
]

const PERCENTAGE_METRICS = ['margin', 'refundsPercent', 'sellableReturns']

const COUNT_METRICS = ['orders', 'units', 'refunds']

const getCurrencyPrefix = (currency: string) => {
  switch (currency) {
    case 'CAD':
      return 'CAD $'
    case 'USD':
      return 'US $'
    case 'EUR':
      return 'EUR €'
    default:
      return `${currency} `
  }
}

const formatMonetary = (val: number, currency: string) => {
  const prefix = getCurrencyPrefix(currency)
  const num = new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(val))
  return val < 0 ? `-${prefix}${num}` : `${prefix}${num}`
}

export const TrendsTable: React.FC<TrendsTableProps> = ({
  data,
  isLoading,
  isFetching,
  currency,
  searchTerm,
  heatmapEnabled,
  page,
  onPageChange,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    x: number
    y: number
    value: DailyValue
    periodicity: string
  } | null>(null)

  const products = data?.products || []
  const dates = data?.dates || []
  const metric = data?.metric || 'sales'
  const periodicity = data?.periodicity || 'day'
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages || 1

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products
    const term = searchTerm.toLowerCase()
    return products.filter(
      (p) =>
        p.sku?.toLowerCase().includes(term) ||
        p.productTitle?.toLowerCase().includes(term)
    )
  }, [products, searchTerm])

  const allValues = useMemo(() => {
    if (!heatmapEnabled) return []
    return filteredProducts.flatMap((p) => p.dailyValues?.map((d) => d.value) || [])
  }, [filteredProducts, heatmapEnabled])

  const getHeatmapClass = (value: number) => {
    if (!heatmapEnabled || value == null || value === 0) return ''

    const vals = allValues.filter((v) => v !== 0 && v != null)
    if (vals.length === 0) return ''

    const sorted = [...vals].sort((a, b) => a - b)
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const range = max - min || 1
    const norm = (value - min) / range

    if (value < 0) return 'bg-gray-300 text-gray-800'
    if (norm >= 0.8) return 'bg-green-500 text-white'
    if (norm >= 0.6) return 'bg-green-300 text-green-900'
    if (norm >= 0.4) return 'bg-orange-300 text-orange-900'
    if (norm >= 0.2) return 'bg-orange-200 text-orange-800'
    return 'bg-gray-100 text-gray-600'
  }

  const formatCellValue = (val: number) => {
    if (val == null) return '-'

    if (PERCENTAGE_METRICS.includes(metric)) {
      return `${val.toFixed(1)}%`
    }

    if (COUNT_METRICS.includes(metric)) {
      return val.toLocaleString()
    }

    if (MONETARY_METRICS.includes(metric)) {
      return formatMonetary(val, currency)
    }

    // Fallback for any new monetary metric not yet categorized
    return formatMonetary(val, currency)
  }

  const formatHeaderDate = (dateStr: string) => {
    if (periodicity === 'month') {
      return format(parseISO(dateStr + '-01'), 'MMM yyyy')
    }
    if (periodicity === 'week') {
      return `W${format(parseISO(dateStr), 'w')}`
    }
    return format(parseISO(dateStr), 'MMM d')
  }

  const skeletonCols = dates.length > 0 ? dates : Array.from({ length: 12 })
  const skeletonRows = Array.from({ length: 10 })

  if (isLoading || isFetching) {
    return (
      <div className="min-h-[520px]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-xs font-medium text-text-muted w-[260px] sticky left-0 bg-surface z-10">Product</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-text-muted w-[90px]">Trend</th>
                {skeletonCols.map((_: any, i: number) => (
                  <th key={i} className="px-2 py-2 text-xs font-medium text-text-muted text-center min-w-[56px]">
                    <div className="h-3 bg-border rounded animate-pulse w-8 mx-auto" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skeletonRows.map((_, ridx) => (
                <tr key={ridx} className="border-b border-border">
                  <td className="px-3 py-3 sticky left-0 bg-surface z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-border rounded animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="h-3 bg-border rounded animate-pulse w-32" />
                        <div className="h-2.5 bg-border rounded animate-pulse w-20" />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><div className="h-8 bg-border rounded animate-pulse w-full" /></td>
                  {skeletonCols.map((_: any, cidx: number) => (
                    <td key={cidx} className="px-2 py-3 text-center"><div className="h-3 bg-border rounded animate-pulse w-10 mx-auto" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[520px]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 text-xs font-medium text-text-muted uppercase tracking-wider w-[260px] sticky left-0 bg-surface z-10">Product</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-text-muted uppercase tracking-wider w-[90px]">Trend</th>
              {dates.map((date: string) => (
                <th key={date} className="px-2 py-2 text-xs font-medium text-text-muted uppercase tracking-wider text-center min-w-[56px]">
                  {formatHeaderDate(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product: ProductTrend, rowIdx: number) => {
              const chartData = product.dailyValues?.map((d) => ({ value: d.value })) || []
              const title = product.productTitle?.trim() || '-'

              return (
                <tr key={product.sku || rowIdx} className="border-b border-border hover:bg-surface-secondary/50 transition-colors">
                  <td className="px-3 py-3 sticky left-0 bg-surface z-10">
                    <div className="flex items-center gap-3">
                      {product.productImageUrl ? (
                        <img src={product.productImageUrl} alt="" className="w-10 h-10 rounded object-cover bg-surface-secondary" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-surface-secondary flex items-center justify-center text-xs text-text-muted">N/A</div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate max-w-[160px]" title={title}>{title}</div>
                        <div className="text-xs text-text-muted">{product.sku}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="w-[80px] h-[32px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                            {chartData.map((_, i) => (
                              <Cell key={i} fill={MONETARY_METRICS.includes(metric) ? '#10b981' : '#f59e0b'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </td>

                  {product.dailyValues?.map((dv: DailyValue, colIdx: number) => (
                    <td
                      key={`${product.sku}-${dv.date}`}
                      className={cn(
                        'px-7 py-5 text-center text-xs tabular-nums cursor-default transition-colors',
                        getHeatmapClass(dv.value)
                      )}
                      onMouseEnter={(e) => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                        setHoveredCell({
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                          value: dv,
                          periodicity,
                        })
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {formatCellValue(dv.value)}
                    </td>
                  ))}
                </tr>
              )
            })}

            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={2 + dates.length} className="text-center py-12 text-text-muted">No products found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Hover Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 bg-surface border border-border rounded-lg shadow-lg px-3 py-2 pointer-events-none"
          style={{ left: hoveredCell.x, top: hoveredCell.y - 70, transform: 'translateX(-50%)' }}
        >
          <div className="text-xs text-text-muted mb-0.5">
            {hoveredCell.periodicity === 'month'
              ? format(parseISO(hoveredCell.value.date + '-01'), 'MMMM yyyy')
              : hoveredCell.periodicity === 'week'
              ? `Week of ${hoveredCell.value.date}`
              : format(parseISO(hoveredCell.value.date), 'EEEE, MMM d, yyyy')}
          </div>
          <div className="text-sm font-semibold text-text-primary">{formatCellValue(hoveredCell.value.value)}</div>
          {hoveredCell.value.changePercent !== 0 && (
            <div className={cn('text-xs', hoveredCell.value.changePercent > 0 ? 'text-green-600' : 'text-red-600')}>
              {hoveredCell.value.changePercent > 0 ? '+' : ''}
              {hoveredCell.value.changePercent.toFixed(1)}%
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-2">
          <div className="text-sm text-text-muted">
            Showing {((pagination?.page || page) - 1) * (pagination?.limit || 20) + 1} to{' '}
            {Math.min((pagination?.page || page) * (pagination?.limit || 20), pagination?.total || 0)} of{' '}
            {pagination?.total || 0} products
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={cn(
                      'w-8 h-8 rounded text-sm font-medium transition-colors',
                      page === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'text-text-muted hover:bg-surface-secondary hover:text-text-primary'
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}