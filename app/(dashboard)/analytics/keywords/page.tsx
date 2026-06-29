'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { EmptyState } from '@/components/data-display/EmptyState'

export default function KeywordTrackerPage() {
  return (
    <div>
      <PageHeader title="Keyword Tracker" description="Monitor keyword and search performance" />
      <EmptyState title="Keyword tracking coming soon" description="Keyword analytics will appear here." />
    </div>
  )
}

