'use client'

import React from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { useGetPackagingListsQuery } from '@/services/api/procurement.api'
import { formatCalendarDay } from '@/utils/format'
import { CONTAINER_ROUTES } from '../containers/routes'
import { containerLabel, DESTINATION_LABEL, supplierNames } from './poMeta'

interface PoRef {
  id: number
  poNo: string
}

const qty = (value: number) => value.toLocaleString('en-CA')

const Figure: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className="text-sm font-medium tabular-nums text-text-primary">{value}</dd>
  </div>
)

/** A purchase order's packaging lists in a modal: what each carries, its totals and the container it is in (if any). */
export const PoPackagingListsModal: React.FC<{ purchaseOrder: PoRef | null; onClose: () => void }> = ({ purchaseOrder, onClose }) => {
  const { data, isLoading, isError } = useGetPackagingListsQuery({ purchaseOrderId: purchaseOrder?.id, page: 1, limit: 50 }, { skip: !purchaseOrder })
  const rows = data?.data ?? []

  return (
    <Modal isOpen={purchaseOrder !== null} onClose={onClose} title={purchaseOrder ? `Packaging lists · ${purchaseOrder.poNo}` : undefined} size="lg">
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="py-10 text-center font-medium text-danger-600">Could not load the packaging lists.</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-muted">No packaging list for this purchase order yet.</p>
      ) : (
        <ul className="flex max-h-[60vh] flex-col divide-y divide-border overflow-y-auto">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-2 px-1 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-text-primary">{row.plNo}</span>
                <span className="flex items-center gap-1.5">
                  <StatusBadge label={DESTINATION_LABEL[row.destination]} tone="neutral" />
                  {row.container ? (
                    <Link href={CONTAINER_ROUTES.detail(row.container.id)} className="text-xs font-semibold text-primary-600 underline-offset-2 hover:underline">
                      {containerLabel(row.container)}
                    </Link>
                  ) : (
                    <StatusBadge label="NO CONTAINER" tone="warning" />
                  )}
                </span>
              </div>
              <p className="truncate text-xs text-text-muted">
                {supplierNames(row.suppliers)} · {row.purchaseOrders.map((po) => po.poNo).join(', ')} · {formatCalendarDay(row.createdAt)}
              </p>
              <dl className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-6">
                <Figure label="SKUs" value={qty(row.skuCount)} />
                <Figure label="Units" value={qty(row.units)} />
                <Figure label="Cartons" value={qty(row.cartons)} />
                <Figure label="CBM" value={row.cbm.toLocaleString('en-CA', { maximumFractionDigits: 2 })} />
                <Figure label="Net kg" value={row.netWeightKg.toLocaleString('en-CA', { maximumFractionDigits: 1 })} />
                <Figure label="Gross kg" value={row.grossWeightKg.toLocaleString('en-CA', { maximumFractionDigits: 1 })} />
              </dl>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
