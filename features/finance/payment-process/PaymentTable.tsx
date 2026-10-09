'use client'

import React from 'react'
import Link from 'next/link'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { Page, PaymentDocumentListItem } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { formatCurrencyAmount, formatDocNo, formatRequestNo } from '../shared/format'
import { PAYMENT_STATE_META, paymentStateOf } from '../shared/paymentState'
import { DOC_STATUS_META } from '../shared/statusMeta'
import { RowAction, RowActions } from './RowActions'

const HEAD = 'text-center align-middle'
const CELL = 'text-center align-middle'
const COLUMNS = 11

interface PaymentTableProps {
  page: Page<PaymentDocumentListItem> | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  onPageChange: (page: number) => void
  onOpen: (row: PaymentDocumentListItem) => void
  onAction: (row: PaymentDocumentListItem, action: RowAction) => void
}

export const PaymentTable: React.FC<PaymentTableProps> = ({ page, isLoading, isFetching, isError, onPageChange, onOpen, onAction }) => {
  const rows = page?.data ?? []

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
      <div className="max-h-[calc(100vh-380px)] overflow-auto">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
            <TableRow>
              <TableHead className={HEAD}>Doc #</TableHead>
              <TableHead className={HEAD}>Request</TableHead>
              <TableHead className={cn(HEAD, 'min-w-[130px]')}>Invoice / PO</TableHead>
              <TableHead className={cn(HEAD, 'min-w-[160px]')}>Partner</TableHead>
              <TableHead className={HEAD}>Amount</TableHead>
              <TableHead className={HEAD}>Paid</TableHead>
              <TableHead className={HEAD}>Balance</TableHead>
              <TableHead className={cn(HEAD, 'min-w-[180px]')}>Remarks</TableHead>
              <TableHead className={HEAD}>Status</TableHead>
              <TableHead className={cn(HEAD, 'min-w-[130px]')}>Payment status</TableHead>
              <TableHead className={HEAD}>Actions</TableHead>
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
                    {isError ? 'Could not load payments.' : 'No approved requests awaiting payment.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const meta = DOC_STATUS_META[row.status]
                const payment = PAYMENT_STATE_META[paymentStateOf(row.paidAmount, row.amount)]
                return (
                  <TableRow key={row.id}>
                    <TableCell className={CELL}>
                      <button type="button" onClick={() => onOpen(row)} className="font-medium text-text-primary underline-offset-2 hover:underline">
                        {formatDocNo(row.id)}
                      </button>
                    </TableCell>
                    <TableCell className={cn(CELL, 'whitespace-nowrap')}>
                      <Link
                        href={`/dashboard/finance/payment-request?open=${row.requestId}`}
                        className="font-medium text-primary-600 underline-offset-2 hover:underline"
                      >
                        {formatRequestNo(row.requestId)}
                      </Link>
                    </TableCell>
                    <TableCell className={CELL}>
                      <div className="break-words text-text-primary">{row.reference.value || '—'}</div>
                      {row.containerNo && <div className="break-words text-xs text-text-muted">{row.containerNo}</div>}
                    </TableCell>
                    <TableCell className={CELL}>{row.partner.name}</TableCell>
                    <TableCell className={cn(CELL, 'whitespace-nowrap')}>{formatCurrencyAmount(row.currency, row.amount)}</TableCell>
                    <TableCell className={cn(CELL, 'whitespace-nowrap')}>{formatCurrencyAmount(row.currency, row.paidAmount)}</TableCell>
                    <TableCell className={cn(CELL, 'whitespace-nowrap font-medium')}>{formatCurrencyAmount(row.currency, row.balance)}</TableCell>
                    <TableCell className={CELL}>
                      {row.remarks ? (
                        <div className="mx-auto max-w-[220px] truncate" title={row.remarks}>
                          {row.remarks}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className={CELL}>
                      <StatusBadge label={meta.label} tone={meta.tone} />
                    </TableCell>
                    <TableCell className={CELL}>
                      <StatusBadge label={payment.label} tone={payment.tone} />
                    </TableCell>
                    <TableCell className={CELL}>
                      <RowActions row={row} onSelect={(action) => onAction(row, action)} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      {page && (
        <PaginationFooter
          page={page.page}
          pageSize={page.limit}
          totalItems={page.totalRecords}
          totalPages={page.totalPages}
          onPageChange={onPageChange}
          itemLabel="payments"
        />
      )}
    </div>
  )
}
