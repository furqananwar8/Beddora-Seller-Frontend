'use client'

import { useCallback, useMemo, useState } from 'react'
import type { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import DateRangePicker from '@/components/date-range-picker/DateRangePicker'
import MultiSelectInput from '@/components/multi-select-input/MultiSelectInput'
import { MARKETPLACES } from '@/utils/marketplaces'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useGetCompareSalesQuery } from '@/services/api/profit.api'
import { Spinner } from '@/design-system/loaders'

/* ============================================================= */
/* TYPES                                                          */
/* ============================================================= */

type ViewMode = 'graph' | 'table'

type ComparisonKey = 'today' | 'yesterday' | 'lastWeek' | 'lastYear'

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
  orderItems: number
}

/* ============================================================= */
/* DATE HELPERS                                                   */
/* ============================================================= */

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getTodayRange = (): DateRangeValue => {
  const today = new Date()
  return { startDate: formatDate(today), endDate: formatDate(today) }
}

const getYesterdayRange = (): DateRangeValue => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return { startDate: formatDate(d), endDate: formatDate(d) }
}

const getWeekToDateRange = (): DateRangeValue => {
  const today = new Date()
  const day = today.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  const start = new Date(today)
  start.setDate(start.getDate() - daysFromMonday)
  return { startDate: formatDate(start), endDate: formatDate(today) }
}

const getMonthToDateRange = (): DateRangeValue => {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  return { startDate: formatDate(start), endDate: formatDate(today) }
}

const getYearToDateRange = (): DateRangeValue => {
  const today = new Date()
  const start = new Date(today.getFullYear(), 0, 1)
  return { startDate: formatDate(start), endDate: formatDate(today) }
}

/* ============================================================= */
/* FORMATTERS                                                     */
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

const percentChange = (current: number, previous: number) => {
  if (!previous) return 0
  return ((current - previous) / previous) * 100
}

/* ============================================================= */
/* DEFAULT CHART SKELETON (24h with zeros)                       */
/* ============================================================= */

const HOUR_LABELS = [
  '12AM', '1AM', '2AM', '3AM', '4AM', '5AM', '6AM', '7AM',
  '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM',
  '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM',
]

const DEFAULT_HOURLY = HOUR_LABELS.map((hour) => ({
  hour,
  today: 0,
  yesterday: 0,
  lastWeek: 0,
  lastYear: 0,
}))

/* ============================================================= */
/* MAIN COMPONENT                                                 */
/* ============================================================= */

