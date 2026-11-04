'use client'

import React, { useMemo } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetHsCodesQuery } from '@/services/api/shipping.api'
import { cn } from '@/utils/cn'
import type { HsCodeOption } from '../types'

interface HsCodeSelectProps {
  id: string
  /** The code as held (digits, dots allowed), '' for none. */
  value: string
  onChange: (code: string) => void
  error?: string
  /** Grey fill: the code came from the product or its category. */
  prefilled?: boolean
  ariaLabel?: string
}

const digits = (code: string) => code.replace(/\D/g, '')

/** 6302319010 → 6302.31.9010 */
export const formatHsCode = (code: string) => {
  const d = digits(code)
  return d.length === 10 ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}` : code
}

/**
 * The HS code of a customs line. It arrives preselected (the product's, else its category's) and can be changed
 * to any code we ship under; when nothing could be preselected this is the dropdown to pick from.
 */
export const HsCodeSelect: React.FC<HsCodeSelectProps> = ({ id, value, onChange, error, prefilled, ariaLabel }) => {
  const { data: catalogue = [], isLoading } = useGetHsCodesQuery()
  // A code the product carries that isn't in the catalogue stays selectable as it is
  const options = useMemo<HsCodeOption[]>(() => (value && !catalogue.some((option) => digits(option.code) === digits(value)) ? [{ code: value, label: 'From the product' }, ...catalogue] : catalogue), [catalogue, value])
  const picked = options.find((option) => digits(option.code) === digits(value)) ?? null
  return (
    <SearchableSelect<HsCodeOption>
      id={id}
      ariaLabel={ariaLabel}
      value={picked}
      onChange={(option) => onChange(option.code)}
      options={options}
      getKey={(option) => option.code}
      getLabel={(option) => `${formatHsCode(option.code)} · ${option.label}`}
      loading={isLoading}
      placeholder="Pick an HS code"
      searchPlaceholder="Search code or goods…"
      error={error}
      triggerClassName={cn(prefilled && !error && 'bg-secondary-50')}
    />
  )
}
