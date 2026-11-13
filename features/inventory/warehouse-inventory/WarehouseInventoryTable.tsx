'use client'

import { useScrollbarBelowHeader } from '@/hooks/useFitToViewport'
import React from 'react'
import { Table, TABLE_STATUS_VIEWPORT, TableBody, TableCell, TableHead, TableHeader, TableRow, TableStatusRow } from '@/design-system/tables'
import type { WarehouseInventoryReport, WarehouseInventoryRow } from '@/services/api/warehouseInventory.api'
import { cn } from '@/utils/cn'
import { useColumnResize } from '@/hooks/useColumnResize'
import { ColumnResizeHandle, columnWidthStyle, fillRemainingWidth } from '@/components/column-resize-handle/ColumnResizeHandle'
import { FIGURE_COLUMNS, FigureColumn, headerGroups } from './warehouseInventoryFilters'

/** Every body cell is centred both ways. */
const CELL = 'text-center align-middle'
const NUM = cn(CELL, 'whitespace-nowrap tabular-nums')
/** The SKU column stays in view while the figures scroll sideways (globals.css layers sticky cells). */
const STICKY = 'sticky left-0 bg-surface'
const IDENTITY_COLUMNS = 3

/** Header cells of the first row over the figure columns: a group's heading, or an ungrouped column's own header over both rows. */
const TOP_HEADERS = (() => {
  let offset = 0
  return headerGroups(FIGURE_COLUMNS).map((group) => {
    const column = FIGURE_COLUMNS[offset]
    offset += group.span
    return { ...group, column }
  })
})()
const GROUPED_COLUMNS = FIGURE_COLUMNS.filter((column) => column.group)
const LAST_COLUMN_KEY = FIGURE_COLUMNS[FIGURE_COLUMNS.length - 1].key

const figure = (column: FigureColumn, row: WarehouseInventoryRow) => {
  const value = column.value(row)
  if (value === null) return <span className="text-text-muted">—</span>
  return column.money ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value.toLocaleString()
}

interface WarehouseInventoryTableProps {
  report: WarehouseInventoryReport | undefined
  isLoading: boolean
  isError: boolean
}

/** One row per internal SKU: its stock in every place, what is on its way, and the pipeline at landed cost. */
export const WarehouseInventoryTable: React.FC<WarehouseInventoryTableProps> = ({ report, isLoading, isError }) => {
  const scroll = useScrollbarBelowHeader<HTMLDivElement>()
  // The frozen SKU column: drag the handle on its right edge to widen or narrow it
  const skuColumn = useColumnResize({ initial: 224, min: 160, max: 560, storageKey: 'warehouse-inventory-sku-column-width' })
  const skuStyle = columnWidthStyle(skuColumn.width)
  const columns = IDENTITY_COLUMNS + FIGURE_COLUMNS.length
  const untracked = (column: FigureColumn) => Boolean(column.source && report && !report.tracked[column.source])

  return (
    <div className="overflow-hidden rounded-lg border border-border shadow-sm">
      {/* At most a screen tall: the header, the SKU column and the page stay in view however it is scrolled */}
      <div ref={scroll.ref} style={scroll.style} className={cn('max-h-[calc(100vh-7rem)] overflow-auto', TABLE_STATUS_VIEWPORT)}>
        <Table className="min-w-full" wrapperClassName="overflow-visible">
          <TableHeader className="sticky top-0 z-30 bg-surface shadow-sm">
            <TableRow>
              <TableHead colSpan={IDENTITY_COLUMNS} className={cn(STICKY, 'sticky-corner')} />
              {TOP_HEADERS.map(({ label, span, column }) =>
                label ? (
                  <TableHead key={label} colSpan={span} className="border-b border-border text-center">
                    {label}
                  </TableHead>
                ) : (
                  <TableHead key={column.key} rowSpan={2} className="min-w-[6.5rem] whitespace-nowrap text-center align-middle" style={column.key === LAST_COLUMN_KEY ? fillRemainingWidth : undefined}>
                    {column.label}
                  </TableHead>
                )
              )}
            </TableRow>
            <TableRow>
              {/* sticky-corner (globals.css) lifts it above the other header cells, which slide under it */}
              <TableHead className={cn(STICKY, 'sticky-corner text-center')} style={skuStyle}>
                SKU
                <ColumnResizeHandle resize={skuColumn} column="SKU" />
              </TableHead>
              <TableHead className="min-w-[8rem] text-center">ASIN</TableHead>
              <TableHead className="min-w-[8rem] text-center">UPC</TableHead>
              {GROUPED_COLUMNS.map((column) => (
                <TableHead key={column.key} className="min-w-[6.5rem] whitespace-nowrap text-center" style={column.key === LAST_COLUMN_KEY ? fillRemainingWidth : undefined} title={untracked(column) ? 'Not tracked yet' : undefined}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableStatusRow colSpan={columns} loading />
            ) : isError ? (
              <TableStatusRow colSpan={columns} tone="danger">Could not load the warehouse inventory.</TableStatusRow>
            ) : !report || report.data.length === 0 ? (
              <TableStatusRow colSpan={columns}>No SKU matches these filters.</TableStatusRow>
            ) : (
              report.data.map((row) => (
                <TableRow key={row.product.id}>
                  <TableCell className={cn(STICKY, CELL)} style={skuStyle}>
                    {/* w-0 + min-w-full: fills the cell without its single-line SKU counting toward how narrow the column can get */}
                    <div className="w-0 min-w-full overflow-hidden">
                      <div className="truncate font-semibold text-text-primary" title={row.product.sku}>{row.product.sku}</div>
                      <div className="line-clamp-2 break-words text-xs text-text-muted">{row.product.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className={cn(CELL, 'whitespace-nowrap')}>{row.asins.length ? row.asins.join(', ') : <span className="text-text-muted">—</span>}</TableCell>
                  <TableCell className={cn(CELL, 'whitespace-nowrap')}>{row.product.upc ?? <span className="text-text-muted">—</span>}</TableCell>
                  {FIGURE_COLUMNS.map((column) => (
                    <TableCell key={column.key} className={cn(NUM, column.strong && 'font-semibold')}>
                      {figure(column, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
