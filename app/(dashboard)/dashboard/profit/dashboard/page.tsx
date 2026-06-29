'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Container } from '@/components/layout'
import { Skeleton, KpiCardSkeleton, TableSkeleton } from '@/design-system/loaders'

// Loading skeleton for profit dashboard
const ProfitDashboardSkeleton = () => (
  <Container size="full">
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton width="200px" height="32px" />
        <Skeleton width="300px" height="20px" />
      </div>

      {/* Filters skeleton */}
      <div className="bg-surface-secondary border-b border-border p-6">
        <div className="flex items-center gap-4">
          <Skeleton width="300px" height="40px" />
          <Skeleton width="140px" height="40px" />
          <Skeleton width="140px" height="40px" />
          <Skeleton width="100px" height="40px" />
        </div>
      </div>

      {/* Period cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-surface border border-border p-6">
        <div className="space-y-4">
          <Skeleton width="150px" height="24px" />
          <TableSkeleton rows={8} columns={6} />
        </div>
      </div>
    </div>
  </Container>
)

// Lazy-load the heavy profit dashboard component
const ProfitDashboardScreen = dynamic(
  () => import('@/features/profit/dashboard/ProfitDashboardScreen').then((mod) => mod.ProfitDashboardScreen),
  {
    ssr: false,
    loading: () => <ProfitDashboardSkeleton />,
  }
)

export default function ProfitDashboardPage() {
  return <ProfitDashboardScreen />
}

