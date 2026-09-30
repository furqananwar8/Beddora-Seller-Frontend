'use client'

import React from 'react'
import { Control, Controller, FieldErrors, UseFormRegister } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import type { PartnerType } from '@/services/api/finance.api'
import { FormField, fieldClass } from '../shared/FormField'
import { CountrySelect } from './CountrySelect'
import { CURRENCIES, PARTNER_TYPE_OPTIONS, type PartnerFormValues } from './partnerSchema'

interface BasicDetailsSectionProps {
  register: UseFormRegister<PartnerFormValues>
  control: Control<PartnerFormValues>
  errors: FieldErrors<PartnerFormValues>
  similarNames: string[]
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

      <FormField label="Country" htmlFor="partner-country" error={errors.country?.message}>
        <CountrySelect id="partner-country" error={errors.country?.message} {...register('country')} />
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

      <FormField label="Email" htmlFor="partner-email" error={errors.email?.message}>
        <input id="partner-email" type="email" autoComplete="off" className={fieldClass(errors.email?.message)} {...register('email')} />
      </FormField>

      <FormField label="Address" htmlFor="partner-address" error={errors.address?.message} className="sm:col-span-2">
        <input id="partner-address" autoComplete="off" className={fieldClass(errors.address?.message)} {...register('address')} />
      </FormField>

      <FormField label="Currency" htmlFor="partner-currency" required error={errors.currency?.message}>
        <select id="partner-currency" className={fieldClass(errors.currency?.message)} {...register('currency')}>
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </FormField>
    </CardContent>
  </Card>
)
