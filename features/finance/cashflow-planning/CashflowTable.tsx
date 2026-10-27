'use client'

import React from 'react'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { CashflowReport } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { formatMoney } from '../shared/format'
import type { CashflowSelection } from './CashflowEntriesModal'

const AMOUNT = 'whitespace-nowrap text-right align-middle tabular-nums'
/** Room for a large amount with its currency (e.g. USD 1,234,567.89) without wrapping. */
const PERIOD = 'min-w-[9rem]'
const TOTAL = 'min-w-[10rem]'
/** The invoice column stays in view while the periods scroll sideways (globals.css layers sticky cells). */
const STICKY = 'sticky left-0 bg-surface'

/** An amount with its currency as a small tag in front, kept on one line so it never spills out of its cell. */
const Money: React.FC<{ currency: string; amount: number }> = ({ currency, amount }) => (
  <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
    <span className="font-semibold text-text-muted">{currency}</span>
    <span>{formatMoney(amount)}</span>
  </span>
)

interface CashflowTableProps {
  report: CashflowReport | undefined
  isLoading: boolean
  isError: boolean
  onOpen: (selection: CashflowSelection) => void
}

/** Payment invoices down the side, the payments made against them per period across, totals per currency below. */
export const CashflowTable: React.FC<CashflowTableProps> = ({ report, isLoading, isError, onOpen }) => {
  const periods = report?.periods ?? []
  const columns = periods.length + 2

  return (
    <div className="overflow-hidden rounded-lg border border-border shadow-sm">
      {/* At most a screen tall: however the page is scrolled, the box (and its pinned header and totals) stays in view */}
      <div className="max-h-[calc(100vh-7rem)] overflow-auto">
        {/* The box above scrolls both ways, so the header, the invoice column and the totals stick to it */}
        <Table className="min-w-full" wrapperClassName="overflow-visible">
          {/* Above the sticky invoice column, so rows scroll under the header */}
          <TableHeader className="sticky top-0 z-30 bg-surface shadow-sm">
            <TableRow>
              {/* sticky-corner (globals.css) lifts it above the other header cells, which slide under it */}
              <TableHead className={cn(STICKY, 'sticky-corner min-w-[14rem]')}>
                Payment invoice
              </TableHead>
              {periods.map((period) => (
                <TableHead key={period.key} className={cn(PERIOD, 'whitespace-nowrap text-right')}>
                  {period.label}
                </TableHead>
              ))}
              <TableHead className={cn(TOTAL, 'text-right')}>Total</TableHead>
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
                            <Money currency={row.currency} amount={cell.amount} />
                          </button>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className={cn(AMOUNT, 'font-semibold')}>
                    <Money currency={row.currency} amount={row.total} />
                  </TableCell>
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
                  {periods.map((period) => (
                    <TableCell key={period.key} className={AMOUNT}>
                      {total.cells[period.key] === undefined ? <span className="text-text-muted">—</span> : <Money currency={total.currency} amount={total.cells[period.key]} />}
                    </TableCell>
                  ))}
                  <TableCell className={cn(AMOUNT, 'font-semibold')}>
                    <Money currency={total.currency} amount={total.total} />
                  </TableCell>
                </TableRow>
              ))}
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  )
}
