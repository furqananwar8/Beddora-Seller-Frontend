'use client'

import React, { useMemo, useState, Suspense } from 'react'
import { Sidebar, Header, ProtectedRoute } from '@/components/navigation'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { clearCredentials } from '@/store/auth.slice'
import { useLogoutMutation } from '@/services/api/auth.api'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { NavIcons } from '@/components/navigation/icons'

/**
 * Dashboard layout
 * Provides sidebar and header for all dashboard pages
 */
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

  const navSections = useMemo(() => [
    {
      items: [
        {
          label: 'Profit',
          href: '/dashboard/profit/dashboard',
          icon: NavIcons.profit,
          children: [
            { label: 'Dashboard', href: '/dashboard/profit/dashboard' },
            { label: 'Products', href: '/dashboard/profit/products' },
            { label: 'Shipping Costs', href: '/dashboard/profit/shipping-costs' },
            { label: 'Indirect Expenses', href: '/dashboard/profit/indirect-expenses' },
            { label: 'Variable Expenses', href: '/dashboard/profit/variable-expenses' },
            { label: 'Search Terms', href: '/dashboard/profit/search-terms' },
            { label: 'LTV', href: '/dashboard/profit/ltv' },
            { label: 'Cashflow', href: '/dashboard/profit/cashflow' },
            { label: 'Business Valuation', href: '/dashboard/profit/business-valuation' },
            { label: 'Reports', href: '/dashboard/profit/reports' },
          ],
        },
        {
          label: 'PPC',
          href: '/dashboard/ppc/dashboard',
          icon: NavIcons.ppc,
          children: [
            { label: 'Dashboard', href: '/dashboard/ppc/dashboard' },
            { label: 'Recommendations', href: '/dashboard/ppc/recommendations' },
            { label: 'Automation Log', href: '/dashboard/ppc/automation-log' },
          ],
        },
        { label: 'Repricer', href: '/dashboard/repricer', icon: NavIcons.products },
        {
          label: 'Inventory',
          href: '/dashboard/inventory',
          icon: NavIcons.inventory,
          children: [
            { label: 'Planner', href: '/dashboard/inventory/planner' },
            { label: 'Purchase Orders', href: '/dashboard/inventory/purchase-orders' },
            { label: 'Reseller Workflow', href: '/dashboard/inventory/reseller-workflow' },
            { label: 'FBA Shipments', href: '/dashboard/inventory/fba-shipments' },
            { label: 'Suppliers', href: '/dashboard/inventory/suppliers' },
          ],
        },
        {
          label: 'Autoresponder',
          href: '/dashboard/autoresponder',
          icon: NavIcons.mail,
          children: [
            { label: 'Campaigns', href: '/dashboard/autoresponder/campaigns' },
            { label: 'Products', href: '/dashboard/autoresponder/products' },
            { label: 'Orders', href: '/dashboard/autoresponder/orders' },
          ],
        },
        {
          label: 'Money Back',
          href: '/dashboard/money-back',
          icon: NavIcons.reports,
          children: [
            { label: 'Lost & Damaged', href: '/dashboard/money-back/lost-damaged' },
            { label: 'Returns', href: '/dashboard/money-back/returns' },
            { label: 'FBA Fee Changes', href: '/dashboard/money-back/fba-fee-changes' },
            { label: 'Reimbursement Gap', href: '/dashboard/money-back/reimbursement-gap' },
          ],
        },
        {
          label: 'Alerts',
          href: '/dashboard/alerts',
          icon: NavIcons.alerts,
          badge: '3',
          children: [
            { label: 'Dashboard', href: '/dashboard/alerts/dashboard' },
            { label: 'Settings', href: '/dashboard/alerts/settings' },
          ],
        },
        { label: 'Keyword Research', href: '/dashboard/keyword-research', icon: NavIcons.keyword },
        {
          label: 'eBay',
          href: '/dashboard/ebay',
          icon: NavIcons.products,
          children: [
            { label: 'Dashboard', href: '/dashboard/ebay/dashboard' },
            { label: 'LTV', href: '/dashboard/ebay/ltv' },
            { label: 'Products', href: '/dashboard/ebay/products' },
            { label: 'Shipping costs', href: '/dashboard/ebay/shipping-costs' },
            { label: 'Orders', href: '/dashboard/ebay/orders' },
            { label: 'Expenses', href: '/dashboard/ebay/expenses' },
          ],
        },
        {
          label: 'Walmart',
          href: '/dashboard/walmart',
          icon: NavIcons.products,
          children: [
            { label: 'Dashboard', href: '/dashboard/walmart/dashboard' },
            { label: 'PPC', href: '/dashboard/walmart/ppc' },
            { label: 'Products', href: '/dashboard/walmart/products' },
            { label: 'Shipping costs', href: '/dashboard/walmart/shipping-costs' },
            { label: 'Pick & pack', href: '/dashboard/walmart/pick-pack' },
            { label: 'Indirect Expenses', href: '/dashboard/walmart/indirect-expenses' },
          ],
        },
        { label: 'Shopify', href: '/dashboard/shopify', icon: NavIcons.products },
        {
          label: 'QuickBooks',
          href: '/dashboard/quickbooks',
          icon: NavIcons.reports,
          children: [
            { label: 'Settlements', href: '/dashboard/quickbooks/settlements' },
            { label: 'Configuration of QB accounts', href: '/dashboard/quickbooks/configuration' },
            { label: 'Connection', href: '/dashboard/quickbooks/connection' },
          ],
        },
        {
          label: 'Settings',
          href: '/dashboard/settings',
          icon: NavIcons.settings,
          children: [
            { label: 'General', href: '/dashboard/settings/general' },
            { label: 'Users', href: '/dashboard/settings/users' },
            { label: 'Automation', href: '/dashboard/settings/automation' },
            { label: 'Tell a friend', href: '/dashboard/settings/tell-a-friend' },
            { label: 'Billing', href: '/dashboard/settings/billing' },
          ],
        },
      ],
    },
  ], [])

  const [marketplaceValue, setMarketplaceValue] = useState('amazon-us')
  const [periodValue, setPeriodValue] = useState('last-30-days')
  const [activeDashboardTab, setActiveDashboardTabState] = useState('tiles')
  const pathname = usePathname()

  // Wrapper for setActiveDashboardTab that updates both state and URL
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

  // Dashboard tabs for Profit Dashboard
  const dashboardTabs = useMemo(() => [
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
    {
      id: 'sandbox',
      label: 'Sandbox',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ], [])

  // Check if we're on the profit or eBay dashboard page
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
          sections={navSections}
          user={{
            name: user?.name,
            email: user?.email || '',
            planLabel: 'Pro Plan',
          }}
        />
        <div className="ds-main">
          {/* Suspense-wrapped component to read search params without blocking layout */}
          {showDashboardTabs && (
            <Suspense fallback={null}>
              <DashboardTabSync
                onTabChange={setActiveDashboardTabState}
              />
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

// Separate component to read search params (wrapped in Suspense)
function DashboardTabSync({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const searchParams = useSearchParams()
  const tab = searchParams?.get('tab') || 'tiles'
  
  React.useEffect(() => {
    onTabChange(tab)
  }, [tab, onTabChange])
  
  return null
}

