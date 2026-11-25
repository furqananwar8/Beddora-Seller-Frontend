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
import type { Incoterm, ShipFromOption } from '../../types'
import { BulkPrintDialog } from './BulkPrintDialog'
import { useBulkBook, type BulkBook, type BulkRow, type PickRule } from './useBulkBook'

const STEPS = [
  { title: 'Review', hint: 'Check each order' },
  { title: 'Rates', hint: 'Pick a rate per order' },
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

const Lane: React.FC<{ row: BulkRow }> = ({ row }) => {
  const address = row.detail?.shipTo
  return <span>{address ? `${address.city}, ${address.province}` : '—'}</span>
}

const OrderCell: React.FC<{ row: BulkRow; left?: boolean }> = ({ row, left }) => (
  <span className={`flex items-center ${left ? 'justify-start' : 'justify-center'} gap-2 whitespace-nowrap`}>
    <ChannelBadge channel={row.ref.channel} />
    <b className="text-text-primary">{row.ref.orderId}</b>
  </span>
)

/** Step 1: one ship-from and the shipment defaults for all, then each order's readiness. */
const ReviewStep: React.FC<{ bulk: BulkBook; onNext: () => void }> = ({ bulk, onNext }) => {
  const { shipFrom, addresses, defaults } = bulk
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
        <SectionCard title="Shipment defaults" subtitle="Package, products and customs come from each order and our products, as when booking one order">
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

      <div className={TABLE}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Order', 'Ship to', 'Ship-to', 'Products mapped', 'Package', 'Customs', 'Status', ''].map((title, index) => (
                <th key={title} className={index < 2 ? `${HEAD} !text-left` : HEAD}>
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bulk.rows.map((row) => {
              const checks = row.prepared?.checks
              return (
                <tr key={row.key} className="border-b border-border last:border-0">
                  <td className={`${CELL} !text-left`}>
                    <OrderCell row={row} left />
                  </td>
                  <td className={`${CELL} !text-left`}>
                    <Lane row={row} />
                  </td>
                  {row.loadError ? (
                    <td className={CELL} colSpan={4}>
                      <span className="text-danger-600">{row.loadError}</span>
                    </td>
                  ) : !checks ? (
                    <td className={CELL} colSpan={4}>
                      <Spinner size="sm" />
                    </td>
                  ) : (
                    <>
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
                    {row.prepared &&
                      (row.prepared.problem ? (
                        <>
                          <StatusBadge label="Needs fixing" tone="danger" />
                          <span className="mx-auto mt-1 block max-w-[16rem] break-words text-xs text-text-muted">{row.prepared.problem}</span>
                        </>
                      ) : (
                        <StatusBadge label="Ready" tone="success" />
                      ))}
                  </td>
                  <td className={CELL}>
                    {row.prepared?.problem && (
                      // New tab: this page stays open and updates itself when the fix is saved there (see useBulkBook)
                      <Link target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-600 underline" href={row.prepared.checks.mapped ? bookOrderHref(row.ref) : SKU_MAPPER_HREF}>
                        {row.prepared.checks.mapped ? 'Fix' : 'Map SKU'}
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {bulk.rows.some((row) => row.prepared?.problem) && <p className="text-xs text-text-muted">Fix and Map SKU open in a new tab. Save there and this page updates by itself: no reload needed.</p>}

      <Footer
        note={
          bulk.loading ? (
            'Checking the orders…'
          ) : (
            <>
              <b>{bulk.ready.length} ready</b>
              {bulk.rows.length - bulk.ready.length > 0 && <> · {bulk.rows.length - bulk.ready.length} need fixing (left out unless fixed)</>}
            </>
          )
        }
      >
        <Link href={ORDERS_LIST_HREF} className="ds-button ds-button-outline ds-button-md">
          Cancel
        </Link>
        <Button disabled={bulk.ready.length === 0 || bulk.loading} onClick={onNext}>
          Get rates for {bulk.ready.length} ready order{bulk.ready.length === 1 ? '' : 's'}
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
              {['Order', 'To', 'Rates', 'Selected rate', 'Price', 'Est. delivery'].map((title) => (
                <th key={title} className={HEAD}>
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bulk.ready.map((row) => {
              const { quote } = row.work
              return (
                <tr key={row.key} className="border-b border-border last:border-0">
                  <td className={CELL}>
                    <OrderCell row={row} />
                  </td>
                  <td className={CELL}>
                    <Lane row={row} />
                  </td>
                  <td className={CELL}>{quote.status === 'loading' ? <Spinner size="sm" /> : quote.status === 'error' ? <span className="text-danger-600">{quote.error}</span> : quote.status === 'done' ? `${quote.rates.length} rates` : '—'}</td>
                  <td className={`${CELL} min-w-[18rem]`}>
                    {quote.status === 'done' && (
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
                        ariaLabel={`Rate for ${row.ref.orderId}`}
                      />
                    )}
                  </td>
                  <td className={`${CELL} font-semibold`}>{row.rate ? money(row.rate.total, row.rate.currency) : '—'}</td>
                  <td className={CELL}>{row.rate?.estimatedDelivery ? shortDay(row.rate.estimatedDelivery) : '—'}</td>
                </tr>
              )
            })}
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
              {['Order', 'Ship to', 'Carrier · service', 'Transit', 'Est. delivery', 'Price'].map((title) => (
                <th key={title} className={HEAD}>
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bulk.priced.map(({ key, ref, rate, detail }) => (
              <tr key={key} className="border-b border-border last:border-0">
                <td className={CELL}>
                  <span className="flex items-center justify-center gap-2 whitespace-nowrap">
                    <ChannelBadge channel={ref.channel} />
                    <b>{ref.orderId}</b>
                  </span>
                </td>
                <td className={CELL}>{detail?.shipTo ? `${detail.shipTo.city}, ${detail.shipTo.province}` : '—'}</td>
                <td className={CELL}>
                  {rate?.carrier} · {rate?.serviceName}
                </td>
                <td className={CELL}>{rate && transitDays(rate) ? `${transitDays(rate)} d` : '—'}</td>
                <td className={CELL}>{rate?.estimatedDelivery ? shortDay(rate.estimatedDelivery) : '—'}</td>
                <td className={`${CELL} font-semibold`}>{rate ? money(rate.total, rate.currency) : '—'}</td>
              </tr>
            ))}
            <tr>
              <td className="px-3 py-3 text-right align-middle text-sm" colSpan={5}>
                <b>
                  Total ({bulk.priced.length} parcel{bulk.priced.length === 1 ? '' : 's'})
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
              {['Order', 'Ship to', 'Carrier · service', 'Status', 'Booking / reason'].map((title) => (
                <th key={title} className={HEAD}>
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const result = row.work.book
              return (
                <tr key={row.key} className="border-b border-border last:border-0">
                  <td className={CELL}>
                    <OrderCell row={row} />
                  </td>
                  <td className={CELL}>
                    <Lane row={row} />
                  </td>
                  <td className={CELL}>
                    {row.rate?.carrier} · {row.rate?.serviceName}
                  </td>
                  <td className={CELL}>
                    {result?.status === 'booked' ? <StatusBadge label="Booked" tone="success" /> : result?.status === 'failed' ? <StatusBadge label="Failed" tone="danger" /> : <StatusBadge label={result?.status === 'running' ? 'Booking…' : 'Queued'} tone="neutral" />}
                  </td>
                  <td className={CELL}>{result?.status === 'booked' ? <span className="font-mono text-xs">{result.bookingNo}</span> : result?.status === 'failed' ? <span className="text-danger-600">{result.error}</span> : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Footer note="Failed orders stay To Book in the Orders list, and nothing is charged for them.">
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
  if (bulk.rows.length === 0 && !bulk.loading)
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
      <h1 className="mb-4 text-xl font-bold text-text-primary sm:text-2xl">Book {bulk.rows.length} orders</h1>
      <WizardStepper
        steps={STEPS}
        current={phase}
        summaries={[`${bulk.ready.length} ready`, `${bulk.priced.length} priced`, `${money(bulk.total)}`, null]}
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
