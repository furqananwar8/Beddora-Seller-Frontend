'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Badge } from '@/design-system/badges'
import { UserMarketplace } from '@/services/api/multiMarketplace.api'

export interface MarketplaceCardProps {
  marketplaces: UserMarketplace[]
  onSelect?: (marketplaceId: string) => void
}

export const MarketplaceCard: React.FC<MarketplaceCardProps> = ({ marketplaces, onSelect }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked Marketplaces</CardTitle>
      </CardHeader>
      <CardContent>
        {marketplaces.length === 0 ? (
          <div className="text-text-muted text-sm">No linked marketplaces.</div>
        ) : (
          <div className="space-y-3">
            {marketplaces.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between border border-border rounded p-3"
              >
                <div>
                  <div className="font-medium">{item.marketplace?.name || item.marketplaceId}</div>
                  <div className="text-xs text-text-muted">
                    {item.marketplace?.code || ''} {item.marketplace?.currency || item.marketplace?.baseCurrency || ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={item.status === 'active' ? 'success' : 'secondary'}>
                    {item.status}
                  </Badge>
                  {onSelect && (
                    <button
                      onClick={() => onSelect(item.marketplaceId)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Switch
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

