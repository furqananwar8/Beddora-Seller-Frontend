'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormField } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { useAppAbility } from '@/hooks/useAppAbility'
import { ChannelBadge } from '../../shared/ChannelBadge'
import { SectionCard } from '../../shared/Card'
import { WizardStepper } from '../../create/WizardStepper'
import { bookOrderHref, INCOTERM_META, money, ORDERS_LIST_HREF, shortDay, SKU_MAPPER_HREF, transitDays } from '../../shippingMeta'
import { unitsLabel } from '../orderUnits'
import type { Incoterm, ShipFromOption } from '../../types'
import { BulkPrintDialog } from './BulkPrintDialog'
import { useBulkBook, type BulkBook, type BulkRow, type OrderRow, type PickRule } from './useBulkBook'

const STEPS = [
  { title: 'Review', hint: 'Check each order, split it' },
  { title: 'Rates', hint: 'Pick a rate per booking' },
  { title: 'Confirm', hint: 'Check, then book' },
  { title: 'Booking', hint: 'Labels are bought' },
]
type Phase = 0 | 1 | 2 | 3

const SETTINGS_COMPANY_HREF = '/dashboard/settings/company'
const SETTINGS_WAREHOUSES_HREF = '/dashboard/settings/warehouses'

const HEAD = 'px-3 py-3 text-center align-middle text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-3 text-center align-middle text-sm'
const TABLE = 'overflow-x-auto rounded-lg border border-border bg-surface shadow-sm'

const RULES: { value: PickRule; label: string }[] = [
  { value: 'CHEAPEST', label: 'Cheapest' },
  { value: 'FASTEST', label: 'Fastest' },
  { value: 'BEST_VALUE', label: 'Best value' },
  { value: 'CARRIER', label: 'Preferred carrier' },
]
const INCOTERMS = (Object.keys(INCOTERM_META) as Incoterm[]).map((value) => ({ value, label: `${INCOTERM_META[value].title}: ${INCOTERM_META[value].description}` }))
const SIGNATURES = [
  { value: 'no', label: 'Not required' },
  { value: 'yes', label: 'Signature required' },
]

const Mark: React.FC<{ ok: boolean }> = ({ ok }) => (ok ? <span className="font-bold text-success-600">✓</span> : <span className="font-bold text-danger-600">✕</span>)

const Lane: React.FC<{ row: { detail: BulkRow['detail'] } }> = ({ row }) => {
  const address = row.detail?.shipTo
  return <span>{address ? `${address.city}, ${address.province}` : '—'}</span>
}

const OrderCell: React.FC<{ row: { ref: BulkRow['ref'] }; left?: boolean }> = ({ row, left }) => (
  <span className={`flex items-center ${left ? 'justify-start' : 'justify-center'} gap-2 whitespace-nowrap`}>
    <ChannelBadge channel={row.ref.channel} />
    <b className="text-text-primary">{row.ref.orderId}</b>
  </span>
)

/** Units per booking: a number from 1 to the units free; the top (or 0) means all together. */
const UnitsStepper: React.FC<{ value: number; max: number; onChange: (size: number) => void; label: string }> = ({ value, max, onChange, label }) => {
  const shown = value > 0 && value < max ? value : max
  const BUTTON = 'h-8 w-8 text-lg leading-none text-text-secondary hover:bg-secondary-50 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <span className="inline-flex items-center overflow-hidden rounded-lg border border-border bg-surface" role="group" aria-label={label}>
      <button type="button" className={BUTTON} disabled={shown <= 1} onClick={() => onChange(shown - 1)} aria-label="Fewer units per booking">
        −
      </button>
      <span className="min-w-[2.25rem] px-2 text-center text-sm font-semibold tabular-nums">{shown}</span>
      <button type="button" className={BUTTON} disabled={shown >= max} onClick={() => onChange(shown + 1 >= max ? 0 : shown + 1)} aria-label="More units per booking">
        +
      </button>
    </span>
  )
}

