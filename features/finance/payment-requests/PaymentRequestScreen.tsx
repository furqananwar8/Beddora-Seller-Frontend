'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { endOfMonth, startOfMonth, subMonths } from 'date-fns'
import { Container } from '@/components/layout'
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
import { cn } from '@/utils/cn'
import { ScreenSearch } from '../shared/ScreenSearch'
import { ApproversModal } from './ApproversModal'
import { ExpenseTypesModal } from './ExpenseTypesModal'
import { RejectDialog } from './RejectDialog'
import { RequestDetailModal } from './RequestDetailModal'
import { RequestsTable } from './RequestsTable'
import { useRequestActions } from './useRequestActions'

const PAGE_SIZE = 20

type TabId = RequestStatus | 'ALL'
type DateRange = 'this-month' | 'last-month' | 'all'

const DATE_OPTIONS = [
  { value: 'this-month', label: 'Date: This month' },
  { value: 'last-month', label: 'Date: Last month' },
  { value: 'all', label: 'Date: All' },
]

function rangeFor(range: DateRange): { dateFrom?: string; dateTo?: string } {
  if (range === 'all') return {}
  const base = range === 'this-month' ? new Date() : subMonths(new Date(), 1)
  return { dateFrom: startOfMonth(base).toISOString(), dateTo: endOfMonth(base).toISOString() }
}

export const PaymentRequestScreen: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const openParam = Number(searchParams.get('open'))
  const openId = Number.isInteger(openParam) && openParam > 0 ? openParam : null

  const { data: approverStatus } = useGetApproverStatusQuery()
  const isApprover = approverStatus?.isApprover ?? false

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const [chosenTab, setChosenTab] = useState<TabId | null>(null)
  const [expenseTypeId, setExpenseTypeId] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>('this-month')
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [showTypes, setShowTypes] = useState(false)
  const [showApprovers, setShowApprovers] = useState(false)

  const tab: TabId = chosenTab ?? (isApprover ? 'PENDING_APPROVAL' : 'ALL')
  const actions = useRequestActions()
  const { data: expenseTypes } = useGetExpenseTypesQuery()

  const dates = useMemo(() => rangeFor(dateRange), [dateRange])
  const filters = {
    search: debouncedSearch,
    expenseTypeId: expenseTypeId ? Number(expenseTypeId) : undefined,
    ...dates,
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
    { id: 'PENDING_APPROVAL', label: `Pending for Approval${count(summary?.byStatus.PENDING_APPROVAL)}` },
    { id: 'APPROVED', label: `Approved${count(summary?.byStatus.APPROVED)}` },
    { id: 'REJECTED', label: `Rejected${count(summary?.byStatus.REJECTED)}` },
    { id: 'ALL', label: `All${count(summary?.all)}` },
    { id: 'DRAFT', label: `Draft${count(summary?.byStatus.DRAFT)}` },
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
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Payment Requests</h1>
        <div className="flex flex-wrap items-center gap-2">
          {isApprover && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowTypes(true)}>
                Expense types
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowApprovers(true)}>
                Approvers
              </Button>
            </>
          )}
          <Link href="/dashboard/finance/payment-request/new" className="ds-button ds-button-primary ds-button-sm">
            New request
          </Link>
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
        <div className="flex flex-wrap gap-2">
          <div className="w-44">
            <Select
              aria-label="Expense type"
              className="rounded-lg"
              value={expenseTypeId}
              onChange={(e) => {
                setExpenseTypeId(e.target.value)
                setPage(1)
              }}
              options={[{ value: '', label: 'Expense type: All' }, ...(expenseTypes ?? []).map((t) => ({ value: String(t.id), label: t.name }))]}
            />
          </div>
          <div className="w-44">
            <Select
              aria-label="Date"
              className="rounded-lg"
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as DateRange)
                setPage(1)
              }}
              options={DATE_OPTIONS}
            />
          </div>
        </div>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-360px)] min-h-[240px] overflow-auto">
          <RequestsTable
            rows={rows}
            isLoading={isLoading}
            isError={isError}
            canDecide={isApprover}
            busyId={busyId}
            onOpen={setOpen}
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
      <ExpenseTypesModal isOpen={showTypes} onClose={() => setShowTypes(false)} />
      <ApproversModal isOpen={showApprovers} onClose={() => setShowApprovers(false)} />
    </Container>
  )
}
