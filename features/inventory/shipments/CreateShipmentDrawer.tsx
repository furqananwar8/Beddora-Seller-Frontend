"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from '@/hooks/useScrollLock'
import { DrawerButton } from '@/components/allocation-drawer/drawerUi'
import { cn } from '@/utils/cn'
import { useGetShipmentPoolQuery, type ChannelConfig } from '@/services/api/inboundShipments.api'
import { InboundShipment, Marketplace, ReservedPoolItem, ShipmentChannel } from './types'
import { CreateShipmentInput } from './useShipments'
import { MARKETPLACE_META, getUnassignedUnits, isOpen as isOpenShipment, ofChannel } from './workflow'
import { formatUnits, unitsLabel, ChannelChip } from './ShipmentParts'
import { ShipFromChoice, ShipFromPicker, shipFromRequest } from './ShipFromPicker'
import { CHANNEL_ORDER, SHIPMENT_CHANNELS } from './channels'

/**
 * New shipment, per the "Shipment" canvas design: the channel first (Amazon FBA
 * or Walmart WFS), then one row per SKU with the channel's pool, what other open
 * shipments hold, what's left, and how many to book here. WFS books whole cases
 * and asks for the date the stock should reach Walmart. "Save draft" only holds
 * the units; "Confirm with …" also sends the plan / order.
 */

export type CreateMode = 'draft' | 'confirm'

interface CreateShipmentDrawerProps {
  isOpen: boolean
  onClose: () => void
  /** Channels the backend offers; disabled ones are shown but can't be picked. */
  channels: ChannelConfig[]
  /** Channel picked on opening (the split button, or a Planner link). */
  initialChannel?: ShipmentChannel
  /** All shipments, to show which ones hold each SKU's units. */
  shipments: InboundShipment[]
  /** Pre-selected products, e.g. from the Planner selection. */
  initialProductIds?: string[]
  onCreate: (input: CreateShipmentInput, mode: CreateMode) => Promise<InboundShipment>
}

interface FormState {
  channel: ShipmentChannel
  marketplace: Marketplace
  /** FBA: units to book per product id. WFS: cases. Strings keep the inputs editable. */
  book: Record<string, string>
  /** WFS: units per case per product id. */
  unitsPerCase: Record<string, string>
  /** WFS: YYYY-MM-DD. */
  expectedDeliveryDate: string
  /** WFS (Walmart.US): Inventory Transfer Service. */
  inventoryTransfer: boolean
  shipFrom: ShipFromChoice | null
  submitting: CreateMode | null
  /** Shown in the drawer itself: toasts sit underneath it. */
  error: string | null
  showAddressErrors: boolean
}

const defaultName = (channel: ShipmentChannel, marketplace: Marketplace) => {
  const d = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date())
  return `${SHIPMENT_CHANNELS[channel].copy.namePrefix} ${MARKETPLACE_META[marketplace].label} · ${d}`
}

const isoDay = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
const inDays = (days: number) => isoDay(new Date(Date.now() + days * 24 * 60 * 60 * 1000))

const MAX_LISTED = 2

/** "SHP-0002 draft · 10, SHP-0003 confirmed · 40", or "3 confirmed · 400" when many hold it. */
function heldBy(productId: string, shipments: InboundShipment[]): string {
  const holders = shipments
    .filter(isOpenShipment)
    .map((s) => ({ s, qty: s.items.find((i) => i.productId === productId)?.quantity ?? 0 }))
    .filter((h) => h.qty > 0)
  if (holders.length === 0) return 'None'
  const state = (s: InboundShipment) => (s.stage === 'draft' ? 'draft' : 'confirmed')
  if (holders.length <= MAX_LISTED) return holders.map(({ s, qty }) => `${s.reference} ${state(s)} · ${formatUnits(qty)}`).join(', ')
  const groups = new Map<string, { count: number; qty: number }>()
  for (const { s, qty } of holders) {
    const g = groups.get(state(s)) ?? { count: 0, qty: 0 }
    groups.set(state(s), { count: g.count + 1, qty: g.qty + qty })
  }
  return Array.from(groups, ([st, g]) => `${g.count} ${st} · ${formatUnits(g.qty)}`).join(', ')
}

