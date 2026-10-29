'use client'

import React from 'react'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { TreeTable, type TreeColumn } from '@/components/tree-table/TreeTable'
import { Button } from '@/design-system/buttons'
import { useReportExport } from '@/hooks/useReportExport'
import { useGetContainersQuery, useGetContainerSummaryQuery, type ContainerItem } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatCalendarDay } from '@/utils/format'
import { ContainerStatusBadge, DESTINATION_LABEL, DESTINATION_ROW_TINT } from '../shared/poMeta'
import { ContainerRowDetail } from './detail/ContainerOverview'
import { ContainerCell, skuSummary } from './list/ContainerCell'
import { ContainerFilterBar } from './list/ContainerFilterBar'
import { useContainerListState } from './list/useContainerListState'
import { useContainerActions } from './useContainerActions'

const qty = (value: number) => value.toLocaleString('en-CA')
const kg = (value: number) => `${value.toLocaleString('en-CA', { maximumFractionDigits: 1 })} kg`
const money = (value: number, currency: string) => `${currency} ${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value: string | null) => (value ? formatCalendarDay(value) : '—')

const Stack: React.FC<{ top: React.ReactNode; bottom?: React.ReactNode; className?: string }> = ({ top, bottom, className }) => (
  <div className={cn('flex flex-col items-center whitespace-nowrap', className)}>
    <span>{top}</span>
    {bottom !== undefined && <span className="text-xs text-text-muted">{bottom}</span>}
  </div>
)

export const ContainersScreen: React.FC = () => {
  const actions = useContainerActions()

  const list = useContainerListState()
  const { data, isLoading, isFetching, isError } = useGetContainersQuery(list.params)
  const { data: summary } = useGetContainerSummaryQuery()
  const { start: startExport, isExporting } = useReportExport('containers')

  const columns: TreeColumn<ContainerItem>[] = [
    {
      key: 'container',
      header: 'Container',
      className: 'min-w-[150px] text-left',
      render: (container) => <ContainerCell container={container} detail={skuSummary(container.lines.length, container.totals.units)} />,
    },
    { key: 'cbm', header: 'Total CBM', render: (container) => <span className="font-mono text-xs">{container.totals.cbm.toFixed(2)}</span> },
    { key: 'cartons', header: 'Cartons', render: (container) => <span className="tabular-nums">{qty(container.totals.cartons)}</span> },
    {
      key: 'weight',
      header: 'Net / Gross wt',
      render: (container) => <Stack className="tabular-nums" top={kg(container.totals.netWeightKg)} bottom={kg(container.totals.grossWeightKg)} />,
    },
    { key: 'bol', header: 'BOL / MBL', render: (container) => <Stack className="font-mono text-xs" top={container.billOfLading ?? '—'} bottom={container.masterBillOfLading ?? '—'} /> },
    { key: 'etd', header: 'ETD', render: (container) => <span className="whitespace-nowrap text-sm">{date(container.etd)}</span> },
    { key: 'eta', header: 'ETA', render: (container) => <span className="whitespace-nowrap text-sm">{date(container.eta)}</span> },
    { key: 'poa', header: 'POA', render: (container) => <span className="whitespace-nowrap text-sm">{container.portOfArrival ?? '—'}</span> },
    {
      key: 'city',
      header: 'Dest. city',
      render: (container) => <Stack className="text-sm" top={container.destinationCity ?? '—'} bottom={[container.destinationProvince, DESTINATION_LABEL[container.destination]].filter(Boolean).join(' · ')} />,
    },
    {
      key: 'cost',
      header: 'Total cost',
      render: (container) => <span className="whitespace-nowrap tabular-nums">{container.totalCost === null ? '—' : money(container.totalCost, container.currency)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (container) => <Stack top={<ContainerStatusBadge status={container.status} />} bottom={container.deliveredAt ? formatCalendarDay(container.deliveredAt) : undefined} />,
    },
    { key: 'actions', header: 'Actions', render: (container) => <RowActionsMenu label={container.containerNo} items={actions.actionsFor(container)} /> },
  ]

  const rows = data?.data ?? []

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Containers</h1>
          {summary && (
            <p className="text-sm text-text-muted">
              {summary.all} {summary.all === 1 ? 'container' : 'containers'} · 1 packaging list each{summary.empty > 0 ? ` · ${summary.empty} empty` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={isExporting} onClick={() => void startExport('xlsx', { search: list.params.search, status: list.params.status, destination: list.params.destination })}>
            {isExporting ? 'Exporting…' : 'Export Excel'}
          </Button>
          {actions.canAssign && (
            <Button type="button" size="sm" onClick={actions.startCreate}>
              + New container
            </Button>
          )}
        </div>
      </div>

      <ContainerFilterBar state={list} idPrefix="ct" />

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-380px)] overflow-auto">
          {/* The arrow opens the container's panels (POs and payments, payment requests, documents, packed products) */}
          <TreeTable<ContainerItem>
            columns={columns}
            rows={rows}
            getKey={(container) => container.id}
            getChildren={() => []}
            getRowClassName={(container) => DESTINATION_ROW_TINT[container.destination]}
            renderDetail={(container) => <ContainerRowDetail containerId={container.id} canWrite={actions.canWrite} />}
            expandLabel="container details"
            isLoading={isLoading}
            isError={isError}
            emptyText={list.filtered ? 'No container matches.' : 'No containers yet.'}
            errorText="Could not load containers."
          />
        </div>
        {data && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={list.setPage} itemLabel="containers" />}
      </div>

      {actions.dialogs}
    </Container>
  )
}
