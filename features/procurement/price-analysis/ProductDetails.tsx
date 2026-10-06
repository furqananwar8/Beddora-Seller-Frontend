'use client'

import React from 'react'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import type { PriceAnalysisProduct } from '@/services/api/procurement.api'
import { formatCbm, formatDimensions, formatSize, formatWeight } from '../shared/units'

const READ_ONLY = 'ds-input ds-input-default flex h-10 items-center rounded-lg bg-secondary-50 text-text-secondary'

const ReadOnly: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <FormField label={label}>
    <div className={READ_ONLY}>
      <span className="truncate">{children}</span>
    </div>
  </FormField>
)

const joined = (...parts: Array<string | null | undefined>) => parts.filter((part) => part && part !== '—').join(' · ') || '—'

interface ProductDetailsProps {
  product: PriceAnalysisProduct
  material: string
  onMaterialChange: (value: string) => void
  readOnly?: boolean
}

/** The product's own details, read-only here (change them on the product). Material is kept per analysis. */
export const ProductDetails: React.FC<ProductDetailsProps> = ({ product, material, onMaterialChange, readOnly }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <ReadOnly label="Product name">{product.name}</ReadOnly>
    <FormField label="Material" htmlFor="pa-material" hint="Prefilled from the product · editing it here does not change the product">
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
    <ReadOnly label="Size">{product.sizeName ?? '—'}</ReadOnly>
    <ReadOnly label="Packaging">{product.packaging ?? '—'}</ReadOnly>
    <ReadOnly label="Dimensions">
      {joined(
        formatDimensions(product.lengthCm, product.widthCm, product.heightCm, product.dimensionUnit),
        formatWeight(product.weightKg, product.weightUnit),
        product.cbm === null ? null : `${formatCbm(product.cbm)} CBM`
      )}
    </ReadOnly>
    <ReadOnly label="Colour">
      {product.color ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border border-border" style={{ backgroundColor: product.color.toLowerCase() }} aria-hidden />
          {product.color}
        </span>
      ) : (
        '—'
      )}
    </ReadOnly>
  </div>
)
