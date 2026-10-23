'use client'

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { CostTotals } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import type { CostColumn } from './costColumns'

interface CostTableProps<Row> {
  columns: CostColumn<Row>[]
  rows: Row[]
  rowKey: (row: Row) => React.Key
  totals: CostTotals
}

const alignOf = (column: Pick<CostColumn, 'align'>) => (column.align === 'left' ? 'text-left' : 'text-right')

/** A cost table driven by its columns: a row per item, and each column's footer read off the totals. */
export function CostTable<Row>({ columns, rows, rowKey, totals }: CostTableProps<Row>) {
  return (
    <div className="overflow-x-auto">
      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={cn('whitespace-nowrap', alignOf(column))}>
                {column.source && <span className="block text-[10px] font-normal uppercase tracking-wide text-text-muted">{column.source}</span>}
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((column) => (
                <TableCell key={column.key} className={cn('whitespace-nowrap tabular-nums', alignOf(column))}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        <tfoot className="border-t-2 border-border bg-secondary-50 font-semibold">
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.key} className={cn('whitespace-nowrap tabular-nums', alignOf(column))}>
                {column.footer?.(totals)}
              </TableCell>
            ))}
          </TableRow>
        </tfoot>
      </Table>
    </div>
  )
}
