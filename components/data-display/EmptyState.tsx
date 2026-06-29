'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'

/**
 * EmptyState component - Data display component
 * Shows when there's no data to display
 */

export interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4 text-secondary-400">{icon}</div>}
      <h3 className="text-lg font-medium text-secondary-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-secondary-500 mb-4 max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  )
}

