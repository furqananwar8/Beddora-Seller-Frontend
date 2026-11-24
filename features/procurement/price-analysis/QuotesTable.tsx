'use client'

import React from 'react'
import { ChoiceSelect } from '@/components/choice-select/ChoiceSelect'
import { fieldClass } from '@/components/form-field/FormField'
import { NumericInput } from '@/components/form-field/NumericInput'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { PriceFamilySettings } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatCalendarDay } from '@/utils/format'
import { formatMoney, formatVsLowest, quoteKey, rowKey, SAMPLE_OPTIONS, TOP_RANKS, type QuoteRow, type RankedRow, type RowErrors } from './priceAnalysisForm'
import { RANK_TONE } from './TopSupplierCards'

const CELL = 'text-center align-middle'

/** The review column: who may approve or reject, which quote is approved, and why the buttons may be blocked. */
export interface ApprovalControl {
  canApprove: boolean
  canReject: boolean
  approved: { supplierId: number; packagingOption: string; by: string | null; at: string } | null
  /** The quote an earlier step of the chain approved: a later step may confirm it or approve another one. Null when no step has picked yet. */
  picked: { supplierId: number; packagingOption: string; by: string | null; step: number } | null
  /** Why no quote can be approved right now (e.g. unsaved edits); null when approving is open. */
  blockedReason: string | null
  /** Quotes (supplier + packaging) that are saved; one that is not cannot be reviewed yet. */
  savedKeys: ReadonlySet<string>
  /** The quote being approved right now. */
  busyKey: string | null
  onApprove: (row: QuoteRow) => void
  onReject: (row: QuoteRow) => void
}

interface QuotesTableProps {
  rows: RankedRow[]
  /** Errors per row (typed or from the server), by the row's uid. */
  errors: Map<string, RowErrors>
  /** Show "Enter a price" etc. only after a save was attempted or the field was left. */
  showErrors: boolean
  currency: string
  /** The family's landed-cost inputs; with landed cost on, the CBM, freight, duty and landed columns show. */
  settings: PriceFamilySettings
  onChange: (uid: string, patch: Partial<QuoteRow>) => void
  onRemove: (uid: string) => void
  /** Adds another quote for the same supplier (another packaging). */
  onAddPackaging: (uid: string) => void
  readOnly?: boolean
  approval: ApprovalControl
}

const isSameQuote = (control: { supplierId: number; packagingOption: string } | null, row: QuoteRow) => control !== null && quoteKey(control.supplierId, control.packagingOption) === rowKey(row)

/** Why a row cannot be reviewed right now (unsaved edits, an unsaved row), or null. */
function reviewBlocked(approval: ApprovalControl, row: QuoteRow): string | null {
  if (approval.blockedReason) return approval.blockedReason
  if (!approval.savedKeys.has(rowKey(row))) return 'Save this quote first'
  return null
}

/** Why one row's Approve button is off, or null when it can be pressed. */
const approveBlocked = (approval: ApprovalControl, row: QuoteRow): string | null =>
  approval.approved ? 'Another quote is approved; edit the analysis to approve again' : reviewBlocked(approval, row)

/** What approving this row does to an earlier step's pick: nothing for the same quote, an override for another one. */
const overrideNote = (approval: ApprovalControl, row: QuoteRow): string | undefined =>
  approval.picked && !isSameQuote(approval.picked, row) ? `Approves this quote instead of the one step ${approval.picked.step} (${approval.picked.by ?? 'an approver'}) approved` : undefined

const FieldError: React.FC<{ message?: string }> = ({ message }) => (message ? <p className="mt-1 text-left text-xs text-danger-600">{message}</p> : null)

/**
 * One row per quote (a supplier, and its packaging when it quoted several): packaging, MOQ and lead time, price (FOB)
 * and, with landed cost on, CBM, freight, duty and the landed cost; "vs lowest" and rank are worked out live on the
 * chosen basis, and the approval is one quote at a time.
 */
