'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ApprovalStepper } from '@/components/approval-stepper/ApprovalStepper'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { FormActions } from '@/components/form-actions/FormActions'
import { Container } from '@/components/layout'
import { ReasonDialog } from '@/components/reason-dialog/ReasonDialog'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog/UnsavedChangesDialog'
import { Button } from '@/design-system/buttons'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import { Spinner } from '@/design-system/loaders'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useApprovePriceAnalysisMutation,
  useGetPriceAnalysisQuery,
  useGetPriceFamilyHistoryQuery,
  useRejectPriceAnalysisQuoteMutation,
  useReopenPriceAnalysisMutation,
  useSavePriceAnalysisMutation,
  type PoCurrency,
} from '@/services/api/procurement.api'
import { serverIssues } from '@/utils/apiErrors'
import { formatCalendarDay } from '@/utils/format'
import { ApprovalHistory, ApprovalOverview } from './ApprovalHistory'
import { LandedCostCard } from './LandedCostCard'
import { ParentFamilyCard } from './ParentFamilyCard'
import {
  blankRow,
  draftFrom,
  duplicateKeys,
  formFrom,
  PACKAGING_SUGGESTIONS,
  quoteKey,
  quoteName,
  rankRows,
  rowError,
  rowKey,
  sameForm,
  settingsFromDraft,
  toBody,
  variantLabel,
  type AssumptionsDraft,
  type PriceAnalysisForm,
  type QuoteRow,
  type RankBasis,
  type RowErrors,
} from './priceAnalysisForm'
import { QuotesTable } from './QuotesTable'
import { TopSupplierCards } from './TopSupplierCards'
import { VariantFilters, type QuoteView } from './VariantFilters'

export const PRICE_ANALYSIS_LIST = '/dashboard/procurement/price-analysis'

const CURRENCIES: Array<{ value: PoCurrency; label: string }> = [
  { value: 'USD', label: 'USD' },
  { value: 'CAD', label: 'CAD' },
]

const EMPTY: PriceAnalysisForm = { material: '', currency: 'USD', rows: [] }
const NO_ASSUMPTIONS: AssumptionsDraft = { freightPerCbm: '', defaultDutyPercent: '', clearingPerUnit: '' }

/**
 * A product family's price analysis. The family is opened from its parent; every child SKU (variant) has its own analysis:
 * its supplier quotes, ranked by FOB price or landed cost, and its own approval. Switching variant with unsaved quotes asks
 * first. The landed-cost assumptions are shared by the family. The approval history covers every variant.
 */
