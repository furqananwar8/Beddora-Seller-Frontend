'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useAppAbility } from '@/hooks/useAppAbility'
import { LIVE_REPORT_TABS, liveReportSubject } from '@/features/profit/channel-report/config/tabs'
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
  const ability = useAppAbility()
  const requested = useSearchParams()?.get('tab')
  const allowed = LIVE_REPORT_TABS.filter((tab) => ability.can('read', liveReportSubject(tab.id)))
  const tab = allowed.find((item) => item.id === requested) ?? allowed[0]
  if (!tab) return <p className="p-6 text-sm text-text-muted">You don&apos;t have access to any Live Report tab. Ask your admin to grant access.</p>
  // A key per channel: switching tabs starts that channel's report fresh
  return <ChannelReport key={tab.id} channel={tab.id} />
}
