'use client'

import React, { useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetPayablePurchaseOrdersQuery, type PayablePurchaseOrder, type PoRef } from '@/services/api/finance.api'
import { useDebounce } from '@/utils/debounce'
import { formatDay } from '../shared/format'

interface PayablePoSelectProps {
  id?: string
  /** The supplier being paid; its approved, open POs are offered. */
  partnerId: number | null
  value: PoRef | null
  onChange: (po: PayablePurchaseOrder) => void
  error?: string
  disabled?: boolean
}

const DESTINATION: Record<PayablePurchaseOrder['destination'], string> = { US: 'USA', CA: 'Canada' }

/** The purchase order a payment request pays: only approved, open POs of the chosen supplier. */
export const PayablePoSelect: React.FC<PayablePoSelectProps> = ({ id, partnerId, value, onChange, error, disabled }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 250)
  const { data = [], isFetching } = useGetPayablePurchaseOrdersQuery({ partnerId: partnerId ?? 0, search: debounced }, { skip: !open || !partnerId })

  return (
    <SearchableSelect<PoRef>
      id={id}
      value={value}
      onChange={(po) => onChange(po as PayablePurchaseOrder)}
      options={data}
      getKey={(po) => po.id}
      getLabel={(po) => po.poNo}
      renderOption={(po) => {
        const payable = po as PayablePurchaseOrder
        return (
          <span className="flex items-center justify-between gap-2">
            <span className="font-medium">{payable.poNo}</span>
            <span className="shrink-0 text-xs text-text-muted">
              {DESTINATION[payable.destination]} · {payable.currency} · {payable.units.toLocaleString('en-CA')} units · ETD {formatDay(payable.etd)}
            </span>
          </span>
        )
      }}
      search={search}
      onSearchChange={setSearch}
      onOpenChange={setOpen}
      loading={isFetching}
      placeholder={partnerId ? 'Select a purchase order' : 'Pick the supplier first'}
      searchPlaceholder="PO number, e.g. PO-1043"
      emptyText="No approved, open purchase order for this supplier."
      error={error}
      disabled={disabled || !partnerId}
    />
  )
}
