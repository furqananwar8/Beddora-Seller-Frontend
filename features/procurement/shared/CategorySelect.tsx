'use client'

import React from 'react'
import { InlineAddFooter } from '@/components/searchable-select/InlineAddFooter'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { apiErrorMessage } from '@/hooks/useApiFeedback'
import { useCreatePoCategoryMutation, useGetPoCategoriesQuery, type CategoryRef } from '@/services/api/procurement.api'

interface CategorySelectProps {
  id?: string
  value: CategoryRef | null
  onChange: (category: CategoryRef | null) => void
  /** Offers "All categories" first: for filters, not forms. */
  allowAll?: boolean
  /** Shows "+ Add category" in the menu. */
  canAdd?: boolean
  error?: string
  disabled?: boolean
  highlighted?: boolean
  placeholder?: string
}

const ALL: CategoryRef = { id: 0, name: 'All categories' }

/** The one category dropdown: product form, each variation, and the products filter. */
export const CategorySelect: React.FC<CategorySelectProps> = ({ id, value, onChange, allowAll, canAdd, error, disabled, highlighted, placeholder = 'Select category' }) => {
  const { data: categories = [], isLoading } = useGetPoCategoriesQuery()
  const [createCategory, { isLoading: creating }] = useCreatePoCategoryMutation()

  const options = allowAll ? [ALL, ...categories] : categories

  const add = async (name: string) => {
    try {
      onChange(await createCategory(name).unwrap())
      return null
    } catch (cause) {
      // An existing category of that name is picked instead of failing
      const existing = (cause as { data?: { category?: CategoryRef } }).data?.category
      if (existing) {
        onChange(existing)
        return null
      }
      return apiErrorMessage(cause, 'Could not add the category')
    }
  }

  return (
    <SearchableSelect<CategoryRef>
      id={id}
      value={value ?? (allowAll ? ALL : null)}
      onChange={(next) => onChange(next.id === 0 ? null : next)}
      options={options}
      getKey={(category) => category.id}
      getLabel={(category) => category.name}
      loading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="Search categories..."
      emptyText="No category by that name."
      error={error}
      disabled={disabled}
      highlighted={highlighted}
      footer={canAdd ? (close) => <InlineAddFooter noun="category" onAdd={add} close={close} busy={creating} /> : undefined}
    />
  )
}
