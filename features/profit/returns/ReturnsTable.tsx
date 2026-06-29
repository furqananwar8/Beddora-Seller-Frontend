"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { ReturnEntry, ReturnFilters } from '@/services/api/returns.api'
import { formatCurrency, formatDate } from '@/utils/format'

export interface ReturnsTableProps {
  returns?: ReturnEntry[]
  filters: ReturnFilters
  onFiltersChange: (filters: ReturnFilters) => void
  marketplaces?: Array<{ id: string; name: string; code: string }>
  isLoading?: boolean
  error?: any
  className?: string
}

const exportCSV = (rows: ReturnEntry[]) => {
  const headers = [
    'Order ID',
    'SKU',
    'Reason Code',
    'Quantity',
    'Refund Amount',
    'Fee Amount',
    'Sellable',
    'Marketplace',
    'Created At',
  ]

  const lines = rows.map((row) => [
    row.orderId,
    row.sku,
    row.reasonCode,
    row.quantityReturned,
    row.refundAmount,
    row.feeAmount,
    row.isSellable ? 'Yes' : 'No',
    row.marketplaceId || '',
    row.createdAt,
  ])

  const csv = [headers, ...lines].map((line) => line.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'returns.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const exportExcel = (rows: ReturnEntry[]) => {
  const headers = [
    'Order ID',
    'SKU',
    'Reason Code',
    'Quantity',
    'Refund Amount',
    'Fee Amount',
    'Sellable',
    'Marketplace',
    'Created At',
  ]

  const lines = rows.map((row) => [
    row.orderId,
    row.sku,
    row.reasonCode,
    row.quantityReturned,
    row.refundAmount,
    row.feeAmount,
    row.isSellable ? 'Yes' : 'No',
    row.marketplaceId || '',
    row.createdAt,
  ])

  const csv = [headers, ...lines].map((line) => line.join('\t')).join('\n')
  const blob = new Blob([csv], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'returns.xls')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const exportPDF = (rows: ReturnEntry[]) => {
  const win = window.open('', '_blank')
  if (!win) return

  const tableRows = rows
    .map(
      (row) => `
      <tr>
        <td>${row.orderId}</td>
        <td>${row.sku}</td>
        <td>${row.reasonCode}</td>
        <td>${row.quantityReturned}</td>
        <td>${row.refundAmount}</td>
        <td>${row.feeAmount}</td>
        <td>${row.isSellable ? 'Yes' : 'No'}</td>
        <td>${row.marketplaceId || ''}</td>
        <td>${new Date(row.createdAt).toLocaleDateString()}</td>
      </tr>
    `
    )
    .join('')

  win.document.write(`
    <html>
      <head>
        <title>Returns Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h2>Returns Report</h2>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>SKU</th>
              <th>Reason Code</th>
              <th>Quantity</th>
              <th>Refund</th>
              <th>Fee</th>
              <th>Sellable</th>
              <th>Marketplace</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `)
  win.document.close()
  win.focus()
  win.print()
}

export const ReturnsTable: React.FC<ReturnsTableProps> = ({
  returns,
  filters,
  onFiltersChange,
  marketplaces = [],
  isLoading,
  error,
  className,
}) => {
  const [localFilters, setLocalFilters] = useState<ReturnFilters>(filters)

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const reasonCodes = useMemo(() => {
    const codes = new Set((returns || []).map((entry) => entry.reasonCode))
    return Array.from(codes)
  }, [returns])

  const handleFilterChange = (key: keyof ReturnFilters, value: string | undefined) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const handleApply = () => {
    onFiltersChange(localFilters)
  }

  const handleReset = () => {
    const reset = { accountId: filters.accountId, period: filters.period }
    setLocalFilters(reset)
    onFiltersChange(reset)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Returns</CardTitle>
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
          <CardTitle>Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">Failed to load returns</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Returns</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportCSV(returns || [])}>
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => exportExcel(returns || [])}>
              Export Excel
            </Button>
            <Button variant="outline" onClick={() => exportPDF(returns || [])}>
              Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="SKU"
              value={localFilters.sku || ''}
              onChange={(e) => handleFilterChange('sku', e.target.value)}
            />
            <Select
              label="Reason Code"
              value={localFilters.reasonCode || ''}
              onChange={(e) => handleFilterChange('reasonCode', e.target.value)}
              options={[
                { value: '', label: 'All Reasons' },
                ...reasonCodes.map((code) => ({ value: code, label: code })),
              ]}
            />
            {marketplaces.length > 0 && (
              <Select
                label="Marketplace"
                value={localFilters.marketplaceId || ''}
                onChange={(e) => handleFilterChange('marketplaceId', e.target.value)}
                options={[
                  { value: '', label: 'All Marketplaces' },
                  ...marketplaces.map((mp) => ({
                    value: mp.id,
                    label: `${mp.name} (${mp.code})`,
                  })),
                ]}
              />
            )}
            <Select
              label="Period"
              value={localFilters.period || 'day'}
              onChange={(e) => handleFilterChange('period', e.target.value)}
              options={[
                { value: 'day', label: 'Daily' },
                { value: 'week', label: 'Weekly' },
                { value: 'month', label: 'Monthly' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={localFilters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={localFilters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
              <Button onClick={handleApply}>Apply</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Refund</TableHead>
                  <TableHead>Fees</TableHead>
                  <TableHead>Sellable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns && returns.length > 0 ? (
                  returns.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.orderId}</TableCell>
                      <TableCell>{entry.sku}</TableCell>
                      <TableCell>{entry.reasonCode}</TableCell>
                      <TableCell>{entry.quantityReturned}</TableCell>
                      <TableCell>{formatCurrency(entry.refundAmount)}</TableCell>
                      <TableCell>{formatCurrency(entry.feeAmount)}</TableCell>
                      <TableCell>{entry.isSellable ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-secondary-500">
                      No returns found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

