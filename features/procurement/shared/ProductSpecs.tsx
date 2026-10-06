'use client'

import React, { useCallback, useState } from 'react'
import type { PoProduct } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { ProductPhoto } from './ProductPhoto'
import { formatCbm, formatDimensions, formatWeight } from './units'

/** Open/closed state for rows that expand to show a SKU's details. */
export function useExpandedRows<K extends string | number>() {
  const [open, setOpen] = useState<Set<K>>(new Set())
  const toggle = useCallback(
    (key: K) =>
      setOpen((current) => {
        const next = new Set(current)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      }),
    []
  )
  return { isOpen: (key: K) => open.has(key), toggle }
}

/** The arrow at the start of a row that has details underneath. */
export const ExpandToggle: React.FC<{ expanded: boolean; onToggle: () => void; label?: string }> = ({ expanded, onToggle, label = 'SKU details' }) => (
  <button
    type="button"
    aria-expanded={expanded}
    aria-label={expanded ? `Hide ${label}` : `Show ${label}`}
    onClick={onToggle}
    className="rounded p-1 text-text-muted hover:bg-secondary-100"
  >
    <svg className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </button>
)

const Spec: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
    <p className="break-words text-sm text-text-primary">{children || '—'}</p>
  </div>
)

/**
 * A SKU's details as they are on the product, read-only. Shown under a row on purchase orders and
 * packaging lists; to change anything, edit the product itself.
 */
export const ProductSpecs: React.FC<{ product: PoProduct; className?: string }> = ({ product, className }) => (
  <div className={cn('flex flex-wrap items-start gap-4', className)}>
    <ProductPhoto productId={product.id} hasPhoto={product.hasPhoto} version={product.updatedAt} alt={product.variantName ?? product.name} className="h-16 w-16" />
    <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Spec label="Product">{product.variantName ?? product.name}</Spec>
      <Spec label="Color">{product.color}</Spec>
      <Spec label="Material">{product.material}</Spec>
      <Spec label="Size">{product.sizeName}</Spec>
      <Spec label="Packaging">{product.packaging}</Spec>
      <Spec label="Category">{product.category?.name}</Spec>
      <Spec label="Weight">{formatWeight(product.weightKg, product.weightUnit)}</Spec>
      <Spec label="L × W × H">{formatDimensions(product.lengthCm, product.widthCm, product.heightCm, product.dimensionUnit)}</Spec>
      <Spec label="CBM">{formatCbm(product.cbm)}</Spec>
      {product.description && <Spec label="Description">{product.description}</Spec>}
    </div>
  </div>
)
