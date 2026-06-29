'use client'

import React from 'react'
import { UserMarketplace } from '@/services/api/multiMarketplace.api'

export interface MarketplaceSwitcherProps {
  marketplaces: UserMarketplace[]
  selectedMarketplaceId?: string
  onChange: (marketplaceId: string) => void
}

export const MarketplaceSwitcher: React.FC<MarketplaceSwitcherProps> = ({
  marketplaces,
  selectedMarketplaceId,
  onChange,
}) => {
  return (
    <select
      className="text-sm border border-border rounded px-3 py-2 bg-surface"
      value={selectedMarketplaceId || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">All Marketplaces</option>
      {marketplaces.map((item) => (
        <option key={item.id} value={item.marketplaceId}>
          {item.marketplace?.name || item.marketplaceId}
        </option>
      ))}
    </select>
  )
}

