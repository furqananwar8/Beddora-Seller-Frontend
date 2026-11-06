'use client'

import React from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { FormField } from '@/components/form-field/FormField'
import { NumericInput } from '@/components/form-field/NumericInput'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { CartonIllustration } from '../shared/CartonIllustration'
import { SectionCard } from '../shared/Card'
import { numberField } from '../shared/fieldStyles'
import { derivePackage, numberOf, PACKAGE_FIELDS, UNITS, type PackageField, type UnitSystem } from './shipmentForm'
import type { ShipmentFormValues } from './shipmentSchema'

interface PackageCardProps {
  /** Switches the unit system, converting what was typed. */
  onUnitsChange: (units: UnitSystem) => void
}

const UNIT_OPTIONS: Array<{ value: UnitSystem; label: string }> = [
  { value: 'METRIC', label: 'cm / kg' },
  { value: 'IMPERIAL', label: 'in / lb' },
]

const LABEL: Record<PackageField, string> = { length: 'Length', width: 'Width', height: 'Height', weight: 'Weight' }

/** Volumetric divisor most carriers use: cm³ / 5000 = kg, in³ / 139 = lb. */
const DIM_DIVISOR: Record<UnitSystem, number> = { METRIC: 5000, IMPERIAL: 139 }

/** The one carton: L × W × H and weight, prefilled from the products and editable, with a live picture. */
export const PackageCard: React.FC<PackageCardProps> = ({ onUnitsChange }) => {
  const {
    control,
    formState: { errors, dirtyFields },
  } = useFormContext<ShipmentFormValues>()
  const [pkg, units, products] = useWatch({ control, name: ['pkg', 'units', 'products'] })
  const unit = UNITS[units]
  // Fields still showing what the products supplied (grey fill): not typed by hand, and the products know them
  const derived = derivePackage(products, units)
  const auto = new Set(PACKAGE_FIELDS.filter((field) => !dirtyFields.pkg?.[field] && derived[field] !== null))
  const [length, width, height] = [numberOf(pkg.length), numberOf(pkg.width), numberOf(pkg.height)]
  const dimWeight = length && width && height ? (length * width * height) / DIM_DIVISOR[units] : null
  const notes = [auto.size > 0 && 'Grey = from product', dimWeight !== null && `Dim weight ${dimWeight.toFixed(1)} ${unit.weight.toLowerCase()}`].filter(Boolean)

  return (
    <SectionCard title="Package" subtitle="carton from product, edit on the go" aside={<SegmentedToggle ariaLabel="Units" value={units} onChange={onUnitsChange} options={UNIT_OPTIONS} />}>
      <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CartonIllustration length={length} width={width} height={height} unit={unit.length.toLowerCase()} className="mx-auto w-full max-w-[290px]" />
        <div>
          <div className="grid grid-cols-2 gap-3">
            {PACKAGE_FIELDS.map((field) => {
              const error = errors.pkg?.[field]?.message
              return (
                <FormField key={field} label={`${LABEL[field]} (${(field === 'weight' ? unit.weight : unit.length).toLowerCase()})`} htmlFor={`pkg-${field}`} required>
                  <Controller
                    control={control}
                    name={`pkg.${field}`}
                    render={({ field: input }) => <NumericInput id={`pkg-${field}`} decimal value={input.value} onChange={(event) => input.onChange(event.target.value)} onBlur={input.onBlur} className={numberField(error, auto.has(field))} />}
                  />
                </FormField>
              )
            })}
          </div>
          {notes.length > 0 && <p className="mt-2 text-xs text-text-muted">{notes.join(' · ')}</p>}
        </div>
      </div>
    </SectionCard>
  )
}
