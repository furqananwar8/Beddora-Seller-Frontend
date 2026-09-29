"use client"

import React, { useEffect, useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import {
  BoxSpec,
  DimensionUnit,
  InboundShipment,
  PackingGroupItem,
  PackingOption,
  PackingPlan,
  PackingSubmission,
  WeightUnit,
} from './types'
import { formatUnits } from './ShipmentParts'
import { MARKETPLACE_META, getShipmentUnits } from './workflow'

// ============================================
// Model: single-SKU box types per SKU, per packing group
// ============================================

/** One kind of box: `count` identical boxes holding `unitsPerBox` of one SKU. Strings keep inputs editable. */
interface BoxRow {
  count: string
  unitsPerBox: string
  length: string
  width: string
  height: string
  weight: string
}

/** groupId -> sku -> box rows */
type BoxRows = Record<string, Record<string, BoxRow[]>>

interface PackingState {
  plan: PackingPlan | null
  optionId: string | null
  rows: BoxRows
  dimensionUnit: DimensionUnit
  weightUnit: WeightUnit
  saveCasePacks: boolean
  isSubmitting: boolean
  error: string | null
}

const EMPTY_STATE: PackingState = {
  plan: null,
  optionId: null,
  rows: {},
  dimensionUnit: 'IN',
  weightUnit: 'LB',
  saveCasePacks: true,
  isSubmitting: false,
  error: null,
}

const str = (n?: number) => (n === undefined ? '' : String(n))
const num = (s: string) => Number(s)
const isPositive = (s: string) => s.trim() !== '' && Number(s) > 0

/** Full case-pack boxes plus one partial box for the remainder; one open row when there is no case pack. */
function defaultRows(item: PackingGroupItem): BoxRow[] {
  const cp = item.casePack
  if (!cp || cp.unitsPerBox <= 0) {
    return [{ count: '1', unitsPerBox: str(item.quantity), length: '', width: '', height: '', weight: '' }]
  }
  const dims = { length: str(cp.length), width: str(cp.width), height: str(cp.height), weight: str(cp.weight) }
  const full = Math.floor(item.quantity / cp.unitsPerBox)
  const rest = item.quantity % cp.unitsPerBox
  const rows: BoxRow[] = []
  if (full > 0) rows.push({ count: str(full), unitsPerBox: str(cp.unitsPerBox), ...dims })
  if (rest > 0) rows.push({ count: '1', unitsPerBox: str(rest), ...dims })
  return rows
}

function rowsFor(option: PackingOption): BoxRows {
  return Object.fromEntries(
    option.groups.map((g) => [g.packingGroupId, Object.fromEntries(g.items.map((i) => [i.sku, defaultRows(i)]))])
  )
}

/** Units of case packs decide the modal's units; mixed units fall back to IN / LB. */
function unitsFor(option: PackingOption): { dimensionUnit: DimensionUnit; weightUnit: WeightUnit } {
  const packs = option.groups.flatMap((g) => g.items.map((i) => i.casePack)).filter(Boolean)
  const first = packs[0]
  const same = first && packs.every((p) => p!.dimensionUnit === first.dimensionUnit && p!.weightUnit === first.weightUnit)
  return same ? { dimensionUnit: first.dimensionUnit, weightUnit: first.weightUnit } : { dimensionUnit: 'IN', weightUnit: 'LB' }
}

const packedUnits = (rows: BoxRow[]) => rows.reduce((sum, r) => sum + (num(r.count) || 0) * (num(r.unitsPerBox) || 0), 0)

const rowIsComplete = (r: BoxRow) =>
  [r.count, r.unitsPerBox, r.length, r.width, r.height, r.weight].every(isPositive) &&
  Number.isInteger(num(r.count)) &&
  Number.isInteger(num(r.unitsPerBox))

function toSubmission(option: PackingOption, state: PackingState): PackingSubmission {
  return {
    packingOptionId: option.packingOptionId,
    saveCasePacks: state.saveCasePacks,
    groups: option.groups.map((g) => ({
      packingGroupId: g.packingGroupId,
      boxes: g.items.flatMap((item) =>
        (state.rows[g.packingGroupId]?.[item.sku] ?? []).map<BoxSpec>((r) => ({
          count: num(r.count),
          length: num(r.length),
          width: num(r.width),
          height: num(r.height),
          dimensionUnit: state.dimensionUnit,
          weight: num(r.weight),
          weightUnit: state.weightUnit,
          items: [{ sku: item.sku, quantity: num(r.unitsPerBox) }],
        }))
      ),
    })),
  }
}

// ============================================
// Modal
// ============================================

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
        patch({ plan, optionId: first?.packingOptionId ?? null, rows: first ? rowsFor(first) : {}, ...(first ? unitsFor(first) : {}) })
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
  const { plan, optionId, rows, dimensionUnit, weightUnit, saveCasePacks, isSubmitting, error } = state
  const option = plan?.options.find((o) => o.packingOptionId === optionId) ?? null
  const currency = MARKETPLACE_META[shipment.marketplace].currency

  const chooseOption = (next: PackingOption) =>
    patch({ optionId: next.packingOptionId, rows: rowsFor(next), ...unitsFor(next), error: null })

  const updateRows = (groupId: string, sku: string, update: (rows: BoxRow[]) => BoxRow[]) =>
    setState((prev) => ({
      ...prev,
      rows: { ...prev.rows, [groupId]: { ...prev.rows[groupId], [sku]: update(prev.rows[groupId]?.[sku] ?? []) } },
    }))

  const allItems = option?.groups.flatMap((g) => g.items.map((item) => ({ groupId: g.packingGroupId, item }))) ?? []
  const isValid =
    allItems.length > 0 &&
    allItems.every(({ groupId, item }) => {
      const itemRows = rows[groupId]?.[item.sku] ?? []
      return itemRows.length > 0 && itemRows.every(rowIsComplete) && packedUnits(itemRows) === item.quantity
    })
  const totalBoxes = allItems.reduce(
    (sum, { groupId, item }) => sum + (rows[groupId]?.[item.sku] ?? []).reduce((n, r) => n + (num(r.count) || 0), 0),
    0
  )

  const handleSubmit = async () => {
    if (!option) return
    patch({ isSubmitting: true, error: null })
    try {
      await onSubmit(shipment.id, toSubmission(option, state))
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
        Tell Amazon how the units are packed. Each box type is identical boxes holding one SKU.{' '}
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

          <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
            {option.groups.map((group, gi) => (
              <div key={group.packingGroupId} className="space-y-3">
                {option.groups.length > 1 && (
                  <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Packing group {gi + 1}
                  </div>
                )}
                {group.items.map((item) => (
                  <SkuBoxes
                    key={item.sku}
                    item={item}
                    rows={rows[group.packingGroupId]?.[item.sku] ?? []}
                    dimensionUnit={dimensionUnit}
                    weightUnit={weightUnit}
                    onChange={(update) => updateRows(group.packingGroupId, item.sku, update)}
                  />
                ))}
              </div>
            ))}
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={saveCasePacks} onChange={(e) => patch({ saveCasePacks: e.target.checked })} />
            Save these boxes as each SKU&apos;s case pack for next time
          </label>
        </>
      )}

      <div className="mt-6 flex items-center justify-between gap-2 border-t border-border pt-4">
        <span className="text-xs text-text-muted">{option ? `${formatUnits(totalBoxes)} boxes` : ''}</span>
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

// ============================================
// Parts
// ============================================

const EMPTY_ROW: BoxRow = { count: '1', unitsPerBox: '', length: '', width: '', height: '', weight: '' }

const SkuBoxes: React.FC<{
  item: PackingGroupItem
  rows: BoxRow[]
  dimensionUnit: DimensionUnit
  weightUnit: WeightUnit
  onChange: (update: (rows: BoxRow[]) => BoxRow[]) => void
}> = ({ item, rows, dimensionUnit, weightUnit, onChange }) => {
  const packed = packedUnits(rows)
  const matches = packed === item.quantity
  const setField = (index: number, field: keyof BoxRow, value: string) =>
    onChange((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  // A new box type starts with the dimensions of the last one
  const addRow = () =>
    onChange((prev) => [...prev, prev.length ? { ...prev[prev.length - 1], count: '1', unitsPerBox: '' } : EMPTY_ROW])
  const removeRow = (index: number) => onChange((prev) => prev.filter((_, i) => i !== index))

  const columns: { field: keyof BoxRow; label: string; step?: string }[] = [
    { field: 'count', label: 'Boxes' },
    { field: 'unitsPerBox', label: 'Units / box' },
    { field: 'length', label: `L (${dimensionUnit})`, step: '0.1' },
    { field: 'width', label: `W (${dimensionUnit})`, step: '0.1' },
    { field: 'height', label: `H (${dimensionUnit})`, step: '0.1' },
    { field: 'weight', label: `Weight (${weightUnit})`, step: '0.1' },
  ]

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-secondary px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-text-primary">{item.title}</div>
          <div className="font-mono text-xs text-text-muted">{item.sku}</div>
        </div>
        <span
          className={cn(
            'whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
            matches ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'
          )}
        >
          {formatUnits(packed)} / {formatUnits(item.quantity)} packed
        </span>
      </div>
      <div className="space-y-2 p-3">
        <div className="grid grid-cols-[repeat(6,minmax(0,1fr))_2rem] gap-2 text-[11px] font-medium text-text-muted">
          {columns.map((c) => (
            <span key={c.field}>{c.label}</span>
          ))}
          <span />
        </div>
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[repeat(6,minmax(0,1fr))_2rem] items-center gap-2">
            {columns.map((c) => (
              <input
                key={c.field}
                type="number"
                min={0}
                step={c.step ?? '1'}
                value={row[c.field]}
                onChange={(e) => setField(index, c.field, e.target.value)}
                aria-label={`${c.label} for ${item.sku}`}
                className={cn(
                  'w-full rounded-md border bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200',
                  isPositive(row[c.field]) ? 'border-border' : 'border-warning-300'
                )}
              />
            ))}
            <button
              type="button"
              onClick={() => removeRow(index)}
              disabled={rows.length === 1}
              aria-label="Remove box type"
              className="rounded p-1 text-text-muted hover:bg-secondary-100 hover:text-text-primary disabled:opacity-30"
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addRow} className="text-xs font-medium text-text-secondary hover:text-text-primary">
          + Add box type
        </button>
      </div>
    </div>
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
