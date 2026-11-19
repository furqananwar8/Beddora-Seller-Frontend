"use client"

import React, { useState } from 'react'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/format'
import { SellerCentralPlan, useGetSellerCentralPlansQuery, useRefreshSellerCentralPlanMutation } from '@/services/api/sellerCentralShipments.api'
import { apiErrorMessage } from '../shipments/useShipments'
import { ListToolbar } from './ListToolbar'
import { PlanDetailModal } from './PlanDetailModal'
import { PlanStatusBadge } from './PlanStatusBadge'
import { SyncedColumn, SyncedTable } from './SyncedTable'
import { marketplaceLabels } from './marketplaceLabel'
import { PanelProps, copyText, n } from './panel'
import { planTitle } from './planTitle'
import { useListFilters } from './useListFilters'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { id: 'ALL', name: 'All statuses' },
  { id: 'ACTIVE', name: 'In progress' },
  { id: 'SHIPPED', name: 'Shipped' },
]

/** Amazon: the inbound plans created in Seller Central. */
export const AmazonPlansPanel: React.FC<PanelProps> = ({ syncing, notify }) => {
  const filters = useListFilters()
  const [openPlan, setOpenPlan] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [refreshPlan] = useRefreshSellerCentralPlanMutation()
  const { data, isLoading, isFetching, isError } = useGetSellerCentralPlansQuery({
    ...filters.params,
    status: filters.params.status as 'ACTIVE' | 'SHIPPED' | undefined,
    page: filters.page,
    limit: PAGE_SIZE,
  })

  const handleRefresh = async (planId: string, name: string) => {
    setRefreshingId(planId)
    try {
      await refreshPlan(planId).unwrap()
      notify(`${name} refreshed from Amazon`, 'success')
    } catch (err) {
      notify(apiErrorMessage(err, 'Could not refresh from Amazon'), 'error')
    } finally {
      setRefreshingId(null)
    }
  }

  const columns: SyncedColumn<SellerCentralPlan>[] = [
    {
      label: 'Shipment plan',
      className: 'min-w-[260px]',
      render: (plan) => (
        <>
          {plan.name.trim() && <div className="font-medium text-text-primary">{plan.name}</div>}
          <div className="font-mono text-xs text-text-muted">{plan.inboundPlanId}</div>
        </>
      ),
    },
    { label: 'Marketplace', className: 'min-w-[120px]', render: (plan) => marketplaceLabels(plan.marketplaces) || '—' },
    { label: 'Status', className: 'min-w-[120px]', render: (plan) => <PlanStatusBadge status={plan.status} /> },
    { label: 'Shipments', className: 'min-w-[110px]', render: (plan) => (plan.hasDetails ? n(plan.shipmentCount) : '—') },
    { label: 'Units', className: 'min-w-[90px]', render: (plan) => (plan.hasDetails ? n(plan.units) : '—') },
    { label: 'SKUs', className: 'min-w-[80px]', render: (plan) => (plan.hasDetails ? n(plan.skus) : '—') },
    { label: 'Destinations', className: cn('min-w-[160px]', 'font-mono text-xs'), render: (plan) => plan.destinations.join(', ') || '—' },
    {
      label: 'Last changed',
      className: 'min-w-[170px] text-sm text-text-muted',
      render: (plan) => (plan.updatedAt ? formatDateTime(plan.updatedAt) : '—'),
    },
    {
      label: 'Action',
      className: 'w-24',
      render: (plan) => (
        <RowActionsMenu
          label={plan.name.trim() || plan.inboundPlanId}
          items={[
            { key: 'view', label: 'View details', onSelect: () => setOpenPlan(plan.inboundPlanId) },
            {
              key: 'refresh',
              label: refreshingId === plan.inboundPlanId ? 'Refreshing…' : 'Refresh from Amazon',
              disabled: refreshingId !== null || syncing,
              onSelect: () => handleRefresh(plan.inboundPlanId, planTitle(plan.name)),
            },
            { key: 'copy', label: 'Copy plan ID', onSelect: () => copyText(plan.inboundPlanId, 'Plan ID', notify) },
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
        placeholder="Search plan, FBA shipment ID, FC, SKU or ASIN"
        statusOptions={STATUS_OPTIONS}
        status={filters.status}
        onStatus={filters.setStatus}
      />
      <SyncedTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(plan) => plan.inboundPlanId}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        filtered={filters.filtered}
        emptyMessage="No Seller Central shipments yet. Pick the days to cover and press Sync."
        pageInfo={data}
        itemLabel="shipment plans"
        onPageChange={filters.setPage}
      />
      <PlanDetailModal planId={openPlan} onClose={() => setOpenPlan(null)} onNotify={notify} />
    </>
  )
}
