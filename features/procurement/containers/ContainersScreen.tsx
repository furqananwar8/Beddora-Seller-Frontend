'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { TreeTable, type TreeColumn } from '@/components/tree-table/TreeTable'
import { Button } from '@/design-system/buttons'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useReportExport } from '@/hooks/useReportExport'
import { useGetContainersQuery, useGetContainerSummaryQuery, type ContainerItem } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatCalendarDay } from '@/utils/format'
import { ContainerStatusBadge, DESTINATION_LABEL, DESTINATION_ROW_TINT, NeedsDetailsBadge } from '../shared/poMeta'
import { CostMappingModal } from './cost-analysis/CostMappingModal'
import { ContainerRowDetail } from './detail/ContainerOverview'
import { ContainerCell, skuSummary } from './list/ContainerCell'
import { ShippedOnBoardCell } from './list/ShippedOnBoardCell'
import { BrandCell } from '../shared/platformMeta'
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
  // The customs broker column reads the L4s mapped to Custom brokerage; the same mapping as the cost analysis
  const canMap = useAppAbility().can('write', 'containers:cost-analysis.mapping')
  const [mapping, setMapping] = useState(false)

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
    { key: 'cbm', header: 'Total CBM', className: 'min-w-[100px] whitespace-nowrap', render: (container) => <span className="font-mono text-xs">{container.totals.cbm.toFixed(2)}</span> },
    {
      key: 'cartons',
      header: 'Cartons (Received / Short)', className: 'min-w-[150px] whitespace-nowrap',
      render: (container) => {
        const { cartons } = container.totals
        // Before Inbound Receiving is confirmed only the packed cartons are known
        if (!container.receiving) return <Stack className="tabular-nums" top={qty(cartons)} bottom="not received yet" />
        const { shortageCartons, damagedCartons } = container.receiving
        return (
          <Stack
            className="tabular-nums"
            top={
              <span>
                {qty(cartons - shortageCartons)} / <span className={cn(shortageCartons > 0 && 'rounded bg-danger-50 px-1.5 py-0.5 font-semibold text-danger-600')}>{qty(shortageCartons)}</span>
              </span>
            }
            bottom={damagedCartons > 0 ? `${qty(damagedCartons)} damaged` : undefined}
          />
        )
      },
    },
    {
      key: 'weight',
      header: 'Net / Gross wt', className: 'min-w-[140px] whitespace-nowrap',
      render: (container) => <Stack className="tabular-nums" top={kg(container.totals.netWeightKg)} bottom={kg(container.totals.grossWeightKg)} />,
    },
    { key: 'bol', header: 'BOL / MBL', className: 'min-w-[130px] whitespace-nowrap', render: (container) => <Stack className="font-mono text-xs" top={container.billOfLading ?? '—'} bottom={container.masterBillOfLading ?? '—'} /> },
    { key: 'etd', header: 'ETD', className: 'min-w-[100px] whitespace-nowrap', render: (container) => <span className="whitespace-nowrap text-sm">{date(container.etd)}</span> },
    { key: 'eta', header: 'ETA', className: 'min-w-[100px] whitespace-nowrap', render: (container) => <span className="whitespace-nowrap text-sm">{date(container.eta)}</span> },
    { key: 'board', header: 'Shipped on board', className: 'min-w-[170px] whitespace-nowrap', render: (container) => <ShippedOnBoardCell container={container} canWrite={actions.canWrite} /> },
    { key: 'transit', header: 'Transit days', className: 'min-w-[120px] whitespace-nowrap', render: (container) => <span className="tabular-nums">{container.transitDays ?? '—'}</span> },
    {
      key: 'status',
      header: 'Status', className: 'min-w-[150px] whitespace-nowrap',
      render: (container) => (
        <Stack
          top={
            <span className="inline-flex flex-wrap items-center gap-1">
              <ContainerStatusBadge status={container.status} />
              {container.needsDetails && <NeedsDetailsBadge />}
            </span>
          }
          bottom={container.deliveredAt ? formatCalendarDay(container.deliveredAt) : undefined}
        />
      ),
    },
    { key: 'poa', header: 'Port', className: 'min-w-[120px] whitespace-nowrap', render: (container) => <span className="whitespace-nowrap text-sm">{container.portOfArrival ?? '—'}</span> },
    { key: 'plBoxes', header: 'PL boxes', className: 'min-w-[100px] whitespace-nowrap', render: (container) => <span className="tabular-nums">{qty(container.totals.cartons)}</span> },
    { key: 'plUnits', header: 'PL units', className: 'min-w-[100px] whitespace-nowrap', render: (container) => <span className="tabular-nums">{qty(container.totals.units)}</span> },
    { key: 'skus', header: 'No. of SKUs', className: 'min-w-[110px] whitespace-nowrap', render: (container) => <span className="tabular-nums">{qty(container.totals.skus)}</span> },
    { key: 'brand', header: 'Brand', className: 'min-w-[170px] whitespace-nowrap', render: (container) => <BrandCell platforms={container.platforms} /> },
    { key: 'warehouse', header: 'Warehouse', className: 'min-w-[150px] whitespace-nowrap', render: (container) => <span className="text-sm">{container.warehouse?.name ?? '—'}</span> },
    { key: 'cubicFeet', header: 'Cubic feet', className: 'min-w-[110px] whitespace-nowrap', render: (container) => <span className="tabular-nums">{container.cubicFeet === null ? '—' : qty(container.cubicFeet)}</span> },
    { key: 'broker', header: 'Custom broker', className: 'min-w-[140px]', render: (container) => <span className="text-sm">{container.customsBrokers.length ? container.customsBrokers.join(', ') : '—'}</span> },
    {
      key: 'city',
      header: 'Dest. city', className: 'min-w-[150px] whitespace-nowrap',
      render: (container) => <Stack className="text-sm" top={container.destinationCity ?? '—'} bottom={[container.destinationProvince, DESTINATION_LABEL[container.destination]].filter(Boolean).join(' · ')} />,
    },
    {
      key: 'cost',
      header: 'Total cost', className: 'min-w-[130px] whitespace-nowrap',
      render: (container) => <span className="whitespace-nowrap tabular-nums">{container.totalCost === null ? '—' : money(container.totalCost, container.totalCostCurrency)}</span>,
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
          {canMap && (
            <Button type="button" size="sm" variant="outline" onClick={() => setMapping(true)}>
              Map expense columns
            </Button>
          )}
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
      <CostMappingModal open={mapping} onClose={() => setMapping(false)} />
    </Container>
  )
}
