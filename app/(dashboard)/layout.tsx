'use client'

import React, { useMemo, useState, Suspense } from 'react'
import { Sidebar, Header, ProtectedRoute } from '@/components/navigation'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { clearCredentials } from '@/store/auth.slice'
import { useLogoutMutation } from '@/services/api/auth.api'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { NavIcons } from '@/components/navigation/icons'
import { setAmazonSession } from '@/store/amazon.slice'
import { useAppAbility } from '@/hooks/useAppAbility'

export interface NavItem {
  label: string
  href: string
  subject: string
  action: string // <-- dynamic: 'read', 'write', 'manage', etc.
  icon?: React.ReactNode
  children?: Omit<NavItem, 'icon'>[]
  badge?: string
  disabled?: boolean
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const refreshToken = useAppSelector((state) => state.auth.refreshToken)
  const [logout] = useLogoutMutation()
  const ability = useAppAbility()

  const rawNavSections = useMemo(
    () => [
      {
        items: [
          {
            label: 'Profit',
            subject: 'profit',
            action: 'read',
            href: '/dashboard/profit/dashboard',
            icon: NavIcons.profit,
            children: [
              {
                label: 'Dashboard',
                subject: 'profit:dashboard',
                action: 'read',
                href: '/dashboard/profit/dashboard',
              },
              {
                label: 'Products',
                subject: 'profit:products',
                action: 'read',
                href: '/dashboard/profit/products',
              },
            ],
          },
          {
            label: 'PPC',
            subject: 'ppc',
            action: 'read',
            href: '/dashboard/ppc/dashboard',
            icon: NavIcons.ppc,
            children: [
              {
                label: 'Day Parting',
                subject: 'ppc:dayparting',
                action: 'read',
                href: '/dayparting',
              },
            ],
          },
          {
            label: 'Inventory',
            subject: 'inventory',
            action: 'read',
            href: '/dashboard/inventory',
            icon: NavIcons.inventory,
            children: [
              {
                label: 'Planner',
                subject: 'inventory:planner',
                action: 'read',
                href: '/dashboard/inventory/planner',
              },
            ],
          },
          {
            label: 'Breakeven Analysis',
            subject: 'breakeven-analysis',
            action: 'read',
            href: '/breakeven-analysis',
            icon: NavIcons.products,
            children: [
              {
                label: 'SKU Wise',
                subject: 'breakeven-analysis:sku-wise',
                action: 'read',
                href: '/breakeven-analysis',
              },
            ],
          },
          {
            label: 'Alerts',
            subject: 'alerts',
            action: 'read',
            href: '/dashboard/alerts',
            icon: NavIcons.alerts,
            badge: '3',
            disabled: true,
            children: [
              {
                label: 'Dashboard',
                subject: 'alerts:dashboard',
                action: 'read',
                href: '/dashboard/alerts/dashboard',
              },
              {
                label: 'Settings',
                subject: 'alerts:settings',
                action: 'read',
                href: '/dashboard/alerts/settings',
              },
            ],
          },
          {
            label: 'Settings',
            subject: 'settings',
            action: 'read',
            href: '/dashboard/settings',
            icon: NavIcons.settings,
            children: [
              {
                label: 'General',
                subject: 'settings:general',
                action: 'read',
                href: '/dashboard/settings/general',
              },
              {
                label: 'Users',
                subject: 'settings:users',
                action: 'read',
                href: '/dashboard/settings/users',
              },
            ],
          },
        ],
      },
    ],
    []
  )

  // Filter sidebar using EACH item's own action + subject
  const navSections = useMemo(() => {
    return rawNavSections
      .map((section) => ({
        ...section,
        items: section.items
          .map((item) => {
            const visibleChildren =
              item.children?.filter((child) =>
                ability.can(child.action, child.subject)
              ) ?? []

            // Show parent if user has the parent's required action OR has visible children
            const canSeeParent = ability.can(item.action, item.subject)
            if (!canSeeParent && visibleChildren.length === 0) {
              return null
            }

            return { ...item, children: visibleChildren }
          })
          .filter((item): any => item !== null),
      }))
      .filter((section) => section.items.length > 0)
  }, [rawNavSections, ability])

