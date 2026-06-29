'use client'

import React, { useEffect, useState } from 'react'
import { formatCurrency, formatPercentage } from '@/utils/format'
import { Button } from '@/design-system/buttons'
import { Container } from '@/components/layout'
import { PageHeader } from '@/components/layout'
import { ProfitSummaryCard, FiltersPanel, ProfitTrendChart as DashboardProfitTrendChart, ProfitBreakdownTable } from './'
import {
  useGetProfitSummaryQuery,
  useGetProfitByProductQuery,
  useGetProfitByMarketplaceQuery,
  useGetProfitTrendsQuery,
  ProfitFilters,
} from '@/services/api/profit.api'
import {
  useGetUnitsSoldKPIQuery,
  useGetReturnsCostKPIQuery,
  useGetAdvertisingCostKPIQuery,
  useGetFBAFeesKPIQuery,
  useGetPayoutEstimateKPIQuery,
  KPIFilters,
} from '@/services/api/kpis.api'
import { KpiCard } from '@/design-system/kpi'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setFilters } from '@/store/profit.slice'
import { setActiveKPI, setKPIFilters } from '@/store/profitKpis.slice'
import {
  setSelectedSKU,
  setShowForm,
  setEditingCOGSId,
  setShowHistorical,
} from '@/store/profitCogs.slice'
import {
  setExpenseFilters,
  setShowExpenseForm,
  setShowBulkImport,
  setEditingExpenseId,
} from '@/store/profitExpenses.slice'
import { setReturnFilters } from '@/store/profitReturns.slice'
import { setChartFilters } from '@/store/profitCharts.slice'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { COGSCard, COGSForm, COGSHistoricalTable } from '../cogs'
import { KPICard, KPITable } from '../kpis'
import {
  ExpenseSummaryCard,
  ExpenseTable,
  ExpenseForm,
  BulkImportModal,
} from '../expenses'
import { ReturnsSummaryCard, ReturnsTable, ReturnsChart } from '../returns'
import {
  FilterPanel as ChartsFilterPanel,
  ProfitTrendChart as AnalyticsProfitTrendChart,
  ProfitTrendChart,
  SalesTrendChart,
  PPCCostChart,
  ReturnsTrendChart,
  ComparisonChart,
} from '../charts'
import { RevenueProfitTrendCard } from './RevenueProfitTrendCard'
import { CostBreakdownChart } from './CostBreakdownChart'
import { TopProductsTable } from './TopProductsTable'
import { NavIcons } from '@/components/navigation/icons'
import {
  useGetCOGSBySKUQuery,
  useCreateCOGSMutation,
  useUpdateCOGSMutation,
  useGetCOGSHistoricalQuery,
  CreateCOGSRequest,
  UpdateCOGSRequest,
} from '@/services/api/cogs.api'
import {
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useBulkImportExpensesMutation,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  ExpenseFilters,
} from '@/services/api/expenses.api'
import {
  useGetReturnsQuery,
  useGetReturnsSummaryQuery,
  ReturnFilters,
} from '@/services/api/returns.api'
import {
  ChartFilters,
  useGetProfitTrendQuery,
  useGetSalesTrendQuery,
  useGetPpcTrendQuery,
  useGetReturnsTrendQuery,
  useGetComparisonQuery,
} from '@/services/api/charts.api'

/**
 * ProfitDashboard component
 * 
 * Main dashboard component for profit analysis
 * Integrates all profit components and provides real-time updates
 * 
 * Features:
 * - Real-time profit summary metrics
 * - Product and marketplace breakdowns
 * - Time-series trend charts
 * - Advanced filtering
 * - Responsive layout
 */
