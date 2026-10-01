"use client"

import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from '@/hooks/useScrollLock'
import { DrawerButton } from '@/components/allocation-drawer/drawerUi'
import { cn } from '@/utils/cn'
import { InboundShipment, Marketplace, ReservedPoolItem } from './types'
import { CreateShipmentInput } from './useShipments'
import { MARKETPLACE_META, isOpen as isOpenShipment } from './workflow'
import { formatUnits, unitsLabel } from './ShipmentParts'
import { ShipFromChoice, ShipFromPicker, shipFromRequest } from './ShipFromPicker'

/**
 * New FBA shipment, per the "Shipment" canvas design: one row per SKU with its
 * FBA pool, what other open shipments hold, what's left, and how many to book
 * here. "Save draft" only holds the units; "Confirm with Amazon" also creates
 * the inbound plan.
 */

export type CreateMode = 'draft' | 'confirm'

interface CreateShipmentDrawerProps {
  isOpen: boolean
  onClose: () => void
  pool: ReservedPoolItem[]
  /** All shipments, to show which ones hold each SKU's units. */
  shipments: InboundShipment[]
  /** Unassigned reserved units per product. */
  unassigned: Record<string, number>
  /** Pre-selected products, e.g. from the Planner selection. */
  initialProductIds?: string[]
  onCreate: (input: CreateShipmentInput, mode: CreateMode) => Promise<InboundShipment>
}

interface FormState {
  marketplace: Marketplace
  /** Units to book per product id; strings keep the inputs editable. */
  book: Record<string, string>
  shipFrom: ShipFromChoice | null
  submitting: CreateMode | null
  /** Shown in the drawer itself: toasts sit underneath it. */
  error: string | null
  showAddressErrors: boolean
}

const defaultName = (marketplace: Marketplace) => {
  const d = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date())
  return `FBA ${MARKETPLACE_META[marketplace].label} · ${d}`
}

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

export const CreateShipmentDrawer: React.FC<CreateShipmentDrawerProps> = ({ isOpen, ...props }) =>
  isOpen ? <DrawerPanel {...props} /> : null

