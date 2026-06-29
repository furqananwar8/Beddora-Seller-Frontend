'use client'

import React, { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface DashboardTabHandlerProps {
  isProfitDashboard: boolean
  dashboardTabs: Array<{ id: string; label: string; icon: React.ReactNode }>
  onTabChange?: (tabId: string, activeTab: string, setActiveTab: (tabId: string) => void) => void
}

/**
 * DashboardTabHandler - Handles tab state from URL search params
 * Wrapped in Suspense to prevent layout re-renders on URL changes
 */
function DashboardTabHandlerInner({
  isProfitDashboard,
  dashboardTabs,
  onTabChange,
}: DashboardTabHandlerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Get active tab from URL or default to 'tiles'
  const activeDashboardTab = searchParams?.get('tab') || 'tiles'
  
  const setActiveDashboardTab = useCallback((tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', tabId)
    router.replace(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams])

  // Call parent callback if provided
  React.useEffect(() => {
    if (onTabChange && isProfitDashboard) {
      onTabChange(activeDashboardTab, activeDashboardTab, setActiveDashboardTab)
    }
  }, [activeDashboardTab, setActiveDashboardTab, isProfitDashboard, onTabChange])

  return null // This component doesn't render anything
}

export const DashboardTabHandler: React.FC<DashboardTabHandlerProps> = (props) => {
  return (
    <React.Suspense fallback={null}>
      <DashboardTabHandlerInner {...props} />
    </React.Suspense>
  )
}
