'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { EmptyState } from '@/components/data-display/EmptyState'

export default function AdminDashboardPage() {
  return (
    <div>
      <PageHeader title="Admin" description="Administration controls" />
      <EmptyState title="Admin module coming soon" description="Admin tools will appear here." />
    </div>
  )
}

