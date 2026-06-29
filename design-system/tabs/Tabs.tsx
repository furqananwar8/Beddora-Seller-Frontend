'use client'

import React from 'react'
import { cn } from '@/utils/cn'

export interface TabItem {
  id: string
  label: string
}

export interface TabsProps {
  items: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  size?: 'sm' | 'md'
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeTab,
  onChange,
  size = 'sm',
  className,
}) => {
  const sizes = {
    sm: 'ds-tab-sm',
    md: 'ds-tab-md',
  }

  return (
    <div className={cn('ds-tabs', className)}>
      {items.map((item) => {
        const isActive = item.id === activeTab
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              'ds-tab',
              sizes[size],
              isActive
                ? 'ds-tab-active'
                : 'ds-tab-inactive'
            )}
            aria-pressed={isActive}
            type="button"
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