export const QuotesTable: React.FC<QuotesTableProps> = ({ rows, errors, showErrors, currency, settings, onChange, onRemove, onAddPackaging, readOnly, approval }) => {
  const landedOn = settings.landedEnabled
  const columns = 11 + (landedOn ? 4 : 0) + (readOnly ? 0 : 1)
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table className="min-w-full">
        <TableHeader className="bg-secondary-50">
          <TableRow>
            <TableHead className={cn(CELL, 'w-10')}>#</TableHead>
            <TableHead className="min-w-[170px] text-left">Supplier</TableHead>
            <TableHead className="min-w-[180px] text-left">Supplier POC (point of contact)</TableHead>
            <TableHead className={cn(CELL, 'min-w-[140px]')}>Packaging</TableHead>
            <TableHead className={cn(CELL, 'min-w-[110px]')}>MOQ · Lead time</TableHead>
            <TableHead className={cn(CELL, 'min-w-[120px]')}>{landedOn ? 'FOB / unit' : 'Price / unit'}</TableHead>
            {landedOn && (
              <>
                <TableHead className={cn(CELL, 'min-w-[100px]')}>Unit CBM</TableHead>
                <TableHead className={cn(CELL, 'min-w-[80px]')}>Freight</TableHead>
                <TableHead className={cn(CELL, 'min-w-[90px]')}>Duty %</TableHead>
                <TableHead className={cn(CELL, 'min-w-[110px] bg-primary-50/60')}>Landed / unit</TableHead>
              </>
            )}
            <TableHead className={CELL}>Vs lowest</TableHead>
            <TableHead className={CELL}>Rank</TableHead>
            <TableHead className="min-w-[180px] text-left">Remarks</TableHead>
            <TableHead className={cn(CELL, 'min-w-[150px]')}>Sample</TableHead>
            <TableHead className={cn(CELL, 'min-w-[190px]')}>Approval</TableHead>
            {!readOnly && <TableHead className={cn(CELL, 'w-20')} aria-label="Row actions" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns}>
                <p className="py-8 text-center text-sm text-text-muted">{readOnly ? 'No supplier quotes yet.' : 'Pick suppliers in “Add suppliers” to add a row for each.'}</p>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => {
              const rowErrors = errors.get(row.uid) ?? {}
              const show = (field: keyof RowErrors) => (showErrors || rowErrors.supplierId ? rowErrors[field] : undefined)
              const isApproved = isSameQuote(approval.approved, row)
              const isPicked = !approval.approved && isSameQuote(approval.picked, row)
              const rejection = row.rejection
              const blocked = approveBlocked(approval, row)
              const rejectBlocked = reviewBlocked(approval, row)
              const name = row.packagingOption.trim() ? `${row.supplier.name} (${row.packagingOption.trim()})` : row.supplier.name
              return (
                <TableRow key={row.uid} className={isApproved ? 'bg-success-50/60' : isPicked ? 'bg-success-50/40' : rejection ? 'bg-danger-50/40' : undefined}>
                  <TableCell className={cn(CELL, 'text-text-muted')}>{index + 1}</TableCell>
                  <TableCell className="align-middle">
                    <p className="font-semibold text-text-primary">{row.supplier.name}</p>
                    {rowErrors.supplierId && <p className="text-xs text-danger-600">{rowErrors.supplierId}</p>}
                  </TableCell>
                  <TableCell className="align-middle">
                    <input
                      aria-label={`Point of contact at ${name}`}
                      autoComplete="off"
                      value={row.contactName}
                      placeholder={row.supplier.contactName ?? 'Contact name'}
                      onChange={(event) => onChange(row.uid, { contactName: event.target.value })}
                      className={fieldClass(rowErrors.contactName)}
                      disabled={readOnly}
                    />
                    <FieldError message={rowErrors.contactName} />
                  </TableCell>
                  <TableCell className={CELL}>
                    <input
                      aria-label={`Packaging for ${row.supplier.name}`}
                      autoComplete="off"
                      list="pa-packaging-options"
                      value={row.packagingOption}
                      placeholder="e.g. Polybag"
                      maxLength={60}
                      onChange={(event) => onChange(row.uid, { packagingOption: event.target.value })}
                      className={fieldClass(rowErrors.packagingOption)}
                      disabled={readOnly}
                    />
                    <FieldError message={rowErrors.packagingOption} />
                  </TableCell>
                  <TableCell className={CELL}>
                    <div className="flex flex-col gap-1">
                      <NumericInput
                        aria-label={`MOQ for ${name}`}
                        value={row.moq}
                        placeholder="MOQ"
                        onChange={(event) => onChange(row.uid, { moq: event.target.value })}
                        className={cn(fieldClass(rowErrors.moq), 'text-right tabular-nums')}
                        disabled={readOnly}
                      />
                      <div className="flex items-center gap-1">
                        <NumericInput
                          aria-label={`Lead time in days for ${name}`}
                          value={row.leadTimeDays}
                          placeholder="Days"
                          onChange={(event) => onChange(row.uid, { leadTimeDays: event.target.value })}
                          className={cn(fieldClass(rowErrors.leadTimeDays), 'text-right tabular-nums')}
                          disabled={readOnly}
                        />
                        <span className="text-xs text-text-muted">days</span>
                      </div>
                    </div>
                    <FieldError message={rowErrors.moq ?? rowErrors.leadTimeDays} />
                  </TableCell>
                  <TableCell className={CELL}>
                    <NumericInput
                      decimal
                      aria-label={`${landedOn ? 'FOB' : 'Unit'} price from ${name}`}
                      value={row.unitPrice}
                      placeholder="0.00"
                      onChange={(event) => onChange(row.uid, { unitPrice: event.target.value })}
                      className={cn(fieldClass(show('unitPrice')), 'text-right tabular-nums')}
                      disabled={readOnly}
                    />
                    <FieldError message={show('unitPrice')} />
                  </TableCell>
                  {landedOn && (
                    <>
                      <TableCell className={CELL}>
                        <NumericInput
                          decimal
                          aria-label={`Unit CBM for ${name}`}
                          value={row.unitCbm}
                          placeholder="0.000"
                          onChange={(event) => onChange(row.uid, { unitCbm: event.target.value })}
                          className={cn(fieldClass(rowErrors.unitCbm), 'text-right tabular-nums')}
                          disabled={readOnly}
                        />
                        <FieldError message={rowErrors.unitCbm} />
                      </TableCell>
                      <TableCell className={cn(CELL, 'whitespace-nowrap tabular-nums text-text-secondary')}>{row.landed ? formatMoney(row.landed.freight, currency) : '—'}</TableCell>
                      <TableCell className={CELL}>
                        <NumericInput
                          decimal
                          aria-label={`Duty percent for ${name}`}
                          value={row.dutyPercent}
                          placeholder={settings.defaultDutyPercent === null ? '0' : String(settings.defaultDutyPercent)}
                          onChange={(event) => onChange(row.uid, { dutyPercent: event.target.value })}
                          className={cn(fieldClass(rowErrors.dutyPercent), 'text-right tabular-nums')}
                          disabled={readOnly}
                        />
                        {row.landed && <p className="mt-0.5 text-[11px] text-text-muted">{formatMoney(row.landed.duty, currency)}</p>}
                        <FieldError message={rowErrors.dutyPercent} />
                      </TableCell>
                      <TableCell className={cn(CELL, 'bg-primary-50/40 whitespace-nowrap tabular-nums')}>
                        {row.landed ? (
                          <>
                            <span className="font-bold text-text-primary">{formatMoney(row.landed.landed, currency)}</span>
                            {row.landed.clearing > 0 && <p className="text-[11px] text-text-muted">incl. {formatMoney(row.landed.clearing, currency)} clearing</p>}
                          </>
                        ) : (
                          <span className="text-xs text-text-muted" title="Enter the FOB price and unit CBM">
                            Needs CBM
                          </span>
                        )}
                      </TableCell>
                    </>
                  )}
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
                      aria-label={`Remarks for ${name}`}
                      autoComplete="off"
                      value={row.remarks}
                      placeholder="Remarks"
                      onChange={(event) => onChange(row.uid, { remarks: event.target.value })}
                      className={fieldClass(rowErrors.remarks)}
                      disabled={readOnly}
                    />
                    <FieldError message={rowErrors.remarks} />
                  </TableCell>
                  <TableCell className={CELL}>
                    <ChoiceSelect<QuoteRow['sample']>
                      variant="cell"
                      title={`Sample from ${name}`}
                      value={row.sample}
                      onChange={(sample) => onChange(row.uid, { sample })}
                      options={SAMPLE_OPTIONS}
                      disabled={readOnly}
                    />
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
                      ) : isPicked ? (
                        <span className="inline-flex flex-col items-center gap-0.5">
                          <StatusBadge label={`APPROVED · STEP ${approval.picked!.step}`} tone="success" />
                          <span className="whitespace-nowrap text-[11px] text-text-muted">{approval.picked!.by ?? 'An approver'}</span>
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
                            <span title={blocked ?? overrideNote(approval, row)}>
                              <Button type="button" size="sm" variant="outline" disabled={Boolean(blocked)} isLoading={approval.busyKey === rowKey(row)} onClick={() => approval.onApprove(row)}>
                                Approve
                              </Button>
                            </span>
                          )}
                          {approval.canReject && (
                            <span title={rejectBlocked ?? undefined}>
                              <Button type="button" size="sm" variant="danger" disabled={Boolean(rejectBlocked)} onClick={() => approval.onReject(row)}>
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
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onAddPackaging(row.uid)}
                          aria-label={`Add another packaging quote for ${row.supplier.name}`}
                          title={`Quote another packaging for ${row.supplier.name}`}
                          className="rounded p-1 text-text-muted hover:bg-secondary-50 hover:text-text-primary"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(row.uid)}
                          aria-label={`Remove ${name}`}
                          className="rounded p-1 text-text-muted hover:bg-danger-50 hover:text-danger-600"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
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
}
