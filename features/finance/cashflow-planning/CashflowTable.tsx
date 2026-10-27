'use client'

import React from 'react'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { CashflowPaymentState, CashflowReport, CashflowRow, CashflowTotalCell } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { formatMoney } from '../shared/format'
import { PAYMENT_STATE_META, PAYMENT_STATES } from './cashflowMeta'
import type { CashflowSelection } from './CashflowEntriesModal'

const AMOUNT = 'whitespace-nowrap text-right align-middle tabular-nums'
/** Room for a large amount with its currency (e.g. USD 1,234,567.89) without wrapping. */
const PERIOD = 'min-w-[9rem]'
const TOTAL = 'min-w-[10rem]'
/** The first column stays in view while the periods scroll sideways (globals.css layers sticky cells). */
const STICKY = 'sticky left-0 bg-surface'

/** An amount with its currency in front, kept on one line so it never spills out of its cell. */
const Money: React.FC<{ currency: string; amount: number }> = ({ currency, amount }) => (
  <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
    <span className="font-semibold opacity-70">{currency}</span>
    <span>{formatMoney(amount)}</span>
  </span>
)

/** A coloured amount that opens the breakdown of the requests in it. */
const Amount: React.FC<{ currency: string; amount: number; state: CashflowPaymentState; count: number; onOpen: () => void }> = ({ currency, amount, state, count, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    title={`${count} request${count === 1 ? '' : 's'} · ${PAYMENT_STATE_META[state].label}`}
    className={cn('rounded-md px-2 py-1 font-medium hover:underline', PAYMENT_STATE_META[state].cell)}
  >
    <Money currency={currency} amount={amount} />
  </button>
)

const rowState = (row: CashflowRow): CashflowPaymentState => (row.paid ? 'PAID' : 'UNPAID')

interface CashflowTableProps {
  report: CashflowReport | undefined
  isLoading: boolean
  isError: boolean
  onOpen: (selection: CashflowSelection) => void
}

/**
 * Approved payment requests under their due date, one per line (green paid, red still owed), with each currency's
 * totals below (orange when some are paid and some are not) and a legend explaining the colours.
 */
export const CashflowTable: React.FC<CashflowTableProps> = ({ report, isLoading, isError, onOpen }) => {
  const periods = report?.periods ?? []
  const columns = periods.length + 2
  const rowsOf = (currency: string, period?: string) => (report?.rows ?? []).filter((row) => row.currency === currency && (!period || row.period === period))
  const openTotal = (currency: string, cell: CashflowTotalCell, label: string, period?: string) =>
    onOpen({ title: `${currency} · ${label}`, currency, amount: cell.amount, rows: rowsOf(currency, period) })

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border shadow-sm">
        {/* At most a screen tall: however the page is scrolled, the box (and its pinned header and totals) stays in view */}
        <div className="max-h-[calc(100vh-7rem)] overflow-auto">
          {/* The box above scrolls both ways, so the header, the first column and the totals stick to it */}
          <Table className="min-w-full" wrapperClassName="overflow-visible">
            {/* Above the sticky first column, so rows scroll under the header */}
            <TableHeader className="sticky top-0 z-30 bg-surface shadow-sm">
              <TableRow>
                {/* Left blank on purpose: the currency totals are named under it, in the footer */}
                {/* sticky-corner (globals.css) lifts it above the other header cells, which slide under it */}
                <TableHead className={cn(STICKY, 'sticky-corner min-w-[8rem]')} aria-label="Totals" />
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
                  <TableCell colSpan={columns} className="py-10 text-center text-text-muted">No approved payment request falls due in this range.</TableCell>
                </TableRow>
              ) : (
                report.rows.map((row) => {
                  const open = () => onOpen({ title: `${row.requestNo} · ${row.invoiceRef}`, currency: row.currency, amount: row.amount, rows: [row] })
                  return (
                    <TableRow key={row.requestId}>
                      <TableCell className={STICKY} />
                      {periods.map((period) => (
                        <TableCell key={period.key} className={AMOUNT}>
                          {row.period === period.key ? (
                            <Amount currency={row.currency} amount={row.amount} state={rowState(row)} count={1} onOpen={open} />
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className={cn(AMOUNT, 'font-semibold')}>
                        <Amount currency={row.currency} amount={row.amount} state={rowState(row)} count={1} onOpen={open} />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
            {report && report.totals.length > 0 && (
              <TableFooter>
                {/* One line per currency: amounts in different currencies are never added together */}
                {report.totals.map((line) => (
                  <TableRow key={line.currency} className="border-t-2 border-border">
                    <TableCell className={cn(STICKY, 'bg-secondary-50 font-semibold')}>{line.currency} Total</TableCell>
                    {periods.map((period) => {
                      const cell = line.cells[period.key]
                      return (
                        <TableCell key={period.key} className={AMOUNT}>
                          {cell ? (
                            <Amount currency={line.currency} amount={cell.amount} state={cell.state} count={cell.count} onOpen={() => openTotal(line.currency, cell, period.label, period.key)} />
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className={cn(AMOUNT, 'font-semibold')}>
                      <Amount currency={line.currency} amount={line.total.amount} state={line.total.state} count={line.total.count} onOpen={() => openTotal(line.currency, line.total, 'whole range')} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableFooter>
            )}
          </Table>
        </div>
      </div>

      {/* What the colours mean, for whoever reads the grid */}
      <ul className="grid gap-2 rounded-lg border border-border bg-surface p-3 text-sm sm:grid-cols-3">
        {PAYMENT_STATES.map((state) => (
          <li key={state} className="flex items-start gap-2">
            <span aria-hidden className={cn('mt-0.5 h-4 w-4 shrink-0 rounded border', PAYMENT_STATE_META[state].swatch)} />
            <span>
              <span className="font-semibold text-text-primary">{PAYMENT_STATE_META[state].label}</span>
              <span className="block text-xs text-text-muted">{PAYMENT_STATE_META[state].explainer}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
