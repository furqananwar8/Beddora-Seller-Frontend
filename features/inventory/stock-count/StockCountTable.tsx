'use client'

import React from 'react'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { Table, TABLE_STATUS_VIEWPORT, TableBody, TableCell, TableHead, TableHeader, TableRow, TableStatusRow } from '@/design-system/tables'
import { useScrollbarBelowHeader } from '@/hooks/useFitToViewport'
import type { StockCountRow } from '@/services/api/stockCount.api'
import { cn } from '@/utils/cn'

const CELL = 'text-center align-middle'
const NUM = cn(CELL, 'whitespace-nowrap tabular-nums')
const COLUMNS = 6

const n = (value: number) => value.toLocaleString()
const dash = <span className="text-text-muted">—</span>

interface StockCountTableProps {
  rows: StockCountRow[] | undefined
  asOf: string
  isLoading: boolean
  isError: boolean
  onAdjust: (row: StockCountRow) => void
  onHistory: (row: StockCountRow) => void
}

/** One row per internal SKU: its quantity on the day, what left and arrived since, and what is on hand now. */
export const StockCountTable: React.FC<StockCountTableProps> = ({ rows, asOf, isLoading, isError, onAdjust, onHistory }) => {
  const scroll = useScrollbarBelowHeader<HTMLDivElement>()

  return (
    <div className="overflow-hidden rounded-lg border border-border shadow-sm">
      <div ref={scroll.ref} style={scroll.style} className={cn('max-h-[calc(100vh-7rem)] overflow-auto', TABLE_STATUS_VIEWPORT)}>
        <Table className="min-w-full" wrapperClassName="overflow-visible">
          <TableHeader className="sticky top-0 z-30 bg-surface shadow-sm">
            <TableRow>
              <TableHead className={cn(CELL, 'min-w-[20rem]')}>SKU</TableHead>
              <TableHead className={cn(CELL, 'whitespace-nowrap')}>Stock on {asOf}</TableHead>
              <TableHead className={cn(CELL, 'whitespace-nowrap')}>Shipped / sold since</TableHead>
              <TableHead className={cn(CELL, 'whitespace-nowrap')}>Received since</TableHead>
              <TableHead className={cn(CELL, 'whitespace-nowrap')}>On hand now</TableHead>
              <TableHead className={cn(CELL, 'w-16')}>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableStatusRow colSpan={COLUMNS} loading />
            ) : isError ? (
              <TableStatusRow colSpan={COLUMNS} tone="danger">Could not load the stock.</TableStatusRow>
            ) : !rows || rows.length === 0 ? (
              <TableStatusRow colSpan={COLUMNS}>No SKU matches these filters.</TableStatusRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className={CELL}>
                    <div className="font-semibold text-text-primary">{row.sku}</div>
                    <div className="line-clamp-2 break-words text-xs text-text-muted">{row.description}</div>
                  </TableCell>
                  <TableCell className={cn(NUM, 'font-semibold')}>{n(row.systemOnHand)}</TableCell>
                  <TableCell className={NUM}>{row.movedSince.out > 0 ? `−${n(row.movedSince.out)}` : dash}</TableCell>
                  <TableCell className={NUM}>{row.movedSince.in > 0 ? n(row.movedSince.in) : dash}</TableCell>
                  <TableCell className={NUM}>{n(row.currentOnHand)}</TableCell>
                  <TableCell className={CELL}>
                    <RowActionsMenu label={row.sku} items={[
                        { key: 'adjust', label: 'Adjustment', onSelect: () => onAdjust(row) },
                        { key: 'history', label: 'Adjustment history', onSelect: () => onHistory(row) },
                      ]} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
