"use client"

import React from 'react'
import { Input } from '@/design-system/inputs'
import type { ShipFromAddress } from './types'
import { COUNTRY_OPTIONS, countryName } from './countries'

/** Form fields are strings so the inputs stay editable; toAddress() trims and drops empty optionals. */
export interface AddressFields {
  label: string
  name: string
  companyName: string
  addressLine1: string
  addressLine2: string
  city: string
  stateOrProvinceCode: string
  postalCode: string
  countryCode: string
  phoneNumber: string
  email: string
}

export type AddressErrors = Partial<Record<keyof AddressFields, string>>

export const emptyAddress = (): AddressFields => ({
  label: '',
  name: '',
  companyName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  stateOrProvinceCode: '',
  postalCode: '',
  countryCode: 'CA',
  phoneNumber: '',
  email: '',
})

export const fieldsFrom = (a: ShipFromAddress & { label?: string }): AddressFields => ({
  label: a.label ?? '',
  name: a.name,
  companyName: a.companyName ?? '',
  addressLine1: a.addressLine1,
  addressLine2: a.addressLine2 ?? '',
  city: a.city,
  stateOrProvinceCode: a.stateOrProvinceCode ?? '',
  postalCode: a.postalCode,
  countryCode: a.countryCode,
  phoneNumber: a.phoneNumber,
  email: a.email ?? '',
})

/** Same rules the backend enforces, so mistakes show before the request. */
export function validateAddress(f: AddressFields): AddressErrors {
  const errors: AddressErrors = {}
  if (!f.name.trim()) errors.name = 'Contact name is required'
  if (!f.addressLine1.trim()) errors.addressLine1 = 'Address line 1 is required'
  if (!f.city.trim()) errors.city = 'City is required'
  if (!f.postalCode.trim()) errors.postalCode = 'Postal code is required'
  if (!f.countryCode) errors.countryCode = 'Choose a country'
  else if (['US', 'CA', 'MX'].includes(f.countryCode.trim().toUpperCase()) && !f.stateOrProvinceCode.trim()) {
    errors.stateOrProvinceCode = 'Required for US, CA and MX'
  }
  if (f.phoneNumber.trim().length < 5) errors.phoneNumber = 'Phone number is required'
  if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) errors.email = 'Enter a valid email'
  return errors
}

export function toAddress(f: AddressFields): ShipFromAddress & { label?: string } {
  const opt = (v: string) => v.trim() || undefined
  return {
    label: opt(f.label),
    name: f.name.trim(),
    companyName: opt(f.companyName),
    addressLine1: f.addressLine1.trim(),
    addressLine2: opt(f.addressLine2),
    city: f.city.trim(),
    stateOrProvinceCode: opt(f.stateOrProvinceCode),
    postalCode: f.postalCode.trim(),
    countryCode: f.countryCode.trim().toUpperCase(),
    phoneNumber: f.phoneNumber.trim(),
    email: opt(f.email),
  }
}

/** One-line summary: "123 Main St, Toronto, ON M5V 1A1, CA". */
export const formatAddressLine = (a: ShipFromAddress): string =>
  [a.addressLine1, a.addressLine2, a.city, [a.stateOrProvinceCode, a.postalCode].filter(Boolean).join(' '), countryName(a.countryCode)]
    .filter(Boolean)
    .join(', ')

interface AddressFormProps {
  value: AddressFields
  onChange: (next: AddressFields) => void
  /** Show validation messages (after the first submit attempt). */
  showErrors?: boolean
  /** Ask for a label ("Warehouse 1") so the address is easy to find in the book. */
  withLabel?: boolean
}

export const AddressForm: React.FC<AddressFormProps> = ({ value, onChange, showErrors = false, withLabel = false }) => {
  const errors = showErrors ? validateAddress(value) : {}
  const set = (field: keyof AddressFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [field]: e.target.value })

  return (
    <div className="space-y-5">
      {withLabel && <Input label="Label (optional)" placeholder="e.g. Main warehouse" value={value.label} onChange={set('label')} />}

      <fieldset className="space-y-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">Contact</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input label="Contact name" value={value.name} onChange={set('name')} error={errors.name} />
          <Input label="Company (optional)" value={value.companyName} onChange={set('companyName')} />
          <Input label="Phone" value={value.phoneNumber} onChange={set('phoneNumber')} error={errors.phoneNumber} />
          <Input label="Email (optional)" type="email" value={value.email} onChange={set('email')} error={errors.email} />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">Address</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="md:col-span-3">
            <div className="w-full">
              <label htmlFor="address-country" className="ds-input-label">
                Country
              </label>
              <select
                id="address-country"
                value={value.countryCode}
                onChange={(e) => onChange({ ...value, countryCode: e.target.value })}
                className="ds-input ds-input-default"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.countryCode && <p className="ds-input-error-text">{errors.countryCode}</p>}
            </div>
          </div>
          <div className="md:col-span-3">
            <Input
              label="State / province"
              value={value.stateOrProvinceCode}
              onChange={set('stateOrProvinceCode')}
              error={errors.stateOrProvinceCode}
            />
          </div>
          <div className="md:col-span-6">
            <Input label="Address line 1" value={value.addressLine1} onChange={set('addressLine1')} error={errors.addressLine1} />
          </div>
          <div className="md:col-span-6">
            <Input label="Address line 2 (optional)" value={value.addressLine2} onChange={set('addressLine2')} />
          </div>
          <div className="md:col-span-4">
            <Input label="City" value={value.city} onChange={set('city')} error={errors.city} />
          </div>
          <div className="md:col-span-2">
            <Input label="Postal code" value={value.postalCode} onChange={set('postalCode')} error={errors.postalCode} />
          </div>
        </div>
      </fieldset>
    </div>
  )
}
