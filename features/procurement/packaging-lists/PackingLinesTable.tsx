'use client'

import React from 'react'
import { fieldClass } from '@/components/form-field/FormField'
import { NumericInput } from '@/components/form-field/NumericInput'
import type { PackablePoLines } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { productLabel } from '../shared/ProductPicker'
import { ExpandToggle, ProductSpecs, useExpandedRows } from '../shared/ProductSpecs'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { formatDimensions } from '../shared/units'
import { computeLine, EMPTY_LINE, lineKey, type LineValue } from './packingLine'

interface PackingLinesTableProps {
  groups: PackablePoLines[]
  values: Map<string, LineValue>
  onChange: (key: string, field: keyof LineValue, value: string) => void
  /** Errors from the server, keyed like {@link lineKey}. */
  serverErrors?: Map<string, string>
  readOnly: boolean
}

const HEAD = 'px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-2 text-center align-middle tabular-nums'
const COLUMNS = 12
const qty = (value: number) => value.toLocaleString('en-CA')
const kg = (value: number) => `${value.toLocaleString('en-CA', { maximumFractionDigits: 1 })} kg`

const NumberCell: React.FC<{
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  readOnly: boolean
  hint?: string
  decimal?: boolean
  className?: string
}> = ({ label, value, onChange, error, placeholder, readOnly, hint, decimal, className }) => (
  <>
    <NumericInput
      decimal={decimal}
      aria-label={label}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      className={cn(fieldClass(error), 'mx-auto h-9 w-24 py-1 text-right tabular-nums', readOnly && 'bg-secondary-50', className)}
    />
    {error ? <p className="mt-1 text-xs text-danger-600">{error}</p> : hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
  </>
)

/** SKU lines grouped by PO: PO qty, allocated elsewhere, available, quantity to be shipped, remaining, cartons, carton size, CBM, net and gross weight. */
export const PackingLinesTable: React.FC<PackingLinesTableProps> = ({ groups, values, onChange, serverErrors, readOnly }) => {
  const { isOpen, toggle } = useExpandedRows<string>()
  const all = groups.flatMap((group) => group.lines.map((line) => ({ line, figures: computeLine(line, values.get(lineKey(group.purchaseOrder.id, line.product.id))) })))
  const total = (pick: (row: (typeof all)[number]) => number) => all.reduce((sum, row) => sum + pick(row), 0)

  return (
    <div className="-mx-4 ds-scroll-x sm:mx-0 sm:rounded-lg sm:border sm:border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-secondary-50">
          <tr>
            <th className="w-8" aria-label="Expand" />
            <th className={cn(HEAD, 'min-w-[13rem]')}>SKU / product</th>
            <th className={HEAD}>PO qty</th>
            <th className={HEAD}>Allocated</th>
            <th className={HEAD}>Available</th>
            <th className={HEAD}>Quantity to be shipped</th>
            <th className={HEAD}>Remaining</th>
            <th className={HEAD}>Cartons</th>
            <th className={cn(HEAD, 'min-w-[14rem]')}>Carton L × W × H (cm)</th>
            <th className={HEAD}>CBM</th>
            <th className={HEAD}>Net wt</th>
            <th className={HEAD}>Gross wt (kg)</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <React.Fragment key={group.purchaseOrder.id}>
              <tr className="border-t border-border bg-secondary-50/60">
                <td colSpan={COLUMNS} className="px-3 py-2 text-left text-xs text-text-secondary">
                  <span className="font-semibold text-text-primary">{group.purchaseOrder.poNo}</span> · {group.purchaseOrder.supplier.name} · PO price{' '}
                  <span className="font-semibold tabular-nums text-text-primary">{group.purchaseOrder.price === null ? 'no rates yet' : formatCurrencyAmount(group.purchaseOrder.currency, group.purchaseOrder.price)}</span>
                </td>
              </tr>
              {group.lines.map((line) => {
                const key = lineKey(group.purchaseOrder.id, line.product.id)
                const value = values.get(key) ?? EMPTY_LINE
                const figures = computeLine(line, value)
                // Validation is for typing; a saved list shown read-only is displayed as it was saved
                const errors: typeof figures.errors = readOnly ? {} : figures.errors
                const unitsError = errors.units ?? serverErrors?.get(key)
                const rowError = unitsError || errors.cartons || errors.carton || errors.gross
                const expanded = isOpen(key)
                return (
                  <React.Fragment key={key}>
                    <tr className={cn('border-t border-border', rowError && 'bg-danger-50/40')}>
                      <td className={CELL}>
                        <ExpandToggle expanded={expanded} onToggle={() => toggle(key)} />
                      </td>
                      <td className={cn(CELL, 'text-left')}>
                        <p className="font-mono text-xs font-semibold text-text-primary">{line.product.ref}</p>
                        <p className="text-xs text-text-secondary">{productLabel(line.product)}</p>
                        {line.product.color && <p className="text-xs text-text-muted">{line.product.color}</p>}
                      </td>
                      <td className={CELL}>{qty(line.poQty)}</td>
                      <td className={cn(CELL, 'text-text-muted')}>{qty(line.allocated)}</td>
                      <td className={CELL}>{qty(line.available)}</td>
                      <td className={CELL}>
                        <NumberCell
                          label={`Quantity of ${line.product.ref} to be shipped`}
                          value={value.units}
                          onChange={(next) => onChange(key, 'units', next)}
                          error={unitsError}
                          readOnly={readOnly}
                          hint={!readOnly && figures.units !== line.available ? `max ${qty(line.available)}` : undefined}
                        />
                      </td>
                      <td className={cn(CELL, 'font-medium', figures.remaining < 0 ? 'text-danger-600' : figures.remaining > 0 ? 'text-warning-700' : 'text-success-700')}>{qty(figures.remaining)}</td>
                      <td className={CELL}>
                        <NumberCell label={`Cartons of ${line.product.ref}`} value={value.cartons} onChange={(next) => onChange(key, 'cartons', next)} error={errors.cartons} readOnly={readOnly} />
                      </td>
                      <td className={CELL}>
                        <div className="flex items-center justify-center gap-1">
                          {(
                            [
                              ['cartonL', 'Length'],
                              ['cartonW', 'Width'],
                              ['cartonH', 'Height'],
                            ] as const
                          ).map(([field, name], index) => (
                            <React.Fragment key={field}>
                              {index > 0 && <span className="text-text-muted" aria-hidden>×</span>}
                              <NumericInput
                                decimal
                                aria-label={`Carton ${name.toLowerCase()} of ${line.product.ref} in cm`}
                                value={value[field]}
                                readOnly={readOnly}
                                onChange={(event) => onChange(key, field, event.target.value)}
                                className={cn(fieldClass(errors.carton), 'h-9 w-16 px-2 py-1 text-right tabular-nums', readOnly && 'bg-secondary-50')}
                              />
                            </React.Fragment>
                          ))}
                        </div>
                        {errors.carton && <p className="mt-1 text-xs text-danger-600">{errors.carton}</p>}
                      </td>
                      <td className={cn(CELL, 'font-mono text-xs')}>{figures.cbm.toFixed(2)}</td>
                      <td className={cn(CELL, 'whitespace-nowrap')}>{kg(figures.net)}</td>
                      <td className={CELL}>
                        <NumberCell
                          decimal
                          label={`Gross weight of ${line.product.ref} in kg`}
                          value={value.gross}
                          onChange={(next) => onChange(key, 'gross', next)}
                          error={errors.gross}
                          placeholder={String(figures.net)}
                          readOnly={readOnly}
                        />
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-secondary-50/60">
                        <td />
                        <td colSpan={COLUMNS - 1} className="px-3 pb-4 pt-2 text-left">
                          <ProductSpecs product={line.product} />
                          <p className="mt-2 text-xs text-text-muted">
                            Default dimensions on the product: {formatDimensions(line.product.lengthCm, line.product.widthCm, line.product.heightCm, line.product.dimensionUnit)}. Read-only here; change them on the product.
                          </p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-secondary-50 font-semibold">
            <td />
            <td className={cn(CELL, 'text-left')}>
              Total · {groups.length} {groups.length === 1 ? 'PO' : 'POs'} · {all.length} {all.length === 1 ? 'SKU' : 'SKUs'}
            </td>
            <td className={CELL}>{qty(total((row) => row.line.poQty))}</td>
            <td className={CELL}>{qty(total((row) => row.line.allocated))}</td>
            <td className={CELL}>{qty(total((row) => row.line.available))}</td>
            <td className={CELL}>{qty(total((row) => row.figures.units))}</td>
            <td className={CELL}>{qty(total((row) => row.figures.remaining))}</td>
            <td className={CELL}>{qty(total((row) => row.figures.cartons))}</td>
            <td />
            <td className={cn(CELL, 'font-mono text-xs')}>{total((row) => row.figures.cbm).toFixed(2)}</td>
            <td className={cn(CELL, 'whitespace-nowrap')}>{kg(total((row) => row.figures.net))}</td>
            <td className={cn(CELL, 'whitespace-nowrap')}>{kg(total((row) => row.figures.gross))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
