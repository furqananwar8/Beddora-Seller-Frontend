"use client"

import React from 'react'
import { cn } from '@/utils/cn'
import { DimensionUnit, PackingGroup, PackingGroupItem, WeightUnit } from './types'
import { formatUnits } from './ShipmentParts'
import { Carton, CartonLine, SkuProgress, addableItems, isMixed, unitsPerCarton } from './packingModel'

const isPositive = (s: string) => s.trim() !== '' && Number(s) > 0

const inputClass = (valid: boolean) =>
  cn(
    'w-full rounded-md border bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200',
    valid ? 'border-border' : 'border-warning-300'
  )

const itemLabel = (item: PackingGroupItem) => (item.title && item.title !== item.sku ? `${item.title} · ${item.sku}` : item.sku)

// ============================================
// Packed progress: one pill per SKU
// ============================================

export const GroupProgress: React.FC<{ progress: SkuProgress[] }> = ({ progress }) => (
  <div className="grid gap-2 sm:grid-cols-2">
    {progress.map(({ item, packed }) => {
      const done = packed === item.quantity
      return (
        <div key={item.sku} className="flex items-center justify-between gap-3 rounded-md bg-surface-secondary px-3 py-2">
          <div className="min-w-0">
            {item.title !== item.sku && <div className="truncate text-sm font-medium text-text-primary">{item.title}</div>}
            <div className="truncate font-mono text-xs text-text-muted">{item.sku}</div>
          </div>
          <span
            className={cn(
              'whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
              done ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'
            )}
          >
            {formatUnits(packed)} / {formatUnits(item.quantity)} packed
          </span>
        </div>
      )
    })}
  </div>
)

// ============================================
// One carton type
// ============================================

interface CartonCardProps {
  carton: Carton
  index: number
  group: PackingGroup
  dimensionUnit: DimensionUnit
  weightUnit: WeightUnit
  canRemove: boolean
  onChange: (update: (carton: Carton) => Carton) => void
  onRemove: () => void
}

export const CartonCard: React.FC<CartonCardProps> = ({ carton, index, group, dimensionUnit, weightUnit, canRemove, onChange, onRemove }) => {
  const itemBySku = new Map(group.items.map((i) => [i.sku, i]))
  const canMix = addableItems(group, carton).length > 0
  const boxes = Number(carton.count) || 0

  const setField = (field: 'count' | 'length' | 'width' | 'height' | 'weight', value: string) =>
    onChange((c) => ({ ...c, [field]: value }))
  const setLine = (lineIndex: number, line: Partial<CartonLine>) =>
    onChange((c) => ({ ...c, lines: c.lines.map((l, i) => (i === lineIndex ? { ...l, ...line } : l)) }))
  const addLine = () =>
    onChange((c) => {
      const [next] = addableItems(group, c)
      return next ? { ...c, lines: [...c.lines, { sku: next.sku, unitsPerBox: '' }] } : c
    })
  const removeLine = (lineIndex: number) => onChange((c) => ({ ...c, lines: c.lines.filter((_, i) => i !== lineIndex) }))

  const fields: { field: 'count' | 'length' | 'width' | 'height' | 'weight'; label: string; step: string }[] = [
    { field: 'count', label: 'Boxes', step: '1' },
    { field: 'length', label: `L (${dimensionUnit})`, step: '0.1' },
    { field: 'width', label: `W (${dimensionUnit})`, step: '0.1' },
    { field: 'height', label: `H (${dimensionUnit})`, step: '0.1' },
    { field: 'weight', label: `Weight (${weightUnit})`, step: '0.1' },
  ]
  const label = `carton type ${index + 1}`

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-secondary px-3 py-2">
        <div className="text-sm font-medium text-text-primary">
          Carton type {index + 1}
          <span className="ml-2 text-xs font-normal text-text-muted">{isMixed(carton) ? 'mixed' : 'single SKU'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary">
            {formatUnits(boxes)} {boxes === 1 ? 'box' : 'boxes'} × {formatUnits(unitsPerCarton(carton))} units
          </span>
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label={`Remove ${label}`}
            className="rounded p-1 text-text-muted hover:bg-secondary-100 hover:text-text-primary disabled:opacity-30"
          >
            ×
          </button>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {fields.map((f) => (
            <label key={f.field} className="block">
              <span className="mb-1 block text-[11px] font-medium text-text-muted">{f.label}</span>
              <input
                type="number"
                min={0}
                step={f.step}
                value={carton[f.field]}
                onChange={(e) => setField(f.field, e.target.value)}
                aria-label={`${f.label} for ${label}`}
                className={inputClass(isPositive(carton[f.field]))}
              />
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-medium text-text-muted">Contents of each box</div>
          {carton.lines.map((line, lineIndex) => {
            const choices = [itemBySku.get(line.sku), ...addableItems(group, carton)].filter((i): i is PackingGroupItem => !!i)
            return (
              <div key={lineIndex} className="grid grid-cols-[minmax(0,1fr)_7rem_2rem] items-center gap-2">
                <select
                  value={line.sku}
                  onChange={(e) => setLine(lineIndex, { sku: e.target.value })}
                  disabled={choices.length < 2}
                  aria-label={`SKU in line ${lineIndex + 1} of ${label}`}
                  className={cn(inputClass(true), 'truncate')}
                >
                  {choices.map((item) => (
                    <option key={item.sku} value={item.sku}>
                      {itemLabel(item)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={line.unitsPerBox}
                  placeholder="Units"
                  onChange={(e) => setLine(lineIndex, { unitsPerBox: e.target.value })}
                  aria-label={`Units per box of ${line.sku} in ${label}`}
                  className={inputClass(isPositive(line.unitsPerBox))}
                />
                <button
                  type="button"
                  onClick={() => removeLine(lineIndex)}
                  disabled={carton.lines.length === 1}
                  aria-label={`Remove ${line.sku} from ${label}`}
                  className="rounded p-1 text-text-muted hover:bg-secondary-100 hover:text-text-primary disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            )
          })}
          {canMix && (
            <button type="button" onClick={addLine} className="text-xs font-medium text-text-secondary hover:text-text-primary">
              + Add SKU to this box
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
