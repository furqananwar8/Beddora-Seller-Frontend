'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { EmptyState } from '@/components/data-display/EmptyState'

export default function SalesTrendsPage() {
  return (
    <div>
      <PageHeader title="Sales Trends" description="Analyze sales performance over time" />
      <EmptyState title="Sales trends coming soon" description="This section will visualize sales trends." />
    </div>
  )
}

