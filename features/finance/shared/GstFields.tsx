'use client'

import React, { useMemo, useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { Select } from '@/design-system/inputs'
import { useAppAbility } from '@/hooks/useAppAbility'
import { AddGstRateModal } from '@/features/settings/gst/AddGstRateModal'
import { useGetGstRatesQuery, type GstRate, type GstType } from '@/services/api/finance.api'
import { FormField } from './FormField'
import { GST_TYPE_OPTIONS } from './gst'
import { SelectShell } from './SelectShell'

interface GstTypeFieldProps {
  /** Prefix of the control's id, so several requests on one screen stay distinct. */
  id: string
  value: GstType
  onChange: (next: GstType) => void
  error?: string
}

/** How GST applies to a request's amounts: Inclusive, Exclusive or Not applicable. Each amount then picks its own percentage. */
export const GstTypeField: React.FC<GstTypeFieldProps> = ({ id, value, onChange, error }) => (
  <FormField label="GST" htmlFor={`${id}-gst`} error={error}>
    <SelectShell>
      <Select id={`${id}-gst`} className="appearance-none rounded-lg pr-9" value={value} onChange={(event) => onChange(event.target.value as GstType)} options={GST_TYPE_OPTIONS} />
    </SelectShell>
  </FormField>
)

/** The GST percentages to pick from (Settings > GST), and the one to start a line with when there is nothing to choose. */
export function useGstRates() {
  const { data: rates = [], isLoading } = useGetGstRatesQuery()
  return { rates, isLoading, onlyRateId: rates.length === 1 ? String(rates[0].id) : '' }
}

const labelOf = (rate: GstRate) => `${rate.rate}%`

interface GstRateFieldProps {
  id: string
  label?: string
  /** The picked rate's id; '' when none. */
  value: string
  onChange: (rateId: string) => void
  /** Whether GST applies to the request; without it the dropdown is off. */
  applies: boolean
  error?: string
  /** Extra classes for the label (see FormField). */
  labelClassName?: string
}

/**
 * The GST % of one amount line: a searchable dropdown of the percentages (names stay in Settings), ending with
 * "+ Add GST rate" for those who may add one, as the partner picker ends with "+ Add new partner".
 */
export const GstRateField: React.FC<GstRateFieldProps> = ({ id, label = 'GST %', value, onChange, applies, error, labelClassName }) => {
  const { rates, isLoading } = useGstRates()
  const canAdd = useAppAbility().can('write', 'settings:gst')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const term = search.trim().replace(/%$/, '')
  const shown = useMemo(() => rates.filter((rate) => !term || String(rate.rate).includes(term)), [rates, term])
  const selected = rates.find((rate) => String(rate.id) === value) ?? null

  return (
    <FormField label={label} htmlFor={id} required={applies} error={error} labelClassName={labelClassName}>
      <SearchableSelect<GstRate>
        id={id}
        options={shown}
        getKey={(rate) => rate.id}
        getLabel={labelOf}
        value={applies ? selected : null}
        onChange={(rate) => onChange(String(rate.id))}
        search={search}
        onSearchChange={setSearch}
        loading={isLoading}
        disabled={!applies}
        placeholder={applies ? 'Select' : '—'}
        searchPlaceholder="Search GST %..."
        emptyText={rates.length === 0 ? (canAdd ? 'No GST rates yet.' : 'No GST rates yet. Ask an admin to add them in Settings.') : 'Nothing matches.'}
        error={error}
        footer={
          canAdd
            ? (close) => (
                <button
                  type="button"
                  onClick={() => {
                    close()
                    setAdding(true)
                  }}
                  className="block w-full rounded-md px-2 pb-1 pt-2 text-left text-sm font-medium text-primary-600 hover:underline"
                >
                  + Add GST rate
                </button>
              )
            : undefined
        }
      />
      {adding && <AddGstRateModal isOpen onClose={() => setAdding(false)} onAdded={(rate) => onChange(String(rate.id))} />}
    </FormField>
  )
}
