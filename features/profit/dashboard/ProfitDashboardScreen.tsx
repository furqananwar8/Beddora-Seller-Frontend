'use client'

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Select, Input } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
import { KpiCardSkeleton } from '@/design-system/loaders'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setFilters } from '@/store/profit.slice'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { useDebounce } from '@/utils/debounce'
import {
  useGetProfitSummaryQuery,
  useGetProfitByProductQuery,
  useGetProfitByOrderItemsQuery,
  useGetPLByPeriodsQuery,
  ProfitFilters,
  PeriodSummary,
  PeriodSummaryPeriod,
} from '@/services/api/profit.api'
import { useGetDashboardChartQuery, ChartFilters } from '@/services/api/charts.api'
import { SellerboardProductsTable } from './SellerboardProductsTable'
import { OrderItemsTable } from './OrderItemsTable'
import { DashboardChart } from './DashboardChart'
import { PLTable } from './PLTable'
import { MapComponent } from './components/MapComponent'
import { TrendsComponent } from './components/TrendsComponent'
import { ChartSummaryTable } from './components/ChartSummaryTable'
import { SandboxOrdersTest } from './components'
import { TileDetailsModal } from './components/TileDetailsModal'
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/format'

// ── PST/PDT DATE UTILITIES (date-fns + date-fns-tz) ──
import { format, addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'America/Los_Angeles'
const PRESET_STORAGE_KEY = 'profit-dashboard-preset'

/** Current instant shifted so local getters reflect PST/PDT */
const nowInPST = () => toZonedTime(new Date(), TIMEZONE)

/** Format a PST-shifted Date as YYYY-MM-DD (PST calendar date) */
const toISODatePST = (date: Date) => format(date, 'yyyy-MM-dd')

/** Format a YYYY-MM-DD string for display in PST/PDT */
const formatDateRangePST = (startDate: string, endDate: string) => {
  const startInstant = new Date(startDate + 'T12:00:00Z')
  const endInstant = new Date(endDate + 'T12:00:00Z')

  if (startDate === endDate) {
    return formatInTimeZone(startInstant, TIMEZONE, 'MMMM d, yyyy')
  }

  const startYear = formatInTimeZone(startInstant, TIMEZONE, 'yyyy')
  const endYear = formatInTimeZone(endInstant, TIMEZONE, 'yyyy')

  if (startYear === endYear) {
    return `${formatInTimeZone(startInstant, TIMEZONE, 'MMM d')} - ${formatInTimeZone(endInstant, TIMEZONE, 'MMM d, yyyy')}`
  }

  return `${formatInTimeZone(startInstant, TIMEZONE, 'MMM d, yyyy')} - ${formatInTimeZone(endInstant, TIMEZONE, 'MMM d, yyyy')}`
}

/** Add days to a PST-shifted Date */
const addDaysPST = (date: Date, days: number) => addDays(date, days)

/** Start of month in PST */
const startOfMonthPST = (date: Date) => startOfMonth(date)

/** End of month in PST */
const endOfMonthPST = (date: Date) => endOfMonth(date)

/** Start of week in PST (Monday-start default) */
const startOfWeekPST = (date: Date, weekStartsOn: 0 | 1 = 1) => startOfWeek(date, { weekStartsOn })

/** End of week in PST */
const endOfWeekPST = (date: Date, weekStartsOn: 0 | 1 = 1) => endOfWeek(date, { weekStartsOn })

/** Rolling N-day range ending today in PST */
const getRollingDateRangePST = (days: number) => {
  const end = nowInPST()
  const start = addDaysPST(end, -(days - 1))
  return { startDate: toISODatePST(start), endDate: toISODatePST(end) }
}

/** Single day N days ago in PST */
const getSingleDayPST = (daysAgo: number) => {
  const d = addDaysPST(nowInPST(), -daysAgo)
  const ymd = toISODatePST(d)
  return { startDate: ymd, endDate: ymd }
}

// ============================================
// MARKETPLACES (backend expects these strings)
// ============================================

const MARKETPLACES = [
  { id: 'Amazon.ca', name: 'Canada' },
  { id: 'Amazon.com', name: 'USA' },
  { id: 'Amazon.mx', name: 'Mexico' },
]

// ============================================
// MULTI-MARKETPLACE SELECT COMPONENT
// ============================================

const MarketplaceMultiSelect: React.FC<{
  options: Array<{ id: string; name: string }>
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}> = ({ options, value, onChange, placeholder = 'Select marketplaces' }) => {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const allRef = useRef<HTMLInputElement>(null)

  const allIds = useMemo(() => options.map((o) => o.id), [options])
  const allSelected = value.length === allIds.length && allIds.length > 0
  const noneSelected = value.length === 0
  const isIndeterminate = !allSelected && !noneSelected

  useEffect(() => {
    if (allRef.current) {
      allRef.current.indeterminate = isIndeterminate
    }
  }, [isIndeterminate])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const toggleAll = () => {
    if (allSelected) {
      onChange([])
    } else {
      onChange([...allIds])
    }
  }

  const toggleOne = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  const displayLabel = useMemo(() => {
    if (value.length === 0) return placeholder
    if (value.length === 1) return options.find((o) => o.id === value[0])?.name || placeholder
    if (value.length === options.length) return 'All Marketplaces'
    return `${value.length} selected`
  }, [value, options, placeholder])

  return (
    <div className="relative min-w-[160px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-surface border border-border rounded-lg shadow-lg py-1">
          <label className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border cursor-pointer hover:bg-surface-secondary">
            <input
              ref={allRef}
              type="checkbox"
              className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
              checked={allSelected}
              onChange={toggleAll}
            />
            <span className="text-sm font-medium text-text-primary">All Marketplaces</span>
          </label>
          {options.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-secondary"
            >
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                checked={value.includes(opt.id)}
                onChange={() => toggleOne(opt.id)}
              />
              <span className="text-sm text-text-primary">{opt.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// TYPES
// ============================================

type DashboardTab = 'tiles' | 'chart' | 'pnl' | 'map' | 'trends' | 'sandbox'
type TableView = 'products' | 'order-items'
type CurrencyCode = 'CAD' | 'USD' | 'EUR'

interface TileConfig {
  id: string
  label: string
  apiPeriod: PeriodSummaryPeriod
  getDateRange: (nowPST: Date) => { startDate: string; endDate: string }
}

interface TilePreset {
  id: string
  label: string
  tiles: TileConfig[]
}

// ============================================
// TILE PRESETS
// ============================================

const tilePresets: TilePreset[] = [
  {
    id: 'today-yesterday-mtd-forecast-lastmonth',
    label: 'Today / Yesterday / MTD / Forecast / Last Month',
    tiles: [
      {
        id: 'today',
        label: 'Today',
        apiPeriod: 'TODAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(now)
          return { startDate: ymd, endDate: ymd }
        },
      },
      {
        id: 'yesterday',
        label: 'Yesterday',
        apiPeriod: 'YESTERDAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(addDaysPST(now, -1))
          return { startDate: ymd, endDate: ymd }
        },
      },
      {
        id: 'month-to-date',
        label: 'Month to date',
        apiPeriod: 'MONTH_TO_DATE',
        getDateRange: (now) => ({
          startDate: toISODatePST(startOfMonthPST(now)),
          endDate: toISODatePST(now),
        }),
      },
      {
        id: 'this-month-forecast',
        label: 'This month',
        apiPeriod: 'THIS_MONTH_FORECAST',
        getDateRange: (now) => ({
          startDate: toISODatePST(startOfMonthPST(now)),
          endDate: toISODatePST(endOfMonthPST(now)),
        }),
      },
      {
        id: 'last-month',
        label: 'Last month',
        apiPeriod: 'LAST_MONTH',
        getDateRange: (now) => {
          const start = startOfMonthPST(addMonths(now, -1))
          const end = endOfMonthPST(start)
          return { startDate: toISODatePST(start), endDate: toISODatePST(end) }
        },
      },
    ],
  },
  {
    id: 'today-yesterday-mtd-lastmonth',
    label: 'Today / Yesterday / MTD / Last Month',
    tiles: [
      {
        id: 'today',
        label: 'Today',
        apiPeriod: 'TODAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(now)
          return { startDate: ymd, endDate: ymd }
        },
      },
      {
        id: 'yesterday',
        label: 'Yesterday',
        apiPeriod: 'YESTERDAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(addDaysPST(now, -1))
          return { startDate: ymd, endDate: ymd }
        },
      },
      {
        id: 'month-to-date',
        label: 'Month to date',
        apiPeriod: 'MONTH_TO_DATE',
        getDateRange: (now) => ({
          startDate: toISODatePST(startOfMonthPST(now)),
          endDate: toISODatePST(now),
        }),
      },
      {
        id: 'last-month',
        label: 'Last month',
        apiPeriod: 'LAST_MONTH',
        getDateRange: (now) => {
          const start = startOfMonthPST(addMonths(now, -1))
          const end = endOfMonthPST(start)
          return { startDate: toISODatePST(start), endDate: toISODatePST(end) }
        },
      },
    ],
  },
  {
    id: 'today-yesterday-7-14-30',
    label: 'Today / Yesterday / 7 / 14 / 30 Days',
    tiles: [
      {
        id: 'today',
        label: 'Today',
        apiPeriod: 'TODAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(now)
          return { startDate: ymd, endDate: ymd }
        },
      },
      {
        id: 'yesterday',
        label: 'Yesterday',
        apiPeriod: 'YESTERDAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(addDaysPST(now, -1))
          return { startDate: ymd, endDate: ymd }
        },
      },
      {
        id: '7days',
        label: '7 days',
        apiPeriod: '7DAYS',
        getDateRange: (now) => {
          const end = now
          const start = addDaysPST(end, -6)
          return { startDate: toISODatePST(start), endDate: toISODatePST(end) }
        },
      },
      {
        id: '14days',
        label: '14 days',
        apiPeriod: '14DAYS',
        getDateRange: (now) => {
          const end = now
          const start = addDaysPST(end, -13)
          return { startDate: toISODatePST(start), endDate: toISODatePST(end) }
        },
      },
      {
        id: '30days',
        label: '30 days',
        apiPeriod: '30DAYS',
        getDateRange: (now) => {
          const end = now
          const start = addDaysPST(end, -29)
          return { startDate: toISODatePST(start), endDate: toISODatePST(end) }
        },
      },
    ],
  },
  {
    id: 'thisweek-lastweek-2w-3w',
    label: 'This Week / Last Week / 2W / 3W',
    tiles: [
      {
        id: 'this-week',
        label: 'This week',
        apiPeriod: 'THIS_WEEK',
        getDateRange: (now) => ({
          startDate: toISODatePST(startOfWeekPST(now)),
          endDate: toISODatePST(endOfWeekPST(now)),
        }),
      },
      {
        id: 'last-week',
        label: 'Last week',
        apiPeriod: 'LAST_WEEK',
        getDateRange: (now) => {
          const start = addDaysPST(startOfWeekPST(now), -7)
          const end = endOfWeekPST(start)
          return { startDate: toISODatePST(start), endDate: toISODatePST(end) }
        },
      },
      {
        id: '2-weeks-ago',
        label: '2 weeks ago',
        apiPeriod: '2WEEKSAGO',
        getDateRange: (now) => {
          const start = addDaysPST(startOfWeekPST(now), -14)
          const end = endOfWeekPST(start)
          return { startDate: toISODatePST(start), endDate: toISODatePST(end) }
        },
      },
      {
        id: '3-weeks-ago',
        label: '3 weeks ago',
        apiPeriod: '3WEEKSAGO',
        getDateRange: (now) => {
          const start = addDaysPST(startOfWeekPST(now), -21)
          const end = endOfWeekPST(start)
          return { startDate: toISODatePST(start), endDate: toISODatePST(end) }
        },
      },
    ],
  },
  {
    id: 'mtd-lastmonth-2m-3m',
    label: 'MTD / Last Month / 2M / 3M',
    tiles: [
      {
        id: 'month-to-date',
        label: 'Month to date',
        apiPeriod: 'MONTH_TO_DATE',
        getDateRange: (now) => ({
          startDate: toISODatePST(startOfMonthPST(now)),
          endDate: toISODatePST(now),
        }),
      },
      {
        id: 'last-month',
        label: 'Last month',
        apiPeriod: 'LAST_MONTH',
        getDateRange: (now) => {
          const start = startOfMonthPST(addMonths(now, -1))
          const end = endOfMonthPST(start)
          return { startDate: toISODatePST(start), endDate: toISODatePST(end) }
        },
      },
      {
        id: '2-months-ago',
        label: '2 months ago',
        apiPeriod: '2MONTHSAGO',
        getDateRange: (now) => {
          const start = startOfMonthPST(addMonths(now, -2))
          const end = endOfMonthPST(start)
          return { startDate: toISODatePST(start), endDate: toISODatePST(end) }
        },
      },
      {
        id: '3-months-ago',
        label: '3 months ago',
        apiPeriod: '3MONTHSAGO',
        getDateRange: (now) => {
          const start = startOfMonthPST(addMonths(now, -3))
          const end = endOfMonthPST(start)
          return { startDate: toISODatePST(start), endDate: toISODatePST(end) }
        },
      },
    ],
  },
  {
    id: 'today-yesterday-2d-3d',
    label: 'Today / Yesterday / 2D / 3D',
    tiles: [
      {
        id: 'today',
        label: 'Today',
        apiPeriod: 'TODAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(now)
          return { startDate: ymd, endDate: ymd }
        },
      },
      {
        id: 'yesterday',
        label: 'Yesterday',
        apiPeriod: 'YESTERDAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(addDaysPST(now, -1))
          return { startDate: ymd, endDate: ymd }
        },
      },
      {
        id: '2-days-ago',
        label: '2 days ago',
        apiPeriod: '2DAYSAGO',
        getDateRange: (now) => {
          const ymd = toISODatePST(addDaysPST(now, -2))
          return { startDate: ymd, endDate: ymd }
        },
      },
      {
        id: '3-days-ago',
        label: '3 days ago',
        apiPeriod: '3DAYSAGO',
        getDateRange: (now) => {
          const ymd = toISODatePST(addDaysPST(now, -3))
          return { startDate: ymd, endDate: ymd }
        },
      },
    ],
  },
  {
    id: 'today-yesterday-7d-8d',
    label: 'Today / Yesterday / 7D / 8D',
    tiles: [
      {
        id: 'today',
        label: 'Today',
        apiPeriod: 'TODAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(now)
          return { startDate: ymd, endDate: ymd }
        },
      },
      {
        id: 'yesterday',
        label: 'Yesterday',
        apiPeriod: 'YESTERDAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(addDaysPST(now, -1))
          return { startDate: ymd, endDate: ymd }
        },
      },
      {
        id: '7-days-ago',
        label: '7 days ago',
        apiPeriod: '7DAYSAGO',
        getDateRange: (now) => {
          const ymd = toISODatePST(addDaysPST(now, -7))
          return { startDate: ymd, endDate: ymd }
        },
      },
      {
        id: '8-days-ago',
        label: '8 days ago',
        apiPeriod: '8DAYSAGO',
        getDateRange: (now) => {
          const ymd = toISODatePST(addDaysPST(now, -8))
          return { startDate: ymd, endDate: ymd }
        },
      },
    ],
  },
]

