'use client'

import React, { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { FILL_TOGGLE, FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { RowActionsMenu, type RowActionItem } from '@/components/row-actions-menu/RowActionsMenu'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { TreeTable, type TreeColumn } from '@/components/tree-table/TreeTable'
import { Button } from '@/design-system/buttons'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useGetContainersQuery,
  useGetContainerSummaryQuery,
  useMarkContainerDeliveredMutation,
  type ContainerItem,
  type ContainerLine,
  type ContainerStatus,
  type PoDestination,
} from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { useDebounce } from '@/utils/debounce'
import { downloadApiFile } from '@/utils/downloadFile'
import { formatCalendarDay } from '@/utils/format'
import { CONTAINER_STATUS_META, ContainerStatusBadge, DESTINATION_LABEL } from '../shared/poMeta'
import { ChangeListModal } from './ChangeListModal'
import { ContainerFormModal } from './ContainerFormModal'
import { ContainerPoModal } from './ContainerPoModal'

const PAGE_SIZE = 20

type StatusFilter = 'ALL' | ContainerStatus
type CountryFilter = 'ALL' | PoDestination

interface Filters extends Record<string, unknown> {
  status: StatusFilter
  destination: CountryFilter
}

const DEFAULT_FILTERS: Filters = { status: 'ALL', destination: 'ALL' }

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'SHIPPED', label: CONTAINER_STATUS_META.SHIPPED.label },
  { value: 'DELIVERED_AT_WAREHOUSE', label: 'Delivered' },
]
const COUNTRY_OPTIONS: Array<{ value: CountryFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'US', label: DESTINATION_LABEL.US },
  { value: 'CA', label: DESTINATION_LABEL.CA },
]

/** One table row: a container, or one SKU line of its packaging list. */
type Row = { kind: 'container'; container: ContainerItem } | { kind: 'line'; line: ContainerLine; key: string }

