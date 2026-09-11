'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Card, CardContent } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import { useGetProductTrendsQuery, ProfitFilters } from '@/services/api/profit.api'
import { ErrorComponent } from './ErrorComponent'
import { TrendsTable } from './TrendsTable'
import { MetricTabs, TrendMetric } from './MetricTabs'
import { cn } from '@/utils/cn'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { setFilters } from '@/store/profit.slice'

type Periodicity = 'day' | 'week' | 'month'

export interface TrendsComponentProps {
  startDate?: string
  endDate?: string
  periodicity?: Periodicity
  accountId?: string
  marketplaces?: string[]
  currency?: string
  searchTerm?: string
  className?: string
}

export const TrendsComponent: React.FC<TrendsComponentProps> = ({
  startDate,
  endDate,
  periodicity = 'day',
  accountId: initialAccountId,
  marketplaces,
  currency = 'CAD',
  searchTerm = '',
  className,
}) => {
  const dispatch = useAppDispatch()
  const profitFilters = useAppSelector((state) => state.profit.filters)
  const { data: accountsData, isLoading: accountsLoading } = useGetAccountsQuery()

  const [metric, setMetric] = useState<TrendMetric>('sales')
  const [heatmapEnabled, setHeatmapEnabled] = useState(false)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  const effectiveAccountId = useMemo(
    () => initialAccountId || profitFilters.accountId || accountsData?.[0]?.id,
    [initialAccountId, profitFilters.accountId, accountsData]
  )

  useEffect(() => {
    if (!profitFilters.accountId && accountsData?.length && accountsData[0]?.id) {
      dispatch(setFilters({ ...profitFilters, accountId: accountsData[0].id }))
    }
  }, [accountsData, dispatch, profitFilters])

  const filters = useMemo<
    ProfitFilters & {
      metric?: string
      periodicity?: Periodicity
      page?: number
      limit?: number
      marketplaceId?: string
      marketplaces?: string[]
    }
  >(
    () => ({
      startDate,
      endDate,
      accountId: effectiveAccountId,
      marketplaceId: marketplaces?.[0],
      marketplaces,
      metric,
      periodicity,
      currency,
      page,
      limit,
    }),
    [
      startDate,
      endDate,
      effectiveAccountId,
      marketplaces,
      metric,
      periodicity,
      currency,
      page,
      limit,
    ]
  )

  const {
    data: trendsData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetProductTrendsQuery(filters, {
    skip: !startDate || !endDate || !effectiveAccountId,
  })

  const showLoading = isLoading || accountsLoading
  const showError = !showLoading && isError
  const hasData =
    trendsData &&
    (Array.isArray(trendsData.products)
      ? trendsData.products.length > 0
      : typeof trendsData === 'object' && Object.keys(trendsData).length > 0)
  const showEmpty = !showLoading && !showError && !hasData
  const showTable = !showLoading && !showError && hasData

  return (
    <div className={cn('w-full', className)}>
      {/* Metric Tabs Header & Heatmap Toggle */}
      <div className="mb-4 pt-2 overflow-visible">
        <div className="flex flex-col gap-3 overflow-visible lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-full overflow-visible">
            <MetricTabs
              value={metric}
              onChange={(m) => {
                setMetric(m)
                setPage(1)
              }}
            />
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-sm font-medium text-text-primary">Heatmap</span>

            <button
              type="button"
              role="switch"
              aria-checked={heatmapEnabled}
              aria-label="Toggle heatmap"
              onClick={() => setHeatmapEnabled(!heatmapEnabled)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
                'border transition-all duration-200 ease-in-out',
                'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2',
                heatmapEnabled
                  ? 'border-primary-600 bg-primary-600 hover:bg-primary-700'
                  : 'border-border-strong bg-surface-secondary hover:border-text-muted hover:bg-surface-tertiary'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 rounded-full',
                  'bg-white shadow-sm ring-1 ring-black/10',
                  'transition-transform duration-200 ease-in-out',
                  heatmapEnabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>

            <span
              className={cn(
                'min-w-[24px] text-xs font-semibold uppercase tracking-wide transition-colors',
                heatmapEnabled ? 'text-primary-600' : 'text-text-muted'
              )}
            >
              {heatmapEnabled ? 'On' : 'Off'}
            </span>
          </div>
        </div>
      </div>

      {/* Trends Table Card */}
      <Card>
        <CardContent className="p-0 min-h-[600px] flex flex-col">
          {showError && (
            <div className="flex-1 flex items-center justify-center p-6">
              <ErrorComponent
                error={error}
                onRetry={() => refetch()}
                title="Failed to load trends data"
              />
            </div>
          )}

          {showEmpty && !isFetching && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-text-secondary">
                <svg
                  className="w-12 h-12 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm">
                  No trends data available for the selected filters.
                </p>
                <Button variant="secondary" onClick={() => refetch()} size="sm">
                  Retry
                </Button>
              </div>
            </div>
          )}

          {(showTable || isFetching) && (
            <div className="flex-1 p-6">
              <TrendsTable
                data={trendsData as any}
                isLoading={isLoading}
                isFetching={isFetching}
                error={isError ? error : undefined}
                currency={currency}
                searchTerm={searchTerm}
                heatmapEnabled={heatmapEnabled}
                page={page}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}