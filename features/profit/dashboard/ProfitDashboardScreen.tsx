'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
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
import {
  useGetDashboardChartQuery,
  ChartPeriod,
} from '@/services/api/charts.api'
import { SellerboardProductsTable } from './SellerboardProductsTable'
import { OrderItemsTable } from './OrderItemsTable'
import { DashboardChart } from './DashboardChart'
import { PLTable } from './PLTable'
import { MapComponent } from './components/MapComponent'
import { TrendsComponent } from './components/TrendsComponent'
import { ChartSummaryTable } from './components/ChartSummaryTable'
import { TileDetailsModal } from './components/TileDetailsModal'
import { formatCurrency } from '@/utils/format'

import {
  format,
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'

import SummaryTiles from './SummaryTiles'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { MARKETPLACES } from '@/utils/marketplaces'
import DateRangePicker, {
  DateRangeValue,
} from '@/components/date-range-picker/DateRangePicker'

export const TIMEZONE = 'America/Los_Angeles'

const PRESET_STORAGE_KEY = 'profit-dashboard-preset'

// ============================================
// PST / PDT DATE UTILITIES
// ============================================

const nowInPST = () => toZonedTime(new Date(), TIMEZONE)

const toISODatePST = (date: Date) => format(date, 'yyyy-MM-dd')

const formatDateRangePST = (
  startDate: string,
  endDate: string
) => {
  const startInstant = new Date(`${startDate}T12:00:00Z`)
  const endInstant = new Date(`${endDate}T12:00:00Z`)

  if (startDate === endDate) {
    return formatInTimeZone(
      startInstant,
      TIMEZONE,
      'MMMM d, yyyy'
    )
  }

  const startYear = formatInTimeZone(
    startInstant,
    TIMEZONE,
    'yyyy'
  )

  const endYear = formatInTimeZone(
    endInstant,
    TIMEZONE,
    'yyyy'
  )

  if (startYear === endYear) {
    return `${formatInTimeZone(
      startInstant,
      TIMEZONE,
      'MMM d'
    )} - ${formatInTimeZone(
      endInstant,
      TIMEZONE,
      'MMM d, yyyy'
    )}`
  }

  return `${formatInTimeZone(
    startInstant,
    TIMEZONE,
    'MMM d, yyyy'
  )} - ${formatInTimeZone(
    endInstant,
    TIMEZONE,
    'MMM d, yyyy'
  )}`
}

const addDaysPST = (date: Date, days: number) =>
  addDays(date, days)

const startOfMonthPST = (date: Date) =>
  startOfMonth(date)

const endOfMonthPST = (date: Date) =>
  endOfMonth(date)

const startOfWeekPST = (
  date: Date,
  weekStartsOn: 0 | 1 = 1
) =>
  startOfWeek(date, {
    weekStartsOn,
  })

const endOfWeekPST = (
  date: Date,
  weekStartsOn: 0 | 1 = 1
) =>
  endOfWeek(date, {
    weekStartsOn,
  })

const getRollingDateRangePST = (days: number) => {
  const end = nowInPST()
  const start = addDaysPST(
    end,
    -(days - 1)
  )

  return {
    startDate: toISODatePST(start),
    endDate: toISODatePST(end),
  }
}

const getSingleDayPST = (daysAgo: number) => {
  const d = addDaysPST(
    nowInPST(),
    -daysAgo
  )

  const ymd = toISODatePST(d)

  return {
    startDate: ymd,
    endDate: ymd,
  }
}

// ============================================
// TYPES
// ============================================

type DashboardTab =
  | 'tiles'
  | 'chart'
  | 'pnl'
  | 'map'
  | 'trends'
  | 'sandbox'

type TableView =
  | 'products'
  | 'order-items'

type CurrencyCode =
  | 'CAD'
  | 'USD'
  | 'EUR'

interface TileConfig {
  id: string
  label: string
  apiPeriod: PeriodSummaryPeriod
  getDateRange: (
    nowPST: Date
  ) => {
    startDate: string
    endDate: string
  }
}

interface TilePreset {
  id: string
  label: string
  tiles: TileConfig[]
}

// ============================================
// CHART PRESETS
// ============================================

const chartPresets = [
  {
    id: 'last-12-months',
    label: 'Last 12 months, by month',
    getRange: () => {
      const end = nowInPST()
      const start = addMonths(end, -12)

      return {
        startDate: toISODatePST(start),
        endDate: toISODatePST(end),
        periodicity: 'month',
      }
    },
  },

  {
    id: 'last-3-months',
    label: 'Last 3 months, by week',
    getRange: () => {
      const end = nowInPST()
      const start = addMonths(end, -3)

      return {
        startDate: toISODatePST(start),
        endDate: toISODatePST(end),
        periodicity: 'week',
      }
    },
  },

  {
    id: 'last-30-days',
    label: 'Last 30 days, by day',
    getRange: () => {
      const end = nowInPST()
      const start = addDaysPST(end, -29)

      return {
        startDate: toISODatePST(start),
        endDate: toISODatePST(end),
        periodicity: 'day',
      }
    },
  },

  {
    id: 'custom',
    label: 'Custom range',
    getRange: () => ({
      startDate: toISODatePST(
        addDaysPST(nowInPST(), -29)
      ),
      endDate: toISODatePST(nowInPST()),
      periodicity: 'day',
    }),
  },
]

// ============================================
// CHART PERIODICITY
// ============================================

const inferPeriodicity = (
  startDate: string,
  endDate: string
): 'day' | 'week' | 'month' => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const daysDiff = Math.ceil(
    (end.getTime() - start.getTime()) /
      (1000 * 60 * 60 * 24)
  )

  if (daysDiff <= 31) {
    return 'day'
  }

  if (daysDiff <= 90) {
    return 'week'
  }

  return 'month'
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

          return {
            startDate: ymd,
            endDate: ymd,
          }
        },
      },

      {
        id: 'yesterday',
        label: 'Yesterday',
        apiPeriod: 'YESTERDAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(
            addDaysPST(now, -1)
          )

          return {
            startDate: ymd,
            endDate: ymd,
          }
        },
      },

      {
        id: 'month-to-date',
        label: 'Month to date',
        apiPeriod: 'MONTH_TO_DATE',
        getDateRange: (now) => ({
          startDate: toISODatePST(
            startOfMonthPST(now)
          ),
          endDate: toISODatePST(now),
        }),
      },

      {
        id: 'this-month-forecast',
        label: 'This month',
        apiPeriod: 'THIS_MONTH_FORECAST',
        getDateRange: (now) => ({
          startDate: toISODatePST(
            startOfMonthPST(now)
          ),
          endDate: toISODatePST(
            endOfMonthPST(now)
          ),
        }),
      },

      {
        id: 'last-month',
        label: 'Last month',
        apiPeriod: 'LAST_MONTH',
        getDateRange: (now) => {
          const start = startOfMonthPST(
            addMonths(now, -1)
          )

          const end = endOfMonthPST(start)

          return {
            startDate: toISODatePST(start),
            endDate: toISODatePST(end),
          }
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

          return {
            startDate: ymd,
            endDate: ymd,
          }
        },
      },

      {
        id: 'yesterday',
        label: 'Yesterday',
        apiPeriod: 'YESTERDAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(
            addDaysPST(now, -1)
          )

          return {
            startDate: ymd,
            endDate: ymd,
          }
        },
      },

      {
        id: 'month-to-date',
        label: 'Month to date',
        apiPeriod: 'MONTH_TO_DATE',
        getDateRange: (now) => ({
          startDate: toISODatePST(
            startOfMonthPST(now)
          ),
          endDate: toISODatePST(now),
        }),
      },

      {
        id: 'last-month',
        label: 'Last month',
        apiPeriod: 'LAST_MONTH',
        getDateRange: (now) => {
          const start = startOfMonthPST(
            addMonths(now, -1)
          )

          const end = endOfMonthPST(start)

          return {
            startDate: toISODatePST(start),
            endDate: toISODatePST(end),
          }
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

          return {
            startDate: ymd,
            endDate: ymd,
          }
        },
      },

      {
        id: 'yesterday',
        label: 'Yesterday',
        apiPeriod: 'YESTERDAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(
            addDaysPST(now, -1)
          )

          return {
            startDate: ymd,
            endDate: ymd,
          }
        },
      },

      {
        id: '7days',
        label: '7 days',
        apiPeriod: '7DAYS',
        getDateRange: (now) => {
          const end = now
          const start = addDaysPST(end, -6)

          return {
            startDate: toISODatePST(start),
            endDate: toISODatePST(end),
          }
        },
      },

      {
        id: '14days',
        label: '14 days',
        apiPeriod: '14DAYS',
        getDateRange: (now) => {
          const end = now
          const start = addDaysPST(end, -13)

          return {
            startDate: toISODatePST(start),
            endDate: toISODatePST(end),
          }
        },
      },

      {
        id: '30days',
        label: '30 days',
        apiPeriod: '30DAYS',
        getDateRange: (now) => {
          const end = now
          const start = addDaysPST(end, -29)

          return {
            startDate: toISODatePST(start),
            endDate: toISODatePST(end),
          }
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
          startDate: toISODatePST(
            startOfWeekPST(now)
          ),
          endDate: toISODatePST(
            endOfWeekPST(now)
          ),
        }),
      },

      {
        id: 'last-week',
        label: 'Last week',
        apiPeriod: 'LAST_WEEK',
        getDateRange: (now) => {
          const start = addDaysPST(
            startOfWeekPST(now),
            -7
          )

          const end = endOfWeekPST(start)

          return {
            startDate: toISODatePST(start),
            endDate: toISODatePST(end),
          }
        },
      },

      {
        id: '2-weeks-ago',
        label: '2 weeks ago',
        apiPeriod: '2WEEKSAGO',
        getDateRange: (now) => {
          const start = addDaysPST(
            startOfWeekPST(now),
            -14
          )

          const end = endOfWeekPST(start)

          return {
            startDate: toISODatePST(start),
            endDate: toISODatePST(end),
          }
        },
      },

      {
        id: '3-weeks-ago',
        label: '3 weeks ago',
        apiPeriod: '3WEEKSAGO',
        getDateRange: (now) => {
          const start = addDaysPST(
            startOfWeekPST(now),
            -21
          )

          const end = endOfWeekPST(start)

          return {
            startDate: toISODatePST(start),
            endDate: toISODatePST(end),
          }
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
          startDate: toISODatePST(
            startOfMonthPST(now)
          ),
          endDate: toISODatePST(now),
        }),
      },

      {
        id: 'last-month',
        label: 'Last month',
        apiPeriod: 'LAST_MONTH',
        getDateRange: (now) => {
          const start = startOfMonthPST(
            addMonths(now, -1)
          )

          const end = endOfMonthPST(start)

          return {
            startDate: toISODatePST(start),
            endDate: toISODatePST(end),
          }
        },
      },

      {
        id: '2-months-ago',
        label: '2 months ago',
        apiPeriod: '2MONTHSAGO',
        getDateRange: (now) => {
          const start = startOfMonthPST(
            addMonths(now, -2)
          )

          const end = endOfMonthPST(start)

          return {
            startDate: toISODatePST(start),
            endDate: toISODatePST(end),
          }
        },
      },

      {
        id: '3-months-ago',
        label: '3 months ago',
        apiPeriod: '3MONTHSAGO',
        getDateRange: (now) => {
          const start = startOfMonthPST(
            addMonths(now, -3)
          )

          const end = endOfMonthPST(start)

          return {
            startDate: toISODatePST(start),
            endDate: toISODatePST(end),
          }
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

          return {
            startDate: ymd,
            endDate: ymd,
          }
        },
      },

      {
        id: 'yesterday',
        label: 'Yesterday',
        apiPeriod: 'YESTERDAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(
            addDaysPST(now, -1)
          )

          return {
            startDate: ymd,
            endDate: ymd,
          }
        },
      },

      {
        id: '2-days-ago',
        label: '2 days ago',
        apiPeriod: '2DAYSAGO',
        getDateRange: (now) => {
          const ymd = toISODatePST(
            addDaysPST(now, -2)
          )

          return {
            startDate: ymd,
            endDate: ymd,
          }
        },
      },

      {
        id: '3-days-ago',
        label: '3 days ago',
        apiPeriod: '3DAYSAGO',
        getDateRange: (now) => {
          const ymd = toISODatePST(
            addDaysPST(now, -3)
          )

          return {
            startDate: ymd,
            endDate: ymd,
          }
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

          return {
            startDate: ymd,
            endDate: ymd,
          }
        },
      },

      {
        id: 'yesterday',
        label: 'Yesterday',
        apiPeriod: 'YESTERDAY',
        getDateRange: (now) => {
          const ymd = toISODatePST(
            addDaysPST(now, -1)
          )

          return {
            startDate: ymd,
            endDate: ymd,
          }
        },
      },

      {
        id: '7-days-ago',
        label: '7 days ago',
        apiPeriod: '7DAYSAGO',
        getDateRange: (now) => {
          const ymd = toISODatePST(
            addDaysPST(now, -7)
          )

          return {
            startDate: ymd,
            endDate: ymd,
          }
        },
      },

      {
        id: '8-days-ago',
        label: '8 days ago',
        apiPeriod: '8DAYSAGO',
        getDateRange: (now) => {
          const ymd = toISODatePST(
            addDaysPST(now, -8)
          )

          return {
            startDate: ymd,
            endDate: ymd,
          }
        },
      },
    ],
  },
]

