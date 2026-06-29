'use client'

import React from 'react'
import { cn } from '@/utils/cn'

/**
 * PageHeader component - Layout component
 * Standard page header with title and optional actions
 */

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className,
}) => {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title">{title}</h1>
          {description && (
            <p className="mt-2 text-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

