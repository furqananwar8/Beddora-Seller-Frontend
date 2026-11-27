'use client'

import { useFitToViewport } from '@/hooks/useFitToViewport'
import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { endOfDay, endOfMonth, format, parseISO, startOfDay, startOfMonth, subMonths } from 'date-fns'
import { Container } from '@/components/layout'
import DateRangePicker, { DateRangePreset, DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Button } from '@/design-system/buttons'
import { ExportExcelButton } from '@/components/export-button/ExportExcelButton'
import { Tabs } from '@/design-system/tabs'
import { FilterBar, FilterItem, FILL_PICKER } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect } from '@/components/filter-bar/FilterMultiSelect'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import {
  PaymentRequestListParams,
  RequestPaymentFilter,
  RequestStatus,
  useGetApproverStatusQuery,
  useGetLeafCostCentersQuery,
  useGetPaymentRequestsQuery,
  useGetPaymentRequestSummaryQuery,
} from '@/services/api/finance.api'
import { formatPoNo } from '@/features/procurement/shared/poMeta'
import { cn } from '@/utils/cn'
import { formatBatchNo, formatRequestNo } from '../shared/format'
import { FormField } from '../shared/FormField'
import { ExpenseTypesModal } from './ExpenseTypesModal'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { RejectDialog } from './RejectDialog'
import { RequestDetailModal } from './RequestDetailModal'
import { RequestsTable } from './RequestsTable'
import { useRequestActions } from './useRequestActions'

import { usePageSize } from '@/hooks/usePageSize'
const PAGE_SIZE = 10

/** A status, or approved requests split by whether their payment is marked paid. */
type TabId = RequestStatus | RequestPaymentFilter | 'ALL'

const PAYMENT_TABS: ReadonlySet<TabId> = new Set<RequestPaymentFilter>(['PAID', 'UNPAID'])

/** Tabs a link may open (`?tab=`). */
const TAB_IDS: ReadonlySet<TabId> = new Set<TabId>(['PENDING_APPROVAL', 'APPROVED', 'PAID', 'UNPAID', 'REJECTED', 'ALL', 'DRAFT'])

/** No date range: every request, whenever it was raised. */
const ANY_DATE: DateRangeValue = { startDate: null, endDate: null, presetId: null }

/** The list filters a tab stands for. */
const tabFilters = (tab: TabId): Pick<PaymentRequestListParams, 'status' | 'payment' | 'scope'> => {
  if (tab === 'ALL') return {}
  if (PAYMENT_TABS.has(tab)) return { payment: tab as RequestPaymentFilter }
  return { status: tab as RequestStatus, scope: tab === 'DRAFT' ? 'mine' : undefined }
}