export const PriceAnalysisScreen: React.FC<{ productId: number }> = ({ productId }) => {
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'procurement:price-analysis')
  const { success, failure, info } = useApiFeedback()

  /** The variant on screen; opening a parent resolves to its first variant. */
  const [variantId, setVariantId] = useState(productId)
  const { data, currentData, isFetching, isError, error } = useGetPriceAnalysisQuery(variantId)
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
  const [view, setView] = useState<QuoteView>('RANKED')
  const [formError, setFormError] = useState<string | null>(null)
  const [triedSave, setTriedSave] = useState(false)
  /** Set by a successful save so a Back button is offered; any further edit hides it again. */
  const [justSaved, setJustSaved] = useState(false)
  const [approving, setApproving] = useState<QuoteRow | null>(null)
  const [rejecting, setRejecting] = useState<QuoteRow | null>(null)
  /** The variant the user asked for while this one has unsaved quotes (save, discard or stay decides). */
  const [pendingVariant, setPendingVariant] = useState<number | null>(null)
  const [savingPending, setSavingPending] = useState(false)
  /** The saved version the edits started from: a save sends it, so a newer save by someone else is refused, not overwritten. */
  const [loadedAt, setLoadedAt] = useState<string | null>(null)
  const dirty = !sameForm(form, baseline)

  // The family's assumptions as typed; they rank the quotes live, Save keeps them for the family
  const [assumptions, setAssumptions] = useState<AssumptionsDraft>(NO_ASSUMPTIONS)

  const adopt = (next: NonNullable<typeof data>) => {
    const loaded = formFrom(next)
    loadedFor.current = `${next.product.id}:${next.analysis?.updatedAt ?? 'none'}`
    setForm(loaded)
    setBaseline(loaded)
    setLoadedAt(next.analysis?.updatedAt ?? null)
    setServerErrors(new Map())
    setFormError(null)
    setTriedSave(false)
  }

  // Opening a parent lands on its first variant
  useEffect(() => {
    if (currentData && currentData.product.id !== variantId) setVariantId(currentData.product.id)
  }, [currentData, variantId])

  // Load the saved analysis; a save elsewhere refreshes it here unless there are unsaved edits
  useEffect(() => {
    if (!data || data.product.id !== variantId) return
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
  }, [data, variantId])

  const savedSettings = data?.settings
  const savedSettingsKey = JSON.stringify(savedSettings ?? null)
  useEffect(() => {
    if (savedSettings) setAssumptions(draftFrom(savedSettings))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSettingsKey])
  const settings = useMemo(() => settingsFromDraft(assumptions, savedSettings?.updatedAt ?? null), [assumptions, savedSettings?.updatedAt])
  const landedOn = settings.landedEnabled
  const effectiveBasis: RankBasis = landedOn ? basis : 'FOB'

  const family = data?.family ?? null
  const rootId = family?.root.id ?? null
  const history = useGetPriceFamilyHistoryQuery(rootId ?? 0, { skip: rootId === null })
  const switching = Boolean(data) && data!.product.id !== variantId

  const ranked = useMemo(() => {
    // Rows carry their saved rejection so the table can show it next to the typed values
    const rejections = new Map((data?.analysis?.quotes ?? []).map((quote) => [quoteKey(quote.supplierName, quote.packagingOption), quote.rejection]))
    return rankRows(form.rows, settings, effectiveBasis).map((row) => ({ ...row, rejection: rejections.get(rowKey(row)) ?? null }))
  }, [form.rows, data, effectiveBasis, settings])
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
  const addLine = () => setRows([...form.rows, blankRow('')])
  /** Another quote from the same supplier (another packaging), right under its last row. */
  const addPackaging = (uid: string) => {
    const index = form.rows.findIndex((row) => row.uid === uid)
    if (index < 0) return
    const source = form.rows[index]
    const taken = new Set(form.rows.filter((row) => row.supplierName.trim().toLowerCase() === source.supplierName.trim().toLowerCase()).map((row) => row.packagingOption.trim().toLowerCase()))
    const suggestion = PACKAGING_SUGGESTIONS.find((option) => !taken.has(option.toLowerCase())) ?? ''
    const next = [...form.rows]
    next.splice(index + 1, 0, { ...blankRow(suggestion), supplierName: source.supplierName, contactName: source.contactName, unitCbm: source.unitCbm, sample: source.sample })
    setRows(next)
  }

  const discard = () => {
    if (data && data.product.id === variantId) adopt(data)
  }

  /** Saves the typed quotes; true when they were saved (or there was nothing wrong to save). */
  const submit = async (): Promise<boolean> => {
    if (!data) return false
    setTriedSave(true)
    setFormError(null)
    if (form.rows.some((row) => Object.keys(rowError(row)).length > 0) || duplicateKeys(form.rows).size > 0) return false
    if (form.rows.length === 0 && !data.analysis) {
      setFormError('Add at least one supplier and its price.')
      return false
    }
    const hadApproval = Boolean(data.analysis?.approval)
    try {
      const saved = await save({ productId: variantId, body: toBody(form, loadedAt) }).unwrap()
      adopt(saved)
      setJustSaved(true)
      if (!saved.analysis) success('Analysis removed')
      else success(hadApproval && !saved.analysis.approval ? 'Analysis saved · the approval was taken back and needs approving again' : `Analysis saved · ${saved.analysis.quotes.length} quote${saved.analysis.quotes.length === 1 ? '' : 's'}`)
      return true
    } catch (caught) {
      const byRow = new Map<string, RowErrors>()
      for (const issue of serverIssues(caught)) {
        const match = /^quotes\.(\d+)\.(\w+)$/.exec(issue.field)
        const row = match ? form.rows[Number(match[1])] : undefined
        if (row) byRow.set(row.uid, { ...byRow.get(row.uid), [match![2]]: issue.message })
      }
      setServerErrors(byRow)
      if (byRow.size === 0) failure(caught, 'Could not save the analysis')
      return false
    }
  }

  const goToVariant = (id: number) => {
    setVariantId(id)
    setJustSaved(false)
  }
  /** Moving to another variant with unsaved quotes asks first. */
  const requestVariant = (id: number) => {
    if (id === variantId) return
    if (dirty) setPendingVariant(id)
    else goToVariant(id)
  }
  const stay = () => {
    if (!savingPending) setPendingVariant(null)
  }
  const discardAndGo = () => {
    if (pendingVariant !== null) goToVariant(pendingVariant)
    setPendingVariant(null)
  }
  const saveAndGo = async () => {
    setSavingPending(true)
    const ok = await submit()
    setSavingPending(false)
    if (ok && pendingVariant !== null) goToVariant(pendingVariant)
    setPendingVariant(null) // when it failed, the table shows what is wrong
  }

  const confirmApprove = async () => {
    if (!approving) return
    try {
      const saved = await approve({ productId: variantId, supplierName: approving.supplierName.trim(), packagingOption: approving.packagingOption.trim(), ...(loadedAt ? { expectedUpdatedAt: loadedAt } : {}) }).unwrap()
      adopt(saved)
      success(`${quoteName(approving.supplierName, approving.packagingOption)} approved for ${variantText}`)
      setApproving(null)
    } catch (caught) {
      failure(caught, 'Could not approve the supplier')
    }
  }

  const confirmReject = async (reason: string) => {
    if (!rejecting) return false
    try {
      const saved = await reject({ productId: variantId, supplierName: rejecting.supplierName.trim(), packagingOption: rejecting.packagingOption.trim(), reason, ...(loadedAt ? { expectedUpdatedAt: loadedAt } : {}) }).unwrap()
      adopt(saved)
      success(`${quoteName(rejecting.supplierName, rejecting.packagingOption)} rejected`)
      setRejecting(null)
      return true
    } catch (caught) {
      failure(caught, 'Could not reject the supplier')
      return false
    }
  }

  const product = data?.product ?? null
  const approval = data?.analysis?.approval ?? null
  // An approved analysis is locked: nobody edits, removes or rejects until an approver reopens it
  const locked = Boolean(approval)
  const readOnly = !canWrite || locked || switching
  const loadError = isError ? ((error as { data?: { error?: string } })?.data?.error ?? 'Could not load this product.') : null
  const current = family?.variants.find((variant) => variant.id === variantId)
  const variantText = current ? variantLabel(current) : product ? productLabelOf(product) : ''
  const label = product ? `${variantText} (${product.ref})` : ''
  // The quote an earlier step of a waiting chain approved (it travels as that step's decision note, "supplier:<name>|<packaging>"): the next step confirms it
  const pick =
    data?.approval?.status === 'PENDING'
      ? data.approval.steps
          .flatMap((step) =>
            step.people
              .filter((person) => person.status === 'APPROVED')
              .map((person) => {
                const match = /^supplier:([^|]+)(?:\|(.*))?$/.exec(person.note ?? '')
                return { step: step.position, by: person.name, supplierName: match?.[1] ?? '', packagingOption: match?.[2] ?? '' }
              })
          )
          .filter((item) => item.supplierName)
          .pop()
      : undefined

  const tableFor = (rows: typeof ranked) => (
    <QuotesTable
      rows={rows}
      variant={{ color: product?.color ?? null, size: product?.sizeName ?? null, sku: product?.ref ?? '' }}
      errors={errors}
      showErrors={triedSave}
      currency={form.currency}
      settings={settings}
      onChange={changeRow}
      onRemove={(uid) => setRows(form.rows.filter((row) => row.uid !== uid))}
      readOnly={readOnly}
      approval={{
        canApprove: data!.permissions.canApprove,
        canReject: data!.permissions.canReject && !locked,
        approved: approval ? { supplierName: approval.supplierName, packagingOption: approval.packagingOption, by: approval.by.name, at: approval.at } : null,
        picked: pick ?? null,
        blockedReason: dirty ? 'Save or discard your changes first' : null,
        savedKeys: new Set(data!.analysis?.quotes.map((quote) => quoteKey(quote.supplierName, quote.packagingOption)) ?? []),
        busyKey: approvingBusy && approving ? rowKey(approving) : null,
        onApprove: (row) => setApproving(row),
        onReject: (row) => setRejecting(row),
      }}
    />
  )

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Price analysis</h1>
              <span className="rounded-md border border-primary-500 bg-primary-500 px-2 py-0.5 text-xs font-medium text-white">Parent Family Mode</span>
              {landedOn && <span className="rounded-md border border-success-500 bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700">Landed Cost Enabled</span>}
            </div>
            <p className="mt-1 font-mono text-xs text-text-muted">{family ? `${family.root.ref} · ${family.root.name} (${family.variants.length} Child SKU${family.variants.length === 1 ? '' : 's'} Linked)` : 'Quotes per product variant, ranked by price'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Rank by:</span>
              <SegmentedToggle<RankBasis>
                ariaLabel="Rank by"
                value={effectiveBasis}
                onChange={setBasis}
                variant="primary"
                options={[
                  { value: 'FOB', label: 'FOB Price' },
                  { value: 'LANDED', label: 'Landed Cost', disabled: !landedOn },
                ]}
              />
            </div>
            <SegmentedToggle<PoCurrency> ariaLabel="Currency" value={form.currency} onChange={(currency) => setForm((c) => ({ ...c, currency }))} options={CURRENCIES} disabled={readOnly} variant="primary" />
            <Link href={PRICE_ANALYSIS_LIST} className="ds-button ds-button-outline ds-button-md">
              All price analyses
            </Link>
          </div>
        </div>

        {loadError ? (
          <Card>
            <CardContent className="py-12 text-center text-sm font-medium text-danger-600">{loadError}</CardContent>
          </Card>
        ) : !product || !family ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className={switching || isFetching ? 'flex flex-col gap-4 opacity-80 transition-opacity' : 'flex flex-col gap-4'}>
            {family.approvedCount < family.variants.length ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning-500 bg-warning-50 px-4 py-2.5 text-sm text-warning-700">
                <p>
                  <strong>Awaiting approval:</strong> pick a variant below and approve one supplier for it. Each variant is approved on its own; switching between FOB Price and Landed Cost shows the true packaging and freight impact.
                </p>
                <span className="rounded-md bg-warning-100 px-2 py-0.5 text-xs font-semibold">
                  {family.approvedCount} of {family.variants.length} Variant{family.variants.length === 1 ? '' : 's'} Approved
                </span>
              </div>
            ) : (
              <p className="rounded-lg border border-success-500 bg-success-50 px-4 py-2.5 text-sm text-success-700">All {family.variants.length} variants of this family are approved.</p>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ParentFamilyCard family={family} product={product} currentId={variantId} onPickVariant={requestVariant} material={form.material} onMaterialChange={(material) => setForm((c) => ({ ...c, material }))} readOnly={readOnly} />
              <LandedCostCard rootId={family.root.id} saved={data!.settings} draft={assumptions} onChange={setAssumptions} canWrite={canWrite} currency={form.currency} />
            </div>

            <VariantFilters variants={family.variants} currentId={variantId} onPickVariant={requestVariant} view={view} onView={setView} />

            {approval ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-success-500 bg-success-50 px-3 py-2 text-sm text-success-700">
                <p>
                  <strong>{variantText}:</strong> {quoteName(approval.supplierName, approval.packagingOption)} approved at {formatCurrencyAmount(data!.analysis!.currency, approval.unitPrice)} by {approval.by.name ?? 'an approver'} on {formatCalendarDay(approval.at)}. This variant is locked.
                </p>
                {data!.permissions.canApprove && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setConfirmReopen(true)}>
                    Reopen
                  </Button>
                )}
              </div>
            ) : data?.analysis ? (
              <p className="rounded-lg border border-warning-500 bg-warning-50 px-3 py-2 text-sm text-warning-700">
                {variantText}: awaiting approval{data.permissions.canApprove ? ' — approve one supplier below, or reject the ones that will not do.' : ' by an approver.'}
              </p>
            ) : null}

            {data?.analysis && data.approval && data.approval.status !== 'CANCELLED' && (
              <div className="rounded-lg border border-border bg-surface px-4 pb-3">
                <ApprovalStepper approval={data.approval} startedBy={data.analysis.updatedBy.name ?? 'A teammate'} startedAt={data.analysis.updatedAt} startLabel="Quotes saved" />
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>
                    Top suppliers by <span className="text-success-700">{effectiveBasis === 'LANDED' ? 'Landed Cost' : 'FOB Price'}</span>
                    <span className="ml-2 rounded-md bg-secondary-100 px-2 py-0.5 text-xs font-medium text-text-secondary">{variantText}</span>
                  </CardTitle>
                  <span className="text-xs text-text-muted">
                    Lowest {effectiveBasis === 'LANDED' ? 'Landed Cost' : 'FOB Price'} first · {form.currency} per unit
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <TopSupplierCards rows={ranked} currency={form.currency} basis={effectiveBasis} variantText={variantText} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle>Supplier quotes &amp; landed cost breakdown</CardTitle>
                    <p className="mt-0.5 text-xs text-text-muted">Edit FOB Price, Unit CBM, or Duty % directly in any row to see the landed cost re-rank instantly.</p>
                    <span className="mt-1 block text-xs text-text-muted">
                      Showing <strong>{form.rows.length}</strong> matching quote line{form.rows.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {!readOnly && (
                    <Button type="button" className="shrink-0" onClick={addLine}>
                      + Add Quote Line
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <datalist id="pa-packaging-options">
                  {PACKAGING_SUGGESTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                {view === 'RANKED' || ranked.length === 0 ? (
                  tableFor(ranked)
                ) : (
                  <div className="flex flex-col gap-4">
                    {[...new Map(ranked.map((row) => [row.supplierName.trim().toLowerCase(), row.supplierName.trim() || 'Unnamed supplier'])).entries()].map(([key, name]) => {
                      const group = ranked.filter((row) => row.supplierName.trim().toLowerCase() === key)
                      return (
                        <div key={key || 'unnamed'} className="flex flex-col gap-2 rounded-lg border border-border bg-secondary-50/40 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-text-primary">
                              {name}
                              <span className="ml-2 text-xs font-normal text-text-muted">
                                {group.length} quote{group.length === 1 ? '' : 's'} submitted
                              </span>
                            </p>
                            {!readOnly && (
                              <Button type="button" size="sm" variant="outline" onClick={() => addPackaging(group[group.length - 1].uid)}>
                                + Add another packaging for {name}
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
                {dirty && <span className="mr-auto text-xs text-text-muted">Unsaved changes on {variantText}</span>}
                {justSaved && !dirty && (
                  <Link href={PRICE_ANALYSIS_LIST} className="ds-button ds-button-outline ds-button-md">
                    Back to price analyses
                  </Link>
                )}
                <Button type="button" variant="outline" onClick={discard} disabled={!dirty || saving}>
                  Discard
                </Button>
                <Button type="button" onClick={() => void submit()} isLoading={saving && !savingPending} disabled={!dirty}>
                  Save analysis
                </Button>
              </FormActions>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Approval status by variant</CardTitle>
              </CardHeader>
              <CardContent>
                <ApprovalOverview family={family} currentId={variantId} onPickVariant={requestVariant} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approval &amp; rejection history · all variants</CardTitle>
              </CardHeader>
              <CardContent>{history.isLoading ? <Spinner /> : <ApprovalHistory events={history.data ?? []} />}</CardContent>
            </Card>
          </div>
        )}
      </div>

      <UnsavedChangesDialog isOpen={pendingVariant !== null} subject={`${variantText || 'This variant'}`} destination="another variant" saving={savingPending} onStay={stay} onDiscard={discardAndGo} onSave={() => void saveAndGo()} />

      <ConfirmDialog
        isOpen={confirmReopen}
        title="Reopen this price analysis"
        confirmLabel="Reopen"
        busy={reopening}
        onConfirm={async () => {
          try {
            await reopen({ productId: variantId }).unwrap()
            success('Reopened: the quotes can be changed, and the approval chain starts again')
            setConfirmReopen(false)
          } catch (caught) {
            failure(caught, 'Could not reopen the analysis')
          }
        }}
        onClose={() => setConfirmReopen(false)}
      >
        <p>
          The approval of {approval ? quoteName(approval.supplierName, approval.packagingOption) : ''} for {variantText} is taken back and the approval chain starts again from its first step. The earlier approvals stay in the history.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={approving !== null}
        title={`Approve ${approving ? quoteName(approving.supplierName, approving.packagingOption) : 'supplier'}`}
        confirmLabel="Approve"
        busy={approvingBusy}
        onConfirm={confirmApprove}
        onClose={() => setApproving(null)}
      >
        <p>
          Approve {approving ? quoteName(approving.supplierName, approving.packagingOption) : ''} at {approving ? formatCurrencyAmount(form.currency, Number(approving.unitPrice)) : ''} for {label}? Only one quote can be approved for this variant; the others stay blocked until
          the analysis is edited. The other variants of the family are approved separately.
        </p>
        {approving?.remarks && <p className="mt-2 text-sm text-text-muted">Remarks: {approving.remarks}</p>}
      </ConfirmDialog>

      <ReasonDialog
        isOpen={rejecting !== null}
        title={`Reject ${rejecting ? quoteName(rejecting.supplierName, rejecting.packagingOption) : 'supplier'}`}
        description={
          rejecting
            ? `${quoteName(rejecting.supplierName, rejecting.packagingOption)}'s quote of ${formatCurrencyAmount(form.currency, Number(rejecting.unitPrice))} for ${label} cannot be approved once rejected.${approval && quoteKey(approval.supplierName, approval.packagingOption) === rowKey(rejecting) ? ' It is the approved quote, so the approval is taken back.' : ''} Editing the analysis sends it back for review.`
            : undefined
        }
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

const productLabelOf = (product: { name: string; variantName: string | null }) => product.variantName ?? product.name
