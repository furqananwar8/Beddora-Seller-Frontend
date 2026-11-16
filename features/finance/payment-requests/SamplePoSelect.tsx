'use client'

import React from 'react'
import { useGetSamplePurchaseOrdersQuery, type PoRef, type SamplePurchaseOrder } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatDay } from '../shared/format'
import { PoOptionSelect } from './PoOptionSelect'

interface SamplePoSelectProps {
  id?: string
  partnerId: number | null
  value: PoRef | null
  onChange: (po: SamplePurchaseOrder) => void
  /** The draft being edited: its own samples keep their PO on offer. */
  excludeId?: number
  error?: string
  disabled?: boolean
}

const DESTINATION: Record<SamplePurchaseOrder['destination'], string> = { US: 'USA', CA: 'Canada' }

/** The purchase order whose samples a sample request pays: approved POs of the chosen supplier with a chargeable sample left to pay. */
export const SamplePoSelect: React.FC<SamplePoSelectProps> = ({ excludeId, ...props }) => (
  <PoOptionSelect<SamplePurchaseOrder>
    {...props}
    useOptions={({ partnerId, search }, skip) => useGetSamplePurchaseOrdersQuery({ partnerId, search, excludeId }, { skip })}
    renderMeta={(po) => `${DESTINATION[po.destination]} · ${po.sampleCount} ${po.sampleCount === 1 ? 'sample' : 'samples'} · ${formatCurrencyAmount(po.currency, po.amount)} · ERD ${formatDay(po.etd)}`}
    emptyText="No approved purchase order of this supplier has a chargeable sample left to pay."
  />
)
