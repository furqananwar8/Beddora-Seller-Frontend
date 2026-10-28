'use client'

import React from 'react'
import { Table, TABLE_STATUS_VIEWPORT, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow, TableStatusRow } from '@/design-system/tables'
import type { InventoryAgingReport, InventoryAgingRow } from '@/services/api/inventoryAging.api'
import { cn } from '@/utils/cn'

/** Every body cell is centred both ways. */
const CELL = 'text-center align-middle'
const NUM = cn(CELL, 'whitespace-nowrap tabular-nums')
/** The SKU column stays in view while the figures scroll sideways (globals.css layers sticky cells). */
const STICKY = 'sticky left-0 bg-surface'
/** SKU, ASIN, available; then the age buckets; then units shipped; then sell-through, days of supply, action. */
const IDENTITY_COLUMNS = 3
const SHIPPED = [
  { key: 't30', label: '30 days' },
  { key: 't60', label: '60 days' },
  { key: 't90', label: '90 days' },
] as const
const TRAILING_COLUMNS = 3

const units = (value: number | null) => (value === null ? <span className="text-text-muted">—</span> : value.toLocaleString())
const decimal = (value: number | null, digits: number) =>
  value === null ? <span className="text-text-muted">—</span> : value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** Units older than 180 days are what long-term storage fees are charged on, so they stand out. */
const OLD_BUCKETS = new Set(['invAge181To270Days', 'invAge271To365Days', 'invAge365PlusDays'])

interface InventoryAgingTableProps {
  report: InventoryAgingReport | undefined
  isLoading: boolean
  isError: boolean
}

/** One row per seller SKU: units by how long they have sat at Amazon, what sold lately, and Amazon's advice. */
export const InventoryAgingTable: React.FC<InventoryAgingTableProps> = ({ report, isLoading, isError }) => {
  const buckets = report?.buckets ?? []
  const columns = IDENTITY_COLUMNS + buckets.length + SHIPPED.length + TRAILING_COLUMNS
  const rows: InventoryAgingRow[] = report?.data ?? []

  return (
    <div className="overflow-hidden rounded-lg border border-border shadow-sm">
      {/* At most a screen tall: the header, the SKU column and the totals stay in view however it is scrolled */}
      <div className={cn('max-h-[calc(100vh-7rem)] overflow-auto', TABLE_STATUS_VIEWPORT)}>
        <Table className="min-w-full" wrapperClassName="overflow-visible">
          <TableHeader className="sticky top-0 z-30 bg-surface shadow-sm">
            <TableRow>
              <TableHead colSpan={IDENTITY_COLUMNS} className={cn(STICKY, 'sticky-corner')} />
              <TableHead colSpan={buckets.length || 1} className="border-b border-border text-center">
                Inventory age
              </TableHead>
              <TableHead colSpan={SHIPPED.length} className="border-b border-border text-center">
                Units shipped
              </TableHead>
              <TableHead colSpan={TRAILING_COLUMNS} />
            </TableRow>
            <TableRow>
              {/* sticky-corner (globals.css) lifts it above the other header cells, which slide under it */}
              <TableHead className={cn(STICKY, 'sticky-corner min-w-[16rem] text-center')}>SKU</TableHead>
              <TableHead className="min-w-[8rem] text-center">ASIN</TableHead>
              <TableHead className="min-w-[6rem] text-center">Available</TableHead>
              {buckets.map((bucket) => (
                <TableHead key={bucket.key} className="min-w-[6.5rem] whitespace-nowrap text-center">
                  {bucket.label}
                </TableHead>
              ))}
              {SHIPPED.map((column) => (
                <TableHead key={column.key} className="min-w-[5.5rem] whitespace-nowrap text-center">
                  {column.label}
                </TableHead>
              ))}
              <TableHead className="min-w-[6rem] whitespace-nowrap text-center">Sell-through</TableHead>
              <TableHead className="min-w-[6rem] whitespace-nowrap text-center">Days of supply</TableHead>
              <TableHead className="min-w-[10rem] text-center">Recommended action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableStatusRow colSpan={columns} loading />
            ) : isError ? (
              <TableStatusRow colSpan={columns} tone="danger">
                Could not load the inventory aging.
              </TableStatusRow>
            ) : !report?.snapshotDate ? (
              <TableStatusRow colSpan={columns}>No Inventory Age report has synced for this marketplace yet.</TableStatusRow>
            ) : rows.length === 0 ? (
              <TableStatusRow colSpan={columns}>No SKU matches.</TableStatusRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.sellerSku}>
                  <TableCell className={cn(STICKY, 'text-left align-middle')}>
                    <p className="font-mono text-xs font-semibold text-text-primary">{row.sellerSku}</p>
                    {row.productName && <p className="line-clamp-2 text-xs text-text-secondary">{row.productName}</p>}
                  </TableCell>
                  <TableCell className={cn(CELL, 'font-mono text-xs')}>{row.asin || '—'}</TableCell>
                  <TableCell className={cn(NUM, 'font-semibold')}>{row.available.toLocaleString()}</TableCell>
                  {buckets.map((bucket) => {
                    const value = row.ages[bucket.key]
                    return (
                      <TableCell key={bucket.key} className={cn(NUM, OLD_BUCKETS.has(bucket.key) && value ? 'font-semibold text-danger-600' : undefined)}>
                        {units(value)}
                      </TableCell>
                    )
                  })}
                  {SHIPPED.map((column) => (
                    <TableCell key={column.key} className={NUM}>
                      {units(row.unitsShipped[column.key])}
                    </TableCell>
                  ))}
                  <TableCell className={NUM}>{decimal(row.sellThrough, 2)}</TableCell>
                  <TableCell className={NUM}>{decimal(row.daysOfSupply, 0)}</TableCell>
                  <TableCell className={cn(CELL, 'text-xs')} title={row.healthStatus ?? undefined}>
                    {row.recommendedAction ?? <span className="text-text-muted">—</span>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {report?.snapshotDate && rows.length > 0 && (
            <TableFooter>
              <TableRow className="border-t-2 border-border bg-secondary-100 [&>td]:bg-secondary-100">
                <TableCell className={cn(STICKY, 'bg-secondary-100 text-left font-semibold')}>Total · {report.totalRecords.toLocaleString()} SKUs</TableCell>
                <TableCell />
                <TableCell className={cn(NUM, 'font-semibold')}>{report.totals.available.toLocaleString()}</TableCell>
                {buckets.map((bucket) => (
                  <TableCell key={bucket.key} className={cn(NUM, 'font-semibold')}>
                    {report.totals[bucket.key].toLocaleString()}
                  </TableCell>
                ))}
                <TableCell colSpan={SHIPPED.length + TRAILING_COLUMNS} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  )
}
