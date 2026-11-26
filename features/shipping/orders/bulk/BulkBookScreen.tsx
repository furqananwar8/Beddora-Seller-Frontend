'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormField } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { useAppAbility } from '@/hooks/useAppAbility'
import { ChannelBadge } from '../../shared/ChannelBadge'
import { SectionCard } from '../../shared/Card'
import { Breakdown, TAG_CLASS } from '../../create/RateRow'
import { tagRates, TAG_LABEL } from '../../create/rateRanking'
import { CarrierLogo } from '../../shared/CarrierLogo'
import { UNITS } from '../../create/shipmentForm'
import { WizardStepper } from '../../create/WizardStepper'
import { bookOrderHref, INCOTERM_META, money, ORDERS_LIST_HREF, shortDay, SKU_MAPPER_HREF, transitDays } from '../../shippingMeta'
import { cn } from '@/utils/cn'
import { unitsLabel, unitsSummary, type BookingPlan } from '../orderUnits'
import type { Incoterm, Rate, RateTag, ShipFromOption } from '../../types'
import { BulkPrintDialog } from './BulkPrintDialog'
import { ParcelDetailsDialog, parcelText } from './ParcelDetailsDialog'
import type { PackageText } from './prepareOrder'
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

const TagPills: React.FC<{ tags: RateTag[] }> = ({ tags }) => (
  <>
    {tags.map((tag) => (
      <span key={tag} className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', TAG_CLASS[tag])}>
        {TAG_LABEL[tag]}
      </span>
    ))}
  </>
)

/** One rate in the list: carrier logo, service with its tags, transit below it, and the price in its own right-aligned column. */
const RateOption: React.FC<{ rate: Rate; tags: RateTag[] }> = ({ rate, tags }) => {
  const days = transitDays(rate)
  const when = [days && `${days} d`, rate.estimatedDelivery && `Est. ${shortDay(rate.estimatedDelivery)}`].filter(Boolean).join(' · ')
  return (
    <span className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_6rem] items-center gap-3 text-sm">
      <CarrierLogo carrier={rate.carrier} provider={rate.provider} size="sm" />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-text-primary">
            {rate.carrier} · {rate.serviceName}
          </span>
          <TagPills tags={tags} />
        </span>
        <span className="block text-xs text-text-muted">{when || 'Transit not given'}</span>
      </span>
      <b className="text-right tabular-nums text-text-primary">{money(rate.total, rate.currency)}</b>
    </span>
  )
}

/** Shows or hides an order's details: a down arrow while they are shown, an up arrow while they are hidden. */
const DetailsToggle: React.FC<{ shown: boolean; onClick: () => void }> = ({ shown, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-expanded={shown}
    aria-label={shown ? 'Hide the order details' : 'Show the order details'}
    title={shown ? 'Hide the order details' : 'Show the order details'}
    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-secondary-100"
  >
    {shown ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronUp className="h-4 w-4" aria-hidden />}
  </button>
)

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

/** Length, width, height and weight of one package. */
const SizeInputs: React.FC<{ pkg: PackageText; units: keyof typeof UNITS; name: string; onChange: (pkg: PackageText) => void }> = ({ pkg, units, name, onChange }) => {
  const unit = UNITS[units]
  const field = (key: keyof PackageText, label: string, suffix: string) => (
    <label className="flex items-center gap-1 text-xs text-text-muted">
      {label}
      <input
        inputMode="decimal"
        value={pkg[key]}
        onChange={(event) => onChange({ ...pkg, [key]: event.target.value })}
        aria-label={`${label} for ${name}`}
        className="ds-input ds-input-default h-8 w-20 rounded-lg px-2 text-sm text-text-primary"
      />
      {suffix}
    </label>
  )
  return (
    <span className="flex shrink-0 items-center gap-3 whitespace-nowrap">
      {field('length', 'L', unit.length.toLowerCase())}
      {field('width', 'W', unit.length.toLowerCase())}
      {field('height', 'H', unit.length.toLowerCase())}
      {field('weight', 'Weight', unit.weight.toLowerCase())}
    </span>
  )
}

/** One booking's package: its size starts from what the products work out to, and changing it asks for the booking's rates again. */
const PackageEditor: React.FC<{ row: BulkRow; bulk: BulkBook }> = ({ row, bulk }) => {
  const values = row.prepared?.values
  if (!values || !row.detail) return null
  const several = row.unitNos.length > 1
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
        <b className="text-text-primary">
          {bookingNote(row)} · {unitsLabel(row.unitNos)}
        </b>
        <span className="text-xs text-text-muted">{unitsSummary(row.detail.units, row.unitNos)}</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{several ? `Whole booking (${row.unitNos.length} quantity)` : unitsLabel(row.unitNos)}</span>
        <SizeInputs pkg={values.pkg} units={values.units} name={`${bookingNote(row)} ${unitsLabel(row.unitNos)}`} onChange={(next) => bulk.setPackage(row.key, next)} />
        {bulk.pkgOf[row.key] ? (
          <button type="button" onClick={() => bulk.resetPackage(row.key)} className="shrink-0 whitespace-nowrap text-xs text-primary-600 underline">
            Reset to the products&apos; size
          </button>
        ) : (
          <span className="shrink-0 whitespace-nowrap text-xs text-text-muted">from the products</span>
        )}
      </div>
    </div>
  )
}

