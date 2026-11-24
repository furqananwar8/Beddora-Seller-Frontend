'use client'

import { useFitToViewport } from '@/hooks/useFitToViewport'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableStatusRow } from '@/design-system/tables'
import { NewTabLink } from '@/components/new-tab-link/NewTabLink'
import { CONTAINER_ROUTES } from '@/features/procurement/containers/routes'
import { columnHeading } from './columnHeading'
import { useScanItems } from '@/features/barcode/session/useScanItems'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetReceivingListQuery, type ReceivingListItem, type ReceivingStatus } from '@/services/api/inboundReceiving.api'
import { cn } from '@/utils/cn'
import { formatCalendarDay } from '@/utils/format'
import { ContainerStatusBadge } from '@/features/procurement/shared/poMeta'
import { ReceivingPdfModal } from './ReceivingPdfModal'
import { RECEIVING_ROUTES } from './routes'

import { usePageSize } from '@/hooks/usePageSize'
const PAGE_SIZE = 25
type StatusFilter = 'ALL' | ReceivingStatus

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'DELIVERED_AT_WAREHOUSE', label: 'To receive' },
  { value: 'GOODS_RECEIVED', label: 'Received' },
]

const qty = (value: number) => value.toLocaleString('en-CA')
const CELL = 'text-center align-middle'

/**
 * Until the carton receipt is signed, the received, short and damaged columns show what scanning has counted so far, in
 * units (a dash when nothing was scanned). A shortage stays provisional while scanning is open.
 */
function ScannedUnits({ row, value, extra, tone }: { row: ReceivingListItem; value: number; extra?: string; tone?: 'danger' }) {
  if (!row.scanned.started) return <span className="text-text-muted">—</span>
  return (
    <div title="Counted by scanning, in units. The carton receipt is filled in when it is signed." className="leading-tight">
      <span className={cn(tone === 'danger' && 'font-semibold text-danger-600')}>{qty(value)}</span>
      {extra && <div className="text-xs font-medium text-warning-700">{extra}</div>}
    </div>
  )
}
const COLUMNS = 9

/** PO or packaging list numbers, each a link that opens that record in a new tab. */
const Numbers: React.FC<{ links: Array<{ no: string; id: number }>; href: (id: number) => string }> = ({ links, href }) =>
  links.length ? (
    <span className="whitespace-nowrap font-mono text-xs">
      {links.map((link, index) => (
        <React.Fragment key={link.id}>
          {index > 0 && ', '}
          <NewTabLink href={href(link.id)}>{link.no}</NewTabLink>
        </React.Fragment>
      ))}
    </span>
  ) : (
    <span className="text-text-muted">—</span>
  )

/**
 * Inbound Receiving: containers delivered at the warehouse wait here to be counted. "Update" opens the receiving
 * sheet; once confirmed the container is Goods Received and only its PDF remains.
 */
export const InboundReceivingScreen: React.FC = () => {
  const fit = useFitToViewport<HTMLDivElement>()
  const router = useRouter()
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'inventory:inbound-receiving')
  const canScan = ability.can('write', 'barcode:scan-items')
  const scanItems = useScanItems()
  const scanItem = (id: number) => {
    const target = { scenario: 'CONTAINER' as const, sourceId: String(id) }
    const lockedBy = scanItems.lockedBy(target)
    return {
      key: 'scan',
      label: lockedBy ? `Locked by ${lockedBy}` : 'Scan items',
      onSelect: () => scanItems.open(target),
      ...(lockedBy ? { disabled: true, disabledReason: 'Available once they end the session' } : {}),
    }
  }
  const [page, setPage] = useState(1)
  const pageSize = usePageSize(PAGE_SIZE)
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [printing, setPrinting] = useState<ReceivingListItem | null>(null)

  const { data, isLoading, isFetching, isError } = useGetReceivingListQuery({ page, limit: pageSize, search: search.trim(), status: status === 'ALL' ? undefined : status })
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
                  {['Container', 'PO #', 'PL #', 'Expected (units)', 'Received (units)', 'Short (units)', 'Damaged (units)', 'Status', 'Actions'].map((title) => (
                    <TableHead key={title} className="whitespace-nowrap text-center">
                      {columnHeading(title)}
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
                          <NewTabLink href={CONTAINER_ROUTES.detail(row.id)} className="font-semibold">
                            {row.containerNumber ?? row.containerNo}
                          </NewTabLink>
                          {row.containerNumber && <div className="text-xs text-text-muted">{row.containerNo}</div>}
                        </TableCell>
                        <TableCell className={CELL}>
                          <Numbers links={row.poLinks} href={(id) => `/dashboard/procurement/purchase-orders/${id}`} />
                        </TableCell>
                        <TableCell className={CELL}>
                          <Numbers links={row.plLinks} href={(id) => `/dashboard/procurement/packaging-lists/${id}`} />
                        </TableCell>
                        <TableCell className={cn(CELL, 'tabular-nums')}>
                          <div>{qty(row.totals.expectedUnits)}</div>
                          <div className="text-xs text-text-muted">{qty(row.totals.expectedCartons)} ctn</div>
                        </TableCell>
                        <TableCell className={cn(CELL, 'tabular-nums')}>
                          {received ? qty(row.totals.actualUnits) : <ScannedUnits row={row} value={row.scanned.goodUnits + row.scanned.damagedUnits} extra={row.scanned.overUnits > 0 ? `+${qty(row.scanned.overUnits)} over` : undefined} />}
                        </TableCell>
                        <TableCell className={cn(CELL, 'tabular-nums', received && row.totals.shortageUnits > 0 && 'font-semibold text-danger-600')}>
                          {received ? qty(row.totals.shortageUnits) : <ScannedUnits row={row} value={row.scanned.shortUnits} tone={row.scanned.shortUnits > 0 && row.scanned.closed ? 'danger' : undefined} />}
                        </TableCell>
                        <TableCell className={cn(CELL, 'tabular-nums')}>{received ? qty(row.totals.damagedUnits) : <ScannedUnits row={row} value={row.scanned.damagedUnits} tone={row.scanned.damagedUnits > 0 ? 'danger' : undefined} />}</TableCell>
                        <TableCell className={CELL}>
                          <div className="flex flex-col items-center gap-0.5">
                            <ContainerStatusBadge status={row.status} />
                            {row.receivedAt && <span className="text-xs text-text-muted">{formatCalendarDay(row.receivedAt)}</span>}
                            {row.scanned.started && <span className="text-xs text-text-muted">{row.scanned.closed ? 'Scanning closed' : 'Scanning open'}</span>}
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
                              // Scanning the container's units in is what puts them into inventory; confirming the receipt only records it
                              ...(canScan ? [scanItem(row.id)] : []),
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
          <PaginationFooter selectablePageSize page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="containers" />
        )}
      </div>

      <ReceivingPdfModal container={printing} onClose={() => setPrinting(null)} />
      {scanItems.dialog}
    </Container>
  )
}
