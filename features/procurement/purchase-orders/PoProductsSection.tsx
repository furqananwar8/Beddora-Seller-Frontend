'use client'

import React from 'react'
import { UseFormReturn, useFieldArray, useWatch } from 'react-hook-form'
import { NumericInput } from '@/components/form-field/NumericInput'
import { fieldClass } from '@/components/form-field/FormField'
import { Switch } from '@/components/switch/Switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import type { PoProduct } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import { MarketplaceTags } from '../shared/MarketplaceTags'
import { ProductPicker, productLabel } from '../shared/ProductPicker'
import { ExpandToggle, ProductSpecs, useExpandedRows } from '../shared/ProductSpecs'
import { ProductTagBadge } from '../shared/ProductTagBadge'
import { formatDimensions } from '../shared/units'
import { lineAmount, newLine, summarize, type PoFormValues } from './poForm'

interface PoProductsSectionProps {
  form: UseFormReturn<PoFormValues>
  readOnly: boolean
  /** From-remaining POs may only carry the source PO's products. */
  fixedProducts: boolean
}

const HEAD = 'px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-2 text-center align-middle'
const units = (value: number) => value.toLocaleString('en-CA')
const NONE = <span className="text-text-muted">—</span>

export const PoProductsSection: React.FC<PoProductsSectionProps> = ({ form, readOnly, fixedProducts }) => {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines', keyName: 'fieldId' })
  const lines = useWatch({ control, name: 'lines' }) ?? []
  const currency = useWatch({ control, name: 'currency' })
  const { isOpen, toggle } = useExpandedRows<number>()
  const columns = readOnly ? 12 : 13

  // Ticking a product in the picker adds a line; unticking it drops the line (and the sample row of that SKU)
  const syncPicked = (picked: PoProduct[]) => {
    const pickedIds = new Set(picked.map((product) => product.id))
    for (let index = lines.length - 1; index >= 0; index--) if (!pickedIds.has(lines[index].product.id)) remove(index)
    const present = new Set(lines.map((line) => line.product.id))
    picked.filter((product) => !present.has(product.id)).forEach((product) => append(newLine(product), { shouldFocus: false }))
  }

  const setSample = (index: number, isSample: boolean) => setValue(`lines.${index}.isSample`, isSample, { shouldDirty: true, shouldValidate: true })

  const { products, samples } = summarize(lines)
  const linesError = (errors.lines as { message?: string } | undefined)?.message ?? (errors.lines as { root?: { message?: string } } | undefined)?.root?.message

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!readOnly && !fixedProducts && (
          <div>
            <label htmlFor="po-products" className="ds-input-label">
              Add products
            </label>
            <ProductPicker id="po-products" selected={lines.map((line) => line.product)} onChange={syncPicked} canCreate />
          </div>
        )}
        {fixedProducts && !readOnly && <p className="text-xs text-text-muted">This PO takes over units left on another PO, so its products are fixed. Lower a quantity or remove a line if needed.</p>}
        {linesError && <p className="text-sm text-danger-600">{linesError}</p>}

        {fields.length > 0 && (
          <div className="-mx-4 ds-scroll-x sm:mx-0 sm:rounded-lg sm:border sm:border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="w-8" aria-label="Expand" />
                  <th className={HEAD}>SKU</th>
                  {/* `!`: the global .ds-table-td rule forces cell padding with !important, so plain padding classes do nothing */}
                  <th className={cn(HEAD, 'min-w-[14rem] !pl-8')}>Product</th>
                  <th className={HEAD}>Tag</th>
                  <th className={HEAD}>Color</th>
                  <th className={HEAD}>L × W × H</th>
                  <th className={HEAD}>Sample</th>
                  <th className={HEAD}>Units ordered</th>
                  <th className={HEAD}>Unit rate ({currency})</th>
                  <th className={HEAD}>Amount ({currency})</th>
                  <th className={HEAD}>In packaging lists</th>
                  <th className={HEAD}>Remaining</th>
                  {!readOnly && <th className="w-10" aria-label="Remove" />}
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const line = lines[index] ?? field
                  const { product } = line
                  const sample = line.isSample
                  const frozen = readOnly || Boolean(line.locked)
                  const unitsError = errors.lines?.[index]?.unitsOrdered?.message
                  const rateError = errors.lines?.[index]?.unitPrice?.message
                  const remaining = (Number(line.unitsOrdered) || 0) - line.allocated
                  const expanded = isOpen(product.id)
                  // A SKU is at most one product row and one sample row
                  const twin = lines.some((other, otherIndex) => otherIndex !== index && other.product.id === product.id)
                  return (
                    <React.Fragment key={field.fieldId}>
                      <tr className={'border-t border-border'}>
                        <td className={CELL}>
                          <ExpandToggle expanded={expanded} onToggle={() => toggle(product.id)} />
                        </td>
                        <td className={cn(CELL, '!pr-10 font-mono text-xs')}>
                          <span className="flex flex-col items-center gap-1">
                            <span className="flex items-center gap-2">
                              <span className="whitespace-nowrap">{product.ref}</span>
                              <MarketplaceTags product={product} />
                            </span>
                            {sample && <span className="rounded-full bg-primary-100 px-2 py-0.5 font-sans text-[11px] font-semibold text-primary-700">Sample</span>}
                          </span>
                        </td>
                        <td className={cn(CELL, '!pl-8')}>{productLabel(product)}</td>
                        <td className={CELL}>
                          <ProductTagBadge tag={product.tag} />
                        </td>
                        <td className={CELL}>{product.color ?? '—'}</td>
                        <td className={cn(CELL, 'whitespace-nowrap')}>{formatDimensions(product.lengthCm, product.widthCm, product.heightCm, product.dimensionUnit)}</td>
                        <td className={CELL}>
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              aria-label={`${product.ref} is a sample`}
                              checked={sample}
                              disabled={frozen || twin || (!sample && line.allocated > 0)}
                              onCheckedChange={(next) => setSample(index, next)}
                            />
                            {!sample && !twin && !readOnly && (
                              <button type="button" className="text-xs font-medium text-primary-600 hover:underline" onClick={() => append(newLine(product, true), { shouldFocus: false })}>
                                + Sample
                              </button>
                            )}
                          </div>
                        </td>
                        <td className={CELL}>
                          <NumericInput
                            aria-label={`${sample ? 'Sample units' : 'Units ordered'} for ${product.ref}`}
                            className={cn(fieldClass(unitsError), 'mx-auto h-9 w-28 py-1 text-right tabular-nums')}
                            disabled={frozen}
                            {...register(`lines.${index}.unitsOrdered`)}
                          />
                          {unitsError && <p className="mt-1 text-xs text-danger-600">{unitsError}</p>}
                          {!unitsError && line.maxUnits !== undefined && <p className="mt-1 text-xs text-text-muted">max {units(line.maxUnits)}</p>}
                        </td>
                        <td className={CELL}>
                          <NumericInput
                            decimal
                            aria-label={`Unit rate for ${product.ref}`}
                            placeholder={sample ? 'Free' : undefined}
                            className={cn(fieldClass(rateError), 'mx-auto h-9 w-28 py-1 text-right tabular-nums')}
                            disabled={frozen}
                            {...register(`lines.${index}.unitPrice`)}
                          />
                          {rateError && <p className="mt-1 text-xs text-danger-600">{rateError}</p>}
                        </td>
                        <td className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{formatCurrency(lineAmount(line), currency)}</td>
                        <td className={cn(CELL, 'tabular-nums text-text-muted')}>{sample ? NONE : units(line.allocated)}</td>
                        <td className={cn(CELL, 'tabular-nums', !sample && remaining < 0 && 'text-danger-600')}>{sample ? NONE : units(remaining)}</td>
                        {!readOnly && (
                          <td className={CELL}>
                            <button
                              type="button"
                              aria-label={`Remove ${product.ref}`}
                              disabled={frozen}
                              onClick={() => remove(index)}
                              className="rounded p-1.5 text-text-muted hover:bg-danger-50 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              ×
                            </button>
                          </td>
                        )}
                      </tr>
                      {expanded && (
                        <tr className="bg-secondary-50/60">
                          <td />
                          <td colSpan={columns - 1} className="px-3 pb-4 pt-2 text-left">
                            <ProductSpecs product={product} />
                            <p className="mt-2 text-xs text-text-muted">Read-only here. Change these on the product.</p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-semibold">
                  <td className={cn(CELL, 'text-left')} colSpan={7}>
                    Total · {products.count} {products.count === 1 ? 'product' : 'products'}
                  </td>
                  <td className={cn(CELL, 'tabular-nums')}>{units(products.ordered)}</td>
                  <td />
                  <td className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{formatCurrency(products.amount, currency)}</td>
                  <td className={cn(CELL, 'tabular-nums')}>{units(products.allocated)}</td>
                  <td className={cn(CELL, 'tabular-nums')}>{units(products.ordered - products.allocated)}</td>
                  {!readOnly && <td />}
                </tr>
                {samples.count > 0 && (
                  <tr className="border-t border-border font-semibold">
                    <td className={cn(CELL, 'text-left')} colSpan={7}>
                      Samples · {samples.count} {samples.count === 1 ? 'SKU' : 'SKUs'} · {samples.free} free <span className="font-normal">(not in the PO amount)</span>
                    </td>
                    <td className={cn(CELL, 'tabular-nums')}>{units(samples.units)}</td>
                    <td />
                    <td className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{formatCurrency(samples.amount, currency)}</td>
                    <td />
                    <td />
                    {!readOnly && <td />}
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}
        {samples.count > 0 && !readOnly && (
          <p className="text-xs text-text-muted">A sample is not a product of the PO. Leave its unit rate empty for a free sample; enter a rate for a chargeable one, paid from a payment request.</p>
        )}
      </CardContent>
    </Card>
  )
}
