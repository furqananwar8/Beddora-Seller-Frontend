'use client'

import { useScrollbarBelowHeader } from '@/hooks/useFitToViewport'
import React from 'react'
import { ArrowDownWideNarrow, ArrowUpDown, ArrowUpNarrowWide } from 'lucide-react'
import { MarketplaceFlag } from '@/components/marketplace-flag/MarketPlaceFlag'
import { Table, TABLE_STATUS_VIEWPORT, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow, TableStatusRow } from '@/design-system/tables'
import type { AgingSortColumn, InventoryAgingReport, InventoryAgingRow, SortOrder } from '@/services/api/inventoryAging.api'
import { cn } from '@/utils/cn'
import { useColumnResize } from '@/hooks/useColumnResize'
import { ColumnResizeHandle, columnWidthStyle, fillRemainingWidth } from '@/components/column-resize-handle/ColumnResizeHandle'

/** Every body cell is centred both ways. */
const CELL = 'text-center align-middle'
const NUM = cn(CELL, 'whitespace-nowrap tabular-nums')
/** The SKU column stays in view while the figures scroll sideways (globals.css layers sticky cells). */
const STICKY = 'sticky left-0 bg-surface'
/** SKU, ASIN, available, reserved; then the age buckets. */
const IDENTITY_COLUMNS = 4

const units = (value: number | null) => (value === null ? <span className="text-text-muted">—</span> : value.toLocaleString())

/** Units older than 180 days are what long-term storage fees are charged on, so they stand out. */
const OLD_BUCKETS = new Set(['invAge181To270Days', 'invAge271To365Days', 'invAge365PlusDays'])

interface InventoryAgingTableProps {
  report: InventoryAgingReport | undefined
  isLoading: boolean
  isError: boolean
  sort: { column: AgingSortColumn; order: SortOrder } | null
  onSort: (column: AgingSortColumn) => void
}

interface SortableHeadProps {
  column: AgingSortColumn
  sort: InventoryAgingTableProps['sort']
  onSort: InventoryAgingTableProps['onSort']
  className?: string
  style?: React.CSSProperties
  title?: string
  children: React.ReactNode
}

/** A header that orders the whole report by its column: highest first, then lowest first. */
const SortableHead: React.FC<SortableHeadProps> = ({ column, sort, onSort, className, style, title, children }) => {
  const active = sort?.column === column
  return (
    <TableHead className={cn('text-center', className)} style={style} title={title} aria-sort={active ? (sort.order === 'desc' ? 'descending' : 'ascending') : 'none'}>
      <button type="button" onClick={() => onSort(column)} className="group inline-flex items-center justify-center gap-1.5 whitespace-nowrap uppercase hover:text-text-primary">
        {children}
        {!active ? (
          <ArrowUpDown aria-hidden className="h-3.5 w-3.5 text-text-tertiary opacity-60 group-hover:opacity-100" />
        ) : sort.order === 'desc' ? (
          <ArrowDownWideNarrow aria-hidden className="h-3.5 w-3.5 text-primary-600" />
        ) : (
          <ArrowUpNarrowWide aria-hidden className="h-3.5 w-3.5 text-primary-600" />
        )}
      </button>
    </TableHead>
  )
}