/** A header row naming the order above its bookings. */
const OrderHeaderRow: React.FC<{ order: Pick<OrderRow, 'ref' | 'detail'>; colSpan: number; note?: React.ReactNode }> = ({ order, colSpan, note }) => (
  <tr className="border-b border-border bg-secondary-50">
    <td className="px-3 py-2 text-left text-sm" colSpan={colSpan}>
      <span className="flex flex-wrap items-center gap-2">
        <OrderCell row={order} left />
        <span className="text-text-muted">· <Lane row={order} /></span>
        {note && <span className="ml-auto text-xs text-text-muted">{note}</span>}
      </span>
    </td>
  </tr>
)

const bookingNote = (row: BulkRow) => (row.count > 1 ? `Booking ${row.index} of ${row.count}` : 'Booking')

/** Step 1: one ship-from and the shipment defaults for all, how to split orders with several units, then each order's readiness. */
const ReviewStep: React.FC<{ bulk: BulkBook; onNext: () => void }> = ({ bulk, onNext }) => {
  const { shipFrom, addresses, defaults } = bulk
  const biggest = Math.max(0, ...bulk.orders.map((order) => order.free.length))
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <SectionCard title="Ship from" subtitle="Applies to every order">
          <FormField label="Ship from" htmlFor="bulk-ship-from">
            <SearchableSelect<ShipFromOption>
              id="bulk-ship-from"
              options={addresses}
              value={shipFrom ?? null}
              onChange={(option) => bulk.setShipFromId(option.id)}
              getKey={(option) => option.id}
              getLabel={(option) => `${option.label}${option.kind === 'warehouse' ? ' (Warehouse)' : ''}`}
              placeholder="Pick where parcels ship from"
            />
          </FormField>
          {shipFrom?.missing.length ? (
            <p className="mt-2 text-xs text-danger-600">
              Can&apos;t ship from here yet. Add: {shipFrom.missing.join(', ')}.{' '}
              {/* New tab: this page updates itself when the setting is saved there */}
              <a href={shipFrom.kind === 'warehouse' && shipFrom.fix.every((fix) => fix === 'postalCode') ? SETTINGS_WAREHOUSES_HREF : SETTINGS_COMPANY_HREF} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                Fix it
              </a>
            </p>
          ) : null}
        </SectionCard>
        <SectionCard title="Shipment defaults" subtitle="Package, products and customs come from each booking's units and our products, as when booking one order">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Duties" htmlFor="bulk-incoterm">
              <SearchableSelect
                id="bulk-incoterm"
                options={INCOTERMS}
                value={INCOTERMS.find((option) => option.value === defaults.incoterm) ?? null}
                onChange={(option) => bulk.setDefaults({ ...defaults, incoterm: option.value })}
                getKey={(option) => option.value}
                getLabel={(option) => option.label}
              />
            </FormField>
            <FormField label="Signature" htmlFor="bulk-signature">
              <SearchableSelect
                id="bulk-signature"
                options={SIGNATURES}
                value={SIGNATURES[defaults.signature ? 1 : 0]}
                onChange={(option) => bulk.setDefaults({ ...defaults, signature: option.value === 'yes' })}
                getKey={(option) => option.value}
                getLabel={(option) => option.label}
              />
            </FormField>
          </div>
        </SectionCard>
      </div>

      {biggest > 1 && (
        <SectionCard title="Split orders with several units" subtitle="Each booking gets its own package, rates, carrier and label. Change any order below to override.">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Units per booking for every order with 2+ units</span>
            <UnitsStepper value={bulk.splitAll} max={biggest} onChange={bulk.setSplitAllUnits} label="Units per booking for all orders" />
            <span className="text-text-muted">{bulk.splitAll === 0 || bulk.splitAll >= biggest ? 'All together: one booking per order' : `Up to ${bulk.splitAll} unit${bulk.splitAll === 1 ? '' : 's'} per booking, the last one takes the rest`}</span>
          </div>
        </SectionCard>
      )}

      <div className={TABLE}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Order', 'Ship to', 'Units to book', 'Units per booking', 'Bookings', 'Ship-to', 'Products mapped', 'Package', 'Customs', 'Status', ''].map((title, index) => (
                <th key={title} className={index < 2 ? `${HEAD} !text-left` : HEAD}>
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bulk.orders.map((order) => {
              const checks = order.prepared?.checks
              const many = order.free.length > 1
              const left = order.detail ? order.detail.units.length - order.free.length : 0
              return (
                <tr key={order.key} className="border-b border-border last:border-0">
                  <td className={`${CELL} !text-left`}>
                    <OrderCell row={order} left />
                    {left > 0 && <span className="mt-1 block text-xs text-text-muted">{left} of {order.detail?.units.length} units already booked</span>}
                  </td>
                  <td className={`${CELL} !text-left`}>
                    <Lane row={order} />
                  </td>
                  {order.loadError ? (
                    <td className={CELL} colSpan={9}>
                      <span className="text-danger-600">{order.loadError}</span>
                    </td>
                  ) : !order.detail || !checks ? (
                    <td className={CELL} colSpan={9}>
                      <Spinner size="sm" />
                    </td>
                  ) : (
                    <>
                      <td className={`${CELL} tabular-nums`}>{order.free.length}</td>
                      <td className={CELL}>
                        {many ? (
                          <div className="flex flex-col items-center gap-1">
                            <UnitsStepper value={order.perUnitLabels ? 1 : order.split} max={order.free.length} onChange={(size) => bulk.setSplitForOrder(order.key, size)} label={`Units per booking for order ${order.ref.orderId}`} />
                            <label className="flex items-center gap-1 text-xs text-text-muted">
                              <input type="checkbox" checked={order.perUnitLabels} onChange={(event) => bulk.setPerUnitLabels(order.key, event.target.checked)} className="h-3.5 w-3.5 accent-primary-600" />
                              One label per unit
                            </label>
                          </div>
                        ) : (
                          <span className="text-text-muted">{order.free.length === 1 ? 'single unit' : '—'}</span>
                        )}
                      </td>
                      <td className={`${CELL} font-semibold tabular-nums`}>{order.bookings || '—'}</td>
                      <td className={CELL}>
                        <Mark ok={checks.shipTo} />
                      </td>
                      <td className={CELL}>
                        <Mark ok={checks.mapped} />
                      </td>
                      <td className={CELL}>
                        <Mark ok={checks.pkg} />
                      </td>
                      <td className={CELL}>
                        <Mark ok={checks.customs} />
                      </td>
                    </>
                  )}
                  <td className={CELL}>
                    {order.free.length === 0 && order.detail ? (
                      <StatusBadge label="Nothing left to book" tone="neutral" />
                    ) : (
                      order.prepared &&
                      (order.prepared.problem ? (
                        <>
                          <StatusBadge label="Needs fixing" tone="danger" />
                          <span className="mx-auto mt-1 block max-w-[16rem] break-words text-xs text-text-muted">{order.prepared.problem}</span>
                        </>
                      ) : (
                        <StatusBadge label="Ready" tone="success" />
                      ))
                    )}
                  </td>
                  <td className={CELL}>
                    {order.prepared?.problem && (
                      // New tab: this page stays open and updates itself when the fix is saved there (see useBulkBook)
                      <Link target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-600 underline" href={order.prepared.checks.mapped ? bookOrderHref(order.ref) : SKU_MAPPER_HREF}>
                        {order.prepared.checks.mapped ? 'Fix' : 'Map SKU'}
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {bulk.orders.some((order) => order.prepared?.problem) && <p className="text-xs text-text-muted">Fix and Map SKU open in a new tab. Save there and this page updates by itself: no reload needed.</p>}

      <Footer
        note={
          bulk.loading ? (
            'Checking the orders…'
          ) : (
            <>
              <b>{bulk.readyOrders.length} order{bulk.readyOrders.length === 1 ? '' : 's'} ready</b> · <b>{bulk.ready.length} booking{bulk.ready.length === 1 ? '' : 's'}</b>
              {bulk.orders.length - bulk.readyOrders.length > 0 && <> · {bulk.orders.length - bulk.readyOrders.length} need fixing or have nothing left (left out)</>}
            </>
          )
        }
      >
        <Link href={ORDERS_LIST_HREF} className="ds-button ds-button-outline ds-button-md">
          Cancel
        </Link>
        <Button disabled={bulk.ready.length === 0 || bulk.loading} onClick={onNext}>
          Get rates for {bulk.ready.length} booking{bulk.ready.length === 1 ? '' : 's'}
        </Button>
      </Footer>
    </div>
  )
}

const Footer: React.FC<{ note: React.ReactNode; children: React.ReactNode }> = ({ note, children }) => (
  <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
    <p className="text-sm text-text-secondary">{note}</p>
    <div className="flex gap-2">{children}</div>
  </div>
)

/** Step 2: a rule picks a rate for every order; each row can still be changed. */
const RatesStep: React.FC<{ bulk: BulkBook; onBack: () => void; onNext: () => void }> = ({ bulk, onBack, onNext }) => {
  const carriers = [...new Set(bulk.ready.flatMap((row) => row.work.quote.rates.map((rate) => rate.carrier)))].sort()
  const quoting = bulk.ready.filter((row) => row.work.quote.status === 'loading').length
  return (
    <div className="space-y-4">
      <SectionCard title="Pick for all" subtitle="One rate per order by this rule. Change any row by hand: it is kept when the rule changes.">
        <div className="flex flex-wrap items-end gap-3">
          <SegmentedToggle<PickRule> ariaLabel="Pick rule" value={bulk.rule.rule} onChange={(value) => bulk.pickRule(value, value === 'CARRIER' ? bulk.rule.carrier || carriers[0] || '' : '')} options={RULES} />
          {bulk.rule.rule === 'CARRIER' && (
            <FormField label="Carrier" htmlFor="bulk-carrier" className="w-56">
              <SearchableSelect<string> id="bulk-carrier" options={carriers} value={bulk.rule.carrier || null} onChange={(carrier) => bulk.pickRule('CARRIER', carrier)} getKey={(carrier) => carrier} getLabel={(carrier) => carrier} placeholder="Pick a carrier" />
            </FormField>
          )}
          {quoting > 0 && (
            <span className="ml-auto flex items-center gap-2 text-sm text-text-muted">
              <Spinner size="sm" /> {bulk.ready.length - quoting} of {bulk.ready.length} priced
            </span>
          )}
        </div>
      </SectionCard>

      <div className={TABLE}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Booking', 'Units', 'Rates', 'Selected rate', 'Price', 'Est. delivery'].map((title) => (
                <th key={title} className={HEAD}>
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bulk.readyOrders.map((order) => (
              <React.Fragment key={order.key}>
                <OrderHeaderRow order={order} colSpan={6} note={`${order.bookings} booking${order.bookings === 1 ? '' : 's'}`} />
                {bulk.ready
                  .filter((row) => row.orderKey === order.key)
                  .map((row) => {
                    const { quote } = row.work
                    return (
                      <tr key={row.key} className="border-b border-border last:border-0">
                        <td className={`${CELL} !text-left whitespace-nowrap`}>{bookingNote(row)}</td>
                        <td className={`${CELL} whitespace-nowrap`}>{unitsLabel(row.unitNos)}</td>
                        <td className={CELL}>
                          {quote.status === 'error' ? (
                            <span className="text-danger-600">{quote.error}</span>
                          ) : quote.status === 'idle' ? (
                            '—'
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              {quote.status === 'loading' && <Spinner size="sm" />}
                              {quote.rates.length} rate{quote.rates.length === 1 ? '' : 's'}
                            </span>
                          )}
                          {quote.notes.length > 0 && (
                            <span className="mt-1 block max-w-[14rem] text-xs text-warning-700" title={quote.notes.join('\n')}>
                              {quote.notes[quote.notes.length - 1]}
                            </span>
                          )}
                        </td>
                        <td className={`${CELL} min-w-[18rem]`}>
                          {quote.rates.length > 0 && (
                            <SearchableSelect
                              options={[...quote.rates].sort((a, b) => a.total - b.total)}
                              value={row.rate}
                              onChange={(rate) => bulk.selectRate(row.key, rate.rateId)}
                              getKey={(rate) => rate.rateId}
                              getLabel={(rate) => `${rate.carrier} · ${rate.serviceName}`}
                              renderOption={(rate) => (
                                <span className="flex justify-between gap-3 text-sm">
                                  <span>
                                    {rate.carrier} · {rate.serviceName}
                                    {transitDays(rate) && <span className="text-text-muted"> · {transitDays(rate)} d</span>}
                                  </span>
                                  <b>{money(rate.total, rate.currency)}</b>
                                </span>
                              )}
                              renderValue={(rate) => `${rate.carrier} · ${rate.serviceName}`}
                              ariaLabel={`Rate for ${row.ref.orderId} ${unitsLabel(row.unitNos)}`}
                            />
                          )}
                        </td>
                        <td className={`${CELL} font-semibold`}>{row.rate ? money(row.rate.total, row.rate.currency) : '—'}</td>
                        <td className={CELL}>{row.rate?.estimatedDelivery ? shortDay(row.rate.estimatedDelivery) : '—'}</td>
                      </tr>
                    )
                  })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Footer
        note={
          <>
            <b>{bulk.priced.length} priced</b> · {money(bulk.total)} total{bulk.priced.length > 0 && <> · avg {money(bulk.total / bulk.priced.length)}</>}
          </>
        }
      >
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button disabled={bulk.priced.length === 0 || quoting > 0} onClick={onNext}>
          Review booking ({bulk.priced.length})
        </Button>
      </Footer>
    </div>
  )
}

/** Step 3: every order with its carrier, estimate and price: the only step before money is spent. */
const ConfirmStep: React.FC<{ bulk: BulkBook; onBack: () => void; onBook: () => void }> = ({ bulk, onBack, onBook }) => {
  const byCarrier = new Map<string, { parcels: number; total: number }>()
  bulk.priced.forEach(({ rate }) => rate && byCarrier.set(rate.carrier, { parcels: (byCarrier.get(rate.carrier)?.parcels ?? 0) + 1, total: (byCarrier.get(rate.carrier)?.total ?? 0) + rate.total }))
  return (
    <div className="space-y-4">
      <div className={TABLE}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Booking', 'Units', 'Carrier · service', 'Transit', 'Est. delivery', 'Price'].map((title) => (
                <th key={title} className={HEAD}>
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bulk.orders
              .filter((order) => bulk.priced.some((row) => row.orderKey === order.key))
              .map((order) => (
                <React.Fragment key={order.key}>
                  <OrderHeaderRow order={order} colSpan={6} note={`${bulk.priced.filter((row) => row.orderKey === order.key).length} of ${order.bookings} booking${order.bookings === 1 ? '' : 's'} priced`} />
                  {bulk.priced
                    .filter((row) => row.orderKey === order.key)
                    .map((row) => (
                      <tr key={row.key} className="border-b border-border last:border-0">
                        <td className={`${CELL} !text-left whitespace-nowrap`}>{bookingNote(row)}</td>
                        <td className={`${CELL} whitespace-nowrap`}>{unitsLabel(row.unitNos)}</td>
                        <td className={CELL}>
                          {row.rate?.carrier} · {row.rate?.serviceName}
                        </td>
                        <td className={CELL}>{row.rate && transitDays(row.rate) ? `${transitDays(row.rate)} d` : '—'}</td>
                        <td className={CELL}>{row.rate?.estimatedDelivery ? shortDay(row.rate.estimatedDelivery) : '—'}</td>
                        <td className={`${CELL} font-semibold`}>{row.rate ? money(row.rate.total, row.rate.currency) : '—'}</td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            <tr>
              <td className="px-3 py-3 text-right align-middle text-sm" colSpan={5}>
                <b>
                  Total ({bulk.priced.length} booking{bulk.priced.length === 1 ? '' : 's'} · {bulk.priced.reduce((sum, row) => sum + row.unitNos.length, 0)} unit{bulk.priced.reduce((sum, row) => sum + row.unitNos.length, 0) === 1 ? '' : 's'})
                </b>
              </td>
              <td className={`${CELL} font-bold`}>{money(bulk.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-muted">
        By carrier:{' '}
        {[...byCarrier].map(([carrier, { parcels, total }]) => `${carrier} ${parcels} · ${money(total)}`).join('  |  ')}
      </p>
      {bulk.expired.length > 0 && (
        <Alert variant="warning" className="flex flex-wrap items-center justify-between gap-2">
          {bulk.expired.length} quote{bulk.expired.length === 1 ? ' has' : 's have'} expired. Refresh the rates before booking.
          <Button size="sm" variant="outline" onClick={() => void bulk.getRates(bulk.expired.map((row) => row.key))}>
            Refresh rates
          </Button>
        </Alert>
      )}
      <Alert variant="warning">Booking buys each label and marks the order shipped on its channel. Each parcel can be voided one by one from its booking, not as a batch here. To change a rate, go Back to Rates.</Alert>
      <Footer note={<>Nothing is bought until you press Book.</>}>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button disabled={bulk.priced.length === 0 || bulk.expired.length > 0} onClick={onBook}>
          Book {bulk.priced.length} parcel{bulk.priced.length === 1 ? '' : 's'} · {money(bulk.total)}
        </Button>
      </Footer>
    </div>
  )
}

/** Step 4: each order's own result as its background booking finishes. */
const BookingStep: React.FC<{ bulk: BulkBook; onDone: () => void }> = ({ bulk, onDone }) => {
  const [printing, setPrinting] = useState<number[] | null>(null)
  const rows = bulk.priced
  const booked = rows.filter((row) => row.work.book?.status === 'booked')
  const failed = rows.filter((row) => row.work.book?.status === 'failed')
  const running = rows.length - booked.length - failed.length
  const percent = rows.length ? Math.round(((booked.length + failed.length) / rows.length) * 100) : 0
  const spent = booked.reduce((sum, row) => sum + (row.rate?.total ?? 0), 0)
  return (
    <div className="space-y-4">
      <SectionCard title="Booking" subtitle="Runs on the server: you can leave this page and the bookings carry on">
        <div className="h-2 overflow-hidden rounded-full bg-secondary-100">
          <div className="h-full bg-success-600 transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-sm">
          <b>{booked.length} booked</b> · <b className={failed.length ? 'text-danger-600' : ''}>{failed.length} failed</b> · {running} running · {money(spent)} spent
        </p>
      </SectionCard>
      <div className={TABLE}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Booking', 'Units', 'Carrier · service', 'Status', 'Tracking / reason'].map((title) => (
                <th key={title} className={HEAD}>
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bulk.orders
              .filter((order) => rows.some((row) => row.orderKey === order.key))
              .map((order) => {
                const mine = rows.filter((row) => row.orderKey === order.key)
                const done = mine.filter((row) => row.work.book?.status === 'booked').length
                return (
                  <React.Fragment key={order.key}>
                    <OrderHeaderRow order={order} colSpan={5} note={`${done} of ${mine.length} booked`} />
                    {mine.map((row) => {
                      const result = row.work.book
                      return (
                        <tr key={row.key} className="border-b border-border last:border-0">
                          <td className={`${CELL} !text-left whitespace-nowrap`}>{bookingNote(row)}</td>
                          <td className={`${CELL} whitespace-nowrap`}>{unitsLabel(row.unitNos)}</td>
                          <td className={CELL}>
                            {row.rate?.carrier} · {row.rate?.serviceName}
                          </td>
                          <td className={CELL}>
                            {result?.status === 'booked' ? <StatusBadge label="Booked" tone="success" /> : result?.status === 'failed' ? <StatusBadge label="Failed" tone="danger" /> : <StatusBadge label={result?.status === 'running' ? 'Booking…' : 'Queued'} tone="neutral" />}
                          </td>
                          <td className={CELL}>
                            {result?.status === 'booked' ? (
                              <span className="font-mono text-xs">{result.trackingNumber ?? result.bookingNo}</span>
                            ) : result?.status === 'failed' ? (
                              <span className="text-danger-600">{result.error}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                )
              })}
          </tbody>
        </table>
      </div>
      <Footer note="A failed booking gives its units back, and nothing is charged for it. Retry it alone, or book those units with another carrier from the Orders list.">
        <Button variant="outline" disabled={failed.length === 0 || running > 0} onClick={() => void bulk.book(failed.map((row) => row.key))}>
          Retry failed ({failed.length})
        </Button>
        <Button variant="outline" disabled={booked.length === 0} onClick={() => setPrinting(booked.map((row) => row.work.book?.shipmentId).filter((id): id is number => id !== undefined))}>
          Print labels ({booked.length})
        </Button>
        <Button disabled={running > 0} onClick={onDone}>
          Back to Orders
        </Button>
      </Footer>
      <BulkPrintDialog shipmentIds={printing} onClose={() => setPrinting(null)} />
    </div>
  )
}

/**
 * Shipping › Orders › Get rates (several orders): Review › Rates › Confirm › Booking for the To Book orders ticked in
 * the Orders list. Each order is checked and quoted like the single-order flow; booking runs per order in the
 * background, so a failure never stops the rest.
 */
export const BulkBookScreen: React.FC = () => {
  const router = useRouter()
  const canWrite = useAppAbility().can('write', 'shipping:orders')
  const bulk = useBulkBook()
  const [phase, setPhase] = useState<Phase>(0)

  if (!canWrite) return <Alert variant="info">Booking orders needs the Shipping write permission.</Alert>
  if (bulk.orders.length === 0 && !bulk.loading)
    return (
      <Alert variant="warning" className="flex flex-wrap items-center justify-between gap-2">
        No orders picked. Tick To Book orders in the Orders list, then choose Get rates.
        <Link href={ORDERS_LIST_HREF} className="ds-button ds-button-outline ds-button-sm">
          Back to Orders
        </Link>
      </Alert>
    )

  const go = async (next: Phase) => {
    setPhase(next)
    if (next === 1) await bulk.getRates()
    if (next === 3) await bulk.book()
  }

  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-text-primary sm:text-2xl">{bulk.orders.length === 1 ? `Book order ${bulk.orders[0].ref.orderId}` : `Book ${bulk.orders.length} orders`}</h1>
      <WizardStepper
        steps={STEPS}
        current={phase}
        summaries={[`${bulk.ready.length} booking${bulk.ready.length === 1 ? '' : 's'} ready`, `${bulk.priced.length} priced`, `${money(bulk.total)}`, null]}
        onGoTo={(index) => phase < 3 && setPhase(index as Phase)}
      />
      {bulk.loading && phase === 0 && <div className="mb-4 flex items-center gap-2 text-sm text-text-muted"><Spinner size="sm" /> Loading the orders…</div>}
      {phase === 0 && <ReviewStep bulk={bulk} onNext={() => void go(1)} />}
      {phase === 1 && <RatesStep bulk={bulk} onBack={() => setPhase(0)} onNext={() => void go(2)} />}
      {phase === 2 && <ConfirmStep bulk={bulk} onBack={() => setPhase(1)} onBook={() => void go(3)} />}
      {phase === 3 && <BookingStep bulk={bulk} onDone={() => router.push(ORDERS_LIST_HREF)} />}
    </>
  )
}
