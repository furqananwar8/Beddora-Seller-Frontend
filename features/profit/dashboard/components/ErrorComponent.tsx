'use client'

import React from 'react'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'
import { cn } from '@/utils/cn'

/**
 * ErrorComponent
 * 
 * Reusable component for displaying API errors
 * 
 * @example
 * <ErrorComponent
 *   error="Failed to load data"
 *   onRetry={() => refetch()}
 * />
 */

export interface ErrorComponentProps {
  error: string | Error | unknown
  onRetry?: () => void
  className?: string
  title?: string
}

export const ErrorComponent: React.FC<ErrorComponentProps> = ({
  error,
  onRetry,
  className,
  title = 'Error',
}) => {
  // Extract error message
  const errorMessage =
    typeof error === 'string'
      ? error
      : error instanceof Error
      ? error.message
      : 'An unexpected error occurred'

  return (
    <div className={cn('flex flex-col items-center justify-center p-8', className)}>
      <Alert variant="danger" title={title} className="max-w-md">
        <div className="space-y-3">
          <p className="text-sm">{errorMessage}</p>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="primary"
              size="sm"
              className="mt-2"
            >
              Try Again
            </Button>
          )}
        </div>
      </Alert>
    </div>
  )
}
