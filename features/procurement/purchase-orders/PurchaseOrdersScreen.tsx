'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DateRangePicker, { type DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { ReasonDialog } from '@/components/reason-dialog/ReasonDialog'
import { FILL_TOGGLE, FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect, type FilterOption } from '@/components/filter-bar/FilterMultiSelect'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useGetPurchaseOrderFilterOptionsQuery,
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderSummaryQuery,
  useSetPurchaseOrderOpenMutation,
  type EtdAlertLevel,
  type PaymentState,
  type PoDestination,
  type PoStatus,
  type PurchaseOrderListItem,
} from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { useDebounce } from '@/utils/debounce'
import { DESTINATION_LABEL, PAYMENT_META, PO_STATUS_META, newPackagingListHref, poPackagingListsHref, poPaymentRequestsHref } from '../shared/poMeta'
import { PoLegend } from './PoLegend'
import { PurchaseOrdersTable } from './PurchaseOrdersTable'
import { usePoDecisions } from './usePoDecisions'

const BASE = '/dashboard/procurement/purchase-orders'
const PAGE_SIZE = 20

type AlertFilter = Exclude<EtdAlertLevel, 'NONE'>
type OpenFilter = 'ALL' | 'OPEN' | 'CLOSED'

interface Filters extends Record<string, unknown> {
  colors: string[]
  destinations: PoDestination[]
  statuses: PoStatus[]
  paymentStatuses: PaymentState[]
  etd: DateRangeValue
  etdAlerts: AlertFilter[]
  open: OpenFilter
}

const DEFAULT_FILTERS: Filters = {
  colors: [],
  destinations: [],
  statuses: [],
  paymentStatuses: [],
  etd: { startDate: null, endDate: null },
  etdAlerts: [],
  open: 'ALL',
}

