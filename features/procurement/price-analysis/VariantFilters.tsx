'use client'

import React from 'react'
import { ChoiceSelect } from '@/components/choice-select/ChoiceSelect'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import type { PriceFamilyVariant } from '@/services/api/procurement.api'

export type QuoteView = 'RANKED' | 'GROUPED'

const NONE = '__none'
export const ALL_PACKAGING = '__all'

const colorOf = (variant: Pick<PriceFamilyVariant, 'color'>) => variant.color ?? NONE
const sizeOf = (variant: Pick<PriceFamilyVariant, 'sizeName'>) => variant.sizeName ?? NONE

/** Distinct values in first-seen order, as dropdown choices. */
const choices = (values: string[], noneLabel: string) => [...new Set(values)].map((value) => ({ value, label: value === NONE ? noneLabel : value }))

interface VariantFiltersProps {
  variants: PriceFamilyVariant[]
  currentId: number
  /** Switching the variant goes through the unsaved-changes check. */
  onPickVariant: (variantId: number) => void
  packagings: string[]
  packaging: string
  onPackaging: (packaging: string) => void
  view: QuoteView
  onView: (view: QuoteView) => void
}

const Labelled: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-text-muted">{label}</span>
    <div className="min-w-[150px]">{children}</div>
  </div>
)

/**
 * "Filter variant": colour and size pick which child SKU is analysed (each has its own quotes and approval); packaging
 * narrows the quotes shown. Only combinations that exist in the family are offered.
 */
export const VariantFilters: React.FC<VariantFiltersProps> = ({ variants, currentId, onPickVariant, packagings, packaging, onPackaging, view, onView }) => {
  const current = variants.find((variant) => variant.id === currentId) ?? variants[0]
  if (!current) return null
  const colors = choices(variants.map(colorOf), 'No colour')
  const sizes = choices(variants.filter((variant) => colorOf(variant) === colorOf(current)).map(sizeOf), 'No size')

  // A new colour keeps the size when that colour has it, else its first variant
  const pickColor = (color: string) => {
    const ofColor = variants.filter((variant) => colorOf(variant) === color)
    const next = ofColor.find((variant) => sizeOf(variant) === sizeOf(current)) ?? ofColor[0]
    if (next && next.id !== current.id) onPickVariant(next.id)
  }
  const pickSize = (size: string) => {
    const next = variants.find((variant) => colorOf(variant) === colorOf(current) && sizeOf(variant) === size)
    if (next && next.id !== current.id) onPickVariant(next.id)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Filter variant:</span>
        <Labelled label="Colour:">
          <ChoiceSelect title="Colour" value={colorOf(current)} onChange={pickColor} options={colors} />
        </Labelled>
        <Labelled label="Size / Pack:">
          <ChoiceSelect title="Size / Pack" value={sizeOf(current)} onChange={pickSize} options={sizes} />
        </Labelled>
        <Labelled label="Packaging:">
          <ChoiceSelect
            title="Packaging"
            value={packaging || ALL_PACKAGING}
            onChange={(value) => onPackaging(value === ALL_PACKAGING ? '' : value)}
            options={[{ value: ALL_PACKAGING, label: 'All Packaging' }, ...packagings.map((option) => ({ value: option, label: option }))]}
          />
        </Labelled>
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
  )
}
