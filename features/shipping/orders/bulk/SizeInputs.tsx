'use client'

import React, { useState } from 'react'
import { NumericInput } from '@/components/form-field/NumericInput'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { convertLength, convertWeight } from '@/features/procurement/shared/units'
import type { LengthUnit, WeightUnit } from '@/services/api/procurement.api'
import { numberOf, UNITS } from '../../create/shipmentForm'
import { CartonIllustration } from '../../shared/CartonIllustration'
import type { PackageText } from './prepareOrder'

/**
 * Length, width, height and weight of one package. Each field has its own cm / in (kg / lb) choice, cm and kg to start;
 * the package is kept in the booking's own unit system, so a value typed in the other unit is converted as it is typed.
 */
export const SizeInputs: React.FC<{ pkg: PackageText; units: keyof typeof UNITS; name: string; onChange: (pkg: PackageText) => void }> = ({ pkg, units, name, onChange }) => {
  const unit = UNITS[units]
  const [picked, setPicked] = useState<Partial<Record<keyof PackageText, string>>>({})
  // What was typed in a field whose unit differs from the stored one, so typing "9." or "9.40" is not rewritten under the cursor
  const [typed, setTyped] = useState<Partial<Record<keyof PackageText, string>>>({})
  const convert = (key: keyof PackageText, value: number, from: string, to: string) =>
    key === 'weight' ? convertWeight(value, from as WeightUnit, to as WeightUnit) : convertLength(value, from as LengthUnit, to as LengthUnit)
  const field = (key: keyof PackageText, label: string) => {
    const stored = key === 'weight' ? unit.weight : unit.length
    const options = key === 'weight' ? ['KG', 'LB'] : ['CM', 'IN']
    const shown = picked[key] ?? stored
    const toStored = (text: string) => (Number.isFinite(Number(text)) && text.trim() !== '' ? String(convert(key, Number(text), shown, stored)) : '')
    const value =
      shown === stored
        ? pkg[key]
        : typed[key] !== undefined && toStored(typed[key]!) === pkg[key]
          ? typed[key]!
          : Number.isFinite(Number(pkg[key])) && pkg[key].trim() !== ''
            ? String(convert(key, Number(pkg[key]), stored, shown))
            : ''
    return (
      <label className="flex items-center gap-1 text-xs text-text-muted">
        {label}
        <NumericInput
          decimal
          value={value}
          onChange={(event) => {
            const text = event.target.value
            if (shown !== stored) setTyped((current) => ({ ...current, [key]: text }))
            onChange({ ...pkg, [key]: shown === stored ? text : toStored(text) })
          }}
          aria-label={`${label} for ${name}`}
          className="ds-input ds-input-default h-8 w-20 rounded-lg px-2 text-sm text-text-primary"
        />
        <SegmentedToggle
          ariaLabel={`${label} unit for ${name}`}
          value={shown}
          onChange={(next) => {
            setPicked((current) => ({ ...current, [key]: next }))
            setTyped((current) => ({ ...current, [key]: undefined }))
          }}
          options={options.map((option) => ({ value: option, label: option.toLowerCase() }))}
          className="[&>button]:px-1.5 [&>button]:text-xs"
        />
      </label>
    )
  }
  return (
    <span className="flex shrink-0 items-center gap-3 whitespace-nowrap">
      {field('length', 'L')}
      {field('width', 'W')}
      {field('height', 'H')}
      {field('weight', 'Weight')}
    </span>
  )
}

/** The package's inputs with the carton beside them, redrawn as the size is typed (as on the single-order screen). */
export const PackageWithCarton: React.FC<{ pkg: PackageText; units: keyof typeof UNITS; name: string; onChange: (pkg: PackageText) => void }> = (props) => (
  <div className="flex flex-wrap items-center gap-4">
    <CartonIllustration length={numberOf(props.pkg.length)} width={numberOf(props.pkg.width)} height={numberOf(props.pkg.height)} unit={UNITS[props.units].length.toLowerCase()} className="w-56 shrink-0" />
    <SizeInputs {...props} />
  </div>
)
