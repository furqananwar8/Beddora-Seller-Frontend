'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { EmptyState } from '@/components/data-display/EmptyState'

export default function OrdersDashboardPage() {
  return (
    <div>
      <PageHeader title="Orders" description="Manage and review order activity" />
      <EmptyState title="Orders module coming soon" description="Order analytics will appear here." />
    </div>
  )
}

