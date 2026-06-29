'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { EmptyState } from '@/components/data-display'

/**
 * Alerts page
 * 
 * Business logic: Connect to alerts API (create alerts.api.ts in services/api)
 */
export default function AlertsPage() {
  return (
    <div>
      <PageHeader
        title="Alerts"
        description="View and manage your alerts"
      />

      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No alerts"
            description="Create an alerts API to see your alerts here"
          />
        </CardContent>
      </Card>
    </div>
  )
}