/** Where the order ships to, in full: name, address, phone, and whether it is a home or a business; or why it is missing. */
const ShipToDetails: React.FC<{ detail: NonNullable<OrderRow['detail']> }> = ({ detail }) => {
  const to = detail.shipTo
  return (
    <div className="mb-3 text-sm leading-6">
      <div className="text-xs font-medium uppercase tracking-wide text-text-muted">Ship to</div>
      {to ? (
        <>
          <b className="text-text-primary">{to.name || 'No name'}</b>
          {to.company && <> · {to.company}</>} · <span className="text-text-secondary">{to.residential ? 'residential' : 'business'}</span>
          <br />
          <span className="text-text-secondary">{[to.address1, to.address2, [to.city, to.province, to.postalCode].filter(Boolean).join(' '), to.country].filter(Boolean).join(', ')}</span>
          {to.phone && <span className="text-text-muted"> · {to.phone}</span>}
          {to.email && <span className="text-text-muted"> · {to.email}</span>}
        </>
      ) : (
        <span className="text-danger-600">No ship-to address</span>
      )}
      {detail.shipToError && <span className="block text-xs text-warning-700">{detail.shipToError}</span>}
    </div>
  )
}

const CHOICE = 'rounded-lg border px-3 py-1.5 text-xs font-medium'
const Choice: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button type="button" aria-pressed={active} onClick={onClick} className={cn(CHOICE, active ? 'border-primary-600 bg-primary-600 text-white' : 'border-border bg-surface text-text-secondary')}>
    {children}
  </button>
)

