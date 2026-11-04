'use client'

import React from 'react'
import Link from 'next/link'
import { Controller, useFormContext } from 'react-hook-form'
import { AddressFields } from '@/components/address-fields/AddressFields'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { PhoneField } from '@/components/phone-field/PhoneField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Button } from '@/design-system/buttons'
import type { ShipFromOption } from '../types'
import { SectionCard } from '../shared/Card'
import { isCrossBorder } from './shipmentRequest'
import type { ShipmentFormValues } from './shipmentSchema'
import { WizardFooter } from './WizardFooter'

interface AddressStepProps {
  addresses: ShipFromOption[]
  loadingAddresses: boolean
  shipFrom: ShipFromOption | undefined
  onCancel: () => void
  /** Validates the address fields and moves on when they are fine. */
  onContinue: () => void
}

const RESIDENTIAL_OPTIONS = [
  { value: 'RESIDENTIAL' as const, label: 'Residential' },
  { value: 'BUSINESS' as const, label: 'Business' },
]

/** The ship-from picked up front: the first warehouse, else the default saved address, else the only option. */
export const defaultShipFrom = (options: ShipFromOption[]): ShipFromOption | undefined =>
  options.find((option) => option.kind === 'warehouse') ?? options.find((option) => option.isDefault) ?? (options.length === 1 ? options[0] : undefined)

/** "Main warehouse (Warehouse)", "Office (default)". */
const shipFromLabel = (option: ShipFromOption) => `${option.label}${option.kind === 'warehouse' ? ' (Warehouse)' : option.isDefault ? ' (default)' : ''}`

/** A ship-from place as a small card; a warehouse ships under the company's name and phone. */
export const ShipFromCard: React.FC<{ address: ShipFromOption }> = ({ address }) => (
  <div className="rounded-lg bg-secondary-50 p-3 text-sm leading-6 text-text-secondary">
    <span className="font-semibold text-text-primary">{address.companyName || address.name}</span>
    {address.companyName && <span> · {address.name}</span>}
    <br />
    {[address.addressLine1, address.addressLine2].filter(Boolean).join(', ')}
    <br />
    {address.city}, {address.stateOrProvinceCode} {address.postalCode} · {address.countryCode}
    <br />
    <span className="text-text-muted">{[address.phoneNumber, address.email].filter(Boolean).join(' · ')}</span>
    {address.missing.length > 0 && <p className="mt-2 text-xs text-danger-600">Can't ship from here yet. Add: {address.missing.join(', ')}</p>}
  </div>
)

/** Pick the saved ship-from address, shown as a card. */
export const ShipFromSection: React.FC<{ addresses: ShipFromOption[]; loadingAddresses: boolean; shipFrom: ShipFromOption | undefined }> = ({ addresses, loadingAddresses, shipFrom }) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<ShipmentFormValues>()
  const error = errors.shipFromId?.message
  return (
    <SectionCard title="Ship from" subtitle="saved addresses and warehouses">
      <FormField label="Address" htmlFor="ship-from" required error={error}>
        <Controller
          control={control}
          name="shipFromId"
          render={({ field }) => (
            <SearchableSelect<ShipFromOption>
              id="ship-from"
              value={shipFrom ?? null}
              onChange={(address) => field.onChange(address.id)}
              options={addresses}
              getKey={(address) => address.id}
              getLabel={shipFromLabel}
              loading={loadingAddresses}
              placeholder="Select address"
              searchPlaceholder="Search addresses and warehouses..."
              emptyText="No saved addresses or warehouses yet."
              error={error}
            />
          )}
        />
      </FormField>
      {shipFrom && <ShipFromCard address={shipFrom} />}
      <p className="mt-3 text-xs text-text-muted">
        Manage them in{' '}
        <Link href="/dashboard/settings/addresses" className="text-primary-600 hover:underline">
          Settings › Addresses
        </Link>{' '}
        and{' '}
        <Link href="/dashboard/settings/warehouses" className="text-primary-600 hover:underline">
          Settings › Warehouses
        </Link>
      </p>
    </SectionCard>
  )
}

