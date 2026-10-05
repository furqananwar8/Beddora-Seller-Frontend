'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { endOfDay, endOfMonth, format, parseISO, startOfDay, startOfMonth, subMonths } from 'date-fns'
import { Container } from '@/components/layout'
import DateRangePicker, { DateRangePreset, DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Button } from '@/design-system/buttons'
import { Select } from '@/design-system/inputs'
import { Tabs } from '@/design-system/tabs'
import {
  PaymentRequestListParams,
  RequestStatus,
  useGetApproverStatusQuery,
  useGetExpenseTypesQuery,
  useGetPaymentRequestsQuery,
  useGetPaymentRequestSummaryQuery,
} from '@/services/api/finance.api'
import { useDebounce } from '@/utils/debounce'
import { formatPoNo } from '@/features/procurement/shared/poMeta'
import { cn } from '@/utils/cn'
import { ScreenSearch } from '../shared/ScreenSearch'
import { SelectShell } from '../shared/SelectShell'
import { ApproversModal } from './ApproversModal'
import { ExpenseTypesModal } from './ExpenseTypesModal'
import { RejectDialog } from './RejectDialog'
import { RequestDetailModal } from './RequestDetailModal'
import { RequestsTable } from './RequestsTable'
import { useRequestActions } from './useRequestActions'

const PAGE_SIZE = 10

type TabId = RequestStatus | 'ALL'

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

