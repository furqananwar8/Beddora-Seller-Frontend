'use client'

import { useMemo, useState } from 'react'
import type { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ProfitDashboardHeader from './ProfitDashboardHeader'

type ViewMode = 'graph' | 'table'

type ComparisonKey =
  | 'today'
  | 'yesterday'
  | 'lastWeek'
  | 'lastYear'

interface Comparison {
  key: ComparisonKey
  label: string
  color: string
  checked: boolean
  units: number
  sales: number
  avgUnits: number
  avgSales: number
  subtitle: string
}

interface HourlyData {
  hour: string
  today: number
  yesterday: number
  lastWeek: number
  lastYear: number
}

/* ============================================================= */
/* COMPARISON DATA                                                */
/* ============================================================= */

const comparisonData: Comparison[] = [
  {
    key: 'today',
    label: 'Today so far',
    color: '#0891b2',
    checked: true,
    units: 82,
    sales: 2047.62,
    avgUnits: 1.17,
    avgSales: 29.25,
    subtitle: 'So far',
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    color: '#ef3b12',
    checked: true,
    units: 166,
    sales: 4903.55,
    avgUnits: 1.08,
    avgSales: 31.84,
    subtitle: 'By end of day',
  },
  {
    key: 'lastWeek',
    label: 'Same day last week',
    color: '#f59e0b',
    checked: true,
    units: 129,
    sales: 3652.17,
    avgUnits: 1.12,
    avgSales: 31.76,
    subtitle: 'By end of day',
  },
  {
    key: 'lastYear',
    label: 'Same day last year',
    color: '#7c8b8f',
    checked: true,
    units: 82,
    sales: 2598.84,
    avgUnits: 1.64,
    avgSales: 51.98,
    subtitle: 'By end of day',
  },
]

const hourlyData: HourlyData[] = [
  { hour: '12AM', today: 3, yesterday: 2, lastWeek: 1, lastYear: 4 },
  { hour: '1AM', today: 0, yesterday: 5, lastWeek: 5, lastYear: 3 },
  { hour: '2AM', today: 1, yesterday: 1, lastWeek: 1, lastYear: 0 },
  { hour: '3AM', today: 3, yesterday: 2, lastWeek: 3, lastYear: 4 },
  { hour: '4AM', today: 9, yesterday: 6, lastWeek: 5, lastYear: 1 },
  { hour: '5AM', today: 4, yesterday: 7, lastWeek: 2, lastYear: 3 },
  { hour: '6AM', today: 6, yesterday: 3, lastWeek: 6, lastYear: 4 },
  { hour: '7AM', today: 7, yesterday: 8, lastWeek: 4, lastYear: 2 },
  { hour: '8AM', today: 6, yesterday: 9, lastWeek: 5, lastYear: 8 },
  { hour: '9AM', today: 11, yesterday: 14, lastWeek: 9, lastYear: 13 },
  { hour: '10AM', today: 23, yesterday: 10, lastWeek: 8, lastYear: 2 },
  { hour: '11AM', today: 8, yesterday: 7, lastWeek: 11, lastYear: 5 },
  { hour: '12PM', today: 9, yesterday: 8, lastWeek: 8, lastYear: 13 },
  { hour: '1PM', today: 11, yesterday: 11, lastWeek: 17, lastYear: 2 },
  { hour: '2PM', today: 17, yesterday: 8, lastWeek: 10, lastYear: 2 },
  { hour: '3PM', today: 8, yesterday: 10, lastWeek: 6, lastYear: 6 },
  { hour: '4PM', today: 6, yesterday: 8, lastWeek: 2, lastYear: 2 },
  { hour: '5PM', today: 2, yesterday: 29, lastWeek: 9, lastYear: 3 },
  { hour: '6PM', today: 0, yesterday: 3, lastWeek: 7, lastYear: 0 },
  { hour: '7PM', today: 1, yesterday: 7, lastWeek: 4, lastYear: 0 },
  { hour: '8PM', today: 2, yesterday: 3, lastWeek: 2, lastYear: 3 },
  { hour: '9PM', today: 3, yesterday: 2, lastWeek: 4, lastYear: 1 },
  { hour: '10PM', today: 1, yesterday: 3, lastWeek: 3, lastYear: 7 },
  { hour: '11PM', today: 2, yesterday: 2, lastWeek: 1, lastYear: 4 },
]

const salesHourlyData = hourlyData.map((item, index) => ({
  hour: item.hour,

  today: [
    55, 100, 30, 70, 190, 90, 150, 190,
    170, 280, 560, 160, 220, 270, 210,
    320, 190, 330, 80, 260, 110, 90, 160,
    120,
  ][index],

  yesterday: [
    50, 150, 40, 50, 150, 220, 120, 220,
    170, 480, 280, 150, 250, 330, 200,
    310, 190, 330, 950, 80, 250, 130, 80,
    120,
  ][index],

  lastWeek: [
    90, 130, 20, 110, 180, 100, 170, 180,
    100, 280, 200, 280, 190, 450, 260,
    440, 40, 260, 90, 250, 130, 120, 80,
    60,
  ][index],

  lastYear: [
    30, 140, 50, 40, 200, 100, 120, 50,
    180, 60, 560, 170, 500, 70, 600, 50,
    120, 60, 80, 30, 20, 40, 180, 70,
  ][index],
}))

/* ============================================================= */
/* HELPERS                                                        */
/* ============================================================= */

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)

