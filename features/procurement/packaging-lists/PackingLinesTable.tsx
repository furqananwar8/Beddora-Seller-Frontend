'use client'

import React from 'react'
import { fieldClass } from '@/components/form-field/FormField'
import type { PackablePoLines } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { productLabel } from '../shared/ProductPicker'

/** What the user typed for one SKU of one PO. */
export interface LineValue {
  units: string
  cartons: string
  gross: string
}

export const lineKey = (purchaseOrderId: number, productId: number) => `${purchaseOrderId}:${productId}`

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places
const wholeNumber = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : NaN)

/** Live figures for one line: remaining after this list, CBM and net weight from the product, and what is wrong. */
export function computeLine(line: PackablePoLines['lines'][number], value: LineValue | undefined) {
  const units = value ? wholeNumber(value.units || '0') : 0
  const cartons = value ? wholeNumber(value.cartons || '0') : 0
  const gross = value?.gross.trim() ? Number(value.gross) : NaN
  const safeUnits = Number.isFinite(units) ? units : 0
  const net = round((line.product.weightKg ?? 0) * safeUnits, 3)
  const errors: { units?: string; cartons?: string; gross?: string } = {}
  if (!Number.isFinite(units)) errors.units = 'Whole units only'
  else if (units > line.available) errors.units = `Only ${line.available.toLocaleString('en-CA')} available`
  if (safeUnits > 0 && !(cartons >= 1)) errors.cartons = 'Required'
  if (value?.gross.trim() && (!Number.isFinite(gross) || gross < 0)) errors.gross = 'Not a weight'
  else if (Number.isFinite(gross) && gross < net) errors.gross = `Below net ${net} kg`
  return {
    units: safeUnits,
    cartons: Number.isFinite(cartons) ? cartons : 0,
    remaining: line.available - safeUnits,
    cbm: round((line.product.cbm ?? 0) * safeUnits, 4),
    net,
    // Left empty, gross is taken as net (the server does the same)
    gross: Number.isFinite(gross) && gross > 0 ? gross : net,
    errors,
  }
}

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
const qty = (value: number) => value.toLocaleString('en-CA')
const kg = (value: number) => `${value.toLocaleString('en-CA', { maximumFractionDigits: 1 })} kg`

