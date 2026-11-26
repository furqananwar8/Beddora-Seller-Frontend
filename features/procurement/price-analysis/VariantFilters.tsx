'use client'

import React from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import type { PriceFamilyVariant } from '@/services/api/procurement.api'
import { variantLabel } from './priceAnalysisForm'

export type QuoteView = 'RANKED' | 'GROUPED'

interface VariantFiltersProps {
  variants: PriceFamilyVariant[]
  currentId: number
  /** Switching the variant goes through the unsaved-changes check. */
  onPickVariant: (variantId: number) => void
  view: QuoteView
  onView: (view: QuoteView) => void
}

/** One variant select (every child SKU of the family) picks which variant is analysed; its details show underneath. */
export const VariantFilters: React.FC<VariantFiltersProps> = ({ variants, currentId, onPickVariant, view, onView }) => {
  const current = variants.find((variant) => variant.id === currentId) ?? null
  if (variants.length === 0) return null
  const details: Array<[string, string]> = current
    ? [
        ['SKU', current.ref],
        ['Colour', current.color ?? '—'],
        ['Variant / Size', current.sizeName ?? current.variantName ?? '—'],
        ['Packaging', current.packaging ?? '—'],
        ['Quotes', String(current.quoteCount)],
      ]
    : []

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Variant:</span>
          <div className="min-w-[220px]">
            <SearchableSelect<PriceFamilyVariant> ariaLabel="Variant" options={variants} value={current} getKey={(variant) => variant.id} getLabel={variantLabel} onChange={(variant) => onPickVariant(variant.id)} />
          </div>
        </div>
        <SegmentedToggle<QuoteView>
          ariaLabel="Quote view"
          value={view}
          onChange={onView}
          options={[
            { value: 'RANKED', label: 'Ranked Comparison View' },
            { value: 'GROUPED', label: 'Grouped by Supplier View' },
          ]}
        />
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-3 text-sm">
        {details.map(([label, value]) => (
          <div key={label} className="max-w-full">
            <dt className="text-[11px] uppercase tracking-wide text-text-muted">{label}</dt>
            <dd className="font-medium text-text-primary [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
