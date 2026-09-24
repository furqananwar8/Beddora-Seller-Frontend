"use client"

import React, { useEffect, useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import { AmazonOption, InboundShipment } from './types'
import { OptionKind } from './useShipments'
import { ProductThumb, formatUnits, formatWindow } from './ShipmentParts'
import { MARKETPLACE_META, getShipmentUnits } from './workflow'

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
  onConfirm: (option: AmazonOption) => Promise<void>
  onClose: () => void
}

export const OptionPickerModal: React.FC<OptionPickerModalProps> = ({
  kind,
  shipment,
  loadOptions,
  onConfirm,
  onClose,
}) => {
  const [options, setOptions] = useState<AmazonOption[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!kind || !shipment) return
    let cancelled = false
    setOptions(null)
    setSelectedId(null)
    setError(null)
    loadOptions(shipment, kind)
      .then((opts) => {
        if (cancelled) return
        setOptions(opts)
        setSelectedId(opts[0]?.id ?? null)
      })
      .catch(() => !cancelled && setError('Amazon did not return any options. Try again.'))
    return () => {
      cancelled = true
    }
    // Only reload when the modal is opened for a different shipment/step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, shipment?.id])

  if (!kind || !shipment) return null
  const copy = OPTION_COPY[kind]

  const handleConfirm = async () => {
    const option = options?.find((o) => o.id === selectedId)
    if (!option) return
    setIsConfirming(true)
    try {
      await onConfirm(option)
      onClose()
    } catch {
      setError('Amazon rejected this option. Pick another or try again.')
    } finally {
      setIsConfirming(false)
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

      {!options && !error && (
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

      {options && (
        <div role="radiogroup" className="space-y-2">
          {options.map((opt) => {
            const selected = opt.id === selectedId
            return (
              <label
                key={opt.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                  selected ? 'border-secondary-800 bg-secondary-50' : 'border-border hover:bg-secondary-50'
                )}
              >
                <input
                  type="radio"
                  name="amazon-option"
                  checked={selected}
                  onChange={() => setSelectedId(opt.id)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {opt.window ? formatWindow(opt.window) : opt.title}
                    </span>
                    {opt.tag && (
                      <span className="rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-medium text-success-700">
                        {opt.tag}
                      </span>
                    )}
                  </div>
                  {opt.description && <p className="mt-0.5 text-xs text-text-muted">{opt.description}</p>}
                  {opt.legs && opt.legs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {opt.legs.map((leg) => (
                        <span
                          key={leg.fulfillmentCenter}
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
                    <div className="text-sm font-semibold text-text-primary">{formatCurrency(opt.fee, MARKETPLACE_META[shipment.marketplace].currency)}</div>
                    <div className="text-[11px] text-text-muted">{kind === 'placement' ? 'placement fee' : 'est. cost'}</div>
                  </div>
                )}
              </label>
            )
          })}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onClose} disabled={isConfirming}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!selectedId || isConfirming}>
          {isConfirming ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-white" /> Confirming…
            </span>
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
  onConfirm: () => Promise<void>
  onClose: () => void
}

export const MarkShippedModal: React.FC<MarkShippedModalProps> = ({ shipment, onConfirm, onClose }) => {
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
