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
import { formatMoney, formatVsLowest, quoteKey, rowKey, sanitizeSupplierName, SAMPLE_OPTIONS, type QuoteRow, type RankedRow, type RowErrors } from './priceAnalysisForm'
import { RANK_TONE } from './TopSupplierCards'

const CELL = 'text-center align-middle'
const CHIP = 'rounded-md border border-border bg-secondary-50 px-2 py-0.5 text-xs font-medium text-text-secondary'

/** The review column: who may approve or reject, which quote is approved, and why the buttons may be blocked. */
export interface ApprovalControl {
  canApprove: boolean
  canReject: boolean
  approved: { supplierName: string; packagingOption: string; by: string | null; at: string } | null
  /** The quote an earlier step of the chain approved: a later step may confirm it or approve another one. Null when no step has picked yet. */
  picked: { supplierName: string; packagingOption: string; by: string | null; step: number } | null
  /** Why no quote can be approved right now (e.g. unsaved edits); null when approving is open. */
  blockedReason: string | null
  /** Quotes (supplier + packaging) that are saved; one that is not cannot be reviewed yet. */
  savedKeys: ReadonlySet<string>
  /** The quote being approved right now. */
  busyKey: string | null
  onApprove: (row: QuoteRow) => void
  onReject: (row: QuoteRow) => void
}

/** The variant every row of the table belongs to (a table is one variant's quotes). */
export interface VariantChips {
  color: string | null
  size: string | null
  sku: string
}

interface QuotesTableProps {
  rows: RankedRow[]
  variant: VariantChips
  /** Errors per row (typed or from the server), by the row's uid. */
  errors: Map<string, RowErrors>
  /** Show "Enter a price" etc. only after a save was attempted or the field was left. */
  showErrors: boolean
  currency: string
  /** The family's landed-cost inputs, as typed; the landed columns fill in while a freight rate is entered. */
  settings: PriceFamilySettings
  onChange: (uid: string, patch: Partial<QuoteRow>) => void
  onRemove: (uid: string) => void
  readOnly?: boolean
  approval: ApprovalControl
}

const isSameQuote = (control: { supplierName: string; packagingOption: string } | null, row: QuoteRow) => control !== null && quoteKey(control.supplierName, control.packagingOption) === rowKey(row)

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

const HEAD = 'text-[11px] font-semibold uppercase tracking-wide text-text-muted'

/**
 * One row per quote of the selected variant (a supplier typed by name, and its packaging when it quoted several): MOQ and
 * lead time, FOB price, unit CBM, then freight, duty and landed cost worked out live from the family's assumptions.
 * "Vs lowest" and rank follow the chosen basis; approval is one quote at a time.
 */
