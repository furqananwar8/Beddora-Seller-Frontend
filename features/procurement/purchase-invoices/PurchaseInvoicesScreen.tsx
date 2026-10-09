'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect } from '@/components/filter-bar/FilterMultiSelect'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { ReasonDialog } from '@/components/reason-dialog/ReasonDialog'
import { RowActionsMenu, type RowActionItem } from '@/components/row-actions-menu/RowActionsMenu'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useGetPurchaseInvoiceDestinationsQuery, useGetPurchaseInvoicesQuery, useGetPurchaseInvoiceSummaryQuery, type PurchaseInvoiceListItem, type PurchaseInvoiceStatus } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { useDebounce } from '@/utils/debounce'
import { formatCalendarDay } from '@/utils/format'
import { PDF_STATUS_META, PURCHASE_INVOICES_URL, PURCHASE_INVOICE_STATUSES, PURCHASE_INVOICE_STATUS_META, PurchaseInvoiceStatusBadge, formatPoNo } from '../shared/poMeta'
import { PurchaseInvoiceDetailModal } from './PurchaseInvoiceDetailModal'
import { usePurchaseInvoiceActions } from './usePurchaseInvoiceActions'

const PAGE_SIZE = 20
const CELL = 'text-center align-middle'
const COLUMNS = 13

interface Filters extends Record<string, unknown> {
  statuses: PurchaseInvoiceStatus[]
}

const DEFAULT_FILTERS: Filters = { statuses: [] }

const positiveParam = (value: string | null): number | undefined => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

/**
 * Purchase invoices: paginated, searchable, filtered by status (with counts) and optionally narrowed to one PO.
 * Rows patch live over SSE (approvals, payments, the background PDF becoming ready).
 */
