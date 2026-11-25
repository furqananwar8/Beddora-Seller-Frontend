'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Controller, UseFormReturn, useWatch } from 'react-hook-form'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import { useGetPoWarehousesQuery, type PoCurrency, type PoDestination, type PoWarehouse, type ProductPlatform } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatCalendarDay } from '@/utils/format'
import { DESTINATION_OPTIONS } from '../shared/poMeta'
import { SupplierSelect } from '../shared/SupplierSelect'
import { WarehouseSelect, warehouseAddress } from '../shared/WarehouseSelect'
import type { PoFormValues } from './poForm'

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

/** Business-calendar today (the app's Los Angeles day, as the header clock shows); the server owns the real countdown. */
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())

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

/** The warehouse the goods are delivered to (Settings > Warehouses): optional, with its address shown once picked. */
const WarehouseField: React.FC<SectionProps> = ({ form, readOnly }) => {
  const {
    control,
    setValue,
    formState: { errors },
  } = form
  const picked = useWatch({ control, name: 'warehouseId' })
  const { data: warehouses = [] } = useGetPoWarehousesQuery()
  // A warehouse just added is known before the list refetches
  const [added, setAdded] = useState<PoWarehouse | null>(null)
  const selected = [...warehouses, ...(added ? [added] : [])].find((warehouse) => String(warehouse.id) === picked) ?? null
  const clear = () => {
    setValue('warehouseId', '', { shouldDirty: true })
  }
  return (
    <FormField
      label="Warehouse address"
      htmlFor="po-warehouse"
      error={errors.warehouseId?.message}
      hint={
        selected ? (
          <span>
            {warehouseAddress(selected)}
            {!readOnly && (
              <>
                {' · '}
                <button type="button" className="font-medium text-primary-600 hover:underline" onClick={clear}>
                  Clear
                </button>
              </>
            )}
          </span>
        ) : (
          'Where the goods are delivered · optional · includes “+ Add new warehouse”'
        )
      }
      className="sm:col-span-2 lg:col-span-3"
    >
      <Controller
        control={control}
        name="warehouseId"
        render={({ field }) => (
          <WarehouseSelect
            id="po-warehouse"
            value={field.value ? Number(field.value) : null}
            error={errors.warehouseId?.message}
            disabled={readOnly}
            onChange={(warehouse) => {
              setAdded(warehouse)
              field.onChange(String(warehouse.id))
            }}
          />
        )}
      />
    </FormField>
  )
}

interface OrderDetailsProps extends SectionProps {
  /** The brand cannot change once the PO was submitted: its approval rule depends on it. */
  platformLocked?: boolean
}

const PLATFORMS: Array<{ value: ProductPlatform; label: string }> = [
  { value: 'ECOMMERCE', label: 'Ecommerce' },
  { value: 'RETAIL', label: 'Retail' },
]

export const PoOrderDetailsSection: React.FC<OrderDetailsProps> = ({ form, readOnly, platformLocked }) => {
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = form
  const etd = useWatch({ control, name: 'etd' })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="Brand" required hint={platformLocked ? 'Fixed once submitted: it picks the approval rule' : 'Only this brand\'s products can be added. Switching clears the products.'}>
          <Controller
            control={control}
            name="platform"
            render={({ field }) => (
              <SegmentedToggle<ProductPlatform>
                ariaLabel="Brand"
                value={field.value}
                onChange={(next) => {
                  if (next === field.value) return
                  field.onChange(next)
                  // A PO is for one brand: the other brand's products leave the batches
                  const batches = getValues('batches')
                  if (batches.some((batch) => batch.lines.length > 0)) setValue('batches', batches.map((batch) => ({ ...batch, lines: [] })), { shouldDirty: true })
                }}
                options={PLATFORMS}
                disabled={readOnly || platformLocked}
              />
            )}
          />
        </FormField>
        <FormField label="Destination" required hint="Drives the container's city list later">
          <Controller
            control={control}
            name="destination"
            render={({ field }) => <SegmentedToggle<PoDestination> ariaLabel="Destination" value={field.value} onChange={field.onChange} options={DESTINATION_OPTIONS} disabled={readOnly} />}
          />
        </FormField>
        <FormField label="Currency" required>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => <SegmentedToggle<PoCurrency> ariaLabel="Currency" value={field.value} onChange={field.onChange} options={CURRENCIES} disabled={readOnly} />}
          />
        </FormField>
        <FormField
          label="ERD"
          htmlFor="po-etd"
          required
          error={errors.etd?.message}
          hint={
            etd ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <EtdCountdown etd={etd} />
                <span>Reminders from {formatCalendarDay(minusDays(etd, 10))} · daily if overdue</span>
              </span>
            ) : undefined
          }
        >
          <Controller
            control={control}
            name="etd"
            render={({ field }) => (
              <SingleDatePicker id="po-etd" value={field.value} onChange={field.onChange} placeholder="Select date" error={errors.etd?.message} disabled={readOnly} />
            )}
          />
        </FormField>
        <WarehouseField form={form} readOnly={readOnly} />
        <FormField
          label="Payment terms"
          htmlFor="po-payment-terms"
          className="sm:col-span-2 lg:col-span-3"
          error={errors.paymentTerms?.message}
          hint="Optional · up to 200 characters · replaces the supplier's term on the PDF"
        >
          <textarea
            id="po-payment-terms"
            rows={2}
            maxLength={200}
            readOnly={readOnly}
            className={cn(fieldClass(errors.paymentTerms?.message), 'h-auto max-h-32 min-h-0 w-full resize-y overflow-y-auto py-2')}
            {...form.register('paymentTerms')}
          />
        </FormField>
      </CardContent>
    </Card>
  )
}
