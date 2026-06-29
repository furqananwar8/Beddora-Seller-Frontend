'use client'

import React, { useEffect } from 'react'
import { Container, PageHeader } from '@/components/layout'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setPpcFilters } from '@/store/ppcDashboard.slice'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import {
  useGetPPCOverviewQuery,
  useGetCampaignsQuery,
  useGetAdGroupsQuery,
  useGetKeywordsQuery,
} from '@/services/api/ppcDashboard.api'
import {
  PPCOverviewCard,
  CampaignTable,
  AdGroupTable,
  KeywordTable,
  PPCCharts,
} from './'

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

export const PPCDashboard: React.FC = () => {
  const dispatch = useAppDispatch()
  const filters = useAppSelector((state) => state.ppcDashboard.filters)
  const { data: accounts } = useGetAccountsQuery()

  useEffect(() => {
    if (!filters.accountId && accounts?.length) {
      dispatch(setPpcFilters({ accountId: accounts[0].id }))
    }
  }, [accounts, dispatch, filters.accountId])

  const effectiveFilters = {
    ...filters,
    accountId: filters.accountId || '',
  }

  const { data: overview, isLoading: overviewLoading, error: overviewError } =
    useGetPPCOverviewQuery(effectiveFilters, { skip: !effectiveFilters.accountId })

  const { data: campaigns, isLoading: campaignsLoading, error: campaignsError } =
    useGetCampaignsQuery(effectiveFilters, { skip: !effectiveFilters.accountId })

  const { data: adGroups, isLoading: adGroupsLoading, error: adGroupsError } =
    useGetAdGroupsQuery(effectiveFilters, { skip: !effectiveFilters.accountId })

  const { data: keywords, isLoading: keywordsLoading, error: keywordsError } =
    useGetKeywordsQuery(effectiveFilters, { skip: !effectiveFilters.accountId })

  const handleExport = (type: 'campaigns' | 'adgroups' | 'keywords') => {
    const rows =
      type === 'campaigns'
        ? campaigns?.data.map((item) => ({
            campaign: item.campaignName,
            status: item.status,
            spend: item.totalSpend,
            sales: item.totalSales,
            acos: item.acos,
            roi: item.roi,
          }))
        : type === 'adgroups'
          ? adGroups?.data.map((item) => ({
              adGroup: item.adGroupName,
              spend: item.spend,
              sales: item.sales,
              acos: item.acos,
              roi: item.roi,
            }))
          : keywords?.data.map((item) => ({
              keyword: item.keyword,
              matchType: item.matchType || '',
              spend: item.spend,
              sales: item.sales,
              acos: item.acos,
              roi: item.roi,
            }))

    if (!rows || rows.length === 0) return
    downloadCsv(`ppc-${type}.csv`, rows)
  }

  return (
    <Container>
      <PageHeader title="PPC Dashboard" description="Track PPC performance, ACOS, and ROI across campaigns." />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Marketplace ID"
            value={filters.marketplaceId || ''}
            onChange={(e) => dispatch(setPpcFilters({ marketplaceId: e.target.value || undefined }))}
          />
          <Input
            label="SKU"
            value={filters.sku || ''}
            onChange={(e) => dispatch(setPpcFilters({ sku: e.target.value || undefined }))}
          />
          <Input
            label="Start Date"
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => dispatch(setPpcFilters({ startDate: e.target.value || undefined }))}
          />
          <Input
            label="End Date"
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => dispatch(setPpcFilters({ endDate: e.target.value || undefined }))}
          />
          <Select
            label="Period"
            options={[
              { label: 'Day', value: 'day' },
              { label: 'Week', value: 'week' },
              { label: 'Month', value: 'month' },
            ]}
            value={filters.period || 'day'}
            onChange={(e) => dispatch(setPpcFilters({ period: e.target.value as any }))}
          />
        </div>

        <PPCOverviewCard data={overview} isLoading={overviewLoading} error={overviewError} />

        <PPCCharts data={overview} isLoading={overviewLoading} error={overviewError} />

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

        <CampaignTable items={campaigns?.data} isLoading={campaignsLoading} error={campaignsError} />
        <AdGroupTable items={adGroups?.data} isLoading={adGroupsLoading} error={adGroupsError} />
        <KeywordTable items={keywords?.data} isLoading={keywordsLoading} error={keywordsError} />
      </div>
    </Container>
  )
}

