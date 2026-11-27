'use client'

import React from 'react'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { SelectionCheckbox } from '@/components/selection-checkbox/SelectionCheckbox'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableStatusRow } from '@/design-system/tables'
import { useFitToViewport } from '@/hooks/useFitToViewport'
import type { EmailRow } from '@/services/api/systemEmail.api'
import { cn } from '@/utils/cn'
import { sentLabel, stamp, STATUS_META } from './emailMeta'

const CELL = 'text-center align-middle'

const COLUMNS = ['Recipient', 'Subject', 'Event', 'Status', 'Sent', 'Last error', 'Created', 'Actions']
const COLUMN_COUNT = COLUMNS.length + 1

interface EmailTableProps {
  rows: EmailRow[]
  loading: boolean
  error: boolean
  emptyText: string
  isChecked: (row: EmailRow) => boolean
  onToggle: (row: EmailRow) => void
  onToggleAll: (on: boolean) => void
  /** Rows that just changed live: shown highlighted for a moment. */
  flashIds: ReadonlySet<number>
  onHistory: (row: EmailRow) => void
  onResend: (row: EmailRow) => void
  onDelete: (row: EmailRow) => void
  onCopy: (row: EmailRow) => void
}

/** The emails of the page, one per row, with a box to tick each and an Actions menu. */
export const EmailTable: React.FC<EmailTableProps> = ({ rows, loading, error, emptyText, isChecked, onToggle, onToggleAll, flashIds, onHistory, onResend, onDelete, onCopy }) => {
  const fit = useFitToViewport<HTMLDivElement>()
  const checked = rows.filter(isChecked).length

  return (
    <div className="overflow-hidden rounded-lg border border-border shadow-sm">
      <div ref={fit.ref} style={fit.style} className="max-h-[calc(100vh-22rem)] overflow-auto">
        <Table className="min-w-full" wrapperClassName="overflow-visible">
          <TableHeader className="sticky top-0 z-30 bg-surface shadow-sm">
            <TableRow>
              <TableHead className="w-10 text-center align-middle">
                <SelectionCheckbox label="Select all emails on this page" checked={rows.length > 0 && checked === rows.length} indeterminate={checked > 0 && checked < rows.length} onChange={() => onToggleAll(checked !== rows.length)} />
              </TableHead>
              {COLUMNS.map((title) => (
                <TableHead key={title} className="whitespace-nowrap">
                  {title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableStatusRow colSpan={COLUMN_COUNT} loading />
            ) : error ? (
              <TableStatusRow colSpan={COLUMN_COUNT} tone="danger">
                Could not load the emails.
              </TableStatusRow>
            ) : rows.length === 0 ? (
              <TableStatusRow colSpan={COLUMN_COUNT}>{emptyText}</TableStatusRow>
            ) : (
              rows.map((row) => {
                const status = STATUS_META[row.status]
                return (
                  <TableRow key={row.id} className={cn('transition-colors duration-700', flashIds.has(row.id) && 'bg-success-50')}>
                    <TableCell className={CELL}>
                      <SelectionCheckbox label={`Select the email to ${row.toAddress}`} checked={isChecked(row)} onChange={() => onToggle(row)} />
                    </TableCell>
                    <TableCell className={cn(CELL, "whitespace-nowrap")}>{row.toAddress}</TableCell>
                    <TableCell className={cn(CELL, "max-w-xs truncate")} title={row.subject}>
                      {row.subject}
                    </TableCell>
                    <TableCell className={cn(CELL, "whitespace-nowrap")}>{row.event}</TableCell>
                    <TableCell className={CELL}>
                      <StatusBadge label={status.label} tone={status.tone} />
                    </TableCell>
                    <TableCell className={cn(CELL, "whitespace-nowrap tabular-nums")}>{sentLabel(row)}</TableCell>
                    <TableCell className={cn(CELL, "max-w-[12rem] truncate text-danger-600")} title={row.lastError ?? undefined}>
                      {row.lastError ?? <span className="text-text-muted">—</span>}
                    </TableCell>
                    <TableCell className={cn(CELL, "whitespace-nowrap tabular-nums")}>{stamp(row.createdAt)}</TableCell>
                    <TableCell className={CELL}>
                      <RowActionsMenu
                        label={`${row.event} to ${row.toAddress}`}
                        items={[
                          { key: 'history', label: 'Delivery history', onSelect: () => onHistory(row) },
                          { key: 'resend', label: 'Resend', onSelect: () => onResend(row) },
                          { key: 'copy', label: 'Copy recipient', onSelect: () => onCopy(row) },
                          { key: 'delete', label: 'Delete', tone: 'danger', disabled: row.status === 'QUEUED', onSelect: () => onDelete(row) },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
