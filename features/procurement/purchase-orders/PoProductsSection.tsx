'use client'

import React from 'react'
import { UseFormReturn, useFieldArray, useWatch } from 'react-hook-form'
import { NumericInput } from '@/components/form-field/NumericInput'
import { fieldClass } from '@/components/form-field/FormField'
import { CellField } from '@/components/form-field/CellField'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import { useGetPurchaseOrderLastPurchasesQuery, type PoProduct } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatCurrency, formatDate } from '@/utils/format'
import { MarketplaceTags } from '../shared/MarketplaceTags'
import { ProductPicker, productLabel } from '../shared/ProductPicker'
import { ExpandToggle, ProductSpecs, useExpandedRows } from '../shared/ProductSpecs'
import { ProductTagBadge } from '../shared/ProductTagBadge'
import { PlatformBadge } from '../shared/platformMeta'
import { cbmOf, formatCbm, formatDimensions } from '../shared/units'
import { Button } from '@/design-system/buttons'
import { allLines, lineAmount, newLine, summarize, type PoFormValues } from './poForm'

interface PoProductsSectionProps {
  form: UseFormReturn<PoFormValues>
  readOnly: boolean
  /** From-remaining POs may only carry the source PO's products. */
  fixedProducts: boolean
  /** The PO being edited, so it is not counted as its own last purchase. */
  purchaseOrderId?: number
}

interface PoBatchCardProps extends PoProductsSectionProps {
  batchIndex: number
  batchCount: number
  /** A batch on a packaging list cannot be removed. */
  locked: boolean
  onRemove: () => void
}

const HEAD = 'px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-2 text-center align-middle'
const units = (value: number) => value.toLocaleString('en-CA')

/** One unit's CBM (m³): the product's own, else worked out from its L × W × H (stored in cm). */
const cbmPerUnit = (product: PoProduct): number | null =>
  product.cbm ?? (product.lengthCm !== null && product.widthCm !== null && product.heightCm !== null ? cbmOf(product.lengthCm, product.widthCm, product.heightCm, 'CM') : null)

