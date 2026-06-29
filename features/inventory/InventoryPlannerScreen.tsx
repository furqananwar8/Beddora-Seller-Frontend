"use client"

import React, { useState, useMemo } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
import { useDebounce } from '@/utils/debounce'
import {
  useGetInventorySummaryQuery,
  useGetProductInventoryQuery,
  InventoryPlannerFilters,
} from '@/services/api/inventoryPlanner.api'
import { ProductInventoryTable } from './ProductInventoryTable'
import { formatCurrency, formatNumber } from '@/utils/format'
import { mockInventorySummary, mockProductInventory } from './mockData'

/**
 * Inventory Planner Screen Component
 *
 * Main screen for inventory planning with summary cards and product table
 */
export const InventoryPlannerScreen = () => {
  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Build filters
  const filters: InventoryPlannerFilters = useMemo(() => {
    return {
      search: debouncedSearch || undefined,
    }
  }, [debouncedSearch])

  // API Queries (with mock data fallback)
  const { data: summaryData, isLoading: summaryLoading } =
    useGetInventorySummaryQuery(filters)
  const { data: products, isLoading: productsLoading } =
    useGetProductInventoryQuery(filters)

  // Use mock data if API data is not available
  const displaySummary = summaryData || mockInventorySummary
  const displayProducts = products || mockProductInventory

  // Calculate summary totals
  const totalSummary = useMemo(() => {
    if (!displaySummary) return null
    return displaySummary.reduce(
      (acc, item) => ({
        units: acc.units + item.units,
        costOfGoods: acc.costOfGoods + item.costOfGoods,
        potentialSales: acc.potentialSales + item.potentialSales,
        potentialProfit: acc.potentialProfit + item.potentialProfit,
      }),
      { units: 0, costOfGoods: 0, potentialSales: 0, potentialProfit: 0 }
    )
  }, [displaySummary])

  // Get specific location summaries
  const fbaFbmSummary = displaySummary?.find((s) => s.location === 'fba') || {
    units: 0,
    costOfGoods: 0,
    potentialSales: 0,
    potentialProfit: 0,
  }
  const prepAwdSummary = displaySummary?.find((s) => s.location === 'prep') || {
    units: 0,
    costOfGoods: 0,
    potentialSales: 0,
    potentialProfit: 0,
  }
  const orderedSummary = displaySummary?.find((s) => s.location === 'ordered') || {
    units: 0,
    costOfGoods: 0,
    potentialSales: 0,
    potentialProfit: 0,
  }

  // Handle product selection
  const handleProductSelect = (productId: string, selected: boolean) => {
    setSelectedProducts((prev) =>
      selected ? [...prev, productId] : prev.filter((id) => id !== productId)
    )
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected && products) {
      setSelectedProducts(products.map((p) => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  // Summary Card Component
  const SummaryCard = ({
    title,
    units,
    costOfGoods,
    potentialSales,
    potentialProfit,
    color,
    loading = false,
  }: {
    title: string
    units: number
    costOfGoods: number
    potentialSales: number
    potentialProfit: number
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
      <Card className={`border-t-4 ${color}`}>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-text-muted mb-1">Units</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatNumber(units)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Cost of goods</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatCurrency(costOfGoods)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Potential sales</div>
              <div className="font-semibold text-text-primary">
                {formatCurrency(potentialSales)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Potential profit</div>
              <div className="font-semibold text-success-600">
                {formatCurrency(potentialProfit)}
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
        <div className="bg-surface-secondary border-b border-border-primary">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-2xl">
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

              {/* Filter Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-primary bg-surface-primary border border-border-primary rounded-md hover:bg-surface-secondary transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New + Grade and Resell
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-primary bg-surface-primary border border-border-primary rounded-md hover:bg-surface-secondary transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  FBA
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-primary bg-surface-primary border border-border-primary rounded-md hover:bg-surface-secondary transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  All marketplaces
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-primary bg-surface-primary border border-border-primary rounded-md hover:bg-surface-secondary transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Show OOS items
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-primary bg-surface-primary border border-border-primary rounded-md hover:bg-surface-secondary transition-colors">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="FBA + FBM"
          units={fbaFbmSummary.units}
          costOfGoods={fbaFbmSummary.costOfGoods}
          potentialSales={fbaFbmSummary.potentialSales}
          potentialProfit={fbaFbmSummary.potentialProfit}
          color="border-t-primary-600"
          loading={summaryLoading}
        />
        <SummaryCard
          title="Prep. stock + AWD"
          units={prepAwdSummary.units}
          costOfGoods={prepAwdSummary.costOfGoods}
          potentialSales={prepAwdSummary.potentialSales}
          potentialProfit={prepAwdSummary.potentialProfit}
          color="border-t-info-600"
          loading={summaryLoading}
        />
        <SummaryCard
          title="Ordered"
          units={orderedSummary.units}
          costOfGoods={orderedSummary.costOfGoods}
          potentialSales={orderedSummary.potentialSales}
          potentialProfit={orderedSummary.potentialProfit}
          color="border-t-warning-600"
          loading={summaryLoading}
        />
        <SummaryCard
          title="Total"
          units={totalSummary?.units || 0}
          costOfGoods={totalSummary?.costOfGoods || 0}
          potentialSales={totalSummary?.potentialSales || 0}
          potentialProfit={totalSummary?.potentialProfit || 0}
          color="border-t-success-600"
          loading={summaryLoading}
        />
      </div>

      {/* Product Inventory Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-text-primary">Product inventory</h2>

        {/* Product Table */}
        <ProductInventoryTable
          products={displayProducts}
          isLoading={productsLoading}
          searchTerm={debouncedSearch}
          selectedProducts={selectedProducts}
          onProductSelect={handleProductSelect}
          onSelectAll={handleSelectAll}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4 border-t border-border-primary">
          <Button variant="outline">Import</Button>
          <Button variant="outline">Export</Button>
          <Button variant="outline" disabled={selectedProducts.length === 0}>
            Create shipment plan
          </Button>
          <Button variant="outline" disabled={selectedProducts.length === 0}>
            Create purchase order
          </Button>
          {selectedProducts.length > 0 && (
            <span className="text-sm text-text-muted">
              {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
            </span>
          )}
        </div>
      </div>
    </Container>
  )
}
