'use client'

import React from 'react'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { Card, CardContent } from '@/design-system/cards/Card'
import type { PriceAnalysisProduct, PriceAnalysisStatus, PriceFamily } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { formatDimensions, formatWeight } from '../shared/units'
import { variantLabel } from './priceAnalysisForm'

const DOT: Record<PriceAnalysisStatus, { className: string; label: string }> = {
  APPROVED: { className: 'bg-emerald-500', label: 'Approved' },
  PENDING: { className: 'bg-amber-500', label: 'Awaiting approval' },
  NONE: { className: 'bg-gray-400', label: 'No quotes yet' },
}

const READ_ONLY = 'ds-input ds-input-default flex h-10 items-center rounded-lg bg-secondary-50 text-text-secondary'

interface ParentFamilyCardProps {
  family: PriceFamily
  /** The variant being analysed. */
  product: PriceAnalysisProduct
  currentId: number
  onPickVariant: (variantId: number) => void
  material: string
  onMaterialChange: (value: string) => void
  readOnly: boolean
}

/** The product family: its child SKUs (pick one to analyse it, with where each stands) and the details its variants share. */
export const ParentFamilyCard: React.FC<ParentFamilyCardProps> = ({ family, product, currentId, onPickVariant, material, onMaterialChange, readOnly }) => {
  const dimensions = [formatDimensions(product.lengthCm, product.widthCm, product.heightCm, product.dimensionUnit), formatWeight(product.weightKg, product.weightUnit)].filter((part) => part && part !== '—').join(' · ')
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text-primary">
            Parent family details <span className="ml-1 font-mono text-[11px] font-normal text-text-muted">{family.root.ref}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-text-muted">Child SKUs:</span>
            {family.variants.map((variant) => {
              const current = variant.id === currentId
              const dot = DOT[variant.status]
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => (current ? undefined : onPickVariant(variant.id))}
                  aria-current={current ? 'true' : undefined}
                  title={`${variant.ref} · ${dot.label}${variant.approved ? ` · ${variant.approved.supplierName}` : ''}`}
                  className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors', current ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border bg-surface text-text-secondary hover:bg-secondary-50')}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', dot.className)} aria-hidden />
                  {variantLabel(variant)}
                </button>
              )
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label="Product family name">
            <div className={READ_ONLY}>
              <span className="truncate">{family.root.name}</span>
            </div>
          </FormField>
          <FormField label="Base material" htmlFor="pa-material">
            <input
              id="pa-material"
              autoComplete="off"
              value={material}
              onChange={(event) => onMaterialChange(event.target.value)}
              maxLength={120}
              placeholder="e.g. Steel / MDF"
              className={fieldClass(material.length > 120 ? 'too long' : undefined)}
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Dimensions (this variant)">
            <div className={READ_ONLY}>
              <span className="truncate">{dimensions || '—'}</span>
            </div>
          </FormField>
        </div>
        <p className="text-[11px] text-text-muted">Shared attributes are read from the product. Packaging and carton CBM are quoted per supplier below. Each child SKU has its own analysis and approval.</p>
      </CardContent>
    </Card>
  )
}
