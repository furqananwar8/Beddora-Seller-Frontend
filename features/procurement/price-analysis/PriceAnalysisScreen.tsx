'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { FormActions } from '@/components/form-actions/FormActions'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Button } from '@/design-system/buttons'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetPriceAnalysisQuery, useSavePriceAnalysisMutation, type PoCurrency, type PoProduct, type SupplierRef } from '@/services/api/procurement.api'
import { serverIssues } from '@/utils/apiErrors'
import { formatCalendarDay } from '@/utils/format'
import { productLabel, ProductSelect } from '../shared/ProductPicker'
import { SupplierMultiSelect } from '../shared/SupplierSelect'
import { ProductDetails } from './ProductDetails'
import { formFrom, rankRows, rowError, sameForm, toBody, type PriceAnalysisForm, type QuoteRow, type RowErrors } from './priceAnalysisForm'
import { QuotesTable } from './QuotesTable'
import { TopSupplierCards } from './TopSupplierCards'

const CURRENCIES: Array<{ value: PoCurrency; label: string }> = [
  { value: 'USD', label: 'USD' },
  { value: 'CAD', label: 'CAD' },
]

const EMPTY: PriceAnalysisForm = { material: '', currency: 'USD', rows: [] }

type ProductRef = Pick<PoProduct, 'id' | 'ref' | 'name' | 'variantName'>

export const PriceAnalysisScreen: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'procurement:price-analysis')
  const { success, failure, info } = useApiFeedback()

  // The product lives in the URL, so a link (or a reload) opens the same analysis
  const productParam = Number(params.get('productId'))
  const productId = Number.isInteger(productParam) && productParam > 0 ? productParam : null
  const { data, isFetching, isError, error } = useGetPriceAnalysisQuery(productId ?? 0, { skip: productId === null })
  const [save, { isLoading: saving }] = useSavePriceAnalysisMutation()

  const loadedFor = useRef<string | null>(null)
  const [form, setForm] = useState<PriceAnalysisForm>(EMPTY)
  const [baseline, setBaseline] = useState<PriceAnalysisForm>(EMPTY)
  const [serverErrors, setServerErrors] = useState<Map<number, RowErrors>>(new Map())
  const [formError, setFormError] = useState<string | null>(null)
  const [triedSave, setTriedSave] = useState(false)
  const [switchingTo, setSwitchingTo] = useState<ProductRef | null>(null)
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

  const ranked = useMemo(() => rankRows(form.rows), [form.rows])
  const errors = useMemo(() => {
    const merged = new Map<number, RowErrors>()
    for (const row of form.rows) {
      const own = rowError(row)
      const server = serverErrors.get(row.supplier.id) ?? {}
      if (Object.keys(own).length || Object.keys(server).length) merged.set(row.supplier.id, { ...server, ...own })
    }
    return merged
  }, [form.rows, serverErrors])

  const openProduct = (product: ProductRef) => router.replace(`${pathname}?productId=${product.id}`)
  const pickProduct = (product: ProductRef) => {
    if (product.id === productId) return
    if (dirty) setSwitchingTo(product)
    else openProduct(product)
  }

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
      .map((supplier) => ({ supplier: { id: supplier.id, name: supplier.name, contactName: supplier.contactName }, contactName: supplier.contactName ?? '', unitPrice: '' }))
    setRows([...kept, ...added])
  }

  const discard = () => {
    if (data && data.product.id === productId) adopt(data)
  }

  const submit = async () => {
    if (!data || productId === null) return
    setTriedSave(true)
    setFormError(null)
    if (form.rows.some((row) => Object.keys(rowError(row)).length > 0)) return
    if (form.rows.length === 0 && !data.analysis) {
      setFormError('Add at least one supplier and its price.')
      return
    }
    try {
      const saved = await save({ productId, body: toBody(form, loadedAt) }).unwrap()
      adopt(saved)
      success(saved.analysis ? `Analysis saved · ${saved.analysis.quotes.length} supplier${saved.analysis.quotes.length === 1 ? '' : 's'}` : 'Analysis removed')
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

  const product = data?.product.id === productId ? data.product : null
  const selectedProduct: ProductRef | null = product
  const readOnly = !canWrite
  const loadError = isError ? ((error as { data?: { error?: string } })?.data?.error ?? 'Could not load this product.') : null

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Price analysis</h1>
            <p className="text-sm text-text-muted">Quotes per product variant, ranked by price</p>
          </div>
          <FormField label="Product" htmlFor="pa-product" className="w-full md:max-w-md">
            <ProductSelect id="pa-product" value={selectedProduct} onChange={pickProduct} placeholder="Search SKU or product name" />
          </FormField>
        </div>

        {productId === null ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-text-muted">Pick a product to see and compare its supplier quotes.</CardContent>
          </Card>
        ) : loadError ? (
          <Card>
            <CardContent className="py-12 text-center text-sm font-medium text-danger-600">{loadError}</CardContent>
          </Card>
        ) : !product ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>
                  Product details <span className="ml-1 font-mono text-sm font-normal text-text-muted">{product.ref} · {productLabel(product)}</span>
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
                      <SupplierMultiSelect
                        id="pa-suppliers"
                        value={form.rows.map((row) => ({ ...row.supplier, country: null, currency: '' }))}
                        onChange={pickSuppliers}
                      />
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
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={switchingTo !== null}
        title="Discard unsaved prices?"
        confirmLabel="Discard and switch"
        tone="danger"
        onConfirm={() => {
          if (switchingTo) openProduct(switchingTo)
          setSwitchingTo(null)
        }}
        onClose={() => setSwitchingTo(null)}
      >
        <p>
          The changes to this analysis are not saved. Switch to {switchingTo ? `${switchingTo.ref} · ${productLabel(switchingTo)}` : 'the other product'} anyway?
        </p>
      </ConfirmDialog>
    </Container>
  )
}