const PoBatchCard: React.FC<PoBatchCardProps> = ({ form, readOnly, fixedProducts, purchaseOrderId, batchIndex, batchCount, locked, onRemove }) => {
  const {
    control,
    register,
    formState: { errors },
  } = form
  const { fields, append, remove } = useFieldArray({ control, name: `batches.${batchIndex}.lines`, keyName: 'fieldId' })
  const lines = useWatch({ control, name: `batches.${batchIndex}.lines` }) ?? []
  const batchErrors = errors.batches?.[batchIndex]
  // null when no line has a size to work the volume from
  const cbms = lines.map((line) => { const unit = cbmPerUnit(line.product); return unit === null ? null : unit * (Number(line.unitsOrdered) || 0) })
  const totalCbm = cbms.some((cbm) => cbm !== null) ? cbms.reduce<number>((sum, cbm) => sum + (cbm ?? 0), 0) : null
  const currency = useWatch({ control, name: 'currency' })
  const platform = useWatch({ control, name: 'platform' })
  const { isOpen, toggle } = useExpandedRows<number>()
  const columns = readOnly ? 15 : 16
  const productIds = lines.map((line) => line.product.id)
  const { data: lastPurchases } = useGetPurchaseOrderLastPurchasesQuery({ productIds, excludeId: purchaseOrderId }, { skip: productIds.length === 0 })
  const lastOf = (productId: number) => lastPurchases?.find((entry) => entry.productId === productId)

  // Ticking a product in the picker adds a line; unticking it drops the line
  const syncPicked = (picked: PoProduct[]) => {
    const pickedIds = new Set(picked.map((product) => product.id))
    for (let index = lines.length - 1; index >= 0; index--) if (!pickedIds.has(lines[index].product.id)) remove(index)
    const present = new Set(lines.map((line) => line.product.id))
    picked.filter((product) => !present.has(product.id)).forEach((product) => append(newLine(product), { shouldFocus: false }))
  }

  const { products } = summarize(lines, [])
  const linesError = (batchErrors?.lines as { message?: string } | undefined)?.message ?? (batchErrors?.lines as { root?: { message?: string } } | undefined)?.root?.message

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{batchCount > 1 || !readOnly ? `Batch ${batchIndex + 1} · Products` : 'Products'}</CardTitle>
        {!readOnly && batchCount > 1 && (
          <Button type="button" size="sm" variant="outline" disabled={locked} title={locked ? 'This batch is on a packaging list' : undefined} onClick={onRemove}>
            Remove batch
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!readOnly && !fixedProducts && (
          <div>
            <label htmlFor={`po-products-${batchIndex}`} className="ds-input-label">
              Add products
            </label>
            <ProductPicker id={`po-products-${batchIndex}`} selected={lines.map((line) => line.product)} onChange={syncPicked} canCreate platform={platform} />
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
                  <th className={HEAD}>Last Purchase Price</th>
                  <th className={HEAD}>Purchase Date</th>
                  <th className={HEAD}>Tag</th>
                  <th className={HEAD}>Brand</th>
                  <th className={HEAD}>Color</th>
                  <th className={HEAD}>L × W × H</th>
                  <th className={HEAD} title="One unit's L × W × H CBM × units ordered">CBM</th>
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
                  const unitsError = batchErrors?.lines?.[index]?.unitsOrdered?.message
                  const rateError = batchErrors?.lines?.[index]?.unitPrice?.message
                  const remaining = (Number(line.unitsOrdered) || 0) - line.allocated
                  const unitCbm = cbmPerUnit(product)
                  const unitsOrdered = Number(line.unitsOrdered) || 0
                  const expanded = isOpen(product.id)
                  return (
                    <React.Fragment key={field.fieldId}>
                      <tr className={'border-t border-border'}>
                        <td className={CELL}>
                          <ExpandToggle expanded={expanded} onToggle={() => toggle(product.id)} />
                        </td>
                        <td className={cn(CELL, '!pr-10 font-mono text-xs')}>
                          <span className="flex items-center justify-center gap-2">
                            <span className="whitespace-nowrap">{product.ref}</span>
                            <MarketplaceTags product={product} />
                          </span>
                        </td>
                        <td className={cn(CELL, '!pl-8')}>{productLabel(product)}</td>
                        <td className={cn(CELL, 'whitespace-nowrap tabular-nums')} title={lastOf(product.id)?.poNo}>
                          {lastOf(product.id)?.unitPrice != null ? formatCurrency(lastOf(product.id)!.unitPrice!, lastOf(product.id)!.currency) : '—'}
                        </td>
                        <td className={cn(CELL, 'whitespace-nowrap')}>{lastOf(product.id) ? formatDate(lastOf(product.id)!.purchaseDate) : '—'}</td>
                        <td className={CELL}>
                          <ProductTagBadge tag={product.tag} />
                        </td>
                        <td className={CELL}><PlatformBadge platform={product.platform} /></td>
                        <td className={CELL}>{product.color ?? '—'}</td>
                        <td className={cn(CELL, 'whitespace-nowrap')}>{formatDimensions(product.lengthCm, product.widthCm, product.heightCm, product.dimensionUnit)}</td>
                        <td className={cn(CELL, 'whitespace-nowrap tabular-nums')} title={`${formatCbm(unitCbm)} × ${units(unitsOrdered)} units`}>
                          {formatCbm(unitCbm !== null ? unitCbm * unitsOrdered : null)}
                        </td>
                        <td className={CELL}>
                          <CellField error={unitsError} hint={line.maxUnits !== undefined ? `max ${units(line.maxUnits)}` : undefined}>
                            <NumericInput
                              aria-label={`Units ordered for ${product.ref}`}
                              className={cn(fieldClass(unitsError), 'mx-auto h-9 w-28 py-1 text-right tabular-nums')}
                              disabled={readOnly}
                              {...register(`batches.${batchIndex}.lines.${index}.unitsOrdered`)}
                            />
                          </CellField>
                        </td>
                        <td className={CELL}>
                          <CellField error={rateError}>
                            <NumericInput
                              decimal
                              aria-label={`Unit rate for ${product.ref}`}
                              className={cn(fieldClass(rateError), 'mx-auto h-9 w-28 py-1 text-right tabular-nums')}
                              disabled={readOnly}
                              {...register(`batches.${batchIndex}.lines.${index}.unitPrice`)}
                            />
                          </CellField>
                        </td>
                        <td className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{formatCurrency(lineAmount(line), currency)}</td>
                        <td className={cn(CELL, 'tabular-nums text-text-muted')}>{units(line.allocated)}</td>
                        <td className={cn(CELL, 'tabular-nums', remaining < 0 && 'text-danger-600')}>{units(Math.max(0, remaining))}</td>
                        {!readOnly && (
                          <td className={CELL}>
                            <button
                              type="button"
                              aria-label={`Remove ${product.ref}`}
                              onClick={() => remove(index)}
                              className="rounded p-1.5 text-text-muted hover:bg-danger-50 hover:text-danger-600"
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
                  <td className={cn(CELL, 'text-left')} colSpan={9}>
                    Total · {fields.length} {fields.length === 1 ? 'product' : 'products'}
                  </td>
                  <td className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{formatCbm(totalCbm)}</td>
                  <td className={cn(CELL, 'tabular-nums')}>{units(products.ordered)}</td>
                  <td />
                  <td className={cn(CELL, 'whitespace-nowrap tabular-nums')}>{formatCurrency(products.amount, currency)}</td>
                  <td className={cn(CELL, 'tabular-nums')}>{units(products.allocated)}</td>
                  <td className={cn(CELL, 'tabular-nums')}>{units(products.ordered - products.allocated)}</td>
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

/**
 * The PO's products, one card per batch. The first card is the PO's products as before; "Add batch" adds another card with
 * its own products and units (any number of batches, each with any number of SKUs).
 */
export const PoProductsSection: React.FC<PoProductsSectionProps> = ({ form, readOnly, fixedProducts, purchaseOrderId }) => {
  const { control } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'batches', keyName: 'fieldId' })
  const batches = useWatch({ control, name: 'batches' }) ?? []
  const currency = useWatch({ control, name: 'currency' })
  const total = summarize(allLines(batches), []).products
  const topError = (form.formState.errors.batches as { message?: string; root?: { message?: string } } | undefined)
  return (
    <>
      {topError && (topError.message || topError.root?.message) && <p className="text-sm text-danger-600">{topError.message ?? topError.root?.message}</p>}
      {fields.map((field, index) => (
        <PoBatchCard
          key={field.fieldId}
          form={form}
          readOnly={readOnly}
          fixedProducts={fixedProducts}
          purchaseOrderId={purchaseOrderId}
          batchIndex={index}
          batchCount={fields.length}
          locked={Boolean(batches[index]?.locked)}
          onRemove={() => remove(index)}
        />
      ))}
      {!readOnly && !fixedProducts && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => append({ lines: [] }, { shouldFocus: false })}>
            + Add batch
          </Button>
          {fields.length > 1 && (
            <p className="text-sm text-text-secondary">
              {fields.length} batches · {total.count} {total.count === 1 ? 'product' : 'products'} · {units(total.ordered)} units · {formatCurrency(total.amount, currency)}
            </p>
          )}
        </div>
      )}
    </>
  )
}
