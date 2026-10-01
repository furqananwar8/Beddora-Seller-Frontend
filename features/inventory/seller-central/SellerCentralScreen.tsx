"use client"

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import { cn } from '@/utils/cn'
import { useDebounce } from '@/utils/debounce'
import { formatDateTime } from '@/utils/format'
import { useGetShipmentsConfigQuery } from '@/services/api/inboundShipments.api'
import {
  SellerCentralPlanStatus,
  SellerCentralSyncResult,
  useGetSellerCentralPlansQuery,
  useSyncSellerCentralPlansMutation,
} from '@/services/api/sellerCentralShipments.api'
import { apiErrorMessage } from '../shipments/useShipments'
import { formatRelative } from '../shipments/ShipmentParts'
import { PlanDetailModal } from './PlanDetailModal'
import { PlanStatusBadge } from './PlanStatusBadge'

const PAGE_SIZE = 20
const HEAD = 'text-center align-middle'
const CELL = 'text-center align-middle'

const STATUS_OPTIONS = [
  { id: 'ALL', name: 'All statuses' },
  { id: 'ACTIVE', name: 'In progress' },
  { id: 'SHIPPED', name: 'Shipped' },
]

const n = (value: number) => value.toLocaleString()

const syncSummary = (r: SellerCentralSyncResult): string => {
  const parts = [`${n(r.added)} new`, `${n(r.detailed)} updated`]
  if (r.failed > 0) parts.push(`${n(r.failed)} couldn't be read`)
  return `Synced from Amazon: ${parts.join(', ')}`
}

export const SellerCentralScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [status, setStatus] = useState<'ALL' | SellerCentralPlanStatus>('ALL')
  const [page, setPage] = useState(1)
  const [openPlan, setOpenPlan] = useState<string | null>(null)

  const { data: config } = useGetShipmentsConfigQuery()
  const { data, isLoading, isFetching, isError } = useGetSellerCentralPlansQuery({
    search: debouncedSearch,
    status: status === 'ALL' ? undefined : status,
    page,
    limit: PAGE_SIZE,
  })
  const [sync, { isLoading: syncing }] = useSyncSellerCentralPlansMutation()
  const rows = data?.data ?? []

  const notify = (message: string, type: 'success' | 'error') => dispatch(addNotification({ message, type }))

  const handleSync = async () => {
    try {
      notify(syncSummary(await sync().unwrap()), 'success')
      setPage(1)
    } catch (err) {
      notify(apiErrorMessage(err, 'Sync from Amazon failed'), 'error')
    }
  }

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 px-1 sm:mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Seller Central shipments</h1>
          <p className="mt-1 text-sm text-text-muted">
            Shipments created in Seller Central (Send to Amazon). Sync to bring in new ones and open any to see its details.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">
            {data?.lastSyncedAt ? `Synced ${formatRelative(data.lastSyncedAt)}` : 'Never synced'}
          </span>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" className="text-white" /> Syncing…
              </span>
            ) : (
              'Sync from Amazon'
            )}
          </Button>
        </div>
      </div>

      {config?.sandbox && (
        <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          <strong>Amazon sandbox mode.</strong> Amazon&apos;s sandbox holds no Seller Central shipments, so syncing finds nothing.
          Turn off FBA_SANDBOX to sync your real account.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search plan, FBA shipment ID, FC, SKU or ASIN"
          aria-label="Search shipments"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="min-w-0 flex-1 basis-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 sm:min-w-[260px] sm:basis-auto sm:max-w-md"
        />
        <MultiSelectInput
          single
          title="Status"
          options={STATUS_OPTIONS}
          value={[status]}
          onChange={(value) => {
            setStatus((value[0] as 'ALL' | SellerCentralPlanStatus) ?? 'ALL')
            setPage(1)
          }}
        />
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-340px)] min-h-[240px] overflow-auto">
          <Table className="min-w-full">
            <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
              <TableRow>
                <TableHead className={cn(HEAD, 'min-w-[260px]')}>Shipment plan</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[120px]')}>Marketplace</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[120px]')}>Status</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[110px]')}>Shipments</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[90px]')}>Units</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[80px]')}>SKUs</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[160px]')}>Destinations</TableHead>
                <TableHead className={cn(HEAD, 'min-w-[170px]')}>Last changed</TableHead>
                <TableHead className={cn(HEAD, 'w-24')}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className="flex justify-center py-12">
                      <Spinner />
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError || rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className={cn('py-12 text-center', isError ? 'font-medium text-danger-600' : 'text-text-muted')}>
                      {isError
                        ? 'Could not load shipments.'
                        : debouncedSearch || status !== 'ALL'
                        ? 'No shipments match your filters.'
                        : 'No Seller Central shipments yet. Press Sync from Amazon to look for them.'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((plan) => (
                  <TableRow key={plan.inboundPlanId}>
                    <TableCell className={CELL}>
                      <div className="flex items-center justify-center gap-2 font-medium text-text-primary">
                        {plan.name}
                        {plan.isNew && <Badge variant="success">New</Badge>}
                      </div>
                      <div className="font-mono text-xs text-text-muted">{plan.inboundPlanId}</div>
                    </TableCell>
                    <TableCell className={CELL}>{plan.marketplaces.join(', ') || '—'}</TableCell>
                    <TableCell className={CELL}>
                      <PlanStatusBadge status={plan.status} />
                    </TableCell>
                    <TableCell className={CELL}>{plan.hasDetails ? n(plan.shipmentCount) : '—'}</TableCell>
                    <TableCell className={CELL}>{plan.hasDetails ? n(plan.units) : '—'}</TableCell>
                    <TableCell className={CELL}>{plan.hasDetails ? n(plan.skus) : '—'}</TableCell>
                    <TableCell className={cn(CELL, 'font-mono text-xs')}>{plan.destinations.join(', ') || '—'}</TableCell>
                    <TableCell className={cn(CELL, 'text-sm text-text-muted')}>{plan.updatedAt ? formatDateTime(plan.updatedAt) : '—'}</TableCell>
                    <TableCell className={CELL}>
                      <Button variant="outline" size="sm" onClick={() => setOpenPlan(plan.inboundPlanId)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {data && (
          <PaginationFooter
            page={data.page}
            pageSize={data.limit}
            totalItems={data.totalRecords}
            totalPages={data.totalPages}
            onPageChange={setPage}
            itemLabel="shipment plans"
          />
        )}
      </div>

      <PlanDetailModal planId={openPlan} onClose={() => setOpenPlan(null)} onNotify={notify} />
    </Container>
  )
}
