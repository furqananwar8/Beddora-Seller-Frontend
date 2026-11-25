'use client'

import React from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { BarChart } from '@/design-system/charts/BarChart'
import { KpiCard } from '@/design-system/kpi'
import { cn } from '@/utils/cn'
import { money } from '../../shippingMeta'
import type { Fulfillment, OrdersOverview } from '../../types'
import { SectionCard } from '../../shared/Card'
import { ordersLink, type OrdersLinkFilters } from './ordersLink'

/** The window's filters, carried onto every link so the Orders tab shows the same slice. */
type Scope = Omit<OrdersLinkFilters, 'states'>

const CHANNEL_COLOR: Record<string, string> = { amazon: '#f59e0b', walmart: '#2563eb', temu: '#ea580c', manual: '#64748b' }
const CHANNEL_NAME: Record<string, string> = { amazon: 'Amazon', walmart: 'Walmart', temu: 'Temu', manual: 'Manual' }

/** A KPI that opens the orders behind it when there is a list for it; the work queues are outlined. */
const Tile: React.FC<{ title: string; value: string | number; subtitle?: string; href?: string; tone?: 'action' | 'danger' }> = ({ title, value, subtitle, href, tone }) => {
  const card = <KpiCard title={title} value={value} subtitle={subtitle} className={cn(tone === 'action' && 'border-warning-500 ring-1 ring-warning-500', tone === 'danger' && 'border-danger-300')} />
  return href ? (
    <Link href={href} className="block h-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
      {card}
    </Link>
  ) : (
    card
  )
}

export const KpiStrip: React.FC<{ data: OrdersOverview; scope: Scope }> = ({ data, scope }) => {
  const attention = data.attention.channelSyncFailed + data.attention.exceptions
  const inTransit = data.parcels.inTransit + data.parcels.outForDelivery
  const link = (...states: Fulfillment[]) => ordersLink({ ...scope, states })
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <Tile title="To book" value={data.fulfillment.TO_BOOK} subtitle="Needs a label" href={link('TO_BOOK')} tone="action" />
      <Tile title="Needs attention" value={attention} subtitle="Failed sync · exceptions" tone={attention ? 'danger' : undefined} />
      <Tile title="Booked, not shipped" value={data.fulfillment.BOOKED} subtitle="Awaiting pickup" href={link('BOOKED')} />
      <Tile title="In transit" value={inTransit} subtitle="Parcels booked here" />
      <Tile title="Delivered" value={data.parcels.delivered} subtitle="Parcels booked here" />
      <Tile title="Shipping spend" value={money(data.spend.total)} subtitle={data.spend.parcels ? `Avg ${money(data.spend.total / data.spend.parcels)} / parcel` : 'No parcels yet'} />
    </div>
  )
}

const PIPELINE: Array<{ state: Fulfillment; label: string; tone: 'neutral' | 'warning' | 'info' | 'success' }> = [
  { state: 'NOT_READY', label: 'Not Ready', tone: 'neutral' },
  { state: 'TO_BOOK', label: 'To Book', tone: 'warning' },
  { state: 'BOOKED', label: 'Booked', tone: 'info' },
  { state: 'SHIPPED_ON_CHANNEL', label: 'Shipped on channel', tone: 'success' },
]

/** Orders by fulfillment state, each a link to the Orders tab; below, our parcels by carrier status. */
export const PipelineCard: React.FC<{ data: OrdersOverview; scope: Scope }> = ({ data, scope }) => {
  const max = Math.max(1, ...PIPELINE.map(({ state }) => data.fulfillment[state]))
  const parcels = [
    ['Label created', data.parcels.labelCreated],
    ['In transit', data.parcels.inTransit],
    ['Out for delivery', data.parcels.outForDelivery],
    ['Delivered', data.parcels.delivered],
    ['Exception', data.parcels.exception],
  ] as const
  return (
    <SectionCard title="Fulfillment pipeline" subtitle="orders by state · click a stage to open it">
      <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {PIPELINE.map(({ state, label, tone }) => (
          <Link key={state} href={ordersLink({ ...scope, states: [state] })} className="rounded-lg p-2 hover:bg-secondary-50">
            <StatusBadge label={label} tone={tone} />
            <div className="my-1 text-2xl font-bold text-text-primary">{data.fulfillment[state].toLocaleString()}</div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary-100">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${(data.fulfillment[state] / max) * 100}%` }} />
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-text-muted">Parcels booked here, by status</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {parcels.map(([label, value]) => (
          <span key={label} className="rounded-full bg-secondary-100 px-3 py-1 text-xs text-text-secondary">
            {label} <b className="text-text-primary">{value}</b>
          </span>
        ))}
      </div>
    </SectionCard>
  )
}

