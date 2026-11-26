'use client'

import React, { useEffect, useState } from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { SelectionCheckbox } from '@/components/selection-checkbox/SelectionCheckbox'
import { useGetOrderBookingsQuery } from '@/services/api/shipping.api'
import { CarrierLogo } from '../shared/CarrierLogo'
import { shortDateTime, STATUS_TONE } from '../shippingMeta'
import { unitsLabel } from './orderUnits'
import type { ChannelOrderRef } from '../types'
import { BulkPrintDialog } from './bulk/BulkPrintDialog'

interface LabelPickerDialogProps {
  /** The order whose labels to pick from; null keeps the dialog closed. */
  order: ChannelOrderRef | null
  onClose: () => void
}

/**
 * Get label for an order with several live labels (booked with different carriers, or one label per unit): tick the
 * ones to print, and they are merged into one PDF by the same dialog bulk printing uses. Voided and failed bookings
 * have no label and are not listed.
 */
export const LabelPickerDialog: React.FC<LabelPickerDialogProps> = ({ order, onClose }) => {
  const { data, isLoading, isError } = useGetOrderBookingsQuery(order ?? { channel: 'walmart', market: '', orderId: '' }, { skip: !order })
  const [ticked, setTicked] = useState<Set<number>>(new Set())
  const [printing, setPrinting] = useState<number[] | null>(null)
  const labels = (data ?? []).filter((item) => item.live && item.hasLabel)

  // Everything is ticked when the list arrives: printing all labels is the usual choice
  useEffect(() => setTicked(new Set(labels.map((item) => item.id))), [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: number) =>
    setTicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const all = labels.length > 0 && labels.every((item) => ticked.has(item.id))
  const some = labels.some((item) => ticked.has(item.id))
  const print = () => {
    setPrinting(labels.filter((item) => ticked.has(item.id)).map((item) => item.id))
    onClose()
  }

  return (
    <>
      <Modal isOpen={order !== null} onClose={onClose} title={order ? `Get label · ${order.orderId}` : 'Get label'} size="lg">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner size="sm" />
          </div>
        ) : isError ? (
          <p className="p-6 text-center text-sm text-danger-600">Could not load the labels.</p>
        ) : labels.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-muted">This order has no label to print.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">This order has {labels.length} labels. Pick the ones to print.</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary-50 text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="w-10 px-3 py-2">
                      <SelectionCheckbox label="Select all labels" checked={all} indeterminate={some && !all} onChange={() => setTicked(all ? new Set() : new Set(labels.map((item) => item.id)))} />
                    </th>
                    <th className="px-3 py-2">Quantity</th>
                    <th className="px-3 py-2">Carrier</th>
                    <th className="px-3 py-2">Tracking</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {labels.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <SelectionCheckbox label={`Select label ${item.bookingNo}`} checked={ticked.has(item.id)} onChange={() => toggle(item.id)} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{item.wholeOrder ? 'Whole order' : unitsLabel(item.unitNos)}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <CarrierLogo carrier={item.carrier} provider={item.provider} size="sm" />
                          {item.carrier} · {item.serviceName}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{item.trackingNumber}</td>
                      <td className="px-3 py-2">
                        <StatusBadge label={item.statusLabel} tone={STATUS_TONE[item.status]} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{shortDateTime(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={print} disabled={!some}>
                Print selected ({ticked.size})
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <BulkPrintDialog shipmentIds={printing} onClose={() => setPrinting(null)} />
    </>
  )
}
