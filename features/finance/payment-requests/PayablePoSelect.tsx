'use client'

import React from 'react'
import { useGetPayablePurchaseOrdersQuery, type PayablePurchaseOrder, type PoRef } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatDay, formatMoney } from '../shared/format'
import { PoOptionSelect } from './PoOptionSelect'

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

const useOptions = ({ partnerId, search }: { partnerId: number; search: string }, skip: boolean) => useGetPayablePurchaseOrdersQuery({ partnerId, search }, { skip })

/** The purchase order a payment request pays: approved, open POs of the chosen supplier that are not fully paid or requested. */
export const PayablePoSelect: React.FC<PayablePoSelectProps> = (props) => (
  <PoOptionSelect<PayablePurchaseOrder>
    {...props}
    useOptions={useOptions}
    renderMeta={(po) => `${DESTINATION[po.destination]} · ${formatCurrencyAmount(po.currency, po.leftToRequest)} left of ${formatMoney(po.amount)} · ERD ${formatDay(po.etd)}`}
    emptyText="No approved, open purchase order of this supplier has an amount left to pay."
  />
)
