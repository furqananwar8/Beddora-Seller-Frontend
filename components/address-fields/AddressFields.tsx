'use client'

import React, { useState } from 'react'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetCitiesQuery, useGetCountriesQuery, useGetProvincesQuery, type GeoCity, type GeoCountry, type GeoProvince } from '@/services/api/geo.api'
import { useDebounce } from '@/utils/debounce'

export interface AddressValue {
  country: string
  province: string
  city: string
  postalCode: string
}

export type AddressErrors = Partial<Record<keyof AddressValue, string>>

interface AddressFieldsProps {
  idPrefix: string
  value: AddressValue
  onChange: (next: AddressValue) => void
  errors?: AddressErrors
  disabled?: boolean
}

/** City search for one country, optionally narrowed to a province. Shared with any form that picks a city. */
export function useCitySearch(country: string, province?: string) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounce(search, 250)
  const { data, isFetching } = useGetCitiesQuery({ country, province, search: debounced, limit: 100 }, { skip: !country || !open })
  // One-row probe, so the form knows up front whether this area takes free text
  const { data: probe } = useGetCitiesQuery({ country, province, limit: 1 }, { skip: !country })
  return { search, setSearch, setOpen, cities: data?.cities ?? [], freeText: probe?.freeText ?? false, isFetching }
}

/**
 * Country → province → city → postal code. Each level only offers values that exist inside
 * the level above it, and changing a level clears the levels below it. The server checks
 * the same chain, so this is guidance, not the guard.
 */
export const AddressFields: React.FC<AddressFieldsProps> = ({ idPrefix, value, onChange, errors = {}, disabled }) => {
  const { data: countries = [], isLoading: loadingCountries } = useGetCountriesQuery()
  const { data: provinceList, isFetching: loadingProvinces } = useGetProvincesQuery(value.country, { skip: !value.country })
  const provinces = provinceList?.provinces ?? []
  const cityLookup = useCitySearch(value.country, value.province || undefined)

  const country = countries.find((item) => item.code === value.country) ?? null
  const province = provinces.find((item) => item.code === value.province) ?? null
  const needsProvince = provinces.length > 0
  const cityLocked = disabled || !value.country || (needsProvince && !value.province)
  // Areas the dataset has no cities for take free text, decided by the server
  const typedCity = !cityLocked && cityLookup.freeText

  const set = (patch: Partial<AddressValue>) => onChange({ ...value, ...patch })

  return (
    <>
      <FormField label="Country" htmlFor={`${idPrefix}-country`} error={errors.country}>
        <SearchableSelect<GeoCountry>
          id={`${idPrefix}-country`}
          value={country ?? (value.country ? { code: value.country, name: value.country, currency: null } : null)}
          onChange={(next) => next.code !== value.country && set({ country: next.code, province: '', city: '', postalCode: '' })}
          options={countries}
          getKey={(item) => item.code}
          getLabel={(item) => item.name}
          loading={loadingCountries}
          placeholder="Select country"
          searchPlaceholder="Search countries..."
          error={errors.country}
          disabled={disabled}
        />
      </FormField>

      <FormField
        label="Province / state"
        htmlFor={`${idPrefix}-province`}
        error={errors.province}
        hint={value.country && !loadingProvinces && !needsProvince ? 'No provinces listed for this country' : undefined}
      >
        <SearchableSelect<GeoProvince>
          id={`${idPrefix}-province`}
          value={province}
          onChange={(next) => next.code !== value.province && set({ province: next.code, city: '' })}
          options={provinces}
          getKey={(item) => item.code}
          getLabel={(item) => item.name}
          loading={loadingProvinces}
          placeholder={value.country ? 'Select province / state' : 'Pick a country first'}
          searchPlaceholder="Search provinces..."
          error={errors.province}
          disabled={disabled || !value.country || !needsProvince}
        />
      </FormField>

      <FormField label="City" htmlFor={`${idPrefix}-city`} error={errors.city}>
        {typedCity ? (
          <input
            id={`${idPrefix}-city`}
            autoComplete="off"
            value={value.city}
            onChange={(event) => set({ city: event.target.value })}
            className={fieldClass(errors.city)}
            disabled={disabled}
          />
        ) : (
          <SearchableSelect<GeoCity>
            id={`${idPrefix}-city`}
            value={value.city ? { name: value.city, provinceCode: value.province } : null}
            onChange={(next) => set({ city: next.name })}
            options={cityLookup.cities}
            getKey={(item) => `${item.provinceCode}:${item.name}`}
            getLabel={(item) => item.name}
            search={cityLookup.search}
            onSearchChange={cityLookup.setSearch}
            onOpenChange={cityLookup.setOpen}
            loading={cityLookup.isFetching}
            placeholder={cityLocked ? (value.country ? 'Pick a province first' : 'Pick a country first') : 'Select city'}
            searchPlaceholder="Search cities..."
            emptyText="No city by that name here."
            error={errors.city}
            disabled={cityLocked}
          />
        )}
      </FormField>

      <FormField
        label="Postal code"
        htmlFor={`${idPrefix}-postal`}
        error={errors.postalCode}
        hint={provinceList?.postalCodeExample ? `e.g. ${provinceList.postalCodeExample}` : undefined}
      >
        <input
          id={`${idPrefix}-postal`}
          autoComplete="off"
          value={value.postalCode}
          onChange={(event) => set({ postalCode: event.target.value.toUpperCase() })}
          placeholder={provinceList?.postalCodeExample}
          className={fieldClass(errors.postalCode)}
          disabled={disabled || !value.country}
        />
      </FormField>
    </>
  )
}
