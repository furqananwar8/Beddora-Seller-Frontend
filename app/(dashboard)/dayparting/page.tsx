'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { EmptyState } from '@/components/data-display'

export default function Dayparting() {


  return (
    <div>
      <PageHeader
        title="Day Parting"
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

