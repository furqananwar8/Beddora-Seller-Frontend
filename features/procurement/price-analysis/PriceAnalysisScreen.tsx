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
  useSavePriceAnalysisMutation,
  type PoCurrency,
  type SupplierRef,
} from '@/services/api/procurement.api'
import { serverIssues } from '@/utils/apiErrors'
import { formatCalendarDay } from '@/utils/format'
import { productLabel } from '../shared/ProductPicker'
import { SupplierMultiSelect } from '../shared/SupplierSelect'
import { ApprovalHistory } from './ApprovalHistory'
import { ProductDetails } from './ProductDetails'
import { formFrom, rankRows, rowError, sameForm, toBody, type PriceAnalysisForm, type QuoteRow, type RowErrors } from './priceAnalysisForm'
import { QuotesTable } from './QuotesTable'
import { TopSupplierCards } from './TopSupplierCards'

export const PRICE_ANALYSIS_LIST = '/dashboard/procurement/price-analysis'

const CURRENCIES: Array<{ value: PoCurrency; label: string }> = [
  { value: 'USD', label: 'USD' },
  { value: 'CAD', label: 'CAD' },
]

const EMPTY: PriceAnalysisForm = { material: '', currency: 'USD', rows: [] }

/**
 * One product's price analysis: supplier quotes ranked by price, one of them approved by an approver, and the
 * approval history. It can always be edited; an edit takes the approval back so it is approved again.
 */
