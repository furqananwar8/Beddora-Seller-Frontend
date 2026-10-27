'use client'

import React from 'react'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { CashflowReport } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { formatMoney } from '../shared/format'
import type { CashflowSelection } from './CashflowEntriesModal'

const AMOUNT = 'whitespace-nowrap text-right align-middle tabular-nums'
/** The invoice column stays in view while the periods scroll sideways. */
const STICKY = 'sticky left-0 z-[1] bg-surface'

interface CashflowTableProps {
  report: CashflowReport | undefined
  isLoading: boolean
  isError: boolean
  onOpen: (selection: CashflowSelection) => void
}

/** Payment invoices down the side, the payments made against them per period across, totals per currency below. */
export const CashflowTable: React.FC<CashflowTableProps> = ({ report, isLoading, isError, onOpen }) => {
  const periods = report?.periods ?? []
  const columns = periods.length + 3

  return (
    <div className="overflow-hidden rounded-lg border border-border shadow-sm">
      <div className="max-h-[calc(100vh-320px)] overflow-auto">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
            <TableRow>
              <TableHead className={cn(STICKY, 'z-20 min-w-[14rem]')}>Payment invoice</TableHead>
              <TableHead>Currency</TableHead>
              {periods.map((period) => (
                <TableHead key={period.key} className="whitespace-nowrap text-right">
                  {period.label}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns} className="py-10 text-center">
                  <Spinner />
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columns} className="py-10 text-center text-danger-600">Could not load the cashflow.</TableCell>
              </TableRow>
            ) : !report || report.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns} className="py-10 text-center text-text-muted">No payments were recorded in this range.</TableCell>
              </TableRow>
            ) : (
              report.rows.map((row) => (
                <TableRow key={row.requestId}>
                  <TableCell className={STICKY}>
                    <div className="font-medium text-text-primary">
                      {row.requestNo} · {row.invoiceRef}
                    </div>
                    <div className="text-xs text-text-muted">{row.partner.name}</div>
                  </TableCell>
                  <TableCell>{row.currency}</TableCell>
                  {periods.map((period) => {
                    const cell = row.cells[period.key]
                    return (
                      <TableCell key={period.key} className={AMOUNT}>
                        {cell ? (
                          <button
                            type="button"
                            onClick={() => onOpen({ row, period })}
                            className="font-medium text-primary-600 hover:underline"
                            title={`${cell.count} payment${cell.count === 1 ? '' : 's'}`}
                          >
                            {formatMoney(cell.amount)}
                          </button>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className={cn(AMOUNT, 'font-semibold')}>{formatMoney(row.total)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {report && report.totals.length > 0 && (
            <TableFooter>
              {/* One line per currency: amounts in different currencies are never added together */}
              {report.totals.map((total) => (
                <TableRow key={total.currency} className="border-t-2 border-border">
                  <TableCell className={cn(STICKY, 'bg-secondary-50 font-semibold')}>{total.currency} Total</TableCell>
                  <TableCell>{total.currency}</TableCell>
                  {periods.map((period) => (
                    <TableCell key={period.key} className={AMOUNT}>
                      {total.cells[period.key] === undefined ? <span className="text-text-muted">—</span> : formatMoney(total.cells[period.key])}
                    </TableCell>
                  ))}
                  <TableCell className={cn(AMOUNT, 'font-semibold')}>{formatMoney(total.total)}</TableCell>
                </TableRow>
              ))}
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  )
}
