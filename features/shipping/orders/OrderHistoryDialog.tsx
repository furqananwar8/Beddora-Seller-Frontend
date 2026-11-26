'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { useGetOrderBookingsQuery } from '@/services/api/shipping.api'
import { cn } from '@/utils/cn'
import { CarrierLogo } from '../shared/CarrierLogo'
import { TrackingNumber } from '../shared/TrackingNumber'
import { bookOrderHref, bookingHref, money, shortDateTime, STATUS_TONE } from '../shippingMeta'
import type { BookingJobDto, ChannelOrderRef, OrderBookingHistoryItem } from '../types'
import { BulkPrintDialog } from './bulk/BulkPrintDialog'
import { CancelShipmentDialog } from './CancelShipmentDialog'

interface OrderHistoryDialogProps {
  /** The order to show; null keeps the dialog closed. */
  order: (ChannelOrderRef & { unitsTotal: number; unitsBooked: number }) | null
  canWrite: boolean
  onClose: () => void
}

const HEAD = 'px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-2 align-top text-sm'

/** "Unit 3", "Units 1, 2", or "Whole order" for a booking made before orders were booked by unit. */
const unitsText = (item: OrderBookingHistoryItem) => (item.wholeOrder ? 'Whole order' : item.unitNos.length === 1 ? `Unit ${item.unitNos[0]}` : `Units ${item.unitNos.join(', ')}`)

/**
 * Order History: every booking attempt on an order, newest first, failed and voided ones greyed. Follows the
 * `shipping.booking` realtime stream, so a booking started, finished or failed elsewhere appears (and changes) without a reload.
 */
export const OrderHistoryDialog: React.FC<OrderHistoryDialogProps> = ({ order, canWrite, onClose }) => {
  const ref = order ? { channel: order.channel, market: order.market, orderId: order.orderId } : { channel: 'walmart' as const, market: '', orderId: '' }
  const { data, isLoading, isError, refetch } = useGetOrderBookingsQuery(ref, { skip: !order })
  const [printing, setPrinting] = useState<number[] | null>(null)
  const [voiding, setVoiding] = useState<OrderBookingHistoryItem | null>(null)

  // A booking of this order started, succeeded or failed: read the history again
  useRealtime('shipping.booking', (message) => {
    const job = message.data as unknown as BookingJobDto
    if (order && job.order?.orderId === order.orderId && job.order.channel === order.channel && job.order.market === order.market) void refetch()
  })

  const live = (data ?? []).filter((item) => item.live)
  const spent = live.reduce((sum, item) => sum + item.total, 0)
  const booked = order?.unitsBooked ?? 0
  const total = order?.unitsTotal ?? 0

  return (
    <>
      <Modal isOpen={order !== null} onClose={onClose} title={order ? `Order History · ${order.orderId}` : 'Order History'} size="2xl">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner size="sm" />
          </div>
        ) : isError ? (
          <p className="p-6 text-center text-sm text-danger-600">Could not load the history.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <b className="text-sm">
                {booked} of {total} unit{total === 1 ? '' : 's'} booked
              </b>
              <div className="h-2 w-48 overflow-hidden rounded-full bg-secondary-100">
                <div className="h-full bg-success-600 transition-all" style={{ width: `${total ? Math.min(100, Math.round((booked / total) * 100)) : 0}%` }} />
              </div>
              <span className="text-xs text-text-muted">{money(spent)} spent</span>
              {canWrite && order && booked < total && (
                <Link href={bookOrderHref(order)} className="ds-button ds-button-primary ds-button-sm ml-auto">
                  Book remaining units ({total - booked})
                </Link>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary-50">
                    {['Booked', 'Booking', 'Units', 'Carrier · service', 'Tracking / reason', 'Status', 'By', 'Cost', ''].map((title) => (
                      <th key={title} className={HEAD}>
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-sm text-text-muted">
                        Nothing has been booked on this order yet.
                      </td>
                    </tr>
                  )}
                  {(data ?? []).map((item) => (
                    <tr key={item.id} className={cn('border-b border-border last:border-0', !item.live && 'text-text-muted')}>
                      <td className={cn(CELL, 'whitespace-nowrap')}>{shortDateTime(item.createdAt)}</td>
                      <td className={CELL}>
                        <Link href={bookingHref(item.id)} className="font-semibold hover:underline">
                          {item.bookingNo}
                        </Link>
                      </td>
                      <td className={cn(CELL, 'whitespace-nowrap')}>{unitsText(item)}</td>
                      <td className={CELL}>
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <CarrierLogo carrier={item.carrier} provider={item.provider} size="sm" />
                          {item.carrier} · {item.serviceName}
                        </span>
                      </td>
                      <td className={CELL}>
                        {item.status === 'FAILED' ? <span className="text-danger-600">{item.failureReason ?? 'The booking did not go through'}</span> : <TrackingNumber value={item.trackingNumber} url={item.trackingUrl} nowrap />}
                      </td>
                      <td className={CELL}>
                        <StatusBadge label={item.statusLabel} tone={STATUS_TONE[item.status]} />
                      </td>
                      <td className={cn(CELL, 'whitespace-nowrap')}>{item.createdBy?.name ?? '—'}</td>
                      <td className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{money(item.total, item.currency)}</td>
                      <td className={cn(CELL, 'whitespace-nowrap')}>
                        {item.hasLabel && (
                          <Button size="sm" variant="outline" onClick={() => setPrinting([item.id])}>
                            Print
                          </Button>
                        )}
                        {canWrite && item.canCancel && (
                          <Button size="sm" variant="outline" className="ml-1" onClick={() => setVoiding(item)}>
                            Void
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-muted">Every booking attempt is kept, newest first, including failed and voided ones. This list updates by itself while bookings run.</p>
          </div>
        )}
      </Modal>
      <BulkPrintDialog shipmentIds={printing} onClose={() => setPrinting(null)} />
      <CancelShipmentDialog shipment={voiding ? { id: voiding.id, bookingNo: voiding.bookingNo, providerLabel: voiding.providerLabel } : null} onClose={() => setVoiding(null)} />
    </>
  )
}