const formatPercent = (value: number) => {
  const sign = value > 0 ? '+' : ''

  return `${sign}${value.toFixed(2)}%`
}

const percentChange = (
  current: number,
  previous: number,
) => {
  if (!previous) return 0

  return ((current - previous) / previous) * 100
}

/* ============================================================= */
/* DATE HELPERS                                                    */
/* ============================================================= */

const formatDate = (date: Date) => {
  const year = date.getFullYear()

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getTodayRange = (): DateRangeValue => {
  const today = new Date()
  const date = formatDate(today)

  return {
    startDate: date,
    endDate: date,
  }
}

const getYesterdayRange = (): DateRangeValue => {
  const yesterday = new Date()

  yesterday.setDate(
    yesterday.getDate() - 1,
  )

  const date = formatDate(yesterday)

  return {
    startDate: date,
    endDate: date,
  }
}

const getWeekToDateRange = (): DateRangeValue => {
  const today = new Date()
  const day = today.getDay()

  const daysFromMonday =
    day === 0 ? 6 : day - 1

  const start = new Date(today)

  start.setDate(
    start.getDate() - daysFromMonday,
  )

  return {
    startDate: formatDate(start),
    endDate: formatDate(today),
  }
}

const getMonthToDateRange = (): DateRangeValue => {
  const today = new Date()

  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
  )

  return {
    startDate: formatDate(start),
    endDate: formatDate(today),
  }
}

const getYearToDateRange = (): DateRangeValue => {
  const today = new Date()

  const start = new Date(
    today.getFullYear(),
    0,
    1,
  )

  return {
    startDate: formatDate(start),
    endDate: formatDate(today),
  }
}

/* ============================================================= */
/* MAIN COMPONENT                                                  */
/* ============================================================= */

