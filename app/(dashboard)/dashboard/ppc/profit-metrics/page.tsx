'use client'

import React, { useEffect, useState } from 'react'
import { Container, PageHeader } from '@/components/layout'
import { Input, Select } from '@/design-system/inputs'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setPpcProfitMetricsFilters } from '@/store/ppcProfitMetrics.slice'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import {
  useFetchPPCProfitMetrics,
  useFetchCampaignProfit,
  useFetchAdGroupProfit,
  useFetchKeywordProfit,
} from '@/features/ppc/profit-metrics/hooks'
import {
  ProfitMetricsCharts,
  ProfitMetricsOverview,
  ProfitMetricsTable,
} from '@/features/ppc/profit-metrics'

export default function PPCProfitMetricsPage() {
  const dispatch = useAppDispatch()
  const filters = useAppSelector((state) => state.ppcProfitMetrics.filters)
  const { data: accounts } = useGetAccountsQuery()
  const [view, setView] = useState<'campaigns' | 'adGroups' | 'keywords'>('campaigns')

  useEffect(() => {
    if (!filters.accountId && accounts?.length) {
      dispatch(setPpcProfitMetricsFilters({ accountId: accounts[0].id }))
    }
  }, [accounts, dispatch, filters.accountId])

  const effectiveFilters = {
    ...filters,
    accountId: filters.accountId || '',
  }

  const { data: overview, isLoading: overviewLoading, error: overviewError } =
    useFetchPPCProfitMetrics(effectiveFilters, { skip: !effectiveFilters.accountId })

  const { data: campaigns, isLoading: campaignsLoading, error: campaignsError } =
    useFetchCampaignProfit(effectiveFilters, { skip: !effectiveFilters.accountId })

  const { data: adGroups, isLoading: adGroupsLoading, error: adGroupsError } =
    useFetchAdGroupProfit(effectiveFilters, { skip: !effectiveFilters.accountId })

  const { data: keywords, isLoading: keywordsLoading, error: keywordsError } =
    useFetchKeywordProfit(effectiveFilters, { skip: !effectiveFilters.accountId })

  const tableProps =
    view === 'campaigns'
      ? { title: 'Campaign Profit Metrics', items: campaigns?.data, isLoading: campaignsLoading, error: campaignsError }
      : view === 'adGroups'
        ? { title: 'Ad Group Profit Metrics', items: adGroups?.data, isLoading: adGroupsLoading, error: adGroupsError }
        : { title: 'Keyword Profit Metrics', items: keywords?.data, isLoading: keywordsLoading, error: keywordsError }

  return (
    <Container>
      <PageHeader
        title="PPC Profit Metrics"
        description="Track break-even ACOS, estimated profit, and suggested bids across PPC entities."
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input
            label="Marketplace ID"
            value={filters.marketplaceId || ''}
            onChange={(e) => dispatch(setPpcProfitMetricsFilters({ marketplaceId: e.target.value || undefined }))}
          />
          <Input
            label="SKU"
            value={filters.sku || ''}
            onChange={(e) => dispatch(setPpcProfitMetricsFilters({ sku: e.target.value || undefined }))}
          />
          <Input
            label="Start Date"
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => dispatch(setPpcProfitMetricsFilters({ startDate: e.target.value || undefined }))}
          />
          <Input
            label="End Date"
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => dispatch(setPpcProfitMetricsFilters({ endDate: e.target.value || undefined }))}
          />
          <Select
            label="Period"
            options={[
              { label: 'Day', value: 'day' },
              { label: 'Week', value: 'week' },
              { label: 'Month', value: 'month' },
            ]}
            value={filters.period || 'day'}
            onChange={(e) => dispatch(setPpcProfitMetricsFilters({ period: e.target.value as any }))}
          />
        </div>

        <ProfitMetricsOverview data={overview} />

        <ProfitMetricsCharts data={overview} isLoading={overviewLoading} error={overviewError} />

        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">View</div>
          <Select
            label=""
            options={[
              { label: 'Campaigns', value: 'campaigns' },
              { label: 'Ad Groups', value: 'adGroups' },
              { label: 'Keywords', value: 'keywords' },
            ]}
            value={view}
            onChange={(e) => setView(e.target.value as any)}
            className="w-44"
          />
        </div>

        <ProfitMetricsTable {...tableProps} />
      </div>
    </Container>
  )
}

