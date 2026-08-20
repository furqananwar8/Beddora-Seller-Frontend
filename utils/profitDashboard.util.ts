import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import {
  formatInTimeZone,
  toZonedTime,
} from 'date-fns-tz'

import { MARKETPLACES } from '@/utils/marketplaces'

import {
  PeriodSummaryPeriod,
} from '@/services/api/profit.api'

export const TIMEZONE =
  'America/Los_Angeles'

export const PRESET_STORAGE_KEY =
  'profit-dashboard-preset'

export const PRESET_PROFIT_SETTLEMENT_REPORT_PRESET = 'profit-settlement-report-preset'
/**
 * Values actually sent to the API when
 * no marketplace is selected.
 */
export const ALL_MARKETPLACES: string[] =
  (MARKETPLACES as any[])
    .map((marketplace) =>
      typeof marketplace === 'string'
        ? marketplace
        : marketplace.value
    )
    .filter(Boolean)

// ============================================
// TYPES
// ============================================

export interface TileDateRange {
  startDate: string
  endDate: string
}

export interface TileConfig {
  id: string
  label: string
  apiPeriod: PeriodSummaryPeriod

  getDateRange: (
    nowPST: Date
  ) => TileDateRange
}

export interface TilePreset {
  id: string
  label: string
  tiles: TileConfig[]
}

export interface ChartPreset {
  id: string
  label: string
  getRange: () => {
    startDate: string
    endDate: string
    periodicity: 'day' | 'week' | 'month'
  }
}

// ============================================
// PST / PDT DATE UTILITIES
// ============================================

export const nowInPST = () =>
  toZonedTime(
    new Date(),
    TIMEZONE
  )

export const toISODatePST = (
  date: Date
) =>
  format(
    date,
    'yyyy-MM-dd'
  )