const savedUnitsPerCase = (p: ReservedPoolItem) => p.unitsPerCase ?? p.casePack?.unitsPerBox

export const CreateShipmentDrawer: React.FC<CreateShipmentDrawerProps> = ({ isOpen, ...props }) =>
  isOpen ? <DrawerPanel {...props} /> : null

const DrawerPanel: React.FC<Omit<CreateShipmentDrawerProps, 'isOpen'>> = ({
  onClose,
  channels,
  initialChannel,
  shipments,
  initialProductIds = [],
  onCreate,
}) => {
  useScrollLock()
  const enabled = (id: ShipmentChannel) => channels.find((c) => c.id === id)?.enabled ?? false
  const connectedMarketplaces = (id: ShipmentChannel) =>
    (channels.find((c) => c.id === id)?.marketplaces ?? []).filter((m) => m.capabilities.connected !== false)
  const startChannel: ShipmentChannel = initialChannel && enabled(initialChannel) ? initialChannel : 'amazon_fba'

  const [form, setForm] = useState<FormState>(() => ({
    channel: startChannel,
    marketplace: connectedMarketplaces(startChannel)[0]?.id ?? 'Amazon.com',
    book: {},
    unitsPerCase: {},
    expectedDeliveryDate: inDays(7),
    inventoryTransfer: false,
    shipFrom: null,
    submitting: null,
    error: null,
    showAddressErrors: false,
  }))
  const { channel, marketplace, book, unitsPerCase, expectedDeliveryDate, inventoryTransfer, shipFrom, submitting, error: submitError, showAddressErrors } = form
  const patch = (next: Partial<FormState>) => setForm((prev) => ({ ...prev, ...next }))
  const def = SHIPMENT_CHANNELS[channel]
  const wfs = channel === 'walmart_wfs'
  const marketplaceConfig = connectedMarketplaces(channel).find((m) => m.id === marketplace)

  // FBA's pool without an argument shares the screen's cached copy; WFS eligibility depends on the marketplace
  // currentData: never the previous channel's / marketplace's pool while the new one loads
  const { currentData: pool = [], isFetching: poolLoading } = useGetShipmentPoolQuery(wfs ? { channel, marketplace } : undefined)
  const channelShipments = useMemo(() => ofChannel(shipments, channel), [shipments, channel])
  const unassigned = useMemo(() => getUnassignedUnits(pool, channelShipments), [pool, channelShipments])

  // Planner preselection, applied once the starting channel's pool has loaded
  const [seeded, setSeeded] = useState(initialProductIds.length === 0)
  useEffect(() => {
    if (seeded || pool.length === 0) return
    setSeeded(true)
    const picked = pool.filter((p) => initialProductIds.includes(p.productId) && (unassigned[p.productId] ?? 0) > 0 && p.eligible !== false)
    const perCase = Object.fromEntries(picked.map((p) => [p.productId, String(savedUnitsPerCase(p) ?? '')]))
    const quantity = (p: ReservedPoolItem) => {
      if (!wfs) return String(unassigned[p.productId])
      const upc = Number(perCase[p.productId]) || 0
      return upc ? String(Math.floor((unassigned[p.productId] ?? 0) / upc)) : ''
    }
    patch({ book: Object.fromEntries(picked.map((p) => [p.productId, quantity(p)])), unitsPerCase: perCase })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, unassigned, seeded])

  const moveTo = (next: ShipmentChannel) =>
    patch({ channel: next, marketplace: connectedMarketplaces(next)[0]?.id ?? marketplace, book: {}, unitsPerCase: {}, inventoryTransfer: false, error: null })

  // The drawer can open before the channel config has loaded; land on the requested channel once it's available
  const [channelPicked, setChannelPicked] = useState(false)
  useEffect(() => {
    if (channelPicked || !initialChannel || channel === initialChannel || !enabled(initialChannel)) return
    moveTo(initialChannel)
    setSeeded(initialProductIds.length === 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels])

  const switchChannel = (next: ShipmentChannel) => {
    if (next === channel || !enabled(next)) return
    setChannelPicked(true)
    setSeeded(true)
    moveTo(next)
  }

  const rows = useMemo(
    () =>
      pool
        .filter((p) => p.reserved > 0)
        .map((p) => ({ product: p, available: unassigned[p.productId] ?? 0, held: heldBy(p.productId, channelShipments) })),
    [pool, unassigned, channelShipments]
  )

  const perCaseOf = (p: ReservedPoolItem) => unitsPerCase[p.productId] ?? String(savedUnitsPerCase(p) ?? '')
  const unitsOf = (p: ReservedPoolItem) => {
    const n = Number(book[p.productId] || 0)
    return wfs ? n * (Number(perCaseOf(p)) || 0) : n
  }

  const booked = rows.map((r) => ({ ...r, qty: unitsOf(r.product) })).filter((r) => r.qty > 0)
  const errors = Object.fromEntries(
    rows
      .map((r) => {
        const raw = book[r.product.productId]
        const n = Number(raw || 0)
        if (raw && (!Number.isInteger(n) || n < 0)) return [r.product.productId, wfs ? 'Whole cases only' : 'Whole units only']
        if (wfs && n > 0) {
          const upc = Number(perCaseOf(r.product))
          if (!Number.isInteger(upc) || upc < 1) return [r.product.productId, 'Enter units per case']
        }
        const units = unitsOf(r.product)
        if (units > r.available) return [r.product.productId, `Only ${formatUnits(r.available)} available`]
        return null
      })
      .filter((e): e is [string, string] => e !== null)
  )
  const dateError = wfs && (!expectedDeliveryDate || expectedDeliveryDate < inDays(0)) ? 'Pick today or a later date' : null
  const totalUnits = booked.reduce((s, r) => s + r.qty, 0)
  const canSubmit = booked.length > 0 && Object.keys(errors).length === 0 && !dateError && !submitting && !!marketplaceConfig

  const submit = async (mode: CreateMode) => {
    const address = shipFromRequest(shipFrom)
    if (!address) return patch({ showAddressErrors: true, error: 'Complete the ship-from address first.' })
    patch({ submitting: mode, error: null })
    try {
      await onCreate(
        {
          channel,
          name: defaultName(channel, marketplace),
          marketplace,
          ...address,
          ...(wfs ? { expectedDeliveryDate, inventoryTransfer: inventoryTransfer && !!marketplaceConfig?.capabilities.inventoryTransfer } : {}),
          items: booked.map(({ product: p, qty }) => ({
            productId: p.productId,
            sku: p.sku,
            fnsku: p.fnsku,
            asin: p.asin,
            title: p.title,
            imageUrl: p.imageUrl,
            quantity: qty,
            ...(wfs ? { unitsPerCase: Number(perCaseOf(p)), gtin: p.gtin } : {}),
          })),
        },
        mode
      )
      onClose()
    } catch (err) {
      // The caller also toasts, but the toast sits under the drawer; keep it open to fix and retry
      patch({ submitting: null, error: (err as Error).message || 'Could not create the shipment' })
    }
  }

  const columns = wfs ? 'grid-cols-[240px_100px_minmax(0,1fr)_100px_110px_150px]' : 'grid-cols-[260px_110px_minmax(0,1fr)_110px_150px]'

  return createPortal(
    <div className="fixed inset-0 z-50 overscroll-none" role="dialog" aria-modal="true" aria-labelledby="create-shipment-title">
      {/* The dimmed area is deliberately inert: the drawer closes only from its own buttons */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="absolute inset-y-0 right-0 flex w-full max-w-[1120px] flex-col border-l border-slate-200 bg-white text-slate-900">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-4 pb-5 pt-6 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:gap-6">
            <div className="flex flex-col gap-1">
              <h2 id="create-shipment-title" className="text-[22px] font-semibold">
                {def.copy.newTitle}
              </h2>
              <p className="text-sm text-slate-600">{def.copy.newSubtitle}</p>
            </div>
            <div className="flex w-full flex-col gap-1 sm:w-[220px]">
              <label htmlFor="shipment-destination" className="text-[13px] font-medium text-slate-700">
                Destination
              </label>
              <select
                id="shipment-destination"
                value={marketplace}
                disabled={!!submitting}
                onChange={(e) => patch({ marketplace: e.target.value as Marketplace, book: wfs ? {} : book, inventoryTransfer: false })}
                className="h-10 !rounded-lg border border-slate-300 bg-white px-3 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {connectedMarketplaces(channel).map((mp) => (
                  <option key={mp.id} value={mp.id}>
                    {mp.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Channel: fixed once the shipment is saved */}
          {channels.length > 1 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Channel">
              {CHANNEL_ORDER.filter((id) => channels.some((c) => c.id === id)).map((id) => {
                const config = channels.find((c) => c.id === id)!
                const selected = id === channel
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!config.enabled || !!submitting}
                    title={config.enabled ? undefined : config.disabledReason}
                    onClick={() => switchChannel(id)}
                    className={cn(
                      'flex items-start gap-3 !rounded-[10px] border-2 bg-white px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      selected ? 'border-slate-900' : 'border-slate-200 hover:border-slate-400'
                    )}
                  >
                    <span className={cn('mt-1 h-4 w-4 flex-shrink-0 rounded-full border-2', selected ? 'border-[5px] border-slate-900' : 'border-slate-400')} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-center gap-2 text-[15px] font-semibold">
                        <ChannelChip channel={id} /> {SHIPMENT_CHANNELS[id].label}
                        {config.sandbox && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">Sandbox</span>}
                      </span>
                      <span className="text-xs text-slate-600">
                        {config.enabled ? config.marketplaces.filter((m) => m.capabilities.connected !== false).map((m) => m.id).join(', ') : config.disabledReason}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-8">
          <ShipFromPicker
            value={shipFrom}
            onChange={(next) => patch({ shipFrom: next, error: null })}
            showErrors={showAddressErrors}
            disabled={!!submitting}
          />

          {wfs && (
            <div className="flex flex-wrap items-end gap-4 !rounded-xl border border-slate-200 px-4 py-3.5">
              <div className="flex flex-col gap-1">
                <label htmlFor="wfs-delivery-date" className="text-[13px] font-medium text-slate-700">
                  Expected delivery to Walmart
                </label>
                <input
                  id="wfs-delivery-date"
                  type="date"
                  min={inDays(0)}
                  value={expectedDeliveryDate}
                  disabled={!!submitting}
                  onChange={(e) => patch({ expectedDeliveryDate: e.target.value })}
                  className={cn(
                    'h-10 !rounded-lg border bg-white px-3 text-[15px] focus:outline-none focus:ring-2',
                    dateError ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-slate-300'
                  )}
                />
                {dateError && <span className="text-[11px] text-red-600">{dateError}</span>}
              </div>
              {marketplaceConfig?.capabilities.inventoryTransfer && (
                <label className="flex max-w-md items-start gap-2 pb-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={inventoryTransfer}
                    disabled={!!submitting}
                    onChange={(e) => patch({ inventoryTransfer: e.target.checked })}
                  />
                  <span>
                    <span className="font-medium">Ship everything to one fulfillment center</span>
                    <span className="block text-xs text-slate-600">Inventory Transfer Service: Walmart moves the stock to its other FCs, for a fee.</span>
                  </span>
                </label>
              )}
            </div>
          )}

          <div className="shrink-0 overflow-x-auto !rounded-xl border border-slate-200"><div className="min-w-[760px]">
            <div className={cn('grid border-b border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700', columns)}>
              <div className="px-4 py-3">Product</div>
              <div className="px-2 py-3 text-right">{def.program} pool</div>
              <div className="px-4 py-3">Held by other shipments</div>
              <div className="px-2 py-3 text-right">Available</div>
              {wfs && <div className="px-3 py-3">Units / case</div>}
              <div className="px-4 py-3">{wfs ? 'Cases in this one' : 'Book in this one'}</div>
            </div>

            {rows.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-600">{poolLoading ? 'Loading stock…' : def.copy.emptyPool}</div>
            )}

            {rows.map(({ product: p, available, held }) => {
              const blocked = p.eligible === false
              const full = available === 0
              const error = errors[p.productId]
              const units = unitsOf(p)
              return (
                <div
                  key={p.productId}
                  className={cn('grid min-h-[72px] items-center border-b border-slate-100 text-sm last:border-0', columns, full || blocked ? 'bg-slate-50' : 'bg-white')}
                >
                  <div className="flex min-w-0 flex-col gap-0.5 px-4 py-2.5">
                    <span className={cn('truncate font-medium', full || blocked ? 'text-slate-600' : 'text-slate-900')}>{p.title}</span>
                    <span className="truncate font-mono text-xs text-slate-600">
                      {p.sku}
                      {wfs && p.gtin && ` · GTIN ${p.gtin}`}
                    </span>
                  </div>
                  <div className="px-2 py-2.5 text-right">{formatUnits(p.reserved)}</div>
                  <div className="px-4 py-2.5 text-[13px] text-slate-700">{held}</div>
                  <div className={cn('px-2 py-2.5 text-right font-semibold', full ? 'text-slate-600' : 'text-emerald-800')}>{formatUnits(available)}</div>
                  {wfs && (
                    <div className="px-3 py-2.5">
                      {!blocked && !full && (
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={perCaseOf(p)}
                          placeholder="—"
                          disabled={!!submitting}
                          onChange={(e) => patch({ unitsPerCase: { ...unitsPerCase, [p.productId]: e.target.value } })}
                          aria-label={`Units per case for ${p.title}`}
                          className="h-10 w-full !rounded-lg border border-slate-300 bg-white px-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                      )}
                    </div>
                  )}
                  <div className="px-4 py-2.5">
                    {blocked ? (
                      <span className="inline-flex rounded bg-amber-50 px-2 py-1 text-[12px] font-medium text-amber-800">{p.blockReason ?? 'Not set up for WFS'}</span>
                    ) : full ? (
                      <span className="text-[13px] text-slate-600">Fully booked</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={book[p.productId] ?? ''}
                          placeholder="0"
                          disabled={!!submitting}
                          onChange={(e) => patch({ book: { ...book, [p.productId]: e.target.value } })}
                          aria-label={`${wfs ? 'Cases' : 'Units'} for ${p.title}`}
                          aria-invalid={!!error}
                          className={cn(
                            'h-10 w-full !rounded-lg border bg-white px-3 text-[15px] font-medium focus:outline-none focus:ring-2',
                            error ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-slate-300'
                          )}
                        />
                        {error ? (
                          <span className="text-[11px] text-red-600">{error}</span>
                        ) : (
                          wfs && units > 0 && <span className="text-[11px] text-slate-600">{unitsLabel(units)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div></div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 !rounded-[10px] border border-slate-200 px-4 py-3.5">
              <span className="text-sm font-semibold">Save as draft</span>
              <span className="text-sm text-slate-700">
                Units move from the {def.program} pool to this shipment. Edit or cancel anytime, and cancelled units go back to the pool.
              </span>
            </div>
            <div className="flex flex-col gap-1.5 !rounded-[10px] border border-slate-300 bg-slate-50 px-4 py-3.5">
              <span className="text-sm font-semibold">Confirm with {def.partner}</span>
              <span className="text-sm text-slate-700">{def.copy.confirmCard}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        {submitError && (
          <div role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2.5 sm:px-8 text-sm text-red-700">
            {submitError}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-[18px] sm:px-8">
          <span className="text-sm text-slate-600">
            {booked.length} product{booked.length !== 1 && 's'} · {unitsLabel(totalUnits)}
          </span>
          <div className="flex flex-wrap gap-3">
            <DrawerButton onClick={onClose} disabled={!!submitting}>
              Cancel
            </DrawerButton>
            <DrawerButton onClick={() => submit('draft')} disabled={!canSubmit} isLoading={submitting === 'draft'}>
              Save draft
            </DrawerButton>
            <DrawerButton variant="primary" onClick={() => submit('confirm')} disabled={!canSubmit} isLoading={submitting === 'confirm'}>
              Confirm with {def.partner}
            </DrawerButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
