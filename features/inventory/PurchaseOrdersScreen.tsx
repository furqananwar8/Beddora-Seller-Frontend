"use client"

import React, { useState, useMemo } from 'react'
import { Container } from '@/components/layout'
import { Select } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
import { useDebounce } from '@/utils/debounce'
import {
  useGetPurchaseOrderSummaryQuery,
  useGetPurchaseOrdersQuery,
  PurchaseOrderFilters,
  PurchaseOrderStatus,
} from '@/services/api/purchaseOrders.api'
import { PurchaseOrdersTable } from './PurchaseOrdersTable'
import { formatCurrency, formatNumber } from '@/utils/format'
import { mockPurchaseOrderSummary, mockPurchaseOrders } from './mockPurchaseOrders'

/**
 * Purchase Orders Screen Component
 *
 * Main screen for purchase order management with status cards and table
 */
export const PurchaseOrdersScreen = () => {
  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [searchByPO, setSearchByPO] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<string>('none')
  
  const debouncedSearch = useDebounce(searchTerm, 300)
  const debouncedPOSearch = useDebounce(searchByPO, 300)

  // Build filters
  const filters: PurchaseOrderFilters = useMemo(() => {
    return {
      search: debouncedSearch || undefined,
      searchByPOName: debouncedPOSearch || undefined,
      supplierId: selectedSupplier !== 'all' ? selectedSupplier : undefined,
      status: selectedStatus !== 'all' ? (selectedStatus as PurchaseOrderStatus) : undefined,
    }
  }, [debouncedSearch, debouncedPOSearch, selectedSupplier, selectedStatus])

  // API Queries
  const { data: summaryData, isLoading: summaryLoading } =
    useGetPurchaseOrderSummaryQuery(filters)
  const { data: purchaseOrders, isLoading: ordersLoading } = useGetPurchaseOrdersQuery(filters)

  // Use mock data as fallback
  const displaySummary = summaryData || mockPurchaseOrderSummary
  const displayOrders = purchaseOrders || mockPurchaseOrders

  // Get specific status summaries
  const draftSummary = displaySummary?.find((s) => s.status === 'draft') || {
    count: 0,
    totalCost: 0,
    totalUnits: 0,
  }
  const orderedSummary = displaySummary?.find((s) => s.status === 'ordered') || {
    count: 0,
    totalCost: 0,
    totalUnits: 0,
  }
  const shippedSummary = displaySummary?.find((s) => s.status === 'shipped') || {
    count: 0,
    totalCost: 0,
    totalUnits: 0,
  }

  // Status Card Component
  const StatusCard = ({
    title,
    icon,
    count,
    totalCost,
    totalUnits,
    color,
    loading = false,
  }: {
    title: string
    icon: React.ReactNode
    count: number
    totalCost: number
    totalUnits: number
    color: string
    loading?: boolean
  }) => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-surface-secondary rounded w-1/2" />
              <div className="space-y-2">
                <div className="h-4 bg-surface-secondary rounded" />
                <div className="h-4 bg-surface-secondary rounded w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className={`border-l-4 ${color}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {icon}
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-text-muted mb-1">PO count</div>
              <div className="font-semibold text-text-primary text-lg">{count}</div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Total cost</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatCurrency(totalCost)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Total units</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatNumber(totalUnits)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Container size="full" className="py-8">
      {/* Header with Search and Filters */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Purchase Orders</h1>
        
        <div className="bg-surface-secondary border-b border-border-primary">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
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
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-primary border border-border-primary rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                />
              </div>

              {/* Search by PO name */}
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Search by PO name"
                  value={searchByPO}
                  onChange={(e) => setSearchByPO(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-surface-primary border border-border-primary rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  options={[
                    { value: 'all', label: 'All suppliers' },
                    { value: '1', label: 'Supplier A' },
                    { value: '2', label: 'Supplier B' },
                    { value: '3', label: 'Supplier C' },
                  ]}
                  className="w-[180px]"
                />

                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  options={[
                    { value: 'all', label: 'All statuses' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'ordered', label: 'Ordered' },
                    { value: 'shipped', label: 'Shipped' },
                    { value: 'received', label: 'Received' },
                  ]}
                  className="w-[180px]"
                />

                <button className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-text-primary bg-surface-primary border border-border-primary rounded-md hover:bg-surface-secondary transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                  Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatusCard
          title="Draft"
          icon={
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
          count={draftSummary.count}
          totalCost={draftSummary.totalCost}
          totalUnits={draftSummary.totalUnits}
          color="border-l-gray-400"
          loading={summaryLoading}
        />
        <StatusCard
          title="Ordered"
          icon={
            <svg className="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          count={orderedSummary.count}
          totalCost={orderedSummary.totalCost}
          totalUnits={orderedSummary.totalUnits}
          color="border-l-warning-500"
          loading={summaryLoading}
        />
        <StatusCard
          title="Shipped"
          icon={
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          }
          count={shippedSummary.count}
          totalCost={shippedSummary.totalCost}
          totalUnits={shippedSummary.totalUnits}
          color="border-l-primary-500"
          loading={summaryLoading}
        />
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            options={[
              { value: 'none', label: 'Group by' },
              { value: 'supplier', label: 'Supplier' },
              { value: 'status', label: 'Status' },
              { value: 'date', label: 'Date' },
            ]}
            className="w-[150px]"
          />
        </div>

        <PurchaseOrdersTable
          purchaseOrders={displayOrders}
          isLoading={ordersLoading}
          searchTerm={debouncedSearch}
        />
      </div>
    </Container>
  )
}
