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
  disabled?: boolean
  /**
   * The codes to offer. Left out, the shipping catalogue is loaded (Shipping permission); screens outside Shipping
   * pass the catalogue they can read.
   */
  catalogue?: HsCodeOption[]
  catalogueLoading?: boolean
  /** Offer "No HS code" first, for places where the code is optional. */
  allowNone?: boolean
  /** How a held code that isn't in the catalogue is described. */
  unknownLabel?: string
}

const digits = (code: string) => code.replace(/\D/g, '')

/** 6302319010 → 6302.31.9010 */
export const formatHsCode = (code: string) => {
  const d = digits(code)
  return d.length === 10 ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}` : code
}

const NONE: HsCodeOption = { code: '', label: 'No HS code' }

/**
 * Picks an HS code from the codes we ship under. On a customs line it arrives preselected (the product's, else its
 * category's); on a product it is optional. A held code that isn't in the catalogue stays selectable as it is.
 */
export const HsCodeSelect: React.FC<HsCodeSelectProps> = ({
  id,
  value,
  onChange,
  error,
  prefilled,
  ariaLabel,
  disabled,
  catalogue: given,
  catalogueLoading,
  allowNone,
  unknownLabel = 'From the product',
}) => {
  const shipping = useGetHsCodesQuery(undefined, { skip: given !== undefined })
  const catalogue = given ?? shipping.data ?? []
  const isLoading = given !== undefined ? Boolean(catalogueLoading) : shipping.isLoading

  const options = useMemo<HsCodeOption[]>(() => {
    const known = value && !catalogue.some((option) => digits(option.code) === digits(value)) ? [{ code: value, label: unknownLabel }, ...catalogue] : catalogue
    return allowNone ? [NONE, ...known] : known
  }, [catalogue, value, allowNone, unknownLabel])
  const picked = value ? options.find((option) => option.code && digits(option.code) === digits(value)) ?? null : allowNone ? NONE : null

  return (
    <SearchableSelect<HsCodeOption>
      id={id}
      ariaLabel={ariaLabel}
      value={picked}
      onChange={(option) => onChange(option.code)}
      options={options}
      getKey={(option) => option.code || 'none'}
      getLabel={(option) => (option.code ? `${formatHsCode(option.code)} · ${option.label}` : option.label)}
      loading={isLoading}
      disabled={disabled}
      placeholder="Pick an HS code"
      searchPlaceholder="Search code or goods…"
      error={error}
      triggerClassName={cn(prefilled && !error && 'bg-secondary-50')}
    />
  )
}
