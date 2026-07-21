"use client"

import React, { useState, useMemo, useCallback } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
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
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'

// ============================================
// TYPES
// ============================================

interface SummaryItem {
  location: string
  units: number
  costOfGoods: number
  potentialSales: number
  potentialProfit: number
}

interface ActionRequiredItem {
  location: string
  products: number
  fundsNeeded: number
  estMonthlySalesAtRisk: number
  estMonthlyProfit: number
}

interface SummaryTotals {
  units: number
  costOfGoods: number
  potentialSales: number
  potentialProfit: number
}

// ============================================
// FILTER OPTIONS
// ============================================

const FBA_OPTIONS = [
  { id: 'fba', name: 'FBA' },
  { id: 'fba_fbm', name: 'FBA/FBM' },
  { id: 'fba_and_fbm', name: 'FBA And FBM' },
]

const OOS_OPTIONS = [
  { id: 'show_oos', name: 'Show OOS Items' },
  { id: 'hide_oos', name: 'Hide OOS Items' },
]

const MARKETPLACES = [
  { id: 'Amazon.ca', name: 'Canada' },
  { id: 'Amazon.com', name: 'USA' },
  { id: 'Amazon.mx', name: 'Mexico' },
]

// ============================================
// SCREEN COMPONENT
// ============================================

