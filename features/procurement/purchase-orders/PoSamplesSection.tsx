'use client'

import React, { useState } from 'react'
import { UseFormReturn, useFieldArray, useWatch } from 'react-hook-form'
import { ChoiceSelect } from '@/components/choice-select/ChoiceSelect'
import { fieldClass } from '@/components/form-field/FormField'
import { NumericInput } from '@/components/form-field/NumericInput'
import { Button } from '@/design-system/buttons'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import type { PoProduct } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import { ProductSelect, productLabel } from '../shared/ProductPicker'
import { LinkSampleSelect } from './LinkSampleSelect'
import type { LinkableSample } from '@/services/api/samples.api'
import { linkedSample, newSample, sampleAmount, summarize, type PoFormValues } from './poForm'

interface PoSamplesSectionProps {
  form: UseFormReturn<PoFormValues>
  readOnly: boolean
  /** The PO being edited, if saved already. */
  purchaseOrderId?: number
}

const HEAD = 'px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-2 text-center align-middle'

type Mode = 'idle' | 'create' | 'link'

/**
 * The optional samples of a PO, below its products. A sample is made here or an existing one is linked; a paid sample
 * adds to the PO amount and is paid with the PO, a free one costs nothing.
 */
export const PoSamplesSection: React.FC<PoSamplesSectionProps> = ({ form, readOnly, purchaseOrderId }) => {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'samples', keyName: 'fieldId' })
  const samples = useWatch({ control, name: 'samples' }) ?? []
  const lines = useWatch({ control, name: 'lines' }) ?? []
  const supplier = useWatch({ control, name: 'supplier' })
  const currency = useWatch({ control, name: 'currency' })
  const [mode, setMode] = useState<Mode>('idle')
  const [duplicate, setDuplicate] = useState<string | null>(null)

  const { products, samples: totals, poAmount } = summarize(lines, samples)
  const linkedIds = new Set(samples.flatMap((sample) => (sample.id ? [sample.id] : [])))

  const createFor = (product: PoProduct) => {
    if (samples.some((sample) => sample.product.id === product.id)) {
      setDuplicate(`${product.ref} is already a sample on this PO`)
      return
    }
    setDuplicate(null)
    append(newSample(product), { shouldFocus: false })
    setMode('idle')
  }

  /** Linking with no supplier picked yet brings the sample's supplier, its contact and its currency to the PO. */
  const linkPicked = (picked: LinkableSample[]) => {
    if (picked.length === 0) return
    if (!supplier) {
      const first = picked[0]
      setValue('supplier', first.supplierRef, { shouldDirty: true, shouldValidate: true })
      setValue('contactName', first.supplierRef.contactName ?? '', { shouldDirty: true })
      setValue('currency', first.currency as 'USD' | 'CAD', { shouldDirty: true })
    }
    picked.forEach((sample) => append(linkedSample(sample), { shouldFocus: false }))
  }

  if (readOnly && samples.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Sample <span className="text-sm font-normal text-text-muted">(Optional)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!readOnly && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-muted">Does the supplier send a sample with this PO? Create a new one, or link a sample that already exists.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={mode === 'create' ? 'primary' : 'outline'} onClick={() => setMode(mode === 'create' ? 'idle' : 'create')}>
                + Create new sample
              </Button>
              <Button type="button" size="sm" variant={mode === 'link' ? 'primary' : 'outline'} onClick={() => setMode(mode === 'link' ? 'idle' : 'link')}>
                Link existing sample
              </Button>
            </div>
            {mode === 'create' && (
              <div className="max-w-md">
                <label htmlFor="po-sample-product" className="ds-input-label">
                  Product for the sample
                </label>
                <ProductSelect id="po-sample-product" value={null} onChange={createFor} />
              </div>
            )}
            {mode === 'link' && (
              <div className="max-w-md">
                <label htmlFor="po-sample-link" className="ds-input-label">
                  Existing samples
                </label>
                <LinkSampleSelect
                  id="po-sample-link"
                  supplier={supplier}
                  currency={currency}
                  purchaseOrderId={purchaseOrderId}
                  linkedIds={linkedIds}
                  onLink={linkPicked}
                  onUnlink={(sampleId) => {
                    const index = samples.findIndex((sample) => sample.id === sampleId)
                    if (index >= 0) remove(index)
                  }}
                />
                <p className="mt-1 text-xs text-text-muted">Linked samples keep their saved details: you can only remove them from this PO.</p>
              </div>
            )}
            {duplicate && <p className="text-sm text-danger-600">{duplicate}</p>}
          </div>
        )}

        {fields.length > 0 && (
          <div className="-mx-4 ds-scroll-x sm:mx-0 sm:rounded-lg sm:border sm:border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary-50">
                <tr>
                  <th className={HEAD}>SKU</th>
                  <th className={cn(HEAD, 'min-w-[12rem]')}>Product</th>
                  <th className={HEAD}>Source</th>
                  <th className={HEAD}>Sample is</th>
                  <th className={HEAD}>Units</th>
                  <th className={HEAD}>Price / unit ({currency})</th>
                  <th className={HEAD}>Amount ({currency})</th>
                  {!readOnly && <th className="w-10" aria-label="Remove" />}
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const sample = samples[index] ?? field
                  const frozen = readOnly || sample.fixed
                  const unitsError = errors.samples?.[index]?.units?.message
                  const priceError = errors.samples?.[index]?.unitPrice?.message
                  return (
                    <tr key={field.fieldId} className="border-t border-border">
                      <td className={cn(CELL, 'font-mono text-xs')}>{sample.product.ref}</td>
                      <td className={CELL}>{productLabel(sample.product)}</td>
                      <td className={cn(CELL, 'text-xs text-text-muted')}>{sample.id ? (sample.fromPo ? `Linked · from ${sample.fromPo}` : 'Saved sample') : 'New'}</td>
                      <td className={CELL}>
                        <ChoiceSelect<'FREE' | 'PAID'>
                          variant="cell"
                          title={`Is the sample of ${sample.product.ref} paid or free`}
                          value={sample.paid ? 'PAID' : 'FREE'}
                          disabled={frozen}
                          onChange={(next) => setValue(`samples.${index}.paid`, next === 'PAID', { shouldDirty: true, shouldValidate: true })}
                          options={[
                            { value: 'FREE', label: 'Free' },
                            { value: 'PAID', label: 'Paid' },
                          ]}
                          className="mx-auto w-32"
                        />
                      </td>
                      <td className={CELL}>
                        <NumericInput
                          aria-label={`Sample units for ${sample.product.ref}`}
                          className={cn(fieldClass(unitsError), 'mx-auto h-9 w-24 py-1 text-right tabular-nums')}
                          disabled={frozen}
                          {...register(`samples.${index}.units`)}
                        />
                        {unitsError && <p className="mt-1 text-xs text-danger-600">{unitsError}</p>}
                      </td>
                      <td className={CELL}>
                        {sample.paid ? (
                          <>
                            <NumericInput
                              decimal
                              aria-label={`Sample price per unit for ${sample.product.ref}`}
                              placeholder="0.00"
                              className={cn(fieldClass(priceError), 'mx-auto h-9 w-28 py-1 text-right tabular-nums')}
                              disabled={frozen}
                              {...register(`samples.${index}.unitPrice`)}
                            />
                            {priceError && <p className="mt-1 text-xs text-danger-600">{priceError}</p>}
                          </>
                        ) : (
                          <span className="text-text-muted">No cost</span>
                        )}
                      </td>
                      <td className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{sample.paid ? formatCurrency(sampleAmount(sample), currency) : '—'}</td>
                      {!readOnly && (
                        <td className={CELL}>
                          <button
                            type="button"
                            aria-label={`Remove the sample of ${sample.product.ref}`}
                            title={sample.id && !sample.fixed ? 'Remove sample' : sample.id ? 'Remove from this PO' : 'Remove'}
                            onClick={() => remove(index)}
                            className="rounded p-1.5 text-text-muted hover:bg-danger-50 hover:text-danger-600"
                          >
                            ×
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border text-sm">
                  <td className={cn(CELL, 'text-left font-semibold')} colSpan={6}>
                    Samples · {totals.count} {totals.count === 1 ? 'SKU' : 'SKUs'} · {totals.free} free
                  </td>
                  <td className={cn(CELL, 'whitespace-nowrap font-semibold tabular-nums')}>{formatCurrency(totals.amount, currency)}</td>
                  {!readOnly && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {totals.amount > 0 && (
          <p className="text-sm text-text-secondary">
            Paid samples are part of this PO&apos;s payment: products {formatCurrency(products.amount, currency)} + samples {formatCurrency(totals.amount, currency)} ={' '}
            <strong className="text-text-primary">PO total {formatCurrency(poAmount, currency)}</strong>
          </p>
        )}
      </CardContent>

    </Card>
  )
}
