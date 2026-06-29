'use client'

import React, { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { TableSkeleton, ChartSkeleton } from '@/design-system/loaders'
import { ProductTrendsResponse } from '@/services/api/profit.api'
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/format'
import { cn } from '@/utils/cn'

// Lazy-load the heavy LineChart component (includes Recharts)
const LineChart = dynamic(
  () => import('@/design-system/charts/LineChart').then((mod) => mod.LineChart),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-16 flex items-center justify-center">
        <ChartSkeleton height="60px" />
      </div>
    ),
  }
)

/**
 * TrendsTable Component
 * 
 * Displays product-level trends in a table format with:
 * - Product column (image, SKU, name)
 * - Chart column (small embedded line chart)
 * - Date columns (one for each day in the range)
 * - Each date cell shows value and percentage change
 * 
 * Architecture Note: This component is modular and can be extracted
 * to a separate microservice frontend.
 */

export interface TrendsTableProps {
  data?: ProductTrendsResponse
  isLoading?: boolean
  error?: any
  currency?: string
  searchTerm?: string
  heatmapEnabled?: boolean
  className?: string
}

/**
 * Format date for display
 */
const formatDateDisplay = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Get color for percentage change
 */
const getChangeColor = (changePercent: number): string => {
  if (changePercent > 0) return 'text-success-600'
  if (changePercent < 0) return 'text-danger-600'
  return 'text-text-muted'
}

/**
 * Get heatmap color based on value intensity
 */
const getHeatmapColor = (value: number, maxValue: number, minValue: number): string => {
  if (maxValue === minValue) return 'bg-blue-50'
  const normalized = (value - minValue) / (maxValue - minValue)
  const intensity = Math.floor(normalized * 10)
  
  // Blue gradient from light to dark
  const colors = [
    'bg-blue-50',
    'bg-blue-100',
    'bg-blue-200',
    'bg-blue-300',
    'bg-blue-400',
    'bg-blue-500',
    'bg-blue-600',
    'bg-blue-700',
    'bg-blue-800',
    'bg-blue-900',
  ]
  
  return colors[Math.min(intensity, 9)]
}

export const TrendsTable: React.FC<TrendsTableProps> = ({
  data,
  isLoading,
  error,
  currency = 'CAD',
  searchTerm = '',
  heatmapEnabled = false,
  className,
}) => {
  // Filter products by search term
  const filteredProducts = useMemo(() => {
    if (!data?.products) return []
    if (!searchTerm) return data.products

    const lower = searchTerm.toLowerCase()
    return data.products.filter(
      (product) =>
        product.productTitle?.toLowerCase().includes(lower) ||
        product.sku?.toLowerCase().includes(lower)
    )
  }, [data?.products, searchTerm])

  // Calculate min/max values for heatmap
  const { minValue, maxValue } = useMemo(() => {
    if (!filteredProducts.length) return { minValue: 0, maxValue: 0 }
    
    const allValues = filteredProducts.flatMap((p) => p.dailyValues.map((dv) => dv.value))
    return {
      minValue: Math.min(...allValues),
      maxValue: Math.max(...allValues),
    }
  }, [filteredProducts])

  // Format metric value based on metric type
  const formatMetricValue = (value: number, metric: string): string => {
    switch (metric) {
      case 'sales':
      case 'promo':
      case 'advertisingCost':
      case 'refundCost':
      case 'amazonFees':
      case 'estimatedPayout':
      case 'costOfGoods':
      case 'grossProfit':
      case 'indirectExpenses':
      case 'netProfit':
        return formatCurrency(value, currency)
      case 'units':
      case 'orders':
      case 'refunds':
        return formatNumber(value, 0)
      case 'refundsPercent':
      case 'sellableReturns':
      case 'margin':
        return formatPercentage(value)
      default:
        return formatCurrency(value, currency)
    }
  }

  if (isLoading) {
    return <TableSkeleton rows={5} columns={10} />
  }

  if (error) {
    return (
      <div className="text-center text-danger-600 py-8">
        Error loading trends data. Please try again.
      </div>
    )
  }

  if (!data || !data.products || data.products.length === 0) {
    return (
      <div className="text-center text-text-muted py-8">
        No product trends data available. Try adjusting the date range or filters.
      </div>
    )
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center text-text-muted py-8">
        No products match your search criteria.
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-surface z-10 w-[250px] whitespace-nowrap">Product</TableHead>
            <TableHead className="w-[150px] whitespace-nowrap">Chart</TableHead>
            {data.dates.map((date) => (
              <TableHead key={date} className="w-[120px] text-center whitespace-nowrap">
                {formatDateDisplay(date)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.map((product) => {
            // Create chart data for this product
            const chartData = product.dailyValues.map((dv, index) => ({
              date: `${index + 1}`,
              value: dv.value,
            }))

            return (
              <TableRow key={product.sku} className="hover:bg-surface-secondary">
                {/* Product Column */}
                <TableCell className="sticky left-0 bg-surface z-10 w-[250px]">
                  <div className="flex items-start gap-3">
                    {/* Product Image */}
                    <div className="w-12 h-12 bg-surface-secondary rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {product.productImageUrl ? (
                        <img
                          src={product.productImageUrl}
                          alt={product.productTitle || 'Product'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-6 h-6 text-text-muted"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="min-w-0 flex-1 max-w-[200px]">
                      {/* SKU */}
                      <div className="text-xs text-text-muted mb-1 truncate">{product.sku}</div>
                      {/* Product Name */}
                      <div className="font-medium text-text-primary text-sm line-clamp-2 break-words">
                        {product.productTitle || 'Unnamed Product'}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Chart Column */}
                <TableCell className="w-[150px]">
                  <div className="w-full h-[60px]">
                    <LineChart
                      data={chartData}
                      xKey="date"
                      yKeys={[
                        {
                          key: 'value',
                          name: 'Value',
                          color: '#3b82f6',
                        },
                      ]}
                      height={60}
                      className="w-full"
                    />
                  </div>
                </TableCell>

                {/* Date Columns */}
                {product.dailyValues.map((dailyValue) => {
                  const cellClassName = heatmapEnabled
                    ? getHeatmapColor(dailyValue.value, maxValue, minValue)
                    : ''

                  return (
                    <TableCell
                      key={dailyValue.date}
                      className={cn('w-[120px] text-center', cellClassName)}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="font-medium text-text-primary">
                          {formatMetricValue(dailyValue.value, data.metric)}
                        </div>
                        <div className={cn('text-xs', getChangeColor(dailyValue.changePercent))}>
                          {dailyValue.changePercent > 0 ? '+' : ''}
                          {formatPercentage(dailyValue.changePercent)}
                        </div>
                      </div>
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
