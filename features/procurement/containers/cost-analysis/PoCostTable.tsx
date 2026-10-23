'use client'

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { ContainerCostDetail } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import type { CostColumn } from './costColumns'

type CostOrder = ContainerCostDetail['purchaseOrders'][number]

const alignOf = (column: CostColumn) => (column.align === 'left' ? 'text-left' : 'text-right')

/** One PO of a container: a row per SKU of its packaging list with each cost, and the PO's totals in the footer. */
export const PoCostTable: React.FC<{ order: CostOrder; columns: CostColumn[] }> = ({ order, columns }) => (
  <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
    <header className="flex flex-wrap items-baseline gap-x-2 border-b border-border px-4 py-2.5">
      <h3 className="text-sm font-semibold text-text-primary">{order.supplier?.name ?? 'Unknown supplier'}</h3>
      <span className="font-mono text-xs text-text-muted">{order.poNo}</span>
      <span className="text-xs text-text-muted">· {order.invoices.length === 0 ? 'No invoice yet: PO rates, no additional expense' : order.invoices.map((invoice) => invoice.invoiceNo).join(', ')}</span>
    </header>
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
          {order.skus.map((row) => (
            <TableRow key={row.productId}>
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
                {column.footer?.(order.totals)}
              </TableCell>
            ))}
          </TableRow>
        </tfoot>
      </Table>
    </div>
  </section>
)
