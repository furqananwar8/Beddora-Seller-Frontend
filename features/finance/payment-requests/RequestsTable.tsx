'use client'

import React, { useState } from 'react'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import type { PaymentRequestListItem } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { formatDay, formatMoney, requestReference } from '../shared/format'
import { PAYMENT_STATE_META, paymentStateOf } from '../shared/paymentState'
import { REQUEST_STATUS_META } from '../shared/statusMeta'
import { RequestPreview } from './RequestPreview'

const HEAD = 'text-center align-middle'
const CELL = 'text-center align-middle'
const COLS = 12

const Paperclip = () => (
  <svg className="ml-1 inline h-3.5 w-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Has documents">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79V7a5 5 0 00-10 0v9a3 3 0 006 0V8" />
  </svg>
)

interface RequestsTableProps {
  rows: PaymentRequestListItem[]
  isLoading: boolean
  isError: boolean
  canDecide: boolean
  busyId: number | null
  onOpen: (id: number) => void
  onEdit: (id: number) => void
  onApprove: (id: number) => void
  onReject: (id: number) => void
}

export const RequestsTable: React.FC<RequestsTableProps> = ({ rows, isLoading, isError, canDecide, busyId, onOpen, onEdit, onApprove, onReject }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const message = (text: string, danger?: boolean) => (
    <TableRow>
      <TableCell colSpan={COLS}>
        <div className={cn('py-12 text-center', danger ? 'font-medium text-danger-600' : 'text-text-muted')}>{text}</div>
      </TableCell>
    </TableRow>
  )

  return (
    <Table className="min-w-full">
      <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
        <TableRow>
          <TableHead className={HEAD}>Payment #</TableHead>
          <TableHead className={cn(HEAD, 'min-w-[180px]')}>Supplier / Partner name</TableHead>
          <TableHead className={HEAD}>Amount</TableHead>
          <TableHead className={HEAD}>Remaining</TableHead>
          <TableHead className={HEAD}>Curr.</TableHead>
          <TableHead className={HEAD}>Invoice / PO</TableHead>
          <TableHead className={HEAD}>Container no</TableHead>
          <TableHead className={HEAD}>Date</TableHead>
          <TableHead className={cn(HEAD, 'min-w-[180px]')}>Remarks</TableHead>
          <TableHead className={HEAD}>Status</TableHead>
          <TableHead className={cn(HEAD, 'min-w-[130px]')}>Payment status</TableHead>
          <TableHead className={HEAD}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={COLS}>
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            </TableCell>
          </TableRow>
        ) : isError ? (
          message('Could not load payment requests.', true)
        ) : rows.length === 0 ? (
          message('No payment requests found.')
        ) : (
          rows.map((row) => {
            const meta = REQUEST_STATUS_META[row.status]
            const payment = PAYMENT_STATE_META[paymentStateOf(row.payment?.paidAmount, row.amount)]
            const expanded = expandedId === row.id
            const decidable = canDecide && row.status === 'PENDING_APPROVAL'
            const busy = busyId === row.id
            return (
              <React.Fragment key={row.id}>
                <TableRow className="cursor-pointer" onClick={() => setExpandedId(expanded ? null : row.id)} aria-expanded={expanded}>
                  <TableCell className={CELL}>
                    <button
                      type="button"
                      className="font-medium text-primary-600 hover:underline"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpen(row.id)
                      }}
                    >
                      Payment#{row.id}
                    </button>
                  </TableCell>
                  <TableCell className={cn(CELL, 'font-medium text-text-primary')}>{row.partner.name}</TableCell>
                  <TableCell className={CELL}>{formatMoney(row.amount)}</TableCell>
                  <TableCell className={cn(CELL, row.payment && row.payment.remaining > 0 && 'font-medium text-danger-600')}>
                    {row.payment ? formatMoney(row.payment.remaining) : '-'}
                  </TableCell>
                  <TableCell className={CELL}>{row.currency}</TableCell>
                  <TableCell className={CELL}>
                    {requestReference(row)}
                    {row.documentCount > 0 && <Paperclip />}
                  </TableCell>
                  <TableCell className={CELL}>{row.containerNo || '-'}</TableCell>
                  <TableCell className={cn(CELL, 'whitespace-nowrap')}>{formatDay(row.createdAt, 'dd MMM')}</TableCell>
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
                    <RowActionsMenu
                      label={`Payment#${row.id}`}
                      items={[
                        ...(row.canEdit ? [{ key: 'edit', label: 'Edit', onSelect: () => onEdit(row.id) }] : []),
                        { key: 'open', label: 'View details', onSelect: () => onOpen(row.id) },
                        ...(decidable
                          ? [
                              { key: 'approve', label: 'Approve', onSelect: () => onApprove(row.id), disabled: busy },
                              { key: 'reject', label: 'Reject', onSelect: () => onReject(row.id), disabled: busy, tone: 'danger' as const },
                            ]
                          : []),
                      ]}
                    />
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow>
                    <TableCell colSpan={COLS} className="bg-secondary-50/50">
                      <RequestPreview id={row.id} requestedBy={row.requestedBy.name ?? 'Unknown'} />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}
