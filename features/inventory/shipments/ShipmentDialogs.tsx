"use client"

import React, { useEffect, useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import { AmazonOption, InboundShipment, LabelType, ShipLegRequirement, ShipTrackingInput } from './types'
import { OptionKind } from './useShipments'
import { LabelButton, ProductThumb, formatUnits, formatWindow, unitsLabel } from './ShipmentParts'
import { MARKETPLACE_META, getShipmentUnits, shipsAsFreight } from './workflow'

// ============================================
// OPTION PICKER (placement / delivery window / transport)
// ============================================

const OPTION_COPY: Record<OptionKind, { title: string; description: string; confirm: string }> = {
  placement: {
    title: 'Choose destination warehouse',
    description:
      'Amazon returned these placement options. Some split the shipment across several fulfillment centers, and each part gets its own FBA shipment ID.',
    confirm: 'Confirm warehouse',
  },
  window: {
    title: 'Choose delivery window',
    description: 'Pick the window when the shipment will arrive at the fulfillment center.',
    confirm: 'Confirm window',
  },
  transport: {
    title: 'Choose carrier',
    description: 'Book transportation for this shipment.',
    confirm: 'Confirm carrier',
  },
}

interface OptionPickerModalProps {
  kind: OptionKind | null
  shipment: InboundShipment | null
  loadOptions: (shipment: InboundShipment, kind: OptionKind) => Promise<AmazonOption[]>
  /** One option for placement; one per Amazon shipment for windows and carriers. */
  onConfirm: (options: AmazonOption[]) => Promise<void>
  onClose: () => void
}

/** Tags that are a caution rather than a perk. */
const WARNING_TAGS = new Set(['Congested'])

interface OptionGroup {
  key: string
  label?: string
  options: AmazonOption[]
}

/** Placement is one choice for the plan; windows and carriers are one choice per Amazon shipment. */
const groupOptions = (kind: OptionKind, options: AmazonOption[]): OptionGroup[] => {
  if (kind === 'placement') return options.length ? [{ key: 'plan', options }] : []
  const groups = new Map<string, OptionGroup>()
  for (const o of options) {
    const key = o.shipmentId ?? 'plan'
    if (!groups.has(key)) groups.set(key, { key, label: o.shipmentLabel, options: [] })
    groups.get(key)!.options.push(o)
  }
  return Array.from(groups.values())
}

type PickerState = {
  options: AmazonOption[] | null
  /** Chosen option id per group key. */
  selected: Record<string, string>
  isConfirming: boolean
  error: string | null
}

const EMPTY_PICKER: PickerState = { options: null, selected: {}, isConfirming: false, error: null }

export const OptionPickerModal: React.FC<OptionPickerModalProps> = ({
  kind,
  shipment,
  loadOptions,
  onConfirm,
  onClose,
}) => {
  const [state, setState] = useState<PickerState>(EMPTY_PICKER)
  const patch = (next: Partial<PickerState>) => setState((prev) => ({ ...prev, ...next }))

  useEffect(() => {
    if (!kind || !shipment) return
    let cancelled = false
    setState(EMPTY_PICKER)
    loadOptions(shipment, kind)
      .then((opts) => {
        if (cancelled) return
        const selected = Object.fromEntries(groupOptions(kind, opts).map((g) => [g.key, g.options[0].id]))
        patch({ options: opts, selected })
      })
      .catch((err: Error) => {
        if (!cancelled) patch({ options: [], error: err.message || 'Amazon did not return any options. Try again.' })
      })
    return () => {
      cancelled = true
    }
    // Only reload when the modal is opened for a different shipment/step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, shipment?.id])

  if (!kind || !shipment) return null
  const copy = OPTION_COPY[kind]
  const { options, selected, isConfirming, error } = state
  const groups = options ? groupOptions(kind, options) : []
  const chosen = groups
    .map((g) => g.options.find((o) => o.id === selected[g.key]))
    .filter((o): o is AmazonOption => !!o)
  // Partnered small parcel often has no window to book; the step is then just acknowledged
  const noWindowsOffered = kind === 'window' && options?.length === 0 && !error

  const handleConfirm = async () => {
    patch({ isConfirming: true, error: null })
    try {
      await onConfirm(chosen)
      onClose()
    } catch (err) {
      patch({ error: (err as Error).message || 'Amazon rejected this option. Pick another or try again.' })
    } finally {
      patch({ isConfirming: false })
    }
  }

  return (
    <Modal isOpen onClose={isConfirming ? () => {} : onClose} title={copy.title} size="lg">
      <p className="mb-4 text-sm text-text-muted">
        {copy.description}{' '}
        <span className="text-text-primary">
          {shipment.reference} · {formatUnits(getShipmentUnits(shipment))} units
        </span>
      </p>

      {!options && (
        <div className="flex items-center justify-center gap-3 py-10 text-sm text-text-muted">
          <Spinner size="sm" />
          Getting options from Amazon…
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </div>
      )}

      {noWindowsOffered && (
        <div className="rounded-md border border-border bg-surface-secondary px-3 py-2.5 text-sm text-text-secondary">
          Amazon has no delivery window to choose for these shipments, which is normal for partnered-carrier small
          parcel. Continue to pick a carrier.
        </div>
      )}

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.key}>
            {kind !== 'placement' && group.label && (
              <div className="mb-2 font-mono text-xs font-semibold text-text-secondary">{group.label}</div>
            )}
            <div role="radiogroup" className="space-y-2">
              {group.options.map((opt) => {
                const isSelected = selected[group.key] === opt.id
                return (
                  <label
                    key={opt.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                      isSelected ? 'border-secondary-800 bg-secondary-50' : 'border-border hover:bg-secondary-50'
                    )}
                  >
                    <input
                      type="radio"
                      name={`amazon-option-${group.key}`}
                      checked={isSelected}
                      onChange={() => patch({ selected: { ...selected, [group.key]: opt.id } })}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">
                          {opt.window ? formatWindow(opt.window) : opt.title}
                        </span>
                        {opt.tag && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px] font-medium',
                              WARNING_TAGS.has(opt.tag) ? 'bg-warning-50 text-warning-700' : 'bg-success-50 text-success-700'
                            )}
                          >
                            {opt.tag}
                          </span>
                        )}
                      </div>
                      {opt.description && <p className="mt-0.5 text-xs text-text-muted">{opt.description}</p>}
                      {opt.legs && opt.legs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {opt.legs.map((leg) => (
                            <span
                              key={leg.amazonShipmentId ?? leg.fulfillmentCenter}
                              className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-secondary"
                            >
                              <span className="font-mono font-semibold">{leg.fulfillmentCenter}</span>
                              {leg.fcLocation && <span className="text-text-muted"> · {leg.fcLocation}</span>}
                              <span className="text-text-muted"> · {formatUnits(leg.units)} units</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {opt.fee !== undefined && (
                      <div className="text-right">
                        <div className="text-sm font-semibold text-text-primary">
                          {formatCurrency(opt.fee, opt.currency ?? MARKETPLACE_META[shipment.marketplace].currency)}
                        </div>
                        <div className="text-[11px] text-text-muted">{kind === 'placement' ? 'placement fee' : 'est. cost'}</div>
                      </div>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onClose} disabled={isConfirming}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!options || (chosen.length === 0 && !noWindowsOffered) || isConfirming}
        >
          {isConfirming ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-white" /> Confirming…
            </span>
          ) : noWindowsOffered ? (
            'Continue'
          ) : (
            copy.confirm
          )}
        </Button>
      </div>
    </Modal>
  )
}

// ============================================
// MARK AS SHIPPED
// ============================================

interface MarkShippedModalProps {
  shipment: InboundShipment | null
  /** Last step of the guided flow, so the labels are printable from here. */
  onDownloadLabel: (type: LabelType) => void
  downloadingLabels: Partial<Record<LabelType, boolean>>
  /** Asks Amazon what it needs to mark this shipment as shipped (tracking for own-carrier legs). */
  loadRequirements: (id: string) => Promise<ShipLegRequirement[]>
  onConfirm: (tracking: ShipTrackingInput[]) => Promise<void>
  onClose: () => void
}

export const MarkShippedModal: React.FC<MarkShippedModalProps> = ({
  shipment,
  onDownloadLabel,
  downloadingLabels,
  loadRequirements,
  onConfirm,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** null while Amazon is being asked. */
  const [legs, setLegs] = useState<ShipLegRequirement[] | null>(null)
  /** Typed tracking: per box id for parcel legs, BOL / freight bills per leg for freight. */
  const [boxTracking, setBoxTracking] = useState<Record<string, string>>({})
  const [freight, setFreight] = useState<Record<string, { bol: string; bills: string }>>({})

  useEffect(() => {
    setAcknowledged(false)
    setError(null)
    setLegs(null)
    setBoxTracking({})
    setFreight({})
    if (!shipment) return
    let cancelled = false
    loadRequirements(shipment.id)
      .then((l) => !cancelled && setLegs(l))
      .catch((err: Error) => {
        if (cancelled) return
        setLegs([])
        setError(err.message || 'Could not check the shipment with Amazon.')
      })
    return () => {
      cancelled = true
    }
    // Ask again only when the dialog opens for a different shipment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipment?.id])

  if (!shipment) return null
  const units = getShipmentUnits(shipment)

  const ownLegs = (legs ?? []).filter((l) => l.solution === 'own')
  const trackingComplete = ownLegs.every((l) =>
    l.mode === 'freight'
      ? !!freight[l.shipmentId]?.bol.trim()
      : l.boxes.length > 0 && l.boxes.every((b) => !!boxTracking[b.boxId]?.trim())
  )

  const buildTracking = (): ShipTrackingInput[] =>
    ownLegs.map((l) =>
      l.mode === 'freight'
        ? {
            shipmentId: l.shipmentId,
            billOfLadingNumber: freight[l.shipmentId].bol.trim(),
            freightBillNumbers: freight[l.shipmentId].bills
              .split(',')
              .map((b) => b.trim())
              .filter(Boolean),
          }
        : { shipmentId: l.shipmentId, boxes: l.boxes.map((b) => ({ boxId: b.boxId, trackingId: boxTracking[b.boxId].trim() })) }
    )

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm(buildTracking())
      onClose()
    } catch (err) {
      // keep the dialog open; the caller's toast sits under it, so show the reason here too
      setError((err as Error).message || 'Could not mark as shipped.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={isSubmitting ? () => {} : onClose} title="Mark as shipped" size="md">
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-secondary px-3 py-2.5">
        <span className="mr-auto text-sm text-text-secondary">Labels are ready. Print and stick them on before pickup.</span>
        <LabelButton
          label="Box labels"
          status={shipment.labels?.box}
          isDownloading={!!downloadingLabels.box}
          onClick={() => onDownloadLabel('box')}
        />
        <LabelButton
          label="FNSKU unit labels"
          status={shipment.labels?.unit}
          isDownloading={!!downloadingLabels.unit}
          onClick={() => onDownloadLabel('unit')}
        />
        {shipsAsFreight(shipment) && (
          <LabelButton
            label="Pallet labels"
            isDownloading={!!downloadingLabels.pallet}
            onClick={() => onDownloadLabel('pallet')}
          />
        )}
      </div>

      <div className="mb-4 rounded-md border border-warning-200 bg-warning-50 px-3 py-2.5 text-sm text-warning-800">
        This deducts <strong>{unitsLabel(units)}</strong> across {shipment.items.length} SKU
        {shipment.items.length !== 1 && 's'} from on-hand inventory and locks the shipment. It can&apos;t be undone.
      </div>

      <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border">
        {shipment.items.map((item) => (
          <div key={item.productId} className="flex items-center gap-3 px-3 py-2">
            <ProductThumb src={item.imageUrl} alt={item.title} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-text-primary">{item.title}</div>
              <div className="font-mono text-xs text-text-muted">{item.sku}</div>
            </div>
            <div className="text-sm font-semibold text-danger-600">−{formatUnits(item.quantity)}</div>
          </div>
        ))}
      </div>

      {/* What Amazon is told */}
      <div className="mt-4 rounded-md border border-border p-3">
        <div className="mb-2 text-sm font-semibold text-text-primary">Confirm with Amazon</div>
        {!legs && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Spinner size="sm" /> Checking the shipment with Amazon…
          </div>
        )}
        {legs && legs.length > 0 && (
          <div className="space-y-3">
            {legs.map((leg) => (
              <div key={leg.shipmentId}>
                <div className="font-mono text-xs font-semibold text-text-secondary">{leg.label}</div>
                {leg.solution === 'partnered' ? (
                  <p className="mt-0.5 text-xs text-text-muted">
                    {leg.carrier ?? 'Amazon partnered carrier'}: Amazon books the pickup and is told by the carrier. Nothing to enter.
                  </p>
                ) : leg.mode === 'freight' ? (
                  <div className="mt-1 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input
                      placeholder="Bill of lading number"
                      value={freight[leg.shipmentId]?.bol ?? ''}
                      onChange={(e) => setFreight((f) => ({ ...f, [leg.shipmentId]: { bills: f[leg.shipmentId]?.bills ?? '', bol: e.target.value } }))}
                      className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
                    />
                    <input
                      placeholder="Freight bill numbers (optional, comma separated)"
                      value={freight[leg.shipmentId]?.bills ?? ''}
                      onChange={(e) => setFreight((f) => ({ ...f, [leg.shipmentId]: { bol: f[leg.shipmentId]?.bol ?? '', bills: e.target.value } }))}
                      className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
                    />
                  </div>
                ) : leg.boxes.length === 0 ? (
                  <p className="mt-0.5 text-xs text-danger-700">Amazon has no boxes for this shipment yet, so tracking can&apos;t be attached.</p>
                ) : (
                  <div className="mt-1 space-y-1.5">
                    <p className="text-xs text-text-muted">Your own carrier: enter the tracking number of each box.</p>
                    {leg.boxes.map((b) => (
                      <div key={b.boxId} className="flex items-center gap-2">
                        <span className="w-14 text-xs text-text-muted">{b.label}</span>
                        <input
                          placeholder="Tracking number"
                          value={boxTracking[b.boxId] ?? ''}
                          onChange={(e) => setBoxTracking((t) => ({ ...t, [b.boxId]: e.target.value }))}
                          className="h-9 flex-1 rounded-md border border-border bg-surface px-3 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
        Boxes are labelled and the carrier has picked up the shipment
      </label>

      {error && (
        <div role="alert" className="mt-4 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!acknowledged || isSubmitting || !legs || legs.length === 0 || !trackingComplete}>
          {isSubmitting ? 'Confirming with Amazon…' : `Confirm with Amazon & deduct ${unitsLabel(units)}`}
        </Button>
      </div>
    </Modal>
  )
}

// ============================================
// GENERIC CONFIRM (cancel shipment, discard, etc.)
// ============================================

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: React.ReactNode
  confirmLabel: string
  variant?: 'primary' | 'danger'
  onConfirm: () => Promise<void>
  onClose: () => void
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  variant = 'primary',
  onConfirm,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      // keep the dialog open; the caller's toast sits under it, so show the reason here too
      setError((err as Error).message || 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={isSubmitting ? () => {} : onClose} title={title} size="sm">
      <div className="text-sm text-text-muted">{message}</div>
      {error && (
        <div role="alert" className="mt-4 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Keep
        </Button>
        <Button variant={variant} onClick={handleConfirm} disabled={isSubmitting}>
          {isSubmitting ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