const qty = (value: number) => value.toLocaleString('en-CA')
const kg = (value: number) => `${value.toLocaleString('en-CA', { maximumFractionDigits: 1 })} kg`
const money = (value: number, currency: string) => `${currency} ${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value: string | null) => (value ? formatCalendarDay(value) : '—')
const muted = <span className="text-text-muted">—</span>

const Stack: React.FC<{ top: React.ReactNode; bottom?: React.ReactNode; className?: string }> = ({ top, bottom, className }) => (
  <div className={cn('flex flex-col items-center whitespace-nowrap', className)}>
    <span>{top}</span>
    {bottom !== undefined && <span className="text-xs text-text-muted">{bottom}</span>}
  </div>
)

export const ContainersScreen: React.FC = () => {
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'procurement:containers')
  const canAssign = canWrite || ability.can('write', 'procurement:packaging-lists')
  const { success, failure } = useApiFeedback()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 300)
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(DEFAULT_FILTERS, () => setPage(1))
  const { applied, draft, setDraft, changed } = filters

  const { data, isLoading, isFetching, isError } = useGetContainersQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    status: applied.status === 'ALL' ? undefined : applied.status,
    destination: applied.destination === 'ALL' ? undefined : applied.destination,
  })
  const { data: summary } = useGetContainerSummaryQuery()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ContainerItem | null>(null)
  const [changingList, setChangingList] = useState<ContainerItem | null>(null)
  const [showingPo, setShowingPo] = useState<ContainerItem | null>(null)
  const [delivering, setDelivering] = useState<ContainerItem | null>(null)
  const [markDelivered, { isLoading: deliveringBusy }] = useMarkContainerDeliveredMutation()

  const confirmDelivered = async () => {
    if (!delivering) return
    try {
      await markDelivered(delivering.id).unwrap()
      success(`${delivering.containerNo} delivered at the warehouse`)
      setDelivering(null)
    } catch (error) {
      failure(error, 'Could not mark the container delivered')
    }
  }

  const download = async (container: ContainerItem) => {
    const list = container.packagingList
    if (!list) return
    try {
      await downloadApiFile(`/procurement/packaging-lists/${list.id}/pdf`, `${list.plNo.replace('#', '')}.pdf`)
    } catch (error) {
      failure(error, 'Could not download the PDF')
    }
  }

  const actionsFor = (container: ContainerItem): RowActionItem[] => {
    const noList = container.packagingList === null
    return [
      { key: 'po', label: 'Show purchase order', onSelect: () => setShowingPo(container), disabled: noList, disabledReason: 'No packaging list yet' },
      ...(canWrite ? [{ key: 'edit', label: 'Edit container', onSelect: () => setEditing(container) }] : []),
      ...(canAssign ? [{ key: 'list', label: noList ? 'Assign packaging list' : 'Change packaging list', onSelect: () => setChangingList(container) }] : []),
      { key: 'pdf', label: 'Download packaging list PDF', onSelect: () => void download(container), disabled: noList, disabledReason: 'No packaging list yet' },
      ...(canWrite && container.status === 'SHIPPED' ? [{ key: 'delivered', label: 'Mark delivered at warehouse', onSelect: () => setDelivering(container) }] : []),
    ]
  }

  const columns: TreeColumn<Row>[] = [
    {
      // Left-aligned like the products tree: the container, then its SKU lines indented beneath it
      key: 'container',
      header: 'Container / line',
      className: 'min-w-[150px] text-left',
      render: (row) =>
        row.kind === 'container' ? (
          <div className="min-w-0">
            <p className="whitespace-nowrap font-mono text-sm font-semibold text-text-primary">{row.container.containerNo}</p>
            <p className="whitespace-nowrap text-xs text-text-muted">{row.container.lines.length === 0 ? 'Empty' : `${row.container.lines.length} SKU${row.container.lines.length === 1 ? '' : 's'} · ${qty(row.container.totals.units)} units`}</p>
          </div>
        ) : (
          <div className="min-w-0 border-l-2 border-secondary-200 pl-4">
            <p className="whitespace-nowrap font-mono text-xs font-semibold text-text-primary">{row.line.sku}</p>
            <p className="whitespace-nowrap text-xs text-text-muted">
              {qty(row.line.units)} of {qty(row.line.ordered)} units · {row.line.poNo}
            </p>
          </div>
        ),
    },
    {
      key: 'list',
      header: 'Packaging list',
      className: 'min-w-[220px] text-left',
      render: (row) => {
        if (row.kind === 'line') return <p className="text-sm text-text-primary">{row.line.name}</p>
        const list = row.container.packagingList
        if (!list) {
          return canAssign ? (
            <Button type="button" variant="outline" size="sm" className="border-dashed" onClick={() => setChangingList(row.container)}>
              + Assign packaging list
            </Button>
          ) : (
            muted
          )
        }
        return (
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-text-primary">{list.plNo}</p>
            <p className="truncate text-xs text-text-muted">
              {list.supplier.name} · {list.purchaseOrders.map((po) => po.poNo).join(', ')}
            </p>
          </div>
        )
      },
    },
    { key: 'cbm', header: 'Total CBM', render: (row) => <span className="font-mono text-xs">{(row.kind === 'container' ? row.container.totals.cbm : row.line.cbm).toFixed(2)}</span> },
    { key: 'cartons', header: 'Cartons', render: (row) => <span className="tabular-nums">{qty(row.kind === 'container' ? row.container.totals.cartons : row.line.cartons)}</span> },
    {
      key: 'weight',
      header: 'Net / Gross wt',
      render: (row) => {
        const weights = row.kind === 'container' ? row.container.totals : row.line
        return <Stack className="tabular-nums" top={kg(weights.netWeightKg)} bottom={kg(weights.grossWeightKg)} />
      },
    },
    {
      key: 'bol',
      header: 'BOL / MBL',
      render: (row) => (row.kind === 'container' ? <Stack className="font-mono text-xs" top={row.container.billOfLading ?? '—'} bottom={row.container.masterBillOfLading ?? '—'} /> : null),
    },
    {
      key: 'dates',
      header: 'ETD / ETA',
      render: (row) => (row.kind === 'container' ? <Stack className="text-sm" top={date(row.container.etd)} bottom={date(row.container.eta)} /> : null),
    },
    { key: 'poa', header: 'POA', render: (row) => (row.kind === 'container' ? <span className="whitespace-nowrap text-sm">{row.container.portOfArrival ?? '—'}</span> : null) },
    {
      key: 'city',
      header: 'Dest. city',
      render: (row) =>
        row.kind === 'container' ? (
          <Stack className="text-sm" top={row.container.destinationCity ?? '—'} bottom={[row.container.destinationProvince, DESTINATION_LABEL[row.container.destination]].filter(Boolean).join(' · ')} />
        ) : null,
    },
    {
      key: 'cost',
      header: 'Total cost',
      render: (row) => (row.kind === 'container' ? <span className="whitespace-nowrap tabular-nums">{row.container.totalCost === null ? '—' : money(row.container.totalCost, row.container.currency)}</span> : null),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.kind === 'container' ? (
          <Stack top={<ContainerStatusBadge status={row.container.status} />} bottom={row.container.deliveredAt ? formatCalendarDay(row.container.deliveredAt) : undefined} />
        ) : null,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (row.kind === 'container' ? <RowActionsMenu label={row.container.containerNo} items={actionsFor(row.container)} /> : null),
    },
  ]

  const rows: Row[] = (data?.data ?? []).map((container) => ({ kind: 'container', container }))
  const filtered = Boolean(debouncedSearch) || filters.appliedCount > 0

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
        {canAssign && (
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            + New container
          </Button>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="ct-search">
              <input
                id="ct-search"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="CID, BOL, PL # or PO #"
                className="ds-input ds-input-default rounded-lg"
              />
            </FormField>
          </FilterItem>
          <FilterItem wide>
            <FormField label="Status">
              <SegmentedToggle<StatusFilter> ariaLabel="Status" value={draft.status} onChange={(v) => setDraft('status', v)} options={STATUS_OPTIONS} className={cn(FILL_TOGGLE, changed.has('status') && 'ring-1 ring-primary-500')} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Country">
              <SegmentedToggle<CountryFilter> ariaLabel="Country" value={draft.destination} onChange={(v) => setDraft('destination', v)} options={COUNTRY_OPTIONS} className={cn(FILL_TOGGLE, changed.has('destination') && 'ring-1 ring-primary-500')} />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-380px)] overflow-auto">
          <TreeTable<Row>
            columns={columns}
            rows={rows}
            getKey={(row) => (row.kind === 'container' ? `c${row.container.id}` : row.key)}
            getChildren={(row) => (row.kind === 'container' ? row.container.lines.map((line) => ({ kind: 'line' as const, line, key: `c${row.container.id}:${line.purchaseOrderId}:${line.sku}` })) : [])}
            autoExpand={() => Boolean(debouncedSearch)}
            isLoading={isLoading}
            isError={isError}
            emptyText={filtered ? 'No container matches.' : 'No containers yet.'}
            errorText="Could not load containers."
          />
        </div>
        {data && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="containers" />}
      </div>

      <ContainerFormModal isOpen={creating || editing !== null} container={editing} onClose={() => (setCreating(false), setEditing(null))} />
      <ChangeListModal container={changingList} onClose={() => setChangingList(null)} />
      <ContainerPoModal container={showingPo} onClose={() => setShowingPo(null)} />

      <ConfirmDialog
        isOpen={delivering !== null}
        title={`Mark ${delivering?.containerNo ?? 'container'} delivered`}
        confirmLabel="Mark delivered"
        busy={deliveringBusy}
        onConfirm={confirmDelivered}
        onClose={() => setDelivering(null)}
      >
        <p>
          {delivering?.packagingList ? `${delivering.packagingList.plNo} (${qty(delivering.totals.units)} units)` : 'The container'} arrived at the warehouse. You can still change the status from Edit container.
        </p>
      </ConfirmDialog>
    </Container>
  )
}
