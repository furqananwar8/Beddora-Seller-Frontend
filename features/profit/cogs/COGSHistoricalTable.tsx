'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { COGSHistoricalResponse, CostMethod } from '@/services/api/cogs.api'
import { formatCurrency, formatNumber } from '@/utils/format'
import { Spinner } from '@/design-system/loaders'

/**
 * COGSHistoricalTable component
 * 
 * Displays historical COGS data for reporting and trend analysis
 * Shows COGS entries over time with cost method breakdown
 */
export interface COGSHistoricalTableProps {
  data?: COGSHistoricalResponse
  isLoading?: boolean
  error?: any
  className?: string
}

export const COGSHistoricalTable: React.FC<COGSHistoricalTableProps> = ({
  data,
  isLoading,
  error,
  className,
}) => {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>COGS History</CardTitle>
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
          <CardTitle>COGS History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">Failed to load historical data</div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>COGS History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-secondary-500 text-sm">No historical data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>COGS History</CardTitle>
        <p className="text-sm text-secondary-500 mt-1">
          {new Date(data.startDate).toLocaleDateString()} -{' '}
          {new Date(data.endDate).toLocaleDateString()}
          {data.sku && ` • SKU: ${data.sku}`}
        </p>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Total Quantity</div>
            <div className="text-xl font-bold text-blue-600">
              {formatNumber(data.summary.totalQuantity, 0)}
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Average Unit Cost</div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(data.summary.averageUnitCost)}
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Total Cost</div>
            <div className="text-xl font-bold text-purple-600">
              {formatCurrency(data.summary.totalCost)}
            </div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Entries</div>
            <div className="text-xl font-bold text-orange-600">{data.data.length}</div>
          </div>
        </div>

        {/* Method Breakdown */}
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Cost Method Breakdown</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {Object.entries(data.summary.methodBreakdown).map(([method, cost]) => (
              <div key={method} className="p-2 bg-secondary-50 rounded">
                <div className="text-secondary-600">{method.replace('_', ' ')}</div>
                <div className="font-semibold">{formatCurrency(cost)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Historical Data Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Batch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                  <TableCell>{formatNumber(entry.quantity, 0)}</TableCell>
                  <TableCell>{formatCurrency(entry.unitCost)}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(entry.totalCost)}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-secondary-100 rounded text-xs">
                      {entry.costMethod.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {entry.batchId ? (
                      <span className="text-xs text-secondary-600">Yes</span>
                    ) : (
                      <span className="text-xs text-secondary-400">No</span>
                    )}
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