export const PerDayCard: React.FC<{ data: OrdersOverview }> = ({ data }) => {
  const channels = [...new Set(data.perDay.flatMap((day) => Object.keys(day.counts)))]
  const rows = data.perDay.map(({ day, counts }) => ({ label: format(parseISO(day), 'MMM d'), ...Object.fromEntries(channels.map((channel) => [channel, counts[channel] ?? 0])) }))
  return (
    <SectionCard title="Parcels booked per day" subtitle={`${format(parseISO(data.from), 'MMM d')} – ${format(parseISO(data.to), 'MMM d')}`}>
      {channels.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-muted">No parcels booked in this range.</p>
      ) : (
        <BarChart data={rows} xKey="label" stacked height={220} yKeys={channels.map((channel) => ({ key: channel, name: CHANNEL_NAME[channel] ?? channel, color: CHANNEL_COLOR[channel] ?? '#64748b' }))} />
      )}
    </SectionCard>
  )
}

/** What needs a person now: counts, with the Orders tab opened where a filter for it exists. */
export const AttentionCard: React.FC<{ data: OrdersOverview; scope: Scope }> = ({ data, scope }) => {
  const rows = [
    { label: 'Channel sync failed', hint: 'Booked, but the order isn’t marked shipped', count: data.attention.channelSyncFailed, tone: 'danger' as const, href: ordersLink({ ...scope, states: ['BOOKED'] }) },
    { label: 'Delivery exceptions', hint: 'The carrier reports a problem', count: data.attention.exceptions, tone: 'danger' as const },
    { label: 'Saved drafts', hint: 'Unfinished manual shipments', count: data.attention.drafts, tone: 'warning' as const, href: ordersLink({ ...scope, states: ['DRAFT'] }) },
  ]
  const open = rows.filter((row) => row.count > 0)
  return (
    <SectionCard title="Needs attention" aside={<span className="text-xs text-text-muted">{open.reduce((sum, row) => sum + row.count, 0)}</span>}>
      {open.length === 0 ? (
        <p className="py-6 text-center text-sm font-medium text-success-700">All clear</p>
      ) : (
        <ul className="divide-y divide-border">
          {open.map((row) => (
            <li key={row.label} className="flex items-center gap-3 py-2 text-sm">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', row.tone === 'danger' ? 'bg-danger-500' : 'bg-warning-500')} />
              <span className="min-w-0 flex-1">
                <b className="block text-text-primary">
                  {row.count} · {row.label}
                </b>
                <span className="text-xs text-text-muted">{row.hint}</span>
              </span>
              {row.href && (
                <Link href={row.href} className="text-xs font-medium text-primary-600 underline">
                  Open
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

export const SpendCard: React.FC<{ data: OrdersOverview }> = ({ data }) => {
  const max = Math.max(1, ...data.spend.byCarrier.map((row) => row.total))
  return (
    <SectionCard title="Spend by carrier" subtitle="CAD">
      {data.spend.byCarrier.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">No parcels booked in this range.</p>
      ) : (
        <ul className="space-y-2">
          {data.spend.byCarrier.map((row) => (
            <li key={row.provider} className="flex items-center gap-3 text-sm">
              <span className="w-32 shrink-0 truncate">{row.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary-100">
                <div className="h-full rounded-full bg-primary-600" style={{ width: `${(row.total / max) * 100}%` }} />
              </div>
              <b className="w-20 shrink-0 text-right">{row.total.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-text-muted">Parcels booked here only; orders shipped on the channel have no cost in this app.</p>
    </SectionCard>
  )
}

/** Channel orders in the window, channels down and marketplace countries across. */
export const MarketCard: React.FC<{ data: OrdersOverview }> = ({ data }) => {
  const countries = [...new Set(data.byMarket.map((row) => row.country))].sort()
  const channels = [...new Map(data.byMarket.map((row) => [row.channel, row.channelLabel])).entries()]
  return (
    <SectionCard title="By channel & marketplace" subtitle="orders">
      {channels.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">No orders in this range.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-text-muted">
              <th className="py-1 text-left font-medium">Channel</th>
              {countries.map((country) => (
                <th key={country} className="py-1 text-center font-medium">
                  {country}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {channels.map(([channel, label]) => (
              <tr key={channel} className="border-t border-border">
                <td className="py-2 text-left">{label}</td>
                {countries.map((country) => (
                  <td key={country} className="py-2 text-center">
                    {data.byMarket.filter((row) => row.channel === channel && row.country === country).reduce((sum, row) => sum + row.orders, 0) || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  )
}
