'use client'

import React from 'react'
import { Modal } from '@/design-system/modals'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { CashflowPeriod, CashflowRow } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatDay } from '../shared/format'

export interface CashflowSelection {
  row: CashflowRow
  period: CashflowPeriod
}

/** The payments summed in one cell: one invoice, one period. Closed with its X. */
export const CashflowEntriesModal: React.FC<{ selection: CashflowSelection | null; onClose: () => void }> = ({ selection, onClose }) => {
  const entries = selection ? selection.row.entries.filter((entry) => entry.period === selection.period.key) : []
  const currency = selection?.row.currency ?? ''
  const title = selection ? `${selection.row.requestNo} · ${selection.row.invoiceRef} · ${selection.period.label}` : undefined

  return (
    <Modal isOpen={selection !== null} onClose={onClose} title={title} size="lg">
      {selection && <p className="mb-3 text-sm text-text-muted">{selection.row.partner.name}</p>}
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead>Payment date</TableHead>
            <TableHead>Paid from</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{formatDay(entry.paymentDate)}</TableCell>
              <TableCell>{entry.bank ?? '—'}</TableCell>
              <TableCell>{entry.reference || '—'}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrencyAmount(currency, entry.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        {selection && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{formatCurrencyAmount(currency, selection.row.cells[selection.period.key]?.amount ?? 0)}</TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </Modal>
  )
}