export const formatDateRangePST = (
  startDate: string,
  endDate: string
) => {
  const startInstant =
    new Date(
      `${startDate}T12:00:00Z`
    )

  const endInstant =
    new Date(
      `${endDate}T12:00:00Z`
    )

  if (
    startDate === endDate
  ) {
    return formatInTimeZone(
      startInstant,
      TIMEZONE,
      'MMMM d, yyyy'
    )
  }

  const startYear =
    formatInTimeZone(
      startInstant,
      TIMEZONE,
      'yyyy'
    )

  const endYear =
    formatInTimeZone(
      endInstant,
      TIMEZONE,
      'yyyy'
    )

  if (
    startYear === endYear
  ) {
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

export const addDaysPST = (
  date: Date,
  days: number
) =>
  addDays(
    date,
    days
  )

export const startOfMonthPST = (
  date: Date
) =>
  startOfMonth(date)

export const endOfMonthPST = (
  date: Date
) =>
  endOfMonth(date)

export const startOfWeekPST = (
  date: Date,
  weekStartsOn: 0 | 1 = 1
) =>
  startOfWeek(date, {
    weekStartsOn,
  })

export const endOfWeekPST = (
  date: Date,
  weekStartsOn: 0 | 1 = 1
) =>
  endOfWeek(date, {
    weekStartsOn,
  })

export const getRollingDateRangePST = (
  days: number
): TileDateRange => {
  const end =
    nowInPST()

  const start =
    addDaysPST(
      end,
      -(days - 1)
    )

  return {
    startDate:
      toISODatePST(start),
    endDate:
      toISODatePST(end),
  }
}

export const getSingleDayPST = (
  daysAgo: number
): TileDateRange => {
  const date =
    addDaysPST(
      nowInPST(),
      -daysAgo
    )

  const ymd =
    toISODatePST(date)

  return {
    startDate: ymd,
    endDate: ymd,
  }
}

// ============================================
// CHART PRESETS
// ============================================

export const chartPresets: ChartPreset[] = [
  {
    id: 'last-12-months',
    label: 'Last 12 months, by month',

    getRange: () => {
      const end =
        nowInPST()

      const start =
        addMonths(
          end,
          -12
        )

      return {
        startDate:
          toISODatePST(start),
        endDate:
          toISODatePST(end),
        periodicity:
          'month',
      }
    },
  },

  {
    id: 'last-3-months',
    label: 'Last 3 months, by week',

    getRange: () => {
      const end =
        nowInPST()

      const start =
        addMonths(
          end,
          -3
        )

      return {
        startDate:
          toISODatePST(start),
        endDate:
          toISODatePST(end),
        periodicity:
          'week',
      }
    },
  },

  {
    id: 'last-30-days',
    label: 'Last 30 days, by day',

    getRange: () => {
      const end =
        nowInPST()

      const start =
        addDaysPST(
          end,
          -29
        )

      return {
        startDate:
          toISODatePST(start),
        endDate:
          toISODatePST(end),
        periodicity:
          'day',
      }
    },
  },

  {
    id: 'custom',
    label: 'Custom range',

    getRange: () => ({
      startDate:
        toISODatePST(
          addDaysPST(
            nowInPST(),
            -29
          )
        ),

      endDate:
        toISODatePST(
          nowInPST()
        ),

      periodicity:
        'day',
    }),
  },
]

// ============================================
// CHART PERIODICITY
// ============================================

export const inferPeriodicity = (
  startDate: string,
  endDate: string
):
  | 'day'
  | 'week'
  | 'month' => {
  const start =
    new Date(startDate)

  const end =
    new Date(endDate)

  const daysDiff =
    Math.ceil(
      (end.getTime() -
        start.getTime()) /
        (1000 *
          60 *
          60 *
          24)
    )

  if (
    daysDiff <= 31
  ) {
    return 'day'
  }

  if (
    daysDiff <= 90
  ) {
    return 'week'
  }

  return 'month'
}

// ============================================
// TILE PRESETS
// ============================================

export const tilePresets: TilePreset[] = [
  {
    id: 'today-yesterday-mtd-forecast-lastmonth',
    label:
      'Today / Yesterday / MTD / Forecast / Last Month',

    tiles: [
      {
        id: 'today',
        label: 'Today',
        apiPeriod: 'TODAY',

        getDateRange: (now) => {
          const ymd =
            toISODatePST(now)

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
          const ymd =
            toISODatePST(
              addDaysPST(
                now,
                -1
              )
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
          startDate:
            toISODatePST(
              startOfMonthPST(now)
            ),

          endDate:
            toISODatePST(now),
        }),
      },

      {
        id: 'this-month-forecast',
        label: 'This month',
        apiPeriod:
          'THIS_MONTH_FORECAST',

        getDateRange: (now) => ({
          startDate:
            toISODatePST(
              startOfMonthPST(now)
            ),

          endDate:
            toISODatePST(
              endOfMonthPST(now)
            ),
        }),
      },

      {
        id: 'last-month',
        label: 'Last month',
        apiPeriod: 'LAST_MONTH',

        getDateRange: (now) => {
          const start =
            startOfMonthPST(
              addMonths(now, -1)
            )

          const end =
            endOfMonthPST(start)

          return {
            startDate:
              toISODatePST(start),

            endDate:
              toISODatePST(end),
          }
        },
      },
    ],
  },

  {
    id: 'today-yesterday-mtd-lastmonth',
    label:
      'Today / Yesterday / MTD / Last Month',

    tiles: [
      {
        id: 'today',
        label: 'Today',
        apiPeriod: 'TODAY',

        getDateRange: (now) => {
          const ymd =
            toISODatePST(now)

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
          const ymd =
            toISODatePST(
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
          startDate:
            toISODatePST(
              startOfMonthPST(now)
            ),

          endDate:
            toISODatePST(now),
        }),
      },

      {
        id: 'last-month',
        label: 'Last month',
        apiPeriod: 'LAST_MONTH',

        getDateRange: (now) => {
          const start =
            startOfMonthPST(
              addMonths(now, -1)
            )

          const end =
            endOfMonthPST(start)

          return {
            startDate:
              toISODatePST(start),

            endDate:
              toISODatePST(end),
          }
        },
      },
    ],
  },

  {
    id: 'today-yesterday-7-14-30',
    label:
      'Today / Yesterday / 7 / 14 / 30 Days',

    tiles: [
      {
        id: 'today',
        label: 'Today',
        apiPeriod: 'TODAY',

        getDateRange: (now) => {
          const ymd =
            toISODatePST(now)

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
          const ymd =
            toISODatePST(
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

        getDateRange: (now) => ({
          startDate:
            toISODatePST(
              addDaysPST(now, -6)
            ),

          endDate:
            toISODatePST(now),
        }),
      },

      {
        id: '14days',
        label: '14 days',
        apiPeriod: '14DAYS',

        getDateRange: (now) => ({
          startDate:
            toISODatePST(
              addDaysPST(now, -13)
            ),

          endDate:
            toISODatePST(now),
        }),
      },

      {
        id: '30days',
        label: '30 days',
        apiPeriod: '30DAYS',

        getDateRange: (now) => ({
          startDate:
            toISODatePST(
              addDaysPST(now, -29)
            ),

          endDate:
            toISODatePST(now),
        }),
      },
    ],
  },

  {
    id: 'thisweek-lastweek-2w-3w',
    label:
      'This Week / Last Week / 2W / 3W',

    tiles: [
      {
        id: 'this-week',
        label: 'This week',
        apiPeriod: 'THIS_WEEK',

        getDateRange: (now) => ({
          startDate:
            toISODatePST(
              startOfWeekPST(now)
            ),

          endDate:
            toISODatePST(
              endOfWeekPST(now)
            ),
        }),
      },

      {
        id: 'last-week',
        label: 'Last week',
        apiPeriod: 'LAST_WEEK',

        getDateRange: (now) => {
          const start =
            addDaysPST(
              startOfWeekPST(now),
              -7
            )

          const end =
            endOfWeekPST(start)

          return {
            startDate:
              toISODatePST(start),

            endDate:
              toISODatePST(end),
          }
        },
      },

      {
        id: '2-weeks-ago',
        label: '2 weeks ago',
        apiPeriod: '2WEEKSAGO',

        getDateRange: (now) => {
          const start =
            addDaysPST(
              startOfWeekPST(now),
              -14
            )

          const end =
            endOfWeekPST(start)

          return {
            startDate:
              toISODatePST(start),

            endDate:
              toISODatePST(end),
          }
        },
      },

      {
        id: '3-weeks-ago',
        label: '3 weeks ago',
        apiPeriod: '3WEEKSAGO',

        getDateRange: (now) => {
          const start =
            addDaysPST(
              startOfWeekPST(now),
              -21
            )

          const end =
            endOfWeekPST(start)

          return {
            startDate:
              toISODatePST(start),

            endDate:
              toISODatePST(end),
          }
        },
      },
    ],
  },

  {
    id: 'mtd-lastmonth-2m-3m',
    label:
      'MTD / Last Month / 2M / 3M',

    tiles: [
      {
        id: 'month-to-date',
        label: 'Month to date',
        apiPeriod: 'MONTH_TO_DATE',

        getDateRange: (now) => ({
          startDate:
            toISODatePST(
              startOfMonthPST(now)
            ),

          endDate:
            toISODatePST(now),
        }),
      },

      {
        id: 'last-month',
        label: 'Last month',
        apiPeriod: 'LAST_MONTH',

        getDateRange: (now) => {
          const start =
            startOfMonthPST(
              addMonths(now, -1)
            )

          const end =
            endOfMonthPST(start)

          return {
            startDate:
              toISODatePST(start),

            endDate:
              toISODatePST(end),
          }
        },
      },

      {
        id: '2-months-ago',
        label: '2 months ago',
        apiPeriod: '2MONTHSAGO',

        getDateRange: (now) => {
          const start =
            startOfMonthPST(
              addMonths(now, -2)
            )

          const end =
            endOfMonthPST(start)

          return {
            startDate:
              toISODatePST(start),

            endDate:
              toISODatePST(end),
          }
        },
      },

      {
        id: '3-months-ago',
        label: '3 months ago',
        apiPeriod: '3MONTHSAGO',

        getDateRange: (now) => {
          const start =
            startOfMonthPST(
              addMonths(now, -3)
            )

          const end =
            endOfMonthPST(start)

          return {
            startDate:
              toISODatePST(start),

            endDate:
              toISODatePST(end),
          }
        },
      },
    ],
  },

  {
    id: 'today-yesterday-2d-3d',
    label:
      'Today / Yesterday / 2D / 3D',

    tiles: [
      {
        id: 'today',
        label: 'Today',
        apiPeriod: 'TODAY',

        getDateRange: (now) => {
          const ymd =
            toISODatePST(now)

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
          const ymd =
            toISODatePST(
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
          const ymd =
            toISODatePST(
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
          const ymd =
            toISODatePST(
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
    label:
      'Today / Yesterday / 7D / 8D',

    tiles: [
      {
        id: 'today',
        label: 'Today',
        apiPeriod: 'TODAY',

        getDateRange: (now) => {
          const ymd =
            toISODatePST(now)

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
          const ymd =
            toISODatePST(
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
          const ymd =
            toISODatePST(
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
          const ymd =
            toISODatePST(
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
// TILE GRID
// ============================================

export const gridColsClass: Record<
  number,
  string
> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'xl:grid-cols-4 lg:grid-cols-3',
  5: 'xl:grid-cols-5 lg:grid-cols-3',
}

export type DashboardTab =
  | 'tiles'
  | 'chart'
  | 'pnl'
  | 'map'
  | 'trends'
  | 'sandbox'

export type TableView =
  | 'products'
  | 'order-items'

export type CurrencyCode =
  | 'CAD'
  | 'USD'
  | 'EUR'