"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TableCell, TableRow } from '@/design-system/tables'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import { formatAddressLine } from './AddressForm'
import { ShipFromChoice, ShipFromPicker, shipFromRequest } from './ShipFromPicker'
import { LabelDownloadControl } from './labelFormats'
import type { ShipFromRequest } from './useShipments'
import {
  InboundShipment,
  InboundShipmentItem,
  LabelType,
  ReservedPoolItem,
} from './types'
import {
  MARKETPLACE_META,
  NEXT_ACTION,
  NextAction,
  canEditItems,
  cancelledAtLabel,
  getReceivedUnits,
  getShipmentUnits,
  legReference,
  shipsAsFreight,
} from './workflow'
import {
  ChevronIcon,
  FloatingMenu,
  ProductThumb,
  StageProgress,
  StatusBadge,
  WorkflowStepper,
  formatRelative,
  formatShortDate,
  formatUnits,
  formatWindow,
} from './ShipmentParts'

export const SHIPMENT_TABLE_COLUMNS = 11

interface ShipmentRowProps {
  shipment: InboundShipment
  isExpanded: boolean
  onToggle: () => void
  /** FBA pool (shared by every marketplace). */
  pool: ReservedPoolItem[]
  /** Unassigned reserved units per product, NOT counting this shipment's own qty. */
  availableElsewhere: Record<string, number>
  onSaveItems: (items: InboundShipmentItem[]) => Promise<void>
  /** Drafts only: pick another ship-from address. */
  onChangeShipFrom: (choice: ShipFromRequest) => Promise<unknown>
  onAction: (action: NextAction) => Promise<void> | void
  onCancel: () => void
  onDownloadLabel: (type: LabelType) => void
  /** Label downloads running for this shipment. */
  downloadingLabels: Partial<Record<LabelType, boolean>>
}

const LABELS: { type: LabelType; label: string }[] = [
  { type: 'box', label: 'Box labels' },
  { type: 'pallet', label: 'Pallet labels' },
  { type: 'unit', label: 'FNSKU unit labels' },
]

const sameItems = (a: InboundShipmentItem[], b: InboundShipmentItem[]) =>
  a.length === b.length &&
  a.every((x) => b.some((y) => y.productId === x.productId && y.quantity === x.quantity))

