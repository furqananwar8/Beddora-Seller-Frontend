"use client"

import React, { useState, useMemo } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Select } from '@/design-system/inputs'
import { Badge } from '@/design-system/badges'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { useDebounce } from '@/utils/debounce'
import { useGetFBAShipmentsQuery, FBAShipmentStatus } from '@/services/api/fbaShipments.api'
import { mockFBAShipments } from './mockFBAShipments'
import { formatNumber } from '@/utils/format'

/**
 * FBA Shipments Screen Component
 *
 * Main screen for FBA shipment management with filters and table
 */
export const FBAShipmentsScreen = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [shipmentIdSearch, setShipmentIdSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState('')
  const [sortColumn, setSortColumn] = useState<string>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const debouncedSearch = useDebounce(searchTerm, 300)
  const debouncedShipmentId = useDebounce(shipmentIdSearch, 300)

  // API Query
  const { data: shipments, isLoading } = useGetFBAShipmentsQuery(undefined, {
    pollingInterval: 0,
    refetchOnMountOrArgChange: false,
  })

  // Use mock data as fallback
  const displayShipments = shipments || mockFBAShipments

  // Filter and sort shipments
  const filteredShipments = useMemo(() => {
    let result = [...displayShipments]

    // Search filter
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase()
      result = result.filter(
        (s) =>
          s.shipmentName?.toLowerCase().includes(lower) ||
          s.shipmentId?.toLowerCase().includes(lower) ||
          s.destination?.toLowerCase().includes(lower)
      )
    }

    // Shipment ID filter
    if (debouncedShipmentId) {
      const lower = debouncedShipmentId.toLowerCase()
      result = result.filter((s) => s.shipmentId?.toLowerCase().includes(lower))
    }

    // Status filter
    if (selectedStatus !== 'all') {
      result = result.filter((s) => s.status === selectedStatus)
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortColumn as keyof typeof a]
      let bVal: any = b[sortColumn as keyof typeof b]

      if (sortColumn === 'date') {
        aVal = new Date(a.date || 0).getTime()
        bVal = new Date(b.date || 0).getTime()
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })

    return result
  }, [displayShipments, debouncedSearch, debouncedShipmentId, selectedStatus, sortColumn, sortDirection])

  const getStatusBadge = (status: FBAShipmentStatus) => {
    switch (status) {
      case 'working':
        return <Badge variant="secondary">Active</Badge>
      case 'receiving':
        return <Badge variant="primary">Receiving</Badge>
      case 'received':
        return <Badge variant="success">Shipped</Badge>
      case 'shipped':
        return <Badge variant="warning">Shipped</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  return (
    <Container size="full" className="py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary mb-6">FBA Shipments</h1>

        {/* Search and Filters Bar */}
        <div className="bg-surface-secondary border-b border-border-primary">
          <div className="px-6 py-3">
            <div className="flex items-center gap-3">
              {/* General Search */}
              <div className="relative" style={{ width: '200px' }}>
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-surface-primary border border-border-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-500"
                />
              </div>

              {/* Shipment ID Search */}
              <div className="relative" style={{ width: '280px' }}>
                <input
                  type="text"
                  placeholder="Shipment ID"
                  value={shipmentIdSearch}
                  onChange={(e) => setShipmentIdSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-primary border border-border-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-500"
                />
              </div>

              {/* Date Range */}
              <div className="relative" style={{ width: '320px' }}>
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="30 October 2025 - 30 January 2026"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-sm bg-surface-primary border border-border-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-500"
                />
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {/* Status Filter */}
              <div className="relative" style={{ width: '180px' }}>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full appearance-none px-3 py-2 text-sm bg-surface-primary border border-border-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-500"
                >
                  <option value="all">All statuses</option>
                  <option value="working">Active</option>
                  <option value="receiving">Receiving</option>
                  <option value="received">Received</option>
                  <option value="shipped">Shipped</option>
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {/* Filter Button */}
              <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-primary bg-surface-primary border border-border-primary hover:bg-surface-secondary transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Shipments Overview Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Shipments overview</h2>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-border-primary bg-surface-primary">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment plan/Shipment ID</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-surface-secondary"
                    onClick={() => handleSort('date')}
                  >
                    Date {sortColumn === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>% of units received</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last update</TableHead>
                  <TableHead>Purchase orders</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-text-muted">
                      No shipments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell>
                        <a
                          href="#"
                          className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
                        >
                          {shipment.shipmentName}
                        </a>
                      </TableCell>
                      <TableCell>{formatDate(shipment.date)}</TableCell>
                      <TableCell>{shipment.destination || '—'}</TableCell>
                      <TableCell>
                        {shipment.percentReceived > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{shipment.percentReceived}%</span>
                            <div className="w-24 h-2 bg-surface-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  shipment.percentReceived === 100
                                    ? 'bg-success-500'
                                    : 'bg-primary-500'
                                }`}
                                style={{ width: `${shipment.percentReceived}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm">0%</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {shipment.products.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={shipment.products[0].imageUrl || 'https://via.placeholder.com/40'}
                              alt={shipment.products[0].title}
                              className="w-10 h-10 object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/40'
                              }}
                            />
                            <span className="text-sm truncate max-w-xs">
                              {shipment.products[0].title}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-text-muted">
                            Selected products: {shipment.totalUnits}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                      <TableCell className="text-sm">{formatDate(shipment.lastUpdate)}</TableCell>
                      <TableCell>
                        {shipment.purchaseOrderIds && shipment.purchaseOrderIds.length > 0 ? (
                          <span className="text-sm">
                            {shipment.purchaseOrderIds.length} PO
                            {shipment.purchaseOrderIds.length !== 1 ? 's' : ''}
                          </span>
                        ) : shipment.comment === 'Add' ? (
                          <a href="#" className="text-primary-600 hover:underline text-sm">
                            Add
                          </a>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-text-muted">
                        {shipment.comment && shipment.comment !== 'Add' ? shipment.comment : '—'}
                      </TableCell>
                      <TableCell>
                        <button className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button variant="primary">
          Create inbound shipment
        </Button>
        <Button variant="outline">
          Export
        </Button>
        <Button variant="outline">
          Refresh
        </Button>
      </div>
    </Container>
  )
}
