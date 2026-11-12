import React from 'react'
import type { ProductPlatform } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'

/**
 * The platform a product is sold on, and the brand behind it. Ecommerce is Beddora (blue), Retail is Northern Linen (red).
 * One list: the product form's radio, the Brand badge on containers and the exports all read it.
 */
export const PLATFORM_META: Record<ProductPlatform, { label: string; brand: string; /** Filled (selected) look. */ solid: string; /** Soft badge look. */ soft: string }> = {
  ECOMMERCE: { label: 'Ecommerce', brand: 'Beddora', solid: 'border-blue-600 bg-blue-600 text-white', soft: 'bg-blue-600 text-white' },
  RETAIL: { label: 'Retail', brand: 'Northern Linen', solid: 'border-red-600 bg-red-600 text-white', soft: 'bg-red-600 text-white' },
}

export const PLATFORMS: ProductPlatform[] = ['ECOMMERCE', 'RETAIL']

/** One platform as a coloured pill; the brand is in its tooltip. */
export const PlatformBadge: React.FC<{ platform: ProductPlatform; className?: string }> = ({ platform, className }) => (
  <span title={PLATFORM_META[platform].brand} className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', PLATFORM_META[platform].soft, className)}>
    {PLATFORM_META[platform].label}
  </span>
)

/**
 * The Brand of a container: Ecommerce when every SKU in it is Ecommerce, Retail when every SKU is Retail, and both,
 * as "Ecommerce / Retail", when it holds a mix. A container with nothing packed has none.
 */
export const BrandCell: React.FC<{ platforms: ProductPlatform[] }> = ({ platforms }) => {
  if (platforms.length === 0) return <span className="text-text-muted">—</span>
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1">
      {platforms.map((platform, index) => (
        <React.Fragment key={platform}>
          {index > 0 && <span className="text-text-muted">/</span>}
          <PlatformBadge platform={platform} />
        </React.Fragment>
      ))}
    </span>
  )
}
