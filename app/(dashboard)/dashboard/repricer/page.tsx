'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/design-system/loaders'

const RepricerDashboardScreen = dynamic(
  () => import('@/features/repricer/RepricerDashboardScreen').then((m) => m.RepricerDashboardScreen),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 space-y-4">
        <Skeleton width="200px" height="32px" />
        <Skeleton width="100%" height="120px" />
        <Skeleton width="100%" height="320px" />
      </div>
    ),
  }
)

/**
 * Repricer Dashboard Page (lazy-loaded for better initial load)
 */
export default function RepricerPage() {
  return <RepricerDashboardScreen />
}
