'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, FileText, Printer } from 'lucide-react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { PrintDialog } from '../print/PrintDialog'
import { ChannelSyncNotice } from '../shared/ChannelSyncNotice'
import { TrackingNumber } from '../shared/TrackingNumber'
import { bookingHref, CHANNEL_LABEL, HANDOVER_META, money, STATUS_TONE } from '../shippingMeta'
import type { DocumentType, ParcelShipmentDto } from '../types'

interface BookingConfirmedProps {
  shipment: ParcelShipmentDto
  /** The shipment as updated here (a channel sync retried). */
  onShipmentChange: (shipment: ParcelShipmentDto) => void
  /** The follow-up button: "Create another shipment", "Back to Orders". */
  next: { label: string; onClick: () => void }
}

/** After booking: tracking number, status, and print the label (any format) or the commercial invoice. */
export const BookingConfirmed: React.FC<BookingConfirmedProps> = ({ shipment, onShipmentChange, next }) => {
  const [printing, setPrinting] = useState<DocumentType | null>(null)
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-border bg-surface p-6 text-center shadow-sm sm:p-8">
      <CheckCircle2 className="mx-auto h-12 w-12 text-success-600" aria-hidden />
      <h2 className="mt-3 text-xl font-bold text-text-primary">Shipment booked</h2>
      <p className="text-sm text-text-muted">
        {shipment.bookingNo} · {shipment.serviceName} via {shipment.providerLabel} · {money(shipment.total, shipment.currency)}
      </p>

      <dl className="mt-6 grid gap-4 text-left sm:grid-cols-3">
        <div>
          <dt className="text-xs text-text-muted">Tracking number</dt>
          <dd className="mt-1 text-sm">
            <TrackingNumber value={shipment.trackingNumber} url={shipment.trackingUrl} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Status</dt>
          <dd className="mt-1">
            <StatusBadge label={shipment.statusLabel} tone={STATUS_TONE[shipment.status]} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Handover</dt>
          <dd className="mt-1 text-sm font-semibold">
            {HANDOVER_META[shipment.handover].title}
            {shipment.pickupDate && ` · ${shipment.pickupDate}`}
          </dd>
        </div>
      </dl>

      {shipment.channelOrder && (
        <ChannelSyncNotice
          className="mt-6 text-left"
          shipmentId={shipment.id}
          channelLabel={CHANNEL_LABEL[shipment.channelOrder.channel]}
          sync={shipment.channelOrder.sync}
          message={shipment.channelOrder.syncMessage}
          onRetried={onShipmentChange}
        />
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={() => setPrinting('label')}>
          <Printer className="mr-2 h-4 w-4" aria-hidden /> Print label
        </Button>
        {shipment.documents.includes('commercial_invoice') && (
          <Button variant="outline" onClick={() => setPrinting('commercial_invoice')}>
            <FileText className="mr-2 h-4 w-4" aria-hidden /> Commercial invoice
          </Button>
        )}
        <Button variant="outline" onClick={next.onClick}>
          {next.label}
        </Button>
        <Link href={bookingHref(shipment.id)} className="ds-button ds-button-ghost ds-button-md">
          Go to Bookings
        </Link>
      </div>

      <PrintDialog shipmentId={printing ? shipment.id : null} initialDocument={printing ?? 'label'} onClose={() => setPrinting(null)} />
    </div>
  )
}
