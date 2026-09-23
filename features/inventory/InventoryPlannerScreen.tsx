"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
import { useDebounce } from '@/utils/debounce'
import {
  useGetInventorySummaryQuery,
  useGetProductInventoryQuery,
  usePushInventoryAllocationMutation,
  InventoryPlannerFilters,
} from '@/services/api/inventoryPlanner.api'
import { ProductInventoryTable } from './ProductInventoryTable'
import { formatCurrency, formatNumber } from '@/utils/format'
import { mockInventorySummary, mockProductInventory } from './mockData'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { AllocationDrawer } from '@/components/allocation-drawer/AllocationDrawer'

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
  
  // ---- Allocation Drawer state ----
  const [isAllocationOpen, setIsAllocationOpen] = useState(false)

  // ---- Header 3-Dots Dropdown State ----
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // ---- API Mutations & Queries ----
  const [pushAllocation, { isLoading: isPushing }] = usePushInventoryAllocationMutation()

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  // ---- Trigger Multi-Channel Stock Push ----
  const handlePushToChannels = async () => {
    setIsMenuOpen(false)

    const itemsToPush = displayProducts
      .filter((p) => selectedProducts.includes(p.id))
      .map((p) => ({
        productId: p.id,
        sku: p.sku,
        quantity: (p as any).fbaFbmStock ?? (p as any).stock ?? 45,
      }))

    if (itemsToPush.length === 0) return

    await pushAllocation({ items: itemsToPush })
  }

  // ---- Summary Card Component ----
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
      {/* Page Title & Multi-Channel Sync Status */}
      <div className="flex justify-between items-center mb-4 px-1">
        <h1 className="text-2xl font-bold text-text-primary">Inventory Planner</h1>
        <div className="flex items-center gap-2 bg-success-50 border border-success-200 text-success-700 px-3 py-1 rounded-full text-xs font-medium">
          <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
          <span>Multi-Channel Sync Active</span>
        </div>
      </div>

      {/* Search, Filters & Header Actions (3 Vertical Dots) */}
      <div className="mb-6">
        <div className="bg-surface-secondary border-b border-border-primary rounded-lg">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              
              {/* Search Bar */}
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

              {/* Multi-Select Filters */}
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

                <Button variant="primary" onClick={handleApplyFilters}>
                  Filter
                </Button>

                {/* 3 Vertical Dots Actions Menu */}
                <div className="relative ml-1" ref={menuRef}>
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2.5 bg-white dark:bg-slate-900 bg-surface-primary border border-border-primary hover:bg-slate-100 dark:hover:bg-slate-800 text-text-primary rounded-md transition-colors flex items-center justify-center shadow-sm"
                    title="More Options"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-border-primary rounded-md shadow-2xl z-50 overflow-hidden divide-y divide-border-primary ring-1 ring-black/10">
                      {selectedProducts.length > 0 && (
                        <div className="px-4 py-2 text-xs font-bold text-white bg-blue-600 flex items-center justify-between">
                          <span>{selectedProducts.length} Product{selectedProducts.length > 1 ? 's' : ''} Selected</span>
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        </div>
                      )}
                      
                      {/* Multi-Channel Allocation Push Action */}
                      <div className="py-1 bg-white dark:bg-slate-900">
                        <button
                          onClick={handlePushToChannels}
                          disabled={selectedProducts.length === 0 || isPushing}
                          className="w-full text-left px-4 py-2.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {isPushing ? 'Pushing Stock...' : 'Push Stock to All Channels'}
                        </button>

                        <button
                          onClick={() => {
                            setIsMenuOpen(false)
                            setIsAllocationOpen(true)
                          }}
                          disabled={selectedProducts.length === 0}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
                        >
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          Allocate FBM / FBA
                        </button>
                      </div>

                      <div className="py-1 bg-white dark:bg-slate-900">
                        <button
                          onClick={() => setIsMenuOpen(false)}
                          disabled={selectedProducts.length === 0}
                          className="w-full text-left px-4 py-2 text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Create shipment plan
                        </button>
                        <button
                          onClick={() => setIsMenuOpen(false)}
                          disabled={selectedProducts.length === 0}
                          className="w-full text-left px-4 py-2 text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Create purchase order
                        </button>
                      </div>

                      <div className="py-1 bg-white dark:bg-slate-900">
                        <button
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full text-left px-4 py-2 text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Import
                        </button>
                        <button
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full text-left px-4 py-2 text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Export
                        </button>
                      </div>
                    </div>
                  )}
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
              <div className="text-text-muted mb-1">Sales at risk</div>
              <div className="font-semibold text-text-primary">
                {formatCurrency(actionRequiredSummary.estMonthlySalesAtRisk)}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Monthly profit</div>
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

      {/* Product Inventory Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">Product inventory</h2>

        <ProductInventoryTable
          products={displayProducts as any}
          isLoading={productsLoading}
          searchTerm={debouncedSearch}
          selectedProducts={selectedProducts}
          onProductSelect={handleProductSelect}
          onSelectAll={handleSelectAll}
        />
      </div>

      {/* Slide-over Allocation Drawer */}
      <AllocationDrawer
        isOpen={isAllocationOpen}
        onClose={() => setIsAllocationOpen(false)}
        productIds={selectedProducts}
        products={displayProducts as any}
      />
    </Container>
  )
}