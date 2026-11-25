'use client'

import React, { useEffect, useState } from 'react'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { useGetAdjustmentHistoryQuery, type AdjustmentHistoryEntry, type AdjustmentRow } from '@/services/api/inventoryAdjustments.api'
import { formatDateTime } from '@/utils/format'
import { ADJUSTMENT_ROWS } from './buckets'

const PAGE_SIZE = 20
const CELL = 'text-center align-middle'
const bucketLabel = (bucket: string | null) => (bucket === null ? 'Outside warehouse' : ADJUSTMENT_ROWS.find((r) => r.bucket === bucket)?.short ?? bucket)

/** +n when units entered the warehouse, -n when they left, else a move between buckets. */
const change = (entry: AdjustmentHistoryEntry) => {
  const n = entry.quantity.toLocaleString()
  return entry.fromBucket === null ? `+${n}` : entry.toBucket === null ? `-${n}` : n
}

interface Props {
  isOpen: boolean
  onClose: () => void
  /** One SKU's history; every SKU's when omitted. */
  row?: AdjustmentRow | null
}

/** Quantity adjustments with their date, newest first: for one SKU (row action) or all SKUs (page button). */
export const AdjustmentHistoryModal: React.FC<Props> = ({ isOpen, onClose, row }) => {
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [isOpen, row?.id])
  const { data, isLoading, isFetching, isError } = useGetAdjustmentHistoryQuery({ id: row?.id, page, limit: PAGE_SIZE }, { skip: !isOpen })
  const entries = data?.data ?? []

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" title={row ? `Adjustment history · ${row.sku}` : 'Adjustment history · all SKUs'} closeOnEscape>
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : isError ? (
        <p className="py-8 text-center font-medium text-danger-600">Could not load the history.</p>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-text-muted">No adjustments yet.</p>
      ) : (
        <div className={isFetching ? 'opacity-70 transition-opacity' : undefined}>
          <div className="max-h-[60vh] overflow-auto">
            <Table className="min-w-full" wrapperClassName="overflow-visible">
              <TableHeader className="sticky top-0 z-10 bg-surface">
                <TableRow>
                  <TableHead className={CELL}>Date</TableHead>
                  {!row && <TableHead className={CELL}>SKU</TableHead>}
                  <TableHead className={CELL}>From</TableHead>
                  <TableHead className={CELL}>To</TableHead>
                  <TableHead className={CELL}>Units</TableHead>
                  <TableHead className={CELL}>By</TableHead>
                  <TableHead className={CELL}>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className={`${CELL} whitespace-nowrap`}>{formatDateTime(entry.createdAt)}</TableCell>
                    {!row && <TableCell className={`${CELL} font-mono text-xs`}>{entry.sku}</TableCell>}
                    <TableCell className={CELL}>{entry.fromBucket === null ? '—' : bucketLabel(entry.fromBucket)}</TableCell>
                    <TableCell className={CELL}>{entry.toBucket === null ? '—' : bucketLabel(entry.toBucket)}</TableCell>
                    <TableCell className={`${CELL} font-medium tabular-nums`}>{change(entry)}</TableCell>
                    <TableCell className={CELL}>{entry.user?.name ?? '—'}</TableCell>
                    <TableCell className={`${CELL} text-text-muted`}>{entry.note ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="adjustments" />}
        </div>
      )}
    </Modal>
  )
}
