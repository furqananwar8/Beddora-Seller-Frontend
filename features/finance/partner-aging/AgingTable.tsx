'use client'

import React from 'react'
import { Table, TABLE_STATUS_VIEWPORT, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow, TableStatusRow } from '@/design-system/tables'
import type { AgingBucket, AgingCell, PartnerAgingReport } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { formatMoney } from '../shared/format'
import { AGING_GROUP_META, groupBuckets } from './agingMeta'
import type { AgingSelection } from './AgingEntriesModal'

/** Every cell is centred both ways. */
const CELL = 'text-center align-middle'
const AMOUNT = cn(CELL, 'whitespace-nowrap tabular-nums')
/** Headers outside the coming-due / overdue groups: the primary colour, so the whole header reads as one band. */
const PLAIN_HEAD = 'bg-primary-600 text-center align-middle text-white'
/** Totals sit apart from the partner rows: their own fill, a heavier rule above, and always in view at the bottom. */
const FOOT_CELL = cn(AMOUNT, 'bg-secondary-100 font-semibold text-text-primary')

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
      {/* Scrolls down past many partners with the header and the totals staying in view */}
      <div className={cn('max-h-[calc(100vh-260px)] overflow-y-auto overflow-x-auto', TABLE_STATUS_VIEWPORT)}>
        <Table className="min-w-full" wrapperClassName="overflow-visible">
          <TableHeader className="sticky top-0 z-20 shadow-sm">
            <TableRow>
              <TableHead rowSpan={2} className={PLAIN_HEAD}>
                Vendor / Supplier
              </TableHead>
              <TableHead rowSpan={2} className={PLAIN_HEAD}>
                Currency
              </TableHead>
              {groups.map(({ group, buckets: inGroup }) => (
                <TableHead key={group} colSpan={inGroup.length} className={cn('text-center align-middle', AGING_GROUP_META[group].head)}>
                  {AGING_GROUP_META[group].title}
                </TableHead>
              ))}
              <TableHead rowSpan={2} className={PLAIN_HEAD}>
                Total
              </TableHead>
            </TableRow>
            <TableRow>
              {buckets.map((bucket) => (
                <TableHead key={bucket.key} className={cn('text-center align-middle', AGING_GROUP_META[bucket.group].head)}>
                  {bucket.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableStatusRow colSpan={columns} loading />
            ) : isError ? (
              <TableStatusRow colSpan={columns} tone="danger">
                Could not load the aging report.
              </TableStatusRow>
            ) : !report || report.rows.length === 0 ? (
              <TableStatusRow colSpan={columns}>Nothing is waiting to be paid.</TableStatusRow>
            ) : (
              report.rows.map((row) => (
                <TableRow key={`${row.partner.id}:${row.currency}`}>
                  <TableCell className={cn(CELL, 'font-medium')}>{row.partner.name}</TableCell>
                  <TableCell className={CELL}>{row.currency}</TableCell>
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
            <TableFooter className="sticky bottom-0 z-10 shadow-[0_-2px_4px_rgba(0,0,0,0.06)]">
              {report.totals.map((total, index) => (
                <TableRow key={total.currency} className={cn('hover:bg-transparent', index === 0 && '[&>td]:border-t-2 [&>td]:border-text-primary')}>
                  <TableCell className={FOOT_CELL}>Total</TableCell>
                  <TableCell className={FOOT_CELL}>{total.currency}</TableCell>
                  {buckets.map((bucket) => (
                    <TableCell key={bucket.key} className={FOOT_CELL}>
                      <Amount cell={total.cells[bucket.key]} />
                    </TableCell>
                  ))}
                  <TableCell className={FOOT_CELL}>{formatMoney(total.total)}</TableCell>
                </TableRow>
              ))}
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  )
}
