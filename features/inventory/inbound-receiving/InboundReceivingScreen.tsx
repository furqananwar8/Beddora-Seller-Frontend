'use client'

import { useFitToViewport } from '@/hooks/useFitToViewport'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableStatusRow } from '@/design-system/tables'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetReceivingListQuery, type ReceivingListItem, type ReceivingStatus } from '@/services/api/inboundReceiving.api'
import { cn } from '@/utils/cn'
import { formatCalendarDay } from '@/utils/format'
import { ContainerStatusBadge } from '@/features/procurement/shared/poMeta'
import { ReceivingPdfModal } from './ReceivingPdfModal'
import { RECEIVING_ROUTES } from './routes'

const PAGE_SIZE = 25
type StatusFilter = 'ALL' | ReceivingStatus

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'DELIVERED_AT_WAREHOUSE', label: 'To receive' },
  { value: 'GOODS_RECEIVED', label: 'Received' },
]

const qty = (value: number) => value.toLocaleString('en-CA')
const CELL = 'text-center align-middle'
const COLUMNS = 9

const Numbers: React.FC<{ values: string[] }> = ({ values }) =>
  values.length ? <span className="whitespace-nowrap font-mono text-xs">{values.join(', ')}</span> : <span className="text-text-muted">—</span>

/**
 * Inbound Receiving: containers delivered at the warehouse wait here to be counted. "Update" opens the receiving
 * sheet; once confirmed the container is Goods Received and only its PDF remains.
 */
export const InboundReceivingScreen: React.FC = () => {
  const fit = useFitToViewport<HTMLDivElement>()
  const router = useRouter()
  const canWrite = useAppAbility().can('write', 'inventory:inbound-receiving')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [printing, setPrinting] = useState<ReceivingListItem | null>(null)

  const { data, isLoading, isFetching, isError } = useGetReceivingListQuery({ page, limit: PAGE_SIZE, search: search.trim(), status: status === 'ALL' ? undefined : status })
  const rows = data?.data ?? []

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 px-1 sm:mb-6">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Inbound Receiving</h1>
        <p className="mt-1 text-sm text-text-muted">Containers delivered at the warehouse: count what arrived, sign and confirm.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Container, CID, PO or PL number"
          aria-label="Search"
          className="ds-input ds-input-default w-full max-w-sm rounded-lg"
        />
        <SegmentedToggle<StatusFilter>
          ariaLabel="Status"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          options={STATUS_OPTIONS}
        />
      </div>

      <div className={cn('space-y-3', isFetching && !isLoading && 'opacity-70 transition-opacity')}>
        <div className="overflow-hidden rounded-lg border border-border shadow-sm">
          <div ref={fit.ref} style={fit.style} className="max-h-[calc(100vh-18rem)] overflow-auto">
            <Table className="min-w-full" wrapperClassName="overflow-visible">
              <TableHeader className="sticky top-0 z-30 bg-surface shadow-sm">
                <TableRow>
                  {['Container', 'PO #', 'PL #', 'Expected (Ctn)', 'Received (Ctn)', 'Short (Ctn)', 'Damaged (Ctn)', 'Status', 'Actions'].map((title) => (
                    <TableHead key={title} className="whitespace-nowrap text-center">
                      {title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableStatusRow colSpan={COLUMNS} loading />
                ) : isError ? (
                  <TableStatusRow colSpan={COLUMNS} tone="danger">
                    Could not load Inbound Receiving.
                  </TableStatusRow>
                ) : rows.length === 0 ? (
                  <TableStatusRow colSpan={COLUMNS}>{search || status !== 'ALL' ? 'No container matches.' : 'No container has been delivered at the warehouse yet.'}</TableStatusRow>
                ) : (
                  rows.map((row) => {
                    const received = row.status === 'GOODS_RECEIVED'
                    return (
                      <TableRow key={row.id}>
                        <TableCell className={CELL}>
                          <div className="font-semibold text-text-primary">{row.containerNumber ?? row.containerNo}</div>
                          {row.containerNumber && <div className="text-xs text-text-muted">{row.containerNo}</div>}
                        </TableCell>
                        <TableCell className={CELL}>
                          <Numbers values={row.poNos} />
                        </TableCell>
                        <TableCell className={CELL}>
                          <Numbers values={row.plNos} />
                        </TableCell>
                        <TableCell className={cn(CELL, 'tabular-nums')}>{qty(row.totals.expectedCartons)}</TableCell>
                        <TableCell className={cn(CELL, 'tabular-nums')}>{received ? qty(row.totals.actualCartons) : <span className="text-text-muted">—</span>}</TableCell>
                        <TableCell className={cn(CELL, 'tabular-nums', received && row.totals.shortageCartons > 0 && 'font-semibold text-danger-600')}>
                          {received ? qty(row.totals.shortageCartons) : <span className="text-text-muted">—</span>}
                        </TableCell>
                        <TableCell className={cn(CELL, 'tabular-nums')}>{received ? qty(row.totals.damagedCartons) : <span className="text-text-muted">—</span>}</TableCell>
                        <TableCell className={CELL}>
                          <div className="flex flex-col items-center gap-0.5">
                            <ContainerStatusBadge status={row.status} />
                            {row.receivedAt && <span className="text-xs text-text-muted">{formatCalendarDay(row.receivedAt)}</span>}
                          </div>
                        </TableCell>
                        <TableCell className={CELL}>
                          <RowActionsMenu
                            label={row.containerNo}
                            items={[
                              {
                                key: 'update',
                                label: received ? 'View receiving' : 'Update',
                                onSelect: () => router.push(RECEIVING_ROUTES.update(row.id)),
                                ...(received || canWrite ? {} : { disabled: true, disabledReason: 'You cannot receive containers' }),
                              },
                              { key: 'pdf', label: 'Download PDF', onSelect: () => setPrinting(row) },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        {data && data.totalRecords > 0 && (
          <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="containers" />
        )}
      </div>

      <ReceivingPdfModal container={printing} onClose={() => setPrinting(null)} />
    </Container>
  )
}
