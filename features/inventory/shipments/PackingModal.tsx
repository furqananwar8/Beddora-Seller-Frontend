"use client"

import React, { useEffect, useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import { DimensionUnit, InboundShipment, PackingOption, PackingPlan, PackingSubmission, WeightUnit } from './types'
import { formatUnits } from './ShipmentParts'
import { MARKETPLACE_META, getShipmentUnits } from './workflow'
import { CartonCard, GroupProgress } from './CartonEditor'
import {
  Carton,
  CartonsByGroup,
  cartonsFor,
  groupProgress,
  isPackingValid,
  suggestCarton,
  toSubmission,
  totalBoxes,
  unitsFor,
} from './packingModel'

interface PackingState {
  plan: PackingPlan | null
  optionId: string | null
  cartons: CartonsByGroup
  dimensionUnit: DimensionUnit
  weightUnit: WeightUnit
  saveCasePacks: boolean
  isSubmitting: boolean
  error: string | null
}

const EMPTY_STATE: PackingState = {
  plan: null,
  optionId: null,
  cartons: {},
  dimensionUnit: 'IN',
  weightUnit: 'LB',
  saveCasePacks: true,
  isSubmitting: false,
  error: null,
}

interface PackingModalProps {
  shipment: InboundShipment | null
  loadPlan: (id: string) => Promise<PackingPlan>
  onSubmit: (id: string, submission: PackingSubmission) => Promise<void>
  onClose: () => void
}

export const PackingModal: React.FC<PackingModalProps> = ({ shipment, loadPlan, onSubmit, onClose }) => {
  const [state, setState] = useState<PackingState>(EMPTY_STATE)
  const patch = (next: Partial<PackingState>) => setState((prev) => ({ ...prev, ...next }))

  useEffect(() => {
    if (!shipment) return
    let cancelled = false
    setState(EMPTY_STATE)
    loadPlan(shipment.id)
      .then((plan) => {
        if (cancelled) return
        const first = plan.options[0]
        patch({ plan, optionId: first?.packingOptionId ?? null, cartons: first ? cartonsFor(first) : {}, ...(first ? unitsFor(first) : {}) })
      })
      .catch((err: Error) => {
        if (!cancelled) patch({ plan: { options: [] }, error: err.message || 'Amazon did not return packing options.' })
      })
    return () => {
      cancelled = true
    }
    // Reload only when opened for another shipment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipment?.id])

  if (!shipment) return null
  const { plan, optionId, cartons, dimensionUnit, weightUnit, saveCasePacks, isSubmitting, error } = state
  const option = plan?.options.find((o) => o.packingOptionId === optionId) ?? null
  const currency = MARKETPLACE_META[shipment.marketplace].currency

  const chooseOption = (next: PackingOption) =>
    patch({ optionId: next.packingOptionId, cartons: cartonsFor(next), ...unitsFor(next), error: null })

  const updateGroup = (groupId: string, update: (cartons: Carton[]) => Carton[]) =>
    setState((prev) => ({ ...prev, cartons: { ...prev.cartons, [groupId]: update(prev.cartons[groupId] ?? []) } }))

  const updateCarton = (groupId: string, id: string, update: (carton: Carton) => Carton) =>
    updateGroup(groupId, (list) => list.map((c) => (c.id === id ? update(c) : c)))

  const isValid = !!option && isPackingValid(option, cartons)
  const boxCount = option ? option.groups.reduce((sum, g) => sum + totalBoxes(cartons[g.packingGroupId] ?? []), 0) : 0

  const handleSubmit = async () => {
    if (!option) return
    patch({ isSubmitting: true, error: null })
    try {
      await onSubmit(shipment.id, toSubmission(option, cartons, { dimensionUnit, weightUnit }, saveCasePacks))
      onClose()
    } catch (err) {
      patch({ error: (err as Error).message || 'Amazon rejected the box contents.' })
    } finally {
      patch({ isSubmitting: false })
    }
  }

  return (
    <Modal isOpen onClose={isSubmitting ? () => {} : onClose} title="Box contents" size="xl">
      <p className="mb-4 text-sm text-text-muted">
        Tell Amazon how the units are packed. Each carton type is identical boxes, and one box can hold several SKUs.{' '}
        <span className="text-text-primary">
          {shipment.reference} · {formatUnits(getShipmentUnits(shipment))} units
        </span>
      </p>

      {!plan && (
        <div className="flex items-center justify-center gap-3 py-10 text-sm text-text-muted">
          <Spinner size="sm" />
          Getting packing options from Amazon…
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </div>
      )}

      {plan && plan.options.length > 1 && (
        <div role="radiogroup" className="mb-5 grid gap-2 sm:grid-cols-2">
          {plan.options.map((o) => (
            <label
              key={o.packingOptionId}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                o.packingOptionId === optionId ? 'border-secondary-800 bg-secondary-50' : 'border-border hover:bg-secondary-50'
              )}
            >
              <input
                type="radio"
                name="packing-option"
                checked={o.packingOptionId === optionId}
                onChange={() => chooseOption(o)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-text-primary">{o.title}</div>
                {o.description && <div className="text-xs text-text-muted">{o.description}</div>}
              </div>
              {o.fee !== undefined && (
                <div className="text-sm font-semibold text-text-primary">{formatCurrency(o.fee, o.currency ?? currency)}</div>
              )}
            </label>
          ))}
        </div>
      )}

      {option && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
            <UnitToggle
              label="Dimensions"
              value={dimensionUnit}
              options={['IN', 'CM']}
              onChange={(v) => patch({ dimensionUnit: v as DimensionUnit })}
            />
            <UnitToggle
              label="Weight"
              value={weightUnit}
              options={['LB', 'KG']}
              onChange={(v) => patch({ weightUnit: v as WeightUnit })}
            />
          </div>

          <div className="max-h-[55vh] space-y-6 overflow-y-auto pr-1">
            {option.groups.map((group, gi) => {
              const list = cartons[group.packingGroupId] ?? []
              return (
                <div key={group.packingGroupId} className="space-y-3">
                  {option.groups.length > 1 && (
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Packing group {gi + 1}</div>
                  )}
                  <GroupProgress progress={groupProgress(group, list)} />
                  {list.map((carton, ci) => (
                    <CartonCard
                      key={carton.id}
                      carton={carton}
                      index={ci}
                      group={group}
                      dimensionUnit={dimensionUnit}
                      weightUnit={weightUnit}
                      canRemove={list.length > 1}
                      onChange={(update) => updateCarton(group.packingGroupId, carton.id, update)}
                      onRemove={() => updateGroup(group.packingGroupId, (l) => l.filter((c) => c.id !== carton.id))}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => updateGroup(group.packingGroupId, (l) => [...l, suggestCarton(group, l)])}
                    className="text-xs font-medium text-text-secondary hover:text-text-primary"
                  >
                    + Add carton type
                  </button>
                </div>
              )
            })}
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={saveCasePacks} onChange={(e) => patch({ saveCasePacks: e.target.checked })} />
            Save single-SKU boxes as that SKU&apos;s case pack for next time
          </label>
        </>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <span className="text-xs text-text-muted">{option ? `${formatUnits(boxCount)} ${boxCount === 1 ? 'box' : 'boxes'}` : ''}</span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" className="text-white" /> Sending…
              </span>
            ) : (
              'Send box contents'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

const UnitToggle: React.FC<{ label: string; value: string; options: string[]; onChange: (v: string) => void }> = ({
  label,
  value,
  options,
  onChange,
}) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-text-muted">{label}</span>
    <div className="flex rounded-md border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            'rounded px-2 py-0.5 text-xs font-medium',
            o === value ? 'bg-secondary-800 text-white' : 'text-text-muted hover:text-text-primary'
          )}
        >
          {o}
        </button>
      ))}
    </div>
  </div>
)
