"use client"

import React, { useMemo, useState, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { Button } from '@/design-system/buttons'
import { TableSkeleton } from '@/design-system/loaders'
import { PurchaseOrderItem, PurchaseOrderStatus } from '@/services/api/purchaseOrders.api'
import { formatCurrency, formatNumber } from '@/utils/format'
import { Badge } from '@/design-system/badges'

export interface PurchaseOrdersTableProps {
  purchaseOrders?: PurchaseOrderItem[]
  isLoading?: boolean
  searchTerm?: string
  error?: any
}

type SortColumn = 'poDate' | 'poNumber' | 'supplier' | 'totalUnits' | 'totalCost' | 'estimatedArrival' | 'status'
type SortDirection = 'asc' | 'desc'

/**
 * Purchase Orders Table Component
 * 
 * Displays purchase orders with sorting and pagination
 */
export const PurchaseOrdersTable = ({
  purchaseOrders,
  isLoading,
  searchTerm = '',
  error,
}: PurchaseOrdersTableProps) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('poDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }, [sortColumn, sortDirection])

  const filteredAndSortedOrders = useMemo(() => {
    if (!purchaseOrders) return []
    let result = [...purchaseOrders]

    // Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (order) =>
          order.poNumber?.toLowerCase().includes(lower) ||
          order.supplier?.name?.toLowerCase().includes(lower)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number | string = 0
      let bVal: number | string = 0

      switch (sortColumn) {
        case 'poDate':
          aVal = new Date(a.poDate || 0).getTime()
          bVal = new Date(b.poDate || 0).getTime()
          break
        case 'poNumber':
          aVal = a.poNumber || ''
          bVal = b.poNumber || ''
          break
        case 'supplier':
          aVal = a.supplier?.name || ''
          bVal = b.supplier?.name || ''
          break
        case 'totalUnits':
          aVal = a.totalUnits || 0
          bVal = b.totalUnits || 0
          break
        case 'totalCost':
          aVal = a.totalCost || 0
          bVal = b.totalCost || 0
          break
        case 'estimatedArrival':
          aVal = new Date(a.estimatedArrival || 0).getTime()
          bVal = new Date(b.estimatedArrival || 0).getTime()
          break
        case 'status':
          aVal = a.status || ''
          bVal = b.status || ''
          break
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
    })

    return result
  }, [purchaseOrders, searchTerm, sortColumn, sortDirection])

  const paginatedOrders = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage
    return filteredAndSortedOrders.slice(startIdx, startIdx + itemsPerPage)
  }, [filteredAndSortedOrders, currentPage])

  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage)

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'ordered':
        return <Badge variant="warning">Ordered</Badge>
      case 'shipped':
        return <Badge variant="primary">Shipped</Badge>
      case 'received':
        return <Badge variant="success">Received</Badge>
      case 'cancelled':
        return <Badge variant="error">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-primary p-8 text-center">
        <p className="text-text-danger">Error loading purchase orders: {error.message}</p>
      </div>
    )
  }

  if (isLoading) {
    return <TableSkeleton rows={10} columns={10} />
  }

  if (!purchaseOrders || purchaseOrders.length === 0) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-primary p-12 text-center">
        <p className="text-text-muted text-lg">No data available</p>
      </div>
    )
  }

  if (filteredAndSortedOrders.length === 0) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-primary p-12 text-center">
        <p className="text-text-muted text-lg">No purchase orders match your search</p>
      </div>
    )
  }

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <span className="ml-1 text-text-tertiary">↕</span>
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border-primary bg-surface-primary">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary"
                  onClick={() => handleSort('poDate')}
                >
                  PO date <SortIcon column="poDate" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary"
                  onClick={() => handleSort('poNumber')}
                >
                  PO number <SortIcon column="poNumber" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary"
                  onClick={() => handleSort('supplier')}
                >
                  Supplier <SortIcon column="supplier" />
                </TableHead>
                <TableHead>Products</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('totalUnits')}
                >
                  Total units <SortIcon column="totalUnits" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary text-right"
                  onClick={() => handleSort('totalCost')}
                >
                  Total cost <SortIcon column="totalCost" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary"
                  onClick={() => handleSort('estimatedArrival')}
                >
                  Estimated arrival <SortIcon column="estimatedArrival" />
                </TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>FBA shipments</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon column="status" />
                </TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{formatDate(order.poDate)}</TableCell>
                  <TableCell className="font-medium">{order.poNumber}</TableCell>
                  <TableCell>{order.supplier?.name || '—'}</TableCell>
                  <TableCell>
                    <span className="text-sm text-text-muted">
                      {order.products?.length || 0} product{order.products?.length !== 1 ? 's' : ''}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(order.totalUnits)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(order.totalCost)}
                  </TableCell>
                  <TableCell>{formatDate(order.estimatedArrival)}</TableCell>
                  <TableCell className="text-sm text-text-muted max-w-xs truncate">
                    {order.comment || '—'}
                  </TableCell>
                  <TableCell>
                    {order.fbaShipments && order.fbaShipments.length > 0 ? (
                      <span className="text-sm text-primary-600">
                        {order.fbaShipments.length} shipment{order.fbaShipments.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    <button className="text-text-muted hover:text-text-primary">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredAndSortedOrders.length)} of{' '}
            {filteredAndSortedOrders.length} orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'text-text-muted hover:bg-surface-secondary hover:text-text-primary'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
