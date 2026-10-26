'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Control, Controller, FieldPathByValue, FieldValues } from 'react-hook-form'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import type { CostCenterOption } from '@/services/api/finance.api'

interface CostCenterSelectProps {
  id?: string
  options: CostCenterOption[] | undefined
  loading?: boolean
  /** The picked cost center's id; null when none. */
  value: number | null
  onChange: (option: CostCenterOption) => void
  error?: string
  /** Where "+ Create new" leads (the cost center screen, returning to this form). */
  addHref: string
  /** Runs just before leaving to add one, e.g. to keep what was typed. */
  onAdd?: () => void
  /** Why an option cannot be picked here (e.g. already used elsewhere); falsy keeps it pickable. */
  disabledReason?: (option: CostCenterOption) => string | false | null | undefined
  placeholder?: string
}

type PickerProps = Pick<CostCenterSelectProps, 'id' | 'options' | 'loading' | 'error' | 'addHref' | 'onAdd' | 'disabledReason'> & { placeholder: string }

/** What the single and multiple pickers share: searching by path or code, the option rows and the "+ Create new" link. */
function useCostCenterPicker({ id, options, loading, error, addHref, onAdd, disabledReason, placeholder }: PickerProps) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const shown = useMemo(
    () => (options ?? []).filter((option) => !term || option.path.toLowerCase().includes(term) || option.code.toLowerCase().includes(term)),
    [options, term]
  )
  return {
    id,
    options: shown,
    getKey: (option: CostCenterOption) => option.id,
    getLabel: (option: CostCenterOption) => option.name,
    renderOption: (option: CostCenterOption) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{option.name}</span>
        <span className="truncate text-xs text-text-muted">{option.code}</span>
      </span>
    ),
    search,
    onSearchChange: setSearch,
    loading,
    disabledReason,
    placeholder,
    searchPlaceholder: 'Search by name or code...',
    emptyText: options && options.length === 0 ? 'No expenses yet. Create one below.' : 'Nothing matches.',
    error,
    footer: (
      <Link href={addHref} onClick={onAdd} className="block rounded-md px-2 pb-1 pt-2 text-sm font-medium text-primary-600 hover:underline">
        + Create new
      </Link>
    ),
  }
}

/** The expense (an L4 cost center) to book to: a searchable dropdown ending with a link to create one, as on the partner picker. */
export const CostCenterSelect: React.FC<CostCenterSelectProps> = ({ value, onChange, placeholder = 'Select an expense', ...props }) => {
  const picker = useCostCenterPicker({ ...props, placeholder })
  const selected = props.options?.find((option) => option.id === value) ?? null
  return <SearchableSelect<CostCenterOption> {...picker} value={selected} onChange={onChange} />
}

type CostCenterMultiSelectProps = Omit<CostCenterSelectProps, 'value' | 'onChange'> & {
  /** The picked cost centers' ids. */
  value: number[]
  onChange: (options: CostCenterOption[]) => void
}

/** Several expenses (L4 cost centers) at once, with the same search and "+ Create new" as {@link CostCenterSelect}. */
export const CostCenterMultiSelect: React.FC<CostCenterMultiSelectProps> = ({ value, onChange, placeholder = 'Select expenses', ...props }) => {
  const picker = useCostCenterPicker({ ...props, placeholder })
  const selected = (props.options ?? []).filter((option) => value.includes(option.id))
  return <SearchableSelect<CostCenterOption> {...picker} multiple value={selected} onChange={onChange} />
}

/** Where a form's expense pickers get their options and where "+ Create new" leads; shared by every row. */
export type CostCenterSource = Pick<CostCenterSelectProps, 'options' | 'loading' | 'addHref' | 'onAdd'>

type CostCenterFieldProps<T extends FieldValues> = Omit<CostCenterSelectProps, 'value' | 'onChange' | 'error'> & {
  control: Control<T>
  /** A string field holding the cost center's id ('' when none). */
  name: FieldPathByValue<T, string>
}

/** {@link CostCenterSelect} bound to a form field, so every row of a form books to its own expense the same way. */
export function CostCenterField<T extends FieldValues>({ control, name, ...props }: CostCenterFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <CostCenterSelect
          {...props}
          value={field.value ? Number(field.value) : null}
          onChange={(option) => field.onChange(String(option.id))}
          error={fieldState.error?.message}
        />
      )}
    />
  )
}
