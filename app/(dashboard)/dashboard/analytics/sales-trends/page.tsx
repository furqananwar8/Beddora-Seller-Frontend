'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { EmptyState } from '@/components/data-display/EmptyState'

export default function SalesTrendsDashboardPage() {
  return (
    <div>
      <PageHeader title="Sales Trends" description="Analyze sales performance over time" />
      <EmptyState title="Sales trends coming soon" description="Sales trend insights will appear here." />
    </div>
  )
}

