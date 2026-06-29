'use client'

import React, { useEffect } from 'react'
import { Container, PageHeader } from '@/components/layout'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setPpcMetricsFilters } from '@/store/ppcMetrics.slice'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import {
  useGetPPCMetricsQuery,
  useGetCampaignMetricsQuery,
  useGetAdGroupMetricsQuery,
  useGetKeywordMetricsQuery,
} from '@/services/api/ppcMetrics.api'
import { MetricsOverviewCard, MetricsTable, MetricsCharts } from '@/features/ppc/metrics'

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] || {})
  const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => row[h]).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function PpcMetricsPage() {
  const dispatch = useAppDispatch()
  const filters = useAppSelector((state) => state.ppcMetrics.filters)
  const { data: accounts } = useGetAccountsQuery()

  useEffect(() => {
    if (!filters.accountId && accounts?.length) {
      dispatch(setPpcMetricsFilters({ accountId: accounts[0].id }))
    }
  }, [accounts, dispatch, filters.accountId])

  const effectiveFilters = {
    ...filters,
    accountId: filters.accountId || '',
  }

  const { data: overview, isLoading: overviewLoading, error: overviewError } =
    useGetPPCMetricsQuery(effectiveFilters, { skip: !effectiveFilters.accountId })

  const { data: campaignMetrics, isLoading: campaignLoading, error: campaignError } =
    useGetCampaignMetricsQuery(effectiveFilters, { skip: !effectiveFilters.accountId })

  const { data: adGroupMetrics, isLoading: adGroupLoading, error: adGroupError } =
    useGetAdGroupMetricsQuery(effectiveFilters, { skip: !effectiveFilters.accountId })

  const { data: keywordMetrics, isLoading: keywordLoading, error: keywordError } =
    useGetKeywordMetricsQuery(effectiveFilters, { skip: !effectiveFilters.accountId })

  const handleExport = (type: 'campaigns' | 'adgroups' | 'keywords') => {
    const rows =
      type === 'campaigns'
        ? campaignMetrics?.data.map((item) => ({
            name: item.name,
            spend: item.spend,
            sales: item.sales,
            acos: item.acos,
            roi: item.roi,
          }))
        : type === 'adgroups'
          ? adGroupMetrics?.data.map((item) => ({
              name: item.name,
              spend: item.spend,
              sales: item.sales,
              acos: item.acos,
              roi: item.roi,
            }))
          : keywordMetrics?.data.map((item) => ({
              name: item.name,
              spend: item.spend,
              sales: item.sales,
              acos: item.acos,
              roi: item.roi,
            }))

    if (!rows || rows.length === 0) return
    downloadCsv(`ppc-metrics-${type}.csv`, rows)
  }

  return (
    <Container>
      <PageHeader title="PPC Performance Metrics" description="Analyze PPC performance by campaign, ad group, and keyword." />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Marketplace ID"
            value={filters.marketplaceId || ''}
            onChange={(e) => dispatch(setPpcMetricsFilters({ marketplaceId: e.target.value || undefined }))}
          />
          <Input
            label="SKU"
            value={filters.sku || ''}
            onChange={(e) => dispatch(setPpcMetricsFilters({ sku: e.target.value || undefined }))}
          />
          <Input
            label="Start Date"
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => dispatch(setPpcMetricsFilters({ startDate: e.target.value || undefined }))}
          />
          <Input
            label="End Date"
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => dispatch(setPpcMetricsFilters({ endDate: e.target.value || undefined }))}
          />
          <Select
            label="Period"
            options={[
              { label: 'Day', value: 'day' },
              { label: 'Week', value: 'week' },
              { label: 'Month', value: 'month' },
            ]}
            value={filters.period || 'day'}
            onChange={(e) => dispatch(setPpcMetricsFilters({ period: e.target.value as any }))}
          />
        </div>

        <MetricsOverviewCard data={overview} isLoading={overviewLoading} error={overviewError} />
        <MetricsCharts data={overview} isLoading={overviewLoading} error={overviewError} />

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => handleExport('campaigns')}>
            Export Campaigns (CSV)
          </Button>
          <Button variant="outline" onClick={() => handleExport('adgroups')}>
            Export Ad Groups (CSV)
          </Button>
          <Button variant="outline" onClick={() => handleExport('keywords')}>
            Export Keywords (CSV)
          </Button>
        </div>

        <MetricsTable
          title="Campaign Metrics"
          items={campaignMetrics?.data}
          isLoading={campaignLoading}
          error={campaignError}
        />
        <MetricsTable
          title="Ad Group Metrics"
          items={adGroupMetrics?.data}
          isLoading={adGroupLoading}
          error={adGroupError}
        />
        <MetricsTable
          title="Keyword Metrics"
          items={keywordMetrics?.data}
          isLoading={keywordLoading}
          error={keywordError}
        />
      </div>
    </Container>
  )
}

