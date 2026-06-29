'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Skeleton, ChartSkeleton, TableSkeleton } from '@/design-system/loaders'

// Loading skeleton for PPC dashboard
const PPCDashboardSkeleton = () => (
  <div className="flex gap-3 w-full -mx-6 px-6">
    {/* Main content skeleton */}
    <div className="flex-1 min-w-0 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton width="200px" height="32px" />
        <Skeleton width="300px" height="20px" />
      </div>

      {/* Filters skeleton */}
      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton width="300px" height="40px" />
        <Skeleton width="140px" height="40px" />
        <Skeleton width="140px" height="40px" />
        <Skeleton width="100px" height="40px" />
        <Skeleton width="100px" height="40px" />
      </div>

      {/* Chart skeleton */}
      <ChartSkeleton height="320px" />

      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b border-border">
        <Skeleton width="120px" height="40px" />
        <Skeleton width="120px" height="40px" />
        <Skeleton width="120px" height="40px" />
      </div>

      {/* Table skeleton */}
      <div className="bg-surface border border-border p-6">
        <TableSkeleton rows={10} columns={8} />
      </div>
    </div>

    {/* Right sidebar skeleton */}
    <div className="w-56 flex-shrink-0 space-y-4">
      <div className="bg-surface border border-border p-4 space-y-3">
        <Skeleton width="100px" height="20px" />
        <Skeleton width="80px" height="24px" />
        <Skeleton width="120px" height="16px" />
        <Skeleton width="100px" height="16px" />
        <Skeleton width="90px" height="16px" />
      </div>
    </div>
  </div>
)

// Lazy-load the heavy PPC dashboard component
const PPCDashboardEnhanced = dynamic(
  () => import('@/features/ppc').then((mod) => mod.PPCDashboardEnhanced),
  {
    ssr: false,
    loading: () => <PPCDashboardSkeleton />,
  }
)

export default function PpcDashboardPage() {
  return <PPCDashboardEnhanced />
}
