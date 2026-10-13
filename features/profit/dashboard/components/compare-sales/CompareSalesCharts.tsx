'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent } from '@/design-system/cards'
import {
  PERIODS,
  formatMoney,
  formatPeriodDates,
  type Comparison,
  type ComparisonKey,
  type HourlyDetailMap,
  type HourlyPoint,
} from './compareSales.utils'

interface Props {
  units: HourlyPoint[]
  sales: HourlyPoint[]
  detail: HourlyDetailMap
  comparisons: Comparison[]
  currency: string
}

export function CompareSalesCharts({ units, sales, detail, comparisons, currency }: Props) {
  const dateLabel = (key: ComparisonKey) => {
    const c = comparisons.find((x) => x.key === key)
    return c ? formatPeriodDates(c.startDate, c.endDate) : ''
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-sm text-text-secondary">
        {PERIODS.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            {dateLabel(p.key) || p.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Units ordered" data={units} detail={detail} currency={currency} dateLabel={dateLabel} />
        <ChartCard title="Ordered product sales" data={sales} detail={detail} currency={currency} dateLabel={dateLabel} />
      </div>
    </div>
  )
}

function ChartCard({
  title,
  data,
  detail,
  currency,
  dateLabel,
}: {
  title: string
  data: HourlyPoint[]
  detail: HourlyDetailMap
  currency: string
  dateLabel: (key: ComparisonKey) => string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 text-sm font-medium text-text-primary">{title}</div>
        <div className="h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 28 }}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: '#64748b' }}
                angle={-45}
                textAnchor="end"
                height={55}
                interval={0}
              />
              <YAxis domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} width={55} />
              <Tooltip content={<HourTooltip detail={detail} currency={currency} dateLabel={dateLabel} />} />
              {PERIODS.map((p) => (
                <Line
                  key={p.key}
                  type="monotone"
                  dataKey={p.key}
                  name={p.label}
                  stroke={p.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/** Hovering an hour lists, for every period, how many orders, units and sales that hour had. */
function HourTooltip({
  active,
  label,
  detail,
  currency,
  dateLabel,
}: {
  active?: boolean
  label?: string
  detail: HourlyDetailMap
  currency: string
  dateLabel: (key: ComparisonKey) => string
}) {
  const hour = label ? detail[label] : undefined
  if (!active || !hour) return null

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg">
      <div className="mb-1.5 text-xs font-semibold text-text-primary">{label}</div>
      <div className="space-y-1">
        {PERIODS.map((p) => {
          const d = hour[p.key]
          if (!d) return null
          return (
            <div key={p.key} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="min-w-[96px] text-text-secondary">{dateLabel(p.key)}</span>
              <span className="font-semibold text-text-primary">
                {d.orderItems} {d.orderItems === 1 ? 'order' : 'orders'} · {d.units}{' '}
                {d.units === 1 ? 'unit' : 'units'} · {formatMoney(d.sales, currency)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
