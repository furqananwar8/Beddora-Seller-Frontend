'use client'

import React, { useState } from 'react'
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
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const options = allowAll ? [ALL, ...categories] : categories

  const add = async (close: () => void) => {
    const trimmed = name.trim()
    if (!trimmed) return setAddError('Enter a name')
    try {
      onChange(await createCategory(trimmed).unwrap())
      close()
    } catch (cause) {
      // An existing category of that name is picked instead of failing
      const existing = (cause as { data?: { category?: CategoryRef } }).data?.category
      if (existing) {
        onChange(existing)
        close()
        return
      }
      return setAddError(apiErrorMessage(cause, 'Could not add the category'))
    }
    setAdding(false)
    setName('')
    setAddError(null)
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
      onOpenChange={(open) => !open && (setAdding(false), setAddError(null))}
      footer={
        canAdd
          ? (close) =>
              adding ? (
                <div className="flex flex-col gap-1 px-1 pb-1 pt-2">
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      aria-label="New category name"
                      value={name}
                      maxLength={60}
                      onChange={(event) => setName(event.target.value)}
                      onKeyDown={(event) => {
                        // Enter here adds the category instead of picking a list option
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          event.stopPropagation()
                          void add(close)
                        }
                      }}
                      className="ds-input ds-input-default min-w-0 flex-1 rounded-lg"
                      placeholder="Category name"
                    />
                    <button type="button" onClick={() => void add(close)} disabled={creating} className="ds-button ds-button-primary ds-button-sm shrink-0">
                      Add
                    </button>
                  </div>
                  {addError && <p className="text-xs text-danger-600">{addError}</p>}
                </div>
              ) : (
                <button type="button" onClick={() => setAdding(true)} className="block w-full rounded-md px-2 pb-1 pt-2 text-left text-sm font-medium text-primary-600 hover:underline">
                  + Add category
                </button>
              )
          : undefined
      }
    />
  )
}
