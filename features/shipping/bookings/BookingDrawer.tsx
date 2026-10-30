'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { FileText, Printer, RefreshCw, X } from 'lucide-react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useGetShipmentQuery, useRefreshTrackingMutation } from '@/services/api/shipping.api'
import { PrintDialog } from '../print/PrintDialog'
import { ChannelBadge } from '../shared/ChannelBadge'
import { ChannelSyncNotice } from '../shared/ChannelSyncNotice'
import { PriceBreakdownTable } from '../shared/PriceBreakdownTable'
import { ProviderLogo } from '../shared/ProviderLogo'
import { TrackingNumber } from '../shared/TrackingNumber'
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

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="border-t border-border px-5 py-4">
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
    {children}
  </section>
)

/** Tracking events, newest first, as a vertical timeline. */
const TrackingTimeline: React.FC<{ events: ParcelShipmentDto['events'] }> = ({ events }) =>
  events.length === 0 ? (
    <p className="text-sm text-text-muted">No carrier scans yet.</p>
  ) : (
    <ol className="relative ml-1.5 space-y-4 border-l border-border pl-5">
      {events.map((event, index) => (
        <li key={`${event.occurredAt}-${index}`} className="relative">
          <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-surface ${index === 0 ? 'bg-primary-600' : 'bg-secondary-300'}`} />
          <b className="text-sm text-text-primary">{event.description || event.statusLabel}</b>
          <div className="text-xs text-text-muted">{[event.location, shortDateTime(event.occurredAt)].filter(Boolean).join(' · ')}</div>
        </li>
      ))}
    </ol>
  )

const Detail: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <>
    <dt className="text-text-muted">{label}</dt>
    <dd className="text-text-primary">{children}</dd>
  </>
)

/** One booking: status, tracking number, documents, actions, the tracking timeline and the shipment's details. */
export const BookingDrawer: React.FC<BookingDrawerProps> = ({ shipmentId, canWrite, onClose }) => {
  const { data: shipment, isLoading, isError } = useGetShipmentQuery(shipmentId ?? 0, { skip: shipmentId === null })
  const [refresh, { isLoading: refreshing }] = useRefreshTrackingMutation()
  const { success, failure } = useApiFeedback()
  const [printing, setPrinting] = useState<DocumentType | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (shipmentId === null) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && !printing && !cancelling && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shipmentId, printing, cancelling, onClose])

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

  return createPortal(
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby="booking-drawer-title">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2 id="booking-drawer-title" className="text-lg font-bold text-text-primary">
              {shipment?.bookingNo ?? 'Booking'}
            </h2>
            {shipment && (
              <p className="text-xs text-text-muted">
                Created {shortDateTime(shipment.createdAt)}
                {shipment.createdBy && ` by ${shipment.createdBy.name}`}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-text-muted hover:bg-secondary-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner size="sm" />
          </div>
        ) : isError || !shipment ? (
          <p className="p-8 text-center text-sm text-danger-600">Could not load this booking.</p>
        ) : (
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
              <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
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
              </dl>
            </Section>

            <Section title="Price">
              <PriceBreakdownTable price={shipment.priceBreakdown} incoterm={shipment.incoterm} total={shipment.total} currency={shipment.currency} />
            </Section>
          </>
        )}
      </aside>

      <PrintDialog shipmentId={printing ? shipmentId : null} initialDocument={printing ?? 'label'} onClose={() => setPrinting(null)} />
      <CancelShipmentDialog shipment={cancelling && shipment ? shipment : null} onClose={() => setCancelling(false)} />
    </div>,
    document.body
  )
}
