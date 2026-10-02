'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppAbility } from '@/hooks/useAppAbility'
import { cn } from '@/utils/cn'

/** The module's screens, in the order of the data chain. A tab shows once its screen exists and the user may read it. */
export const PROCUREMENT_TABS = [
  { label: 'Products', href: '/dashboard/procurement/products', subject: 'procurement:products' },
  { label: 'Purchase Orders', href: '/dashboard/procurement/purchase-orders', subject: 'procurement:purchase-orders' },
] as const

/** Same shell on every procurement screen: one tab per screen the user can open. */
export const ProcurementTabs: React.FC = () => {
  const pathname = usePathname()
  const ability = useAppAbility()
  const tabs = PROCUREMENT_TABS.filter((tab) => ability.can('read', tab.subject))
  if (tabs.length < 2) return null

  return (
    <nav aria-label="Procurement" className="mb-4 max-w-full overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  '-mb-px block border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'border-primary-600 text-text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
                )}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