/** A − n + control for a count from `min` to `max`. */
const CountStepper: React.FC<{ value: number; min: number; max: number; onChange: (value: number) => void; label: string }> = ({ value, min, max, onChange, label }) => {
  const BUTTON = 'h-8 w-8 text-lg leading-none text-text-secondary hover:bg-secondary-50 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <span className="inline-flex items-center overflow-hidden rounded-lg border border-border bg-surface" role="group" aria-label={label}>
      <button type="button" className={BUTTON} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Fewer: ${label}`}>
        −
      </button>
      <span className="min-w-[2.25rem] px-2 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" className={BUTTON} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`More: ${label}`}>
        +
      </button>
    </span>
  )
}

/** SKUs of some quantities, with how many of each, in the order they first appear. */
const skusOf = (detail: NonNullable<OrderRow['detail']>, unitNos: number[]) => {
  const counts = new Map<string, number>()
  for (const unitNo of unitNos) {
    const sku = detail.units.find((unit) => unit.unitNo === unitNo)?.sku ?? ''
    counts.set(sku, (counts.get(sku) ?? 0) + 1)
  }
  return [...counts].map(([sku, count]) => ({ sku, count }))
}

/**
 * How an order is booked, asked in the order a person thinks about it: which SKUs the order has, whether they go in one
 * booking or a booking each, and, for a SKU with several quantities booked on its own, whether they ship together or as
 * a booking each. Then each booking's package.
 */
const BookingsBuilder: React.FC<{ order: OrderRow; bulk: BulkBook }> = ({ order, bulk }) => {
  const detail = order.detail
  if (!detail) return null
  const { plan } = order
  const skus = skusOf(detail, order.free)
  const blockedSkus = skusOf(detail, order.blocked)
  const several = skus.length > 1
  // quantities of a SKU can ship as a booking each only when the SKUs are not merged into one booking
  const splitting = !plan.combine || !several
  const change = (next: BookingPlan) => bulk.setPlan(order.key, next)
  const setSku = (sku: string, patch: { take?: number; each?: boolean }) => change({ ...plan, skus: { ...plan.skus, [sku]: { ...plan.skus[sku], ...patch } } })
  const bookings = bulk.rows.filter((row) => row.orderKey === order.key)
  const booked = detail.units.length - order.free.length - order.blocked.length
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <b className="text-text-primary">Bookings</b>
        <span className="text-xs text-text-muted">
          This order has {skus.length + blockedSkus.length} SKU{skus.length + blockedSkus.length === 1 ? '' : 's'}
        </span>
      </div>

      <ShipToDetails detail={detail} />

      <ul className="space-y-2">
        {skus.map(({ sku, count }) => {
          const take = Math.min(plan.skus[sku]?.take ?? count, count)
          return (
            <li key={sku} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-80 min-w-0 truncate font-mono text-xs text-text-primary" title={sku}>
                {sku}
              </span>
              <span className="w-28 text-text-secondary">{count} quantity</span>
              {count > 1 && (
                <span className="flex items-center gap-2 text-xs text-text-muted">
                  Book now
                  <CountStepper value={take} min={0} max={count} onChange={(value) => setSku(sku, { take: value })} label={`quantity of ${sku} to book now`} />
                  of {count}
                </span>
              )}
            </li>
          )
        })}
        {blockedSkus.map(({ sku, count }) => (
          <li key={sku} className="flex flex-wrap items-center gap-3 text-sm opacity-70">
            <span className="w-80 min-w-0 truncate font-mono text-xs text-text-primary" title={sku}>
              {sku}
            </span>
            <span className="w-28 text-text-secondary">{count} quantity</span>
            <span className="text-xs text-text-muted">Not mapped: disabled until it is</span>
            <a href={SKU_MAPPER_HREF} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 underline">
              Map this SKU to book it
            </a>
          </li>
        ))}
      </ul>

      {several && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-text-secondary">How do you want to book the SKUs?</p>
          <div className="flex flex-wrap gap-2">
            <Choice active={plan.combine} onClick={() => change({ ...plan, combine: true })}>
              One booking with everything
            </Choice>
            <Choice active={!plan.combine} onClick={() => change({ ...plan, combine: false })}>
              A separate booking for each SKU
            </Choice>
          </div>
        </div>
      )}

      {splitting &&
        skus
          .filter(({ sku, count }) => Math.min(plan.skus[sku]?.take ?? count, count) > 1)
          .map(({ sku, count }) => {
            const take = Math.min(plan.skus[sku]?.take ?? count, count)
            const each = Boolean(plan.skus[sku]?.each)
            return (
              <div key={sku} className="mt-3">
                <p className="mb-1 text-xs font-medium text-text-secondary">
                  Book the {take} quantity of <span className="font-mono">{sku}</span> as
                </p>
                <div className="flex flex-wrap gap-2">
                  <Choice active={!each} onClick={() => setSku(sku, { each: false })}>
                    One shipment
                  </Choice>
                  <Choice active={each} onClick={() => setSku(sku, { each: true })}>
                    A separate booking for each quantity ({take})
                  </Choice>
                </div>
              </div>
            )
          })}

      <p className="mt-3 text-xs text-text-muted">
        {order.bookings} booking{order.bookings === 1 ? '' : 's'}
        {order.leftOut.length > 0 && <> · {order.leftOut.length} quantity left for later (the order then shows {order.free.length - order.leftOut.length + booked} / {detail.units.length} booked)</>}
      </p>

      {bookings.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {bookings.map((row) => (
            <PackageEditor key={row.key} row={row} bulk={bulk} />
          ))}
        </div>
      )}
    </div>
  )
}

/** The Quantity cell of a booking: which quantities, and what SKUs they are. */
const QuantityCell: React.FC<{ row: BulkRow }> = ({ row }) => (
  <>
    {unitsLabel(row.unitNos)}
    {row.detail && <span className="block text-xs text-text-muted">{unitsSummary(row.detail.units, row.unitNos)}</span>}
  </>
)

/** Step 1: one ship-from and the shipment defaults for all, how to split orders with several units, then each order's readiness. */
const ReviewStep: React.FC<{ bulk: BulkBook; onNext: () => void }> = ({ bulk, onNext }) => {
  const { shipFrom, addresses, defaults } = bulk
  // Package sizes are shown under every order; this holds the ones the user folded away
  const [folded, setFolded] = useState<Set<string>>(new Set())
  const toggleSizing = (key: string) =>
    setFolded((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
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
        <SectionCard title="Shipment defaults" subtitle="Package, products and customs come from each booking's quantity and our products, as when booking one order">
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

      <div className={cn(TABLE, '[container-type:inline-size]')}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Order', 'Ship to', 'Quantity to book', 'Bookings', 'Ship-to', 'Products mapped', 'Package', 'Customs', 'Status', ''].map((title, index) => (
                <th key={title} className={index < 2 ? `${HEAD} !text-left` : HEAD}>
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bulk.orders.map((order) => {
              const checks = order.prepared?.checks
              const left = order.detail ? order.detail.units.length - order.free.length - order.blocked.length : 0
              return (
                <React.Fragment key={order.key}>
                <tr className="border-b border-border last:border-0">
                  <td className={`${CELL} !text-left`}>
                    <div className="flex items-start gap-2">
                      {order.detail && order.free.length + order.blocked.length > 0 ? <DetailsToggle shown={!folded.has(order.key)} onClick={() => toggleSizing(order.key)} /> : <span className="w-7 shrink-0" />}
                      <div className="min-w-0">
                        <OrderCell row={order} left />
                        {left > 0 && <span className="mt-1 block text-xs text-text-muted">{left} of {order.detail?.units.length} quantity already booked</span>}
                      </div>
                    </div>
                  </td>
                  <td className={`${CELL} !text-left`}>
                    <Lane row={order} />
                  </td>
                  {order.loadError ? (
                    <td className={CELL} colSpan={8}>
                      <span className="text-danger-600">{order.loadError}</span>
                    </td>
                  ) : !order.detail || !checks ? (
                    <td className={CELL} colSpan={8}>
                      <Spinner size="sm" />
                    </td>
                  ) : (
                    <>
                      <td className={`${CELL} tabular-nums`}>
                        {order.free.length}
                        {order.blocked.length > 0 && <span className="block text-xs text-warning-700">+{order.blocked.length} not mapped</span>}
                      </td>
                      <td className={`${CELL} font-semibold tabular-nums`}>
                        {order.bookings || '—'}
                      </td>
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
                    {order.free.length === 0 && order.blocked.length === 0 && order.detail ? (
                      <StatusBadge label="Nothing left to book" tone="neutral" />
                    ) : (
                      order.prepared &&
                      (order.prepared.problem ? (
                        <>
                          <StatusBadge label="Needs fixing" tone="danger" />
                          <span className="mx-auto mt-1 block max-w-[16rem] break-words text-xs text-text-muted">{order.prepared.problem}</span>
                        </>
                      ) : (
                        <>
                          <StatusBadge label="Ready" tone="success" />
                          {order.blocked.length > 0 && <span className="mx-auto mt-1 block max-w-[16rem] break-words text-xs text-text-muted">{order.blocked.length} quantity not mapped: left out until its SKU is mapped</span>}
                        </>
                      ))
                    )}
                  </td>
                  <td className={CELL}>
                    {(order.prepared?.problem || order.blocked.length > 0) && order.prepared && (
                      // New tab: this page stays open and updates itself when the fix is saved there (see useBulkBook)
                      <Link target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-600 underline" href={order.prepared.checks.mapped && order.blocked.length === 0 ? bookOrderHref(order.ref) : SKU_MAPPER_HREF}>
                        {order.prepared.checks.mapped && order.blocked.length === 0 ? 'Fix' : 'Map SKU'}
                      </Link>
                    )}
                  </td>
                </tr>
                {!folded.has(order.key) && order.detail && order.free.length + order.blocked.length > 0 && (
                  <tr className="border-b border-border bg-secondary-50">
                    <td className="p-0 text-left" colSpan={10}>
                      <div className="sticky left-0 w-[100cqw] p-3">
                        <BookingsBuilder order={order} bulk={bulk} />
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
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
  const [parcel, setParcel] = useState<BulkRow | null>(null)
  // The booking whose carrier notes are open in the modal
  const [errorsOf, setErrorsOf] = useState<BulkRow | null>(null)
  // Protection changes what carriers quote, so turning it on or off asks every booking for its rates again
  const protection = bulk.defaults.protection
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    void bulk.getRates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protection])
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
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" checked={protection} onChange={(event) => bulk.setDefaults({ ...bulk.defaults, protection: event.target.checked })} className="h-4 w-4 accent-primary-600" />
            Protection (insurance)
            <span className="text-xs text-text-muted">for each booking&apos;s declared value; rates are fetched again</span>
          </label>
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
              {['Booking', 'Quantity', 'Parcel', 'Rates', 'Selected rate', 'Price', 'Est. delivery'].map((title) => (
                <th key={title} className={HEAD}>
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bulk.readyOrders.map((order) => (
              <React.Fragment key={order.key}>
                <OrderHeaderRow order={order} colSpan={7} note={`${order.bookings} booking${order.bookings === 1 ? '' : 's'}`} />
                {bulk.ready
                  .filter((row) => row.orderKey === order.key)
                  .map((row) => {
                    const { quote } = row.work
                    return (
                      <tr key={row.key} className="border-b border-border last:border-0">
                        <td className={`${CELL} !text-left whitespace-nowrap`}>{bookingNote(row)}</td>
                        <td className={`${CELL} whitespace-nowrap`}>
                          <QuantityCell row={row} />
                        </td>
                        <td className={CELL}>
                          {/* the parcel's package; clicking opens what is in it, where it ships from and to */}
                          <button type="button" onClick={() => setParcel(row)} className="whitespace-nowrap text-xs text-primary-600 underline hover:text-primary-700" aria-label={`Parcel details for ${row.ref.orderId} ${unitsLabel(row.unitNos)}`}>
                            {parcelText(row) ?? 'Details'}
                          </button>
                        </td>
                        <td className={CELL}>
                          {quote.status === 'error' ? (
                            <span className="text-danger-600">{quote.error}</span>
                          ) : quote.status === 'idle' ? (
                            '—'
                          ) : (
                            // a spinner only while nothing has arrived; after the first rate the count climbs by itself
                            quote.status === 'loading' && quote.rates.length === 0 ? (
                              <Spinner size="sm" />
                            ) : (
                              <span>
                                {quote.rates.length} rate{quote.rates.length === 1 ? '' : 's'}
                              </span>
                            )
                          )}
                          {quote.notes.length > 0 && (
                            <button type="button" onClick={() => setErrorsOf(row)} className="mt-1 inline-flex items-center whitespace-nowrap rounded-full bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700 hover:bg-warning-100">
                              Carrier notes
                            </button>
                          )}
                        </td>
                        <td className={`${CELL} min-w-[26rem]`}>
                          {quote.rates.length > 0 && (
                            <SearchableSelect
                              options={[...quote.rates].sort((a, b) => a.total - b.total)}
                              value={row.rate}
                              onChange={(rate) => bulk.selectRate(row.key, rate.rateId)}
                              getKey={(rate) => rate.rateId}
                              getLabel={(rate) => `${rate.carrier} · ${rate.serviceName}`}
                              renderOption={(rate) => <RateOption rate={rate} tags={tagRates(quote.rates).find((tagged) => tagged.rateId === rate.rateId)?.tags ?? []} />}
                              renderValue={(rate) => (
                                <span className="flex min-w-0 items-center gap-2">
                                  <CarrierLogo carrier={rate.carrier} provider={rate.provider} size="sm" />
                                  <span className="truncate">
                                    {rate.carrier} · {rate.serviceName}
                                  </span>
                                  <TagPills tags={tagRates(quote.rates).find((tagged) => tagged.rateId === rate.rateId)?.tags ?? []} />
                                </span>
                              )}
                              ariaLabel={`Rate for ${row.ref.orderId} ${unitsLabel(row.unitNos)}`}
                            />
                          )}
                        </td>
                        <td className={`${CELL} min-w-[12rem]`}>
                          {row.rate ? (
                            <>
                              <b>{money(row.rate.total, row.rate.currency)}</b>
                              {/* what the price is made of: base, surcharges (protection among them), duties, taxes */}
                              <div className="mt-1 text-center">
                                <Breakdown rate={row.rate} incoterm={bulk.defaults.incoterm} />
                              </div>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className={CELL}>{row.rate?.estimatedDelivery ? shortDay(row.rate.estimatedDelivery) : '—'}</td>
                      </tr>
                    )
                  })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <ParcelDetailsDialog row={parcel} shipFrom={bulk.shipFrom} onClose={() => setParcel(null)} />
      <Modal
        isOpen={errorsOf !== null}
        onClose={() => setErrorsOf(null)}
        size="md"
        // a header (not a title) stays put while the list scrolls under it
        header={<h2 className="text-section-title border-b border-border pb-3 pr-8">{errorsOf ? `Carrier notes · ${errorsOf.ref.orderId} · ${unitsLabel(errorsOf.unitNos)}` : 'Carrier notes'}</h2>}
      >
        <ul className="space-y-3 text-sm">
          {errorsOf?.work.quote.notes.map((note, index) => {
            // "Stallion Express: Min weight per package…": the carrier, then what it said
            const at = note.indexOf(': ')
            return (
              <li key={index} className="rounded-lg border border-border p-3">
                {at > 0 ? (
                  <>
                    <b className="block text-text-primary">{note.slice(0, at)}</b>
                    <span className="text-text-secondary">{note.slice(at + 2)}</span>
                  </>
                ) : (
                  <span className="text-text-secondary">{note}</span>
                )}
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-xs text-text-muted">The other carriers' rates are listed as usual.</p>
      </Modal>

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
              {['Booking', 'Quantity', 'Carrier · service', 'Transit', 'Est. delivery', 'Price'].map((title) => (
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
                        <td className={`${CELL} whitespace-nowrap`}>
                          <QuantityCell row={row} />
                        </td>
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
                  Total ({bulk.priced.length} booking{bulk.priced.length === 1 ? '' : 's'} · qty {bulk.priced.reduce((sum, row) => sum + row.unitNos.length, 0)})
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
              {['Booking', 'Quantity', 'Carrier · service', 'Status', 'Tracking / reason'].map((title) => (
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
                          <td className={`${CELL} whitespace-nowrap`}>
                          <QuantityCell row={row} />
                        </td>
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
      <Footer note="A failed booking gives its quantity back, and nothing is charged for it. Retry it alone, or book that quantity with another carrier from the Orders list.">
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