const FILTER_PRESETS: DateRangePreset[] = [
  {
    id: 'thisMonth',
    label: 'This Month',
    getRange: () => ({ startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'), endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd') }),
  },
  {
    id: 'lastMonth',
    label: 'Last Month',
    getRange: () => {
      const last = subMonths(new Date(), 1)
      return { startDate: format(startOfMonth(last), 'yyyy-MM-dd'), endDate: format(endOfMonth(last), 'yyyy-MM-dd') }
    },
  },
  // Empty range clears the date filter.
  { id: 'all', label: 'All time', getRange: () => ({ startDate: '', endDate: '' }) },
  // Custom keeps the picker open: the user picks days, then presses Apply.
  { id: 'custom', label: 'Custom', getRange: () => ({ startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') }) },
]

const THIS_MONTH: DateRangeValue = { ...FILTER_PRESETS[0].getRange(), presetId: 'thisMonth' }

/** Custom range (or preset) to ISO bounds covering whole days; all time sends no bounds. */
function rangeFor(range: DateRangeValue): { dateFrom?: string; dateTo?: string } {
  if (!range.startDate || !range.endDate) return {}
  return { dateFrom: startOfDay(parseISO(range.startDate)).toISOString(), dateTo: endOfDay(parseISO(range.endDate)).toISOString() }
}

/** The boxes of the filter bar; ids of the multi-selects are strings. */
interface ListFilters extends Record<string, unknown> {
  search: string
  costCenterIds: string[]
  batched: string[]
  dateRange: DateRangeValue
}

const DEFAULT_FILTERS: ListFilters = { search: '', costCenterIds: [], batched: [], dateRange: THIS_MONTH }

const BATCH_OPTIONS = [
  { value: 'yes', label: 'Batched' },
  { value: 'no', label: 'Single' },
]

export const PaymentRequestScreen: React.FC = () => {
  const fit = useFitToViewport<HTMLDivElement>()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const openParam = Number(searchParams.get('open'))
  const openId = Number.isInteger(openParam) && openParam > 0 ? openParam : null
  // Opened from another screen (Cashflow Planning): its details offer a way back there. Only paths inside the app.
  const returnParam = searchParams.get('returnTo')
  const backHref = returnParam && returnParam.startsWith('/dashboard/') && !returnParam.startsWith('//') ? returnParam : null
  // A link to one request (`?highlight=`): its row is marked and scrolled to, on the tab the link names, whenever it was raised
  const highlightParam = Number(searchParams.get('highlight'))
  const highlightId = Number.isInteger(highlightParam) && highlightParam > 0 ? highlightParam : null
  const tabParam = searchParams.get('tab') as TabId | null
  // "View payment requests" on a purchase order opens this list narrowed to that PO
  const poParam = Number(searchParams.get('purchaseOrderId'))
  const purchaseOrderId = Number.isInteger(poParam) && poParam > 0 ? poParam : null
  // "View batch" opens this list narrowed to the requests raised together
  const batchParam = Number(searchParams.get('batchId'))
  const batchId = Number.isInteger(batchParam) && batchParam > 0 ? batchParam : null
  const clearBatch = () => {
    const next = new URLSearchParams(searchParams.toString())
    next.delete('batchId')
    router.replace(next.size ? `${pathname}?${next}` : pathname)
  }
  const clearPurchaseOrder = () => {
    const next = new URLSearchParams(searchParams.toString())
    next.delete('purchaseOrderId')
    router.replace(next.size ? `${pathname}?${next}` : pathname)
  }

  const { data: approverStatus } = useGetApproverStatusQuery()
  const isApprover = approverStatus?.isApprover ?? false
  const canManageExpenseTypes = approverStatus?.canManageExpenseTypes ?? false
  const canCreateRequests = approverStatus?.canCreateRequests ?? false

  // `pickerRange` is what the picker shows while a custom range is being chosen; the staged filter only takes it on the picker's own Apply.
  // A linked request may be older than this month, so the list then starts without a date range
  const startRange = highlightId ? ANY_DATE : THIS_MONTH
  const [pickerRange, setPickerRange] = useState<DateRangeValue>(startRange)
  const pickerIsCustom = !pickerRange.presetId || pickerRange.presetId === 'custom'
  const [page, setPage] = useState(1)
  const pageSize = usePageSize(PAGE_SIZE)
  const [chosenTab, setChosenTab] = useState<TabId | null>(() => (tabParam && TAB_IDS.has(tabParam) ? tabParam : highlightId ? 'ALL' : null))
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [showTypes, setShowTypes] = useState(false)

  // A link can start the list filtered, e.g. a container's page opens its container number here
  const initialFilters = useMemo<ListFilters>(() => ({ ...DEFAULT_FILTERS, search: searchParams.get('search') ?? '', dateRange: startRange }), []) // eslint-disable-line react-hooks/exhaustive-deps
  // Search, expense, batch and date only reach the lists on Apply filters (the status tabs stay instant)
  const staged = useStagedFilters(DEFAULT_FILTERS, () => setPage(1), initialFilters)
  const { draft, applied, setDraft, changed } = staged
  const box = (key: keyof ListFilters) => changed.has(key)

  const tab: TabId = chosenTab ?? 'ALL'
  const actions = useRequestActions()
  const { data: costCenters } = useGetLeafCostCentersQuery()

  const dates = useMemo(() => rangeFor(applied.dateRange), [applied.dateRange])
  const filters = {
    search: applied.search.trim(),
    costCenterIds: applied.costCenterIds.length ? applied.costCenterIds.map(Number) : undefined,
    batchId: batchId ?? undefined,
    batched: applied.batched.length ? (applied.batched as Array<'yes' | 'no'>) : undefined,
    // A PO's payments are shown whenever they were raised, so the date range does not apply
    ...(purchaseOrderId ? { purchaseOrderId } : dates),
  }
  const listParams: PaymentRequestListParams = {
    ...filters,
    page,
    limit: pageSize,
    ...tabFilters(tab),
  }

  const { data, isLoading, isFetching, isError } = useGetPaymentRequestsQuery(listParams)
  const { data: summary } = useGetPaymentRequestSummaryQuery(filters)
  const rows = data?.data ?? []

  const count = (value?: number) => (value === undefined ? '' : ` ${value}`)
  const tabs = [
    { id: 'ALL', label: `ALL${count(summary?.all)}` },
    { id: 'PENDING_APPROVAL', label: `PENDING FOR APPROVAL${count(summary?.byStatus.PENDING_APPROVAL)}` },
    { id: 'APPROVED', label: `APPROVED${count(summary?.byStatus.APPROVED)}` },
    { id: 'PAID', label: `PAID${count(summary?.byPayment.PAID)}` },
    { id: 'UNPAID', label: `UNPAID${count(summary?.byPayment.UNPAID)}` },
    { id: 'REJECTED', label: `REJECTED${count(summary?.byStatus.REJECTED)}` },
    { id: 'DRAFT', label: `DRAFT${count(summary?.byStatus.DRAFT)}` },
  ]

  const setOpen = (id: number | null) => {
    router.replace(id === null ? pathname : `${pathname}?open=${id}`, { scroll: false })
  }

  const withBusy = async (id: number, run: () => Promise<unknown>) => {
    setBusyId(id)
    try {
      await run()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {backHref && !openId && (
            <Link href={backHref} className="ds-button ds-button-outline ds-button-sm">
              Back
            </Link>
          )}
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Payment Requests</h1>
          {batchId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-100 py-0.5 pl-3 pr-1 text-sm text-secondary-700">
              Batch <strong className="font-semibold">{formatBatchNo(batchId)}</strong>
              <button type="button" onClick={clearBatch} aria-label="Show all payment requests" className="rounded-full px-1.5 text-text-muted hover:bg-secondary-200 hover:text-text-primary">
                ×
              </button>
            </span>
          )}
          {purchaseOrderId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-100 py-0.5 pl-3 pr-1 text-sm text-secondary-700">
              Purchase order <strong className="font-semibold">{formatPoNo(purchaseOrderId)}</strong>
              <button type="button" onClick={clearPurchaseOrder} aria-label="Show all payment requests" className="rounded-full px-1.5 text-text-muted hover:bg-secondary-200 hover:text-text-primary">
                ×
              </button>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportExcelButton report="payment-requests" filters={{ ...filters, ...tabFilters(tab) }} noun="payment requests export" />
          {canManageExpenseTypes && (
            <Button variant="secondary" size="sm" onClick={() => setShowTypes(true)}>
              Expense types
            </Button>
          )}
          {canCreateRequests && (
            <Link href="/dashboard/finance/payment-request/new" className="ds-button ds-button-primary ds-button-sm">
              New request
            </Link>
          )}
        </div>
      </div>

      <div className="mb-4 max-w-full overflow-x-auto">
        <Tabs
          items={tabs}
          activeTab={tab}
          onChange={(id) => {
            setChosenTab(id as TabId)
            setPage(1)
          }}
        />
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <FilterBar pendingCount={changed.size} activeCount={staged.activeCount} onApply={staged.apply} onReset={() => { staged.reset(); setPickerRange(DEFAULT_FILTERS.dateRange) }}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="pr-search">
              <input
                id="pr-search"
                type="search"
                value={draft.search}
                onChange={(event) => setDraft('search', event.target.value)}
                placeholder="Request #, partner, invoice #, PO # or container #"
                className="ds-input ds-input-default rounded-lg"
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Expense" htmlFor="pr-expense">
              <FilterMultiSelect
                id="pr-expense"
                options={(costCenters ?? []).map((option) => ({ value: String(option.id), label: option.path }))}
                value={draft.costCenterIds}
                onChange={(value) => setDraft('costCenterIds', value)}
                anyLabel="All expenses"
                highlighted={box('costCenterIds')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Batch" htmlFor="pr-batch">
              <FilterMultiSelect id="pr-batch" options={BATCH_OPTIONS} value={draft.batched} onChange={(value) => setDraft('batched', value)} anyLabel="All" highlighted={box('batched')} />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Date">
              <div className={FILL_PICKER}>
                <DateRangePicker
                  presets={FILTER_PRESETS}
                  value={pickerRange}
                  placement="right"
                  placeholder="Custom range"
                  keepOpenPresetIds={['custom']}
                  applyAction={
                    pickerIsCustom
                      ? {
                          label: 'Apply',
                          disabled: !(pickerRange.startDate && pickerRange.endDate),
                          onApply: () => setDraft('dateRange', { ...pickerRange, presetId: 'custom' }),
                        }
                      : undefined
                  }
                  onChange={(range) => {
                    setPickerRange(range)
                    // A preset is staged straight away; a custom range waits for the picker's own Apply
                    if (range.presetId && range.presetId !== 'custom') setDraft('dateRange', range)
                  }}
                />
              </div>
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div ref={fit.ref} style={fit.style} className="max-h-[calc(100vh-360px)] overflow-auto">
          <RequestsTable
            rows={rows}
            isLoading={isLoading}
            isError={isError}
            canDecide={isApprover}
            busyId={busyId}
            highlightId={highlightId}
            onOpen={setOpen}
            onEdit={(id) => router.push(`/dashboard/finance/payment-request/new?edit=${id}`)}
            onApprove={(id) => withBusy(id, () => actions.approve(id))}
            onReject={setRejectId}
            onDelete={setDeleteId}
          />
        </div>
        {data && (
          <PaginationFooter selectablePageSize
            page={data.page}
            pageSize={data.limit}
            totalItems={data.totalRecords}
            totalPages={data.totalPages}
            onPageChange={setPage}
            itemLabel="requests"
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title={`Delete ${deleteId ? formatRequestNo(deleteId) : 'request'}?`}
        confirmLabel="Delete request"
        tone="danger"
        busy={actions.deleting}
        onConfirm={async () => {
          if (deleteId) await actions.remove(deleteId)
          setDeleteId(null)
        }}
        onClose={() => setDeleteId(null)}
      >
        The request is deleted for good, with its lines, documents and timeline. A request that was approved or paid cannot be deleted.
      </ConfirmDialog>
      <RejectDialog requestId={rejectId} submitting={actions.rejecting} onConfirm={actions.reject} onClose={() => setRejectId(null)} />
      <RequestDetailModal requestId={openId} backHref={backHref} onClose={() => setOpen(null)} />
      {canManageExpenseTypes && <ExpenseTypesModal isOpen={showTypes} onClose={() => setShowTypes(false)} />}
    </Container>
  )
}
