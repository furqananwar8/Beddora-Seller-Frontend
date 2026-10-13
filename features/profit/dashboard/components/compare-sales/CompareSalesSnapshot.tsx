'use client'

import { Card, CardContent } from '@/design-system/cards'
import { formatMoney } from './compareSales.utils'

interface SnapshotData {
  totalOrderItems: number
  unitsOrdered: number
  orderedProductSales: number
  adSpend: number
  avgUnitsPerOrderItem: number
  avgSalesPerOrderItem: number
}

interface Props {
  snapshot?: SnapshotData
  currency: string
}

interface Metric {
  label: string
  value: string
}

export function CompareSalesSnapshot({ snapshot, currency }: Props) {
  const money = (v: number) => formatMoney(v, currency)

  const metrics: Metric[] = snapshot
    ? [
        { label: 'Order items', value: String(snapshot.totalOrderItems) },
        { label: 'Units ordered', value: String(snapshot.unitsOrdered) },
        { label: 'Ordered product sales', value: money(snapshot.orderedProductSales) },
        { label: 'Ad spend', value: money(snapshot.adSpend) },
        { label: 'Avg. units / order item', value: snapshot.avgUnitsPerOrderItem.toFixed(2) },
        { label: 'Avg. sales / order item', value: money(snapshot.avgSalesPerOrderItem) },
      ]
    : []

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {(metrics.length ? metrics : PLACEHOLDERS).map((metric) => (
        <Card key={metric.label} className="h-full">
          {/* Label slot is always two lines tall, so every value sits on the same line across cards */}
          <CardContent className="flex h-full flex-col items-center justify-start gap-2 p-4 text-center">
            <div className="flex h-8 items-center justify-center text-xs font-medium uppercase leading-4 tracking-wide text-text-muted">
              {metric.label}
            </div>
            <div className="text-2xl font-semibold leading-8 text-text-primary">{metric.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

const PLACEHOLDERS: Metric[] = [
  'Order items',
  'Units ordered',
  'Ordered product sales',
  'Ad spend',
  'Avg. units / order item',
  'Avg. sales / order item',
].map((label) => ({ label, value: '—' }))

export function deltaClass(value: number, inverse = false): string {
  if (value === 0) return 'text-text-muted'
  const good = inverse ? value < 0 : value > 0
  return good ? 'text-green-600' : 'text-red-600'
}
