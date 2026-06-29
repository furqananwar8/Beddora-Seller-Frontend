'use client'

import React, { useEffect } from 'react'
import { cn } from '@/utils/cn'
import { Badge } from '@/design-system/badges'

/**
 * Toast component - Feedback component
 * Displays temporary notifications
 */

export interface ToastProps {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  onClose: (id: string) => void
  duration?: number
}

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type,
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  const variants = {
    success: 'bg-success-50 border-success-200 text-success-800',
    error: 'bg-error-50 border-error-200 text-error-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    info: 'bg-primary-50 border-primary-200 text-primary-800',
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 p-4 rounded-lg border shadow-lg',
        variants[type]
      )}
    >
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="text-current opacity-70 hover:opacity-100"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

