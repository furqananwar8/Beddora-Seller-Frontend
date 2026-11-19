"use client"

import React, { useMemo, useState } from 'react'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { formatDateTime } from '@/utils/format'
import {
  WfsSellerCentralShipment,
  useGetWfsSellerCentralShipmentsQuery,
  useRefreshWfsSellerCentralShipmentMutation,
} from '@/services/api/sellerCentralShipments.api'
import { apiErrorMessage } from '../shipments/useShipments'
import { ListToolbar } from './ListToolbar'
import { SyncedColumn, SyncedTable } from './SyncedTable'
import { WfsShipmentModal } from './WfsShipmentModal'
import { WfsStatusBadge, wfsStatusLabel } from './WfsStatusBadge'
import { PanelProps, copyText, n } from './panel'
import { useListFilters } from './useListFilters'

const PAGE_SIZE = 20

const marketLabel = (id: string) => (id === 'Walmart.CA' ? 'CANADA' : id === 'Walmart.US' ? 'USA' : id)

/** Walmart: the WFS inbound shipments made in Walmart Seller Center, one row per fulfillment-center shipment. */
export const WfsShipmentsPanel: React.FC<PanelProps> = ({ syncing, notify }) => {
  const filters = useListFilters()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [refreshingKey, setRefreshingKey] = useState<string | null>(null)
  const [refreshShipment] = useRefreshWfsSellerCentralShipmentMutation()
  const { data, isLoading, isFetching, isError } = useGetWfsSellerCentralShipmentsQuery({ ...filters.params, page: filters.page, limit: PAGE_SIZE })

  // Walmart's status words aren't a fixed set, so the filter lists the ones the synced shipments carry
  const statusOptions = useMemo(
    () => [{ id: 'ALL', name: 'All statuses' }, ...(data?.statuses ?? []).map((s) => ({ id: s, name: wfsStatusLabel(s) }))],
    [data?.statuses]
  )

  const handleRefresh = async (shipment: WfsSellerCentralShipment) => {
    setRefreshingKey(shipment.key)
    try {
      await refreshShipment(shipment.key).unwrap()
      notify(`Shipment ${shipment.shipmentId} refreshed from Walmart`, 'success')
    } catch (err) {
      notify(apiErrorMessage(err, 'Could not refresh from Walmart'), 'error')
    } finally {
      setRefreshingKey(null)
    }
  }

  const columns: SyncedColumn<WfsSellerCentralShipment>[] = [
    {
      label: 'Shipment',
      className: 'min-w-[220px]',
      render: (s) => (
        <>
          <div className="font-mono text-xs font-medium text-text-primary">{s.shipmentId}</div>
          {s.inboundOrderId && <div className="font-mono text-xs text-text-muted">Order {s.inboundOrderId}</div>}
        </>
      ),
    },
    { label: 'Marketplace', className: 'min-w-[110px]', render: (s) => marketLabel(s.marketplace) },
    { label: 'Status', className: 'min-w-[140px]', render: (s) => <WfsStatusBadge status={s.status} /> },
    {
      label: 'Fulfillment center',
      className: 'min-w-[190px]',
      render: (s) =>
        s.fulfillmentCenter || s.fcLocation ? (
          <>
            <div className="text-sm">{s.fulfillmentCenter ?? '—'}</div>
            {s.fcLocation && <div className="text-xs text-text-muted">{s.fcLocation}</div>}
          </>
        ) : (
          '—'
        ),
    },
    { label: 'SKUs', className: 'min-w-[80px]', render: (s) => (s.hasDetails ? n(s.skus) : '—') },
    { label: 'Units', className: 'min-w-[90px]', render: (s) => (s.hasDetails ? n(s.units) : '—') },
    { label: 'Received', className: 'min-w-[100px]', render: (s) => (s.hasDetails ? n(s.received) : '—') },
    {
      label: 'Expected delivery',
      className: 'min-w-[150px] text-sm text-text-muted',
      render: (s) => (s.expectedDeliveryAt ? formatDateTime(s.expectedDeliveryAt) : '—'),
    },
    {
      label: 'Last changed',
      className: 'min-w-[170px] text-sm text-text-muted',
      render: (s) => (s.updatedAt ? formatDateTime(s.updatedAt) : s.createdAt ? formatDateTime(s.createdAt) : '—'),
    },
    {
      label: 'Action',
      className: 'w-24',
      render: (s) => (
        <RowActionsMenu
          label={s.shipmentId}
          items={[
            { key: 'view', label: 'View details', onSelect: () => setOpenKey(s.key) },
            {
              key: 'refresh',
              label: refreshingKey === s.key ? 'Refreshing…' : 'Refresh from Walmart',
              disabled: refreshingKey !== null || syncing,
              onSelect: () => handleRefresh(s),
            },
            { key: 'copy', label: 'Copy shipment ID', onSelect: () => copyText(s.shipmentId, 'Shipment ID', notify) },
          ]}
        />
      ),
    },
  ]

  return (
    <>
      <ListToolbar
        search={filters.search}
        onSearch={filters.setSearch}
        placeholder="Search shipment, inbound order, FC or SKU"
        statusOptions={statusOptions}
        status={filters.status}
        onStatus={filters.setStatus}
      />
      <SyncedTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(s) => s.key}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        filtered={filters.filtered}
        emptyMessage="No Walmart WFS shipments yet. Pick the days to cover and press Sync."
        pageInfo={data}
        itemLabel="shipments"
        onPageChange={filters.setPage}
      />
      <WfsShipmentModal shipmentKey={openKey} onClose={() => setOpenKey(null)} onNotify={notify} />
    </>
  )
}
