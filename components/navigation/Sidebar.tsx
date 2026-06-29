'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils/cn'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setSidebarOpen } from '@/store/ui.slice'

/**
 * Sidebar component - Navigation component
 * Main navigation sidebar for the dashboard
 */

export interface NavItem {
  label: string
  href: string
  icon?: React.ReactNode
  badge?: string
  children?: NavItem[]
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

export interface SidebarProps {
  sections: NavSection[]
  user?: {
    name?: string | null
    email?: string | null
    planLabel?: string
  }
}

export const Sidebar: React.FC<SidebarProps> = ({ sections, user }) => {
  const pathname = usePathname()
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen)
  const dispatch = useAppDispatch()
  const [openItems, setOpenItems] = React.useState<Record<string, boolean>>({})

  // Auto-open parent menu if a child is active (only on initial mount)
  React.useEffect(() => {
    if (!pathname) return
    const initialOpen: Record<string, boolean> = {}
    sections.forEach((section) => {
      section.items.forEach((item) => {
        if (!item.children?.length) return
        const isChildActive = item.children.some((child) =>
          pathname === child.href || pathname?.startsWith(child.href + '/')
        )
        if (isChildActive) {
          initialOpen[item.href] = true
        }
      })
    })
    setOpenItems(initialOpen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  const toggleItem = (href: string) => {
    setOpenItems((prev) => ({ ...prev, [href]: !prev[href] }))
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'ds-sidebar transform transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="ds-sidebar-header">
            <h2 className="ds-sidebar-logo">SellerMetrics</h2>
            <button
              onClick={() => dispatch(setSidebarOpen(false))}
              className="lg:hidden text-text-muted hover:text-text-secondary"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            {sections.map((section, sectionIndex) => (
              <div key={`${section.title || 'section'}-${sectionIndex}`}>
                {section.title && <div className="ds-sidebar-section">{section.title}</div>}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isDashboardRoot = item.href === '/dashboard'
                    const isActive = isDashboardRoot
                      ? pathname === item.href
                      : pathname === item.href || pathname?.startsWith(item.href + '/')
                    const isChildActive = item.children?.some((child) =>
                      pathname === child.href || pathname?.startsWith(child.href + '/')
                    )
                    const isOpen = openItems[item.href] ?? false

                    if (item.children?.length) {
                      return (
                        <div key={item.href}>
                          <button
                            type="button"
                            onClick={() => toggleItem(item.href)}
                            className={cn(
                              'ds-nav-item w-full',
                              isChildActive ? 'ds-nav-item-active' : 'ds-nav-item-inactive'
                            )}
                            aria-expanded={isOpen}
                          >
                            {item.icon && <span className="w-5 h-5">{item.icon}</span>}
                            <span className="flex-1 text-left">{item.label}</span>
                            <svg
                              className={cn(
                                'w-4 h-4 transition-transform',
                                isOpen ? 'rotate-180' : 'rotate-0'
                              )}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <div
                            className={cn(
                              'mt-1 space-y-1 overflow-hidden transition-all duration-300',
                              isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                            )}
                          >
                            {item.children.map((child) => {
                              const isChildItemActive =
                                pathname === child.href || pathname?.startsWith(child.href + '/')
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={cn(
                                    'ds-nav-item pl-10 text-sm',
                                    isChildItemActive
                                      ? 'ds-nav-item-active-child'
                                      : 'ds-nav-item-inactive'
                                  )}
                                >
                                  <span className="flex-1">{child.label}</span>
                                  {child.badge && (
                                    <span className="ml-auto rounded-full bg-danger-600 text-text-inverse text-xs px-2 py-0.5">
                                      {child.badge}
                                    </span>
                                  )}
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'ds-nav-item',
                          isActive ? 'ds-nav-item-active' : 'ds-nav-item-inactive'
                        )}
                      >
                        {item.icon && <span className="w-5 h-5">{item.icon}</span>}
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto rounded-full bg-danger-600 text-text-inverse text-xs px-2 py-0.5">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User footer */}
          {user && (
            <div className="ds-sidebar-footer">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-secondary-200 flex items-center justify-center text-text-secondary text-sm font-semibold">
                  {user.name?.[0] || user.email?.[0] || 'U'}
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {user.name || user.email}
                  </div>
                  {user.planLabel && (
                    <div className="text-xs text-text-muted">{user.planLabel}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