  const [marketplaceValue, setMarketplaceValue] = useState('amazon-us')
  const [periodValue, setPeriodValue] = useState('last-30-days')
  const [activeDashboardTab, setActiveDashboardTabState] = useState('tiles')
  const pathname = usePathname()

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'AMAZON_AUTH_SUCCESS') {
        const p = event.data.payload
        dispatch(
          setAmazonSession({
            sessionId: p.sessionId,
            profileId: p.profileId || null,
            region: p.region || null,
            email: p.email || null,
            name: p.name || null,
            isConnected: true,
          })
        )
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [dispatch])

  const setActiveDashboardTab = React.useCallback((tabId: string) => {
    setActiveDashboardTabState(tabId)
    const params = new URLSearchParams(window.location.search)
    params.set('tab', tabId)
    router.replace(`${pathname}?${params.toString()}`)
  }, [pathname, router])

  const marketplaceOptions = [
    { value: 'amazon-us', label: 'Amazon US' },
    { value: 'amazon-uk', label: 'Amazon UK' },
  ]

  const periodOptions = [
    { value: 'last-7-days', label: 'Last 7 Days' },
    { value: 'last-30-days', label: 'Last 30 Days' },
    { value: 'last-90-days', label: 'Last 90 Days' },
  ]

  const dashboardTabs = useMemo(
    () => [
      {
        id: 'tiles',
        label: 'Tiles',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
            />
          </svg>
        ),
      },
      {
        id: 'chart',
        label: 'Chart',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        id: 'pnl',
        label: 'P&L',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
      },
      {
        id: 'map',
        label: 'Map',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
        ),
      },
      {
        id: 'trends',
        label: 'Trends',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        ),
      },
    ],
    []
  )

  const isProfitDashboard = pathname?.includes('/dashboard/profit/dashboard')
  const isEbayDashboard = pathname?.includes('/dashboard/ebay/dashboard')
  const showDashboardTabs = isProfitDashboard || isEbayDashboard

  const handleLogout = React.useCallback(async () => {
    try {
      await logout(refreshToken ? { refreshToken } : undefined).unwrap()
    } catch (error) {
      console.error('Logout error', error)
    } finally {
      dispatch(clearCredentials())
      router.push('/login')
    }
  }, [dispatch, router, refreshToken, logout])

  return (
    <ProtectedRoute>
      <div className="ds-page">
        <Sidebar
          sections={navSections as any}
          user={{
            name: user?.name,
            email: user?.email || ''
          }}
        />
        <div className="ds-main">
          {showDashboardTabs && (
            <Suspense fallback={null}>
              <DashboardTabSync onTabChange={setActiveDashboardTabState} />
            </Suspense>
          )}
          <Header
            user={user || undefined}
            onLogout={handleLogout}
            marketplaceOptions={marketplaceOptions}
            periodOptions={periodOptions}
            marketplaceValue={marketplaceValue}
            periodValue={periodValue}
            onMarketplaceChange={setMarketplaceValue}
            onPeriodChange={setPeriodValue}
            dashboardTitle={showDashboardTabs ? 'Dashboard' : undefined}
            dashboardTabs={showDashboardTabs ? dashboardTabs : undefined}
            activeDashboardTab={showDashboardTabs ? activeDashboardTab : undefined}
            onDashboardTabChange={showDashboardTabs ? setActiveDashboardTab : undefined}
          />
          <main className="ds-content">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

function DashboardTabSync({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const searchParams = useSearchParams()
  const tab = searchParams?.get('tab') || 'tiles'
  React.useEffect(() => {
    onTabChange(tab)
  }, [tab, onTabChange])
  return null
}