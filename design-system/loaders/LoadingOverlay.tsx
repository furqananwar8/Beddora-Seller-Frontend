'use client'

import React from 'react'
import { Spinner } from './Spinner'

/**
 * LoadingOverlay component - Pure UI component
 * 
 * Usage:
 * <LoadingOverlay isLoading={isLoading} />
 */

export interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
}) => {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        {message && <p className="text-secondary-600">{message}</p>}
      </div>
    </div>
  )
}