export const ShipmentRow: React.FC<ShipmentRowProps> = ({
  shipment,
  isExpanded,
  onToggle,
  pool,
  availableElsewhere,
  onSaveItems,
  onChangeShipFrom,
  onAction,
  onCancel,
  onDownloadLabel,
  downloadingLabels,
}) => {
  const editable = canEditItems(shipment)
  const [draft, setDraft] = useState<InboundShipmentItem[]>(shipment.items)
  const [isSaving, setIsSaving] = useState(false)
  const [isActing, setIsActing] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  // Ship-from is editable only until the plan is sent to Amazon
  const canChangeFrom = shipment.status === 'in_progress' && shipment.stage === 'draft'
  const [fromChoice, setFromChoice] = useState<ShipFromChoice | null>(null)
  const [isEditingFrom, setIsEditingFrom] = useState(false)
  const [isSavingFrom, setIsSavingFrom] = useState(false)
  const [fromError, setFromError] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLButtonElement>(null)
  const addRef = useRef<HTMLDivElement>(null)
  const closeMenu = useCallback(() => setIsMenuOpen(false), [])
  const closeAdd = useCallback(() => setIsAddOpen(false), [])

  // Re-seed the draft when the server copy changes (save, sync, step advance).
  useEffect(() => setDraft(shipment.items), [shipment.items])

  const isDirty = !sameItems(draft, shipment.items)
  const units = getShipmentUnits(shipment)
  const draftUnits = draft.reduce((s, i) => s + (i.quantity || 0), 0)
  const received = getReceivedUnits(shipment)
  const showReceived = shipment.status === 'receiving' || shipment.status === 'closed'
  // Our server keeps label copies only until the shipment is shipped or cancelled
  const labelsAvailable = shipment.stage === 'labels_ready' && shipment.status === 'in_progress'
  const next = shipment.status === 'in_progress' ? NEXT_ACTION[shipment.stage] : null
  const labels = LABELS.filter((l) => l.type !== 'pallet' || shipsAsFreight(shipment))
  const legRefs = shipment.legs.map(legReference).filter(Boolean)

  const maxFor = (productId: string) => availableElsewhere[productId] ?? 0

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    for (const item of draft) {
      const max = maxFor(item.productId)
      if (!Number.isInteger(item.quantity) || item.quantity < 1) e[item.productId] = 'Min 1, or remove the line'
      else if (item.quantity > max) e[item.productId] = `Only ${formatUnits(max)} reserved units available`
    }
    return e
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, availableElsewhere])

  const hasErrors = Object.keys(errors).length > 0 || draft.length === 0

  const addable = pool.filter(
    (p) => !draft.some((i) => i.productId === p.productId) && maxFor(p.productId) > 0
  )

  const setQty = (productId: string, quantity: number) =>
    setDraft((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)))

  const removeLine = (productId: string) =>
    setDraft((prev) => prev.filter((i) => i.productId !== productId))

  const addLine = (p: ReservedPoolItem) => {
    setDraft((prev) => [
      ...prev,
      {
        productId: p.productId,
        sku: p.sku,
        fnsku: p.fnsku,
        asin: p.asin,
        title: p.title,
        imageUrl: p.imageUrl,
        quantity: maxFor(p.productId),
      },
    ])
    setIsAddOpen(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSaveItems(draft)
    } catch {
      // toast shown by caller; keep the draft so the user can retry
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveFrom = async () => {
    const request = shipFromRequest(fromChoice)
    if (!request || (!request.shipFromAddressId && !request.shipFromAddress)) {
      return setFromError(request ? 'Pick a saved address or enter one.' : 'Complete the address first.')
    }
    setIsSavingFrom(true)
    setFromError(null)
    try {
      await onChangeShipFrom(request)
      setIsEditingFrom(false)
      setFromChoice(null)
    } catch (err) {
      // the toast is behind nothing here, but keep the reason next to the field too
      setFromError((err as Error).message || 'Could not change the ship-from address')
    } finally {
      setIsSavingFrom(false)
    }
  }

  const handleAction = async () => {
    if (!next) return
    setIsActing(true)
    try {
      await onAction(next.action)
    } catch {
      // toast shown by caller
    } finally {
      setIsActing(false)
    }
  }

  const market = MARKETPLACE_META[shipment.marketplace]
  const primaryLeg = shipment.legs[0]

  return (
    <>
      {/* ---------- Parent row ---------- */}
      <TableRow
        onClick={onToggle}
        className={cn('cursor-pointer transition-colors hover:bg-secondary-50', isExpanded && 'bg-secondary-50')}
      >
        <TableCell className="w-10 pr-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${shipment.reference}`}
            className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-secondary-100 hover:text-text-primary"
          >
            <ChevronIcon open={isExpanded} />
          </button>
        </TableCell>

        <TableCell className="min-w-[220px]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-text-primary">{shipment.reference}</span>
            {isDirty && (
              <span className="rounded bg-warning-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-warning-800">
                Unsaved
              </span>
            )}
          </div>
          <div className="max-w-[260px] truncate text-xs text-text-muted">{shipment.name}</div>
          {legRefs.length > 0 && (
            <div className="mt-0.5 font-mono text-[11px] text-text-subtle">{legRefs.join(', ')}</div>
          )}
        </TableCell>

        <TableCell className="whitespace-nowrap text-sm">
          <span className="mr-1">{market.flag}</span>
          {market.label}
        </TableCell>

        <TableCell className="whitespace-nowrap">
          {primaryLeg ? (
            <span className="font-mono text-sm">
              {primaryLeg.fulfillmentCenter}
              {shipment.legs.length > 1 && (
                <span className="ml-1 font-sans text-xs text-text-muted">+{shipment.legs.length - 1}</span>
              )}
            </span>
          ) : (
            <span className="text-sm text-text-subtle">Not assigned</span>
          )}
        </TableCell>

        <TableCell className="text-right text-sm">{shipment.items.length}</TableCell>

        <TableCell className="text-right">
          <div className="text-sm font-semibold text-text-primary">{formatUnits(units)}</div>
          {showReceived && (
            <div className="text-[11px] text-text-muted">{formatUnits(received)} received</div>
          )}
        </TableCell>

        <TableCell className="min-w-[180px]">
          <StageProgress shipment={shipment} />
          <div className="mt-1 text-xs text-text-muted">
            {shipment.status === 'cancelled'
              ? `Cancelled at ${cancelledAtLabel(shipment)?.toLowerCase() ?? 'draft'}`
              : next
              ? `Next: ${next.label}`
              : shipment.status === 'closed'
              ? 'Complete'
              : 'With Amazon'}
          </div>
        </TableCell>

        <TableCell className="whitespace-nowrap text-sm">{formatWindow(shipment.deliveryWindow)}</TableCell>

        <TableCell>
          <StatusBadge status={shipment.status} />
        </TableCell>

        <TableCell className="whitespace-nowrap text-xs text-text-muted" title={shipment.updatedAt}>
          {formatRelative(shipment.updatedAt)}
        </TableCell>

        <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
          <button
            ref={menuRef}
            type="button"
            onClick={() => setIsMenuOpen((o) => !o)}
            aria-label="Shipment actions"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            className="flex h-8 w-8 items-center justify-center rounded text-text-muted hover:bg-secondary-100 hover:text-text-primary"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          <FloatingMenu anchorRef={menuRef} open={isMenuOpen} onClose={closeMenu}>
                <MenuItem onClick={() => { setIsMenuOpen(false); if (!isExpanded) onToggle() }}>
                  {editable ? 'Edit quantities' : 'View details'}
                </MenuItem>
                {labels.map((l) => (
                  <MenuItem
                    key={l.type}
                    disabled={!labelsAvailable || !!downloadingLabels[l.type]}
                    onClick={() => { setIsMenuOpen(false); onDownloadLabel(l.type) }}
                  >
                    {downloadingLabels[l.type] ? `Downloading ${l.label.toLowerCase()}…` : `Download ${l.label.toLowerCase()}`}
                  </MenuItem>
                ))}
                <div className="my-1 border-t border-border" />
                <MenuItem
                  danger
                  disabled={shipment.status !== 'in_progress'}
                  onClick={() => { setIsMenuOpen(false); onCancel() }}
                >
                  Cancel shipment
                </MenuItem>
          </FloatingMenu>
        </TableCell>
      </TableRow>

      {/* ---------- Expanded child panel ---------- */}
      {isExpanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={SHIPMENT_TABLE_COLUMNS} className="bg-background p-0">
            <div className="space-y-4 border-l-2 border-secondary-800 px-6 py-5">
              <WorkflowStepper shipment={shipment} />

              {/* Amazon details */}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border bg-surface p-4 text-sm md:grid-cols-3 xl:grid-cols-6">
                <Detail label="Internal ID" value={<span className="font-mono">{shipment.reference}</span>} />
                <Detail
                  label="Inbound plan"
                  value={
                    shipment.amazonInboundPlanId ? (
                      <span className="font-mono text-xs">{shipment.amazonInboundPlanId}</span>
                    ) : (
                      <span className="text-text-subtle">
                        {shipment.status === 'cancelled' ? 'Never sent to Amazon' : 'Not sent to Amazon'}
                      </span>
                    )
                  }
                />
                <Detail
                  label={shipment.legs.length > 1 ? `Destinations (${shipment.legs.length})` : 'Destination'}
                  value={
                    shipment.legs.length ? (
                      <div className="space-y-0.5">
                        {shipment.legs.map((l) => (
                          <div key={l.amazonShipmentId ?? l.fulfillmentCenter}>
                            <span className="font-mono font-semibold">{l.fulfillmentCenter}</span>
                            <span className="text-xs text-text-muted">
                              {' '}· {formatUnits(l.units)} u{l.boxes ? ` · ${formatUnits(l.boxes)} box${l.boxes === 1 ? '' : 'es'}` : ''}
                            </span>
                            {legReference(l) && (
                              <div className="font-mono text-[11px] text-text-muted">{legReference(l)}</div>
                            )}
                            {shipment.legs.length > 1 && (l.carrier || l.deliveryWindow) && (
                              <div className="text-[11px] text-text-muted">
                                {[l.carrier, l.deliveryWindow && formatWindow(l.deliveryWindow)].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-text-subtle">—</span>
                    )
                  }
                />
                <Detail label="Delivery window" value={formatWindow(shipment.deliveryWindow)} />
                <Detail label="Carrier" value={shipment.carrier ?? '—'} />
                <Detail
                  label={shipment.shippedAt ? 'Shipped' : 'Created'}
                  value={formatShortDate(shipment.shippedAt ?? shipment.createdAt)}
                />
              </dl>

              {/* Ship-from and Amazon's fee estimates */}
              {(shipment.shipFrom || shipment.fees || canChangeFrom) && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(shipment.shipFrom || canChangeFrom) && (
                    <div className="rounded-lg border border-border bg-surface p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">Ship from</span>
                        {canChangeFrom && !isEditingFrom && (
                          <Button variant="ghost" size="sm" onClick={() => setIsEditingFrom(true)}>
                            Change
                          </Button>
                        )}
                      </div>
                      {isEditingFrom ? (
                        <div className="mt-2 space-y-3">
                          <ShipFromPicker label={null} value={fromChoice} onChange={(c) => { setFromChoice(c); setFromError(null) }} showErrors={!!fromError} disabled={isSavingFrom} />
                          {fromError && <p role="alert" className="text-xs text-danger-700">{fromError}</p>}
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setIsEditingFrom(false); setFromChoice(null); setFromError(null) }} disabled={isSavingFrom}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveFrom} disabled={isSavingFrom || !fromChoice}>
                              {isSavingFrom ? 'Saving…' : 'Use this address'}
                            </Button>
                          </div>
                        </div>
                      ) : shipment.shipFrom ? (
                        <>
                          <div className="mt-1 font-medium text-text-primary">
                            {shipment.shipFrom.companyName ?? shipment.shipFrom.name}
                          </div>
                          <div className="text-text-secondary">{formatAddressLine(shipment.shipFrom)}</div>
                          <div className="text-xs text-text-muted">
                            {shipment.shipFrom.name} · {shipment.shipFrom.phoneNumber}
                          </div>
                        </>
                      ) : (
                        <div className="mt-1 text-text-muted">Not chosen yet. Your default address is used when this is sent to Amazon.</div>
                      )}
                    </div>
                  )}
                  {shipment.fees && (
                    <div className="rounded-lg border border-border bg-surface p-4 text-sm">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">Amazon fees (estimate)</span>
                        <span className="font-semibold text-text-primary">
                          {shipment.fees.totals.map((t) => formatCurrency(t.amount, t.currency)).join(' + ')}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-0.5">
                        {shipment.fees.lines.map((f, i) => (
                          <li key={`${f.kind}-${i}`} className="flex justify-between gap-3 text-text-secondary">
                            <span className="truncate">{f.label}</span>
                            <span className="whitespace-nowrap">{formatCurrency(f.amount, f.currency)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[11px] text-text-muted">Quoted when each option was confirmed. Amazon&apos;s final charge can differ.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">Products in this shipment</h4>
                    <p className="text-xs text-text-muted">
                      {editable
                        ? shipment.stage === 'plan_created'
                          ? 'Saving changes cancels the Amazon plan; send it to Amazon again afterwards.'
                          : 'Quantities come from your FBA reserved pool.'
                        : shipment.status === 'in_progress'
                        ? 'Quantities are locked once box contents are sent. Cancel and re-plan to change them.'
                        : 'Read-only.'}
                    </p>
                  </div>
                  {editable && (
                    <div ref={addRef}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddOpen((o) => !o)}
                        disabled={addable.length === 0}
                        title={addable.length === 0 ? 'No other products have unassigned reserved units' : undefined}
                      >
                        + Add product
                      </Button>
                      <FloatingMenu
                        anchorRef={addRef}
                        open={isAddOpen}
                        onClose={closeAdd}
                        width={320}
                        className="max-h-72 overflow-y-auto"
                      >
                          {addable.map((p) => (
                            <button
                              key={p.productId}
                              type="button"
                              onClick={() => addLine(p)}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary-50"
                            >
                              <ProductThumb src={p.imageUrl} alt={p.title} size="sm" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm text-text-primary">{p.title}</div>
                                <div className="font-mono text-xs text-text-muted">{p.sku}</div>
                              </div>
                              <span className="whitespace-nowrap text-xs text-text-muted">
                                {formatUnits(maxFor(p.productId))} avail.
                              </span>
                            </button>
                          ))}
                      </FloatingMenu>
                    </div>
                  )}
                </div>

                <div className="ds-scroll-x">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                      <th className="px-4 py-2.5">Product</th>
                      <th className="px-4 py-2.5">FNSKU</th>
                      {editable && <th className="px-4 py-2.5 text-right">Reserved available</th>}
                      <th className="px-4 py-2.5 text-right">{editable ? 'Qty in shipment' : 'Shipped qty'}</th>
                      {showReceived && <th className="px-4 py-2.5 text-right">Received</th>}
                      {editable && <th className="w-10 px-2 py-2.5" />}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.map((item) => {
                      const original = shipment.items.find((i) => i.productId === item.productId)
                      const changed = !original || original.quantity !== item.quantity
                      const error = errors[item.productId]
                      const max = maxFor(item.productId)
                      const short =
                        showReceived && (item.quantityReceived ?? 0) < item.quantity
                      return (
                        <tr key={item.productId} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <ProductThumb src={item.imageUrl} alt={item.title} size="sm" />
                              <div className="min-w-0">
                                <div className="max-w-md truncate text-text-primary">{item.title}</div>
                                <div className="text-xs text-text-muted">
                                  <span className="font-mono">{item.sku}</span> · {item.asin}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-text-muted">{item.fnsku ?? '—'}</td>
                          {editable && (
                            <td className="px-4 py-2.5 text-right text-text-muted">
                              {formatUnits(max)}
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-right">
                            {editable ? (
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setQty(item.productId, max)}
                                    disabled={item.quantity === max}
                                    className="rounded px-1.5 py-0.5 text-[11px] font-medium text-text-muted hover:bg-secondary-100 hover:text-text-primary disabled:invisible"
                                  >
                                    Max
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    max={max}
                                    step={1}
                                    value={Number.isNaN(item.quantity) ? '' : item.quantity}
                                    onChange={(e) => setQty(item.productId, e.target.valueAsNumber)}
                                    aria-label={`Quantity for ${item.sku}`}
                                    aria-invalid={!!error}
                                    className={cn(
                                      'w-24 rounded-md border px-2 py-1 text-right text-sm font-semibold focus:outline-none focus:ring-2',
                                      error
                                        ? 'border-danger-400 focus:ring-danger-200'
                                        : changed
                                        ? 'border-warning-400 bg-warning-50 focus:ring-warning-200'
                                        : 'border-border focus:ring-secondary-200'
                                    )}
                                  />
                                </div>
                                {error && <span className="mt-1 text-[11px] text-danger-600">{error}</span>}
                                {!error && original && changed && (
                                  <span className="mt-1 text-[11px] text-warning-700">was {formatUnits(original.quantity)}</span>
                                )}
                              </div>
                            ) : (
                              <span className="font-semibold">{formatUnits(item.quantity)}</span>
                            )}
                          </td>
                          {showReceived && (
                            <td className="px-4 py-2.5 text-right">
                              <span className={cn('font-semibold', short ? 'text-warning-700' : 'text-success-700')}>
                                {formatUnits(item.quantityReceived ?? 0)}
                              </span>
                              {short && shipment.status === 'closed' && (
                                <div className="text-[11px] text-warning-700">
                                  {formatUnits(item.quantity - (item.quantityReceived ?? 0))} short, open a case
                                </div>
                              )}
                            </td>
                          )}
                          {editable && (
                            <td className="px-2 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => removeLine(item.productId)}
                                aria-label={`Remove ${item.sku}`}
                                className="flex h-7 w-7 items-center justify-center rounded text-text-subtle hover:bg-danger-50 hover:text-danger-600"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                    {draft.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-text-muted">
                          No products. Add at least one, or cancel the shipment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-secondary-50 text-sm">
                      <td className="px-4 py-2.5 font-semibold" colSpan={editable ? 3 : 2}>
                        Total · {draft.length} SKU{draft.length !== 1 && 's'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        {formatUnits(draftUnits)}
                        {isDirty && draftUnits !== units && (
                          <span className="ml-1 text-xs font-normal text-warning-700">
                            ({draftUnits > units ? '+' : '−'}
                            {formatUnits(Math.abs(draftUnits - units))})
                          </span>
                        )}
                      </td>
                      {showReceived && (
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {formatUnits(received)}
                          <span className="ml-1 text-xs font-normal text-text-muted">
                            ({units ? Math.round((received / units) * 100) : 0}%)
                          </span>
                        </td>
                      )}
                      {editable && <td />}
                    </tr>
                  </tfoot>
                </table>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {labelsAvailable &&
                    labels.map((l) => (
                      <LabelDownloadControl
                        key={l.type}
                        type={l.type}
                        label={l.label}
                        status={l.type === 'pallet' ? undefined : shipment.labels?.[l.type]}
                        isDownloading={!!downloadingLabels[l.type]}
                        onClick={() => onDownloadLabel(l.type)}
                      />
                    ))}
                  {!labelsAvailable && next && (
                    <span className="text-xs text-text-muted">{next.hint}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isDirty ? (
                    <>
                      <span className="text-xs text-warning-700">Unsaved changes</span>
                      <Button variant="outline" size="sm" onClick={() => setDraft(shipment.items)} disabled={isSaving}>
                        Discard
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={hasErrors || isSaving}>
                        {isSaving ? (
                          <span className="flex items-center gap-2"><Spinner size="sm" className="text-white" /> Saving…</span>
                        ) : (
                          'Save quantities'
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      {shipment.status === 'in_progress' && (
                        <Button variant="ghost" size="sm" onClick={onCancel}>
                          Cancel shipment
                        </Button>
                      )}
                      {next && (
                        <Button size="sm" onClick={handleAction} disabled={isActing || draft.length === 0}>
                          {isActing ? (
                            <span className="flex items-center gap-2"><Spinner size="sm" className="text-white" /> Working…</span>
                          ) : (
                            `${next.label} →`
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{label}</dt>
    <dd className="mt-0.5 text-text-primary">{value}</dd>
  </div>
)

const MenuItem: React.FC<{
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}> = ({ onClick, disabled, danger, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'w-full px-3 py-2 text-left text-sm hover:bg-secondary-50 disabled:cursor-not-allowed disabled:opacity-40',
      danger ? 'text-danger-600' : 'text-text-primary'
    )}
  >
    {children}
  </button>
)
