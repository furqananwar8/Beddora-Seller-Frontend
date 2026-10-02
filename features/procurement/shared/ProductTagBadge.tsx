import React from 'react'
import type { ProductTag } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'

/** Parent (filled) or Variation (outlined), the tag used in every product listing and picker. */
export const ProductTagBadge: React.FC<{ tag: ProductTag; className?: string }> = ({ tag, className }) => (
  <span
    className={cn(
      'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
      tag === 'PARENT' ? 'bg-sky-50 text-sky-700' : 'border border-border bg-surface text-text-secondary',
      className
    )}
  >
    {tag === 'PARENT' ? 'Parent' : 'Variation'}
  </span>
)
