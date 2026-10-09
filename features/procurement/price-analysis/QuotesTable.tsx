'use client'

import React from 'react'
import { fieldClass } from '@/components/form-field/FormField'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { cn } from '@/utils/cn'
import { formatVsLowest, TOP_RANKS, type QuoteRow, type RankedRow, type RowErrors } from './priceAnalysisForm'
import { RANK_TONE } from './TopSupplierCards'

import { NumericInput } from '@/components/form-field/NumericInput'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { formatCalendarDay } from '@/utils/format'

const CELL = 'text-center align-middle'

/** The review column: who may approve or reject, which quote is approved, and why the buttons may be blocked. */
export interface ApprovalControl {
  canApprove: boolean
  canReject: boolean
  approved: { supplierId: number; by: string | null; at: string } | null
  /** Why no quote can be approved right now (e.g. unsaved edits); null when approving is open. */
  blockedReason: string | null
  /** Suppliers whose row is not saved yet cannot be approved. */
  savedSupplierIds: ReadonlySet<number>
  busySupplierId: number | null
  onApprove: (supplierId: number) => void
  onReject: (supplierId: number) => void
}

interface QuotesTableProps {
  rows: RankedRow[]
  /** Errors per supplier id (typed or from the server). */
  errors: Map<number, RowErrors>
  /** Show "Enter a price" etc. only after a save was attempted or the field was left. */
  showErrors: boolean
  onChange: (supplierId: number, patch: Partial<QuoteRow>) => void
  onRemove: (supplierId: number) => void
  readOnly?: boolean
  approval: ApprovalControl
}

/** Why a row cannot be reviewed right now (unsaved edits, an unsaved row), or null. */
function reviewBlocked(approval: ApprovalControl, supplierId: number): string | null {
  if (approval.blockedReason) return approval.blockedReason
  if (!approval.savedSupplierIds.has(supplierId)) return 'Save this supplier first'
  return null
}

/** Why one row's Approve button is off, or null when it can be pressed. */
const approveBlocked = (approval: ApprovalControl, supplierId: number): string | null =>
  approval.approved ? 'Another supplier is approved; edit the analysis to approve again' : reviewBlocked(approval, supplierId)

/**
 * One row per supplier: point of contact, price and remarks typed here, "vs lowest" and rank worked out live, and
 * the approval: one quote at a time, the other buttons blocked until an edit takes the approval back.
 */
