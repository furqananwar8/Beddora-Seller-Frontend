'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { ReasonDialog } from '@/components/reason-dialog/ReasonDialog'
import { FormActions } from '@/components/form-actions/FormActions'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Button } from '@/design-system/buttons'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import { Spinner } from '@/design-system/loaders'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useApprovePriceAnalysisMutation,
  useGetPriceAnalysisQuery,
  useRejectPriceAnalysisQuoteMutation,
  useReopenPriceAnalysisMutation,
  useSavePriceAnalysisMutation,
  type PoCurrency,
  type SupplierRef,
} from '@/services/api/procurement.api'
import { serverIssues } from '@/utils/apiErrors'
import { formatCalendarDay } from '@/utils/format'
import { productLabel } from '../shared/ProductPicker'
import { SupplierMultiSelect } from '../shared/SupplierSelect'
import { ApprovalStepper } from '@/components/approval-stepper/ApprovalStepper'
import { ApprovalHistory } from './ApprovalHistory'
import { FamilyBar } from './FamilyBar'
import { LandedCostCard } from './LandedCostCard'
import { ProductDetails } from './ProductDetails'
import { blankRow, duplicateKeys, formFrom, PACKAGING_SUGGESTIONS, quoteKey, quoteName, rankRows, rowError, rowKey, sameForm, toBody, type PriceAnalysisForm, type QuoteRow, type RankBasis, type RowErrors } from './priceAnalysisForm'
import { QuotesTable } from './QuotesTable'
import { TopSupplierCards } from './TopSupplierCards'

export const PRICE_ANALYSIS_LIST = '/dashboard/procurement/price-analysis'
const variantHref = (productId: number) => `${PRICE_ANALYSIS_LIST}/${productId}`

const CURRENCIES: Array<{ value: PoCurrency; label: string }> = [
  { value: 'USD', label: 'USD' },
  { value: 'CAD', label: 'CAD' },
]

const EMPTY: PriceAnalysisForm = { material: '', currency: 'USD', rows: [] }

/**
 * One product's price analysis: supplier quotes ranked by price, one of them approved by the approval chain, and the
 * approval history. Once approved it is locked; an approver can reopen it, which starts a fresh approval.
 */
