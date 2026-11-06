'use client'

import React from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { NumericInput } from '@/components/form-field/NumericInput'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { formatWeight } from '@/features/procurement/shared/units'
import { cn } from '@/utils/cn'
import { SectionCard } from '../shared/Card'
import { formatHsCode, HsCodeSelect } from '../shared/HsCodeSelect'
import { OrderSkuCell } from '../shared/OrderSkuCell'
import { OriginCountrySelect } from '../shared/OriginCountrySelect'
import { numberField, shippingField } from '../shared/fieldStyles'
import type { CustomsCurrency } from '../types'
import { isFromProduct, isLocked, numberOf, ORIGIN_COUNTRIES, UNITS } from './shipmentForm'
import { countErrors } from './shipmentRequest'
import type { ShipmentFormValues } from './shipmentSchema'

interface CustomsCardProps {
  /** "CA → US"; null when domestic (lines are optional then). */
  lane: string | null
}

const HEAD = 'px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-2 py-2 align-middle text-sm'
const CURRENCIES: Array<{ value: CustomsCurrency; label: string }> = [
  { value: 'USD', label: 'USD' },
  { value: 'CAD', label: 'CAD' },
]

/** A value the order or product gives that can't be edited; red when it is empty, since that blocks the rates. */
const Locked: React.FC<{ value: string; invalid?: boolean; className?: string }> = ({ value, invalid, className }) => (
  <span title={value} className={cn('block text-sm', invalid ? 'text-danger-600' : 'text-text-primary', className)}>
    {value || '—'}
  </span>
)

/**
 * One customs line per product, prefilled from the order and the product; required only cross-border. On a
 * channel order the description, unit value and currency come from the order and are read-only, as are the HS code
 * and origin when the product has them (else they are picked). Invalid fields are marked; the toast names them.
 */
export const CustomsCard: React.FC<CustomsCardProps> = ({ lane }) => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ShipmentFormValues>()
  const products = useWatch({ control, name: 'products' })
  const units = useWatch({ control, name: 'units' })
  const customsErrors = errors.products?.reduce?.((sum, row) => sum + countErrors(row?.customs as never), 0) ?? 0
  const required = lane !== null
  const star = required ? <span className="text-danger-600"> *</span> : null

  return (
    <SectionCard
      title={
        <>
          Customs lines {lane && <span className="ml-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">{lane}</span>}
        </>
      }
      subtitle={required ? 'HS code and country of origin are required by every provider' : 'optional for a domestic shipment'}
      aside={customsErrors > 0 && <span className="rounded-full bg-danger-50 px-2.5 py-0.5 text-xs font-medium text-danger-700">{customsErrors} {customsErrors === 1 ? 'field needs' : 'fields need'} attention</span>}
    >
      {products.length === 0 ? (
        <p className="text-sm text-text-muted">Once a product is in the parcel, its customs line is added here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border">
                <th className={HEAD}>Description{star}</th>
                <th className={HEAD}>SKU</th>
                <th className={HEAD}>Qty</th>
                <th className={HEAD}>Unit value{star}</th>
                <th className={HEAD}>HS code{star}</th>
                <th className={HEAD}>Country of origin{star}</th>
                <th className={HEAD}>Net wt</th>
              </tr>
            </thead>
            <tbody>
              {products.map((line, index) => {
                const { product, quantity, customs, sources } = line
                const base = `products.${index}.customs` as const
                const e = errors.products?.[index]?.customs
                const auto = (field: keyof typeof customs) => isFromProduct(product, customs, field)
                const locked = (field: keyof typeof customs) => isLocked(line, field)
                const units_ = numberOf(quantity) ?? 0
                return (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className={`${CELL} min-w-[200px] max-w-[280px]`}>
                      {locked('description') ? (
                        <Locked value={customs.description} invalid={Boolean(e?.description)} className="line-clamp-2" />
                      ) : (
                        <input aria-label="Description" className={shippingField(e?.description?.message, auto('description'))} {...register(`${base}.description`)} />
                      )}
                    </td>
                    <td className={`${CELL} font-mono text-xs`}>
                      {sources?.length ? <OrderSkuCell sources={sources} internalSku={product.sku} units={units_} /> : <span className="whitespace-nowrap">{product.sku ?? '—'}</span>}
                    </td>
                    <td className={`${CELL} tabular-nums`}>{quantity || '—'}</td>
                    <td className={`${CELL} min-w-[190px]`}>
                      <div className="flex items-center gap-2">
                        {locked('unitValue') ? (
                          <Locked value={customs.unitValue} invalid={Boolean(e?.unitValue)} className="tabular-nums" />
                        ) : (
                          <Controller
                            control={control}
                            name={`${base}.unitValue`}
                            render={({ field }) => <NumericInput aria-label="Unit value" decimal value={field.value} onChange={(event) => field.onChange(event.target.value)} onBlur={field.onBlur} className={numberField(e?.unitValue?.message, auto('unitValue'))} />}
                          />
                        )}
                        {locked('currency') ? (
                          <span className="text-xs font-medium text-text-muted">{customs.currency}</span>
                        ) : (
                          <Controller
                            control={control}
                            name={`${base}.currency`}
                            render={({ field }) => <SegmentedToggle ariaLabel="Currency" value={field.value} onChange={field.onChange} options={CURRENCIES} variant="primary" className="[&>button]:px-2" />}
                          />
                        )}
                      </div>
                    </td>
                    <td className={`${CELL} min-w-[220px]`}>
                      {locked('hsCode') ? (
                        <Locked value={formatHsCode(customs.hsCode)} className="font-mono text-xs" />
                      ) : (
                        <Controller
                          control={control}
                          name={`${base}.hsCode`}
                          render={({ field }) => <HsCodeSelect id={`hs-${product.id}`} ariaLabel="HS code" value={field.value} onChange={field.onChange} error={e?.hsCode?.message} prefilled={Boolean(customs.hsCode) && customs.hsCode === product.hsCode} />}
                        />
                      )}
                    </td>
                    <td className={`${CELL} min-w-[200px]`}>
                      {locked('originCountry') ? (
                        <Locked value={ORIGIN_COUNTRIES.find((country) => country.code === customs.originCountry)?.name ?? customs.originCountry} />
                      ) : (
                        <Controller
                          control={control}
                          name={`${base}.originCountry`}
                          render={({ field }) => <OriginCountrySelect id={`origin-${product.id}`} ariaLabel="Country of origin" value={field.value} onChange={field.onChange} error={e?.originCountry?.message} prefilled={auto('originCountry')} />}
                        />
                      )}
                    </td>
                    <td className={`${CELL} whitespace-nowrap`}>{product.weight === null ? '—' : formatWeight(product.weight * units_, UNITS[units].weight)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}
