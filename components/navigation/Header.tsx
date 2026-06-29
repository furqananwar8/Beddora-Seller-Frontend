'use client'

import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleSidebar } from '@/store/ui.slice'
import { Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { NavIcons } from './icons'

/**
 * Header component - Navigation component
 * Top header bar with sidebar toggle, account switcher, and user menu
 */

export interface DashboardTab {
  id: string
  label: string
  icon: React.ReactNode
}

export interface HeaderProps {
  user?: {
    name: string | null
    email: string
  }
  onLogout?: () => void
  marketplaceOptions?: Array<{ value: string; label: string }>
  periodOptions?: Array<{ value: string; label: string }>
  marketplaceValue?: string
  periodValue?: string
  onMarketplaceChange?: (value: string) => void
  onPeriodChange?: (value: string) => void
  dashboardTitle?: string
  dashboardTabs?: DashboardTab[]
  activeDashboardTab?: string
  onDashboardTabChange?: (tabId: string) => void
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  marketplaceOptions = [],
  periodOptions = [],
  marketplaceValue,
  periodValue,
  onMarketplaceChange,
  onPeriodChange,
  dashboardTitle,
  dashboardTabs = [],
  activeDashboardTab,
  onDashboardTabChange,
}) => {
  const dispatch = useAppDispatch()
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen)

  return (
    <header className="ds-header">
      <div className="ds-header-inner">
        <div className="ds-header-filters flex items-center gap-4 flex-1">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="ds-icon-button lg:hidden"
            aria-label="Toggle sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Dashboard Title and Tabs in the same row */}
          {dashboardTitle && (
            <>
              <div className="flex items-center gap-6 ml-4">
                <h1 className="text-xl font-bold text-text-primary whitespace-nowrap">{dashboardTitle}</h1>
                {dashboardTabs.length > 0 && (
                  <div className="flex gap-1 items-center">
                    {dashboardTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => onDashboardTabChange?.(tab.id)}
                        className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 border-b-2 ${
                          activeDashboardTab === tab.id
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-text-muted hover:text-text-primary hover:border-border'
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="ds-header-actions">
          <button className="ds-icon-button" aria-label="Notifications">
            {NavIcons.bell}
          </button>
          <button className="ds-icon-button" aria-label="Apps">
            {NavIcons.grid}
          </button>
          {onLogout && (
            <Button variant="ghost" size="sm" onClick={onLogout}>
              Logout
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