export const PriceAnalysisScreen: React.FC<{ productId: number }> = ({ productId }) => {
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'procurement:price-analysis')
  const { success, failure, info } = useApiFeedback()

  const { data, isFetching, isError, error } = useGetPriceAnalysisQuery(productId)
  const [save, { isLoading: saving }] = useSavePriceAnalysisMutation()
  const [approve, { isLoading: approvingBusy }] = useApprovePriceAnalysisMutation()
  const [reject, { isLoading: rejectingBusy }] = useRejectPriceAnalysisQuoteMutation()
  const [reopen, { isLoading: reopening }] = useReopenPriceAnalysisMutation()
  const [confirmReopen, setConfirmReopen] = useState(false)

  const loadedFor = useRef<string | null>(null)
  const [form, setForm] = useState<PriceAnalysisForm>(EMPTY)
  const [baseline, setBaseline] = useState<PriceAnalysisForm>(EMPTY)
  const [serverErrors, setServerErrors] = useState<Map<string, RowErrors>>(new Map())
  const [basis, setBasis] = useState<RankBasis>('LANDED')
  const [view, setView] = useState<'RANKED' | 'GROUPED'>('RANKED')
  /** Packaging shown in the table; empty = all packagings (so Polybag and Color Box are compared side by side). */
  const [packagingFilter, setPackagingFilter] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [triedSave, setTriedSave] = useState(false)
  /** Set by a successful save so a Back button is offered; any further edit hides it again. */
  const [justSaved, setJustSaved] = useState(false)
  const [approving, setApproving] = useState<QuoteRow | null>(null)
  const [rejecting, setRejecting] = useState<QuoteRow | null>(null)
  /** The saved version the edits started from: a save sends it, so a newer save by someone else is refused, not overwritten. */
  const [loadedAt, setLoadedAt] = useState<string | null>(null)
  const dirty = !sameForm(form, baseline)

  const adopt = (view: NonNullable<typeof data>) => {
    const next = formFrom(view)
    loadedFor.current = `${view.product.id}:${view.analysis?.updatedAt ?? 'none'}`
    setForm(next)
    setBaseline(next)
    setLoadedAt(view.analysis?.updatedAt ?? null)
    setServerErrors(new Map())
    setFormError(null)
    setTriedSave(false)
  }

  // Load the saved analysis; a save elsewhere refreshes it here unless there are unsaved edits
  useEffect(() => {
    if (!data || data.product.id !== productId) return
    const stamp = `${data.product.id}:${data.analysis?.updatedAt ?? 'none'}`
    if (loadedFor.current === stamp) return
    if (loadedFor.current?.startsWith(`${data.product.id}:`) && dirty) {
      // Keep the edits and the version they started from; Discard switches to the newer prices
      loadedFor.current = stamp
      setBaseline(formFrom(data))
      info('Someone else just saved this analysis. Discard to see their prices; saving now will be refused.')
      return
    }
    adopt(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, productId])

  // Rows carry their saved rejection so the table can show it next to the typed values
  const settings = data?.settings ?? { landedEnabled: false, freightPerCbm: null, defaultDutyPercent: null, clearingPerUnit: null, updatedAt: null }
  const landedOn = settings.landedEnabled
  const effectiveBasis: RankBasis = landedOn ? basis : 'FOB'
  const packagings = useMemo(() => [...new Set(form.rows.map((row) => row.packagingOption.trim()).filter(Boolean))], [form.rows])
  // A filter that no longer matches anything (its packaging was renamed or removed) shows everything again
  const activeFilter = packagingFilter && packagings.includes(packagingFilter) ? packagingFilter : ''
  const visibleRows = useMemo(() => (activeFilter ? form.rows.filter((row) => row.packagingOption.trim() === activeFilter) : form.rows), [form.rows, activeFilter])
  const ranked = useMemo(() => {
    const rejections = new Map((data?.analysis?.quotes ?? []).map((quote) => [quoteKey(quote.supplier.id, quote.packagingOption), quote.rejection]))
    return rankRows(visibleRows, settings, effectiveBasis).map((row) => ({ ...row, rejection: rejections.get(rowKey(row)) ?? null }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRows, data, effectiveBasis, settings.landedEnabled, settings.freightPerCbm, settings.defaultDutyPercent, settings.clearingPerUnit])
  const errors = useMemo(() => {
    const merged = new Map<string, RowErrors>()
    const dupes = duplicateKeys(form.rows)
    for (const row of form.rows) {
      const own = rowError(row)
      const server = serverErrors.get(row.uid) ?? {}
      const duplicate: RowErrors = dupes.has(rowKey(row)) ? { packagingOption: row.packagingOption.trim() ? 'This supplier already has a quote for this packaging' : 'Give each quote of this supplier its own packaging' } : {}
      if (Object.keys(own).length || Object.keys(server).length || Object.keys(duplicate).length) merged.set(row.uid, { ...server, ...duplicate, ...own })
    }
    return merged
  }, [form.rows, serverErrors])

  const setRows = (rows: QuoteRow[]) => setForm((current) => ({ ...current, rows }))
  const changeRow = (uid: string, patch: Partial<QuoteRow>) => {
    setForm((current) => ({ ...current, rows: current.rows.map((row) => (row.uid === uid ? { ...row, ...patch } : row)) }))
    setServerErrors((current) => {
      if (!current.has(uid)) return current
      const next = new Map(current)
      next.delete(uid)
      return next
    })
  }
  /** Ticking adds a row (contact from the supplier); unticking removes all of that supplier's rows. */
  const pickSuppliers = (suppliers: SupplierRef[]) => {
    const kept = form.rows.filter((row) => suppliers.some((supplier) => supplier.id === row.supplier.id))
    const added = suppliers.filter((supplier) => !form.rows.some((row) => row.supplier.id === supplier.id)).map((supplier) => blankRow(supplier))
    setRows([...kept, ...added])
  }
  /** Another quote from the same supplier (another packaging), right under its row. */
  const addPackaging = (uid: string) => {
    const index = form.rows.findIndex((row) => row.uid === uid)
    if (index < 0) return
    const source = form.rows[index]
    const taken = new Set(form.rows.filter((row) => row.supplier.id === source.supplier.id).map((row) => row.packagingOption.trim().toLowerCase()))
    const suggestion = PACKAGING_SUGGESTIONS.find((option) => !taken.has(option.toLowerCase())) ?? ''
    // The first quote of a supplier without a packaging gets one too, so the two can be told apart
    const next = [...form.rows]
    next.splice(index + 1, 0, { ...blankRow(source.supplier, suggestion), contactName: source.contactName, unitCbm: source.unitCbm, sample: source.sample })
    setRows(next)
  }

  const discard = () => {
    if (data && data.product.id === productId) adopt(data)
  }

  const submit = async () => {
    if (!data) return
    setTriedSave(true)
    setFormError(null)
    if (form.rows.some((row) => Object.keys(rowError(row)).length > 0) || duplicateKeys(form.rows).size > 0) return
    if (form.rows.length === 0 && !data.analysis) {
      setFormError('Add at least one supplier and its price.')
      return
    }
    const hadApproval = Boolean(data.analysis?.approval)
    try {
      const saved = await save({ productId, body: toBody(form, loadedAt) }).unwrap()
      adopt(saved)
      setJustSaved(true)
      if (!saved.analysis) success('Analysis removed')
      else success(hadApproval && !saved.analysis.approval ? 'Analysis saved · the approval was taken back and needs approving again' : `Analysis saved · ${saved.analysis.quotes.length} quote${saved.analysis.quotes.length === 1 ? '' : 's'}`)
    } catch (caught) {
      const byRow = new Map<string, RowErrors>()
      for (const issue of serverIssues(caught)) {
        const match = /^quotes\.(\d+)\.(\w+)$/.exec(issue.field)
        const row = match ? form.rows[Number(match[1])] : undefined
        if (row) byRow.set(row.uid, { ...byRow.get(row.uid), [match![2]]: issue.message })
      }
      setServerErrors(byRow)
      if (byRow.size === 0) failure(caught, 'Could not save the analysis')
    }
  }

  const confirmApprove = async () => {
    if (!approving) return
    try {
      const saved = await approve({ productId, supplierId: approving.supplier.id, packagingOption: approving.packagingOption.trim(), ...(loadedAt ? { expectedUpdatedAt: loadedAt } : {}) }).unwrap()
      adopt(saved)
      success(`${quoteName(approving.supplier.name, approving.packagingOption)} approved`)
      setApproving(null)
    } catch (caught) {
      failure(caught, 'Could not approve the supplier')
    }
  }

  const confirmReject = async (reason: string) => {
    if (!rejecting) return false
    try {
      const saved = await reject({ productId, supplierId: rejecting.supplier.id, packagingOption: rejecting.packagingOption.trim(), reason, ...(loadedAt ? { expectedUpdatedAt: loadedAt } : {}) }).unwrap()
      adopt(saved)
      success(`${quoteName(rejecting.supplier.name, rejecting.packagingOption)} rejected`)
      setRejecting(null)
      return true
    } catch (caught) {
      failure(caught, 'Could not reject the supplier')
      return false
    }
  }

  const product = data?.product.id === productId ? data.product : null
  const approval = data?.analysis?.approval ?? null
  // An approved analysis is locked: nobody edits, removes or rejects until an approver reopens it
  const locked = Boolean(approval)
  const readOnly = !canWrite || locked
  const loadError = isError ? ((error as { data?: { error?: string } })?.data?.error ?? 'Could not load this product.') : null
  // The supplier an earlier step of a waiting chain approved (it travels as that step's decision note, "supplier:<id>"): the next step confirms it
  const pick = data?.approval?.status === 'PENDING'
    ? data.approval.steps
        .flatMap((step) =>
          step.people
            .filter((person) => person.status === 'APPROVED')
            .map((person) => {
              const match = /^supplier:(\d+)(?:\|(.*))?$/.exec(person.note ?? '')
              return { step: step.position, by: person.name, supplierId: Number(match?.[1]), packagingOption: match?.[2] ?? '' }
            })
        )
        .filter((item) => item.supplierId)
        .pop()
    : undefined
  const label = product ? `${product.ref} · ${productLabel(product)}` : ''
  const tableFor = (rows: typeof ranked) => (
    <QuotesTable
      rows={rows}
      errors={errors}
      showErrors={triedSave}
      currency={form.currency}
      settings={settings}
      onChange={changeRow}
      onRemove={(uid) => setRows(form.rows.filter((row) => row.uid !== uid))}
      onAddPackaging={addPackaging}
      readOnly={readOnly}
      approval={{
        canApprove: data!.permissions.canApprove,
        canReject: data!.permissions.canReject && !locked,
        approved: approval ? { supplierId: approval.supplier.id, packagingOption: approval.packagingOption, by: approval.by.name, at: approval.at } : null,
        picked: pick ?? null,
        blockedReason: dirty ? 'Save or discard your changes first' : null,
        savedKeys: new Set(data!.analysis?.quotes.map((quote) => quoteKey(quote.supplier.id, quote.packagingOption)) ?? []),
        busyKey: approvingBusy && approving ? rowKey(approving) : null,
        onApprove: (row) => setApproving(row),
        onReject: (row) => setRejecting(row),
      }}
    />
  )

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Price analysis</h1>
            <p className="text-sm text-text-muted">{product ? label : 'Quotes per product variant, ranked by price'}</p>
          </div>
          <Link href={PRICE_ANALYSIS_LIST} className="ds-button ds-button-outline ds-button-sm">
            All price analyses
          </Link>
        </div>

        {loadError ? (
          <Card>
            <CardContent className="py-12 text-center text-sm font-medium text-danger-600">{loadError}</CardContent>
          </Card>
        ) : !product ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <>
            {approval ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-success-500 bg-success-50 px-3 py-2 text-sm text-success-700">
                <p>
                  <strong>{quoteName(approval.supplier.name, approval.packagingOption)}</strong> approved at {formatCurrencyAmount(data!.analysis!.currency, approval.unitPrice)} by {approval.by.name ?? 'an approver'} on {formatCalendarDay(approval.at)}. It is locked.
                </p>
                {data!.permissions.canApprove && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setConfirmReopen(true)}>
                    Reopen
                  </Button>
                )}
              </div>
            ) : data?.analysis ? (
              <p className="rounded-lg border border-warning-500 bg-warning-50 px-3 py-2 text-sm text-warning-700">
                Awaiting approval{data.permissions.canApprove ? ': approve one supplier below, or reject the ones that will not do.' : ' by an approver.'}
              </p>
            ) : null}

            {data?.family && <FamilyBar family={data.family} currentId={productId} hrefFor={variantHref} dirty={dirty} />}

            {data?.analysis && data.approval && data.approval.status !== 'CANCELLED' && (
              <div className="rounded-lg border border-border bg-surface px-4 pb-3">
                <ApprovalStepper approval={data.approval} startedBy={data.analysis.updatedBy.name ?? 'A teammate'} startedAt={data.analysis.updatedAt} startLabel="Quotes saved" />
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>
                  Product details <span className="ml-1 font-mono text-sm font-normal text-text-muted">{label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProductDetails product={product} material={form.material} onMaterialChange={(material) => setForm((current) => ({ ...current, material }))} readOnly={readOnly} />
              </CardContent>
            </Card>

            <LandedCostCard rootId={product.parentId ?? product.id} settings={settings} canWrite={canWrite} currency={form.currency} />

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>Top 5 suppliers by {effectiveBasis === 'LANDED' ? 'landed cost' : 'price'}</CardTitle>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-text-muted">
                      Lowest first · {form.currency} per unit{activeFilter ? ` · ${activeFilter} only` : ''}
                    </span>
                    {landedOn && (
                      <SegmentedToggle<RankBasis>
                        ariaLabel="Rank by"
                        value={effectiveBasis}
                        onChange={setBasis}
                        options={[
                          { value: 'FOB', label: 'FOB price' },
                          { value: 'LANDED', label: 'Landed cost' },
                        ]}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TopSupplierCards rows={ranked} currency={form.currency} basis={effectiveBasis} />
              </CardContent>
            </Card>

            <Card className={isFetching ? 'opacity-80 transition-opacity' : undefined}>
              <CardHeader>
                <CardTitle>Supplier quotes</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {!readOnly && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <FormField label="Add suppliers" htmlFor="pa-suppliers" className="w-full sm:max-w-md">
                      <SupplierMultiSelect id="pa-suppliers" value={form.rows.map((row) => ({ ...row.supplier, country: null, currency: '' }))} onChange={pickSuppliers} />
                    </FormField>
                    <SegmentedToggle<PoCurrency> ariaLabel="Currency" value={form.currency} onChange={(currency) => setForm((current) => ({ ...current, currency }))} options={CURRENCIES} />
                  </div>
                )}
                <datalist id="pa-packaging-options">
                  {PACKAGING_SUGGESTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                {form.rows.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <SegmentedToggle<'RANKED' | 'GROUPED'>
                      ariaLabel="Quote view"
                      value={view}
                      onChange={setView}
                      options={[
                        { value: 'RANKED', label: 'Ranked' },
                        { value: 'GROUPED', label: 'Grouped by supplier' },
                      ]}
                    />
                    {packagings.length > 1 && (
                      <label className="flex items-center gap-2 text-sm text-text-muted">
                        Packaging
                        <select value={activeFilter} onChange={(event) => setPackagingFilter(event.target.value)} className="ds-input ds-input-default h-9 rounded-lg py-0" aria-label="Filter by packaging">
                          <option value="">All packaging</option>
                          {packagings.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                )}
                {view === 'RANKED' || ranked.length === 0 ? (
                  tableFor(ranked)
                ) : (
                  <div className="flex flex-col gap-4">
                    {[...new Map(ranked.map((row) => [row.supplier.id, row.supplier])).values()].map((supplier) => {
                      const group = ranked.filter((row) => row.supplier.id === supplier.id)
                      return (
                        <div key={supplier.id} className="flex flex-col gap-2 rounded-lg border border-border bg-secondary-50/40 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-text-primary">
                              {supplier.name}
                              <span className="ml-2 text-xs font-normal text-text-muted">
                                {group.length} quote{group.length === 1 ? '' : 's'} submitted
                              </span>
                            </p>
                            {!readOnly && (
                              <Button type="button" size="sm" variant="outline" onClick={() => addPackaging(group[group.length - 1].uid)}>
                                + Add another packaging for {supplier.name}
                              </Button>
                            )}
                          </div>
                          {tableFor(group)}
                        </div>
                      )
                    })}
                  </div>
                )}
                {formError && (
                  <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                    {formError}
                  </p>
                )}
                {data?.analysis && (
                  <p className="text-xs text-text-muted">
                    Last saved {formatCalendarDay(data.analysis.updatedAt)} by {data.analysis.updatedBy.name ?? 'a teammate'}
                    {form.rows.length === 0 && dirty ? ' · saving with no suppliers removes this analysis' : ''}
                  </p>
                )}
              </CardContent>
            </Card>

            {!readOnly && (
              <FormActions>
                {justSaved && !dirty && (
                  <Link href={PRICE_ANALYSIS_LIST} className="ds-button ds-button-outline">
                    Back to price analyses
                  </Link>
                )}
                <Button type="button" variant="outline" onClick={discard} disabled={!dirty || saving}>
                  Discard
                </Button>
                <Button type="button" onClick={() => void submit()} isLoading={saving} disabled={!dirty}>
                  Save analysis
                </Button>
              </FormActions>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Approval &amp; rejection history</CardTitle>
              </CardHeader>
              <CardContent>
                <ApprovalHistory events={data!.history} productLabel={label} />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmReopen}
        title="Reopen this price analysis"
        confirmLabel="Reopen"
        busy={reopening}
        onConfirm={async () => {
          try {
            await reopen({ productId }).unwrap()
            success('Reopened: the quotes can be changed, and the approval chain starts again')
            setConfirmReopen(false)
          } catch (error) {
            failure(error, 'Could not reopen the analysis')
          }
        }}
        onClose={() => setConfirmReopen(false)}
      >
        <p>The approval of {approval ? quoteName(approval.supplier.name, approval.packagingOption) : ''} is taken back and the approval chain starts again from its first step. The earlier approvals stay in the history.</p>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={approving !== null}
        title={`Approve ${approving ? quoteName(approving.supplier.name, approving.packagingOption) : 'supplier'}`}
        confirmLabel="Approve"
        busy={approvingBusy}
        onConfirm={confirmApprove}
        onClose={() => setApproving(null)}
      >
        <p>
          Approve {approving ? quoteName(approving.supplier.name, approving.packagingOption) : ''} at {approving ? formatCurrencyAmount(form.currency, Number(approving.unitPrice)) : ''} for {label}? Only one quote can be approved for
          this variant; the others stay blocked until the analysis is edited.
        </p>
        {approving?.remarks && <p className="mt-2 text-sm text-text-muted">Remarks: {approving.remarks}</p>}
      </ConfirmDialog>

      <ReasonDialog
        isOpen={rejecting !== null}
        title={`Reject ${rejecting ? quoteName(rejecting.supplier.name, rejecting.packagingOption) : 'supplier'}`}
        description={rejecting ? `${quoteName(rejecting.supplier.name, rejecting.packagingOption)}'s quote of ${formatCurrencyAmount(form.currency, Number(rejecting.unitPrice))} for ${label} cannot be approved once rejected.${approval?.supplier.id === rejecting.supplier.id && approval.packagingOption === rejecting.packagingOption.trim() ? ' It is the approved quote, so the approval is taken back.' : ''} Editing the analysis sends it back for review.` : undefined}
        confirmLabel="Reject"
        placeholder="Why is this quote rejected?"
        maxLength={500}
        submitting={rejectingBusy}
        onConfirm={confirmReject}
        onClose={() => setRejecting(null)}
      />
    </Container>
  )
}
