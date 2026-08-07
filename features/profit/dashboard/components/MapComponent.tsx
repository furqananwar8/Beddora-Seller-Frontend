'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { Select, Input } from '@/design-system/inputs'
import { useGetProfitByCountryQuery, ProfitFilters, CountryProfitBreakdown } from '@/services/api/profit.api'
import { ErrorComponent } from './ErrorComponent'
import { RegionsTable, RegionData } from './RegionsTable'
import { LeafletMap } from './LeafletMap'
import { StatModal, StatModalData } from '@/components/stats/stats.modal'
import { cn } from '@/utils/cn'
import DateRangePicker, { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { MARKETPLACES } from '@/utils/marketplaces'

// ── PST utilities (same as dashboard) ──
import { format, addDays, addMonths } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/Los_Angeles'
const nowInPST = () => toZonedTime(new Date(), TIMEZONE)
const toISODatePST = (date: Date) => format(date, 'yyyy-MM-dd')

const chartPresets = [
  {
    id: 'last-12-months',
    label: 'Last 12 months',
    getRange: () => {
      const end = nowInPST()
      const start = addMonths(end, -12)
      return { startDate: toISODatePST(start), endDate: toISODatePST(end), periodicity: 'month' }
    },
  },
  {
    id: 'last-3-months',
    label: 'Last 3 months',
    getRange: () => {
      const end = nowInPST()
      const start = addMonths(end, -3)
      return { startDate: toISODatePST(start), endDate: toISODatePST(end), periodicity: 'week' }
    },
  },
  {
    id: 'last-30-days',
    label: 'Last 30 days',
    getRange: () => {
      const end = nowInPST()
      const start = addDays(end, -29)
      return { startDate: toISODatePST(start), endDate: toISODatePST(end), periodicity: 'day' }
    },
  },
  {
    id: 'custom',
    label: 'Custom range',
    getRange: () => ({
      startDate: toISODatePST(addDays(nowInPST(), -29)),
      endDate: toISODatePST(nowInPST()),
      periodicity: 'day',
    }),
  },
]

const inferPeriodicity = (startDate: string, endDate: string): 'day' | 'week' | 'month' => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff <= 31) return 'day'
  if (daysDiff <= 90) return 'week'
  return 'month'
}

const getCountryName = (code: string): string => {
  const nameMap: Record<string, string> = {
    US: 'United States', CA: 'Canada', GB: 'United Kingdom', DE: 'Germany',
    FR: 'France', IT: 'Italy', ES: 'Spain', JP: 'Japan', AU: 'Australia',
    IN: 'India', BR: 'Brazil', MX: 'Mexico',
  }
  return nameMap[code] || code
}

export interface MapComponentProps {
  accountId?: string
  amazonAccountId?: string
  className?: string
}

