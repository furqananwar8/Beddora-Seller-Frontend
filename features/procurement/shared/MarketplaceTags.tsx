import React from 'react'
import type { PoProduct } from '@/services/api/procurement.api'

/** The marketplaces (CA, US, MX) a variation is sold in, once each, in the order its SKUs list them. */
export const marketplacesOf = (product: Pick<PoProduct, 'marketplace' | 'skus'>): string[] => {
  const codes = (product.skus ?? []).map((entry) => entry.marketplace)
  if (product.marketplace) codes.push(product.marketplace)
  return [...new Set(codes.filter(Boolean))]
}

/** Small CA / US / MX badges, so a product shows which market it is for wherever it is picked or listed. */
export const MarketplaceTags: React.FC<{ product: Pick<PoProduct, 'marketplace' | 'skus'> }> = ({ product }) => (
  <span className="flex shrink-0 items-center gap-1">
    {marketplacesOf(product).map((code) => (
      <span key={code} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-700">
        {code}
      </span>
    ))}
  </span>
)
