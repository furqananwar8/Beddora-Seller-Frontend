'use client'

import React from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Modal } from '@/design-system/modals'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { AgingBucket, AgingRow } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatDay } from '../shared/format'
import { REQUEST_STATUS_META } from '../shared/statusMeta'
import { AGING_GROUP_META, dueLabel } from './agingMeta'

export interface AgingSelection {
  row: AgingRow
  bucket: AgingBucket
}

/** The payments summed in one aging cell. */
export const AgingEntriesModal: React.FC<{ selection: AgingSelection | null; onClose: () => void }> = ({ selection, onClose }) => {
  const entries = selection ? selection.row.entries.filter((entry) => entry.bucket === selection.bucket.key) : []
  const currency = selection?.row.currency ?? ''
  const title = selection ? `${selection.row.partner.name} · ${AGING_GROUP_META[selection.bucket.group].prefix} ${selection.bucket.label} days` : undefined

  return (
    <Modal isOpen={selection !== null} onClose={onClose} title={title} size="xl">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead>Request</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Invoice date</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium">{entry.requestNo}</TableCell>
              <TableCell>{entry.reference || '—'}</TableCell>
              <TableCell>{formatDay(entry.invoiceDate)}</TableCell>
              <TableCell>
                <div>{formatDay(entry.dueDate)}</div>
                <div className={entry.daysToDue < 0 ? 'text-xs text-danger-600' : 'text-xs text-text-muted'}>{dueLabel(entry.daysToDue)}</div>
              </TableCell>
              <TableCell>
                <StatusBadge {...REQUEST_STATUS_META[entry.status]} />
              </TableCell>
              <TableCell className="text-right">{formatCurrencyAmount(currency, entry.amount)}</TableCell>
              <TableCell className="text-right">{formatCurrencyAmount(currency, entry.paid)}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrencyAmount(currency, entry.outstanding)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        {selection && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7}>Total</TableCell>
              <TableCell className="text-right">{formatCurrencyAmount(currency, selection.row.cells[selection.bucket.key].amount)}</TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </Modal>
  )
}