export const MapComponent: React.FC<MapComponentProps> = ({
  accountId,
  amazonAccountId,
  className,
}) => {
  const [dateRange, setDateRange] = useState<DateRangeValue & { periodicity?: string }>({
    startDate: toISODatePST(addDays(nowInPST(), -29)),
    endDate: toISODatePST(nowInPST()),
    presetId: 'last-30-days',
    periodicity: 'day',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'sales' | 'stock'>('sales')
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>(['Amazon.ca'])
  const [currency, setCurrency] = useState('CAD')
    const [selectedStat, setSelectedStat] = useState<{
    data: StatModalData
    anchorRect: DOMRect | null
  } | null>(null)


  const buildStatData = (d: CountryProfitBreakdown): StatModalData => {
    const flagMap: Record<string, string> = {
      US: '🇺🇸', CA: '🇨🇦', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷',
      IT: '🇮🇹', ES: '🇪🇸', JP: '🇯🇵', AU: '🇦🇺', IN: '🇮🇳',
      BR: '🇧🇷', MX: '🇲🇽',
    }

    return {
      title: d.region || d.country,
      flag: flagMap[d.country] || '🌎',
      sections: [
        {
          title: 'Sales',
          value: d.sales,
          currency: true,
          defaultOpen: true,
          children: [
            { label: 'Organic', value: 0, currency: true },
            { label: 'Sponsored Products (same day)', value: 0, currency: true },
            { label: 'Sponsored Display (same day)', value: 0, currency: true },
            { label: 'Direct sales', value: 0, currency: true },
            { label: 'Subscription sales (est.)', value: 0, currency: true },
          ],
        },
        {
          title: 'Units',
          value: d.unitsSold,
          defaultOpen: true,
          children: [
            { label: 'Organic', value: 0, integer: true },
            { label: 'Sponsored Products (same day)', value: 0, integer: true },
            { label: 'Sponsored Display (same day)', value: 0, integer: true },
            { label: 'Direct units', value: 0, integer: true },
            { label: 'Subscription units (est.)', value: 0, integer: true },
          ],
        },
        {
          title: 'Advertising cost',
          value: 0,
          currency: true,
          children: [
            { label: 'Sponsored Products', value: 0, currency: true },
            { label: 'Sponsored Brands Video', value: 0, currency: true },
            { label: 'Sponsored Display', value: 0, currency: true },
            { label: 'Sponsored Brands', value: 0, currency: true },
          ],
        },
        {
          title: 'Refund cost',
          value: Math.abs(d.refundCost),
          currency: true,
          defaultOpen: true,
          children: [
            { label: 'Refunded amount', value: Math.abs(d.refundCost), currency: true },
            { label: 'Refund commission', value: 0, currency: true },
            { label: 'Goodwill/Principal', value: 0, currency: true },
            { label: 'Promotion', value: 0, currency: true },
            { label: 'Refunded referral fee', value: 0, currency: true },
          ],
        },
        {
          title: 'Amazon fees',
          value: Math.abs(d.amazonFees),
          currency: true,
          defaultOpen: true,
          children: [
            { label: 'FBA per unit fulfillment fee', value: Math.abs(d.fbaFees), currency: true },
            { label: 'Referral fee', value: Math.abs(d.sellingFees), currency: true },
            { label: 'FBA per unit fulfillment fee_tax', value: 0, currency: true },
            { label: 'Commission_tax', value: 0, currency: true },
            { label: 'Sales tax collection fee', value: 0, currency: true },
            { label: 'FBA disposal fee', value: 0, currency: true },
            { label: 'Sales tax collection fee_tax', value: 0, currency: true },
            { label: 'Fba disposal fee_tax', value: 0, currency: true },
            { label: 'Digital services fee', value: 0, currency: true },
            { label: 'Adjustment FBA per unit fulfillment', value: 0, currency: true },
            { label: 'Reversal reimbursement', value: Math.abs(d.otherAmazonAdj), currency: true },
          ],
        },
        {
          title: 'Cost of goods',
          value: Math.abs(d.costOfGoods),
          currency: true,
          defaultOpen: true,
          children: [
            { label: 'Cost of goods sold', value: Math.abs(d.costOfGoods), currency: true },
            { label: 'Buying price', value: Math.abs(d.cogsBuyingPrice), currency: true },
            { label: 'Shipping price', value: Math.abs(d.cogsShippingPrice), currency: true },
            { label: 'Import price', value: Math.abs(d.cogsImportPrice), currency: true },
            { label: 'Disposal of sellable products', value: 0, currency: true },
            { label: 'Lost/damaged by Amazon', value: 0, currency: true },
            { label: 'Multi-channel', value: 0, currency: true },
            { label: 'Missing returns', value: 0, currency: true },
          ],
        },
      ],
      summaryRows: [
        { label: 'Refunds', value: d.totalReturns, integer: true },
        { label: 'Promo', value: d.promoRebates, currency: true },
        { label: 'VAT', value: 0, currency: true },
        { label: 'Gross profit', value: d.grossProfit, currency: true },
        { label: 'Indirect expenses', value: d.indirectExpenses, currency: true },
        { label: 'Net profit', value: d.netProfit, currency: true },
        { label: 'Estimated payout', value: 0, currency: true },
        { label: 'Real ACOS', value: 0, percentage: true },
        { label: '% Refunds', value: d.totalReturns > 0 ? (d.totalReturns / d.orders) * 100 : 0, percentage: true },
        { label: 'Sellable returns', value: d.sellableReturnsPercent, percentage: true },
        { label: 'Margin', value: d.margin, percentage: true },
        { label: 'ROI', value: d.roi, percentage: true },
        { label: 'Active subscriptions (SnS)', value: 0, integer: true },
        { label: 'Sessions', value: 0, integer: true },
        { label: 'Unit session percentage', value: 0, percentage: true },
      ],
    }
  }

  const filters: ProfitFilters = useMemo(() => ({
    startDate: dateRange.startDate as string,
    endDate: dateRange.endDate as string,
    preset: dateRange.presetId as any,
    periodicity: dateRange.periodicity as any,
    accountId,
    amazonAccountId,
    marketplaces: selectedMarketplaces,
    currency,
  }), [dateRange, accountId, amazonAccountId, selectedMarketplaces, currency])

  const {
    data: countryData,
    isLoading,
    isFetching,  // ← add this
    isError,
    error,
    refetch,
  } = useGetProfitByCountryQuery(filters, {
    skip: !dateRange.startDate || !dateRange.endDate,
  })

  const countryDataForMap = useMemo(() => {
    if (!countryData) return []
    const map = new Map<string, { country: string; profit: number; orders: number; unitsSold: number }>()
    for (const item of countryData) {
      const existing = map.get(item.country)
      if (existing) {
        existing.profit += item.profit
        existing.orders += item.orders
        existing.unitsSold += item.unitsSold || item.orders
      } else {
        map.set(item.country, {
          country: item.country,
          profit: item.profit,
          orders: item.orders,
          unitsSold: item.unitsSold || item.orders,
        })
      }
    }
    return Array.from(map.values())
  }, [countryData])

 const regionData = useMemo(() => {
  if (!countryData) return []
  return countryData.map((item) => ({
    ...item,
    region: item.region || getCountryName(item.country),
    grossProfit: item.grossProfit ?? item.profit,
    isExpandable: false,  // ← add this if you want, or skip since it's optional now
  }))
}, [countryData])

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Filters Toolbar */}
      <div className="bg-surface-secondary border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">Q</span>
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-surface border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode('sales')}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded transition-colors',
                  viewMode === 'sales' ? 'bg-primary-600 text-white' : 'text-text-muted hover:text-text-primary'
                )}
              >
                Sales
              </button>
              <button
                onClick={() => setViewMode('stock')}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded transition-colors',
                  viewMode === 'stock' ? 'bg-primary-600 text-white' : 'text-text-muted hover:text-text-primary'
                )}
              >
                Stock
              </button>
            </div>

            <div>
              <DateRangePicker
                value={dateRange}
                presets={chartPresets}
                keepOpenPresetIds={['custom']}
                onChange={(range) => {
                  const preset = chartPresets.find(p => p.id === range.presetId)
                  const periodicity = preset?.getRange().periodicity
                    || inferPeriodicity(range.startDate as string, range.endDate as string)
                  setDateRange({ ...range, periodicity })
                }}
                displayFormat="MMM d, yyyy"
                placeholder="Select date range"
              />
            </div>

            <div>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: 'CAD', label: 'CAD' },
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <Card>
        <CardContent className="p-0">
          <div className="relative w-full h-[500px] bg-surface-tertiary">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <Spinner size="lg" />
                  <p className="text-sm text-text-secondary">Loading map...</p>
                </div>
              </div>
            ) : isError ? (
              <div className="flex items-center justify-center h-full">
                <ErrorComponent error={error} onRetry={() => refetch()} />
              </div>
            ) : countryDataForMap && countryDataForMap.length > 0 ? (
               <LeafletMap
                  data={countryDataForMap as any}
                  onCountryClick={(countryCode: string, event?: MouseEvent) => {
                    const found = countryData?.find((c) => c.country === countryCode)
                    if (!found) return

                    // Build a 0×0 DOMRect at the click coordinates so the popover
                    // opens directly above the clicked country
                    const clientX = event?.clientX ?? window.innerWidth / 2
                    const clientY = event?.clientY ?? window.innerHeight / 2
                    const rect = new DOMRect(clientX, clientY, 0, 0)

                    setSelectedStat({
                      data: buildStatData(found),
                      anchorRect: rect,
                    })
                  }}
                />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-text-secondary mb-2">No data available</p>
                  <p className="text-sm text-text-muted">Try adjusting the date range or filters</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Regions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border">
            <h2 className="text-lg font-semibold text-text-primary">All regions</h2>
            <div className="flex items-center gap-2">
              <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors" title="Download">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors" title="Copy to clipboard">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
           <RegionsTable
              data={regionData}
              isLoading={isLoading}
              isFetching={isFetching}
              searchTerm={searchTerm}
              currency={currency}
            />
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <StatModal
        isOpen={!!selectedStat}
        onClose={() => setSelectedStat(null)}
        data={selectedStat?.data || null}
        currency={currency}
        anchorRect={selectedStat?.anchorRect || null}
      />
    </div>
  )
}