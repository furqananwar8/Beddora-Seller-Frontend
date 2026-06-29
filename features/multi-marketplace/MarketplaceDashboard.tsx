'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'

export interface MarketplaceDashboardProps {
  marketplaceName?: string
  metrics?: {
    sales?: number
    orders?: number
    inventoryItems?: number
    ppcSpend?: number
    fees?: number
  }
}

export const MarketplaceDashboard: React.FC<MarketplaceDashboardProps> = ({
  marketplaceName,
  metrics,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{marketplaceName ? `${marketplaceName} Overview` : 'Marketplace Overview'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-xs text-text-muted">Sales</div>
            <div className="text-lg font-semibold">{metrics?.sales ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Orders</div>
            <div className="text-lg font-semibold">{metrics?.orders ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Inventory</div>
            <div className="text-lg font-semibold">{metrics?.inventoryItems ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">PPC Spend</div>
            <div className="text-lg font-semibold">{metrics?.ppcSpend ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Fees</div>
            <div className="text-lg font-semibold">{metrics?.fees ?? 0}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

