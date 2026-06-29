'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { EmptyState } from '@/components/data-display/EmptyState'

export default function PerformanceDashboardPage() {
  return (
    <div>
      <PageHeader title="Performance" description="Track business performance metrics" />
      <EmptyState title="Performance analytics coming soon" description="Performance dashboards will appear here." />
    </div>
  )
}

