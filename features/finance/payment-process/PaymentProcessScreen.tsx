'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Container } from '@/components/layout'
import {
  DocStatus,
  PaymentDocumentListItem,
  useGetPaymentDocumentsQuery,
  useGetPaymentDocumentSummaryQuery,
} from '@/services/api/finance.api'
import { ExportExcelButton } from '@/components/export-button/ExportExcelButton'
import { FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { FilterMultiSelect } from '@/components/filter-bar/FilterMultiSelect'
import { formatCurrencyAmount } from '../shared/format'
import { DOC_STATUS_META } from '../shared/statusMeta'
import { CancelPaymentDialog } from './CancelPaymentDialog'
import { EditContainerModal } from './EditContainerModal'
import { PaymentDetailModal } from './PaymentDetailModal'
import { PaymentTable } from './PaymentTable'
import { PopDialogMode, PopUploadDialog } from './PopUploadDialog'
import type { RowAction } from './RowActions'

import { usePageSize } from '@/hooks/usePageSize'
const PAGE_SIZE = 10

interface Filters extends Record<string, unknown> {
  search: string
  statuses: DocStatus[]
}
const DEFAULT_FILTERS: Filters = { search: '', statuses: [] }
const STATUS_OPTIONS = (Object.keys(DOC_STATUS_META) as DocStatus[]).map((value) => ({ value, label: DOC_STATUS_META[value].label }))

export const PaymentProcessScreen: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [page, setPage] = useState(1)
  const pageSize = usePageSize(PAGE_SIZE)
  const filters = useStagedFilters(DEFAULT_FILTERS, () => setPage(1))
  const { applied, draft, setDraft, changed } = filters
  const debouncedSearch = applied.search.trim()

  const [detailId, setDetailId] = useState<number | null>(null)
  const [uploadRow, setUploadRow] = useState<{ row: PaymentDocumentListItem; mode: PopDialogMode } | null>(null)
  const [cancelRow, setCancelRow] = useState<PaymentDocumentListItem | null>(null)
  const [containerNo, setContainerNo] = useState<string | null>(null)

  // `?open=<docId>` (notification links) opens the detail modal.
  const openParam = searchParams.get('open')
  useEffect(() => {
    const id = openParam ? Number(openParam) : NaN
    if (Number.isInteger(id) && id > 0) setDetailId(id)
  }, [openParam])

  const closeDetail = useCallback(() => {
    setDetailId(null)
    if (searchParams.get('open')) {
      // Closing the modal drops `open` but keeps `highlight`, so the row stays marked
      const next = new URLSearchParams(searchParams.toString())
      next.delete('open')
      router.replace(next.size ? `${pathname}?${next}` : pathname)
    }
  }, [pathname, router, searchParams])

  const list = useGetPaymentDocumentsQuery({ search: debouncedSearch, page, limit: pageSize, statuses: applied.statuses })
  const summary = useGetPaymentDocumentSummaryQuery({ search: debouncedSearch })

  const onAction = (row: PaymentDocumentListItem, action: RowAction) => {
    if (action === 'upload') setUploadRow({ row, mode: 'record' })
    else if (action === 'proofs') setUploadRow({ row, mode: 'proofs' })
    else if (action === 'cancel') setCancelRow(row)
    else if (action === 'edit-container') setContainerNo(row.containerNo)
    else setDetailId(row.id)
  }

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1 sm:mb-6">
        <div>
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Payment Process</h1>
        <p className="mt-1 text-sm text-text-muted">
          Approved requests awaiting payment
          {summary.data && (
            <>
              {' · '}
              {summary.data.byStatus.PAYMENT_PENDING ?? 0} pending
              {' · '}
              {summary.data.byStatus.PARTIALLY_PAID ?? 0} partially paid
              {' · '}
              {summary.data.paidThisMonth.reduce((sum, p) => sum + p.count, 0)} paid this month
              {summary.data.dueByCurrency.filter((d) => d.due > 0).map((d) => ` · ${formatCurrencyAmount(d.currency, d.due)} due`)}
            </>
          )}
        </p>
        </div>
        <ExportExcelButton report="payment-process" filters={{ search: debouncedSearch || undefined, statuses: applied.statuses }} noun="payment process export" />
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="pp-search">
              <input
                id="pp-search"
                type="search"
                value={draft.search}
                onChange={(event) => setDraft('search', event.target.value)}
                placeholder="PP#, partner..."
                className="ds-input ds-input-default rounded-lg"
              />
            </FormField>
          </FilterItem>
          <FilterItem className="sm:col-span-2">
            <FormField label="Status" htmlFor="pp-status">
              <FilterMultiSelect id="pp-status" options={STATUS_OPTIONS} value={draft.statuses} onChange={(v) => setDraft('statuses', v)} anyLabel="Any status" highlighted={changed.has('statuses')} />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <PaymentTable
        page={list.data}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        isError={list.isError}
        onPageChange={setPage}
        onOpen={(row) => setDetailId(row.id)}
        onAction={onAction}
      />

      <PaymentDetailModal docId={detailId} onClose={closeDetail} />
      <PopUploadDialog row={uploadRow?.row ?? null} mode={uploadRow?.mode} onClose={() => setUploadRow(null)} />
      <CancelPaymentDialog row={cancelRow} onClose={() => setCancelRow(null)} />
      <EditContainerModal containerNo={containerNo} onClose={() => setContainerNo(null)} />
    </Container>
  )
}
