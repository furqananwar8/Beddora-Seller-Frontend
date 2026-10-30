'use client'

import React from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetCountriesQuery, type GeoCountry } from '@/services/api/geo.api'
import { cn } from '@/utils/cn'

interface CountrySelectProps {
  id: string
  /** ISO alpha-2, '' for none. */
  value: string
  onChange: (code: string) => void
  error?: string
  /** Grey "from product" fill. */
  fromProduct?: boolean
  ariaLabel?: string
}

/** One country, searched by name; shows "Name (XX)". */
export const CountrySelect: React.FC<CountrySelectProps> = ({ id, value, onChange, error, fromProduct, ariaLabel }) => {
  const { data: countries = [], isLoading } = useGetCountriesQuery()
  const picked = countries.find((country) => country.code === value) ?? (value ? { code: value, name: value, currency: null } : null)
  return (
    <SearchableSelect<GeoCountry>
      id={id}
      ariaLabel={ariaLabel}
      value={picked}
      onChange={(country) => onChange(country.code)}
      options={countries}
      getKey={(country) => country.code}
      getLabel={(country) => `${country.name} (${country.code})`}
      loading={isLoading}
      placeholder="Select country"
      searchPlaceholder="Search countries..."
      error={error}
      triggerClassName={cn(fromProduct && !error && 'bg-secondary-50')}
    />
  )
}