export const PaymentRequestScreen: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const openParam = Number(searchParams.get('open'))
  const openId = Number.isInteger(openParam) && openParam > 0 ? openParam : null
  // "View payment requests" on a purchase order opens this list narrowed to that PO
  const poParam = Number(searchParams.get('purchaseOrderId'))
  const purchaseOrderId = Number.isInteger(poParam) && poParam > 0 ? poParam : null
  const clearPurchaseOrder = () => {
    const next = new URLSearchParams(searchParams.toString())
    next.delete('purchaseOrderId')
    router.replace(next.size ? `${pathname}?${next}` : pathname)
  }

  const { data: approverStatus } = useGetApproverStatusQuery()
  const isApprover = approverStatus?.isApprover ?? false
  const canManageExpenseTypes = approverStatus?.canManageExpenseTypes ?? false
  const canManageApprovers = approverStatus?.canManageApprovers ?? false
  const canCreateRequests = approverStatus?.canCreateRequests ?? false

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const [chosenTab, setChosenTab] = useState<TabId | null>(null)
  const [expenseTypeId, setExpenseTypeId] = useState('')
  // `dateRange` is what the lists use; `draftRange` is what the picker shows while a custom range is being chosen.
  const [dateRange, setDateRange] = useState<DateRangeValue>(THIS_MONTH)
  const [draftRange, setDraftRange] = useState<DateRangeValue>(THIS_MONTH)
  const draftIsCustom = !draftRange.presetId || draftRange.presetId === 'custom'
  const canApplyCustom = draftIsCustom && Boolean(draftRange.startDate && draftRange.endDate) && (draftRange.startDate !== dateRange.startDate || draftRange.endDate !== dateRange.endDate)
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [showTypes, setShowTypes] = useState(false)
  const [showApprovers, setShowApprovers] = useState(false)

  const tab: TabId = chosenTab ?? (isApprover && !purchaseOrderId ? 'PENDING_APPROVAL' : 'ALL')
  const actions = useRequestActions()
  const { data: expenseTypes } = useGetExpenseTypesQuery()

  const dates = useMemo(() => rangeFor(dateRange), [dateRange])
  const filters = {
    search: debouncedSearch,
    expenseTypeId: expenseTypeId ? Number(expenseTypeId) : undefined,
    // A PO's payments are shown whenever they were raised, so the date range does not apply
    ...(purchaseOrderId ? { purchaseOrderId } : dates),
  }
  const listParams: PaymentRequestListParams = {
    ...filters,
    page,
    limit: PAGE_SIZE,
    status: tab === 'ALL' ? undefined : tab,
    scope: tab === 'DRAFT' ? 'mine' : undefined,
  }

  const { data, isLoading, isFetching, isError } = useGetPaymentRequestsQuery(listParams)
  const { data: summary } = useGetPaymentRequestSummaryQuery(filters)
  const rows = data?.data ?? []

  const count = (value?: number) => (value === undefined ? '' : ` ${value}`)
  const tabs = [
    { id: 'PENDING_APPROVAL', label: `PENDING FOR APPROVAL${count(summary?.byStatus.PENDING_APPROVAL)}` },
    { id: 'APPROVED', label: `APPROVED${count(summary?.byStatus.APPROVED)}` },
    { id: 'REJECTED', label: `REJECTED${count(summary?.byStatus.REJECTED)}` },
    { id: 'ALL', label: `ALL${count(summary?.all)}` },
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
      <ScreenSearch
        placeholder="Search requests..."
        value={search}
        onChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Payment Requests</h1>
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
          {canManageExpenseTypes && (
            <Button variant="secondary" size="sm" onClick={() => setShowTypes(true)}>
              Expense types
            </Button>
          )}
          {canManageApprovers && (
            <Button variant="secondary" size="sm" onClick={() => setShowApprovers(true)}>
              Approvers
            </Button>
          )}
          {canCreateRequests && (
            <Link href="/dashboard/finance/payment-request/new" className="ds-button ds-button-primary ds-button-sm">
              New request
            </Link>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-full overflow-x-auto">
          <Tabs
            items={tabs}
            activeTab={tab}
            onChange={(id) => {
              setChosenTab(id as TabId)
              setPage(1)
            }}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full min-w-0 sm:w-48">
            <label htmlFor="filter-expense-type" className="ds-input-label">
              Expense type
            </label>
            <SelectShell>
            <Select
              id="filter-expense-type"
              className="h-10 appearance-none rounded-lg py-0 pr-9"
              value={expenseTypeId}
              onChange={(e) => {
                setExpenseTypeId(e.target.value)
                setPage(1)
              }}
              options={[{ value: '', label: 'All' }, ...(expenseTypes ?? []).map((t) => ({ value: String(t.id), label: t.name }))]}
            />
            </SelectShell>
          </div>
          <div className="w-full min-w-0 sm:w-56">
            <span className="ds-input-label">Date</span>
            <div className="w-full sm:w-56 [&>div]:block [&>div]:w-full [&>div>button]:h-10 [&>div>button]:w-full [&>div>button]:py-0 [&>div>button>span]:flex-1 [&>div>button>span]:text-left">
              <DateRangePicker
                presets={FILTER_PRESETS}
                value={draftRange}
                placement="right"
                placeholder="Custom range"
                keepOpenPresetIds={['custom']}
                applyAction={
                  draftIsCustom
                    ? {
                        label: 'Apply',
                        disabled: !canApplyCustom,
                        onApply: () => {
                          setDateRange({ ...draftRange, presetId: 'custom' })
                          setPage(1)
                        },
                      }
                    : undefined
                }
                onChange={(range) => {
                  setDraftRange(range)
                  // Presets apply straight away; a custom range waits for Apply.
                  if (range.presetId && range.presetId !== 'custom') {
                    setDateRange(range)
                    setPage(1)
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-360px)] overflow-auto">
          <RequestsTable
            rows={rows}
            isLoading={isLoading}
            isError={isError}
            canDecide={isApprover}
            busyId={busyId}
            onOpen={setOpen}
            onEdit={(id) => router.push(`/dashboard/finance/payment-request/new?edit=${id}`)}
            onApprove={(id) => withBusy(id, () => actions.approve(id))}
            onReject={setRejectId}
          />
        </div>
        {data && (
          <PaginationFooter
            page={data.page}
            pageSize={data.limit}
            totalItems={data.totalRecords}
            totalPages={data.totalPages}
            onPageChange={setPage}
            itemLabel="requests"
          />
        )}
      </div>

      <RejectDialog requestId={rejectId} submitting={actions.rejecting} onConfirm={actions.reject} onClose={() => setRejectId(null)} />
      <RequestDetailModal requestId={openId} onClose={() => setOpen(null)} />
      {canManageExpenseTypes && <ExpenseTypesModal isOpen={showTypes} onClose={() => setShowTypes(false)} />}
      {canManageApprovers && <ApproversModal isOpen={showApprovers} onClose={() => setShowApprovers(false)} />}
    </Container>
  )
}