export const QuotesTable: React.FC<QuotesTableProps> = ({ rows, variant, errors, showErrors, currency, settings, onChange, onRemove, readOnly, approval }) => {
  const landedOn = settings.landedEnabled
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table className="min-w-full">
        <TableHeader className="bg-secondary-50">
          <TableRow>
            <TableHead className={cn(CELL, HEAD, 'w-20')}>Rank</TableHead>
            <TableHead className={cn('min-w-[200px] text-left', HEAD)}>Supplier &amp; POC</TableHead>
            <TableHead className={cn('min-w-[180px] text-left', HEAD)}>Child SKU / Variant</TableHead>
            <TableHead className={cn(CELL, HEAD, 'min-w-[120px]')}>MOQ &amp; Lead time</TableHead>
            <TableHead className={cn(CELL, HEAD, 'min-w-[110px]')}>FOB price</TableHead>
            <TableHead className={cn(CELL, HEAD, 'min-w-[100px]')}>Unit CBM</TableHead>
            <TableHead className={cn(CELL, HEAD, 'min-w-[80px]')}>Est. freight</TableHead>
            <TableHead className={cn(CELL, HEAD, 'min-w-[100px]')}>Duty % &amp; amt</TableHead>
            <TableHead className={cn(CELL, HEAD, 'min-w-[110px] bg-success-50/70 text-success-700')}>Landed cost / unit</TableHead>
            <TableHead className={cn(CELL, HEAD)}>Vs lowest</TableHead>
            <TableHead className={cn(CELL, HEAD, 'min-w-[140px]')}>Sample</TableHead>
            <TableHead className={cn(CELL, HEAD, 'min-w-[190px]')}>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12}>
                <p className="py-8 text-center text-sm text-text-muted">{readOnly ? 'No supplier quotes yet.' : 'No quotes for this variant yet. Use “+ Add Quote Line” to add one.'}</p>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const rowErrors = errors.get(row.uid) ?? {}
              const show = (field: keyof RowErrors) => (showErrors ? rowErrors[field] : undefined)
              const isApproved = isSameQuote(approval.approved, row)
              const isPicked = !approval.approved && isSameQuote(approval.picked, row)
              const rejection = row.rejection
              const blocked = approveBlocked(approval, row)
              const rejectBlocked = reviewBlocked(approval, row)
              const name = row.supplierName.trim() ? (row.packagingOption.trim() ? `${row.supplierName.trim()} (${row.packagingOption.trim()})` : row.supplierName.trim()) : 'this quote'
              return (
                <TableRow key={row.uid} className={isApproved ? 'bg-success-50/60' : isPicked ? 'bg-success-50/40' : rejection ? 'bg-danger-50/40' : undefined}>
                  <TableCell className={CELL}>
                    {row.rank !== null ? (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
                        <span className={cn('h-2.5 w-2.5 rounded-full', RANK_TONE[row.rank]?.dot ?? 'bg-gray-400')} aria-hidden />
                        Top {row.rank}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1.5">
                      <input
                        aria-label={`Supplier name for quote ${name}`}
                        autoComplete="off"
                        value={row.supplierName}
                        placeholder="Supplier name"
                        maxLength={120}
                        onChange={(event) => onChange(row.uid, { supplierName: sanitizeSupplierName(event.target.value) })}
                        className={cn(fieldClass(show('supplierName')), 'font-semibold')}
                        disabled={readOnly}
                      />
                      <FieldError message={show('supplierName')} />
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">POC:</span>
                        <input
                          aria-label={`Point of contact at ${name}`}
                          autoComplete="off"
                          value={row.contactName}
                          placeholder="Contact name"
                          onChange={(event) => onChange(row.uid, { contactName: event.target.value })}
                          className={cn(fieldClass(rowErrors.contactName), 'pl-12')}
                          disabled={readOnly}
                        />
                      </div>
                      <FieldError message={rowErrors.contactName} />
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
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col items-start gap-1.5">
                      <div className="flex flex-wrap gap-1">
                        {variant.color && <span className={CHIP}>{variant.color}</span>}
                        {variant.size && <span className={CHIP}>{variant.size}</span>}
                      </div>
                      <input
                        aria-label={`Packaging for ${name}`}
                        autoComplete="off"
                        list="pa-packaging-options"
                        value={row.packagingOption}
                        placeholder="Packaging, e.g. Polybag"
                        maxLength={60}
                        onChange={(event) => onChange(row.uid, { packagingOption: event.target.value })}
                        className={fieldClass(rowErrors.packagingOption)}
                        disabled={readOnly}
                      />
                      <FieldError message={rowErrors.packagingOption} />
                      <span className="font-mono text-[10px] text-text-muted">{variant.sku}</span>
                    </div>
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
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">Days:</span>
                        <NumericInput
                          aria-label={`Lead time in days for ${name}`}
                          value={row.leadTimeDays}
                          placeholder="0"
                          onChange={(event) => onChange(row.uid, { leadTimeDays: event.target.value })}
                          className={cn(fieldClass(rowErrors.leadTimeDays), 'pl-14 text-right tabular-nums')}
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                    <FieldError message={rowErrors.moq ?? rowErrors.leadTimeDays} />
                  </TableCell>
                  <TableCell className={CELL}>
                    <NumericInput
                      decimal
                      aria-label={`FOB price from ${name}`}
                      value={row.unitPrice}
                      placeholder="0.00"
                      onChange={(event) => onChange(row.uid, { unitPrice: event.target.value })}
                      className={cn(fieldClass(show('unitPrice')), 'text-right tabular-nums')}
                      disabled={readOnly}
                    />
                    <FieldError message={show('unitPrice')} />
                  </TableCell>
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
                  <TableCell className={cn(CELL, 'whitespace-nowrap bg-success-50/50 tabular-nums')}>
                    {row.landed ? (
                      <>
                        <span className="font-bold text-text-primary">{formatMoney(row.landed.landed, currency)}</span>
                        {row.landed.clearing > 0 && <p className="text-[11px] text-text-muted">+{formatMoney(row.landed.clearing, currency)} 3PL</p>}
                      </>
                    ) : (
                      <span className="text-xs text-text-muted" title={landedOn ? 'Enter the FOB price and unit CBM' : 'Enter a freight rate in the assumptions'}>
                        {landedOn ? 'Needs CBM' : '—'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{formatVsLowest(row.vsLowestPercent)}</TableCell>
                  <TableCell className={CELL}>
                    <ChoiceSelect<QuoteRow['sample']> variant="cell" title={`Sample from ${name}`} value={row.sample} onChange={(sample) => onChange(row.uid, { sample })} options={SAMPLE_OPTIONS} disabled={readOnly} />
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
                              <Button type="button" size="sm" variant="primary" disabled={Boolean(blocked)} isLoading={approval.busyKey === rowKey(row)} onClick={() => approval.onApprove(row)}>
                                Approve
                              </Button>
                            </span>
                          )}
                          {approval.canReject && (
                            <span title={rejectBlocked ?? undefined}>
                              <Button type="button" size="sm" variant="outline" disabled={Boolean(rejectBlocked)} onClick={() => approval.onReject(row)}>
                                Reject
                              </Button>
                            </span>
                          )}
                        </div>
                      )}
                      {!readOnly && (
                        <button type="button" onClick={() => onRemove(row.uid)} aria-label={`Remove ${name}`} className="text-xs text-text-muted underline-offset-2 hover:text-danger-600 hover:underline">
                          Remove line
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
