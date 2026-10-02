'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Controller, UseFormReturn, useWatch } from 'react-hook-form'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import type { PoCurrency, PoDestination } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatCalendarDay } from '@/utils/format'
import { DimensionsField } from '../shared/MeasurementFields'
import { SupplierSelect } from '../shared/SupplierSelect'
import type { PoFormValues } from './poForm'

const DESTINATIONS: Array<{ value: PoDestination; label: string }> = [
  { value: 'US', label: 'USA' },
  { value: 'CA', label: 'CANADA' },
]
const CURRENCIES: Array<{ value: PoCurrency; label: string }> = [
  { value: 'CAD', label: 'CAD' },
  { value: 'USD', label: 'USD' },
]

interface SectionProps {
  form: UseFormReturn<PoFormValues>
  readOnly: boolean
}

interface SupplierSectionProps extends SectionProps {
  /** A PO raised from another's leftovers keeps that supplier; its contact stays editable. */
  supplierLocked?: boolean
}

export const PoSupplierSection: React.FC<SupplierSectionProps> = ({ form, readOnly, supplierLocked = false }) => {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form
  const [supplier, contactName] = useWatch({ control, name: ['supplier', 'contactName'] })
  const supplierDefault = supplier?.contactName ?? ''
  const contactInput = useRef<HTMLInputElement | null>(null)
  const { ref: registerContactRef, ...contactField } = register('contactName')

  // The supplier's default contact is shown locked; "Edit" unlocks it for this PO, "Reset" locks it back.
  // A saved PO whose contact differs from the default opens unlocked. No default = nothing to lock.
  const [unlocked, setUnlocked] = useState(false)
  const overridden = contactName.trim() !== '' && contactName !== supplierDefault
  const editingContact = !supplierDefault || unlocked || overridden

  // While locked the field always carries the current supplier's default (also for older POs saved without one)
  useEffect(() => {
    if (!editingContact && supplier && contactName !== supplierDefault) setValue('contactName', supplierDefault)
  }, [editingContact, supplier, contactName, supplierDefault, setValue])

  const unlock = () => {
    setUnlocked(true)
    requestAnimationFrame(() => contactInput.current?.focus())
  }

  const resetContact = () => {
    setUnlocked(false)
    setValue('contactName', supplierDefault, { shouldDirty: true })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supplier</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField label="Supplier" htmlFor="po-supplier" required error={errors.supplier?.message as string | undefined} hint="Shared supplier list · includes “+ New supplier”">
          <Controller
            control={control}
            name="supplier"
            render={({ field }) => (
              <SupplierSelect
                id="po-supplier"
                value={field.value}
                error={errors.supplier?.message as string | undefined}
                disabled={readOnly || supplierLocked}
                onChange={(next) => {
                  if (next.id === supplier?.id) return
                  field.onChange(next)
                  // A different supplier brings its own default contact, locked again
                  setUnlocked(false)
                  setValue('contactName', next.contactName ?? '', { shouldDirty: true })
                }}
              />
            )}
          />
        </FormField>
        <FormField
          label="Supplier contact name"
          htmlFor="po-contact"
          error={errors.contactName?.message}
          hint={
            !supplier
              ? undefined
              : !supplierDefault
                ? 'This supplier has no default contact · kept on this PO only'
                : editingContact
                  ? (
                      <span>
                        Kept on this PO only · supplier default: {supplierDefault}
                        {!readOnly && (
                          <>
                            {' · '}
                            <button type="button" className="font-medium text-primary-600 hover:underline" onClick={resetContact}>
                              Reset
                            </button>
                          </>
                        )}
                      </span>
                    )
                  : 'Supplier default'
          }
        >
          <div className="flex items-center gap-2">
            <input
              id="po-contact"
              autoComplete="off"
              className={cn(fieldClass(errors.contactName?.message), (readOnly || !editingContact) && 'cursor-default bg-secondary-50 text-text-muted')}
              // readOnly, not disabled: react-hook-form drops disabled values on submit, and a locked default must still save
              readOnly={readOnly || !editingContact}
              aria-readonly={readOnly || !editingContact}
              ref={(element) => {
                registerContactRef(element)
                contactInput.current = element
              }}
              {...contactField}
            />
            {!readOnly && supplier && !editingContact && (
              <button type="button" onClick={unlock} className="ds-button ds-button-outline ds-button-sm h-10 shrink-0">
                Edit
              </button>
            )}
          </div>
        </FormField>
      </CardContent>
    </Card>
  )
}

