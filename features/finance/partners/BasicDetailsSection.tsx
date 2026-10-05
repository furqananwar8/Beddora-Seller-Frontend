'use client'

import React from 'react'
import { Control, Controller, FieldErrors, UseFormRegister, useController } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { AddressFields, type AddressValue } from '@/components/address-fields/AddressFields'
import type { PartnerType } from '@/services/api/finance.api'
import { FormField, fieldClass, selectClass } from '../shared/FormField'
import { SelectShell } from '../shared/SelectShell'
import { CURRENCIES, PARTNER_TYPE_OPTIONS, type PartnerFormValues } from './partnerSchema'

interface BasicDetailsSectionProps {
  register: UseFormRegister<PartnerFormValues>
  control: Control<PartnerFormValues>
  errors: FieldErrors<PartnerFormValues>
  similarNames: string[]
}

/** Binds the four address parts of the partner form to the shared cascading address fields. */
const PartnerAddress: React.FC<{ control: Control<PartnerFormValues>; errors: FieldErrors<PartnerFormValues> }> = ({ control, errors }) => {
  const country = useController({ control, name: 'country' })
  const province = useController({ control, name: 'province' })
  const city = useController({ control, name: 'city' })
  const postalCode = useController({ control, name: 'postalCode' })

  const value: AddressValue = { country: country.field.value, province: province.field.value, city: city.field.value, postalCode: postalCode.field.value }
  const onChange = (next: AddressValue) => {
    if (next.country !== value.country) country.field.onChange(next.country)
    if (next.province !== value.province) province.field.onChange(next.province)
    if (next.city !== value.city) city.field.onChange(next.city)
    if (next.postalCode !== value.postalCode) postalCode.field.onChange(next.postalCode)
  }

  return (
    <AddressFields
      idPrefix="partner"
      value={value}
      onChange={onChange}
      errors={{ country: errors.country?.message, province: errors.province?.message, city: errors.city?.message, postalCode: errors.postalCode?.message }}
    />
  )
}

export const BasicDetailsSection: React.FC<BasicDetailsSectionProps> = ({ register, control, errors, similarNames }) => (
  <Card>
    <CardHeader>
      <CardTitle>Basic details</CardTitle>
    </CardHeader>
    <CardContent className="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Name"
        htmlFor="partner-name"
        required
        error={errors.name?.message}
        hint={
          similarNames.length > 0 ? (
            <span className="text-warning-700">A similar partner already exists: {similarNames.join(', ')}. Check it is not a duplicate.</span>
          ) : undefined
        }
      >
        <input id="partner-name" autoComplete="off" className={fieldClass(errors.name?.message)} {...register('name')} />
      </FormField>

      <FormField label="Type" required error={errors.type?.message} hint="Vendor = services (brokers, terminals) · Supplier = goods & freight">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <SegmentedToggle<PartnerType> ariaLabel="Partner type" value={field.value} onChange={field.onChange} options={PARTNER_TYPE_OPTIONS} />
          )}
        />
      </FormField>

      <FormField label="Contact name" htmlFor="partner-contact" error={errors.contactName?.message} hint="Prefilled on purchase orders; a PO can change it for itself only">
        <input id="partner-contact" autoComplete="off" className={fieldClass(errors.contactName?.message)} {...register('contactName')} />
      </FormField>

      <FormField label="Email" htmlFor="partner-email" error={errors.email?.message}>
        <input id="partner-email" type="email" autoComplete="off" className={fieldClass(errors.email?.message)} {...register('email')} />
      </FormField>

      <PartnerAddress control={control} errors={errors} />

      <FormField label="Street address" htmlFor="partner-address" error={errors.address?.message} className="sm:col-span-2">
        <input id="partner-address" autoComplete="off" className={fieldClass(errors.address?.message)} {...register('address')} />
      </FormField>

      <FormField label="Currency" htmlFor="partner-currency" required error={errors.currency?.message}>
        <SelectShell>
          <select id="partner-currency" className={selectClass(errors.currency?.message)} {...register('currency')}>
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </SelectShell>
      </FormField>
    </CardContent>
  </Card>
)
