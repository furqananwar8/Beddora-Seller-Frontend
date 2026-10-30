'use client'

import React from 'react'
import { NumericInput } from '@/components/form-field/NumericInput'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { formatWeight } from '@/features/procurement/shared/units'
import { SectionCard } from '../shared/Card'
import { CountrySelect } from '../shared/CountrySelect'
import { numberField, shippingField } from '../shared/fieldStyles'
import type { CustomsCurrency } from '../types'
import { isUnmapped, numberOf, UNITS, type CustomsDraft, type DraftAction, type ShipmentDraft } from './shipmentDraft'
import { customsFromProductField, type FieldErrors } from './shipmentRules'

interface CustomsCardProps {
  draft: Pick<ShipmentDraft, 'products' | 'customs' | 'units'>
  errors: FieldErrors
  /** "CA → US"; null when domestic (lines are optional then). */
  lane: string | null
  dispatch: React.Dispatch<DraftAction>
}

const HEAD = 'px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-2 py-2 align-top text-sm'
const CURRENCIES: Array<{ value: CustomsCurrency; label: string }> = [
  { value: 'USD', label: 'USD' },
  { value: 'CAD', label: 'CAD' },
]

const Message: React.FC<{ error?: string; hint?: string }> = ({ error, hint }) =>
  error ? <p className="mt-1 text-xs text-danger-600">{error}</p> : hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null

/** One customs line per product, prefilled from the product master; required only cross-border. */
export const CustomsCard: React.FC<CustomsCardProps> = ({ draft, errors, lane, dispatch }) => {
  const customsErrors = Object.keys(errors).filter((key) => key.startsWith('customs.')).length
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
      {draft.products.length === 0 ? (
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
              {draft.products.map(({ product, quantity }) => {
                const line = draft.customs[product.id]
                const error = (field: keyof CustomsDraft) => errors[`customs.${product.id}.${field}`]
                const auto = (field: keyof CustomsDraft) => customsFromProductField(product, line, field)
                const patch = (value: Partial<CustomsDraft>) => dispatch({ type: 'patchCustoms', productId: product.id, patch: value })
                const units = numberOf(quantity) ?? 0
                return (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className={`${CELL} min-w-[200px]`}>
                      <input aria-label="Description" value={line.description} onChange={(event) => patch({ description: event.target.value })} className={shippingField(error('description'), auto('description'))} />
                      <Message error={error('description')} hint={isUnmapped(product) ? 'Map this SKU in the SKU Mapper to prefill next time' : undefined} />
                    </td>
                    <td className={`${CELL} whitespace-nowrap pt-4 font-mono text-xs`}>{product.sku ?? '—'}</td>
                    <td className={`${CELL} pt-4 tabular-nums`}>{quantity || '—'}</td>
                    <td className={`${CELL} min-w-[190px]`}>
                      <div className="flex gap-1">
                        <NumericInput aria-label="Unit value" decimal value={line.unitValue} onChange={(event) => patch({ unitValue: event.target.value })} className={numberField(error('unitValue'), auto('unitValue'))} />
                        <SegmentedToggle ariaLabel="Currency" value={line.currency} onChange={(currency) => patch({ currency })} options={CURRENCIES} className="[&>button]:px-2" />
                      </div>
                      <Message error={error('unitValue')} />
                    </td>
                    <td className={`${CELL} min-w-[150px]`}>
                      <input aria-label="HS code" value={line.hsCode} onChange={(event) => patch({ hsCode: event.target.value.replace(/[^\d.]/g, '') })} placeholder="e.g. 6302.32.2020" className={shippingField(error('hsCode'), auto('hsCode'))} />
                      <Message error={error('hsCode')} hint={auto('hsCode') ? 'Last used for this SKU' : undefined} />
                    </td>
                    <td className={`${CELL} min-w-[200px]`}>
                      <CountrySelect id={`origin-${product.id}`} ariaLabel="Country of origin" value={line.originCountry} onChange={(originCountry) => patch({ originCountry })} error={error('originCountry')} fromProduct={auto('originCountry')} />
                      <Message error={error('originCountry')} />
                    </td>
                    <td className={`${CELL} whitespace-nowrap pt-4`}>{product.weight === null ? '—' : formatWeight(product.weight * units, UNITS[draft.units].weight)}</td>
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
