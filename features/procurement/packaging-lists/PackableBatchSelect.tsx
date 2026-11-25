'use client'

import React from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import type { PackableBatch } from '@/services/api/procurement.api'
import { formatDate } from '@/utils/format'
import { DESTINATION_LABEL } from '../shared/poMeta'

const PLATFORM_NAME = { ECOMMERCE: 'Ecommerce', RETAIL: 'Retail' } as const

interface PackableBatchSelectProps {
  id?: string
  options: PackableBatch[]
  value: number[]
  onChange: (ids: number[]) => void
  loading?: boolean
  disabled?: boolean
  error?: string
}

/** Why a batch cannot join the current selection, mirroring the server: one destination and one brand per list. */
export function unpackableReason(batch: PackableBatch, selected: PackableBatch[]): string | null {
  if (selected.length === 0 || selected.some((item) => item.id === batch.id)) return null
  if (selected[0].destination !== batch.destination) return `Ships to ${DESTINATION_LABEL[batch.destination]}`
  if (selected[0].platform !== batch.platform) return `${PLATFORM_NAME[batch.platform]} batch · a list is for one brand`
  return null
}

/** One or several batches IN PRODUCTION (of any POs and suppliers) that ship to the same destination; each batch is on one list only. */
export const PackableBatchSelect: React.FC<PackableBatchSelectProps> = ({ id, options, value, onChange, loading, disabled, error }) => {
  const selected = options.filter((batch) => value.includes(batch.id))
  return (
    <SearchableSelect<PackableBatch>
      id={id}
      multiple
      value={selected}
      onChange={(next) => onChange(next.map((batch) => batch.id))}
      options={options}
      getKey={(batch) => batch.id}
      getLabel={(batch) => `${batch.label} ${batch.supplier.name}`}
      renderValue={(picked) => picked.map((batch) => batch.label).join(', ')}
      renderOption={(batch) => (
        <span className="flex items-center justify-between gap-3">
          <span className="font-medium">
            {batch.label} <span className="font-normal text-text-secondary">· {batch.supplier.name}</span>
          </span>
          <span className="truncate text-xs text-text-muted">
            {PLATFORM_NAME[batch.platform]} · {DESTINATION_LABEL[batch.destination]} · {batch.units.toLocaleString('en-CA')} units · {batch.productionDate ? `production ${formatDate(batch.productionDate)}` : 'no production date'}
          </span>
        </span>
      )}
      disabledReason={(batch) => unpackableReason(batch, selected)}
      loading={loading}
      placeholder="Pick the batch(es) in production"
      searchPlaceholder="PO number, batch or supplier..."
      emptyText="No batches in production to pack."
      disabled={disabled}
      error={error}
    />
  )
}
