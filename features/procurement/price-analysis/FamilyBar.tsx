'use client'

import React from 'react'
import Link from 'next/link'
import type { PriceAnalysisStatus, PriceFamily } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { variantLabel } from './priceAnalysisForm'

const DOT: Record<PriceAnalysisStatus, { className: string; label: string }> = {
  APPROVED: { className: 'bg-emerald-500', label: 'Approved' },
  PENDING: { className: 'bg-amber-500', label: 'Awaiting approval' },
  NONE: { className: 'bg-gray-400', label: 'No quotes yet' },
}

interface FamilyBarProps {
  family: PriceFamily
  currentId: number
  /** Where a variant's analysis lives. */
  hrefFor: (productId: number) => string
  /** Unsaved edits: leaving for another variant asks first. */
  dirty: boolean
}

/** The variants of the product's family as chips (colour, size and where each analysis stands); pick one to analyse it. */
export const FamilyBar: React.FC<FamilyBarProps> = ({ family, currentId, hrefFor, dirty }) => (
  <div className="rounded-lg border border-border bg-surface px-4 py-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-sm font-semibold text-text-primary">
        Variants of {family.root.name} <span className="ml-1 font-mono text-xs font-normal text-text-muted">{family.root.ref}</span>
      </p>
      <span className="rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-semibold text-warning-700">
        {family.approvedCount} of {family.variants.length} variant{family.variants.length === 1 ? '' : 's'} approved
      </span>
    </div>
    <div className="mt-2 flex flex-wrap gap-2">
      {family.variants.map((variant) => {
        const current = variant.id === currentId
        const dot = DOT[variant.status]
        return (
          <Link
            key={variant.id}
            href={hrefFor(variant.id)}
            aria-current={current ? 'page' : undefined}
            title={`${dot.label}${variant.approved ? ` · ${variant.approved.supplierName}` : ''}`}
            onClick={(event) => {
              if (!current && dirty && !window.confirm('You have unsaved changes on this variant. Leave without saving?')) event.preventDefault()
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
              current ? 'border-secondary-700 bg-secondary-50 text-text-primary ring-2 ring-secondary-700/20' : 'border-border bg-surface text-text-secondary hover:bg-secondary-50'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', dot.className)} aria-hidden />
            {variantLabel(variant)}
            <span className="text-xs font-normal text-text-muted">{variant.quoteCount === 0 ? 'no quotes' : `${variant.quoteCount} quote${variant.quoteCount === 1 ? '' : 's'}`}</span>
          </Link>
        )
      })}
    </div>
    <p className="mt-2 flex flex-wrap gap-x-4 text-[11px] text-text-muted">
      {(['APPROVED', 'PENDING', 'NONE'] as const).map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', DOT[status].className)} aria-hidden />
          {DOT[status].label.toLowerCase()}
        </span>
      ))}
    </p>
  </div>
)
