"use client"

import React, { useEffect, useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import { AmazonOption, InboundShipment, LabelType } from './types'
import { OptionKind } from './useShipments'
import { LabelButton, ProductThumb, formatUnits, formatWindow } from './ShipmentParts'
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
                          {formatCurrency(opt.fee, MARKETPLACE_META[shipment.marketplace].currency)}
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
  onConfirm: () => Promise<void>
  onClose: () => void
}

export const MarkShippedModal: React.FC<MarkShippedModalProps> = ({
  shipment,
  onDownloadLabel,
  downloadingLabels,
  onConfirm,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => setAcknowledged(false), [shipment?.id])

  if (!shipment) return null
  const units = getShipmentUnits(shipment)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm()
      onClose()
    } catch {
      // keep the dialog open; caller shows the error toast
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
        This deducts <strong>{formatUnits(units)} units</strong> across {shipment.items.length} SKU
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

      <label className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
        Boxes are labelled and the carrier has picked up the shipment
      </label>

      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!acknowledged || isSubmitting}>
          {isSubmitting ? 'Marking…' : `Mark shipped & deduct ${formatUnits(units)} units`}
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
  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm()
      onClose()
    } catch {
      // keep the dialog open; caller shows the error toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={isSubmitting ? () => {} : onClose} title={title} size="sm">
      <div className="text-sm text-text-muted">{message}</div>
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
