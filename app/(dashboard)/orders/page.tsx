'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { EmptyState } from '@/components/data-display/EmptyState'

export default function OrdersPage() {
  return (
    <div>
      <PageHeader title="Orders" description="Manage and review order activity" />
      <EmptyState title="Orders module coming soon" description="This section will show detailed order analytics." />
    </div>
  )
}

