"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Container, PageHeader } from '@/components/layout'
import { KpiCard } from '@/design-system/kpi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setFilters } from '@/store/profit.slice'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { useGetProfitSummaryQuery, useGetProfitByProductQuery, ProfitFilters } from '@/services/api/profit.api'
import { useGetUnitsSoldKPIQuery, useGetAdvertisingCostKPIQuery, KPIFilters } from '@/services/api/kpis.api'
import { useGetProfitTrendQuery, ChartPeriod } from '@/services/api/charts.api'
import { RevenueProfitTrendCard } from '../dashboard/RevenueProfitTrendCard'
import { CostBreakdownChart } from '../dashboard/CostBreakdownChart'
import { TopProductsTable } from '../dashboard/TopProductsTable'
import { NavIcons } from '@/components/navigation/icons'
import { formatCurrency, formatPercentage } from '@/utils/format'

export const ProfitAnalytics: React.FC = () => {
  const dispatch = useAppDispatch()
  const profitFilters = useAppSelector((state) => state.profit.filters)
  const { data: accountsData } = useGetAccountsQuery()
  const [trendPeriod, setTrendPeriod] = useState<ChartPeriod>('month')

  useEffect(() => {
    if (!profitFilters.accountId && accountsData?.length) {
      dispatch(setFilters({ ...profitFilters, accountId: accountsData[0].id }))
    }
  }, [accountsData, dispatch, profitFilters])

  const effectiveAccountId = profitFilters.accountId || accountsData?.[0]?.id
  const profitQueryFilters: ProfitFilters = useMemo(
    () => ({
      ...profitFilters,
      accountId: effectiveAccountId,
    }),
    [profitFilters, effectiveAccountId]
  )

  const {
    data: summaryData,
    isLoading: summaryLoading,
    error: summaryError,
  } = useGetProfitSummaryQuery(profitQueryFilters, { skip: !effectiveAccountId })

  const {
    data: productData,
    isLoading: productLoading,
    error: productError,
  } = useGetProfitByProductQuery(profitQueryFilters, { skip: !effectiveAccountId })

  const chartFilters = {
    accountId: effectiveAccountId,
    amazonAccountId: profitFilters.amazonAccountId,
    marketplaceId: profitFilters.marketplaceId,
    sku: profitFilters.sku,
    startDate: profitFilters.startDate,
    endDate: profitFilters.endDate,
    period: trendPeriod,
  }

  const {
    data: profitTrendData,
    isLoading: profitTrendLoading,
    error: profitTrendError,
  } = useGetProfitTrendQuery(chartFilters, { skip: !effectiveAccountId })

  const kpiQueryFilters: KPIFilters = {
    accountId: effectiveAccountId,
    amazonAccountId: profitFilters.amazonAccountId,
    marketplaceId: profitFilters.marketplaceId,
    sku: profitFilters.sku,
    startDate: profitFilters.startDate,
    endDate: profitFilters.endDate,
    period: (trendPeriod === 'year' || trendPeriod === 'quarter' ? 'month' : trendPeriod) as 'day' | 'week' | 'month' | 'hour' | 'custom' | undefined,
  }

  const { data: unitsSoldData } = useGetUnitsSoldKPIQuery(kpiQueryFilters, { skip: !effectiveAccountId })
  const {
    data: advertisingCostData,
    isLoading: advertisingCostLoading,
    error: advertisingCostError,
  } = useGetAdvertisingCostKPIQuery(kpiQueryFilters, { skip: !effectiveAccountId })

  return (
    <Container>
      <PageHeader
        title="Profit Dashboard"
        description="Overview of your Amazon business performance"
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="Total Revenue"
            value={formatCurrency(summaryData?.salesRevenue || 0)}
            subtitle="vs last period"
            icon={NavIcons.profit}
            iconClassName="text-success-600"
          />
          <KpiCard
            title="Net Profit"
            value={formatCurrency(summaryData?.netProfit || 0)}
            subtitle="vs last period"
            icon={NavIcons.analytics}
            iconClassName="text-success-600"
          />
          <KpiCard
            title="Profit Margin"
            value={formatPercentage(summaryData?.netMargin || 0)}
            subtitle="vs last period"
            icon={NavIcons.dashboard}
            iconClassName="text-primary-600"
          />
          <KpiCard
            title="Units Sold"
            value={unitsSoldData?.totalUnits || 0}
            subtitle="vs last period"
            icon={NavIcons.orders}
            iconClassName="text-primary-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueProfitTrendCard
              data={profitTrendData}
              period={trendPeriod}
              onPeriodChange={setTrendPeriod}
              isLoading={profitTrendLoading}
              error={profitTrendError}
            />
          </div>
          <CostBreakdownChart
            summary={summaryData}
            ppcData={advertisingCostData}
            isLoading={summaryLoading || advertisingCostLoading}
            error={summaryError || advertisingCostError}
          />
        </div>

        <TopProductsTable
          products={productData}
          isLoading={productLoading}
          error={productError}
        />
      </div>
    </Container>
  )
}

