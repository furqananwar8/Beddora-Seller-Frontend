'use client'

import React from 'react'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { BankProfile } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { DocumentChips } from '../shared/DocumentChips'
import { formatDay } from '../shared/format'

const HEAD = 'text-center align-middle'
const CELL = 'text-center align-middle'
const COLUMNS = 9

interface BankProfileTableProps {
  rows: BankProfile[]
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  /** Omit both to hide the row actions (read-only users). */
  onEdit?: (profile: BankProfile) => void
  onRemove?: (profile: BankProfile) => void
}

export const BankProfileTable: React.FC<BankProfileTableProps> = ({ rows, isLoading, isFetching, isError, onEdit, onRemove }) => {
  const actionsOf = (row: BankProfile) => [
    ...(onEdit ? [{ key: 'edit', label: 'Edit', onSelect: () => onEdit(row) }] : []),
    ...(onRemove ? [{ key: 'remove', label: 'Remove', onSelect: () => onRemove(row) }] : []),
  ]

  return (
    <div className={cn('max-h-[calc(100vh-360px)] overflow-auto', isFetching && 'opacity-70 transition-opacity')}>
      <Table className="min-w-full">
        <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
          <TableRow>
            <TableHead className={cn(HEAD, 'min-w-[180px]')}>Bank Name</TableHead>
            <TableHead className={HEAD}>Currency</TableHead>
            <TableHead className={HEAD}>Account</TableHead>
            <TableHead className={cn(HEAD, 'min-w-[160px]')}>Account Title</TableHead>
            <TableHead className={HEAD}>SWIFT</TableHead>
            <TableHead className={HEAD}>Routing no</TableHead>
            <TableHead className={cn(HEAD, 'min-w-[140px]')}>Credit Card Name</TableHead>
            <TableHead className={HEAD}>Added</TableHead>
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
                  {isError ? 'Could not load bank profiles.' : 'No bank profiles found.'}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className={cn(CELL, 'font-medium text-text-primary')}>
                  {row.name}
                  <DocumentChips documents={row.documents} emptyText={null} className="mt-1 justify-center" />
                </TableCell>
                <TableCell className={CELL}>{row.currency}</TableCell>
                <TableCell className={cn(CELL, 'font-mono')}>{row.label}</TableCell>
                <TableCell className={CELL}>{row.accountHolder || '—'}</TableCell>
                <TableCell className={cn(CELL, 'font-mono')}>{row.swiftCode || '—'}</TableCell>
                <TableCell className={CELL}>{row.routingNo || '—'}</TableCell>
                <TableCell className={CELL}>{row.creditCardName || '—'}</TableCell>
                <TableCell className={CELL}>{formatDay(row.createdAt)}</TableCell>
                <TableCell className={CELL}>{onEdit || onRemove ? <RowActionsMenu label={row.name} items={actionsOf(row)} /> : '—'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
