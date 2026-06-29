'use client'

import React from 'react'
import { Card, CardContent } from '@/design-system/cards'
import { Badge } from '@/design-system/badges'
// import { useGetCampaignsQuery } from '@/services/api/ppc.api'

/**
 * CampaignList component
 * 
 * Feature component for displaying PPC campaigns
 * Connect to PPC API here
 */
export const CampaignList: React.FC = () => {
  // const { data, isLoading, error } = useGetCampaignsQuery({})

  // Example data structure
  const campaigns = [
    { id: '1', name: 'Campaign 1', platform: 'amazon', status: 'active', spend: 1000, roas: 3.5 },
    { id: '2', name: 'Campaign 2', platform: 'google', status: 'paused', spend: 500, roas: 2.8 },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{campaign.name}</h3>
              <Badge variant={campaign.status === 'active' ? 'success' : 'secondary'}>
                {campaign.status}
              </Badge>
            </div>
            <p className="text-sm text-secondary-600 mb-2">Platform: {campaign.platform}</p>
            <div className="flex justify-between text-sm">
              <span>Spend: ${campaign.spend}</span>
              <span>ROAS: {campaign.roas}x</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