const gridColsClass: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
}

// ============================================
// COMPONENT
// ============================================

export const ProfitDashboardScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const profitFilters = useAppSelector((state) => state.profit.filters)
  const { data: accountsData } = useGetAccountsQuery()
  const searchParams = useSearchParams()
  const activeTab = (searchParams?.get('tab') as DashboardTab) || 'tiles'

  const [tableView, setTableView] = useState<TableView>('products')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const [isPresetOpen, setIsPresetOpen] = useState(false)
  const presetDropdownRef = useRef<HTMLDivElement>(null)

  const [selectedPresetId, setSelectedPresetId] = useState<string>(tilePresets[2].id)
  const [selectedTileId, setSelectedTileId] = useState<string>('yesterday')
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>(['Amazon.ca'])
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('CAD')
  const [selectedPeriodForDetails, setSelectedPeriodForDetails] = useState<string | null>(null)

  // ── Restore persisted preset on mount ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRESET_STORAGE_KEY)
      if (saved && tilePresets.some((p) => p.id === saved)) {
        setSelectedPresetId(saved)
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  const currentPreset = useMemo(
    () => tilePresets.find((p) => p.id === selectedPresetId) || tilePresets[0],
    [selectedPresetId]
  )

  // Default account (still used for API calls, just not shown)
  useEffect(() => {
    if (!profitFilters.accountId && accountsData?.length) {
      dispatch(setFilters({ ...profitFilters, accountId: accountsData[0].id }))
    }
  }, [accountsData, dispatch, profitFilters])

  const effectiveAccountId = profitFilters.accountId || accountsData?.[0]?.id

  useEffect(() => {
    setSelectedTileId(currentPreset.tiles[0].id)
  }, [currentPreset])

  // ── Click outside to close preset dropdown ──
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        presetDropdownRef.current &&
        !presetDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPresetOpen(false)
      }
    }
    if (isPresetOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isPresetOpen])

  // ── PROFIT SUMMARY QUERY ──
  const {
    data: profitData,
    isFetching: profitFetching,
    isLoading: profitLoading,
    error: profitError,
    refetch: refetchProfit,
  } = useGetProfitSummaryQuery(
    {
      accountId: effectiveAccountId,
      marketplaces: selectedMarketplaces,
      currency: selectedCurrency,
      preset: selectedPresetId,
    },
    { skip: !effectiveAccountId }
  )

  const periodMap = useMemo(() => {
    if (!profitData?.periods) return new Map<PeriodSummaryPeriod, PeriodSummary>()
    return new Map(profitData.periods.map((p) => [p.period, p]))
  }, [profitData])

  const getPeriodDetailData = useCallback(
    (tileId: string) => {
      const tile = currentPreset.tiles.find((t) => t.id === tileId)
      if (!tile) return undefined

      const apiPeriod = periodMap.get(tile.apiPeriod)
      if (!apiPeriod) return undefined

      const grossProfit = apiPeriod.salesRevenue + apiPeriod.totalFees - apiPeriod.totalCOGS

      return {
        salesRevenue: apiPeriod.salesRevenue,
        salesCount: apiPeriod.salesCount,
        ordersUnitCount: apiPeriod.ordersUnitCount,
        totalFees: apiPeriod.totalFees,
        totalRefunds: apiPeriod.totalRefunds,
        totalCOGS: apiPeriod.totalCOGS,
        totalExpenses: apiPeriod.totalExpenses,
        netProfit: apiPeriod.netProfit,
        netMargin: apiPeriod.netMargin,
        grossProfit,
        grossMargin:
          apiPeriod.salesRevenue > 0 ? (grossProfit / apiPeriod.salesRevenue) * 100 : 0,
        orderCount: apiPeriod.salesCount,
      }
    },
    [currentPreset, periodMap]
  )

  const periodCardsData = useMemo(() => {
    const now = nowInPST()
    return currentPreset.tiles.map((tile) => {
      const period = periodMap.get(tile.apiPeriod)
      const range = tile.getDateRange(now)

      return {
        id: tile.id,
        label: tile.label,
        dateRange: formatDateRangePST(range.startDate, range.endDate),
        salesRevenue: period?.salesRevenue ?? 0,
        salesCount: period?.salesCount ?? 0,
        ordersUnitCount: period?.ordersUnitCount ?? 0,
        totalFees: period?.totalFees ?? 0,
        totalRefunds: period?.totalRefunds ?? 0,
        totalCOGS: period?.totalCOGS ?? 0,
        totalExpenses: period?.totalExpenses ?? 0,
        netProfit: period?.netProfit ?? 0,
        netMargin: period?.netMargin ?? 0,
        isFetching: profitFetching,
      }
    })
  }, [currentPreset, periodMap, profitFetching])

  const selectedTileConfig = currentPreset.tiles.find((t) => t.id === selectedTileId)
  const selectedTileRange = useMemo(() => {
    const now = nowInPST()
    return selectedTileConfig
      ? selectedTileConfig.getDateRange(now)
      : getSingleDayPST(1)
  }, [selectedTileConfig])

  // ── PRODUCT / ORDER ITEMS QUERIES ──
  const { data: productData, isFetching: productFetching } = useGetProfitByProductQuery(
    {
      ...profitFilters,
      accountId: effectiveAccountId,
      marketplaces: selectedMarketplaces,
      currency: selectedCurrency,
      ...selectedTileRange,
    },
    { skip: !effectiveAccountId || tableView === 'order-items' }
  )

  const { data: orderItemsData, isFetching: orderItemsFetching } = useGetProfitByOrderItemsQuery(
    {
      ...profitFilters,
      accountId: effectiveAccountId,
      marketplaces: selectedMarketplaces,
      currency: selectedCurrency,
      ...selectedTileRange,
    },
    { skip: !effectiveAccountId || tableView === 'products' }
  )

  // ── CHART DATA (PST) ──
  const chartDateRange = useMemo(() => {
    const end = nowInPST()
    const start = addMonths(end, -12)
    return { startDate: toISODatePST(start), endDate: toISODatePST(end) }
  }, [])

  const chartFilters: ChartFilters = useMemo(
    () => ({
      accountId: effectiveAccountId,
      marketplaces: selectedMarketplaces,
      ...chartDateRange,
      period: 'month',
      currency: selectedCurrency,
    }),
    [effectiveAccountId, selectedMarketplaces, chartDateRange, selectedCurrency]
  )

  const {
    data: chartData,
    isFetching: chartFetching,
    error: chartError,
  } = useGetDashboardChartQuery(chartFilters, {
    skip: !effectiveAccountId || activeTab !== 'chart',
  })

  // ── P&L DATA ──
  const plFilters: ProfitFilters = useMemo(
    () => ({
      accountId: effectiveAccountId,
      marketplaces: selectedMarketplaces,
      currency: selectedCurrency,
    }),
    [effectiveAccountId, selectedMarketplaces, selectedCurrency]
  )

  const {
    data: plData,
    isFetching: plFetching,
    error: plError,
  } = useGetPLByPeriodsQuery(plFilters, {
    skip: !effectiveAccountId || activeTab !== 'pnl',
  })

  const handleReload = useCallback(() => {
    refetchProfit()
  }, [refetchProfit])

  const handleMarketplacesChange = (value: string[]) => {
    setSelectedMarketplaces(value)
    dispatch(setFilters({ ...profitFilters, marketplaces: value }))
  }

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId)
    setIsPresetOpen(false)
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, presetId)
    } catch {
      // ignore storage errors
    }
  }

  return (
    <div className="w-full">
      <Container size="full">
        {/* ── CHART VIEW ── */}
        {activeTab === 'chart' && (
          <>
            <div className="bg-surface-secondary border-b border-border mb-6">
              <div className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-[55%]">
                    <div className="relative">
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
                      <Input
                        type="text"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <div className="min-w-[180px]">
                      <Select
                        value="last-12-months"
                        onChange={() => undefined}
                        options={[
                          { value: 'last-12-months', label: 'Last 12 months, by month' },
                          { value: 'last-30-days', label: 'Last 30 days, by day' },
                          { value: 'last-90-days', label: 'Last 90 days, by day' },
                        ]}
                      />
                    </div>
                    <div className="min-w-[160px]">
                      <MarketplaceMultiSelect
                        options={MARKETPLACES}
                        value={selectedMarketplaces}
                        onChange={handleMarketplacesChange}
                      />
                    </div>
                    <div className="min-w-[100px]">
                      <Select
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
                        options={[
                          { value: 'CAD', label: 'CAD' },
                          { value: 'USD', label: 'USD' },
                          { value: 'EUR', label: 'EUR' },
                        ]}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      onClick={handleReload}
                      className="bg-surface border border-border hover:bg-surface-tertiary text-text-primary"
                      title="Reload data"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6" style={{ gridAutoRows: '1fr' }}>
              <div className="lg:col-span-2 h-full">
                <DashboardChart data={chartData} isLoading={chartFetching} error={chartError} currency={selectedCurrency} />
              </div>
              <div className="lg:col-span-1 h-full">
                <ChartSummaryTable
                  data={chartData?.summary}
                  isLoading={chartFetching}
                  currency={selectedCurrency}
                  startDate={getRollingDateRangePST(30).startDate}
                  endDate={getRollingDateRangePST(30).endDate}
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-text-primary">All Periods</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTableView('products')}
                        className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                          tableView === 'products'
                            ? 'bg-primary-600 text-white'
                            : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Products
                      </button>
                      <button
                        onClick={() => setTableView('order-items')}
                        className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                          tableView === 'order-items'
                            ? 'bg-primary-600 text-white'
                            : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Order items
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value="group-by-product"
                      onChange={() => undefined}
                      options={[
                        { value: 'group-by-parent', label: 'Group by parent' },
                        { value: 'group-by-product', label: 'Group by product' },
                        { value: 'group-by-category', label: 'Group by category' },
                      ]}
                      className="min-w-[160px]"
                    />
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
                  {tableView === 'products' ? (
                    <SellerboardProductsTable products={productData} isLoading={productFetching} searchTerm={debouncedSearchTerm} />
                  ) : (
                    <OrderItemsTable orderItems={orderItemsData} isLoading={orderItemsFetching} searchTerm={debouncedSearchTerm} />
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── TILES VIEW ── */}
        {activeTab === 'tiles' && (
          <>
            {/* Summary banner */}
            {profitFetching && (
              <div className="bg-surface-secondary border border-border rounded-xl p-6 mb-6 animate-pulse">
                <div className="h-6 bg-border rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 bg-border rounded"></div>
                  ))}
                </div>
              </div>
            )}

            {profitData?.summary && !profitFetching && (
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white mb-6">
                <h2 className="text-lg font-semibold mb-4">Profit Overview ({currentPreset.label})</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-3xl font-bold">{formatCurrency(profitData.summary.totalRevenue)}</div>
                    <div className="text-blue-100 text-sm">Total Revenue</div>
                  </div>
                  <div>
                    <div className={`text-3xl font-bold ${profitData.summary.totalProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {formatCurrency(profitData.summary.totalProfit)}
                    </div>
                    <div className="text-blue-100 text-sm">Total Net Profit</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{profitData.summary.totalOrders}</div>
                    <div className="text-blue-100 text-sm">Total Orders</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{profitData.summary.totalUnits}</div>
                    <div className="text-blue-100 text-sm">Total Units</div>
                  </div>
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div className="bg-surface-secondary border-b border-border mb-6">
              <div className="px-6 py-4">
                <div className="flex items-center gap-4">
                  {/* Search - widened to 55% */}
                  <div className="w-[55%]">
                    <div className="relative">
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
                        className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                      />
                    </div>
                  </div>

                  {/* Right side controls */}
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    {/* Compact Preset Picker */}
                    <div className="relative" ref={presetDropdownRef}>
                      <button
                        onClick={() => setIsPresetOpen((v) => !v)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                          isPresetOpen
                            ? 'border-2 border-primary-100 text-primary-700'
                            : 'bg-surface border-border text-text-primary hover:bg-surface-tertiary'
                        }`}
                        title="Change period preset"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <svg
                          className={`w-4 h-4 transition-transform ${isPresetOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {isPresetOpen && (
                        <div className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-lg shadow-lg z-50 py-1 max-h-80 overflow-auto">
                          <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">
                            Period Presets
                          </div>
                          {tilePresets.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => handlePresetSelect(preset.id)}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                selectedPresetId === preset.id
                                  ? 'bg-primary-700 text-white font-medium'
                                  : 'text-text-primary hover:bg-surface-secondary'
                              }`}
                            >
                              <span>{preset.label}</span>
                              {selectedPresetId === preset.id && (
                                <svg
                                  className="w-7 h-7 text-primary-600"
                                  fill="none"
                                  stroke="white"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Marketplace */}
                    <div className="min-w-[160px]">
                      <MarketplaceMultiSelect
                        options={MARKETPLACES}
                        value={selectedMarketplaces}
                        onChange={handleMarketplacesChange}
                      />
                    </div>

                    {/* Currency */}
                    <div className="min-w-[100px]">
                      <Select
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
                        options={[
                          { value: 'CAD', label: 'CAD' },
                          { value: 'USD', label: 'USD' },
                          { value: 'EUR', label: 'EUR' },
                        ]}
                      />
                    </div>

                    {/* Reload Button */}
                    <Button
                      variant="ghost"
                      onClick={handleReload}
                      className="bg-surface border border-border hover:bg-surface-tertiary text-text-primary"
                      title="Reload data"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Period Cards */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass[Math.min(currentPreset.tiles.length, 5)]} gap-4 mb-6`}>
              {periodCardsData.map((period) => {
                if (period.isFetching) {
                  return <KpiCardSkeleton key={period.id} />
                }

                const totalCosts = period.totalExpenses + period.totalFees + period.totalCOGS
                const netProfitMargin = period.netMargin

                return (
                  <Card
                    key={period.id}
                    className={`bg-surface border border-border cursor-pointer transition-shadow hover:shadow-md ${
                      selectedTileId === period.id ? 'ring-2 ring-primary-200' : ''
                    }`}
                    onClick={() => setSelectedTileId(period.id)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-lg font-semibold text-text-primary">{period.label}</h3>
                          <p className="text-xs text-text-muted">{period.dateRange}</p>
                        </div>

                        <div>
                          <div className="text-xs text-text-muted">Sales</div>
                          <div className="text-2xl font-bold text-text-primary">
                            {formatCurrency(period.salesRevenue)}
                          </div>
                          <div className={`text-xs mt-1 ${netProfitMargin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            {netProfitMargin >= 0 ? '+' : ''}{formatPercentage(netProfitMargin)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-text-muted">Orders / Units</div>
                            <div className="font-semibold text-text-primary">
                              {period.salesCount} / {period.ordersUnitCount}
                            </div>
                          </div>
                          <div>
                            <div className="text-text-muted">Refunds</div>
                            <div className="font-semibold text-text-primary">
                              {formatNumber(period.totalRefunds)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-text-muted">Adv. cost</div>
                            <div className="font-semibold text-danger-600">
                              -{formatCurrency(period.totalExpenses)}
                            </div>
                          </div>
                          <div>
                            <div className="text-text-muted">Est. payout</div>
                            <div className="font-semibold text-text-primary">
                              {formatCurrency(period.salesRevenue - totalCosts)}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-border">
                          <div className="text-text-muted text-xs">Net profit</div>
                          <div className="flex items-center justify-between">
                            <div className={`text-xl font-bold ${period.netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                              {formatCurrency(period.netProfit)}
                            </div>
                            <div className={`text-sm ${netProfitMargin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                              {netProfitMargin >= 0 ? '+' : ''}{formatPercentage(netProfitMargin)}
                            </div>
                          </div>
                        </div>

                        <div className="text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPeriodForDetails(period.id)
                            }}
                            className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
                          >
                            More
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Table Section */}
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-text-primary">
                      {selectedTileConfig?.label || 'Period'}
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTableView('products')}
                        className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                          tableView === 'products'
                            ? 'bg-primary-600 text-white'
                            : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Products
                      </button>
                      <button
                        onClick={() => setTableView('order-items')}
                        className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                          tableView === 'order-items'
                            ? 'bg-primary-600 text-white'
                            : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Order items
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select className="px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600">
                      <option>Group by parent</option>
                      <option>Group by product</option>
                      <option>Group by category</option>
                    </select>
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
                  {tableView === 'products' ? (
                    <SellerboardProductsTable products={productData} isLoading={productFetching} searchTerm={debouncedSearchTerm} />
                  ) : (
                    <OrderItemsTable orderItems={orderItemsData} isLoading={orderItemsFetching} searchTerm={debouncedSearchTerm} />
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── P&L VIEW ── */}
        {activeTab === 'pnl' && (
          <>
            <div className="mb-6">
              <PLTable data={plData} isLoading={plFetching} error={plError} currency={selectedCurrency} />
            </div>
            <div className="bg-surface-secondary border-b border-border mb-6">
              <div className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-[55%]">
                    <div className="relative">
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
                        className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <div className="min-w-[160px]">
                      <MarketplaceMultiSelect
                        options={MARKETPLACES}
                        value={selectedMarketplaces}
                        onChange={handleMarketplacesChange}
                      />
                    </div>
                    <div className="min-w-[100px]">
                      <Select
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
                        options={[
                          { value: 'CAD', label: 'CAD' },
                          { value: 'USD', label: 'USD' },
                          { value: 'EUR', label: 'EUR' },
                        ]}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      onClick={handleReload}
                      className="bg-surface border border-border hover:bg-surface-tertiary text-text-primary"
                      title="Reload data"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-text-primary">
                      {selectedTileConfig?.label || 'Period'}
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTableView('products')}
                        className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                          tableView === 'products'
                            ? 'bg-primary-600 text-white'
                            : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Products
                      </button>
                      <button
                        onClick={() => setTableView('order-items')}
                        className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                          tableView === 'order-items'
                            ? 'bg-primary-600 text-white'
                            : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Order items
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select className="px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600">
                      <option>Group by parent</option>
                      <option>Group by product</option>
                      <option>Group by category</option>
                    </select>
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
                  {tableView === 'products' ? (
                    <SellerboardProductsTable products={productData} isLoading={productFetching} searchTerm={debouncedSearchTerm} />
                  ) : (
                    <OrderItemsTable orderItems={orderItemsData} isLoading={orderItemsFetching} searchTerm={debouncedSearchTerm} />
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'map' && (
          <MapComponent
            accountId={effectiveAccountId}
            startDate={getRollingDateRangePST(30).startDate}
            endDate={getRollingDateRangePST(30).endDate}
          />
        )}

        {activeTab === 'trends' && (
          <TrendsComponent
            accountId={effectiveAccountId}
            startDate={getRollingDateRangePST(30).startDate}
            endDate={getRollingDateRangePST(30).endDate}
          />
        )}

        {/* Tile Details Modal */}
        {selectedPeriodForDetails && (
          <TileDetailsModal
            isOpen={!!selectedPeriodForDetails}
            onClose={() => setSelectedPeriodForDetails(null)}
            periodLabel={periodCardsData.find((p) => p.id === selectedPeriodForDetails)?.label || ''}
            dateRange={periodCardsData.find((p) => p.id === selectedPeriodForDetails)?.dateRange || ''}
            data={getPeriodDetailData(selectedPeriodForDetails)}
            currency={selectedCurrency}
          />
        )}
      </Container>
    </div>
  )
}