export const PriceAnalysisScreen: React.FC<{ productId: number }> = ({ productId }) => {
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'procurement:price-analysis')
  const { success, failure, info } = useApiFeedback()

  const { data, isFetching, isError, error } = useGetPriceAnalysisQuery(productId)
  const [save, { isLoading: saving }] = useSavePriceAnalysisMutation()
  const [approve, { isLoading: approvingBusy }] = useApprovePriceAnalysisMutation()
  const [reject, { isLoading: rejectingBusy }] = useRejectPriceAnalysisQuoteMutation()

  const loadedFor = useRef<string | null>(null)
  const [form, setForm] = useState<PriceAnalysisForm>(EMPTY)
  const [baseline, setBaseline] = useState<PriceAnalysisForm>(EMPTY)
  const [serverErrors, setServerErrors] = useState<Map<number, RowErrors>>(new Map())
  const [formError, setFormError] = useState<string | null>(null)
  const [triedSave, setTriedSave] = useState(false)
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
  const ranked = useMemo(() => {
    const rejections = new Map((data?.analysis?.quotes ?? []).map((quote) => [quote.supplier.id, quote.rejection]))
    return rankRows(form.rows).map((row) => ({ ...row, rejection: rejections.get(row.supplier.id) ?? null }))
  }, [form.rows, data])
  const errors = useMemo(() => {
    const merged = new Map<number, RowErrors>()
    for (const row of form.rows) {
      const own = rowError(row)
      const server = serverErrors.get(row.supplier.id) ?? {}
      if (Object.keys(own).length || Object.keys(server).length) merged.set(row.supplier.id, { ...server, ...own })
    }
    return merged
  }, [form.rows, serverErrors])

  const setRows = (rows: QuoteRow[]) => setForm((current) => ({ ...current, rows }))
  const changeRow = (supplierId: number, patch: Partial<QuoteRow>) => {
    setForm((current) => ({ ...current, rows: current.rows.map((row) => (row.supplier.id === supplierId ? { ...row, ...patch } : row)) }))
    setServerErrors((current) => {
      if (!current.has(supplierId)) return current
      const next = new Map(current)
      next.delete(supplierId)
      return next
    })
  }
  /** Ticking adds a row (contact from the supplier); unticking removes it. */
  const pickSuppliers = (suppliers: SupplierRef[]) => {
    const kept = form.rows.filter((row) => suppliers.some((supplier) => supplier.id === row.supplier.id))
    const added = suppliers
      .filter((supplier) => !form.rows.some((row) => row.supplier.id === supplier.id))
      .map((supplier) => ({ supplier: { id: supplier.id, name: supplier.name, contactName: supplier.contactName }, contactName: supplier.contactName ?? '', remarks: '', unitPrice: '' }))
    setRows([...kept, ...added])
  }

  const discard = () => {
    if (data && data.product.id === productId) adopt(data)
  }

  const submit = async () => {
    if (!data) return
    setTriedSave(true)
    setFormError(null)
    if (form.rows.some((row) => Object.keys(rowError(row)).length > 0)) return
    if (form.rows.length === 0 && !data.analysis) {
      setFormError('Add at least one supplier and its price.')
      return
    }
    const hadApproval = Boolean(data.analysis?.approval)
    try {
      const saved = await save({ productId, body: toBody(form, loadedAt) }).unwrap()
      adopt(saved)
      if (!saved.analysis) success('Analysis removed')
      else success(hadApproval && !saved.analysis.approval ? 'Analysis saved · the approval was taken back and needs approving again' : `Analysis saved · ${saved.analysis.quotes.length} supplier${saved.analysis.quotes.length === 1 ? '' : 's'}`)
    } catch (caught) {
      const byRow = new Map<number, RowErrors>()
      for (const issue of serverIssues(caught)) {
        const match = /^quotes\.(\d+)\.(\w+)$/.exec(issue.field)
        const row = match ? form.rows[Number(match[1])] : undefined
        if (row) byRow.set(row.supplier.id, { ...byRow.get(row.supplier.id), [match![2]]: issue.message })
      }
      setServerErrors(byRow)
      if (byRow.size === 0) failure(caught, 'Could not save the analysis')
    }
  }

  const confirmApprove = async () => {
    if (!approving) return
    try {
      const saved = await approve({ productId, supplierId: approving.supplier.id, ...(loadedAt ? { expectedUpdatedAt: loadedAt } : {}) }).unwrap()
      adopt(saved)
      success(`${approving.supplier.name} approved`)
      setApproving(null)
    } catch (caught) {
      failure(caught, 'Could not approve the supplier')
    }
  }

  const confirmReject = async (reason: string) => {
    if (!rejecting) return false
    try {
      const saved = await reject({ productId, supplierId: rejecting.supplier.id, reason, ...(loadedAt ? { expectedUpdatedAt: loadedAt } : {}) }).unwrap()
      adopt(saved)
      success(`${rejecting.supplier.name} rejected`)
      setRejecting(null)
      return true
    } catch (caught) {
      failure(caught, 'Could not reject the supplier')
      return false
    }
  }

  const product = data?.product.id === productId ? data.product : null
  const readOnly = !canWrite
  const loadError = isError ? ((error as { data?: { error?: string } })?.data?.error ?? 'Could not load this product.') : null
  const approval = data?.analysis?.approval ?? null
  const label = product ? `${product.ref} · ${productLabel(product)}` : ''

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
              <p className="rounded-lg border border-success-500 bg-success-50 px-3 py-2 text-sm text-success-700">
                <strong>{approval.supplier.name}</strong> approved at {formatCurrencyAmount(data!.analysis!.currency, approval.unitPrice)} by {approval.by.name ?? 'an approver'} on {formatCalendarDay(approval.at)}.
                {canWrite && ' You can still edit; saving a change takes the approval back so it is approved again.'}
              </p>
            ) : data?.analysis ? (
              <p className="rounded-lg border border-warning-500 bg-warning-50 px-3 py-2 text-sm text-warning-700">
                Awaiting approval{data.permissions.canApprove ? ': approve one supplier below, or reject the ones that will not do.' : ' by an approver.'}
              </p>
            ) : null}

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

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <CardTitle>Top 5 suppliers by price</CardTitle>
                  <span className="text-xs text-text-muted">Lowest price first · {form.currency} per unit</span>
                </div>
              </CardHeader>
              <CardContent>
                <TopSupplierCards rows={ranked} currency={form.currency} />
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
                <QuotesTable
                  rows={ranked}
                  errors={errors}
                  showErrors={triedSave}
                  onChange={changeRow}
                  onRemove={(supplierId) => setRows(form.rows.filter((row) => row.supplier.id !== supplierId))}
                  readOnly={readOnly}
                  approval={{
                    canApprove: data!.permissions.canApprove,
                    canReject: data!.permissions.canReject,
                    approved: approval ? { supplierId: approval.supplier.id, by: approval.by.name, at: approval.at } : null,
                    blockedReason: dirty ? 'Save or discard your changes first' : null,
                    savedSupplierIds: new Set(data!.analysis?.quotes.map((quote) => quote.supplier.id) ?? []),
                    busySupplierId: approvingBusy ? (approving?.supplier.id ?? null) : null,
                    onApprove: (supplierId) => setApproving(form.rows.find((row) => row.supplier.id === supplierId) ?? null),
                    onReject: (supplierId) => setRejecting(form.rows.find((row) => row.supplier.id === supplierId) ?? null),
                  }}
                />
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
        isOpen={approving !== null}
        title={`Approve ${approving?.supplier.name ?? 'supplier'}`}
        confirmLabel="Approve"
        busy={approvingBusy}
        onConfirm={confirmApprove}
        onClose={() => setApproving(null)}
      >
        <p>
          Approve {approving?.supplier.name} at {approving ? formatCurrencyAmount(form.currency, Number(approving.unitPrice)) : ''} for {label}? Only one supplier can be approved; the others stay blocked until the
          analysis is edited.
        </p>
        {approving?.remarks && <p className="mt-2 text-sm text-text-muted">Remarks: {approving.remarks}</p>}
      </ConfirmDialog>

      <ReasonDialog
        isOpen={rejecting !== null}
        title={`Reject ${rejecting?.supplier.name ?? 'supplier'}`}
        description={rejecting ? `${rejecting.supplier.name}'s quote of ${formatCurrencyAmount(form.currency, Number(rejecting.unitPrice))} for ${label} cannot be approved once rejected.${approval?.supplier.id === rejecting.supplier.id ? ' It is the approved quote, so the approval is taken back.' : ''} Editing the analysis sends it back for review.` : undefined}
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