export const QuotesTable: React.FC<QuotesTableProps> = ({ rows, errors, showErrors, onChange, onRemove, readOnly, approval }) => (
  <div className="overflow-x-auto rounded-lg border border-border">
    <Table className="min-w-full">
      <TableHeader className="bg-secondary-50">
        <TableRow>
          <TableHead className={cn(CELL, 'w-10')}>#</TableHead>
          <TableHead className="min-w-[180px] text-left">Supplier</TableHead>
          <TableHead className="min-w-[200px] text-left">Supplier POC (point of contact)</TableHead>
          <TableHead className={cn(CELL, 'min-w-[130px]')}>Price / unit</TableHead>
          <TableHead className={CELL}>Vs lowest</TableHead>
          <TableHead className={CELL}>Rank</TableHead>
          <TableHead className="min-w-[200px] text-left">Remarks</TableHead>
          <TableHead className={cn(CELL, 'min-w-[190px]')}>Approval</TableHead>
          {!readOnly && <TableHead className={cn(CELL, 'w-12')} aria-label="Remove" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={readOnly ? 8 : 9}>
              <p className="py-8 text-center text-sm text-text-muted">{readOnly ? 'No supplier quotes yet.' : 'Pick suppliers in “Add suppliers” to add a row for each.'}</p>
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, index) => {
            const rowErrors = errors.get(row.supplier.id) ?? {}
            const priceError = showErrors || rowErrors.supplierId ? rowErrors.unitPrice : undefined
            const isApproved = approval.approved?.supplierId === row.supplier.id
            const rejection = row.rejection
            const blocked = approveBlocked(approval, row.supplier.id)
            const rejectBlocked = reviewBlocked(approval, row.supplier.id)
            return (
              <TableRow key={row.supplier.id} className={isApproved ? 'bg-success-50/60' : rejection ? 'bg-danger-50/40' : undefined}>
                <TableCell className={cn(CELL, 'text-text-muted')}>{index + 1}</TableCell>
                <TableCell className="align-middle">
                  <p className="font-semibold text-text-primary">{row.supplier.name}</p>
                  {rowErrors.supplierId && <p className="text-xs text-danger-600">{rowErrors.supplierId}</p>}
                </TableCell>
                <TableCell className="align-middle">
                  <input
                    aria-label={`Point of contact at ${row.supplier.name}`}
                    autoComplete="off"
                    value={row.contactName}
                    placeholder={row.supplier.contactName ?? 'Contact name'}
                    onChange={(event) => onChange(row.supplier.id, { contactName: event.target.value })}
                    className={fieldClass(rowErrors.contactName)}
                    disabled={readOnly}
                  />
                  {rowErrors.contactName && <p className="mt-1 text-xs text-danger-600">{rowErrors.contactName}</p>}
                </TableCell>
                <TableCell className={CELL}>
                  <NumericInput decimal
                    aria-label={`Unit price from ${row.supplier.name}`}

                    autoComplete="off"
                    value={row.unitPrice}
                    placeholder="0.00"
                    onChange={(event) => onChange(row.supplier.id, { unitPrice: event.target.value })}
                    className={cn(fieldClass(priceError), 'text-right tabular-nums')}
                    disabled={readOnly}
                  />
                  {priceError && <p className="mt-1 text-left text-xs text-danger-600">{priceError}</p>}
                </TableCell>
                <TableCell className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{formatVsLowest(row.vsLowestPercent)}</TableCell>
                <TableCell className={CELL}>
                  {row.rank !== null && row.rank <= TOP_RANKS ? (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
                      <span className={cn('h-2.5 w-2.5 rounded-full', RANK_TONE[row.rank].dot)} aria-hidden />
                      Top {row.rank}
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </TableCell>
                <TableCell className="align-middle">
                  <input
                    aria-label={`Remarks for ${row.supplier.name}`}
                    autoComplete="off"
                    value={row.remarks}
                    placeholder="Remarks"
                    onChange={(event) => onChange(row.supplier.id, { remarks: event.target.value })}
                    className={fieldClass(rowErrors.remarks)}
                    disabled={readOnly}
                  />
                  {rowErrors.remarks && <p className="mt-1 text-xs text-danger-600">{rowErrors.remarks}</p>}
                </TableCell>
                <TableCell className={CELL}>
                  <div className="flex flex-col items-center gap-1">
                    {isApproved ? (
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <StatusBadge label="APPROVED" tone="success" />
                        <span className="whitespace-nowrap text-[11px] text-text-muted">
                          {approval.approved!.by ?? 'An approver'} · {formatCalendarDay(approval.approved!.at)}
                        </span>
                      </span>
                    ) : rejection ? (
                      <span className="inline-flex max-w-[200px] flex-col items-center gap-0.5">
                        <StatusBadge label="REJECTED" tone="danger" />
                        <span className="text-[11px] text-text-muted">
                          {rejection.by.name ?? 'An approver'} · {formatCalendarDay(rejection.at)}
                        </span>
                        {rejection.reason && <span className="text-[11px] text-danger-700">{rejection.reason}</span>}
                      </span>
                    ) : !approval.canApprove && !approval.canReject ? (
                      <span className="text-xs text-text-muted">{approval.approved ? '—' : 'Awaiting approval'}</span>
                    ) : null}
                    {!rejection && (approval.canApprove || approval.canReject) && (
                      <div className="flex items-center gap-1.5">
                        {approval.canApprove && !isApproved && (
                          <span title={blocked ?? undefined}>
                            <Button type="button" size="sm" variant="outline" disabled={Boolean(blocked)} isLoading={approval.busySupplierId === row.supplier.id} onClick={() => approval.onApprove(row.supplier.id)}>
                              Approve
                            </Button>
                          </span>
                        )}
                        {approval.canReject && (
                          <span title={rejectBlocked ?? undefined}>
                            <Button type="button" size="sm" variant="danger" disabled={Boolean(rejectBlocked)} onClick={() => approval.onReject(row.supplier.id)}>
                              Reject
                            </Button>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                {!readOnly && (
                  <TableCell className={CELL}>
                    <button
                      type="button"
                      onClick={() => onRemove(row.supplier.id)}
                      aria-label={`Remove ${row.supplier.name}`}
                      className="rounded p-1 text-text-muted hover:bg-danger-50 hover:text-danger-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </TableCell>
                )}
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  </div>
)
