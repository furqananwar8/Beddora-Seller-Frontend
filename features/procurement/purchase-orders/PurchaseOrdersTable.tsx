'use client'

import React from 'react'
import { RowActionsMenu, type RowActionItem } from '@/components/row-actions-menu/RowActionsMenu'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { PurchaseOrderListItem } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatCalendarDay, formatCurrency } from '@/utils/format'
import { DESTINATION_LABEL, EtdBadge, OpenBadge, PaymentBadge, PoStatusBadge, isApprovedPo, isPackable } from '../shared/poMeta'

const CELL = 'text-center align-middle'
const COLUMNS = 13

export interface PoRowActions {
  canWrite: boolean
  /** Holds the PO approval permission. */
  canDecide: boolean
  /** May open Finance > Payment Requests. */
  canViewPayments: boolean
  /** May create packaging lists. */
  canPack: boolean
  onCreatePackagingList: (row: PurchaseOrderListItem) => void
  onViewPackagingLists: (row: PurchaseOrderListItem) => void
  onViewPayments: (row: PurchaseOrderListItem) => void
  onOpen: (row: PurchaseOrderListItem) => void
  onApprove: (row: PurchaseOrderListItem) => void
  onReject: (row: PurchaseOrderListItem) => void
  onSubmit: (row: PurchaseOrderListItem) => void
  onDelete: (row: PurchaseOrderListItem) => void
  onUnlock: (row: PurchaseOrderListItem) => void
  onLock: (row: PurchaseOrderListItem) => void
  onClose: (row: PurchaseOrderListItem) => void
  onReopen: (row: PurchaseOrderListItem) => void
  onFromRemaining: (row: PurchaseOrderListItem) => void
}

function actionsFor(row: PurchaseOrderListItem, actions: PoRowActions): RowActionItem[] {
  const pending = row.status === 'PENDING_APPROVAL'
  const draft = row.status === 'DRAFT'
  const approved = isApprovedPo(row)
  const editable = !approved || row.unlocked
  const items: RowActionItem[] = [
    { key: 'view', label: 'View purchase order', onSelect: () => actions.onOpen(row) },
  ]
  if (actions.canPack && isPackable(row)) items.push({ key: 'pack', label: 'Create packaging list', onSelect: () => actions.onCreatePackagingList(row) })
  if (approved) items.push({ key: 'lists', label: 'View packaging lists', onSelect: () => actions.onViewPackagingLists(row) })
  if (actions.canViewPayments) {
    items.push({ key: 'payments', label: `View payment requests (${row.payment.requestCount})`, onSelect: () => actions.onViewPayments(row) })
  }
  if (actions.canDecide && pending) {
    items.push(
      { key: 'approve', label: 'Approve & lock', onSelect: () => actions.onApprove(row) },
      { key: 'reject', label: 'Reject with reason…', tone: 'danger', onSelect: () => actions.onReject(row) }
    )
  }
  if (actions.canDecide && approved) {
    items.push(row.unlocked ? { key: 'lock', label: 'Lock PO', onSelect: () => actions.onLock(row) } : { key: 'unlock', label: 'Unlock for editing', onSelect: () => actions.onUnlock(row) })
  }
  if (!actions.canWrite) return items
  items.push({
    key: 'edit',
    label: editable ? 'Edit PO' : 'Edit PO · locked (approved)',
    disabled: !editable,
    disabledReason: editable ? undefined : 'Approved POs are locked. An approver can unlock it for editing.',
    onSelect: () => actions.onOpen(row),
  })
  if (draft) {
    items.push(
      { key: 'submit', label: row.rejectionReason ? 'Resubmit for approval' : 'Submit for approval', onSelect: () => actions.onSubmit(row) },
      { key: 'delete', label: 'Delete draft', tone: 'danger', onSelect: () => actions.onDelete(row) }
    )
  }
  if (row.isOpen) items.push({ key: 'close', label: 'Close PO', tone: 'danger', onSelect: () => actions.onClose(row) })
  else {
    items.push({ key: 'reopen', label: 'Reopen PO', onSelect: () => actions.onReopen(row) })
    if (approved) items.push({ key: 'remaining', label: 'Create PO from remaining', onSelect: () => actions.onFromRemaining(row) })
  }
  return items
}