// ============================================
// GRID
// ============================================

const gridColsClass: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'xl:grid-cols-4 lg:grid-cols-3',
  5: 'xl:grid-cols-5 lg:grid-cols-3',
}

// ============================================
// COMPONENT
// ============================================

export const ProfitDashboardScreen: React.FC =
  () => {
    const dispatch = useAppDispatch()

    const profitFilters = useAppSelector(
      (state) => state.profit.filters
    )

    const { data: accountsData } =
      useGetAccountsQuery()

    const searchParams = useSearchParams()

    const activeTab =
      (searchParams?.get(
        'tab'
      ) as DashboardTab) || 'tiles'

    const [tableView, setTableView] =
      useState<TableView>('products')

    const [searchTerm, setSearchTerm] =
      useState('')

    const debouncedSearchTerm =
      useDebounce(searchTerm, 300)

    const [selectedPresetId, setSelectedPresetId] =
      useState<string>(
        tilePresets[2].id
      )

    const [selectedTileId, setSelectedTileId] =
      useState<string>('yesterday')

    const [
      selectedMarketplaces,
      setSelectedMarketplaces,
    ] = useState<string[]>([
      'Amazon.ca',
    ])

    const [selectedCurrency, setSelectedCurrency] =
      useState<CurrencyCode>('CAD')

    const [
      selectedPeriodForDetails,
      setSelectedPeriodForDetails,
    ] = useState<string | null>(null)

    // ============================================
    // CUSTOM TILE RANGE
    // ============================================

    const [customTileRange, setCustomTileRange] =
      useState<{
        startDate: string
        endDate: string
      } | null>(null)

    // ============================================
    // CHART / P&L DATE RANGE
    // ============================================

    const [dateRange, setDateRange] =
      useState<
        DateRangeValue & {
          periodicity?: string
        }
      >({
        startDate: toISODatePST(
          addDaysPST(nowInPST(), -29)
        ),
        endDate: toISODatePST(
          nowInPST()
        ),
        presetId: 'last-30-days',
        periodicity: 'day',
      })

    const [page, setPage] =
      useState<number>(1)

    // ============================================
    // RESTORE TILE PRESET
    // ============================================

    useEffect(() => {
      try {
        const saved =
          localStorage.getItem(
            PRESET_STORAGE_KEY
          )

        if (
          saved &&
          (
            tilePresets.some(
              (preset) =>
                preset.id === saved
            ) ||
            saved === 'custom'
          )
        ) {
          setSelectedPresetId(saved)
        }
      } catch {
        // Ignore storage errors
      }
    }, [])

    // ============================================
    // CUSTOM PRESET
    // ============================================

    const customPreset: TilePreset =
      useMemo(() => {
        const range =
          customTileRange ||
          getRollingDateRangePST(7)

        return {
          id: 'custom',
          label: 'Custom range',

          tiles: [
            {
              id: 'custom-range',
              label: formatDateRangePST(
                range.startDate,
                range.endDate
              ),
              apiPeriod:
                'CUSTOM' as PeriodSummaryPeriod,

              getDateRange: () => range,
            },
          ],
        }
      }, [customTileRange])

    // ============================================
    // CURRENT PRESET
    // ============================================

    const currentPreset =
      useMemo(
        () =>
          selectedPresetId ===
          'custom'
            ? customPreset
            : tilePresets.find(
                (preset) =>
                  preset.id ===
                  selectedPresetId
              ) ||
              tilePresets[0],
        [
          selectedPresetId,
          customPreset,
        ]
      )

    // ============================================
    // DEFAULT ACCOUNT
    // ============================================

    useEffect(() => {
      if (
        !profitFilters.accountId &&
        accountsData?.length
      ) {
        dispatch(
          setFilters({
            ...profitFilters,
            accountId:
              accountsData[0].id,
          })
        )
      }
    }, [
      accountsData,
      dispatch,
      profitFilters,
    ])

    const effectiveAccountId =
      profitFilters.accountId ||
      accountsData?.[0]?.id

    // ============================================
    // SELECT FIRST TILE WHEN PRESET CHANGES
    // ============================================

    useEffect(() => {
      setSelectedTileId(
        currentPreset.tiles[0].id
      )
    }, [currentPreset])

    // ============================================
    // PROFIT SUMMARY - NAMED PRESETS
    // ============================================

    const {
      data: profitData,
      isFetching: profitFetching,
      refetch: refetchProfit,
    } =
      useGetProfitSummaryQuery(
        {
          accountId:
            effectiveAccountId,
          marketplaces:
            selectedMarketplaces,
          currency:
            selectedCurrency,
          preset:
            selectedPresetId as any,
        },
        {
          skip:
            !effectiveAccountId ||
            selectedPresetId ===
              'custom',
        }
      )

    // ============================================
    // PROFIT SUMMARY - CUSTOM
    // ============================================

    const {
      data: customSummaryData,
      isFetching:
        customSummaryFetching,
      refetch:
        refetchCustomSummary,
    } =
      useGetProfitSummaryQuery(
        {
          accountId:
            effectiveAccountId,
          marketplaces:
            selectedMarketplaces,
          currency:
            selectedCurrency,
          startDate:
            customTileRange?.startDate,
          endDate:
            customTileRange?.endDate,
        } as any,
        {
          skip:
            !effectiveAccountId ||
            selectedPresetId !==
              'custom' ||
            !customTileRange,
        }
      )

    const isFetchingActive =
      selectedPresetId === 'custom'
        ? customSummaryFetching
        : profitFetching

    const activeSummaryData =
      selectedPresetId === 'custom'
        ? customSummaryData
        : profitData

    // ============================================
    // PERIOD MAP
    // ============================================

    const periodMap = useMemo(() => {
      if (
        selectedPresetId ===
        'custom'
      ) {
        const map =
          new Map<
            PeriodSummaryPeriod,
            PeriodSummary
          >()

        if (customSummaryData) {
          const raw: any =
            customSummaryData

          const single =
            Array.isArray(
              raw?.periods
            )
              ? raw.periods[0]
              : raw

          if (single) {
            map.set(
              'CUSTOM' as PeriodSummaryPeriod,
              single
            )
          }
        }

        return map
      }

      if (!profitData?.periods) {
        return new Map<
          PeriodSummaryPeriod,
          PeriodSummary
        >()
      }

      return new Map(
        profitData.periods.map(
          (period: any) => [
            period.period,
            period,
          ]
        )
      )
    }, [
      profitData,
      selectedPresetId,
      customSummaryData,
    ])

    // ============================================
    // TILE DETAIL DATA
    // ============================================

    const getPeriodDetailData =
      useCallback(
        (tileId: string) => {
          const tile =
            currentPreset.tiles.find(
              (item) =>
                item.id === tileId
            )

          if (!tile) {
            console.warn(
              '[TileDetailsModal] Tile not found:',
              tileId
            )

            return undefined
          }

          const apiPeriod =
            periodMap.get(
              tile.apiPeriod
            )

          if (!apiPeriod) {
            console.warn(
              '[TileDetailsModal] API period not found:',
              tile.apiPeriod,
              'Available periods:',
              Array.from(
                periodMap.keys()
              )
            )

            return undefined
          }

          return {
            currency:
              apiPeriod.currency ||
              selectedCurrency,

            salesRevenue: Number(
              apiPeriod.salesRevenue ??
                0
            ),

            salesCount: Number(
              apiPeriod.salesCount ??
                0
            ),

            ordersUnitCount: Number(
              apiPeriod.ordersUnitCount ??
                0
            ),

            totalPromo: Number(
              apiPeriod.totalPromo ??
                0
            ),

            advertisingCost: Number(
              apiPeriod.advertisingCost ??
                0
            ),

            advertisingDetails: {
              sponsoredProducts:
                Number(
                  apiPeriod
                    .advertisingDetails
                    ?.sponsoredProducts ??
                    0
                ),

              sponsoredBrandsVideo:
                Number(
                  apiPeriod
                    .advertisingDetails
                    ?.sponsoredBrandsVideo ??
                    0
                ),

              sponsoredDisplay:
                Number(
                  apiPeriod
                    .advertisingDetails
                    ?.sponsoredDisplay ??
                    0
                ),

              sponsoredBrands:
                Number(
                  apiPeriod
                    .advertisingDetails
                    ?.sponsoredBrands ??
                    0
                ),
            },

            totalRefunds: Number(
              apiPeriod.totalRefunds ??
                0
            ),

            totalRefundsCount:
              Number(
                apiPeriod.totalRefundsCount ??
                  0
              ),

            refundCost: Number(
              apiPeriod.refundCost ??
                0
            ),

            refundPercentage:
              Number(
                apiPeriod.refundPercentage ??
                  0
              ),

            refundDetails: {
              refundedAmount:
                Number(
                  apiPeriod
                    .refundDetails
                    ?.refundedAmount ??
                    0
                ),

              refundCommission:
                Number(
                  apiPeriod
                    .refundDetails
                    ?.refundCommission ??
                    0
                ),

              promotion: Number(
                apiPeriod
                  .refundDetails
                  ?.promotion ?? 0
              ),

              valueOfReturnedItems:
                Number(
                  apiPeriod
                    .refundDetails
                    ?.valueOfReturnedItems ??
                    0
                ),

              refundedReferralFee:
                Number(
                  apiPeriod
                    .refundDetails
                    ?.refundedReferralFee ??
                    0
                ),
            },

            totalFees: Number(
              apiPeriod.totalFees ??
                0
            ),

            amazonFeeDetails: {
              fbaStorageFee: Number(
                apiPeriod
                  .amazonFeeDetails
                  ?.fbaStorageFee ?? 0
              ),

              fbaPerUnitFulfillmentFee:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.fbaPerUnitFulfillmentFee ??
                    0
                ),

              referralFee: Number(
                apiPeriod
                  .amazonFeeDetails
                  ?.referralFee ?? 0
              ),

              dealParticipationFee:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.dealParticipationFee ??
                    0
                ),

              dealPerformanceFee:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.dealPerformanceFee ??
                    0
                ),

              fbaDisposalFee: Number(
                apiPeriod
                  .amazonFeeDetails
                  ?.fbaDisposalFee ?? 0
              ),

              salesTaxCollectionFee:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.salesTaxCollectionFee ??
                    0
                ),

              reversalReimbursement:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.reversalReimbursement ??
                    0
                ),

              other: Number(
                apiPeriod
                  .amazonFeeDetails
                  ?.other ?? 0
              ),
            },

            totalCOGS: Number(
              apiPeriod.totalCOGS ??
                0
            ),

            totalExpenses: Number(
              apiPeriod.totalExpenses ??
                0
            ),

            grossProfit: Number(
              apiPeriod.grossProfit ??
                0
            ),

            estimatedPayout:
              Number(
                apiPeriod.estimatedPayout ??
                  0
              ),

            netProfit: Number(
              apiPeriod.netProfit ??
                0
            ),

            margin: Number(
              apiPeriod.margin ?? 0
            ),

            realACOS: Number(
              apiPeriod.realACOS ?? 0
            ),

            roi: Number(
              apiPeriod.roi ?? 0
            ),

            _apiPeriod: apiPeriod,
          }
        },
        [
          currentPreset,
          periodMap,
          selectedCurrency,
        ]
      )

    // ============================================
    // PERIOD CARDS
    // ============================================

    const periodCardsData =
      useMemo(() => {
        const now = nowInPST()

        return currentPreset.tiles.map(
          (tile) => {
            const period =
              periodMap.get(
                tile.apiPeriod
              )

            const range =
              tile.getDateRange(now)

            return {
              id: tile.id,

              label: tile.label,

              dateRange:
                formatDateRangePST(
                  range.startDate,
                  range.endDate
                ),

              salesRevenue: Number(
                period?.salesRevenue ??
                  0
              ),

              salesCount: Number(
                period?.salesCount ?? 0
              ),

              ordersUnitCount:
                Number(
                  period?.ordersUnitCount ??
                    0
                ),

              totalFees: Number(
                period?.totalFees ?? 0
              ),

              totalRefunds: Number(
                period?.totalRefunds ??
                  0
              ),

              totalRefundsCount:
                Number(
                  period?.totalRefundsCount ??
                    0
                ),

              refundCost: Number(
                period?.refundCost ?? 0
              ),

              totalCOGS: Number(
                period?.totalCOGS ?? 0
              ),

              totalExpenses: Number(
                period?.totalExpenses ??
                  0
              ),

              totalPromo: Number(
                period?.totalPromo ?? 0
              ),

              advertisingCost:
                Number(
                  period?.advertisingCost ??
                    0
                ),

              grossProfit: Number(
                period?.grossProfit ?? 0
              ),

              estimatedPayout:
                Number(
                  period?.estimatedPayout ??
                    0
                ),

              netProfit: Number(
                period?.netProfit ?? 0
              ),

              margin: Number(
                period?.margin ?? 0
              ),

              realACOS: Number(
                period?.realACOS ?? 0
              ),

              roi: Number(
                period?.roi ?? 0
              ),

              refundPercentage:
                Number(
                  period?.refundPercentage ??
                    0
                ),

              isFetching:
                isFetchingActive,
            }
          }
        )
      }, [
        currentPreset,
        periodMap,
        isFetchingActive,
      ])

    // ============================================
    // SELECTED TILE
    // ============================================

    const selectedTileConfig =
      currentPreset.tiles.find(
        (tile) =>
          tile.id ===
          selectedTileId
      )

    const selectedTileRange =
      useMemo(() => {
        const now = nowInPST()

        return selectedTileConfig
          ? selectedTileConfig.getDateRange(
              now
            )
          : getSingleDayPST(1)
      }, [selectedTileConfig])

    // ============================================
    // CHART RANGE
    // ============================================

    const chartRange =
      useMemo(
        () => ({
          startDate:
            dateRange.startDate,
          endDate:
            dateRange.endDate,
        }),
        [dateRange]
      )

    const activeRange =
      useMemo(() => {
        const range =
          activeTab === 'chart' ||
          activeTab === 'pnl'
            ? chartRange
            : selectedTileRange

        return {
          startDate:
            range.startDate ||
            undefined,

          endDate:
            range.endDate ||
            undefined,
        }
      }, [
        activeTab,
        chartRange,
        selectedTileRange,
      ])

    // ============================================
    // PRODUCT QUERY
    // ============================================

    const {
      data: productData,
      isFetching: productFetching,
    } =
      useGetProfitByProductQuery(
        {
          ...profitFilters,
          accountId:
            effectiveAccountId,
          marketplaces:
            selectedMarketplaces,
          currency:
            selectedCurrency,
          startDate:
            activeRange.startDate,
          endDate:
            activeRange.endDate,
        },
        {
          skip:
            !effectiveAccountId ||
            tableView ===
              'order-items',
        }
      )

    // ============================================
    // ORDER ITEMS QUERY
    // ============================================

    const {
      data: orderItemsData,
      isFetching:
        orderItemsFetching,
    } =
      useGetProfitByOrderItemsQuery(
        {
          ...profitFilters,
          accountId:
            effectiveAccountId,
          marketplaces:
            selectedMarketplaces,
          currency:
            selectedCurrency,
          startDate:
            activeRange.startDate,
          endDate:
            activeRange.endDate,
        },
        {
          skip:
            !effectiveAccountId ||
            tableView === 'products',
        }
      )

    // ============================================
    // CHART FILTERS
    // ============================================

    const chartFilters =
      useMemo(
        () => ({
          accountId:
            effectiveAccountId,

          marketplaces:
            selectedMarketplaces,

          startDate:
            dateRange.startDate,

          endDate:
            dateRange.endDate,

          period:
            (dateRange.periodicity ||
              'day') as ChartPeriod,

          currency:
            selectedCurrency,
        }),
        [
          effectiveAccountId,
          selectedMarketplaces,
          dateRange,
          selectedCurrency,
        ]
      )

    const {
      data: chartData,
      isFetching:
        chartFetching,
      error: chartError,
    } =
      useGetDashboardChartQuery(
        chartFilters as any,
        {
          skip:
            !effectiveAccountId ||
            activeTab !== 'chart',
        }
      )

    // ============================================
    // P&L FILTERS
    // ============================================

    const plFilters: ProfitFilters =
      useMemo(
        () => ({
          accountId:
            effectiveAccountId,

          marketplaces:
            selectedMarketplaces,

          currency:
            selectedCurrency,

          startDate:
            dateRange.startDate ??
            undefined,

          endDate:
            dateRange.endDate ??
            undefined,

          periodicity:
            (dateRange.periodicity as
              | 'day'
              | 'week'
              | 'month') ??
            undefined,

          preset:
            (dateRange.presetId as
              | 'last-12-months'
              | 'last-3-months'
              | 'last-30-days'
              | 'custom') ??
            undefined,
        }),
        [
          effectiveAccountId,
          selectedMarketplaces,
          selectedCurrency,
          dateRange,
        ]
      )

    const {
      data: plData,
      isFetching: plFetching,
      error: plError,
    } =
      useGetPLByPeriodsQuery(
        plFilters,
        {
          skip:
            !effectiveAccountId ||
            activeTab !== 'pnl',
        }
      )

    // ============================================
    // RELOAD
    // ============================================

    const handleReload =
      useCallback(() => {
        if (
          selectedPresetId ===
          'custom'
        ) {
          refetchCustomSummary()
        } else {
          refetchProfit()
        }
      }, [
        selectedPresetId,
        refetchProfit,
        refetchCustomSummary,
      ])

    // ============================================
    // MARKETPLACE CHANGE
    // ============================================

    const handleMarketplacesChange =
      (value: string[]) => {
        setSelectedMarketplaces(
          value
        )

        dispatch(
          setFilters({
            ...profitFilters,
            marketplaces: value,
          })
        )
      }

    // ============================================
    // TILE DATE PRESETS
    // ============================================

    const tileDatePresets =
      useMemo(
        () => [
          ...tilePresets.map(
            (preset) => ({
              id: preset.id,

              label: preset.label,

              getRange: () => {
                const now =
                  nowInPST()

                const ranges =
                  preset.tiles.map(
                    (tile) =>
                      tile.getDateRange(
                        now
                      )
                  )

                const starts =
                  ranges
                    .map(
                      (range) =>
                        range.startDate
                    )
                    .sort()

                const ends =
                  ranges
                    .map(
                      (range) =>
                        range.endDate
                    )
                    .sort()

                return {
                  startDate:
                    starts[0],

                  endDate:
                    ends[
                      ends.length - 1
                    ],
                }
              },
            })
          ),

          {
            id: 'custom',
            label: 'Custom range',

            getRange: () => {
              const range =
                customTileRange ||
                getRollingDateRangePST(
                  7
                )

              return {
                startDate:
                  range.startDate,

                endDate:
                  range.endDate,
              }
            },
          },
        ],
        [customTileRange]
      )

    // ============================================
    // TILE DATE RANGE VALUE
    // ============================================

    const tileDateRangeValue =
      useMemo<DateRangeValue>(
        () => {
          if (
            selectedPresetId ===
            'custom'
          ) {
            const range =
              customTileRange ||
              getRollingDateRangePST(
                7
              )

            return {
              startDate:
                range.startDate,

              endDate:
                range.endDate,

              presetId: 'custom',

              periodicity: 'day',
            }
          }

          const preset =
            tileDatePresets.find(
              (item) =>
                item.id ===
                selectedPresetId
            )

          const range =
            preset?.getRange()

          return {
            startDate:
              range?.startDate ??
              null,

            endDate:
              range?.endDate ??
              null,

            presetId:
              selectedPresetId,

            periodicity: 'day',
          }
        },
        [
          selectedPresetId,
          customTileRange,
          tileDatePresets,
        ]
      )

    // ============================================
    // TILE DATE RANGE CHANGE
    // ============================================

    const handleTileDateRangeChange =
      useCallback(
        (
          range: DateRangeValue
        ) => {
          // -----------------------------
          // Named preset
          // -----------------------------

          if (
            range.presetId &&
            range.presetId !==
              'custom'
          ) {
            setSelectedPresetId(
              range.presetId
            )

            setCustomTileRange(
              null
            )

            try {
              localStorage.setItem(
                PRESET_STORAGE_KEY,
                range.presetId
              )
            } catch {
              // Ignore storage errors
            }

            return
          }

          // -----------------------------
          // Custom range
          // -----------------------------

          if (
            !range.startDate ||
            !range.endDate
          ) {
            return
          }

          setCustomTileRange({
            startDate:
              range.startDate,

            endDate:
              range.endDate,
          })

          setSelectedPresetId(
            'custom'
          )

          try {
            localStorage.setItem(
              PRESET_STORAGE_KEY,
              'custom'
            )
          } catch {
            // Ignore storage errors
          }
        },
        []
      )

    return (
      <div className="w-full">
        <Container size="full">

          {/* ======================================== */}
          {/* CHART VIEW */}
          {/* ======================================== */}

          {activeTab === 'chart' && (
            <>
              <div className="bg-surface-secondary border-b border-border mb-6">
                <div className="px-6 py-4">
                  <div className="flex items-center gap-4">

                    <div className="w-[45%]">
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
                          value={
                            searchTerm
                          }
                          onChange={(e) =>
                            setSearchTerm(
                              e.target.value
                            )
                          }
                          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end">

                      <div className="w-[220px] shrink-0">
                        <DateRangePicker
                          value={
                            dateRange
                          }
                          presets={
                            chartPresets
                          }
                          keepOpenPresetIds={[
                            'custom',
                          ]}
                          onChange={(
                            range
                          ) => {
                            const preset =
                              chartPresets.find(
                                (
                                  item
                                ) =>
                                  item.id ===
                                  range.presetId
                              )

                            const periodicity =
                              preset?.getRange()
                                .periodicity ||
                              inferPeriodicity(
                                range.startDate as string,
                                range.endDate as string
                              )

                            setDateRange({
                              ...range,
                              periodicity,
                            })

                            setPage(1)
                          }}
                          displayFormat="MMM d, yyyy"
                          placeholder="Select date range"
                        />
                      </div>

                      <div className="min-w-[160px] shrink-0">
                        <MultiSelectInput
                          title="Marketplace"
                          options={
                            MARKETPLACES
                          }
                          value={
                            selectedMarketplaces
                          }
                          onChange={
                            handleMarketplacesChange
                          }
                        />
                      </div>

                      <div className="min-w-[100px] shrink-0">
                        <Select
                          value={
                            selectedCurrency
                          }
                          onChange={(e) =>
                            setSelectedCurrency(
                              e.target
                                .value as CurrencyCode
                            )
                          }
                          options={[
                            {
                              value:
                                'CAD',
                              label:
                                'CAD',
                            },
                            {
                              value:
                                'USD',
                              label:
                                'USD',
                            },
                            {
                              value:
                                'EUR',
                              label:
                                'EUR',
                            },
                          ]}
                        />
                      </div>

                      <Button
                        variant="ghost"
                        onClick={
                          handleReload
                        }
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

              <div
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
                style={{
                  gridAutoRows:
                    '1fr',
                }}
              >
                <div className="lg:col-span-2 h-full">
                  <DashboardChart
                    data={chartData}
                    isLoading={
                      chartFetching
                    }
                    error={
                      chartError
                    }
                    currency={
                      selectedCurrency
                    }
                  />
                </div>

                <div className="lg:col-span-1 h-full">
                  <ChartSummaryTable
                    data={
                      chartData?.summary
                    }
                    isLoading={
                      chartFetching
                    }
                    currency={
                      selectedCurrency
                    }
                    startDate={
                      chartData?.startDate ||
                      ''
                    }
                    endDate={
                      chartData?.endDate ||
                      ''
                    }
                  />
                </div>
              </div>

              <Card>
                <CardContent className="p-0">

                  <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">

                    <div className="flex items-center gap-4">
                      <h2 className="text-lg font-semibold text-text-primary">
                        All Periods
                      </h2>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setTableView(
                              'products'
                            )
                          }
                          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                            tableView ===
                            'products'
                              ? 'bg-primary-600 text-white'
                              : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                          }`}
                        >
                          Products
                        </button>

                        {/* <button
                          onClick={() =>
                            setTableView(
                              'order-items'
                            )
                          }
                          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                            tableView ===
                            'order-items'
                              ? 'bg-primary-600 text-white'
                              : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                          }`}
                        >
                          Order items
                        </button> */}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">

                      {/* <Select
                        value="group-by-product"
                        onChange={() =>
                          undefined
                        }
                        options={[
                          {
                            value:
                              'group-by-parent',
                            label:
                              'Group by parent',
                          },
                          {
                            value:
                              'group-by-product',
                            label:
                              'Group by product',
                          },
                          {
                            value:
                              'group-by-category',
                            label:
                              'Group by category',
                          },
                        ]}
                        className="min-w-[160px]"
                      />

                      <button
                        className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                        title="Download"
                      >
                        ↓
                      </button>

                      <button
                        className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        ⧉
                      </button> */}

                    </div>
                  </div>

                  <div className="p-6">
                    {tableView ===
                    'products' ? (
                      <SellerboardProductsTable
                        products={
                          productData
                        }
                        isLoading={
                          productFetching
                        }
                        isFetching={
                          productFetching
                        }
                        searchTerm={
                          debouncedSearchTerm
                        }
                      />
                    ) : (
                      <OrderItemsTable
                        orderItems={
                          orderItemsData
                        }
                        isLoading={
                          orderItemsFetching
                        }
                        searchTerm={
                          debouncedSearchTerm
                        }
                      />
                    )}
                  </div>

                </CardContent>
              </Card>
            </>
          )}

          {/* ======================================== */}
          {/* TILES VIEW */}
          {/* ======================================== */}

          {activeTab === 'tiles' && (
            <>

              {isFetchingActive && (
                <div className="bg-surface-secondary border border-border rounded-xl p-6 mb-6 animate-pulse">
                  <div className="h-6 bg-border rounded w-1/3 mb-4" />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                    {[...Array(4)].map(
                      (_, index) => (
                        <div
                          key={index}
                          className="h-8 bg-border rounded"
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              {activeSummaryData?.summary &&
                !isFetchingActive && (
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white mb-6">

                    <h2 className="text-lg font-semibold mb-4">
                      Profit Overview (
                      {
                        currentPreset.label
                      }
                      )
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                      <div>
                        <div className="text-3xl font-bold">
                          {formatCurrency(
                            activeSummaryData
                              .summary
                              .totalRevenue
                          )}
                        </div>

                        <div className="text-blue-100 text-sm">
                          Total Revenue
                        </div>
                      </div>

                      <div>
                        <div
                          className={`text-3xl font-bold ${
                            activeSummaryData
                              .summary
                              .totalProfit >=
                            0
                              ? 'text-green-300'
                              : 'text-red-300'
                          }`}
                        >
                          {formatCurrency(
                            activeSummaryData
                              .summary
                              .totalProfit
                          )}
                        </div>

                        <div className="text-blue-100 text-sm">
                          Total Net Profit
                        </div>
                      </div>

                      <div>
                        <div className="text-3xl font-bold">
                          {
                            activeSummaryData
                              .summary
                              .totalOrders
                          }
                        </div>

                        <div className="text-blue-100 text-sm">
                          Total Orders
                        </div>
                      </div>

                      <div>
                        <div className="text-3xl font-bold">
                          {
                            activeSummaryData
                              .summary
                              .totalUnits
                          }
                        </div>

                        <div className="text-blue-100 text-sm">
                          Total Units
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              {/* ====================================== */}
              {/* TILES TOOLBAR */}
              {/* ====================================== */}

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
                          value={
                            searchTerm
                          }
                          onChange={(e) =>
                            setSearchTerm(
                              e.target.value
                            )
                          }
                          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                        />

                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end">

                      {/* FIXED DATE PICKER */}
                      <div>
                        <DateRangePicker
                          value={
                            tileDateRangeValue
                          }
                          presets={
                            tileDatePresets
                          }
                          keepOpenPresetIds={[
                            'custom',
                          ]}
                          onChange={
                            handleTileDateRangeChange
                          }
                          displayFormat="MMM d, yyyy"
                          placeholder="Select date range"
                        />
                      </div>

                      <div className="min-w-[160px] shrink-0">
                        <MultiSelectInput
                          title="Marketplace"
                          options={
                            MARKETPLACES
                          }
                          value={
                            selectedMarketplaces
                          }
                          onChange={
                            handleMarketplacesChange
                          }
                        />
                      </div>

                      <div className="min-w-[100px] shrink-0">
                        <Select
                          value={
                            selectedCurrency
                          }
                          onChange={(e) =>
                            setSelectedCurrency(
                              e.target
                                .value as CurrencyCode
                            )
                          }
                          options={[
                            {
                              value:
                                'CAD',
                              label:
                                'CAD',
                            },
                            {
                              value:
                                'USD',
                              label:
                                'USD',
                            },
                            {
                              value:
                                'EUR',
                              label:
                                'EUR',
                            },
                          ]}
                        />
                      </div>

                      <Button
                        variant="ghost"
                        onClick={
                          handleReload
                        }
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

              {/* ====================================== */}
              {/* PERIOD CARDS */}
              {/* ====================================== */}

              <div
                className={
                  selectedPresetId ===
                  'custom'
                    ? 'grid grid-cols-1 gap-4 mb-6 max-w-md'
                    : `grid grid-cols-1 md:grid-cols-2 ${
                        gridColsClass[
                          Math.min(
                            currentPreset
                              .tiles
                              .length,
                            5
                          )
                        ]
                      } gap-4 mb-6`
                }
              >

                {periodCardsData.map(
                  (period) => {
                    if (
                      period.isFetching
                    ) {
                      return (
                        <Card
                          key={
                            period.id
                          }
                          className="bg-surface border border-border min-h-[400px] min-w-0 flex flex-col"
                        >
                          <CardContent className="p-4 flex-1">
                            <KpiCardSkeleton />
                          </CardContent>
                        </Card>
                      )
                    }

                    return (
                      <Card
                        key={
                          period.id
                        }
                        className={`bg-surface border border-border cursor-pointer transition-shadow hover:shadow-md min-h-[400px] min-w-0 flex flex-col ${
                          selectedTileId ===
                          period.id
                            ? 'ring-2 ring-primary-200'
                            : ''
                        }`}
                        onClick={() =>
                          setSelectedTileId(
                            period.id
                          )
                        }
                      >
                        <CardContent className="p-4 break-words min-w-0 flex-1 flex flex-col">
                          <SummaryTiles
                            setSelectedPeriodForDetails={
                              setSelectedPeriodForDetails
                            }
                            period={
                              period
                            }
                          />
                        </CardContent>
                      </Card>
                    )
                  }
                )}

              </div>

              {/* ====================================== */}
              {/* TILES TABLE */}
              {/* ====================================== */}

              <Card>
                <CardContent className="p-0">

                  <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">

                    <div className="flex items-center gap-4">

                      <h2 className="text-lg font-semibold text-text-primary">
                        {
                          selectedTileConfig
                            ?.label ||
                          'Period'
                        }
                      </h2>

                      <div className="flex gap-2">

                        <button
                          onClick={() =>
                            setTableView(
                              'products'
                            )
                          }
                          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                            tableView ===
                            'products'
                              ? 'bg-primary-600 text-white'
                              : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                          }`}
                        >
                          Products
                        </button>

                        {/* <button
                          onClick={() =>
                            setTableView(
                              'order-items'
                            )
                          }
                          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                            tableView ===
                            'order-items'
                              ? 'bg-primary-600 text-white'
                              : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                          }`}
                        >
                          Order items
                        </button> */}

                      </div>
                    </div>

                    <div className="flex items-center gap-2">
{/* 
                      <select className="px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600">
                        <option>
                          Group by parent
                        </option>

                        <option>
                          Group by product
                        </option>

                        <option>
                          Group by category
                        </option>
                      </select>

                      <button
                        disabled
                        className="opacity-50 p-1.5 text-text-muted rounded transition-colors"
                        title="Download"
                      >
                        ↓
                      </button> */}

                    </div>
                  </div>

                  <div className="p-6">

                    {tableView ===
                    'products' ? (
                      <SellerboardProductsTable
                        products={
                          productData as any
                        }
                        isLoading={
                          productFetching
                        }
                        isFetching={
                          productFetching
                        }
                        searchTerm={
                          debouncedSearchTerm
                        }
                      />
                    ) : (
                      <OrderItemsTable
                        orderItems={
                          orderItemsData
                        }
                        isLoading={
                          orderItemsFetching
                        }
                        searchTerm={
                          debouncedSearchTerm
                        }
                      />
                    )}

                  </div>
                </CardContent>
              </Card>

            </>
          )}

          {/* ======================================== */}
          {/* P&L VIEW */}
          {/* ======================================== */}

          {activeTab === 'pnl' && (
            <>
              <div className="bg-surface-secondary border-b border-border mb-6">
                <div className="px-6 py-4">

                  <div className="flex items-center gap-4">

                    <div className="basis-[50%] min-w-0">
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
                          value={
                            searchTerm
                          }
                          onChange={(e) =>
                            setSearchTerm(
                              e.target.value
                            )
                          }
                          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                        />

                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end">

                      <div className="shrink-0">
                        <DateRangePicker
                          value={
                            dateRange
                          }
                          presets={
                            chartPresets
                          }
                          keepOpenPresetIds={[
                            'custom',
                          ]}
                          onChange={(
                            range
                          ) => {
                            const preset =
                              chartPresets.find(
                                (
                                  item
                                ) =>
                                  item.id ===
                                  range.presetId
                              )

                            const periodicity =
                              preset?.getRange()
                                .periodicity ||
                              inferPeriodicity(
                                range.startDate as string,
                                range.endDate as string
                              )

                            setDateRange({
                              ...range,
                              periodicity,
                            })
                          }}
                          displayFormat="MMM d, yyyy"
                          placeholder="Select date range"
                        />
                      </div>

                      <div className="min-w-[160px] shrink-0">
                        <MultiSelectInput
                          title="Marketplace"
                          options={
                            MARKETPLACES
                          }
                          value={
                            selectedMarketplaces
                          }
                          onChange={
                            handleMarketplacesChange
                          }
                        />
                      </div>

                      <div className="min-w-[100px] shrink-0">
                        <Select
                          value={
                            selectedCurrency
                          }
                          onChange={(e) =>
                            setSelectedCurrency(
                              e.target
                                .value as CurrencyCode
                            )
                          }
                          options={[
                            {
                              value:
                                'CAD',
                              label:
                                'CAD',
                            },
                            {
                              value:
                                'USD',
                              label:
                                'USD',
                            },
                            {
                              value:
                                'EUR',
                              label:
                                'EUR',
                            },
                          ]}
                        />
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <PLTable
                  data={plData}
                  isLoading={
                    plFetching
                  }
                  error={plError}
                  currency={
                    selectedCurrency
                  }
                />
              </div>

              <Card>
                <CardContent className="p-0">

                  <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">

                    <div className="flex items-center gap-4">

                      <h2 className="text-lg font-semibold text-text-primary">
                        {
                          selectedTileConfig
                            ?.label ||
                          'Period'
                        }
                      </h2>

                      <div className="flex gap-2">

                        <button
                          onClick={() =>
                            setTableView(
                              'products'
                            )
                          }
                          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                            tableView ===
                            'products'
                              ? 'bg-primary-600 text-white'
                              : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                          }`}
                        >
                          Products
                        </button>

                        {/* <button
                          onClick={() =>
                            setTableView(
                              'order-items'
                            )
                          }
                          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                            tableView ===
                            'order-items'
                              ? 'bg-primary-600 text-white'
                              : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                          }`}
                        >
                          Order items
                        </button> */}

                      </div>
                    </div>

                    <div className="flex items-center gap-2">

                      {/* <select className="px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600">
                        <option>
                          Group by parent
                        </option>

                        <option>
                          Group by product
                        </option>

                        <option>
                          Group by category
                        </option>
                      </select>

                      <button
                        className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                        title="Download"
                      >
                        ↓
                      </button>

                      <button
                        className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        ⧉
                      </button> */}

                    </div>
                  </div>

                  <div className="p-6">

                    {tableView ===
                    'products' ? (
                      <SellerboardProductsTable
                        products={
                          productData
                        }
                        isLoading={
                          productFetching
                        }
                        isFetching={
                          productFetching
                        }
                        searchTerm={
                          debouncedSearchTerm
                        }
                      />
                    ) : (
                      <OrderItemsTable
                        orderItems={
                          orderItemsData
                        }
                        isLoading={
                          orderItemsFetching
                        }
                        searchTerm={
                          debouncedSearchTerm
                        }
                      />
                    )}

                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ======================================== */}
          {/* MAP */}
          {/* ======================================== */}

          {activeTab === 'map' && (
            <MapComponent
              accountId={
                effectiveAccountId
              }
            />
          )}

          {/* ======================================== */}
          {/* TRENDS */}
          {/* ======================================== */}

          {activeTab ===
            'trends' && (
            <TrendsComponent
              accountId={
                effectiveAccountId
              }
              marketplaces={
                selectedMarketplaces
              }
              currency={
                selectedCurrency
              }
            />
          )}

          {/* ======================================== */}
          {/* TILE DETAILS MODAL */}
          {/* ======================================== */}

          {selectedPeriodForDetails && (
            <TileDetailsModal
              isOpen={
                !!selectedPeriodForDetails
              }
              onClose={() =>
                setSelectedPeriodForDetails(
                  null
                )
              }
              periodLabel={
                periodCardsData.find(
                  (period) =>
                    period.id ===
                    selectedPeriodForDetails
                )?.label || ''
              }
              dateRange={
                periodCardsData.find(
                  (period) =>
                    period.id ===
                    selectedPeriodForDetails
                )?.dateRange || ''
              }
              data={getPeriodDetailData(
                selectedPeriodForDetails
              )}
              currency={
                selectedCurrency
              }
            />
          )}

        </Container>
      </div>
    )
  }

export default ProfitDashboardScreen