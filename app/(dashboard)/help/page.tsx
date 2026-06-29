'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { EmptyState } from '@/components/data-display/EmptyState'

export default function HelpPage() {
  return (
    <div>
      <PageHeader title="Help Center" description="Guides and support resources" />
      <EmptyState title="Help center coming soon" description="Documentation and support links will appear here." />
    </div>
  )
}