const DrawerPanel: React.FC<Omit<CreateShipmentDrawerProps, 'isOpen'>> = ({
  onClose,
  pool,
  shipments,
  unassigned,
  initialProductIds = [],
  onCreate,
}) => {
  useScrollLock()
  const [form, setForm] = useState<FormState>(() => ({
    marketplace: 'Amazon.com',
    book: Object.fromEntries(
      pool
        .filter((p) => initialProductIds.includes(p.productId) && (unassigned[p.productId] ?? 0) > 0)
        .map((p) => [p.productId, String(unassigned[p.productId])])
    ),
    shipFrom: null,
    submitting: null,
    error: null,
    showAddressErrors: false,
  }))
  const { marketplace, book, shipFrom, submitting, error: submitError, showAddressErrors } = form
  const patch = (next: Partial<FormState>) => setForm((prev) => ({ ...prev, ...next }))

  const rows = useMemo(
    () =>
      pool
        .filter((p) => p.reserved > 0)
        .map((p) => ({ product: p, available: unassigned[p.productId] ?? 0, held: heldBy(p.productId, shipments) })),
    [pool, unassigned, shipments]
  )

  const booked = rows
    .map((r) => ({ ...r, qty: Number(book[r.product.productId] || 0) }))
    .filter((r) => r.qty > 0)
  const errors = Object.fromEntries(
    rows
      .map((r) => {
        const raw = book[r.product.productId]
        const qty = Number(raw || 0)
        if (raw && (!Number.isInteger(qty) || qty < 0)) return [r.product.productId, 'Whole units only']
        if (qty > r.available) return [r.product.productId, `Only ${formatUnits(r.available)} available`]
        return null
      })
      .filter((e): e is [string, string] => e !== null)
  )
  const totalUnits = booked.reduce((s, r) => s + r.qty, 0)
  const canSubmit = booked.length > 0 && Object.keys(errors).length === 0 && !submitting

  const submit = async (mode: CreateMode) => {
    const address = shipFromRequest(shipFrom)
    if (!address) return patch({ showAddressErrors: true, error: 'Complete the ship-from address first.' })
    patch({ submitting: mode, error: null })
    try {
      await onCreate(
        {
          name: defaultName(marketplace),
          marketplace,
          ...address,
          items: booked.map(({ product: p, qty }) => ({
            productId: p.productId,
            sku: p.sku,
            fnsku: p.fnsku,
            asin: p.asin,
            title: p.title,
            imageUrl: p.imageUrl,
            quantity: qty,
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

  return createPortal(
    <div className="fixed inset-0 z-50 overscroll-none" role="dialog" aria-modal="true" aria-labelledby="create-shipment-title">
      {/* The dimmed area is deliberately inert: the drawer closes only from its own buttons */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="absolute inset-y-0 right-0 flex w-full max-w-[1120px] flex-col border-l border-slate-200 bg-white text-slate-900">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 pb-5 pt-6 sm:flex-row sm:gap-6 sm:px-8">
          <div className="flex flex-col gap-1">
            <h2 id="create-shipment-title" className="text-[22px] font-semibold">
              New FBA shipment
            </h2>
            <p className="text-sm text-slate-600">
              Book units from each SKU&apos;s FBA pool. A draft holds them. Confirming with Amazon locks them.
            </p>
          </div>
          <div className="flex w-full flex-col gap-1 sm:w-[220px]">
            <label htmlFor="shipment-destination" className="text-[13px] font-medium text-slate-700">
              Destination
            </label>
            <select
              id="shipment-destination"
              value={marketplace}
              onChange={(e) => patch({ marketplace: e.target.value as Marketplace })}
              className="h-10 !rounded-lg border border-slate-300 bg-white px-3 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              {(Object.keys(MARKETPLACE_META) as Marketplace[]).map((mp) => (
                <option key={mp} value={mp}>
                  {mp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-8">
          <ShipFromPicker
            value={shipFrom}
            onChange={(next) => patch({ shipFrom: next, error: null })}
            showErrors={showAddressErrors}
            disabled={!!submitting}
          />

          <div className="overflow-x-auto !rounded-xl border border-slate-200"><div className="min-w-[760px]">
            <div className="grid grid-cols-[260px_110px_minmax(0,1fr)_110px_150px] border-b border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700">
              <div className="px-4 py-3">Product</div>
              <div className="px-2 py-3 text-right">FBA pool</div>
              <div className="px-4 py-3">Held by other shipments</div>
              <div className="px-2 py-3 text-right">Available</div>
              <div className="px-4 py-3">Book in this one</div>
            </div>

            {rows.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-600">
                No FBA stock yet. Allocate units to FBA in the Planner first.
              </div>
            )}

            {rows.map(({ product: p, available, held }) => {
              const full = available === 0
              const error = errors[p.productId]
              return (
                <div
                  key={p.productId}
                  className={cn(
                    'grid min-h-[72px] grid-cols-[260px_110px_minmax(0,1fr)_110px_150px] items-center border-b border-slate-100 text-sm last:border-0',
                    full ? 'bg-slate-50' : 'bg-white'
                  )}
                >
                  <div className="flex min-w-0 flex-col gap-0.5 px-4 py-2.5">
                    <span className={cn('truncate font-medium', full ? 'text-slate-600' : 'text-slate-900')}>{p.title}</span>
                    <span className="truncate font-mono text-xs text-slate-600">{p.sku}</span>
                  </div>
                  <div className="px-2 py-2.5 text-right">{formatUnits(p.reserved)}</div>
                  <div className="px-4 py-2.5 text-[13px] text-slate-700">{held}</div>
                  <div className={cn('px-2 py-2.5 text-right font-semibold', full ? 'text-slate-600' : 'text-emerald-800')}>
                    {formatUnits(available)}
                  </div>
                  <div className="px-4 py-2.5">
                    {full ? (
                      <span className="text-[13px] text-slate-600">Fully booked</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <input
                          type="number"
                          min={0}
                          max={available}
                          step={1}
                          value={book[p.productId] ?? ''}
                          placeholder="0"
                          onChange={(e) => patch({ book: { ...book, [p.productId]: e.target.value } })}
                          aria-label={`Units for ${p.title}`}
                          aria-invalid={!!error}
                          className={cn(
                            'h-10 w-full !rounded-lg border bg-white px-3 text-[15px] font-medium focus:outline-none focus:ring-2',
                            error ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-slate-300'
                          )}
                        />
                        {error && <span className="text-[11px] text-red-600">{error}</span>}
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
                Units move from the FBA pool to this shipment. Edit or cancel anytime, and cancelled units go back to the pool.
              </span>
            </div>
            <div className="flex flex-col gap-1.5 !rounded-[10px] border border-slate-300 bg-slate-50 px-4 py-3.5">
              <span className="text-sm font-semibold">Confirm with Amazon</span>
              <span className="text-sm text-slate-700">
                Creates the inbound plan. Quantities lock and the allocation drawer can&apos;t take these units back. Stock
                leaves on-hand when marked shipped.
              </span>
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
              Confirm with Amazon
            </DrawerButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
