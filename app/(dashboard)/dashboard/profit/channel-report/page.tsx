'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Container } from '@/components/layout'
import { Skeleton, KpiCardSkeleton, TableSkeleton } from '@/design-system/loaders'

const ChannelReportSkeleton = () => (
  <Container size="full">
    <div className="space-y-6">
      <Skeleton width="100%" height="140px" />
      <div className="flex items-center gap-4">
        <Skeleton width="300px" height="40px" />
        <Skeleton width="140px" height="40px" />
        <Skeleton width="140px" height="40px" />
        <Skeleton width="100px" height="40px" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="bg-surface border border-border p-6">
        <TableSkeleton rows={8} columns={8} />
      </div>
    </div>
  </Container>
)

const ChannelReport = dynamic(
  () => import('@/features/profit/channel-report').then((mod) => mod.ChannelReport),
  {
    ssr: false,
    loading: () => <ChannelReportSkeleton />,
  }
)

export default function ChannelReportPage() {
  return <ChannelReport />
}
