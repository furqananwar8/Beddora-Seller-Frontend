'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import {
  ProductProfitBreakdown,
  MarketplaceProfitBreakdown,
} from '@/services/api/profit.api'
import { formatCurrency, formatPercentage } from '@/utils/format'
import { Spinner } from '@/design-system/loaders'

/**
 * ProfitBreakdownTable component
 * 
 * Displays profit breakdown by product or marketplace in a table
 * Supports sorting and filtering
 */
export type BreakdownType = 'product' | 'marketplace'

export interface ProfitBreakdownTableProps {
  type: BreakdownType
  productData?: ProductProfitBreakdown[]
  marketplaceData?: MarketplaceProfitBreakdown[]
  isLoading?: boolean
  error?: any
  className?: string
  onSKUClick?: (sku: string) => void
}

export const ProfitBreakdownTable: React.FC<ProfitBreakdownTableProps> = ({
  type,
  productData,
  marketplaceData,
  isLoading,
  error,
  className,
  onSKUClick,
}) => {
  const [sortField, setSortField] = useState<keyof ProductProfitBreakdown | keyof MarketplaceProfitBreakdown>('salesRevenue')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field as any)
      setSortDirection('desc')
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>
            Profit by {type === 'product' ? 'Product' : 'Marketplace'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>
            Profit by {type === 'product' ? 'Product' : 'Marketplace'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">
            Failed to load breakdown data. Please try again.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (type === 'product') {
    if (!productData || productData.length === 0) {
      return (
        <Card className={className}>
          <CardHeader>
            <CardTitle>Profit by Product</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-secondary-500 text-sm">No product data available</div>
          </CardContent>
        </Card>
      )
    }

    // Sort product data
    const sortedData = [...productData].sort((a, b) => {
      const aValue = a[sortField as keyof ProductProfitBreakdown]
      const bValue = b[sortField as keyof ProductProfitBreakdown]
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      return 0
    })

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Profit by Product</CardTitle>
          <p className="text-sm text-secondary-500 mt-1">
            {productData.length} products
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-secondary-100"
                    onClick={() => handleSort('sku')}
                  >
                    SKU {sortField === 'sku' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-secondary-100"
                    onClick={() => handleSort('salesRevenue')}
                  >
                    Revenue {sortField === 'salesRevenue' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-secondary-100"
                    onClick={() => handleSort('totalCOGS')}
                  >
                    COGS {sortField === 'totalCOGS' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Fees</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-secondary-100"
                    onClick={() => handleSort('grossProfit')}
                  >
                    Gross Profit {sortField === 'grossProfit' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-secondary-100"
                    onClick={() => handleSort('netProfit')}
                  >
                    Net Profit {sortField === 'netProfit' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Units Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((item) => (
                  <TableRow key={item.sku}>
                    <TableCell className="font-mono text-sm">
                      {onSKUClick ? (
                        <button
                          onClick={() => onSKUClick(item.sku)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {item.sku}
                        </button>
                      ) : (
                        item.sku
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.productTitle || 'N/A'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(item.salesRevenue)}
                    </TableCell>
                    <TableCell>{formatCurrency(item.totalCOGS)}</TableCell>
                    <TableCell>{formatCurrency(item.totalFees)}</TableCell>
                    <TableCell>{formatCurrency(item.totalExpenses)}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(item.grossProfit)}
                    </TableCell>
                    <TableCell className="font-semibold text-purple-600">
                      {formatCurrency(item.netProfit)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-green-600">
                          G: {formatPercentage(item.grossMargin)}
                        </span>
                        <span className="text-xs text-purple-600">
                          N: {formatPercentage(item.netMargin)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{item.unitsSold}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Marketplace breakdown
  if (!marketplaceData || marketplaceData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Profit by Marketplace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-secondary-500 text-sm">No marketplace data available</div>
        </CardContent>
      </Card>
    )
  }

  // Sort marketplace data
  const sortedMarketplaceData = [...marketplaceData].sort((a, b) => {
    const aValue = a[sortField as keyof MarketplaceProfitBreakdown]
    const bValue = b[sortField as keyof MarketplaceProfitBreakdown]
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }
    return 0
  })

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Profit by Marketplace</CardTitle>
        <p className="text-sm text-secondary-500 mt-1">
          {marketplaceData.length} marketplaces
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marketplace</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-secondary-100"
                  onClick={() => handleSort('salesRevenue')}
                >
                  Revenue {sortField === 'salesRevenue' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>COGS</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Refunds</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-secondary-100"
                  onClick={() => handleSort('grossProfit')}
                >
                  Gross Profit {sortField === 'grossProfit' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-secondary-100"
                  onClick={() => handleSort('netProfit')}
                >
                  Net Profit {sortField === 'netProfit' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Margin</TableHead>
                <TableHead>Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMarketplaceData.map((item) => (
                <TableRow key={item.marketplaceId}>
                  <TableCell className="font-semibold">
                    {item.marketplaceName} ({item.marketplaceCode})
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(item.salesRevenue)}
                  </TableCell>
                  <TableCell>{formatCurrency(item.totalCOGS)}</TableCell>
                  <TableCell>{formatCurrency(item.totalFees)}</TableCell>
                  <TableCell>{formatCurrency(item.totalExpenses)}</TableCell>
                  <TableCell>{formatCurrency(item.totalRefunds)}</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {formatCurrency(item.grossProfit)}
                  </TableCell>
                  <TableCell className="font-semibold text-purple-600">
                    {formatCurrency(item.netProfit)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs text-green-600">
                        G: {formatPercentage(item.grossMargin)}
                      </span>
                      <span className="text-xs text-purple-600">
                        N: {formatPercentage(item.netMargin)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{item.orderCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

