'use client'

import React from 'react'
import { skipToken } from '@reduxjs/toolkit/query'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { useGetStockCountHistoryQuery, type StockCountRow } from '@/services/api/stockCount.api'
import { cn } from '@/utils/cn'

const n = (value: number) => value.toLocaleString()
const CELL = 'text-center align-middle whitespace-nowrap tabular-nums'

interface StockCountHistoryModalProps {
  row: StockCountRow | null
  onClose: () => void
}

/** The physical counts saved for one SKU, newest first: the day counted, the system quantity, the count and the variance. */
export const StockCountHistoryModal: React.FC<StockCountHistoryModalProps> = ({ row, onClose }) => {
  const { data, isFetching, isError } = useGetStockCountHistoryQuery(row ? row.id : skipToken)

  return (
    <Modal isOpen={row !== null} onClose={onClose} title="Adjustment history" size="xl">
      {row && (
        <div className="flex flex-col gap-4">
          <div>
            <div className="font-medium text-text-primary">{row.description}</div>
            <div className="font-mono text-sm text-text-muted">{row.sku}</div>
          </div>
          {isFetching ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : isError ? (
            <p className="py-8 text-center font-medium text-danger-600">Could not load the history.</p>
          ) : !data || data.length === 0 ? (
            <p className="py-8 text-center text-text-muted">No adjustments saved for this SKU yet.</p>
          ) : (
            <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
              <Table className="min-w-full" wrapperClassName="overflow-visible">
                <TableHeader className="sticky top-0 bg-surface shadow-sm">
                  <TableRow>
                    <TableHead className="text-center">Counted on</TableHead>
                    <TableHead className="text-center">System</TableHead>
                    <TableHead className="text-center">Counted</TableHead>
                    <TableHead className="text-center">Variance</TableHead>
                    <TableHead className="text-center">Reason</TableHead>
                    <TableHead className="text-center">Saved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className={CELL}>{entry.day}</TableCell>
                      <TableCell className={CELL}>{n(entry.systemQuantity)}</TableCell>
                      <TableCell className={cn(CELL, 'font-semibold')}>{n(entry.countedQuantity)}</TableCell>
                      <TableCell className={cn(CELL, 'font-semibold', entry.variance < 0 ? 'text-danger-600' : 'text-emerald-700')}>
                        {entry.variance > 0 ? `+${n(entry.variance)}` : n(entry.variance)}
                      </TableCell>
                      <TableCell className="text-center align-middle text-sm">{entry.note ?? <span className="text-text-muted">—</span>}</TableCell>
                      <TableCell className="text-center align-middle text-sm text-text-muted">
                        {new Date(entry.createdAt).toLocaleString()}
                        {entry.by ? <div>{entry.by}</div> : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