const NumberCell: React.FC<{ label: string; value: string; onChange: (value: string) => void; error?: string; placeholder?: string; readOnly: boolean; hint?: string }> = ({
  label,
  value,
  onChange,
  error,
  placeholder,
  readOnly,
  hint,
}) => (
  <>
    <input
      aria-label={label}
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      className={cn(fieldClass(error), 'mx-auto h-9 w-24 py-1 text-right tabular-nums', readOnly && 'bg-secondary-50')}
    />
    {error ? <p className="mt-1 text-xs text-danger-600">{error}</p> : hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
  </>
)

/** SKU lines grouped by PO: PO qty, allocated elsewhere, available, this list, remaining, cartons, CBM, net and gross weight. */
export const PackingLinesTable: React.FC<PackingLinesTableProps> = ({ groups, values, onChange, serverErrors, readOnly }) => {
  const all = groups.flatMap((group) => group.lines.map((line) => ({ line, figures: computeLine(line, values.get(lineKey(group.purchaseOrder.id, line.product.id))) })))
  const total = (pick: (row: (typeof all)[number]) => number) => all.reduce((sum, row) => sum + pick(row), 0)

  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-secondary-50">
          <tr>
            <th className={cn(HEAD, 'min-w-[13rem]')}>SKU / product</th>
            <th className={HEAD}>PO qty</th>
            <th className={HEAD}>Allocated</th>
            <th className={HEAD}>Available</th>
            <th className={HEAD}>This list</th>
            <th className={HEAD}>Remaining</th>
            <th className={HEAD}>Cartons</th>
            <th className={HEAD}>CBM</th>
            <th className={HEAD}>Net wt</th>
            <th className={HEAD}>Gross wt (kg)</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <React.Fragment key={group.purchaseOrder.id}>
              <tr className="border-t border-border bg-secondary-50/60">
                <td colSpan={10} className="px-3 py-2 text-left text-xs text-text-secondary">
                  <span className="font-semibold text-text-primary">{group.purchaseOrder.poNo}</span> · {group.purchaseOrder.supplier.name} · {group.purchaseOrder.currency}
                </td>
              </tr>
              {group.lines.map((line) => {
                const key = lineKey(group.purchaseOrder.id, line.product.id)
                const value = values.get(key) ?? { units: '', cartons: '', gross: '' }
                const figures = computeLine(line, value)
                const unitsError = figures.errors.units ?? serverErrors?.get(key)
                return (
                  <tr key={key} className={cn('border-t border-border', (unitsError || figures.errors.cartons || figures.errors.gross) && 'bg-danger-50/40')}>
                    <td className={cn(CELL, 'text-left')}>
                      <p className="font-mono text-xs font-semibold text-text-primary">{line.product.sku}</p>
                      <p className="text-xs text-text-secondary">{productLabel(line.product)}</p>
                    </td>
                    <td className={CELL}>{qty(line.poQty)}</td>
                    <td className={cn(CELL, 'text-text-muted')}>{qty(line.allocated)}</td>
                    <td className={CELL}>{qty(line.available)}</td>
                    <td className={CELL}>
                      <NumberCell
                        label={`Units of ${line.product.sku} on this list`}
                        value={value.units}
                        onChange={(next) => onChange(key, 'units', next)}
                        error={unitsError}
                        readOnly={readOnly}
                        hint={!readOnly && figures.units !== line.available ? `max ${qty(line.available)}` : undefined}
                      />
                    </td>
                    <td className={cn(CELL, 'font-medium', figures.remaining < 0 ? 'text-danger-600' : figures.remaining > 0 ? 'text-warning-700' : 'text-success-700')}>{qty(figures.remaining)}</td>
                    <td className={CELL}>
                      <NumberCell label={`Cartons of ${line.product.sku}`} value={value.cartons} onChange={(next) => onChange(key, 'cartons', next)} error={figures.errors.cartons} readOnly={readOnly} />
                    </td>
                    <td className={cn(CELL, 'font-mono text-xs')}>{figures.cbm.toFixed(2)}</td>
                    <td className={cn(CELL, 'whitespace-nowrap')}>{kg(figures.net)}</td>
                    <td className={CELL}>
                      <NumberCell
                        label={`Gross weight of ${line.product.sku} in kg`}
                        value={value.gross}
                        onChange={(next) => onChange(key, 'gross', next)}
                        error={figures.errors.gross}
                        placeholder={String(figures.net)}
                        readOnly={readOnly}
                      />
                    </td>
                  </tr>
                )
              })}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-secondary-50 font-semibold">
            <td className={cn(CELL, 'text-left')}>
              Total · {groups.length} {groups.length === 1 ? 'PO' : 'POs'} · {all.length} {all.length === 1 ? 'SKU' : 'SKUs'}
            </td>
            <td className={CELL}>{qty(total((row) => row.line.poQty))}</td>
            <td className={CELL}>{qty(total((row) => row.line.allocated))}</td>
            <td className={CELL}>{qty(total((row) => row.line.available))}</td>
            <td className={CELL}>{qty(total((row) => row.figures.units))}</td>
            <td className={CELL}>{qty(total((row) => row.figures.remaining))}</td>
            <td className={CELL}>{qty(total((row) => row.figures.cartons))}</td>
            <td className={cn(CELL, 'font-mono text-xs')}>{total((row) => row.figures.cbm).toFixed(2)}</td>
            <td className={cn(CELL, 'whitespace-nowrap')}>{kg(total((row) => row.figures.net))}</td>
            <td className={cn(CELL, 'whitespace-nowrap')}>{kg(total((row) => row.figures.gross))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
