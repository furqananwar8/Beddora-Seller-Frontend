'use client'

import React from 'react'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { AgingBucket, AgingCell, PartnerAgingReport } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { formatMoney } from '../shared/format'
import { AGING_GROUP_META, groupBuckets } from './agingMeta'
import type { AgingSelection } from './AgingEntriesModal'

const AMOUNT = 'text-right align-middle tabular-nums'

const Amount: React.FC<{ cell: AgingCell | undefined; onOpen?: () => void }> = ({ cell, onOpen }) => {
  if (!cell || cell.count === 0) return <span className="text-text-muted">—</span>
  const text = formatMoney(cell.amount)
  return onOpen ? (
    <button type="button" onClick={onOpen} className="font-medium text-primary-600 hover:underline" title={`${cell.count} payment${cell.count === 1 ? '' : 's'}`}>
      {text}
    </button>
  ) : (
    <>{text}</>
  )
}

interface AgingTableProps {
  report: PartnerAgingReport | undefined
  isLoading: boolean
  isError: boolean
  onOpen: (selection: AgingSelection) => void
}

/** Partners down the side, amounts by due bucket across (green: coming due, red: overdue), totals per currency below. */
export const AgingTable: React.FC<AgingTableProps> = ({ report, isLoading, isError, onOpen }) => {
  const buckets: AgingBucket[] = report?.buckets ?? []
  const groups = groupBuckets(buckets)
  const columns = buckets.length + 3

  return (
    <div className="overflow-hidden rounded-lg border border-border shadow-sm">
      <div className="max-h-[calc(100vh-260px)] overflow-auto">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
            <TableRow>
              <TableHead rowSpan={2} className="align-bottom">Vendor / Supplier</TableHead>
              <TableHead rowSpan={2} className="align-bottom">Currency</TableHead>
              {groups.map(({ group, buckets: inGroup }) => (
                <TableHead key={group} colSpan={inGroup.length} className={cn('text-center', AGING_GROUP_META[group].head)}>
                  {AGING_GROUP_META[group].title}
                </TableHead>
              ))}
              <TableHead rowSpan={2} className="text-right align-bottom">Total</TableHead>
            </TableRow>
            <TableRow>
              {buckets.map((bucket) => (
                <TableHead key={bucket.key} className={cn('text-right', AGING_GROUP_META[bucket.group].head)}>
                  {bucket.label}
                </TableHead>
              ))}
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
                <TableCell colSpan={columns} className="py-10 text-center text-danger-600">Could not load the aging report.</TableCell>
              </TableRow>
            ) : !report || report.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns} className="py-10 text-center text-text-muted">Nothing is waiting to be paid.</TableCell>
              </TableRow>
            ) : (
              report.rows.map((row) => (
                <TableRow key={`${row.partner.id}:${row.currency}`}>
                  <TableCell className="font-medium">{row.partner.name}</TableCell>
                  <TableCell>{row.currency}</TableCell>
                  {buckets.map((bucket) => (
                    <TableCell key={bucket.key} className={AMOUNT}>
                      <Amount cell={row.cells[bucket.key]} onOpen={() => onOpen({ row, bucket })} />
                    </TableCell>
                  ))}
                  <TableCell className={cn(AMOUNT, 'font-semibold')}>{formatMoney(row.total)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {report && report.totals.length > 0 && (
            <TableFooter>
              {report.totals.map((total) => (
                <TableRow key={total.currency} className="border-t-2 border-border">
                  <TableCell>Total</TableCell>
                  <TableCell>{total.currency}</TableCell>
                  {buckets.map((bucket) => (
                    <TableCell key={bucket.key} className={AMOUNT}>
                      <Amount cell={total.cells[bucket.key]} />
                    </TableCell>
                  ))}
                  <TableCell className={AMOUNT}>{formatMoney(total.total)}</TableCell>
                </TableRow>
              ))}
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  )
}