export const ProfitDashboard: React.FC = () => {
  const dispatch = useAppDispatch()
  const profitFilters = useAppSelector((state) => state.profit.filters)
  const kpiFilters = useAppSelector((state) => state.profitKpis.filters)
  const activeKPI = useAppSelector((state) => state.profitKpis.activeKPI)
  const selectedSKU = useAppSelector((state) => state.profitCogs.selectedSKU)
  const showCOGSForm = useAppSelector((state) => state.profitCogs.showForm)
  const editingCOGSId = useAppSelector((state) => state.profitCogs.editingCOGSId)
  const showCOGSHistorical = useAppSelector((state) => state.profitCogs.showHistorical)
  const expenseFilters = useAppSelector((state) => state.profitExpenses.filters)
  const showExpenseForm = useAppSelector((state) => state.profitExpenses.showForm)
  const showBulkImport = useAppSelector((state) => state.profitExpenses.showBulkImport)
  const editingExpenseId = useAppSelector((state) => state.profitExpenses.editingExpenseId)
  const returnFilters = useAppSelector((state) => state.profitReturns.filters)
  const chartFilters = useAppSelector((state) => state.profitCharts.filters)

  const [activeBreakdown, setActiveBreakdown] = useState<'product' | 'marketplace'>('product')

  // Fetch accounts for filter dropdown
  const { data: accountsData } = useGetAccountsQuery()

  useEffect(() => {
    if (!profitFilters.accountId && accountsData?.length) {
      dispatch(setFilters({ ...profitFilters, accountId: accountsData[0].id }))
    }
  }, [accountsData, dispatch, profitFilters])

  // Fetch profit data with current filters
  const {
    data: summaryData,
    isLoading: summaryLoading,
    error: summaryError,
  } = useGetProfitSummaryQuery(profitFilters)

  const {
    data: productData,
    isLoading: productLoading,
    error: productError,
  } = useGetProfitByProductQuery(profitFilters)

  const {
    data: marketplaceData,
    isLoading: marketplaceLoading,
    error: marketplaceError,
  } = useGetProfitByMarketplaceQuery(profitFilters)

  const {
    data: trendsData,
    isLoading: trendsLoading,
    error: trendsError,
  } = useGetProfitTrendsQuery(profitFilters)

  const effectiveExpenseFilters = {
    ...expenseFilters,
    accountId: profitFilters.accountId || accountsData?.[0]?.id,
  }

  const {
    data: expensesResponse,
    isLoading: expensesLoading,
    error: expensesError,
  } = useGetExpensesQuery(effectiveExpenseFilters, {
    skip: !effectiveExpenseFilters.accountId,
  })

  const effectiveReturnFilters: ReturnFilters = {
    ...returnFilters,
    accountId: profitFilters.accountId || accountsData?.[0]?.id,
    marketplaceId: profitFilters.marketplaceId,
    sku: profitFilters.sku,
  }

  const {
    data: returnsData,
    isLoading: returnsLoading,
    error: returnsError,
  } = useGetReturnsQuery(effectiveReturnFilters, {
    skip: !effectiveReturnFilters.accountId,
  })

  const {
    data: returnsSummary,
    isLoading: returnsSummaryLoading,
    error: returnsSummaryError,
  } = useGetReturnsSummaryQuery(effectiveReturnFilters, {
    skip: !effectiveReturnFilters.accountId,
  })

  const effectiveChartFilters: ChartFilters = {
    ...chartFilters,
    accountId: profitFilters.accountId || accountsData?.[0]?.id,
    amazonAccountId: profitFilters.amazonAccountId,
    marketplaceId: profitFilters.marketplaceId,
    sku: profitFilters.sku,
  }

  const {
    data: profitTrendData,
    isLoading: profitTrendLoading,
    error: profitTrendError,
  } = useGetProfitTrendQuery(effectiveChartFilters, { skip: !effectiveChartFilters.accountId })

  const {
    data: salesTrendData,
    isLoading: salesTrendLoading,
    error: salesTrendError,
  } = useGetSalesTrendQuery(effectiveChartFilters, { skip: !effectiveChartFilters.accountId })

  const {
    data: ppcTrendData,
    isLoading: ppcTrendLoading,
    error: ppcTrendError,
  } = useGetPpcTrendQuery(effectiveChartFilters, { skip: !effectiveChartFilters.accountId })

  const {
    data: returnsTrendData,
    isLoading: returnsTrendLoading,
    error: returnsTrendError,
  } = useGetReturnsTrendQuery(effectiveChartFilters, { skip: !effectiveChartFilters.accountId })

  const {
    data: comparisonData,
    isLoading: comparisonLoading,
    error: comparisonError,
  } = useGetComparisonQuery(
    {
      ...effectiveChartFilters,
      metric: 'profit',
    },
    { skip: !effectiveChartFilters.accountId }
  )

  const [createExpense, { isLoading: isCreatingExpense }] = useCreateExpenseMutation()
  const [updateExpense, { isLoading: isUpdatingExpense }] = useUpdateExpenseMutation()
  const [deleteExpense] = useDeleteExpenseMutation()
  const [bulkImportExpenses, { isLoading: isBulkImporting }] = useBulkImportExpensesMutation()

  // Fetch KPI data
  const kpiQueryFilters: KPIFilters = {
    ...kpiFilters,
    accountId: profitFilters.accountId,
    amazonAccountId: profitFilters.amazonAccountId,
    marketplaceId: profitFilters.marketplaceId,
    sku: profitFilters.sku,
    startDate: profitFilters.startDate,
    endDate: profitFilters.endDate,
  }

  const {
    data: unitsSoldData,
    isLoading: unitsSoldLoading,
    error: unitsSoldError,
  } = useGetUnitsSoldKPIQuery(kpiQueryFilters)

  const {
    data: returnsCostData,
    isLoading: returnsCostLoading,
    error: returnsCostError,
  } = useGetReturnsCostKPIQuery(kpiQueryFilters)

  const {
    data: advertisingCostData,
    isLoading: advertisingCostLoading,
    error: advertisingCostError,
  } = useGetAdvertisingCostKPIQuery(kpiQueryFilters)

  const {
    data: fbaFeesData,
    isLoading: fbaFeesLoading,
    error: fbaFeesError,
  } = useGetFBAFeesKPIQuery(kpiQueryFilters)

  const {
    data: payoutEstimateData,
    isLoading: payoutEstimateLoading,
    error: payoutEstimateError,
  } = useGetPayoutEstimateKPIQuery(kpiQueryFilters)

  // Handle filter changes
  const handleFiltersChange = (newFilters: ProfitFilters) => {
    dispatch(setFilters(newFilters))
    // Sync KPI filters with profit filters
    dispatch(
      setKPIFilters({
        accountId: newFilters.accountId,
        amazonAccountId: newFilters.amazonAccountId,
        marketplaceId: newFilters.marketplaceId,
        sku: newFilters.sku,
        startDate: newFilters.startDate,
        endDate: newFilters.endDate,
        period: newFilters.period || 'day',
      })
    )
    dispatch(
      setExpenseFilters({
        ...expenseFilters,
        accountId: newFilters.accountId,
        marketplaceId: newFilters.marketplaceId,
        sku: newFilters.sku,
        startDate: newFilters.startDate,
        endDate: newFilters.endDate,
      })
    )
    dispatch(
      setReturnFilters({
        ...returnFilters,
        accountId: newFilters.accountId,
        marketplaceId: newFilters.marketplaceId,
        sku: newFilters.sku,
        startDate: newFilters.startDate,
        endDate: newFilters.endDate,
      })
    )
    dispatch(
      setChartFilters({
        ...chartFilters,
        accountId: newFilters.accountId,
        amazonAccountId: newFilters.amazonAccountId,
        marketplaceId: newFilters.marketplaceId,
        sku: newFilters.sku,
        startDate: newFilters.startDate,
        endDate: newFilters.endDate,
      })
    )
  }

  // Handle KPI drill-down
  const handleKPIDrillDown = (kpiType: 'units-sold' | 'returns-cost' | 'advertising-cost' | 'fba-fees' | 'payout-estimate') => {
    dispatch(setActiveKPI(kpiType))
  }

  const handleExpenseFiltersChange = (newFilters: ExpenseFilters) => {
    dispatch(setExpenseFilters(newFilters))
  }

  const handleReturnFiltersChange = (newFilters: ReturnFilters) => {
    dispatch(setReturnFilters(newFilters))
  }

  const handleChartFiltersChange = (newFilters: ChartFilters) => {
    dispatch(setChartFilters(newFilters))
  }

  const handleExpenseSubmit = async (data: CreateExpenseRequest | UpdateExpenseRequest) => {
    try {
      if (editingExpenseId) {
        await updateExpense({ id: editingExpenseId, data: data as UpdateExpenseRequest }).unwrap()
      } else {
        await createExpense(data as CreateExpenseRequest).unwrap()
      }
      dispatch(setShowExpenseForm(false))
      dispatch(setEditingExpenseId(null))
    } catch (error) {
      console.error('Failed to save expense', error)
    }
  }

  const handleExpenseDelete = async (expenseId: string) => {
    try {
      await deleteExpense(expenseId).unwrap()
    } catch (error) {
      console.error('Failed to delete expense', error)
    }
  }

  const handleBulkImport = async (payload: { accountId: string; file: File }) => {
    try {
      await bulkImportExpenses(payload).unwrap()
    } catch (error) {
      console.error('Failed to bulk import expenses', error)
    }
  }

  // COGS queries
  const {
    data: cogsData,
    isLoading: cogsLoading,
    error: cogsError,
  } = useGetCOGSBySKUQuery(
    {
      sku: selectedSKU || '',
      accountId: profitFilters.accountId || accountsData?.[0]?.id || '',
    },
    { skip: !selectedSKU || !profitFilters.accountId }
  )

  const {
    data: cogsHistoricalData,
    isLoading: cogsHistoricalLoading,
    error: cogsHistoricalError,
  } = useGetCOGSHistoricalQuery(
    {
      accountId: profitFilters.accountId || accountsData?.[0]?.id || '',
      sku: selectedSKU || undefined,
      marketplaceId: profitFilters.marketplaceId,
      startDate: profitFilters.startDate,
      endDate: profitFilters.endDate,
    },
    { skip: !profitFilters.accountId || !showCOGSHistorical }
  )

  const [createCOGS, { isLoading: isCreatingCOGS }] = useCreateCOGSMutation()
  const [updateCOGS, { isLoading: isUpdatingCOGS }] = useUpdateCOGSMutation()

  // Handle COGS form submission
  const handleCOGSSubmit = async (data: CreateCOGSRequest | UpdateCOGSRequest) => {
    try {
      if (editingCOGSId) {
        await updateCOGS({ id: editingCOGSId, data: data as UpdateCOGSRequest }).unwrap()
      } else {
        await createCOGS(data as CreateCOGSRequest).unwrap()
      }
      dispatch(setShowForm(false))
      dispatch(setEditingCOGSId(null))
    } catch (error) {
      console.error('Failed to save COGS', error)
    }
  }

  // Handle SKU selection from product breakdown
  const handleSKUSelect = (sku: string) => {
    dispatch(setSelectedSKU(sku))
  }

  // Extract marketplaces from accounts
  const marketplaces =
    accountsData?.flatMap((account) =>
      account.marketplaces.map((mp) => ({
        id: mp.id,
        name: mp.name,
        code: mp.code,
      }))
    ) || []

  return (
    <Container>
      <PageHeader
        title="Profit Dashboard"
        description="Real-time profit analysis and financial metrics"
      />

      <div className="space-y-6">
        {/* Filters Panel */}
        <FiltersPanel
          filters={profitFilters}
          onFiltersChange={handleFiltersChange}
          accounts={accountsData?.map((acc) => ({ id: acc.id, name: acc.name })) || []}
          marketplaces={marketplaces}
        />

        {/* Profit Summary */}
        <ProfitSummaryCard
          data={summaryData}
          isLoading={summaryLoading}
          error={summaryError}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            type="units-sold"
            title="Units Sold"
            value={unitsSoldData?.totalUnits || 0}
            subtitle={`${unitsSoldData?.breakdown.length || 0} products`}
            isLoading={unitsSoldLoading}
            error={unitsSoldError}
            onDrillDown={() => handleKPIDrillDown('units-sold')}
            color="blue"
          />
          <KPICard
            type="returns-cost"
            title="Returns Cost"
            value={returnsCostData?.totalReturnsCost || 0}
            subtitle={`${returnsCostData?.totalReturnsCount || 0} returns`}
            isLoading={returnsCostLoading}
            error={returnsCostError}
            onDrillDown={() => handleKPIDrillDown('returns-cost')}
            color="red"
          />
          <KPICard
            type="advertising-cost"
            title="Advertising Cost"
            value={advertisingCostData?.totalSpend || 0}
            subtitle={`ACOS: ${advertisingCostData?.averageACOS ? `${advertisingCostData.averageACOS.toFixed(1)}%` : 'N/A'}`}
            isLoading={advertisingCostLoading}
            error={advertisingCostError}
            onDrillDown={() => handleKPIDrillDown('advertising-cost')}
            color="orange"
          />
          <KPICard
            type="fba-fees"
            title="FBA Fees"
            value={fbaFeesData?.totalFBAFees || 0}
            subtitle={`${fbaFeesData?.breakdown.length || 0} fee types`}
            isLoading={fbaFeesLoading}
            error={fbaFeesError}
            onDrillDown={() => handleKPIDrillDown('fba-fees')}
            color="purple"
          />
          <KPICard
            type="payout-estimate"
            title="Payout Estimate"
            value={payoutEstimateData?.estimatedPayout || 0}
            subtitle={`After ${formatCurrency(payoutEstimateData?.totalDeductions || 0)} deductions`}
            isLoading={payoutEstimateLoading}
            error={payoutEstimateError}
            onDrillDown={() => handleKPIDrillDown('payout-estimate')}
            color="green"
          />
        </div>

        {/* KPI Drill-Down Tables */}
        {activeKPI && (
          <div>
            {activeKPI === 'units-sold' && (
              <KPITable
                type="units-sold"
                unitsSoldData={unitsSoldData}
                isLoading={unitsSoldLoading}
                error={unitsSoldError}
              />
            )}
            {activeKPI === 'returns-cost' && (
              <KPITable
                type="returns-cost"
                returnsCostData={returnsCostData}
                isLoading={returnsCostLoading}
                error={returnsCostError}
              />
            )}
            {activeKPI === 'advertising-cost' && (
              <KPITable
                type="advertising-cost"
                advertisingCostData={advertisingCostData}
                isLoading={advertisingCostLoading}
                error={advertisingCostError}
              />
            )}
            {activeKPI === 'fba-fees' && (
              <KPITable
                type="fba-fees"
                fbaFeesData={fbaFeesData}
                isLoading={fbaFeesLoading}
                error={fbaFeesError}
              />
            )}
            {activeKPI === 'payout-estimate' && (
              <KPITable
                type="payout-estimate"
                payoutEstimateData={payoutEstimateData}
                isLoading={payoutEstimateLoading}
                error={payoutEstimateError}
              />
            )}
            <div className="mt-4">
              <button
                onClick={() => dispatch(setActiveKPI(null))}
                className="px-4 py-2 bg-secondary-200 text-secondary-700 rounded-lg hover:bg-secondary-300 transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        )}

        {/* Expenses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Expenses</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => dispatch(setShowExpenseForm(true))}>
                Add Expense
              </Button>
              <Button variant="outline" onClick={() => dispatch(setShowBulkImport(true))}>
                Bulk Import
              </Button>
            </div>
          </div>

          <ExpenseSummaryCard
            summary={expensesResponse?.summary}
            currency="USD"
            isLoading={expensesLoading}
            error={expensesError}
          />

          <ExpenseTable
            expenses={expensesResponse?.data}
            filters={expenseFilters}
            onFiltersChange={handleExpenseFiltersChange}
            marketplaces={marketplaces}
            isLoading={expensesLoading}
            error={expensesError}
            onEdit={(expense) => dispatch(setEditingExpenseId(expense.id))}
            onDelete={(expense) => handleExpenseDelete(expense.id)}
          />

          {showExpenseForm && (
            <ExpenseForm
              accountId={effectiveExpenseFilters.accountId || ''}
              marketplaces={marketplaces}
              initialData={
                expensesResponse?.data?.find((item) => item.id === editingExpenseId) || undefined
              }
              onSubmit={handleExpenseSubmit}
              onCancel={() => {
                dispatch(setShowExpenseForm(false))
                dispatch(setEditingExpenseId(null))
              }}
              isLoading={isCreatingExpense || isUpdatingExpense}
            />
          )}

          <BulkImportModal
            isOpen={showBulkImport}
            onClose={() => dispatch(setShowBulkImport(false))}
            accountId={effectiveExpenseFilters.accountId || ''}
            onImport={handleBulkImport}
            isLoading={isBulkImporting}
          />
        </div>

        {/* Returns Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Returns & Refunds</h2>
          </div>

          <ReturnsSummaryCard
            summary={returnsSummary}
            currency="USD"
            isLoading={returnsSummaryLoading}
            error={returnsSummaryError}
          />

          <ReturnsChart
            summary={returnsSummary}
            currency="USD"
            isLoading={returnsSummaryLoading}
            error={returnsSummaryError}
          />

          <ReturnsTable
            returns={returnsData}
            filters={returnFilters}
            onFiltersChange={handleReturnFiltersChange}
            marketplaces={marketplaces}
            isLoading={returnsLoading}
            error={returnsError}
          />
        </div>

        {/* Trend & Chart Analytics */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Trend & Chart Analytics</h2>
          </div>

          <ChartsFilterPanel
            filters={chartFilters}
            onFiltersChange={handleChartFiltersChange}
            marketplaces={marketplaces}
          />

          <AnalyticsProfitTrendChart
            data={profitTrendData}
            isLoading={profitTrendLoading}
            error={profitTrendError}
          />

          <SalesTrendChart
            data={salesTrendData}
            isLoading={salesTrendLoading}
            error={salesTrendError}
          />

          <PPCCostChart
            data={ppcTrendData}
            isLoading={ppcTrendLoading}
            error={ppcTrendError}
          />

          <ReturnsTrendChart
            data={returnsTrendData}
            isLoading={returnsTrendLoading}
            error={returnsTrendError}
          />

          <ComparisonChart
            data={comparisonData}
            isLoading={comparisonLoading}
            error={comparisonError}
          />
        </div>

        {/* Profit Trends Chart */}
        <DashboardProfitTrendChart
          data={trendsData}
          isLoading={trendsLoading}
          error={trendsError}
        />

        {/* Breakdown Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveBreakdown('product')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeBreakdown === 'product'
                ? 'bg-primary-600 text-white'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
            }`}
          >
            By Product
          </button>
          <button
            onClick={() => setActiveBreakdown('marketplace')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeBreakdown === 'marketplace'
                ? 'bg-primary-600 text-white'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
            }`}
          >
            By Marketplace
          </button>
        </div>

        {/* Profit Breakdown Table */}
        {activeBreakdown === 'product' ? (
          <ProfitBreakdownTable
            type="product"
            productData={productData}
            isLoading={productLoading}
            error={productError}
            onSKUClick={handleSKUSelect}
          />
        ) : (
          <ProfitBreakdownTable
            type="marketplace"
            marketplaceData={marketplaceData}
            isLoading={marketplaceLoading}
            error={marketplaceError}
          />
        )}

        {/* COGS Section */}
        {(selectedSKU || showCOGSForm || showCOGSHistorical) && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">COGS Management</h2>
              <div className="flex gap-2">
                {selectedSKU && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => dispatch(setShowForm(true))}
                    >
                      Add COGS Entry
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => dispatch(setShowHistorical(!showCOGSHistorical))}
                    >
                      {showCOGSHistorical ? 'Hide' : 'Show'} History
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        dispatch(setSelectedSKU(null))
                        dispatch(setShowForm(false))
                        dispatch(setShowHistorical(false))
                      }}
                    >
                      Close
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* COGS Card */}
            {selectedSKU && (
              <COGSCard
                data={cogsData}
                isLoading={cogsLoading}
                error={cogsError}
                onEdit={() => {
                  // For now, just show form. In production, you'd load the specific entry
                  dispatch(setShowForm(true))
                }}
              />
            )}

            {/* COGS Form */}
            {showCOGSForm && (
              <COGSForm
                accountId={profitFilters.accountId || accountsData?.[0]?.id || ''}
                sku={selectedSKU || undefined}
                marketplaceId={profitFilters.marketplaceId}
                marketplaces={marketplaces}
                onSubmit={handleCOGSSubmit}
                onCancel={() => {
                  dispatch(setShowForm(false))
                  dispatch(setEditingCOGSId(null))
                }}
                isLoading={isCreatingCOGS || isUpdatingCOGS}
              />
            )}

            {/* COGS Historical Table */}
            {showCOGSHistorical && (
              <COGSHistoricalTable
                data={cogsHistoricalData}
                isLoading={cogsHistoricalLoading}
                error={cogsHistoricalError}
              />
            )}
          </div>
        )}

        {/* Quick SKU Selection from Product Table */}
        {activeBreakdown === 'product' && productData && productData.length > 0 && (
          <div className="mt-4 p-4 bg-secondary-50 rounded-lg">
            <p className="text-sm text-secondary-600 mb-2">
              Click a SKU in the table above to view/manage its COGS
            </p>
            <div className="flex flex-wrap gap-2">
              {productData.slice(0, 10).map((product) => (
                <button
                  key={product.sku}
                  onClick={() => handleSKUSelect(product.sku)}
                  className="px-3 py-1 bg-white border border-secondary-200 rounded hover:bg-secondary-100 text-sm font-mono"
                >
                  {product.sku}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

