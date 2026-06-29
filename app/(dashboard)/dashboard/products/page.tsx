'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { EmptyState } from '@/components/data-display/EmptyState'

export default function ProductsDashboardPage() {
  return (
    <div>
      <PageHeader title="Products" description="Track product catalog performance" />
      <EmptyState title="Products module coming soon" description="Product analytics will appear here." />
    </div>
  )
}

