'use client'

import React from 'react'
import Link from 'next/link'
import { Modal } from '@/design-system/modals'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { CashflowRow } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { formatCurrencyAmount, formatDay } from '../shared/format'
import { PAYMENT_STATE_META } from './cashflowMeta'

/** Every column centred, under its (centred) header. */
const CENTER = 'text-center'

/** What a clicked cell holds: one request, or every request summed in a total. */
export interface CashflowSelection {
  title: string
  currency: string
  amount: number
  rows: CashflowRow[]
}

interface CashflowEntriesModalProps {
  selection: CashflowSelection | null
  /** This screen's address with its filters, so the payment's details can come back to it. */
  returnTo: string
  onClose: () => void
}

/** The requests in one cell, each with its payment state; a reference opens that payment's details. Closed with its X. */
export const CashflowEntriesModal: React.FC<CashflowEntriesModalProps> = ({ selection, returnTo, onClose }) => {
  // The request's row in the payment list, on its Paid / Unpaid tab, with a Back button to this grid
  const detailHref = (row: CashflowRow) =>
    `/dashboard/finance/payment-request?${new URLSearchParams({ tab: row.paid ? 'PAID' : 'UNPAID', highlight: String(row.requestId), search: row.invoiceRef, returnTo })}`

  return (
    <Modal isOpen={selection !== null} onClose={onClose} title={selection?.title} size="xl">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Partner</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {selection?.rows.map((row) => {
            const meta = PAYMENT_STATE_META[row.paid ? 'PAID' : 'UNPAID']
            return (
              <TableRow key={row.requestId}>
                <TableCell className={CENTER}>
                  <Link href={detailHref(row)} className="font-medium text-primary-600 hover:underline">
                    {row.requestNo} · {row.invoiceRef}
                  </Link>
                </TableCell>
                <TableCell className={CENTER}>{row.partner.name}</TableCell>
                <TableCell className={CENTER}>{formatDay(row.dueDate)}</TableCell>
                <TableCell className={`${CENTER} tabular-nums`}>{formatCurrencyAmount(row.currency, row.amount)}</TableCell>
                <TableCell className={`${CENTER} tabular-nums`}>{formatCurrencyAmount(row.currency, row.paidAmount)}</TableCell>
                <TableCell className={CENTER}>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide', meta.cell)}>{meta.label}</span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        {selection && (
          <TableFooter>
            <TableRow>
              {/* The label sits under the first column, centred like the references above it */}
              <TableCell className={CENTER}>Total</TableCell>
              <TableCell />
              <TableCell />
              <TableCell className={`${CENTER} font-semibold tabular-nums`}>{formatCurrencyAmount(selection.currency, selection.amount)}</TableCell>
              <TableCell className={`${CENTER} font-semibold tabular-nums`}>
                {formatCurrencyAmount(selection.currency, Math.round(selection.rows.reduce((sum, row) => sum + row.paidAmount, 0) * 100) / 100)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </Modal>
  )
}