export default function CompareSales() {
  /* ---------------------------------------------------------- */
  // Date presets (getRange functions — required by DateRangePicker)
  /* ---------------------------------------------------------- */
  const datePresets = useMemo(
    () => [
      { id: 'today', label: 'Today', getRange: getTodayRange },
      { id: 'yesterday', label: 'Yesterday', getRange: getYesterdayRange },
      { id: 'week-to-date', label: 'Week to date', getRange: getWeekToDateRange },
      { id: 'month-to-date', label: 'Month to date', getRange: getMonthToDateRange },
      { id: 'year-to-date', label: 'Year to date', getRange: getYearToDateRange },
    ],
    []
  )

  /* ---------------------------------------------------------- */
  // Draft state — what the user is currently interacting with
  /* ---------------------------------------------------------- */
  const [draftMarketplaces, setDraftMarketplaces] = useState<string[]>(['Amazon.ca'])
  const [draftDateRange, setDraftDateRange] = useState<DateRangeValue>(getTodayRange())

  /* ---------------------------------------------------------- */
  // Applied state — only these values are sent to the API
  /* ---------------------------------------------------------- */
  const [appliedMarketplaces, setAppliedMarketplaces] = useState<string[]>(['Amazon.ca'])
  const [appliedDateRange, setAppliedDateRange] = useState<DateRangeValue>(getTodayRange())

  /* ---------------------------------------------------------- */
  // API query (auto-fires on mount with the first preset)
  /* ---------------------------------------------------------- */
  const { data: apiData, isFetching } = useGetCompareSalesQuery({
    startDate: appliedDateRange.startDate || undefined,
    endDate: appliedDateRange.endDate || undefined,
    marketplaces: appliedMarketplaces.length > 0 ? appliedMarketplaces : undefined,
  })

  /* ---------------------------------------------------------- */
  // Apply handler — copies draft → applied so the query refires
  /* ---------------------------------------------------------- */
  const handleApplyFilters = useCallback(() => {
    setAppliedDateRange({ ...draftDateRange })
    setAppliedMarketplaces([...draftMarketplaces])
  }, [draftDateRange, draftMarketplaces])

  /* ---------------------------------------------------------- */
  // Local UI state
  /* ---------------------------------------------------------- */
  const [viewMode, setViewMode] = useState<ViewMode>('graph')

  const [selected, setSelected] = useState<Record<ComparisonKey, boolean>>({
    today: true,
    yesterday: true,
    lastWeek: true,
    lastYear: true,
  })

  const [expanded, setExpanded] = useState({
    yesterday: true,
    lastWeek: true,
    lastYear: true,
  })

  /* ---------------------------------------------------------- */
  // Derived data
  /* ---------------------------------------------------------- */
  const snapshot = apiData?.snapshot
  const comparisons: Comparison[] =
    apiData?.comparisons.map((c: any) => ({ ...c, checked: true })) ?? []

  const hourlyUnits = apiData?.hourly?.units ?? []
  const hourlySales = apiData?.hourly?.sales ?? []
  const hourlyOrderItems = apiData?.hourly?.orderItems ?? []

  // Always fall back to the 24h zero skeleton so axes never collapse
  const unitsChartData = hourlyUnits.length > 0 ? hourlyUnits : DEFAULT_HOURLY
  const salesChartData = hourlySales.length > 0 ? hourlySales : DEFAULT_HOURLY

  /* ---------------------------------------------------------- */
  // Partial-day helpers (for table detail rows)
  /* ---------------------------------------------------------- */
  const now = new Date()
  const currentHour = now.getHours()
  const currentTimeLabel = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const getPartial = (key: ComparisonKey) => {
    let units = 0
    let sales = 0
    let orderItems = 0
    for (let i = 0; i <= currentHour && i < 24; i++) {
      units += hourlyUnits[i]?.[key] ?? 0
      sales += hourlySales[i]?.[key] ?? 0
      orderItems += hourlyOrderItems[i]?.[key] ?? 0
    }
    const avgUnits = orderItems > 0 ? units / orderItems : 0
    const avgSales = orderItems > 0 ? sales / orderItems : 0
    return { orderItems, units, sales, avgUnits, avgSales }
  }

  const todayPartial = getPartial('today')

  /* ---------------------------------------------------------- */
  // Toggles
  /* ---------------------------------------------------------- */
  const toggleSelected = (key: ComparisonKey) => {
    setSelected((c) => ({ ...c, [key]: !c[key] }))
  }

  const toggleExpanded = (key: keyof typeof expanded) => {
    setExpanded((c) => ({ ...c, [key]: !c[key] }))
  }

  /* ============================================================= */
  /* RENDER                                                         */
  /* ============================================================= */
  return (
    <div className="relative w-full bg-white text-[#111827]">
      {/* ------------------------------------------------------ */}
      {/* LOADING OVERLAY                                          */}
      {/* ------------------------------------------------------ */}
      {isFetching && (  <div className="absolute inset-0 z-50 flex items-start justify-center bg-white/70 pt-32">
          <div className="flex items-center gap-3 px-6 py-4">
            <Spinner/>
            <span className="text-sm font-medium text-[#172b4d]">Updating data…</span>
          </div>
        </div>
        )}

      {/* ------------------------------------------------------ */}
      {/* HEADER  →  Marketplace | Date Range | Filter            */}
      {/* ------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-4 border-b border-[#d5d9d9] bg-white px-4 py-3">
        {/* Marketplace */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#24364b]">Marketplace</span>
          <div className="min-w-[200px]">
            <MultiSelectInput
              title="Marketplace"
              options={MARKETPLACES}
              value={draftMarketplaces}
              onChange={setDraftMarketplaces}
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#24364b]">Date Range</span>
          <DateRangePicker
            value={draftDateRange}
            onChange={setDraftDateRange}
            presets={datePresets as any}
          />
        </div>

        {/* Filter Button */}
        <button
          type="button"
          onClick={handleApplyFilters}
          disabled={isFetching}
          className="h-9 rounded bg-[#007eb9] px-5 text-sm font-medium text-white hover:bg-[#005a8c] disabled:opacity-60"
        >
          {isFetching ? 'Loading…' : 'Filter'}
        </button>
      </div>

      {/* ------------------------------------------------------ */}
      {/* SNAPSHOT                                                   */}
      {/* ------------------------------------------------------ */}
      <section className="border border-[#d5d9d9]">
        <div className="flex items-center gap-3 border-b border-[#d5d9d9] px-4 py-2">
          <h1 className="text-[22px] font-normal text-[#0f1f33]">Sales snapshot</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5">
          <SnapshotMetric
            label="Total order items"
            value={snapshot ? String(snapshot.totalOrderItems) : '—'}
          />
          <SnapshotMetric
            label="Units ordered"
            value={snapshot ? String(snapshot.unitsOrdered) : '—'}
          />
          <SnapshotMetric
            label="Ordered product sales"
            value={snapshot ? formatCurrency(snapshot.orderedProductSales) : '—'}
          />
          <SnapshotMetric
            label="Avg. units/order item"
            value={snapshot ? Number(snapshot.avgUnitsPerOrderItem).toFixed(2) : '—'}
          />
          <SnapshotMetric
            label="Avg. sales/order item"
            value={snapshot ? formatCurrency(snapshot.avgSalesPerOrderItem) : '—'}
          />
        </div>
      </section>

      {/* ------------------------------------------------------ */}
      {/* COMPARE SALES                                              */}
      {/* ------------------------------------------------------ */}
      <section className="mt-1 border border-[#d5d9d9] bg-[#eaf6ff]">
        <div className="flex items-center justify-between px-7 py-5">
          <h2 className="text-[24px] font-normal text-[#0f1f33]">Compare Sales</h2>

          <div className="flex border border-[#c7c7c7] bg-white">
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className={`px-4 py-1.5 text-[14px] ${
                viewMode === 'graph' ? 'bg-[#007eb9] text-white' : 'text-[#172b4d]'
              }`}
            >
              Graph view
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 text-[14px] ${
                viewMode === 'table' ? 'bg-[#007eb9] text-white' : 'text-[#172b4d]'
              }`}
            >
              Table view
            </button>
          </div>
        </div>

        {viewMode === 'graph' ? (
          <GraphView selected={selected} />
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

  /* ============================================================= */
  /* NESTED VIEWS                                                 */
  /* ============================================================= */

  function GraphView({ selected }: { selected: Record<ComparisonKey, boolean> }) {
    return (
      <div className="px-5 pb-5">
        <div className="grid grid-cols-1 border border-[#d1d9dd] bg-white lg:grid-cols-2">
          <div className="border-b border-[#d1d9dd] p-3 lg:border-b-0 lg:border-r">
            <UnitsChart selected={selected} />
          </div>
          <div className="p-3">
            <SalesChart selected={selected} />
          </div>
        </div>
      </div>
    )
  }

  function UnitsChart({ selected }: { selected: Record<ComparisonKey, boolean> }) {
    return (
      <div className="h-[290px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={unitsChartData} margin={{ top: 16, right: 10, left: 5, bottom: 28 }}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10, fill: '#334155' }}
              angle={-45}
              textAnchor="end"
              height={55}
              interval={0}
            />
            <YAxis
              domain={[0, 'auto']}
              tick={{ fontSize: 10, fill: '#334155' }}
              label={{
                value: 'Units ordered',
                angle: -90,
                position: 'insideLeft',
                fill: '#334155',
                fontSize: 11,
              }}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              hide={!selected.today}
              type="linear"
              dataKey="today"
              name="Today"
              stroke="#08a6bc"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              hide={!selected.yesterday}
              type="linear"
              dataKey="yesterday"
              name="Yesterday"
              stroke="#f0440f"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              hide={!selected.lastWeek}
              type="linear"
              dataKey="lastWeek"
              name="Same day last week"
              stroke="#ff8b00"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              hide={!selected.lastYear}
              type="linear"
              dataKey="lastYear"
              name="Same day last year"
              stroke="#829092"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  function SalesChart({ selected }: { selected: Record<ComparisonKey, boolean> }) {
    return (
      <div className="h-[290px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={salesChartData} margin={{ top: 16, right: 10, left: 5, bottom: 28 }}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10, fill: '#334155' }}
              angle={-45}
              textAnchor="end"
              height={55}
              interval={0}
            />
            <YAxis
              domain={[0, 'auto']}
              tick={{ fontSize: 10, fill: '#334155' }}
              label={{
                value: 'Ordered product sales',
                angle: -90,
                position: 'insideLeft',
                fill: '#334155',
                fontSize: 11,
              }}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              hide={!selected.today}
              type="linear"
              dataKey="today"
              name="Today"
              stroke="#08a6bc"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              hide={!selected.yesterday}
              type="linear"
              dataKey="yesterday"
              name="Yesterday"
              stroke="#f0440f"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              hide={!selected.lastWeek}
              type="linear"
              dataKey="lastWeek"
              name="Same day last week"
              stroke="#ff8b00"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              hide={!selected.lastYear}
              type="linear"
              dataKey="lastYear"
              name="Same day last year"
              stroke="#829092"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  function TableView({
    selected,
    toggleSelected,
    expanded,
    toggleExpanded,
  }: {
    selected: Record<ComparisonKey, boolean>
    toggleSelected: (key: ComparisonKey) => void
    expanded: { yesterday: boolean; lastWeek: boolean; lastYear: boolean }
    toggleExpanded: (key: keyof typeof expanded) => void
  }) {
    const today = comparisons[0]
    const yesterday = comparisons[1]
    const lastWeek = comparisons[2]
    const lastYear = comparisons[3]

    if (!today || !yesterday || !lastWeek || !lastYear) {
      return (
        <div className="px-5 pb-5">
          <div className="border border-[#d1d9dd] bg-white p-8 text-center text-[#61727c]">
            No data available. Press <strong>Filter</strong> to load.
          </div>
        </div>
      )
    }

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
                totalOrderItems={today.orderItems}
              />
              <ComparisonTableRow
                comparison={yesterday}
                selected={selected.yesterday}
                toggleSelected={toggleSelected}
                totalOrderItems={yesterday.orderItems}
              />
              <ComparisonTableRow
                comparison={lastWeek}
                selected={selected.lastWeek}
                toggleSelected={toggleSelected}
                totalOrderItems={lastWeek.orderItems}
              />
              <ComparisonTableRow
                comparison={lastYear}
                selected={selected.lastYear}
                toggleSelected={toggleSelected}
                totalOrderItems={lastYear.orderItems}
              />

              {/* % change from yesterday */}
              <PercentageRow
                label="% change from yesterday"
                values={[
                  percentChange(today.orderItems, yesterday.orderItems),
                  percentChange(today.units, yesterday.units),
                  percentChange(today.sales, yesterday.sales),
                  percentChange(today.avgUnits, yesterday.avgUnits),
                  percentChange(today.avgSales, yesterday.avgSales),
                ]}
                onClick={() => toggleExpanded('yesterday')}
                expanded={expanded.yesterday}
              />
              {expanded.yesterday && (
                <>
                  <ComparisonDetailRow
                    label={`Today through ${currentTimeLabel}`}
                    values={[
                      String(todayPartial.orderItems),
                      String(todayPartial.units),
                      formatCurrency(todayPartial.sales),
                      todayPartial.avgUnits.toFixed(2),
                      formatCurrency(todayPartial.avgSales),
                    ]}
                  />
                  {(() => {
                    const p = getPartial('yesterday')
                    return (
                      <ComparisonDetailRow
                        label={`Yesterday through ${currentTimeLabel}`}
                        values={[
                          String(p.orderItems),
                          String(p.units),
                          formatCurrency(p.sales),
                          p.avgUnits.toFixed(2),
                          formatCurrency(p.avgSales),
                        ]}
                        shaded
                      />
                    )
                  })()}
                </>
              )}

              {/* % change from last week */}
              <PercentageRow
                label="% change from same day last week"
                values={[
                  percentChange(today.orderItems, lastWeek.orderItems),
                  percentChange(today.units, lastWeek.units),
                  percentChange(today.sales, lastWeek.sales),
                  percentChange(today.avgUnits, lastWeek.avgUnits),
                  percentChange(today.avgSales, lastWeek.avgSales),
                ]}
                onClick={() => toggleExpanded('lastWeek')}
                expanded={expanded.lastWeek}
              />
              {expanded.lastWeek && (
                <>
                  <ComparisonDetailRow
                    label={`Today through ${currentTimeLabel}`}
                    values={[
                      String(todayPartial.orderItems),
                      String(todayPartial.units),
                      formatCurrency(todayPartial.sales),
                      todayPartial.avgUnits.toFixed(2),
                      formatCurrency(todayPartial.avgSales),
                    ]}
                  />
                  {(() => {
                    const p = getPartial('lastWeek')
                    return (
                      <ComparisonDetailRow
                        label={`Same day last week through ${currentTimeLabel}`}
                        values={[
                          String(p.orderItems),
                          String(p.units),
                          formatCurrency(p.sales),
                          p.avgUnits.toFixed(2),
                          formatCurrency(p.avgSales),
                        ]}
                        shaded
                      />
                    )
                  })()}
                </>
              )}

              {/* % change from last year */}
              <PercentageRow
                label="% change from same day last year"
                values={[
                  percentChange(today.orderItems, lastYear.orderItems),
                  percentChange(today.units, lastYear.units),
                  percentChange(today.sales, lastYear.sales),
                  percentChange(today.avgUnits, lastYear.avgUnits),
                  percentChange(today.avgSales, lastYear.avgSales),
                ]}
                onClick={() => toggleExpanded('lastYear')}
                expanded={expanded.lastYear}
              />
              {expanded.lastYear && (
                <>
                  <ComparisonDetailRow
                    label={`Today through ${currentTimeLabel}`}
                    values={[
                      String(todayPartial.orderItems),
                      String(todayPartial.units),
                      formatCurrency(todayPartial.sales),
                      todayPartial.avgUnits.toFixed(2),
                      formatCurrency(todayPartial.avgSales),
                    ]}
                  />
                  {(() => {
                    const p = getPartial('lastYear')
                    return (
                      <ComparisonDetailRow
                        label={`Same day last year through ${currentTimeLabel}`}
                        values={[
                          String(p.orderItems),
                          String(p.units),
                          formatCurrency(p.sales),
                          p.avgUnits.toFixed(2),
                          formatCurrency(p.avgSales),
                        ]}
                        shaded
                      />
                    )
                  })()}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
}

/* ============================================================= */
/* SNAPSHOT METRIC                                                */
/* ============================================================= */

function SnapshotMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-2">
      <div className="text-[14px] text-[#24364b]">{label}</div>
      <div className="mt-0.5 text-[27px] leading-tight text-[#101f33]">{value}</div>
    </div>
  )
}

/* ============================================================= */
/* CHART TOOLTIP                                                  */
/* ============================================================= */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded border border-[#d5d9d9] bg-white px-3 py-2 shadow-lg">
      <div className="mb-1 text-xs font-semibold text-[#172b4d]">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
          <span>{entry.name}</span>
          <span className="font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ============================================================= */
/* TABLE ROWS                                                     */
/* ============================================================= */

function ComparisonTableRow({
  comparison,
  selected,
  toggleSelected,
  totalOrderItems,
}: {
  comparison: Comparison
  selected: boolean
  toggleSelected: (key: ComparisonKey) => void
  totalOrderItems: number
}) {
  return (
    <tr className="bg-[#eaf6ff]">
      <td className="border-b border-[#cdd7dd] px-4 py-3">
        <button
          type="button"
          onClick={() => toggleSelected(comparison.key)}
          className="mr-2 inline-flex h-[15px] w-[15px] items-center justify-center border border-[#007eb9] bg-white align-middle"
        >
          {selected && <span className="text-[11px] font-bold text-[#007eb9]">✓</span>}
        </button>
        <span>{comparison.label}</span>
      </td>
      <td className="border-b border-l border-[#cdd7dd] px-4 py-3">{totalOrderItems}</td>
      <td className="border-b border-l border-[#cdd7dd] px-4 py-3">{comparison.units}</td>
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
            value >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {formatPercent(value)}
        </td>
      ))}
    </tr>
  )
}

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
    <tr className={shaded ? 'bg-[#e5eef1]' : 'bg-[#f0f8fc]'}>
      <td className="border-b border-[#cdd7dd] px-4 py-3">{label}</td>
      {values.map((value, index) => (
        <td key={index} className="border-b border-l border-[#cdd7dd] px-4 py-3">
          {value}
        </td>
      ))}
    </tr>
  )
}