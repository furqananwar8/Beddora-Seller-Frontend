'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { TreeTable, type TreeColumn } from '@/components/tree-table/TreeTable'
import { Button } from '@/design-system/buttons'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useFitToViewport } from '@/hooks/useFitToViewport'
import { useReportExport } from '@/hooks/useReportExport'
import { SortHeader } from '@/components/sort-header/SortHeader'
import { useGetContainersQuery, useGetContainerSummaryQuery, type ContainerItem, type ContainerSortColumn } from '@/services/api/procurement.api'
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
  // The table's box fits the window, so its sideways scrollbar is in view without scrolling the page
  const fit = useFitToViewport<HTMLDivElement>()

  const list = useContainerListState()
  const { data, isLoading, isFetching, isError } = useGetContainersQuery(list.params)
  const { data: summary } = useGetContainerSummaryQuery()
  const { start: startExport, isExporting } = useReportExport('containers')

  const sortHeader = (column: ContainerSortColumn, label: string) => (
    <SortHeader direction={list.sort?.column === column ? list.sort.order : null} onClick={() => list.toggleSort(column)}>
      {label}
    </SortHeader>
  )

  const columns: TreeColumn<ContainerItem>[] = [
    {
      key: 'container',
      header: 'Container',
      className: 'min-w-[150px] text-left',
      render: (container) => <ContainerCell container={container} detail={skuSummary(container.lines.length, container.totals.units)} />,
    },
    { key: 'brand', header: 'Brand', className: 'min-w-[170px]', render: (container) => <BrandCell platforms={container.platforms} /> },
    { key: 'cbm', header: 'Total CBM', className: 'min-w-[100px]', render: (container) => <span className="font-mono text-xs">{container.totals.cbm.toFixed(2)}</span> },
    {
      key: 'cartons',
      header: 'Cartons (Received / Short)', className: 'min-w-[170px]',
      // Received / short side by side (like Net / Gross wt); the packed cartons are in PL boxes
      render: (container) => {
        const { cartons } = container.totals
        // Nothing is received or short until Inbound Receiving is confirmed
        if (!container.receiving) return <span className="text-sm tabular-nums">— / —</span>
        const { shortageCartons, damagedCartons } = container.receiving
        return (
          <span className="text-sm tabular-nums" title={damagedCartons > 0 ? `${qty(damagedCartons)} damaged` : undefined}>
            {qty(cartons - shortageCartons)} / <span className={cn(shortageCartons > 0 && 'rounded bg-danger-50 px-1.5 py-0.5 font-semibold text-danger-600')}>{qty(shortageCartons)}</span>
          </span>
        )
      },
    },
    {
      key: 'weight',
      header: 'Net / Gross wt', className: 'min-w-[230px]',
      // Net and gross side by side on one line; it wraps only when the column is too narrow for both
      render: (container) => (
        <span className="text-sm tabular-nums">
          {kg(container.totals.netWeightKg)} / {kg(container.totals.grossWeightKg)}
        </span>
      ),
    },
    {
      key: 'bol',
      header: 'BOL / MBL',
      className: 'min-w-[320px]',
      // Side by side on one line; a long pair wraps at the slash instead of being cut off
      render: (container) => (
        <span className="font-mono text-xs">
          {container.billOfLading ?? '—'} / {container.masterBillOfLading ?? '—'}
        </span>
      ),
    },
    { key: 'etd', header: sortHeader('etd', 'ETD'), className: 'min-w-[100px]', render: (container) => <span className="whitespace-nowrap text-sm">{date(container.etd)}</span> },
    { key: 'eta', header: sortHeader('eta', 'ETA'), className: 'min-w-[100px]', render: (container) => <span className="whitespace-nowrap text-sm">{date(container.eta)}</span> },
    { key: 'board', header: 'Shipped on board', className: 'min-w-[170px]', render: (container) => <ShippedOnBoardCell container={container} canWrite={actions.canWrite} /> },
    { key: 'transit', header: 'Transit days', className: 'min-w-[120px]', render: (container) => <span className="tabular-nums">{container.transitDays ?? '—'}</span> },
    {
      key: 'status',
      header: 'Status', className: 'min-w-[150px]',
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
    { key: 'poa', header: 'Port', className: 'min-w-[120px]', render: (container) => <span className="text-sm">{container.portOfArrival ?? '—'}</span> },
    { key: 'plBoxes', header: 'PL boxes', className: 'min-w-[100px]', render: (container) => <span className="tabular-nums">{qty(container.totals.cartons)}</span> },
    { key: 'plUnits', header: 'PL units', className: 'min-w-[100px]', render: (container) => <span className="tabular-nums">{qty(container.totals.units)}</span> },
    { key: 'skus', header: 'No. of SKUs', className: 'min-w-[110px]', render: (container) => <span className="tabular-nums">{qty(container.totals.skus)}</span> },
    { key: 'warehouse', header: 'Warehouse', className: 'min-w-[150px]', render: (container) => <span className="text-sm">{container.warehouse?.name ?? '—'}</span> },
    { key: 'cubicFeet', header: 'Cubic feet', className: 'min-w-[110px]', render: (container) => <span className="tabular-nums">{container.cubicFeet === null ? '—' : qty(container.cubicFeet)}</span> },
    { key: 'broker', header: 'Custom broker', className: 'min-w-[140px]', render: (container) => <span className="text-sm">{container.customsBrokers.length ? container.customsBrokers.join(', ') : '—'}</span> },
    {
      key: 'city',
      header: 'Dest. city', className: 'min-w-[270px]',
      // City, then province and country beside it on the same line
      render: (container) => {
        const place = [container.destinationProvince, DESTINATION_LABEL[container.destination]].filter(Boolean).join(' · ')
        return (
          <span className="text-sm text-black">
            {container.destinationCity ?? '—'}
            {place && ` · ${place}`}
          </span>
        )
      },
    },
    {
      key: 'cost',
      header: 'Total cost', className: 'min-w-[130px]',
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
          <Button type="button" size="sm" variant="outline" disabled={isExporting} onClick={() => void startExport('xlsx', { search: list.params.search, status: list.params.status, destination: list.params.destination, platform: list.params.platform })}>
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
        <div ref={fit.ref} style={fit.style} className="max-h-[calc(100vh-380px)] overflow-auto">
          {/* The arrow opens the container's panels (POs and payments, payment requests, documents, packed products) */}
          {/* The box around it is the one scroller (both ways), so the sideways scrollbar sits at the bottom of the visible
              area and not below the last row; the table's own wrapper must not scroll */}
          <TreeTable<ContainerItem>
            wrapperClassName="overflow-visible"
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