const strings = (values: string[] = []): FilterOption[] => values.map((value) => ({ value, label: value }))
const DESTINATIONS: FilterOption<PoDestination>[] = (['US', 'CA'] as const).map((value) => ({ value, label: DESTINATION_LABEL[value] }))
const STATUSES = (Object.keys(PO_STATUS_META) as PoStatus[]).map((value) => ({ value, label: PO_STATUS_META[value].label }))
const PAYMENTS = (Object.keys(PAYMENT_META) as PaymentState[]).map((value) => ({ value, label: PAYMENT_META[value].label }))
const ALERTS: FilterOption<AlertFilter>[] = [
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'SOON', label: '≤ 10 days' },
  { value: 'OK', label: '> 10 days' },
]
const OPEN_OPTIONS: Array<{ value: OpenFilter; label: string }> = [
  { value: 'ALL', label: 'Any' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
]

const day = (value: string | null | undefined) => (value ? value.slice(0, 10) : undefined)

export const PurchaseOrdersScreen: React.FC = () => {
  const router = useRouter()
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'procurement:purchase-orders')
  const canDecide = ability.can('write', 'procurement:po-approval')
  const canViewPayments = ability.can('read', 'finance:payment-request')
  const canPack = ability.can('write', 'procurement:packaging-lists')
  const decisions = usePoDecisions()
  const [approving, setApproving] = useState<PurchaseOrderListItem | null>(null)
  const [rejecting, setRejecting] = useState<PurchaseOrderListItem | null>(null)
  const { success, failure } = useApiFeedback()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 300)
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(DEFAULT_FILTERS, () => setPage(1))
  const { applied, draft, setDraft, changed } = filters

  const { data, isLoading, isFetching, isError } = useGetPurchaseOrdersQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    colors: applied.colors,
    destinations: applied.destinations,
    statuses: applied.statuses,
    paymentStatuses: applied.paymentStatuses,
    etdFrom: day(applied.etd.startDate),
    etdTo: day(applied.etd.endDate),
    etdAlerts: applied.etdAlerts,
    open: applied.open,
  })
  const { data: summary } = useGetPurchaseOrderSummaryQuery()
  const { data: options, isLoading: loadingOptions } = useGetPurchaseOrderFilterOptionsQuery()

  const [closing, setClosing] = useState<PurchaseOrderListItem | null>(null)
  const [setOpen, { isLoading: toggling }] = useSetPurchaseOrderOpenMutation()

  const changeOpen = async (row: PurchaseOrderListItem, isOpen: boolean) => {
    try {
      await setOpen({ id: row.id, isOpen }).unwrap()
      success(`${row.poNo} ${isOpen ? 'reopened' : 'closed'}`)
      setClosing(null)
    } catch (error) {
      failure(error, `Could not ${isOpen ? 'reopen' : 'close'} ${row.poNo}`)
    }
  }

  const filtered = Boolean(debouncedSearch) || filters.appliedCount > 0
  const box = (key: keyof Filters) => changed.has(key)

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Purchase orders</h1>
          {summary && (
            <p className="text-sm text-text-muted">
              {summary.all} purchase {summary.all === 1 ? 'order' : 'orders'} · {summary.open} open · {summary.overdue} overdue
            </p>
          )}
        </div>
        {canWrite && (
          <Link href={`${BASE}/new`} className="ds-button ds-button-primary ds-button-sm">
            + New purchase order
          </Link>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
          <p className="text-xs text-text-muted">Pick any combination, then apply</p>
        </div>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="po-search">
              <input
                id="po-search"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="PO #, supplier, contact, product or SKU"
                className="ds-input ds-input-default rounded-lg"
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Color" htmlFor="po-color">
              <FilterMultiSelect id="po-color" options={strings(options?.colors)} value={draft.colors} onChange={(v) => setDraft('colors', v)} anyLabel="Any color" highlighted={box('colors')} loading={loadingOptions} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Destination" htmlFor="po-destination">
              <FilterMultiSelect id="po-destination" options={DESTINATIONS} value={draft.destinations} onChange={(v) => setDraft('destinations', v)} anyLabel="Any destination" highlighted={box('destinations')} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Status" htmlFor="po-status">
              <FilterMultiSelect id="po-status" options={STATUSES} value={draft.statuses} onChange={(v) => setDraft('statuses', v)} anyLabel="Any status" highlighted={box('statuses')} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Payment status" htmlFor="po-payment">
              <FilterMultiSelect id="po-payment" options={PAYMENTS} value={draft.paymentStatuses} onChange={(v) => setDraft('paymentStatuses', v)} anyLabel="Any" highlighted={box('paymentStatuses')} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="ETD">
              <div
                className={cn(
                  'rounded-lg [&>div]:block [&>div]:w-full [&>div>button]:h-10 [&>div>button]:w-full [&>div>button]:py-0 [&>div>button>span]:flex-1 [&>div>button>span]:text-left',
                  box('etd') && 'ring-1 ring-primary-500'
                )}
              >
                <DateRangePicker value={draft.etd} onChange={(range) => setDraft('etd', range)} showPresets={false} placeholder="Any date range" />
              </div>
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="ETD alert" htmlFor="po-alert">
              <FilterMultiSelect id="po-alert" options={ALERTS} value={draft.etdAlerts} onChange={(v) => setDraft('etdAlerts', v)} anyLabel="Overdue · ≤ 10 · > 10 days" highlighted={box('etdAlerts')} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Open / Closed">
              <SegmentedToggle<OpenFilter> ariaLabel="Open or closed" value={draft.open} onChange={(v) => setDraft('open', v)} options={OPEN_OPTIONS} className={cn(FILL_TOGGLE, box('open') && 'ring-1 ring-primary-500')} />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-420px)] overflow-auto">
          <PurchaseOrdersTable
            rows={data?.data ?? []}
            isLoading={isLoading}
            isError={isError}
            filtered={filtered}
            canWrite={canWrite}
            canDecide={canDecide}
            canViewPayments={canViewPayments}
            canPack={canPack}
            onCreatePackagingList={(row) => router.push(newPackagingListHref(row.id))}
            onViewPackagingLists={(row) => router.push(poPackagingListsHref(row.id))}
            onViewPayments={(row) => router.push(poPaymentRequestsHref(row.id))}
            onOpen={(row) => router.push(`${BASE}/${row.id}`)}
            onApprove={setApproving}
            onReject={setRejecting}
            onClose={setClosing}
            onReopen={(row) => void changeOpen(row, true)}
            onFromRemaining={(row) => router.push(`${BASE}/new?fromRemaining=${row.id}`)}
          />
        </div>
        {data && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="purchase orders" />}
      </div>

      <PoLegend />

      <ConfirmDialog
        isOpen={approving !== null}
        title={`Approve ${approving?.poNo ?? 'PO'}`}
        confirmLabel="Approve & lock"
        busy={decisions.busy?.decision === 'approve'}
        onConfirm={async () => approving && (await decisions.approve(approving)) && setApproving(null)}
        onClose={() => setApproving(null)}
      >
        <p>
          Approving moves <strong>{approving?.poNo}</strong> ({approving?.supplier.name}) to In progress and locks every field permanently. Only the open / closed toggle stays available.
        </p>
      </ConfirmDialog>

      <ReasonDialog
        isOpen={rejecting !== null}
        title={`Reject ${rejecting?.poNo ?? 'PO'}?`}
        description="It stays pending approval. The person who raised it is notified with your reason and can update it."
        confirmLabel="Reject PO"
        placeholder="e.g. Production date conflicts with Q4 schedule"
        minLength={3}
        submitting={decisions.busy?.decision === 'reject'}
        onConfirm={(reason) => (rejecting ? decisions.reject(rejecting, reason) : Promise.resolve(false))}
        onClose={() => setRejecting(null)}
      />

      <ConfirmDialog
        isOpen={closing !== null}
        title={`Close ${closing?.poNo ?? 'PO'}`}
        confirmLabel="Close PO"
        tone="danger"
        busy={toggling}
        onConfirm={() => closing && void changeOpen(closing, false)}
        onClose={() => setClosing(null)}
      >
        <p>A closed PO takes no new packaging lists or payments and stops ETD reminders. Units not packed yet can move to a new PO with “Create PO from remaining”.</p>
      </ConfirmDialog>
    </Container>
  )
}
