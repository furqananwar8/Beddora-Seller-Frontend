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
  UnitsSoldKPI,
  ReturnsCostKPI,
  AdvertisingCostKPI,
  FBAFeesKPI,
  PayoutEstimateKPI,
} from '@/services/api/kpis.api'
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/format'
import { Spinner } from '@/design-system/loaders'

/**
 * KPITable component
 * 
 * Displays detailed breakdown of KPI data in a table
 * Supports sorting and filtering
 */
export type KPITableType =
  | 'units-sold'
  | 'returns-cost'
  | 'advertising-cost'
  | 'fba-fees'
  | 'payout-estimate'

export interface KPITableProps {
  type: KPITableType
  unitsSoldData?: UnitsSoldKPI
  returnsCostData?: ReturnsCostKPI
  advertisingCostData?: AdvertisingCostKPI
  fbaFeesData?: FBAFeesKPI
  payoutEstimateData?: PayoutEstimateKPI
  isLoading?: boolean
  error?: any
  className?: string
}

export const KPITable: React.FC<KPITableProps> = ({
  type,
  unitsSoldData,
  returnsCostData,
  advertisingCostData,
  fbaFeesData,
  payoutEstimateData,
  isLoading,
  error,
  className,
}) => {
  const [sortField, setSortField] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>KPI Details</CardTitle>
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
          <CardTitle>KPI Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">Failed to load KPI data</div>
        </CardContent>
      </Card>
    )
  }

  // Units Sold Table
  if (type === 'units-sold' && unitsSoldData) {
    const sortedData = [...unitsSoldData.breakdown].sort((a, b) => {
      if (sortField === 'units') {
        return sortDirection === 'asc' ? a.units - b.units : b.units - a.units
      }
      if (sortField === 'period') {
        return sortDirection === 'asc'
          ? a.period.localeCompare(b.period)
          : b.period.localeCompare(a.period)
      }
      return 0
    })

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Units Sold Breakdown</CardTitle>
          <p className="text-sm text-secondary-500 mt-1">
            Total: {formatNumber(unitsSoldData.totalUnits, 0)} units
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort('period')}
                  >
                    Period {sortField === 'period' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort('units')}
                  >
                    Units {sortField === 'units' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">{item.sku || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.productTitle || 'N/A'}
                    </TableCell>
                    <TableCell>{item.marketplaceName || 'N/A'}</TableCell>
                    <TableCell>{item.period}</TableCell>
                    <TableCell className="font-semibold">
                      {formatNumber(item.units, 0)}
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

  // Returns Cost Table
  if (type === 'returns-cost' && returnsCostData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Returns Cost Breakdown</CardTitle>
          <p className="text-sm text-secondary-500 mt-1">
            Total: {formatCurrency(returnsCostData.totalReturnsCost)} ({returnsCostData.totalReturnsCount} returns)
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason Code</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnsCostData.breakdown.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.reasonCode || 'N/A'}</TableCell>
                    <TableCell>{item.reason || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-sm">{item.sku || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.productTitle || 'N/A'}
                    </TableCell>
                    <TableCell>{item.marketplaceName || 'N/A'}</TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Advertising Cost Table
  if (type === 'advertising-cost' && advertisingCostData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Advertising Cost Breakdown</CardTitle>
          <p className="text-sm text-secondary-500 mt-1">
            Total Spend: {formatCurrency(advertisingCostData.totalSpend)} | 
            Total Sales: {formatCurrency(advertisingCostData.totalSales)} | 
            Avg ACOS: {formatPercentage(advertisingCostData.averageACOS)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign ID</TableHead>
                  <TableHead>Ad Group ID</TableHead>
                  <TableHead>Keyword ID</TableHead>
                  <TableHead>Spend</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>ACOS</TableHead>
                  <TableHead>ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advertisingCostData.breakdown.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">{item.campaignId}</TableCell>
                    <TableCell className="font-mono text-sm">{item.adGroupId || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-sm">{item.keywordId || 'N/A'}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(item.spend)}
                    </TableCell>
                    <TableCell>{formatCurrency(item.sales)}</TableCell>
                    <TableCell>{formatNumber(item.clicks, 0)}</TableCell>
                    <TableCell>
                      {item.acos !== null ? formatPercentage(item.acos) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.roas !== null ? formatNumber(item.roas, 2) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  // FBA Fees Table
  if (type === 'fba-fees' && fbaFeesData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>FBA Fees Breakdown</CardTitle>
          <p className="text-sm text-secondary-500 mt-1">
            Total: {formatCurrency(fbaFeesData.totalFBAFees)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Fee Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fbaFeesData.breakdown.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.period}</TableCell>
                    <TableCell>{item.feeType}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(item.amount)}
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

  // Payout Estimate Table
  if (type === 'payout-estimate' && payoutEstimateData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Payout Estimate Breakdown</CardTitle>
          <p className="text-sm text-secondary-500 mt-1">
            Estimated Payout: {formatCurrency(payoutEstimateData.estimatedPayout)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-secondary-600 mb-1">Gross Revenue</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(payoutEstimateData.grossRevenue)}
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-sm text-secondary-600 mb-1">Total Deductions</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(payoutEstimateData.totalDeductions)}
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Deduction Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-secondary-600">Fees:</span>{' '}
                  <span className="font-semibold">
                    {formatCurrency(payoutEstimateData.breakdown.fees)}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-600">Refunds:</span>{' '}
                  <span className="font-semibold">
                    {formatCurrency(payoutEstimateData.breakdown.refunds)}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-600">Returns:</span>{' '}
                  <span className="font-semibold">
                    {formatCurrency(payoutEstimateData.breakdown.returns)}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-600">Advertising:</span>{' '}
                  <span className="font-semibold">
                    {formatCurrency(payoutEstimateData.breakdown.advertising)}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-600">FBA Fees:</span>{' '}
                  <span className="font-semibold">
                    {formatCurrency(payoutEstimateData.breakdown.fbaFees)}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-600">Other:</span>{' '}
                  <span className="font-semibold">
                    {formatCurrency(payoutEstimateData.breakdown.other)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>KPI Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-secondary-500 text-sm">No data available</div>
      </CardContent>
    </Card>
  )
}

