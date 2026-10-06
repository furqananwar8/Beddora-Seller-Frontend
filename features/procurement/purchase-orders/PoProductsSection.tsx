'use client'

import React from 'react'
import { UseFormReturn, useFieldArray, useWatch } from 'react-hook-form'
import { fieldClass } from '@/components/form-field/FormField'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import type { PoProduct } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { ProductPicker, productLabel } from '../shared/ProductPicker'
import { ProductTagBadge } from '../shared/ProductTagBadge'
import type { PoFormValues } from './poForm'

import { NumericInput } from '@/components/form-field/NumericInput'
interface PoProductsSectionProps {
  form: UseFormReturn<PoFormValues>
  readOnly: boolean
  /** From-remaining POs may only carry the source PO's products. */
  fixedProducts: boolean
}

const HEAD = 'px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-2 text-center align-middle'
const units = (value: number) => value.toLocaleString('en-CA')

export const PoProductsSection: React.FC<PoProductsSectionProps> = ({ form, readOnly, fixedProducts }) => {
  const {
    control,
    register,
    formState: { errors },
  } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines', keyName: 'fieldId' })
  const lines = useWatch({ control, name: 'lines' }) ?? []

  // Ticking a product in the picker adds a line; unticking it drops the line
  const syncPicked = (picked: PoProduct[]) => {
    const pickedIds = new Set(picked.map((product) => product.id))
    for (let index = lines.length - 1; index >= 0; index--) if (!pickedIds.has(lines[index].product.id)) remove(index)
    const present = new Set(lines.map((line) => line.product.id))
    picked.filter((product) => !present.has(product.id)).forEach((product) => append({ product, unitsOrdered: '', allocated: 0 }, { shouldFocus: false }))
  }

  const ordered = lines.reduce((sum, line) => sum + (Number(line.unitsOrdered) || 0), 0)
  const allocated = lines.reduce((sum, line) => sum + line.allocated, 0)
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
                  <th className={HEAD}>SKU</th>
                  <th className={cn(HEAD, 'min-w-[14rem]')}>Product</th>
                  <th className={HEAD}>Tag</th>
                  <th className={HEAD}>Units ordered</th>
                  <th className={HEAD}>In packaging lists</th>
                  <th className={HEAD}>Remaining</th>
                  {!readOnly && <th className="w-10" aria-label="Remove" />}
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const line = lines[index] ?? field
                  const error = errors.lines?.[index]?.unitsOrdered?.message
                  const remaining = (Number(line.unitsOrdered) || 0) - line.allocated
                  return (
                    <tr key={field.fieldId} className="border-t border-border">
                      <td className={cn(CELL, 'whitespace-nowrap font-mono text-xs')}>{line.product.sku}</td>
                      <td className={CELL}>{productLabel(line.product)}</td>
                      <td className={CELL}>
                        <ProductTagBadge tag={line.product.tag} />
                      </td>
                      <td className={CELL}>
                        <NumericInput
                          aria-label={`Units ordered for ${line.product.sku}`}

                          className={cn(fieldClass(error), 'mx-auto h-9 w-28 py-1 text-right tabular-nums')}
                          disabled={readOnly}
                          {...register(`lines.${index}.unitsOrdered`)}
                        />
                        {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
                        {!error && line.maxUnits !== undefined && <p className="mt-1 text-xs text-text-muted">max {units(line.maxUnits)}</p>}
                      </td>
                      <td className={cn(CELL, 'tabular-nums text-text-muted')}>{units(line.allocated)}</td>
                      <td className={cn(CELL, 'tabular-nums', remaining < 0 && 'text-danger-600')}>{units(remaining)}</td>
                      {!readOnly && (
                        <td className={CELL}>
                          <button
                            type="button"
                            aria-label={`Remove ${line.product.sku}`}
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
                <tr className="border-t border-border bg-secondary-50 font-semibold">
                  <td className={cn(CELL, 'text-left')} colSpan={3}>
                    Total · {fields.length} {fields.length === 1 ? 'SKU' : 'SKUs'}
                  </td>
                  <td className={cn(CELL, 'tabular-nums')}>{units(ordered)}</td>
                  <td className={cn(CELL, 'tabular-nums')}>{units(allocated)}</td>
                  <td className={cn(CELL, 'tabular-nums')}>{units(ordered - allocated)}</td>
                  {!readOnly && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