const PackedBar: React.FC<{ packed: number; units: number }> = ({ packed, units }) => {
  const share = units > 0 ? Math.min(100, Math.round((packed / units) * 100)) : 0
  return (
    <div className="mx-auto w-28">
      <p className="text-xs tabular-nums text-text-secondary">
        {packed.toLocaleString('en-CA')} / {units.toLocaleString('en-CA')}
      </p>
      <div className="mt-1 h-1.5 rounded-full bg-secondary-100" aria-hidden>
        <div className="h-1.5 rounded-full bg-primary-600" style={{ width: `${share}%` }} />
      </div>
    </div>
  )
}

interface PurchaseOrdersTableProps extends PoRowActions {
  rows: PurchaseOrderListItem[]
  isLoading: boolean
  isError: boolean
  filtered: boolean
}

export const PurchaseOrdersTable: React.FC<PurchaseOrdersTableProps> = ({ rows, isLoading, isError, filtered, ...actions }) => (
  <Table className="min-w-full">
    <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
      <TableRow>
        <TableHead className={CELL}>PO #</TableHead>
        <TableHead className={cn(CELL, 'min-w-[160px]')}>Supplier</TableHead>
        <TableHead className={CELL}>Dest. · Cur.</TableHead>
        <TableHead className={CELL}>Production</TableHead>
        <TableHead className={cn(CELL, 'min-w-[150px]')}>ETD</TableHead>
        <TableHead className={CELL}>SKUs</TableHead>
        <TableHead className={CELL}>Units</TableHead>
        <TableHead className={CELL}>Amount</TableHead>
        <TableHead className={CELL}>Packed</TableHead>
        <TableHead className={CELL}>Status</TableHead>
        <TableHead className={CELL}>Payment</TableHead>
        <TableHead className={CELL}>Open</TableHead>
        <TableHead className={CELL}>Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {isLoading ? (
        <TableRow>
          <TableCell colSpan={COLUMNS}>
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          </TableCell>
        </TableRow>
      ) : isError || rows.length === 0 ? (
        <TableRow>
          <TableCell colSpan={COLUMNS}>
            <div className={isError ? 'py-12 text-center font-medium text-danger-600' : 'py-12 text-center text-text-muted'}>
              {isError ? 'Could not load purchase orders.' : filtered ? 'No purchase orders match these filters.' : 'No purchase orders yet.'}
            </div>
          </TableCell>
        </TableRow>
      ) : (
        rows.map((row) => (
          <TableRow key={row.id} className="hover:bg-secondary-50">
            <TableCell className={cn(CELL, 'whitespace-nowrap font-semibold text-text-primary')}>
              {row.poNo}
              {row.rejectionReason && <span className="mt-0.5 block text-xs font-normal text-danger-600">Rejected</span>}
            </TableCell>
            <TableCell className={CELL}>{row.supplier.name}</TableCell>
            <TableCell className={cn(CELL, 'whitespace-nowrap')}>
              {DESTINATION_LABEL[row.destination]} · {row.currency}
            </TableCell>
            <TableCell className={cn(CELL, 'whitespace-nowrap')}>{row.productionDate ? formatCalendarDay(row.productionDate) : '—'}</TableCell>
            <TableCell className={CELL}>
              <EtdBadge etd={row.etd} alert={row.etdAlert} />
            </TableCell>
            <TableCell className={cn(CELL, 'tabular-nums')}>{row.skuCount}</TableCell>
            <TableCell className={cn(CELL, 'tabular-nums')}>{row.units.toLocaleString('en-CA')}</TableCell>
            <TableCell className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{formatCurrency(row.totalAmount, row.currency)}</TableCell>
            <TableCell className={CELL}>
              <PackedBar packed={row.packed} units={row.units} />
            </TableCell>
            <TableCell className={CELL}>
              <PoStatusBadge status={row.status} />
            </TableCell>
            <TableCell className={CELL}>
              <PaymentBadge payment={row.payment} withPercent />
            </TableCell>
            <TableCell className={CELL}>
              <OpenBadge isOpen={row.isOpen} />
            </TableCell>
            <TableCell className={CELL}>
              <RowActionsMenu label={row.poNo} items={actionsFor(row, actions)} />
            </TableCell>
          </TableRow>
        ))
      )}
    </TableBody>
  </Table>
)
