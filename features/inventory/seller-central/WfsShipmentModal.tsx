"use client"

import React from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { useGetWfsSellerCentralShipmentQuery, useRefreshWfsSellerCentralShipmentMutation } from '@/services/api/sellerCentralShipments.api'
import { formatDateTime } from '@/utils/format'
import { apiErrorMessage } from '../shipments/useShipments'
import { WfsStatusBadge } from './WfsStatusBadge'
import { Notify, n } from './panel'

const dash = '—'
const ITEM_COLUMNS = ['SKU', 'Description', 'Units', 'Received', 'Damaged']

/** Everything Walmart holds about one WFS shipment: its facts and the SKU lines with received and damaged units. */
export const WfsShipmentModal: React.FC<{ shipmentKey: string | null; onClose: () => void; onNotify: Notify }> = ({ shipmentKey, onClose, onNotify }) => {
  const { data: shipment, isLoading, isError, error } = useGetWfsSellerCentralShipmentQuery(shipmentKey ?? '', { skip: !shipmentKey })
  const [refresh, { isLoading: refreshing }] = useRefreshWfsSellerCentralShipmentMutation()

  const handleRefresh = async () => {
    if (!shipmentKey) return
    try {
      await refresh(shipmentKey).unwrap()
      onNotify('Shipment details refreshed from Walmart', 'success')
    } catch (err) {
      onNotify(apiErrorMessage(err, 'Could not refresh from Walmart'), 'error')
    }
  }

  const to = shipment?.shipToAddress
  const address = [to?.addressLine1, to?.addressLine2, [to?.city, to?.stateCode, to?.postalCode].filter(Boolean).join(' '), to?.countryCode].filter(Boolean).join(', ')
  const fields: [string, React.ReactNode][] = shipment
    ? [
        ['Shipment ID', <span key="id" className="font-mono text-xs">{shipment.shipmentId}</span>],
        ['Inbound order', <span key="order" className="font-mono text-xs">{shipment.inboundOrderId ?? dash}</span>],
        ['Status', <WfsStatusBadge key="status" status={shipment.status} />],
        ['Marketplace', shipment.marketplace],
        ['Fulfillment center', [shipment.fulfillmentCenter, shipment.fcLocation].filter(Boolean).join(' · ') || dash],
        ['Ship to', address || dash],
        ['Expected delivery', shipment.expectedDeliveryAt ? formatDateTime(shipment.expectedDeliveryAt) : dash],
        ['Created', shipment.createdAt ? formatDateTime(shipment.createdAt) : dash],
        ['Last changed', shipment.updatedAt ? formatDateTime(shipment.updatedAt) : dash],
        ['Last synced', formatDateTime(shipment.syncedAt)],
      ]
    : []

  return (
    <Modal isOpen={shipmentKey !== null} onClose={onClose} title={shipment ? `Shipment ${shipment.shipmentId}` : 'WFS shipment'} size="xl">
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {isError && <p className="py-8 text-center text-sm text-danger-600">{apiErrorMessage(error, 'Could not load this shipment')}</p>}

      {shipment && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <Table className="min-w-full">
              <TableBody>
                {fields.map(([label, value]) => (
                  <TableRow key={label}>
                    <TableCell className="w-1/3 text-sm text-text-muted">{label}</TableCell>
                    <TableCell className="text-sm">{value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="max-h-[320px] overflow-auto">
              <Table className="min-w-full">
                <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
                  <TableRow>
                    {ITEM_COLUMNS.map((h) => (
                      <TableHead key={h} className="text-center align-middle">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipment.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={ITEM_COLUMNS.length}>
                        <div className="py-8 text-center text-text-muted">
                          {shipment.hasDetails ? 'Walmart lists no items on this shipment.' : 'Items load on the next sync or refresh.'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    shipment.items.map((i) => (
                      <TableRow key={i.sku}>
                        <TableCell className="text-center align-middle font-mono text-xs">{i.sku}</TableCell>
                        <TableCell className="text-center align-middle text-sm">{i.description ?? dash}</TableCell>
                        <TableCell className="text-center align-middle">{n(i.quantity)}</TableCell>
                        <TableCell className="text-center align-middle">{n(i.received)}</TableCell>
                        <TableCell className="text-center align-middle">{n(i.damaged)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh from Walmart'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