/** One row per seller SKU and marketplace: units by how long they have sat at Amazon, beside what is sellable and what is reserved. */
export const InventoryAgingTable: React.FC<InventoryAgingTableProps> = ({ report, isLoading, isError, sort, onSort }) => {
  const scroll = useScrollbarBelowHeader<HTMLDivElement>()
  // The frozen SKU column: drag the handle on its right edge to widen or narrow it
  const skuColumn = useColumnResize({ initial: 256, min: 180, max: 640, storageKey: 'inventory-aging-sku-column-width' })
  const skuStyle = columnWidthStyle(skuColumn.width)
  const buckets = report?.buckets ?? []
  const columns = IDENTITY_COLUMNS + buckets.length
  const rows: InventoryAgingRow[] = report?.data ?? []

  return (
    <div className="overflow-hidden rounded-lg border border-border shadow-sm">
      {/* At most a screen tall: the header, the SKU column and the totals stay in view however it is scrolled */}
      <div ref={scroll.ref} style={scroll.style} className={cn('max-h-[calc(100vh-7rem)] overflow-auto', TABLE_STATUS_VIEWPORT)}>
        <Table className="min-w-full" wrapperClassName="overflow-visible">
          <TableHeader className="sticky top-0 z-30 bg-surface shadow-sm">
            <TableRow>
              <TableHead colSpan={IDENTITY_COLUMNS} className={cn(STICKY, 'sticky-corner')} />
              <TableHead colSpan={buckets.length || 1} className="border-b border-border text-center">
                Inventory age
              </TableHead>
            </TableRow>
            <TableRow>
              {/* sticky-corner (globals.css) lifts it above the other header cells, which slide under it */}
              <TableHead className={cn(STICKY, 'sticky-corner text-center')} style={skuStyle}>
                SKU
                <ColumnResizeHandle resize={skuColumn} column="SKU" />
              </TableHead>
              <TableHead className="min-w-[8rem] text-center">ASIN</TableHead>
              <SortableHead column="available" sort={sort} onSort={onSort} className="min-w-[6rem]">
                Available
              </SortableHead>
              <SortableHead column="reserved" sort={sort} onSort={onSort} className="min-w-[6rem]" title="Held for customer orders, FC transfers or processing: counted in the age columns, not in Available">
                Reserved
              </SortableHead>
              {buckets.map((bucket, index) => (
                <SortableHead key={bucket.key} column={bucket.key} sort={sort} onSort={onSort} className="min-w-[6.5rem]" style={index === buckets.length - 1 ? fillRemainingWidth : undefined}>
                  {bucket.label}
                </SortableHead>
              ))}
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
              <TableStatusRow colSpan={columns}>No Inventory Age report has synced for the marketplaces picked yet.</TableStatusRow>
            ) : rows.length === 0 ? (
              <TableStatusRow colSpan={columns}>No SKU matches.</TableStatusRow>
            ) : (
              rows.map((row) => (
                <TableRow key={`${row.marketplace}:${row.sellerSku}`}>
                  <TableCell className={cn(STICKY, 'text-left align-middle')} style={skuStyle}>
                    {/* w-0 + min-w-full: fills the cell without its single-line SKU counting toward how narrow the column can get */}
                    <div className="flex w-0 min-w-full items-start gap-2">
                      <MarketplaceFlag marketplace={row.marketplace} />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate font-mono text-xs font-semibold text-text-primary" title={row.sellerSku}>{row.sellerSku}</p>
                        {row.productName && <p className="line-clamp-2 break-words text-xs text-text-secondary">{row.productName}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={cn(CELL, 'font-mono text-xs')}>{row.asin || '—'}</TableCell>
                  <TableCell className={cn(NUM, 'font-semibold')}>{row.available.toLocaleString()}</TableCell>
                  <TableCell className={NUM}>{units(row.reserved)}</TableCell>
                  {buckets.map((bucket) => {
                    const value = row.ages[bucket.key]
                    return (
                      <TableCell key={bucket.key} className={cn(NUM, OLD_BUCKETS.has(bucket.key) && value ? 'font-semibold text-danger-600' : undefined)}>
                        {units(value)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
          {report?.snapshotDate && rows.length > 0 && (
            <TableFooter>
              <TableRow className="border-t-2 border-border bg-secondary-100 [&>td]:bg-secondary-100">
                <TableCell className={cn(STICKY, 'bg-secondary-100 text-left font-semibold')} style={skuStyle}>Total · {report.totalRecords.toLocaleString()} listings</TableCell>
                <TableCell />
                <TableCell className={cn(NUM, 'font-semibold')}>{report.totals.available.toLocaleString()}</TableCell>
                <TableCell className={cn(NUM, 'font-semibold')}>{report.totals.reserved.toLocaleString()}</TableCell>
                {buckets.map((bucket) => (
                  <TableCell key={bucket.key} className={cn(NUM, 'font-semibold')}>
                    {report.totals[bucket.key].toLocaleString()}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  )
}
