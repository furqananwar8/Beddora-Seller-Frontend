'use client'

import React from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { NumericInput } from '@/components/form-field/NumericInput'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { formatWeight } from '@/features/procurement/shared/units'
import { SectionCard } from '../shared/Card'
import { HsCodeSelect } from '../shared/HsCodeSelect'
import { OriginCountrySelect } from '../shared/OriginCountrySelect'
import { numberField, shippingField } from '../shared/fieldStyles'
import type { CustomsCurrency } from '../types'
import { isFromProduct, isUnmapped, numberOf, UNITS } from './shipmentForm'
import { countErrors } from './shipmentRequest'
import type { ShipmentFormValues } from './shipmentSchema'

interface CustomsCardProps {
  /** "CA → US"; null when domestic (lines are optional then). */
  lane: string | null
}

const HEAD = 'px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-2 py-2 align-top text-sm'
const CURRENCIES: Array<{ value: CustomsCurrency; label: string }> = [
  { value: 'USD', label: 'USD' },
  { value: 'CAD', label: 'CAD' },
]

const Message: React.FC<{ error?: string; hint?: string }> = ({ error, hint }) =>
  error ? <p className="mt-1 text-xs text-danger-600">{error}</p> : hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null

/** One customs line per product, prefilled from the product (HS code from its category); required only cross-border. */
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
        <p className="text-sm text-text-muted">Pick a product: its customs line is added here.</p>
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
              {products.map(({ product, quantity, customs }, index) => {
                const base = `products.${index}.customs` as const
                const e = errors.products?.[index]?.customs
                const auto = (field: keyof typeof customs) => isFromProduct(product, customs, field)
                const hsPrefilled = Boolean(customs.hsCode) && customs.hsCode === product.hsCode
                const weight = numberOf(quantity) ?? 0
                return (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className={`${CELL} min-w-[200px]`}>
                      <input aria-label="Description" className={shippingField(e?.description?.message, auto('description'))} {...register(`${base}.description`)} />
                      <Message error={e?.description?.message} hint={isUnmapped(product) ? 'Map this SKU in the SKU Mapper to prefill next time' : undefined} />
                    </td>
                    <td className={`${CELL} whitespace-nowrap pt-4 font-mono text-xs`}>{product.sku ?? '—'}</td>
                    <td className={`${CELL} pt-4 tabular-nums`}>{quantity || '—'}</td>
                    <td className={`${CELL} min-w-[190px]`}>
                      <div className="flex gap-1">
                        <Controller
                          control={control}
                          name={`${base}.unitValue`}
                          render={({ field }) => <NumericInput aria-label="Unit value" decimal value={field.value} onChange={(event) => field.onChange(event.target.value)} onBlur={field.onBlur} className={numberField(e?.unitValue?.message, auto('unitValue'))} />}
                        />
                        <Controller
                          control={control}
                          name={`${base}.currency`}
                          render={({ field }) => <SegmentedToggle ariaLabel="Currency" value={field.value} onChange={field.onChange} options={CURRENCIES} variant="primary" className="[&>button]:px-2" />}
                        />
                      </div>
                      <Message error={e?.unitValue?.message} />
                    </td>
                    <td className={`${CELL} min-w-[220px]`}>
                      <Controller
                        control={control}
                        name={`${base}.hsCode`}
                        render={({ field }) => <HsCodeSelect id={`hs-${product.id}`} ariaLabel="HS code" value={field.value} onChange={field.onChange} error={e?.hsCode?.message} prefilled={hsPrefilled} />}
                      />
                      <Message error={e?.hsCode?.message} hint={!customs.hsCode ? `No code for ${product.categoryName ?? 'this product'}: pick one` : hsPrefilled ? undefined : product.categoryName ? `Default for ${product.categoryName}` : undefined} />
                    </td>
                    <td className={`${CELL} min-w-[200px]`}>
                      <Controller
                        control={control}
                        name={`${base}.originCountry`}
                        render={({ field }) => <OriginCountrySelect id={`origin-${product.id}`} ariaLabel="Country of origin" value={field.value} onChange={field.onChange} error={e?.originCountry?.message} prefilled={auto('originCountry')} />}
                      />
                      <Message error={e?.originCountry?.message} />
                    </td>
                    <td className={`${CELL} whitespace-nowrap pt-4`}>{product.weight === null ? '—' : formatWeight(product.weight * weight, UNITS[units].weight)}</td>
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
