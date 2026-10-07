'use client'

import React from 'react'
import { InlineAddFooter } from '@/components/searchable-select/InlineAddFooter'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetPoProductSummaryQuery } from '@/services/api/procurement.api'
import { colorOptions } from './colors'

interface ColorSelectProps {
  id?: string
  value: string
  onChange: (color: string) => void
  error?: string
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

const identity = (color: string) => color

/**
 * The one color picker, built like {@link CategorySelect}: common colors and the ones already used on products,
 * with "+ Add color" for anything else. A new color is saved with the product and offered from then on.
 */
export const ColorSelect: React.FC<ColorSelectProps> = ({ id, value, onChange, error, disabled, className, 'aria-label': ariaLabel }) => {
  const { data: summary, isLoading } = useGetPoProductSummaryQuery()
  const options = colorOptions(summary?.colors ?? [], value)

  // An existing color of that name (any case) is picked instead of duplicated
  const add = (name: string) => {
    onChange(options.find((color) => color.toLowerCase() === name.toLowerCase()) ?? name)
    return null
  }

  return (
    <SearchableSelect<string>
      id={id}
      ariaLabel={ariaLabel}
      value={value || null}
      onChange={onChange}
      options={options}
      getKey={identity}
      getLabel={identity}
      loading={isLoading}
      placeholder="Select color"
      searchPlaceholder="Search colors..."
      emptyText="No color by that name."
      error={error}
      disabled={disabled}
      triggerClassName={className}
      footer={disabled ? undefined : (close) => <InlineAddFooter noun="color" onAdd={add} close={close} />}
    />
  )
}
