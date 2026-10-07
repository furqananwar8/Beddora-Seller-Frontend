'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { FILL_TOGGLE, FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { TreeTable, type TreeColumn } from '@/components/tree-table/TreeTable'
import { Button } from '@/design-system/buttons'
import {
  useGetContainersQuery,
  useGetContainerSummaryQuery,
  type ContainerItem,
  type ContainerStatus,
  type PoDestination,
} from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { useDebounce } from '@/utils/debounce'
import { formatCalendarDay } from '@/utils/format'
import { CONTAINER_STATUS_META, CONTAINER_STATUSES, ContainerStatusBadge, DESTINATION_LABEL, supplierNames } from '../shared/poMeta'
import { ContainerRowDetail } from './detail/ContainerOverview'
import { containerHref, useContainerActions } from './useContainerActions'

const PAGE_SIZE = 20

type StatusFilter = 'ALL' | ContainerStatus
type CountryFilter = 'ALL' | PoDestination

interface Filters extends Record<string, unknown> {
  status: StatusFilter
  destination: CountryFilter
}

const DEFAULT_FILTERS: Filters = { status: 'ALL', destination: 'ALL' }

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [{ value: 'ALL', label: 'All' }, ...CONTAINER_STATUSES.map((value) => ({ value, label: CONTAINER_STATUS_META[value].label }))]
const COUNTRY_OPTIONS: Array<{ value: CountryFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'US', label: DESTINATION_LABEL.US },
  { value: 'CA', label: DESTINATION_LABEL.CA },
]

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
  const actions = useContainerActions()

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

  const columns: TreeColumn<ContainerItem>[] = [
    {
      key: 'container',
      header: 'Container',
      className: 'min-w-[150px] text-left',
      render: (container) => (
        <div className="min-w-0">
          <Link href={containerHref(container.id)} className="whitespace-nowrap font-mono text-sm font-semibold text-text-primary underline-offset-2 hover:underline">
            {container.containerNumber ?? 'No number yet'}
          </Link>
          <p className="whitespace-nowrap font-mono text-[11px] text-text-muted">{container.containerNo}</p>
          <p className="whitespace-nowrap text-xs text-text-muted">{container.lines.length === 0 ? 'Empty' : `${container.lines.length} SKU${container.lines.length === 1 ? '' : 's'} · ${qty(container.totals.units)} units`}</p>
        </div>
      ),
    },
    {
      key: 'list',
      header: 'Packaging list',
      className: 'min-w-[220px] text-left',
      render: (container) => {
        const list = container.packagingList
        if (!list) {
          return actions.canAssign && container.permissions.canChangeList ? (
            <Button type="button" variant="outline" size="sm" className="border-dashed" onClick={() => actions.changeList(container)}>
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
              {supplierNames(list.suppliers)} · {list.purchaseOrders.map((po) => po.poNo).join(', ')}
            </p>
          </div>
        )
      },
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
        {actions.canAssign && (
          <Button type="button" size="sm" onClick={actions.startCreate}>
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
                placeholder="Container #, CID, BOL, PL # or PO #"
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
          {/* The arrow opens the container's panels (POs and payments, payment requests, documents, packed products) */}
          <TreeTable<ContainerItem>
            columns={columns}
            rows={rows}
            getKey={(container) => container.id}
            getChildren={() => []}
            renderDetail={(container) => <ContainerRowDetail containerId={container.id} canWrite={actions.canWrite} />}
            expandLabel="container details"
            isLoading={isLoading}
            isError={isError}
            emptyText={filtered ? 'No container matches.' : 'No containers yet.'}
            errorText="Could not load containers."
          />
        </div>
        {data && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="containers" />}
      </div>

      {actions.dialogs}
    </Container>
  )
}
