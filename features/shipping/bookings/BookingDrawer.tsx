'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { FileText, Printer, RefreshCw } from 'lucide-react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useGetShipmentQuery, useRefreshTrackingMutation } from '@/services/api/shipping.api'
import { PrintDialog } from '../print/PrintDialog'
import { ChannelBadge } from '../shared/ChannelBadge'
import { ChannelSyncNotice } from '../shared/ChannelSyncNotice'
import { PriceBreakdownTable } from '../shared/PriceBreakdownTable'
import { DrawerDetail as Detail, DrawerDetails, DrawerSection as Section, SideDrawer } from '../shared/SideDrawer'
import { ProviderLogo } from '../shared/ProviderLogo'
import { TrackingNumber } from '../shared/TrackingNumber'
import { TrackingTimeline } from '../shared/TrackingTimeline'
import { CHANNEL_LABEL, HANDOVER_META, money, orderSearchHref, shortDateTime, STATUS_TONE } from '../shippingMeta'
import type { DocumentType, ParcelShipmentDto } from '../types'
import { CancelShipmentDialog } from './CancelShipmentDialog'

interface BookingDrawerProps {
  /** The shipment shown; null keeps the drawer closed. */
  shipmentId: number | null
  canWrite: boolean
  onClose: () => void
}

const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true })

/** "Last update 14 min ago · via webhook · next check in about 1 hour" */
function freshness(shipment: ParcelShipmentDto): string | null {
  const parts = [
    shipment.lastEventAt && `Last update ${ago(shipment.lastEventAt)}`,
    shipment.lastSource && `via ${shipment.lastSource}`,
    shipment.lastCheckedAt && `checked ${ago(shipment.lastCheckedAt)}`,
    shipment.nextPollAt && `next check ${ago(shipment.nextPollAt)}`,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

/** One booking: status, tracking number, documents, actions, the tracking timeline and the shipment's details. */
export const BookingDrawer: React.FC<BookingDrawerProps> = ({ shipmentId, canWrite, onClose }) => {
  const { data: shipment, isLoading, isError } = useGetShipmentQuery(shipmentId ?? 0, { skip: shipmentId === null })
  const [refresh, { isLoading: refreshing }] = useRefreshTrackingMutation()
  const { success, failure } = useApiFeedback()
  const [printing, setPrinting] = useState<DocumentType | null>(null)
  const [cancelling, setCancelling] = useState(false)

  if (shipmentId === null) return null

  const refreshTracking = async () => {
    try {
      await refresh(shipmentId).unwrap()
      success('Tracking refreshed')
    } catch (error) {
      failure(error, 'Could not refresh the tracking')
    }
  }

  const pkg = shipment?.packages[0]

  return (
    <SideDrawer
      open
      title={shipment?.bookingNo ?? 'Booking'}
      subtitle={shipment && `Created ${shortDateTime(shipment.createdAt)}${shipment.createdBy ? ` by ${shipment.createdBy.name}` : ''}`}
      closeOnEscape={!printing && !cancelling}
      onClose={onClose}
      state={isLoading ? 'loading' : isError || !shipment ? 'error' : 'ready'}
      errorMessage="Could not load this booking."
      overlays={
        <>
          <PrintDialog shipmentId={printing ? shipmentId : null} initialDocument={printing ?? 'label'} onClose={() => setPrinting(null)} />
          <CancelShipmentDialog shipment={cancelling && shipment ? shipment : null} onClose={() => setCancelling(false)} />
        </>
      }
    >
      {shipment && (
        <>
          <div className="space-y-3 px-5 pb-4">
            <div className="flex items-center gap-3">
              <ProviderLogo provider={shipment.provider} />
              <div className="min-w-0 flex-1">
                <b className="text-sm text-text-primary">{shipment.serviceName}</b>
                <div className="text-xs text-text-muted">
                  {shipment.providerLabel} · {shipment.incoterm} · {money(shipment.total, shipment.currency)}
                </div>
              </div>
              <StatusBadge label={shipment.statusLabel} tone={STATUS_TONE[shipment.status]} />
            </div>
            <div className="text-sm">
              <TrackingNumber value={shipment.trackingNumber} url={shipment.trackingUrl} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setPrinting('label')} disabled={!shipment.documents.includes('label')}>
                <Printer className="mr-1.5 h-4 w-4" aria-hidden /> Label
              </Button>
              {shipment.documents.includes('commercial_invoice') && (
                <Button size="sm" variant="outline" onClick={() => setPrinting('commercial_invoice')}>
                  <FileText className="mr-1.5 h-4 w-4" aria-hidden /> Invoice
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => void refreshTracking()} isLoading={refreshing}>
                <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden /> Refresh tracking
              </Button>
              {canWrite && shipment.canCancel && (
                <Button size="sm" variant="danger" onClick={() => setCancelling(true)}>
                  Cancel / void
                </Button>
              )}
            </div>
            {freshness(shipment) && <p className="text-xs text-text-muted">{freshness(shipment)}</p>}
          </div>

          {shipment.channelOrder && (
            <Section title="Channel order">
              <div className="mb-3 flex items-center gap-2 text-sm">
                <ChannelBadge channel={shipment.channelOrder.channel} />
                <span>
                  {CHANNEL_LABEL[shipment.channelOrder.channel]} {shipment.channelOrder.market} ·{' '}
                  <Link href={orderSearchHref(shipment.channelOrder.orderId)} className="font-semibold text-primary-600 hover:underline">
                    {shipment.channelOrder.orderId}
                  </Link>
                </span>
              </div>
              <ChannelSyncNotice shipmentId={shipment.id} channelLabel={CHANNEL_LABEL[shipment.channelOrder.channel]} sync={shipment.channelOrder.sync} message={shipment.channelOrder.syncMessage} />
            </Section>
          )}

          <Section title="Tracking">
            <TrackingTimeline events={shipment.events} />
          </Section>

          <Section title="Shipment">
            <DrawerDetails>
              <Detail label="From">{shipment.from.label}</Detail>
              <Detail label="To">
                {shipment.to.name}, {shipment.to.city} {shipment.to.province} {shipment.to.postalCode}, {shipment.to.country}
              </Detail>
              {pkg && (
                <Detail label="Package">
                  {pkg.length}×{pkg.width}×{pkg.height} {pkg.dimensionUnit.toLowerCase()} · {pkg.weight} {pkg.weightUnit.toLowerCase()}
                </Detail>
              )}
              {shipment.items.length > 0 && <Detail label="Items">{shipment.items.map((item) => `${item.quantity} × ${item.sku ?? item.description}`).join(', ')}</Detail>}
              <Detail label="Handover">
                {HANDOVER_META[shipment.handover].title}
                {shipment.pickupDate && ` · ${shipment.pickupDate}`}
              </Detail>
              {shipment.insuranceAmount !== null && <Detail label="Insurance">{money(shipment.insuranceAmount)}</Detail>}
              {shipment.signature && <Detail label="Signature">Required</Detail>}
              <Detail label="Reference">{shipment.reference ?? '—'}</Detail>
            </DrawerDetails>
          </Section>

          <Section title="Price">
            <PriceBreakdownTable price={shipment.priceBreakdown} incoterm={shipment.incoterm} total={shipment.total} currency={shipment.currency} />
          </Section>
        </>
      )}
    </SideDrawer>
  )
}
