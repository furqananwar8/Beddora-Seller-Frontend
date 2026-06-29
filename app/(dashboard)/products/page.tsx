'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { EmptyState } from '@/components/data-display/EmptyState'

export default function ProductsPage() {
  return (
    <div>
      <PageHeader title="Products" description="Track product catalog performance" />
      <EmptyState title="Products module coming soon" description="This section will show product analytics and inventory." />
    </div>
  )
}

