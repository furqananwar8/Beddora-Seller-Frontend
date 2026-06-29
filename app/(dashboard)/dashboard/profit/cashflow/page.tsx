'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Container } from '@/components/layout'
import { Skeleton, ChartSkeleton, TableSkeleton } from '@/design-system/loaders'

// Loading skeleton for cashflow page
const CashflowSkeleton = () => (
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
          <Skeleton width="100px" height="40px" />
        </div>
      </div>

      {/* Chart skeleton */}
      <ChartSkeleton height="400px" />

      {/* Table skeleton */}
      <div className="bg-surface border border-border p-6">
        <div className="space-y-4">
          <Skeleton width="150px" height="24px" />
          <TableSkeleton rows={10} columns={8} />
        </div>
      </div>
    </div>
  </Container>
)

// Lazy-load the heavy cashflow component
const CashflowScreen = dynamic(
  () => import('@/features/profit/cashflow').then((mod) => mod.CashflowScreen),
  {
    ssr: false,
    loading: () => <CashflowSkeleton />,
  }
)

export default function ProfitCashflowPage() {
  return <CashflowScreen />
}

