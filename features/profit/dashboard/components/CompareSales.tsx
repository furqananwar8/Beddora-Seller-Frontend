'use client'

import { useCallback, useMemo, useState } from 'react'
import type { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { Spinner } from '@/design-system/loaders'
import { useGetCompareSalesQuery } from '@/services/api/profit.api'
import {
  REPORT_CURRENCY_OPTIONS,
  getDefaultCurrencyForMarketplaces,
  type ReportCurrency,
} from '@/utils/marketplaceCurrency'
import { ProfitDashboardHeader } from './ProfitDashboardHeader'
import { CompareSalesCharts } from './compare-sales/CompareSalesCharts'
import { CompareSalesSnapshot } from './compare-sales/CompareSalesSnapshot'
import { CompareSalesTable } from './compare-sales/CompareSalesTable'
import {
  DEFAULT_HOURLY,
  buildHourlyDetail,
  getMonthToDateRange,
  getTodayRange,
  getWeekToDateRange,
  getYearToDateRange,
  getYesterdayRange,
  type Comparison,
} from './compare-sales/compareSales.utils'

type ViewMode = 'graph' | 'table'

const DATE_PRESETS = [
  { id: 'today', label: 'Today', getRange: getTodayRange },
  { id: 'yesterday', label: 'Yesterday', getRange: getYesterdayRange },
  { id: 'week-to-date', label: 'Week to date', getRange: getWeekToDateRange },
  { id: 'month-to-date', label: 'Month to date', getRange: getMonthToDateRange },
  { id: 'year-to-date', label: 'Year to date', getRange: getYearToDateRange },
]

const DEFAULT_MARKETPLACES = ['Amazon.ca']

export default function CompareSales() {
  // Draft = what the user is editing; applied = what the API is queried with
  const [draftMarketplaces, setDraftMarketplaces] = useState<string[]>(DEFAULT_MARKETPLACES)
  const [draftCurrency, setDraftCurrency] = useState<ReportCurrency>(
    getDefaultCurrencyForMarketplaces(DEFAULT_MARKETPLACES)
  )
  const [draftDateRange, setDraftDateRange] = useState<DateRangeValue>(getTodayRange())

  const [applied, setApplied] = useState({
    marketplaces: DEFAULT_MARKETPLACES,
    currency: draftCurrency,
    dateRange: getTodayRange(),
  })

  const [viewMode, setViewMode] = useState<ViewMode>('graph')

  const { data, isFetching } = useGetCompareSalesQuery({
    startDate: applied.dateRange.startDate || undefined,
    endDate: applied.dateRange.endDate || undefined,
    marketplaces: applied.marketplaces.length > 0 ? applied.marketplaces : undefined,
    currency: applied.currency,
  })

  // Switching marketplace switches the reporting currency, as on the profit screens
  const handleMarketplacesChange = useCallback((marketplaces: string[]) => {
    setDraftMarketplaces(marketplaces)
    setDraftCurrency((current) => getDefaultCurrencyForMarketplaces(marketplaces, current))
  }, [])

  const handleApply = useCallback(() => {
    setApplied({
      marketplaces: [...draftMarketplaces],
      currency: draftCurrency,
      dateRange: { ...draftDateRange },
    })
  }, [draftMarketplaces, draftCurrency, draftDateRange])

  const currency = data?.currency ?? applied.currency
  const comparisons = (data?.comparisons ?? []) as unknown as Comparison[]

  const hourly = useMemo(
    () => ({
      units: data?.hourly?.units?.length ? data.hourly.units : DEFAULT_HOURLY,
      sales: data?.hourly?.sales?.length ? data.hourly.sales : DEFAULT_HOURLY,
      orderItems: data?.hourly?.orderItems ?? [],
    }),
    [data]
  )
  const hourlyDetail = useMemo(() => buildHourlyDetail(hourly), [hourly])

  return (
    <div className="relative w-full">
      {isFetching && (
        <div className="absolute inset-0 z-50 flex items-start justify-center bg-surface/70 pt-32">
          <div className="flex items-center gap-3 px-6 py-4">
            <Spinner />
            <span className="text-sm font-medium text-text-primary">Updating data…</span>
          </div>
        </div>
      )}

      <ProfitDashboardHeader
        showSearch={false}
        dateRange={draftDateRange}
        datePresets={DATE_PRESETS}
        onDateRangeChange={setDraftDateRange}
        marketplaces={draftMarketplaces}
        onMarketplacesChange={handleMarketplacesChange}
        currency={draftCurrency}
        onCurrencyChange={(value) => setDraftCurrency(value as ReportCurrency)}
        currencyOptions={REPORT_CURRENCY_OPTIONS}
        onFilter={handleApply}
        isFiltering={isFetching}
      />

      <div className="space-y-6 px-6 pb-8">
        <CompareSalesSnapshot snapshot={data?.snapshot} currency={currency} />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Compare sales</h2>

            <div className="inline-flex overflow-hidden rounded-lg border border-border bg-surface">
              {(['graph', 'table'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 text-sm font-medium ${
                    viewMode === mode
                      ? 'bg-primary-600 text-white'
                      : 'text-text-secondary hover:bg-surface-secondary'
                  }`}
                >
                  {mode === 'graph' ? 'Graph view' : 'Table view'}
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'graph' ? (
            <CompareSalesCharts
              units={hourly.units}
              sales={hourly.sales}
              detail={hourlyDetail}
              comparisons={comparisons}
              currency={currency}
            />
          ) : (
            <CompareSalesTable comparisons={comparisons} hourly={hourly} currency={currency} />
          )}
        </section>
      </div>
    </div>
  )
}
