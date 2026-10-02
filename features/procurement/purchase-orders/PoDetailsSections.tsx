'use client'

import React from 'react'
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

export const PoSupplierSection: React.FC<SectionProps> = ({ form, readOnly }) => {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form
  const [supplier, contactName] = useWatch({ control, name: ['supplier', 'contactName'] })
  const supplierDefault = supplier?.contactName ?? ''

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
                disabled={readOnly}
                onChange={(next) => {
                  field.onChange(next)
                  // Picking a supplier fills its default contact; a contact typed for this PO is kept only if it was not the old default
                  if (!contactName.trim() || contactName === (supplier?.contactName ?? '')) setValue('contactName', next.contactName ?? '', { shouldDirty: true })
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
            supplier ? (
              <span>
                Kept on this PO only · supplier default: {supplierDefault || '—'}
                {!readOnly && supplierDefault && contactName !== supplierDefault && (
                  <>
                    {' · '}
                    <button type="button" className="font-medium text-primary-600 hover:underline" onClick={() => setValue('contactName', supplierDefault, { shouldDirty: true })}>
                      Reset
                    </button>
                  </>
                )}
              </span>
            ) : undefined
          }
        >
          <input id="po-contact" autoComplete="off" className={fieldClass(errors.contactName?.message)} disabled={readOnly} {...register('contactName')} />
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
