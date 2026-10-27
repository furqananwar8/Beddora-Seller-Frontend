'use client'

import React, { useMemo } from 'react'
import { getCountryCallingCode, getExampleNumber, isSupportedCountry, parsePhoneNumberFromString, validatePhoneNumberLength, type CountryCode } from 'libphonenumber-js'
import examples from 'libphonenumber-js/examples.mobile.json'
import { fieldClass } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetCountriesQuery, type GeoCountry } from '@/services/api/geo.api'
import { cn } from '@/utils/cn'

/** A phone as a form edits it: its country, and the digits after the country's calling code. */
export interface PhoneValue {
  /** ISO 3166-1 alpha-2, '' while none is picked. */
  country: string
  /** National digits only, without the calling code. */
  number: string
}

export const EMPTY_PHONE: PhoneValue = { country: '', number: '' }

interface Dialable extends GeoCountry {
  callingCode: string
}

const asCode = (country: string) => country as CountryCode

/** The phone in international form (`+923001234567`), or '' when there are no digits. */
export const toInternational = ({ country, number }: PhoneValue): string =>
  number && country && isSupportedCountry(country) ? `+${getCountryCallingCode(asCode(country))}${number}` : ''

/** A stored phone (`+92…`, with or without a country) back into what the field edits. */
export function fromInternational(phone: string, country = ''): PhoneValue {
  const parsed = phone ? parsePhoneNumberFromString(phone, country && isSupportedCountry(country) ? asCode(country) : undefined) : undefined
  return parsed ? { country: parsed.country ?? country, number: parsed.nationalNumber } : { country, number: phone.replace(/\D/g, '') }
}

/** Whether the digits make a real number for the country (length and number plan). */
export const isValidPhone = ({ country, number }: PhoneValue): boolean =>
  Boolean(number && country && isSupportedCountry(country) && parsePhoneNumberFromString(number, asCode(country))?.isValid())

interface PhoneFieldProps {
  idPrefix: string
  value: PhoneValue
  onChange: (next: PhoneValue) => void
  error?: string
  disabled?: boolean
}

/**
 * A phone number: the country (which fixes its calling code, shown locked in front of the number) and the local
 * digits. Typing stops once the number is as long as that country's numbers get; the placeholder is an example.
 */
export const PhoneField: React.FC<PhoneFieldProps> = ({ idPrefix, value, onChange, error, disabled }) => {
  const { data: countries = [], isLoading } = useGetCountriesQuery()
  // Only countries the phone metadata knows, each with its calling code
  const dialable = useMemo<Dialable[]>(
    () => countries.filter((country) => isSupportedCountry(country.code)).map((country) => ({ ...country, callingCode: getCountryCallingCode(asCode(country.code)) })),
    [countries]
  )
  const picked = dialable.find((country) => country.code === value.country) ?? null
  const example = picked ? getExampleNumber(asCode(picked.code), examples) : undefined
  const placeholder = example ? example.formatInternational().replace(`+${picked!.callingCode}`, '').trim() : 'Pick the country first'

  const type = (raw: string) => {
    let number = raw.replace(/\D/g, '')
    // Longer than any number of this country (a paste, or one key too many): keep only the digits that fit
    while (picked && number && validatePhoneNumberLength(number, asCode(picked.code)) === 'TOO_LONG') number = number.slice(0, -1)
    onChange({ ...value, number })
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
      <SearchableSelect<Dialable>
        id={`${idPrefix}-country`}
        ariaLabel="Phone country"
        value={picked}
        // A new country keeps the digits only while they still fit it
        onChange={(next) => next.code !== value.country && onChange({ country: next.code, number: validatePhoneNumberLength(value.number, asCode(next.code)) === 'TOO_LONG' ? '' : value.number })}
        options={dialable}
        getKey={(country) => country.code}
        getLabel={(country) => `${country.name} (+${country.callingCode})`}
        renderValue={(country) => `${country.code} +${country.callingCode}`}
        loading={isLoading}
        placeholder="Country"
        searchPlaceholder="Country or calling code"
        error={error && !picked ? error : undefined}
        disabled={disabled}
      />
      <div className={cn('flex items-stretch overflow-hidden rounded-lg', disabled || !picked ? 'opacity-90' : '')}>
        <span
          aria-hidden
          className={cn('flex shrink-0 items-center rounded-l-lg border border-r-0 px-3 text-sm text-text-secondary', error ? 'border-danger-500 bg-danger-50' : 'border-border bg-secondary-50')}
        >
          {picked ? `+${picked.callingCode}` : '+'}
        </span>
        <input
          id={`${idPrefix}-number`}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          aria-label={picked ? `Phone number after +${picked.callingCode}` : 'Phone number'}
          value={value.number}
          onChange={(event) => type(event.target.value)}
          placeholder={placeholder}
          className={cn(fieldClass(error), 'rounded-l-none')}
          disabled={disabled || !picked}
        />
      </div>
    </div>
  )
}