export const InventoryPlannerScreen: React.FC = () => {
  // ---- Search ----
  const [searchTerm, setSearchTerm] = useState<string>('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  // ---- Selected products ----
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  // ---- Filter states (pending) ----
  const [pendingFilters, setPendingFilters] = useState<{
    fba: string[]
    marketplaces: string[]
    oos: string[]
  }>({
    fba: ['fba'],
    marketplaces: ['Amazon.ca', 'Amazon.com', 'Amazon.mx'],
    oos: ['show_oos'],
  })

  // ---- Applied filters (drive API) ----
  const [appliedFilters, setAppliedFilters] = useState<typeof pendingFilters>({ ...pendingFilters })

  // ---- Build API filters ----
  const filters = useMemo<InventoryPlannerFilters>(() => {
    const result: InventoryPlannerFilters = {}
    if (debouncedSearch) {
      result.search = debouncedSearch
    }
    if (appliedFilters.fba.length > 0) {
      result.fba = appliedFilters.fba
    }
    if (appliedFilters.marketplaces.length > 0) {
      result.marketplaces = appliedFilters.marketplaces
    }
    result.showOos = appliedFilters.oos.includes('show_oos')
    return result
  }, [debouncedSearch, appliedFilters])

  // ---- API Queries ----
  const { data: summaryData, isLoading: summaryLoading } = useGetInventorySummaryQuery(filters)
  const { data: products, isLoading: productsLoading } = useGetProductInventoryQuery(filters)

  // ---- Mock fallback ----
  const displaySummary = summaryData ?? mockInventorySummary
  const displayProducts = products ?? mockProductInventory

  // ---- Calculate totals ----
  const totalSummary = useMemo<SummaryTotals | null>(() => {
    if (!displaySummary || displaySummary.length === 0) return null
    return displaySummary.reduce<SummaryTotals>(
      (acc, item) => ({
        units: acc.units + (item.units ?? 0),
        costOfGoods: acc.costOfGoods + (item.costOfGoods ?? 0),
        potentialSales: acc.potentialSales + (item.potentialSales ?? 0),
        potentialProfit: acc.potentialProfit + (item.potentialProfit ?? 0),
      }),
      { units: 0, costOfGoods: 0, potentialSales: 0, potentialProfit: 0 }
    )
  }, [displaySummary])

  // ---- Location summaries ----
  const fbaFbmSummary = useMemo<SummaryItem>(() => {
    const found = displaySummary?.find((s) => s.location === 'fba')
    return {
      location: 'fba',
      units: found?.units ?? 0,
      costOfGoods: found?.costOfGoods ?? 0,
      potentialSales: found?.potentialSales ?? 0,
      potentialProfit: found?.potentialProfit ?? 0,
    }
  }, [displaySummary])

  const prepAwdSummary = useMemo<SummaryItem>(() => {
    const found = displaySummary?.find((s) => s.location === 'prep')
    return {
      location: 'prep',
      units: found?.units ?? 0,
      costOfGoods: found?.costOfGoods ?? 0,
      potentialSales: found?.potentialSales ?? 0,
      potentialProfit: found?.potentialProfit ?? 0,
    }
  }, [displaySummary])

  const orderedSummary = useMemo<SummaryItem>(() => {
    const found = displaySummary?.find((s) => s.location === 'ordered')
    return {
      location: 'ordered',
      units: found?.units ?? 0,
      costOfGoods: found?.costOfGoods ?? 0,
      potentialSales: found?.potentialSales ?? 0,
      potentialProfit: found?.potentialProfit ?? 0,
    }
  }, [displaySummary])

  // ---- Action Required summary ----
  const actionRequiredSummary = useMemo<ActionRequiredItem>(() => {
    const found = displaySummary?.find((s: any) => s.location === 'action_required')
    return {
      location: 'action_required',
      products: (found as unknown as ActionRequiredItem)?.products ?? 0,
      fundsNeeded: (found as unknown as ActionRequiredItem)?.fundsNeeded ?? 0,
      estMonthlySalesAtRisk: (found as unknown as ActionRequiredItem)?.estMonthlySalesAtRisk ?? 0,
      estMonthlyProfit: (found as unknown as ActionRequiredItem)?.estMonthlyProfit ?? 0,
    }
  }, [displaySummary])

  // ---- Product selection ----
  const handleProductSelect = useCallback((productId: string, selected: boolean) => {
    setSelectedProducts((prev) =>
      selected ? [...prev, productId] : prev.filter((id) => id !== productId)
    )
  }, [])

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected && displayProducts && displayProducts.length > 0) {
      setSelectedProducts(displayProducts.map((p) => p.id))
    } else {
      setSelectedProducts([])
    }
  }, [displayProducts])

  // ---- Apply filters ----
  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...pendingFilters })
  }, [pendingFilters])

  // ---- Summary Card ----
  interface SummaryCardProps {
    title: string
    color: string
    loading?: boolean
    children: React.ReactNode
  }

  const SummaryCard: React.FC<SummaryCardProps> = ({ title, color, loading = false, children }) => {
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
          {children}
        </CardContent>
      </Card>
    )
  }

  return (
    <Container size="full" className="py-8">
      {/* Header */}
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

              {/* Filters */}
              <div className="flex items-center gap-2 flex-shrink-0">
                
                <MultiSelectInput
                  title="FBA"
                  options={FBA_OPTIONS}
                  value={pendingFilters.fba}
                  onChange={(val: any) => setPendingFilters((prev) => ({ ...prev, fba: val }))}
                  placeholder="Select FBA"
                />

                <MultiSelectInput
                  title="Marketplace"
                  options={MARKETPLACES}
                  value={pendingFilters.marketplaces}
                  onChange={(val: any) => setPendingFilters((prev) => ({ ...prev, marketplaces: val }))}
                  placeholder="All marketplaces"
                />

                <MultiSelectInput
                  title="OOS"
                  options={OOS_OPTIONS}
                  value={pendingFilters.oos}
                  onChange={(val: any) => setPendingFilters((prev) => ({ ...prev, oos: val }))}
                  single
                  placeholder="Show OOS Items"
                />

                <div className="ml-2">
                  <Button
                    variant="primary"
                    onClick={handleApplyFilters}
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                      />
                    </svg>
                    Filter
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <SummaryCard title="Action required" color="border-t-warning-500" loading={summaryLoading}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-text-muted mb-1">Products</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatNumber(actionRequiredSummary.products)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Funds needed</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatCurrency(actionRequiredSummary.fundsNeeded)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Est. monthly sales at risk</div>
              <div className="font-semibold text-text-primary">
                {formatCurrency(actionRequiredSummary.estMonthlySalesAtRisk)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Est. monthly profit</div>
              <div className="font-semibold text-success-600">
                {formatCurrency(actionRequiredSummary.estMonthlyProfit)}
              </div>
            </div>
          </div>
        </SummaryCard>

        <SummaryCard title="Total" color="border-t-primary-600" loading={summaryLoading}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-text-muted mb-1">Units</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatNumber(totalSummary?.units ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Cost of goods</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatCurrency(totalSummary?.costOfGoods ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Potential sales</div>
              <div className="font-semibold text-text-primary">
                {formatCurrency(totalSummary?.potentialSales ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Potential profit</div>
              <div className="font-semibold text-success-600">
                {formatCurrency(totalSummary?.potentialProfit ?? 0)}
              </div>
            </div>
          </div>
        </SummaryCard>

        <SummaryCard title="FBA + FBM" color="border-t-info-600" loading={summaryLoading}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-text-muted mb-1">Units</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatNumber(fbaFbmSummary.units)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Cost of goods</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatCurrency(fbaFbmSummary.costOfGoods)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Potential sales</div>
              <div className="font-semibold text-text-primary">
                {formatCurrency(fbaFbmSummary.potentialSales)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Potential profit</div>
              <div className="font-semibold text-success-600">
                {formatCurrency(fbaFbmSummary.potentialProfit)}
              </div>
            </div>
          </div>
        </SummaryCard>

        <SummaryCard title="Prep. stock + AWD" color="border-t-teal-600" loading={summaryLoading}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-text-muted mb-1">Units</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatNumber(prepAwdSummary.units)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Cost of goods</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatCurrency(prepAwdSummary.costOfGoods)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Potential sales</div>
              <div className="font-semibold text-text-primary">
                {formatCurrency(prepAwdSummary.potentialSales)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Potential profit</div>
              <div className="font-semibold text-success-600">
                {formatCurrency(prepAwdSummary.potentialProfit)}
              </div>
            </div>
          </div>
        </SummaryCard>

        <SummaryCard title="Ordered" color="border-t-success-600" loading={summaryLoading}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-text-muted mb-1">Units</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatNumber(orderedSummary.units)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Cost of goods</div>
              <div className="font-semibold text-text-primary text-lg">
                {formatCurrency(orderedSummary.costOfGoods)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Potential sales</div>
              <div className="font-semibold text-text-primary">
                {formatCurrency(orderedSummary.potentialSales)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Potential profit</div>
              <div className="font-semibold text-success-600">
                {formatCurrency(orderedSummary.potentialProfit)}
              </div>
            </div>
          </div>
        </SummaryCard>
      </div>

      {/* Product Inventory */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-text-primary">Product inventory</h2>

        <ProductInventoryTable
          products={displayProducts}
          isLoading={productsLoading}
          searchTerm={debouncedSearch}
          selectedProducts={selectedProducts}
          onProductSelect={handleProductSelect}
          onSelectAll={handleSelectAll}
        />

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