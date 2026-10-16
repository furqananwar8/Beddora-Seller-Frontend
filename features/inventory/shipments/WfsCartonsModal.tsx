"use client"

import React, { useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { cn } from '@/utils/cn'
import { InboundShipment, ShipmentLeg, WfsCartons, legId } from './types'
import { DialogFooter, formatUnits } from './ShipmentParts'

/**
 * WFS cartons: for each Walmart shipment, how many carton labels it needs by
 * load type. Walmart has no box-contents step; the counts go into the carton
 * labels, and sizes are only needed to quote Walmart's own carrier.
 */

interface WfsCartonsModalProps {
  shipment: InboundShipment | null
  /** Walmart's carrier can be quoted in this marketplace, so carton sizes are worth asking for. */
  askSizes: boolean
  onSubmit: (legs: WfsCartons[]) => Promise<void>
  onClose: () => void
}

interface PackageRow {
  count: string
  length: string
  width: string
  height: string
  weight: string
}

interface LegForm {
  singleSku: string
  mixedSku: string
  pallet: string
  withSizes: boolean
  packages: PackageRow[]
}

const toNumber = (v: string) => (v.trim() === '' ? 0 : Number(v))
const isCount = (v: string) => v.trim() === '' || (Number.isInteger(Number(v)) && Number(v) >= 0)
const isMeasure = (v: string) => Number(v) > 0

export const WfsCartonsModal: React.FC<WfsCartonsModalProps> = ({ shipment, ...rest }) => (
  <Modal isOpen={shipment !== null} onClose={rest.onClose} title="Cartons" size="lg">
    {shipment && <CartonsForm key={shipment.id} shipment={shipment} {...rest} />}
  </Modal>
)

/** Starting values: what was saved before, else one single-SKU carton per case, sized like the first SKU's case pack. */
function initialForm(shipment: InboundShipment, leg: ShipmentLeg): LegForm {
  const cases = (leg.items ?? []).reduce((sum, line) => {
    const perCase = shipment.items.find((i) => i.sku === line.sku)?.unitsPerCase
    return sum + (perCase ? Math.ceil(line.quantity / perCase) : 0)
  }, 0)
  const count = String(leg.boxes ?? cases ?? '')
  return {
    singleSku: count,
    mixedSku: '0',
    pallet: '0',
    withSizes: false,
    packages: [{ count, length: '', width: '', height: '', weight: '' }],
  }
}

const CartonsForm: React.FC<Omit<WfsCartonsModalProps, 'shipment'> & { shipment: InboundShipment }> = ({ shipment, askSizes, onSubmit, onClose }) => {
  const legs = shipment.legs
  const [forms, setForms] = useState<Record<string, LegForm>>(() => Object.fromEntries(legs.map((l) => [legId(l), initialForm(shipment, l)])))
  const [touched, setTouched] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch = (id: string, next: Partial<LegForm>) => setForms((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }))
  const patchPackage = (id: string, index: number, next: Partial<PackageRow>) =>
    setForms((prev) => ({
      ...prev,
      [id]: { ...prev[id], packages: prev[id].packages.map((p, i) => (i === index ? { ...p, ...next } : p)) },
    }))

  const errorFor = (f: LegForm): string | undefined => {
    if (![f.singleSku, f.mixedSku, f.pallet].every(isCount)) return 'Use whole numbers'
    const cartons = toNumber(f.singleSku) + toNumber(f.mixedSku)
    if (cartons + toNumber(f.pallet) === 0) return 'Enter at least one carton or pallet'
    if (!f.withSizes) return undefined
    if (!f.packages.every((p) => Number.isInteger(Number(p.count)) && Number(p.count) > 0 && isMeasure(p.length) && isMeasure(p.width) && isMeasure(p.height) && isMeasure(p.weight))) {
      return 'Fill in the count, size and weight of every carton size'
    }
    const sized = f.packages.reduce((s, p) => s + Number(p.count), 0)
    if (sized !== cartons) return `The sizes cover ${formatUnits(sized)} cartons but ${formatUnits(cartons)} are entered`
    return undefined
  }
  const invalid = legs.some((l) => !!errorFor(forms[legId(l)]))

  const handleSubmit = async () => {
    setTouched(true)
    if (invalid) return
    setIsSaving(true)
    setError(null)
    try {
      await onSubmit(
        legs.map((l) => {
          const f = forms[legId(l)]
          return {
            shipmentId: legId(l),
            singleSku: toNumber(f.singleSku),
            mixedSku: toNumber(f.mixedSku),
            pallet: toNumber(f.pallet),
            ...(f.withSizes
              ? {
                  packages: f.packages.map((p) => ({
                    count: Number(p.count),
                    length: Number(p.length),
                    width: Number(p.width),
                    height: Number(p.height),
                    weight: Number(p.weight),
                  })),
                }
              : {}),
          }
        })
      )
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Could not save the cartons. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <p className="mb-4 text-sm text-text-muted">
        Walmart split {shipment.reference} into {legs.length} shipment{legs.length === 1 ? '' : 's'}. Enter how many cartons each one ships
        in; Walmart prints one label per carton or pallet.
        {askSizes && ' Add carton sizes if you want a quote from Walmart’s carrier.'}
      </p>

      <div className="space-y-4">
        {legs.map((leg) => {
          const id = legId(leg)
          const f = forms[id]
          const legError = touched ? errorFor(f) : undefined
          return (
            <div key={id} className="rounded-lg border border-border p-4">
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                <span className="font-mono font-semibold text-text-secondary">{id}</span>
                <span>
                  {leg.fulfillmentCenter}
                  {leg.fcLocation ? ` · ${leg.fcLocation}` : ''}
                </span>
                <span>{formatUnits(leg.units)} units</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <CountField label="Single-SKU cartons" value={f.singleSku} disabled={isSaving} onChange={(v) => patch(id, { singleSku: v })} />
                <CountField label="Mixed-SKU cartons" value={f.mixedSku} disabled={isSaving} onChange={(v) => patch(id, { mixedSku: v })} />
                <CountField label="Pallets" value={f.pallet} disabled={isSaving} onChange={(v) => patch(id, { pallet: v })} />
              </div>

              {askSizes && (
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input type="checkbox" checked={f.withSizes} disabled={isSaving} onChange={(e) => patch(id, { withSizes: e.target.checked })} />
                    Add carton sizes (inches, pounds) for a Walmart carrier quote
                  </label>
                  {f.withSizes && (
                    <div className="mt-2 space-y-2">
                      {f.packages.map((p, i) => (
                        <div key={i} className="grid grid-cols-[repeat(5,minmax(0,1fr))_auto] items-end gap-2">
                          <MeasureField label="Cartons" value={p.count} disabled={isSaving} onChange={(v) => patchPackage(id, i, { count: v })} />
                          <MeasureField label="L (in)" value={p.length} disabled={isSaving} onChange={(v) => patchPackage(id, i, { length: v })} />
                          <MeasureField label="W (in)" value={p.width} disabled={isSaving} onChange={(v) => patchPackage(id, i, { width: v })} />
                          <MeasureField label="H (in)" value={p.height} disabled={isSaving} onChange={(v) => patchPackage(id, i, { height: v })} />
                          <MeasureField label="Weight (lb)" value={p.weight} disabled={isSaving} onChange={(v) => patchPackage(id, i, { weight: v })} />
                          <button
                            type="button"
                            aria-label="Remove this carton size"
                            disabled={isSaving || f.packages.length === 1}
                            onClick={() => patch(id, { packages: f.packages.filter((_, n) => n !== i) })}
                            className="mb-1 flex h-8 w-8 items-center justify-center rounded text-text-subtle hover:bg-danger-50 hover:text-danger-600 disabled:invisible"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isSaving}
                        onClick={() => patch(id, { packages: [...f.packages, { count: '', length: '', width: '', height: '', weight: '' }] })}
                      >
                        + Add carton size
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {legError && <p className="mt-2 text-xs text-danger-600">{legError}</p>}
            </div>
          )
        })}
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving || legs.length === 0}>
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-white" /> Saving…
            </span>
          ) : (
            'Save cartons'
          )}
        </Button>
      </DialogFooter>
    </>
  )
}

const CountField: React.FC<{ label: string; value: string; disabled?: boolean; onChange: (v: string) => void }> = ({ label, value, disabled, onChange }) => (
  <label className="flex flex-col gap-1 text-xs text-text-muted">
    {label}
    <input
      type="number"
      min={0}
      step={1}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-secondary-200"
    />
  </label>
)

const MeasureField: React.FC<{ label: string; value: string; disabled?: boolean; onChange: (v: string) => void }> = ({ label, value, disabled, onChange }) => (
  <label className="flex min-w-0 flex-col gap-1 text-[11px] text-text-muted">
    {label}
    <input
      type="number"
      min={0}
      step="any"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn('h-8 w-full rounded-md border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-secondary-200')}
    />
  </label>
)
