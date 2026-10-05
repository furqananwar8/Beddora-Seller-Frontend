'use client'

import React from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import type { PackablePurchaseOrder } from '@/services/api/procurement.api'
import { DESTINATION_LABEL, isPackable } from '../shared/poMeta'

interface PackablePoSelectProps {
  id?: string
  options: PackablePurchaseOrder[]
  value: number[]
  onChange: (ids: number[]) => void
  loading?: boolean
  disabled?: boolean
  error?: string
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/**
 * Why a PO cannot join the current selection, mirroring the server's rules: approved and open only,
 * one destination per list, and several POs only while none of them has a packaging list yet.
 */
export function unpackableReason(po: PackablePurchaseOrder, selected: PackablePurchaseOrder[]): string | null {
  if (po.status === 'PENDING_APPROVAL') return 'Pending approval'
  if (!isPackable(po)) return 'Closed'
  if (selected.some((item) => item.id === po.id) || selected.length === 0) return null
  if (selected[0].destination !== po.destination) return `Ships to ${DESTINATION_LABEL[po.destination]}`
  if (po.listCount > 0) return `Has ${plural(po.listCount, 'packaging list')} · packed on its own`
  if (selected.some((item) => item.listCount > 0)) return 'The picked PO already has a list'
  return null
}

/** One PO, or several fresh POs of the same supplier and destination. */
export const PackablePoSelect: React.FC<PackablePoSelectProps> = ({ id, options, value, onChange, loading, disabled, error }) => {
  const selected = options.filter((po) => value.includes(po.id))
  return (
    <SearchableSelect<PackablePurchaseOrder>
      id={id}
      multiple
      value={selected}
      onChange={(next) => onChange(next.map((po) => po.id))}
      options={options}
      getKey={(po) => po.id}
      getLabel={(po) => po.poNo}
      renderValue={(picked) => picked.map((po) => po.poNo).join(', ')}
      renderOption={(po) => (
        <span className="flex items-center justify-between gap-3">
          <span className="font-medium">{po.poNo}</span>
          <span className="truncate text-xs text-text-muted">
            {DESTINATION_LABEL[po.destination]} · {po.units.toLocaleString('en-CA')} units · {po.listCount ? plural(po.listCount, 'packaging list') : 'no packaging lists'}
          </span>
        </span>
      )}
      disabledReason={(po) => unpackableReason(po, selected)}
      loading={loading}
      placeholder="Pick the purchase order(s)"
      searchPlaceholder="PO number..."
      emptyText="This supplier has no purchase orders to pack."
      disabled={disabled}
      error={error}
    />
  )
}
