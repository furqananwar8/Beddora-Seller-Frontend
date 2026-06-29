'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { EmptyState } from '@/components/data-display/EmptyState'

export default function ExportDashboardPage() {
  return (
    <div>
      <PageHeader title="Export Data" description="Export datasets across modules" />
      <EmptyState title="Export tools coming soon" description="Use Reports for scheduled exports." />
    </div>
  )
}