/** The customer's address, phone and email, residential or business; prefilled from a channel order. */
export const ShipToSection: React.FC = () => {
  const {
    register,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<ShipmentFormValues>()
  const e = errors.shipTo
  return (
    <SectionCard
      title="Ship to"
      subtitle="customer"
      aside={
        <Controller
          control={control}
          name="shipTo.residential"
          render={({ field }) => (
            <SegmentedToggle ariaLabel="Residential or business address" value={field.value ? 'RESIDENTIAL' : 'BUSINESS'} onChange={(value) => field.onChange(value === 'RESIDENTIAL')} options={RESIDENTIAL_OPTIONS} />
          )}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Full name" htmlFor="ship-to-name" required error={e?.name?.message}>
          <input id="ship-to-name" autoComplete="off" className={fieldClass(e?.name?.message)} {...register('shipTo.name')} />
        </FormField>
        <FormField label="Company" htmlFor="ship-to-company">
          <input id="ship-to-company" autoComplete="off" placeholder="Optional" className={fieldClass()} {...register('shipTo.company')} />
        </FormField>
        <FormField label="Address line 1" htmlFor="ship-to-address1" required error={e?.address1?.message}>
          <input id="ship-to-address1" autoComplete="off" className={fieldClass(e?.address1?.message)} {...register('shipTo.address1')} />
        </FormField>
        <FormField label="Address line 2" htmlFor="ship-to-address2">
          <input id="ship-to-address2" autoComplete="off" placeholder="Apt, suite, unit" className={fieldClass()} {...register('shipTo.address2')} />
        </FormField>
        <Controller
          control={control}
          name="shipTo.address"
          render={({ field }) => (
            <AddressFields
              idPrefix="ship-to"
              value={field.value}
              onChange={(address) => {
                // The phone's calling code follows the ship-to country, unless the user picked another one for the phone
                const phone = getValues('shipTo.phone')
                if (address.country !== field.value.country && (!phone.country || phone.country === field.value.country)) setValue('shipTo.phone', { ...phone, country: address.country }, { shouldValidate: true })
                field.onChange(address)
              }}
              errors={{ country: e?.address?.country?.message, province: e?.address?.province?.message, city: e?.address?.city?.message, postalCode: e?.address?.postalCode?.message }}
            />
          )}
        />
        <FormField label="Phone" htmlFor="ship-to-phone-number" required error={e?.phone?.message} hint="The calling code follows the country">
          <Controller control={control} name="shipTo.phone" render={({ field }) => <PhoneField idPrefix="ship-to-phone" value={field.value} onChange={field.onChange} error={e?.phone?.message} />} />
        </FormField>
        <FormField label="Email" htmlFor="ship-to-email" error={e?.email?.message} hint="Used for carrier delivery notifications">
          <input id="ship-to-email" autoComplete="off" className={fieldClass(e?.email?.message)} {...register('shipTo.email')} />
        </FormField>
      </div>
    </SectionCard>
  )
}

/** Step 1: where the parcel ships from (saved addresses) and to (the customer). Errors show once Continue is pressed. */
export const AddressStep: React.FC<AddressStepProps> = ({ addresses, loadingAddresses, shipFrom, onCancel, onContinue }) => {
  const {
    watch,
    formState: { errors },
  } = useFormContext<ShipmentFormValues>()
  const shipTo = watch('shipTo')
  const problems = Object.keys(errors).length

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ShipFromSection addresses={addresses} loadingAddresses={loadingAddresses} shipFrom={shipFrom} />
        <ShipToSection />
      </div>

      {isCrossBorder({ shipTo }, shipFrom) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold">Cross-border</span>
          {shipFrom?.countryCode} → {shipTo.address.country} shipment: customs lines and a duties option are required in the next step.
        </div>
      )}

      <WizardFooter
        start={
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        }
        hint={problems > 0 ? 'Fill the highlighted fields to continue' : undefined}
      >
        <Button onClick={onContinue}>Continue to Shipment Info</Button>
      </WizardFooter>
    </>
  )
}
