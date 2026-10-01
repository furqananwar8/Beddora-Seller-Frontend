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
import { useDebounce } from '@/utils/debounce'
import { ScreenSearch } from '../shared/ScreenSearch'
import { DOC_STATUS_META } from '../shared/statusMeta'
import { MarkPaidConfirm } from './MarkPaidConfirm'
import { PaymentDetailModal } from './PaymentDetailModal'
import { PaymentKpiRow } from './PaymentKpiRow'
import { PaymentTable } from './PaymentTable'
import { PopUploadDialog } from './PopUploadDialog'
import type { RowAction } from './RowActions'

const PAGE_SIZE = 10

export const PaymentProcessScreen: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<DocStatus | null>(null)

  const [detailId, setDetailId] = useState<number | null>(null)
  const [uploadRow, setUploadRow] = useState<PaymentDocumentListItem | null>(null)
  const [markPaidRow, setMarkPaidRow] = useState<PaymentDocumentListItem | null>(null)

  // `?open=<docId>` (notification links) opens the detail modal.
  const openParam = searchParams.get('open')
  useEffect(() => {
    const id = openParam ? Number(openParam) : NaN
    if (Number.isInteger(id) && id > 0) setDetailId(id)
  }, [openParam])

  const closeDetail = useCallback(() => {
    setDetailId(null)
    if (searchParams.get('open')) router.replace(pathname)
  }, [pathname, router, searchParams])

  const list = useGetPaymentDocumentsQuery({ search: debouncedSearch, page, limit: PAGE_SIZE, status: status ?? undefined })
  const summary = useGetPaymentDocumentSummaryQuery({ search: debouncedSearch })

  const toggleStatus = (next: DocStatus) => {
    setStatus((current) => (current === next ? null : next))
    setPage(1)
  }

  const onAction = (row: PaymentDocumentListItem, action: RowAction) => {
    if (action === 'upload') setUploadRow(row)
    else if (action === 'mark-paid') setMarkPaidRow(row)
    else setDetailId(row.id)
  }

  return (
    <Container size="full" className="py-4 sm:py-8">
      <ScreenSearch
        placeholder="Search PP#, partner..."
        value={search}
        onChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
      />

      <div className="mb-4 px-1 sm:mb-6">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Payment Process</h1>
        <p className="mt-1 text-sm text-text-muted">Approved requests awaiting payment</p>
      </div>

      <PaymentKpiRow summary={summary.data} active={status} onToggle={toggleStatus} />

      {status && (
        <div className="mb-3 flex items-center gap-2 px-1 text-sm text-text-muted">
          <span>Filtered by {DOC_STATUS_META[status].label}</span>
          <button
            type="button"
            onClick={() => {
              setStatus(null)
              setPage(1)
            }}
            className="font-medium text-text-primary underline underline-offset-2"
          >
            Clear filter
          </button>
        </div>
      )}

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
      <PopUploadDialog row={uploadRow} onClose={() => setUploadRow(null)} />
      <MarkPaidConfirm row={markPaidRow} onClose={() => setMarkPaidRow(null)} />
    </Container>
  )
}
