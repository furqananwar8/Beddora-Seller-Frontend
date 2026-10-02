'use client'

import React from 'react'
import { fieldClass } from '@/components/form-field/FormField'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import type { LengthUnit, WeightUnit } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { convertLength, convertWeight } from './units'

const WEIGHT_UNITS: Array<{ value: WeightUnit; label: string }> = [
  { value: 'KG', label: 'KG' },
  { value: 'LB', label: 'LB' },
]

export const LENGTH_UNITS: Array<{ value: LengthUnit; label: string }> = [
  { value: 'CM', label: 'CM' },
  { value: 'IN', label: 'IN' },
]

/** A typed number re-expressed in the other unit; blanks and non-numbers stay as typed. */
const reexpress = (value: string, convert: (n: number) => number) => {
  const parsed = Number(value)
  return value.trim() === '' || !Number.isFinite(parsed) ? value : String(convert(parsed))
}

const numberInput = (error?: string) => cn(fieldClass(error), 'min-w-0 text-right tabular-nums')

interface WeightFieldProps {
  id: string
  value: string
  unit: WeightUnit
  onChange: (value: string) => void
  /** Flipping KG ⇄ LB converts the typed value. */
  onUnitChange: (unit: WeightUnit, converted: string) => void
  error?: string
  disabled?: boolean
}

export const WeightField: React.FC<WeightFieldProps> = ({ id, value, unit, onChange, onUnitChange, error, disabled }) => (
  <div className="flex items-center gap-2">
    <input id={id} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className={numberInput(error)} disabled={disabled} />
    <SegmentedToggle<WeightUnit>
      ariaLabel="Weight unit"
      value={unit}
      options={WEIGHT_UNITS}
      disabled={disabled}
      className="shrink-0"
      onChange={(next) => onUnitChange(next, reexpress(value, (n) => convertWeight(n, unit, next)))}
    />
  </div>
)

export interface Dimensions {
  length: string
  width: string
  height: string
}

interface DimensionsFieldProps {
  idPrefix: string
  value: Dimensions
  unit: LengthUnit
  onChange: (value: Dimensions) => void
  /** Flipping CM ⇄ IN converts L, W and H. */
  onUnitChange: (unit: LengthUnit, converted: Dimensions) => void
  errors?: Partial<Record<keyof Dimensions, string>>
  disabled?: boolean
}

export const DimensionsField: React.FC<DimensionsFieldProps> = ({ idPrefix, value, unit, onChange, onUnitChange, errors = {}, disabled }) => {
  const parts: Array<keyof Dimensions> = ['length', 'width', 'height']
  return (
    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {parts.map((part, index) => (
          <React.Fragment key={part}>
            {index > 0 && <span className="text-text-muted" aria-hidden>×</span>}
            <input
              id={`${idPrefix}-${part}`}
              aria-label={part[0].toUpperCase() + part.slice(1)}
              inputMode="decimal"
              value={value[part]}
              onChange={(event) => onChange({ ...value, [part]: event.target.value })}
              className={numberInput(errors[part])}
              disabled={disabled}
            />
          </React.Fragment>
        ))}
      </div>
      <SegmentedToggle<LengthUnit>
        ariaLabel="Dimension unit"
        value={unit}
        options={LENGTH_UNITS}
        disabled={disabled}
        className="shrink-0"
        onChange={(next) =>
          onUnitChange(next, {
            length: reexpress(value.length, (n) => convertLength(n, unit, next)),
            width: reexpress(value.width, (n) => convertLength(n, unit, next)),
            height: reexpress(value.height, (n) => convertLength(n, unit, next)),
          })
        }
      />
    </div>
  )
}

interface CbmFieldProps {
  id: string
  /** What to show: the override, or the value derived from L×W×H. */
  value: string
  overridden: boolean
  onOverride: (value: string) => void
  onUseCalculated: () => void
  error?: string
  disabled?: boolean
}

/** CBM is derived from L×W×H and may be overridden; "Use calculated" drops the override. */
export const CbmField: React.FC<CbmFieldProps> = ({ id, value, overridden, onOverride, onUseCalculated, error, disabled }) => (
  <div>
    <div className="relative">
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(event) => onOverride(event.target.value)}
        className={cn(numberInput(error), 'pr-10', !overridden && 'bg-secondary-50')}
        disabled={disabled}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">m³</span>
    </div>
    {!error && (
      <p className="mt-1 text-xs text-text-muted">
        {overridden ? (
          <>
            Entered by hand ·{' '}
            <button type="button" onClick={onUseCalculated} className="font-medium text-primary-600 hover:underline" disabled={disabled}>
              use calculated
            </button>
          </>
        ) : (
          'Auto from L×W×H · editable'
        )}
      </p>
    )}
    {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
  </div>
)
