'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { EmptyState } from '@/components/data-display'
// import { useGetCampaignsQuery } from '@/services/api/ppc.api'

/**
 * PPC page
 * 
 * Business logic: Connect to PPC API
 * Example:
 * const { data, isLoading, error } = useGetCampaignsQuery({})
 */
export default function PPCPage() {
  // const { data, isLoading, error } = useGetCampaignsQuery({})

  return (
    <div>
      <PageHeader
        title="PPC Campaigns"
        description="Manage your pay-per-click campaigns"
      />

      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No campaigns found"
            description="Connect to the PPC API to see your campaigns here"
          />
        </CardContent>
      </Card>
    </div>
  )
}