export default function CompareSales() {
  const [viewMode, setViewMode] =
    useState<ViewMode>('graph')

  const [dateRange, setDateRange] =
    useState<DateRangeValue>(
      getTodayRange,
    )

  const [marketplaces, setMarketplaces] =
    useState<string[]>([])

  const [isFiltering, setIsFiltering] =
    useState(false)

  const [selected, setSelected] =
    useState<
      Record<ComparisonKey, boolean>
    >({
      today: true,
      yesterday: true,
      lastWeek: true,
      lastYear: true,
    })

  const [expanded, setExpanded] =
    useState({
      yesterday: true,
      lastWeek: true,
      lastYear: true,
    })

  const datePresets = useMemo(
    () => [
      {
        id: 'today',
        label: 'Today',
        value: getTodayRange(),
      },
      {
        id: 'yesterday',
        label: 'Yesterday',
        value: getYesterdayRange(),
      },
      {
        id: 'week-to-date',
        label: 'Week to date',
        value: getWeekToDateRange(),
      },
      {
        id: 'month-to-date',
        label: 'Month to date',
        value: getMonthToDateRange(),
      },
      {
        id: 'year-to-date',
        label: 'Year to date',
        value: getYearToDateRange(),
      },
    ],
    [],
  )

  const handleFilter = async () => {
    setIsFiltering(true)

    try {
      console.log('Compare Sales Filters:', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        marketplaces,
      })
    } finally {
      setIsFiltering(false)
    }
  }

  const toggleSelected = (
    key: ComparisonKey,
  ) => {
    setSelected((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  const toggleExpanded = (
    key: keyof typeof expanded,
  ) => {
    setExpanded((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  return (
    <div className="w-full bg-white text-[#111827]">
      <ProfitDashboardHeader
        dateRange={dateRange}
        datePresets={datePresets}
        onDateRangeChange={setDateRange}
        marketplaces={marketplaces}
        onMarketplacesChange={setMarketplaces}
        onFilter={handleFilter}
        isFiltering={isFiltering}
        showSearch={false}
        showDateRange={true}
        showMarketplace={true}
        showCurrency={false}
        showFilterButton={true}
      />

      <section className="border border-[#d5d9d9]">
        <div className="flex items-center gap-3 border-b border-[#d5d9d9] px-4 py-2">
          <h1 className="text-[22px] font-normal text-[#0f1f33]">
            Sales snapshot
          </h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5">
          <SnapshotMetric
            label="Total order items"
            value="70"
          />

          <SnapshotMetric
            label="Units ordered"
            value="82"
          />

          <SnapshotMetric
            label="Ordered product sales"
            value="$2,047.62"
          />

          <SnapshotMetric
            label="Avg. units/order item"
            value="1.17"
          />

          <SnapshotMetric
            label="Avg. sales/order item"
            value="$29.25"
          />
        </div>
      </section>

      <section className="mt-1 border border-[#d5d9d9] bg-[#eaf6ff]">
        <div className="flex items-center justify-between px-7 py-5">
          <h2 className="text-[24px] font-normal text-[#0f1f33]">
            Compare Sales
          </h2>

          <div className="flex border border-[#c7c7c7] bg-white">
            <button
              type="button"
              onClick={() =>
                setViewMode('graph')
              }
              className={`px-4 py-1.5 text-[14px] ${
                viewMode === 'graph'
                  ? 'bg-[#007eb9] text-white'
                  : 'text-[#172b4d]'
              }`}
            >
              Graph view
            </button>

            <button
              type="button"
              onClick={() =>
                setViewMode('table')
              }
              className={`px-4 py-1.5 text-[14px] ${
                viewMode === 'table'
                  ? 'bg-[#007eb9] text-white'
                  : 'text-[#172b4d]'
              }`}
            >
              Table view
            </button>
          </div>
        </div>

        {viewMode === 'graph' ? (
          <GraphView
            selected={selected}
          />
        ) : (
          <TableView
            selected={selected}
            toggleSelected={toggleSelected}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
          />
        )}
      </section>
    </div>
  )
}

/* ============================================================= */
/* SNAPSHOT METRIC                                                */
/* ============================================================= */

function SnapshotMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="px-5 py-2">
      <div className="text-[14px] text-[#24364b]">
        {label}
      </div>

      <div className="mt-0.5 text-[27px] leading-tight text-[#101f33]">
        {value}
      </div>
    </div>
  )
}

/* ============================================================= */
/* GRAPH VIEW                                                     */
/* ============================================================= */

function GraphView({
  selected,
}: {
  selected: Record<
    ComparisonKey,
    boolean
  >
}) {
  return (
    <div className="px-5 pb-5">
      <div className="grid grid-cols-1 border border-[#d1d9dd] bg-white lg:grid-cols-2">
        <div className="border-b border-[#d1d9dd] p-3 lg:border-b-0 lg:border-r">
          <UnitsChart
            selected={selected}
          />
        </div>

        <div className="p-3">
          <SalesChart
            selected={selected}
          />
        </div>
      </div>
    </div>
  )
}

/* ============================================================= */
/* CHART TOOLTIP                                                  */
/* ============================================================= */

function ChartTooltip({
  active,
  payload,
  label,
}: any) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded border border-[#d5d9d9] bg-white px-3 py-2 shadow-lg">
      <div className="mb-1 text-xs font-semibold text-[#172b4d]">
        {label}
      </div>

      {payload.map((entry: any) => (
        <div
          key={entry.dataKey}
          className="flex items-center justify-between gap-4 text-xs"
        >
          <span>{entry.name}</span>

          <span className="font-semibold">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ============================================================= */
/* UNITS CHART                                                     */
/* ============================================================= */

function UnitsChart({
  selected,
}: {
  selected: Record<
    ComparisonKey,
    boolean
  >
}) {
  return (
    <div className="h-[290px] w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
          data={hourlyData}
          margin={{
            top: 16,
            right: 10,
            left: 5,
            bottom: 28,
          }}
        >
          <CartesianGrid
            stroke="#e5e7eb"
            vertical={false}
          />

          <XAxis
            dataKey="hour"
            tick={{
              fontSize: 10,
              fill: '#334155',
            }}
            angle={-45}
            textAnchor="end"
            height={55}
            interval={0}
          />

          <YAxis
            domain={[0, 40]}
            ticks={[
              0,
              10,
              20,
              30,
              40,
            ]}
            tick={{
              fontSize: 10,
              fill: '#334155',
            }}
            label={{
              value: 'Units ordered',
              angle: -90,
              position: 'insideLeft',
              fill: '#334155',
              fontSize: 11,
            }}
          />

          <Tooltip
            content={<ChartTooltip />}
          />

          <Line
            hide={!selected.today}
            type="linear"
            dataKey="today"
            name="Today"
            stroke="#08a6bc"
            strokeWidth={2}
            dot={false}
          />

          <Line
            hide={!selected.yesterday}
            type="linear"
            dataKey="yesterday"
            name="Yesterday"
            stroke="#f0440f"
            strokeWidth={2}
            dot={false}
          />

          <Line
            hide={!selected.lastWeek}
            type="linear"
            dataKey="lastWeek"
            name="Same day last week"
            stroke="#ff8b00"
            strokeWidth={2}
            dot={false}
          />

          <Line
            hide={!selected.lastYear}
            type="linear"
            dataKey="lastYear"
            name="Same day last year"
            stroke="#829092"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ============================================================= */
/* SALES CHART                                                     */
/* ============================================================= */

function SalesChart({
  selected,
}: {
  selected: Record<
    ComparisonKey,
    boolean
  >
}) {
  return (
    <div className="h-[290px] w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
          data={salesHourlyData}
          margin={{
            top: 16,
            right: 10,
            left: 5,
            bottom: 28,
          }}
        >
          <CartesianGrid
            stroke="#e5e7eb"
            vertical={false}
          />

          <XAxis
            dataKey="hour"
            tick={{
              fontSize: 10,
              fill: '#334155',
            }}
            angle={-45}
            textAnchor="end"
            height={55}
            interval={0}
          />

          <YAxis
            domain={[0, 1000]}
            ticks={[
              0,
              250,
              500,
              750,
              1000,
            ]}
            tick={{
              fontSize: 10,
              fill: '#334155',
            }}
            label={{
              value:
                'Ordered product sales',
              angle: -90,
              position: 'insideLeft',
              fill: '#334155',
              fontSize: 11,
            }}
          />

          <Tooltip
            content={<ChartTooltip />}
          />

          <Line
            hide={!selected.today}
            type="linear"
            dataKey="today"
            name="Today"
            stroke="#08a6bc"
            strokeWidth={2}
            dot={false}
          />

          <Line
            hide={!selected.yesterday}
            type="linear"
            dataKey="yesterday"
            name="Yesterday"
            stroke="#f0440f"
            strokeWidth={2}
            dot={false}
          />

          <Line
            hide={!selected.lastWeek}
            type="linear"
            dataKey="lastWeek"
            name="Same day last week"
            stroke="#ff8b00"
            strokeWidth={2}
            dot={false}
          />

          <Line
            hide={!selected.lastYear}
            type="linear"
            dataKey="lastYear"
            name="Same day last year"
            stroke="#829092"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ============================================================= */
/* TABLE VIEW                                                      */
/* ============================================================= */

function TableView({
  selected,
  toggleSelected,
  expanded,
  toggleExpanded,
}: {
  selected: Record<
    ComparisonKey,
    boolean
  >
  toggleSelected: (
    key: ComparisonKey,
  ) => void
  expanded: {
    yesterday: boolean
    lastWeek: boolean
    lastYear: boolean
  }
  toggleExpanded: (
    key: keyof typeof expanded,
  ) => void
}) {
  const today = comparisonData[0]
  const yesterday = comparisonData[1]
  const lastWeek = comparisonData[2]
  const lastYear = comparisonData[3]

  return (
    <div className="px-5 pb-5">
      <div className="overflow-x-auto border border-[#d1d9dd]">
        <table className="w-full min-w-[1050px] border-collapse text-[14px]">
          <thead>
            <tr className="bg-white">
              <th className="w-[25%] border-b border-[#d5d9d9] px-4 py-3 text-left font-normal" />

              <th className="border-b border-l border-[#b8c1c7] px-4 py-3 text-left font-bold">
                Total order items
              </th>

              <th className="border-b border-l border-[#b8c1c7] px-4 py-3 text-left font-bold">
                Units ordered
              </th>

              <th className="border-b border-l border-[#b8c1c7] px-4 py-3 text-left font-bold">
                Ordered product sales
              </th>

              <th className="border-b border-l border-[#b8c1c7] px-4 py-3 text-left font-bold">
                Average units/order item
              </th>

              <th className="border-b border-l border-[#b8c1c7] px-4 py-3 text-left font-bold">
                Average sales/order item
              </th>
            </tr>
          </thead>

          <tbody>
            <ComparisonTableRow
              comparison={today}
              selected={selected.today}
              toggleSelected={toggleSelected}
              totalOrderItems={70}
            />

            <ComparisonTableRow
              comparison={yesterday}
              selected={selected.yesterday}
              toggleSelected={toggleSelected}
              totalOrderItems={154}
            />

            <ComparisonTableRow
              comparison={lastWeek}
              selected={selected.lastWeek}
              toggleSelected={toggleSelected}
              totalOrderItems={115}
            />

            <ComparisonTableRow
              comparison={lastYear}
              selected={selected.lastYear}
              toggleSelected={toggleSelected}
              totalOrderItems={50}
            />

            <PercentageRow
              label="% change from yesterday"
              values={[
                percentChange(70, 154),
                percentChange(82, 166),
                percentChange(
                  2047.62,
                  4903.55,
                ),
                percentChange(1.17, 1.08),
                percentChange(29.25, 31.84),
              ]}
              onClick={() =>
                toggleExpanded('yesterday')
              }
              expanded={expanded.yesterday}
            />

            {expanded.yesterday && (
              <>
                <ComparisonDetailRow
                  label="Today through 1PM PDT"
                  values={[
                    '70',
                    '82',
                    '$2,047.62',
                    '1.17',
                    '$29.25',
                  ]}
                />

                <ComparisonDetailRow
                  label="Yesterday through 1PM PDT"
                  values={[
                    '66',
                    '71',
                    '$2,104.43',
                    '1.08',
                    '$31.89',
                  ]}
                  shaded
                />
              </>
            )}

            <PercentageRow
              label="% change from same day last week"
              values={[
                percentChange(70, 115),
                percentChange(82, 129),
                percentChange(
                  2047.62,
                  3652.17,
                ),
                percentChange(1.17, 1.12),
                percentChange(29.25, 31.76),
              ]}
              onClick={() =>
                toggleExpanded('lastWeek')
              }
              expanded={expanded.lastWeek}
            />

            {expanded.lastWeek && (
              <>
                <ComparisonDetailRow
                  label="Today through 1PM PDT"
                  values={[
                    '70',
                    '82',
                    '$2,047.62',
                    '1.17',
                    '$29.25',
                  ]}
                />

                <ComparisonDetailRow
                  label="Same day last week through 1PM PDT"
                  values={[
                    '55',
                    '61',
                    '$1,681.00',
                    '1.11',
                    '$30.56',
                  ]}
                  shaded
                />
              </>
            )}

            <PercentageRow
              label="% change from same day last year"
              values={[
                percentChange(70, 50),
                percentChange(82, 82),
                percentChange(
                  2047.62,
                  2598.84,
                ),
                percentChange(1.17, 1.64),
                percentChange(29.25, 51.98),
              ]}
              onClick={() =>
                toggleExpanded('lastYear')
              }
              expanded={expanded.lastYear}
            />

            {expanded.lastYear && (
              <>
                <ComparisonDetailRow
                  label="Today through 1PM PDT"
                  values={[
                    '70',
                    '82',
                    '$2,047.62',
                    '1.17',
                    '$29.25',
                  ]}
                />

                <ComparisonDetailRow
                  label="Same day last year through 1PM PDT"
                  values={[
                    '32',
                    '46',
                    '$1,494.12',
                    '1.44',
                    '$46.69',
                  ]}
                  shaded
                />
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ============================================================= */
/* COMPARISON TABLE ROW                                            */
/* ============================================================= */

function ComparisonTableRow({
  comparison,
  selected,
  toggleSelected,
  totalOrderItems,
}: {
  comparison: Comparison
  selected: boolean
  toggleSelected: (
    key: ComparisonKey,
  ) => void
  totalOrderItems: number
}) {
  return (
    <tr className="bg-[#eaf6ff]">
      <td className="border-b border-[#cdd7dd] px-4 py-3">
        <button
          type="button"
          onClick={() =>
            toggleSelected(comparison.key)
          }
          className="mr-2 inline-flex h-[15px] w-[15px] items-center justify-center border border-[#007eb9] bg-white align-middle"
        >
          {selected && (
            <span className="text-[11px] font-bold text-[#007eb9]">
              ✓
            </span>
          )}
        </button>

        <span>{comparison.label}</span>
      </td>

      <td className="border-b border-l border-[#cdd7dd] px-4 py-3">
        {totalOrderItems}
      </td>

      <td className="border-b border-l border-[#cdd7dd] px-4 py-3">
        {comparison.units}
      </td>

      <td className="border-b border-l border-[#cdd7dd] px-4 py-3">
        {formatCurrency(comparison.sales)}
      </td>

      <td className="border-b border-l border-[#cdd7dd] px-4 py-3">
        {comparison.avgUnits.toFixed(2)}
      </td>

      <td className="border-b border-l border-[#cdd7dd] px-4 py-3">
        {formatCurrency(comparison.avgSales)}
      </td>
    </tr>
  )
}

/* ============================================================= */
/* PERCENTAGE ROW                                                  */
/* ============================================================= */

function PercentageRow({
  label,
  values,
  expanded,
  onClick,
}: {
  label: string
  values: number[]
  expanded: boolean
  onClick: () => void
}) {
  return (
    <tr className="bg-[#eaf6ff]">
      <td className="border-b border-[#cdd7dd] px-4 py-2">
        <button
          type="button"
          onClick={onClick}
          className="mr-2 inline-flex h-[15px] w-[15px] items-center justify-center bg-[#d8e1e5] text-[12px] font-bold text-[#61727c]"
        >
          {expanded ? '−' : '+'}
        </button>

        <span>{label}</span>
      </td>

      {values.map((value, index) => (
        <td
          key={index}
          className={`border-b border-l border-[#cdd7dd] px-4 py-2 ${
            value >= 0
              ? 'text-green-600'
              : 'text-red-600'
          }`}
        >
          {formatPercent(value)}
        </td>
      ))}
    </tr>
  )
}

/* ============================================================= */
/* COMPARISON DETAIL ROW                                           */
/* ============================================================= */

function ComparisonDetailRow({
  label,
  values,
  shaded = false,
}: {
  label: string
  values: string[]
  shaded?: boolean
}) {
  return (
    <tr
      className={
        shaded
          ? 'bg-[#e5eef1]'
          : 'bg-[#f0f8fc]'
      }
    >
      <td className="border-b border-[#cdd7dd] px-4 py-3">
        {label}
      </td>

      {values.map((value, index) => (
        <td
          key={index}
          className="border-b border-l border-[#cdd7dd] px-4 py-3"
        >
          {value}
        </td>
      ))}
    </tr>
  )
}