/** Business-calendar today in the browser; good enough for the hint, the server owns the real countdown. */
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date())

function daysUntil(day: string): number | null {
  if (!day) return null
  return Math.round((new Date(`${day}T00:00:00Z`).getTime() - new Date(`${todayIso()}T00:00:00Z`).getTime()) / 86_400_000)
}

const minusDays = (day: string, days: number) => {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString()
}

const EtdCountdown: React.FC<{ etd: string }> = ({ etd }) => {
  const days = daysUntil(etd)
  if (days === null) return null
  const tone = days < 0 ? 'bg-danger-600 text-white' : days <= 10 ? 'bg-warning-50 text-warning-700 border border-warning-500' : 'bg-success-50 text-success-700 border border-success-500'
  return <span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold', tone)}>{days < 0 ? `${Math.abs(days)}d overdue` : `${days} days`}</span>
}

export const PoOrderDetailsSection: React.FC<SectionProps> = ({ form, readOnly }) => {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form
  const [etd, productionDate, cartonLength, cartonWidth, cartonHeight, cartonUnit] = useWatch({
    control,
    name: ['etd', 'productionDate', 'cartonLength', 'cartonWidth', 'cartonHeight', 'cartonUnit'],
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Destination" required hint="Drives the container's city list later">
          <Controller
            control={control}
            name="destination"
            render={({ field }) => <SegmentedToggle<PoDestination> ariaLabel="Destination" value={field.value} onChange={field.onChange} options={DESTINATIONS} disabled={readOnly} />}
          />
        </FormField>
        <FormField label="Currency" required>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => <SegmentedToggle<PoCurrency> ariaLabel="Currency" value={field.value} onChange={field.onChange} options={CURRENCIES} disabled={readOnly} />}
          />
        </FormField>
        <FormField label="Production date" htmlFor="po-production" error={errors.productionDate?.message}>
          <Controller
            control={control}
            name="productionDate"
            render={({ field }) => <SingleDatePicker id="po-production" value={field.value} onChange={field.onChange} placeholder="Select date" disabled={readOnly} />}
          />
        </FormField>
        <FormField
          label="ETD"
          htmlFor="po-etd"
          required
          error={errors.etd?.message}
          hint={etd ? `Reminder emails from ${formatCalendarDay(minusDays(etd, 10))} · daily if overdue` : 'On or after the production date'}
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Controller
                control={control}
                name="etd"
                render={({ field }) => (
                  <SingleDatePicker id="po-etd" value={field.value} onChange={field.onChange} min={productionDate || undefined} placeholder="Select date" error={errors.etd?.message} disabled={readOnly} />
                )}
              />
            </div>
            <EtdCountdown etd={etd} />
          </div>
        </FormField>

        <FormField label="Carton (box) dimensions" htmlFor="po-carton-length" error={errors.cartonLength?.message} className="sm:col-span-2">
          <DimensionsField
            idPrefix="po-carton"
            value={{ length: cartonLength, width: cartonWidth, height: cartonHeight }}
            unit={cartonUnit}
            onChange={(next) => {
              setValue('cartonLength', next.length, { shouldDirty: true })
              setValue('cartonWidth', next.width, { shouldDirty: true })
              setValue('cartonHeight', next.height, { shouldDirty: true })
            }}
            onUnitChange={(unit, converted) => {
              setValue('cartonUnit', unit, { shouldDirty: true })
              setValue('cartonLength', converted.length)
              setValue('cartonWidth', converted.width)
              setValue('cartonHeight', converted.height)
            }}
            errors={{ length: errors.cartonLength?.message }}
            disabled={readOnly}
          />
        </FormField>
        <FormField label="No. of master cartons" htmlFor="po-cartons" error={errors.masterCartons?.message}>
          <input id="po-cartons" inputMode="numeric" className={cn(fieldClass(errors.masterCartons?.message), 'text-right')} disabled={readOnly} {...register('masterCartons')} />
        </FormField>
      </CardContent>
    </Card>
  )
}
