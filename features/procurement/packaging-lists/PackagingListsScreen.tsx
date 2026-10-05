'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { RowActionsMenu, type RowActionItem } from '@/components/row-actions-menu/RowActionsMenu'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useDeletePackagingListMutation, useGetPackagingListsQuery, useGetPackagingListSummaryQuery, type PackagingListItem } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { useDebounce } from '@/utils/debounce'
import { downloadApiFile } from '@/utils/downloadFile'
import { formatPoNo, newPackagingListHref } from '../shared/poMeta'

const BASE = '/dashboard/procurement/packaging-lists'
const PAGE_SIZE = 20
const CELL = 'text-center align-middle'
const COLUMNS = 9

const qty = (value: number) => value.toLocaleString('en-CA')
const kg = (value: number) => `${value.toLocaleString('en-CA', { maximumFractionDigits: 1 })} kg`

export const PackagingListsScreen: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'procurement:packaging-lists')
  const { success, failure } = useApiFeedback()

  // "View packaging lists" on a purchase order narrows this list to that PO
  const poParam = Number(params.get('purchaseOrderId'))
  const purchaseOrderId = Number.isInteger(poParam) && poParam > 0 ? poParam : undefined

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 300)
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, isError } = useGetPackagingListsQuery({ page, limit: PAGE_SIZE, search: debouncedSearch, purchaseOrderId })
  const { data: summary } = useGetPackagingListSummaryQuery()

  const [deleting, setDeleting] = useState<PackagingListItem | null>(null)
  const [deleteList, { isLoading: deletingBusy }] = useDeletePackagingListMutation()

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await deleteList(deleting.id).unwrap()
      success(`${deleting.plNo} deleted; its units are available again`)
      setDeleting(null)
    } catch (error) {
      failure(error, 'Could not delete the packaging list')
    }
  }

  const download = async (row: PackagingListItem) => {
    try {
      await downloadApiFile(`/procurement/packaging-lists/${row.id}/pdf`, `${row.plNo.replace('#', '')}.pdf`)
    } catch (error) {
      failure(error, 'Could not download the PDF')
    }
  }

  const actionsFor = (row: PackagingListItem): RowActionItem[] => [
    { key: 'view', label: 'View packaging list', onSelect: () => router.push(`${BASE}/${row.id}`) },
    ...(canWrite ? [{ key: 'edit', label: 'Edit quantities', onSelect: () => router.push(`${BASE}/${row.id}?edit=1`) }] : []),
    { key: 'pdf', label: 'Download PDF', onSelect: () => void download(row) },
    ...(canWrite ? [{ key: 'delete', label: 'Delete list', tone: 'danger' as const, onSelect: () => setDeleting(row) }] : []),
  ]

  const clearPurchaseOrder = () => router.replace(pathname)
  const rows = data?.data ?? []

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Packaging lists</h1>
            {purchaseOrderId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary-100 py-0.5 pl-3 pr-1 text-sm text-secondary-700">
                Purchase order <strong className="font-semibold">{formatPoNo(purchaseOrderId)}</strong>
                <button type="button" onClick={clearPurchaseOrder} aria-label="Show all packaging lists" className="rounded-full px-1.5 text-text-muted hover:bg-secondary-200 hover:text-text-primary">
                  ×
                </button>
              </span>
            )}
          </div>
          {summary && (
            <p className="text-sm text-text-muted">
              {summary.all} packaging {summary.all === 1 ? 'list' : 'lists'}
            </p>
          )}
        </div>
        {canWrite && (
          <Link href={newPackagingListHref(purchaseOrderId)} className="ds-button ds-button-primary ds-button-sm">
            + New packaging list
          </Link>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <FormField label="Search" htmlFor="pl-search" className="max-w-xl">
          <input
            id="pl-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="PL #, supplier, PO # or SKU"
            className="ds-input ds-input-default rounded-lg"
          />
        </FormField>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-340px)] overflow-auto">
          <Table className="min-w-full">
            <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
              <TableRow>
                <TableHead className={CELL}>PL #</TableHead>
                <TableHead className={cn(CELL, 'min-w-[160px]')}>Supplier</TableHead>
                <TableHead className={cn(CELL, 'min-w-[120px]')}>PO(s)</TableHead>
                <TableHead className={CELL}>SKUs</TableHead>
                <TableHead className={CELL}>Units</TableHead>
                <TableHead className={CELL}>Cartons</TableHead>
                <TableHead className={CELL}>CBM</TableHead>
                <TableHead className={CELL}>Gross wt</TableHead>
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
                      {isError ? 'Could not load packaging lists.' : debouncedSearch || purchaseOrderId ? 'No packaging list matches.' : 'No packaging lists yet.'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-secondary-50">
                    <TableCell className={cn(CELL, 'whitespace-nowrap font-semibold text-text-primary')}>{row.plNo}</TableCell>
                    <TableCell className={CELL}>{row.supplier.name}</TableCell>
                    <TableCell className={cn(CELL, 'font-mono text-xs')}>{row.purchaseOrders.map((po) => po.poNo).join(', ')}</TableCell>
                    <TableCell className={cn(CELL, 'tabular-nums')}>{row.skuCount}</TableCell>
                    <TableCell className={cn(CELL, 'tabular-nums')}>{qty(row.units)}</TableCell>
                    <TableCell className={cn(CELL, 'tabular-nums')}>{qty(row.cartons)}</TableCell>
                    <TableCell className={cn(CELL, 'font-mono text-xs')}>{row.cbm.toFixed(2)}</TableCell>
                    <TableCell className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{kg(row.grossWeightKg)}</TableCell>
                    <TableCell className={CELL}>
                      <RowActionsMenu label={row.plNo} items={actionsFor(row)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {data && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="packaging lists" />}
      </div>

      <ConfirmDialog isOpen={deleting !== null} title={`Delete ${deleting?.plNo ?? 'list'}`} confirmLabel="Delete list" tone="danger" busy={deletingBusy} onConfirm={confirmDelete} onClose={() => setDeleting(null)}>
        <p>
          Its {deleting ? qty(deleting.units) : ''} units go back to {deleting?.purchaseOrders.map((po) => po.poNo).join(', ')} and can be packed again. A PO that was ready to ship goes back to in progress.
        </p>
      </ConfirmDialog>
    </Container>
  )
}