export const PurchaseInvoicesScreen: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const purchaseOrderId = positiveParam(params.get('purchaseOrderId'))
  const openId = positiveParam(params.get('open'))

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 300)
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(DEFAULT_FILTERS, () => setPage(1))
  const { applied, draft, setDraft, changed } = filters
  const { data, isLoading, isFetching, isError } = useGetPurchaseInvoicesQuery({ page, limit: PAGE_SIZE, search: debouncedSearch, purchaseOrderId, statuses: applied.statuses })
  const { data: summary } = useGetPurchaseInvoiceSummaryQuery({ search: debouncedSearch, purchaseOrderId })
  const { data: marketplaces } = useGetPurchaseInvoiceDestinationsQuery()
  const actions = usePurchaseInvoiceActions()
  const [rejecting, setRejecting] = useState<PurchaseInvoiceListItem | null>(null)

  const statusOptions = PURCHASE_INVOICE_STATUSES.map((value) => ({ value, label: `${PURCHASE_INVOICE_STATUS_META[value].label}${summary ? ` (${summary.byStatus[value]})` : ''}` }))
  /** `?open=` (from notifications and after saving) shows the invoice's details; closing drops it from the URL. */
  const showDetails = (id: number | null) => {
    const next = new URLSearchParams(params.toString())
    if (id) next.set('open', String(id))
    else next.delete('open')
    router.replace(next.size ? `${pathname}?${next}` : pathname)
  }
  const destinationName = (id: number | null) => (id ? (marketplaces?.find((m) => m.id === id)?.name ?? '—') : '—')

  const actionsFor = (row: PurchaseInvoiceListItem): RowActionItem[] => [
    { key: 'view', label: row.can.decide ? 'View & decide' : 'View details', onSelect: () => showDetails(row.id) },
    { key: 'pdf', label: row.pdfStatus === 'READY' ? 'Download PDF' : 'Download PDF · generating…', onSelect: () => void actions.downloadPdf(row) },
    ...(row.can.edit ? [{ key: 'edit', label: 'Edit invoice', onSelect: () => router.push(`${PURCHASE_INVOICES_URL}/new?edit=${row.id}`) }] : []),
    ...(row.can.submit ? [{ key: 'submit', label: row.status === 'REJECTED' ? 'Resubmit for approval' : 'Submit for approval', onSelect: () => void actions.submit(row) }] : []),
    ...(row.can.withdraw ? [{ key: 'withdraw', label: 'Withdraw to draft', onSelect: () => void actions.withdraw(row) }] : []),
    ...(row.can.decide
      ? [
          { key: 'approve', label: 'Approve', onSelect: () => void actions.approve(row) },
          { key: 'reject', label: 'Reject with reason…', tone: 'danger' as const, onSelect: () => setRejecting(row) },
          // Back to the creator's drafts as it is, for them to resubmit
          { key: 'hold', label: 'On hold · back to draft', onSelect: () => void actions.hold(row) },
        ]
      : []),
    { key: 'po', label: `View ${row.purchaseOrder.poNo}`, onSelect: () => router.push(`/dashboard/procurement/purchase-orders/${row.purchaseOrder.id}`) },
  ]

  const rows = data?.data ?? []

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Purchase invoices</h1>
            {purchaseOrderId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary-100 py-0.5 pl-3 pr-1 text-sm text-secondary-700">
                Purchase order <strong className="font-semibold">{formatPoNo(purchaseOrderId)}</strong>
                <button type="button" onClick={() => router.replace(pathname)} aria-label="Show all purchase invoices" className="rounded-full px-1.5 text-text-muted hover:bg-secondary-200 hover:text-text-primary">
                  ×
                </button>
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted">Raised from a purchase order (Actions › Create purchase invoice). PDFs are generated in the background.</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="pi-search">
              <input
                id="pi-search"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="INV #, invoice no, partner or PO #"
                className="ds-input ds-input-default rounded-lg"
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Status" htmlFor="pi-status">
              <FilterMultiSelect id="pi-status" options={statusOptions} value={draft.statuses} onChange={(v) => setDraft('statuses', v)} anyLabel="Any status" highlighted={changed.has('statuses')} />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        {/* Both axes scroll: the table keeps its column widths and scrolls sideways on narrow screens */}
        <div className="max-h-[calc(100vh-340px)] overflow-auto">
          <Table className="min-w-[1400px]">
            <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
              <TableRow>
                <TableHead className={CELL}>Invoice #</TableHead>
                <TableHead className={CELL}>Invoice No</TableHead>
                <TableHead className={CELL}>PO</TableHead>
                <TableHead className={cn(CELL, 'min-w-[160px]')}>Partner</TableHead>
                <TableHead className={CELL}>Invoice date</TableHead>
                <TableHead className={CELL}>Destination</TableHead>
                <TableHead className={cn(CELL, 'min-w-[140px]')}>Expense type</TableHead>
                <TableHead className={CELL}>Amount</TableHead>
                <TableHead className={cn(CELL, 'min-w-[170px]')}>Status</TableHead>
                <TableHead className={CELL}>PDF</TableHead>
                <TableHead className={cn(CELL, 'min-w-[140px]')}>Created by</TableHead>
                <TableHead className={CELL}>Created</TableHead>
                <TableHead className={CELL}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS}>
                    <div className="flex justify-center py-12">
                      <Spinner />
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError || rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS}>
                    <div className={isError ? 'py-12 text-center font-medium text-danger-600' : 'py-12 text-center text-text-muted'}>
                      {isError ? 'Could not load purchase invoices.' : debouncedSearch || purchaseOrderId || filters.appliedCount > 0 ? 'No purchase invoice matches.' : 'No purchase invoices yet.'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className={cn('hover:bg-secondary-50', row.id === openId && 'bg-warning-50 hover:bg-warning-50')}>
                    <TableCell className={cn(CELL, 'whitespace-nowrap font-semibold text-text-primary')}>{row.invoiceRef}</TableCell>
                    <TableCell className={cn(CELL, 'whitespace-nowrap')}>{row.invoiceNo}</TableCell>
                    <TableCell className={cn(CELL, 'whitespace-nowrap')}>
                      <Link href={`/dashboard/procurement/purchase-orders/${row.purchaseOrder.id}`} className="font-mono text-sm font-semibold text-primary-600 underline-offset-2 hover:underline">
                        {row.purchaseOrder.poNo}
                      </Link>
                    </TableCell>
                    <TableCell className={CELL}>{row.partner.name}</TableCell>
                    <TableCell className={cn(CELL, 'whitespace-nowrap')}>{formatCalendarDay(row.invoiceDate)}</TableCell>
                    <TableCell className={cn(CELL, 'whitespace-nowrap')}>{destinationName(row.marketplaceId)}</TableCell>
                    <TableCell className={CELL}>{row.expenseType.name}</TableCell>
                    <TableCell className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{formatCurrencyAmount(row.currency, row.amount)}</TableCell>
                    <TableCell className={CELL}>
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <PurchaseInvoiceStatusBadge status={row.status} />
                        {row.status === 'REJECTED' && row.decisionNote && <span className="max-w-[200px] truncate text-xs text-danger-600" title={row.decisionNote}>{row.decisionNote}</span>}
                      </span>
                    </TableCell>
                    <TableCell className={CELL}>
                      <StatusBadge label={PDF_STATUS_META[row.pdfStatus].label} tone={PDF_STATUS_META[row.pdfStatus].tone} />
                    </TableCell>
                    <TableCell className={CELL}>{row.createdBy.name ?? '—'}</TableCell>
                    <TableCell className={cn(CELL, 'whitespace-nowrap')}>{formatCalendarDay(row.createdAt)}</TableCell>
                    <TableCell className={CELL}>
                      <RowActionsMenu label={row.invoiceRef} items={actionsFor(row)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {data && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="purchase invoices" />}
      </div>

      <PurchaseInvoiceDetailModal invoiceId={openId ?? null} onClose={() => showDetails(null)} />

      <ReasonDialog
        isOpen={rejecting !== null}
        title={`Reject ${rejecting?.invoiceRef ?? 'invoice'}?`}
        description="Whoever raised it is notified with your reason; they can update it and send it for approval again."
        confirmLabel="Reject invoice"
        placeholder="e.g. Amount does not match the supplier's invoice"
        minLength={3}
        submitting={actions.busy?.action === 'reject'}
        onConfirm={(reason) => (rejecting ? actions.reject(rejecting, reason) : Promise.resolve(false))}
        onClose={() => setRejecting(null)}
      />
    </Container>
  )
}
