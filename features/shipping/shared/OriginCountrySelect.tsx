'use client'

import React from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { cn } from '@/utils/cn'
import { ORIGIN_COUNTRIES } from '../create/shipmentForm'

type Origin = (typeof ORIGIN_COUNTRIES)[number]

interface OriginCountrySelectProps {
  id: string
  /** ISO alpha-2. */
  value: string
  onChange: (code: string) => void
  error?: string
  /** Grey fill: the country came from the product. */
  prefilled?: boolean
  ariaLabel?: string
}

/** Country of origin: Canada (the default) or the USA, the only places goods are shipped from for now. */
export const OriginCountrySelect: React.FC<OriginCountrySelectProps> = ({ id, value, onChange, error, prefilled, ariaLabel }) => (
  <SearchableSelect<Origin>
    id={id}
    ariaLabel={ariaLabel}
    searchable={false}
    value={ORIGIN_COUNTRIES.find((country) => country.code === value) ?? null}
    onChange={(country) => onChange(country.code)}
    options={[...ORIGIN_COUNTRIES]}
    getKey={(country) => country.code}
    getLabel={(country) => `${country.name} (${country.code})`}
    placeholder="Select country"
    error={error}
    triggerClassName={cn(prefilled && !error && 'bg-secondary-50')}
  />
)
